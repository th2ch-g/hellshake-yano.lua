/**
 * TDDテスト: 数字フォールバック削除の検証
 *
 * このテストは、generateHintsWithGroups関数が
 * single_char_keysとmulti_char_keysの組み合わせのみを生成し、
 * 数字フォールバック（00, 01, 02...）を生成しないことを検証します。
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.221.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.221.0/testing/bdd.ts";
import { generateHintsWithGroups, type HintKeyConfig } from "../denops/hellshake-yano/hint.ts";

describe("Hint Generation Without Number Fallback", () => {
  describe("Strict single/multi char keys separation", () => {
    it("should NOT generate number hints when hints exceed multi_char combinations", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A", "S", "D", "F", "G"], // 5個
        multi_char_keys: ["B", "C", "E"], // 3×3=9個の2文字組み合わせ
      };

      // 最大: 5個（single） + 9個（multi） = 14個
      const hints = generateHintsWithGroups(20, config);

      // 14個までしか生成されない（数字フォールバックなし）
      assertEquals(hints.length, 14);

      // 数字ヒントが含まれていないことを確認
      const numberHints = hints.filter(h => /^\d{2}$/.test(h));
      assertEquals(numberHints.length, 0, "No number hints should be generated");

      // 生成されたヒントの内容を確認
      // 1文字ヒント
      assertEquals(hints.slice(0, 5), ["A", "S", "D", "F", "G"]);

      // 2文字ヒント（B, C, Eの組み合わせ）
      const multiCharHints = hints.slice(5);
      multiCharHints.forEach(hint => {
        assertEquals(hint.length, 2, "Multi-char hints should be 2 characters");
        const [first, second] = hint.split("");
        assertExists(["B", "C", "E"].includes(first), "First char should be from multi_char_keys");
        assertExists(["B", "C", "E"].includes(second), "Second char should be from multi_char_keys");
      });
    });

    it("should work with the actual user configuration", () => {
      // ユーザーの実際の設定
      const config: HintKeyConfig = {
        single_char_keys: "ASDFGNM0123456789".split(""), // 17個
        multi_char_keys: "BCEIOPQRTUVWXYZ".split(""), // 15×15=225個
      };

      // 最大: 17 + 225 = 242個
      const hints250 = generateHintsWithGroups(250, config);

      // 242個で停止（数字フォールバックなし）
      assertEquals(hints250.length, 242);

      // 数字の2文字ヒント（00, 01等）が含まれていないことを確認
      const numberHints = hints250.filter(h => /^\d{2}$/.test(h));
      assertEquals(numberHints.length, 0, "No '00', '01' style number hints");

      // 最後のヒントがZZであることを確認（multi_char_keysの最後の組み合わせ）
      assertEquals(hints250[hints250.length - 1], "ZZ");
    });

    it("should handle small hint requests correctly", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A", "S", "D"],
        multi_char_keys: ["B", "C"],
      };

      // 3個のヒントのみ要求
      const hints = generateHintsWithGroups(3, config);

      assertEquals(hints.length, 3);
      assertEquals(hints, ["A", "S", "D"]);
    });

    it("should generate multi-char hints when single-char is exhausted", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A", "S"], // 2個
        multi_char_keys: ["B", "C"], // 2×2=4個
      };

      // 5個要求（2個のsingle + 3個のmulti）
      const hints = generateHintsWithGroups(5, config);

      assertEquals(hints.length, 5);
      assertEquals(hints[0], "A");
      assertEquals(hints[1], "S");
      assertEquals(hints[2], "BB");
      assertEquals(hints[3], "BC");
      assertEquals(hints[4], "CB");
    });

    it("should respect max_single_char_hints setting", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A", "S", "D", "F", "G"],
        multi_char_keys: ["B", "C"],
        max_single_char_hints: 2, // 1文字ヒントを2個に制限
      };

      const hints = generateHintsWithGroups(5, config);

      assertEquals(hints.length, 5);
      // 最初の2個のみ1文字ヒント
      assertEquals(hints[0], "A");
      assertEquals(hints[1], "S");
      // 残りは2文字ヒント
      assertEquals(hints[2], "BB");
      assertEquals(hints[3], "BC");
      assertEquals(hints[4], "CB");
    });

    it("should NOT generate 3-character hints anymore", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A"], // 1個
        multi_char_keys: ["B", "C"], // 2×2=4個
      };

      // 10個要求しても、5個（1+4）しか生成されない
      const hints = generateHintsWithGroups(10, config);

      assertEquals(hints.length, 5);

      // 3文字のヒントが存在しないことを確認
      const threeCharHints = hints.filter(h => h.length === 3);
      assertEquals(threeCharHints.length, 0, "No 3-character hints should be generated");
    });

    it("should handle empty multi_char_keys", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A", "S", "D"],
        multi_char_keys: [], // 空
      };

      const hints = generateHintsWithGroups(5, config);

      // single_char_keysの3個のみ生成
      assertEquals(hints.length, 3);
      assertEquals(hints, ["A", "S", "D"]);
    });

    it("should handle empty single_char_keys", () => {
      const config: HintKeyConfig = {
        single_char_keys: [], // 空
        multi_char_keys: ["B", "C"],
      };

      const hints = generateHintsWithGroups(3, config);

      // multi_char_keysから2文字ヒントのみ生成
      assertEquals(hints.length, 3);
      assertEquals(hints, ["BB", "BC", "CB"]);
    });
  });

  describe("Edge cases", () => {
    it("should handle zero word count", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A"],
        multi_char_keys: ["B"],
      };

      const hints = generateHintsWithGroups(0, config);
      assertEquals(hints.length, 0);
    });

    it("should handle negative word count", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A"],
        multi_char_keys: ["B"],
      };

      const hints = generateHintsWithGroups(-1, config);
      assertEquals(hints.length, 0);
    });

    it("should handle both keys empty with markers fallback", () => {
      const config: HintKeyConfig = {
        single_char_keys: [],
        multi_char_keys: [],
        markers: ["X", "Y", "Z"],
      };

      const hints = generateHintsWithGroups(3, config);

      // markersにフォールバック（従来の動作）
      assertEquals(hints.length, 3);
      assertEquals(hints[0], "X");
    });
  });
});