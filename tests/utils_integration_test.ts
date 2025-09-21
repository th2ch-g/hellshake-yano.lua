/**
 * ユーティリティモジュールの統合テスト
 *
 * リファクタリングで新しく作成・統一化されたユーティリティモジュールの動作を検証
 */

import { assertEquals, assert } from "https://deno.land/std@0.220.0/assert/mod.ts";

// 統一化されたユーティリティモジュールをテスト
import {
  getByteLength,
  isAscii,
  charIndexToByteIndex
} from "../denops/hellshake-yano/utils/encoding.ts";

import {
  sortByIndex,
  sortByPriorityDesc,
  sortBy
} from "../denops/hellshake-yano/utils/sort.ts";

import {
  LRUCache,
  CacheManager,
  globalCacheManager
} from "../denops/hellshake-yano/utils/cache.ts";

Deno.test("統一されたエンコーディングユーティリティのテスト", async (t) => {

  await t.step("getByteLength関数の動作確認", () => {
    // ASCII文字のテスト
    assertEquals(getByteLength("hello"), 5);

    // 日本語文字のテスト
    assertEquals(getByteLength("こんにちは"), 15); // 5文字 × 3バイト

    // 混合文字のテスト
    assertEquals(getByteLength("Hello世界"), 11); // "Hello"(5) + "世界"(6)

    // 空文字のテスト
    assertEquals(getByteLength(""), 0);
  });

  await t.step("isAscii関数の動作確認", () => {
    // ASCII文字のみ
    assert(isAscii("Hello World 123"));

    // 日本語文字を含む
    assert(!isAscii("Hello世界"));

    // 記号のテスト
    assert(isAscii("!@#$%^&*()"));

    // 空文字
    assert(isAscii(""));
  });

  await t.step("charIndexToByteIndex関数の動作確認", () => {
    const text = "Hello世界";

    // ASCII部分のテスト
    assertEquals(charIndexToByteIndex(text, 0), 0);
    assertEquals(charIndexToByteIndex(text, 5), 5);

    // 日本語部分のテスト
    assertEquals(charIndexToByteIndex(text, 6), 8); // "世"の開始位置
    assertEquals(charIndexToByteIndex(text, 7), 11); // "界"の開始位置
  });
});

Deno.test("統一されたソートユーティリティのテスト", async (t) => {

  await t.step("sortByIndex関数の動作確認", () => {
    const items = [
      { index: 3, value: "third" },
      { index: 1, value: "first" },
      { index: 2, value: "second" }
    ];

    const sorted = sortByIndex(items);
    assertEquals(sorted[0].index, 1);
    assertEquals(sorted[1].index, 2);
    assertEquals(sorted[2].index, 3);

    // 元の配列が変更されていないことを確認
    assertEquals(items[0].index, 3);
  });

  await t.step("sortByPriorityDesc関数の動作確認", () => {
    const items = [
      { priority: 5, value: "medium" },
      { priority: 10, value: "high" },
      { priority: 1, value: "low" }
    ];

    const sorted = sortByPriorityDesc(items);
    assertEquals(sorted[0].priority, 10);
    assertEquals(sorted[1].priority, 5);
    assertEquals(sorted[2].priority, 1);
  });

  await t.step("sortBy汎用関数の動作確認", () => {
    const items = [
      { name: "Charlie", age: 30 },
      { name: "Alice", age: 25 },
      { name: "Bob", age: 35 }
    ];

    // 名前でソート
    const sortedByName = sortBy(items, item => item.name);
    assertEquals(sortedByName[0].name, "Alice");
    assertEquals(sortedByName[1].name, "Bob");
    assertEquals(sortedByName[2].name, "Charlie");

    // 年齢でソート（降順）
    const sortedByAge = sortBy(items, item => item.age, false);
    assertEquals(sortedByAge[0].age, 35);
    assertEquals(sortedByAge[1].age, 30);
    assertEquals(sortedByAge[2].age, 25);
  });
});

Deno.test("統一されたキャッシュシステムのテスト", async (t) => {

  await t.step("LRUCache基本動作の確認", () => {
    const cache = new LRUCache<string, number>(3);

    // 基本的な設定と取得
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);

    assertEquals(cache.get("a"), 1);
    assertEquals(cache.get("b"), 2);
    assertEquals(cache.get("c"), 3);

    // LRU動作の確認
    cache.set("d", 4); // "a"が削除される
    assertEquals(cache.get("a"), undefined);
    assertEquals(cache.get("d"), 4);

    // サイズの確認
    assertEquals(cache.size(), 3);
  });

  await t.step("CacheManagerの動作確認", () => {
    const manager = new CacheManager();

    // キャッシュの取得/作成
    const cache1 = manager.getCache<string, number>("test1", 100);
    const cache2 = manager.getCache<string, string>("test2", 200);

    // 同じ名前で取得した場合は同じインスタンスが返される
    const cache1Again = manager.getCache<string, number>("test1");
    assert(cache1 === cache1Again);

    // キャッシュの使用
    cache1.set("key1", 100);
    cache2.set("key2", "value2");

    assertEquals(cache1.get("key1"), 100);
    assertEquals(cache2.get("key2"), "value2");

    // キャッシュ名の一覧取得
    const names = manager.getCacheNames();
    assert(names.includes("test1"));
    assert(names.includes("test2"));

    // 統計情報の取得
    const stats = manager.getAllStats();
    assert("test1" in stats);
    assert("test2" in stats);
  });

  await t.step("グローバルキャッシュマネージャーの動作確認", () => {
    // グローバルマネージャーでキャッシュを作成
    const globalCache = globalCacheManager.getCache<string, any>("global_test");

    globalCache.set("test_key", { data: "test_value" });
    const retrieved = globalCache.get("test_key");

    assertEquals(retrieved?.data, "test_value");

    // クリーンアップ
    globalCacheManager.removeCache("global_test");
  });
});

Deno.test("リファクタリング効果の検証", async (t) => {

  await t.step("パフォーマンス改善の確認", () => {
    // バイト長計算の高速化を確認
    const testTexts = [
      "Hello World",
      "こんにちは世界",
      "混合テキストHello世界123",
      "".repeat(100),
      "日本語".repeat(50)
    ];

    // ASCII文字の高速パスが機能していることを間接的に確認
    testTexts.forEach(text => {
      const start = performance.now();
      const length = getByteLength(text);
      const end = performance.now();

      // 処理時間が妥当な範囲内であることを確認
      assert(end - start < 10, `バイト長計算が遅すぎます: ${end - start}ms`);
      assert(typeof length === "number", "バイト長が数値で返される");
      assert(length >= 0, "バイト長が0以上");
    });
  });

  await t.step("メモリ効率の確認", () => {
    // キャッシュのメモリ使用量制限が機能していることを確認
    const cache = new LRUCache<string, string>(5);

    // 制限を超えてアイテムを追加
    for (let i = 0; i < 10; i++) {
      cache.set(`key${i}`, `value${i}`);
    }

    // サイズが制限内に収まっていることを確認
    assertEquals(cache.size(), 5);

    // 古いアイテムが削除されていることを確認
    assertEquals(cache.get("key0"), undefined);
    assertEquals(cache.get("key9"), "value9");
  });

  await t.step("コードの一貫性確認", () => {
    // 同じインターフェースで異なるキャッシュが使用できることを確認
    const caches = [
      new LRUCache<string, number>(10),
      globalCacheManager.getCache<string, number>("test_consistency")
    ];

    caches.forEach((cache, index) => {
      // 統一されたインターフェース経由で操作
      cache.set("test", 42);
      assertEquals(cache.get("test"), 42);
      assert(cache.has("test"));
      assertEquals(cache.size(), 1);

      const stats = cache.getStats();
      assert(typeof stats.hits === "number");
      assert(typeof stats.misses === "number");
      assert(typeof stats.size === "number");

      cache.clear();
      assertEquals(cache.size(), 0);
    });
  });
});