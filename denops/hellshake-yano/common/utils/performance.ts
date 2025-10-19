/**
 * denops/hellshake-yano/common/utils/performance.ts
 *
 * パフォーマンス計測
 */

/**
 * パフォーマンスメトリクス
 */
export interface PerformanceMetrics {
  showHints: number[];
  hideHints: number[];
  wordDetection: number[];
  hintGeneration: number[];
}

let performanceMetrics: PerformanceMetrics = {
  showHints: [],
  hideHints: [],
  wordDetection: [],
  hintGeneration: [],
};

/**
 * パフォーマンス記録
 */
export function recordPerformance(
  operation: keyof PerformanceMetrics,
  duration: number,
): void {
  const metrics = performanceMetrics[operation];
  metrics.push(duration);
  if (metrics.length > 50) metrics.shift();
}

/**
 * メトリクス取得
 */
export function getPerformanceMetrics(): PerformanceMetrics {
  return performanceMetrics;
}

/**
 * メトリクスリセット
 */
export function resetPerformanceMetrics(): void {
  performanceMetrics = {
    showHints: [],
    hideHints: [],
    wordDetection: [],
    hintGeneration: [],
  };
}
