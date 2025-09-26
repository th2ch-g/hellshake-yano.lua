/**
 * @fileoverview Hellshake-Yano.vim main entry point
 */
import type { Denops } from "@denops/std";
import {
  detectWordsWithManager,
} from "./word.ts";
import {
  resetWordDetectionManager,
  type WordDetectionManagerConfig,
} from "./word/manager.ts";
import {
  assignHintsToWords,
  calculateHintPosition,
  calculateHintPositionWithCoordinateSystem,
  generateHints,
} from "./hint.ts";
import { Core } from "./core.ts";
import type {
  Config,
  DebugInfo,
  HighlightColor,
  HintMapping,
  PerformanceMetrics,
  Word,
} from "./types.ts";
// Re-export types for backward compatibility
export type { Config, HighlightColor };
import {
  fromUnifiedConfig,
  getDefaultUnifiedConfig,
  getPerKeyValue,
  mergeConfig,
  toUnifiedConfig,
  UnifiedConfig,
} from "./config.ts";
import {
  CommandFactory,
  disable,
  enable,
  setCount,
  setTimeout as setTimeoutCommand,
  toggle,
} from "./commands.ts";
import {
  getPluginStatistics,
  healthCheck,
  initializePlugin,
  updatePluginState,
} from "./lifecycle.ts";
import { LRUCache } from "./utils/cache.ts";
let config: UnifiedConfig = getDefaultUnifiedConfig();
let currentHints: HintMapping[] = [];
let hintsVisible = false;
let extmarkNamespace: number | undefined;
let fallbackMatchIds: number[] = [];
const wordsCache = new LRUCache<string, Word[]>(100);
const hintsCache = new LRUCache<string, string[]>(50);
let performanceMetrics: PerformanceMetrics = {
  showHints: [],
  hideHints: [],
  wordDetection: [],
  hintGeneration: [],
};
function recordPerformance(
  operation: keyof PerformanceMetrics,
  duration: number,
): void {
  const metrics = performanceMetrics[operation];
  metrics.push(duration);
  if (metrics.length > 50) {
    metrics.shift();
  }
}
export function getMinLengthForKey(config: UnifiedConfig | Config, key: string): number {
  if ('minLength' in config && typeof config.minLength === 'number') {
    return config.minLength;
  }
  if ('minLength' in config && typeof config.minLength === 'object' && config.minLength) {
    return (config.minLength as any)[key] || 1;
  }
  const perKeyRecord = (config as any).perKeyMinLength || {};
  const defaultValue = (config as any).defaultMinWordLength || 3;
  return perKeyRecord[key] || defaultValue;
}
export function getMotionCountForKey(key: string, config: UnifiedConfig | Config): number {
  if ('motionCount' in config && typeof config.motionCount === 'object') {
    return config.motionCount[key] || 1;
  }
  const perKeyRecord = (config as any).perKeyMotionCount || {};
  const defaultValue = (config as any).defaultMotionCount || 1;
  return perKeyRecord[key] || defaultValue;
}
function collectDebugInfo(): DebugInfo {
  return {
    hintsVisible,
    currentHints,
    config: fromUnifiedConfig(config),
    metrics: performanceMetrics,
    timestamp: Date.now(),
  };
}
function clearDebugInfo(): void {
  performanceMetrics = {
    showHints: [],
    hideHints: [],
    wordDetection: [],
    hintGeneration: [],
  };
}
function normalizeBackwardCompatibleFlags(cfg: Partial<Config>): Partial<Config> {
  const normalized = { ...cfg };
  if ('enable_word_detection' in normalized) {
    (normalized as any).enableWordDetection = normalized.enable_word_detection;
    delete normalized.enable_word_detection;
  }
  if ('disable_visual_mode' in normalized) {
    (normalized as any).disableVisualMode = normalized.disable_visual_mode;
    delete normalized.disable_visual_mode;
  }
  return normalized;
}
function convertConfigForManager(config: UnifiedConfig): WordDetectionManagerConfig {
  return {
    extractWords: {
      wordPattern: (config as any).wordPatterns?.default || '\\b\\w+\\b',
      minLength: config.defaultMinWordLength || 3,
      includePunctuation: false,
      wordBoundary: 'standard',
    },
  } as WordDetectionManagerConfig;
}
function syncManagerConfig(config: UnifiedConfig): void {
  const managerConfig = convertConfigForManager(config);
  resetWordDetectionManager();
}
let lastShowHintsTime = 0;
export async function main(denops: Denops): Promise<void> {
  try {
    await initializePlugin(denops);
    const userConfig = await denops.eval('g:hellshake_yano_config').catch(() => ({})) as Partial<Config>;
    const normalizedUserConfig = normalizeBackwardCompatibleFlags(userConfig);
    const unifiedUserConfig = toUnifiedConfig(normalizedUserConfig);
    const defaultConfig = getDefaultUnifiedConfig();
    const merged = mergeConfig(defaultConfig as any, unifiedUserConfig as any);
    config = (merged as any) as UnifiedConfig;
    syncManagerConfig(config);
    if (denops.meta.host === "nvim") {
      extmarkNamespace = await denops.call("nvim_create_namespace", "hellshake-yano") as number;
    }
    await initializeDictionarySystem(denops);
    denops.dispatcher = {
      async enable(): Promise<void> {
        enable(config);
      },
      async disable(): Promise<void> {
        disable(config);
      },
      async toggle(): Promise<void> {
        toggle(config);
      },
      async setCount(count: unknown): Promise<void> {
        setCount(config, typeof count === "number" ? count : 1);
      },
      async setTimeout(timeout: unknown): Promise<void> {
        setTimeoutCommand(config, typeof timeout === "number" ? timeout : 1000);
      },
      async showHints(): Promise<void> {
        const startTime = performance.now();
        try {
          await displayHintsAsync(
            denops,
            config,
            currentHints,
            extmarkNamespace,
            fallbackMatchIds,
          );
          hintsVisible = true;
          lastShowHintsTime = Date.now();
        } catch (error) {
          console.error("showHints error:", error);
          throw error;
        } finally {
          recordPerformance("showHints", performance.now() - startTime);
        }
      },
      async hideHints(): Promise<void> {
        await hideHints(denops);
      },
      async highlightCandidateHints(input: unknown): Promise<void> {
        if (typeof input !== "string") return;
        await highlightCandidateHintsAsync(denops, input, currentHints, config);
      },
      async detectWords(bufnr: unknown): Promise<Word[]> {
        const startTime = performance.now();
        try {
          const bufferNumber = typeof bufnr === "number" ? bufnr : 0;
          return await detectWordsOptimized(denops, bufferNumber);
        } finally {
          recordPerformance("wordDetection", performance.now() - startTime);
        }
      },
      async generateHints(wordCount: unknown): Promise<string[]> {
        const startTime = performance.now();
        try {
          const count = typeof wordCount === "number" ? wordCount : 0;
          const markers = config.markers || ["a", "s", "d", "f"];
          return generateHintsOptimized(count, markers);
        } finally {
          recordPerformance("hintGeneration", performance.now() - startTime);
        }
      },
      async getDebugInfo(): Promise<DebugInfo> {
        return collectDebugInfo();
      },
      async clearDebugInfo(): Promise<void> {
        clearDebugInfo();
      },
      async getConfig(): Promise<UnifiedConfig> {
        return config;
      },
      async validateConfig(cfg: unknown): Promise<{ valid: boolean; errors: string[] }> {
        return validateConfig(cfg as Partial<Config>);
      },
      async healthCheck(): Promise<void> {
        await healthCheck(denops);
      },
      async getStatistics(): Promise<unknown> {
        return await getPluginStatistics();
      },
      async reloadDictionary(): Promise<void> {
        await reloadDictionary(denops);
      },
      async addToDictionary(word: unknown, meaning?: unknown, type?: unknown): Promise<void> {
        if (typeof word === "string") {
          await addToDictionary(
            denops,
            word,
            typeof meaning === "string" ? meaning : undefined,
            typeof type === "string" ? type : undefined
          );
        }
      },
      async editDictionary(): Promise<void> {
        await editDictionary(denops);
      },
      async showDictionary(): Promise<void> {
        await showDictionary(denops);
      },
      async validateDictionary(): Promise<void> {
        await validateDictionary(denops);
      },
    };
    await updatePluginState(denops as any);
  } catch (error) {
    console.error("Plugin initialization failed:", error);
    await updatePluginState(denops as any);
    throw error;
  }
}
export async function detectWordsOptimized(denops: Denops, bufnr: number): Promise<Word[]> {
  const cacheKey = `detectWords:${bufnr}`;
  const cached = wordsCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const result = await detectWordsWithManager(denops, config as any);
  const words = (result as any).words || result;
  const wordsArray = Array.isArray(words) ? words : [];
  wordsCache.set(cacheKey, wordsArray);
  return wordsArray;
}
export function generateHintsOptimized(wordCount: number, markers: string[]): string[] {
  const cacheKey = `generateHints:${wordCount}:${markers.join("")}`;
  const cached = hintsCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const hints = generateHints(wordCount, markers);
  hintsCache.set(cacheKey, hints);
  return hints;
}
export async function displayHintsOptimized(
  denops: Denops,
  words: Word[],
  hints: string[],
  config: UnifiedConfig,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
): Promise<void> {
  const cursorLine = await denops.call("line", ".") as number;
  const cursorCol = await denops.call("col", ".") as number;
  currentHints = assignHintsToWords(words, hints, cursorLine, cursorCol, 'normal', fromUnifiedConfig(config));
  hintsVisible = true;
  await displayHintsBatched(denops, currentHints, config, extmarkNamespace, fallbackMatchIds);
}
let _isRenderingHints = false;
const HIGHLIGHT_BATCH_SIZE = 15;
export function displayHintsAsync(
  denops: Denops,
  config: UnifiedConfig,
  hints: HintMapping[],
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
): Promise<void> {
  return displayHintsBatched(denops, hints, config, extmarkNamespace, fallbackMatchIds);
}
export function isRenderingHints(): boolean {
  return _isRenderingHints;
}
export function abortCurrentRendering(): void {
  _isRenderingHints = false;
}
async function displayHintsBatched(
  denops: Denops,
  hints: HintMapping[],
  config: UnifiedConfig,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
): Promise<void> {
  _isRenderingHints = true;
  try {
    for (let i = 0; i < hints.length; i += HIGHLIGHT_BATCH_SIZE) {
      if (!_isRenderingHints) break;
      const batch = hints.slice(i, i + HIGHLIGHT_BATCH_SIZE);
      if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
        await processExtmarksBatched(denops, batch, config, extmarkNamespace);
      } else if (fallbackMatchIds) {
        await processMatchaddBatched(denops, batch, config, fallbackMatchIds);
      }
      if (i + HIGHLIGHT_BATCH_SIZE < hints.length) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
  } finally {
    _isRenderingHints = false;
  }
}
async function clearHintDisplay(denops: Denops): Promise<void> {
  if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
    await denops.call("nvim_buf_clear_namespace", 0, extmarkNamespace, 0, -1);
  } else {
    for (const matchId of fallbackMatchIds) {
      try {
        await denops.call("matchdelete", matchId);
      } catch {
        // Ignore errors for non-existent matches
      }
    }
    fallbackMatchIds.length = 0;
  }
}
export async function hideHints(denops: Denops): Promise<void> {
  const startTime = performance.now();
  try {
    abortCurrentRendering();
    await clearHintDisplay(denops);
    hintsVisible = false;
    currentHints = [];
  } finally {
    recordPerformance("hideHints", performance.now() - startTime);
  }
}
export function highlightCandidateHintsAsync(
  denops: Denops,
  input: string,
  hints: HintMapping[],
  config: UnifiedConfig,
): Promise<void> {
  return highlightCandidateHintsOptimized(denops, input, hints, config);
}
async function highlightCandidateHintsOptimized(
  denops: Denops,
  input: string,
  hints: HintMapping[],
  config: UnifiedConfig,
): Promise<void> {
  const candidates = hints.filter(h => h.hint.startsWith(input));
  await clearHintDisplay(denops);
  await displayHintsBatched(denops, candidates, config, extmarkNamespace, fallbackMatchIds);
}
async function processExtmarksBatched(
  denops: Denops,
  hints: HintMapping[],
  config: UnifiedConfig,
  extmarkNamespace: number,
): Promise<void> {
  for (const hint of hints) {
    const position = calculateHintPositionWithCoordinateSystem(hint.word, 'offset');
    await denops.call("nvim_buf_set_extmark", 0, extmarkNamespace, position.line - 1, position.col - 1, {
      virt_text: [[hint.hint, "Search"]],
      virt_text_pos: "overlay",
    });
  }
}
async function processMatchaddBatched(
  denops: Denops,
  hints: HintMapping[],
  config: UnifiedConfig,
  fallbackMatchIds: number[],
): Promise<void> {
  for (const hint of hints) {
    const position = calculateHintPosition(hint.word, 'offset');
    const pattern = `\\%${position.line}l\\%${position.col}c.\\{${hint.hint.length}}`;
    const matchId = await denops.call("matchadd", "Search", pattern) as number;
    fallbackMatchIds.push(matchId);
  }
}
export function validateConfig(cfg: Partial<Config>): { valid: boolean; errors: string[] } {
  return { valid: true, errors: [] };
}
export function getDefaultConfig(): Config {
  return fromUnifiedConfig(getDefaultUnifiedConfig());
}
export function validateHighlightGroupName(groupName: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(groupName);
}
export function isValidColorName(colorName: string): boolean {
  return ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'].includes(colorName.toLowerCase());
}
export function isValidHexColor(hexColor: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hexColor);
}
export function normalizeColorName(color: string): string {
  return color.toLowerCase();
}
export function validateHighlightColor(color: HighlightColor): { valid: boolean; errors: string[] } {
  return { valid: true, errors: [] };
}
export function generateHighlightCommand(groupName: string, color: HighlightColor): string {
  return `highlight ${groupName} ctermfg=${color.fg || 'NONE'} ctermbg=${color.bg || 'NONE'}`;
}
export function validateHighlightConfig(config: { [key: string]: HighlightColor }): { valid: boolean; errors: string[] } {
  return { valid: true, errors: [] };
}
async function getCoreForDictionary(denops: Denops): Promise<Core> {
  return Core.getInstance();
}
async function initializeDictionarySystem(denops: Denops): Promise<void> {
  try {
    const core = await getCoreForDictionary(denops);
    await core.initializeDictionarySystem(denops);
  } catch (error) {
    console.error("Failed to initialize dictionary system:", error);
  }
}
export async function reloadDictionary(denops: Denops): Promise<void> {
  try {
    const core = await getCoreForDictionary(denops);
    await core.reloadDictionary(denops);
  } catch (error) {
    await denops.cmd(`echoerr "Failed to reload dictionary: ${error}"`);
  }
}
export async function addToDictionary(denops: Denops, word: string, meaning?: string, type?: string): Promise<void> {
  try {
    const core = await getCoreForDictionary(denops);
    await core.addToDictionary(denops, word, meaning || '', type || '');
  } catch (error) {
    await denops.cmd(`echoerr "Failed to add to dictionary: ${error}"`);
  }
}
export async function editDictionary(denops: Denops): Promise<void> {
  try {
    const core = await getCoreForDictionary(denops);
    await core.editDictionary(denops);
  } catch (error) {
    await denops.cmd(`echoerr "Failed to edit dictionary: ${error}"`);
  }
}
export async function showDictionary(denops: Denops): Promise<void> {
  try {
    const core = await getCoreForDictionary(denops);
    await core.showDictionary(denops);
  } catch (error) {
    await denops.cmd(`echoerr "Failed to show dictionary: ${error}"`);
  }
}
export async function validateDictionary(denops: Denops): Promise<void> {
  try {
    const core = await getCoreForDictionary(denops);
    await core.validateDictionary(denops);
  } catch (error) {
    await denops.cmd(`echoerr "Failed to validate dictionary: ${error}"`);
  }
}
// Export necessary functions for dispatcher and testing
export {
  clearDebugInfo,
  collectDebugInfo,
  syncManagerConfig,
};