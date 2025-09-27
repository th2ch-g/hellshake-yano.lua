/**
 * @deprecated このファイルは廃止されました
 *
 * LRUCacheとCacheStatisticsは cache.ts に統合されました。
 * CacheManagerとglobalCacheManagerは削除され、UnifiedCacheシステムに置き換えられました。
 *
 * 新しいインポート先:
 * ```typescript
 * import { LRUCache, CacheStatistics, UnifiedCache, CacheType } from "./cache.ts";
 * ```
 *
 * 移行ガイド:
 * - LRUCache: 直接 cache.ts からインポート
 * - CacheStatistics: 直接 cache.ts からインポート
 * - CacheManager → UnifiedCache.getInstance()
 * - globalCacheManager → UnifiedCache.getInstance()
 */

// Re-export for backward compatibility (if needed)
export type { CacheStatistics } from "../cache.ts";
export { LRUCache } from "../cache.ts";