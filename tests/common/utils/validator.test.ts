/**
 * tests/common/utils/validator.test.ts
 *
 * バリデーション機能のテスト
 */

import { assertEquals } from "jsr:@std/assert";
import {
  validateInList,
  validateNonEmpty,
  validateRange,
} from "../../../denops/hellshake-yano/common/utils/validator.ts";

Deno.test("validateRange: 正常値を検証", () => {
  const result = validateRange(50, 0, 100, "value");
  assertEquals(result.valid, true);
  assertEquals(result.error, undefined);
});

Deno.test("validateRange: 境界値（最小値）を検証", () => {
  const result = validateRange(0, 0, 100, "value");
  assertEquals(result.valid, true);
});

Deno.test("validateRange: 境界値（最大値）を検証", () => {
  const result = validateRange(100, 0, 100, "value");
  assertEquals(result.valid, true);
});

Deno.test("validateRange: 範囲外（小さい）を検出", () => {
  const result = validateRange(-1, 0, 100, "value");
  assertEquals(result.valid, false);
  assertEquals(typeof result.error, "string");
});

Deno.test("validateRange: 範囲外（大きい）を検出", () => {
  const result = validateRange(101, 0, 100, "value");
  assertEquals(result.valid, false);
  assertEquals(typeof result.error, "string");
});

Deno.test("validateNonEmpty: 正常な文字列を検証", () => {
  const result = validateNonEmpty("hello", "value");
  assertEquals(result.valid, true);
});

Deno.test("validateNonEmpty: 空文字列を検出", () => {
  const result = validateNonEmpty("", "value");
  assertEquals(result.valid, false);
  assertEquals(typeof result.error, "string");
});

Deno.test("validateNonEmpty: nullを検出", () => {
  const result = validateNonEmpty(null, "value");
  assertEquals(result.valid, false);
});

Deno.test("validateNonEmpty: undefinedを検出", () => {
  const result = validateNonEmpty(undefined, "value");
  assertEquals(result.valid, false);
});

Deno.test("validateInList: 含まれる値を検証", () => {
  const result = validateInList("a", ["a", "b", "c"], "value");
  assertEquals(result.valid, true);
});

Deno.test("validateInList: 含まれない値を検出", () => {
  const result = validateInList("d", ["a", "b", "c"], "value");
  assertEquals(result.valid, false);
  assertEquals(typeof result.error, "string");
});
