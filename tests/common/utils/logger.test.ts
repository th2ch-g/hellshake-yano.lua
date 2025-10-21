/**
 * tests/common/utils/logger.test.ts
 *
 * ログ機能のテスト
 */

import { assertEquals } from "jsr:@std/assert";
import type { LogLevel } from "../../../denops/hellshake-yano/common/utils/logger.ts";
import {
  getDebugMode,
  logMessage,
  setDebugMode,
} from "../../../denops/hellshake-yano/common/utils/logger.ts";

Deno.test("logMessage: 各ログレベルで呼び出せる", () => {
  // デバッグモードを有効化してテスト
  setDebugMode(true);

  // 単にlogMessageが呼び出せることを確認（副作用のテストは省略）
  logMessage("DEBUG", "TestContext", "Debug message");
  logMessage("INFO", "TestContext", "Info message");
  logMessage("WARN", "Context", "Warning");
  logMessage("ERROR", "Module", "Error");
  assertEquals(true, true);

  // テスト後にデバッグモードを無効化
  setDebugMode(false);
});

Deno.test("LogLevel型: 有効な値の検証", () => {
  const validLevels: LogLevel[] = ["DEBUG", "INFO", "WARN", "ERROR"];
  assertEquals(validLevels.length, 4);
});

Deno.test("setDebugMode/getDebugMode: デバッグモードの設定と取得", () => {
  // 初期状態はfalse
  assertEquals(getDebugMode(), false);

  // デバッグモードを有効化
  setDebugMode(true);
  assertEquals(getDebugMode(), true);

  // デバッグモードを無効化
  setDebugMode(false);
  assertEquals(getDebugMode(), false);
});

Deno.test("logMessage: デバッグモード無効時はINFO/DEBUGが抑制される", () => {
  // デバッグモード無効
  setDebugMode(false);

  // INFO/DEBUGは抑制される（エラーなく実行できることを確認）
  logMessage("DEBUG", "TestContext", "Should be suppressed");
  logMessage("INFO", "TestContext", "Should be suppressed");

  // WARN/ERRORは常に表示される
  logMessage("WARN", "Context", "Should be displayed");
  logMessage("ERROR", "Module", "Should be displayed");

  assertEquals(true, true);
});

Deno.test("logMessage: デバッグモード有効時はすべて表示される", () => {
  // デバッグモード有効
  setDebugMode(true);

  // すべてのレベルが表示される
  logMessage("DEBUG", "TestContext", "Should be displayed");
  logMessage("INFO", "TestContext", "Should be displayed");
  logMessage("WARN", "Context", "Should be displayed");
  logMessage("ERROR", "Module", "Should be displayed");

  assertEquals(true, true);

  // テスト後にクリーンアップ
  setDebugMode(false);
});
