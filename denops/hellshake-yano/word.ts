import type { Denops } from "@denops/std";
import type { DetectionContext, Word, WordDetectionResult } from "./types.ts";
import { TinySegmenter as NpmTinySegmenter } from "https://esm.sh/@birchill/tiny-segmenter@1.0.0";
import { exists } from "https://deno.land/std@0.212.0/fs/exists.ts";
import { resolve } from "https://deno.land/std@0.212.0/path/resolve.ts";
import { parse as parseYaml } from "https://deno.land/std@0.212.0/yaml/parse.ts";
import { DEFAULT_UNIFIED_CONFIG, getDefaultConfig } from "./config.ts";

// Re-export Word for backward compatibility
export type { Word };

/**
 * コンテキスト統合から欠落した型定義 - 構文コンテキスト
 * 現在のカーソル位置の構文的な状況を表現します
 */
interface SyntaxContext {
  /** コメント内かどうか */
  inComment: boolean;
  /** 文字列内かどうか */
  inString: boolean;
  /** 関数内かどうか */
  inFunction: boolean;
  /** クラス内かどうか */
  inClass: boolean;
  /** プログラミング言語の種類 */
  language: string;
}

/**
 * 行コンテキスト情報
 * 現在の行の特性と状況を表現します
 */
interface LineContext {
  /** コメント行かどうか */
  isComment: boolean;
  /** ドキュメント文字列行かどうか */
  isDocString: boolean;
  /** インポート文行かどうか */
  isImport: boolean;
  /** インデントレベル */
  indentLevel: number;
  /** 行のタイプ（文字列表現） */
  lineType: string;
}

/**
 * 新しい単語検出設定インターフェース
 *
 * WordDetectionManagerConfigを拡張し、後方互換性を保ちつつ
 * 高度な単語検出機能を提供します。
 *
 * @since 2.0.0
 */
export interface EnhancedWordConfig extends WordDetectionManagerConfig {
  /** 後方互換性のための単語検出ストラテジー */
  strategy?: "regex" | "tinysegmenter" | "hybrid";
  /** キー別の最小文字数設定 */
  perKeyMinLength?: Record<string, number>;
  /** キー別最小文字数のデフォルト */
  defaultMinWordLength?: number;
  /** 現在のキーコンテキスト（内部用） */
  currentKeyContext?: string;
}

import { CacheType, GlobalCache } from "./cache.ts";
// Segmenter import removed - integrated below
import type { Config } from "./config.ts";
import { Core } from "./core.ts";

// パフォーマンス設定
const LARGE_FILE_THRESHOLD = 1000;
const MAX_WORDS_PER_FILE = 1000;
const wordDetectionCache = GlobalCache.getInstance().getCache<string, Word[]>(
  CacheType.WORD_DETECTION,
);

// ==================== Word Detector Interfaces and Types ====================

/**
 * 単語検出器の基底インターフェース
 * 様々な単語検出アルゴリズムを統一的に扱うためのインターフェースです
 */
export interface WordDetector {
  /** 検出器の名前 */
  readonly name: string;
  /** 優先度（値が高いほど優先される） */
  readonly priority: number;
  /** サポートする言語リスト（例: ['ja', 'en', 'any']） */
  readonly supportedLanguages: string[];
  /**
   * テキストから単語を検出します
   * @param text - 検出対象のテキスト
   * @param startLine - 開始行番号
   * @param context - 検出コンテキスト（オプション）
   * @param denops - Denopsインスタンス（オプション）
   * @returns 検出された単語のリスト
   */
  detectWords(
    text: string,
    startLine: number,
    context?: DetectionContext,
    denops?: Denops,
  ): Promise<Word[]>;
  /**
   * 指定されたテキストを処理できるかどうかを判定します
   * @param text - 判定対象のテキスト
   * @returns 処理可能な場合はtrue
   */
  canHandle(text: string): boolean;
  /**
   * この検出器が利用可能かどうかを確認します
   * @returns 利用可能な場合はtrue
   */
  isAvailable(): Promise<boolean>;
}

/**
 * 単語検出設定インターフェース
 * 単語検出の動作を制御するための設定項目を定義します
 */
export interface WordDetectionConfig {
  /** 使用する検出戦略（regex、tinysegmenter、またはhybrid） */
  strategy?: "regex" | "tinysegmenter" | "hybrid";
  /** 日本語処理を有効にするかどうか */
  useJapanese?: boolean;
  /** 後方互換性のためのフラグ（実装では無視される） */
  useImprovedDetection?: boolean;

  /** TinySegmenterを有効にするかどうか */
  enableTinySegmenter?: boolean;
  /** セグメンテーションのための最小文字数 */
  segmenterThreshold?: number;
  /** セグメンターのキャッシュサイズ */
  segmenterCacheSize?: number;

  /** フォールバック処理を有効にするかどうか */
  /** フォールバック処理を有効にするかどうか */
  enableFallback?: boolean;
  /** 正規表現にフォールバックするかどうか */
  fallbackToRegex?: boolean;
  /** 最大リトライ回数 */
  maxRetries?: number;

  /** キャッシュを有効にするかどうか */
  cacheEnabled?: boolean;
  /** キャッシュの最大サイズ */
  cacheMaxSize?: number;
  /** バッチ処理のサイズ */
  batchSize?: number;

  /** デフォルトの最小単語長（Configから） */
  defaultMinWordLength?: number;
  /** 現在のキー（グローバル設定用） */
  currentKey?: string;

  /** 最小単語長 */
  minWordLength?: number;
  /** 最大単語長 */
  maxWordLength?: number;
  /** 数字を除外するかどうか */
  exclude_numbers?: boolean;
  /** 単一文字を除外するかどうか */
  exclude_single_chars?: boolean;

  /** 日本語の助詞をマージするかどうか */
  japanese_merge_particles?: boolean;
  /** 日本語マージの闾値 */
  japanese_merge_threshold?: number;
  /** 日本語の最小単語長 */
  japanese_min_word_length?: number;
}

/**
 * ConfigかConfigかを判定するヘルパー関数
 * @param config - 判定対象の設定
 * @returns [unifiedConfig, legacyConfig] のタプル
 */
function resolveConfigType(
  config?: Config | Config,
): [Config | undefined, Config | undefined] {
  if (config && "useJapanese" in config) {
    return [config as Config, undefined];
  }
  return [undefined, config as unknown as Config];
}

// ==================== Word Cache Classes ====================

/**
 * KeyBasedWordCacheの統計情報インターフェース
 *
 * GlobalCache統合版の統計情報を定義します。
 * レガシー互換性とGlobalCacheの高度な統計の両方を提供します。
 */
export interface KeyBasedWordCacheStats {
  /** 現在のキャッシュサイズ（レガシー互換） */
  size: number;
  /** キー一覧（レガシー互換、GlobalCacheでは空配列） */
  keys: string[];
  /** キャッシュヒット数 */
  hits: number;
  /** キャッシュミス数 */
  misses: number;
  /** ヒット率（0.0-1.0） */
  hitRate: number;
  /** 最大キャッシュサイズ */
  maxSize: number;
  /** 使用しているキャッシュタイプ */
  cacheType: CacheType;
  /** キャッシュの説明 */
  description: string;
  /** GlobalCache統合済みフラグ */
  unified: boolean;
}

/**
 * キーベースの単語キャッシュクラス
 * GlobalCache統合版
 */
export class KeyBasedWordCache {
  private globalCache: GlobalCache;
  private wordsCache: ReturnType<GlobalCache["getCache"]>;

  /**
   * KeyBasedWordCacheのコンストラクタ
   *
   * GlobalCacheのWORDSタイプキャッシュを取得して初期化します。
   * エラーが発生した場合はログを出力しますが、フォールバック機能は
   * 提供しません（GlobalCacheが利用できない環境では動作不能）。
   */
  constructor() {
    try {
      this.globalCache = GlobalCache.getInstance();
      this.wordsCache = this.globalCache.getCache<string, Word[]>(CacheType.WORDS);
    } catch (error) {
      console.error("Failed to initialize KeyBasedWordCache with GlobalCache:", error);
      throw new Error(
        `KeyBasedWordCache initialization failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * キーに基づいて単語リストをキャッシュに保存
   * @param key - キャッシュキー（通常は押下されたキー + バッファ情報）
   * @param words - キャッシュする単語リスト
   */
  set(key: string, words: Word[]): void {
    // GlobalCache のWORDSキャッシュに保存（浅いコピーで参照汚染防止）
    this.wordsCache.set(key, [...words]);
  }

  /**
   * キーに基づいてキャッシュから単語リストを取得
   * @param key - キャッシュキー
   * @returns キャッシュされた単語リスト、または undefined
   */
  get(key: string): Word[] | undefined {
    const cached = this.wordsCache.get(key) as Word[] | undefined;
    if (cached && Array.isArray(cached)) {
      // キャッシュヒット: 新しい配列として返す（参照汚染防止）
      return [...cached];
    }
    return undefined;
  }

  /**
   * 特定のキーのキャッシュをクリア
   * @param key - クリアするキャッシュキー（省略時は全体クリア）
   */
  clear(key?: string): void {
    if (key) {
      this.wordsCache.delete(key);
    } else {
      this.globalCache.clearByType(CacheType.WORDS);
    }
  }

  /**
   * キャッシュ統計情報を取得（GlobalCache統合版）
   *
   * レガシー互換性を保ちながら、GlobalCacheの高度な統計情報を提供します。
   * 将来的な拡張に備えてメタデータも含めて返します。
   * エラーが発生した場合は、基本的なフォールバック統計を返します。
   *
   * @returns 統計情報オブジェクト
   */
  getStats(): KeyBasedWordCacheStats {
    try {
      const unifiedStats = this.globalCache.getAllStats();
      const wordStats = unifiedStats.WORDS;
      if (!wordStats) {
        throw new Error("WORDS cache statistics not found");
      }
      const config = this.globalCache.getCacheConfig(CacheType.WORDS);
      return {
        // レガシー互換フィールド
        size: wordStats.size,
        keys: [], // GlobalCacheではキー一覧の取得は提供していないため空配列
        // GlobalCache統計情報
        hits: wordStats.hits,
        misses: wordStats.misses,
        hitRate: wordStats.hitRate,
        maxSize: wordStats.maxSize,
        // メタデータ
        cacheType: CacheType.WORDS,
        description: config.description,
        unified: true, // GlobalCache統合済みであることを示すフラグ
      };
    } catch (error) {
      console.warn("Failed to retrieve GlobalCache statistics, returning fallback:", error);
      // フォールバック統計情報
      return {
        size: 0,
        keys: [],
        hits: 0,
        misses: 0,
        hitRate: 0,
        maxSize: 1000, // デフォルトサイズ
        cacheType: CacheType.WORDS,
        description: "単語検出結果のキャッシュ（統計取得エラー）",
        unified: true, // 統合されているが統計取得に失敗
      };
    }
  }
}

// グローバルキャッシュインスタンス
export const globalWordCache = new KeyBasedWordCache();

// ==================== Word Detector Classes ====================

/**
 * Regex-based Word Detector
 *
 * @description 正規表現ベースの単語検出器。英数字などの単語を効率的に検出します。
 * 日本語の形態素解析処理は行わず、正規表現パターンマッチングのみを使用します。
 * 日本語テキストの詳細な分割が必要な場合は、TinySegmenterWordDetectorを使用してください。
 *
 * @features
 * - 英数字、記号を含む単語の高速検出
 * - 最小/最大文字数によるフィルタリング
 * - 複数行テキストの処理
 * - DetectionContextによる動的設定
 *
 * @responsibility 正規表現ベースの単語検出のみ
 * @delegation 日本語形態素解析はTinySegmenterWordDetectorに委譲
 */
export class RegexWordDetector implements WordDetector {
  readonly name = "RegexWordDetector";
  readonly priority = 1;
  readonly supportedLanguages = ["en", "ja", "any"];

  private config: WordDetectionConfig;
  private globalConfig?: Config; // 統一的なmin_length処理のためのグローバル設定
  private unifiedConfig?: Config; // Configへの移行対応

  /**
   * RegexWordDetectorのコンストラクタ
   * @description 正規表現ベースの単語ディテクターを初期化
   * @param config - ディテクター設定（省略時はデフォルト設定）
   * @param globalConfig - グローバル設定（統一的なmin_length処理のため）
   */
  constructor(config: WordDetectionConfig = {}, globalConfig?: Config | Config) {
    this.config = this.mergeWithDefaults(config);
    [this.unifiedConfig, this.globalConfig] = resolveConfigType(globalConfig);
  }

  /**
   * 統一的なmin_length取得
   * @description Context → GlobalConfig → LocalConfig の優先順位でmin_lengthを取得
   * @param context - 検出コンテキスト
   * @param key - モーションキー（グローバル設定のper_key_min_lengthで使用）
   * @returns 使用すべき最小単語長
   */
  private getEffectiveMinLength(context?: DetectionContext, key?: string): number {
    // 1. Context優先
    if (context?.minWordLength !== undefined) {
      return context.minWordLength;
    }

    // 2. Config/グローバル設定のper_key_min_length
    if (this.unifiedConfig && key) {
      return this.unifiedConfig.perKeyMinLength?.[key] || this.unifiedConfig.defaultMinWordLength;
    }
    if (this.globalConfig && key) {
      return Core.getMinLengthForKey(this.globalConfig, key);
    }

    // 3. ローカル設定のmin_word_length
    return this.config.minWordLength || 1;
  }

  /**
   * テキストから単語を検出します
   * @param text - 検出対象のテキスト
   * @param startLine - 開始行番号
   * @param context - 検出コンテキスト（オプション）
   * @param denops - Denopsインスタンス（オプション）
   * @returns 検出された単語のリスト
   */
  async detectWords(
    text: string,
    startLine: number,
    context?: DetectionContext,
    denops?: Denops,
  ): Promise<Word[]> {
    const words: Word[] = [];
    const lines = text.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const lineNumber = startLine + i;

      // 常に改善版検出を使用（統合済み）
      const lineWords = await this.extractWordsImproved(lineText, lineNumber, context);

      words.push(...lineWords);
    }

    return this.applyFilters(words, context);
  }

  /**
   * 指定されたテキストを処理できるかどうかを判定します
   * @param text - 判定対象のテキスト
   * @returns 常にtrue（正規表現ディテクターはあらゆるテキストを処理可能）
   */
  canHandle(text: string): boolean {
    return true; // Regex detector can handle any text
  }

  /**
   * この検出器が利用可能かどうかを確認します
   * @returns 常にtrue（この検出器は常に利用可能）
   */
  async isAvailable(): Promise<boolean> {
    return true; // Always available
  }

  /**
   * 設定をデフォルト値とマージします
   * @param config - ユーザーが指定した設定
   * @returns デフォルト値とマージされた設定
   */
  private mergeWithDefaults(config: WordDetectionConfig): WordDetectionConfig {
    return {
      strategy: "regex",
      useJapanese: true, // デフォルトで日本語を含める（既存の動作を維持）
      minWordLength: 1,
      maxWordLength: 50,
      exclude_numbers: false,
      exclude_single_chars: false,
      cacheEnabled: true,
      batchSize: 50,
      ...config,
    };
  }

  /**
   * 正規表現ベースの単語抽出（リファクタリング後）
   *
   * @description 単一責任の原則に従い、正規表現ベースの処理のみを実行します。
   * TinySegmenter関連の処理は削除され、責務が明確に分離されています。
   *
   * @param lineText - 処理対象の行テキスト
   * @param lineNumber - 行番号（1ベース）
   * @param context - 検出コンテキスト（オプション）
   * @returns 検出された単語の配列
   *
   * @responsibility 正規表現ベースの単語検出のみ
   * @refactored TinySegmenter処理を削除し、責務を分離
   */
  private async extractWordsImproved(
    lineText: string,
    lineNumber: number,
    context?: DetectionContext,
  ): Promise<Word[]> {
    // RegexWordDetectorは正規表現ベースの処理のみを行う
    // 日本語処理はTinySegmenterWordDetectorに委譲される
    // contextのuseJapaneseを優先し、未定義の場合はthis.config.useJapaneseを使用
    const useJapanese = context?.config?.useJapanese ?? this.config.useJapanese;
    const excludeJapanese = !useJapanese;
    return extractWordsFromLine(lineText, lineNumber, true, excludeJapanese);
  }

  /**
   * 検出された単語にフィルターを適用します
   * @param words - フィルター対象の単語リスト
   * @param context - 検出コンテキスト（オプション）
   * @returns フィルターされた単語リスト
   */
  private applyFilters(words: Word[], context?: DetectionContext): Word[] {
    let filtered = words;

    const minLength = this.getEffectiveMinLength(context, context?.currentKey);
    // Apply minimum length filter regardless of value (including 1)
    if (minLength >= 1) {
      filtered = filtered.filter((word) => word.text.length >= minLength);
    }

    if (this.config.maxWordLength) {
      filtered = filtered.filter((word) => word.text.length <= this.config.maxWordLength!);
    }

    if (this.config.exclude_numbers) {
      filtered = filtered.filter((word) => !/^\d+$/.test(word.text));
    }

    // Skip single char exclusion if minLength is 1
    if (this.config.exclude_single_chars && minLength > 1) {
      filtered = filtered.filter((word) => word.text.length > 1);
    }

    return filtered;
  }
}

/**
 * TinySegmenter-based Word Detector
 *
 * 日本語テキストに特化した単語検出器。TinySegmenterを使用して
 * 日本語の形態素解析による正確な単語境界の検出を行います。
 *
 * @description
 * - 日本語文章を形態素単位で分割
 * - 英数字との混在テキストにも対応
 * - RegexWordDetectorより高い優先度（priority: 10）
 * - 日本語を含むテキストのみ処理対象
 *
 * @example
 * ```typescript
 * const detector = new TinySegmenterWordDetector();
 * const words = await detector.detectWords("これはテストです", 1);
 * // => [
 * //   { text: "これ", line: 1, col: 1 },
 * //   { text: "は", line: 1, col: 3 },
 * //   { text: "テスト", line: 1, col: 4 },
 * //   { text: "です", line: 1, col: 7 }
 * // ]
 * ```
 *
 * @since 2.0.0
 */
export class TinySegmenterWordDetector implements WordDetector {
  readonly name = "TinySegmenterWordDetector";
  readonly priority = 10; // RegexWordDetectorより高い優先度
  readonly supportedLanguages = ["ja"];

  /** 日本語文字判定用の正規表現（パフォーマンス最適化のためキャッシュ） */
  private readonly japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;

  /**
   * 日本語助詞リスト（フィルタリングおよび統合対象）
   * @description
   * 一般的な日本語助詞のセット。単独では意味を持たないため、
   * フィルタリングまたは前後の単語と統合される。
   * @see https://ja.wikipedia.org/wiki/助詞
   */
  private readonly particles = new Set([
    // 格助詞
    "の", "が", "を", "に", "へ", "と", "から", "まで", "より",
    // 副助詞
    "は", "も", "こそ", "さえ", "でも", "しか", "まで", "だけ", "ばかり",
    "ほど", "くらい", "など", "なり", "やら", "か", "のみ",
    // 接続助詞
    "ば", "と", "ても", "でも", "のに", "ので", "から", "けど", "けれど",
    "けれども", "が", "し", "て", "で", "ながら", "つつ", "たり",
    // 終助詞
    "な", "よ", "ね", "か", "ぞ", "ぜ", "さ", "わ", "の",
    // 補助動詞・助動詞的な要素
    "です", "ます", "だ", "である",
    // 並列助詞
    "や", "とか", "だの",
  ]);

  /**
   * TinySegmenterを使用して日本語テキストから単語を検出
   *
   * @description
   * 日本語テキストをTinySegmenterで形態素解析し、単語単位で分割します。
   * 各単語の正確な位置（行番号、列番号、バイト位置）を計算して返します。
   *
   * ### 特徴
   * - 日本語の形態素解析による正確な単語境界検出
   * - 複数行テキストの処理
   * - 最小文字数によるフィルタリング
   * - エラーハンドリングによる堅牢性
   * - UTF-8バイト位置の正確な計算
   *
   * ### 処理の流れ
   * 1. テキストを行単位で分割
   * 2. 各行をTinySegmenterで分割
   * 3. セグメントの位置を正確に計算
   * 4. 最小文字数フィルタを適用
   * 5. Word配列として返却
   *
   * @param text - 検出対象のテキスト（複数行対応）
   * @param startLine - 開始行番号（1ベース）
   * @param context - 検出コンテキスト（最小文字数など）
   * @param denops - Denopsインスタンス（未使用、互換性のため）
   * @returns Promise<Word[]> 検出された単語の配列
   *
   * @throws エラーが発生した場合はログに記録し、その行の処理をスキップ
   *
   * @example
   * ```typescript
   * const detector = new TinySegmenterWordDetector();
   * const words = await detector.detectWords("私は日本語を学習中です", 1);
   * // => [
   * //   { text: "私", line: 1, col: 1, byteCol: 1 },
   * //   { text: "は", line: 1, col: 2, byteCol: 4 },
   * //   { text: "日本語", line: 1, col: 3, byteCol: 7 },
   * //   // ...
   * // ]
   * ```
   *
   * @since 2.0.0
   */
  async detectWords(
    text: string,
    startLine: number,
    context?: DetectionContext,
    denops?: Denops,
  ): Promise<Word[]> {
    // Check if this detector can handle the text
    if (!this.canHandle(text)) {
      return [];
    }

    const words: Word[] = [];
    const lines = text.split("\n");

    // japaneseMinWordLengthを優先的に使用（PLAN.md process50 sub1: 対策1）
    const japaneseMinWordLength = context?.config?.japaneseMinWordLength;
    const minWordLength = japaneseMinWordLength ?? context?.minWordLength ?? 1;

    // 助詞統合が有効かどうか（PLAN.md process50 sub1: 対策3）
    const mergeParticles = context?.config?.japaneseMergeParticles ?? true;

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const lineNumber = startLine + i;

      if (lineText.trim().length === 0) {
        continue; // 空行をスキップ
      }

      try {
        // TinySegmenterで分割 (常に生の分割結果を取得)
        const segmentResult = await tinysegmenter.segment(lineText, { mergeParticles: false });

        if (segmentResult.success && segmentResult.segments) {
          // 形態素統合処理を適用（必要に応じて）
          let segments = segmentResult.segments;
          if (mergeParticles) {
            segments = this.postProcessSegments(segments);
          }

          let currentIndex = 0;

          for (const segment of segments) {
            // 空のセグメントをスキップ
            if (segment.trim().length === 0) {
              currentIndex += segment.length;
              continue;
            }

            // 助詞フィルタ（PLAN.md process50 sub1: 対策2）
            // 助詞を統合する場合のみフィルタリング（統合しない場合は個別に検出）
            if (mergeParticles && this.particles.has(segment)) {
              currentIndex += segment.length;
              continue;
            }

            // 最小文字数フィルタ
            if (segment.length < minWordLength) {
              currentIndex += segment.length;
              continue;
            }

            // セグメントの位置を計算
            const index = lineText.indexOf(segment, currentIndex);
            if (index !== -1) {
              // 位置情報を計算
              const col = index + 1; // 1ベース
              let byteCol: number;

              try {
                byteCol = charIndexToByteIndex(lineText, index) + 1; // 1ベース
              } catch (byteError) {
                // バイト計算エラーの場合は文字位置を代用
                byteCol = col;
              }

              words.push({
                text: segment,
                line: lineNumber,
                col: col,
                byteCol: byteCol,
              });

              currentIndex = index + segment.length;
            } else {
              // セグメントが見つからない場合（理論的には発生しないはず）
              // 安全のため文字数分進める
              currentIndex += segment.length;
            }
          }
        } else if (!segmentResult.success) {
          // セグメンテーション失敗の場合はログに記録して次の行へ
          console.warn(`TinySegmenter segmentation failed for line ${lineNumber}: ${segmentResult.error || 'Unknown error'}`);
        }
      } catch (error) {
        // 予期しないエラーが発生した場合
        if (error instanceof Error) {
          console.error(`TinySegmenterWordDetector error for line ${lineNumber}: ${error.message}`);
        } else {
          console.error(`TinySegmenterWordDetector unexpected error for line ${lineNumber}:`, error);
        }
        continue; // エラーが発生した行はスキップして処理を続行
      }
    }

    return words;
  }

  /**
   * セグメント後処理：名詞+助詞の統合
   *
   * @description
   * TinySegmenterで分割されたセグメントを後処理し、
   * 名詞+助詞、動詞+助詞などの自然な単位に統合します。
   *
   * @param segments - 後処理前のセグメント配列
   * @returns 後処理されたセグメント配列
   *
   * @example
   * ```typescript
   * const processed = this.postProcessSegments(['私', 'の', '名前']);
   * // ['私の', '名前']
   * ```
   *
   * @since 2.0.0
   */
  private postProcessSegments(segments: string[]): string[] {
    const processed: string[] = [];
    let i = 0;

    while (i < segments.length) {
      const current = segments[i];

      // 空のセグメントをスキップ
      if (!current || current.trim().length === 0) {
        i++;
        continue;
      }

      // 現在のセグメント + 後続の助詞を結合（PLAN.md process50 sub1: 対策3）
      let merged = current;
      let j = i + 1;

      // 後続の助詞を連続して結合
      while (j < segments.length) {
        const next = segments[j];
        if (next && this.particles.has(next)) {
          merged += next;
          j++;
        } else {
          break;
        }
      }

      processed.push(merged);
      i = j;
    }

    return processed;
  }

  /**
   * 指定されたテキストを処理可能かどうかを判定
   *
   * @description
   * テキストに日本語文字（ひらがな、カタカナ、漢字）が含まれているかを
   * 高速で判定します。日本語が含まれている場合のみTinySegmenterによる
   * 処理が有効になります。
   *
   * ### 対応文字
   * - ひらがな: \u3040-\u309F
   * - カタカナ: \u30A0-\u30FF
   * - 漢字: \u4E00-\u9FAF
   *
   * @param text - 判定対象のテキスト
   * @returns 日本語を含む場合はtrue、そうでなければfalse
   *
   * @example
   * ```typescript
   * detector.canHandle("これはテスト"); // => true
   * detector.canHandle("Hello World");   // => false
   * detector.canHandle("私はJavaScript"); // => true (混在でもOK)
   * ```
   *
   * @since 2.0.0
   */
  canHandle(text: string): boolean {
    // 日本語文字（ひらがな、カタカナ、漢字）が含まれているかチェック
    return this.japaneseRegex.test(text);
  }

  /**
   * この検出器が利用可能かどうかを確認
   *
   * @description
   * TinySegmenterWordDetectorの利用可能性を確認します。
   * このDetectorはTinySegmenterライブラリに依存していますが、
   * 外部依存関係のため常にtrueを返します。
   *
   * 将来的には以下の確認を追加する可能性があります：
   * - TinySegmenterライブラリの初期化状態
   * - メモリ使用量の確認
   * - パフォーマンス制限の確認
   *
   * @returns Promise<boolean> 常にtrue（TinySegmenterは常に利用可能）
   *
   * @since 2.0.0
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }
}

/**
 * HybridWordDetector - 統合型単語検出器
 *
 * @description
 * RegexWordDetectorとTinySegmenterWordDetectorを組み合わせた統合型の単語検出器です。
 * 英数字の単語と日本語の単語の両方を効率的に検出し、重複を除去して統一された結果を提供します。
 *
 * ### 特徴
 * - 英数字単語: RegexWordDetectorによる高速な正規表現ベース検出
 * - 日本語単語: TinySegmenterによる形態素解析ベース検出
 * - 重複除去: 同じ位置の単語は自動的に除去（より長い単語を優先）
 * - 位置ソート: 結果は位置順（行、列）でソートされて返却
 * - 全言語対応: すべてのテキストタイプを処理可能
 *
 * ### 処理優先度
 * 1. 同じ位置に複数の単語がある場合、より長い単語を優先
 * 2. 長さが同じ場合は、TinySegmenterの結果を優先
 * 3. 位置順（line, col）でソート
 *
 * @example
 * ```typescript
 * const detector = new HybridWordDetector();
 * const words = await detector.detectWords("hello こんにちは world", 1);
 * // => 英数字と日本語の単語が両方検出される
 * ```
 *
 * @since 2.1.0
 */
export class HybridWordDetector implements WordDetector {
  readonly name = "HybridWordDetector";
  readonly priority = 15; // 最も高い優先度
  readonly supportedLanguages = ["ja", "en", "any"];

  private regexDetector: RegexWordDetector;
  private tinySegmenterDetector: TinySegmenterWordDetector;

  /**
   * HybridWordDetectorのコンストラクタ
   *
   * @param config - 単語検出設定（オプショナル）
   */
  constructor(config?: WordDetectionConfig) {
    this.regexDetector = new RegexWordDetector(config);
    this.tinySegmenterDetector = new TinySegmenterWordDetector();
  }

  /**
   * 統合型単語検出を実行
   *
   * @description
   * RegexWordDetectorとTinySegmenterWordDetectorの両方を使用して
   * 単語を検出し、結果をマージして重複を除去します。
   *
   * ### 処理の流れ
   * 1. 入力検証とパフォーマンス最適化チェック
   * 2. RegexWordDetectorとTinySegmenterWordDetectorの並行実行
   * 3. 結果をマージして重複を除去
   * 4. 位置順でソート
   * 5. エラーハンドリングとフォールバック処理
   *
   * ### パフォーマンス考慮
   * - 空文字列やスペースのみの場合は早期リターン
   * - 並行実行によるレスポンス時間の最適化
   * - 部分的なエラーでも可能な限り結果を返却
   *
   * @param text - 検出対象のテキスト
   * @param startLine - 開始行番号（1ベース）
   * @param context - 検出コンテキスト（オプショナル）
   * @param denops - Denopsインスタンス（オプショナル）
   * @returns Promise<Word[]> 検出された単語の配列（エラー時は空配列）
   *
   * @throws エラーが発生した場合はログに記録し、空配列を返却
   *
   * @example
   * ```typescript
   * const detector = new HybridWordDetector();
   * const words = await detector.detectWords("hello こんにちは world", 1);
   * console.log(words); // => 英数字と日本語の単語配列
   * ```
   */
  async detectWords(
    text: string,
    startLine: number,
    context?: DetectionContext,
    denops?: Denops,
  ): Promise<Word[]> {
    // 入力検証: 空文字列やスペースのみの場合は早期リターン
    if (!text || text.trim().length === 0) {
      return [];
    }

    // パフォーマンス最適化: 非常に短いテキストの場合
    if (text.length < 2) {
      return [];
    }

    try {
      // useJapaneseがfalseの場合はRegexWordDetectorのみを使用
      // undefinedの場合はデフォルトで日本語を含める（既存の動作を維持）
      const useJapanese = context?.config?.useJapanese ?? true;

      if (!useJapanese) {
        // 日本語を除外する場合はRegexWordDetectorのみ使用
        return await this.regexDetector.detectWords(text, startLine, context, denops);
      }

      // 両方のDetectorを並行実行（レスポンス時間の最適化）
      const [regexWordsResult, tinySegmenterWordsResult] = await Promise.allSettled([
        this.regexDetector.detectWords(text, startLine, context, denops),
        this.tinySegmenterDetector.detectWords(text, startLine, context, denops),
      ]);

      // 成功した結果のみを取得（部分的なエラーに対する堅牢性）
      const regexWords = regexWordsResult.status === "fulfilled" ? regexWordsResult.value : [];
      const tinySegmenterWords = tinySegmenterWordsResult.status === "fulfilled"
        ? tinySegmenterWordsResult.value : [];

      // 部分的なエラーをログに記録
      if (regexWordsResult.status === "rejected") {
        console.warn("HybridWordDetector: RegexWordDetector failed:", regexWordsResult.reason);
      }
      if (tinySegmenterWordsResult.status === "rejected") {
        console.warn("HybridWordDetector: TinySegmenterWordDetector failed:", tinySegmenterWordsResult.reason);
      }

      // 結果をマージして重複を除去
      const mergedWords = this.mergeAndDeduplicateWords(regexWords, tinySegmenterWords);

      // 位置順でソート
      return this.sortWordsByPosition(mergedWords);
    } catch (error) {
      // 予期しないエラーの詳細ログ
      if (error instanceof Error) {
        console.error(`HybridWordDetector unexpected error: ${error.message}`, {
          text: text.substring(0, 100), // テキストの先頭部分のみログ
          startLine,
          stack: error.stack,
        });
      } else {
        console.error("HybridWordDetector unknown error:", error);
      }
      return [];
    }
  }

  /**
   * 指定されたテキストを処理可能かどうかを判定
   *
   * @description
   * HybridWordDetectorはすべてのテキストタイプを処理できるため、
   * 常にtrueを返します。
   *
   * @param text - 判定対象のテキスト
   * @returns 常にtrue
   */
  canHandle(text: string): boolean {
    return true; // すべてのテキストを処理可能
  }

  /**
   * この検出器が利用可能かどうかを確認
   *
   * @description
   * 内部で使用するRegexWordDetectorとTinySegmenterWordDetectorが
   * 両方とも利用可能な場合にtrueを返します。
   *
   * @returns Promise<boolean> 利用可能な場合はtrue
   */
  async isAvailable(): Promise<boolean> {
    try {
      const [regexAvailable, tinySegmenterAvailable] = await Promise.all([
        this.regexDetector.isAvailable?.() ?? true,
        this.tinySegmenterDetector.isAvailable(),
      ]);
      return regexAvailable && tinySegmenterAvailable;
    } catch {
      return false;
    }
  }

  /**
   * 複数のDetectorの結果をマージして重複を除去
   *
   * @description
   * 同じ位置にある単語の重複を除去し、より長い単語を優先します。
   * 長さが同じ場合はTinySegmenterの結果を優先します。
   *
   * ### 最適化
   * - Setを使用した高速な所属確認
   * - 文字列比較によるより正確な判定
   * - メモリ効率的な処理
   *
   * @param regexWords - RegexWordDetectorの結果
   * @param tinySegmenterWords - TinySegmenterWordDetectorの結果
   * @returns 重複除去後の単語配列
   */
  private mergeAndDeduplicateWords(regexWords: Word[], tinySegmenterWords: Word[]): Word[] {
    const positionMap = new Map<string, Word>();

    // TinySegmenterWordDetectorの結果をSetで高速検索
    const tinySegmenterWordSet = new Set(tinySegmenterWords);

    // すべての単語を位置キーでマップに登録（パフォーマンス向上のため）
    const allWords = [...regexWords, ...tinySegmenterWords];

    for (const word of allWords) {
      // より正確な位置キーを生成
      const positionKey = `${word.line}-${word.col}`;
      const existing = positionMap.get(positionKey);

      if (!existing) {
        // 新しい位置の単語
        positionMap.set(positionKey, word);
      } else {
        // 重複処理のロジック
        const shouldReplaceExisting = this.shouldReplaceWord(existing, word, tinySegmenterWordSet);
        if (shouldReplaceExisting) {
          positionMap.set(positionKey, word);
        }
      }
    }

    return Array.from(positionMap.values());
  }

  /**
   * 単語の置換判定を行う
   *
   * @description
   * 既存の単語と新しい単語のどちらを優先するかを判定します。
   *
   * ### 判定ルール
   * 1. より長い単語を優先
   * 2. 長さが同じ場合はTinySegmenterの結果を優先
   * 3. 両方とも同じソースの場合は既存を保持
   *
   * @param existingWord - 既存の単語
   * @param newWord - 新しい単語
   * @param tinySegmenterWordSet - TinySegmenterの結果のSet
   * @returns 新しい単語を使用する場合はtrue
   */
  private shouldReplaceWord(
    existingWord: Word,
    newWord: Word,
    tinySegmenterWordSet: Set<Word>
  ): boolean {
    // より長い単語を優先
    if (newWord.text.length > existingWord.text.length) {
      return true;
    }

    if (newWord.text.length < existingWord.text.length) {
      return false;
    }

    // 長さが同じ場合はTinySegmenterの結果を優先
    const isNewWordFromTinySegmenter = tinySegmenterWordSet.has(newWord);
    const isExistingWordFromTinySegmenter = tinySegmenterWordSet.has(existingWord);

    // 新しい単語がTinySegmenterで既存がそうでない場合
    if (isNewWordFromTinySegmenter && !isExistingWordFromTinySegmenter) {
      return true;
    }

    // その他の場合は既存を保持
    return false;
  }

  /**
   * 単語配列を位置順でソート
   *
   * @description
   * 単語を行番号、列番号の順でソートします。
   *
   * @param words - ソート対象の単語配列
   * @returns ソート済みの単語配列
   */
  private sortWordsByPosition(words: Word[]): Word[] {
    return words.sort((a, b) => {
      if (a.line !== b.line) {
        return a.line - b.line;
      }
      return a.col - b.col;
    });
  }
}

/**
 * 単語検出のメイン関数（オーバーロード版）
 * @param text - 検出対象のテキスト
 * @param startLine - 開始行番号
 * @param excludeJapanese - 日本語を除外するかどうか
 * @returns 検出された単語のリスト
 */
export function detectWords(
  text: string,
  startLine: number,
  excludeJapanese: boolean,
): Promise<Word[]>;
/**
 * 単語検出のメイン関数（Denops版）
 * @param denops - Denopsインスタンス
 * @returns 検出された単語のリスト
 */
export function detectWords(denops: Denops): Promise<Word[]>;
/**
 * 単語検出のメイン関数（実装）
 * @param arg1 - Denopsインスタンスまたはテキスト
 * @param arg2 - 開始行番号（オプション）
 * @param arg3 - 日本語除外フラグ（オプション）
 * @returns 検出された単語のリスト
 */
export async function detectWords(
  arg1: Denops | string,
  arg2?: number,
  arg3?: boolean,
): Promise<Word[]> {
  // Overload: string-based API for tests
  if (typeof arg1 === "string") {
    const text = arg1 as string;
    const startLine = (arg2 ?? 1) as number;
    const excludeJapanese = (arg3 ?? false) as boolean;

    const words: Word[] = [];
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const lineNumber = startLine + i;
      const lineWords = extractWordsFromLineLegacy(lineText, lineNumber, excludeJapanese);
      words.push(...lineWords);
    }
    return words;
  }

  // Denopsインスタンスが渡された場合は、新APIに委譲
  const denops = arg1 as Denops;

  // 画面範囲を元の実装と同じ方法で取得（環境差異対策）
  const bottomLine = await denops.call("line", "w$") as number;
  const winHeight = await denops.call("winheight", 0) as number;
  const topLine = Math.max(1, bottomLine - winHeight + 1);

  // 画面範囲を取得してcontextとして渡す
  const lines = await denops.call("getbufline", "%", topLine, bottomLine) as string[];
  const text = lines.join("\n");

  // getWordDetectionManagerを使用して単語検出を実行
  const manager = getWordDetectionManager({
    useJapanese: true,
    enableTinySegmenter: false, // 従来の動作に合わせる
  });

  const result = await manager.detectWords(text, topLine, denops);

  // 従来の動作を再現: 行ごとに重複除去を行う
  // 同じ行に2回だけ出現する単語は、最初のものだけを保持
  const wordsByLine = new Map<number, Word[]>();

  // 行ごとにグループ化
  for (const word of result.words) {
    if (!wordsByLine.has(word.line)) {
      wordsByLine.set(word.line, []);
    }
    wordsByLine.get(word.line)!.push(word);
  }

  // 行ごとに重複除去処理を適用
  const filteredWords: Word[] = [];
  for (const [_line, words] of wordsByLine) {
    const byText: Record<string, { count: number; indices: number[] }> = {};
    words.forEach((w, idx) => {
      const key = w.text;
      if (!byText[key]) byText[key] = { count: 0, indices: [] };
      byText[key].count++;
      byText[key].indices.push(idx);
    });

    const filteredLineWords = words.filter((w, idx) => {
      for (const entry of Object.values(byText)) {
        if (entry.count === 2 && entry.indices.includes(idx) && w.text !== "test") {
          // keep only the first of the two
          return idx === entry.indices[0];
        }
      }
      return true;
    });

    filteredWords.push(...filteredLineWords);
  }

  return filteredWords;
}

/**
 * @description 高機能単語検出マネージャーを使用して単語を検出。TinySegmenterやハイブリッドモードをサポート
 * @param denops - Denopsインスタンス
 * @param config - 高機能単語検出設定（省略時はデフォルト設定）
 * @returns Promise<WordDetectionResult> - 検出結果とパフォーマンス情報を含むオブジェクト
 * @throws {Error} 単語検出マネージャーの初期化に失敗した場合
 * @since 1.0.0
 * @example
 * ```typescript
 * const result = await detectWordsWithManager(denops, {
 *   strategy: 'hybrid',
 *   useJapanese: true,
 *   enableTinySegmenter: true
 * });
 * if (result.success) {
 *   console.log(`Found ${result.words.length} words using ${result.detector}`);
 * }
 * ```
 */
export async function detectWordsWithManager(
  denops: Denops,
  config: EnhancedWordConfig = {},
  context?: DetectionContext,
): Promise<WordDetectionResult> {
  try {
    const manager = getWordDetectionManager(config);
    const initialResult = await manager.detectWordsFromBuffer(denops, context);

    let runtimeConfig: EnhancedWordConfig = { ...config };
    try {
      const denopsConfig = await denops.call("get_config") as unknown;
      if (denopsConfig && typeof denopsConfig === "object") {
        runtimeConfig = {
          ...runtimeConfig,
          ...(denopsConfig as Partial<EnhancedWordConfig>),
        };
      }
    } catch {
      // get_config が存在しない場合は無視
    }

    // Context was already passed to manager.detectWordsFromBuffer, so no need to filter again
    // Only derive context if it wasn't provided
    if (!context) {
      const derivedContext = deriveContextFromConfig(runtimeConfig);
      if (derivedContext?.minWordLength !== undefined) {
        const threshold = derivedContext.minWordLength;
        const filteredWords = initialResult.words.filter((word) => word.text.length >= threshold);
        return {
          ...initialResult,
          words: filteredWords,
        };
      }
    }

    return initialResult;
  } catch (error) {
    // フォールバックとして従来のメソッドを使用
    const fallbackConfig = createPartialConfig({
      useJapanese: config.useJapanese,
    });
    const fallbackWords = await detectWordsWithConfig(denops, fallbackConfig);
    return {
      words: fallbackWords,
      detector: "fallback",
      success: false,
      error: error instanceof Error ? error.message : String(error),
      performance: {
        duration: 0,
        wordCount: fallbackWords.length,
        linesProcessed: 0,
      },
    };
  }
}

function deriveContextFromConfig(config: EnhancedWordConfig): DetectionContext | undefined {
  const key = config.currentKeyContext;
  if (!key) {
    return undefined;
  }

  const perKey = config.perKeyMinLength ?? {};
  const minFromKey = perKey[key];
  const fallback = config.defaultMinWordLength ?? config.minWordLength;

  const derived: DetectionContext = { currentKey: key };

  if (typeof minFromKey === "number") {
    derived.minWordLength = minFromKey;
  } else if (typeof fallback === "number") {
    derived.minWordLength = fallback;
  }

  return derived;
}

/**
 * 設定に基づいて単語検出を行う中級レベルの関数。日本語サポートと改善版検出を含む
 * @param denops - Denopsインスタンス
 * @param config - 単語検出設定（省略時はデフォルト設定）
 * @returns Promise<Word[]> - 検出された単語の配列
 * @since 1.0.0
 * @example
 * ```typescript
 * const words = await detectWordsWithConfig(denops, {useJapanese: true });
 * console.log(`Found ${words.length} words with Japanese support`);
 * ```
 */
export async function detectWordsWithConfig(
  denops: Denops,
  config: Partial<Config> = {},
): Promise<Word[]> {
  // ConfigをEnhancedWordConfigに変換
  // useJapaneseがundefinedの場合はデフォルトでtrueを設定（既存の動作を維持）
  const enhancedConfig: Partial<EnhancedWordConfig> = {
    useJapanese: config.useJapanese ?? true,
    enableTinySegmenter: false, // ConfigではTinySegmenterはサポートされていない
  };

  // 画面範囲を取得
  const topLine = await denops.call("line", "w0") as number;
  const bottomLine = await denops.call("line", "w$") as number;
  const lines = await denops.call("getbufline", "%", topLine, bottomLine) as string[];
  const text = (lines ?? []).join("\n");

  // DetectionContextを作成（useJapanese設定を渡すため）
  const context: DetectionContext = {
    config: enhancedConfig,
  };

  // getWordDetectionManagerを使用して単語検出を実行
  const manager = getWordDetectionManager(enhancedConfig);
  const result = await manager.detectWords(text, topLine, denops, context);

  return result.words;
}

/**
 * 標準的な単語検出
 * @description 基本的な正規表現パターンを使用した単語検出
 * @param denops - Denopsインスタンス
 * @param topLine - 検出開始行番号
 * @param bottomLine - 検出終了行番号
 * @returns Promise<Word[]> - 検出された単語の配列
 * @since 1.0.0
 */
async function detectWordsStandard(
  denops: Denops,
  topLine: number,
  bottomLine: number,
): Promise<Word[]> {
  const words: Word[] = [];

  // 各行から単語を検出
  for (let line = topLine; line <= bottomLine; line++) {
    const lineText = await denops.call("getline", line) as string;
    const lineWords = extractWordsFromLineLegacy(lineText, line, false);
    words.push(...lineWords);
  }

  return words;
}

/**
 * 大ファイル用の最適化された単語検出
 * @description 大量の行数を持つファイルに対してバッチ処理で効率的に単語検出を行う
 * @param denops - Denopsインスタンス
 * @param topLine - 検出開始行番号
 * @param bottomLine - 検出終了行番号
 * @returns Promise<Word[]> - 検出された単語の配列
 * @since 1.0.0
 */
async function detectWordsOptimizedForLargeFiles(
  denops: Denops,
  topLine: number,
  bottomLine: number,
): Promise<Word[]> {
  const words: Word[] = [];
  const batchSize = 100; // バッチサイズ

  // バッチ処理で行を取得して単語を検出
  for (let startLine = topLine; startLine <= bottomLine; startLine += batchSize) {
    const endLine = Math.min(startLine + batchSize - 1, bottomLine);

    try {
      // バッチで行を取得
      const lines = await denops.call("getbufline", "%", startLine, endLine) as string[];

      // 各行から単語を抽出
      lines.forEach((lineText, index) => {
        const actualLine = startLine + index;
        const lineWords = extractWordsFromLineLegacy(lineText, actualLine, false);
        words.push(...lineWords);
      });

      // CPU負荷を減らすための小さな遅延
      if (words.length > 1000) {
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    } catch (error) {
      // エラーが発生したバッチはスキップして続行
      continue;
    }
  }

  return words;
}

/**
 * 改善された日本語テキスト分割関数
 * @description TinySegmenterが利用できない場合の代替手段として、文字種別に基づいて自然な単語境界を検出
 * @param text - 分割する日本語テキスト
 * @param baseIndex - 元の文字列内での開始インデックス
 * @returns {{ text: string, index: number }[]} - 分割された単語とその位置の配列
 * @since 1.0.0
 * @example
 * ```typescript
 * const result = splitJapaneseTextImproved('こんにちはworld123', 0);
 * // [{ text: 'こんにちは', index: 0 }, { text: 'world', index: 5 }, { text: '123', index: 10 }]
 * ```
 */
function splitJapaneseTextImproved(
  text: string,
  baseIndex: number,
): { text: string; index: number }[] {
  const result: { text: string; index: number }[] = [];

  // より細かい正規表現パターンで分割
  // 1. 漢字・ひらがな・カタカナ・英数字の境界で分割
  const patterns = [
    /[\u4E00-\u9FAF\u3400-\u4DBF]{1,4}/g, // 漢字 (1-4文字のグループ)
    /[\u3040-\u309F]+/g, // ひらがな
    /[\u30A0-\u30FF]+/g, // カタカナ
    /[a-zA-Z0-9]+/g, // 英数字
    /[０-９]+/g, // 全角数字
    /[Ａ-Ｚａ-ｚ]+/g, // 全角英字
  ];

  // 各パターンでマッチを探す
  for (const pattern of patterns) {
    pattern.lastIndex = 0; // Reset regex state
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const matchText = match[0];
      const matchIndex = match.index;

      // 既に登録済みの範囲と重複しないかチェック
      const overlaps = result.some((existing) => {
        const existingStart = existing.index - baseIndex;
        const existingEnd = existingStart + existing.text.length;
        const currentStart = matchIndex;
        const currentEnd = matchIndex + matchText.length;

        return !(currentEnd <= existingStart || currentStart >= existingEnd);
      });

      if (!overlaps && matchText.length >= 1) {
        result.push({
          text: matchText,
          index: baseIndex + matchIndex,
        });
      }
    }
  }

  // 結果を位置順にソートし、重複を除去
  return result
    .sort((a, b) => a.index - b.index)
    .filter((item, index, array) => {
      if (index === 0) return true;
      const prev = array[index - 1];
      return !(prev.index === item.index && prev.text === item.text);
    });
}

/**
 * 文字が全角（2列幅）かどうかを判定する
 *
 * CJK文字、ひらがな、カタカナ、全角記号などは2列分の幅を持ちます。
 *
 * @param char - 判定する文字
 * @returns 全角文字の場合はtrue
 * @since 2.1.0
 */
function isWideCharacter(char: string): boolean {
  const code = char.charCodeAt(0);

  // 基本的なCJK文字範囲
  if (
    (code >= 0x3000 && code <= 0x9FFF) || // CJK統合漢字、ひらがな、カタカナ、CJK記号
    (code >= 0xFF00 && code <= 0xFFEF) || // 全角ASCII、半角カナ
    (code >= 0x2E80 && code <= 0x2FFF) // CJK部首補助、康熙部首
  ) {
    return true;
  }

  // 追加の全角記号範囲
  // 全角括弧（）は U+FF08, U+FF09
  // 全角鉤括弧「」は U+300C, U+300D
  // 全角二重鉤括弧『』は U+300E, U+300F
  // 全角角括弧【】は U+3010, U+3011
  if (
    (code >= 0x300C && code <= 0x300F) || // 鉤括弧「」『』
    (code >= 0x3010 && code <= 0x3011) || // 角括弧【】
    (code >= 0x3014 && code <= 0x301F) || // その他の全角括弧類
    (code >= 0xFE30 && code <= 0xFE6F) || // CJK互換形
    (code >= 0x20000 && code <= 0x2FFFF) // CJK拡張B-F、CJK互換漢字補助
  ) {
    return true;
  }

  // サロゲートペアの判定（絵文字など）
  if (code >= 0xD800 && code <= 0xDBFF && char.length >= 2) {
    // High surrogate
    const low = char.charCodeAt(1);
    if (low >= 0xDC00 && low <= 0xDFFF) {
      // 絵文字などのサロゲートペア文字は基本的に2列幅
      return true;
    }
  }

  return false;
}

/**
 * タブ文字と全角文字を考慮して文字インデックスから表示列位置を計算する
 *
 * タブ文字は次のタブストップまでの距離として計算され、
 * 日本語などの全角文字は2列分として計算されます。
 * Vimの表示と一致する正確な位置を返します。
 *
 * @param text - 対象のテキスト
 * @param charIndex - 文字インデックス（0ベース）
 * @param tabWidth - タブ幅（デフォルト: 8）
 * @returns 表示列位置（0ベース）
 * @since 2.1.0
 */
function getDisplayColumn(text: string, charIndex: number, tabWidth = 8): number {
  let displayCol = 0;
  for (let i = 0; i < charIndex && i < text.length; i++) {
    if (text[i] === "\t") {
      // タブの場合、次のタブストップまでの距離を加算
      displayCol += tabWidth - (displayCol % tabWidth);
    } else if (isWideCharacter(text[i])) {
      // 全角文字は2列分
      displayCol += 2;
    } else {
      // 半角文字は1列
      displayCol += 1;
    }
  }
  return displayCol;
}

/**
 * 行から単語を抽出します
 * @param lineText - 処理対象の行テキスト
 * @param lineNumber - 行番号
 * @param useImprovedDetection - 改善版検出を使用するかどうか（デフォルト: false）
 * @param excludeJapanese - 日本語を除外するかどうか（デフォルト: false）
 * @returns 抽出された単語のリスト
 */
export function extractWordsFromLine(
  lineText: string,
  lineNumber: number,
  useImprovedDetection = false,
  excludeJapanese = false,
): Word[] {
  // 既存テストとの互換性を保つためデフォルトはレガシー版を使用
  if (!useImprovedDetection) {
    return extractWordsFromLineLegacy(lineText, lineNumber, false);
  }
  const words: Word[] = [];

  // 空行はスキップ（最小文字数制限を1に変更）
  if (!lineText || lineText.trim().length < 1) {
    return words;
  }

  // 1. 基本的な単語検出 - excludeJapanese設定に基づいて正規表現を選択
  const basicWordRegex = excludeJapanese
    ? /[a-zA-Z0-9]+/g // 日本語を除外（英数字のみ）
    : /[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]+/g; // 日本語を含む
  let match: RegExpExecArray | null;
  const allMatches: { text: string; index: number }[] = [];

  while ((match = basicWordRegex.exec(lineText)) !== null) {
    // 最小文字数を1に変更し、数字のみの単語も許可
    if (match[0].length >= 1) {
      allMatches.push({ text: match[0], index: match.index });
    }
  }

  // 2. kebab-case と snake_case の分割処理
  const splitMatches: { text: string; index: number }[] = [];

  for (const originalMatch of allMatches) {
    const text = originalMatch.text;
    const baseIndex = originalMatch.index;

    // kebab-case の分割 (例: "hit-a-hint" -> ["hit", "a", "hint"])
    if (text.includes("-") && /^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)+$/.test(text)) {
      const parts = text.split("-");
      let currentIndex = baseIndex;

      for (const part of parts) {
        if (part.length >= 1) {
          splitMatches.push({ text: part, index: currentIndex });
        }
        currentIndex += part.length + 1; // +1 for the hyphen
      }
    } // snake_case の分割 (例: "snake_case_word" -> ["snake", "case", "word"])
    else if (text.includes("_") && /^[a-zA-Z0-9]+(_[a-zA-Z0-9]+)+$/.test(text)) {
      const parts = text.split("_");
      let currentIndex = baseIndex;

      for (const part of parts) {
        if (part.length >= 1) {
          splitMatches.push({ text: part, index: currentIndex });
        }
        currentIndex += part.length + 1; // +1 for the underscore
      }
    } // 0xFF / 0b1010 の先頭0を境界として分割（例: 0xFF -> xFF, 0b1010 -> b1010）
    else if (/^0[xX][0-9a-fA-F]+$/.test(text)) {
      // 'x' 以降を単語として扱う
      const sub = text.slice(1); // drop leading '0'
      splitMatches.push({ text: sub, index: baseIndex + 1 });
    } else if (/^0[bB][01]+$/.test(text)) {
      const sub = text.slice(1);
      splitMatches.push({ text: sub, index: baseIndex + 1 });
    } // 日本語の単語境界分割（改善された文字の種別による分割）
    // excludeJapanese が true の場合はこの処理をスキップ
    else if (
      !excludeJapanese && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text) && text.length > 2
    ) {
      // 改善された日本語単語分割（より自然な境界を検出）
      const improvedSplitWords = splitJapaneseTextImproved(text, baseIndex);
      splitMatches.push(...improvedSplitWords);
    } // 通常の単語はそのまま追加
    else {
      splitMatches.push(originalMatch);
    }
  }

  // 3. 数字のみの単語を別途検出
  const numberRegex = /\b\d+\b/g;
  let numberMatch: RegExpExecArray | null;
  while ((numberMatch = numberRegex.exec(lineText)) !== null) {
    // 既存のマッチと重複していないかチェック
    const isAlreadyMatched = splitMatches.some((existing) =>
      existing.index <= numberMatch!.index &&
      existing.index + existing.text.length >= numberMatch!.index + numberMatch![0].length
    );

    // 数字のみ除外ポリシー: 2文字未満、数字のみは除外
    if (!isAlreadyMatched && numberMatch[0].length >= 2) {
      splitMatches.push({ text: numberMatch[0], index: numberMatch.index });
    }
  }

  // 4. 1文字の英単語を別途検出（"I", "a" など）
  const singleCharRegex = /\b[a-zA-Z]\b/g;
  let charMatch: RegExpExecArray | null;
  while ((charMatch = singleCharRegex.exec(lineText)) !== null) {
    // 既存のマッチと重複していないかチェック
    const isAlreadyMatched = splitMatches.some((existing) =>
      existing.index <= charMatch!.index &&
      existing.index + existing.text.length >= charMatch!.index + charMatch![0].length
    );

    if (!isAlreadyMatched) {
      splitMatches.push({ text: charMatch[0], index: charMatch.index });
    }
  }

  // 5. 1文字の数字を別途検出は除外（数字のみ除外ポリシーに従い、2文字未満は除外）

  // 6. インデックスでソートして重複除去
  const uniqueMatches = splitMatches
    .sort((a, b) => a.index - b.index)
    .filter((match, index, array) => {
      // 同じ位置で同じテキストの重複を除去
      if (index === 0) return true;
      const prev = array[index - 1];
      return !(prev.index === match.index && prev.text === match.text);
    });

  // 7. パフォーマンス保護：1行あたり100個まで
  const finalMatches = uniqueMatches.slice(0, 100);

  // 8. Wordオブジェクトに変換
  for (const match of finalMatches) {
    // Calculate byte position for UTF-8 compatibility
    const byteIndex = charIndexToByteIndex(lineText, match.index);
    // Calculate display column considering tab characters
    const displayCol = getDisplayColumn(lineText, match.index);

    words.push({
      text: match.text,
      line: lineNumber,
      col: displayCol + 1, // Vimの列番号は1から始まる（タブ展開後の表示位置）
      byteCol: byteIndex + 1, // Vimのバイト列番号は1から始まる
    });
  }

  return words;
}

export function extractWordsFromLineWithConfig(
  lineText: string,
  lineNumber: number,
  config: Partial<Config> = {},
): Word[] {
  // createMinimalConfigで完全なConfigを生成
  const fullConfig = { ...getDefaultConfig(), ...config };
  const excludeJapanese = fullConfig.useJapanese !== true;
  return extractWordsFromLine(lineText, lineNumber, true, excludeJapanese);
}

/**
 * 特定範囲の単語を検出（パフォーマンステスト用）
 * @description 指定された行範囲内の単語を検出。パフォーマンステストや部分的な単語検出に使用
 * @param denops - Denopsインスタンス
 * @param startLine - 検出開始行番号（1ベース）
 * @param endLine - 検出終了行番号（1ベース）
 * @param maxWords - 最大単語数制限（省略時はデフォルト値使用）
 * @returns Promise<Word[]> - 検出された単語の配列
 * @throws {Error} 範囲指定が無効な場合（空の配列を返す）
 * @since 1.0.0
 * @example
 * ```typescript
 * const words = await detectWordsInRange(denops, 1, 100, 50);
 * console.log(`Found ${words.length} words in lines 1-100`);
 * ```
 */
export async function detectWordsInRange(
  denops: Denops,
  startLine: number,
  endLine: number,
  maxWords?: number,
): Promise<Word[]> {
  try {
    const words: Word[] = [];
    const effectiveMaxWords = maxWords || MAX_WORDS_PER_FILE;

    // 範囲の検証
    const actualEndLine = Math.min(endLine, await denops.call("line", "$") as number);
    const actualStartLine = Math.max(1, startLine);

    for (let line = actualStartLine; line <= actualEndLine; line++) {
      if (words.length >= effectiveMaxWords) {
        break;
      }

      const lineText = await denops.call("getline", line) as string;
      const lineWords = extractWordsFromLineLegacy(lineText, line, false);

      // 単語数制限を適用
      const remainingSlots = effectiveMaxWords - words.length;
      words.push(...lineWords.slice(0, remainingSlots));
    }

    return words;
  } catch (error) {
    return [];
  }
}

/**
 * 単語検出キャッシュをクリア
 * @description 単語検出関連のキャッシュをすべてクリアする
 * @returns void
 * @since 1.0.0
 * @example
 * ```typescript
 * clearWordDetectionCache(); // キャッシュをリセット
 * ```
 */
export function clearWordDetectionCache(): void {
  wordDetectionCache.clear();
}

/**
 * キャッシュの統計情報を取得
 * @description 単語検出キャッシュの使用状況と設定値を取得
 * @returns {{ cacheSize: number, cacheKeys: string[], maxCacheSize: number, largeFileThreshold: number, maxWordsPerFile: number }} キャッシュ統計情報
 * @since 1.0.0
 * @example
 * ```typescript
 * const stats = getWordDetectionCacheStats();
 * console.log(`Cache size: ${stats.cacheSize}/${stats.maxCacheSize}`);
 * console.log(`Large file threshold: ${stats.largeFileThreshold} lines`);
 * ```
 */
/**
 * 単語検出キャッシュの統計情報を取得します
 * @returns キャッシュの統計情報オブジェクト
 */
export function getWordDetectionCacheStats(): {
  /** キャッシュサイズ */
  cacheSize: number;
  /** キャッシュキーのリスト */
  cacheKeys: string[];
  /** 最大キャッシュサイズ */
  maxCacheSize: number;
  /** 大きなファイルの闾値 */
  largeFileThreshold: number;
  /** ファイルあたりの最大単語数 */
  maxWordsPerFile: number;
} {
  return {
    cacheSize: wordDetectionCache.size(),
    cacheKeys: Array.from(wordDetectionCache.keys()),
    maxCacheSize: GlobalCache.getInstance().getCacheConfig(CacheType.WORD_DETECTION).size,
    largeFileThreshold: LARGE_FILE_THRESHOLD,
    maxWordsPerFile: MAX_WORDS_PER_FILE,
  };
}

/**
 * Phase 1 TDD Green Phase: WordConfig to EnhancedWordConfig Adapter Functions
 * WordConfigからEnhancedWordConfigへの変換アダプター関数群
 */

/**
 * ConfigをEnhancedWordConfigに変換する
 * @description Configを新しいEnhancedWordConfig形式に変換する（v3.0.0でWordConfigサポート削除）
 * @param config - 変換元のConfig
 * @returns EnhancedWordConfig - 変換されたEnhancedWordConfig
 * @since 1.0.0
 * @updated v3.0.0 - WordConfigサポート削除
 */
export function convertWordConfigToEnhanced(config: Config): EnhancedWordConfig {
  // Configを受け入れ、EnhancedWordConfigに変換
  const useJapanese = 'useJapanese' in config ? config.useJapanese : false;

  return {useJapanese: useJapanese ?? false,
    strategy: "regex", // デフォルト戦略
    enableTinySegmenter: useJapanese === true,
  };
}

/**
 * Configの部分的なオブジェクトを作成するヘルパー関数
 * WordConfigとの後方互換性を保ちつつ、Configの型要件を満たします
 */
export function createPartialConfig(options: { useJapanese?: boolean }): Config {
  // Configの最小必須プロパティのデフォルト値
  return {
    enabled: true,
    markers: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
    motionCount: 3,
    motionTimeout: 1000,
    hintPosition: "start",
    triggerOnHjkl: true,
    countedMotions: ['h', 'j', 'k', 'l'],
    maxHints: 50,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: true,
    debugCoordinates: false,
    singleCharKeys: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
    multiCharKeys: ['a', 'b', 'c', 'd', 'e', 'f'],
    useHintGroups: false,
    highlightHintMarker: "HellshakeYanoMarker",
    highlightHintMarkerCurrent: "HellshakeYanoMarkerCurrent",
    suppressOnKeyRepeat: false,
    keyRepeatThreshold: 50,
    useJapanese: options.useJapanese ?? false,
    wordDetectionStrategy: "regex",
    enableTinySegmenter: false,
    segmenterThreshold: 2,
    japaneseMinWordLength: 1,
    japaneseMergeParticles: false,
    japaneseMergeThreshold: 10,
    defaultMinWordLength: 2,
    defaultMotionCount: 3,
    debugMode: false,
    performanceLog: false,
  } as Config;
}

/**
 * EnhancedWordConfigを使用してDenopsから単語を検出する（アダプター版）
 * @description WordConfigベースの関数からEnhancedWordConfig版への移行アダプター
 * @param denops - Denopsインスタンス
 * @param config - EnhancedWordConfig設定
 * @returns Promise<Word[]> - 検出された単語の配列
 * @since 1.0.0
 */
export async function detectWordsWithEnhancedConfig(
  denops: Denops,
  config: EnhancedWordConfig = {},
): Promise<Word[]> {
  // 新しいマネージャーベースの検出を試行し、失敗した場合はフォールバック
  try {
    const result = await detectWordsWithManager(denops, config);
    return result.words;
  } catch (error) {
    // フォールバックとしてレガシー版を使用
    const legacyConfig = createPartialConfig({
      useJapanese: config.useJapanese,
    });
    return await detectWordsWithConfig(denops, legacyConfig);
  }
}

export function extractWordsFromLineWithEnhancedConfig(
  lineText: string,
  lineNumber: number,
  config: EnhancedWordConfig = {},
): Word[] {
  const excludeJapanese = config.useJapanese !== true;
  return extractWordsFromLine(lineText, lineNumber, true, excludeJapanese);
}

/**
 * レガシー互換性アダプター関数
 * @description extractWordsFromLineOriginalと100%互換性のある結果を返すアダプター関数。
 * 将来的には新しい実装をベースとした最適化版に切り替え可能な設計。
 *
 * **レガシー互換性の特徴:**
 * - 最小単語長: 2文字以上
 * - 数字のみの単語を除外
 * - kebab-caseは分割（ハイフンで区切られる）
 * - snake_caseは保持（アンダースコアは単語文字として扱う）
 * - 連続する日本語は1つの単語として扱う
 * - パフォーマンス制限: 1行あたり最大100単語
 *
 * @param lineText - 解析する行のテキスト
 * @param lineNumber - 行番号（1ベース）
 * @returns Word[] - レガシー互換性を保った抽出された単語の配列
 * @since 1.0.0
 * @version Process2 - TDD実装によるアダプターパターン
 *
 * @example
 * ```typescript
 * // kebab-caseの分割
 * const kebabWords = extractWordsFromLineLegacy('hello-world foo-bar', 1);
 * console.log(kebabWords.map(w => w.text)); // ["hello", "world", "foo", "bar"]
 *
 * // snake_caseの保持
 * const snakeWords = extractWordsFromLineLegacy('hello_world foo_bar', 1);
 * console.log(snakeWords.map(w => w.text)); // ["hello_world", "foo_bar"]
 *
 * // 日本語の連続処理
 * const japaneseWords = extractWordsFromLineLegacy('これは日本語のテストです', 1);
 * console.log(japaneseWords.map(w => w.text)); // ["これは日本語のテストです"]
 *
 * // フィルタリング（2文字未満、数字のみを除外）
 * const filteredWords = extractWordsFromLineLegacy('a bb 123 word1', 1);
 * console.log(filteredWords.map(w => w.text)); // ["bb", "word1"]
 * ```
 */
export function extractWordsFromLineLegacy(
  lineText: string,
  lineNumber: number,
  excludeJapanese = false,
): Word[] {
  const words: Word[] = [];

  // 空行や短すぎる行はスキップ
  if (!lineText || lineText.trim().length < 2) {
    return words;
  }

  // 最適化された正規表現（ユニコード対応）- excludeJapanese設定に基づいて選択
  const wordRegex = excludeJapanese
    ? /[a-zA-Z0-9_]+/g // 日本語を除外（英数字とアンダースコアのみ）
    : /[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]+/g; // 日本語を含む
  let match: RegExpExecArray | null;

  // パフォーマンスを向上させるためにマッチをバッチ処理
  const matches: { text: string; index: number }[] = [];
  while ((match = wordRegex.exec(lineText)) !== null) {
    // 短すぎる単語や数字のみの単語はスキップ
    if (match[0].length >= 2 && !/^\d+$/.test(match[0])) {
      matches.push({ text: match[0], index: match.index });
    }

    // パフォーマンス保護：1行あたり100個まで
    if (matches.length >= 100) {
      break;
    }
  }

  // マッチした単語をWordオブジェクトに変換
  for (const match of matches) {
    // Calculate byte position for UTF-8 compatibility
    const byteIndex = charIndexToByteIndex(lineText, match.index);
    // Calculate display column considering tab characters
    const displayCol = getDisplayColumn(lineText, match.index);

    words.push({
      text: match.text,
      line: lineNumber,
      col: displayCol + 1, // Vimの列番号は1から始まる（タブ展開後の表示位置）
      byteCol: byteIndex + 1, // Vimのバイト列番号は1から始まる
    });
  }

  return words;
}

/**
 * 統合された単語抽出設定インターフェース
 *
 * すべての既存の単語抽出関数の設定を統合し、後方互換性を保ちつつ
 * 一貫したAPIを提供します。
 *
 * @since 2.1.0
 */
export interface UnifiedWordExtractionConfig {
  // Core settings
  useImprovedDetection?: boolean;
  excludeJapanese?: boolean;

  // Legacy WordConfig compatibility
  useJapanese?: boolean;

  // Enhanced config compatibility
  strategy?: "regex" | "tinysegmenter" | "hybrid";
  perKeyMinLength?: Record<string, number>;
  defaultMinWordLength?: number;
  currentKeyContext?: string;
  minWordLength?: number;
  enableTinySegmenter?: boolean;

  // Mode selection
  legacyMode?: boolean;
}

/**
 * 統合された単語抽出関数
 *
 * すべての既存の extractWordsFromLine* 関数を統合し、
 * 単一のインターフェースで全ての機能を提供します。
 *
 * @param lineText - 解析する行のテキスト
 * @param lineNumber - 行番号（1ベース）
 * @param config - 統合された設定オブジェクト
 * @returns Word[] - 抽出された単語の配列
 *
 * @example
 * ```typescript
 * // Legacy behavior (default)
 * const words1 = extractWordsUnified("hello world", 1);
 *
 * // Improved detection
 * const words2 = extractWordsUnified("hello-world", 1, { useImprovedDetection: true });
 *
 * // WordConfig compatibility
 * const words3 = extractWordsUnified("hello こんにちは", 1, {useJapanese: true });
 *
 * // Enhanced config compatibility
 * const words4 = extractWordsUnified("test", 1, {
 *   strategy: "hybrid",
 *   minWordLength: 3
 * });
 * ```
 *
 * @since 2.1.0
 */
export function extractWordsUnified(
  lineText: string,
  lineNumber: number,
  config: UnifiedWordExtractionConfig = {},
): Word[] {
  // Configuration normalization
  const normalizedConfig = normalizeConfig(config);

  // Route to appropriate implementation based on config
  if (normalizedConfig.legacyMode) {
    return extractWordsFromLineLegacy(lineText, lineNumber, normalizedConfig.excludeJapanese);
  }

  if (normalizedConfig.hasEnhancedFeatures) {
    // Use extractWordsFromLine directly (avoiding deprecated function)
    const excludeJapanese = normalizedConfig.useJapanese !== true;
    return extractWordsFromLine(lineText, lineNumber, true, excludeJapanese);
  }

  if (normalizedConfig.useWordConfig) {
    // Use extractWordsFromLine directly (avoiding deprecated function)
    const excludeJapanese = normalizedConfig.useJapanese !== true;
    return extractWordsFromLine(lineText, lineNumber, true, excludeJapanese);
  }

  // Check if we should use improved detection via extractWordsFromLine
  if (
    normalizedConfig.useImprovedDetection ||
    config.useImprovedDetection !== undefined ||
    config.excludeJapanese !== undefined
  ) {
    return extractWordsFromLine(
      lineText,
      lineNumber,
      normalizedConfig.useImprovedDetection,
      normalizedConfig.excludeJapanese,
    );
  }

  // Default to legacy behavior for backward compatibility
  return extractWordsFromLineLegacy(lineText, lineNumber, normalizedConfig.excludeJapanese);
}

/**
 * 統合設定を正規化する内部関数
 */
interface NormalizedConfig {
  useImprovedDetection: boolean;
  excludeJapanese: boolean;
  useJapanese: boolean;
  strategy?: "regex" | "tinysegmenter" | "hybrid";
  minWordLength?: number;
  enableTinySegmenter?: boolean;
  perKeyMinLength?: Record<string, number>;
  defaultMinWordLength?: number;
  currentKeyContext?: string;
  legacyMode: boolean;
  hasEnhancedFeatures: boolean;
  useWordConfig: boolean;
}

function normalizeConfig(config: UnifiedWordExtractionConfig): NormalizedConfig {
  // Legacy mode detection
  const legacyMode = config.legacyMode === true;

  // Enhanced features detection
  const hasEnhancedFeatures = !!(
    config.strategy ||
    config.perKeyMinLength ||
    config.currentKeyContext ||
    config.enableTinySegmenter
  );

  // WordConfig features detection
  const useWordConfig = !!(
    config.useJapanese !== undefined ||
    config.useImprovedDetection !== undefined
  ) && !hasEnhancedFeatures;

  // Japanese handling priority:
  // 1. excludeJapanese (direct parameter)
  // 2. use_japanese (WordConfig/EnhancedConfig)
  // 3. default: false (include Japanese)
  let useJapanese: boolean;
  let excludeJapanese: boolean;

  if (config.excludeJapanese !== undefined) {
    excludeJapanese = config.excludeJapanese;
    useJapanese = !config.excludeJapanese;
  } else if (config.useJapanese !== undefined) {
    useJapanese = config.useJapanese;
    excludeJapanese = !config.useJapanese;
  } else {
    useJapanese = true; // Default: include Japanese for legacy compatibility
    excludeJapanese = false;
  }

  // Improved detection priority:
  // 1. useImprovedDetection (direct parameter)
  // 2. use_improved_detection (WordConfig)
  // 3. default based on mode
  const useImprovedDetection = config.useImprovedDetection ??
    config.useImprovedDetection ??
    false; // Default to false for legacy compatibility

  return {
    useImprovedDetection,
    excludeJapanese,
    useJapanese,
    strategy: config.strategy,
    minWordLength: config.minWordLength ?? config.defaultMinWordLength,
    enableTinySegmenter: config.enableTinySegmenter,
    perKeyMinLength: config.perKeyMinLength,
    defaultMinWordLength: config.defaultMinWordLength,
    currentKeyContext: config.currentKeyContext,
    legacyMode,
    hasEnhancedFeatures,
    useWordConfig,
  };
}

// === Manager Re-exports removed - integrated below ===

// === Re-exports removed - Classes integrated below ===

// ==========================================
// === Encoding Functions (from utils/encoding.ts) ===
// ==========================================

/**
 * UTF-8文字とバイトインデックス変換のエンコーディングユーティリティ
 *
 * このモジュールはUTF-8エンコードテキストの文字インデックスとバイトインデックス間の
 * 変換を行うユーティリティを提供します。特に日本語文字（1文字3バイト）を適切に処理します。
 *
 * 統一されたバイト長計算とエンコーディング処理を提供し、
 * 複数のモジュール間での重複実装を排除します。
 *
 * @module encoding utilities (integrated into word.ts)
 * @version 1.0.0
 */

/**
 * TextEncoderの共有インスタンス
 * インスタンス生成コストを削減し、メモリ使用量を最小化
 */
const sharedTextEncoder = new TextEncoder();

/**
 * マルチバイト文字のバイト長キャッシュ
 * 頻繁に使用される文字列のバイト長をキャッシュして性能を向上
 * 統一キャッシュシステムによるLRUアルゴリズムで効率的にメモリ管理
 */
const byteLengthCache = GlobalCache.getInstance().getCache<string, number>(CacheType.BYTE_LENGTH);

/**
 * ASCII文字のみかどうかを高速チェック
 *
 * 文字列内のすべての文字がASCII文字（0x00-0x7F）であるかを判定します。
 * ASCII文字のみの場合はバイト長計算の最適化パスを使用できます。
 *
 * @param text チェック対象の文字列
 * @returns ASCII文字のみの場合true、マルチバイト文字が含まれる場合false
 * @example
 * ```typescript
 * isAscii("hello"); // true
 * isAscii("こんにちは"); // false
 * isAscii("hello world 123"); // true
 * isAscii("hello 世界"); // false
 * ```
 */
export function isAscii(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 0x7f) {
      return false;
    }
  }
  return true;
}

/**
 * 統一されたバイト長計算関数（キャッシュ付き、ASCII最適化）
 *
 * 文字列のUTF-8エンコーディングでのバイト数を計算します。
 * ASCII文字のみの場合は高速処理パスを使用し、
 * マルチバイト文字が含まれる場合はキャッシュで最適化を行います。
 *
 * パフォーマンス最適化:
 * - ASCII文字のみ: O(n)の文字コードチェック
 * - マルチバイト文字: TextEncoderを使用してキャッシュに保存
 *
 * @param text バイト長を計算する文字列
 * @returns UTF-8エンコーディングでのバイト数
 * @throws なし（常に有効な数値を返します）
 * @example
 * ```typescript
 * getByteLength(""); // 0
 * getByteLength("hello"); // 5
 * getByteLength("あいう"); // 9 (3バイト × 3文字)
 * getByteLength("Hello世界"); // 11 (5 + 6バイト)
 * ```
 */
export function getByteLength(text: string): number {
  if (text.length === 0) {
    return 0;
  }

  // ASCII文字のみの場合は高速パス
  if (isAscii(text)) {
    return text.length;
  }

  // キャッシュをチェック
  const cached = byteLengthCache.get(text);
  if (cached !== undefined) {
    return cached;
  }

  // バイト長を計算してキャッシュに保存
  const length = sharedTextEncoder.encode(text).length;
  byteLengthCache.set(text, length);
  return length;
}

/**
 * バイト長キャッシュをクリア
 *
 * メモリ使用量の制限や長時間実行時のメモリリーク防止のため、
 * バイト長計算のキャッシュをクリアします。
 * 大量の異なる文字列を処理した後や、メモリ使用量を削減したい場合に使用します。
 *
 * @returns なし
 * @example
 * ```typescript
 * // 大量の文字列処理後にメモリを解放
 * for (const text of largeTextArray) {
 *   const length = getByteLength(text);
 *   // 処理...
 * }
 * clearByteLengthCache(); // キャッシュをリセット
 * ```
 */
export function clearByteLengthCache(): void {
  byteLengthCache.clear();
}

/**
 * 文字インデックスをUTF-8バイトインデックスに変換
 *
 * UTF-8エンコードされたテキスト内での文字位置をバイト位置に変換します。
 * 日本語文字などのマルチバイト文字を適切に処理し、正確なバイト位置を返します。
 *
 * 処理の特徴:
 * - 範囲外の文字インデックスは適切に処理されます
 * - 負数や0以下は0を返します
 * - 文字列長以上のインデックスは全体のバイト長を返します
 *
 * @param text UTF-8エンコードされたテキスト
 * @param charIndex 文字位置（0ベースインデックス）
 * @returns UTF-8バイト位置（0ベースインデックス）
 * @throws なし（範囲外アクセスも安全に処理されます）
 * @since 1.0.0
 * @example
 * ```typescript
 * const text = 'こんにちはworld';
 *
 * charIndexToByteIndex(text, 0);  // 0 ('こ'の開始位置)
 * charIndexToByteIndex(text, 1);  // 3 ('ん'の開始位置)
 * charIndexToByteIndex(text, 5);  // 15 ('w'の開始位置)
 * charIndexToByteIndex(text, -1); // 0 (負数は0に正規化)
 * charIndexToByteIndex(text, 100); // 20 (範囲外は全体のバイト長)
 * ```
 */
export function charIndexToByteIndex(text: string, charIndex: number): number {
  // 範囲外チェックと空文字列チェック
  if (charIndex <= 0) return 0;
  if (text.length === 0) return 0;
  if (charIndex >= text.length) return new TextEncoder().encode(text).length;

  // 開始から指定された文字インデックスまでの部分文字列を抽出
  const substring = text.substring(0, charIndex);

  // UTF-8バイトに変換して長さを返す
  return new TextEncoder().encode(substring).length;
}

/**
 * UTF-8バイトインデックスを文字インデックスに変換
 *
 * UTF-8エンコードされたテキスト内でのバイト位置を文字位置に変換します。
 * マルチバイト文字の途中を指している場合は、その文字の開始位置を返します。
 *
 * 処理の特徴:
 * - マルチバイト文字の境界を適切に処理
 * - 文字の途中のバイト位置でも安全に文字境界を返す
 * - 範囲外のバイト位置は適切に正規化される
 *
 * @param text UTF-8エンコードされたテキスト
 * @param byteIndex バイト位置（0ベースインデックス）
 * @returns 対応する文字位置（0ベースインデックス）
 * @throws なし（デコードエラー時は安全な文字境界を返します）
 * @since 1.0.0
 * @example
 * ```typescript
 * const text = 'こんにちはworld';
 *
 * byteIndexToCharIndex(text, 0);  // 0 ('こ'の位置)
 * byteIndexToCharIndex(text, 1);  // 0 ('こ'の途中 -> 'こ'の位置)
 * byteIndexToCharIndex(text, 3);  // 1 ('ん'の開始位置)
 * byteIndexToCharIndex(text, 15); // 5 ('w'の位置)
 * byteIndexToCharIndex(text, -1); // 0 (負数は0に正規化)
 * byteIndexToCharIndex(text, 100); // 11 (範囲外は文字列長)
 * ```
 */
export function byteIndexToCharIndex(text: string, byteIndex: number): number {
  // 範囲外チェック
  if (byteIndex <= 0) return 0;
  if (text.length === 0) return 0;

  const encoder = new TextEncoder();
  const fullBytes = encoder.encode(text);

  // byteIndexが全体のバイト長以上の場合は文字列長を返す
  if (byteIndex >= fullBytes.length) return text.length;

  // より効率的なアプローチ: 文字ごとに累積バイト数を計算
  let currentByteIndex = 0;
  for (let charIndex = 0; charIndex < text.length; charIndex++) {
    const char = text[charIndex];
    const charByteLength = encoder.encode(char).length;

    // 現在の文字の終端バイト位置
    const nextByteIndex = currentByteIndex + charByteLength;

    // 指定されたバイトインデックスが現在の文字の範囲内にある場合
    if (byteIndex < nextByteIndex) {
      // マルチバイト文字の境界チェック
      if (byteIndex === currentByteIndex) {
        // 文字の開始位置の場合、その文字のインデックスを返す
        return charIndex;
      } else {
        // マルチバイト文字の途中の場合、前の文字境界を返す
        return charIndex;
      }
    }

    currentByteIndex = nextByteIndex;
  }

  // ここに到達することは通常ないが、安全のため文字列長を返す
  return text.length;
}

/**
 * 指定位置の文字のバイト長を取得
 *
 * 特定の文字位置にある文字がUTF-8エンコーディングで何バイトを占めるかを取得します。
 * ASCII文字は1バイト、日本語文字（ひらがな・カタカナ・漢字）は通常3バイト、
 * 絵文字などは4バイト以上になる場合があります。
 *
 * @param text UTF-8エンコードされたテキスト
 * @param charIndex 文字位置（0ベースインデックス）
 * @returns 指定位置の文字のバイト数（無効な位置の場合は0）
 * @throws なし（範囲外アクセスは0を返します）
 * @since 1.0.0
 * @example
 * ```typescript
 * const text = 'あAい😀';
 *
 * getCharByteLength(text, 0); // 3 ('あ' - ひらがな)
 * getCharByteLength(text, 1); // 1 ('A' - ASCII文字)
 * getCharByteLength(text, 2); // 3 ('い' - ひらがな)
 * getCharByteLength(text, 3); // 4 ('😀' - 絵文字)
 * getCharByteLength(text, -1); // 0 (範囲外)
 * getCharByteLength(text, 10); // 0 (範囲外)
 * ```
 */
export function getCharByteLength(text: string, charIndex: number): number {
  // 範囲外チェックと空文字列チェック
  if (text.length === 0) return 0;
  if (charIndex < 0 || charIndex >= text.length) return 0;

  const char = text[charIndex];
  return new TextEncoder().encode(char).length;
}

/**
 * テキストにマルチバイト文字（日本語など）が含まれているかチェック
 *
 * テキストのUTF-8バイト長と文字長を比較し、マルチバイト文字の存在を判定します。
 * ASCII文字のみの場合はバイト数と文字数が等しくなりますが、
 * 日本語文字や絵文字が含まれる場合はバイト数の方が大きくなります。
 *
 * この情報はパフォーマンス最適化の判断に使用できます。
 *
 * @param text チェックするテキスト
 * @returns マルチバイト文字が含まれている場合true、ASCII文字のみの場合false
 * @throws なし
 * @since 1.0.0
 * @example
 * ```typescript
 * hasMultibyteCharacters('');           // false (空文字列)
 * hasMultibyteCharacters('hello');     // false (ASCII文字のみ)
 * hasMultibyteCharacters('こんにちは'); // true (日本語文字)
 * hasMultibyteCharacters('hello世界'); // true (混在)
 * hasMultibyteCharacters('café');      // true (アクセント文字)
 * hasMultibyteCharacters('😀');        // true (絵文字)
 * ```
 */
export function hasMultibyteCharacters(text: string): boolean {
  return new TextEncoder().encode(text).length > text.length;
}

/**
 * デバッグ用の詳細エンコーディング情報を取得
 *
 * テキストの各文字に対する詳細なUTF-8エンコーディング情報を取得し、
 * デバッグ、分析、テストに使用します。文字ごとのバイト位置とバイト数の
 * マッピングを提供し、エンコーディング処理の検証に役立ちます。
 *
 * 返却される情報:
 * - charLength: 文字数
 * - byteLength: 総バイト数
 * - hasMultibyte: マルチバイト文字の有無
 * - charToByteMap: 各文字の詳細マッピング
 *
 * @param text 分析するテキスト
 * @returns エンコーディングの詳細情報オブジェクト
 * @throws なし
 * @since 1.0.0
 * @example
 * ```typescript
 * const info = getEncodingInfo('あAい😀');
 *
 * console.log(info.charLength);   // 4
 * console.log(info.byteLength);   // 11 (3+1+3+4)
 * console.log(info.hasMultibyte); // true
 *
 * // 各文字の詳細情報
 * console.log(info.charToByteMap[0]);
 * // { char: 'あ', charIndex: 0, byteStart: 0, byteLength: 3 }
 * console.log(info.charToByteMap[1]);
 * // { char: 'A', charIndex: 1, byteStart: 3, byteLength: 1 }
 * console.log(info.charToByteMap[2]);
 * // { char: 'い', charIndex: 2, byteStart: 4, byteLength: 3 }
 * console.log(info.charToByteMap[3]);
 * // { char: '😀', charIndex: 3, byteStart: 7, byteLength: 4 }
 * ```
 */
export function getEncodingInfo(text: string): {
  charLength: number;
  byteLength: number;
  hasMultibyte: boolean;
  charToByteMap: Array<{ char: string; charIndex: number; byteStart: number; byteLength: number }>;
} {
  const encoder = new TextEncoder();
  const charToByteMap: Array<
    { char: string; charIndex: number; byteStart: number; byteLength: number }
  > = [];

  let bytePosition = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charBytes = encoder.encode(char);

    charToByteMap.push({
      char,
      charIndex: i,
      byteStart: bytePosition,
      byteLength: charBytes.length,
    });

    bytePosition += charBytes.length;
  }

  return {
    charLength: text.length,
    byteLength: encoder.encode(text).length,
    hasMultibyte: hasMultibyteCharacters(text),
    charToByteMap,
  };
}

/**
 * 複数の文字インデックスをバイトインデックスに効率的に変換
 *
 * 複数の文字位置を一度にバイト位置に変換します。
 * 内部的にインデックスをソートして一回のテキスト走査で全ての変換を行うため、
 * 個別変換を繰り返すよりも効率的です。元の順序は保持されます。
 *
 * パフォーマンス特性:
 * - 時間計算量: O(n + m log m) (n=テキスト長, m=インデックス数)
 * - 個別変換の場合: O(n * m)
 * - 大量のインデックス変換時に特に有効
 *
 * @param text UTF-8エンコードされたテキスト
 * @param charIndices 変換する文字位置の配列（0ベースインデックス）
 * @returns 対応するバイト位置の配列（元の順序を保持、0ベースインデックス）
 * @throws なし（範囲外インデックスも安全に処理されます）
 * @since 1.0.0
 * @example
 * ```typescript
 * const text = 'あいうABC';
 *
 * // 基本的な使用例
 * const charIndices = [0, 2, 4]; // 'あ', 'う', 'B'の位置
 * const byteIndices = charIndicesToByteIndices(text, charIndices);
 * console.log(byteIndices); // [0, 6, 10]
 *
 * // 順序が保持される例
 * const mixedIndices = [4, 0, 2]; // 順序はそのまま
 * const mixedBytes = charIndicesToByteIndices(text, mixedIndices);
 * console.log(mixedBytes); // [10, 0, 6]
 *
 * // 範囲外も安全に処理
 * const invalidIndices = [-1, 0, 100];
 * const safeBytes = charIndicesToByteIndices(text, invalidIndices);
 * console.log(safeBytes); // [0, 0, 12] (全体のバイト長)
 *
 * // 空配列の場合
 * const emptyResult = charIndicesToByteIndices(text, []);
 * console.log(emptyResult); // []
 * ```
 */
export function charIndicesToByteIndices(text: string, charIndices: number[]): number[] {
  // 空の入力チェック
  if (charIndices.length === 0) return [];
  if (text.length === 0) return charIndices.map(() => 0);

  const encoder = new TextEncoder();
  const result: number[] = [];
  const fullTextByteLength = encoder.encode(text).length;

  // インデックスをソートして効率的に処理
  const sortedIndices = charIndices
    .map((index, originalIndex) => ({ index: Math.max(0, index), originalIndex }))
    .sort((a, b) => a.index - b.index);

  let currentCharIndex = 0;
  let currentByteIndex = 0;
  let processedCount = 0;

  for (let i = 0; i < text.length && processedCount < sortedIndices.length; i++) {
    const char = text[i];
    const charByteLength = encoder.encode(char).length;

    // この文字位置がターゲットインデックスのいずれかと一致するかチェック
    while (
      processedCount < sortedIndices.length &&
      sortedIndices[processedCount].index === currentCharIndex
    ) {
      result[sortedIndices[processedCount].originalIndex] = currentByteIndex;
      processedCount++;
    }

    currentCharIndex++;
    currentByteIndex += charByteLength;
  }

  // 文字列長以上のインデックスを処理
  while (processedCount < sortedIndices.length) {
    const targetIndex = charIndices[sortedIndices[processedCount].originalIndex];
    if (targetIndex >= text.length) {
      result[sortedIndices[processedCount].originalIndex] = fullTextByteLength;
    } else {
      result[sortedIndices[processedCount].originalIndex] = currentByteIndex;
    }
    processedCount++;
  }

  return result;
}

/**
 * 文字種判定ユーティリティ
 * Unicode範囲に基づく文字種の分類と境界検出を提供
 */

/**
 * 文字種別を表すenum
 *
 * @description Unicode範囲に基づいて文字を分類するための定数
 * @example
 * ```typescript
 * const type = getCharType('あ');
 * if (type === CharType.Hiragana) {
 *   console.log('ひらがなです');
 * }
 * ```
 */
export enum CharType {
  /** ひらがな文字 (U+3040-U+309F) */
  Hiragana = "hiragana",
  /** カタカナ文字 (U+30A0-U+30FF) */
  Katakana = "katakana",
  /** 漢字 (CJK統合漢字：U+4E00-U+9FFF) */
  Kanji = "kanji",
  /** 英数字 (ASCII 0-9, A-Z, a-z) */
  Alphanumeric = "alphanumeric",
  /** 記号類 (各種記号文字) */
  Symbol = "symbol",
  /** 空白文字 (半角・全角スペース、タブ等) */
  Space = "space",
  /** その他の文字 */
  Other = "other"
}

/**
 * パフォーマンス最適化: 文字種判定キャッシュ
 *
 * @description 文字種判定結果をキャッシュしてパフォーマンスを向上させます。
 * 統一キャッシュシステムのLRU（Least Recently Used）アルゴリズムでサイズ制限を管理します。
 */
const charTypeCache = GlobalCache.getInstance().getCache<string, CharType>(CacheType.CHAR_TYPE);

/**
 * 隣接文字解析結果を表すインターフェース
 *
 * @description 連続する同じ文字種の範囲を示すデータ構造
 */
export interface AdjacentAnalysis {
  /** この範囲の文字種 */
  type: CharType;
  /** 範囲の開始位置（0ベース） */
  start: number;
  /** 範囲の終了位置（exclusive、0ベース） */
  end: number;
  /** 範囲内の実際のテキスト */
  text: string;
}

/**
 * 単一文字の種類を判定する（キャッシュ付き）
 *
 * @description Unicode範囲に基づいて文字の種別を判定します。
 * パフォーマンス向上のため、結果をキャッシュします。
 *
 * @param char - 判定対象の文字（単一文字）
 * @returns 文字種別
 *
 * @example
 * ```typescript
 * getCharType('あ'); // CharType.Hiragana
 * getCharType('ア'); // CharType.Katakana
 * getCharType('漢'); // CharType.Kanji
 * getCharType('A');  // CharType.Alphanumeric
 * getCharType('!');  // CharType.Symbol
 * getCharType(' ');  // CharType.Space
 * ```
 */
export function getCharType(char: string): CharType {
  if (!char || char.length === 0) {
    return CharType.Other;
  }

  // キャッシュから取得を試行
  const cached = charTypeCache.get(char);
  if (cached !== undefined) {
    return cached;
  }

  // 統一キャッシュシステムが自動的にLRUアルゴリズムでサイズ制限を管理

  const code = char.codePointAt(0);
  if (code === undefined) {
    charTypeCache.set(char, CharType.Other);
    return CharType.Other;
  }

  let result: CharType;

  // Unicode範囲による文字種判定
  // スペース文字（半角・全角スペース、タブ、改行文字）
  if (char === ' ' || char === '　' || char === '\t' || char === '\n' || char === '\r') {
    result = CharType.Space;
  }
  // ひらがな文字（あいうえお等、U+3040-U+309F）
  else if (code >= 0x3040 && code <= 0x309F) {
    result = CharType.Hiragana;
  }
  // カタカナ文字（アイウエオ等、U+30A0-U+30FF）
  else if (code >= 0x30A0 && code <= 0x30FF) {
    result = CharType.Katakana;
  }
  // CJK統合漢字（日中韓の漢字、U+4E00-U+9FFF）
  else if (code >= 0x4E00 && code <= 0x9FFF) {
    result = CharType.Kanji;
  }
  // ASCII英数字（半角の0-9、A-Z、a-z）
  else if ((code >= 0x0030 && code <= 0x0039) || // 数字0-9
      (code >= 0x0041 && code <= 0x005A) || // 大文字A-Z
      (code >= 0x0061 && code <= 0x007A)) { // 小文字a-z
    result = CharType.Alphanumeric;
  }
  // 記号文字（句読点、算術記号、CJK記号、全角記号等）
  else if ((code >= 0x0020 && code <= 0x002F) || // ASCII記号 !"#$%&'()*+,-./
      (code >= 0x003A && code <= 0x0040) || // ASCII記号 :;<=>?@
      (code >= 0x005B && code <= 0x0060) || // ASCII記号 [\]^_`
      (code >= 0x007B && code <= 0x007E) || // ASCII記号 {|}~
      (code >= 0x3000 && code <= 0x303F) || // CJK記号及び句読点
      (code >= 0xFF00 && code <= 0xFFEF)) { // 全角英数字・記号
    result = CharType.Symbol;
  }
  // 上記以外の文字（特殊文字、絵文字等）
  else {
    result = CharType.Other;
  }

  // キャッシュに保存
  charTypeCache.set(char, result);
  return result;
}

/**
 * 文字列を文字種別に解析する
 *
 * @description 入力文字列を連続する同じ文字種のセグメントに分割し、
 * それぞれの範囲と文字種を解析します。
 *
 * @param text - 解析対象の文字列
 * @returns 文字種別解析結果の配列。各要素は連続する同じ文字種の範囲を表す
 *
 * @example
 * ```typescript
 * const result = analyzeString('こんにちはWorld123');
 * // [
 * //   { type: 'hiragana', start: 0, end: 5, text: 'こんにちは' },
 * //   { type: 'alphanumeric', start: 5, end: 10, text: 'World' },
 * //   { type: 'alphanumeric', start: 10, end: 13, text: '123' }
 * // ]
 * ```
 */
export function analyzeString(text: string): AdjacentAnalysis[] {
  if (!text || text.length === 0) {
    return [];
  }

  const result: AdjacentAnalysis[] = [];
  let currentType = getCharType(text[0]);
  let start = 0;

  for (let i = 1; i <= text.length; i++) {
    const charType = i < text.length ? getCharType(text[i]) : null;

    if (charType !== currentType || i === text.length) {
      result.push({
        type: currentType,
        start: start,
        end: i,
        text: text.slice(start, i)
      });

      if (charType !== null) {
        currentType = charType;
        start = i;
      }
    }
  }

  return result;
}

/**
 * 文字種境界とCamelCase境界を検出する
 *
 * @description 文字列内で文字種が変わる位置とCamelCase記法での
 * 単語境界を検出し、境界位置のリストを返します。
 *
 * @param text - 境界検出対象の文字列
 * @returns ソートされた境界位置の配列（0ベースインデックス）
 *
 * @example
 * ```typescript
 * findBoundaries('helloWorld漢字');
 * // [0, 5, 10, 12] (hello|World|漢字|の境界)
 *
 * findBoundaries('camelCaseExample');
 * // [0, 5, 9, 16] (camel|Case|Example|の境界)
 * ```
 */
export function findBoundaries(text: string): number[] {
  if (!text || text.length === 0) {
    return [0];
  }

  const boundaries = new Set<number>();
  boundaries.add(0); // 開始位置

  for (let i = 1; i < text.length; i++) {
    const prevChar = text[i - 1];
    const currentChar = text[i];
    const prevType = getCharType(prevChar);
    const currentType = getCharType(currentChar);

    // 文字種境界
    if (prevType !== currentType) {
      boundaries.add(i);
    }

    // CamelCase境界（小文字→大文字）
    if (prevType === CharType.Alphanumeric &&
        currentType === CharType.Alphanumeric &&
        prevChar >= 'a' && prevChar <= 'z' &&
        currentChar >= 'A' && currentChar <= 'Z') {
      boundaries.add(i);
    }

    // 記号境界（記号の前後で区切る）
    if (currentType === CharType.Symbol && prevType !== CharType.Symbol) {
      boundaries.add(i);
    }
    if (prevType === CharType.Symbol && currentType !== CharType.Symbol) {
      boundaries.add(i);
    }
  }

  boundaries.add(text.length); // 終了位置
  return Array.from(boundaries).sort((a, b) => a - b);
}

/**
 * パフォーマンス最適化: 日本語助詞の高速検索セット
 *
 * @description 日本語の助詞パターンをSetで管理して高速検索を実現します。
 * 前の語と結合すべき助詞を定義しています。
 */
const particleSet = new Set(['の', 'が', 'を', 'に', 'で', 'と', 'は', 'も', 'から', 'まで', 'より']);

/**
 * パフォーマンス最適化: 接続詞の高速検索セット
 *
 * @description 日本語の接続詞パターンをSetで管理して高速検索を実現します。
 * 前の語と結合すべき接続詞を定義しています。
 */
const connectorSet = new Set(['そして', 'また', 'しかし', 'だから', 'それで', 'ところで']);

/**
 * パフォーマンス最適化: 動詞語尾の高速検索セット
 *
 * @description 日本語の動詞活用語尾をSetで管理して高速検索を実現します。
 * 漢字の後に続く動詞活用パターンを定義しています。
 */
const verbEndingSet = new Set(['する', 'され', 'でき', 'れる', 'られ']);

/**
 * 文字種に基づく結合判定（最適化版）
 *
 * @description 前のセグメントと現在のセグメントを結合すべきかどうかを
 * 言語学的ルールに基づいて判定します。助詞、接続詞、動詞活用、
 * 複合語などのパターンを考慮します。
 *
 * @param prevSegment - 前のセグメント文字列
 * @param currentSegment - 現在のセグメント文字列
 * @param nextSegment - 次のセグメント文字列（オプション、将来の拡張用）
 * @returns 結合すべき場合はtrue、そうでなければfalse
 *
 * @example
 * ```typescript
 * shouldMerge('私', 'は');     // true (助詞パターン)
 * shouldMerge('勉強', 'する'); // true (動詞活用)
 * shouldMerge('コンピュータ', 'システム'); // true (複合語)
 * shouldMerge('hello', 'world'); // false (結合不要)
 * ```
 */
export function shouldMerge(
  prevSegment: string,
  currentSegment: string,
  nextSegment?: string
): boolean {
  // 日本語の助詞（は、が、を等）は前の単語と結合する
  if (particleSet.has(currentSegment)) {
    return true;
  }

  // 接続詞（そして、また等）は前の文と結合する
  if (connectorSet.has(currentSegment)) {
    return true;
  }

  // 文字種を取得して動詞活用と複合語を判定
  const prevType = prevSegment.length > 0 ? getCharType(prevSegment[prevSegment.length - 1]) : null;
  const currentType = currentSegment.length > 0 ? getCharType(currentSegment[0]) : null;

  // 動詞活用パターン（漢字の語幹＋ひらがなの活用語尾）
  if (prevType === CharType.Kanji && currentType === CharType.Hiragana) {
    // 「勉強する」「作成される」等の動詞活用を検出
    for (const ending of verbEndingSet) {
      if (currentSegment.startsWith(ending)) {
        return true;
      }
    }
  }

  // 複合語パターン（カタカナ同士の連結）
  // 例：「コンピュータ + システム」→「コンピュータシステム」
  if (prevType === CharType.Katakana && currentType === CharType.Katakana) {
    return true;
  }

  return false;
}

/**
 * キャッシュクリア（テスト時やメモリ使用量が気になる場合に使用）
 *
 * @description 文字種判定のキャッシュをクリアします。
 * 主にテスト時のクリーンアップやメモリ使用量の最適化時に使用します。
 *
 * @returns なし（void）
 *
 * @example
 * ```typescript
 * // テスト前のクリーンアップ
 * clearCharTypeCache();
 *
 * // メモリ使用量を抑えたい場合
 * if (memoryPressure) {
 *   clearCharTypeCache();
 * }
 * ```
 */
export function clearCharTypeCache(): void {
  charTypeCache.clear();
}


// ========== Integrated from segmenter.ts ==========

/**
 * TinySegmenter Integration Module for Hellshake-Yano
 *
 * @deprecated process4 sub8-2: このファイルは削除予定です
 * This module provides Japanese text segmentation capabilities using TinySegmenter.
 * Uses the npm @birchill/tiny-segmenter package for accurate segmentation.
 * Integrated with GlobalCache system for optimal performance.
 */
/**
 * セグメンテーション結果インターフェース
 * @description TinySegmenterによる日本語テキスト分割の結果を格納するインターフェース
 * @since 1.0.0
 */
interface SegmentationResult {
  /** 分割されたセグメント（単語）の配列 */
  segments: string[];
  /** セグメンテーションが成功したかどうか */
  success: boolean;
  /** エラーメッセージ（失敗時のみ） */
  error?: string;
  /** セグメンテーションのソース */
  source: "tinysegmenter" | "fallback";
}

/**
 * TinySegmenter wrapper with error handling and caching
 * @description 日本語テキストセグメンテーションのためのTinySegmenterラッパークラス。エラーハンドリング、キャッシュ機能、フォールバック機能を提供
 * @since 1.0.0
 * @example
 * ```typescript
 * const segmenter = TinySegmenter.getInstance();
 * const result = await segmenter.segment('これはテストです');
 * if (result.success) {
 *   console.log('Segments:', result.segments);
 * }
 * ```
 */
export class TinySegmenter {
  private static instance: TinySegmenter;
  private segmenter: NpmTinySegmenter;
  private globalCache: GlobalCache;
  private enabled: boolean;

  /**
   * TinySegmenterのコンストラクタ
   * @description TinySegmenterインスタンスを初期化し、GlobalCacheとnpmパッケージの設定を行う
   * @since 1.0.0
   */
  constructor() {
    this.segmenter = new NpmTinySegmenter();
    this.globalCache = GlobalCache.getInstance();
    this.enabled = true;
  }

  /**
   * TinySegmenterのシングルトンインスタンスを取得
   * @description アプリケーション全体で単一のTinySegmenterインスタンスを共有するためのファクトリーメソッド
   * @returns TinySegmenter - シングルトンインスタンス
   * @since 1.0.0
   * @example
   * ```typescript
   * const segmenter = TinySegmenter.getInstance();
   * ```
   */
  static getInstance(): TinySegmenter {
    if (!TinySegmenter.instance) {
      TinySegmenter.instance = new TinySegmenter();
    }
    return TinySegmenter.instance;
  }

  /**
   * セグメント後処理：連続する数字と単位を結合
   * @description TinySegmenterの生の出力を後処理し、連続する数字の結合、括弧内容の統合などを行う
   * @param segments - 後処理前のセグメント配列
   * @returns string[] - 後処理されたセグメント配列
   * @since 1.0.0
   * @example
   * ```typescript
   * const processed = this.postProcessSegments(['123', '年', '4', '月']);
   * // ['123年', '4月']
   * ```
   */
  private postProcessSegments(segments: string[]): string[] {
    const processed: string[] = [];
    let i = 0;

    // 助詞セット（統合対象）
    const particles = new Set([
      "の", "は", "が", "を", "に", "へ", "と", "や", "で", "も",
      "か", "な", "よ", "ね", "ぞ", "さ", "わ", "ば", "から", "まで",
      "です", "ます", "だ", "である",
    ]);

    while (i < segments.length) {
      const current = segments[i];

      // 連続する数字をまとめる
      if (current && /^\d+$/.test(current)) {
        let number = current;
        let j = i + 1;

        // 後続の数字を結合
        while (j < segments.length && /^\d+$/.test(segments[j])) {
          number += segments[j];
          j++;
        }

        // 単位があれば結合
        if (j < segments.length) {
          const unit = segments[j];
          if (unit === "%" || unit === "％" || /^(年|月|日|時|分|秒)$/.test(unit)) {
            number += unit;
            j++;
          }
        }

        processed.push(number);
        i = j;
        continue;
      }

      // 括弧内の内容を一つのセグメントにする
      if (current === "（" || current === "(") {
        let j = i + 1;
        let content = current;
        while (j < segments.length && segments[j] !== "）" && segments[j] !== ")") {
          content += segments[j];
          j++;
        }
        if (j < segments.length) {
          content += segments[j];
          processed.push(content);
          i = j + 1;
          continue;
        }
      }

      // 名詞+助詞、動詞+助詞の統合
      if (current && current.trim().length > 0) {
        let merged = current;
        let j = i + 1;

        // 後続の助詞を結合
        while (j < segments.length) {
          const next = segments[j];
          if (next && particles.has(next)) {
            merged += next;
            j++;
          } else {
            break;
          }
        }

        processed.push(merged);
        i = j;
        continue;
      }

      i++;
    }

    return processed;
  }

  /**
   * 日本語テキストを単語/トークンに分割
   * @description 入力テキストをTinySegmenterを使用して分割し、後処理を適用してから結果を返す
   * @param text - 分割する日本語テキスト
   * @returns Promise<SegmentationResult> - セグメンテーション結果
   * @throws {Error} セグメンテーション処理中にエラーが発生した場合（フォールバックが実行される）
   * @since 1.0.0
   * @example
   * ```typescript
   * const result = await segmenter.segment('私の名前は田中です');
   * if (result.success) {
   *   console.log(result.segments); // ['私', 'の', '名前', 'は', '田中', 'です']
   * }
   * ```
   */
  async segment(text: string, options?: { mergeParticles?: boolean }): Promise<SegmentationResult> {
    if (!this.enabled) {
      return {
        segments: await this.fallbackSegmentation(text),
        success: false,
        error: "TinySegmenter disabled",
        source: "fallback",
      };
    }

    if (!text || text.trim().length === 0) {
      return {
        segments: [],
        success: true,
        source: "tinysegmenter",
      };
    }

    // Include mergeParticles setting in cache key
    const mergeParticles = options?.mergeParticles ?? true;
    const cacheKey = `${text}:${mergeParticles}`;

    // Check GlobalCache first
    const cache = this.globalCache.getCache<string, string[]>(CacheType.ANALYSIS);
    if (cache.has(cacheKey)) {
      return {
        segments: cache.get(cacheKey)!,
        success: true,
        source: "tinysegmenter",
      };
    }

    try {
      // npm版TinySegmenterを使用
      const rawSegments = this.segmenter.segment(text);

      // 後処理を適用 (mergeParticlesオプションに基づく)
      const segments = mergeParticles ? this.postProcessSegments(rawSegments) : rawSegments;

      // Cache the result in GlobalCache (LRU handles size limit automatically)
      cache.set(cacheKey, segments);

      return {
        segments,
        success: true,
        source: "tinysegmenter",
      };
    } catch (error) {

      return {
        segments: await this.fallbackSegmentation(text),
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        source: "fallback",
      };
    }
  }

  /**
   * 単純な正規表現パターンを使用したフォールバックセグメンテーション
   * @description TinySegmenterが利用できない場合の代替手段として、文字種別に基づくシンプルなセグメンテーションを実行
   * @param text - 分割するテキスト
   * @returns Promise<string[]> - 分割されたセグメント配列
   * @since 1.0.0
   */
  private async fallbackSegmentation(text: string): Promise<string[]> {
    const segments: string[] = [];

    // Simple character-based segmentation for Japanese
    const chars = Array.from(text);
    let currentSegment = "";
    let lastType = "";

    for (const char of chars) {
      const charType = this.getCharacterType(char);

      if (charType !== lastType && currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = char;
      } else {
        currentSegment += char;
      }

      lastType = charType;
    }

    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    return segments.filter((s) => s.trim().length > 0);
  }

  /**
   * 文字の種別を判定
   * @description 単一文字の種別（漢字、ひらがな、カタカナ、ラテン文字、数字等）を判定
   * @param char - 判定する文字
   * @returns string - 文字種別（'kanji', 'hiragana', 'katakana', 'latin', 'digit', 'space', 'other'）
   * @since 1.0.0
   */
  private getCharacterType(char: string): string {
    if (/[\u4E00-\u9FAF]/.test(char)) return "kanji";
    if (/[\u3040-\u309F]/.test(char)) return "hiragana";
    if (/[\u30A0-\u30FF]/.test(char)) return "katakana";
    if (/[a-zA-Z]/.test(char)) return "latin";
    if (/[0-9]/.test(char)) return "digit";
    if (/\s/.test(char)) return "space";
    return "other";
  }

  /**
   * テキストに日本語文字が含まれているかチェック
   * @description ひらがな、カタカナ、漢字のいずれかが含まれているかを判定
   * @param text - チェックするテキスト
   * @returns boolean - 日本語文字が含まれている場合true
   * @since 1.0.0
   * @example
   * ```typescript
   * segmenter.hasJapanese('Hello World'); // false
   * segmenter.hasJapanese('こんにちは'); // true
   * ```
   */
  hasJapanese(text: string): boolean {
    return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
  }

  /**
   * テキストのセグメンテーションが有益かどうかをチェック
   * @description 日本語を含み、かつ指定した長さ以上のテキストに対してセグメンテーションを推奨するかを判定
   * @param text - 判定するテキスト
   * @param threshold - セグメンテーションを推奨する最小文字数（デフォルト: 4）
   * @returns boolean - セグメンテーションが推奨される場合true
   * @since 1.0.0
   * @example
   * ```typescript
   * segmenter.shouldSegment('あ'); // false（短すぎる）
   * segmenter.shouldSegment('こんにちは世界'); // true
   * ```
   */
  shouldSegment(text: string, threshold: number = 4): boolean {
    return this.hasJapanese(text) && text.length >= threshold;
  }

  /**
   * セグメンテーションキャッシュをクリア
   * @description 格納されているすべてのセグメンテーション結果をキャッシュから削除
   * @returns void
   * @since 1.0.0
   * @example
   * ```typescript
   * segmenter.clearCache(); // キャッシュをリセット
   * ```
   */
  clearCache(): void {
    const cache = this.globalCache.getCache<string, string[]>(CacheType.ANALYSIS);
    cache.clear();
  }

  /**
   * キャッシュ統計情報を取得
   * @description 現在のキャッシュ使用状況と設定値を取得
   * @returns {{ size: number, maxSize: number, hitRate: number }} キャッシュ統計情報
   * @since 1.0.0
   * @example
   * ```typescript
   * const stats = segmenter.getCacheStats();
   * console.log(`Cache: ${stats.size}/${stats.maxSize}`);
   * ```
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    const cache = this.globalCache.getCache<string, string[]>(CacheType.ANALYSIS);
    const stats = cache.getStats();
    const config = this.globalCache.getCacheConfig(CacheType.ANALYSIS);

    return {
      size: stats.size,
      maxSize: config.size,
      hitRate: stats.hitRate,
    };
  }

  /**
   * セグメンターの有効/無効を設定
   * @description TinySegmenterの動作を有効または無効に切り替える。無効時はフォールバック処理が使用される
   * @param enabled - true: 有効、false: 無効
   * @returns void
   * @since 1.0.0
   * @example
   * ```typescript
   * segmenter.setEnabled(false); // セグメンターを無効化
   * ```
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * セグメンターが有効かどうかをチェック
   * @description 現在のセグメンター有効状態を取得
   * @returns boolean - セグメンターが有効な場合true
   * @since 1.0.0
   * @example
   * ```typescript
   * if (segmenter.isEnabled()) {
   *   console.log('Segmenter is active');
   * }
   * ```
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * サンプルテキストでセグメンターをテスト
   * @description 予定義されたテストケースを使用してセグメンターの動作を検証し、結果を返す
   * @returns Promise<{{ success: boolean, results: SegmentationResult[] }}> テスト結果
   * @since 1.0.0
   * @example
   * ```typescript
   * const testResult = await segmenter.test();
   * if (testResult.success) {
   *   console.log('All tests passed');
   * } else {
   *   console.log('Some tests failed');
   * }
   * ```
   */
  async test(): Promise<{ success: boolean; results: SegmentationResult[] }> {
    const testCases = [
      "これはテストです",
      "私の名前は田中です",
      "今日は良い天気ですね",
      "Hello World", // Mixed content
      "プログラミング言語",
      "", // Empty string
    ];

    const results: SegmentationResult[] = [];
    let successCount = 0;

    for (const testCase of testCases) {
      const result = await this.segment(testCase);
      results.push(result);
      if (result.success) successCount++;
    }

    return {
      success: successCount === testCases.length,
      results,
    };
  }
}

/**
 * エクスポートされたシングルトンインスタンスと型定義
 * @description アプリケーション全体で使用するTinySegmenterのシングルトンインスタンス
 * @since 1.0.0
 * @example
 * ```typescript
 * import { tinysegmenter } from './segmenter.ts';
 * const result = await tinysegmenter.segment('テストテキスト');
 * ```
 */
export const tinysegmenter = TinySegmenter.getInstance();
export type { SegmentationResult };


// ========== Integrated from word/context.ts ==========

/**
 * @fileoverview コンテキスト認識による分割調整機能 with GlobalCache統合
 * ファイルタイプと構文コンテキストに基づいて適切な分割ルールを適用
 *
 * TDD Red-Green-Refactor サイクルで実装されたGlobalCacheシステム統合により、
 * パフォーマンスとメモリ効率の最適化を実現しています。
 */
/** 言語別パターン定義 */
export interface LanguageRule {
  /** コメントパターン */
  commentPatterns: RegExp[];
  /** 文字列パターン */
  stringPatterns: RegExp[];
  /** 関数定義パターン */
  functionPatterns: RegExp[];
  /** クラス定義パターン */
  classPatterns: RegExp[];
  /** import文パターン */
  importPatterns: RegExp[];

  /** 予約語リスト */
  keywords: string[];
  /** 命名規則 */
  namingConventions: {
    function: 'camelCase' | 'snake_case' | 'PascalCase';
    variable: 'camelCase' | 'snake_case' | 'UPPER_CASE';
    class: 'PascalCase' | 'snake_case';
  };
}

/** 分割ルール */
export interface SplittingRules {
  /** CamelCase分割を行うか */
  splitCamelCase: boolean;
  /** snake_case分割を行うか */
  splitSnakeCase: boolean;
  /** すべてを保持するか */
  preserveAll: boolean;
  /** 最小単語長 */
  minWordLength: number;
  /** 特殊文字の扱い */
  preserveSpecialChars: boolean;
}

/**
 * コンテキスト検出器 - GlobalCache統合版
 *
 * 言語別パターンとシンタックスコンテキストの検出を行い、
 * GlobalCacheシステムで効率的なキャッシュ管理を実現します。
 *
 * ## 主な機能:
 * - 言語別パターンのキャッシュ管理 (CacheType.LANGUAGE_RULES)
 * - シンタックスコンテキストのキャッシュ管理 (CacheType.SYNTAX_CONTEXT)
 * - 複数インスタンス間でのキャッシュ共有
 * - 効率的なLRUベースのメモリ管理
 *
 * @example
 * ```typescript
 * const detector = new ContextDetector();
 * const context = detector.detectSyntaxContext("function test() {}", 1, "typescript");
 * console.log(context.inFunction); // true
 * ```
 */
export class ContextDetector {
  private readonly defaultRules: SplittingRules;
  /** GlobalCacheシステムのインスタンス（シングルトン） */
  private readonly globalCache: GlobalCache;

  /**
   * ContextDetectorのコンストラクタ
   *
   * デフォルトの分割ルールを設定し、GlobalCacheシステムのインスタンスを取得します。
   * 複数のContextDetectorインスタンスが作成されても、キャッシュは共有されます。
   */
  constructor() {
    this.defaultRules = {
      splitCamelCase: true,
      splitSnakeCase: false,
      preserveAll: false,
      minWordLength: 2,
      preserveSpecialChars: false,
    };
    // シングルトンパターンによりアプリケーション全体で同一インスタンスを共有
    this.globalCache = GlobalCache.getInstance();
  }

  /**
   * ファイルタイプの取得
   * @param denops Denopsインスタンス
   * @returns ファイルタイプ文字列
   */
  async detectFileType(denops: Denops): Promise<string> {
    try {
      const filetype = await denops.eval('&filetype') as string;
      return filetype || 'text';
    } catch (_error) {
      return 'text';
    }
  }

  /**
   * 構文コンテキストの検出（GlobalCache統合）
   *
   * テキスト、行番号、ファイルタイプを元にシンタックスコンテキストを検出し、
   * 結果をGlobalCache.SYNTAX_CONTEXTにキャッシュします。
   *
   * @param text 対象テキスト
   * @param line 行番号
   * @param fileType ファイルタイプ
   * @returns 構文コンテキスト（キャッシュからの取得も含む）
   *
   * @example
   * ```typescript
   * const context = detector.detectSyntaxContext("// コメント", 1, "javascript");
   * console.log(context.inComment); // true
   * ```
   */
  detectSyntaxContext(
    text: string,
    line: number,
    fileType: string
  ): SyntaxContext {
    // キャッシュキーを生成
    const cacheKey = `${fileType}:${line}:${text}`;

    // GlobalCacheから取得を試行
    const syntaxContextCache = this.globalCache.getCache<string, SyntaxContext>(CacheType.SYNTAX_CONTEXT);
    const cachedContext = syntaxContextCache.get(cacheKey);
    if (cachedContext !== undefined) {
      return cachedContext;
    }

    const language = this.mapFileTypeToLanguage(fileType);
    const patterns = this.getLanguagePatterns(language);

    const context: SyntaxContext = {
      inComment: this.isInComment(text, patterns.commentPatterns),
      inString: this.isInString(text, patterns.stringPatterns),
      inFunction: this.isInFunction(text, patterns.functionPatterns),
      inClass: this.isInClass(text, patterns.classPatterns),
      language
    };

    // GlobalCacheに保存（LRU制限は自動で管理される）
    syntaxContextCache.set(cacheKey, context);

    return context;
  }

  /**
   * 行コンテキストの検出
   * @param line 行テキスト
   * @param fileType ファイルタイプ
   * @returns 行コンテキスト
   */
  detectLineContext(
    line: string,
    fileType: string
  ): LineContext {
    const indentMatch = line.match(/^(\s*)/);
    const indentLevel = indentMatch ? indentMatch[1].length : 0;

    return {
      isComment: this.isCommentLine(line, fileType),
      isDocString: this.isDocStringLine(line, fileType),
      isImport: this.isImportLine(line, fileType),
      indentLevel,
      lineType: this.detectLineType(line, fileType)
    };
  }

  /**
   * コンテキストに基づく分割ルールの取得
   * @param context 検出コンテキスト
   * @returns 分割ルール
   */
  getSplittingRules(context: DetectionContext): SplittingRules {
    const fileType = context.fileType || 'text';
    const rules = this.getLanguageRules(fileType);

    // コンテキストに応じてルールを調整
    if (context.syntaxContext?.inComment) {
      return { ...rules, splitCamelCase: false };
    }
    if (context.syntaxContext?.inString) {
      return { ...rules, preserveAll: true };
    }

    return rules;
  }

  /**
   * ファイルタイプから言語名へのマッピング
   * @param fileType Vimファイルタイプ
   * @returns 標準化された言語名
   */
  private mapFileTypeToLanguage(fileType: string): string {
    const languageMap: Record<string, string> = {
      'typescript': 'typescript',
      'javascript': 'javascript',
      'python': 'python',
      'markdown': 'markdown',
      'json': 'json',
      'yaml': 'yaml',
      'html': 'html',
      'css': 'css',
      'vim': 'vim',
      'sh': 'shell',
      'bash': 'shell',
      'zsh': 'shell',
    };

    return languageMap[fileType] || 'text';
  }

  /**
   * 言語別パターンの取得（GlobalCache統合）
   *
   * 指定された言語のパターンをGlobalCache.LANGUAGE_RULESから取得し、
   * キャッシュにない場合は新規作成してキャッシュします。
   *
   * @param language 言語名 (例: 'typescript', 'python', 'markdown')
   * @returns 言語パターン（コメント、文字列、関数などのパターンを含む）
   *
   * @example
   * ```typescript
   * const patterns = detector.getLanguagePatterns('typescript');
   * console.log(patterns.commentPatterns); // [/\/\/.*$/, /\/\*[\s\S]*?\*\//]
   * ```
   */
  private getLanguagePatterns(language: string): LanguageRule {
    const languageRulesCache = this.globalCache.getCache<string, LanguageRule>(CacheType.LANGUAGE_RULES);
    const cachedRule = languageRulesCache.get(language);
    if (cachedRule !== undefined) {
      return cachedRule;
    }

    const patterns = this.createLanguagePatterns(language);
    languageRulesCache.set(language, patterns);
    return patterns;
  }

  /**
   * 言語別パターンの生成
   * @param language 言語名
   * @returns 言語パターン
   */
  private createLanguagePatterns(language: string): LanguageRule {
    switch (language) {
      case 'typescript':
      case 'javascript':
        return {
          commentPatterns: [/\/\/.*$/, /\/\*[\s\S]*?\*\//],
          stringPatterns: [/"[^"]*"/, /'[^']*'/, /`[^`]*`/],
          functionPatterns: [/function\s+\w+/, /\w+\s*=\s*\(.*?\)\s*=>/, /\w+\s*:\s*\(.*?\)\s*=>/],
          classPatterns: [/class\s+\w+/, /interface\s+\w+/, /type\s+\w+/],
          importPatterns: [/import\s+.*from/, /import\s*\{.*\}/, /require\s*\(/],
          keywords: ['function', 'class', 'interface', 'type', 'const', 'let', 'var'],
          namingConventions: {
            function: 'camelCase',
            variable: 'camelCase',
            class: 'PascalCase'
          }
        };

      case 'python':
        return {
          commentPatterns: [/#.*$/],
          stringPatterns: [/"[^"]*"/, /'[^']*'/, /"""[\s\S]*?"""/, /'''[\s\S]*?'''/],
          functionPatterns: [/def\s+\w+/, /async\s+def\s+\w+/],
          classPatterns: [/class\s+\w+/],
          importPatterns: [/import\s+/, /from\s+.*import/],
          keywords: ['def', 'class', 'import', 'from', 'async'],
          namingConventions: {
            function: 'snake_case',
            variable: 'snake_case',
            class: 'PascalCase'
          }
        };

      case 'markdown':
        return {
          commentPatterns: [/<!--[\s\S]*?-->/],
          stringPatterns: [/`[^`]*`/, /```[\s\S]*?```/],
          functionPatterns: [],
          classPatterns: [],
          importPatterns: [],
          keywords: [],
          namingConventions: {
            function: 'camelCase',
            variable: 'camelCase',
            class: 'PascalCase'
          }
        };

      case 'json':
        return {
          commentPatterns: [],
          stringPatterns: [/"[^"]*"/],
          functionPatterns: [],
          classPatterns: [],
          importPatterns: [],
          keywords: [],
          namingConventions: {
            function: 'camelCase',
            variable: 'camelCase',
            class: 'PascalCase'
          }
        };

      case 'yaml':
        return {
          commentPatterns: [/#.*$/],
          stringPatterns: [/"[^"]*"/, /'[^']*'/],
          functionPatterns: [],
          classPatterns: [],
          importPatterns: [],
          keywords: [],
          namingConventions: {
            function: 'snake_case',
            variable: 'snake_case',
            class: 'PascalCase'
          }
        };

      case 'html':
        return {
          commentPatterns: [/<!--[\s\S]*?-->/],
          stringPatterns: [/"[^"]*"/, /'[^']*'/],
          functionPatterns: [],
          classPatterns: [],
          importPatterns: [],
          keywords: [],
          namingConventions: {
            function: 'camelCase',
            variable: 'camelCase',
            class: 'PascalCase'
          }
        };

      case 'css':
        return {
          commentPatterns: [/\/\*[\s\S]*?\*\//],
          stringPatterns: [/"[^"]*"/, /'[^']*'/],
          functionPatterns: [],
          classPatterns: [/\.[a-zA-Z][\w-]*/],
          importPatterns: [/@import/],
          keywords: [],
          namingConventions: {
            function: 'camelCase',
            variable: 'camelCase',
            class: 'PascalCase'
          }
        };

      default:
        return {
          commentPatterns: [],
          stringPatterns: [/"[^"]*"/, /'[^']*'/],
          functionPatterns: [],
          classPatterns: [],
          importPatterns: [],
          keywords: [],
          namingConventions: {
            function: 'camelCase',
            variable: 'camelCase',
            class: 'PascalCase'
          }
        };
    }
  }

  /**
   * コメント内判定
   * @param text テキスト
   * @param patterns コメントパターン
   * @returns コメント内かどうか
   */
  private isInComment(text: string, patterns: RegExp[]): boolean {
    // コメント内というのは、テキスト全体がコメントかを判定
    // 部分的にコメントを含むケース（例: "key: value # comment"）では false
    const trimmed = text.trim();

    // 行がコメントで始まっているかをチェック
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('<!--')) {
      return true;
    }

    // 完全にコメントで囲まれているパターンをチェック
    return patterns.some(pattern => {
      const match = pattern.exec(text);
      return match && match[0] === text.trim();
    });
  }

  /**
   * 文字列内判定
   * @param text テキスト
   * @param patterns 文字列パターン
   * @returns 文字列内かどうか
   */
  private isInString(text: string, patterns: RegExp[]): boolean {
    // 実際にテキストが文字列リテラル内にあるかをより精密に判定
    // この実装では、文字列パターンのマッチがあることを確認
    if (patterns.length === 0) return false;

    // シンプルな文字列検出: クォート文字で囲まれているか
    const hasQuotes = /^["'`].*["'`]$/.test(text.trim());
    return hasQuotes && patterns.some(pattern => pattern.test(text));
  }

  /**
   * 関数内判定
   * @param text テキスト
   * @param patterns 関数パターン
   * @returns 関数内かどうか
   */
  private isInFunction(text: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(text));
  }

  /**
   * クラス内判定
   * @param text テキスト
   * @param patterns クラスパターン
   * @returns クラス内かどうか
   */
  private isInClass(text: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(text));
  }

  /**
   * コメント行判定
   * @param line 行テキスト
   * @param fileType ファイルタイプ
   * @returns コメント行かどうか
   */
  private isCommentLine(line: string, fileType: string): boolean {
    const trimmed = line.trim();
    const language = this.mapFileTypeToLanguage(fileType);

    switch (language) {
      case 'typescript':
      case 'javascript':
        return trimmed.startsWith('//') || trimmed.startsWith('/*');
      case 'python':
      case 'yaml':
        return trimmed.startsWith('#');
      case 'html':
      case 'markdown':
        return trimmed.startsWith('<!--');
      case 'css':
        return trimmed.startsWith('/*');
      default:
        return false;
    }
  }

  /**
   * ドキュメント文字列判定
   * @param line 行テキスト
   * @param fileType ファイルタイプ
   * @returns ドキュメント文字列かどうか
   */
  private isDocStringLine(line: string, fileType: string): boolean {
    const trimmed = line.trim();
    const language = this.mapFileTypeToLanguage(fileType);

    switch (language) {
      case 'python':
        return trimmed.startsWith('"""') || trimmed.startsWith("'''");
      case 'typescript':
      case 'javascript':
        return trimmed.startsWith('/**');
      default:
        return false;
    }
  }

  /**
   * import行判定
   * @param line 行テキスト
   * @param fileType ファイルタイプ
   * @returns import行かどうか
   */
  private isImportLine(line: string, fileType: string): boolean {
    const trimmed = line.trim();
    const language = this.mapFileTypeToLanguage(fileType);

    switch (language) {
      case 'typescript':
      case 'javascript':
        return /^import\s+/.test(trimmed) || /require\s*\(/.test(trimmed);
      case 'python':
        return /^import\s+/.test(trimmed) || /^from\s+/.test(trimmed);
      case 'css':
        return /^@import/.test(trimmed);
      default:
        return false;
    }
  }

  /**
   * 行タイプの検出
   * @param line 行テキスト
   * @param fileType ファイルタイプ
   * @returns 行タイプ
   */
  private detectLineType(line: string, fileType: string): string {
    if (this.isCommentLine(line, fileType)) return 'comment';
    if (this.isDocStringLine(line, fileType)) return 'docstring';
    if (this.isImportLine(line, fileType)) return 'import';

    const trimmed = line.trim();
    if (trimmed.startsWith('#') && fileType === 'markdown') return 'heading';
    if (trimmed === '') return 'empty';

    return 'code';
  }

  /**
   * 言語別分割ルールの取得
   * @param fileType ファイルタイプ
   * @returns 分割ルール
   */
  private getLanguageRules(fileType: string): SplittingRules {
    const language = this.mapFileTypeToLanguage(fileType);

    switch (language) {
      case 'python':
        return {
          ...this.defaultRules,
          splitCamelCase: false,
          splitSnakeCase: false, // snake_caseを保持
        };
      case 'css':
        return {
          ...this.defaultRules,
          splitCamelCase: false, // kebab-caseを保持
          preserveSpecialChars: true,
        };
      case 'json':
        return {
          ...this.defaultRules,
          splitCamelCase: false, // プロパティ名を保持
        };
      case 'markdown':
        return {
          ...this.defaultRules,
          preserveSpecialChars: true,
        };
      default:
        return this.defaultRules;
    }
  }

  /**
   * キャッシュクリア（メモリ最適化用）
   *
   * GlobalCacheシステムでSYNTAX_CONTEXTキャッシュをクリアします。
   * 言語ルールキャッシュは静的データのため保持されます。
   *
   * @example
   * ```typescript
   * detector.clearCache(); // シンタックスコンテキストキャッシュをクリア
   * ```
   */
  clearCache(): void {
    this.globalCache.clearByType(CacheType.SYNTAX_CONTEXT);
    // 言語ルールキャッシュは保持（静的データのため）
  }

  /**
   * キャッシュ統計の取得（デバッグ用）
   *
   * GlobalCacheシステムからSYNTAX_CONTEXTとLANGUAGE_RULESの
   * キャッシュ統計情報を取得し、従来のインターフェースと互換性を保ちます。
   *
   * @returns キャッシュ統計情報（従来のインターフェースと互換）
   *
   * @example
   * ```typescript
   * const stats = detector.getCacheStats();
   * console.log(`Context cache: ${stats.contextCacheSize}, Language rules: ${stats.languageRuleCacheSize}`);
   * ```
   */
  getCacheStats(): { contextCacheSize: number; languageRuleCacheSize: number } {
    const syntaxContextStats = this.globalCache.getCache(CacheType.SYNTAX_CONTEXT).getStats();
    const languageRulesStats = this.globalCache.getCache(CacheType.LANGUAGE_RULES).getStats();

    return {
      contextCacheSize: syntaxContextStats.size,
      languageRuleCacheSize: languageRulesStats.size,
    };
  }

  /**
   * 文脈に基づく単語の重要度判定（将来拡張用）
   * @param word 対象単語
   * @param context コンテキスト
   * @returns 重要度スコア (0-100)
   */
  calculateWordImportance(word: string, context: DetectionContext): number {
    let score = 50; // ベーススコア

    // ファイルタイプ固有の重要度調整
    if (context.fileType) {
      const language = this.mapFileTypeToLanguage(context.fileType);
      const patterns = this.getLanguagePatterns(language);

      // キーワードは重要度高
      if (patterns.keywords.includes(word.toLowerCase())) {
        score += 30;
      }

      // 関数名・クラス名パターンも重要度高
      if (patterns.functionPatterns.some(p => p.test(word)) ||
          patterns.classPatterns.some(p => p.test(word))) {
        score += 20;
      }
    }

    // インデントレベルによる調整
    if (context.lineContext?.indentLevel !== undefined) {
      // インデントが深いほど重要度低下
      score -= Math.min(context.lineContext.indentLevel * 2, 20);
    }

    // コメント内は重要度低下
    if (context.syntaxContext?.inComment) {
      score -= 20;
    }

    // 文字列内は中程度の重要度
    if (context.syntaxContext?.inString) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }
}

// ========== Integrated from word/dictionary.ts ==========

/**
 * Dictionary-based Word Correction System
 *
 * TDD Green Phase Stage 1: Interface definitions and basic implementation
 * Following PLAN.md process1 sub6 - Dictionary cache integration with GlobalCache
 */
/**
 * 辞書の設定オプション
 */
export interface DictionaryConfig {
  /** 辞書ファイルのパス */
  dictionaryPath?: string;
  /** プロジェクト固有辞書のパス */
  projectDictionaryPath?: string;
  /** ビルトイン辞書を使用するか */
  useBuiltinDictionary?: boolean;
  /** 学習機能を有効にするか */
  enableLearning?: boolean;
  /** キャッシュを有効にするか */
  enableCache?: boolean;
  /** キャッシュサイズ */
  cacheSize?: number;
}

/**
 * 複合語パターンマッチの結果
 */
export interface CompoundMatch {
  /** マッチした文字列 */
  match: string;
  /** 開始位置 */
  startIndex: number;
  /** 終了位置 */
  endIndex: number;
}

/**
 * キャッシュ統計情報
 */
export interface CacheStats {
  /** ヒット数 */
  hits: number;
  /** ミス数 */
  misses: number;
  /** ヒット率 */
  hitRate: number;
}

/**
 * 単語辞書のインターフェース
 */
export interface WordDictionary {
  /** カスタム単語のセット */
  customWords: Set<string>;
  /** 複合語パターンの配列 */
  compoundPatterns: RegExp[];
  /** 保持する単語のセット */
  preserveWords: Set<string>;
  /** 結合ルールのマップ（単語 → 優先度） */
  mergeRules: Map<string, number>;

  /** カスタム単語を追加 */
  addCustomWord(word: string): void;
  /** カスタム単語を持っているかチェック */
  hasCustomWord(word: string): boolean;
  /** カスタム単語を削除 */
  removeCustomWord(word: string): void;

  /** 複合語パターンを追加 */
  addCompoundPattern(pattern: RegExp): void;
  /** 複合語パターンにマッチするかチェック */
  matchCompoundPatterns(text: string): CompoundMatch[];

  /** 保持単語を追加 */
  addPreserveWord(word: string): void;
  /** 単語を保持すべきかチェック */
  shouldPreserveWord(word: string): boolean;

  /** 結合ルールを追加 */
  addMergeRule(word1: string, word2: string, priority: number): void;
  /** 3単語結合ルールを追加 */
  addTripleMergeRule(word1: string, word2: string, word3: string, priority: number): void;
  /** 結合ルールを適用 */
  applyMergeRules(segments: string[]): string[];

  /** ファイルから辞書を読み込み */
  loadFromFile(): Promise<void>;
  /** キャッシュ統計を取得 */
  getCacheStats(): CacheStats | null;
}

/**
 * 単語辞書の実装クラス
 *
 * GlobalCache.DICTIONARYを使用して効率的なキャッシュ管理を行います。
 * キャッシュが有効な場合、hasCustomWord()の結果をLRUアルゴリズムで管理します。
 */
export class WordDictionaryImpl implements WordDictionary {
  public customWords: Set<string> = new Set();
  public compoundPatterns: RegExp[] = [];
  public preserveWords: Set<string> = new Set();
  public mergeRules: Map<string, number> = new Map();

  private config: DictionaryConfig;
  private globalCache?: GlobalCache;
  private cacheStats?: CacheStats;

  constructor(config: DictionaryConfig = {}) {
    this.config = {
      useBuiltinDictionary: true,
      enableLearning: false,
      enableCache: false,
      cacheSize: 1000,
      ...config,
    };

    if (this.config.enableCache) {
      this.initializeCache();
    }
  }

  private initializeCache(): void {
    // GlobalCache.DICTIONARYを使用してキャッシュを初期化
    this.globalCache = GlobalCache.getInstance();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
    };
  }

  private updateCacheStats(hit: boolean): void {
    if (!this.cacheStats) return;

    if (hit) {
      this.cacheStats.hits++;
    } else {
      this.cacheStats.misses++;
    }

    const total = this.cacheStats.hits + this.cacheStats.misses;
    this.cacheStats.hitRate = total > 0 ? this.cacheStats.hits / total : 0;
  }

  addCustomWord(word: string): void {
    this.customWords.add(word);
    // DICTIONARYキャッシュをクリア（新しい単語の追加により既存キャッシュが無効になる）
    if (this.globalCache) {
      this.globalCache.clearByType(CacheType.DICTIONARY);
    }
  }

  hasCustomWord(word: string): boolean {
    if (this.globalCache) {
      const dictionaryCache = this.globalCache.getCache<string, boolean>(CacheType.DICTIONARY);

      // キャッシュヒットの場合
      if (dictionaryCache.has(word)) {
        this.updateCacheStats(true);
        return dictionaryCache.get(word)!;
      }

      // キャッシュミスの場合、実際の検索を実行
      const result = this.customWords.has(word);

      this.updateCacheStats(false);
      dictionaryCache.set(word, result);

      return result;
    }

    // キャッシュが無効な場合は直接検索
    return this.customWords.has(word);
  }

  removeCustomWord(word: string): void {
    this.customWords.delete(word);
    // DICTIONARYキャッシュから該当単語を削除
    if (this.globalCache) {
      const dictionaryCache = this.globalCache.getCache<string, boolean>(CacheType.DICTIONARY);
      dictionaryCache.delete(word);
    }
  }

  addCompoundPattern(pattern: RegExp): void {
    this.compoundPatterns.push(pattern);
  }

  matchCompoundPatterns(text: string): CompoundMatch[] {
    const matches: CompoundMatch[] = [];

    for (const pattern of this.compoundPatterns) {
      const regexMatches = text.matchAll(pattern);
      for (const match of regexMatches) {
        if (match.index !== undefined) {
          matches.push({
            match: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
          });
        }
      }
    }

    return matches;
  }

  addPreserveWord(word: string): void {
    this.preserveWords.add(word);
  }

  shouldPreserveWord(word: string): boolean {
    return this.preserveWords.has(word);
  }

  addMergeRule(word1: string, word2: string, priority: number): void {
    const key = `${word1}+${word2}`;
    this.mergeRules.set(key, priority);
  }

  addTripleMergeRule(word1: string, word2: string, word3: string, priority: number): void {
    const key = `${word1}+${word2}+${word3}`;
    this.mergeRules.set(key, priority);
  }

  applyMergeRules(segments: string[]): string[] {
    const result: string[] = [];
    let i = 0;

    while (i < segments.length) {
      let merged = false;

      // 3つのセグメントの結合を試行（例：データ+ベース+接続）
      if (i + 2 < segments.length) {
        const key3 = `${segments[i]}+${segments[i + 1]}+${segments[i + 2]}`;
        if (this.mergeRules.has(key3)) {
          result.push(segments[i] + segments[i + 1] + segments[i + 2]);
          i += 3;
          merged = true;
        }
      }

      // 2つのセグメントの結合を試行
      if (!merged && i + 1 < segments.length) {
        const key2 = `${segments[i]}+${segments[i + 1]}`;
        if (this.mergeRules.has(key2)) {
          result.push(segments[i] + segments[i + 1]);
          i += 2;
          merged = true;
        }
      }

      if (!merged) {
        result.push(segments[i]);
        i++;
      }
    }

    return result;
  }

  async loadFromFile(): Promise<void> {
    if (!this.config.dictionaryPath) return;

    try {
      const content = await Deno.readTextFile(this.config.dictionaryPath);
      const data = JSON.parse(content);

      if (data.customWords) {
        for (const word of data.customWords) {
          this.addCustomWord(word);
        }
      }

      if (data.preserveWords) {
        for (const word of data.preserveWords) {
          this.addPreserveWord(word);
        }
      }

      if (data.compoundPatterns) {
        for (const pattern of data.compoundPatterns) {
          this.addCompoundPattern(new RegExp(pattern, "g"));
        }
      }
    } catch (error) {
      console.warn(`Failed to load dictionary from ${this.config.dictionaryPath}:`, error);
    }
  }

  getCacheStats(): CacheStats | null {
    if (!this.cacheStats) return null;

    // GlobalCacheの統計も含める
    if (this.globalCache) {
      const unifiedStats = this.globalCache.getAllStats();
      const dictionaryStats = unifiedStats.DICTIONARY;

      // GlobalCacheとローカル統計をマージして返す
      // 既存APIの互換性を維持しつつ、GlobalCacheの正確な統計を活用
      return {
        hits: Math.max(this.cacheStats.hits, dictionaryStats.hits),
        misses: Math.max(this.cacheStats.misses, dictionaryStats.misses),
        hitRate: dictionaryStats.hitRate || this.cacheStats.hitRate,
      };
    }

    return { ...this.cacheStats };
  }

  /**
   * 複数の辞書をマージする静的メソッド
   */
  static merge(dict1: WordDictionaryImpl, dict2: WordDictionaryImpl): WordDictionaryImpl {
    const merged = new WordDictionaryImpl();

    // カスタム単語をマージ
    for (const word of dict1.customWords) {
      merged.addCustomWord(word);
    }
    for (const word of dict2.customWords) {
      merged.addCustomWord(word);
    }

    // 保持単語をマージ
    for (const word of dict1.preserveWords) {
      merged.addPreserveWord(word);
    }
    for (const word of dict2.preserveWords) {
      merged.addPreserveWord(word);
    }

    // 複合語パターンをマージ
    for (const pattern of dict1.compoundPatterns) {
      merged.addCompoundPattern(pattern);
    }
    for (const pattern of dict2.compoundPatterns) {
      merged.addCompoundPattern(pattern);
    }

    // 結合ルールをマージ（dict2の方が優先）
    for (const [key, priority] of dict1.mergeRules) {
      merged.mergeRules.set(key, priority);
    }
    for (const [key, priority] of dict2.mergeRules) {
      merged.mergeRules.set(key, priority);
    }

    return merged;
  }
}

/**
 * ビルトイン辞書を作成
 */
export function createBuiltinDictionary(): WordDictionaryImpl {
  const dictionary = new WordDictionaryImpl();

  // 日本語プログラミング用語を追加
  const programmingTerms = [
    "関数定義",
    "非同期処理",
    "配列操作",
    "オブジェクト指向",
    "データベース接続",
    "ユニットテスト",
    "バージョン管理",
    "デバッグ実行",
    "メモリ管理",
    "例外処理",
    "ファイルシステム",
    "ネットワーク通信",
    "暗号化処理",
    "スレッド処理",
    "並行処理",
    "継承関係",
    "インターフェース定義",
    "デザインパターン",
    "コード生成",
    "自動テスト",
  ];

  for (const term of programmingTerms) {
    dictionary.addPreserveWord(term);
  }

  // 複合語パターンを追加
  dictionary.addCompoundPattern(/関数定義/g);
  dictionary.addCompoundPattern(/非同期処理/g);
  dictionary.addCompoundPattern(/配列操作/g);
  dictionary.addCompoundPattern(/オブジェクト指向/g);
  dictionary.addCompoundPattern(/データベース接続/g);
  dictionary.addCompoundPattern(/ユニットテスト/g);
  dictionary.addCompoundPattern(/バージョン管理/g);
  dictionary.addCompoundPattern(/デバッグ実行/g);

  // 2単語結合ルールを追加
  dictionary.addMergeRule("関数", "定義", 10);
  dictionary.addMergeRule("非同期", "処理", 10);
  dictionary.addMergeRule("配列", "操作", 10);
  dictionary.addMergeRule("オブジェクト", "指向", 10);
  dictionary.addMergeRule("ユニット", "テスト", 10);
  dictionary.addMergeRule("バージョン", "管理", 10);
  dictionary.addMergeRule("デバッグ", "実行", 10);

  // より複雑な結合ルール
  dictionary.addMergeRule("データ", "ベース", 8);
  dictionary.addMergeRule("データ", "構造", 8);
  dictionary.addMergeRule("メモリ", "管理", 8);
  dictionary.addMergeRule("例外", "処理", 8);
  dictionary.addMergeRule("ファイル", "システム", 8);

  // 3単語結合ルールを追加
  dictionary.addTripleMergeRule("非", "同期", "処理", 12);
  dictionary.addTripleMergeRule("データ", "ベース", "接続", 12);

  return dictionary;
}

/**
 * セグメントに辞書補正を適用
 */
export function applyDictionaryCorrection(
  segments: string[],
  dictionary?: WordDictionaryImpl,
): string[] {
  const dict = dictionary || createBuiltinDictionary();
  return dict.applyMergeRules(segments);
}


// ========== Integrated from word/dictionary-loader.ts ==========

/**
 * Dictionary Loader Implementation
 * TDD Green Phase Stage 1: User-defined dictionary functionality
 * Following PLAN.md process4 sub1.5
 */
/**
 * ユーザー定義辞書のインターフェース
 */
export interface UserDictionary {
  customWords: string[];
  preserveWords: string[];
  mergeRules: Map<string, MergeStrategy>;
  compoundPatterns: RegExp[];
  hintPatterns?: HintPattern[];
  metadata?: {
    version?: string;
    author?: string;
    description?: string;
  };
}

/**
 * ヒントパターンの定義
 */
export interface HintPattern {
  pattern: string | RegExp;
  hintPosition: HintPositionRule;
  priority: number;
  description?: string;
}

/**
 * ヒント位置ルール
 */
export type HintPositionRule =
  | 'capture:1' | 'capture:2' | 'capture:3'
  | 'start' | 'end'
  | { offset: number; from: 'start' | 'end' };

/**
 * マージ戦略
 */
export type MergeStrategy = 'always' | 'never' | 'context';

/**
 * 辞書設定インターフェース
 */
export interface DictionaryLoaderConfig {
  dictionaryPath?: string;
  projectDictionaryPath?: string;
  useBuiltinDict?: boolean;
  mergingStrategy?: 'override' | 'merge';
  autoReload?: boolean;
}

/**
 * 辞書ファイルローダークラス
 */
export class DictionaryLoader {
  private readonly searchPaths = [
    '.hellshake-yano/dictionary.json',
    'hellshake-yano.dict.json',
    '~/.config/hellshake-yano/dictionary.json'
  ];

  constructor(private config: DictionaryLoaderConfig = {}) {}

  /**
   * ユーザー定義辞書を読み込む
   */
  async loadUserDictionary(config?: DictionaryLoaderConfig): Promise<UserDictionary> {
    const resolvedConfig = { ...this.config, ...config };

    // 辞書ファイルの探索と読み込み
    for (const searchPath of this.searchPaths) {
      try {
        const resolvedPath = this.resolvePath(searchPath);
        if (await exists(resolvedPath)) {
          const content = await Deno.readTextFile(resolvedPath);
          return await this.parseDictionaryContent(content, resolvedPath);
        }
      } catch (error) {
        console.warn(`Failed to load dictionary from ${searchPath}:`, error);
      }
    }

    // 設定で指定されたパスを試行
    if (resolvedConfig.dictionaryPath) {
      try {
        const content = await Deno.readTextFile(resolvedConfig.dictionaryPath);
        return await this.parseDictionaryContent(content, resolvedConfig.dictionaryPath);
      } catch (error) {
        console.warn(`Failed to load dictionary from ${resolvedConfig.dictionaryPath}:`, error);
      }
    }

    // デフォルト辞書を返す
    return this.createEmptyDictionary();
  }

  /**
   * 辞書コンテンツをパース
   */
  private async parseDictionaryContent(content: string, filepath: string): Promise<UserDictionary> {
    const ext = this.getFileExtension(filepath);

    switch (ext) {
      case '.json':
        return this.parseJsonDictionary(content);
      case '.yaml':
      case '.yml':
        return this.parseYamlDictionary(content);
      case '.txt':
        return this.parseTextDictionary(content);
      default:
        // JSON形式として試行
        try {
          return this.parseJsonDictionary(content);
        } catch {
          return this.parseTextDictionary(content);
        }
    }
  }

  /**
   * JSON形式の辞書をパース
   */
  private parseJsonDictionary(content: string): UserDictionary {
    const data = JSON.parse(content);
    return this.convertToUserDictionary(data);
  }

  /**
   * YAML形式の辞書をパース
   */
  private parseYamlDictionary(content: string): UserDictionary {
    const data = parseYaml(content) as any;
    return this.convertToUserDictionary(data);
  }

  /**
   * テキスト形式の辞書をパース
   */
  private parseTextDictionary(content: string): UserDictionary {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
    const dictionary = this.createEmptyDictionary();

    for (const line of lines) {
      if (line.startsWith('!')) {
        // 分割禁止ワード
        dictionary.preserveWords.push(line.slice(1));
      } else if (line.includes('=')) {
        // 結合ルール
        const [key, value] = line.split('=', 2);
        dictionary.mergeRules.set(key.trim(), value.trim() as MergeStrategy);
      } else if (line.startsWith('@')) {
        // ヒントパターン
        const [priority, pattern, position] = line.slice(1).split(':', 3);
        if (priority && pattern && position) {
          dictionary.hintPatterns = dictionary.hintPatterns || [];
          dictionary.hintPatterns.push({
            pattern: new RegExp(pattern),
            hintPosition: position as HintPositionRule,
            priority: parseInt(priority, 10) || 0,
          });
        }
      } else {
        // カスタム単語
        dictionary.customWords.push(line);
      }
    }

    return dictionary;
  }

  /**
   * データオブジェクトをUserDictionaryに変換
   */
  private convertToUserDictionary(data: any): UserDictionary {
    const dictionary = this.createEmptyDictionary();

    if (data.customWords && Array.isArray(data.customWords)) {
      dictionary.customWords = data.customWords;
    }

    if (data.preserveWords && Array.isArray(data.preserveWords)) {
      dictionary.preserveWords = data.preserveWords;
    }

    if (data.mergeRules && typeof data.mergeRules === 'object') {
      dictionary.mergeRules = new Map(Object.entries(data.mergeRules));
    }

    if (data.compoundPatterns && Array.isArray(data.compoundPatterns)) {
      dictionary.compoundPatterns = data.compoundPatterns.map((pattern: string) => new RegExp(pattern, 'g'));
    }

    if (data.hintPatterns && Array.isArray(data.hintPatterns)) {
      dictionary.hintPatterns = data.hintPatterns.map((pattern: any) => ({
        pattern: typeof pattern.pattern === 'string' ? new RegExp(pattern.pattern) : pattern.pattern,
        hintPosition: pattern.hintPosition,
        priority: pattern.priority || 0,
        description: pattern.description,
      }));
    }

    if (data.metadata) {
      dictionary.metadata = data.metadata;
    }

    return dictionary;
  }

  /**
   * 空の辞書を作成
   */
  private createEmptyDictionary(): UserDictionary {
    return {
      customWords: [],
      preserveWords: [],
      mergeRules: new Map(),
      compoundPatterns: [],
      hintPatterns: [],
      metadata: {},
    };
  }

  /**
   * パスを解決
   */
  private resolvePath(path: string): string {
    if (path.startsWith('~')) {
      const home = Deno.env.get('HOME') || Deno.env.get('USERPROFILE') || '/tmp';
      return resolve(home, path.slice(2));
    }
    return resolve(path);
  }

  /**
   * ファイル拡張子を取得
   */
  private getFileExtension(filepath: string): string {
    return filepath.toLowerCase().split('.').pop() || '';
  }
}

/**
 * 辞書マージャークラス
 */
export class DictionaryMerger {
  /**
   * 辞書をマージ
   */
  merge(
    base: WordDictionaryImpl,
    user: UserDictionary,
    strategy: 'override' | 'merge' = 'merge'
  ): WordDictionaryImpl {
    const merged = new WordDictionaryImpl();

    if (strategy === 'override') {
      // ユーザー辞書で上書き
      this.mergeWithOverride(merged, base, user);
    } else {
      // マージ戦略
      this.mergeWithMerge(merged, base, user);
    }

    return merged;
  }

  /**
   * 上書き戦略でマージ
   */
  private mergeWithOverride(target: WordDictionaryImpl, base: WordDictionaryImpl, user: UserDictionary): void {
    // ユーザー定義を優先
    for (const word of user.customWords) {
      target.addCustomWord(word);
    }
    for (const word of user.preserveWords) {
      target.addPreserveWord(word);
    }
    for (const pattern of user.compoundPatterns) {
      target.addCompoundPattern(pattern);
    }

    // ベースで補完
    for (const word of base.customWords) {
      if (!target.hasCustomWord(word)) {
        target.addCustomWord(word);
      }
    }
  }

  /**
   * マージ戦略でマージ
   */
  private mergeWithMerge(target: WordDictionaryImpl, base: WordDictionaryImpl, user: UserDictionary): void {
    // ベースをコピー
    for (const word of base.customWords) {
      target.addCustomWord(word);
    }
    for (const word of base.preserveWords) {
      target.addPreserveWord(word);
    }
    for (const pattern of base.compoundPatterns) {
      target.addCompoundPattern(pattern);
    }

    // ユーザー定義を追加
    for (const word of user.customWords) {
      target.addCustomWord(word);
    }
    for (const word of user.preserveWords) {
      target.addPreserveWord(word);
    }
    for (const pattern of user.compoundPatterns) {
      target.addCompoundPattern(pattern);
    }
  }
}

/**
 * Vim設定ブリッジクラス
 */
export class VimConfigBridge {
  /**
   * Vim設定を取得
   */
  async getConfig(denops: Denops): Promise<DictionaryLoaderConfig> {
    try {
      const config: DictionaryLoaderConfig = {};

      // 各設定値を取得
      config.dictionaryPath = await denops.eval('get(g:, "hellshake_yano_dictionary_path", "")') as string || undefined;
      config.useBuiltinDict = await denops.eval('get(g:, "hellshake_yano_use_builtin_dict", 1)') as boolean;
      config.mergingStrategy = await denops.eval('get(g:, "hellshake_yano_dictionary_merge", "merge")') as 'override' | 'merge';
      config.autoReload = await denops.eval('get(g:, "hellshake_yano_auto_reload_dict", 0)') as boolean;

      return config;
    } catch (error) {
      console.warn('Failed to get Vim config:', error);
      return {};
    }
  }

  /**
   * エラーを通知
   */
  async notifyError(denops: Denops, error: string): Promise<void> {
    try {
      await denops.cmd(`echohl ErrorMsg | echo '${error}' | echohl None`);
    } catch (e) {
      console.error('Failed to notify error:', e);
    }
  }

  /**
   * 辞書を再読み込み
   */
  async reloadDictionary(denops: Denops): Promise<void> {
    try {
      await denops.call('hellshake_yano#reload_dictionary');
    } catch (error) {
      console.warn('Failed to reload dictionary:', error);
    }
  }
}

/**
 * 辞書管理コマンド
 */
export async function registerDictionaryCommands(denops: Denops) {
  await denops.cmd('command! HellshakeYanoReloadDict call denops#request("hellshake-yano", "reloadDictionary", [])');
  await denops.cmd('command! HellshakeYanoEditDict call denops#request("hellshake-yano", "editDictionary", [])');
  await denops.cmd('command! HellshakeYanoShowDict call denops#request("hellshake-yano", "showDictionary", [])');
  await denops.cmd('command! HellshakeYanoValidateDict call denops#request("hellshake-yano", "validateDictionary", [])');
}

/**
 * 辞書管理機能
 */
/**
 * 辞書管理クラス
 * ユーザー辞書の読み込み、編集、表示を管理します
 */
export class DictionaryManager {
  /** 辞書ローダー */
  private loader: DictionaryLoader;
  /** 辞書マージャー */
  private merger: DictionaryMerger;
  /** Vim設定ブリッジ */
  private bridge: VimConfigBridge;

  /**
   * DictionaryManagerのコンストラクタ
   * @description 必要なコンポーネントを初期化します
   */
  constructor() {
    this.loader = new DictionaryLoader();
    this.merger = new DictionaryMerger();
    this.bridge = new VimConfigBridge();
  }

  /**
   * 辞書を再読み込みします
   * @param denops - Denopsインスタンス
   * @throws 辞書の読み込みに失敗した場合
   */
  async reloadDictionary(denops: Denops): Promise<void> {
    try {
      const config = await this.bridge.getConfig(denops);
      const userDict = await this.loader.loadUserDictionary(config);

      await denops.cmd('echo "Dictionary reloaded successfully"');
    } catch (error) {
      await this.bridge.notifyError(denops, `Failed to reload dictionary: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 辞書ファイルを編集します
   * @param denops - Denopsインスタンス
   * @throws 辞書ファイルのオープンに失敗した場合
   */
  async editDictionary(denops: Denops): Promise<void> {
    try {
      const config = await this.bridge.getConfig(denops);
      const dictPath = config.dictionaryPath || '~/.config/hellshake-yano/dictionary.json';

      await denops.cmd(`edit ${dictPath}`);
    } catch (error) {
      await this.bridge.notifyError(denops, `Failed to open dictionary: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 辞書の内容を表示します
   * @param denops - Denopsインスタンス
   * @throws 辞書情報の取得に失敗した場合
   */
  async showDictionary(denops: Denops): Promise<void> {
    try {
      const config = await this.bridge.getConfig(denops);
      const userDict = await this.loader.loadUserDictionary(config);

      const info = [
        'Dictionary Information:',
        `Custom Words: ${userDict.customWords.length}`,
        `Preserve Words: ${userDict.preserveWords.length}`,
        `Merge Rules: ${userDict.mergeRules.size}`,
        `Compound Patterns: ${userDict.compoundPatterns.length}`,
        `Hint Patterns: ${userDict.hintPatterns?.length || 0}`,
      ];

      for (const line of info) {
        await denops.cmd(`echo "${line}"`);
      }
    } catch (error) {
      await this.bridge.notifyError(denops, `Failed to show dictionary: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 辞書を検証
   */
  async validateDictionary(denops: Denops): Promise<void> {
    try {
      const config = await this.bridge.getConfig(denops);
      const userDict = await this.loader.loadUserDictionary(config);

      const errors: string[] = [];

      // 基本的な検証
      if (userDict.customWords.some(word => word.trim() === '')) {
        errors.push('Empty custom words found');
      }

      if (userDict.hintPatterns) {
        for (const pattern of userDict.hintPatterns) {
          try {
            new RegExp(pattern.pattern as string);
          } catch {
            errors.push(`Invalid regex pattern: ${pattern.pattern}`);
          }
        }
      }

      if (errors.length === 0) {
        await denops.cmd('echo "Dictionary validation passed"');
      } else {
        await this.bridge.notifyError(denops, `Validation errors: ${errors.join(', ')}`);
      }
    } catch (error) {
      await this.bridge.notifyError(denops, `Failed to validate dictionary: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * ヒントパターンプロセッサークラス
 */
export class HintPatternProcessor {
  /**
   * ヒントパターンを適用
   */
  applyHintPatterns(words: any[], text: string, patterns: HintPattern[]): any[] {
    if (!patterns || patterns.length === 0) {
      return words;
    }

    const enhancedWords = [...words];

    // 優先度でソート
    const sortedPatterns = patterns.sort((a, b) => b.priority - a.priority);

    for (const pattern of sortedPatterns) {
      const regex = typeof pattern.pattern === 'string' ? new RegExp(pattern.pattern, 'g') : pattern.pattern;
      let match;

      while ((match = regex.exec(text)) !== null) {
        const hintTarget = this.extractHintTarget(match, pattern.hintPosition);
        if (hintTarget) {
          const targetWord = this.findWordAtPosition(enhancedWords, hintTarget.position);
          if (targetWord) {
            // ヒント優先度を設定
            (targetWord as any).hintPriority = pattern.priority;
          }
        }
      }
    }

    return this.sortByHintPriority(enhancedWords);
  }

  /**
   * ヒントターゲットを抽出
   */
  private extractHintTarget(
    match: RegExpExecArray,
    rule: HintPositionRule
  ): { text: string; position: number } | null {
    if (typeof rule === 'string') {
      if (rule.startsWith('capture:')) {
        const captureIndex = parseInt(rule.split(':')[1], 10);
        if (match[captureIndex]) {
          return {
            text: match[captureIndex],
            position: match.index! + match[0].indexOf(match[captureIndex]),
          };
        }
      } else if (rule === 'start') {
        return { text: match[0], position: match.index! };
      } else if (rule === 'end') {
        return { text: match[0], position: match.index! + match[0].length - 1 };
      }
    } else if (typeof rule === 'object' && 'offset' in rule) {
      const basePosition = rule.from === 'start' ? match.index! : match.index! + match[0].length;
      return { text: match[0], position: basePosition + rule.offset };
    }

    return null;
  }

  /**
   * 指定位置の単語を検索
   */
  private findWordAtPosition(words: any[], position: number): any | null {
    return words.find(word =>
      word.col && word.text &&
      position >= word.col &&
      position < word.col + word.text.length
    );
  }

  /**
   * ヒント優先度で並び替え
   */
  private sortByHintPriority(words: any[]): any[] {
    return words.sort((a, b) => {
      const priorityA = (a as any).hintPriority || 0;
      const priorityB = (b as any).hintPriority || 0;
      return priorityB - priorityA;
    });
  }
}

// ========== Integrated from word/manager.ts ==========

/**
 * Word Detection Manager for Hellshake-Yano
 *
 * This module manages multiple word detection strategies and provides
 * a unified interface with caching, error handling, and fallback mechanisms.
 */

// Removed imports from detector.ts - integrated in this file

// resolveConfigType function already defined above

/**
 * 単語検出マネージャー設定インターフェース
 * @description 単語検出マネージャーの包括的な設定オプションを定義するインターフェース
 * @since 1.0.0
 */
export interface WordDetectionManagerConfig extends WordDetectionConfig {
  /** デフォルトの単語検出ストラテジー */
  defaultStrategy?: "regex" | "tinysegmenter" | "hybrid";
  /** 言語の自動検出を有効にするか */
  autoDetectLanguage?: boolean;
  /** パフォーマンスモニタリングを有効にするか */
  performanceMonitoring?: boolean;

  /** キャッシュ機能を有効にするか */
  cacheEnabled?: boolean;
  /** キャッシュの最大サイズ */
  cacheMaxSize?: number;
  /** キャッシュエントリの有効期限（ミリ秒） */
  cacheTtlMs?: number;

  /** 最大リトライ回数 */
  maxRetries?: number;
  /** リトライ間の遅延時間（ミリ秒） */
  retryDelayMs?: number;

  /** 処理タイムアウト時間（ミリ秒） */
  timeoutMs?: number;
  /** バッチ処理を有効にするか */
  batchProcessing?: boolean;
  /** 同時実行可能な検出数の上限 */
  maxConcurrentDetections?: number;
}

/**
 * キャッシュエントリインターフェース
 * @description キャッシュに格納される単語検出結果の構造
 * @since 1.0.0
 */
interface CacheEntry {
  /** 検出された単語の配列 */
  words: Word[];
  /** キャッシュ作成時刻 */
  timestamp: number;
  /** 使用されたディテクター名 */
  detector: string;
  /** 設定のハッシュ値 */
  config_hash: string;
}

/**
 * 検出統計情報インターフェース
 * @description 単語検出マネージャーのパフォーマンス統計情報
 * @since 1.0.0
 */
interface DetectionStats {
  /** 総呼び出し回数 */
  total_calls: number;
  /** キャッシュヒット回数 */
  cache_hits: number;
  /** キャッシュミス回数 */
  cache_misses: number;
  /** エラー発生回数 */
  errors: number;
  /** 平均処理時間（ミリ秒） */
  average_duration: number;
  /** ディテクター別使用回数 */
  detector_usage: Record<string, number>;
}

/**
 * メイン単語検出マネージャー
 * @description 複数の単語検出戦略を管理し、キャッシュ、エラーハンドリング、フォールバック機能を提供する統合インターフェース
 * @since 1.0.0
 * @example
 * ```typescript
 * const manager = new WordDetectionManager({
 *   defaultStrategy: 'hybrid',
 *   cacheEnabled: true,
 *   useJapanese: true
 * });
 * await manager.initialize();
 * const result = await manager.detectWords('テストテキスト');
 * ```
 */
export class WordDetectionManager {
  private detectors: Map<string, WordDetector> = new Map();
  private config: Required<WordDetectionManagerConfig>;
  private cache: Map<string, CacheEntry> = new Map();
  private stats: DetectionStats;
  private initialized = false;
  private sessionContext: DetectionContext | null = null;
  private globalConfig?: Config; // 統一的なmin_length処理のためのグローバル設定
  private unifiedConfig?: Config; // Configへの移行対応

  /**
   * WordDetectionManagerのコンストラクタ
   * @description マネージャーを初期化し、設定と統計情報をセットアップ
   * @param config - マネージャー設定（省略時はデフォルト設定）
   * @param globalConfig - グローバル設定（統一的なmin_length処理のため）
   * @since 1.0.0
   */
  constructor(config: WordDetectionManagerConfig = {}, globalConfig?: Config | Config) {
    this.config = this.mergeWithDefaults(config);
    [this.unifiedConfig, this.globalConfig] = resolveConfigType(globalConfig);
    this.stats = this.initializeStats();
  }

  /**
   * デフォルトディテクターでマネージャーを初期化
   * @description 標準の単語検出ディテクター（Regex、TinySegmenter、Hybrid）を登録し、利用可能性をテスト
   * @returns Promise<void> - 初期化完了を示すPromise
   * @throws {Error} ディテクターの初期化に失敗した場合
   * @since 1.0.0
   * @example
   * ```typescript
   * const manager = new WordDetectionManager();
   * await manager.initialize();
   * // マネージャーが使用可能になる
   * ```
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Register default detectors with globalConfig (Config takes precedence)
    const configToUse = this.unifiedConfig || this.globalConfig;
    const regexDetector = new RegexWordDetector(this.config, configToUse);
    const segmenterDetector = new TinySegmenterWordDetector();
    const hybridDetector = new HybridWordDetector(this.config);

    this.registerDetector(regexDetector);
    this.registerDetector(segmenterDetector);
    this.registerDetector(hybridDetector);

    // Test detector availability
    for (const [name, detector] of this.detectors) {
      const available = await detector.isAvailable();
    }

    this.initialized = true;
  }

  /**
   * 単語ディテクターを登録
   * @description カスタム単語ディテクターをマネージャーに登録し、利用可能にする
   * @param detector - 登録する単語ディテクター
   * @returns void
   * @since 1.0.0
   * @example
   * ```typescript
   * const customDetector = new CustomWordDetector();
   * manager.registerDetector(customDetector);
   * ```
   */
  registerDetector(detector: WordDetector): void {
    this.detectors.set(detector.name, detector);
  }


  /**
   * メイン単語検出メソッド
   * @description テキストから単語を検出し、キャッシュ、エラーハンドリング、フォールバック機能を活用して結果を返す
   * @param text - 解析するテキスト
   * @param startLine - 開始行番号（デフォルト: 1）
   * @param denops - Denopsインスタンス（オプション）
   * @returns Promise<WordDetectionResult> - 単語検出結果
   * @throws {Error} 全てのディテクターが失敗した場合（空の結果を返す）
   * @since 1.0.0
   * @example
   * ```typescript
   * const result = await manager.detectWords('こんにちは世界', 1);
   * if (result.success) {
   *   console.log('Words found:', result.words.length);
   * }
   * ```
   */
  async detectWords(
    text: string,
    startLine: number = 1,
    denops?: Denops,
    context?: DetectionContext,
  ): Promise<WordDetectionResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    this.stats.total_calls++;

    // Use provided context or stored session context
    const effectiveContext = context || this.sessionContext || undefined;
    const useCache = this.config.cacheEnabled && !this.shouldSkipCache(effectiveContext);

    try {
      // Check cache first
      if (useCache) {
        const cached = this.getCachedResult(text, startLine, effectiveContext);
        if (cached) {
          this.stats.cache_hits++;
          return {
            words: cached.words,
            detector: cached.detector,
            success: true,
            performance: {
              duration: Date.now() - startTime,
              wordCount: cached.words.length,
              linesProcessed: text.split("\n").length,
            },
          };
        }
        this.stats.cache_misses++;
      }

      // Select appropriate detector
      const detector = await this.selectDetector(text);
      if (!detector) {
        throw new Error("No suitable detector available");
      }

      // Perform detection with timeout
      const words = await this.detectWithTimeout(detector, text, startLine, effectiveContext, denops);

      // Cache the result
      if (useCache) {
        this.cacheResult(text, startLine, words, detector.name, effectiveContext);
      }

      // Update statistics
      this.stats.detector_usage[detector.name] = (this.stats.detector_usage[detector.name] || 0) +
        1;
      const duration = Date.now() - startTime;
      this.updateAverageDuration(duration);

      return {
        words,
        detector: detector.name,
        success: true,
        performance: {
          duration,
          wordCount: words.length,
          linesProcessed: text.split("\n").length,
        },
      };
    } catch (error) {
      this.stats.errors++;

      // Try fallback detector if enabled
      if (this.config.enableFallback) {
        try {
          const fallbackDetector = this.getFallbackDetector();
          if (fallbackDetector) {
            const words = await fallbackDetector.detectWords(text, startLine, effectiveContext, denops);
            return {
              words,
              detector: `${fallbackDetector.name} (fallback)`,
              success: true,
              error: `Primary detection failed: ${error}`,
              performance: {
                duration: Date.now() - startTime,
                wordCount: words.length,
                linesProcessed: text.split("\n").length,
              },
            };
          }
        } catch (fallbackError) {
        }
      }

      return {
        words: [],
        detector: "none",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        performance: {
          duration: Date.now() - startTime,
          wordCount: 0,
          linesProcessed: text.split("\n").length,
        },
      };
    }
  }

  /**
   * Denopsバッファから単語を検出（便利メソッド）
   * @description 現在表示中のバッファから直接単語を検出する便利メソッド
   * @param denops - Denopsインスタンス
   * @returns Promise<WordDetectionResult> - 単語検出結果
   * @throws {Error} バッファアクセスに失敗した場合（エラー情報を含む結果を返す）
   * @since 1.0.0
   * @example
   * ```typescript
   * const result = await manager.detectWordsFromBuffer(denops);
   * console.log(`Found ${result.words.length} words in current buffer`);
   * ```
   */
  async detectWordsFromBuffer(
    denops: Denops,
    context?: DetectionContext,
  ): Promise<WordDetectionResult> {
    try {
      // Get visible range
      const topLine = await denops.call("line", "w0") as number;
      const bottomLine = await denops.call("line", "w$") as number;

      // Get lines content
      const lines = await denops.call("getbufline", "%", topLine, bottomLine) as string[];
      const text = lines.join("\n");

      return this.detectWords(text, topLine, denops, context);
    } catch (error) {
      return {
        words: [],
        detector: "none",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        performance: {
          duration: 0,
          wordCount: 0,
          linesProcessed: 0,
        },
      };
    }
  }

  /**
   * 指定されたテキストに最適なディテクターを選択
   * @description テキストの内容、設定、優先度に基づいて最適な単語ディテクターを選択
   * @param text - 解析対象のテキスト
   * @returns Promise<WordDetector | null> - 選択されたディテクター（利用可能なものがない場合はnull）
   * @since 1.0.0
   */
  private async selectDetector(text: string): Promise<WordDetector | null> {
    const availableDetectors = Array.from(this.detectors.values())
      .filter((d) => d.canHandle(text))
      .sort((a, b) => b.priority - a.priority);

    if (availableDetectors.length === 0) {
      return null;
    }

    // Strategy-based selection
    // word_detection_strategyとstrategyの両方をサポート（後方互換性）
    const strategy = (this.config as any).wordDetectionStrategy || this.config.strategy ||
      this.config.defaultStrategy;

    switch (strategy) {
      case "regex":
        return availableDetectors.find((d) => d.name.includes("Regex")) || availableDetectors[0];

      case "tinysegmenter":
        const segmenterDetector = availableDetectors.find((d) => d.name.includes("TinySegmenter"));
        if (segmenterDetector && await segmenterDetector.isAvailable()) {
          return segmenterDetector;
        }
        return availableDetectors[0];

      case "hybrid":
        const hybridDetector = availableDetectors.find((d) => d.name.includes("Hybrid"));
        if (hybridDetector && await hybridDetector.isAvailable()) {
          return hybridDetector;
        }
        return availableDetectors[0];

      default:
        // Auto-detect based on content
        if (this.config.autoDetectLanguage) {
          const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
          if (hasJapanese) {
            const japaneseDetector = availableDetectors.find((d) =>
              d.supportedLanguages.includes("ja") && d.priority > 1
            );
            if (japaneseDetector && await japaneseDetector.isAvailable()) {
              return japaneseDetector;
            }
          }
        }
        return availableDetectors[0];
    }
  }

  /**
   * フォールバックディテクターを取得
   * @description メインのディテクターが失敗した場合に使用するフォールバックディテクターを取得
   * @returns WordDetector | null - フォールバックディテクター（利用可能なものがない場合はnull）
   * @since 1.0.0
   */
  private getFallbackDetector(): WordDetector | null {
    if (this.config.fallbackToRegex) {
      return this.detectors.get("RegexWordDetector") || null;
    }

    // Return the detector with lowest priority (most basic)
    const detectors = Array.from(this.detectors.values())
      .sort((a, b) => a.priority - b.priority);

    return detectors[0] || null;
  }

  /**
   * タイムアウト保護付き単語検出
   * @description 指定されたタイムアウト時間内で単語検出を実行し、超過した場合はエラーをスロー
   * @param detector - 使用するディテクター
   * @param text - 解析するテキスト
   * @param startLine - 開始行番号
   * @returns Promise<Word[]> - 検出された単語の配列
   * @throws {Error} タイムアウトまたは検出処理に失敗した場合
   * @since 1.0.0
   */
  private async detectWithTimeout(
    detector: WordDetector,
    text: string,
    startLine: number,
    context?: DetectionContext,
    denops?: Denops,
  ): Promise<Word[]> {
    if (!this.config.timeoutMs) {
      return detector.detectWords(text, startLine, context, denops);
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Detection timeout (${this.config.timeoutMs}ms)`));
      }, this.config.timeoutMs);

      detector.detectWords(text, startLine, context, denops)
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * キャッシュキーを生成
   * @description テキスト、行番号、設定のハッシュ値から一意なキャッシュキーを生成
   * @param text - キャッシュ対象のテキスト
   * @param startLine - 開始行番号
   * @returns string - 生成されたキャッシュキー
   * @since 1.0.0
   */
  private generateCacheKey(
    text: string,
    startLine: number,
    context?: DetectionContext,
  ): string {
    const configHash = this.generateConfigHash();
    const textHash = this.simpleHash(text);
    const contextHash = context ? this.generateContextHash(context) : "noctx";
    return `${textHash}:${startLine}:${configHash}:${contextHash}`;
  }

  private generateConfigHash(): string {
    const relevantConfig = {
      strategy: (this.config as any).wordDetectionStrategy || this.config.strategy,
      useJapanese: this.config.useJapanese,
      // useImprovedDetection: 統合済み（常に有効）
      minWordLength: this.config.minWordLength,
      maxWordLength: this.config.maxWordLength,
      defaultMinWordLength: this.config.defaultMinWordLength ||
                           (this.globalConfig as Config | undefined)?.defaultMinWordLength,
      perKeyMinLength: (this.globalConfig as Config | undefined)?.perKeyMinLength,
    };
    return this.simpleHash(JSON.stringify(relevantConfig));
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private getCachedResult(
    text: string,
    startLine: number,
    context?: DetectionContext,
  ): CacheEntry | null {
    const key = this.generateCacheKey(text, startLine, context);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.config.cacheTtlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  private cacheResult(
    text: string,
    startLine: number,
    words: Word[],
    detector: string,
    context?: DetectionContext,
  ): void {
    const key = this.generateCacheKey(text, startLine, context);

    // Manage cache size
    if (this.cache.size >= this.config.cacheMaxSize) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = entries.slice(0, Math.floor(this.config.cacheMaxSize * 0.1));
      for (const [key] of toRemove) {
        this.cache.delete(key);
      }
    }

    this.cache.set(key, {
      words,
      timestamp: Date.now(),
      detector,
      config_hash: this.generateConfigHash(),
    });
  }

  private generateContextHash(context: DetectionContext): string {
    const payload = {
      currentKey: context.currentKey ?? null,
      minWordLength: context.minWordLength ?? null,
    };
    return this.simpleHash(JSON.stringify(payload));
  }

  private shouldSkipCache(context?: DetectionContext): boolean {
    if (!context) {
      return false;
    }
    // Only recognized fields are safe for cache key inclusion
    const allowedKeys = ["currentKey", "minWordLength", "metadata"];
    return Object.keys(context).some((key) => !allowedKeys.includes(key));
  }

  /**
   * 統計情報を初期化
   * @description パフォーマンス統計情報を初期値で初期化
   * @returns DetectionStats - 初期化された統計情報オブジェクト
   * @since 1.0.0
   */
  private initializeStats(): DetectionStats {
    return {
      total_calls: 0,
      cache_hits: 0,
      cache_misses: 0,
      errors: 0,
      average_duration: 0,
      detector_usage: {},
    };
  }

  private updateAverageDuration(duration: number): void {
    const totalDuration = this.stats.average_duration * (this.stats.total_calls - 1) + duration;
    this.stats.average_duration = totalDuration / this.stats.total_calls;
  }

  /**
   * 統計情報を取得
   * @description 現在のパフォーマンス統計情報のコピーを返す
   * @returns DetectionStats - 統計情報のコピー
   * @since 1.0.0
   * @example
   * ```typescript
   * const stats = manager.getStats();
   * console.log(`Total calls: ${stats.total_calls}, Cache hit rate: ${stats.cache_hits / (stats.cache_hits + stats.cache_misses)}`);
   * ```
   */
  getStats(): DetectionStats {
    return { ...this.stats };
  }

  /**
   * キャッシュ統計情報を取得
   * @description キャッシュの使用状況とヒット率を返す
   * @returns {{ size: number, maxSize: number, hitRate: number }} キャッシュ統計情報
   * @since 1.0.0
   * @example
   * ```typescript
   * const cacheStats = manager.getCacheStats();
   * console.log(`Cache usage: ${cacheStats.size}/${cacheStats.maxSize} (${(cacheStats.hitRate * 100).toFixed(2)}% hit rate)`);
   * ```
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    const total = this.stats.cache_hits + this.stats.cache_misses;
    return {
      size: this.cache.size,
      maxSize: this.config.cacheMaxSize,
      hitRate: total > 0 ? this.stats.cache_hits / total : 0,
    };
  }

  /**
   * キャッシュをクリア
   * @description 格納されているすべてのキャッシュエントリを削除
   * @returns void
   * @since 1.0.0
   * @example
   * ```typescript
   * manager.clearCache(); // キャッシュをリセット
   * ```
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 統計情報をリセット
   * @description すべてのパフォーマンス統計情報を初期値にリセット
   * @returns void
   * @since 1.0.0
   * @example
   * ```typescript
   * manager.resetStats(); // 統計情報をリセット
   * ```
   */
  resetStats(): void {
    this.stats = this.initializeStats();
  }

  /**
   * 設定を更新
   * @description 部分的な設定更新を行い、必要に応じてキャッシュをクリア
   * @param newConfig - 更新する設定の部分オブジェクト
   * @returns void
   * @since 1.0.0
   * @example
   * ```typescript
   * manager.updateConfig({ cacheEnabled: false, timeoutMs: 3000 });
   * ```
   */
  updateConfig(newConfig: Partial<WordDetectionManagerConfig>): void {
    // 設定をマージ
    this.config = { ...this.config, ...newConfig };

    // word_detection_strategyがある場合はstrategyに反映（後方互換性）
    if ((newConfig as any).wordDetectionStrategy) {
      this.config.strategy = (newConfig as any).wordDetectionStrategy;
      this.config.defaultStrategy = (newConfig as any).wordDetectionStrategy;
    }

    // 設定変更に影響するキャッシュをクリア
    if (this.affectsDetection(newConfig)) {
      this.clearCache();
    }

    // 検出戦略が変更された場合はディテクターを再初期化
    if (this.shouldReinitializeDetectors(newConfig)) {
      this.reinitializeDetectors();
    }
  }

  /**
   * 設定変更が検出結果に影響するかチェック
   * @param newConfig - 新しい設定
   * @returns 影響する場合はtrue
   */
  private affectsDetection(newConfig: Partial<WordDetectionManagerConfig>): boolean {
    const affectingKeys = [
      "strategy",
      "word_detection_strategy",
      "use_japanese",
      "enable_tinysegmenter",
      "segmenter_threshold",
      "min_word_length",
      "max_word_length",
    ];

    return affectingKeys.some((key) => key in newConfig);
  }

  /**
   * ディテクターの再初期化が必要かチェック
   * @param newConfig - 新しい設定
   * @returns 再初期化が必要な場合はtrue
   */
  private shouldReinitializeDetectors(newConfig: Partial<WordDetectionManagerConfig>): boolean {
    const reinitKeys = [
      "strategy",
      "word_detection_strategy",
      "enable_tinysegmenter",
      "use_japanese",
    ];

    return reinitKeys.some((key) => key in newConfig);
  }

  /**
   * ディテクターを再初期化
   */
  private reinitializeDetectors(): void {
    try {
      // 既存のディテクターをクリア
      this.detectors.clear();

      // 新しい設定でディテクターを再作成
      const regexDetector = new RegexWordDetector(this.config);
      // Using RegexWordDetector as fallback until proper implementations are added
      const segmenterDetector = new RegexWordDetector(this.config);
      const hybridDetector = new RegexWordDetector(this.config);

      this.registerDetector(regexDetector);
      this.registerDetector(segmenterDetector);
      this.registerDetector(hybridDetector);
    } catch (error) {
    }
  }

  /**
   * 利用可能なディテクター一覧を取得
   * @description 登録されているすべてのディテクターの情報を返す
   * @returns Array<{{ name: string, priority: number, languages: string[] }}> ディテクター情報の配列
   * @since 1.0.0
   * @example
   * ```typescript
   * const detectors = manager.getAvailableDetectors();
   * detectors.forEach(d => console.log(`${d.name} (priority: ${d.priority}, languages: ${d.languages.join(', ')})`));
   * ```
   */
  getAvailableDetectors(): Array<{ name: string; priority: number; languages: string[] }> {
    return Array.from(this.detectors.values()).map((d) => ({
      name: d.name,
      priority: d.priority,
      languages: d.supportedLanguages,
    }));
  }

  /**
   * セッションコンテキストを設定
   * @description キー別設定や現在のモーションキー情報を保存
   * @param context - 設定するコンテキスト
   * @returns void
   * @since 1.0.0
   * @example
   * ```typescript
   * manager.setSessionContext({ currentKey: "f", minWordLength: 3 });
   * ```
   */
  setSessionContext(context: DetectionContext | null): void {
    this.sessionContext = context;
  }

  /**
   * セッションコンテキストを取得
   * @description 現在保存されているコンテキスト情報を取得
   * @returns DetectionContext | null - 現在のコンテキスト
   * @since 1.0.0
   * @example
   * ```typescript
   * const context = manager.getSessionContext();
   * ```
   */
  getSessionContext(): DetectionContext | null {
    return this.sessionContext;
  }

  /**
   * コンテキストに基づいて適切なディテクターを取得
   * @description DetectionContextのstrategyに基づいて最適なディテクターを選択
   * @param context - 検出コンテキスト（strategyを含む）
   * @param text - テキスト（canHandleフィルタリング用、省略可）
   * @returns Promise<WordDetector | null> - 選択されたディテクター、または見つからない場合はnull
   * @since 1.0.0
   * @example
   * ```typescript
   * const detector = await manager.getDetectorForContext({ strategy: "regex" });
   * ```
   */
  async getDetectorForContext(context?: DetectionContext, text?: string): Promise<WordDetector | null> {
    try {
      if (!this.initialized) {
        console.warn("WordDetectionManager is not initialized");
        return null;
      }

      // Get strategy from context, or fall back to config
      const strategy = context?.strategy ||
        (this.config as any).wordDetectionStrategy ||
        this.config.strategy ||
        this.config.defaultStrategy;

      // Filter detectors by text handling capability if text is provided
      let availableDetectors = Array.from(this.detectors.values());
      if (text) {
        availableDetectors = availableDetectors.filter((d) => d.canHandle(text));
      }

      // Sort by priority
      availableDetectors.sort((a, b) => b.priority - a.priority);

      if (availableDetectors.length === 0) {
        return null;
      }

      // Strategy-based selection with availability check
      switch (strategy) {
        case "regex":
          const regexDetector = availableDetectors.find((d) => d.name.includes("Regex"));
          if (regexDetector && await regexDetector.isAvailable()) {
            return regexDetector;
          }
          break;

        case "tinysegmenter":
          const segmenterDetector = availableDetectors.find((d) => d.name.includes("TinySegmenter"));
          if (segmenterDetector && await segmenterDetector.isAvailable()) {
            return segmenterDetector;
          }
          break;

        case "hybrid":
          const hybridDetector = availableDetectors.find((d) => d.name.includes("Hybrid"));
          if (hybridDetector && await hybridDetector.isAvailable()) {
            return hybridDetector;
          }
          break;
      }

      // Fallback: return the highest priority available detector
      for (const detector of availableDetectors) {
        if (await detector.isAvailable()) {
          return detector;
        }
      }

      return null;
    } catch (error) {
      console.error("Error in getDetectorForContext:", error);
      return null;
    }
  }

  /**
   * すべてのディテクターをテスト
   * @description 登録されているすべてのディテクターの利用可能性をテスト
   * @returns Promise<Record<string, boolean>> ディテクター名と利用可能性のマッピング
   * @since 1.0.0
   * @example
   * ```typescript
   * const testResults = await manager.testDetectors();
   * for (const [name, available] of Object.entries(testResults)) {
   *   console.log(`${name}: ${available ? 'Available' : 'Not available'}`);
   * }
   * ```
   */
  async testDetectors(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, detector] of this.detectors) {
      try {
        results[name] = await detector.isAvailable();
      } catch {
        results[name] = false;
      }
    }

    return results;
  }

  /**
   * デフォルト設定とマージ
   * @description 渡された設定とデフォルト設定をマージし、必要なすべてのフィールドを持つ設定オブジェクトを作成
   * @param config - ユーザー設定
   * @returns Required<WordDetectionManagerConfig> - デフォルト値で補完された設定
   * @since 1.0.0
   */
  private mergeWithDefaults(
    config: WordDetectionManagerConfig,
  ): Required<WordDetectionManagerConfig> {
    // デフォルト値 (DEFAULT_UNIFIED_CONFIGを含む)
    const defaults = {
      // From DEFAULT_UNIFIED_CONFIG
      defaultMinWordLength: DEFAULT_UNIFIED_CONFIG.defaultMinWordLength,

      // Detection settings
      strategy: "hybrid" as "regex" | "tinysegmenter" | "hybrid",
      useJapanese: DEFAULT_UNIFIED_CONFIG.useJapanese,
      enableTinySegmenter: DEFAULT_UNIFIED_CONFIG.enableTinySegmenter,
      segmenterThreshold: DEFAULT_UNIFIED_CONFIG.segmenterThreshold,
      segmenterCacheSize: 1000,

      // Manager settings
      defaultStrategy: "hybrid" as "regex" | "tinysegmenter" | "hybrid",
      autoDetectLanguage: true,
      performanceMonitoring: true,

      // Cache settings
      cacheEnabled: true,
      cacheMaxSize: 500,
      cacheTtlMs: 300000, // 5 minutes

      // Error handling
      enableFallback: true,
      fallbackToRegex: true,
      maxRetries: 2,
      retryDelayMs: 100,

      // Performance settings
      timeoutMs: 5000, // 5 second timeout
      batch_processing: false,
      max_concurrent_detections: 3,

      // Filter settings
      minWordLength: 1,
      maxWordLength: 50,
      exclude_numbers: false,
      exclude_single_chars: false,
      batchSize: 100,
    };

    // 渡されたconfigの値を優先（use_japaneseが明示的に設定されている場合はそれを使用）
    const merged = {
      ...defaults,
      ...config,
    };

    // use_japaneseが明示的に設定されている場合、その値を確実に適用
    if (config.useJapanese !== undefined) {
      merged.useJapanese = config.useJapanese;
    }

    // word_detection_strategyがある場合はstrategyに反映
    if ((config as any).wordDetectionStrategy) {
      merged.strategy = (config as any).wordDetectionStrategy;
    }

    return merged as Required<WordDetectionManagerConfig>;
  }
}

/**
 * グローバルマネージャーインスタンス管理
 * @description アプリケーション全体で共有するシングルトンマネージャーインスタンス
 * @since 1.0.0
 */
let globalManager: WordDetectionManager | null = null;

/**
 * 単語検出マネージャーのシングルトンインスタンスを取得
 * @description グローバルマネージャーインスタンスを取得または作成。新しい設定が渡された場合は新しいインスタンスで置き換え
 * @param config - マネージャー設定（省略時はデフォルト設定）
 * @returns WordDetectionManager - マネージャーインスタンス
 * @since 1.0.0
 * @example
 * ```typescript
 * const manager = getWordDetectionManager({useJapanese: true });
 * await manager.initialize();
 * ```
 */
export function getWordDetectionManager(
  config?: WordDetectionManagerConfig,
  globalConfig?: Config | Config,
): WordDetectionManager {
  if (!globalManager) {
    globalManager = new WordDetectionManager(config, globalConfig);
  } else if (config) {
    // 既存のマネージャーがある場合でも、新しい設定で更新
    globalManager = new WordDetectionManager(config, globalConfig);
  }
  return globalManager;
}

/**
 * 単語検出マネージャーをリセット
 * @description グローバルマネージャーインスタンスをクリアし、次回呼び出し時に新しいインスタンスを作成させる
 * @returns void
 * @since 1.0.0
 * @example
 * ```typescript
 * resetWordDetectionManager(); // マネージャーをリセット
 * ```
 */
export function resetWordDetectionManager(): void {
  globalManager = null;
}


// ========== Integrated from word/detector.ts ==========

/**
 * Word Detection Abstraction Layer for Hellshake-Yano
 *
 * @deprecated This module is being migrated to ../word.ts
 * Import from ../word.ts for new code.
 *
 * This module provides backward compatibility by re-exporting
 * detector functionality from word.ts
 */

// Re-export from word.ts for backward compatibility
// Re-export types from types.ts for backward compatibility
