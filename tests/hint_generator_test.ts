/**
 * hint_generator_test.ts - VimHintGeneratorのテスト
 *
 * Phase D-1 Process1 Sub1 & Sub2のテスト
 * - Sub1: カスタムヒントキー設定（singleCharKeys, multiCharKeys）
 * - Sub2: 2桁数字ヒント（useNumericMultiCharHints）
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { VimHintGenerator } from "../denops/hellshake-yano/vim/core/hint-generator.ts";

// ========================================
// Process1 Sub1: カスタムヒントキー設定のテスト
// ========================================

Deno.test("VimHintGenerator - default singleCharKeys", () => {
  const generator = new VimHintGenerator();
  const hints = generator.generate(7);

  assertEquals(hints, ["a", "s", "d", "f", "g", "n", "m"]);
});

Deno.test("VimHintGenerator - custom singleCharKeys", () => {
  const generator = new VimHintGenerator({
    singleCharKeys: ["x", "y", "z"],
  });
  const hints = generator.generate(3);

  assertEquals(hints, ["x", "y", "z"]);
});

Deno.test("VimHintGenerator - custom singleCharKeys with multi-char hints", () => {
  const generator = new VimHintGenerator({
    singleCharKeys: ["a", "b", "c"],
  });
  const hints = generator.generate(5);

  // 3単一文字 + 2複数文字（'bb', 'bc'）
  assertEquals(hints, ["a", "b", "c", "bb", "bc"]);
});

Deno.test("VimHintGenerator - default multiCharKeys", () => {
  const generator = new VimHintGenerator();
  const hints = generator.generate(14);

  // 7単一文字 + 7複数文字
  assertEquals(hints, [
    "a",
    "s",
    "d",
    "f",
    "g",
    "n",
    "m",
    "bb",
    "bc",
    "be",
    "bi",
    "bo",
    "bp",
    "bq",
  ]);
});

Deno.test("VimHintGenerator - custom multiCharKeys", () => {
  const generator = new VimHintGenerator({
    singleCharKeys: ["a"],
    multiCharKeys: ["x", "y", "z"],
  });
  const hints = generator.generate(10);

  // 1単一文字 + 9複数文字（3x3=9個）
  assertEquals(hints, ["a", "xx", "xy", "xz", "yx", "yy", "yz", "zx", "zy", "zz"]);
});

Deno.test("VimHintGenerator - dynamic maxTotal calculation", () => {
  const generator = new VimHintGenerator({
    singleCharKeys: ["a", "b", "c"],
    multiCharKeys: ["x", "y"],
  });
  const hints = generator.generate(100);

  // maxTotal = 3 + 2*2 = 7
  assertEquals(hints.length, 7);
  assertEquals(hints, ["a", "b", "c", "xx", "xy", "yx", "yy"]);
});

// ========================================
// Process1 Sub2: 2桁数字ヒントのテスト
// ========================================

Deno.test("VimHintGenerator - useNumericMultiCharHints: false (default)", () => {
  const generator = new VimHintGenerator();
  const hints = generator.generate(240);

  // デフォルト設定: maxTotal = 7 + 15*15 = 232
  assertEquals(hints.length, 232);
  // 数字ヒントは含まれない
  assertEquals(hints.every((h) => !/^\d+$/.test(h)), true);
});

Deno.test("VimHintGenerator - useNumericMultiCharHints: true", () => {
  const generator = new VimHintGenerator({
    useNumericMultiCharHints: true,
  });
  const hints = generator.generate(240);

  // maxTotal=232 + 8数字ヒント = 240
  assertEquals(hints.length, 240);

  // 233個目（インデックス232）が '01' であることを確認
  assertEquals(hints[232], "01");
});

Deno.test("VimHintGenerator - numeric hints order: 01-09, 10-99, 00", () => {
  const generator = new VimHintGenerator({
    useNumericMultiCharHints: true,
  });
  const hints = generator.generate(332);

  // maxTotal=232 + 100数字ヒント = 332
  assertEquals(hints.length, 332);

  // 数字ヒント部分を抽出（インデックス232-331）
  const numericHints = hints.slice(232);

  // 最初の数字が '01'
  assertEquals(numericHints[0], "01");

  // 9個目の数字が '09'
  assertEquals(numericHints[8], "09");

  // 10個目の数字が '10'
  assertEquals(numericHints[9], "10");

  // 最後の数字が '00'
  assertEquals(numericHints[99], "00");
});

Deno.test("VimHintGenerator - numeric hints with custom keys", () => {
  const generator = new VimHintGenerator({
    singleCharKeys: ["a", "b"],
    multiCharKeys: ["x", "y"],
    useNumericMultiCharHints: true,
  });
  const hints = generator.generate(10);

  // maxTotal = 2 + 2*2 = 6
  // 6通常ヒント + 4数字ヒント = 10
  assertEquals(hints.length, 10);
  assertEquals(hints, ["a", "b", "xx", "xy", "yx", "yy", "01", "02", "03", "04"]);
});

Deno.test("VimHintGenerator - numeric hints maximum 100", () => {
  const generator = new VimHintGenerator({
    singleCharKeys: ["a"],
    multiCharKeys: ["x"],
    useNumericMultiCharHints: true,
  });
  const hints = generator.generate(200);

  // maxTotal = 1 + 1*1 = 2
  // 2通常ヒント + 100数字ヒント = 102
  assertEquals(hints.length, 102);

  // 数字ヒント部分を抽出
  const numericHints = hints.slice(2);
  assertEquals(numericHints.length, 100);

  // 最後が '00'
  assertEquals(numericHints[99], "00");
});

// ========================================
// エッジケースのテスト
// ========================================

Deno.test("VimHintGenerator - generate zero hints", () => {
  const generator = new VimHintGenerator();
  const hints = generator.generate(0);

  assertEquals(hints, []);
});

Deno.test("VimHintGenerator - generate negative count", () => {
  const generator = new VimHintGenerator();
  const hints = generator.generate(-1);

  assertEquals(hints, []);
});

Deno.test("VimHintGenerator - getConfig returns current configuration", () => {
  const generator = new VimHintGenerator({
    singleCharKeys: ["a", "b", "c"],
    multiCharKeys: ["x", "y", "z"],
    useNumericMultiCharHints: true,
  });
  const config = generator.getConfig();

  assertEquals(config.singleCharKeys, ["a", "b", "c"]);
  assertEquals(config.multiCharKeys, ["x", "y", "z"]);
  assertEquals(config.useNumericMultiCharHints, true);
});

Deno.test("VimHintGenerator - all hints are unique", () => {
  const generator = new VimHintGenerator({
    useNumericMultiCharHints: true,
  });
  const hints = generator.generate(332);

  // すべてのヒントが一意であることを確認
  const uniqueHints = new Set(hints);
  assertEquals(uniqueHints.size, hints.length);
});
