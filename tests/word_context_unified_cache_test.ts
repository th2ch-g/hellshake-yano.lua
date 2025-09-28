/**
 * Word Context UnifiedCache Integration Test Suite - TDD Red Phase
 *
 * このテストスイートは word/context.ts の UnifiedCache 統合を検証します。
 * TDD Red-Green-Refactor サイクルに従って実装されています。
 *
 * Test Coverage:
 * 1. ContextDetector クラスの UnifiedCache 統合
 * 2. languageRuleCache → UnifiedCache.LANGUAGE_RULES への移行
 * 3. contextCache → UnifiedCache.SYNTAX_CONTEXT への移行
 * 4. キャッシュ操作の一貫性
 * 5. パフォーマンスの維持
 * 6. 既存機能の後方互換性
 */

import { assertEquals, assertExists, assertNotEquals } from "@std/assert";
import { ContextDetector } from "../denops/hellshake-yano/word.ts";
import { UnifiedCache, CacheType } from "../denops/hellshake-yano/cache.ts";

Deno.test("ContextDetector should use UnifiedCache for language rules", async () => {
  const detector = new ContextDetector();
  const unifiedCache = UnifiedCache.getInstance();

  // 初期状態のキャッシュをクリア
  unifiedCache.clearByType(CacheType.LANGUAGE_RULES);

  // 言語パターンの取得をトリガー（キャッシュされるはず）
  const context1 = detector.detectSyntaxContext("function test() {}", 1, "typescript");
  assertExists(context1);

  // UnifiedCache の LANGUAGE_RULES キャッシュに言語ルールが格納されているかを確認
  const languageRulesCache = unifiedCache.getCache(CacheType.LANGUAGE_RULES);
  const stats = languageRulesCache.getStats();

  // キャッシュにアクセスがあったことを確認（hits + missesで測定）
  assertNotEquals(stats.hits + stats.misses, 0, "Language rules cache should have been accessed");
});

Deno.test("ContextDetector should use UnifiedCache for syntax context", async () => {
  const detector = new ContextDetector();
  const unifiedCache = UnifiedCache.getInstance();

  // 初期状態のキャッシュをクリア
  unifiedCache.clearByType(CacheType.SYNTAX_CONTEXT);

  const testText = "const hello = 'world';";
  const fileType = "javascript";

  // 同じコンテキストを2回検出（2回目はキャッシュからの取得になるはず）
  const context1 = detector.detectSyntaxContext(testText, 1, fileType);
  const context2 = detector.detectSyntaxContext(testText, 1, fileType);

  assertExists(context1);
  assertExists(context2);
  assertEquals(context1.language, context2.language);

  // UnifiedCache の SYNTAX_CONTEXT キャッシュが使用されているかを確認
  const syntaxContextCache = unifiedCache.getCache(CacheType.SYNTAX_CONTEXT);
  const stats = syntaxContextCache.getStats();

  // キャッシュヒットが発生していることを確認
  assertNotEquals(stats.hits, 0, "Syntax context cache should have cache hits");
});

Deno.test("ContextDetector clearCache should use UnifiedCache clearByType", () => {
  const detector = new ContextDetector();
  const unifiedCache = UnifiedCache.getInstance();

  // まずキャッシュにデータを入れる
  detector.detectSyntaxContext("test", 1, "javascript");

  // キャッシュにデータがあることを確認
  const syntaxContextCache = unifiedCache.getCache(CacheType.SYNTAX_CONTEXT);
  const statsBeforeClear = syntaxContextCache.getStats();
  assertNotEquals(statsBeforeClear.hits + statsBeforeClear.misses, 0);

  // ContextDetector の clearCache メソッドを呼び出し
  detector.clearCache();

  // UnifiedCache の該当タイプがクリアされていることを確認
  const statsAfterClear = syntaxContextCache.getStats();
  assertEquals(statsAfterClear.size, 0, "Cache should be cleared after clearCache call");
});

Deno.test("ContextDetector should maintain cache consistency with UnifiedCache", async () => {
  const detector = new ContextDetector();
  const unifiedCache = UnifiedCache.getInstance();

  // キャッシュをクリア
  unifiedCache.clearByType(CacheType.LANGUAGE_RULES);
  unifiedCache.clearByType(CacheType.SYNTAX_CONTEXT);

  const testCases = [
    { text: "function test() {}", fileType: "typescript", line: 1 },
    { text: "def test():", fileType: "python", line: 2 },
    { text: "class Test {}", fileType: "javascript", line: 3 },
  ];

  // 複数のコンテキスト検出を実行
  for (const testCase of testCases) {
    const context = detector.detectSyntaxContext(testCase.text, testCase.line, testCase.fileType);
    assertExists(context);
    assertExists(context.language);
  }

  // キャッシュ統計の確認
  const languageRulesStats = unifiedCache.getCache(CacheType.LANGUAGE_RULES).getStats();
  const syntaxContextStats = unifiedCache.getCache(CacheType.SYNTAX_CONTEXT).getStats();

  assertNotEquals(languageRulesStats.hits + languageRulesStats.misses, 0, "Language rules cache should be used");
  assertNotEquals(syntaxContextStats.hits + syntaxContextStats.misses, 0, "Syntax context cache should be used");

  // キャッシュサイズの確認
  assertEquals(languageRulesStats.size > 0, true, "Language rules cache should contain entries");
  assertEquals(syntaxContextStats.size > 0, true, "Syntax context cache should contain entries");
});

Deno.test("ContextDetector cache operations should be backward compatible", () => {
  const detector = new ContextDetector();

  // 既存の getCacheStats メソッドが動作することを確認
  const stats = detector.getCacheStats();
  assertExists(stats);
  assertExists(stats.contextCacheSize);
  assertExists(stats.languageRuleCacheSize);

  // 統計情報の型が正しいことを確認
  assertEquals(typeof stats.contextCacheSize, "number");
  assertEquals(typeof stats.languageRuleCacheSize, "number");
});

Deno.test("ContextDetector should handle cache memory management with UnifiedCache", () => {
  const detector = new ContextDetector();
  const unifiedCache = UnifiedCache.getInstance();

  // キャッシュをクリア
  unifiedCache.clearByType(CacheType.SYNTAX_CONTEXT);

  // LRU制限をテストするために大量のキャッシュエントリを生成
  const cacheLimit = 200; // UnifiedCache の SYNTAX_CONTEXT のサイズ制限

  for (let i = 0; i < cacheLimit + 10; i++) {
    const text = `test-${i}`;
    detector.detectSyntaxContext(text, i, "javascript");
  }

  // キャッシュサイズがLRU制限内であることを確認
  const syntaxContextCache = unifiedCache.getCache(CacheType.SYNTAX_CONTEXT);
  const stats = syntaxContextCache.getStats();

  assertEquals(stats.size <= cacheLimit, true, "Cache size should not exceed LRU limit");
});

Deno.test("ContextDetector should share language rules cache across instances", () => {
  const detector1 = new ContextDetector();
  const detector2 = new ContextDetector();

  const unifiedCache = UnifiedCache.getInstance();
  unifiedCache.clearByType(CacheType.LANGUAGE_RULES);

  // detector1 で言語ルールをキャッシュに読み込む
  detector1.detectSyntaxContext("function test() {}", 1, "typescript");

  const statsAfterFirstAccess = unifiedCache.getCache(CacheType.LANGUAGE_RULES).getStats();
  const sizeAfterFirst = statsAfterFirstAccess.size;

  // detector2 で同じ言語の検出（キャッシュヒットするはず）
  detector2.detectSyntaxContext("const x = 1;", 1, "typescript");

  const statsAfterSecondAccess = unifiedCache.getCache(CacheType.LANGUAGE_RULES).getStats();
  const sizeAfterSecond = statsAfterSecondAccess.size;

  // 2回目のアクセスでキャッシュサイズが変わらないことを確認（キャッシュヒット）
  assertEquals(sizeAfterFirst, sizeAfterSecond, "Language rules should be shared across instances");
  // ヒット数が増加していることを確認
  assertNotEquals(statsAfterSecondAccess.hits, 0, "Should have cache hits for shared language rules");
});