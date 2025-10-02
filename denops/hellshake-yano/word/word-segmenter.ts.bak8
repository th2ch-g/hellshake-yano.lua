/**
 * word-segmenter.ts
 * TinySegmenterによる日本語形態素解析
 *
 * 日本語テキストを単語（形態素）に分割するための機能を提供します。
 * npm版TinySegmenterを使用し、キャッシュによる高速化を実現しています。
 */

import { TinySegmenter as NpmTinySegmenter } from "https://esm.sh/@birchill/tiny-segmenter@1.0.0";
import { CacheType, GlobalCache } from "../cache.ts";

/**
 * セグメンテーション結果を表すインターフェース
 */
export interface SegmentationResult {
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
 * TinySegmenterによる日本語形態素解析クラス
 *
 * シングルトンパターンで実装されており、getInstance()で取得します。
 * 内部的にキャッシュを使用して、同じテキストの再解析を高速化しています。
 *
 * @example
 * ```ts
 * const segmenter = TinySegmenter.getInstance();
 * const result = await segmenter.segment("今日は良い天気です");
 * console.log(result.segments); // ["今日", "は", "良い", "天気", "です"]
 * ```
 */
export class TinySegmenter {
  private static instance: TinySegmenter;
  private segmenter: NpmTinySegmenter;
  private globalCache: GlobalCache;
  private enabled: boolean;

  /**
   * TinySegmenterのコンストラクタ
   *
   * 直接呼び出すのではなく、getInstance()を使用してください。
   */
  constructor() {
    this.segmenter = new NpmTinySegmenter();
    this.globalCache = GlobalCache.getInstance();
    this.enabled = true;
  }

  /**
   * TinySegmenterのシングルトンインスタンスを取得
   *
   * @returns TinySegmenterのインスタンス
   */
  static getInstance(): TinySegmenter {
    if (!TinySegmenter.instance) {
      TinySegmenter.instance = new TinySegmenter();
    }
    return TinySegmenter.instance;
  }

  /**
   * セグメント後処理：連続する数字と単位を結合
   *
   * TinySegmenterの生の出力を改善するための後処理を行います：
   * - 連続する数字を結合
   * - 数字と単位（年月日時分秒、%など）を結合
   * - 括弧内の内容を一つのセグメントにまとめる
   * - 名詞/動詞と助詞を結合
   *
   * @param segments - 生のセグメント配列
   * @returns 後処理されたセグメント配列
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
   *
   * @param text - 分割するテキスト
   * @param options - オプション設定
   * @param options.mergeParticles - 助詞を結合するかどうか（デフォルト: true）
   * @returns セグメンテーション結果
   *
   * @example
   * ```ts
   * // 基本的な使用
   * const result = await segmenter.segment("今日は良い天気です");
   * console.log(result.segments); // ["今日は", "良い", "天気です"]
   *
   * // 助詞を分離
   * const result2 = await segmenter.segment("今日は良い天気です", { mergeParticles: false });
   * console.log(result2.segments); // ["今日", "は", "良い", "天気", "です"]
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
   *
   * TinySegmenterが利用できない場合の代替手段です。
   * 文字種の変化に基づいてテキストを分割します。
   *
   * @param text - 分割するテキスト
   * @returns セグメント配列
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
   *
   * @param char - 判定する文字
   * @returns 文字種別（kanji, hiragana, katakana, latin, digit, space, other）
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
   *
   * @param text - チェックするテキスト
   * @returns 日本語が含まれている場合はtrue
   *
   * @example
   * ```ts
   * segmenter.hasJapanese("Hello")      // false
   * segmenter.hasJapanese("こんにちは") // true
   * segmenter.hasJapanese("Hello世界")  // true
   * ```
   */
  hasJapanese(text: string): boolean {
    return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
  }

  /**
   * テキストのセグメンテーションが有益かどうかをチェック
   *
   * 日本語を含み、かつ閾値以上の長さがあるテキストに対して
   * セグメンテーションを推奨します。
   *
   * @param text - チェックするテキスト
   * @param threshold - 最小文字数（デフォルト: 4）
   * @returns セグメンテーションが推奨される場合はtrue
   *
   * @example
   * ```ts
   * segmenter.shouldSegment("短い", 4)       // false (4文字未満)
   * segmenter.shouldSegment("長いテキスト", 4) // true
   * segmenter.shouldSegment("Hello", 4)      // false (日本語なし)
   * ```
   */
  shouldSegment(text: string, threshold: number = 4): boolean {
    return this.hasJapanese(text) && text.length >= threshold;
  }

  /**
   * セグメンテーションキャッシュをクリア
   *
   * メモリ使用量が気になる場合や、テスト時に使用します。
   * 通常はLRUアルゴリズムで自動管理されるため、明示的な呼び出しは不要です。
   */
  clearCache(): void {
    const cache = this.globalCache.getCache<string, string[]>(CacheType.ANALYSIS);
    cache.clear();
  }

  /**
   * キャッシュ統計情報を取得
   *
   * @returns キャッシュのサイズ、最大サイズ、ヒット率
   *
   * @example
   * ```ts
   * const stats = segmenter.getCacheStats();
   * console.log(`Cache: ${stats.size}/${stats.maxSize}, Hit rate: ${stats.hitRate}`);
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
   *
   * @param enabled - 有効にする場合はtrue
   *
   * @example
   * ```ts
   * segmenter.setEnabled(false); // セグメンターを無効化
   * const result = await segmenter.segment("テスト");
   * console.log(result.source); // "fallback"
   * ```
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * セグメンターが有効かどうかをチェック
   *
   * @returns 有効な場合はtrue
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * サンプルテキストでセグメンターをテスト
   *
   * デバッグやヘルスチェックに使用できます。
   *
   * @returns テスト結果（成功したかどうかと各テストケースの結果）
   *
   * @example
   * ```ts
   * const testResult = await segmenter.test();
   * if (testResult.success) {
   *   console.log("All tests passed!");
   * } else {
   *   console.log("Some tests failed:", testResult.results);
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
 * エクスポートされたシングルトンインスタンス
 *
 * すぐに使えるTinySegmenterのインスタンスです。
 *
 * @example
 * ```ts
 * import { tinysegmenter } from "./word-segmenter.ts";
 *
 * const result = await tinysegmenter.segment("今日は良い天気");
 * console.log(result.segments);
 * ```
 */
export const tinysegmenter = TinySegmenter.getInstance();
