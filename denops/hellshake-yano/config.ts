/**
 * 設定管理モジュール
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
 * @interface CoreConfig
 * @example
 * ```typescript
 * const coreConfig: CoreConfig = {
 *   enabled: true,
 *   markers: ['A', 'S', 'D', 'F'],
 *   motionCount: 3
 * };
 * ```
 */
export interface CoreConfig {
  /** プラグインの有効/無効状態 */
  enabled: boolean;
  /** ヒント表示に使用するマーカー文字の配列 */
  markers: string[];
  /** 必要なモーション回数 */
  motionCount: number;
}

/**
 * ヒント関連設定インターフェース
 * ヒントの表示位置、文字、ハイライトなどの設定を定義します。
 * ユーザビリティとパフォーマンスの最適化に関する設定が含まれます。
 *
 * @interface HintConfig
 * @example
 * ```typescript
 * const hintConfig: HintConfig = {
 *   hintPosition: 'start',
 *   visualHintPosition: 'end',
 *   maxHints: 336,
 *   highlightSelected: true,
 *   useNumbers: true,
 *   singleCharKeys: ['A', 'S', 'D'],
 *   multiCharKeys: ['B', 'C', 'E'],
 *   useHintGroups: true
 * };
 * ```
 */
export interface HintConfig {
  /** 通常モードでのヒント表示位置 */
  hintPosition: "start" | "end" | "same";
  /** Visualモードでのヒント表示位置 */
  visualHintPosition: "start" | "end" | "same" | "both";
  /** パフォーマンス最適化のための最大ヒント表示数 */
  maxHints: number;
  /** 選択中のヒントをハイライト表示するか */
  highlightSelected: boolean;
  /** 数字(0-9)をヒント文字として使用するか */
  useNumbers: boolean;
  /** 1文字ヒント専用のキー配列 */
  singleCharKeys: string[];
  /** 2文字以上のヒント専用のキー配列 */
  multiCharKeys: string[];
  /** 1文字ヒントの最大表示数（オプション） */
  maxSingleCharHints?: number;
  /** ヒントグループ機能を使用するか */
  useHintGroups: boolean;
  /** ヒントマーカーのハイライト色設定（オプション） */
  highlightHintMarker?: string | HighlightColor;
  /** 選択中ヒントマーカーのハイライト色設定（オプション） */
  highlightHintMarkerCurrent?: string | HighlightColor;
}

/**
 * 単語検出関連設定インターフェース
 * 日本語を含む多言語対応の単語検出アルゴリズムの設定を定義します。
 * TinySegmenterやハイブリッド方式での単語境界検出を制御します。
 *
 * @interface WordConfig
 * @example
 * ```typescript
 * const wordConfig: WordConfig = {
 *   useJapanese: true,
 *   detectionStrategy: 'hybrid',
 *   enableTinySegmenter: true,
 *   segmenterThreshold: 4,
 *   japaneseMinWordLength: 2,
 *   japaneseMergeParticles: true,
 *   japaneseMergeThreshold: 2,
 *   defaultMinWordLength: 3
 * };
 * ```
 */
export interface WordConfig {
  /** 日本語を含む単語検出を行うか（オプション、既存設定と互換性のため） */
  useJapanese?: boolean;
  /** 単語検出アルゴリズム（regex: 正規表現、tinysegmenter: 形態素解析、hybrid: ハイブリッド） */
  detectionStrategy: "regex" | "tinysegmenter" | "hybrid";
  /** TinySegmenter（日本語形態素解析）を有効にするか */
  enableTinySegmenter: boolean;
  /** TinySegmenterを使用する最小文字数の閾値 */
  segmenterThreshold: number;
  /** 日本語単語として扱う最小文字数 */
  japaneseMinWordLength: number;
  /** 助詞や接続詞を前の単語と結合するか */
  japaneseMergeParticles: boolean;
  /** 単語結合時の最大文字数の閾値 */
  japaneseMergeThreshold: number;
  /** デフォルトの最小単語長 */
  defaultMinWordLength: number;
  /** キー別の最小文字数設定（オプション） */
  perKeyMinLength?: Record<string, number>;
  /** 内部使用：現在のキーコンテキスト（オプション） */
  currentKeyContext?: string;
}

/**
 * パフォーマンス関連設定インターフェース
 * プラグインのパフォーマンス最適化とレスポンシブネスに関する設定を定義します。
 * デバウンス処理、キーリピート処理、モーション制御などが含まれます。
 *
 * @interface PerformanceConfig
 * @example
 * ```typescript
 * const performanceConfig: PerformanceConfig = {
 *   debounceDelay: 50,
 *   motionTimeout: 2000,
 *   suppressOnKeyRepeat: true,
 *   keyRepeatThreshold: 50,
 *   keyRepeatResetDelay: 300,
 *   triggerOnHjkl: true,
 *   countedMotions: ['j', 'k']
 * };
 * ```
 */
export interface PerformanceConfig {
  /** ヒント表示のデバウンス遅延時間（ミリ秒） */
  debounceDelay: number;
  /** キャッシュサイズの制限（オプション、将来の拡張用） */
  cacheSize?: number;
  /** バッチ処理の閾値（オプション、将来の拡張用） */
  batchThreshold?: number;
  /** モーションのタイムアウト時間（ミリ秒） */
  motionTimeout: number;
  /** キーリピート時のヒント表示を抑制するか */
  suppressOnKeyRepeat: boolean;
  /** キーリピートと判定する時間の閾値（ミリ秒） */
  keyRepeatThreshold: number;
  /** キーリピート終了と判定する遅延時間（ミリ秒） */
  keyRepeatResetDelay: number;
  /** キー別のモーション回数設定（オプション） */
  perKeyMotionCount?: Record<string, number>;
  /** デフォルトのモーション回数（オプション） */
  defaultMotionCount?: number;
  /** hjklキーでのトリガーを有効にするか */
  triggerOnHjkl: boolean;
  /** カウント対象のモーション文字列配列 */
  countedMotions: string[];
}

/**
 * デバッグ設定インターフェース
 * 開発者向けのデバッグ情報とログ出力の制御設定を定義します。
 * 本番環境では通常すべて無効にします。
 *
 * @interface DebugConfig
 * @example
 * ```typescript
 * const debugConfig: DebugConfig = {
 *   debugMode: false,
 *   performanceLog: false,
 *   coordinateDebug: false
 * };
 * ```
 */
export interface DebugConfig {
  /** デバッグモードの有効/無効 */
  debugMode: boolean;
  /** パフォーマンスログの出力有効/無効 */
  performanceLog: boolean;
  /** 座標系デバッグログの出力有効/無効 */
  coordinateDebug: boolean;
}

/**
 * 階層化された設定の構造インターフェース
 * Phase 2で導入された設定の論理的グループ化を表現します。
 * 各設定カテゴリを分離することで、保守性と理解しやすさを向上させます。
 *
 * @interface HierarchicalConfig
 * @example
 * ```typescript
 * const hierarchicalConfig: HierarchicalConfig = {
 *   core: { enabled: true, markers: ['A', 'S'], motionCount: 3 },
 *   hint: { hintPosition: 'start', maxHints: 100, useNumbers: true },
 *   word: { detectionStrategy: 'hybrid', enableTinySegmenter: true },
 *   performance: { debounceDelay: 50, motionTimeout: 2000 },
 *   debug: { debugMode: false, performanceLog: false }
 * };
 * ```
 */
export interface HierarchicalConfig {
  /** 基本設定 */
  core: CoreConfig;
  /** ヒント関連設定 */
  hint: HintConfig;
  /** 単語検出関連設定 */
  word: WordConfig;
  /** パフォーマンス関連設定 */
  performance: PerformanceConfig;
  /** デバッグ設定 */
  debug: DebugConfig;
}

/**
 * camelCase統一のための新しい設定インターフェース
 * snake_caseからcamelCaseへの移行を支援し、モダンなJavaScript/TypeScriptの慣習に合わせます。
 *
 * @interface CamelCaseConfig
 * @example
 * ```typescript
 * const config: CamelCaseConfig = {
 *   enabled: true,
 *   motionCount: 3,
 *   motionTimeout: 2000,
 *   hintPosition: 'start',
 *   useNumbers: true,
 *   triggerOnHjkl: true
 * };
 * ```
 */
export interface CamelCaseConfig {
  // Core settings
  enabled: boolean;
  markers: string[];
  motionCount: number;
  motionTimeout: number;
  hintPosition: "start" | "end" | "same";
  visualHintPosition?: "start" | "end" | "same" | "both";
  triggerOnHjkl: boolean;
  countedMotions: string[];
  maxHints: number;
  debounceDelay: number;

  // Hint settings
  useNumbers: boolean;
  highlightSelected: boolean;
  debugCoordinates: boolean;
  singleCharKeys?: string[];
  multiCharKeys?: string[];
  maxSingleCharHints?: number;
  useHintGroups?: boolean;

  // Word detection settings
  useJapanese?: boolean;
  wordDetectionStrategy?: "regex" | "tinysegmenter" | "hybrid";
  enableTinySegmenter?: boolean;
  segmenterThreshold?: number;
  japaneseMinWordLength?: number;
  japaneseMergeParticles?: boolean;
  japaneseMergeThreshold?: number;
  highlightHintMarker?: string | HighlightColor;
  highlightHintMarkerCurrent?: string | HighlightColor;
  suppressOnKeyRepeat?: boolean;
  keyRepeatThreshold?: number;

  // Per-key settings
  perKeyMinLength?: Record<string, number>;
  defaultMinWordLength?: number;
  perKeyMotionCount?: Record<string, number>;
  defaultMotionCount?: number;
  currentKeyContext?: string;

  // Legacy compatibility
  minWordLength?: number;
  enable?: boolean;
  keyRepeatResetDelay?: number;
  debugMode?: boolean;
  performanceLog?: boolean;

  // Boolean naming convention (internal)
  isEnabled?: boolean;
  shouldUseNumbers?: boolean;
  shouldHighlightSelected?: boolean;
  shouldTriggerOnHjkl?: boolean;
  hasDebugCoordinates?: boolean;
}

/**
 * モダン設定インターフェース
 * Phase 3で導入された後方互換性を保持しながら、現代的な命名規則を採用した設定インターフェース。
 * snake_caseとcamelCaseの両方を同時サポートし、漸進的な移行を可能にします。
 * Proxyを使用した双方向アクセスでシームレスな互換性を提供します。
 *
 * @interface ModernConfig
 * @extends CamelCaseConfig
 * @example
 * ```typescript
 * const config = createModernConfig({
 *   motionCount: 3,    // camelCase
 *   motion_timeout: 2000  // snake_case (互換性のため)
 * });
 *
 * // 両方のアクセス方法が有効
 * console.log(config.motionCount);    // 3
 * console.log(config.motion_count);   // 3 (同じ値)
 * ```
 */
export interface ModernConfig extends CamelCaseConfig {
  // snake_case properties for backward compatibility
  motion_count?: number;
  motion_timeout?: number;
  hint_position?: HintPositionType;
  visual_hint_position?: "start" | "end" | "same";
  trigger_on_hjkl?: boolean;
  counted_motions?: string[];
  use_numbers?: boolean;
  highlight_selected?: boolean;
  debug_coordinates?: boolean;
  single_char_keys?: string[];
  multi_char_keys?: string[];
  max_single_char_hints?: number;
  use_hint_groups?: boolean;
  use_japanese?: boolean;
  word_detection_strategy?: "regex" | "tinysegmenter" | "hybrid";
  enable_tinysegmenter?: boolean;
  segmenter_threshold?: number;
  japanese_min_word_length?: number;
  japanese_merge_particles?: boolean;
  japanese_merge_threshold?: number;
  highlight_hint_marker?: string | HighlightColor;
  highlight_hint_marker_current?: string | HighlightColor;
  suppress_on_key_repeat?: boolean;
  key_repeat_threshold?: number;
  per_key_min_length?: Record<string, number>;
  default_min_word_length?: number;
  per_key_motion_count?: Record<string, number>;
  default_motion_count?: number;
  current_key_context?: string;
  min_word_length?: number;
  enable?: boolean;
  key_repeat_reset_delay?: number;
  debug_mode?: boolean;
  performance_log?: boolean;
}

/**
 * メイン設定インターフェース
 * プラグインの核となる設定インターフェースで、既存コードとの互換性を維持しています。
 * snake_caseの命名規則を使用し、全ての機能設定を含んでいます。
 * 新規実装ではCamelCaseConfigまたはModernConfigの使用を検討してください。
 *
 * @interface Config
 * @example
 * ```typescript
 * const config: Config = {
 *   enabled: true,
 *   markers: ['A', 'S', 'D', 'F'],
 *   motion_count: 3,
 *   motion_timeout: 2000,
 *   hint_position: 'start',
 *   use_numbers: true,
 *   highlight_selected: true,
 *   debug_mode: false
 * };
 * ```
 */
export interface Config {
  markers: string[];
  motion_count: number;
  motion_timeout: number;
  hint_position: HintPositionType;
  visual_hint_position?: "start" | "end" | "same" | "both"; // Visual Modeでのヒント位置 (デフォルト: 'end')
  trigger_on_hjkl: boolean;
  counted_motions: string[];
  enabled: boolean;
  maxHints: number; // パフォーマンス最適化: 最大ヒント数
  debounceDelay: number; // デバウンス遅延時間
  use_numbers: boolean; // 数字(0-9)をヒント文字として使用
  highlight_selected: boolean; // 選択中のヒントをハイライト（UX改善）
  debug_coordinates: boolean; // 座標系デバッグログの有効/無効
  single_char_keys?: string[]; // 1文字ヒント専用キー
  multi_char_keys?: string[]; // 2文字以上ヒント専用キー
  max_single_char_hints?: number; // 1文字ヒントの最大数
  use_hint_groups?: boolean; // ヒントグループ機能を使用するか
  use_japanese?: boolean; // 日本語を含む単語検出を行うか（デフォルト: false）
  word_detection_strategy?: "regex" | "tinysegmenter" | "hybrid"; // 単語検出アルゴリズム（デフォルト: "hybrid"）
  enable_tinysegmenter?: boolean; // TinySegmenterを有効にするか（デフォルト: true）
  segmenter_threshold?: number; // TinySegmenterを使用する最小文字数（デフォルト: 4）
  // 日本語分割精度設定
  japanese_min_word_length?: number; // 日本語の最小単語長（デフォルト: 2）
  japanese_merge_particles?: boolean; // 助詞や接続詞を前の単語と結合（デフォルト: true）
  japanese_merge_threshold?: number; // 結合する最大文字数（デフォルト: 2）
  highlight_hint_marker?: string | HighlightColor; // ヒントマーカーのハイライト色
  highlight_hint_marker_current?: string | HighlightColor; // 選択中ヒントのハイライト色
  suppress_on_key_repeat?: boolean; // キーリピート時のヒント表示抑制（デフォルト: true）
  key_repeat_threshold?: number; // リピート判定の閾値（ミリ秒、デフォルト: 50）

  // キー別最小文字数設定（process1追加）
  per_key_min_length?: Record<string, number>; // キー別の最小文字数設定
  default_min_word_length?: number; // per_key_min_lengthに存在しないキーのデフォルト値
  current_key_context?: string; // 内部使用：現在のキーコンテキスト

  // キー別motion_count設定（process1追加）
  per_key_motion_count?: Record<string, number>; // キー別のmotion_count設定
  default_motion_count?: number; // per_key_motion_countに存在しないキーのデフォルト値

  // 後方互換性のため残す
  min_word_length?: number; // 旧形式の最小文字数設定
  enable?: boolean; // enabled のエイリアス（後方互換性）
  key_repeat_reset_delay?: number; // リピート終了判定の遅延（ミリ秒、デフォルト: 300）
  debug_mode?: boolean; // デバッグモードの有効/無効（デフォルト: false）
  performance_log?: boolean; // パフォーマンスログの有効/無効（デフォルト: false）
}

/**
 * デフォルト設定を取得する関数
 * プラグインの標準的な設定値を返します。既存コードとの互換性を維持しています。
 * この設定はパフォーマンス、ユーザビリティ、日本語対応を考慮して最適化されています。
 *
 * @returns {Config} プラグインのデフォルト設定
 * @example
 * ```typescript
 * const config = getDefaultConfig();
 * console.log(config.motion_count);     // 3
 * console.log(config.motion_timeout);   // 2000
 * console.log(config.enabled);          // true
 * console.log(config.maxHints);         // 336
 * ```
 */
export function getDefaultConfig(): Config {
  return {
    markers: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    motion_count: 3,
    motion_timeout: 2000,
    hint_position: "start",
    visual_hint_position: "end", // Visual Modeでは単語の末尾にヒント表示
    trigger_on_hjkl: true,
    counted_motions: [],
    enabled: true,
    maxHints: 336, // Approach A対応: 11単文字 + 225二文字 + 100数字 = 336個
    debounceDelay: 50, // 50msのデバウンス
    use_numbers: true, // デフォルトで数字を使用可能
    highlight_selected: true, // デフォルトで選択中ヒントをハイライト
    debug_coordinates: false, // デフォルトでデバッグログは無効
    single_char_keys: [
      "A",
      "S",
      "D",
      "F",
      "G",
      "H",
      "J",
      "K",
      "L",
      "N",
      "M",
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
    ],
    multi_char_keys: ["B", "C", "E", "I", "O", "P", "Q", "R", "T", "U", "V", "W", "X", "Y", "Z"],
    // max_single_char_hints: undefined, // デフォルトは制限なし（single_char_keysの長さ）
    use_hint_groups: true, // デフォルトで有効
    // use_japanese: デフォルト値を設定しない（ユーザー設定を優先）
    word_detection_strategy: "hybrid" as const, // ハイブリッド方式をデフォルトに
    enable_tinysegmenter: true, // TinySegmenterを有効に
    segmenter_threshold: 4, // 4文字以上でセグメンテーション
    japanese_min_word_length: 2, // 2文字以上の単語のみヒント表示
    japanese_merge_particles: true, // 助詞を前の単語と結合
    japanese_merge_threshold: 2, // 2文字以下の単語を結合対象とする
    highlight_hint_marker: "DiffAdd", // ヒントマーカーのハイライト色（後方互換性のため文字列）
    highlight_hint_marker_current: "DiffText", // 選択中ヒントのハイライト色（後方互換性のため文字列）
    debug_mode: false, // デバッグモード無効
    performance_log: false, // パフォーマンスログ無効
  };
}

/**
 * 設定値のバリデーション関数
 * camelCaseとsnake_caseの両方の命名規則に対応した設定値検証を行います。
 * 各設定項目の型、範囲、必須条件をチェックし、エラー情報を返します。
 *
 * @param {Partial<Config | CamelCaseConfig>} config 検証する設定オブジェクト
 * @returns {{ valid: boolean; errors: string[] }} バリデーション結果
 * @example
 * ```typescript
 * const result = validateConfig({ motion_count: 5, motionTimeout: 1000 });
 * if (result.valid) {
 *   console.log('設定は有効です');
 * } else {
 *   console.error('エラー:', result.errors);
 * }
 *
 * const invalidResult = validateConfig({ motion_count: -1 });
 * // { valid: false, errors: ['motion_count/motionCount must be a positive integer'] }
 * ```
 */
export function validateConfig(
  config: Partial<Config | CamelCaseConfig>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // motion_count / motionCount の検証
  const motionCountValue = (config as any).motion_count ?? (config as any).motionCount;
  if (motionCountValue !== undefined) {
    if (!Number.isInteger(motionCountValue) || motionCountValue <= 0) {
      errors.push("motion_count/motionCount must be a positive integer");
    }
  }

  // motion_timeout / motionTimeoutの検証
  const motionTimeoutValue = (config as any).motion_timeout ?? (config as any).motionTimeout;
  if (motionTimeoutValue !== undefined) {
    if (!Number.isInteger(motionTimeoutValue) || motionTimeoutValue <= 0) {
      errors.push("motion_timeout/motionTimeout must be a positive integer");
    }
  }

  // maxHintsの検証
  if (config.maxHints !== undefined) {
    if (!Number.isInteger(config.maxHints) || config.maxHints <= 0) {
      errors.push("maxHints must be a positive integer");
    }
  }

  // debounceDelayの検証
  if (config.debounceDelay !== undefined) {
    if (!Number.isInteger(config.debounceDelay) || config.debounceDelay < 0) {
      errors.push("debounceDelay must be a non-negative integer");
    }
  }

  // hint_position / hintPositionの検証
  const hintPositionValue = (config as any).hint_position ?? (config as any).hintPosition;
  if (hintPositionValue !== undefined) {
    const validPositions = ["start", "end", "same"];
    if (!validPositions.includes(hintPositionValue)) {
      errors.push(`hint_position/hintPosition must be one of: ${validPositions.join(", ")}`);
    }
  }

  // visual_hint_position / visualHintPositionの検証
  const visualHintPositionValue = (config as any).visual_hint_position ??
    (config as any).visualHintPosition;
  if (visualHintPositionValue !== undefined) {
    const validPositions = ["start", "end", "same"];
    if (!validPositions.includes(visualHintPositionValue)) {
      errors.push(
        `visual_hint_position/visualHintPosition must be one of: ${validPositions.join(", ")}`,
      );
    }
  }

  // word_detection_strategy / wordDetectionStrategyの検証
  const wordDetectionStrategyValue = (config as any).word_detection_strategy ??
    (config as any).wordDetectionStrategy;
  if (wordDetectionStrategyValue !== undefined) {
    const validStrategies = ["regex", "tinysegmenter", "hybrid"];
    if (!validStrategies.includes(wordDetectionStrategyValue)) {
      errors.push(
        `word_detection_strategy/wordDetectionStrategy must be one of: ${
          validStrategies.join(", ")
        }`,
      );
    }
  }

  // markers配列の検証
  if (config.markers !== undefined) {
    if (!Array.isArray(config.markers) || config.markers.length === 0) {
      errors.push("markers must be a non-empty array");
    } else {
      const uniqueMarkers = new Set(config.markers);
      if (uniqueMarkers.size !== config.markers.length) {
        errors.push("markers must contain unique values");
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 階層化設定のデフォルト値を取得する関数
 * Phase 2で導入された論理的にグループ化された設定構造のデフォルト値を返します。
 * 設定の保守性と理解しやすさを向上させるための構造です。
 *
 * @returns {HierarchicalConfig} 階層化されたデフォルト設定
 * @example
 * ```typescript
 * const hierarchical = getDefaultHierarchicalConfig();
 * console.log(hierarchical.core.enabled);        // true
 * console.log(hierarchical.hint.maxHints);       // 336
 * console.log(hierarchical.word.detectionStrategy); // 'hybrid'
 * console.log(hierarchical.performance.debounceDelay); // 50
 * console.log(hierarchical.debug.debugMode);     // false
 * ```
 */
export function getDefaultHierarchicalConfig(): HierarchicalConfig {
  return {
    core: {
      enabled: true,
      markers: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
      motionCount: 3,
    },
    hint: {
      hintPosition: "start",
      visualHintPosition: "end",
      maxHints: 336,
      highlightSelected: true,
      useNumbers: true,
      singleCharKeys: [
        "A",
        "S",
        "D",
        "F",
        "G",
        "H",
        "J",
        "K",
        "L",
        "N",
        "M",
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
      ],
      multiCharKeys: ["B", "C", "E", "I", "O", "P", "Q", "R", "T", "U", "V", "W", "X", "Y", "Z"],
      useHintGroups: true,
      highlightHintMarker: "DiffAdd",
      highlightHintMarkerCurrent: "DiffText",
    },
    word: {
      useJapanese: undefined, // デフォルトは未設定（既存設定と同じ）
      detectionStrategy: "hybrid",
      enableTinySegmenter: true,
      segmenterThreshold: 4,
      japaneseMinWordLength: 2,
      japaneseMergeParticles: true,
      japaneseMergeThreshold: 2,
      defaultMinWordLength: 3,
    },
    performance: {
      debounceDelay: 50,
      motionTimeout: 2000,
      suppressOnKeyRepeat: true,
      keyRepeatThreshold: 50,
      keyRepeatResetDelay: 300,
      triggerOnHjkl: true,
      countedMotions: [],
    },
    debug: {
      debugMode: false,
      performanceLog: false,
      coordinateDebug: false,
    },
  };
}

/**
 * フラット設定から階層化設定を作成する関数
 * 既存のフラットな設定構造から、論理的にグループ化された階層設定を生成します。
 * 既存設定からの移行や、部分的な設定更新時に使用します。
 *
 * @param {Partial<Config>} [flatConfig={}] 変換元のフラット設定
 * @returns {HierarchicalConfig} 変換された階層化設定
 * @example
 * ```typescript
 * const flatConfig = {
 *   motion_count: 5,
 *   hint_position: 'end',
 *   use_numbers: false,
 *   debug_mode: true
 * };
 *
 * const hierarchical = createHierarchicalConfig(flatConfig);
 * console.log(hierarchical.core.motionCount);   // 5
 * console.log(hierarchical.hint.hintPosition);  // 'end'
 * console.log(hierarchical.hint.useNumbers);    // false
 * console.log(hierarchical.debug.debugMode);    // true
 * ```
 */
export function createHierarchicalConfig(flatConfig: Partial<Config> = {}): HierarchicalConfig {
  const defaults = getDefaultHierarchicalConfig();

  return {
    core: {
      enabled: flatConfig.enabled ?? flatConfig.enable ?? defaults.core.enabled,
      markers: flatConfig.markers ?? defaults.core.markers,
      motionCount: flatConfig.motion_count ?? defaults.core.motionCount,
    },
    hint: {
      hintPosition: (flatConfig.hint_position ?? defaults.hint.hintPosition) as
        | "start"
        | "end"
        | "same",
      visualHintPosition: flatConfig.visual_hint_position ?? defaults.hint.visualHintPosition,
      maxHints: flatConfig.maxHints ?? defaults.hint.maxHints,
      highlightSelected: flatConfig.highlight_selected ?? defaults.hint.highlightSelected,
      useNumbers: flatConfig.use_numbers ?? defaults.hint.useNumbers,
      singleCharKeys: flatConfig.single_char_keys ?? defaults.hint.singleCharKeys,
      multiCharKeys: flatConfig.multi_char_keys ?? defaults.hint.multiCharKeys,
      maxSingleCharHints: flatConfig.max_single_char_hints,
      useHintGroups: flatConfig.use_hint_groups ?? defaults.hint.useHintGroups,
      highlightHintMarker: flatConfig.highlight_hint_marker ?? defaults.hint.highlightHintMarker,
      highlightHintMarkerCurrent: flatConfig.highlight_hint_marker_current ??
        defaults.hint.highlightHintMarkerCurrent,
    },
    word: {
      useJapanese: flatConfig.use_japanese ?? defaults.word.useJapanese,
      detectionStrategy: flatConfig.word_detection_strategy ?? defaults.word.detectionStrategy,
      enableTinySegmenter: flatConfig.enable_tinysegmenter ?? defaults.word.enableTinySegmenter,
      segmenterThreshold: flatConfig.segmenter_threshold ?? defaults.word.segmenterThreshold,
      japaneseMinWordLength: flatConfig.japanese_min_word_length ??
        defaults.word.japaneseMinWordLength,
      japaneseMergeParticles: flatConfig.japanese_merge_particles ??
        defaults.word.japaneseMergeParticles,
      japaneseMergeThreshold: flatConfig.japanese_merge_threshold ??
        defaults.word.japaneseMergeThreshold,
      defaultMinWordLength: flatConfig.default_min_word_length ?? flatConfig.min_word_length ??
        defaults.word.defaultMinWordLength,
      perKeyMinLength: flatConfig.per_key_min_length,
      currentKeyContext: flatConfig.current_key_context,
    },
    performance: {
      debounceDelay: flatConfig.debounceDelay ?? defaults.performance.debounceDelay,
      motionTimeout: flatConfig.motion_timeout ?? defaults.performance.motionTimeout,
      suppressOnKeyRepeat: flatConfig.suppress_on_key_repeat ??
        defaults.performance.suppressOnKeyRepeat,
      keyRepeatThreshold: flatConfig.key_repeat_threshold ??
        defaults.performance.keyRepeatThreshold,
      keyRepeatResetDelay: flatConfig.key_repeat_reset_delay ??
        defaults.performance.keyRepeatResetDelay,
      perKeyMotionCount: flatConfig.per_key_motion_count,
      defaultMotionCount: flatConfig.default_motion_count,
      triggerOnHjkl: flatConfig.trigger_on_hjkl ?? defaults.performance.triggerOnHjkl,
      countedMotions: flatConfig.counted_motions ?? defaults.performance.countedMotions,
    },
    debug: {
      debugMode: flatConfig.debug_mode ?? defaults.debug.debugMode,
      performanceLog: flatConfig.performance_log ?? defaults.debug.performanceLog,
      coordinateDebug: flatConfig.debug_coordinates ?? defaults.debug.coordinateDebug,
    },
  };
}

/**
 * 階層化設定をフラット設定に変換する関数
 * 階層化された設定構造から、既存コードと互換性のあるフラット設定を生成します。
 * 既存のLegacy APIや統合時に必要な変換処理です。
 *
 * @param {HierarchicalConfig} hierarchicalConfig 変換元の階層化設定
 * @returns {Config} 変換されたフラット設定
 * @example
 * ```typescript
 * const hierarchical: HierarchicalConfig = {
 *   core: { enabled: true, motionCount: 5 },
 *   hint: { hintPosition: 'end', useNumbers: false },
 *   // ... other config
 * };
 *
 * const flat = flattenHierarchicalConfig(hierarchical);
 * console.log(flat.enabled);           // true
 * console.log(flat.motion_count);      // 5
 * console.log(flat.hint_position);     // 'end'
 * console.log(flat.use_numbers);       // false
 * ```
 */
export function flattenHierarchicalConfig(hierarchicalConfig: HierarchicalConfig): Config {
  return {
    // Core
    enabled: hierarchicalConfig.core.enabled,
    markers: hierarchicalConfig.core.markers,
    motion_count: hierarchicalConfig.core.motionCount,

    // Hint
    hint_position: hierarchicalConfig.hint.hintPosition,
    visual_hint_position: hierarchicalConfig.hint.visualHintPosition,
    maxHints: hierarchicalConfig.hint.maxHints,
    highlight_selected: hierarchicalConfig.hint.highlightSelected,
    use_numbers: hierarchicalConfig.hint.useNumbers,
    single_char_keys: hierarchicalConfig.hint.singleCharKeys,
    multi_char_keys: hierarchicalConfig.hint.multiCharKeys,
    max_single_char_hints: hierarchicalConfig.hint.maxSingleCharHints,
    use_hint_groups: hierarchicalConfig.hint.useHintGroups,
    highlight_hint_marker: hierarchicalConfig.hint.highlightHintMarker,
    highlight_hint_marker_current: hierarchicalConfig.hint.highlightHintMarkerCurrent,

    // Word
    use_japanese: hierarchicalConfig.word.useJapanese,
    word_detection_strategy: hierarchicalConfig.word.detectionStrategy,
    enable_tinysegmenter: hierarchicalConfig.word.enableTinySegmenter,
    segmenter_threshold: hierarchicalConfig.word.segmenterThreshold,
    japanese_min_word_length: hierarchicalConfig.word.japaneseMinWordLength,
    japanese_merge_particles: hierarchicalConfig.word.japaneseMergeParticles,
    japanese_merge_threshold: hierarchicalConfig.word.japaneseMergeThreshold,
    default_min_word_length: hierarchicalConfig.word.defaultMinWordLength,
    per_key_min_length: hierarchicalConfig.word.perKeyMinLength,
    current_key_context: hierarchicalConfig.word.currentKeyContext,

    // Performance
    debounceDelay: hierarchicalConfig.performance.debounceDelay,
    motion_timeout: hierarchicalConfig.performance.motionTimeout,
    suppress_on_key_repeat: hierarchicalConfig.performance.suppressOnKeyRepeat,
    key_repeat_threshold: hierarchicalConfig.performance.keyRepeatThreshold,
    key_repeat_reset_delay: hierarchicalConfig.performance.keyRepeatResetDelay,
    per_key_motion_count: hierarchicalConfig.performance.perKeyMotionCount,
    default_motion_count: hierarchicalConfig.performance.defaultMotionCount,
    trigger_on_hjkl: hierarchicalConfig.performance.triggerOnHjkl,
    counted_motions: hierarchicalConfig.performance.countedMotions,

    // Debug
    debug_mode: hierarchicalConfig.debug.debugMode,
    performance_log: hierarchicalConfig.debug.performanceLog,
    debug_coordinates: hierarchicalConfig.debug.coordinateDebug,
  };
}

/**
 * 階層化設定のマージ関数
 * 部分的な設定更新をサポートし、既存の階層化設定と新しい更新値をマージします。
 * 各カテゴリの設定を层別にマージし、網羅的な更新を可能にします。
 *
 * @param {HierarchicalConfig} baseConfig ベースとなる階層化設定
 * @param {Partial<HierarchicalConfig>} updates 更新する設定値
 * @returns {HierarchicalConfig} マージされた新しい階層化設定
 * @example
 * ```typescript
 * const baseConfig = getDefaultHierarchicalConfig();
 * const updates = {
 *   core: { motionCount: 5 },
 *   hint: { useNumbers: false },
 *   debug: { debugMode: true }
 * };
 *
 * const merged = mergeHierarchicalConfig(baseConfig, updates);
 * console.log(merged.core.motionCount);  // 5 (更新された値)
 * console.log(merged.core.enabled);      // true (ベースの値が維持)
 * console.log(merged.hint.useNumbers);   // false (更新された値)
 * console.log(merged.debug.debugMode);   // true (更新された値)
 * ```
 */
export function mergeHierarchicalConfig(
  baseConfig: HierarchicalConfig,
  updates: Partial<HierarchicalConfig>,
): HierarchicalConfig {
  return {
    core: { ...baseConfig.core, ...updates.core },
    hint: { ...baseConfig.hint, ...updates.hint },
    word: { ...baseConfig.word, ...updates.word },
    performance: { ...baseConfig.performance, ...updates.performance },
    debug: { ...baseConfig.debug, ...updates.debug },
  };
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
 * console.log(merged.motion_count); // 5
 * console.log(merged.enabled);      // true (enableが優先される)
 *
 * // バリデーションエラーの例
 * try {
 *   mergeConfig(base, { motion_count: -1 }); // Error: Invalid config
 * } catch (error) {
 *   console.error(error.message);
 * }
 * ```
 */
export function mergeConfig(baseConfig: Config, updates: Partial<Config>): Config {
  // バリデーションを実行
  const validation = validateConfig(updates);
  if (!validation.valid) {
    throw new Error(`Invalid config: ${validation.errors.join(", ")}`);
  }

  // 後方互換性のため、enableフィールドをenabledにマッピング
  if (updates.enable !== undefined) {
    updates.enabled = updates.enable;
  }

  // 後方互換性のため、min_word_lengthをdefault_min_word_lengthにマッピング
  if (updates.min_word_length !== undefined) {
    updates.default_min_word_length = updates.min_word_length;
  }

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
 * copy.motion_count = 10;
 * copy.markers.push('Z');
 *
 * console.log(original.motion_count);  // 3 (元の値が保持される)
 * console.log(copy.motion_count);      // 10
 * console.log(original.markers.length === copy.markers.length - 1); // true
 * ```
 */
export function cloneConfig(config: Config): Config {
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
 * const wMinLength = getPerKeyValue(config, 'w', config.per_key_min_length, config.default_min_word_length, 1);
 * console.log(wMinLength); // 4
 *
 * // キー別設定がない場合はデフォルト値
 * const eMinLength = getPerKeyValue(config, 'e', config.per_key_min_length, config.default_min_word_length, 1);
 * console.log(eMinLength); // 3
 *
 * // デフォルト値もない場合はフォールバック値
 * const fallbackConfig = { ...config, default_min_word_length: undefined };
 * const fMinLength = getPerKeyValue(fallbackConfig, 'f', fallbackConfig.per_key_min_length, fallbackConfig.default_min_word_length, 1);
 * console.log(fMinLength); // 1
 * ```
 */
export function getPerKeyValue<T>(
  config: Config,
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
 * console.log(SNAKE_TO_CAMEL_MAPPING.motion_count); // 'motionCount'
 * console.log(SNAKE_TO_CAMEL_MAPPING.hint_position); // 'hintPosition'
 * console.log(SNAKE_TO_CAMEL_MAPPING.use_numbers); // 'useNumbers'
 * ```
 */
const SNAKE_TO_CAMEL_MAPPING: Record<string, string> = {
  motion_count: "motionCount",
  motion_timeout: "motionTimeout",
  hint_position: "hintPosition",
  visual_hint_position: "visualHintPosition",
  trigger_on_hjkl: "triggerOnHjkl",
  counted_motions: "countedMotions",
  use_numbers: "useNumbers",
  highlight_selected: "highlightSelected",
  debug_coordinates: "debugCoordinates",
  single_char_keys: "singleCharKeys",
  multi_char_keys: "multiCharKeys",
  max_single_char_hints: "maxSingleCharHints",
  use_hint_groups: "useHintGroups",
  use_japanese: "useJapanese",
  word_detection_strategy: "wordDetectionStrategy",
  enable_tinysegmenter: "enableTinySegmenter",
  segmenter_threshold: "segmenterThreshold",
  japanese_min_word_length: "japaneseMinWordLength",
  japanese_merge_particles: "japaneseMergeParticles",
  japanese_merge_threshold: "japaneseMergeThreshold",
  highlight_hint_marker: "highlightHintMarker",
  highlight_hint_marker_current: "highlightHintMarkerCurrent",
  suppress_on_key_repeat: "suppressOnKeyRepeat",
  key_repeat_threshold: "keyRepeatThreshold",
  per_key_min_length: "perKeyMinLength",
  default_min_word_length: "defaultMinWordLength",
  per_key_motion_count: "perKeyMotionCount",
  default_motion_count: "defaultMotionCount",
  current_key_context: "currentKeyContext",
  min_word_length: "minWordLength",
  key_repeat_reset_delay: "keyRepeatResetDelay",
  debug_mode: "debugMode",
  performance_log: "performanceLog",
};

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
 * console.log(camelConfig.motion_count);   // 5
 * ```
 */
export function convertSnakeToCamelConfig(config: Partial<Config>): CamelCaseConfig {
  const camelConfig: any = {};

  // 既存のプロパティをコピー
  Object.assign(camelConfig, config);

  // snake_caseをcamelCaseに変換
  for (const [snakeKey, camelKey] of Object.entries(SNAKE_TO_CAMEL_MAPPING)) {
    if ((config as any)[snakeKey] !== undefined) {
      camelConfig[camelKey] = (config as any)[snakeKey];
    }
  }

  return camelConfig as CamelCaseConfig;
}

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
 * console.log(config.motion_count);   // 5 (同じ値)
 *
 * console.log(config.hintPosition);   // 'end'
 * console.log(config.hint_position);  // 'end' (同じ値)
 *
 * // ブール型の命名規則アクセスも可能
 * console.log(config.isEnabled);      // true
 * console.log(config.shouldUseNumbers); // 設定に応じた値
 *
 * // 設定値の更新も双方向で同期
 * config.motionCount = 10;
 * console.log(config.motion_count);   // 10
 * ```
 */
export function createModernConfig(input: Partial<CamelCaseConfig | Config> = {}): ModernConfig {
  const defaultConfig = getDefaultConfig();
  const baseConfig = { ...defaultConfig, ...input };
  const camelConfig = convertSnakeToCamelConfig(baseConfig);

  // inputで明示的に指定された値を優先
  Object.assign(camelConfig, input);

  // バリデーション実行
  const validation = validateConfig(camelConfig);
  if (!validation.valid) {
    throw new Error(`Invalid config: ${validation.errors.join(", ")}`);
  }

  // Proxyでsnake_caseとcamelCaseの双方向アクセスを実現
  const result = new Proxy(camelConfig as ModernConfig, {
    get(target: any, prop: string | symbol) {
      if (typeof prop === "string") {
        // snake_caseアクセス時はcamelCaseに変換してアクセス
        const camelProp = SNAKE_TO_CAMEL_MAPPING[prop];
        if (camelProp && target[camelProp] !== undefined) {
          return target[camelProp];
        }

        // boolean型の命名規則プロパティ
        if (prop === "isEnabled") return target.enabled;
        if (prop === "shouldUseNumbers") return target.useNumbers;
        if (prop === "shouldHighlightSelected") return target.highlightSelected;
        if (prop === "shouldTriggerOnHjkl") return target.triggerOnHjkl;
        if (prop === "hasDebugCoordinates") return target.debugCoordinates;
      }

      return target[prop as keyof ModernConfig];
    },

    set(target: any, prop: string | symbol, value: any) {
      if (typeof prop === "string") {
        // snake_case設定時はcamelCaseも同期
        const camelProp = SNAKE_TO_CAMEL_MAPPING[prop];
        if (camelProp) {
          target[camelProp] = value;
          target[prop] = value; // snake_caseも保持
          return true;
        }

        // camelCase設定時はsnake_caseも同期
        const snakeProps = Object.entries(SNAKE_TO_CAMEL_MAPPING)
          .filter(([_, camel]) => camel === prop)
          .map(([snake, _]) => snake);

        if (snakeProps.length > 0) {
          target[prop] = value;
          snakeProps.forEach((snakeProp) => {
            target[snakeProp] = value;
          });
          return true;
        }

        // boolean型の命名規則プロパティ（読み取り専用）
        if (
          [
            "isEnabled",
            "shouldUseNumbers",
            "shouldHighlightSelected",
            "shouldTriggerOnHjkl",
            "hasDebugCoordinates",
          ].includes(prop)
        ) {
          // これらは元のプロパティと同期する読み取り専用
          return true;
        }
      }

      target[prop as keyof ModernConfig] = value;
      return true;
    },
  });

  // 初期値をsnake_case形式でも設定
  for (const [snakeKey, camelKey] of Object.entries(SNAKE_TO_CAMEL_MAPPING)) {
    if ((result as any)[camelKey] !== undefined) {
      (result as any)[snakeKey] = (result as any)[camelKey];
    }
  }

  return result;
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
 * @param {Partial<Config> | Partial<CamelCaseConfig>} config チェックする設定オブジェクト
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
export function getDeprecationWarnings(
  config: Partial<Config> | Partial<CamelCaseConfig>,
): DeprecationWarning[] {
  const warnings: DeprecationWarning[] = [];

  for (const [snakeKey, camelKey] of Object.entries(SNAKE_TO_CAMEL_MAPPING)) {
    if ((config as any)[snakeKey] !== undefined) {
      warnings.push({
        property: snakeKey,
        replacement: camelKey,
        message: `Property '${snakeKey}' is deprecated. Use '${camelKey}' instead.`,
      });
    }
  }

  return warnings;
}
