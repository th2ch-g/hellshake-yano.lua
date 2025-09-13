#!/usr/bin/env -S deno test --allow-all

/**
 * maxHints設定とhint groups容量計算のテスト
 */

import { assertEquals } from "https://deno.land/std@0.221.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.221.0/testing/bdd.ts";
import { generateHintsWithGroups, type HintKeyConfig } from "../denops/hellshake-yano/hint.ts";

describe("Max Hints and Capacity Calculation", () => {
  describe("Hint capacity with custom keys", () => {
    it("should calculate correct capacity for user's config", () => {
      // ユーザーの設定を再現
      const config: HintKeyConfig = {
        single_char_keys: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';'],
        multi_char_keys: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        max_single_char_hints: 10
      };

      // 期待される容量
      const singleCharCount = 10; // A,S,D,F,G,H,J,K,L,;
      const multiCharCount = 10 * 10; // QQ,QW,QE... (10×10 = 100)
      const numberHintCount = 100; // 00-99
      const expectedCapacity = singleCharCount + multiCharCount + numberHintCount; // 210

      // 実際に生成してテスト
      const hints = generateHintsWithGroups(expectedCapacity, config);
      assertEquals(hints.length, expectedCapacity);

      // 最初の10個は1文字ヒント
      for (let i = 0; i < 10; i++) {
        assertEquals(hints[i].length, 1);
        assertEquals(config.single_char_keys!.includes(hints[i]), true);
      }

      // 次の100個は2文字アルファベット
      for (let i = 10; i < 110; i++) {
        assertEquals(hints[i].length, 2);
        // 各文字がmulti_char_keysに含まれることを確認
        for (const char of hints[i]) {
          assertEquals(config.multi_char_keys!.includes(char), true);
        }
      }

      // 最後の100個は2桁数字
      for (let i = 110; i < 210; i++) {
        assertEquals(hints[i].length, 2);
        assertEquals(/^\d{2}$/.test(hints[i]), true);
      }
    });

    it("should handle vim config line scenario", () => {
      // Vim設定の実際のシナリオ
      const config: HintKeyConfig = {
        single_char_keys: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';'],
        multi_char_keys: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        max_single_char_hints: 10
      };

      // Vim設定で検出される単語数（実際の例）
      const wordCount = 42; // let, g, hellshake, yano, use, japanese, false, hint, position, start, など

      const hints = generateHintsWithGroups(wordCount, config);
      assertEquals(hints.length, wordCount);

      // すべての単語にヒントが割り当てられることを確認
      console.log("Generated hints for vim config:");
      console.log("  Single char (1-10):", hints.slice(0, 10).join(", "));
      console.log("  Multi char (11-42):", hints.slice(10, 42).join(", "));

      // 最初の単語 "let" には最初のヒント "A" が割り当てられるべき
      assertEquals(hints[0], "A");
    });

    it("should support maximum capacity", () => {
      // デフォルト設定での最大容量
      const config: HintKeyConfig = {
        single_char_keys: ["A", "S", "D", "F", "G", "H", "J", "K", "L", "N", "M"],
        multi_char_keys: ["B", "C", "E", "I", "O", "P", "Q", "R", "T", "U", "V", "W", "X", "Y", "Z"],
        max_single_char_hints: 11
      };

      // 最大容量: 11 + (15×15) + 100 = 336
      const maxCapacity = 336;
      const hints = generateHintsWithGroups(maxCapacity, config);

      assertEquals(hints.length, maxCapacity);

      // 各セクションの検証
      let index = 0;

      // 1文字ヒント（11個）
      for (let i = 0; i < 11; i++, index++) {
        assertEquals(hints[index].length, 1);
      }

      // 2文字アルファベット（225個）
      for (let i = 0; i < 225; i++, index++) {
        assertEquals(hints[index].length, 2);
        assertEquals(/^[A-Z]{2}$/.test(hints[index]), true);
      }

      // 2桁数字（100個）
      for (let i = 0; i < 100; i++, index++) {
        assertEquals(hints[index].length, 2);
        assertEquals(/^\d{2}$/.test(hints[index]), true);
      }

      assertEquals(index, maxCapacity);
    });
  });

  describe("effectiveMaxHints calculation", () => {
    it("should respect maxHints setting", () => {
      const config: HintKeyConfig = {
        single_char_keys: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';'],
        multi_char_keys: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        max_single_char_hints: 10
      };

      // 容量は210だが、50個のみ要求
      const requestedCount = 50;
      const hints = generateHintsWithGroups(requestedCount, config);

      assertEquals(hints.length, requestedCount);

      // 最初の10個は1文字
      for (let i = 0; i < 10; i++) {
        assertEquals(hints[i].length, 1);
      }

      // 残りの40個は2文字アルファベット
      for (let i = 10; i < 50; i++) {
        assertEquals(hints[i].length, 2);
        assertEquals(/^[A-Z]{2}$/.test(hints[i]), true);
      }
    });

    it("should handle more words than capacity gracefully", () => {
      const config: HintKeyConfig = {
        single_char_keys: ['A'],
        multi_char_keys: ['B', 'C'], // 容量: 1 + 4 + 100 = 105
      };

      // 容量を超える数を要求
      const requestedCount = 110;
      const hints = generateHintsWithGroups(requestedCount, config);

      // 3文字ヒントも生成される
      assertEquals(hints.length, requestedCount);

      // 最初は1文字
      assertEquals(hints[0], 'A');

      // 次は2文字アルファベット（BB, BC, CB, CC）
      assertEquals(hints[1], 'BB');
      assertEquals(hints[4], 'CC');

      // 次は2桁数字
      assertEquals(hints[5], '00');
      assertEquals(hints[104], '99');

      // 最後は3文字ヒント
      assertEquals(hints[105].length, 3);
    });
  });
});