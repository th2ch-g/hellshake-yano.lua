/**
 * Final test for Japanese exclusion fix
 * Verifies that Japanese characters don't receive hints when useJapanese: false
 */

import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";

// Import the actual word detection function
import { extractWords } from "../denops/hellshake-yano/word.ts";

describe("Japanese Exclusion Final Fix", () => {
  describe("extractWords function with excludeJapanese", () => {
    it("should not detect Japanese characters when excludeJapanese is true", () => {
      // Test case from user's report: "数と加のところにヒントがまだ表示されてしまいます"
      const testText =
        "- `denops/hellshake-yano/hint.ts`: HintPosition、calculateHintPosition関数追加（423-456行）の数と加のところにヒント";

      // Call extractWords with excludeJapanese: true
      const words = extractWords(testText, 1, { excludeJapanese: true });

      words.forEach((w) => {
        const isJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(w.text);
      });

      // Verify no Japanese characters are detected
      const japaneseWords = words.filter((w) =>
        /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(w.text)
      );

      assertEquals(
        japaneseWords.length,
        0,
        `Found ${japaneseWords.length} Japanese words: ${
          japaneseWords.map((w) => w.text).join(", ")
        }`,
      );

      // Specifically check that "数" and "加" are not detected
      const hasKazu = words.some((w) => w.text.includes("数"));
      const hasKa = words.some((w) => w.text.includes("加"));

      assertEquals(hasKazu, false, "Character '数' should not be detected");
      assertEquals(hasKa, false, "Character '加' should not be detected");
    });

    it("should detect only English/ASCII words when excludeJapanese is true", () => {
      const mixedText = "Process8 プロセス calculateHintPosition関数 423-456行";

      const words = extractWords(mixedText, 1, { excludeJapanese: true });

      words.forEach((w) => {
      });

      // Should detect English words
      const hasProcess = words.some((w) => w.text === "Process8");
      const hasCalculate = words.some((w) => w.text === "calculateHintPosition");

      assertEquals(hasProcess, true, "Should detect 'Process8'");
      assertEquals(hasCalculate, true, "Should detect 'calculateHintPosition'");

      // Should NOT detect Japanese
      const hasJapanese = words.some((w) =>
        /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(w.text)
      );
      assertEquals(hasJapanese, false, "Should not detect any Japanese characters");
    });

    it("should handle Japanese word boundary splitting correctly", () => {
      // Test that the fix at line 277 prevents Japanese processing
      const longJapaneseText = "これは長い日本語のテキストです";

      const wordsExcluded = extractWords(longJapaneseText, 1, { excludeJapanese: true });
      const wordsIncluded = extractWords(longJapaneseText, 1, { excludeJapanese: false });

      // When excluded, no words should be detected (all Japanese)
      assertEquals(wordsExcluded.length, 0, "Should detect no words when Japanese is excluded");

      // When included, words should be detected
      assertEquals(wordsIncluded.length > 0, true, "Should detect words when Japanese is included");
    });

    it("should respect excludeJapanese in complex vim config text", () => {
      const vimConfigText = `    \\ 'useJapanese': v:false,  " 日本語を除外（デフォルト）`;

      const words = extractWords(vimConfigText, 1, { excludeJapanese: true });

      words.forEach((w) => {
        const snippet = vimConfigText.substring(w.col - 1, w.col - 1 + w.text.length);
      });

      // Should detect English identifiers
      const hasUseJapanese = words.some((w) => w.text === "useJapanese");
      assertEquals(hasUseJapanese, true, "Should detect 'useJapanese'");

      // Should NOT detect "日本語" or "除外" or "語"
      const japaneseChars = ["日", "本", "語", "除", "外"];
      japaneseChars.forEach((char) => {
        const hasChar = words.some((w) => w.text.includes(char));
        assertEquals(hasChar, false, `Character '${char}' should not be detected`);
      });
    });
  });
});
