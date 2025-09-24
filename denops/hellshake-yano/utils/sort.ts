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

