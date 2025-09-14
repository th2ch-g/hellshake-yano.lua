/**
 * ヒント割り当て設定のテスト
 * Process 50 Sub2: 1文字/2文字ヒントキー設定機能
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.221.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.221.0/testing/bdd.ts";
import {
  generateHintsWithGroups,
  type HintKeyConfig,
  validateHintKeyConfig,
} from "../denops/hellshake-yano/hint.ts";

describe("Hint Assignment with Character Groups", () => {
  describe("Single Character Hints", () => {
    it("should use only specified keys for single-char hints", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
        multi_char_keys: ["Q", "W", "E", "R"],
        max_single_char_hints: 9,
      };

      const hints = generateHintsWithGroups(12, config);

      // 最初の9個は single_char_keys から
      assertEquals(hints.slice(0, 9), ["A", "S", "D", "F", "G", "H", "J", "K", "L"]);

      // 10個目以降は multi_char_keys を使った2文字ヒント
      assertEquals(hints[9], "QQ");
      assertEquals(hints[10], "QW");
      assertEquals(hints[11], "QE");
    });

    it("should limit single-char hints by max_single_char_hints", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
        multi_char_keys: ["Q", "W"],
        max_single_char_hints: 5, // 9個使えるが5個に制限
      };

      const hints = generateHintsWithGroups(8, config);

      // 最初の5個のみ single_char_keys から
      assertEquals(hints.slice(0, 5), ["A", "S", "D", "F", "G"]);

      // 6個目以降は2文字ヒント
      assertEquals(hints[5], "QQ");
      assertEquals(hints[6], "QW");
      assertEquals(hints[7], "WQ");
    });
  });

  describe("Multi Character Hints", () => {
    it("should generate multi-char hints from specified keys", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A", "S"],
        multi_char_keys: ["Q", "W", "E"],
      };

      const hints = generateHintsWithGroups(7, config);

      // 最初の2個は single_char_keys
      assertEquals(hints.slice(0, 2), ["A", "S"]);

      // 残りは multi_char_keys の組み合わせ
      const multiCharHints = hints.slice(2);
      assertEquals(multiCharHints.length, 5);

      // QQ, QW, QE, WQ, WW の順になるはず
      assertEquals(multiCharHints[0], "QQ");
      assertEquals(multiCharHints[1], "QW");
      assertEquals(multiCharHints[2], "QE");
      assertEquals(multiCharHints[3], "WQ");
      assertEquals(multiCharHints[4], "WW");
    });

    it("should handle number hints after alphabet exhaustion", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A"],
        multi_char_keys: ["Q", "W"], // 2文字で最大4通り
      };

      const hints = generateHintsWithGroups(7, config);

      // 1個目は A
      assertEquals(hints[0], "A");

      // 2-5個目は2文字（QQ, QW, WQ, WW）
      assertEquals(hints[1], "QQ");
      assertEquals(hints[2], "QW");
      assertEquals(hints[3], "WQ");
      assertEquals(hints[4], "WW");

      // 6-7個目は2桁数字（新しい動作）
      assertEquals(hints[5], "00");
      assertEquals(hints[6], "01");
    });
  });

  describe("Configuration Validation", () => {
    it("should validate single_char_keys are single characters", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A", "AB", "C"], // ABは無効
        multi_char_keys: ["Q"],
      };

      const result = validateHintKeyConfig(config);

      assertEquals(result.valid, false);
      assertEquals(result.errors.length, 1);
      assertEquals(result.errors[0], "Invalid single char keys: AB");
    });

    it("should detect overlapping keys between groups", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A", "S", "D"],
        multi_char_keys: ["A", "Q", "W"], // Aが重複
      };

      const result = validateHintKeyConfig(config);

      assertEquals(result.valid, false);
      assertEquals(result.errors.length, 1);
      assertEquals(result.errors[0], "Keys cannot be in both groups: A");
    });

    it("should accept valid configuration", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A", "S", "D", "F"],
        multi_char_keys: ["Q", "W", "E", "R"],
        max_single_char_hints: 4,
      };

      const result = validateHintKeyConfig(config);

      assertEquals(result.valid, true);
      assertEquals(result.errors.length, 0);
    });
  });

  describe("Fallback Behavior", () => {
    it("should work with default when no groups specified", () => {
      const config: HintKeyConfig = {};

      const hints = generateHintsWithGroups(5, config);

      // デフォルトのA-Zを使用
      assertEquals(hints, ["A", "B", "C", "D", "E"]);
    });

    it("should use single_char_keys for multi-char if multi_char_keys not specified", () => {
      const config: HintKeyConfig = {
        single_char_keys: ["A", "S", "D"],
      };

      const hints = generateHintsWithGroups(6, config);

      // 最初の3個は single_char_keys
      assertEquals(hints.slice(0, 3), ["A", "S", "D"]);

      // 4個目以降は single_char_keys を使った2文字ヒント
      assertEquals(hints[3], "AA");
      assertEquals(hints[4], "AS");
      assertEquals(hints[5], "AD");
    });
  });
});
