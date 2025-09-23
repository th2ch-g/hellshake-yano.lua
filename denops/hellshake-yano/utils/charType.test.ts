import { assertEquals } from "https://deno.land/std@0.220.0/assert/mod.ts";
import { CharType, getCharType, analyzeString, findBoundaries } from "./charType.ts";

Deno.test("文字種判定 - ひらがな", () => {
  assertEquals(getCharType("あ"), CharType.Hiragana);
  assertEquals(getCharType("ひ"), CharType.Hiragana);
  assertEquals(getCharType("ん"), CharType.Hiragana);
});

Deno.test("文字種判定 - カタカナ", () => {
  assertEquals(getCharType("ア"), CharType.Katakana);
  assertEquals(getCharType("カ"), CharType.Katakana);
  assertEquals(getCharType("ン"), CharType.Katakana);
});

Deno.test("文字種判定 - 漢字", () => {
  assertEquals(getCharType("日"), CharType.Kanji);
  assertEquals(getCharType("本"), CharType.Kanji);
  assertEquals(getCharType("語"), CharType.Kanji);
});

Deno.test("文字種判定 - 英数字", () => {
  assertEquals(getCharType("a"), CharType.Alphanumeric);
  assertEquals(getCharType("Z"), CharType.Alphanumeric);
  assertEquals(getCharType("1"), CharType.Alphanumeric);
  assertEquals(getCharType("9"), CharType.Alphanumeric);
});

Deno.test("文字種判定 - 記号", () => {
  assertEquals(getCharType("!"), CharType.Symbol);
  assertEquals(getCharType("@"), CharType.Symbol);
  assertEquals(getCharType("("), CharType.Symbol);
  assertEquals(getCharType(")"), CharType.Symbol);
  assertEquals(getCharType("「"), CharType.Symbol);
  assertEquals(getCharType("」"), CharType.Symbol);
});

Deno.test("文字種判定 - スペース", () => {
  assertEquals(getCharType(" "), CharType.Space);
  assertEquals(getCharType("　"), CharType.Space); // 全角スペース
  assertEquals(getCharType("\t"), CharType.Space);
});

Deno.test("文字種判定 - その他", () => {
  assertEquals(getCharType("🚀"), CharType.Other);
  assertEquals(getCharType("★"), CharType.Other);
});

Deno.test("文字列解析 - 単一文字種", () => {
  const result = analyzeString("あいうえお");
  assertEquals(result.length, 1);
  assertEquals(result[0].type, CharType.Hiragana);
  assertEquals(result[0].start, 0);
  assertEquals(result[0].end, 5);
});

Deno.test("文字列解析 - 混合文字種", () => {
  const result = analyzeString("こんにちはWorld");
  assertEquals(result.length, 2);
  assertEquals(result[0].type, CharType.Hiragana);
  assertEquals(result[0].start, 0);
  assertEquals(result[0].end, 5);
  assertEquals(result[1].type, CharType.Alphanumeric);
  assertEquals(result[1].start, 5);
  assertEquals(result[1].end, 10);
});

Deno.test("境界検出 - 文字種変化点", () => {
  const boundaries = findBoundaries("日本語とEnglish");
  assertEquals(boundaries, [0, 3, 4, 11]);
});

Deno.test("境界検出 - CamelCase", () => {
  const boundaries = findBoundaries("getUserName");
  assertEquals(boundaries, [0, 3, 7, 11]);
});

Deno.test("境界検出 - 記号区切り", () => {
  const boundaries = findBoundaries("hello(world)");
  assertEquals(boundaries, [0, 5, 6, 11, 12]);
});

Deno.test("境界検出 - 複雑な例", () => {
  const boundaries = findBoundaries("test_関数Name123");
  assertEquals(boundaries, [0, 4, 5, 7, 14]);
});

Deno.test("境界検出 - 空文字列", () => {
  const boundaries = findBoundaries("");
  assertEquals(boundaries, [0]);
});

Deno.test("境界検出 - 単一文字", () => {
  const boundaries = findBoundaries("a");
  assertEquals(boundaries, [0, 1]);
});