/**
 * Process 50 Sub3: 統合テスト
 * 日本語除外機能とヒント表示位置改善の統合テスト
 */

import { assert, assertEquals, assertExists } from "https://deno.land/std@0.221.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.221.0/testing/bdd.ts";
import { extractWordsFromLineWithEnhancedConfig, type EnhancedWordConfig, type Word } from "../denops/hellshake-yano/word.ts";
import { calculateHintPosition, assignHintsToWords, generateHints } from "../denops/hellshake-yano/hint.ts";

describe("Integration Test - Word Filtering & Hint Positioning", () => {
  describe("End-to-end word detection and hint assignment", () => {
    it("should extract English words and calculate correct hint positions", () => {
      const lineText = "これはtest実装example コードです";
      const config: EnhancedWordConfig = { use_japanese: false };

      // Phase 1: 英数字のみ抽出
      const words = extractWordsFromLineWithEnhancedConfig(lineText, 1, config);
      assertEquals(words.length, 2);
      assertEquals(words[0].text, "test");
      assertEquals(words[1].text, "example");

      // Phase 2: ヒント位置計算
      const hints = generateHints(words.length, ["A", "B", "C"]);
      const hintMappings = assignHintsToWords(words, hints, 1, 1);

      // ヒント位置の確認
      const position1 = calculateHintPosition(words[0], "start");
      const position2 = calculateHintPosition(words[1], "start");

      assertEquals(position1.line, 1);
      assertEquals(position1.col, words[0].col); // "test"の開始位置
      assertEquals(position1.display_mode, "before");

      assertEquals(position2.line, 1);
      assertEquals(position2.col, words[1].col); // "example"の開始位置
      assertEquals(position2.display_mode, "before");
    });

    it("should handle mixed content with different hint positions", () => {
      const lineText = "関数function変数variable定数constant";
      const config: EnhancedWordConfig = { use_japanese: false };

      const words = extractWordsFromLineWithEnhancedConfig(lineText, 2, config);
      assertEquals(words.length, 3);
      assertEquals(words[0].text, "function");
      assertEquals(words[1].text, "variable");
      assertEquals(words[2].text, "constant");

      // 異なるヒント位置での動作確認
      const startPos = calculateHintPosition(words[0], "start");
      const endPos = calculateHintPosition(words[1], "end");
      const overlayPos = calculateHintPosition(words[2], "overlay");

      assertEquals(startPos.display_mode, "before");
      assertEquals(endPos.display_mode, "after");
      assertEquals(overlayPos.display_mode, "overlay");

      // 終端位置の計算確認
      assertEquals(endPos.col, words[1].col + words[1].text.length - 1);
    });
  });

  describe("Japanese inclusive mode integration", () => {
    it("should work with Japanese mode and positioning", () => {
      const lineText = "コードcode実装implement";
      const config: EnhancedWordConfig = { use_japanese: true };

      const words = extractWordsFromLineWithEnhancedConfig(lineText, 1, config);
      // 日本語文字が個別に分割され、英単語も抽出される
      assert(words.length > 1); // 複数の単語として抽出

      // 日本語文字が含まれることを確認
      const japaneseChars = words.filter(w => /[\u30A0-\u30FF\u4E00-\u9FAF]/.test(w.text));
      assert(japaneseChars.length > 0);

      // 英単語も含まれることを確認
      const englishWords = words.filter(w => w.text === "code" || w.text === "implement");
      assertEquals(englishWords.length, 2);

      // ヒント位置計算
      words.forEach((word, index) => {
        const position = calculateHintPosition(word, "start");
        assertEquals(position.line, 1);
        assertEquals(position.col, word.col);
        assertEquals(position.display_mode, "before");
      });
    });
  });

  describe("Multiple lines integration", () => {
    it("should handle multi-line content correctly", () => {
      const lines = [
        "第一行first line",
        "  indented second行",
        "最後のlast line"
      ];
      const config: EnhancedWordConfig = { use_japanese: false };

      const allWords: Word[] = [];
      lines.forEach((lineText, index) => {
        const lineWords = extractWordsFromLineWithEnhancedConfig(lineText, index + 1, config);
        allWords.push(...lineWords);
      });

      // 英数字のみが抽出されること
      assertEquals(allWords.length, 6);
      assertEquals(allWords[0].text, "first");
      assertEquals(allWords[1].text, "line");
      assertEquals(allWords[2].text, "indented");
      assertEquals(allWords[3].text, "second");
      assertEquals(allWords[4].text, "last");
      assertEquals(allWords[5].text, "line");

      // 行番号が正しく設定されること
      assertEquals(allWords[0].line, 1);
      assertEquals(allWords[2].line, 2); // インデントされた行
      assertEquals(allWords[4].line, 3);
      assertEquals(allWords[5].line, 3);

      // ヒント位置が正しく計算されること
      allWords.forEach(word => {
        const position = calculateHintPosition(word, "start");
        assertEquals(position.line, word.line);
        assertEquals(position.col, word.col);
      });
    });
  });

  describe("Performance integration test", () => {
    it("should handle large mixed content efficiently", () => {
      // 大量の混在コンテンツを生成
      const englishWords = Array(100).fill(0).map((_, i) => `word${i}`);
      const japaneseWords = Array(100).fill(0).map((_, i) => `単語${i}`);
      const mixed = [];
      for (let i = 0; i < 100; i++) {
        mixed.push(englishWords[i], japaneseWords[i]);
      }
      const lineText = mixed.join(" ");
      const config: EnhancedWordConfig = { use_japanese: false };

      const startTime = Date.now();

      // Phase 1: 単語抽出
      const words = extractWordsFromLineWithEnhancedConfig(lineText, 1, config);

      // Phase 2: ヒント生成と位置計算
      const hints = generateHints(words.length,
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""));
      const hintMappings = assignHintsToWords(words, hints, 1, 1);

      // Phase 3: 位置計算
      const positions = words.map(word =>
        calculateHintPosition(word, "start"));

      const endTime = Date.now();

      // 結果検証（改善版では1文字の単語も検出されるため、より多くの単語が検出される）
      assertEquals(words.length, 200); // 改善版では英語単語がより細かく検出される
      assertEquals(hintMappings.length, 200);
      assertEquals(positions.length, 200);

      // パフォーマンス確認（500ms以内）
      assertEquals(endTime - startTime < 500, true);

      // 全ての位置が正しく計算されていること
      positions.forEach((pos, index) => {
        assertEquals(pos.line, 1);
        assertEquals(pos.col, words[index].col);
        assertEquals(pos.display_mode, "before");
      });
    });
  });

  describe("Configuration integration", () => {
    it("should work with different configurations consistently", () => {
      const lineText = "設定config変更change適用apply";

      // 設定1: 日本語除外
      const config1: EnhancedWordConfig = { use_japanese: false };
      const words1 = extractWordsFromLineWithEnhancedConfig(lineText, 1, config1);
      assertEquals(words1.length, 3);
      assertEquals(words1.map(w => w.text), ["config", "change", "apply"]);

      // 設定2: 日本語包含（個別分割）
      const config2: EnhancedWordConfig = { use_japanese: true };
      const words2 = extractWordsFromLineWithEnhancedConfig(lineText, 1, config2);
      // 日本語文字が個別に分割され、英単語も抽出される
      assert(words2.length > 3);

      // 日本語文字と英単語の両方が含まれることを確認
      const hasJapanese = words2.some(w => /[\u4E00-\u9FAF]/.test(w.text));
      const hasEnglish = words2.some(w => /^[a-zA-Z]+$/.test(w.text));
      assert(hasJapanese);
      assert(hasEnglish);

      // 両方の設定でヒント位置計算が正常に動作すること
      [words1, words2].forEach(words => {
        words.forEach(word => {
          const startPos = calculateHintPosition(word, "start");
          const endPos = calculateHintPosition(word, "end");
          const overlayPos = calculateHintPosition(word, "overlay");

          assertEquals(startPos.display_mode, "before");
          assertEquals(endPos.display_mode, "after");
          assertEquals(overlayPos.display_mode, "overlay");

          assertEquals(startPos.col, word.col);
          assertEquals(endPos.col, word.col + word.text.length - 1);
          assertEquals(overlayPos.col, word.col);
        });
      });
    });
  });

  describe("Edge cases integration", () => {
    it("should handle edge cases gracefully", () => {
      const edgeCases = [
        "",
        "   ",
        "日本語のみです",
        "english only",
        "a",
        "123",
        "mixed123数字456text",
      ];

      const config: EnhancedWordConfig = { use_japanese: false };

      edgeCases.forEach((lineText, index) => {
        const words = extractWordsFromLineWithEnhancedConfig(lineText, index + 1, config);

        // エラーが発生しないこと
        assertExists(words);

        // 抽出された単語の位置計算が正常に動作すること
        words.forEach(word => {
          const position = calculateHintPosition(word, "start");
          assertEquals(position.line, index + 1);
          assertEquals(position.col, word.col);
          assertEquals(position.display_mode, "before");
        });
      });
    });
  });
});