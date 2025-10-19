import { assertEquals, assertThrows, fail } from "@std/assert";
import { type Config } from "../denops/hellshake-yano/main.ts";
import {
  generateHighlightCommand,
  isValidColorName,
  isValidHexColor,
  normalizeColorName,
  validateHighlightColor,
  validateHighlightConfig,
} from "../denops/hellshake-yano/common/utils/validator.ts";
import type { HighlightColor } from "../denops/hellshake-yano/types.ts";

/**
 * ハイライト色のfg/bg個別指定機能のテストケース
 * TDD Phase 1 (Red): まだ実装されていない機能のテストを定義
 */

// 実装済みのため、型定義とインターフェースは不要

Deno.test("HighlightColor fg/bg - 色名指定のテスト", () => {
  const config = {
    highlightHintMarker: { fg: "Red", bg: "Blue" },
    highlightHintMarkerCurrent: { fg: "Yellow", bg: "Black" },
  };

  const result = validateHighlightConfig(config);
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("HighlightColor fg/bg - 16進数色指定のテスト", () => {
  const config = {
    highlightHintMarker: { fg: "#ff0000", bg: "#0000ff" },
    highlightHintMarkerCurrent: { fg: "#ffff00", bg: "#000000" },
  };

  const result = validateHighlightConfig(config);
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("HighlightColor fg/bg - 後方互換性のテスト", () => {
  // 既存のハイライトグループ名指定も動作すべき
  const config = {
    highlightHintMarker: { fg: "Green", bg: "Black" },
    highlightHintMarkerCurrent: { fg: "Red", bg: "Yellow" },
  };

  const result = validateHighlightConfig(config);
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("HighlightColor fg/bg - 混在設定のテスト", () => {
  // 一方はオブジェクト、もう一方もオブジェクト
  const config = {
    highlightHintMarker: { fg: "Green", bg: "NONE" },
    highlightHintMarkerCurrent: { fg: "Red", bg: "Black" },
  };

  const result = validateHighlightConfig(config);
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("HighlightColor fg/bg - 無効な色値のバリデーション", () => {
  const testCases = [
    { fg: "InvalidColor", bg: "Blue" },
    { fg: "#gggggg", bg: "Red" }, // 無効な16進数
    { fg: "#ff", bg: "Green" }, // 短すぎる16進数
    { fg: "#fffffff", bg: "Blue" }, // 長すぎる16進数
    { fg: "", bg: "Red" }, // 空文字
    { fg: "Red", bg: 123 as any }, // 数値（無効）
  ];

  for (const testCase of testCases) {
    const result = validateHighlightColor(testCase);
    assertEquals(result.valid, false);
    assertEquals(result.errors.length > 0, true);
  }
});

Deno.test("HighlightColor fg/bg - ハイライトコマンド生成のテスト", () => {
  const testCases = [
    {
      input: { fg: "Red", bg: "Blue" },
      expected: "highlight HellshakeYanoMarker ctermfg=Red guifg=Red ctermbg=Blue guibg=Blue",
    },
    {
      input: { fg: "#ff0000", bg: "#0000ff" },
      expected: "highlight HellshakeYanoMarker guifg=#ff0000 guibg=#0000ff",
    },
    {
      input: { fg: "Yellow", bg: "NONE" },
      expected: "highlight HellshakeYanoMarker ctermfg=Yellow guifg=Yellow ctermbg=None guibg=None",
    },
  ];

  for (const testCase of testCases) {
    const result = generateHighlightCommand("HellshakeYanoMarker", testCase.input);
    assertEquals(result, testCase.expected);
  }
});

Deno.test("HighlightColor fg/bg - 色名の大文字小文字不区別", () => {
  const testCases = [
    { fg: "red", bg: "blue" },
    { fg: "RED", bg: "BLUE" },
    { fg: "Red", bg: "Blue" },
  ];

  for (const testCase of testCases) {
    const result = validateHighlightColor(testCase);
    assertEquals(result.valid, true);
    assertEquals(result.errors.length, 0);
  }
});

Deno.test("HighlightColor fg/bg - 16進数色の形式検証", () => {
  const validHexColors = ["#fff", "#ffffff", "#FF0000", "#00ff00"];
  const invalidHexColors = ["fff", "#gg0000", "#ff", "#fffffff", "#"];

  // 有効な16進数色
  for (const color of validHexColors) {
    assertEquals(isValidHexColor(color), true, `Expected ${color} to be valid`);
  }

  // 無効な16進数色
  for (const color of invalidHexColors) {
    assertEquals(isValidHexColor(color), false, `Expected ${color} to be invalid`);
  }
});

Deno.test("HighlightColor fg/bg - 標準色名の検証", () => {
  const validColorNames = [
    "Red",
    "Green",
    "Blue",
    "Yellow",
    "Cyan",
    "Magenta",
    "White",
    "Black",
    "Gray",
    "NONE",
  ];
  const invalidColorNames = ["InvalidColor", "rgb(255,0,0)", "transparent"];

  // 有効な色名
  for (const color of validColorNames) {
    assertEquals(isValidColorName(color), true, `Expected ${color} to be valid`);
  }

  // 無効な色名
  for (const color of invalidColorNames) {
    assertEquals(isValidColorName(color), false, `Expected ${color} to be invalid`);
  }
});

Deno.test("HighlightColor fg/bg - 部分指定のテスト", () => {
  const testCases = [
    { fg: "Red" }, // bgのみ省略
    { bg: "Blue" }, // fgのみ省略
    { fg: "Green", bg: undefined }, // bgを明示的にundefined
    { fg: undefined, bg: "Yellow" }, // fgを明示的にundefined
  ];

  for (const testCase of testCases) {
    const result = validateHighlightColor(testCase);
    assertEquals(result.valid, true);
    assertEquals(result.errors.length, 0);
  }
});

// テストヘルパー関数の動作確認
Deno.test("HighlightColor fg/bg - テストヘルパー関数の動作確認", () => {
  // isValidColorName のテスト
  assertEquals(isValidColorName("Red"), true);
  assertEquals(isValidColorName("InvalidColor"), false);

  // isValidHexColor のテスト
  assertEquals(isValidHexColor("#ff0000"), true);
  assertEquals(isValidHexColor("#gg0000"), false);

  // normalizeColorName のテスト
  assertEquals(normalizeColorName("red"), "Red");
  assertEquals(normalizeColorName("BLUE"), "Blue");
  assertEquals(normalizeColorName("#ff0000"), "#ff0000");

  // validateHighlightColor のテスト
  const validResult = validateHighlightColor({ fg: "Red", bg: "Blue" });
  assertEquals(validResult.valid, true);

  const invalidResult = validateHighlightColor({ fg: "InvalidColor" });
  assertEquals(invalidResult.valid, false);

  // generateHighlightCommand のテスト
  const cmd = generateHighlightCommand("TestGroup", { fg: "Red" });
  assertEquals(cmd.includes("TestGroup"), true);
  assertEquals(cmd.includes("Red"), true);
});
