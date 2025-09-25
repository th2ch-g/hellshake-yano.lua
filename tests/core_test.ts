import { assertEquals, assertExists, assertThrows } from "https://deno.land/std@0.220.1/assert/mod.ts";
import { Core } from "../denops/hellshake-yano/core.ts";
import type { Config, Word, HintMapping } from "../denops/hellshake-yano/types.ts";

/**
 * Core class existence test
 * TDD Red Phase: このテストは最初失敗する（Coreクラスがまだ存在しないため）
 */
Deno.test("Core class should exist", () => {
  assertExists(Core);
});

/**
 * Core class instantiation test
 * TDD Red Phase: このテストも最初失敗する（Coreクラスがまだ実装されていないため）
 */
Deno.test("Core class should be instantiable", () => {
  const core = new Core();
  assertExists(core);
});

/**
 * Core class should have essential methods
 * TDD Red Phase: 必要なメソッドの存在確認（最初は失敗）
 */
Deno.test("Core class should have essential methods", () => {
  const core = new Core();
  assertExists(core.detectWords);
  assertExists(core.generateHints);
  assertExists(core.showHints);
  assertExists(core.hideHints);
  assertExists(core.handleMotion);
});

/**
 * Core class basic functionality test
 * TDD Red Phase: 基本機能のテスト（最初は失敗）
 */
Deno.test("Core class should initialize with default config", () => {
  const core = new Core();
  const config = core.getConfig();
  assertExists(config);
  assertEquals(typeof config, "object");
});

/**
 * Core class custom config test
 * TDD Refactor Phase: カスタム設定のテスト追加
 */
Deno.test("Core class should accept custom config", () => {
  const customConfig = {
    enabled: false,
    maxHints: 50
  };
  const core = new Core(customConfig);
  const config = core.getConfig();
  assertEquals(config.enabled, false);
  assertEquals(config.maxHints, 50);
});

/**
 * Core class word detection test
 * TDD Refactor Phase: 単語検出機能のテスト
 */
Deno.test("Core class detectWords should return valid result", () => {
  const core = new Core();
  const result = core.detectWords();
  assertExists(result);
  assertEquals(typeof result, "object");
  assertExists(result.words);
  assertExists(result.detector);
  assertExists(result.success);
  assertExists(result.performance);
  assertEquals(Array.isArray(result.words), true);
});

/**
 * Core class hint generation test
 * TDD Refactor Phase: ヒント生成機能のテスト
 */
Deno.test("Core class generateHints should return array", () => {
  const core = new Core();
  const words: Word[] = [
    { text: "test", line: 1, col: 1 },
    { text: "word", line: 1, col: 6 }
  ];
  const hints = core.generateHints(words);
  assertExists(hints);
  assertEquals(Array.isArray(hints), true);
});

/**
 * Core class state management tests
 * TDD Refactor Phase: 状態管理のテスト
 */
Deno.test("Core class should track enabled state", () => {
  const core = new Core({ enabled: true });
  assertEquals(core.isEnabled(), true);

  core.updateConfig({ enabled: false });
  assertEquals(core.isEnabled(), false);
});

Deno.test("Core class should track hints visibility", () => {
  const core = new Core({ enabled: true });
  assertEquals(core.isHintsVisible(), false);

  const mockHints: HintMapping[] = [{
    word: { text: "test", line: 1, col: 1 },
    hint: "A",
    hintCol: 1,
    hintByteCol: 1
  }];

  core.showHints(mockHints);
  assertEquals(core.isHintsVisible(), true);
  assertEquals(core.getCurrentHints().length, 1);

  core.hideHints();
  assertEquals(core.isHintsVisible(), false);
  assertEquals(core.getCurrentHints().length, 0);
});

Deno.test("Core class should not show hints when disabled", () => {
  const core = new Core({ enabled: false });
  const mockHints: HintMapping[] = [{
    word: { text: "test", line: 1, col: 1 },
    hint: "A",
    hintCol: 1,
    hintByteCol: 1
  }];

  core.showHints(mockHints);
  assertEquals(core.isHintsVisible(), false);
  assertEquals(core.getCurrentHints().length, 0);
});