/**
 * denops/hellshake-yano/common/utils/logger.ts
 *
 * ログ機能
 *
 * Phase B-3とPhase B-4のログ機能を統合します。
 * デバッグモード制御を追加（g:hellshake_yano.debugMode）
 */

import type { Denops } from "jsr:@denops/std@7.4.0";

/**
 * ログレベル
 */
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

/**
 * デバッグモードフラグ（グローバル状態）
 * デフォルトはfalse（ログ抑制）
 */
let debugMode = false;

/**
 * デバッグモードを初期化
 * g:hellshake_yano.debugMode の値をチェックして設定
 *
 * @param denops - Denopsインスタンス
 *
 * @example
 * ```typescript
 * await initializeDebugMode(denops);
 * ```
 */
export async function initializeDebugMode(denops: Denops): Promise<void> {
  try {
    const config = await denops.eval("get(g:, 'hellshake_yano', {})") as Record<string, unknown>;
    debugMode = config?.debugMode === true;
  } catch {
    // エラー時はデバッグモードを無効化
    debugMode = false;
  }
}

/**
 * デバッグモードを手動設定（テスト用）
 *
 * @param enabled - デバッグモードを有効にするか
 */
export function setDebugMode(enabled: boolean): void {
  debugMode = enabled;
}

/**
 * 現在のデバッグモード状態を取得
 *
 * @returns デバッグモードが有効かどうか
 */
export function getDebugMode(): boolean {
  return debugMode;
}

/**
 * 統一フォーマットでログを出力
 *
 * タイムスタンプとコンテキスト情報を含むログメッセージを出力します。
 * デバッグモードが無効の場合、INFO/DEBUGレベルのログは抑制されます。
 * WARN/ERRORは常に表示されます。
 *
 * @param level - ログレベル
 * @param context - モジュール/関数の名前
 * @param message - ログメッセージ
 *
 * @example
 * ```typescript
 * logMessage("INFO", "MyModule", "Processing started");
 * // デバッグモード有効時: [2024-01-01T12:00:00.000Z] [INFO] [MyModule] Processing started
 * // デバッグモード無効時: (出力なし)
 * ```
 */
export function logMessage(
  level: LogLevel,
  context: string,
  message: string,
): void {
  // デバッグモードが無効の場合、INFO/DEBUGは抑制
  if (!debugMode && (level === "INFO" || level === "DEBUG")) {
    return;
  }

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
