/**
 * denops/hellshake-yano/common/utils/error-handler.ts
 *
 * エラーハンドリング機能
 *
 * Phase B-3とPhase B-4のエラーハンドリングを統合します。
 */

/**
 * エラー結果のインターフェース
 *
 * 各処理のエラー時に統一されたフォーマットで返却される
 *
 * @property success - 常にfalse
 * @property error - エラーメッセージ
 * @property errorCode - エラーコード（オプション）
 */
export interface ErrorResult {
  success: false;
  error: string;
  errorCode?: string;
}

/**
 * 成功結果のインターフェース
 *
 * @property success - 常にtrue
 * @property data - 結果データ
 */
export interface SuccessResult<T> {
  success: true;
  data: T;
}

/**
 * エラーハンドリング結果
 *
 * @property message - フォーマット済みエラーメッセージ
 * @property logged - ログ出力済みかどうか
 * @property originalError - 元のエラーオブジェクト
 */
export interface ErrorHandleResult {
  message: string;
  logged: boolean;
  originalError?: Error | string;
}

/**
 * エラーを統一フォーマットで処理
 *
 * Phase B-3とPhase B-4のhandleError関数を統合した実装。
 * エラーメッセージをフォーマットし、コンソールにログ出力します。
 *
 * @param context - エラーが発生したモジュール/関数の名前
 * @param error - エラーオブジェクトまたはメッセージ
 * @returns フォーマット済みエラー情報
 *
 * @example
 * ```typescript
 * try {
 *   // some operation
 * } catch (e) {
 *   const result = handleError("MyModule", e);
 *   console.log(result.message); // "[MyModule] Error message"
 * }
 * ```
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
