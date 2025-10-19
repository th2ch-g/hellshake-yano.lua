/**
 * tests/common/types/config.test.ts
 *
 * Config型とDEFAULT_CONFIGのテスト
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import type { Config } from "../../../denops/hellshake-yano/common/types/config.ts";
import { DEFAULT_CONFIG } from "../../../denops/hellshake-yano/common/types/config.ts";

Deno.test("Config型: DEFAULT_CONFIGが存在する", () => {
  assertExists(DEFAULT_CONFIG);
});

Deno.test("Config型: 必須フィールドの型チェック - enabled", () => {
  assertEquals(typeof DEFAULT_CONFIG.enabled, "boolean");
});

Deno.test("Config型: 必須フィールドの型チェック - markers", () => {
  assertEquals(Array.isArray(DEFAULT_CONFIG.markers), true);
  assertEquals(DEFAULT_CONFIG.markers.length > 0, true);
});

Deno.test("Config型: 必須フィールドの型チェック - motionCount", () => {
  assertEquals(typeof DEFAULT_CONFIG.motionCount, "number");
  assertEquals(DEFAULT_CONFIG.motionCount >= 0, true);
});

Deno.test("Config型: 必須フィールドの型チェック - hintPosition", () => {
  const validPositions = ["start", "end", "overlay", "both"];
  assertEquals(validPositions.includes(DEFAULT_CONFIG.hintPosition), true);
});

Deno.test("Config型: デフォルト値の検証 - enabled=true", () => {
  assertEquals(DEFAULT_CONFIG.enabled, true);
});

Deno.test("Config型: デフォルト値の検証 - motionCount=3", () => {
  assertEquals(DEFAULT_CONFIG.motionCount, 3);
});

Deno.test("Config型: デフォルト値の検証 - maxHints=336", () => {
  assertEquals(DEFAULT_CONFIG.maxHints, 336);
});

Deno.test("Config型: オプショナルフィールドの型チェック", () => {
  // maxSingleCharHints, debug, useNumericMultiCharHints, bothMinWordLengthは存在しうる
  if (DEFAULT_CONFIG.maxSingleCharHints !== undefined) {
    assertEquals(typeof DEFAULT_CONFIG.maxSingleCharHints, "number");
  }
  if (DEFAULT_CONFIG.debug !== undefined) {
    assertEquals(typeof DEFAULT_CONFIG.debug, "boolean");
  }
});

Deno.test("Config型: Partial<Config>を受け入れる関数（型チェック用）", () => {
  const partialConfig: Partial<Config> = {
    enabled: false,
    motionCount: 5,
  };
  assertEquals(typeof partialConfig.enabled, "boolean");
  assertEquals(typeof partialConfig.motionCount, "number");
});
