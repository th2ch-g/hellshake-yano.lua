/**
 * Phase 1: モジュール分割のテスト
 * TDD Red-Green-Refactorサイクルでの失敗するテスト（RED）
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.201.0/assert/mod.ts";

// テスト対象：分割後の新しいモジュール構造
Deno.test("Phase 1 - RED: config.ts モジュールが存在する", async () => {
  try {
    // まだモジュールが分割されていないので、このテストは失敗する
    await import("../denops/hellshake-yano/config.ts");
  } catch (error) {
    throw new Error("config.ts モジュールが存在しません: " + (error as Error).message);
  }
});

Deno.test("Phase 1 - RED: commands.ts モジュールが存在する", async () => {
  try {
    // まだモジュールが分割されていないので、このテストは失敗する
    await import("../denops/hellshake-yano/commands.ts");
  } catch (error) {
    throw new Error("commands.ts モジュールが存在しません: " + (error as Error).message);
  }
});

Deno.test("Phase 1 - RED: lifecycle.ts モジュールが存在する", async () => {
  try {
    // まだモジュールが分割されていないので、このテストは失敗する
    await import("../denops/hellshake-yano/lifecycle.ts");
  } catch (error) {
    throw new Error("lifecycle.ts モジュールが存在しません: " + (error as Error).message);
  }
});

Deno.test("Phase 1 - RED: api.ts モジュールが存在する", async () => {
  try {
    // まだモジュールが分割されていないので、このテストは失敗する
    await import("../denops/hellshake-yano/api.ts");
  } catch (error) {
    throw new Error("api.ts モジュールが存在しません: " + (error as Error).message);
  }
});

Deno.test("Phase 1 - RED: utils/cache.ts モジュールが存在する", async () => {
  try {
    // まだモジュールが分割されていないので、このテストは失敗する
    await import("../denops/hellshake-yano/utils/cache.ts");
  } catch (error) {
    throw new Error("utils/cache.ts モジュールが存在しません: " + (error as Error).message);
  }
});

Deno.test("Phase 1 - RED: utils/validation.ts モジュールが存在する", async () => {
  try {
    // まだモジュールが分割されていないので、このテストは失敗する
    await import("../denops/hellshake-yano/utils/validation.ts");
  } catch (error) {
    throw new Error("utils/validation.ts モジュールが存在しません: " + (error as Error).message);
  }
});

Deno.test("Phase 1 - RED: config.ts が正しい型をエクスポートする", async () => {
  try {
    const configModule = await import("../denops/hellshake-yano/config.ts");

    // Config型は型エクスポートなので、代わりにデフォルト設定関数の存在を確認
    assertExists(configModule.getDefaultConfig);

    // バリデーション関数が存在することを確認
    assertExists(configModule.validateConfig);

  } catch (error) {
    throw new Error("config.ts から期待される型・関数がエクスポートされていません: " + (error as Error).message);
  }
});

Deno.test("Phase 1 - RED: commands.ts が正しい関数をエクスポートする", async () => {
  try {
    const commandsModule = await import("../denops/hellshake-yano/commands.ts");

    // コマンド関数がエクスポートされていることを確認
    assertExists(commandsModule.enable);
    assertExists(commandsModule.disable);
    assertExists(commandsModule.toggle);
    assertExists(commandsModule.setCount);
    assertExists(commandsModule.setTimeout);

  } catch (error) {
    throw new Error("commands.ts から期待される関数がエクスポートされていません: " + (error as Error).message);
  }
});

Deno.test("Phase 1 - RED: lifecycle.ts が正しい関数をエクスポートする", async () => {
  try {
    const lifecycleModule = await import("../denops/hellshake-yano/lifecycle.ts");

    // ライフサイクル関数がエクスポートされていることを確認
    assertExists(lifecycleModule.initializePlugin);
    assertExists(lifecycleModule.cleanupPlugin);

  } catch (error) {
    throw new Error("lifecycle.ts から期待される関数がエクスポートされていません: " + (error as Error).message);
  }
});

Deno.test("Phase 1 - RED: utils/cache.ts が汎用LRUCacheクラスをエクスポートする", async () => {
  try {
    const cacheModule = await import("../denops/hellshake-yano/utils/cache.ts");

    // LRUCacheクラスがエクスポートされていることを確認
    assertExists(cacheModule.LRUCache);

    // LRUCacheを実際にインスタンス化できることを確認
    const cache = new cacheModule.LRUCache(100);
    assertExists(cache.get);
    assertExists(cache.set);
    assertExists(cache.clear);
    assertExists(cache.size);

  } catch (error) {
    throw new Error("utils/cache.ts から期待されるLRUCacheクラスがエクスポートされていません: " + (error as Error).message);
  }
});

Deno.test("Phase 1 - RED: utils/validation.ts が検証関数をエクスポートする", async () => {
  try {
    const validationModule = await import("../denops/hellshake-yano/utils/validation.ts");

    // バリデーション関数がエクスポートされていることを確認
    assertExists(validationModule.validateConfigValue);
    assertExists(validationModule.sanitizeInput);

  } catch (error) {
    throw new Error("utils/validation.ts から期待される検証関数がエクスポートされていません: " + (error as Error).message);
  }
});

Deno.test("Phase 1 - RED: 分割後のmain.tsが3000行以下になる", async () => {
  try {
    const text = await Deno.readTextFile("denops/hellshake-yano/main.ts");
    const lineCount = text.split('\n').length;

    if (lineCount > 3000) {
      throw new Error(`main.tsの行数が${lineCount}行で、目標の3000行を超えています`);
    }

  } catch (error) {
    throw new Error("main.tsの行数チェックでエラー: " + (error as Error).message);
  }
});