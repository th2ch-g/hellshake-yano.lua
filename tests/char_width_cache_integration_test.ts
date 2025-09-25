/**
 * CHAR_WIDTH_CACHE統合テスト
 * utils/display.tsのCHAR_WIDTH_CACHEがUnifiedCacheに正しく統合されることをテスト
 *
 * TDD Red-Green-Refactor: RED Phase
 * まずテストを失敗させ、その後実装で成功させる
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/testing/asserts.ts";
import { UnifiedCache, CacheType } from "../denops/hellshake-yano/cache.ts";

Deno.test("CHAR_WIDTH_CACHE integration - cache type exists", () => {
  // CacheType.CHAR_WIDTHが定義されていることを確認
  assertEquals(typeof CacheType.CHAR_WIDTH, "string");
  assertEquals(CacheType.CHAR_WIDTH, "CHAR_WIDTH");
});

Deno.test("CHAR_WIDTH_CACHE integration - cache instance accessible", () => {
  const unifiedCache = UnifiedCache.getInstance();
  unifiedCache.clearByType(CacheType.CHAR_WIDTH); // テスト開始時にクリア

  // CHAR_WIDTHキャッシュインスタンスが取得できることを確認
  const charWidthCache = unifiedCache.getCache<number, number>(CacheType.CHAR_WIDTH);
  assertExists(charWidthCache);

  // 基本操作が機能することを確認
  charWidthCache.set(65, 1); // 'A' の文字コード
  assertEquals(charWidthCache.get(65), 1);
});

Deno.test("CHAR_WIDTH_CACHE integration - cache configuration", () => {
  const unifiedCache = UnifiedCache.getInstance();

  // キャッシュ設定が存在することを確認
  const config = unifiedCache.getCacheConfig(CacheType.CHAR_WIDTH);
  assertExists(config);
  assertEquals(config.size, 500);
  assertEquals(config.description, "文字幅計算のキャッシュ");
});

Deno.test("CHAR_WIDTH_CACHE integration - ASCII character width caching", () => {
  const unifiedCache = UnifiedCache.getInstance();
  unifiedCache.clearByType(CacheType.CHAR_WIDTH); // テスト開始時にクリア
  const charWidthCache = unifiedCache.getCache<number, number>(CacheType.CHAR_WIDTH);

  // ASCIIの文字幅をキャッシュ
  for (let i = 0x20; i <= 0x7E; i++) {
    charWidthCache.set(i, 1);
    assertEquals(charWidthCache.get(i), 1);
  }

  // スペース文字
  assertEquals(charWidthCache.get(0x20), 1);
  // 英数字
  assertEquals(charWidthCache.get(65), 1); // 'A'
  assertEquals(charWidthCache.get(97), 1); // 'a'
  assertEquals(charWidthCache.get(48), 1); // '0'
  // チルダ
  assertEquals(charWidthCache.get(0x7E), 1);
});

Deno.test("CHAR_WIDTH_CACHE integration - cache statistics", () => {
  const unifiedCache = UnifiedCache.getInstance();
  unifiedCache.clearByType(CacheType.CHAR_WIDTH); // テスト開始時にクリア
  const charWidthCache = unifiedCache.getCache<number, number>(CacheType.CHAR_WIDTH);

  // キャッシュをクリア
  charWidthCache.clear();

  // テストデータを追加
  charWidthCache.set(65, 1); // 'A'
  charWidthCache.set(0x3042, 2); // あ

  // 統計情報を取得
  const allStats = unifiedCache.getAllStats();
  assertExists(allStats[CacheType.CHAR_WIDTH]);

  const charWidthStats = allStats[CacheType.CHAR_WIDTH];
  assertEquals(charWidthStats.size, 2);
  assertEquals(charWidthStats.maxSize, 500);
});

Deno.test("CHAR_WIDTH_CACHE integration - cache clearing", () => {
  const unifiedCache = UnifiedCache.getInstance();
  const charWidthCache = unifiedCache.getCache<number, number>(CacheType.CHAR_WIDTH);

  // 現在のサイズを取得（初期化により既にASCII文字が追加されている）
  const initialSize = charWidthCache.size();

  // テストデータを追加（重複しない文字を使用）
  charWidthCache.set(0x1000, 2); // 使用されていない文字コード
  charWidthCache.set(0x1001, 2); // 使用されていない文字コード
  assertEquals(charWidthCache.size(), initialSize + 2);

  // タイプ別クリア
  unifiedCache.clearByType(CacheType.CHAR_WIDTH);
  assertEquals(charWidthCache.size(), 0);

  // 再度テストデータを追加
  charWidthCache.set(67, 1);
  assertEquals(charWidthCache.size(), 1);

  // 全体クリア
  unifiedCache.clearAll();
  assertEquals(charWidthCache.size(), 0);
});

Deno.test("CHAR_WIDTH_CACHE integration - CJK character width caching", () => {
  const unifiedCache = UnifiedCache.getInstance();
  unifiedCache.clearByType(CacheType.CHAR_WIDTH); // テスト開始時にクリア
  const charWidthCache = unifiedCache.getCache<number, number>(CacheType.CHAR_WIDTH);

  // CJK文字の幅をキャッシュ（幅2）
  const cjkChars = [
    0x3042, // あ (ひらがな)
    0x30A2, // ア (カタカナ)
    0x4E00, // 一 (漢字)
    0xFF01, // ！(全角感嘆符)
  ];

  cjkChars.forEach(charCode => {
    charWidthCache.set(charCode, 2);
    assertEquals(charWidthCache.get(charCode), 2);
  });
});