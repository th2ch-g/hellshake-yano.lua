/**
 * @fileoverview Hellshake-Yano.vim main entry point
 */
import type { Denops } from "@denops/std";
import { detectWordsWithManager } from "./word.ts";
import { resetWordDetectionManager, type WordDetectionManagerConfig } from "./word.ts";
import {
  assignHintsToWords,
  calculateHintPosition,
  calculateHintPositionWithCoordinateSystem,
  generateHints,
} from "./hint.ts";
import { Core } from "./core.ts";
import type { DebugInfo, HighlightColor, HintMapping, PerformanceMetrics, Word } from "./types.ts";
import {
  Config,
  DEFAULT_CONFIG,
  getPerKeyValue,
  mergeConfig,
  validateConfig as validateConfigFromConfig,
} from "./config.ts";
// Re-export types for backward compatibility
export type { Config, HighlightColor };
// Re-export functions for tests
export { getDefaultConfig } from "./config.ts";
import { LRUCache } from "./cache.ts";
let config: Config = DEFAULT_CONFIG;
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
export function getMinLengthForKey(config: Config, key: string): number {
  // Check for perKeyMinLength first (highest priority)
  if (
    "perKeyMinLength" in config && config.perKeyMinLength &&
    typeof config.perKeyMinLength === "object"
  ) {
    const perKeyValue = (config.perKeyMinLength as Record<string, number>)[key];
    if (perKeyValue !== undefined && perKeyValue > 0) return perKeyValue;
  }

  // Check for defaultMinWordLength (second priority)
  if ("defaultMinWordLength" in config && typeof config.defaultMinWordLength === "number") {
    return config.defaultMinWordLength;
  }

  // Check for default_min_length (third priority - for backward compatibility)
  if ("default_min_length" in config && typeof config.default_min_length === "number") {
    return config.default_min_length;
  }

  // Check for min_length (fourth priority - for backward compatibility)
  if ("min_length" in config && typeof config.min_length === "number") {
    return config.min_length;
  }

  // Check for legacy minWordLength (fifth priority)
  if ("minWordLength" in config && typeof config.minWordLength === "number") {
    return config.minWordLength;
  }

  // Default fallback
  return 3;
}
export function getMotionCountForKey(key: string, config: Config): number {
  // Check for perKeyMotionCount first (highest priority)
  if (
    "perKeyMotionCount" in config && config.perKeyMotionCount &&
    typeof config.perKeyMotionCount === "object"
  ) {
    const perKeyValue = (config.perKeyMotionCount as Record<string, number>)[key];
    if (perKeyValue !== undefined && perKeyValue >= 1 && Number.isInteger(perKeyValue)) {
      return perKeyValue;
    }
  }

  // Check for defaultMotionCount (second priority)
  if ("defaultMotionCount" in config && typeof config.defaultMotionCount === "number") {
    return config.defaultMotionCount;
  }

  // Check for motionCount (Config)
  if ("motionCount" in config && typeof config.motionCount === "number") {
    return config.motionCount;
  }

  // Check for motion_count (Config)
  if ("motion_count" in config && typeof config.motionCount === "number") {
    return config.motionCount;
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

export function normalizeBackwardCompatibleFlags(cfg: Partial<Config>): Partial<Config> {
  const normalized = { ...cfg };

  // Config では camelCase 形式で直接処理
  // snake_case から camelCase への変換を行う
  const snakeToCamelMap: Record<string, string> = {
    "motionCount": "motionCount",
    "motionTimeout": "motionTimeout",
    "hintPosition": "hintPosition",
    "triggerOnHjkl": "triggerOnHjkl",
    "countedMotions": "countedMotions",
    "useNumbers": "useNumbers",
    "highlightSelected": "highlightSelected",
    "highlight_selected": "highlightSelected",
    "debugCoordinates": "debugCoordinates",
    "singleCharKeys": "singleCharKeys",
    "multiCharKeys": "multiCharKeys",
    "maxSingleCharHints": "maxSingleCharHints",
    "useHintGroups": "useHintGroups",
    "highlightHintMarker": "highlightHintMarker",
    "highlightHintMarkerCurrent": "highlightHintMarkerCurrent",
    "suppressOnKeyRepeat": "suppressOnKeyRepeat",
    "keyRepeatThreshold": "keyRepeatThreshold",
    "useJapanese": "useJapanese",
    "wordDetectionStrategy": "wordDetectionStrategy",
    "enable_tinysegmenter": "enableTinySegmenter",
    "segmenterThreshold": "segmenterThreshold",
    "japaneseMinWordLength": "japaneseMinWordLength",
    "japaneseMergeParticles": "japaneseMergeParticles",
    "japaneseMergeThreshold": "japaneseMergeThreshold",
    "perKeyMinLength": "perKeyMinLength",
    "defaultMinWordLength": "defaultMinWordLength",
    "perKeyMotionCount": "perKeyMotionCount",
    "defaultMotionCount": "defaultMotionCount",
    "currentKeyContext": "currentKeyContext",
    "debugMode": "debugMode",
    "performanceLog": "performanceLog",
  };

  // snake_case のプロパティを camelCase に変換
  for (const [snakeKey, camelKey] of Object.entries(snakeToCamelMap)) {
    if (snakeKey in normalized) {
      (normalized as any)[camelKey] = (normalized as any)[snakeKey];
      delete (normalized as any)[snakeKey];
    }
  }

  // 追加の後方互換性フラグの正規化
  if ("enable_word_detection" in normalized) {
    (normalized as any).enableWordDetection = (normalized as any).enable_word_detection;
    delete (normalized as any).enable_word_detection;
  }
  if ("disable_visual_mode" in normalized) {
    (normalized as any).disableVisualMode = (normalized as any).disable_visual_mode;
    delete (normalized as any).disable_visual_mode;
  }

  return normalized;
}
function convertConfigForManager(config: Config): WordDetectionManagerConfig {
  // Configから必要なプロパティを取得（デフォルト値を使用）
  return {
    // デフォルト値を返す
  } as WordDetectionManagerConfig;
}
function syncManagerConfig(config: Config): void {
  // resetWordDetectionManagerは引数を受け取らない
  resetWordDetectionManager();
}
export async function main(denops: Denops): Promise<void> {
  try {
    // initializePluginはcore.tsに統合されているのでCoreクラス経由で呼び出し
    const core = Core.getInstance(DEFAULT_CONFIG);
    await core.initializePlugin(denops);
    // g:hellshake_yanoが未定義の場合は空のオブジェクトをフォールバック
    const userConfig = await denops.eval("g:hellshake_yano").catch(() => ({})) as Partial<
      Config
    >;
    const normalizedUserConfig = normalizeBackwardCompatibleFlags(userConfig);
    // Configを直接使用
    const defaultConfig = DEFAULT_CONFIG;
    config = { ...defaultConfig, ...normalizedUserConfig } as Config;
    // Coreインスタンスの設定を更新（use_japanese, enable_tinysegmenterなどが反映される）
    core.updateConfig(config);
    syncManagerConfig(config);
    if (denops.meta.host === "nvim") {
      extmarkNamespace = await denops.call("nvim_create_namespace", "hellshake-yano") as number;
    }
    await initializeDictionarySystem(denops);
    denops.dispatcher = {
      async enable(): Promise<void> {
        const core = Core.getInstance(config);
        core.enable();
      },
      async disable(): Promise<void> {
        const core = Core.getInstance(config);
        core.disable();
      },
      async toggle(): Promise<void> {
        const core = Core.getInstance(config);
        core.toggle();
      },
      async setCount(count: unknown): Promise<void> {
        if (typeof count === "number") {
          const core = Core.getInstance(config);
          core.setMotionThreshold(count);
        }
      },
      async setTimeout(timeout: unknown): Promise<void> {
        if (typeof timeout === "number") {
          const core = Core.getInstance(config);
          core.setMotionTimeout(timeout);
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
      async getConfig(): Promise<Config> {
        return config;
      },
      async validateConfig(cfg: unknown): Promise<{ valid: boolean; errors: string[] }> {
        return validateConfig(cfg as Partial<Config>);
      },
      async healthCheck(): Promise<void> {
        const core = Core.getInstance(config);
        await core.getHealthStatus(denops);
      },
      async getStatistics(): Promise<unknown> {
        const core = Core.getInstance(config);
        return core.getStatistics();
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
            typeof type === "string" ? type : undefined,
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
          typeof mode === "string" ? mode : undefined,
        );
      },
      async showHintsInternal(mode?: unknown): Promise<void> {
        const core = Core.getInstance(config);
        await core.showHintsInternal(
          denops,
          typeof mode === "string" ? mode : "normal",
        );
      },
      async updateConfig(cfg: unknown): Promise<void> {
        if (typeof cfg === "object" && cfg !== null) {
          const core = Core.getInstance(config);
          const configUpdate = cfg as Partial<Config>;
          // 正規化を追加（snake_case -> camelCase変換）
          const normalizedConfig = normalizeBackwardCompatibleFlags(configUpdate);
          core.updateConfig(normalizedConfig);
          // グローバル設定も更新（直接Configを使用）
          config = { ...config, ...normalizedConfig };
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
    // updatePluginStateはcore.tsに統合されたため、必要に応じてCoreクラス経由で呼び出し
  } catch (error) {
    console.error("Plugin initialization failed:", error);
    // updatePluginStateはcore.tsに統合されたため、必要に応じてCoreクラス経由で呼び出し
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
  config: Config,
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
  config: Config,
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
  config: Config,
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
        await new Promise((resolve) => setTimeout(resolve, 1));
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

// タイマー管理用の変数
let pendingHighlightTimerId: number | undefined;

/**
 * テスト環境の検出とバッファ時間の設定
 * テスト環境では競合を防ぐため、より長いタイムアウトを使用
 */
function getTimeoutDelay(): number {
  // Deno テスト環境またはCI環境を検出
  const isDeno = typeof Deno !== "undefined";
  const isTest = isDeno && (Deno.env?.get?.("DENO_TEST") === "1" || Deno.args?.includes?.("test"));
  const isCI = isDeno && Deno.env?.get?.("CI") === "true";

  // テスト環境では20ms、CI環境では30ms、本番では0ms
  if (isCI) return 30;
  if (isTest) return 20;
  return 0;
}

/**
 * テスト用のクリーンアップ関数
 * ペンディング中のタイマーをクリアする
 */
export function cleanupPendingTimers(): void {
  if (pendingHighlightTimerId !== undefined) {
    clearTimeout(pendingHighlightTimerId);
    pendingHighlightTimerId = undefined;
  }
}

export function highlightCandidateHintsAsync(
  denops: Denops,
  input: string,
  hints: HintMapping[],
  config: Config,
  onComplete?: () => void,
): void {
  // 既存のタイマーをクリア
  if (pendingHighlightTimerId !== undefined) {
    clearTimeout(pendingHighlightTimerId);
    pendingHighlightTimerId = undefined;
  }

  // Fire and forget - don't return the Promise
  // 環境に応じたタイムアウト遅延を使用
  const delay = getTimeoutDelay();
  pendingHighlightTimerId = setTimeout(() => {
    pendingHighlightTimerId = undefined;
    highlightCandidateHintsOptimized(denops, input, hints, config)
      .then(() => {
        // 処理完了時にコールバックを呼び出し
        if (onComplete) {
          onComplete();
        }
      })
      .catch((err) => {
        console.error("highlightCandidateHintsAsync error:", err);
        // エラーが発生してもコールバックは呼び出す
        if (onComplete) {
          onComplete();
        }
      });
  }, delay) as unknown as number;
}
async function highlightCandidateHintsOptimized(
  denops: Denops,
  input: string,
  hints: HintMapping[],
  config: Config,
): Promise<void> {
  const candidates = hints.filter((h) => h.hint.startsWith(input));
  await clearHintDisplay(denops);
  await displayHintsBatched(denops, candidates, config, extmarkNamespace, fallbackMatchIds);
}
async function processExtmarksBatched(
  denops: Denops,
  hints: HintMapping[],
  config: Config,
  extmarkNamespace: number,
): Promise<void> {
  for (const hint of hints) {
    const position = calculateHintPositionWithCoordinateSystem(hint.word, "offset");
    await denops.call(
      "nvim_buf_set_extmark",
      0,
      extmarkNamespace,
      position.line - 1,
      position.col - 1,
      {
        virt_text: [[hint.hint, "HellshakeYanoMarker"]],
        virt_text_pos: "overlay",
      },
    );
  }
}
async function processMatchaddBatched(
  denops: Denops,
  hints: HintMapping[],
  config: Config,
  fallbackMatchIds: number[],
): Promise<void> {
  for (const hint of hints) {
    const position = calculateHintPosition(hint.word, "offset");
    const pattern = `\\%${position.line}l\\%${position.col}c.\\{${hint.hint.length}}`;
    const matchId = await denops.call("matchadd", "HellshakeYanoMarker", pattern) as number;
    fallbackMatchIds.push(matchId);
  }
}
export function validateConfig(cfg: Partial<Config>): { valid: boolean; errors: string[] } {
  // null値の明示的チェック
  const errors: string[] = [];
  const c = cfg as any;

  // highlightHintMarker のnullチェック
  if (c.highlightHintMarker === null) {
    errors.push("highlightHintMarker must be a string");
  }

  // highlightHintMarker のempty string チェック
  if (c.highlightHintMarker === "") {
    errors.push("highlightHintMarker must be a non-empty string");
  }

  // highlightHintMarkerCurrent のnullチェック
  if (c.highlightHintMarkerCurrent === null) {
    errors.push("highlightHintMarkerCurrent must be a string");
  }

  // highlightHintMarkerCurrent のempty string チェック
  if (c.highlightHintMarkerCurrent === "") {
    errors.push("highlightHintMarkerCurrent must be a non-empty string");
  }

  // 数値型のチェック
  if (typeof c.highlightHintMarker === "number") {
    errors.push("highlightHintMarker must be a string");
  }

  if (typeof c.highlightHintMarkerCurrent === "number") {
    errors.push("highlightHintMarkerCurrent must be a string");
  }

  // 配列型のチェック
  if (Array.isArray(c.highlightHintMarker)) {
    errors.push("highlightHintMarker must be a string");
  }

  if (Array.isArray(c.highlightHintMarkerCurrent)) {
    errors.push("highlightHintMarkerCurrent must be a string");
  }

  // ハイライトグループ名として有効な文字列であるかチェック
  if (typeof c.highlightHintMarker === "string" && c.highlightHintMarker !== "") {
    // 最初の文字が数字で始まる場合
    if (/^[0-9]/.test(c.highlightHintMarker)) {
      errors.push("highlightHintMarker must start with a letter or underscore");
    } // アルファベット、数字、アンダースコア以外の文字を含む場合
    else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(c.highlightHintMarker)) {
      errors.push("highlightHintMarker must contain only alphanumeric characters and underscores");
    } // 100文字を超える場合
    else if (c.highlightHintMarker.length > 100) {
      errors.push("highlightHintMarker must be 100 characters or less");
    }
  }

  if (typeof c.highlightHintMarkerCurrent === "string" && c.highlightHintMarkerCurrent !== "") {
    // 最初の文字が数字で始まる場合
    if (/^[0-9]/.test(c.highlightHintMarkerCurrent)) {
      errors.push("highlightHintMarkerCurrent must start with a letter or underscore");
    } // アルファベット、数字、アンダースコア以外の文字を含む場合
    else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(c.highlightHintMarkerCurrent)) {
      errors.push(
        "highlightHintMarkerCurrent must contain only alphanumeric characters and underscores",
      );
    } // 100文字を超える場合
    else if (c.highlightHintMarkerCurrent.length > 100) {
      errors.push("highlightHintMarkerCurrent must be 100 characters or less");
    }
  }

  // 事前チェックでエラーがある場合は早期返却
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Configを直接バリデーション
  const configObj = cfg as Config;
  const result = validateConfigFromConfig(configObj);

  // Process4 sub3-2-3: camelCase統一 - エラーメッセージはそのまま返す
  // snake_caseは完全に廃止されたため、変換は不要
  return { valid: result.valid, errors: result.errors };
}
export function validateHighlightGroupName(groupName: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(groupName);
}
export function isValidColorName(colorName: string): boolean {
  if (typeof colorName !== "string") return false;
  const standardColors = [
    "black",
    "red",
    "green",
    "yellow",
    "blue",
    "magenta",
    "cyan",
    "white",
    "gray",
    "grey",
    "none",
  ];
  return standardColors.includes(colorName.toLowerCase());
}
export function isValidHexColor(hexColor: string): boolean {
  if (typeof hexColor !== "string") return false;
  // Support both 3-digit and 6-digit hex colors
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hexColor);
}
export function normalizeColorName(color: string): string {
  if (typeof color !== "string") return "";
  // Capitalize first letter for standard Vim color names
  if (color.toLowerCase() === "none") return "None";
  return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
}
export function validateHighlightColor(
  color: HighlightColor,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Handle null/undefined input
  if (!color || typeof color !== "object") {
    errors.push("Invalid highlight color object");
    return { valid: false, errors };
  }

  // Empty object is invalid
  if (Object.keys(color).length === 0 && !("fg" in color) && !("bg" in color)) {
    errors.push("Highlight color must have fg or bg property");
    return { valid: false, errors };
  }

  if (color.fg !== undefined && color.fg !== null) {
    // Type check: only string is allowed
    if (typeof color.fg !== "string") {
      errors.push("fg must be a string");
    } else {
      const fg = color.fg;
      if (fg === "") {
        errors.push("fg cannot be empty string");
      } else if (!isValidColorName(fg) && !isValidHexColor(fg) && fg.toLowerCase() !== "none") {
        errors.push(`Invalid fg color: ${fg}`);
      }
    }
  }

  if (color.bg !== undefined && color.bg !== null) {
    // Type check: only string is allowed
    if (typeof color.bg !== "string") {
      errors.push("bg must be a string");
    } else {
      const bg = color.bg;
      if (bg === "") {
        errors.push("bg cannot be empty string");
      } else if (!isValidColorName(bg) && !isValidHexColor(bg) && bg.toLowerCase() !== "none") {
        errors.push(`Invalid bg color: ${bg}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
export function generateHighlightCommand(groupName: string, color: HighlightColor): string {
  const parts = [`highlight ${groupName}`];

  if (color.fg) {
    const fg = color.fg.toLowerCase() === "none"
      ? "None"
      : isValidHexColor(color.fg)
      ? color.fg
      : color.fg.charAt(0).toUpperCase() + color.fg.slice(1).toLowerCase();
    if (isValidHexColor(color.fg)) {
      parts.push(`guifg=${fg}`);
    } else {
      parts.push(`ctermfg=${fg}`);
      parts.push(`guifg=${fg}`);
    }
  }

  if (color.bg) {
    const bg = color.bg.toLowerCase() === "none"
      ? "None"
      : isValidHexColor(color.bg)
      ? color.bg
      : color.bg.charAt(0).toUpperCase() + color.bg.slice(1).toLowerCase();
    if (isValidHexColor(color.bg)) {
      parts.push(`guibg=${bg}`);
    } else {
      parts.push(`ctermbg=${bg}`);
      parts.push(`guibg=${bg}`);
    }
  }

  return parts.join(" ");
}
export function validateHighlightConfig(
  config: { [key: string]: any },
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Handle various config key formats
  const highlightKeys = [
    "highlightHintMarker",
    "highlightHintMarkerCurrent",
    "highlight_hint_marker",
    "highlight_hint_marker_current",
  ];

  for (const [key, value] of Object.entries(config)) {
    // Only validate known highlight configuration keys
    if (!highlightKeys.includes(key)) continue;

    if (typeof value === "string") {
      // String values are valid as highlight group names
      // But some special strings are invalid as group names
      if (value.includes("-") || value.includes(" ") || /^\d/.test(value) || value === "") {
        errors.push(`Invalid highlight group name for ${key}: ${value}`);
      }
    } else if (typeof value === "object" && value !== null) {
      // Check if it's a valid color object
      if (!("fg" in value || "bg" in value)) {
        // Empty object or invalid structure
        errors.push(`Invalid highlight config for ${key}: must have fg or bg`);
      } else {
        // Validate individual color properties
        if ("fg" in value) {
          const fg = value.fg;
          if (fg === null) {
            errors.push(`fg must be a string for ${key}`);
          } else if (fg !== undefined) {
            if (typeof fg !== "string") {
              errors.push(`fg must be a string for ${key}`);
            } else {
              const fgStr = fg;
              if (fgStr === "") {
                errors.push(`fg cannot be empty string for ${key}`);
              } else if (
                !isValidColorName(fgStr) && !isValidHexColor(fgStr) &&
                fgStr.toLowerCase() !== "none"
              ) {
                // It might be a highlight group name
                if (!validateHighlightGroupName(fgStr)) {
                  errors.push(`Invalid value for ${key}.fg: ${fgStr}`);
                }
              }
            }
          }
        }
        if ("bg" in value) {
          const bg = value.bg;
          if (bg === null) {
            errors.push(`bg must be a string for ${key}`);
          } else if (bg !== undefined) {
            if (typeof bg !== "string") {
              errors.push(`bg must be a string for ${key}`);
            } else {
              const bgStr = bg;
              if (bgStr === "") {
                errors.push(`bg cannot be empty string for ${key}`);
              } else if (
                !isValidColorName(bgStr) && !isValidHexColor(bgStr) &&
                bgStr.toLowerCase() !== "none"
              ) {
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
export async function addToDictionary(
  denops: Denops,
  word: string,
  meaning?: string,
  type?: string,
): Promise<void> {
  try {
    const core = await getCoreForDictionary(denops);
    await core.addToDictionary(denops, word, meaning || "", type || "");
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
export { clearDebugInfo, collectDebugInfo, syncManagerConfig };
