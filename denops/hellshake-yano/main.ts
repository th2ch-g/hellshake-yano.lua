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
  validateUnifiedConfig,
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
  // Check for per_key_min_length first (highest priority)
  if ('per_key_min_length' in config && config.per_key_min_length && typeof config.per_key_min_length === 'object') {
    const perKeyValue = (config.per_key_min_length as Record<string, number>)[key];
    if (perKeyValue !== undefined) return perKeyValue;
  }

  // Check for default_min_word_length (second priority)
  if ('default_min_word_length' in config && typeof config.default_min_word_length === 'number') {
    return config.default_min_word_length;
  }

  // Check for default_min_length (third priority)
  if ('default_min_length' in config && typeof config.default_min_length === 'number') {
    return config.default_min_length;
  }

  // Check for min_length (fourth priority)
  if ('min_length' in config && typeof config.min_length === 'number') {
    return config.min_length;
  }

  // Check for legacy min_word_length (fifth priority)
  if ('min_word_length' in config && typeof config.min_word_length === 'number') {
    return config.min_word_length;
  }

  // Default fallback
  return 3;
}
export function getMotionCountForKey(key: string, config: UnifiedConfig | Config): number {
  // Check for per_key_motion_count first (highest priority)
  if ('per_key_motion_count' in config && config.per_key_motion_count && typeof config.per_key_motion_count === 'object') {
    const perKeyValue = (config.per_key_motion_count as Record<string, number>)[key];
    if (perKeyValue !== undefined && perKeyValue >= 1 && Number.isInteger(perKeyValue)) {
      return perKeyValue;
    }
  }

  // Check for default_motion_count (second priority)
  if ('default_motion_count' in config && typeof config.default_motion_count === 'number') {
    return config.default_motion_count;
  }

  // Check for motionCount (UnifiedConfig)
  if ('motionCount' in config && typeof config.motionCount === 'number') {
    return config.motionCount;
  }

  // Check for motion_count (Config)
  if ('motion_count' in config && typeof config.motion_count === 'number') {
    return config.motion_count;
  }

  // Default fallback
  return 2;
}
function collectDebugInfo(): DebugInfo {
  return {
    hintsVisible,
    currentHints,
    config,
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
  // UnifiedConfigから必要なプロパティを取得（デフォルト値を使用）
  return {
    // デフォルト値を返す
  } as WordDetectionManagerConfig;
}
function syncManagerConfig(config: UnifiedConfig): void {
  // resetWordDetectionManagerは引数を受け取らない
  resetWordDetectionManager();
}
export async function main(denops: Denops): Promise<void> {
  try {
    await initializePlugin(denops);
    // g:hellshake_yano_configが未定義の場合は空のオブジェクトをフォールバック
    const userConfig = await denops.eval('g:hellshake_yano_config').catch(() => ({})) as Partial<Config>;
    const normalizedUserConfig = normalizeBackwardCompatibleFlags(userConfig);
    const unifiedUserConfig = toUnifiedConfig(normalizedUserConfig);
    // UnifiedConfigとConfigの型不一致を解決
    const defaultConfig = getDefaultUnifiedConfig();
    config = { ...defaultConfig, ...unifiedUserConfig } as UnifiedConfig;
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
        if (typeof count === 'number') {
          setCount(config, count);
        }
      },
      async setTimeout(timeout: unknown): Promise<void> {
        if (typeof timeout === 'number') {
          setTimeoutCommand(config, timeout);
        }
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
        return getPluginStatistics();
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
      async showHintsWithKey(key: unknown, mode?: unknown): Promise<void> {
        const core = Core.getInstance(config);
        await core.showHintsWithKey(
          denops,
          typeof key === "string" ? key : "",
          typeof mode === "string" ? mode : undefined
        );
      },
      async showHintsInternal(mode?: unknown): Promise<void> {
        const core = Core.getInstance(config);
        await core.showHintsInternal(
          denops,
          typeof mode === "string" ? mode : "normal"
        );
      },
      async updateConfig(cfg: unknown): Promise<void> {
        if (typeof cfg === "object" && cfg !== null) {
          const core = Core.getInstance(config);
          core.updateConfig(cfg as Partial<Config>);
          // グローバル設定も更新
          const unifiedUserConfig = toUnifiedConfig(cfg as Partial<Config>);
          config = { ...config, ...unifiedUserConfig };
          syncManagerConfig(config);
        }
      },
      async clearCache(): Promise<void> {
        const core = Core.getInstance(config);
        core.clearCache();
      },
      async debug(): Promise<DebugInfo> {
        const core = Core.getInstance(config);
        return core.collectDebugInfo();
      },
      async clearPerformanceLog(): Promise<void> {
        performanceMetrics = {
          showHints: [],
          hideHints: [],
          wordDetection: [],
          hintGeneration: [],
        };
      },
    };
    updatePluginState({ status: "initialized" } as any);
  } catch (error) {
    console.error("Plugin initialization failed:", error);
    updatePluginState({ status: "error" } as any);
    throw error;
  }
}
export async function detectWordsOptimized(denops: Denops, bufnr: number): Promise<Word[]> {
  const cacheKey = `detectWords:${bufnr}`;
  const cached = wordsCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  // detectWordsWithManagerの新しいシグネチャに合わせる
  const result = await detectWordsWithManager(denops, {});
  const words = Array.isArray(result) ? result : result.words || [];
  wordsCache.set(cacheKey, words);
  return words;
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
  // カーソル位置を取得 (デフォルト値を使用)
  const cursorLine = 1;
  const cursorCol = 1;
  currentHints = assignHintsToWords(words, hints, cursorLine, cursorCol, "normal");
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
  onComplete?: () => void,
): void {
  // Fire and forget - don't return the Promise
  highlightCandidateHintsOptimized(denops, input, hints, config)
    .then(() => {
      // 処理完了時にコールバックを呼び出し
      if (onComplete) {
        onComplete();
      }
    })
    .catch(err => {
      console.error("highlightCandidateHintsAsync error:", err);
      // エラーが発生してもコールバックは呼び出す
      if (onComplete) {
        onComplete();
      }
    });
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
  // null値の明示的チェック
  const errors: string[] = [];
  const c = cfg as any;

  // highlight_hint_marker のnullチェック
  if (c.highlight_hint_marker === null) {
    errors.push("highlight_hint_marker must be a string");
  }

  // highlight_hint_marker のempty string チェック
  if (c.highlight_hint_marker === '') {
    errors.push("highlight_hint_marker must be a non-empty string");
  }

  // highlight_hint_marker_current のnullチェック
  if (c.highlight_hint_marker_current === null) {
    errors.push("highlight_hint_marker_current must be a string");
  }

  // highlight_hint_marker_current のempty string チェック
  if (c.highlight_hint_marker_current === '') {
    errors.push("highlight_hint_marker_current must be a non-empty string");
  }

  // 数値型のチェック
  if (typeof c.highlight_hint_marker === 'number') {
    errors.push("highlight_hint_marker must be a string");
  }

  if (typeof c.highlight_hint_marker_current === 'number') {
    errors.push("highlight_hint_marker_current must be a string");
  }

  // 配列型のチェック
  if (Array.isArray(c.highlight_hint_marker)) {
    errors.push("highlight_hint_marker must be a string");
  }

  if (Array.isArray(c.highlight_hint_marker_current)) {
    errors.push("highlight_hint_marker_current must be a string");
  }

  // ハイライトグループ名として有効な文字列であるかチェック
  if (typeof c.highlight_hint_marker === 'string' && c.highlight_hint_marker !== '') {
    // 最初の文字が数字で始まる場合
    if (/^[0-9]/.test(c.highlight_hint_marker)) {
      errors.push("highlight_hint_marker must start with a letter or underscore");
    }
    // アルファベット、数字、アンダースコア以外の文字を含む場合
    else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(c.highlight_hint_marker)) {
      errors.push("highlight_hint_marker must contain only alphanumeric characters and underscores");
    }
    // 100文字を超える場合
    else if (c.highlight_hint_marker.length > 100) {
      errors.push("highlight_hint_marker must be 100 characters or less");
    }
  }

  if (typeof c.highlight_hint_marker_current === 'string' && c.highlight_hint_marker_current !== '') {
    // 最初の文字が数字で始まる場合
    if (/^[0-9]/.test(c.highlight_hint_marker_current)) {
      errors.push("highlight_hint_marker_current must start with a letter or underscore");
    }
    // アルファベット、数字、アンダースコア以外の文字を含む場合
    else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(c.highlight_hint_marker_current)) {
      errors.push("highlight_hint_marker_current must contain only alphanumeric characters and underscores");
    }
    // 100文字を超える場合
    else if (c.highlight_hint_marker_current.length > 100) {
      errors.push("highlight_hint_marker_current must be 100 characters or less");
    }
  }

  // 事前チェックでエラーがある場合は早期返却
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // ConfigをUnifiedConfigに変換してバリデーション
  const unifiedConfig = toUnifiedConfig(cfg);
  const result = validateUnifiedConfig(unifiedConfig);

  // エラーメッセージをsnake_case形式に変換
  // 注意: maxHints と debounceDelay は新しいUnified Config APIの一部で、camelCase形式を保持します
  const snakeCaseErrors = result.errors.map(err => {
    return err
      .replace('motionCount', 'motion_count')
      .replace('motionTimeout', 'motion_timeout')
      .replace('hintPosition', 'hint_position')
      .replace('visualHintPosition', 'visual_hint_position')
      .replace('useNumbers', 'use_numbers');
  });

  return { valid: result.valid, errors: snakeCaseErrors };
}
export function getDefaultConfig(): Config {
  return fromUnifiedConfig(getDefaultUnifiedConfig());
}
export function validateHighlightGroupName(groupName: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(groupName);
}
export function isValidColorName(colorName: string): boolean {
  if (typeof colorName !== 'string') return false;
  const standardColors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray', 'grey', 'none'];
  return standardColors.includes(colorName.toLowerCase());
}
export function isValidHexColor(hexColor: string): boolean {
  if (typeof hexColor !== 'string') return false;
  // Support both 3-digit and 6-digit hex colors
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hexColor);
}
export function normalizeColorName(color: string): string {
  if (typeof color !== 'string') return '';
  // Capitalize first letter for standard Vim color names
  if (color.toLowerCase() === 'none') return 'None';
  return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
}
export function validateHighlightColor(color: HighlightColor): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Handle null/undefined input
  if (!color || typeof color !== 'object') {
    errors.push('Invalid highlight color object');
    return { valid: false, errors };
  }

  // Empty object is invalid
  if (Object.keys(color).length === 0 && !('fg' in color) && !('bg' in color)) {
    errors.push('Highlight color must have fg or bg property');
    return { valid: false, errors };
  }

  if (color.fg !== undefined && color.fg !== null) {
    // Type check: only string is allowed
    if (typeof color.fg !== 'string') {
      errors.push('fg must be a string');
    } else {
      const fg = color.fg;
      if (fg === '') {
        errors.push('fg cannot be empty string');
      } else if (!isValidColorName(fg) && !isValidHexColor(fg) && fg.toLowerCase() !== 'none') {
        errors.push(`Invalid fg color: ${fg}`);
      }
    }
  }

  if (color.bg !== undefined && color.bg !== null) {
    // Type check: only string is allowed
    if (typeof color.bg !== 'string') {
      errors.push('bg must be a string');
    } else {
      const bg = color.bg;
      if (bg === '') {
        errors.push('bg cannot be empty string');
      } else if (!isValidColorName(bg) && !isValidHexColor(bg) && bg.toLowerCase() !== 'none') {
        errors.push(`Invalid bg color: ${bg}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
export function generateHighlightCommand(groupName: string, color: HighlightColor): string {
  const parts = [`highlight ${groupName}`];

  if (color.fg) {
    const fg = color.fg.toLowerCase() === 'none' ? 'None' :
               isValidHexColor(color.fg) ? color.fg :
               color.fg.charAt(0).toUpperCase() + color.fg.slice(1).toLowerCase();
    if (isValidHexColor(color.fg)) {
      parts.push(`guifg=${fg}`);
    } else {
      parts.push(`ctermfg=${fg}`);
      parts.push(`guifg=${fg}`);
    }
  }

  if (color.bg) {
    const bg = color.bg.toLowerCase() === 'none' ? 'None' :
               isValidHexColor(color.bg) ? color.bg :
               color.bg.charAt(0).toUpperCase() + color.bg.slice(1).toLowerCase();
    if (isValidHexColor(color.bg)) {
      parts.push(`guibg=${bg}`);
    } else {
      parts.push(`ctermbg=${bg}`);
      parts.push(`guibg=${bg}`);
    }
  }

  return parts.join(' ');
}
export function validateHighlightConfig(config: { [key: string]: any }): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Handle various config key formats
  const highlightKeys = ['highlightHintMarker', 'highlightHintMarkerCurrent', 'highlight_hint_marker', 'highlight_hint_marker_current'];

  for (const [key, value] of Object.entries(config)) {
    // Only validate known highlight configuration keys
    if (!highlightKeys.includes(key)) continue;

    if (typeof value === 'string') {
      // String values are valid as highlight group names
      // But some special strings are invalid as group names
      if (value.includes('-') || value.includes(' ') || /^\d/.test(value) || value === '') {
        errors.push(`Invalid highlight group name for ${key}: ${value}`);
      }
    } else if (typeof value === 'object' && value !== null) {
      // Check if it's a valid color object
      if (!('fg' in value || 'bg' in value)) {
        // Empty object or invalid structure
        errors.push(`Invalid highlight config for ${key}: must have fg or bg`);
      } else {
        // Validate individual color properties
        if ('fg' in value) {
          const fg = value.fg;
          if (fg === null) {
            errors.push(`fg must be a string for ${key}`);
          } else if (fg !== undefined) {
            if (typeof fg !== 'string') {
              errors.push(`fg must be a string for ${key}`);
            } else {
              const fgStr = fg;
              if (fgStr === '') {
                errors.push(`fg cannot be empty string for ${key}`);
              } else if (!isValidColorName(fgStr) && !isValidHexColor(fgStr) && fgStr.toLowerCase() !== 'none') {
                // It might be a highlight group name
                if (!validateHighlightGroupName(fgStr)) {
                  errors.push(`Invalid value for ${key}.fg: ${fgStr}`);
                }
              }
            }
          }
        }
        if ('bg' in value) {
          const bg = value.bg;
          if (bg === null) {
            errors.push(`bg must be a string for ${key}`);
          } else if (bg !== undefined) {
            if (typeof bg !== 'string') {
              errors.push(`bg must be a string for ${key}`);
            } else {
              const bgStr = bg;
              if (bgStr === '') {
                errors.push(`bg cannot be empty string for ${key}`);
              } else if (!isValidColorName(bgStr) && !isValidHexColor(bgStr) && bgStr.toLowerCase() !== 'none') {
                if (!validateHighlightGroupName(bgStr)) {
                  errors.push(`Invalid value for ${key}.bg: ${bgStr}`);
                }
              }
            }
          }
        }
      }
    } else {
      errors.push(`Invalid highlight config for ${key}`);
    }
  }

  return { valid: errors.length === 0, errors };
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
