import { assertEquals, assertRejects } from "@std/assert";
import type { Denops } from "@denops/std";
import { generateHints } from "../denops/hellshake-yano/hint.ts";

/**
 * 複数文字ヒント機能のテスト
 */

Deno.test("generateHints - should create multi-character hints for >26 words", () => {
  const markers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  
  // 30単語のテスト（26を超える）
  const hints = generateHints(30, markers);
  
  assertEquals(hints.length, 30);
  
  // 最初の26個は単一文字
  for (let i = 0; i < 26; i++) {
    assertEquals(hints[i].length, 1);
    assertEquals(hints[i], markers[i]);
  }
  
  // 27番目以降は複数文字（AA, AB, AC, AD）
  assertEquals(hints[26], "AA");
  assertEquals(hints[27], "AB");
  assertEquals(hints[28], "AC");
  assertEquals(hints[29], "AD");
});

Deno.test("generateHints - should handle exactly 26 words", () => {
  const markers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  
  const hints = generateHints(26, markers);
  
  assertEquals(hints.length, 26);
  
  // すべて単一文字であることを確認
  for (let i = 0; i < 26; i++) {
    assertEquals(hints[i].length, 1);
    assertEquals(hints[i], markers[i]);
  }
});

Deno.test("generateHints - should handle large number of words (>52)", () => {
  const markers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  
  // 60単語のテスト
  const hints = generateHints(60, markers);
  
  assertEquals(hints.length, 60);
  
  // 最初の26個は単一文字
  for (let i = 0; i < 26; i++) {
    assertEquals(hints[i].length, 1);
  }
  
  // 27-52番目はAA-AZ
  for (let i = 26; i < 52; i++) {
    assertEquals(hints[i].length, 2);
    assertEquals(hints[i][0], "A");
  }
  
  // 53-60番目はBA-BH
  for (let i = 52; i < 60; i++) {
    assertEquals(hints[i].length, 2);
    assertEquals(hints[i][0], "B");
  }
  
  // 具体的な確認
  assertEquals(hints[52], "BA");
  assertEquals(hints[59], "BH");
});

Deno.test("generateHints - should create unique hints", () => {
  const markers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  
  const hints = generateHints(100, markers);
  const uniqueHints = new Set(hints);
  
  assertEquals(hints.length, uniqueHints.size, "All hints should be unique");
});