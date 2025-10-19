/**
 * tests/common/config.test.ts
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import {
  createMinimalConfig,
  DEFAULT_CONFIG,
  getDefaultConfig,
} from "../../denops/hellshake-yano/common/config.ts";

Deno.test("DEFAULT_CONFIG: デフォルト設定が存在する", () => {
  assertExists(DEFAULT_CONFIG);
  assertEquals(DEFAULT_CONFIG.enabled, true);
  assertEquals(DEFAULT_CONFIG.motionCount, 3);
});

Deno.test("getDefaultConfig: デフォルト設定を返す", () => {
  const config = getDefaultConfig();
  assertExists(config);
  assertEquals(config.enabled, true);
});

Deno.test("createMinimalConfig: 部分設定でマージ可能", () => {
  const config = createMinimalConfig({ enabled: false, motionCount: 5 });
  assertEquals(config.enabled, false);
  assertEquals(config.motionCount, 5);
  assertEquals(config.maxHints, 336); // デフォルト値
});
