/**
 * charTypeCache統合テスト
 * utils/charType.tsのcharTypeCacheがUnifiedCacheに正しく統合されることをテスト
 *
 * TDD Red-Green-Refactor: RED Phase
 * まずテストを失敗させ、その後実装で成功させる
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/testing/asserts.ts";
import { UnifiedCache, CacheType } from "../denops/hellshake-yano/cache.ts";
import { CharType } from "../denops/hellshake-yano/word.ts";

Deno.test("charTypeCache integration - cache type exists", () => {
  // CacheType.CHAR_TYPEが定義されていることを確認
  assertEquals(typeof CacheType.CHAR_TYPE, "string");
  assertEquals(CacheType.CHAR_TYPE, "CHAR_TYPE");
});

Deno.test("charTypeCache integration - cache instance accessible", () => {
  const unifiedCache = UnifiedCache.getInstance();
  unifiedCache.clearByType(CacheType.CHAR_TYPE); // テスト開始時にクリア

  // CHAR_TYPEキャッシュインスタンスが取得できることを確認
  const charTypeCache = unifiedCache.getCache<string, CharType>(CacheType.CHAR_TYPE);
  assertExists(charTypeCache);

  // 基本操作が機能することを確認
  charTypeCache.set("あ", CharType.Hiragana);
  assertEquals(charTypeCache.get("あ"), CharType.Hiragana);
});

Deno.test("charTypeCache integration - cache configuration", () => {
  const unifiedCache = UnifiedCache.getInstance();

  // キャッシュ設定が存在することを確認
  const config = unifiedCache.getCacheConfig(CacheType.CHAR_TYPE);
  assertExists(config);
  assertEquals(config.size, 1000);
  assertEquals(config.description, "文字種判定のキャッシュ");
});

Deno.test("charTypeCache integration - character type caching", () => {
  const unifiedCache = UnifiedCache.getInstance();
  unifiedCache.clearByType(CacheType.CHAR_TYPE); // テスト開始時にクリア
  const charTypeCache = unifiedCache.getCache<string, CharType>(CacheType.CHAR_TYPE);

  // 各文字種のキャッシュをテスト
  const testCases = [
    { char: "あ", type: CharType.Hiragana },
    { char: "ア", type: CharType.Katakana },
    { char: "漢", type: CharType.Kanji },
    { char: "A", type: CharType.Alphanumeric },
    { char: "1", type: CharType.Alphanumeric },
    { char: "!", type: CharType.Symbol },
    { char: " ", type: CharType.Space },
  ];

  testCases.forEach(({ char, type }) => {
    charTypeCache.set(char, type);
    assertEquals(charTypeCache.get(char), type);
  });

  // キャッシュサイズの確認
  assertEquals(charTypeCache.size(), testCases.length);
});

Deno.test("charTypeCache integration - cache statistics", () => {
  const unifiedCache = UnifiedCache.getInstance();
  unifiedCache.clearByType(CacheType.CHAR_TYPE); // テスト開始時にクリア
  const charTypeCache = unifiedCache.getCache<string, CharType>(CacheType.CHAR_TYPE);

  // テストデータを追加
  charTypeCache.set("あ", CharType.Hiragana);
  charTypeCache.set("ア", CharType.Katakana);

  // 統計情報を取得
  const allStats = unifiedCache.getAllStats();
  assertExists(allStats[CacheType.CHAR_TYPE]);

  const charTypeStats = allStats[CacheType.CHAR_TYPE];
  assertEquals(charTypeStats.size, 2);
  assertEquals(charTypeStats.maxSize, 1000);
});

Deno.test("charTypeCache integration - cache clearing", () => {
  const unifiedCache = UnifiedCache.getInstance();
  const charTypeCache = unifiedCache.getCache<string, CharType>(CacheType.CHAR_TYPE);

  // 現在のサイズを取得（他のテストの影響を考慮）
  const initialSize = charTypeCache.size();

  // テストデータを追加
  charTypeCache.set("test1", CharType.Other);
  charTypeCache.set("test2", CharType.Other);
  assertEquals(charTypeCache.size(), initialSize + 2);

  // タイプ別クリア
  unifiedCache.clearByType(CacheType.CHAR_TYPE);
  assertEquals(charTypeCache.size(), 0);

  // 再度テストデータを追加
  charTypeCache.set("test3", CharType.Other);
  assertEquals(charTypeCache.size(), 1);

  // 全体クリア
  unifiedCache.clearAll();
  assertEquals(charTypeCache.size(), 0);
});

Deno.test("charTypeCache integration - unicode character types", () => {
  const unifiedCache = UnifiedCache.getInstance();
  unifiedCache.clearByType(CacheType.CHAR_TYPE); // テスト開始時にクリア
  const charTypeCache = unifiedCache.getCache<string, CharType>(CacheType.CHAR_TYPE);

  // Unicode範囲での文字種テスト
  const unicodeTestCases = [
    { char: "🎉", type: CharType.Symbol }, // 絵文字
    { char: "α", type: CharType.Other }, // ギリシャ文字
    { char: "Ａ", type: CharType.Other }, // 全角英字
    { char: "０", type: CharType.Other }, // 全角数字
    { char: "\t", type: CharType.Space }, // タブ文字
    { char: "\n", type: CharType.Space }, // 改行文字
  ];

  unicodeTestCases.forEach(({ char, type }) => {
    charTypeCache.set(char, type);
    assertEquals(charTypeCache.get(char), type);
  });
});

Deno.test("charTypeCache integration - cache size limit simulation", () => {
  const unifiedCache = UnifiedCache.getInstance();
  unifiedCache.clearByType(CacheType.CHAR_TYPE); // テスト開始時にクリア
  const charTypeCache = unifiedCache.getCache<string, CharType>(CacheType.CHAR_TYPE);

  // 多数のエントリを追加してLRUの動作をテスト
  const testEntries = 50;
  for (let i = 0; i < testEntries; i++) {
    charTypeCache.set(`char${i}`, CharType.Other);
  }

  assertEquals(charTypeCache.size(), testEntries);

  // 古いエントリが削除されることを確認（キャッシュサイズが上限以下の場合は全て保持される）
  assertEquals(charTypeCache.get("char0"), CharType.Other);
  assertEquals(charTypeCache.get(`char${testEntries - 1}`), CharType.Other);
});