/**
 * denops/hellshake-yano/common/utils/logger.ts
 *
 * ログ機能
 *
 * Phase B-3とPhase B-4のログ機能を統合します。
 */

/**
 * ログレベル
 */
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

/**
 * 統一フォーマットでログを出力
 *
 * タイムスタンプとコンテキスト情報を含むログメッセージを出力します。
 *
 * @param level - ログレベル
 * @param context - モジュール/関数の名前
 * @param message - ログメッセージ
 *
 * @example
 * ```typescript
 * logMessage("INFO", "MyModule", "Processing started");
 * // Output: [2024-01-01T12:00:00.000Z] [INFO] [MyModule] Processing started
 * ```
 */
export function logMessage(
  level: LogLevel,
  context: string,
  message: string,
): void {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] [${context}] ${message}`;

  switch (level) {
    case "ERROR":
      console.error(logEntry);
      break;
    case "WARN":
      console.warn(logEntry);
      break;
    case "DEBUG":
    case "INFO":
    default:
      console.log(logEntry);
  }
}
