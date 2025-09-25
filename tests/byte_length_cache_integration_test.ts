/**
 * byteLengthCache統合テスト
 * utils/encoding.tsのbyteLengthCacheがUnifiedCacheに正しく統合されることをテスト
 *
 * TDD Red-Green-Refactor: RED Phase
 * まずテストを失敗させ、その後実装で成功させる
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/testing/asserts.ts";
import { UnifiedCache, CacheType } from "../denops/hellshake-yano/cache.ts";

Deno.test("byteLengthCache integration - cache type exists", () => {
  // CacheType.BYTE_LENGTHが定義されていることを確認
  assertEquals(typeof CacheType.BYTE_LENGTH, "string");
  assertEquals(CacheType.BYTE_LENGTH, "BYTE_LENGTH");
});

Deno.test("byteLengthCache integration - cache instance accessible", () => {
  const unifiedCache = UnifiedCache.getInstance();
  unifiedCache.clearByType(CacheType.BYTE_LENGTH); // テスト開始時にクリア

  // BYTE_LENGTHキャッシュインスタンスが取得できることを確認
  const byteLengthCache = unifiedCache.getCache<string, number>(CacheType.BYTE_LENGTH);
  assertExists(byteLengthCache);

  // 基本操作が機能することを確認
  byteLengthCache.set("hello", 5);
  assertEquals(byteLengthCache.get("hello"), 5);
});

Deno.test("byteLengthCache integration - cache configuration", () => {
  const unifiedCache = UnifiedCache.getInstance();

  // キャッシュ設定が存在することを確認
  const config = unifiedCache.getCacheConfig(CacheType.BYTE_LENGTH);
  assertExists(config);
  assertEquals(config.size, 300);
  assertEquals(config.description, "バイト長計算のキャッシュ");
});

Deno.test("byteLengthCache integration - ASCII byte length caching", () => {
  const unifiedCache = UnifiedCache.getInstance();
  unifiedCache.clearByType(CacheType.BYTE_LENGTH); // テスト開始時にクリア
  const byteLengthCache = unifiedCache.getCache<string, number>(CacheType.BYTE_LENGTH);

  // ASCII文字のバイト長をキャッシュ
  const asciiTestCases = [
    { text: "hello", bytes: 5 },
    { text: "world", bytes: 5 },
    { text: "123", bytes: 3 },
    { text: "!@#$%", bytes: 5 },
    { text: "", bytes: 0 }, // 空文字列
    { text: " ", bytes: 1 }, // スペース
  ];

  asciiTestCases.forEach(({ text, bytes }) => {
    byteLengthCache.set(text, bytes);
    assertEquals(byteLengthCache.get(text), bytes);
  });

  // キャッシュサイズの確認
  assertEquals(byteLengthCache.size(), asciiTestCases.length);
});

Deno.test("byteLengthCache integration - multibyte character caching", () => {
  const unifiedCache = UnifiedCache.getInstance();
  unifiedCache.clearByType(CacheType.BYTE_LENGTH); // テスト開始時にクリア
  const byteLengthCache = unifiedCache.getCache<string, number>(CacheType.BYTE_LENGTH);

  // マルチバイト文字のバイト長をキャッシュ
  const multibyteTestCases = [
    { text: "あ", bytes: 3 }, // ひらがな（UTF-8で3バイト）
    { text: "ア", bytes: 3 }, // カタカナ（UTF-8で3バイト）
    { text: "漢", bytes: 3 }, // 漢字（UTF-8で3バイト）
    { text: "こんにちは", bytes: 15 }, // 日本語文字列（5文字 × 3バイト）
    { text: "hello世界", bytes: 11 }, // 混在文字列（5バイト + 6バイト）
    { text: "🎉", bytes: 4 }, // 絵文字（UTF-8で4バイト）
  ];

  multibyteTestCases.forEach(({ text, bytes }) => {
    byteLengthCache.set(text, bytes);
    assertEquals(byteLengthCache.get(text), bytes);
  });

  // キャッシュサイズの確認
  assertEquals(byteLengthCache.size(), multibyteTestCases.length);
});

Deno.test("byteLengthCache integration - cache statistics", () => {
  const unifiedCache = UnifiedCache.getInstance();
  unifiedCache.clearByType(CacheType.BYTE_LENGTH); // テスト開始時にクリア
  const byteLengthCache = unifiedCache.getCache<string, number>(CacheType.BYTE_LENGTH);

  // テストデータを追加
  byteLengthCache.set("test1", 5);
  byteLengthCache.set("test2", 10);
  byteLengthCache.set("あいう", 9);

  // 統計情報を取得
  const allStats = unifiedCache.getAllStats();
  assertExists(allStats[CacheType.BYTE_LENGTH]);

  const byteLengthStats = allStats[CacheType.BYTE_LENGTH];
  assertEquals(byteLengthStats.size, 3);
  assertEquals(byteLengthStats.maxSize, 300);
});

Deno.test("byteLengthCache integration - cache clearing", () => {
  const unifiedCache = UnifiedCache.getInstance();
  const byteLengthCache = unifiedCache.getCache<string, number>(CacheType.BYTE_LENGTH);

  // 現在のサイズを取得（他のテストの影響を考慮）
  const initialSize = byteLengthCache.size();

  // テストデータを追加
  byteLengthCache.set("unique1", 7);
  byteLengthCache.set("unique2", 7);
  assertEquals(byteLengthCache.size(), initialSize + 2);

  // タイプ別クリア
  unifiedCache.clearByType(CacheType.BYTE_LENGTH);
  assertEquals(byteLengthCache.size(), 0);

  // 再度テストデータを追加
  byteLengthCache.set("unique3", 7);
  assertEquals(byteLengthCache.size(), 1);

  // 全体クリア
  unifiedCache.clearAll();
  assertEquals(byteLengthCache.size(), 0);
});

Deno.test("byteLengthCache integration - performance with large strings", () => {
  const unifiedCache = UnifiedCache.getInstance();
  unifiedCache.clearByType(CacheType.BYTE_LENGTH); // テスト開始時にクリア
  const byteLengthCache = unifiedCache.getCache<string, number>(CacheType.BYTE_LENGTH);

  // 大きな文字列のテスト
  const largeStringTests = [
    { text: "a".repeat(100), expectedBytes: 100 },
    { text: "あ".repeat(50), expectedBytes: 150 }, // 50文字 × 3バイト
    { text: "abc".repeat(33) + "d", expectedBytes: 100 }, // 100バイト
  ];

  largeStringTests.forEach(({ text, expectedBytes }) => {
    byteLengthCache.set(text, expectedBytes);
    assertEquals(byteLengthCache.get(text), expectedBytes);
  });

  // キャッシュが適切に動作していることを確認
  assertEquals(byteLengthCache.size(), largeStringTests.length);
});