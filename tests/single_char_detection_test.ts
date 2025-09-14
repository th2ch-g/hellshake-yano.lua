#!/usr/bin/env -S deno test --allow-all

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { extractWordsFromLine } from "../denops/hellshake-yano/word.ts";

Deno.test("Single Character Word Detection Tests", async (t) => {
  await t.step("Basic single character detection", async (t) => {
    await t.step("should detect single alphabetic characters with improved detection", () => {
      const line = "A B C D E F G H I J K L";
      const words = extractWordsFromLine(line, 1, true);

      assertEquals(words.length, 12);
      assertEquals(words.map(w => w.text), ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"]);
      assertEquals(words[0].col, 1);
      assertEquals(words[1].col, 3);
      assertEquals(words[2].col, 5);
    });

    await t.step("should NOT detect single characters without improved detection", () => {
      const line = "A B C D E F G H I J K L";
      // Process4 Analysis: この行は意図的に従来動作をテストしています
      // useImprovedDetection=false により新実装内で従来動作をエミュレート
      const words = extractWordsFromLine(line, 1, false);

      assertEquals(words.length, 0); // 従来版では1文字単語は検出されない
    });

    await t.step("should detect single digits with improved detection", () => {
      const line = "1 2 3 4 5 6 7 8 9 0";
      const words = extractWordsFromLine(line, 1, true);

      assertEquals(words.length, 10);
      assertEquals(words.map(w => w.text), ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]);
    });
  });

  await t.step("Mixed content detection", async (t) => {
    await t.step("should detect both single and multi-character words", () => {
      const line = "test a I word hello world the end";
      const words = extractWordsFromLine(line, 1, true);

      const singleCharWords = words.filter(w => w.text.length === 1);
      const multiCharWords = words.filter(w => w.text.length > 1);

      assertEquals(singleCharWords.map(w => w.text), ["a", "I"]);
      assertEquals(multiCharWords.map(w => w.text), ["test", "word", "hello", "world", "the", "end"]);
    });

    await t.step("should preserve column positions correctly", () => {
      const line = "A B C";
      const words = extractWordsFromLine(line, 1, true);

      assertEquals(words.length, 3);
      assertEquals(words[0], { text: "A", line: 1, col: 1 });
      assertEquals(words[1], { text: "B", line: 1, col: 3 });
      assertEquals(words[2], { text: "C", line: 1, col: 5 });
    });
  });

  await t.step("Target characters for hint assignment", async (t) => {
    await t.step("should detect all problem characters mentioned in issue", () => {
      // 問題で報告された文字をテスト
      const problemChars = ["A", "S", "D", "F", "G", "J", "K", "L", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"];
      const line = problemChars.join(" ");
      const words = extractWordsFromLine(line, 1, true);

      assertEquals(words.length, problemChars.length);
      assertEquals(words.map(w => w.text), problemChars);
    });

    await t.step("should detect single_char_keys", () => {
      const singleCharKeys = ["A", "S", "D", "F", "G", "H", "J", "K", "L", "N", "M"];
      const line = singleCharKeys.join(" ");
      const words = extractWordsFromLine(line, 1, true);

      assertEquals(words.length, singleCharKeys.length);
      assertEquals(words.map(w => w.text), singleCharKeys);
    });

    await t.step("should detect multi_char_keys", () => {
      const multiCharKeys = ["B", "C", "E", "I", "O", "P", "Q", "R", "T", "U", "V", "W", "X", "Y", "Z"];
      const line = multiCharKeys.join(" ");
      const words = extractWordsFromLine(line, 1, true);

      assertEquals(words.length, multiCharKeys.length);
      assertEquals(words.map(w => w.text), multiCharKeys);
    });
  });

  await t.step("Edge cases", async (t) => {
    await t.step("should handle empty lines", () => {
      const words = extractWordsFromLine("", 1, true);
      assertEquals(words.length, 0);
    });

    await t.step("should handle whitespace-only lines", () => {
      const words = extractWordsFromLine("   ", 1, true);
      assertEquals(words.length, 0);
    });

    await t.step("should handle mixed punctuation", () => {
      const line = "A, B; C. D! E? F:";
      const words = extractWordsFromLine(line, 1, true);

      const singleCharWords = words.filter(w => w.text.length === 1);
      assertEquals(singleCharWords.map(w => w.text), ["A", "B", "C", "D", "E", "F"]);
    });
  });
});