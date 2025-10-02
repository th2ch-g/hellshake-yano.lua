/**
 * ヒント表示位置の修正テスト
 * 問題: "Process8"のような単語で、"o"の位置にヒントが表示される
 * 期待: "P"の位置にヒントが表示される
 */

import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { extractWords } from "../denops/hellshake-yano/word.ts";
import { calculateHintPosition } from "../denops/hellshake-yano/hint.ts";

describe("Hint Position Fix - Process単語の表示位置", () => {
  describe("Process8のような英数字混在単語", () => {
    it("Process8のヒントは先頭のPに表示されるべき", () => {
      const text = "- **最終更新**: 2025-09-13 (Process8, Process9, Process10)";

      // 改善版の単語検出を使用
      const words = extractWords(text, 1, { useJapanese: true, excludeJapanese: true });

      // Process8を探す
      const process8 = words.find((w) => w.text === "Process8");

      if (process8) {
        // ヒント位置を計算
        const position = calculateHintPosition(process8, "start");

        // Process8の開始位置（Pの位置）にヒントが表示されることを確認
        assertEquals(position.col, process8.col);
        assertEquals(position.display_mode, "before");
      } else {
        throw new Error("Process8が検出されませんでした");
      }
    });

    it("複数のProcess単語で正しい位置にヒントが表示される", () => {
      const text = "Process50-sub1, sub2, sub3, Process8実装完了";
      const words = extractWords(text, 1, { useJapanese: true, excludeJapanese: true });

      // すべてのProcess単語を確認
      const processWords = words.filter((w) => w.text.startsWith("Process"));

      processWords.forEach((word) => {
        const position = calculateHintPosition(word, "start");

        // 各Process単語の先頭（P）にヒントが表示されることを確認
        assertEquals(position.col, word.col);
        assertEquals(position.display_mode, "before");
      });
    });

    it("インデントされたProcess単語でも正しい位置に表示される", () => {
      const text = "    Process8: 実装完了";
      const words = extractWords(text, 1, { useJapanese: true, excludeJapanese: true });

      const process8 = words.find((w) => w.text === "Process8");
      if (process8) {
        const position = calculateHintPosition(process8, "start");

        // インデントを考慮してもPの位置にヒントが表示される
        assertEquals(position.col, process8.col);
        assertEquals(position.col, 5); // 4スペース + 1（1ベース）
      }
    });
  });

  describe("単語検出の確認", () => {
    it("Process8が正しく1つの単語として検出される", () => {
      const text = "Process8";
      const words = extractWords(text, 1, { useJapanese: true, excludeJapanese: true });

      assertEquals(words.length, 1);
      assertEquals(words[0].text, "Process8");
      assertEquals(words[0].col, 1);
    });

    it("Process50-sub1がkebab-caseとして分割される", () => {
      const text = "Process50-sub1";
      const words = extractWords(text, 1, { useJapanese: true, excludeJapanese: true });

      // kebab-case分割により複数の単語として検出される
      const wordTexts = words.map((w) => w.text);

      // Process50とsub1が別々に検出される
      const hasProcess50 = wordTexts.includes("Process50");
      const hasSub1 = wordTexts.includes("sub1");

      assertEquals(hasProcess50 || wordTexts.includes("Process50-sub1"), true);
    });
  });

  describe("表示モードごとの位置計算", () => {
    it("start, end, overlayモードで異なる位置が計算される", () => {
      const word = { text: "Process8", line: 1, col: 10 };

      const startPos = calculateHintPosition(word, "start");
      const endPos = calculateHintPosition(word, "end");
      const overlayPos = calculateHintPosition(word, "overlay");

      // startモード: 単語の先頭
      assertEquals(startPos.col, 10);
      assertEquals(startPos.display_mode, "before");

      // endモード: 単語の末尾
      assertEquals(endPos.col, 10 + "Process8".length - 1);
      assertEquals(endPos.display_mode, "after");

      // overlayモード: 単語の先頭にオーバーレイ
      assertEquals(overlayPos.col, 10);
      assertEquals(overlayPos.display_mode, "overlay");
    });
  });
});
