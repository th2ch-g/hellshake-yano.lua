#!/usr/bin/env -S deno test --allow-all

/**
 * 日本語フィルタリングのテスト
 * useJapanese設定が正しく動作することを確認
 */

import { assertEquals } from "@std/assert";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { detectWordsWithConfig, extractWordsFromLine, resetWordDetectionManager } from "../denops/hellshake-yano/word.ts";

describe("Japanese Filtering Tests", () => {
  describe("extractWordsFromLine with Japanese exclusion", () => {
    it("should exclude Japanese when excludeJapanese is true", () => {
      const line = "hello こんにちは world 世界 test テスト 123";

      // 日本語を除外
      const wordsExcluded = extractWordsFromLine(line, 1, true, true);
      const textsExcluded = wordsExcluded.map((w) => w.text);

      // 英数字のみが抽出されるべき
      assertEquals(textsExcluded, ["hello", "world", "test", "123"]);

      // 日本語を含む
      const wordsIncluded = extractWordsFromLine(line, 1, true, false);
      const textsIncluded = wordsIncluded.map((w) => w.text);

      // 日本語も含まれるべき
      assertEquals(textsIncluded.includes("こんにちは"), true);
      assertEquals(textsIncluded.includes("世界"), true);
      assertEquals(textsIncluded.includes("テスト"), true);
    });

    it("should handle single character words with Japanese exclusion", () => {
      const line = "A あ B い C う D え E お";

      // 日本語を除外
      const wordsExcluded = extractWordsFromLine(line, 1, true, true);
      const textsExcluded = wordsExcluded.map((w) => w.text);

      // 英字のみが抽出されるべき
      assertEquals(textsExcluded, ["A", "B", "C", "D", "E"]);

      // 日本語を含む
      const wordsIncluded = extractWordsFromLine(line, 1, true, false);
      const textsIncluded = wordsIncluded.map((w) => w.text);

      // ひらがなも含まれるべき
      assertEquals(textsIncluded.includes("あ"), true);
      assertEquals(textsIncluded.includes("い"), true);
    });

    it("should handle mixed content with Japanese exclusion", () => {
      const line = "function関数 variable変数 constant定数";

      // 日本語を除外
      const wordsExcluded = extractWordsFromLine(line, 1, true, true);
      const textsExcluded = wordsExcluded.map((w) => w.text);

      // 英字部分のみが抽出されるべき
      assertEquals(textsExcluded.includes("function"), true);
      assertEquals(textsExcluded.includes("variable"), true);
      assertEquals(textsExcluded.includes("constant"), true);
      assertEquals(textsExcluded.includes("関数"), false);
      assertEquals(textsExcluded.includes("変数"), false);
      assertEquals(textsExcluded.includes("定数"), false);
    });
  });

  describe("detectWordsWithConfig with Japanese setting", () => {
    // Mock denops object
    const mockDenops = {
      async call(fn: string, ...args: any[]): Promise<any> {
        if (fn === "line") {
          if (args[0] === "w0") return 1;
          if (args[0] === "w$") return 3;
        }
        if (fn === "getbufline") {
          // getbufline("%", topLine, bottomLine)
          const lines = [
            "",
            "hello こんにちは world",
            "テスト test 試験",
            "A B C あ い う",
          ];
          const topLine = args[1] as number;
          const bottomLine = args[2] as number;
          return lines.slice(topLine, bottomLine + 1);
        }
        if (fn === "getline") {
          const lineNumber = args[0];
          const lines = [
            "",
            "hello こんにちは world",
            "テスト test 試験",
            "A B C あ い う",
          ];
          return lines[lineNumber] || "";
        }
        return null;
      },
    };

    beforeEach(() => {
      // Reset global manager before each test to ensure clean state
      resetWordDetectionManager();
    });

    it("should respect useJapanese=false setting", async () => {
      const words = await detectWordsWithConfig(mockDenops as any, {
        useJapanese: false,
      });

      const texts = words.map((w) => w.text);

      // 英数字のみが含まれるべき
      assertEquals(texts.includes("hello"), true);
      assertEquals(texts.includes("world"), true);
      assertEquals(texts.includes("test"), true);
      assertEquals(texts.includes("A"), true);
      assertEquals(texts.includes("B"), true);
      assertEquals(texts.includes("C"), true);

      // 日本語は含まれないべき
      assertEquals(texts.includes("こんにちは"), false);
      assertEquals(texts.includes("テスト"), false);
      assertEquals(texts.includes("試験"), false);
      assertEquals(texts.includes("あ"), false);
    });

    it("should include Japanese when useJapanese=true", async () => {
      const words = await detectWordsWithConfig(mockDenops as any, {
        useJapanese: true,
      });

      const texts = words.map((w) => w.text);

      // 英数字と日本語の両方が含まれるべき
      assertEquals(texts.includes("hello"), true);
      assertEquals(texts.includes("world"), true);
      assertEquals(texts.includes("こんにちは"), true);
      assertEquals(texts.includes("テスト"), true);
      assertEquals(texts.includes("試験"), true);
    });

    it("should default to including Japanese when useJapanese is undefined", async () => {
      const words = await detectWordsWithConfig(mockDenops as any, {
        // useJapanese is undefined
      });

      const texts = words.map((w) => w.text);

      // デフォルトでは日本語を含めるべき（既存の動作を維持）
      assertEquals(texts.includes("hello"), true);
      assertEquals(texts.includes("world"), true);
      assertEquals(texts.includes("こんにちは"), true);
      assertEquals(texts.includes("テスト"), true);
    });
  });

  describe("Backward compatibility", () => {
    it("should maintain backward compatibility with useImprovedDetection=false", () => {
      const line = "hello world test";

      // Process4 Analysis: この行は後方互換性テストのため意図的に従来動作を使用
      // 改善版無効の場合（従来の動作）
      const wordsOld = extractWordsFromLine(line, 1, false);

      // 2文字以上の単語のみが抽出されるべき（従来の動作）
      const textsOld = wordsOld.map((w) => w.text);
      assertEquals(textsOld, ["hello", "world", "test"]);
    });

    it("should handle single chars only with improved detection", () => {
      const line = "A B C D E";

      // Process4 Analysis: この行は従来動作との差分確認のため意図的に従来動作を使用
      // 改善版無効（従来）
      const wordsOld = extractWordsFromLine(line, 1, false);
      assertEquals(wordsOld.length, 0); // 1文字は検出されない

      // 改善版有効
      const wordsNew = extractWordsFromLine(line, 1, true, true);
      assertEquals(wordsNew.length, 5); // 1文字も検出される
    });
  });
});
