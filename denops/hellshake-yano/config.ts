/**
 * 設定管理モジュール
 *
 * ⚠️ 重要な移行通知 ⚠️
 * ===================
 * Process2 Sub9: 旧インターフェース廃止予定
 *
 * 以下のインターフェースはv3.0.0で削除される予定です:
 * - CoreConfig      (@deprecated)
 * - HintConfig      (@deprecated)
 * - WordConfig      (@deprecated)
 * - PerformanceConfig (@deprecated)
 *
 * 🔄 移行パス:
 * 1. UnifiedConfigを使用するように既存のコードを更新
 * 2. 階層構造からフラット構造（camelCase）への変更
 * 3. 直接UnifiedConfigを使用（変換関数は削除されました）
 *
 * 📅 タイムライン:
 * - v2.5.0: 廃止予定警告開始
 * - v2.8.0: 廃止予定警告強化
 * - v3.0.0: 完全削除
 *
 * 詳細な移行ガイドは各インターフェースの@deprecatedコメントを参照
 */

// Import consolidated types from types.ts
import type { Config as BaseConfig, HighlightColor, HintPositionType } from "./types.ts";

// Re-export HighlightColor for backward compatibility
export type { HighlightColor };

// HighlightColor interface moved to types.ts for consolidation
// Use: import type { HighlightColor } from "./types.ts";

/**
 * 基本設定インターフェース
 * プラグインの基本的な動作を制御する設定項目を定義します。
 * Phase 2の階層化された設定構造の一部として使用されます。
 *
 * @deprecated このインターフェースはv3.0.0で削除される予定です。
 * 代わりにUnifiedConfigを使用してください。
 * 移行方法: CoreConfig → UnifiedConfigのフラット構造
 * @see UnifiedConfig - 統一設定インターフェース
 * @since 1.0.0
 * @remove v3.0.0
 *
 * @interface CoreConfig
 * @example
 * ```typescript
 * // 廃止予定 - 使用しないでください
 * const coreConfig: CoreConfig = {
 *   enabled: true,
 *   markers: ['A', 'S', 'D', 'F'],
 *   motionCount: 3
 * };
 *
 * // 推奨: UnifiedConfigを使用
 * const unifiedConfig: UnifiedConfig = {
 *   enabled: true,
 *   markers: ['A', 'S', 'D', 'F'],
 *   motionCount: 3,
 *   // その他のプロパティ...
 * };
 * ```
 */
// CoreConfig削除: process4 sub2-2で削除（未使用のため）

// HintConfig削除: Process4 Sub3-2-2 型定義の統合実装により削除
// 代わりにUnifiedConfigを使用してください

// WordConfig削除: Process4 Sub3-2-2 型定義の統合実装により削除
// 代わりにUnifiedConfigを使用してください

// PerformanceConfig削除: Process4 Sub3-2-2 型定義の統合実装により削除
// 代わりにUnifiedConfigを使用してください

// DebugConfig削除: Process4 Sub3-2-2 型定義の統合実装により削除
// 代わりにUnifiedConfigを使用してください


// CamelCaseConfig削除: Process4 Sub3-2-2 型定義の統合実装により削除
// 代わりにUnifiedConfigを使用してください

// ModernConfig削除: Process4 Sub3-2-2 型定義の統合実装により削除
// 代わりにUnifiedConfigを使用してください

/**
 * 統一設定インターフェース (UnifiedConfig)
 * Process2 sub1で導入された完全にフラット化されたcamelCase設定インターフェース。
 * 階層構造を排除し、32個の設定項目をすべて一つの階層で定義します。
 * TDD Red-Green-Refactor方式で実装された型安全な設定システムです。
 *
 * @interface UnifiedConfig
 * @example
 * ```typescript
 * const config: UnifiedConfig = {
 *   enabled: true,
 *   markers: ['A', 'S', 'D', 'F'],
 *   motionCount: 3,
 *   motionTimeout: 2000,
 *   hintPosition: 'start',
 *   useNumbers: true,
 *   highlightSelected: true
 * };
 * ```
 */
// UnifiedConfigインターフェースに useImprovedDetection プロパティを追加
// WordConfig削除後の後方互換性のため

export interface UnifiedConfig {
  // Core settings (6 properties)
  /** プラグインの有効/無効状態 */
  enabled: boolean;
  /** ヒント表示に使用するマーカー文字の配列 */
  markers: string[];
  /** 必要なモーション回数 */
  motionCount: number;
  /** モーションのタイムアウト時間（ミリ秒） */
  motionTimeout: number;
  /** 通常モードでのヒント表示位置 */
  hintPosition: "start" | "end" | "overlay";
  /** Visualモードでのヒント表示位置 */
  visualHintPosition?: "start" | "end" | "same" | "both";

  // Hint settings (8 properties)
  /** hjklキーでのトリガーを有効にするか */
  triggerOnHjkl: boolean;
  /** カウント対象のモーション文字列配列 */
  countedMotions: string[];
  /** パフォーマンス最適化のための最大ヒント表示数 */
  maxHints: number;
  /** ヒント表示のデバウンス遅延時間（ミリ秒） */
  debounceDelay: number;
  /** 数字(0-9)をヒント文字として使用するか */
  useNumbers: boolean;
  /** 選択中のヒントをハイライト表示するか */
  highlightSelected: boolean;
  /** 座標系デバッグログの出力有効/無効 */
  debugCoordinates: boolean;
  /** 1文字ヒント専用のキー配列 */
  singleCharKeys: string[];

  // Extended hint settings (4 properties)
  /** 2文字以上のヒント専用のキー配列 */
  multiCharKeys: string[];
  /** 1文字ヒントの最大表示数（オプション） */
  maxSingleCharHints?: number;
  /** ヒントグループ機能を使用するか */
  useHintGroups: boolean;
  /** ヒントマーカーのハイライト色設定 */
  highlightHintMarker: string | HighlightColor;

  // Word detection settings (7 properties)
  /** 選択中ヒントマーカーのハイライト色設定 */
  highlightHintMarkerCurrent: string | HighlightColor;
  /** キーリピート時のヒント表示を抑制するか */
  suppressOnKeyRepeat: boolean;
  /** キーリピートと判定する時間の閾値（ミリ秒） */
  keyRepeatThreshold: number;
  /** 日本語を含む単語検出を行うか */
  useJapanese: boolean;
  /** 単語検出アルゴリズム */
  wordDetectionStrategy: "regex" | "tinysegmenter" | "hybrid";
  /** TinySegmenter（日本語形態素解析）を有効にするか */
  enableTinySegmenter: boolean;
  /** TinySegmenterを使用する最小文字数の閾値 */
  segmenterThreshold: number;

  // Japanese word settings (7 properties)
  /** 日本語単語として扱う最小文字数 */
  japaneseMinWordLength: number;
  /** 助詞や接続詞を前の単語と結合するか */
  japaneseMergeParticles: boolean;
  /** 単語結合時の最大文字数の閾値 */
  japaneseMergeThreshold: number;
  /** キー別の最小文字数設定（オプション） */
  perKeyMinLength?: Record<string, number>;
  /** デフォルトの最小単語長 */
  defaultMinWordLength: number;
  /** キー別のモーション回数設定（オプション） */
  perKeyMotionCount?: Record<string, number>;
  /** デフォルトのモーション回数 */
  defaultMotionCount: number;
  /** 内部使用：現在のキーコンテキスト（オプション） */
  currentKeyContext?: string;

  // Motion counter settings (4 properties)
  /** モーションカウンター機能の有効/無効 */
  motionCounterEnabled: boolean;
  /** モーションカウンターの閾値 */
  motionCounterThreshold: number;
  /** モーションカウンターのタイムアウト時間（ミリ秒） */
  motionCounterTimeout: number;
  /** 閾値到達時にヒント表示するか */
  showHintOnMotionThreshold: boolean;

  // Debug settings (2 properties)
  /** デバッグモードの有効/無効 */
  debugMode: boolean;
  /** パフォーマンスログの出力有効/無効 */
  performanceLog: boolean;

  // Additional settings for backward compatibility
  /** 改善された単語検出を使用するか（WordConfig互換性のため） */
  useImprovedDetection?: boolean;
}

// Type aliases for backward compatibility
export type Config = UnifiedConfig;
export type CamelCaseConfig = UnifiedConfig;
export type ModernConfig = UnifiedConfig;

// Partial types for specific configurations (deprecated - use Partial<UnifiedConfig> instead)
export type HintConfig = Pick<UnifiedConfig, 
  'hintPosition' | 'maxHints' | 'highlightSelected'>;
export type WordConfig = Pick<UnifiedConfig,
  'useJapanese' | 'enableTinySegmenter' | 'perKeyMinLength' |
  'defaultMinWordLength'>;
export type PerformanceConfig = Pick<UnifiedConfig,
  'maxHints' | 'debounceDelay' | 'performanceLog'>;
export type DebugConfig = Pick<UnifiedConfig,
  'debugMode' | 'debugCoordinates' | 'performanceLog'>;

/**
 * デフォルト統一設定定数
 * UnifiedConfigの型安全な初期値を定義します。
 * 既存のgetDefaultConfig()から値を継承し、完全にフラット化された構造で提供します。
 *
 * @constant {UnifiedConfig} DEFAULT_UNIFIED_CONFIG
 * @example
 * ```typescript
 * const config = { ...DEFAULT_UNIFIED_CONFIG, motionCount: 5 };
 * console.log(config.enabled);     // true
 * console.log(config.motionCount); // 5
 * ```
 */
export const DEFAULT_UNIFIED_CONFIG: UnifiedConfig = {
  // Core settings
  enabled: true,
  markers: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  motionCount: 3,
  motionTimeout: 2000,
  hintPosition: "start",
  visualHintPosition: "end",

  // Hint settings
  triggerOnHjkl: true,
  countedMotions: [],
  maxHints: 336,
  debounceDelay: 50,
  useNumbers: false,
  highlightSelected: false,
  debugCoordinates: false,
  singleCharKeys: [
    "A", "S", "D", "F", "G", "H", "J", "K", "L", "N", "M",
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  ],

  // Extended hint settings
  multiCharKeys: ["B", "C", "E", "I", "O", "P", "Q", "R", "T", "U", "V", "W", "X", "Y", "Z"],
  maxSingleCharHints: 21, // Length of singleCharKeys
  useHintGroups: true,
  highlightHintMarker: "DiffAdd",

  // Word detection settings
  highlightHintMarkerCurrent: "DiffText",
  suppressOnKeyRepeat: true,
  keyRepeatThreshold: 50,
  useJapanese: false,
  wordDetectionStrategy: "hybrid",
  enableTinySegmenter: true,
  segmenterThreshold: 4,

  // Japanese word settings
  japaneseMinWordLength: 2,
  japaneseMergeParticles: true,
  japaneseMergeThreshold: 2,
  perKeyMinLength: {}, // Default empty record
  defaultMinWordLength: 3,
  perKeyMotionCount: {}, // Default empty record
  defaultMotionCount: 3, // Default motion count for keys not specified

  // Motion counter settings
  motionCounterEnabled: true,
  motionCounterThreshold: 3,
  motionCounterTimeout: 2000,
  showHintOnMotionThreshold: true,

  // Debug settings
  debugMode: false,
  performanceLog: false,

  // Additional settings for backward compatibility
  useImprovedDetection: true,
};

// Config interface削除: Process4 Sub3-2-2 型定義の統合実装により削除
// 代わりにUnifiedConfigを使用してください
// types.ts で type Config = UnifiedConfig として定義されています

/**
 * デフォルト設定を取得する関数 (Process2 Sub4で統一)
 * プラグインの標準的な設定値を返します。既存コードとの互換性を維持しています。
 * 内部的にはgetDefaultUnifiedConfig()を使用し、デフォルト値管理を統一しています。
 * この設定はパフォーマンス、ユーザビリティ、日本語対応を考慮して最適化されています。
 *
 * @returns {Config} プラグインのデフォルト設定
 * @example
 * ```typescript
 * const config = getDefaultConfig();
 * console.log(config.motionCount);     // 3
 * console.log(config.motionTimeout);   // 2000
 * console.log(config.enabled);          // true
 * console.log(config.maxHints);         // 336
 * ```
 */
export function getDefaultConfig(): UnifiedConfig {
  // Process4 Sub3-2: 直接UnifiedConfigを返す
  return getDefaultUnifiedConfig();
}

/**
 * 統一デフォルト設定を取得する関数 (Process2 Sub4)
 * DEFAULT_UNIFIED_CONSTANTの値を返し、デフォルト値管理を統一
 * TDD Red-Green-Refactor方式で実装された型安全なデフォルト値取得
 *
 * @returns {UnifiedConfig} 完全なUnifiedConfigデフォルト値
 * @example
 * ```typescript
 * const config = getDefaultUnifiedConfig();
 * console.log(config.motionCount);     // 3
 * console.log(config.hintPosition);    // 'start'
 * console.log(config.useNumbers);      // true
 * console.log(config.enabled);         // true
 * ```
 */
export function getDefaultUnifiedConfig(): UnifiedConfig {
  return DEFAULT_UNIFIED_CONFIG;
}

/**
 * 最小設定を作成する関数 (Process2 Sub4対応)
 * UnifiedConfigベースの部分設定を受け取り、デフォルト値で補完した完全なUnifiedConfigを返す
 * TDD Red-Green-Refactor方式で実装された型安全な最小設定作成
 *
 * @param {Partial<UnifiedConfig>} [partialConfig={}] 部分的な設定値
 * @returns {UnifiedConfig} デフォルト値で補完された完全なUnifiedConfig
 * @example
 * ```typescript
 * const config = createMinimalConfig({
 *   motionCount: 5,
 *   hintPosition: 'end'
 * });
 * console.log(config.motionCount);     // 5 (指定値)
 * console.log(config.hintPosition);    // 'end' (指定値)
 * console.log(config.useNumbers);      // true (デフォルト値)
 * console.log(config.enabled);         // true (デフォルト値)
 * ```
 */
export function createMinimalConfig(partialConfig: Partial<UnifiedConfig> = {}): UnifiedConfig {
  const defaults = getDefaultUnifiedConfig();
  return { ...defaults, ...partialConfig };
}

/**
 * 設定値のバリデーション関数
 * camelCaseとsnake_caseの両方の命名規則に対応した設定値検証を行います。
 * 各設定項目の型、範囲、必須条件をチェックし、エラー情報を返します。
 *
 * @param {Partial<UnifiedConfig>} config 検証する設定オブジェクト
 * @returns {{ valid: boolean; errors: string[] }} バリデーション結果
 * @example
 * ```typescript
 * const result = validateConfig({motionCount: 5, motionTimeout: 1000 });
 * if (result.valid) {
 *   console.log('設定は有効です');
 * } else {
 *   console.error('エラー:', result.errors);
 * }
 *
 * const invalidResult = validateConfig({motionCount: -1 });
 * // { valid: false, errors: ['motion_count/motionCount must be a positive integer'] }
 * ```
 */
/**
 * ハイライトグループ名の検証関数
 * Vimのハイライトグループ名として有効かチェックします。
 *
 * @param {string} name 検証するハイライトグループ名
 * @returns {boolean} 有効な場合true
 */
export function isValidHighlightGroup(name: string): boolean {
  // 空文字列は無効
  if (!name || name === '') {
    return false;
  }

  // 長さチェック（100文字以内）
  if (name.length > 100) {
    return false;
  }

  // 数字で始まる場合は無効
  if (/^[0-9]/.test(name)) {
    return false;
  }

  // 特殊文字を含む場合は無効（英数字とアンダースコアのみ許可）
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    return false;
  }

  return true;
}

/**
 * UnifiedConfig用統合バリデーション関数 (Process2 Sub3)
 * TDD Red-Green-Refactor方式で実装された単一バリデーション関数
 * camelCase形式のエラーメッセージで統一されたバリデーション
 *
 * @param config 検証するUnifiedConfig（部分設定可）
 * @returns バリデーション結果（valid: boolean, errors: string[]）
 * @example
 * ```typescript
 * const result = validateUnifiedConfig({ motionCount: 3, hintPosition: 'start' });
 * if (result.valid) {
 *   console.log('設定は有効です');
 * } else {
 *   console.error('エラー:', result.errors);
 * }
 * ```
 */
export function validateUnifiedConfig(
  config: Partial<UnifiedConfig>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Core settings validation (6 properties)
  // enabled - boolean（バリデーション不要、型で保証）

  // markers - 配列の検証
  if (config.markers !== undefined) {
    if (!Array.isArray(config.markers)) {
      errors.push("markers must be an array");
    } else if (config.markers.length === 0) {
      errors.push("markers must not be empty");
    } else {
      // すべて文字列かチェック
      if (!config.markers.every(m => typeof m === "string")) {
        errors.push("markers must be an array of strings");
      } else {
        const uniqueMarkers = new Set(config.markers);
        if (uniqueMarkers.size !== config.markers.length) {
          errors.push("markers must contain unique values");
        }
      }
    }
  }

  // motionCount - 正の整数
  if (config.motionCount !== undefined) {
    if (config.motionCount === null || !Number.isInteger(config.motionCount) || config.motionCount <= 0) {
      errors.push("motionCount must be a positive integer");
    }
  }

  // motionTimeout - 100ms 以上の整数
  if (config.motionTimeout !== undefined) {
    if (!Number.isInteger(config.motionTimeout) || config.motionTimeout < 100) {
      errors.push("motionTimeout must be at least 100ms");
    }
  }

  // hintPosition - 列挙値 (Process4 sub3-2-3: "overlay"を正しい値として認識)
  if (config.hintPosition !== undefined) {
    const validPositions = ["start", "end", "overlay"];
    if (config.hintPosition === null || !validPositions.includes(config.hintPosition)) {
      errors.push("hintPosition must be one of: start, end, overlay");
    }
  }

  // visualHintPosition - 列挙値（オプショナル）
  if (config.visualHintPosition !== undefined) {
    const validPositions = ["start", "end", "same", "both"];
    if (!validPositions.includes(config.visualHintPosition)) {
      errors.push(`visualHintPosition must be one of: ${validPositions.join(", ")}`);
    }
  }

  // Hint settings validation (8 properties)
  // triggerOnHjkl, useNumbers, highlightSelected - boolean（型で保証）

  // countedMotions - 配列（バリデーション不要、型で保証）

  // maxHints - 正の整数
  if (config.maxHints !== undefined) {
    if (!Number.isInteger(config.maxHints) || config.maxHints <= 0) {
      errors.push("maxHints must be a positive integer");
    }
  }

  // debounceDelay - 非負整数（0を許可）
  if (config.debounceDelay !== undefined) {
    if (!Number.isInteger(config.debounceDelay) || config.debounceDelay < 0) {
      errors.push("debounceDelay must be a non-negative number");
    }
  }

  // useNumbers - boolean
  if (config.useNumbers !== undefined && typeof config.useNumbers !== "boolean") {
    errors.push("useNumbers must be a boolean");
  }

  // debugCoordinates - boolean（型で保証）

  // singleCharKeys, multiCharKeys - 配列（型で保証）

  // Extended hint settings validation (4 properties)
  // maxSingleCharHints - オプショナル正の整数
  if (config.maxSingleCharHints !== undefined) {
    if (!Number.isInteger(config.maxSingleCharHints) || config.maxSingleCharHints <= 0) {
      errors.push("maxSingleCharHints must be a positive integer");
    }
  }

  // useHintGroups - boolean（型で保証）

  // highlightHintMarker - ハイライトグループ名の検証
  if (config.highlightHintMarker !== undefined) {
    if (typeof config.highlightHintMarker === 'string') {
      if (config.highlightHintMarker === '') {
        errors.push("highlightHintMarker must be a non-empty string");
      } else if (!isValidHighlightGroup(config.highlightHintMarker)) {
        if (config.highlightHintMarker.length > 100) {
          errors.push("highlightHintMarker must be 100 characters or less");
        } else if (/^[0-9]/.test(config.highlightHintMarker)) {
          errors.push("highlightHintMarker must start with a letter or underscore");
        } else {
          errors.push("highlightHintMarker must contain only alphanumeric characters and underscores");
        }
      }
    } else if (typeof config.highlightHintMarker !== 'object') {
      errors.push("highlightHintMarker must be a string or HighlightColor object");
    }
  }

  // highlightHintMarkerCurrent - ハイライトグループ名の検証
  if (config.highlightHintMarkerCurrent !== undefined) {
    if (typeof config.highlightHintMarkerCurrent === 'string') {
      if (config.highlightHintMarkerCurrent === '') {
        errors.push("highlightHintMarkerCurrent must be a non-empty string");
      } else if (!isValidHighlightGroup(config.highlightHintMarkerCurrent)) {
        if (config.highlightHintMarkerCurrent.length > 100) {
          errors.push("highlightHintMarkerCurrent must be 100 characters or less");
        } else if (/^[0-9]/.test(config.highlightHintMarkerCurrent)) {
          errors.push("highlightHintMarkerCurrent must start with a letter or underscore");
        } else {
          errors.push("highlightHintMarkerCurrent must contain only alphanumeric characters and underscores");
        }
      }
    } else if (typeof config.highlightHintMarkerCurrent !== 'object') {
      errors.push("highlightHintMarkerCurrent must be a string or HighlightColor object");
    }
  }

  // Word detection settings validation (7 properties)
  // suppressOnKeyRepeat - boolean（型で保証）

  // keyRepeatThreshold - 非負整数
  if (config.keyRepeatThreshold !== undefined) {
    if (!Number.isInteger(config.keyRepeatThreshold) || config.keyRepeatThreshold < 0) {
      errors.push("keyRepeatThreshold must be a non-negative integer");
    }
  }

  // useJapanese - オプショナルboolean（型で保証）

  // wordDetectionStrategy - 列挙値
  if (config.wordDetectionStrategy !== undefined) {
    const validStrategies = ["regex", "tinysegmenter", "hybrid"];
    if (!validStrategies.includes(config.wordDetectionStrategy)) {
      errors.push(`wordDetectionStrategy must be one of: ${validStrategies.join(", ")}`);
    }
  }

  // enableTinySegmenter - boolean（型で保証）

  // segmenterThreshold - 正の整数
  if (config.segmenterThreshold !== undefined) {
    if (!Number.isInteger(config.segmenterThreshold) || config.segmenterThreshold <= 0) {
      errors.push("segmenterThreshold must be a positive integer");
    }
  }

  // Japanese word settings validation (7 properties)
  // japaneseMinWordLength - 正の整数
  if (config.japaneseMinWordLength !== undefined) {
    if (!Number.isInteger(config.japaneseMinWordLength) || config.japaneseMinWordLength <= 0) {
      errors.push("japaneseMinWordLength must be a positive integer");
    }
  }

  // japaneseMergeParticles - boolean（型で保証）

  // japaneseMergeThreshold - 正の整数
  if (config.japaneseMergeThreshold !== undefined) {
    if (!Number.isInteger(config.japaneseMergeThreshold) || config.japaneseMergeThreshold <= 0) {
      errors.push("japaneseMergeThreshold must be a positive integer");
    }
  }

  // perKeyMinLength, perKeyMotionCount - Record<string, number>（バリデーション不要、型で保証）

  // defaultMinWordLength - 正の整数
  if (config.defaultMinWordLength !== undefined) {
    if (!Number.isInteger(config.defaultMinWordLength) || config.defaultMinWordLength <= 0) {
      errors.push("defaultMinWordLength must be a positive integer");
    }
  }

  // defaultMotionCount - オプショナル正の整数
  if (config.defaultMotionCount !== undefined) {
    if (!Number.isInteger(config.defaultMotionCount) || config.defaultMotionCount <= 0) {
      errors.push("defaultMotionCount must be a positive integer");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 既存validateConfig関数（互換性維持）
 * validateUnifiedConfig()にリダイレクトされる統合バリデーション
 * snake_caseとcamelCase両方の入力をサポート
 *
 * @deprecated この関数は内部的にvalidateUnifiedConfig()を使用します。新しいコードではvalidateUnifiedConfig()を直接使用してください。
 * @param config 検証する設定オブジェクト
 * @returns バリデーション結果
 */
export function validateConfig(
  config: Partial<UnifiedConfig>,
): { valid: boolean; errors: string[] } {
  // 入力されたconfigが数値型のhighlightHintMarkerなどを含む場合、
  // 直接バリデーションする必要がある
  const errors: string[] = [];
  const c = config as any;

  // motionCount の型チェック
  if (c.motionCount !== undefined && c.motionCount === null) {
    errors.push("motionCount cannot be null");
  }

  // hintPosition の型チェック
  if (c.hintPosition !== undefined && c.hintPosition === null) {
    errors.push("hintPosition cannot be null");
  }

  // highlightHintMarker の型チェック
  if (c.highlightHintMarker !== undefined) {
    if (c.highlightHintMarker === null) {
      errors.push("highlightHintMarker cannot be null");
    } else if (typeof c.highlightHintMarker === 'number') {
      errors.push("highlightHintMarker must be a string");
    } else if (Array.isArray(c.highlightHintMarker)) {
      errors.push("highlightHintMarker must be a string");
    } else if (typeof c.highlightHintMarker === 'string') {
      if (c.highlightHintMarker === '') {
        errors.push("highlightHintMarker must be a non-empty string");
      } else if (!isValidHighlightGroup(c.highlightHintMarker)) {
        if (c.highlightHintMarker.length > 100) {
          errors.push("highlightHintMarker must be 100 characters or less");
        } else if (/^[0-9]/.test(c.highlightHintMarker)) {
          errors.push("highlightHintMarker must start with a letter or underscore");
        } else {
          errors.push("highlightHintMarker must contain only alphanumeric characters and underscores");
        }
      }
    }
  }

  // highlightHintMarkerCurrent の型チェック
  if (c.highlightHintMarkerCurrent !== undefined) {
    if (c.highlightHintMarkerCurrent === null) {
      errors.push("highlightHintMarkerCurrent cannot be null");
    } else if (typeof c.highlightHintMarkerCurrent === 'number') {
      errors.push("highlightHintMarkerCurrent must be a string");
    } else if (Array.isArray(c.highlightHintMarkerCurrent)) {
      errors.push("highlightHintMarkerCurrent must be a string");
    } else if (typeof c.highlightHintMarkerCurrent === 'string') {
      if (c.highlightHintMarkerCurrent === '') {
        errors.push("highlightHintMarkerCurrent must be a non-empty string");
      } else if (!isValidHighlightGroup(c.highlightHintMarkerCurrent)) {
        if (c.highlightHintMarkerCurrent.length > 100) {
          errors.push("highlightHintMarkerCurrent must be 100 characters or less");
        } else if (/^[0-9]/.test(c.highlightHintMarkerCurrent)) {
          errors.push("highlightHintMarkerCurrent must start with a letter or underscore");
        } else {
          errors.push("highlightHintMarkerCurrent must contain only alphanumeric characters and underscores");
        }
      }
    }
  }

  // 早期エラーがあれば返す
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Process4 Sub3-2: 直接UnifiedConfigとして扱う
  const unifiedConfig = config as UnifiedConfig;
  const result = validateUnifiedConfig(unifiedConfig);

  // Process4 sub3-2-3: camelCase統一 - エラーメッセージはそのまま返す
  // snake_caseは完全に廃止されたため、変換は不要
  const allErrors = [...errors, ...result.errors];
  return { valid: result.valid && errors.length === 0, errors: allErrors };
}





/**
 * 設定マージ関数
 * 部分的な設定更新をサポートし、バリデーションと後方互換性を維持します。
 * 更新される設定値はバリデーションが実行され、無効な値の場合はエラーがスローされます。
 *
 * @param {Config} baseConfig ベースとなる設定
 * @param {Partial<Config>} updates 更新する設定値
 * @returns {Config} マージされた新しい設定
 * @throws {Error} 設定値のバリデーションに失敗した場合
 * @example
 * ```typescript
 * const base = getDefaultConfig();
 * const updates = {
 *   motion_count: 5,
 *   enabled: false,
 *   enable: true  // 後方互換性のため自動でenabledにマッピング
 * };
 *
 * const merged = mergeConfig(base, updates);
 * console.log(merged.motionCount); // 5
 * console.log(merged.enabled);      // true (enableが優先される)
 *
 * // バリデーションエラーの例
 * try {
 *   mergeConfig(base, {motionCount: -1 }); // Error: Invalid config
 * } catch (error) {
 *   console.error(error.message);
 * }
 * ```
 */
export function mergeConfig(baseConfig: UnifiedConfig, updates: Partial<UnifiedConfig>): UnifiedConfig {
  // バリデーションを実行
  const validation = validateConfig(updates);
  if (!validation.valid) {
    throw new Error(`Invalid config: ${validation.errors.join(", ")}`);
  }

  // Process4 Sub3-2-2: 後方互換性処理は削除（UnifiedConfigは純粋なcamelCase）

  return { ...baseConfig, ...updates };
}

/**
 * 設定のディープコピーを作成する関数
 * 元の設定オブジェクトに影響を与えずに完全に独立したコピーを作成します。
 * JSONのシリアライズ/デシリアライズで実装されています。
 *
 * @param {Config} config コピーする設定オブジェクト
 * @returns {Config} ディープコピーされた設定
 * @example
 * ```typescript
 * const original = getDefaultConfig();
 * const copy = cloneConfig(original);
 *
 * copy.motionCount = 10;
 * copy.markers.push('Z');
 *
 * console.log(original.motionCount);  // 3 (元の値が保持される)
 * console.log(copy.motionCount);      // 10
 * console.log(original.markers.length === copy.markers.length - 1); // true
 * ```
 */
export function cloneConfig(config: UnifiedConfig): UnifiedConfig {
  return JSON.parse(JSON.stringify(config));
}

/**
 * キー別設定を取得するヘルパー関数
 * 指定されたキーに対応する設定値を、優先度に従って取得します。
 * 優先度: キー別設定 > デフォルト値 > フォールバック値
 * per_key_min_lengthやper_key_motion_countなどのキー固有設定で使用されます。
 *
 * @template T 設定値の型
 * @param {Config} config プラグインの設定オブジェクト
 * @param {string} key 取得対象のキー
 * @param {Record<string, T> | undefined} perKeyRecord キー別設定レコード
 * @param {T | undefined} defaultValue デフォルト値
 * @param {T} fallbackValue フォールバック値
 * @returns {T} 取得された設定値
 * @example
 * ```typescript
 * const config = {
 *   ...getDefaultConfig(),
 *   per_key_min_length: { 'w': 4, 'b': 2 },
 *   default_min_word_length: 3
 * };
 *
 * // キー別設定がある場合
 * const wMinLength = getPerKeyValue(config, 'w', config.perKeyMinLength, config.defaultMinWordLength, 1);
 * console.log(wMinLength); // 4
 *
 * // キー別設定がない場合はデフォルト値
 * const eMinLength = getPerKeyValue(config, 'e', config.perKeyMinLength, config.defaultMinWordLength, 1);
 * console.log(eMinLength); // 3
 *
 * // デフォルト値もない場合はフォールバック値
 * const fallbackConfig = { ...config, default_min_word_length: undefined };
 * const fMinLength = getPerKeyValue(fallbackConfig, 'f', fallbackConfig.perKeyMinLength, fallbackConfig.defaultMinWordLength, 1);
 * console.log(fMinLength); // 1
 * ```
 */
export function getPerKeyValue<T>(
  config: UnifiedConfig,
  key: string,
  perKeyRecord: Record<string, T> | undefined,
  defaultValue: T | undefined,
  fallbackValue: T,
): T {
  // キー別設定が存在する場合
  if (perKeyRecord && perKeyRecord[key] !== undefined) {
    return perKeyRecord[key];
  }

  // デフォルト値が設定されている場合
  if (defaultValue !== undefined) {
    return defaultValue;
  }

  // フォールバック値を使用
  return fallbackValue;
}

/**
 * snake_caseからcamelCaseへの変換マッピング定数
 * Phase 3の命名規則統一化で使用される変換テーブルです。
 * snake_caseのプロパティ名を対応するcamelCaseにマッピングします。
 * 双方向アクセスや移行支援に使用され、後方互換性を維持します。
 *
 * @constant {Record<string, string>}
 * @example
 * ```typescript
 * console.log(SNAKE_TO_CAMEL_MAPPING.motionCount); // 'motionCount'
 * console.log(SNAKE_TO_CAMEL_MAPPING.hintPosition); // 'hintPosition'
 * console.log(SNAKE_TO_CAMEL_MAPPING.useNumbers); // 'useNumbers'
 * ```
 */
// SNAKE_TO_CAMEL_MAPPING constant removed as part of Process4 Sub2-4

/**
 * 非推奨警告情報インターフェース
 * snake_caseのプロパティが使用された時の警告情報を表現します。
 * 新しいcamelCaseのプロパティへの移行を支援します。
 *
 * @interface DeprecationWarning
 * @example
 * ```typescript
 * const warning: DeprecationWarning = {
 *   property: 'motion_count',
 *   replacement: 'motionCount',
 *   message: "Property 'motion_count' is deprecated. Use 'motionCount' instead."
 * };
 * ```
 */
export interface DeprecationWarning {
  /** 非推奨のプロパティ名 */
  property: string;
  /** 推奨される代替プロパティ名 */
  replacement: string;
  /** 警告メッセージ */
  message: string;
}

/**
 * 命名規則バリデーション結果インターフェース
 * TypeScript/JavaScriptのモダンな命名規則に従っているかを検証する結果を表現します。
 * コードの一貫性と可読性を向上させるためのバリデーションです。
 *
 * @interface NamingValidation
 * @example
 * ```typescript
 * const result: NamingValidation = {
 *   followsConvention: true,
 *   hasConfigSuffix: true,
 *   hasManagerSuffix: false,
 *   hasBooleanPrefix: false
 * };
 * ```
 */
export interface NamingValidation {
  /** 命名規則に従っているかの全体的な結果 */
  followsConvention: boolean;
  /** 'Config'接尾辞を持っているか */
  hasConfigSuffix: boolean;
  /** 'Manager'接尾辞を持っているか */
  hasManagerSuffix: boolean;
  /** ブール型の接頭辞(is/has/should)を持っているか */
  hasBooleanPrefix: boolean;
}

/**
 * snake_case設定をcamelCase設定に変換する関数
 * 既存のsnake_caseの設定プロパティをcamelCaseに変換します。
 * 元のプロパティも保持されるため、互換性が維持されます。
 *
 * @param {Partial<Config>} config 変換元のsnake_case設定
 * @returns {CamelCaseConfig} 変換されたcamelCase設定
 * @example
 * ```typescript
 * const snakeConfig = {
 *   motion_count: 5,
 *   hint_position: 'end',
 *   use_numbers: true,
 *   debug_mode: false
 * };
 *
 * const camelConfig = convertSnakeToCamelConfig(snakeConfig);
 * console.log(camelConfig.motionCount);    // 5
 * console.log(camelConfig.hintPosition);   // 'end'
 * console.log(camelConfig.useNumbers);     // true
 * console.log(camelConfig.debugMode);      // false
 * // 元のsnake_caseプロパティも保持される
 * console.log(camelConfig.motionCount);   // 5
 * ```
 */
// convertSnakeToCamelConfig function removed as part of Process4 Sub2-4

/**
 * モダン設定を作成する関数
 * Proxyを使用してsnake_caseとcamelCaseの双方向アクセスを可能にする設定オブジェクトを作成します。
 * 既存コードとの互換性を保ちながら、モダンなコーディングスタイルをサポートします。
 * 設定値のバリデーションも自動的に実行されます。
 *
 * @param {Partial<CamelCaseConfig | Config>} [input={}] 初期設定値
 * @returns {ModernConfig} 双方向アクセス可能なモダン設定
 * @throws {Error} 設定値のバリデーションに失敗した場合
 * @example
 * ```typescript
 * const config = createModernConfig({
 *   motionCount: 5,        // camelCase
 *   hint_position: 'end',  // snake_case
 *   enabled: true
 * });
 *
 * // 両方のアクセス方法が有効
 * console.log(config.motionCount);    // 5
 * console.log(config.motionCount);   // 5 (同じ値)
 *
 * console.log(config.hintPosition);   // 'end'
 * console.log(config.hintPosition);  // 'end' (同じ値)
 *
 * // ブール型の命名規則アクセスも可能
 * console.log(config.isEnabled);      // true
 * console.log(config.shouldUseNumbers); // 設定に応じた値
 *
 * // 設定値の更新も双方向で同期
 * config.motionCount = 10;
 * console.log(config.motionCount);   // 10
 * ```
 */
// createModernConfig削除: Process4 Sub3-2-2 型定義の統合実装により削除
// 代わりにcreateMinimalConfig()を使用してください
export function createModernConfig(input: Partial<UnifiedConfig> = {}): UnifiedConfig {
  return createMinimalConfig(input);
}

/**
 * 命名規則のバリデーション関数
 * 指定された名前がTypeScript/JavaScriptのモダンな命名規則に従っているかを検証します。
 * Config/Manager接尾辞やブール型の接頭辞（is/has/should）をチェックします。
 *
 * @param {string} name 検証する名前
 * @returns {NamingValidation} バリデーション結果
 * @example
 * ```typescript
 * const result1 = validateNamingConvention('UserConfig');
 * console.log(result1.followsConvention); // true
 * console.log(result1.hasConfigSuffix);   // true
 *
 * const result2 = validateNamingConvention('isEnabled');
 * console.log(result2.followsConvention); // true
 * console.log(result2.hasBooleanPrefix);  // true
 *
 * const result3 = validateNamingConvention('user_config'); // snake_case
 * console.log(result3.followsConvention); // false
 * ```
 */
export function validateNamingConvention(name: string): NamingValidation {
  const hasConfigSuffix = name.endsWith("Config");
  const hasManagerSuffix = name.endsWith("Manager");
  const hasBooleanPrefix = /^(is|has|should)[A-Z]/.test(name);

  const followsConvention = hasConfigSuffix || hasManagerSuffix || hasBooleanPrefix;

  return {
    followsConvention,
    hasConfigSuffix,
    hasManagerSuffix,
    hasBooleanPrefix,
  };
}

/**
 * 非推奨警告を取得する関数
 * 設定オブジェクトから非推奨のsnake_caseプロパティを検出し、適切な警告メッセージを生成します。
 * 新しいcamelCaseプロパティへの移行を支援するための情報を提供します。
 *
 * @param {Partial<UnifiedConfig>} config チェックする設定オブジェクト
 * @returns {DeprecationWarning[]} 非推奨警告の配列
 * @example
 * ```typescript
 * const config = {
 *   motion_count: 3,      // 非推奨
 *   hint_position: 'end', // 非推奨
 *   enabled: true,        // OK (共通)
 *   motionTimeout: 2000   // OK (camelCase)
 * };
 *
 * const warnings = getDeprecationWarnings(config);
 * console.log(warnings);
 * // [
 * //   {
 * //     property: 'motion_count',
 * //     replacement: 'motionCount',
 * //     message: "Property 'motion_count' is deprecated. Use 'motionCount' instead."
 * //   },
 * //   {
 * //     property: 'hint_position',
 * //     replacement: 'hintPosition',
 * //     message: "Property 'hint_position' is deprecated. Use 'hintPosition' instead."
 * //   }
 * // ]
 * ```
 */
// getDeprecationWarnings function simplified as part of Process4 Sub2-4
// SNAKE_TO_CAMEL_MAPPING dependency removed
export function getDeprecationWarnings(
  config: Partial<UnifiedConfig>,
): DeprecationWarning[] {
  // Simplified implementation - no longer checks for deprecated properties
  // as hierarchical config system has been removed
  return [];
}

/**
 * 設定変換レイヤー (Process2 Sub2)
 * 旧設定(Config)からUnifiedConfigへの変換
 * TDD Red-Green-Refactor方式で実装
 * 全32個のプロパティをsnake_case → camelCaseに変換
 */

/**
 * プロパティ値を取得するヘルパー関数
 * snake_case、camelCase両方からの値取得を支援する
 *
 * @param config 設定オブジェクト
 * @param snakeProp snake_caseのプロパティ名
 * @param camelProp camelCaseのプロパティ名
 * @param defaultValue デフォルト値
 * @returns 取得された値またはデフォルト値
 */
// getConfigValue function removed as part of Process4 Sub2-4

// 変換関数は削除されました (Process4 Sub3-2)
// 直接UnifiedConfigを使用してください

// ============================================================================
// VALIDATION FUNCTIONS
// Moved from utils/validation.ts as part of Process4 Sub6-2
// ============================================================================

/**
 * バリデーションルールのインターフェース
 * validateConfigValueで使用されるルールの型定義
 *
 * @interface ValidationRules
 */
export interface ValidationRules {
  /** 期待される型名 */
  type?: "string" | "number" | "boolean" | "array" | "object";
  /** 必須フィールドかどうか */
  required?: boolean;
  /** 数値の最小値 */
  min?: number;
  /** 数値の最大値 */
  max?: number;
  /** 文字列/配列の最小長 */
  minLength?: number;
  /** 文字列/配列の最大長 */
  maxLength?: number;
  /** 有効な値のリスト */
  enum?: readonly any[];
  /** カスタムバリデーション関数 */
  custom?: (value: any) => boolean;
}

/**
 * バリデーション結果のインターフェース
 * バリデーション関数の戻り値として使用される
 *
 * @interface ValidationResult
 */
export interface ValidationResult {
  /** バリデーションが成功したかどうか */
  valid: boolean;
  /** エラーメッセージ（失敗時のみ） */
  error?: string;
}

/**
 * 設定値の型チェック
 * 指定された値が期待される型と一致するかを検証
 *
 * @param {any} value - チェック対象の値
 * @param {string} expectedType - 期待される型名（"string", "number", "boolean", "array", "object"）
 * @returns {boolean} 型が一致する場合true、不一致の場合false
 * @throws {never} この関数は例外をスローしません
 * @example
 * ```typescript
 * isValidType("hello", "string"); // true
 * isValidType(123, "number"); // true
 * isValidType([1, 2, 3], "array"); // true
 * isValidType(NaN, "number"); // false (NaNは無効な数値として扱われる)
 * ```
 */
export function isValidType(value: any, expectedType: string): boolean {
  switch (expectedType) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && !isNaN(value);
    case "boolean":
      return typeof value === "boolean";
    case "array":
      return Array.isArray(value);
    case "object":
      return typeof value === "object" && value !== null && !Array.isArray(value);
    default:
      return false;
  }
}

/**
 * 数値の範囲チェック
 * 数値が指定された範囲内にあるかを検証
 *
 * @param {number} value - チェック対象の数値
 * @param {number} [min] - 最小値（省略時は下限なし）
 * @param {number} [max] - 最大値（省略時は上限なし）
 * @returns {boolean} 範囲内にある場合true、範囲外の場合false
 * @throws {never} この関数は例外をスローしません
 * @example
 * ```typescript
 * isInRange(5, 1, 10); // true
 * isInRange(-1, 0, 100); // false
 * isInRange(50, undefined, 100); // true（下限なし）
 * isInRange(75, 0, undefined); // true（上限なし）
 * ```
 */
export function isInRange(value: number, min?: number, max?: number): boolean {
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

/**
 * 文字列の長さチェック
 * 文字列の長さが指定された範囲内にあるかを検証
 *
 * @param {string} value - チェック対象の文字列
 * @param {number} [minLength] - 最小長（省略時は下限なし）
 * @param {number} [maxLength] - 最大長（省略時は上限なし）
 * @returns {boolean} 長さが範囲内にある場合true、範囲外の場合false
 * @throws {never} この関数は例外をスローしません
 * @example
 * ```typescript
 * isValidLength("hello", 1, 10); // true
 * isValidLength("", 1, 10); // false（最小長より短い）
 * isValidLength("very long string", undefined, 10); // false（最大長を超える）
 * isValidLength("test", 0, undefined); // true（上限なし）
 * ```
 */
export function isValidLength(value: string, minLength?: number, maxLength?: number): boolean {
  if (minLength !== undefined && value.length < minLength) return false;
  if (maxLength !== undefined && value.length > maxLength) return false;
  return true;
}

/**
 * 配列の要素数チェック
 * 配列の要素数が指定された範囲内にあるかを検証
 *
 * @param {any[]} array - チェック対象の配列
 * @param {number} [minLength] - 最小要素数（省略時は下限なし）
 * @param {number} [maxLength] - 最大要素数（省略時は上限なし）
 * @returns {boolean} 要素数が範囲内にある場合true、範囲外の場合false
 * @throws {never} この関数は例外をスローしません
 * @example
 * ```typescript
 * isValidArrayLength([1, 2, 3], 1, 5); // true
 * isValidArrayLength([], 1, 5); // false（最小要素数より少ない）
 * isValidArrayLength([1, 2, 3, 4, 5, 6], 1, 5); // false（最大要素数を超える）
 * isValidArrayLength([1, 2], 0, undefined); // true（上限なし）
 * ```
 */
export function isValidArrayLength(array: any[], minLength?: number, maxLength?: number): boolean {
  if (minLength !== undefined && array.length < minLength) return false;
  if (maxLength !== undefined && array.length > maxLength) return false;
  return true;
}

/**
 * 列挙値のチェック
 * 値が指定された有効な値のリストに含まれているかを検証
 *
 * @param {any} value - チェック対象の値
 * @param {readonly any[]} validValues - 有効な値のリスト
 * @returns {boolean} 有効な値に含まれている場合true、含まれていない場合false
 * @throws {never} この関数は例外をスローしません
 * @example
 * ```typescript
 * isValidEnum("red", ["red", "green", "blue"]); // true
 * isValidEnum("yellow", ["red", "green", "blue"]); // false
 * isValidEnum(1, [1, 2, 3]); // true
 * isValidEnum(null, ["red", "green", null]); // true（nullも有効な値として扱える）
 * ```
 */
export function isValidEnum(value: any, validValues: readonly any[]): boolean {
  return validValues.includes(value);
}

/**
 * 設定値の総合バリデーション
 * 複数のルールを適用して設定値を検証し、詳細なエラーメッセージを提供
 *
 * @param {string} key - バリデーション対象のキー名（エラーメッセージに使用）
 * @param {any} value - バリデーション対象の値
 * @param {Object} rules - バリデーションルール
 * @param {string} [rules.type] - 期待される型（"string", "number", "boolean", "array", "object"）
 * @param {boolean} [rules.required] - 必須かどうか（デフォルト: false）
 * @param {number} [rules.min] - 数値の最小値（type="number"の場合）
 * @param {number} [rules.max] - 数値の最大値（type="number"の場合）
 * @param {number} [rules.minLength] - 文字列/配列の最小長（type="string"または"array"の場合）
 * @param {number} [rules.maxLength] - 文字列/配列の最大長（type="string"または"array"の場合）
 * @param {readonly any[]} [rules.enum] - 有効な値のリスト
 * @param {function(any): boolean} [rules.custom] - カスタムバリデーション関数
 * @returns {{valid: boolean, error?: string}} バリデーション結果とエラーメッセージ
 * @throws {never} この関数は例外をスローしません
 * @example
 * ```typescript
 * const result = validateConfigValue("port", 8080, {
 *   type: "number",
 *   required: true,
 *   min: 1000,
 *   max: 65535
 * });
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 *
 * // カスタムバリデーションの例
 * const emailResult = validateConfigValue("email", "user@example.com", {
 *   type: "string",
 *   required: true,
 *   custom: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
 * });
 * ```
 */
export function validateConfigValue(
  key: string,
  value: any,
  rules: {
    type?: string;
    required?: boolean;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    enum?: readonly any[];
    custom?: (value: any) => boolean;
  }
): { valid: boolean; error?: string } {
  // 必須チェック
  if (rules.required && (value === undefined || value === null)) {
    return { valid: false, error: `${key} is required` };
  }

  // 値がundefinedまたはnullで必須でない場合はバリデーション通過
  if (value === undefined || value === null) {
    return { valid: true };
  }

  // 型チェック
  if (rules.type && !isValidType(value, rules.type)) {
    return { valid: false, error: `${key} must be of type ${rules.type}` };
  }

  // 数値の範囲チェック
  if (rules.type === "number") {
    if (!isInRange(value, rules.min, rules.max)) {
      const minStr = rules.min !== undefined ? `min: ${rules.min}` : "";
      const maxStr = rules.max !== undefined ? `max: ${rules.max}` : "";
      const rangeStr = [minStr, maxStr].filter(s => s).join(", ");
      return { valid: false, error: `${key} is out of range (${rangeStr})` };
    }
  }

  // 文字列の長さチェック
  if (rules.type === "string") {
    if (!isValidLength(value, rules.minLength, rules.maxLength)) {
      const minStr = rules.minLength !== undefined ? `min: ${rules.minLength}` : "";
      const maxStr = rules.maxLength !== undefined ? `max: ${rules.maxLength}` : "";
      const lengthStr = [minStr, maxStr].filter(s => s).join(", ");
      return { valid: false, error: `${key} length is invalid (${lengthStr})` };
    }
  }

  // 配列の要素数チェック
  if (rules.type === "array") {
    if (!isValidArrayLength(value, rules.minLength, rules.maxLength)) {
      const minStr = rules.minLength !== undefined ? `min: ${rules.minLength}` : "";
      const maxStr = rules.maxLength !== undefined ? `max: ${rules.maxLength}` : "";
      const lengthStr = [minStr, maxStr].filter(s => s).join(", ");
      return { valid: false, error: `${key} array length is invalid (${lengthStr})` };
    }
  }

  // 列挙値チェック
  if (rules.enum && !isValidEnum(value, rules.enum)) {
    return { valid: false, error: `${key} must be one of: ${rules.enum.join(", ")}` };
  }

  // カスタムバリデーション
  if (rules.custom && !rules.custom(value)) {
    return { valid: false, error: `${key} failed custom validation` };
  }

  return { valid: true };
}

/**
 * 複数の設定値を一括でバリデーション
 * オブジェクトの各プロパティに対してルールを適用
 *
 * @param {Record<string, any>} config - バリデーション対象の設定オブジェクト
 * @param {Record<string, ValidationRules>} rulesMap - 各キーに対するバリデーションルールのマップ
 * @returns {ValidationResult & {errors?: Record<string, string>}} 全体のバリデーション結果とエラーの詳細
 * @throws {never} この関数は例外をスローしません
 * @example
 * ```typescript
 * const config = { port: 8080, host: "localhost", debug: true };
 * const rules = {
 *   port: { type: "number", required: true, min: 1000, max: 65535 },
 *   host: { type: "string", required: true, minLength: 1 },
 *   debug: { type: "boolean" }
 * };
 * const result = validateConfigObject(config, rules);
 *
 * if (!result.valid) {
 *   console.error("バリデーションエラー:", result.error);
 *   console.error("詳細:", result.errors);
 * }
 * ```
 */
export function validateConfigObject(
  config: Record<string, any>,
  rulesMap: Record<string, ValidationRules>
): ValidationResult & { errors?: Record<string, string> } {
  const errors: Record<string, string> = {};
  let hasError = false;

  for (const [key, rules] of Object.entries(rulesMap)) {
    const result = validateConfigValue(key, config[key], rules);
    if (!result.valid && result.error) {
      errors[key] = result.error;
      hasError = true;
    }
  }

  return {
    valid: !hasError,
    ...(hasError && { error: `Validation failed for: ${Object.keys(errors).join(", ")}` }),
    ...(hasError && { errors })
  };
}
