/**
 * Sort Utilities for Hellshake-Yano
 *
 * 複数のモジュール間で重複していたソート処理を統一化し、
 * 一貫性のあるソート機能を提供します。
 */

/**
 * インデックスベースの昇順ソート
 * 最も頻繁に使用されるソートパターンを共通化
 *
 * @param items - ソート対象の配列
 * @returns インデックス順にソートされた配列
 */
export function sortByIndex<T extends { index: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.index - b.index);
}

/**
 * 優先度ベースのソート（高い優先度が先頭）
 *
 * @param items - ソート対象の配列
 * @returns 優先度順（降順）にソートされた配列
 */
export function sortByPriorityDesc<T extends { priority: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.priority - a.priority);
}

/**
 * 優先度ベースのソート（低い優先度が先頭）
 *
 * @param items - ソート対象の配列
 * @returns 優先度順（昇順）にソートされた配列
 */
export function sortByPriorityAsc<T extends { priority: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.priority - b.priority);
}

/**
 * タイムスタンプベースのソート（古い順）
 *
 * @param items - ソート対象の配列
 * @returns タイムスタンプ順にソートされた配列
 */
export function sortByTimestamp<T extends { timestamp: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * カスタムキー関数を使用した汎用ソート
 *
 * @param items - ソート対象の配列
 * @param keyFn - ソートキーを抽出する関数
 * @param ascending - 昇順の場合true、降順の場合false（デフォルト: true）
 * @returns ソートされた配列
 */
export function sortBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K,
  ascending = true,
): T[] {
  return [...items].sort((a, b) => {
    const keyA = keyFn(a);
    const keyB = keyFn(b);

    if (keyA < keyB) return ascending ? -1 : 1;
    if (keyA > keyB) return ascending ? 1 : -1;
    return 0;
  });
}

/**
 * 複合ソート：距離と優先度を組み合わせたソート
 * hint.ts内の複雑なソートロジックを抽象化
 *
 * @param items - ソート対象の配列
 * @returns 距離と優先度を考慮してソートされた配列
 */
export function sortByDistanceAndPriority<T extends {
  distance: number;
  priority?: number
}>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    // 距離が短い方を優先
    const distanceDiff = a.distance - b.distance;
    if (distanceDiff !== 0) return distanceDiff;

    // 距離が同じ場合は優先度を考慮
    const priorityA = a.priority ?? 0;
    const priorityB = b.priority ?? 0;
    return priorityB - priorityA; // 高い優先度を先に
  });
}

/**
 * エントリー配列のソート（タイムスタンプベース）
 * word/manager.ts内のキャッシュエントリーソート用
 *
 * @param entries - [key, value]形式のエントリー配列
 * @returns タイムスタンプ順にソートされたエントリー配列
 */
export function sortEntriesByTimestamp<K, V extends { timestamp: number }>(
  entries: [K, V][],
): [K, V][] {
  return [...entries].sort((a, b) => a[1].timestamp - b[1].timestamp);
}

/**
 * 安定ソート：同じ値を持つ要素の相対位置を保持
 * JavaScriptのArray.sort()は安定ソートではないため、必要に応じて使用
 *
 * @param items - ソート対象の配列
 * @param compareFn - 比較関数
 * @returns 安定ソートされた配列
 */
export function stableSort<T>(
  items: T[],
  compareFn: (a: T, b: T) => number,
): T[] {
  // 元のインデックスを保持してからソート
  const indexedItems = items.map((item, index) => ({ item, index }));

  indexedItems.sort((a, b) => {
    const result = compareFn(a.item, b.item);
    // 同じ値の場合は元のインデックス順を維持
    return result !== 0 ? result : a.index - b.index;
  });

  return indexedItems.map(({ item }) => item);
}

/**
 * ソート処理のパフォーマンス統計
 */
export interface SortStats {
  totalSorts: number;
  totalItemsSorted: number;
  averageTime: number;
  lastSortTime: number;
}

/**
 * ソート処理のパフォーマンス測定
 */
class SortPerformanceTracker {
  private stats: SortStats = {
    totalSorts: 0,
    totalItemsSorted: 0,
    averageTime: 0,
    lastSortTime: 0,
  };

  /**
   * ソート処理を測定して実行
   */
  measureSort<T>(items: T[], sortFn: (items: T[]) => T[]): T[] {
    const startTime = performance.now();
    const result = sortFn(items);
    const endTime = performance.now();

    const duration = endTime - startTime;
    this.updateStats(items.length, duration);

    return result;
  }

  private updateStats(itemCount: number, duration: number): void {
    this.stats.totalSorts++;
    this.stats.totalItemsSorted += itemCount;
    this.stats.lastSortTime = duration;

    // 移動平均でavergageTimeを更新
    this.stats.averageTime = (
      (this.stats.averageTime * (this.stats.totalSorts - 1) + duration) /
      this.stats.totalSorts
    );
  }

  getStats(): Readonly<SortStats> {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      totalSorts: 0,
      totalItemsSorted: 0,
      averageTime: 0,
      lastSortTime: 0,
    };
  }
}

// グローバルなパフォーマンストラッカー
export const sortPerformanceTracker = new SortPerformanceTracker();