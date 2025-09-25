/**
 * adjacencyCache統合テスト
 * hint.tsのadjacencyCacheがUnifiedCacheに正しく統合されることをテスト
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/testing/asserts.ts";
import { UnifiedCache, CacheType } from "../denops/hellshake-yano/cache.ts";

interface Word {
  text: string;
  startCol: number;
  endCol: number;
  line: number;
}

Deno.test("adjacencyCache integration - cache type exists", () => {
  assertEquals(typeof CacheType.ADJACENCY, "string");
  assertEquals(CacheType.ADJACENCY, "ADJACENCY");
});

Deno.test("adjacencyCache integration - cache operations", () => {
  const unifiedCache = UnifiedCache.getInstance();
  unifiedCache.clearByType(CacheType.ADJACENCY);
  const adjacencyCache = unifiedCache.getCache<string, { word: Word; adjacentWords: Word[] }[]>(CacheType.ADJACENCY);

  const testWord: Word = { text: "test", startCol: 1, endCol: 4, line: 1 };
  const adjacentWord: Word = { text: "word", startCol: 6, endCol: 9, line: 1 };

  adjacencyCache.set("key1", [{ word: testWord, adjacentWords: [adjacentWord] }]);
  const result = adjacencyCache.get("key1");
  assertExists(result);
  assertEquals(result[0].word.text, "test");
  assertEquals(result[0].adjacentWords[0].text, "word");
});

Deno.test("adjacencyCache integration - cache configuration", () => {
  const unifiedCache = UnifiedCache.getInstance();
  const config = unifiedCache.getCacheConfig(CacheType.ADJACENCY);
  assertEquals(config.size, 200);
  assertEquals(config.description, "隣接単語のキャッシュ");
});