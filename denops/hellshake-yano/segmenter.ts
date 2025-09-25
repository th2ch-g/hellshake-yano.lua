/**
 * TinySegmenter Integration Module for Hellshake-Yano
 *
 * This module provides Japanese text segmentation capabilities using TinySegmenter.
 * Uses the npm @birchill/tiny-segmenter package for accurate segmentation.
 * Integrated with UnifiedCache system for optimal performance.
 */

import { TinySegmenter as NpmTinySegmenter } from "@birchill/tiny-segmenter";
import { UnifiedCache, CacheType } from "./cache.ts";

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
  private unifiedCache: UnifiedCache;
  private enabled: boolean;

  /**
   * TinySegmenterのコンストラクタ
   * @description TinySegmenterインスタンスを初期化し、UnifiedCacheとnpmパッケージの設定を行う
   * @since 1.0.0
   */
  constructor() {
    this.segmenter = new NpmTinySegmenter();
    this.unifiedCache = UnifiedCache.getInstance();
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

      // 通常のセグメント
      if (current && current.trim().length > 0) {
        processed.push(current);
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
  async segment(text: string): Promise<SegmentationResult> {
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

    // Check UnifiedCache first
    const cache = this.unifiedCache.getCache<string, string[]>(CacheType.ANALYSIS);
    if (cache.has(text)) {
      return {
        segments: cache.get(text)!,
        success: true,
        source: "tinysegmenter",
      };
    }

    try {
      // npm版TinySegmenterを使用
      const rawSegments = this.segmenter.segment(text);

      // 後処理を適用
      const segments = this.postProcessSegments(rawSegments);

      // Cache the result in UnifiedCache (LRU handles size limit automatically)
      const cache = this.unifiedCache.getCache<string, string[]>(CacheType.ANALYSIS);
      cache.set(text, segments);

      return {
        segments,
        success: true,
        source: "tinysegmenter",
      };
    } catch (error) {
      // console.warn("[TinySegmenter] Segmentation failed:", error);

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
    const cache = this.unifiedCache.getCache<string, string[]>(CacheType.ANALYSIS);
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
    const cache = this.unifiedCache.getCache<string, string[]>(CacheType.ANALYSIS);
    const stats = cache.getStats();
    const config = this.unifiedCache.getCacheConfig(CacheType.ANALYSIS);

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
