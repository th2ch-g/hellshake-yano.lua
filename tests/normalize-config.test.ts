/**
 * normalizeBackwardCompatibleFlags関数のテスト
 * TDD Red-Green-Refactor方式で実装
 * snake_case形式の設定がcamelCase形式に正しく変換されることを確認
 */

import { assertEquals } from "jsr:@std/assert";
import { normalizeBackwardCompatibleFlags } from "../denops/hellshake-yano/main.ts";

Deno.test("normalizeBackwardCompatibleFlags - snake_case to camelCase conversion", async (t) => {

  await t.step("should convert single_char_keys to singleCharKeys", () => {
    const input = {
      single_char_keys: ["A", "S", "D", "F", "G", "N", "M"],
    };

    const result = normalizeBackwardCompatibleFlags(input);

    // snake_caseキーは削除されている
    assertEquals("single_char_keys" in result, false);
    // camelCaseキーに変換されている
    assertEquals(result.singleCharKeys, ["A", "S", "D", "F", "G", "N", "M"]);
  });

  await t.step("should convert multi_char_keys to multiCharKeys", () => {
    const input = {
      multi_char_keys: ["B", "C", "E", "I", "O"],
    };

    const result = normalizeBackwardCompatibleFlags(input);

    assertEquals("multi_char_keys" in result, false);
    assertEquals(result.multiCharKeys, ["B", "C", "E", "I", "O"]);
  });

  await t.step("should convert max_single_char_hints to maxSingleCharHints", () => {
    const input = {
      max_single_char_hints: 15,
    };

    const result = normalizeBackwardCompatibleFlags(input);

    assertEquals("max_single_char_hints" in result, false);
    assertEquals(result.maxSingleCharHints, 15);
  });

  await t.step("should handle all three snake_case settings together", () => {
    const input = {
      single_char_keys: ["A", "S", "D", "F"],
      multi_char_keys: ["B", "C"],
      max_single_char_hints: 10,
    };

    const result = normalizeBackwardCompatibleFlags(input);

    // すべてのsnake_caseキーが削除されている
    assertEquals("single_char_keys" in result, false);
    assertEquals("multi_char_keys" in result, false);
    assertEquals("max_single_char_hints" in result, false);

    // すべてcamelCaseに変換されている
    assertEquals(result.singleCharKeys, ["A", "S", "D", "F"]);
    assertEquals(result.multiCharKeys, ["B", "C"]);
    assertEquals(result.maxSingleCharHints, 10);
  });

  await t.step("should preserve camelCase settings when provided", () => {
    const input = {
      singleCharKeys: ["X", "Y", "Z"],
      multiCharKeys: ["Q", "W"],
    };

    const result = normalizeBackwardCompatibleFlags(input);

    // camelCaseはそのまま保持
    assertEquals(result.singleCharKeys, ["X", "Y", "Z"]);
    assertEquals(result.multiCharKeys, ["Q", "W"]);
  });

  await t.step("should prefer snake_case over camelCase when both provided", () => {
    const input = {
      single_char_keys: ["A", "S", "D"],
      singleCharKeys: ["X", "Y", "Z"],
    };

    const result = normalizeBackwardCompatibleFlags(input);

    // snake_caseが優先される（変換処理の順序による）
    assertEquals(result.singleCharKeys, ["A", "S", "D"]);
  });
});