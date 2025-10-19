/**
 * tests/common/utils/error-handler.test.ts
 *
 * エラーハンドリング機能のテスト
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import type {
  ErrorHandleResult,
  ErrorResult,
} from "../../../denops/hellshake-yano/common/utils/error-handler.ts";
import { handleError } from "../../../denops/hellshake-yano/common/utils/error-handler.ts";

Deno.test("handleError: Error型入力を正しく処理する", () => {
  const result = handleError("TestContext", new Error("Test error"));

  assertExists(result);
  assertEquals(result.message, "[TestContext] Test error");
  assertEquals(result.logged, true);
  assertExists(result.originalError);
});

Deno.test("handleError: string型入力を正しく処理する", () => {
  const result = handleError("Context", "String error");

  assertExists(result);
  assertEquals(result.message, "[Context] String error");
  assertEquals(result.logged, true);
});

Deno.test("handleError: エラーメッセージフォーマットの検証", () => {
  const result = handleError("Module", new Error("Specific error"));

  assertEquals(result.message.startsWith("[Module]"), true);
  assertEquals(result.message.includes("Specific error"), true);
});

Deno.test("ErrorResult型: 基本的な構造検証", () => {
  const errorResult: ErrorResult = {
    success: false,
    error: "Error message",
  };

  assertExists(errorResult);
  assertEquals(errorResult.success, false);
  assertEquals(errorResult.error, "Error message");
});

Deno.test("ErrorResult型: errorCodeを含む構造検証", () => {
  const errorResult: ErrorResult = {
    success: false,
    error: "Error message",
    errorCode: "ERR_001",
  };

  assertExists(errorResult);
  assertEquals(errorResult.errorCode, "ERR_001");
});

Deno.test("ErrorHandleResult型: 基本的な構造検証", () => {
  const result: ErrorHandleResult = {
    message: "[Context] Error",
    logged: true,
    originalError: new Error("Original"),
  };

  assertExists(result);
  assertEquals(result.message, "[Context] Error");
  assertEquals(result.logged, true);
  assertExists(result.originalError);
});
