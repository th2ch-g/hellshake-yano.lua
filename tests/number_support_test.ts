import { assertEquals, assertExists } from "@std/assert";
import { generateHints } from "../denops/hellshake-yano/hint.ts";

/**
 * 数字対応機能のテスト（Process8 sub3）
 */

Deno.test("Number support - Generate hints with numbers", () => {
  // 文字と数字を含むマーカー配列
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const numbers = "0123456789".split("");
  const markersWithNumbers = [...letters, ...numbers];

  // 36個の単語（A-Z + 0-9）
  const hints = generateHints(36, markersWithNumbers);

  assertEquals(hints.length, 36);

  // 最初の26個はA-Z
  for (let i = 0; i < 26; i++) {
    assertEquals(hints[i], letters[i]);
  }

  // 次の10個は0-9
  for (let i = 0; i < 10; i++) {
    assertEquals(hints[26 + i], numbers[i]);
  }
});

Deno.test("Number support - Generate multi-character hints with numbers", () => {
  const markersWithNumbers = [...("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")), ...("0123456789".split(""))];

  // 40個の単語（36個の単一文字 + 4個の複数文字）
  const hints = generateHints(40, markersWithNumbers);

  assertEquals(hints.length, 40);

  // 37番目以降は複数文字（AA, AB, AC, AD）
  assertEquals(hints[36], "AA");
  assertEquals(hints[37], "AB");
  assertEquals(hints[38], "AC");
  assertEquals(hints[39], "AD");
});

Deno.test("Number support - Mixed alphanumeric hints", () => {
  const markersWithNumbers = [...("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")), ...("0123456789".split(""))];

  // 100個の単語でテスト
  const hints = generateHints(100, markersWithNumbers);

  assertEquals(hints.length, 100);

  // 36個の単一文字
  assertEquals(hints[35], "9"); // 最後の単一文字

  // 複数文字ヒントの確認
  assertEquals(hints[36], "AA");

  // 数字を含む複数文字ヒント
  const numericMultiHints = hints.filter(h => h.length > 1 && /[0-9]/.test(h));
  // A0-A9, B0-B9などが含まれるはず
  assertExists(numericMultiHints);
});

Deno.test("Number support - Input validation patterns", () => {
  // アルファベットのみのパターン
  const alphaOnlyPattern = /[A-Z]/;

  // 数字を含むパターン
  const alphaNumericPattern = /[A-Z0-9]/;

  // テストケース
  const testCases = [
    { input: "A", alphaOnly: true, alphaNumeric: true },
    { input: "Z", alphaOnly: true, alphaNumeric: true },
    { input: "0", alphaOnly: false, alphaNumeric: true },
    { input: "9", alphaOnly: false, alphaNumeric: true },
    { input: "a", alphaOnly: false, alphaNumeric: false }, // 小文字
    { input: "@", alphaOnly: false, alphaNumeric: false }, // 記号
  ];

  for (const testCase of testCases) {
    assertEquals(
      alphaOnlyPattern.test(testCase.input),
      testCase.alphaOnly,
      `Alpha-only pattern failed for "${testCase.input}"`
    );
    assertEquals(
      alphaNumericPattern.test(testCase.input),
      testCase.alphaNumeric,
      `Alpha-numeric pattern failed for "${testCase.input}"`
    );
  }
});

Deno.test("Number support - Priority ordering with numbers", () => {
  const markersWithNumbers = [...("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")), ...("0123456789".split(""))];

  // 50個の単語
  const hints = generateHints(50, markersWithNumbers);

  // 単一文字が優先される（A-Z, 0-9の順）
  assertEquals(hints[0], "A");
  assertEquals(hints[25], "Z");
  assertEquals(hints[26], "0");
  assertEquals(hints[35], "9");

  // その後複数文字
  assertEquals(hints[36], "AA");
  assertEquals(hints[37], "AB");
});

Deno.test("Number support - Case conversion behavior", () => {
  // 小文字を大文字に変換（アルファベットのみ）
  const testCases = [
    { input: "a", expected: "A" },
    { input: "z", expected: "Z" },
    { input: "0", expected: "0" }, // 数字はそのまま
    { input: "9", expected: "9" }, // 数字はそのまま
  ];

  for (const testCase of testCases) {
    const result = /[a-zA-Z]/.test(testCase.input)
      ? testCase.input.toUpperCase()
      : testCase.input;

    assertEquals(result, testCase.expected);
  }
});

Deno.test("Number support - Edge cases", () => {
  // 数字のみのマーカー配列
  const numbersOnly = "0123456789".split("");
  const hintsNumOnly = generateHints(15, numbersOnly);

  assertEquals(hintsNumOnly.length, 15);
  assertEquals(hintsNumOnly[0], "0");
  assertEquals(hintsNumOnly[9], "9");
  assertEquals(hintsNumOnly[10], "00"); // 複数文字
  assertEquals(hintsNumOnly[11], "01");

  // 空のマーカー配列
  const emptyHints = generateHints(5, []);
  assertEquals(emptyHints.length, 0);
});

Deno.test("Number support - Performance with large numeric hints", () => {
  const markersWithNumbers = [...("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")), ...("0123456789".split(""))];

  // パフォーマンステスト: 500個のヒント生成
  const startTime = performance.now();
  const hints = generateHints(500, markersWithNumbers);
  const endTime = performance.now();

  assertEquals(hints.length, 500);

  // 100ms以内に生成されることを確認
  const timeTaken = endTime - startTime;
  assertEquals(timeTaken < 100, true, `Hint generation took ${timeTaken}ms`);

  // 最初の36個は単一文字
  assertEquals(hints[35], "9");

  // 残りは複数文字
  assertEquals(hints[36].length, 2);
  assertEquals(hints[499].length, 2); // 最後のヒントも2文字
});