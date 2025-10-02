/**
 * word-detector-strategies.ts
 * 単語検出戦略の実装
 *
 * 3つの検出戦略を提供します：
 * 1. RegexWordDetector: 正規表現ベースの検出（英数字、記号など）
 * 2. TinySegmenterWordDetector: 日本語形態素解析ベースの検出
 * 3. HybridWordDetector: 上記2つを組み合わせた統合検出
 */

import type { Denops } from "@denops/std";
import type {
  DetectionContext,
  Word,
} from "../types.ts";
import type { Config } from "../config.ts";
import { Core } from "../core.ts";
import { tinysegmenter } from "./word-segmenter.ts";

/**
 * 単語検出器の基底インターフェース
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
   */
  detectWords(
    text: string,
    startLine: number,
    context?: DetectionContext,
    denops?: Denops,
  ): Promise<Word[]>;

  /**
   * 指定されたテキストを処理できるかどうかを判定します
   */
  canHandle(text: string): boolean;

  /**
   * この検出器が利用可能かどうかを確認します
   */
  isAvailable(): Promise<boolean>;
}

/**
 * 単語検出設定インターフェース
 */
export interface WordDetectionConfig {
  /** 使用する検出戦略（regex、tinysegmenter、またはhybrid） */
  strategy?: "regex" | "tinysegmenter" | "hybrid";
  /** 日本語処理を有効にするかどうか */
  useJapanese?: boolean;
  /** 実装では無視されるフラグ */
  useImprovedDetection?: boolean;

  /** TinySegmenterを有効にするかどうか */
  enableTinySegmenter?: boolean;
  /** セグメンテーションのための最小文字数 */
  segmenterThreshold?: number;
  /** セグメンターのキャッシュサイズ */
  segmenterCacheSize?: number;

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
  /** 日本語マージの閾値 */
  japanese_merge_threshold?: number;
  /** 日本語の最小単語長 */
  japanese_min_word_length?: number;
}

/**
 * ConfigかConfigかを判定するヘルパー関数
 */
function resolveConfigType(
  config?: Config | Config,
): [Config | undefined, Config | undefined] {
  if (config && "useJapanese" in config) {
    return [config as Config, undefined];
  }
  return [undefined, config as unknown as Config];
}

// バイトインデックス計算関数（word.tsから一時的に参照）
// NOTE: 循環参照を避けるため、将来的には共通ユーティリティに移動予定
function charIndexToByteIndex(text: string, charIndex: number): number {
  if (charIndex === 0) return 0;
  const encoder = new TextEncoder();
  const substring = text.slice(0, charIndex);
  return encoder.encode(substring).length;
}

// extractWords関数の参照（word.tsから）
// NOTE: 循環参照を避けるため、グローバルスコープから参照
declare global {
  var extractWords: ((
    lineText: string,
    lineNumber: number,
    options?: { useImprovedDetection?: boolean; excludeJapanese?: boolean }
  ) => Promise<Word[]>) | undefined;
}

/**
 * Regex-based Word Detector
 *
 * 正規表現を使用して単語を検出します。
 * 英数字、記号、日本語（オプション）をサポートします。
 *
 * @example
 * ```ts
 * const detector = new RegexWordDetector({ minWordLength: 2 });
 * const words = await detector.detectWords("Hello World", 1);
 * console.log(words); // [{ text: "Hello", line: 1, ... }, { text: "World", line: 1, ... }]
 * ```
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
   */
  constructor(config: WordDetectionConfig = {}, globalConfig?: Config | Config) {
    this.config = this.mergeWithDefaults(config);
    [this.unifiedConfig, this.globalConfig] = resolveConfigType(globalConfig);
  }

  /**
   * 統一的なmin_length取得
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
   */
  canHandle(text: string): boolean {
    return true; // Regex detector can handle any text
  }

  /**
   * この検出器が利用可能かどうかを確認します
   */
  async isAvailable(): Promise<boolean> {
    return true; // Always available
  }

  /**
   * 設定をデフォルト値とマージします
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

    // NOTE: extractWords は word.ts から一時的に参照
    // 完全な分離後は、このファイル内に実装を移動
    return (globalThis as any).extractWords?.(lineText, lineNumber, { useImprovedDetection: true, excludeJapanese }) || [];
  }

  /**
   * 検出された単語にフィルターを適用します
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
 * TinySegmenterを使用して日本語テキストから単語を検出します。
 * 形態素解析により、より正確な日本語の単語境界を検出できます。
 *
 * @example
 * ```ts
 * const detector = new TinySegmenterWordDetector();
 * const words = await detector.detectWords("今日は良い天気です", 1);
 * console.log(words); // [{ text: "今日は", ... }, { text: "良い", ... }, ...]
 * ```
 */
export class TinySegmenterWordDetector implements WordDetector {
  readonly name = "TinySegmenterWordDetector";
  readonly priority = 10; // RegexWordDetectorより高い優先度
  readonly supportedLanguages = ["ja"];

  /** 日本語文字判定用の正規表現（パフォーマンス最適化のためキャッシュ） */
  private readonly japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;

  /**
   * 日本語助詞リスト（フィルタリングおよび統合対象）
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
          // セグメンテーション失敗の場合は次の行へ
        }
      } catch {
        // 予期しないエラーが発生した場合
        continue; // エラーが発生した行はスキップして処理を続行
      }
    }

    return words;
  }

  /**
   * セグメント後処理：名詞+助詞の統合
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
   */
  canHandle(text: string): boolean {
    // 日本語文字（ひらがな、カタカナ、漢字）が含まれているかチェック
    return this.japaneseRegex.test(text);
  }

  /**
   * この検出器が利用可能かどうかを確認
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }
}

/**
 * HybridWordDetector - 統合型単語検出器
 *
 * RegexWordDetectorとTinySegmenterWordDetectorを組み合わせて、
 * 日本語と英数字の混在するテキストから最適な単語検出を行います。
 *
 * @example
 * ```ts
 * const detector = new HybridWordDetector();
 * const words = await detector.detectWords("Hello世界", 1);
 * // 両方の検出器の結果がマージされて返される
 * ```
 */
export class HybridWordDetector implements WordDetector {
  readonly name = "HybridWordDetector";
  readonly priority = 15; // 最も高い優先度
  readonly supportedLanguages = ["ja", "en", "any"];

  private regexDetector: RegexWordDetector;
  private tinySegmenterDetector: TinySegmenterWordDetector;

  /**
   * HybridWordDetectorのコンストラクタ
   */
  constructor(config?: WordDetectionConfig) {
    this.regexDetector = new RegexWordDetector(config);
    this.tinySegmenterDetector = new TinySegmenterWordDetector();
  }

  /**
   * 統合型単語検出を実行
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

      // 部分的なエラーは無視（process1_sub2）

      // 結果をマージして重複を除去
      const mergedWords = this.mergeAndDeduplicateWords(regexWords, tinySegmenterWords);

      // 位置順でソート
      return this.sortWordsByPosition(mergedWords);
    } catch {
      // 予期しないエラーは無視して空配列を返す（process1_sub2）
      return [];
    }
  }

  /**
   * 指定されたテキストを処理可能かどうかを判定
   */
  canHandle(text: string): boolean {
    return true; // すべてのテキストを処理可能
  }

  /**
   * この検出器が利用可能かどうかを確認
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
