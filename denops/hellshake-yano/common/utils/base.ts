/**
 * denops/hellshake-yano/common/utils/base.ts
 *
 * 共通基底処理
 */

/**
 * 状態管理用の基本インターフェース
 */
export interface StateBase {
  [key: string]: unknown;
}

/**
 * Singleton パターン用のユーティリティ関数
 */
export function getSingletonInstance<T>(
  instance: T | undefined,
  createFn: () => T,
): T {
  return instance || createFn();
}

/**
 * 状態初期化のヘルパー（ディープコピー）
 */
export function initializeState<T extends StateBase>(state: T): T {
  return JSON.parse(JSON.stringify(state));
}

/**
 * 状態取得のヘルパー（ディープコピー）
 */
export function getStateCopy<T extends StateBase>(state: T): T {
  return JSON.parse(JSON.stringify(state));
}

/**
 * エラー時のフォールバック処理
 */
export async function withFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  context: string,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`[${context}] ${error instanceof Error ? error.message : String(error)}`);
    return fallback;
  }
}
