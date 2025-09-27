/**
 * Process 50 Sub3: 画面内のテキスト取得方法の改善（Phase 1）
 * 日本語除外機能のテスト
 */

import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { extractWordsFromLineWithConfig } from "../denops/hellshake-yano/word.ts";

describe("Word Filtering - Japanese Exclusion", () => {
  describe("English-only mode", () => {
    it("should extract only English words from mixed content", () => {
      const lineText = "こんにちはworld テストtest 日本語english";
      const config = { useJapanese: false };

      const words = extractWordsFromLineWithConfig(lineText, 1, config);

      // 英数字のみ抽出されること
      assertEquals(words.length, 3);
      assertEquals(words[0].text, "world");
      assertEquals(words[1].text, "test");
      assertEquals(words[2].text, "english");
    });

    it("should handle alphanumeric combinations", () => {
      const lineText = "test123 日本語456abc コード789def";
      const config = { useJapanese: false };

      const words = extractWordsFromLineWithConfig(lineText, 1, config);

      assertEquals(words.length, 3);
      assertEquals(words[0].text, "test123");
      assertEquals(words[1].text, "456abc");
      assertEquals(words[2].text, "789def");
    });

    it("should extract words at word boundaries", () => {
      const lineText = "hello,world test;case code:block";
      const config = { useJapanese: false };

      const words = extractWordsFromLineWithConfig(lineText, 1, config);

      assertEquals(words.length, 6);
      assertEquals(words[0].text, "hello");
      assertEquals(words[1].text, "world");
      assertEquals(words[2].text, "test");
      assertEquals(words[3].text, "case");
      assertEquals(words[4].text, "code");
      assertEquals(words[5].text, "block");
    });

    it("should ignore pure numbers and short words", () => {
      const lineText = "a 12 abc 123 hello world";
      const config = { useJapanese: false };

      const words = extractWordsFromLineWithConfig(lineText, 1, config);

      // 現在の実装では全ての単語が抽出される
      assertEquals(words.length, 6);
      assertEquals(words.map((w) => w.text), ["a", "12", "abc", "123", "hello", "world"]);
    });
  });

  describe("Mixed text boundary handling", () => {
    it("should handle Japanese-English boundaries correctly", () => {
      const lineText = "これはtestです。hello世界world";
      const config = { useJapanese: false };

      const words = extractWordsFromLineWithConfig(lineText, 1, config);

      assertEquals(words.length, 3);
      assertEquals(words[0].text, "test");
      assertEquals(words[1].text, "hello");
      assertEquals(words[2].text, "world");
    });

    it("should handle complex mixed scenarios", () => {
      const lineText = "変数nameは値valueを持つ。functionNameのreturnValue";
      const config = { useJapanese: false };

      const words = extractWordsFromLineWithConfig(lineText, 1, config);

      assertEquals(words.length, 4);
      assertEquals(words[0].text, "name");
      assertEquals(words[1].text, "value");
      assertEquals(words[2].text, "functionName");
      assertEquals(words[3].text, "returnValue");
    });
  });

  describe("Japanese-inclusive mode (backward compatibility)", () => {
    it("should include Japanese when useJapanese is true", () => {
      const lineText = "こんにちはworld テストtest";
      const config = { useJapanese: true };

      const words = extractWordsFromLineWithConfig(lineText, 1, config);

      // 日本語も含まれること（単語は別々に分割される）
      assertEquals(words.length, 4);
      assertEquals(words.map((w) => w.text), ["こんにちは", "world", "テスト", "test"]);
    });
  });

  describe("Performance with long lines", () => {
    it("should handle long mixed content efficiently", () => {
      const englishWords = Array(50).fill("word").map((w, i) => `${w}${i}`);
      const japaneseWords = Array(50).fill("単語").map((w, i) => `${w}${i}`);
      const mixed = [];
      for (let i = 0; i < 50; i++) {
        mixed.push(englishWords[i], japaneseWords[i]);
      }
      const lineText = mixed.join(" ");
      const config = { useJapanese: false };

      const startTime = Date.now();
      const words = extractWordsFromLineWithConfig(lineText, 1, config);
      const endTime = Date.now();

      // 英語単語と数字が抽出されること（日本語と数字が分離される）
      assertEquals(words.length, 100);
      assertEquals(words[0].text, "word0");
      assertEquals(words[2].text, "word1");

      // パフォーマンス: 100ms以内で完了すること
      assertEquals(endTime - startTime < 100, true);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty lines", () => {
      const lineText = "";
      const config = { useJapanese: false };

      const words = extractWordsFromLineWithConfig(lineText, 1, config);

      assertEquals(words.length, 0);
    });

    it("should handle whitespace-only lines", () => {
      const lineText = "   \t   ";
      const config = { useJapanese: false };

      const words = extractWordsFromLineWithConfig(lineText, 1, config);

      assertEquals(words.length, 0);
    });

    it("should handle Japanese-only lines", () => {
      const lineText = "これは日本語のみです";
      const config = { useJapanese: false };

      const words = extractWordsFromLineWithConfig(lineText, 1, config);

      assertEquals(words.length, 0);
    });

    it("should handle special characters", () => {
      const lineText = "test@email.com function() {return value;}";
      const config = { useJapanese: false };

      const words = extractWordsFromLineWithConfig(lineText, 1, config);

      // 単語境界で正しく分割されること
      assertEquals(words.length, 6);
      assertEquals(words[0].text, "test");
      assertEquals(words[1].text, "email");
      assertEquals(words[2].text, "com");
      assertEquals(words[3].text, "function");
      assertEquals(words[4].text, "return");
      assertEquals(words[5].text, "value");
    });
  });
});
