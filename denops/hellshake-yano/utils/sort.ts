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
 * @template T - indexプロパティを持つオブジェクトの型
 * @param {T[]} items - ソート対象の配列
 * @returns {T[]} インデックス順にソートされた配列（元の配列は変更されません）
 * @example
 * const items = [{ index: 3, name: 'c' }, { index: 1, name: 'a' }, { index: 2, name: 'b' }];
 * const sorted = sortByIndex(items);
 * // => [{ index: 1, name: 'a' }, { index: 2, name: 'b' }, { index: 3, name: 'c' }]
 */
export function sortByIndex<T extends { index: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.index - b.index);
}

/**
 * 優先度ベースのソート（高い優先度が先頭）
 *
 * @template T - priorityプロパティを持つオブジェクトの型
 * @param {T[]} items - ソート対象の配列
 * @returns {T[]} 優先度順（降順）にソートされた配列（元の配列は変更されません）
 * @example
 * const tasks = [
 *   { priority: 1, task: 'low' },
 *   { priority: 5, task: 'high' },
 *   { priority: 3, task: 'medium' }
 * ];
 * const sorted = sortByPriorityDesc(tasks);
 * // => [{ priority: 5, task: 'high' }, { priority: 3, task: 'medium' }, { priority: 1, task: 'low' }]
 */
export function sortByPriorityDesc<T extends { priority: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.priority - a.priority);
}

/**
 * カスタムキー関数を使用した汎用ソート
 *
 * @template T - ソート対象のオブジェクトの型
 * @template K - ソートキーの型（文字列または数値）
 * @param {T[]} items - ソート対象の配列
 * @param {(item: T) => K} keyFn - ソートキーを抽出する関数
 * @param {boolean} [ascending=true] - 昇順の場合true、降順の場合false（デフォルト: true）
 * @returns {T[]} ソートされた配列（元の配列は変更されません）
 * @example
 * const users = [
 *   { name: 'Alice', age: 30 },
 *   { name: 'Bob', age: 25 },
 *   { name: 'Charlie', age: 35 }
 * ];
 * // 年齢で昇順ソート
 * const sortedByAge = sortBy(users, user => user.age);
 * // 名前で降順ソート
 * const sortedByName = sortBy(users, user => user.name, false);
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
 * ソート処理のパフォーマンス統計インターフェース
 */
export interface SortStats {
  /** 実行されたソートの総数 */
  totalSorts: number;
  /** ソートされたアイテムの総数 */
  totalItemsSorted: number;
  /** 平均実行時間（ミリ秒） */
  averageTime: number;
  /** 最新のソート実行時間（ミリ秒） */
  lastSortTime: number;
}

/**
 * ソート処理のパフォーマンス測定クラス
 * ソートの実行時間と統計情報を追跡し、パフォーマンス分析を可能にする
 */
class SortPerformanceTracker {
  private stats: SortStats = {
    totalSorts: 0,
    totalItemsSorted: 0,
    averageTime: 0,
    lastSortTime: 0,
  };

  /**
   * ソート処理の実行時間を測定して実行
   *
   * @template T - ソート対象の型
   * @param {T[]} items - ソート対象の配列
   * @param {(items: T[]) => T[]} sortFn - ソートを実行する関数
   * @returns {T[]} ソートされた配列
   * @throws {Error} sortFnがnullやundefinedの場合に投げられる可能性があります
   * @example
   * const tracker = new SortPerformanceTracker();
   * const result = tracker.measureSort(items, (arr) => arr.sort());
   * const stats = tracker.getStats();
   * console.log(`Sort took ${stats.lastSortTime}ms`);
   */
  measureSort<T>(items: T[], sortFn: (items: T[]) => T[]): T[] {
    const startTime = performance.now();
    const result = sortFn(items);
    const endTime = performance.now();

    const duration = endTime - startTime;
    this.updateStats(items.length, duration);

    return result;
  }

  /**
   * 統計情報を更新
   * 内部メソッドとして統計データの移動平均計算を行います
   *
   * @private
   * @param {number} itemCount - ソートされたアイテム数
   * @param {number} duration - 実行時間（ミリ秒）
   */
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

  /**
   * 現在のパフォーマンス統計を取得
   *
   * @returns {Readonly<SortStats>} 統計情報の読み取り専用コピー
   * @example
   * const stats = tracker.getStats();
   * console.log(`Total sorts: ${stats.totalSorts}`);
   * console.log(`Average time: ${stats.averageTime.toFixed(2)}ms`);
   */
  getStats(): Readonly<SortStats> {
    return { ...this.stats };
  }

  /**
   * パフォーマンス統計をリセット
   * 全ての統計データを初期状態に戻します
   *
   * @example
   * tracker.resetStats();
   * const stats = tracker.getStats();
   * console.log(stats.totalSorts); // => 0
   */
  resetStats(): void {
    this.stats = {
      totalSorts: 0,
      totalItemsSorted: 0,
      averageTime: 0,
      lastSortTime: 0,
    };
  }
}

/**
 * グローバルなソートパフォーマンストラッカーインスタンス
 */
export const globalSortTracker = new SortPerformanceTracker();

/**
 * パフォーマンス測定付きのインデックスソート
 * グローバルトラッカーを使用して実行時間を自動測定します
 *
 * @template T - ソート対象の型（indexプロパティを持つ必要がある）
 * @param {T[]} items - ソート対象の配列
 * @returns {T[]} パフォーマンス測定されたソート結果
 * @example
 * const items = [{ index: 3, data: 'c' }, { index: 1, data: 'a' }];
 * const sorted = sortByIndexMeasured(items);
 * const stats = getSortStats();
 * console.log(`Sort took ${stats.lastSortTime}ms`);
 */
export function sortByIndexMeasured<T extends { index: number }>(items: T[]): T[] {
  return globalSortTracker.measureSort(items, sortByIndex);
}

/**
 * パフォーマンス測定付きの優先度ソート
 * グローバルトラッカーを使用して実行時間を自動測定します
 *
 * @template T - ソート対象の型（priorityプロパティを持つ必要がある）
 * @param {T[]} items - ソート対象の配列
 * @returns {T[]} パフォーマンス測定されたソート結果（高い優先度が先頭）
 * @example
 * const tasks = [{ priority: 1, name: 'low' }, { priority: 5, name: 'high' }];
 * const sorted = sortByPriorityDescMeasured(tasks);
 * const stats = getSortStats();
 * console.log(`Sorted ${stats.totalItemsSorted} items in ${stats.lastSortTime}ms`);
 */
export function sortByPriorityDescMeasured<T extends { priority: number }>(items: T[]): T[] {
  return globalSortTracker.measureSort(items, sortByPriorityDesc);
}

/**
 * パフォーマンス測定付きのカスタムソート
 * グローバルトラッカーを使用して実行時間を自動測定します
 *
 * @template T - ソート対象の型
 * @template K - ソートキーの型（文字列または数値）
 * @param {T[]} items - ソート対象の配列
 * @param {(item: T) => K} keyFn - ソートキーを抽出する関数
 * @param {boolean} [ascending=true] - 昇順の場合true、降順の場合false
 * @returns {T[]} パフォーマンス測定されたソート結果
 * @example
 * const users = [{ name: 'Alice', score: 85 }, { name: 'Bob', score: 92 }];
 * const sorted = sortByMeasured(users, user => user.score, false);
 * const stats = getSortStats();
 * console.log(`Custom sort completed in ${stats.lastSortTime}ms`);
 */
export function sortByMeasured<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K,
  ascending = true,
): T[] {
  return globalSortTracker.measureSort(items, (arr) => sortBy(arr, keyFn, ascending));
}

/**
 * 現在のグローバルソートパフォーマンス統計を取得
 *
 * @returns {Readonly<SortStats>} パフォーマンス統計の読み取り専用コピー
 * @example
 * // 複数のソートを実行した後
 * const stats = getSortStats();
 * console.log(`Total sorts: ${stats.totalSorts}`);
 * console.log(`Items sorted: ${stats.totalItemsSorted}`);
 * console.log(`Average time: ${stats.averageTime.toFixed(2)}ms`);
 * console.log(`Last sort time: ${stats.lastSortTime.toFixed(2)}ms`);
 */
export function getSortStats(): Readonly<SortStats> {
  return globalSortTracker.getStats();
}

/**
 * グローバルソートパフォーマンス統計をリセット
 * 全てのパフォーマンス測定データを初期状態に戻します
 *
 * @example
 * // テストの前にリセット
 * resetSortStats();
 * // テストでソート処理を実行
 * sortByIndexMeasured(testData);
 * const stats = getSortStats();
 * expect(stats.totalSorts).toBe(1);
 */
export function resetSortStats(): void {
  globalSortTracker.resetStats();
}
