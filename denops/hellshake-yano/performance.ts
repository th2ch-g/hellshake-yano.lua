/**
 * @fileoverview パフォーマンス計測とキャッシュ管理
 */
import type { Denops } from "@denops/std";
import type { Config, DebugInfo, HintMapping, PerformanceMetrics, Word } from "./types.ts";
import { LRUCache } from "./cache.ts";
import { detectWordsWithManager } from "./word.ts";
import { generateHints } from "./hint.ts";

/** 単語キャッシュ（最大100エントリ） */
const wordsCache = new LRUCache<string, Word[]>(100);

/** ヒントキャッシュ（最大50エントリ） */
const hintsCache = new LRUCache<string, string[]>(50);

/** パフォーマンス計測データ */
let performanceMetrics: PerformanceMetrics = {
  showHints: [],
  hideHints: [],
  wordDetection: [],
  hintGeneration: [],
};

/**
 * パフォーマンス計測データを記録する
 * @param operation - 計測対象の操作種別
 * @param duration - 実行時間（ミリ秒）
 */
export function recordPerformance(
  operation: keyof PerformanceMetrics,
  duration: number,
): void {
  const metrics = performanceMetrics[operation];
  metrics.push(duration);
  if (metrics.length > 50) {
    metrics.shift();
  }
}

/**
 * 最適化された単語検出（キャッシュ機能付き）
 * @param denops - Denops インスタンス
 * @param bufnr - バッファ番号
 * @returns 検出された単語の配列
 */
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

/**
 * 最適化されたヒント生成（キャッシュ機能付き）
 * @param wordCount - 生成するヒントの数
 * @param markers - ヒント生成に使用するマーカー文字
 * @returns 生成されたヒントの配列
 */
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

/**
 * 設定に基づいたヒント生成（singleChar/multiChar対応）
 * @param wordCount - 生成するヒントの数
 * @param config - プラグイン設定
 * @returns 生成されたヒントの配列
 */
export function generateHintsFromConfig(wordCount: number, config: Config): string[] {
  const hintConfig = {
    singleCharKeys: config.singleCharKeys,
    multiCharKeys: config.multiCharKeys,
    maxSingleCharHints: config.maxSingleCharHints,
    useNumericMultiCharHints: config.useNumericMultiCharHints,
    markers: config.markers,
  };

  // キャッシュキーを生成
  const cacheKey = `generateHints:${wordCount}:${JSON.stringify(hintConfig)}`;
  const cached = hintsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const hints = generateHints(wordCount, { groups: true, ...hintConfig });
  hintsCache.set(cacheKey, hints);
  return hints;
}

/**
 * デバッグ情報を収集する
 * @param hintsVisible - ヒントが表示されているかどうか
 * @param currentHints - 現在のヒントマッピング
 * @param config - プラグイン設定
 * @returns 現在のデバッグ情報
 */
export function collectDebugInfo(
  hintsVisible: boolean,
  currentHints: HintMapping[],
  config: Config,
): DebugInfo {
  return {
    hintsVisible,
    currentHints,
    config,
    metrics: performanceMetrics,
    timestamp: Date.now(),
  };
}

/**
 * デバッグ情報をクリアする
 */
export function clearDebugInfo(): void {
  performanceMetrics = {
    showHints: [],
    hideHints: [],
    wordDetection: [],
    hintGeneration: [],
  };
}

/**
 * パフォーマンスメトリクスを取得する
 * @returns 現在のパフォーマンスメトリクス
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  return performanceMetrics;
}

/**
 * パフォーマンスメトリクスをリセットする
 */
export function resetPerformanceMetrics(): void {
  performanceMetrics = {
    showHints: [],
    hideHints: [],
    wordDetection: [],
    hintGeneration: [],
  };
}

/**
 * キャッシュをクリアする
 */
export function clearCaches(): void {
  wordsCache.clear();
  hintsCache.clear();
}

/**
 * 単語キャッシュを取得する
 * @returns 単語キャッシュインスタンス
 */
export function getWordsCache(): LRUCache<string, Word[]> {
  return wordsCache;
}

/**
 * ヒントキャッシュを取得する
 * @returns ヒントキャッシュインスタンス
 */
export function getHintsCache(): LRUCache<string, string[]> {
  return hintsCache;
}