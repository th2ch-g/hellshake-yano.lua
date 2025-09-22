#!/usr/bin/env -S deno test --allow-all

/**
 * 2桁数字フォールバックを含むヒント生成のテスト
 * Approach A: カーソル近傍に1文字、遠距離に2文字アルファベット、さらに2桁数字
 */

import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  assignHintsToWords,
  generateHintsWithGroups,
  type HintKeyConfig,
} from "../denops/hellshake-yano/hint.ts";
import type { Word } from "../denops/hellshake-yano/types.ts";

describe("Hint Generation with Number Fallback (Approach A)", () => {
  describe("Non-overlapping hint generation", () => {
    it("should generate hints without overlap between single and multi char keys", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A", "S", "D", "F", "G", "H", "J", "K", "L", "N", "M"],
        multi_char_keys: [
          "B",
          "C",
          "E",
          "I",
          "O",
          "P",
          "Q",
          "R",
          "T",
          "U",
          "V",
          "W",
          "X",
          "Y",
          "Z",
        ],
        max_single_char_hints: 11,
      };

      const hints = generateHintsWithGroups(50, config);

      // 最初の11個は single_char_keys
      const singleCharHints = hints.slice(0, 11);
      assertEquals(singleCharHints, ["A", "S", "D", "F", "G", "H", "J", "K", "L", "N", "M"]);

      // 12個目以降は multi_char_keys のみの組み合わせ
      const multiCharHints = hints.slice(11, 30);

      // multi_char_keys の文字のみで構成されているか確認
      for (const hint of multiCharHints) {
        if (hint.length === 2) {
          for (const char of hint) {
            assertEquals(
              config.multi_char_keys!.includes(char),
              true,
              `Hint "${hint}" contains non-multi_char_key character "${char}"`,
            );
          }
        }
      }

      // single_char_keys の文字が2文字ヒントに含まれていないことを確認
      for (const hint of multiCharHints) {
        if (hint.length === 2) {
          for (const singleChar of config.single_char_keys!) {
            assertEquals(
              hint.includes(singleChar),
              false,
              `2-char hint "${hint}" should not contain single_char_key "${singleChar}"`,
            );
          }
        }
      }
    });

    it("should NOT generate number hints after alphabet exhaustion", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A", "S", "D"],
        multi_char_keys: ["B", "C"], // 2×2 = 4通りのみ
        max_single_char_hints: 3,
      };

      // 3 + 4 = 7個のアルファベットヒントのみ（数字フォールバックなし）
      const hints = generateHintsWithGroups(20, config);

      // 最初の3個は single_char_keys
      assertEquals(hints.slice(0, 3), ["A", "S", "D"]);

      // 次の4個は multi_char_keys の組み合わせ
      assertEquals(hints.slice(3, 7), ["BB", "BC", "CB", "CC"]);

      // 8個目以降は生成されない（数字フォールバックなし）
      assertEquals(hints.length, 7);
      assertEquals(hints[7], undefined);
      assertEquals(hints[8], undefined);
      assertEquals(hints[9], undefined);
      assertEquals(hints[10], undefined);
      assertEquals(hints[19], undefined);
    });

    it("should support up to 236 hints (11 single + 225 double-alpha)", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A", "S", "D", "F", "G", "H", "J", "K", "L", "N", "M"],
        multi_char_keys: [
          "B",
          "C",
          "E",
          "I",
          "O",
          "P",
          "Q",
          "R",
          "T",
          "U",
          "V",
          "W",
          "X",
          "Y",
          "Z",
        ],
        max_single_char_hints: 11,
      };

      // 11 + 225 = 236個のヒントのみ生成（数字フォールバックなし）
      const hints = generateHintsWithGroups(336, config);

      assertEquals(hints.length, 236);

      // 最初の11個は1文字
      for (let i = 0; i < 11; i++) {
        assertEquals(hints[i].length, 1);
      }

      // 次の225個は2文字アルファベット（15×15）
      for (let i = 11; i < 236; i++) {
        assertEquals(hints[i].length, 2);
        assertEquals(/^[A-Z]{2}$/.test(hints[i]), true);
      }

      // 数字フォールバックはなし
      assertEquals(hints[236], undefined);
    });
  });

  describe("Cursor-based hint assignment", () => {
    it("should assign single-char hints to words near cursor", () => {
      // テスト用の単語リスト（様々な位置）
      const words: Word[] = [
        { text: "near1", line: 10, col: 15 }, // カーソルに最も近い
        { text: "near2", line: 10, col: 18 },
        { text: "far1", line: 5, col: 5 }, // カーソルから遠い
        { text: "far2", line: 15, col: 50 },
        { text: "medium1", line: 11, col: 20 },
        { text: "medium2", line: 9, col: 10 },
      ];

      const config: HintKeyConfig = {
        single_char_keys: ["A", "S", "D"],
        multi_char_keys: ["B", "C"],
        max_single_char_hints: 3,
      };

      const hints = generateHintsWithGroups(words.length, config);
      const assignments = assignHintsToWords(words, hints, 10, 16); // カーソル位置

      // カーソルに最も近い単語が1文字ヒントを持つべき
      const near1Assignment = assignments.find((a) => a.word.text === "near1");
      const near2Assignment = assignments.find((a) => a.word.text === "near2");

      assertExists(near1Assignment);
      assertExists(near2Assignment);

      // 近い単語は1文字ヒント（A, S, D）のいずれかを持つべき
      assertEquals(near1Assignment.hint.length, 1);
      assertEquals(["A", "S", "D"].includes(near1Assignment.hint), true);

      // 遠い単語は2文字ヒントを持つべき
      const far1Assignment = assignments.find((a) => a.word.text === "far1");
      assertExists(far1Assignment);
      assertEquals(far1Assignment.hint.length, 2);
    });

    it("should use number hints for very distant words", () => {
      // 多数の単語を生成（数字ヒントが必要になるまで）
      const words: Word[] = [];

      // カーソル近傍の単語
      for (let i = 0; i < 11; i++) {
        words.push({ text: `near${i}`, line: 50, col: 50 + i });
      }

      // 中距離の単語（アルファベット2文字ヒント用）
      for (let i = 0; i < 225; i++) {
        const line = 40 + Math.floor(i / 20);
        const col = (i % 20) * 3;
        words.push({ text: `mid${i}`, line, col });
      }

      // 遠距離の単語（数字ヒント用）
      for (let i = 0; i < 50; i++) {
        words.push({ text: `far${i}`, line: 10 + i, col: 100 });
      }

      const config: HintKeyConfig = {
        single_char_keys: ["A", "S", "D", "F", "G", "H", "J", "K", "L", "N", "M"],
        multi_char_keys: [
          "B",
          "C",
          "E",
          "I",
          "O",
          "P",
          "Q",
          "R",
          "T",
          "U",
          "V",
          "W",
          "X",
          "Y",
          "Z",
        ],
        max_single_char_hints: 11,
      };

      const hints = generateHintsWithGroups(words.length, config);
      const assignments = assignHintsToWords(words, hints, 50, 50); // カーソル位置

      // 遠距離の単語が数字ヒントを持つことを確認
      const farAssignments = assignments.filter((a) => a.word.text.startsWith("far"));

      let hasNumberHint = false;
      for (const assignment of farAssignments) {
        if (/^\d{2}$/.test(assignment.hint)) {
          hasNumberHint = true;
          break;
        }
      }

      assertEquals(hasNumberHint, false, "No number hints should be assigned");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty config gracefully", () => {
      const config: HintKeyConfig = {};
      const hints = generateHintsWithGroups(10, config);

      assertEquals(hints.length, 10);
      // デフォルトのマーカーが使用されるべき
      assertEquals(hints[0], "A");
    });

    it("should handle very large word counts", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A"],
        multi_char_keys: ["B", "C"], // 2×2 = 4通り
        max_single_char_hints: 1,
      };

      // 1 + 4 = 5個のみ対応可能（数字フォールバックなし）
      const hints = generateHintsWithGroups(105, config);

      assertEquals(hints.length, 5);
      assertEquals(hints[0], "A"); // 1文字
      assertEquals(hints[1], "BB"); // 2文字アルファベット
      assertEquals(hints[5], undefined); // 数字ヒントはなし
      assertEquals(hints[104], undefined); // 数字ヒントはなし
    });

    it("should NOT generate 3-char hints anymore", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A"],
        multi_char_keys: ["B"], // 1×1 = 1通りのみ
        max_single_char_hints: 1,
      };

      // 1 + 1 = 2個のみ対応可能（数字フォールバックなし、３文字ヒントなし）
      const hints = generateHintsWithGroups(103, config);

      assertEquals(hints.length, 2);
      assertEquals(hints[0], "A"); // 1文字
      assertEquals(hints[1], "BB"); // 2文字
      assertEquals(hints[2], undefined); // 数字ヒントなし
      assertEquals(hints[101], undefined); // 数字ヒントなし
      assertEquals(hints[102], undefined); // 3文字ヒントなし
    });
  });
});
