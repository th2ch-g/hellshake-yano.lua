import { assertEquals, assertExists } from "@std/assert";
import { generateTestBuffer, getWindowInfo, test } from "./testRunner.ts";
import {
  generateSampleText,
  generateWordPositions,
  mockBuffer,
  mockCursor,
  mockVisibleRange,
} from "./helpers/mock.ts";
import type { Word } from "../denops/hellshake-yano/types.ts";

// 単語検出機能をインポート
import { detectWords } from "../denops/hellshake-yano/neovim/core/word.ts";

test("単一単語の検出", async (denops) => {
  await mockBuffer(denops, ["hello"]);
  await mockCursor(denops, 1, 1);

  const words = await detectWords(denops);

  assertEquals(words.length, 1);
  assertEquals(words[0].text, "hello");
  assertEquals(words[0].line, 1);
  assertEquals(words[0].col, 1);
});

test("複数単語の検出", async (denops) => {
  await mockBuffer(denops, ["hello world typescript"]);
  await mockCursor(denops, 1, 1);

  const words = await detectWords(denops);

  assertEquals(words.length, 3);
  assertEquals(words[0].text, "hello");
  assertEquals(words[1].text, "world");
  assertEquals(words[2].text, "typescript");
});

test("複数行の単語検出", async (denops) => {
  const lines = [
    "first line",
    "second line",
    "third line",
  ];
  await mockBuffer(denops, lines);
  await mockCursor(denops, 1, 1);

  const words = await detectWords(denops);

  assertEquals(words.length, 6);
  assertEquals(words[0].text, "first");
  assertEquals(words[0].line, 1);
  assertEquals(words[2].text, "second");
  assertEquals(words[2].line, 2);
  assertEquals(words[4].text, "third");
  assertEquals(words[4].line, 3);
});

test("日本語を含む単語の検出", async (denops) => {
  const lines = [
    "Hello こんにちは World",
    "TypeScript と JavaScript",
  ];
  await mockBuffer(denops, lines);
  await mockCursor(denops, 1, 1);

  const words = await detectWords(denops);

  // 英単語のみを検出（日本語は単語境界が異なるため）
  const englishWords = words.filter((w) => /^[a-zA-Z]+$/.test(w.text));
  assertEquals(englishWords.length, 4); // Hello, World, TypeScript, JavaScript
});

test("記号を含む行の単語検出", async (denops) => {
  const lines = [
    "foo.bar(baz)",
    "const value = 42;",
    "@decorator class MyClass {}",
  ];
  await mockBuffer(denops, lines);
  await mockCursor(denops, 1, 1);

  const words = await detectWords(denops);

  // 単語のみを検出（記号は除外）
  const wordTexts = words.map((w) => w.text);
  assertExists(wordTexts.find((w) => w === "foo"));
  assertExists(wordTexts.find((w) => w === "bar"));
  assertExists(wordTexts.find((w) => w === "baz"));
  assertExists(wordTexts.find((w) => w === "const"));
  assertExists(wordTexts.find((w) => w === "value"));
  assertExists(wordTexts.find((w) => w === "decorator"));
  assertExists(wordTexts.find((w) => w === "class"));
  assertExists(wordTexts.find((w) => w === "MyClass"));
});

test("空行の処理", async (denops) => {
  const lines = [
    "before empty",
    "",
    "after empty",
    "   ", // スペースのみの行
    "end",
  ];
  await mockBuffer(denops, lines);
  await mockCursor(denops, 1, 1);

  const words = await detectWords(denops);

  // 空行とスペースのみの行からは単語が検出されない
  assertEquals(words.length, 5); // before, empty, after, empty, end

  // 行番号の確認
  const lineNumbers = words.map((w) => w.line);
  assertEquals(lineNumbers.includes(2), false); // 空行
  assertEquals(lineNumbers.includes(4), false); // スペースのみの行
});

test("画面範囲内外の判定", async (denops) => {
  // 長いバッファを作成
  const lines: string[] = [];
  for (let i = 1; i <= 100; i++) {
    lines.push(`line${i} word${i}`);
  }
  await mockBuffer(denops, lines);

  // 画面範囲を制限（10-20行目のみ表示）
  await mockVisibleRange(denops, 10, 20);
  await mockCursor(denops, 15, 1);

  const words = await detectWords(denops);

  // 表示範囲内の単語のみ検出される
  const lineNumbers = words.map((w) => w.line);
  const minLine = Math.min(...lineNumbers);
  const maxLine = Math.max(...lineNumbers);

  assertEquals(minLine >= 10, true);
  assertEquals(maxLine <= 20, true);

  // 各行に2つの単語があるはずなので、11行 × 2単語 = 22単語
  assertEquals(words.length, 22);
});

test("重複単語の検出", async (denops) => {
  const lines = [
    "test test test",
    "hello world hello",
    "test world test",
  ];
  await mockBuffer(denops, lines);
  await mockCursor(denops, 1, 1);

  const words = await detectWords(denops);

  // 重複も含めて全て検出される
  assertEquals(words.length, 8);

  // 位置情報は異なる
  const testWords = words.filter((w) => w.text === "test");
  assertEquals(testWords.length, 5);

  // 各testの位置が異なることを確認
  const positions = testWords.map((w) => `${w.line}:${w.col}`);
  const uniquePositions = new Set(positions);
  assertEquals(uniquePositions.size, 5);
});

test("キャメルケースとスネークケースの単語検出", async (denops) => {
  const lines = [
    "camelCaseWord",
    "snake_case_word",
    "kebab-case-word",
    "PascalCaseWord",
    "CONSTANT_CASE_WORD",
  ];
  await mockBuffer(denops, lines);
  await mockCursor(denops, 1, 1);

  const words = await detectWords(denops);

  // 現在の実装では、単語境界による分割
  // camelCase → camelCaseWord（1単語）
  // snake_case → snake, case, word（3単語）
  // kebab-case → kebab, case, word（3単語）
  const wordTexts = words.map((w) => w.text);

  assertExists(wordTexts.find((w) => w === "camelCaseWord"));
  assertExists(wordTexts.find((w) => w === "snake"));
  assertExists(wordTexts.find((w) => w === "case"));
  assertExists(wordTexts.find((w) => w === "word"));
  assertExists(wordTexts.find((w) => w === "kebab"));
  assertExists(wordTexts.find((w) => w === "PascalCaseWord"));
  assertExists(wordTexts.find((w) => w === "CONSTANT"));
  assertExists(wordTexts.find((w) => w === "CASE"));
  assertExists(wordTexts.find((w) => w === "WORD"));
});

test("数字を含む単語の検出", async (denops) => {
  const lines = [
    "variable1 test2word",
    "123 456abc def789",
    "0xFF 0b1010 3.14",
  ];
  await mockBuffer(denops, lines);
  await mockCursor(denops, 1, 1);

  const words = await detectWords(denops);
  const wordTexts = words.map((w) => w.text);

  // 英数字の組み合わせも単語として検出
  assertExists(wordTexts.find((w) => w === "variable1"));
  assertExists(wordTexts.find((w) => w === "test2word"));
  assertExists(wordTexts.find((w) => w === "456abc"));
  assertExists(wordTexts.find((w) => w === "def789"));
  assertExists(wordTexts.find((w) => w === "xFF")); // 0は単語境界で分離
  assertExists(wordTexts.find((w) => w === "b1010")); // 0は単語境界で分離
});
