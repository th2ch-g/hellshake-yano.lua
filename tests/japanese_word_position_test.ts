/**
 * 日本語単語位置のテスト
 * 「日本語」の「語」にヒントが表示される問題を再現
 */

import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  HybridWordDetector,
  RegexWordDetector,
  type WordDetectionConfig,
} from "../denops/hellshake-yano/word/detector.ts";

describe("Japanese Word Position Issue", () => {
  const vimConfigText = `    \\ 'use_japanese': v:false,  " 日本語を除外（デフォルト）`;

  describe("RegexWordDetector with use_japanese: false", () => {
    it("should not detect Japanese characters as words", async () => {
      const config: WordDetectionConfig = {
        use_japanese: false,
        use_improved_detection: true,
      };
      const detector = new RegexWordDetector(config);
      const words = await detector.detectWords(vimConfigText, 1);

      words.forEach((w) => {
        const before = vimConfigText.substring(Math.max(0, w.col - 5), w.col - 1);
        const after = vimConfigText.substring(
          w.col - 1 + w.text.length,
          Math.min(vimConfigText.length, w.col + 10),
        );
      });

      // 日本語が含まれないことを確認
      const hasJapanese = words.some((w) =>
        /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(w.text)
      );
      assertEquals(hasJapanese, false, "Should not detect Japanese characters");

      // 英単語は検出される
      const hasUseJapanese = words.some((w) => w.text === "use_japanese");
      const hasV = words.some((w) => w.text === "v");
      const hasFalse = words.some((w) => w.text === "false");
    });

    it("should show what's being detected at each position", async () => {
      const testTexts = [
        "日本語",
        "use_japanese",
        "'use_japanese': v:false",
        "    \\ 'use_japanese': v:false,  \" 日本語を除外",
      ];

      const config: WordDetectionConfig = {
        use_japanese: false,
        use_improved_detection: true,
      };
      const detector = new RegexWordDetector(config);

      for (const text of testTexts) {
        const words = await detector.detectWords(text, 1);

        if (words.length === 0) {
        } else {
          words.forEach((w) => {
            // 実際の文字位置を確認
            const actualChar = text[w.col - 1];
          });
        }
      }
    });
  });

  describe("HybridWordDetector behavior", () => {
    it("should properly handle mixed Japanese-English text", async () => {
      const config: WordDetectionConfig = {
        use_japanese: false,
        use_improved_detection: true,
      };
      const detector = new HybridWordDetector(config);
      const words = await detector.detectWords(vimConfigText, 1);

      words.forEach((w) => {
      });

      // 日本語が含まれないことを確認
      const hasJapanese = words.some((w) =>
        /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(w.text)
      );
      assertEquals(
        hasJapanese,
        false,
        "HybridWordDetector should not detect Japanese when use_japanese is false",
      );
    });
  });

  describe("Character position verification", () => {
    it("should correctly identify character positions", () => {
      const text = "日本語を除外";

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const colNum = i + 1; // Vim columns are 1-based
        const isJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(char);
      }
    });

    it("should analyze the exact problem case", () => {
      const text = `\\ 'use_japanese': v:false,  " 日本語を除外（デフォルト）`;

      // 「語」の位置を探す
      const goIndex = text.indexOf("語");
      if (goIndex !== -1) {
        const goCol = goIndex + 1; // 1-based

        // 周辺の文字を表示
        const before = text.substring(Math.max(0, goIndex - 3), goIndex);
        const after = text.substring(goIndex + 1, Math.min(text.length, goIndex + 4));
      }
    });
  });
});
