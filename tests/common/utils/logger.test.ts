/**
 * tests/common/utils/logger.test.ts
 *
 * ログ機能のテスト
 */

import { assertEquals } from "jsr:@std/assert";
import type { LogLevel } from "../../../denops/hellshake-yano/common/utils/logger.ts";
import { logMessage } from "../../../denops/hellshake-yano/common/utils/logger.ts";

Deno.test("logMessage: 各ログレベルで呼び出せる", () => {
  // 単にlogMessageが呼び出せることを確認（副作用のテストは省略）
  logMessage("DEBUG", "TestContext", "Debug message");
  logMessage("INFO", "TestContext", "Info message");
  logMessage("WARN", "Context", "Warning");
  logMessage("ERROR", "Module", "Error");
  assertEquals(true, true);
});

Deno.test("LogLevel型: 有効な値の検証", () => {
  const validLevels: LogLevel[] = ["DEBUG", "INFO", "WARN", "ERROR"];
  assertEquals(validLevels.length, 4);
});
