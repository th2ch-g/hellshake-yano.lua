/**
 * 統一キャッシュクラスのテスト
 * TDD Red-Green-Refactor の Red フェーズ（失敗するテスト）
 */

import { assertEquals, assertThrows } from "https://deno.land/std@0.203.0/assert/mod.ts";
import { UnifiedCache, CacheType } from "../denops/hellshake-yano/cache.ts";

// テスト前にキャッシュをクリーンアップするヘルパー関数
function cleanupCache() {
  const cache = UnifiedCache.getInstance();
  cache.clearAll();
}

Deno.test("UnifiedCache - CacheType enum should have 11 types", () => {
  const expectedTypes = [
    "WORDS",
    "HINTS",
    "DISPLAY",
    "ANALYSIS",
    "TEMP",
    "HINT_ASSIGNMENT_NORMAL",
    "HINT_ASSIGNMENT_VISUAL",
    "HINT_ASSIGNMENT_OTHER",
    "LANGUAGE_RULES",
    "SYNTAX_CONTEXT",
    "DICTIONARY"
  ];

  expectedTypes.forEach(type => {
    assertEquals(CacheType[type as keyof typeof CacheType], type);
  });
});

Deno.test("UnifiedCache - Singleton pattern test", () => {
  const instance1 = UnifiedCache.getInstance();
  const instance2 = UnifiedCache.getInstance();

  assertEquals(instance1, instance2, "getInstance() should return the same instance");
});

Deno.test("UnifiedCache - getCache() should return LRUCache instance", () => {
  const cache = UnifiedCache.getInstance();
  const wordsCache = cache.getCache(CacheType.WORDS);
  const hintsCache = cache.getCache(CacheType.HINTS);

  assertEquals(typeof wordsCache.get, "function");
  assertEquals(typeof wordsCache.set, "function");
  assertEquals(typeof wordsCache.clear, "function");
  assertEquals(typeof wordsCache.size, "function");
  assertEquals(typeof wordsCache.getStats, "function");

  // 異なるタイプのキャッシュは異なるインスタンスであること
  assertEquals(wordsCache === hintsCache, false);
});

Deno.test("UnifiedCache - Cache type isolation test", () => {
  const cache = UnifiedCache.getInstance();
  const wordsCache = cache.getCache<string, string>(CacheType.WORDS);
  const hintsCache = cache.getCache<string, string>(CacheType.HINTS);

  // 同じキーを使って異なるキャッシュに値を設定
  wordsCache.set("test", "words-value");
  hintsCache.set("test", "hints-value");

  // 各キャッシュは独立していること
  assertEquals(wordsCache.get("test"), "words-value");
  assertEquals(hintsCache.get("test"), "hints-value");
});

Deno.test("UnifiedCache - getAllStats() should return all cache statistics", () => {
  cleanupCache();
  const cache = UnifiedCache.getInstance();

  // 各キャッシュに値を設定してヒット/ミスを発生させる
  const wordsCache = cache.getCache<string, number>(CacheType.WORDS);
  const hintsCache = cache.getCache<string, number>(CacheType.HINTS);

  wordsCache.set("key1", 1);
  hintsCache.set("key2", 2);

  // ヒット・ミスを発生させる
  wordsCache.get("key1"); // hit
  wordsCache.get("nonexistent"); // miss
  hintsCache.get("key2"); // hit

  const stats = cache.getAllStats();

  assertEquals(typeof stats, "object");
  assertEquals(typeof stats[CacheType.WORDS], "object");
  assertEquals(typeof stats[CacheType.HINTS], "object");

  assertEquals(stats[CacheType.WORDS].hits, 1);
  assertEquals(stats[CacheType.WORDS].misses, 1);
  assertEquals(stats[CacheType.HINTS].hits, 1);
  assertEquals(stats[CacheType.HINTS].misses, 0);
});

Deno.test("UnifiedCache - clearAll() should clear all caches", () => {
  cleanupCache();
  const cache = UnifiedCache.getInstance();
  const wordsCache = cache.getCache<string, number>(CacheType.WORDS);
  const hintsCache = cache.getCache<string, number>(CacheType.HINTS);

  // データを設定
  wordsCache.set("key1", 1);
  hintsCache.set("key2", 2);

  assertEquals(wordsCache.size(), 1);
  assertEquals(hintsCache.size(), 1);

  // 全キャッシュをクリア
  cache.clearAll();

  assertEquals(wordsCache.size(), 0);
  assertEquals(hintsCache.size(), 0);
});

Deno.test("UnifiedCache - clearByType() should clear specific cache type", () => {
  cleanupCache();
  const cache = UnifiedCache.getInstance();
  const wordsCache = cache.getCache<string, number>(CacheType.WORDS);
  const hintsCache = cache.getCache<string, number>(CacheType.HINTS);

  // データを設定
  wordsCache.set("key1", 1);
  hintsCache.set("key2", 2);

  assertEquals(wordsCache.size(), 1);
  assertEquals(hintsCache.size(), 1);

  // 特定タイプのみクリア
  cache.clearByType(CacheType.WORDS);

  assertEquals(wordsCache.size(), 0);
  assertEquals(hintsCache.size(), 1); // こちらは残る
});

Deno.test("UnifiedCache - Type-safe generic interface test", () => {
  const cache = UnifiedCache.getInstance();

  // 型安全なジェネリックインターフェースのテスト
  const stringCache = cache.getCache<string, string>(CacheType.WORDS);
  const numberCache = cache.getCache<string, number>(CacheType.HINTS);
  const objectCache = cache.getCache<string, {name: string, age: number}>(CacheType.TEMP);

  stringCache.set("string-key", "string-value");
  numberCache.set("number-key", 42);
  objectCache.set("object-key", {name: "test", age: 30});

  assertEquals(stringCache.get("string-key"), "string-value");
  assertEquals(numberCache.get("number-key"), 42);
  assertEquals(objectCache.get("object-key"), {name: "test", age: 30});
});

Deno.test("UnifiedCache - All cache types should have appropriate maxSize", () => {
  const cache = UnifiedCache.getInstance();
  const stats = cache.getAllStats();

  // 各キャッシュタイプが適切な最大サイズを持つことを確認
  const expectedSizes: Record<string, number> = {
    [CacheType.WORDS]: 1000,
    [CacheType.HINTS]: 500,
    [CacheType.DISPLAY]: 200,
    [CacheType.ANALYSIS]: 300,
    [CacheType.TEMP]: 100,
    [CacheType.HINT_ASSIGNMENT_NORMAL]: 100,
    [CacheType.HINT_ASSIGNMENT_VISUAL]: 100,
    [CacheType.HINT_ASSIGNMENT_OTHER]: 100,
    [CacheType.LANGUAGE_RULES]: 50,
    [CacheType.SYNTAX_CONTEXT]: 200,
    [CacheType.DICTIONARY]: 2000,
  };

  Object.entries(expectedSizes).forEach(([cacheType, expectedSize]) => {
    assertEquals(stats[cacheType].maxSize, expectedSize,
      `${cacheType} should have maxSize of ${expectedSize}`);
  });
});

Deno.test("UnifiedCache - LRU behavior test", () => {
  const cache = UnifiedCache.getInstance();
  const tempCache = cache.getCache<string, number>(CacheType.TEMP); // maxSize: 100

  // キャッシュを満杯にする
  for (let i = 0; i < 100; i++) {
    tempCache.set(`key${i}`, i);
  }

  assertEquals(tempCache.size(), 100);

  // 追加の要素を入れると最も古い要素が削除されるはず
  tempCache.set("new-key", 999);

  assertEquals(tempCache.size(), 100);
  assertEquals(tempCache.get("key0"), undefined); // 最初の要素は削除されている
  assertEquals(tempCache.get("new-key"), 999);   // 新しい要素は存在する
});