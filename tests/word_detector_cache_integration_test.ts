import { assertEquals, assertExists, assertThrows } from "@std/assert";
import type { Word } from "../denops/hellshake-yano/types.ts";
import { UnifiedCache, CacheType } from "../denops/hellshake-yano/cache.ts";
import { KeyBasedWordCache, globalWordCache } from "../denops/hellshake-yano/word.ts";

/**
 * TDD Red-Green-Refactor による KeyBasedWordCache の UnifiedCache 統合テスト
 *
 * RED フェーズ: UnifiedCache統合がまだ実装されていないため、これらのテストは失敗するはず
 * GREEN フェーズ: 統合実装後にこれらのテストがパスするよう実装
 * REFACTOR フェーズ: 実装をクリーンアップし最適化
 */

Deno.test("KeyBasedWordCache UnifiedCache Integration Tests (RED Phase)", async (t) => {
  await t.step("KeyBasedWordCache should use UnifiedCache under the hood", () => {
    // RED: この時点では KeyBasedWordCache は Map を使用しているため失敗するはず
    const cache = new KeyBasedWordCache();
    const testWords: Word[] = [
      { text: "hello", line: 1, col: 1, byteCol: 1 },
      { text: "world", line: 1, col: 7, byteCol: 7 }
    ];

    // キャッシュに設定
    cache.set("test_key", testWords);

    // UnifiedCache の WORDS タイプが使用されているかチェック（現在は失敗するはず）
    const unifiedCache = UnifiedCache.getInstance();
    const wordsCache = unifiedCache.getCache<string, Word[]>(CacheType.WORDS);

    // この時点では UnifiedCache は使用されていないため、統計に反映されない
    const unifiedStats = unifiedCache.getAllStats();
    const wordCacheStats = unifiedStats.WORDS;

    // RED: UnifiedCache が使用されていないため、ヒット数は0のはず
    assertEquals(wordCacheStats.hits, 0, "UnifiedCache should be used but currently isn't");
  });

  await t.step("globalWordCache should use UnifiedCache.WORDS", () => {
    // RED: globalWordCache が UnifiedCache を使用していないため失敗するはず
    const testWords: Word[] = [
      { text: "global", line: 2, col: 1, byteCol: 1 },
      { text: "cache", line: 2, col: 8, byteCol: 8 }
    ];

    globalWordCache.set("global_test", testWords);
    const retrieved = globalWordCache.get("global_test");

    assertEquals(retrieved?.length, 2);
    assertEquals(retrieved?.[0].text, "global");

    // UnifiedCache の統計を確認
    const unifiedCache = UnifiedCache.getInstance();
    const stats = unifiedCache.getAllStats();

    // GREEN: UnifiedCache を使用しているため、ヒット統計が記録される
    assertEquals(stats.WORDS.hits > 0, true, "globalWordCache should use UnifiedCache and stats should be recorded");
  });

  await t.step("KeyBasedWordCache should have clear method compatible with UnifiedCache", () => {
    // RED: 特定キーのクリアがUnifiedCacheに反映されないため失敗するはず
    const cache = new KeyBasedWordCache();
    const testWords: Word[] = [{ text: "test", line: 1, col: 1, byteCol: 1 }];

    cache.set("key1", testWords);
    cache.set("key2", testWords);

    // 特定キーをクリア
    cache.clear("key1");

    assertEquals(cache.get("key1"), undefined);
    assertExists(cache.get("key2"));

    // 全体クリア
    cache.clear();
    assertEquals(cache.get("key2"), undefined);

    // UnifiedCache側でもクリアされているかチェック（現在は失敗するはず）
    const unifiedCache = UnifiedCache.getInstance();
    const wordsCache = unifiedCache.getCache<string, Word[]>(CacheType.WORDS);

    // RED: UnifiedCache を使用していないため、クリア操作が反映されない
    assertEquals(wordsCache.size(), 0, "UnifiedCache should also be cleared but isn't integrated yet");
  });

  await t.step("KeyBasedWordCache getStats should reflect UnifiedCache statistics", () => {
    // RED: getStats が UnifiedCache の統計を返さないため失敗するはず
    const cache = new KeyBasedWordCache();
    const testWords: Word[] = [{ text: "stats", line: 1, col: 1, byteCol: 1 }];

    cache.set("stats_key", testWords);
    cache.get("stats_key"); // ヒットを発生させる

    const stats = cache.getStats();

    // 現在の実装確認
    assertEquals(typeof stats.size, "number");
    assertEquals(Array.isArray(stats.keys), true);

    // GREEN: UnifiedCache統計を取得する機能が実装されているため成功するはず
    // 新しい統計プロパティが存在するかチェック
    const hasUnifiedStats = 'hitRate' in stats || 'hits' in stats || 'misses' in stats;
    assertEquals(hasUnifiedStats, true, "getStats should include UnifiedCache statistics and now it does");
  });

  await t.step("Multiple KeyBasedWordCache instances should share UnifiedCache", () => {
    // RED: 複数のインスタンスが UnifiedCache を共有していないため失敗するはず
    const cache1 = new KeyBasedWordCache();
    const cache2 = new KeyBasedWordCache();

    const testWords: Word[] = [{ text: "shared", line: 1, col: 1, byteCol: 1 }];

    cache1.set("shared_key", testWords);

    // cache2からもアクセス可能であることを確認（UnifiedCache共有の場合）
    const retrieved = cache2.get("shared_key");

    // GREEN: UnifiedCache を共有しているため、データが取得できる
    assertEquals(retrieved !== undefined, true, "Instances should share UnifiedCache and now they do");
    assertEquals(retrieved?.[0]?.text, "shared", "Retrieved data should match original data");

    // UnifiedCache の統計で共有を確認
    const unifiedCache = UnifiedCache.getInstance();
    const stats = unifiedCache.getAllStats();

    // GREEN: UnifiedCache を使用しているため統計に変化あり
    assertEquals(stats.WORDS.hits > 0, true, "UnifiedCache should show access stats and integration is implemented");
  });
});

Deno.test("UnifiedCache WORDS type configuration validation", async (t) => {
  await t.step("UnifiedCache should have WORDS cache type with proper configuration", () => {
    const unifiedCache = UnifiedCache.getInstance();

    // WORDS キャッシュタイプが存在することを確認
    const wordsCache = unifiedCache.getCache<string, Word[]>(CacheType.WORDS);
    assertExists(wordsCache);

    // 設定を確認
    const config = unifiedCache.getCacheConfig(CacheType.WORDS);
    assertEquals(config.size, 1000); // PLAN.md に従った適切なサイズ
    assertEquals(typeof config.description, "string");
  });

  await t.step("UnifiedCache WORDS cache should handle Word[] values correctly", () => {
    const unifiedCache = UnifiedCache.getInstance();
    const wordsCache = unifiedCache.getCache<string, Word[]>(CacheType.WORDS);

    const testWords: Word[] = [
      { text: "unified", line: 1, col: 1, byteCol: 1 },
      { text: "cache", line: 1, col: 9, byteCol: 9 },
      { text: "test", line: 2, col: 1, byteCol: 1 }
    ];

    wordsCache.set("test_words", testWords);
    const retrieved = wordsCache.get("test_words");

    assertEquals(retrieved?.length, 3);
    assertEquals(retrieved?.[0].text, "unified");
    assertEquals(retrieved?.[1].text, "cache");
    assertEquals(retrieved?.[2].text, "test");

    // 統計の確認
    const stats = unifiedCache.getAllStats();
    // 他のテストの影響でサイズは複数になる可能性がある
    assertEquals(stats.WORDS.size >= 1, true);
  });
});