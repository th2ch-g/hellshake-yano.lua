/**
 * tests/common/cache/unified-cache.test.ts
 */

import { assertEquals } from "jsr:@std/assert";
import { LRUCache } from "../../../denops/hellshake-yano/common/cache/unified-cache.ts";

Deno.test("LRUCache: 値の保存と取得", () => {
  const cache = new LRUCache<string, number>(3);
  cache.set("a", 1);
  assertEquals(cache.get("a"), 1);
});

Deno.test("LRUCache: LRU削除", () => {
  const cache = new LRUCache<string, number>(2);
  cache.set("a", 1);
  cache.set("b", 2);
  cache.set("c", 3); // "a" が削除される
  assertEquals(cache.get("a"), undefined);
  assertEquals(cache.get("b"), 2);
  assertEquals(cache.get("c"), 3);
});

Deno.test("LRUCache: キャッシュクリア", () => {
  const cache = new LRUCache<string, number>(3);
  cache.set("a", 1);
  cache.clear();
  assertEquals(cache.size(), 0);
});

Deno.test("LRUCache: 統計情報取得", () => {
  const cache = new LRUCache<string, number>(3);
  cache.set("a", 1);
  cache.get("a"); // hit
  cache.get("b"); // miss
  const stats = cache.getStats();
  assertEquals(stats.hits, 1);
  assertEquals(stats.misses, 1);
  assertEquals(stats.hitRate, 0.5);
});
