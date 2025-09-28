/**
 * @deprecated process4 sub8-2: このファイルは削除予定です
 */

/**
 * Display Utilities - Backward Compatibility Module
 *
 * MOVED: utils/display.ts has been migrated to hint.ts and core.ts
 *
 * Process4 Sub6-3: display.ts分散完了
 *
 * 移行先:
 * - 基本表示幅計算関数 → hint.ts
 *   - getCharDisplayWidth()
 *   - getDisplayWidth()
 *
 * - 高度な表示機能 → core.ts (static methods)
 *   - Core.createDisplayWidthCache()
 *   - Core.getDisplayWidthCached()
 *   - Core.clearDisplayWidthCache()
 *   - Core.getDisplayWidthCacheStats()
 *   - Core.hasWideCharacters()
 *
 * このファイルは削除予定です。
 * 新しいインポートパスを使用してください:
 * - hint.ts から基本表示幅計算関数をインポート
 * - core.ts から高度な表示機能をインポート（Core.methodName() 形式）
 *
 * @deprecated Use functions from hint.ts and core.ts instead
 * @module display
 * @version 2.0.0 - Migrated from utils/display.ts
 */

// 基本的な表示幅計算関数をhint.tsから再エクスポート
export {
  getCharDisplayWidth,
  getDisplayWidth
} from "../hint.ts";

// Coreクラスも再エクスポート（高度な機能用）
export { Core } from "../core.ts";

// 後方互換性のための型エイリアス
export type { LRUCache } from "../cache.ts";
export type { UnifiedCache, CacheType } from "../cache.ts";

/**
 * @deprecated Use Core.getVimDisplayWidth() instead
 */
export const getVimDisplayWidth = async (denops: any, text: string): Promise<number> => {
  console.warn('getVimDisplayWidth is deprecated. Use Core.getVimDisplayWidth() instead.');
  const { Core } = await import("../core.ts");
  return (Core as any).getVimDisplayWidth(denops, text);
};

/**
 * @deprecated Use Core.createDisplayWidthCache() instead
 */
export const createDisplayWidthCache = async (maxSize = 1000) => {
  console.warn('createDisplayWidthCache is deprecated. Use Core.createDisplayWidthCache() instead.');
  const { Core } = await import("../core.ts");
  return (Core as any).createDisplayWidthCache(maxSize);
};

/**
 * @deprecated Use Core.getDisplayWidthCached() instead
 */
export const getDisplayWidthCached = (text: string, tabWidth = 8) => {
  console.warn('getDisplayWidthCached is deprecated. Use Core.getDisplayWidthCached() instead.');
  throw new Error('This function has been moved to Core.getDisplayWidthCached() as an async method.');
};

/**
 * @deprecated Use Core.clearDisplayWidthCache() instead
 */
export const clearDisplayWidthCache = () => {
  console.warn('clearDisplayWidthCache is deprecated. Use Core.clearDisplayWidthCache() instead.');
  throw new Error('This function has been moved to Core.clearDisplayWidthCache() as an async method.');
};

/**
 * @deprecated Use Core.getDisplayWidthCacheStats() instead
 */
export const getDisplayWidthCacheStats = () => {
  console.warn('getDisplayWidthCacheStats is deprecated. Use Core.getDisplayWidthCacheStats() instead.');
  throw new Error('This function has been moved to Core.getDisplayWidthCacheStats() as an async method.');
};

/**
 * @deprecated Use Core.hasWideCharacters() instead
 */
export const hasWideCharacters = (text: string) => {
  console.warn('hasWideCharacters is deprecated. Use Core.hasWideCharacters() instead.');
  // この関数は移行済みのCore.hasWideCharactersを呼び出し
  throw new Error('This function has been moved to Core.hasWideCharacters().');
};