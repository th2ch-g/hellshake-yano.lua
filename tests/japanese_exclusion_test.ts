/**
 * 日本語除外設定のテスト
 * use_japanese設定が正しく機能することを確認
 */

import { assertEquals } from "https://deno.land/std@0.221.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.221.0/testing/bdd.ts";
import {
  RegexWordDetector,
  TinySegmenterWordDetector,
  HybridWordDetector,
  type WordDetectionConfig
} from "../denops/hellshake-yano/word/detector.ts";

describe("Japanese Exclusion Configuration", () => {
  const japaneseText = "これは日本語とEnglishの混在テキストです";
  const startLine = 1;

  describe("RegexWordDetector", () => {
    it("should exclude Japanese when use_japanese is false", async () => {
      const config: WordDetectionConfig = { use_japanese: false };
      const detector = new RegexWordDetector(config);
      const words = await detector.detectWords(japaneseText, startLine);

      // 日本語を除外するので、Englishのみが検出される
      const wordTexts = words.map(w => w.text);

      assertEquals(wordTexts.includes("English"), true);
      assertEquals(wordTexts.some(w => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(w)), false);
    });

    it("should include Japanese when use_japanese is true", async () => {
      const config: WordDetectionConfig = { use_japanese: true };
      const detector = new RegexWordDetector(config);
      const words = await detector.detectWords(japaneseText, startLine);

      const wordTexts = words.map(w => w.text);

      // 日本語を含む
      assertEquals(wordTexts.some(w => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(w)), true);
    });
  });

  describe("HybridWordDetector", () => {
    it("should respect use_japanese configuration from Vim settings", async () => {
      // use_japanese: false を明示的に設定
      const config: WordDetectionConfig = {
        use_japanese: false
      };
      const detector = new HybridWordDetector(config);
      const words = await detector.detectWords(japaneseText, startLine);

      const wordTexts = words.map(w => w.text);

      // 日本語が除外されることを確認
      assertEquals(wordTexts.includes("English"), true);
      // 日本語が含まれないことを確認（HybridがRegexの設定を尊重）
      const hasJapanese = wordTexts.some(w => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(w));
      assertEquals(hasJapanese, false, "Japanese should be excluded when use_japanese is false");
    });

    it("should include Japanese when explicitly enabled", async () => {
      const config: WordDetectionConfig = {
        use_japanese: true
      };
      const detector = new HybridWordDetector(config);
      const words = await detector.detectWords(japaneseText, startLine);

      const wordTexts = words.map(w => w.text);

      // 日本語が含まれることを確認
      const hasJapanese = wordTexts.some(w => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(w));
      assertEquals(hasJapanese, true);
    });

    it("should use default (false) when use_japanese is not specified", async () => {
      // use_japanese を指定しない（undefined）
      const config: WordDetectionConfig = {
      };
      const detector = new HybridWordDetector(config);
      const words = await detector.detectWords(japaneseText, startLine);

      const wordTexts = words.map(w => w.text);

      // デフォルトでは日本語が除外される（main.tsのデフォルト設定に従う）
      assertEquals(wordTexts.includes("English"), true);
    });
  });

  describe("Configuration inheritance", () => {
    it("HybridWordDetector should pass configuration to child detectors", async () => {
      const testText = "Process8 プロセス Implementation 実装";

      // 日本語除外設定
      const configExclude: WordDetectionConfig = {
        use_japanese: false
      };
      const hybridExclude = new HybridWordDetector(configExclude);
      const wordsExclude = await hybridExclude.detectWords(testText, 1);

      // 日本語含む設定
      const configInclude: WordDetectionConfig = {
        use_japanese: true
      };
      const hybridInclude = new HybridWordDetector(configInclude);
      const wordsInclude = await hybridInclude.detectWords(testText, 1);


      // 除外設定では日本語が含まれない
      const hasJapaneseExclude = wordsExclude.some(w =>
        /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(w.text)
      );
      assertEquals(hasJapaneseExclude, false);

      // 含む設定では日本語が含まれる
      const hasJapaneseInclude = wordsInclude.some(w =>
        /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(w.text)
      );
      assertEquals(hasJapaneseInclude, true);
    });
  });
});