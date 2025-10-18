/**
 * denops/hellshake-yano/phase-b3/common-base.ts
 *
 * 共通基底クラスと状態管理の統一
 *
 * Phase B-3の各モジュール（日本語対応、モーション検出、ビジュアルモード）で
 * 共通して使用される以下の機能を提供:
 * - Singleton パターンの実装
 * - 状態初期化メソッド
 * - エラーログの標準化
 * - 警告メッセージの表示
 */

/**
 * エラー結果のインターフェース
 * 各処理のエラー時に統一されたフォーマットで返却される
 */
export interface ErrorResult {
  success: false;
  error: string;
  errorCode?: string;
}

/**
 * 成功結果のインターフェース
 */
export interface SuccessResult<T> {
  success: true;
  data: T;
}

/**
 * エラーハンドラ: 標準化されたエラー処理
 *
 * @param context - エラーコンテキスト（モジュール名など）
 * @param error - エラーオブジェクト
 * @returns 標準化されたエラーメッセージ
 */
export function handleError(context: string, error: unknown): string {
  if (error instanceof Error) {
    return `[${context}] ${error.message}`;
  }
  if (typeof error === "string") {
    return `[${context}] ${error}`;
  }
  return `[${context}] Unknown error: ${JSON.stringify(error)}`;
}

/**
 * ログ出力: 標準化されたログ記録
 *
 * @param level - ログレベル（'info', 'warn', 'error'）
 * @param context - ログコンテキスト
 * @param message - メッセージ
 */
export function logMessage(
  level: "info" | "warn" | "error",
  context: string,
  message: string,
): void {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;

  switch (level) {
    case "error":
      console.error(logEntry);
      break;
    case "warn":
      console.warn(logEntry);
      break;
    case "info":
    default:
      console.log(logEntry);
  }
}

/**
 * 状態管理用の基本インターフェース
 * 各モジュールが持つ状態は、このインターフェースを拡張する
 */
export interface StateBase {
  [key: string]: unknown;
}

/**
 * Singleton パターン用のユーティリティ関数
 *
 * @template T Singletonクラスの型
 * @param instance 現在のインスタンス
 * @param createFn インスタンス作成関数
 * @returns Singletonインスタンス
 */
export function getSingletonInstance<T>(
  instance: T | undefined,
  createFn: () => T,
): T {
  return instance || createFn();
}

/**
 * 状態初期化のヘルパー
 * オブジェクトのディープコピーを作成
 *
 * @param state 初期化する状態
 * @returns 初期化された状態のコピー
 */
export function initializeState<T extends StateBase>(state: T): T {
  return JSON.parse(JSON.stringify(state));
}

/**
 * 状態取得のヘルパー
 * 状態のディープコピーを返却（外部からの変更防止）
 *
 * @param state 取得する状態
 * @returns 状態のコピー
 */
export function getStateCopy<T extends StateBase>(state: T): T {
  return JSON.parse(JSON.stringify(state));
}

/**
 * パラメータ検証: 範囲チェック
 *
 * @param value チェックする値
 * @param min 最小値
 * @param max 最大値
 * @param paramName パラメータ名
 * @returns 検証結果
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  paramName: string,
): string | null {
  if (value < min || value > max) {
    return `${paramName} must be between ${min} and ${max}, got ${value}`;
  }
  return null;
}

/**
 * パラメータ検証: 空文字列チェック
 *
 * @param value チェックする値
 * @param paramName パラメータ名
 * @returns 検証結果
 */
export function validateNonEmpty(
  value: string,
  paramName: string,
): string | null {
  if (!value || value.trim().length === 0) {
    return `${paramName} must not be empty`;
  }
  return null;
}

/**
 * パラメータ検証: リスト検証
 *
 * @param value チェックする値
 * @param validValues 有効な値のリスト
 * @param paramName パラメータ名
 * @returns 検証結果
 */
export function validateInList(
  value: string,
  validValues: string[],
  paramName: string,
): string | null {
  if (!validValues.includes(value)) {
    return `${paramName} must be one of [${validValues.join(", ")}], got ${value}`;
  }
  return null;
}
