/**
 * denops/hellshake-yano/common/utils/validator.ts
 *
 * バリデーション機能
 *
 * Phase B-3とPhase B-4のバリデーション機能を統合します。
 */

/**
 * バリデーション結果
 *
 * @property valid - バリデーション成功かどうか
 * @property error - エラーメッセージ（失敗時のみ）
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 数値の範囲を検証
 *
 * @param value - 検証する値
 * @param min - 最小値
 * @param max - 最大値
 * @param name - フィールド名
 * @returns バリデーション結果
 *
 * @example
 * ```typescript
 * const result = validateRange(50, 0, 100, "count");
 * if (!result.valid) {
 *   console.error(result.error); // "count must be between 0 and 100, got 150"
 * }
 * ```
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
 *
 * @param value - 検証する値
 * @param name - フィールド名
 * @returns バリデーション結果
 *
 * @example
 * ```typescript
 * const result = validateNonEmpty("", "username");
 * if (!result.valid) {
 *   console.error(result.error); // "username must not be empty"
 * }
 * ```
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
 *
 * @param value - 検証する値
 * @param list - 許可される値のリスト
 * @param name - フィールド名
 * @returns バリデーション結果
 *
 * @example
 * ```typescript
 * const result = validateInList("red", ["red", "green", "blue"], "color");
 * if (!result.valid) {
 *   console.error(result.error); // "color must be one of [red, green, blue], got yellow"
 * }
 * ```
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
