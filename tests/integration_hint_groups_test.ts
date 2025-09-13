/**
 * 統合テスト: ヒントグループ機能
 * Process 50 Sub2の統合動作確認
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.221.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.221.0/testing/bdd.ts";
import { MockDenops } from "./helpers/mock.ts";

// generateHintsOptimized を直接テストできるようにエクスポートを追加する必要があるため、
// ここではヒント生成機能をシミュレート
import {
  generateHintsWithGroups,
  validateHintKeyConfig,
  type HintKeyConfig
} from "../denops/hellshake-yano/hint.ts";

describe("Integration: Hint Groups Feature", () => {
  describe("Configuration and Hint Generation", () => {
    it("should use hint groups when configured", () => {
      // 設定例: ホームポジションキーと上段キーを分ける
      const config: HintKeyConfig = {
        single_char_keys: ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";"],
        multi_char_keys: ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
        max_single_char_hints: 10
      };

      // 15個の単語に対してヒントを生成
      const hints = generateHintsWithGroups(15, config);

      // 最初の10個は single_char_keys から
      assertEquals(hints.slice(0, 10), ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";"]);

      // 11個目以降は multi_char_keys の組み合わせ
      assertEquals(hints[10], "QQ");
      assertEquals(hints[11], "QW");
      assertEquals(hints[12], "QE");
      assertEquals(hints[13], "QR");
      assertEquals(hints[14], "QT");
    });

    it("should validate configuration before use", () => {
      // 無効な設定
      const invalidConfig: HintKeyConfig = {
        single_char_keys: ["A", "S", "D"],
        multi_char_keys: ["A", "Q"], // Aが重複
        max_single_char_hints: 3
      };

      const validation = validateHintKeyConfig(invalidConfig);
      assertEquals(validation.valid, false);
      assertEquals(validation.errors.length, 1);
      assertEquals(validation.errors[0], "Keys cannot be in both groups: A");
    });

    it("should fall back to default when no groups specified", () => {
      const config: HintKeyConfig = {};

      const hints = generateHintsWithGroups(5, config);

      // デフォルトのA-Zを使用
      assertEquals(hints, ["A", "B", "C", "D", "E"]);
    });
  });

  describe("Real-world Scenarios", () => {
    it("should handle Vim-like home row configuration", () => {
      // Vimのホームロウを1文字ヒントに、それ以外を2文字に
      const config: HintKeyConfig = {
        single_char_keys: ["A", "S", "D", "F", "J", "K", "L", ";"],
        multi_char_keys: ["G", "H", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
        max_single_char_hints: 8
      };

      const hints = generateHintsWithGroups(20, config);

      // ホームロウキーが優先的に使われる
      assertEquals(hints.slice(0, 8), ["A", "S", "D", "F", "J", "K", "L", ";"]);

      // 9個目以降は2文字ヒント
      assertEquals(hints[8], "GG");
      assertEquals(hints[9], "GH");
    });

    it("should handle limited single-char scenario", () => {
      // 少数の1文字ヒント、多数の2文字ヒント
      const config: HintKeyConfig = {
        single_char_keys: ["F", "J"],  // 最も押しやすい2キーのみ
        multi_char_keys: ["A", "S", "D", "G", "H", "K", "L"],
        max_single_char_hints: 2
      };

      const hints = generateHintsWithGroups(10, config);

      // 最初の2個のみ1文字
      assertEquals(hints[0], "F");
      assertEquals(hints[1], "J");

      // 残りは全て2文字
      assertEquals(hints[2], "AA");
      assertEquals(hints[3], "AS");
      assertEquals(hints[4], "AD");
    });
  });

  describe("Performance", () => {
    it("should generate hints efficiently for large word counts", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
        multi_char_keys: ["Q", "W", "E", "R", "T"],
        max_single_char_hints: 9
      };

      const startTime = Date.now();
      const hints = generateHintsWithGroups(100, config);
      const elapsedTime = Date.now() - startTime;

      // 100個のヒントを100ms以内に生成
      assertEquals(hints.length, 100);
      assertEquals(elapsedTime < 100, true);

      // 最初の9個は1文字
      assertEquals(hints.slice(0, 9), ["A", "S", "D", "F", "G", "H", "J", "K", "L"]);

      // 10-34個目は2文字（5*5=25通り）
      assertEquals(hints[9], "QQ");
      assertEquals(hints[33], "TT");

      // 35個目以降は3文字
      assertEquals(hints[34].length, 3);
    });

    it("should handle edge case with very few keys", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A"],
        multi_char_keys: ["B", "C"]
      };

      const hints = generateHintsWithGroups(10, config);

      assertEquals(hints[0], "A");
      assertEquals(hints[1], "BB");
      assertEquals(hints[2], "BC");
      assertEquals(hints[3], "CB");
      assertEquals(hints[4], "CC");
      // 5個目以降は3文字
      assertEquals(hints[5], "BBB");
      assertEquals(hints[6], "BBC");
      assertEquals(hints[7], "BCB");
      assertEquals(hints[8], "BCC");
      assertEquals(hints[9], "CBB");
    });
  });

  describe("Backward Compatibility", () => {
    it("should work with legacy markers configuration", () => {
      const config: HintKeyConfig = {
        markers: ["X", "Y", "Z"]  // 従来のmarkers設定
      };

      const hints = generateHintsWithGroups(5, config);

      // markersが single_char_keys として使われる
      assertEquals(hints[0], "X");
      assertEquals(hints[1], "Y");
      assertEquals(hints[2], "Z");
      assertEquals(hints[3], "XX");
      assertEquals(hints[4], "XY");
    });

    it("should prioritize new config over legacy markers", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A", "B"],
        markers: ["X", "Y", "Z"]  // これは無視される
      };

      const hints = generateHintsWithGroups(4, config);

      // single_char_keys が優先される
      assertEquals(hints[0], "A");
      assertEquals(hints[1], "B");
      assertEquals(hints[2], "AA");
      assertEquals(hints[3], "AB");
    });
  });
});