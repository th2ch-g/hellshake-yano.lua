/**
 * Common Base - Phase B-4 Process100
 * 共通処理の抽出（エラーハンドリング、ログ、検証）
 * GREENフェーズ: 最小実装
 */

/**
 * エラーハンドリング結果
 */
export interface ErrorHandleResult {
  message: string;
  logged: boolean;
  originalError?: Error | string;
}

/**
 * バリデーション結果
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * エラーを統一フォーマットで処理
 * @param context - エラーが発生したモジュール/関数の名前
 * @param error - エラーオブジェクトまたはメッセージ
 * @returns フォーマット済みエラー情報
 */
export function handleError(
  context: string,
  error: Error | string,
): ErrorHandleResult {
  const message = error instanceof Error ? error.message : String(error);
  const formattedMessage = `[${context}] ${message}`;

  // エラーログを出力
  console.error(formattedMessage);

  return {
    message: formattedMessage,
    logged: true,
    originalError: error,
  };
}

/**
 * エラー時のフォールバック処理
 * @param fn - 実行する関数
 * @param fallback - エラー時に返す値
 * @param context - コンテキスト情報
 * @returns 関数の結果またはフォールバック値
 */
export async function withFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  context: string,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    handleError(context, error instanceof Error ? error : String(error));
    return fallback;
  }
}

/**
 * ログレベル
 */
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

/**
 * 統一フォーマットでログを出力
 * @param level - ログレベル
 * @param context - モジュール/関数の名前
 * @param message - ログメッセージ
 */
export function logMessage(
  level: LogLevel,
  context: string,
  message: string,
): void {
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${level}] [${context}] ${message}`;

  switch (level) {
    case "DEBUG":
    case "INFO":
      console.log(formattedMessage);
      break;
    case "WARN":
      console.warn(formattedMessage);
      break;
    case "ERROR":
      console.error(formattedMessage);
      break;
  }
}

/**
 * 数値の範囲を検証
 * @param value - 検証する値
 * @param min - 最小値
 * @param max - 最大値
 * @param name - フィールド名
 * @returns バリデーション結果
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  name: string,
): ValidationResult {
  if (value < min || value > max) {
    return {
      valid: false,
      error: `${name} must be between ${min} and ${max}, got ${value}`,
    };
  }
  return { valid: true };
}

/**
 * 値が空でないことを検証
 * @param value - 検証する値
 * @param name - フィールド名
 * @returns バリデーション結果
 */
export function validateNonEmpty(
  value: unknown,
  name: string,
): ValidationResult {
  if (value === null || value === undefined || value === "") {
    return {
      valid: false,
      error: `${name} must not be empty`,
    };
  }
  return { valid: true };
}

/**
 * 値がリストに含まれることを検証
 * @param value - 検証する値
 * @param list - 許可される値のリスト
 * @param name - フィールド名
 * @returns バリデーション結果
 */
export function validateInList<T>(
  value: T,
  list: T[],
  name: string,
): ValidationResult {
  if (!list.includes(value)) {
    return {
      valid: false,
      error: `${name} must be one of [${list.join(", ")}], got ${value}`,
    };
  }
  return { valid: true };
}
