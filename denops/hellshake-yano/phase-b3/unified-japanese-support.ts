/**
 * denops/hellshake-yano/phase-b3/unified-japanese-support.ts
 *
 * TDD Phase: GREEN - テストをパスさせる最小限の実装
 *
 * UnifiedJapaneseSupportクラス
 * TinySegmenterを統合した日本語対応単語検出モジュール
 *
 * ## 主要機能
 * - TinySegmenterのインスタンス管理
 * - 日本語含有行のセグメント化
 * - VimScript互換の1-indexed座標
 * - キャッシュ管理（高速化）
 */

import type { Denops } from "@denops/std";
import { TinySegmenter } from "../neovim/core/word/word-segmenter.ts";
import type { DenopsWord } from "../phase-b2/vimscript-types.ts";
import { GlobalCache } from "../common/cache/unified-cache.ts";
import type {
  UnifiedJapaneseSupportConfig,
  CacheStats,
} from "./types.ts";
import { handleError, logMessage } from "./common-base.ts";

/**
 * UnifiedJapaneseSupportクラス
 * 日本語対応の単語検出機能を提供
 */
export class UnifiedJapaneseSupportImpl {
  private static instance: UnifiedJapaneseSupportImpl;
  private segmenter: TinySegmenter;
  private cache: GlobalCache;
  private denops: Denops | null = null;

  private constructor() {
    this.segmenter = TinySegmenter.getInstance();
    this.cache = GlobalCache.getInstance();
  }

  static getInstance(): UnifiedJapaneseSupportImpl {
    if (!UnifiedJapaneseSupportImpl.instance) {
      UnifiedJapaneseSupportImpl.instance = new UnifiedJapaneseSupportImpl();
    }
    return UnifiedJapaneseSupportImpl.instance;
  }

  /**
   * Denopsインスタンスを設定
   */
  setDenops(denops: Denops): void {
    this.denops = denops;
  }

  /**
   * 日本語対応が有効かチェック
   *
   * @param config - 設定オブジェクト
   * @returns 日本語対応が有効の場合true
   */
  isEnabled(config: UnifiedJapaneseSupportConfig): boolean {
    return config.useJapanese === true && config.enableTinySegmenter === true;
  }

  /**
   * 行のセグメント化
   *
   * @param line - 行の内容
   * @param lineNum - 行番号（1-indexed）
   * @param config - 設定オブジェクト
   * @returns セグメント化された単語リスト
   */
  async segmentLine(
    line: string,
    lineNum: number,
    config: UnifiedJapaneseSupportConfig,
  ): Promise<DenopsWord[]> {
    // 日本語対応が無効な場合は空配列を返す
    if (!this.isEnabled(config)) {
      return [];
    }

    // 空行はセグメント化しない
    if (line.trim().length === 0) {
      return [];
    }

    // 日本語を含まない場合は空配列を返す
    if (!this.hasJapanese(line)) {
      return [];
    }

    try {
      // TinySegmenterでセグメント化
      const segmentResult = await this.segmenter.segment(line, {
        mergeParticles: config.japaneseMergeParticles !== false,
      });

      if (!segmentResult.success || segmentResult.segments.length === 0) {
        logMessage(
          "warn",
          "UnifiedJapaneseSupportImpl",
          `segmentLine failed for line ${lineNum}: ${segmentResult.error || "no segments"}`,
        );
        return [];
      }

      // セグメントをWord型に変換
      const words = this.convertSegmentsToWords(
        segmentResult.segments,
        line,
        lineNum,
        config,
      );

      return words;
    } catch (error) {
      const errorMessage = handleError("UnifiedJapaneseSupportImpl.segmentLine", error);
      logMessage("error", "UnifiedJapaneseSupportImpl", errorMessage);
      return [];
    }
  }

  /**
   * セグメントをWord型に変換
   *
   * @param segments - TinySegmenterが返したセグメント
   * @param line - 元の行
   * @param lineNum - 行番号（1-indexed）
   * @param config - 設定オブジェクト
   * @returns Word型の配列
   */
  private convertSegmentsToWords(
    segments: string[],
    line: string,
    lineNum: number,
    config: UnifiedJapaneseSupportConfig,
  ): DenopsWord[] {
    const words: DenopsWord[] = [];
    const minLength = config.japaneseMinWordLength ?? 2;

    let searchPos = 0;

    for (const segment of segments) {
      // 空白のセグメントをスキップ
      if (segment.trim().length === 0) {
        continue;
      }

      // 最小単語長フィルタリング
      if (segment.length < minLength) {
        continue;
      }

      // 元行でのセグメント位置を検索
      const pos = line.indexOf(segment, searchPos);
      if (pos === -1) {
        continue;
      }

      // Word型オブジェクトを作成（1-indexed座標）
      words.push({
        text: segment,
        line: lineNum,
        col: pos + 1, // 0-indexed → 1-indexed
      });

      // 次の検索開始位置を更新
      searchPos = pos + segment.length;
    }

    return words;
  }

  /**
   * テキストが日本語を含むかチェック
   *
   * @param text - テキスト
   * @returns 日本語を含む場合true
   */
  hasJapanese(text: string): boolean {
    return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
  }

  /**
   * キャッシュ統計を取得
   *
   * @returns キャッシュ統計オブジェクト
   */
  getCacheStats(): CacheStats {
    return this.segmenter.getCacheStats();
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.segmenter.clearCache();
  }
}

// デフォルトエクスポート
export const unifiedJapaneseSupport = UnifiedJapaneseSupportImpl.getInstance();
