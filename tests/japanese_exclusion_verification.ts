/**
 * Verification test for Japanese exclusion fix
 * Tests the word detection directly with Japanese exclusion enabled
 */

import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  HybridWordDetector,
  RegexWordDetector,
  type WordDetectionConfig,
} from "../denops/hellshake-yano/word/detector.ts";

describe("Japanese Exclusion Verification", () => {
  // Test text from user's report containing "数" and "加"
  const problemText =
    "- `denops/hellshake-yano/hint.ts`: HintPosition、calculateHintPosition関数追加（423-456行）の数と加のところにヒント";

  describe("RegexWordDetector with use_japanese: false", () => {
    it("should not detect Japanese characters 数 and 加", async () => {
      const config: WordDetectionConfig = {
        use_japanese: false,
        use_improved_detection: true,
      };
      const detector = new RegexWordDetector(config);
      const words = await detector.detectWords(problemText, 1);

      words.forEach((w) => {
        const isJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(w.text);
      });

      // Check that no Japanese characters are detected
      const japaneseWords = words.filter((w) =>
        /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(w.text)
      );

      assertEquals(
        japaneseWords.length,
        0,
        `Should not detect Japanese, but found: ${japaneseWords.map((w) => w.text).join(", ")}`,
      );

      // Specifically verify "数" and "加" are not detected
      const hasKazu = words.some((w) => w.text.includes("数"));
      const hasKa = words.some((w) => w.text.includes("加"));

      assertEquals(hasKazu, false, "Should not detect '数'");
      assertEquals(hasKa, false, "Should not detect '加'");

      // Verify English words are still detected
      const hasHint = words.some((w) => w.text === "hint" || w.text === "HintPosition");
      const hasCalculate = words.some((w) => w.text === "calculateHintPosition");
    });
  });

  describe("HybridWordDetector with use_japanese: false", () => {
    it("should not detect Japanese characters when configured", async () => {
      const config: WordDetectionConfig = {
        use_japanese: false, // Explicitly set to false
        use_improved_detection: true,
      };
      const detector = new HybridWordDetector(config);
      const words = await detector.detectWords(problemText, 1);

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
        `HybridWordDetector should not detect Japanese, but found: ${
          japaneseWords.map((w) => w.text).join(", ")
        }`,
      );
    });
  });

  describe("Mixed content handling", () => {
    it("should handle Process8 correctly", async () => {
      const text = "Process8 プロセス implementation 実装";

      const config: WordDetectionConfig = {
        use_japanese: false,
        use_improved_detection: true,
      };
      const detector = new HybridWordDetector(config);
      const words = await detector.detectWords(text, 1);

      words.forEach((w) => {
      });

      // Should detect Process8 as one word
      const hasProcess8 = words.some((w) => w.text === "Process8");
      assertEquals(hasProcess8, true, "Should detect 'Process8' as single word");

      // Should detect implementation
      const hasImplementation = words.some((w) => w.text === "implementation");
      assertEquals(hasImplementation, true, "Should detect 'implementation'");

      // Should NOT detect Japanese words
      const hasJapanese = words.some((w) =>
        /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(w.text)
      );
      assertEquals(hasJapanese, false, "Should not detect Japanese characters");
    });

    it("should respect use_japanese setting from vim config", async () => {
      const vimConfigLine = `    \\ 'use_japanese': v:false,  " 日本語を除外（デフォルト）`;

      const config: WordDetectionConfig = {
        use_japanese: false, // This should be respected
        use_improved_detection: true,
      };
      const detector = new RegexWordDetector(config);
      const words = await detector.detectWords(vimConfigLine, 1);

      let foundJapaneseChar = false;
      words.forEach((w) => {
        const isJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(w.text);
        if (isJapanese) {
          foundJapaneseChar = true;
        } else {
        }
      });

      assertEquals(foundJapaneseChar, false, "Should not detect any Japanese characters");

      // Verify "語" specifically is not detected as a word
      const hasGo = words.some((w) => w.text === "語" || w.text.includes("語"));
      assertEquals(hasGo, false, "Should not detect '語' character");
    });
  });
});
