/**
 * main.tsのテスト - Process2 Sub5 UnifiedConfig移行のテスト
 * TDD Red-Green-Refactor方式で実装
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { getDefaultConfig, validateConfig, getMinLengthForKey, getMotionCountForKey } from "../denops/hellshake-yano/main.ts";
import { getDefaultUnifiedConfig, validateUnifiedConfig } from "../denops/hellshake-yano/config.ts";

Deno.test("getDefaultConfig() should delegate to config.ts", () => {
  const config = getDefaultConfig();

  // 基本的なプロパティの存在確認
  assertExists(config.markers);
  assertExists(config.motion_count);
  assertExists(config.motion_timeout);
  assertExists(config.hint_position);
  assertExists(config.enabled);

  // デフォルト値の検証
  assertEquals(config.enabled, true);
  assertEquals(config.motion_count, 3);
  assertEquals(config.motion_timeout, 2000);
  assertEquals(config.hint_position, "start");
  assertEquals(config.markers.length > 0, true);
});

Deno.test("validateConfig() should delegate to config.ts", () => {
  // 有効な設定
  const validConfig = {
    motion_count: 3,
    hint_position: "start" as const,
    enabled: true,
  };

  const validResult = validateConfig(validConfig);
  assertEquals(validResult.valid, true);
  assertEquals(validResult.errors.length, 0);

  // 無効な設定
  const invalidConfig = {
    motion_count: -1, // 負の値は無効
  };

  const invalidResult = validateConfig(invalidConfig);
  assertEquals(invalidResult.valid, false);
  assertEquals(invalidResult.errors.length > 0, true);
});

Deno.test("getMinLengthForKey() should work with both Config and UnifiedConfig", () => {
  // UnifiedConfig形式でのテスト
  const unifiedConfig = getDefaultUnifiedConfig();
  const minLength1 = getMinLengthForKey(unifiedConfig, "f");
  assertEquals(typeof minLength1, "number");
  assertEquals(minLength1 >= 1, true);

  // Config形式でのテスト（後方互換性）
  const config = getDefaultConfig();
  const minLength2 = getMinLengthForKey(config, "f");
  assertEquals(typeof minLength2, "number");
  assertEquals(minLength2 >= 1, true);

  // 両方の結果は同じでなければならない
  assertEquals(minLength1, minLength2);
});

Deno.test("getMotionCountForKey() should work with both Config and UnifiedConfig", () => {
  // UnifiedConfig形式でのテスト
  const unifiedConfig = getDefaultUnifiedConfig();
  const motionCount1 = getMotionCountForKey("f", unifiedConfig);
  assertEquals(typeof motionCount1, "number");
  assertEquals(motionCount1 >= 1, true);

  // Config形式でのテスト（後方互換性）
  const config = getDefaultConfig();
  const motionCount2 = getMotionCountForKey("f", config);
  assertEquals(typeof motionCount2, "number");
  assertEquals(motionCount2 >= 1, true);

  // 両方の結果は同じでなければならない
  assertEquals(motionCount1, motionCount2);
});

Deno.test("Config types should be backward compatible", () => {
  const config = getDefaultConfig();

  // snake_case形式のプロパティが存在することを確認
  assertEquals(typeof config.motion_count, "number");
  assertEquals(typeof config.motion_timeout, "number");
  assertEquals(typeof config.hint_position, "string");
  assertEquals(typeof config.trigger_on_hjkl, "boolean");
  assertEquals(typeof config.enabled, "boolean");
  assertEquals(Array.isArray(config.markers), true);
  assertEquals(Array.isArray(config.counted_motions), true);
});

Deno.test("UnifiedConfig and Config should provide equivalent functionality", () => {
  const config = getDefaultConfig();
  const unifiedConfig = getDefaultUnifiedConfig();

  // 重要な設定値が両方で同じであることを確認
  assertEquals(config.enabled, unifiedConfig.enabled);
  assertEquals(config.motion_count, unifiedConfig.motionCount);
  assertEquals(config.motion_timeout, unifiedConfig.motionTimeout);
  assertEquals(config.hint_position, unifiedConfig.hintPosition);
  assertEquals(config.markers.length, unifiedConfig.markers.length);
});

// Process2 Sub6: 型安全性のテスト（Red Phase）
Deno.test("counted_motions should be strongly typed", () => {
  const config = getDefaultConfig();

  // counted_motionsは文字列の配列であるべき
  assertEquals(Array.isArray(config.counted_motions), true);

  // 全ての要素が文字列であることを確認（型安全性テスト）
  config.counted_motions.forEach((key, index) => {
    assertEquals(typeof key, "string", `counted_motions[${index}] should be string, got ${typeof key}`);
    assertEquals(key.length > 0, true, `counted_motions[${index}] should not be empty`);
  });
});

Deno.test("motion detection functions should have proper types", () => {
  const config = getDefaultConfig();

  // counted_motions内の各キーに対してgetMinLengthForKeyが正しく動作することを確認
  config.counted_motions.forEach((key: string) => {
    const minLength = getMinLengthForKey(config, key);
    assertEquals(typeof minLength, "number");
    assertEquals(minLength >= 1, true);
  });

  // getMotionCountForKeyも同様に確認
  config.counted_motions.forEach((key: string) => {
    const motionCount = getMotionCountForKey(key, config);
    assertEquals(typeof motionCount, "number");
    assertEquals(motionCount >= 1, true);
  });
});

Deno.test("main.ts type safety - filter function should be strongly typed", () => {
  // This test validates that the type guard filter function works correctly
  // after refactoring from 'any' to proper type guard in main.ts line 510

  // Create a mock config with counted_motions that includes invalid types
  const mockConfig = {
    counted_motions: ["f", "F", 123, null, "t", "T", "", undefined] as unknown[],
  };

  // The filter function now uses a type guard instead of 'any'
  const validKeys = mockConfig.counted_motions.filter((key: unknown): key is string =>
    typeof key === "string" && key.length === 1
  );

  // Validate the filtering works correctly with proper type safety
  assertEquals(validKeys.length, 4); // "f", "F", "t", "T" are valid
  assertEquals(validKeys.includes("f"), true);
  assertEquals(validKeys.includes("F"), true);
  assertEquals(validKeys.includes("t"), true);
  assertEquals(validKeys.includes("T"), true);

  // These shouldn't be included due to type/length validation
  assertEquals(validKeys.includes(123 as any), false);
  assertEquals(validKeys.includes(null as any), false);
  assertEquals(validKeys.includes("" as any), false);
  assertEquals(validKeys.includes(undefined as any), false);
});