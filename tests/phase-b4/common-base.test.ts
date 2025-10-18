/**
 * Common Base Tests - Phase B-4 Process100
 * RED フェーズ: リファクタリングテスト (12 steps)
 */

import { assertEquals, assertRejects } from "jsr:@std/assert";
import {
  handleError,
  withFallback,
  logMessage,
  validateRange,
  validateNonEmpty,
  validateInList,
} from "../../denops/hellshake-yano/phase-b4/common-base.ts";

Deno.test("Common Base - Error Handling", async (t) => {
  await t.step("handleError should format error message with context", () => {
    const result = handleError("TestContext", new Error("Test error"));
    assertEquals(
      result.message,
      "[TestContext] Test error",
    );
    assertEquals(result.logged, true);
  });

  await t.step("handleError should handle Error object with message", () => {
    const error = new Error("Specific error");
    const result = handleError("Module", error);
    assertEquals(
      result.message,
      "[Module] Specific error",
    );
  });

  await t.step("handleError should handle string error", () => {
    const result = handleError("Context", "String error");
    assertEquals(result.message, "[Context] String error");
  });
});

Deno.test("Common Base - Fallback Handling", async (t) => {
  await t.step("withFallback should return result on success", async () => {
    const result = await withFallback(
      async () => "success",
      "fallback",
      "TestContext",
    );
    assertEquals(result, "success");
  });

  await t.step("withFallback should return fallback on error", async () => {
    const result = await withFallback(
      async () => {
        throw new Error("Failed");
      },
      "fallback",
      "TestContext",
    );
    assertEquals(result, "fallback");
  });

  await t.step("withFallback should handle async errors", async () => {
    const result = await withFallback(
      async () => Promise.reject(new Error("Async error")),
      "fallback_value",
      "TestContext",
    );
    assertEquals(result, "fallback_value");
  });
});

Deno.test("Common Base - Logging", async (t) => {
  await t.step("logMessage should handle different log levels", () => {
    // 単にlogMessageが呼び出せることを確認
    logMessage("INFO", "TestContext", "Test message");
    logMessage("WARN", "Context", "Warning");
    logMessage("ERROR", "Module", "Error");
    logMessage("DEBUG", "Debug", "Debug message");
    // ここではコンソール出力の副作用はテストしない
    // （Deno統合環境でのコンソール出力のモック化は複雑）
  });
});

Deno.test("Common Base - Parameter Validation", async (t) => {
  await t.step("validateRange should accept valid value", () => {
    const result = validateRange(5, 1, 10, "value");
    assertEquals(result.valid, true);
    assertEquals(result.error, undefined);
  });

  await t.step("validateRange should reject value below min", () => {
    const result = validateRange(0, 1, 10, "value");
    assertEquals(result.valid, false);
    assertEquals(result.error?.includes("value"), true);
    assertEquals(result.error?.includes("must be"), true);
  });

  await t.step("validateRange should reject value above max", () => {
    const result = validateRange(11, 1, 10, "value");
    assertEquals(result.valid, false);
    assertEquals(result.error?.includes("value"), true);
  });

  await t.step("validateNonEmpty should accept non-empty value", () => {
    const result = validateNonEmpty("test", "fieldName");
    assertEquals(result.valid, true);
  });

  await t.step("validateNonEmpty should reject empty string", () => {
    const result = validateNonEmpty("", "fieldName");
    assertEquals(result.valid, false);
    assertEquals(result.error?.includes("fieldName"), true);
  });

  await t.step("validateNonEmpty should reject null/undefined", () => {
    const result = validateNonEmpty(null, "fieldName");
    assertEquals(result.valid, false);
  });

  await t.step("validateInList should accept value in list", () => {
    const result = validateInList("a", ["a", "b", "c"], "field");
    assertEquals(result.valid, true);
  });

  await t.step("validateInList should reject value not in list", () => {
    const result = validateInList("x", ["a", "b", "c"], "field");
    assertEquals(result.valid, false);
    assertEquals(result.error?.includes("field"), true);
  });
});
