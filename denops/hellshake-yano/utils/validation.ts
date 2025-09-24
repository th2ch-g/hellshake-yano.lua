/**
 * バリデーション処理の集約
 * Phase 1: モジュール分割で検証ロジックを統一
 */

/**
 * 設定値の型チェック
 */
export function isValidType(value: any, expectedType: string): boolean {
  switch (expectedType) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && !isNaN(value);
    case "boolean":
      return typeof value === "boolean";
    case "array":
      return Array.isArray(value);
    case "object":
      return typeof value === "object" && value !== null && !Array.isArray(value);
    default:
      return false;
  }
}

/**
 * 数値の範囲チェック
 */
export function isInRange(value: number, min?: number, max?: number): boolean {
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

/**
 * 文字列の長さチェック
 */
export function isValidLength(value: string, minLength?: number, maxLength?: number): boolean {
  if (minLength !== undefined && value.length < minLength) return false;
  if (maxLength !== undefined && value.length > maxLength) return false;
  return true;
}

/**
 * 配列の要素数チェック
 */
export function isValidArrayLength(array: any[], minLength?: number, maxLength?: number): boolean {
  if (minLength !== undefined && array.length < minLength) return false;
  if (maxLength !== undefined && array.length > maxLength) return false;
  return true;
}

/**
 * 列挙値のチェック
 */
export function isValidEnum(value: any, validValues: readonly any[]): boolean {
  return validValues.includes(value);
}

/**
 * 設定値のバリデーション
 */
export function validateConfigValue(
  key: string,
  value: any,
  rules: {
    type?: string;
    required?: boolean;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    enum?: readonly any[];
    custom?: (value: any) => boolean;
  }
): { valid: boolean; error?: string } {
  // 必須チェック
  if (rules.required && (value === undefined || value === null)) {
    return { valid: false, error: `${key} is required` };
  }

  // 値がundefinedまたはnullで必須でない場合はバリデーション通過
  if (value === undefined || value === null) {
    return { valid: true };
  }

  // 型チェック
  if (rules.type && !isValidType(value, rules.type)) {
    return { valid: false, error: `${key} must be of type ${rules.type}` };
  }

  // 数値の範囲チェック
  if (rules.type === "number") {
    if (!isInRange(value, rules.min, rules.max)) {
      const minStr = rules.min !== undefined ? `min: ${rules.min}` : "";
      const maxStr = rules.max !== undefined ? `max: ${rules.max}` : "";
      const rangeStr = [minStr, maxStr].filter(s => s).join(", ");
      return { valid: false, error: `${key} is out of range (${rangeStr})` };
    }
  }

  // 文字列の長さチェック
  if (rules.type === "string") {
    if (!isValidLength(value, rules.minLength, rules.maxLength)) {
      const minStr = rules.minLength !== undefined ? `min: ${rules.minLength}` : "";
      const maxStr = rules.maxLength !== undefined ? `max: ${rules.maxLength}` : "";
      const lengthStr = [minStr, maxStr].filter(s => s).join(", ");
      return { valid: false, error: `${key} length is invalid (${lengthStr})` };
    }
  }

  // 配列の要素数チェック
  if (rules.type === "array") {
    if (!isValidArrayLength(value, rules.minLength, rules.maxLength)) {
      const minStr = rules.minLength !== undefined ? `min: ${rules.minLength}` : "";
      const maxStr = rules.maxLength !== undefined ? `max: ${rules.maxLength}` : "";
      const lengthStr = [minStr, maxStr].filter(s => s).join(", ");
      return { valid: false, error: `${key} array length is invalid (${lengthStr})` };
    }
  }

  // 列挙値チェック
  if (rules.enum && !isValidEnum(value, rules.enum)) {
    return { valid: false, error: `${key} must be one of: ${rules.enum.join(", ")}` };
  }

  // カスタムバリデーション
  if (rules.custom && !rules.custom(value)) {
    return { valid: false, error: `${key} failed custom validation` };
  }

  return { valid: true };
}



