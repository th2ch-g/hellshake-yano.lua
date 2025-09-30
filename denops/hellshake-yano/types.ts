/**
 * Hellshake-Yano 統合型定義ファイル
 *
 * Phase 5: 型定義の整理により、分散していた型定義を一箇所に集約し、
 * 型安全性の向上、再利用性の確保、保守性の改善を実現します。
 *
 * アーキテクチャ:
 * - 基本インターフェース: Word, HintMapping, Config等の主要型
 * - 型エイリアス: 複雑な型を簡潔に表現
 * - ユニオン型: 制限された値セットの表現
 * - ジェネリクス: 再利用可能な型パラメータ
 * - 型ガード関数: 実行時の型安全性確保
 * */

import type { Config } from "./config.ts";

// Config型を再エクスポート（テストファイルがインポートできるように）
export type { Config } from "./config.ts";

// ===== 基本インターフェース =====

/**
 * 単語情報インターフェース
 *
 * @description 検出された単語の位置とテキスト情報を保持する基本的なデータ構造
 * Vim/Neovimの座標系に対応し、UTF-8互換性を考慮した設計
 *
 * @example
 * ```typescript
 * const word: Word = {
 *   text: "example",
 *   line: 1,
 *   col: 5,
 *   byteCol: 5  // UTF-8環境でのバイト位置
 * };
 * ```
 */
export interface Word {
  /** 単語のテキスト（必須） */
  text: string;
  /** 行番号（1ベース、必須） */
  line: number;
  /** 列番号（1ベース、表示列位置、必須） */
  col: number;
  /** バイトベースの列番号（1ベース、UTF-8互換性用、オプショナル） */
  byteCol?: number;
}

/**
 * ヒントマッピング情報インターフェース（Phase 5: 型定義の整理で最適化）
 *
 * @description 単語とヒント文字列の対応関係を定義
 * lazy evaluationによるパフォーマンス最適化を考慮した設計
 *
 * ### 改善点（REFACTOR）：
 * - hintColとhintByteColは常に計算可能なため必須に変更
 * - 型安全性を向上し、undefinedチェックを不要にする
 * - パフォーマンスとメモリ効率を両立
 *
 * @example
 * ```typescript
 * const mapping: HintMapping = {
 *   word: { text: "hello", line: 1, col: 5 },
 *   hint: "A",
 *   hintCol: 5,      // 必須（計算可能）
 *   hintByteCol: 5   // 必須（計算可能）
 * };
 * ```
 */
export interface HintMapping {
  /** マッピング対象の単語（必須） */
  word: Word;
  /** 割り当てられたヒント文字列（必須、空文字列不可） */
  hint: string;
  /** ヒントの表示位置（列番号、1ベース、必須） */
  hintCol: number;
  /** ヒントの表示位置（バイト列番号、1ベース、必須） */
  hintByteCol: number;
}

/**
 * ヒント表示位置情報インターフェース
 *
 * @description ヒントの正確な表示位置とモードを定義
 * Vim座標系とNeovim座標系の両方に対応
 */
export interface HintPosition {
  /** 行番号（1ベース） */
  line: number;
  /** 列番号（1ベース） */
  col: number;
  /** 表示モード */
  display_mode: HintDisplayMode;
}

/**
 * 座標系対応版ヒント表示位置インターフェース
 *
 * @description Vim座標系（1ベース）とNeovim extmark座標系（0ベース）の両方に対応
 */
export interface HintPositionWithCoordinateSystem extends HintPosition {
  /** Vim座標系列番号（1ベース、matchadd用） */
  vim_col: number;
  /** Neovim extmark座標系列番号（0ベース、extmark用） */
  nvim_col: number;
  /** Vim座標系行番号（1ベース、matchadd用） */
  vim_line: number;
  /** Neovim extmark座標系行番号（0ベース、extmark用） */
  nvim_line: number;
}

/**
 * コア状態管理インターフェース（Phase2: 状態管理の移行）
 *
 * @description Coreクラスの内部状態を統合管理するためのインターフェース
 * getState/setState/initializeStateメソッドで使用される状態構造を定義
 *
 * ### 状態項目：
 * - config: 現在の設定情報
 * - currentHints: 現在表示中のヒント配列
 * - hintsVisible: ヒント表示状態のフラグ
 * - isActive: プラグインのアクティブ状態
 * */
export interface CoreState {
  /** 現在の設定情報 */
  config: Config;
  /** 現在表示中のヒントマッピング配列 */
  currentHints: HintMapping[];
  /** ヒント表示状態フラグ */
  hintsVisible: boolean;
  /** プラグインのアクティブ状態フラグ */
  isActive: boolean;
}


/**
 * ハイライト色設定インターフェース
 *
 * @description 前景色と背景色を個別に指定可能な色設定
 */
export interface HighlightColor {
  /** 前景色（'Red' or '#ff0000' or 'NONE'） */
  fg?: string;
  /** 背景色（'Blue' or '#0000ff' or 'NONE'） */
  bg?: string;
}

/**
 * パフォーマンス測定結果インターフェース
 *
 * @description 各操作の実行時間測定結果を保持
 */
export interface PerformanceMetrics {
  /** ヒント表示処理の実行時間リスト（ミリ秒） */
  showHints: number[];
  /** ヒント非表示処理の実行時間リスト（ミリ秒） */
  hideHints: number[];
  /** 単語検出処理の実行時間リスト（ミリ秒） */
  wordDetection: number[];
  /** ヒント生成処理の実行時間リスト（ミリ秒） */
  hintGeneration: number[];
}

/**
 * デバッグ情報インターフェース
 *
 * @description システムの現在状態とパフォーマンス情報を包含
 */
export interface DebugInfo {
  /** 現在の設定情報のスナップショット */
  config: Config | any;
  /** ヒントの表示状態フラグ */
  hintsVisible: boolean;
  /** 現在表示中のヒントマッピング配列 */
  currentHints: HintMapping[];
  /** パフォーマンス測定結果の集計 */
  metrics: PerformanceMetrics;
  /** デバッグ情報取得時刻（Unix timestamp） */
  timestamp: number;
}

/**
 * 単語検出コンテキストインターフェース
 *
 * @description 単語検出処理に渡されるコンテキスト情報
 * キー別の設定やモーション情報を含む
 */
export interface DetectionContext {
  /** 現在実行中のモーションキー */
  currentKey?: string;
  /** このコンテキストでの最小単語長 */
  minWordLength?: number;
  /** 追加のコンテキスト情報 */
  metadata?: Record<string, unknown>;
  /** バッファ番号（オプショナル） */
  bufnr?: number;
  /** 設定オブジェクト（オプショナル） */
  config?: any;
  /** 単語検出戦略 */
  strategy?: string;

  // 新規追加フィールド（process4 sub3: コンテキスト認識による分割調整）
  /** Vimのfiletype（'typescript', 'python'等） */
  fileType?: string;
  /** 構文コンテキスト情報 */
  syntaxContext?: SyntaxContext;
  /** 行コンテキスト情報 */
  lineContext?: LineContext;
}

/** 構文コンテキスト情報 */
export interface SyntaxContext {
  /** コメント内か */
  inComment: boolean;
  /** 文字列リテラル内か */
  inString: boolean;
  /** 関数定義内か */
  inFunction: boolean;
  /** クラス定義内か */
  inClass: boolean;
  /** 言語名（fileTypeから判定） */
  language: string;
  /** Vimの構文グループ（オプション） */
  syntaxGroups?: string[];
}

/**
 * 行コンテキスト情報インターフェース
 *
 * @description 個別の行レベルでのコンテキスト情報を表現
 * 行の種類、インデント、前後の文字などの詳細情報を保持
 */
export interface LineContext {
  /** コメント行かを示すフラグ */
  isComment: boolean;
  /** ドキュメント文字列かを示すフラグ */
  isDocString: boolean;
  /** import/require文かを示すフラグ */
  isImport: boolean;
  /** インデントレベル（スペース数で計算） */
  indentLevel: number;
  /** 行の種類（'code', 'comment', 'string'等の分類） */
  lineType: string;
  /** 直前の文字（文脈判定用、オプション） */
  precedingChar?: string;
  /** 直後の文字（文脈判定用、オプション） */
  followingChar?: string;
}

/**
 * 単語検出結果インターフェース
 *
 * @description 単語検出の結果とメタデータを含む包括的な結果オブジェクト
 */
export interface WordDetectionResult {
  /** 検出された単語配列 */
  words: Word[];
  /** 使用された検出器名 */
  detector: string;
  /** 検出成功フラグ */
  success: boolean;
  /** エラーメッセージ（失敗時） */
  error?: string;
  /** パフォーマンス情報 */
  performance: PerformanceMetric;
}

/**
 * ヒントキー設定インターフェース
 *
 * @description 1文字ヒントと複数文字ヒントのキー設定
 */
export interface HintKeyConfig {
  /** 1文字ヒント専用キー */
  singleCharKeys?: string[];
  /** 2文字以上ヒント専用キー */
  multiCharKeys?: string[];
  /** 従来のmarkers（後方互換性） */
  markers?: string[];
  /** 1文字ヒントの最大数 */
  maxSingleCharHints?: number;
  /** カーソルからの距離で1文字/2文字を決定するか */
  useDistancePriority?: boolean;
  /**
   * 1文字ヒントでの記号使用を許可するか
   *
   * @description
   * trueの場合、singleCharKeysに記号（!, @, #等）を含めることができます。
   * falseまたは未定義の場合、従来の動作（英数字のみ）を維持します。
   *
   * @default false
   *
   * @example
   * ```typescript
   * const config: HintKeyConfig = {
   *   singleCharKeys: ["A", "B", "!", "@"],
   *   allowSymbolsInSingleChar: true
   * };
   * ```
   */
  allowSymbolsInSingleChar?: boolean;
  /**
   * 複数文字ヒントで数字専用モードを有効にするか
   *
   * @description
   * trueの場合、multiCharKeysは数字のみを使用してヒントを生成します。
   * これにより、"11", "12", "21"のような数字ベースのヒントが生成されます。
   * falseまたは未定義の場合、multiCharKeysの内容に基づいた通常の動作を行います。
   *
   * @default false
   *
   * @example
   * ```typescript
   * const config: HintKeyConfig = {
   *   multiCharKeys: ["1", "2", "3", "4", "5"],
   *   numericOnlyMultiChar: true
   * };
   * // ヒント例: "11", "12", "13", "21", "22", "23", ...
   * ```
   */
  numericOnlyMultiChar?: boolean;
  /**
   * アルファベットヒントに加えて数字2文字ヒントを追加生成するか
   *
   * @description
   * trueの場合、singleCharKeysとmultiCharKeysで生成されたアルファベットヒントの後に、
   * 数字2文字ヒント（01-99, 00）を追加生成します。
   * これにより、アルファベットと数字の組み合わせで100個以上のヒントパターンを提供できます。
   *
   * ### 生成順序（優先順位）：
   * 1. singleCharKeys（1文字ヒント）
   * 2. multiCharKeys（アルファベット2文字ヒント）
   * 3. 数字2文字ヒント（01-09, 10-99, 00）
   *
   * @default false
   *
   * @example
   * ```typescript
   * const config: HintKeyConfig = {
   *   singleCharKeys: ["A", "S", "D"],
   *   multiCharKeys: ["B", "C"],
   *   useNumericMultiCharHints: true
   * };
   * // 生成例:
   * // 1文字: A, S, D
   * // 2文字アルファベット: BB, BC, CB, CC
   * // 2文字数字: 01, 02, 03, ..., 99, 00
   * ```
   */
  useNumericMultiCharHints?: boolean;
}

// ===== 型エイリアス =====

/**
 * ヒント表示位置タイプ
 *
 * @description ヒントの表示位置を指定する文字列リテラル型
 * - "start": 単語の先頭に表示
 * - "end": 単語の最後に表示
 * - "overlay": 単語の先頭に重ねて表示
 * - "same": 通常のhint_positionと同じ設定を使用
 * - "both": 単語の先頭と最後の両方に表示
 */
export type HintPositionType = "start" | "end" | "overlay" | "same" | "both";

/**
 * ヒント表示モード
 *
 * @description ヒントの表示方法を指定するユニオン型
 */
export type HintDisplayMode = "before" | "after" | "overlay";

/**
 * 単語検出戦略
 *
 * @description 単語検出に使用するアルゴリズムを指定する型
 */
export type DetectionStrategy = "regex" | "tinysegmenter" | "hybrid";

/**
 * モーションキー
 *
 * @description Vimで使用可能なモーションキーのユニオン型
 */
export type MotionKey =
  | "f" | "F" | "t" | "T"  // 文字検索モーション
  | "w" | "W" | "b" | "B" | "e" | "E"  // 単語移動モーション
  | "/" | "?" | "n" | "N"  // 検索モーション
  | "h" | "j" | "k" | "l"  // 基本移動モーション
  | ";" | ","  // リピートモーション
  | string;    // 拡張可能性のため

/**
 * キャッシュキー
 *
 * @description キャッシュエントリを識別するためのキー型
 */
export type CacheKey = string;

/**
 * タイムスタンプ
 *
 * @description Unix timestamp (milliseconds)
 */
export type Timestamp = number;

// ===== ジェネリクス型 =====

/**
 * キャッシュエントリジェネリック型
 *
 * @description 任意の型のデータをキャッシュするための汎用エントリ
 * TTL（Time To Live）機能とタイムスタンプを含む
 *
 * @template T キャッシュするデータの型
 */
export interface CacheEntry<T> {
  /** キャッシュキー */
  key: CacheKey;
  /** キャッシュされた値 */
  value: T;
  /** 作成時刻（Unixタイムスタンプ） */
  timestamp: Timestamp;
  /** 生存時間（ミリ秒、オプショナル） */
  ttl?: number;
}

/**
 * バリデーション結果ジェネリック型
 *
 * @description 任意の型に対するバリデーション結果を表現
 * エラー情報とバリデート済みの値を含む
 *
 * @template T バリデーション対象の型
 */
export interface ValidationResult<T> {
  /** バリデーション成功フラグ */
  isValid: boolean;
  /** バリデート済みの値（成功時） */
  value?: T;
  /** エラーメッセージ配列 */
  errors: string[];
  /** 警告メッセージ配列（オプショナル） */
  warnings?: string[];
}

/**
 * パフォーマンスメトリック型
 *
 * @description 処理のパフォーマンス情報を表現する汎用型
 */
export interface PerformanceMetric {
  /** 処理時間（ミリ秒） */
  duration: number;
  /** 処理された単語数 */
  wordCount: number;
  /** 処理された行数 */
  linesProcessed: number;
  /** メモリ使用量（バイト、オプショナル） */
  memoryUsage?: number;
  /** キャッシュヒット数（オプショナル） */
  cacheHits?: number;
}

/**
 * 結果とエラーのジェネリック型
 *
 * @description Rust風のResult型を模倣した成功/失敗を表現する型
 *
 * @template T 成功時の値の型
 * @template E エラー時の値の型
 */
export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * オプショナルジェネリック型
 *
 * @description 値が存在するかしないかを明示的に表現する型
 *
 * @template T 値の型
 */
export type Optional<T> = T | null | undefined;

/**
 * 部分的な深いプロパティ型
 *
 * @description 深いネストしたオブジェクトのすべてのプロパティをオプショナルにする
 *
 * @template T 対象のオブジェクト型
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ===== 型ガード関数 =====

/**
 * Word型の型ガード関数
 *
 * @description オブジェクトがWord型の構造を満たしているかを判定
 * 実行時の型安全性を確保するために使用
 *
 * @param obj 判定対象のオブジェクト
 * @returns Wordインターフェースを満たしている場合true
 *
 * @example
 * ```typescript
 * if (isWord(unknownObject)) {
 *   // TypeScriptがWord型として認識
 *   console.log(unknownObject.text);
 * }
 * ```
 */
export function isWord(obj: unknown): obj is Word {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as Word).text === "string" &&
    typeof (obj as Word).line === "number" &&
    typeof (obj as Word).col === "number" &&
    (obj as Word).line > 0 &&
    (obj as Word).col > 0 &&
    ((obj as Word).byteCol === undefined || typeof (obj as Word).byteCol === "number")
  );
}

/**
 * HintMapping型の型ガード関数（Phase 5: 型定義の整理で最適化）
 *
 * @description オブジェクトがHintMapping型の構造を満たしているかを判定
 * より厳密な型チェックでhintColとhintByteColの必須化に対応
 *
 * @param obj 判定対象のオブジェクト
 * @returns HintMappingインターフェースを満たしている場合true
 */
export function isHintMapping(obj: unknown): obj is HintMapping {
  return (
    typeof obj === "object" &&
    obj !== null &&
    isWord((obj as HintMapping).word) &&
    typeof (obj as HintMapping).hint === "string" &&
    (obj as HintMapping).hint.length > 0 &&
    typeof (obj as HintMapping).hintCol === "number" &&
    (obj as HintMapping).hintCol > 0 &&
    typeof (obj as HintMapping).hintByteCol === "number" &&
    (obj as HintMapping).hintByteCol > 0
  );
}

/**
 * Config型の型ガード関数（統合後）
 * Process4 Sub3-2-2: 型定義の統合実装
 *
 * @description オブジェクトがConfig型の最小要件を満たしているかを判定
 * camelCase形式のプロパティをチェックします
 *
 * @param obj 判定対象のオブジェクト
 * @returns Configインターフェースの必須項目を満たしている場合true
 */
export function isConfig(obj: unknown): obj is Config {
  return (
    typeof obj === "object" &&
    obj !== null &&
    Array.isArray((obj as Config).markers) &&
    typeof (obj as Config).motionCount === "number" &&
    typeof (obj as Config).motionTimeout === "number" &&
    typeof (obj as Config).hintPosition === "string" &&
    typeof (obj as Config).triggerOnHjkl === "boolean" &&
    Array.isArray((obj as Config).countedMotions) &&
    typeof (obj as Config).enabled === "boolean"
  );
}

/**
 * 有効なWord型の型ガード関数
 *
 * @description Word型であることに加えて、実用的な値を持っているかを判定
 * 空文字列や無効な位置情報を排除
 *
 * @param obj 判定対象のオブジェクト
 * @returns 有効なWordインターフェースを満たしている場合true
 */
export function isValidWord(obj: unknown): obj is Word {
  return (
    isWord(obj) &&
    obj.text.trim().length > 0 &&
    obj.line >= 1 &&
    obj.col >= 1 &&
    (obj.byteCol === undefined || obj.byteCol >= 1)
  );
}

/**
 * HintPosition型の型ガード関数
 *
 * @description オブジェクトがHintPosition型の構造を満たしているかを判定
 *
 * @param obj 判定対象のオブジェクト
 * @returns HintPositionインターフェースを満たしている場合true
 */
export function isHintPosition(obj: unknown): obj is HintPosition {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as HintPosition).line === "number" &&
    typeof (obj as HintPosition).col === "number" &&
    (obj as HintPosition).line > 0 &&
    (obj as HintPosition).col > 0 &&
    ["before", "after", "overlay"].includes((obj as HintPosition).display_mode)
  );
}

/**
 * DetectionStrategy型の型ガード関数
 *
 * @description 文字列が有効なDetectionStrategy値かを判定
 *
 * @param value 判定対象の値
 * @returns 有効なDetectionStrategy値の場合true
 */
export function isDetectionStrategy(value: unknown): value is DetectionStrategy {
  return typeof value === "string" && ["regex", "tinysegmenter", "hybrid"].includes(value);
}

/**
 * MotionKey型の型ガード関数
 *
 * @description 文字列が有効なMotionKey値かを判定
 *
 * @param value 判定対象の値
 * @returns 有効なMotionKey値の場合true
 */
export function isMotionKey(value: unknown): value is MotionKey {
  if (typeof value !== "string") return false;

  const knownMotionKeys = [
    "f", "F", "t", "T", "w", "W", "b", "B", "e", "E",
    "/", "?", "n", "N", "h", "j", "k", "l", ";", ","
  ];

  return knownMotionKeys.includes(value) || value.length === 1;
}

/**
 * CacheEntry型の型ガード関数
 *
 * @description オブジェクトがCacheEntry型の構造を満たしているかを判定
 *
 * @template T キャッシュ値の型
 * @param obj 判定対象のオブジェクト
 * @param valueGuard 値の型ガード関数（オプショナル）
 * @returns CacheEntryインターフェースを満たしている場合true
 */
export function isCacheEntry<T>(
  obj: unknown,
  valueGuard?: (value: unknown) => value is T
): obj is CacheEntry<T> {
  const isBasicStructure = (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as CacheEntry<T>).key === "string" &&
    typeof (obj as CacheEntry<T>).timestamp === "number" &&
    ((obj as CacheEntry<T>).ttl === undefined || typeof (obj as CacheEntry<T>).ttl === "number")
  );

  if (!isBasicStructure) return false;

  if (valueGuard) {
    return valueGuard((obj as CacheEntry<T>).value);
  }

  return true;
}

/**
 * ValidationResult型の型ガード関数
 *
 * @description オブジェクトがValidationResult型の構造を満たしているかを判定
 *
 * @template T 検証される値の型
 * @param obj 判定対象のオブジェクト
 * @param valueGuard 値の型ガード関数（オプショナル）
 * @returns ValidationResultインターフェースを満たしている場合true
 */
export function isValidationResult<T>(
  obj: unknown,
  valueGuard?: (value: unknown) => value is T
): obj is ValidationResult<T> {
  const isBasicStructure = (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as ValidationResult<T>).isValid === "boolean" &&
    Array.isArray((obj as ValidationResult<T>).errors) &&
    ((obj as ValidationResult<T>).warnings === undefined || Array.isArray((obj as ValidationResult<T>).warnings))
  );

  if (!isBasicStructure) return false;

  if (valueGuard && (obj as ValidationResult<T>).value !== undefined) {
    return valueGuard((obj as ValidationResult<T>).value);
  }

  return true;
}

/**
 * PerformanceMetric型の型ガード関数
 *
 * @description オブジェクトがPerformanceMetric型の構造を満たしているかを判定
 *
 * @param obj 判定対象のオブジェクト
 * @returns PerformanceMetricインターフェースを満たしている場合true
 */
export function isPerformanceMetric(obj: unknown): obj is PerformanceMetric {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as PerformanceMetric).duration === "number" &&
    typeof (obj as PerformanceMetric).wordCount === "number" &&
    typeof (obj as PerformanceMetric).linesProcessed === "number" &&
    ((obj as PerformanceMetric).memoryUsage === undefined || typeof (obj as PerformanceMetric).memoryUsage === "number") &&
    ((obj as PerformanceMetric).cacheHits === undefined || typeof (obj as PerformanceMetric).cacheHits === "number")
  );
}

// ===== ユーティリティ型 =====

/**
 * 読み取り専用の深いプロパティ型
 *
 * @description オブジェクトのすべてのプロパティを再帰的に読み取り専用にする
 *
 * @template T 対象のオブジェクト型
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * 必須プロパティ型
 *
 * @description 指定されたプロパティを必須にする
 *
 * @template T 元のオブジェクト型
 * @template K 必須にするプロパティのキー
 */
export type RequiredProperties<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * 型安全なキー型
 *
 * @description オブジェクトのキーを型安全に取得する
 *
 * @template T 対象のオブジェクト型
 */
export type SafeKeys<T> = keyof T;

/**
 * 値型の抽出
 *
 * @description オブジェクトの値の型を抽出する
 *
 * @template T 対象のオブジェクト型
 */
export type ValueOf<T> = T[keyof T];

// ===== 統合設定型（TDD Green Phase） =====

// Configインターフェースの定義はconfig.tsに移動しました

/**
 * 設定型エイリアス
 * すべての設定を表す型
 */
export type ConfigType = Config;

/**
 * 設定型の型ガード関数
 * TDD Green Phase実装
 */
export function isConfigType(obj: unknown): obj is ConfigType {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as ConfigType).enabled === "boolean" &&
    Array.isArray((obj as ConfigType).markers) &&
    typeof (obj as ConfigType).motionCount === "number" &&
    typeof (obj as ConfigType).motionTimeout === "number" &&
    typeof (obj as ConfigType).hintPosition === "string" &&
    typeof (obj as ConfigType).triggerOnHjkl === "boolean" &&
    Array.isArray((obj as ConfigType).countedMotions) &&
    typeof (obj as ConfigType).maxHints === "number" &&
    typeof (obj as ConfigType).debounceDelay === "number" &&
    typeof (obj as ConfigType).useNumbers === "boolean" &&
    typeof (obj as ConfigType).highlightSelected === "boolean" &&
    typeof (obj as ConfigType).debugCoordinates === "boolean"
  );
}

/**
 * 統合設定型のファクトリ関数
 * TDD Green Phase実装
 */
export function createConfigType(partialConfig: Partial<ConfigType> = {}): ConfigType {
  const defaults: ConfigType = {
    enabled: true,
    markers: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"],
    motionCount: 3,
    motionTimeout: 2000,
    hintPosition: "start",
    triggerOnHjkl: true,
    countedMotions: [],
    maxHints: 100,
    debounceDelay: 50,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
    singleCharKeys: [],
    multiCharKeys: [],
    useHintGroups: false,
    highlightHintMarker: "HellshakeYanoHintMarker",
    highlightHintMarkerCurrent: "HellshakeYanoHintMarkerCurrent",
    suppressOnKeyRepeat: true,
    keyRepeatThreshold: 50,
    useJapanese: false,
    wordDetectionStrategy: "hybrid",
    enableTinySegmenter: true,
    segmenterThreshold: 4,
    japaneseMinWordLength: 2,
    japaneseMergeParticles: true,
    japaneseMergeThreshold: 2,
    defaultMinWordLength: 3,
    defaultMotionCount: 3,
    debugMode: false,
    performanceLog: false,
    // Motion counter settings
    motionCounterEnabled: true,
    motionCounterThreshold: 3,
    motionCounterTimeout: 2000,
    showHintOnMotionThreshold: true
  };

  return { ...defaults, ...partialConfig };
}

/**
 * 統合設定型のバリデーション関数
 * TDD Green Phase実装
 */
export function validateConfigType(config: unknown): ValidationResult<ConfigType> {
  const errors: string[] = [];

  if (!isConfigType(config)) {
    errors.push("Invalid ConfigType structure");
    return { isValid: false, errors };
  }

  // 基本的なバリデーション
  if (config.motionCount <= 0) {
    errors.push("motionCount must be positive");
  }

  if (config.motionTimeout <= 0) {
    errors.push("motionTimeout must be positive");
  }

  if (config.maxHints <= 0) {
    errors.push("maxHints must be positive");
  }

  if (config.debounceDelay < 0) {
    errors.push("debounceDelay must be non-negative");
  }

  const validHintPositions = ["start", "end", "same"];
  if (!validHintPositions.includes(config.hintPosition)) {
    errors.push("hintPosition must be 'start', 'end', or 'same'");
  }

  return {
    isValid: errors.length === 0,
    value: errors.length === 0 ? config : undefined,
    errors
  };
}

// ===== デフォルト値とファクトリ関数 =====

/**
 * デフォルトWord値を作成する
 *
 * @param text 単語のテキスト
 * @param line 行番号（デフォルト: 1）
 * @param col 列番号（デフォルト: 1）
 * @returns デフォルト値が設定されたWordオブジェクト
 */
export function createDefaultWord(text: string, line = 1, col = 1): Word {
  return { text, line, col };
}

/**
 * デフォルトHintMapping値を作成する
 *
 * @param word 単語オブジェクト
 * @param hint ヒント文字列
 * @returns デフォルト値が設定されたHintMappingオブジェクト
 */
export function createDefaultHintMapping(word: Word, hint: string): HintMapping {
  return {
    word,
    hint,
    hintCol: word.col, // 単語の位置をデフォルトとして使用
    hintByteCol: word.byteCol ?? word.col, // byteColがあれば使用、なければcolを使用
  };
}

/**
 * 最小限のConfig値を作成する（統合後）
 * Process4 Sub3-2-2: 型定義の統合実装
 *
 * @description 最小限の必須プロパティを持つConfigオブジェクト（camelCase形式）を作成
 * config.tsのcreateMinimalConfig()を使用することを推奨
 *
 * @returns 最小限の必須プロパティを持つConfigオブジェクト
 */
export function createMinimalConfig(): Config {
  return {
    enabled: true,
    markers: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"],
    motionCount: 3,
    motionTimeout: 2000,
    hintPosition: "start",
    triggerOnHjkl: true,
    countedMotions: [],
    maxHints: 100,
    debounceDelay: 50,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
    singleCharKeys: [],
    multiCharKeys: [],
    useHintGroups: false,
    highlightHintMarker: "DiffAdd",
    highlightHintMarkerCurrent: "DiffText",
    suppressOnKeyRepeat: true,
    keyRepeatThreshold: 50,
    useJapanese: false,
    wordDetectionStrategy: "hybrid",
    enableTinySegmenter: true,
    segmenterThreshold: 4,
    japaneseMinWordLength: 2,
    japaneseMergeParticles: true,
    japaneseMergeThreshold: 2,
    defaultMinWordLength: 3,
    defaultMotionCount: 3,
    debugMode: false,
    performanceLog: false,
    // Motion counter settings
    motionCounterEnabled: true,
    motionCounterThreshold: 3,
    motionCounterTimeout: 2000,
    showHintOnMotionThreshold: true
  };
}

/**
 * CacheEntryを作成する
 *
 * @template T キャッシュ値の型
 * @param key キャッシュキー
 * @param value キャッシュする値
 * @param ttl 生存時間（ミリ秒、オプショナル）
 * @returns CacheEntryオブジェクト
 */
export function createCacheEntry<T>(key: CacheKey, value: T, ttl?: number): CacheEntry<T> {
  return {
    key,
    value,
    timestamp: Date.now(),
    ttl,
  };
}

/**
 * ValidationResultを作成する
 *
 * @template T バリデーション対象の型
 * @param isValid バリデーション成功フラグ
 * @param value バリデート済みの値（オプショナル）
 * @param errors エラーメッセージ配列（デフォルト: 空配列）
 * @returns ValidationResultオブジェクト
 */
export function createValidationResult<T>(
  isValid: boolean,
  value?: T,
  errors: string[] = []
): ValidationResult<T> {
  return { isValid, value, errors };
}

// ===== エクスポート統合 =====

/**
 * よく使用される型のエイリアス（REFACTORフェーズで整理）
 * Process4 Sub3-1: 設定型の統合と型定義の整理
 */
export type {
  Word as W,
  HintMapping as HM,
  ConfigType as CT,     // 新しい統合型のエイリアス
  Config as C,          // 後方互換性のため保持
  HintPosition as HP,
  DetectionContext as DC,
  WordDetectionResult as WDR,
};

// ===== Core Directory Consolidation Types =====

/**
 * 単語検出設定インターフェース
 *
 * @description 単語検出処理の設定パラメータを定義
 * core/detection.tsから統合された設定項目
 */
export interface WordDetectionConfig {
  /** 最小単語長（オプション） */
  minLength?: number;
  /** 最大検出単語数（オプション） */
  maxWords?: number;
  /** 検索パターン（正規表現、オプション） */
  pattern?: string;
  /** バッファ番号（オプション） */
  bufnr?: number;
  /** 設定オブジェクト（任意の型、オプション） */
  config?: any;
}

/**
 * 単語検出パラメータインターフェース
 *
 * @description 単語検出関数に渡されるパラメータセット
 * core/detection.tsから統合されたパラメータ定義
 */
export interface DetectWordsParams {
  /** Denopsインスタンス（必須） */
  denops: import("@denops/std").Denops;
  /** バッファ番号（オプション） */
  bufnr?: number;
  /** 設定オブジェクト（任意の型、オプション） */
  config?: any;
}

/**
 * ヒント生成設定インターフェース
 *
 * @description ヒント生成処理の設定パラメータを定義
 * core/generation.tsから統合された設定項目
 */
export interface HintGenerationConfig {
  /** 単語数（必須） */
  wordCount: number;
  /** マーカー文字列（オプション） */
  markers?: string;
  /** 設定オブジェクト（任意の型、オプション） */
  config?: any;
  /** 単語配列（オプション） */
  words?: string[];
  /** ヒントキー文字列（オプション） */
  hintKeys?: string;
}

/**
 * ヒント生成パラメータインターフェース
 *
 * @description ヒント生成関数に渡されるパラメータセット
 * core/generation.tsから統合されたパラメータ定義
 */
export interface GenerateHintsParams {
  /** 単語数（必須） */
  wordCount: number;
  /** マーカー（文字列または文字列配列、オプション） */
  markers?: string | string[];
  /** 設定オブジェクト（任意の型、オプション） */
  config?: any;
}

/**
 * ヒント表示設定インターフェース
 *
 * @description ヒント表示処理の設定パラメータを定義
 * core/operations.tsから統合された設定項目
 */
export interface ShowHintsConfig {
  /** デバウンス時間（ミリ秒、オプション） */
  debounce?: number;
  /** 強制実行フラグ（オプション） */
  force?: boolean;
  /** デバウンス遅延時間（ミリ秒、オプション） */
  debounceDelay?: number;
}

/**
 * ヒント操作設定インターフェース
 *
 * @description ヒント操作処理の設定とDI（依存性注入）パラメータを定義
 * core/operations.tsから統合された設定項目
 */
export interface HintOperationsConfig {
  /** Denopsインスタンス（必須） */
  denops: import("@denops/std").Denops;
  /** 設定オブジェクト（任意の型、オプション） */
  config?: any;
  /** 依存関数群（DI用、オプション） */
  dependencies?: {
    /** 最適化された単語検出関数 */
    detectWordsOptimized?: any;
    /** 最適化されたヒント生成関数 */
    generateHintsOptimized?: any;
    /** ヒント割り当て関数 */
    assignHintsToWords?: any;
    /** 非同期ヒント表示関数 */
    displayHintsAsync?: any;
    /** ヒント非表示関数 */
    hideHints?: any;
    /** パフォーマンス記録関数 */
    recordPerformance?: any;
    /** ヒントキャッシュクリア関数 */
    clearHintCache?: any;
  };
}

/**
 * ヒント操作インターフェース
 *
 * @description ヒント操作に関する全ての機能を提供するメソッド群
 * core/operations.tsから統合されたオペレーション定義
 */
export interface HintOperations {
  /**
   * ヒント表示メソッド
   * @param denops Denopsインスタンス
   * @param config 表示設定（オプション）
   * @returns Promise<void>
   */
  show: (denops: import("@denops/std").Denops, config?: ShowHintsConfig) => Promise<void>;

  /**
   * ヒント非表示メソッド
   * @param denops Denopsインスタンス
   * @returns Promise<void>
   */
  hide: (denops: import("@denops/std").Denops) => Promise<void>;

  /**
   * ヒントクリアメソッド
   * @param denops Denopsインスタンス
   * @returns Promise<void>
   */
  clear: (denops: import("@denops/std").Denops) => Promise<void>;

  /**
   * ヒント表示メソッド（デバウンス適用）
   * @returns Promise<void>
   */
  showHints: () => Promise<void>;

  /**
   * ヒント即座表示メソッド
   * @returns Promise<void>
   */
  showHintsImmediately: () => Promise<void>;

  /**
   * ヒント非表示メソッド（内部用）
   * @returns Promise<void>
   */
  hideHints: () => Promise<void>;

  /**
   * ヒント表示状態確認メソッド
   * @returns ヒントが表示中の場合true
   */
  isHintsVisible: () => boolean;

  /**
   * 現在のヒント取得メソッド
   * @returns 現在表示中のヒントマッピング配列
   */
  getCurrentHints: () => HintMapping[];
}

/** 型定義ファイルのバージョン番号 */
export const TYPES_VERSION = "2.0.0";

/** 型定義ファイルの最終更新日時（ISO 8601形式） */
export const TYPES_LAST_UPDATED = "2024-01-01T00:00:00Z";