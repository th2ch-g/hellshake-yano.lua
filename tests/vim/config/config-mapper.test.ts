/**
 * tests/vim/config/config-mapper.test.ts
 *
 * ConfigMapperのテスト
 *
 * 目的:
 *   - VimScript形式から新設定形式への変換テスト
 *   - キーマッピング検証
 *
 * Process: phase-2, process13
 */

import { test } from "../../testRunner.ts";
import { assertEquals, assertExists } from "@std/assert";
import {
  ConfigMapper,
  type MappedConfig,
  type VimScriptConfig,
} from "../../../denops/hellshake-yano/vim/config/config-mapper.ts";

test("ConfigMapper: 基本的な設定マッピング", async (_denops) => {
  const mapper = new ConfigMapper();

  const oldConfig: VimScriptConfig = {
    hint_chars: "asdfjkl;",
    motion_threshold: 3,
    motion_timeout_ms: 500,
    motion_enabled: true,
    visual_mode_enabled: false,
  };

  const result = mapper.mapFromVimScript(oldConfig);

  assertExists(result, "マップされた設定が存在すること");
  assertEquals(
    result.markers,
    ["a", "s", "d", "f", "j", "k", "l", ";"],
    "hint_charsがmarkersに変換されること",
  );
  assertEquals(result.motionCount, 3, "motion_thresholdが変換されること");
  assertEquals(
    result.motionTimeout,
    500,
    "motion_timeout_msが変換されること",
  );
  assertEquals(
    result.motionCounterEnabled,
    true,
    "motion_enabledが変換されること",
  );

  await _denops.cmd("echo ''");
});

test("ConfigMapper: motion_keysの配列変換", async (_denops) => {
  const mapper = new ConfigMapper();

  const oldConfig: VimScriptConfig = {
    motion_keys: ["h", "j", "k", "l"],
    motion_enabled: false,
  };

  const result = mapper.mapFromVimScript(oldConfig);

  assertExists(result, "マップされた設定が存在すること");
  assertEquals(
    result.countedMotions,
    ["h", "j", "k", "l"],
    "motion_keysがcountedMotionsに変換されること",
  );
  assertEquals(
    result.motionCounterEnabled,
    false,
    "motion_enabledが変換されること",
  );

  await _denops.cmd("echo ''");
});

test("ConfigMapper: 空の設定マッピング", async (_denops) => {
  const mapper = new ConfigMapper();

  const oldConfig: VimScriptConfig = {};

  const result = mapper.mapFromVimScript(oldConfig);

  assertExists(result, "空の設定もマップされること");

  await _denops.cmd("echo ''");
});

test("ConfigMapper: マッピング統計情報", async (_denops) => {
  const mapper = new ConfigMapper();

  const oldConfig: VimScriptConfig = {
    hint_chars: "asd",
    motion_threshold: 2,
    unknown_key: "value",
  };

  const stats = mapper.getMappingStatistics(oldConfig);

  assertExists(stats, "統計情報が存在すること");
  assertEquals(stats.totalKeys, 3, "総キー数が正確であること");

  await _denops.cmd("echo ''");
});
