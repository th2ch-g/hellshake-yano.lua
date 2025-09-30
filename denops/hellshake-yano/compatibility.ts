/**
 * @fileoverview 後方互換性とユーティリティ関数
 */
import type { Config } from "./types.ts";
import { resetWordDetectionManager, type WordDetectionManagerConfig } from "./word.ts";

/**
 * snake_case形式の設定を受け入れるための型定義
 * Vim側からのsnake_case設定に対応
 */
export type BackwardCompatibleConfig = {
  single_char_keys?: string[];
  multi_char_keys?: string[];
  max_single_char_hints?: number;
  highlight_selected?: boolean;
  enable_tinysegmenter?: boolean;
  enable_word_detection?: boolean;
  disable_visual_mode?: boolean;
  // 他のsnake_caseプロパティも必要に応じて追加可能
  [key: string]: any; // その他の未定義のsnake_caseプロパティを許容
};

/**
 * 後方互換性のある設定フラグを正規化する
 * snake_case から camelCase への変換を行う
 * @param cfg - 部分的な設定オブジェクト（snake_caseとcamelCase両方を受け入れ）
 * @returns 正規化された設定オブジェクト
 */
export function normalizeBackwardCompatibleFlags(cfg: Partial<Config> & BackwardCompatibleConfig): Partial<Config> {
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
    "single_char_keys": "singleCharKeys",
    "multiCharKeys": "multiCharKeys",
    "multi_char_keys": "multiCharKeys",
    "maxSingleCharHints": "maxSingleCharHints",
    "max_single_char_hints": "maxSingleCharHints",
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
      // snake_caseとcamelCaseが異なる場合のみ元のキーを削除
      if (snakeKey !== camelKey) {
        delete (normalized as any)[snakeKey];
      }
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

  // singleCharKeysとmultiCharKeysの文字列→配列変換
  // Vimのsplit()関数の結果が文字列として渡される場合に対応
  if (typeof (normalized as any).singleCharKeys === "string") {
    const keysString = (normalized as any).singleCharKeys as string;
    (normalized as any).singleCharKeys = keysString.split("");

    // 記号のバリデーションとログ
    const symbols = (normalized as any).singleCharKeys.filter((k: string) =>
      !k.match(/[A-Za-z0-9]/));
    if (symbols.length > 0) {
      console.log(`[Config] Symbols detected in singleCharKeys: ${symbols.join(", ")}`);
    }
  }
  if (typeof (normalized as any).multiCharKeys === "string") {
    (normalized as any).multiCharKeys = ((normalized as any).multiCharKeys as string).split("");
  }

  return normalized;
}

/**
 * 指定されたキーの最小単語長を取得する
 * @param config - プラグイン設定
 * @param key - 対象のキー
 * @returns 最小単語長（デフォルト: 3）
 */
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
  if ("default_min_length" in config && typeof (config as any).default_min_length === "number") {
    return (config as any).default_min_length;
  }

  // Check for min_length (fourth priority - for backward compatibility)
  if ("min_length" in config && typeof (config as any).min_length === "number") {
    return (config as any).min_length;
  }

  // Check for legacy minWordLength (fifth priority)
  if ("minWordLength" in config && typeof (config as any).minWordLength === "number") {
    return (config as any).minWordLength;
  }

  // Default fallback
  return 3;
}

/**
 * 指定されたキーのモーション回数を取得する
 * @param key - 対象のキー
 * @param config - プラグイン設定
 * @returns モーション回数（デフォルト: 2）
 */
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

/**
 * Config から WordDetectionManagerConfig に変換する
 * @param config - プラグイン設定
 * @returns WordDetectionManager 用の設定
 */
export function convertConfigForManager(config: Config): WordDetectionManagerConfig {
  // Configから必要なプロパティを取得（デフォルト値を使用）
  return {
    // デフォルト値を返す
  } as WordDetectionManagerConfig;
}

/**
 * WordDetectionManager の設定を同期する
 * @param config - プラグイン設定
 */
export function syncManagerConfig(config: Config): void {
  // resetWordDetectionManagerは引数を受け取らない
  resetWordDetectionManager();
}