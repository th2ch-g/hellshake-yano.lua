/**
 * バリデーション処理の集約
 * Phase 1: モジュール分割で検証ロジックを統一
 *
 * このモジュールは以下のバリデーション機能を提供します：
 * - 基本的な型チェック（isValidType）
 * - 数値範囲チェック（isInRange）
 * - 文字列/配列長チェック（isValidLength, isValidArrayLength）
 * - 列挙値チェック（isValidEnum）
 * - 設定値の総合バリデーション（validateConfigValue, validateConfigObject）
 * - ハイライト関連の特殊バリデーション（validateHighlightColor, validateHighlightGroupName, etc.）
 */

/**
 * 設定値の型チェック
 * 指定された値が期待される型と一致するかを検証
 *
 * @param {any} value - チェック対象の値
 * @param {string} expectedType - 期待される型名（"string", "number", "boolean", "array", "object"）
 * @returns {boolean} 型が一致する場合true、不一致の場合false
 * @throws {never} この関数は例外をスローしません
 * @example
 * ```typescript
 * isValidType("hello", "string"); // true
 * isValidType(123, "number"); // true
 * isValidType([1, 2, 3], "array"); // true
 * isValidType(NaN, "number"); // false (NaNは無効な数値として扱われる)
 * ```
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
 * 数値が指定された範囲内にあるかを検証
 *
 * @param {number} value - チェック対象の数値
 * @param {number} [min] - 最小値（省略時は下限なし）
 * @param {number} [max] - 最大値（省略時は上限なし）
 * @returns {boolean} 範囲内にある場合true、範囲外の場合false
 * @throws {never} この関数は例外をスローしません
 * @example
 * ```typescript
 * isInRange(5, 1, 10); // true
 * isInRange(-1, 0, 100); // false
 * isInRange(50, undefined, 100); // true（下限なし）
 * isInRange(75, 0, undefined); // true（上限なし）
 * ```
 */
export function isInRange(value: number, min?: number, max?: number): boolean {
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

/**
 * 文字列の長さチェック
 * 文字列の長さが指定された範囲内にあるかを検証
 *
 * @param {string} value - チェック対象の文字列
 * @param {number} [minLength] - 最小長（省略時は下限なし）
 * @param {number} [maxLength] - 最大長（省略時は上限なし）
 * @returns {boolean} 長さが範囲内にある場合true、範囲外の場合false
 * @throws {never} この関数は例外をスローしません
 * @example
 * ```typescript
 * isValidLength("hello", 1, 10); // true
 * isValidLength("", 1, 10); // false（最小長より短い）
 * isValidLength("very long string", undefined, 10); // false（最大長を超える）
 * isValidLength("test", 0, undefined); // true（上限なし）
 * ```
 */
export function isValidLength(value: string, minLength?: number, maxLength?: number): boolean {
  if (minLength !== undefined && value.length < minLength) return false;
  if (maxLength !== undefined && value.length > maxLength) return false;
  return true;
}

/**
 * 配列の要素数チェック
 * 配列の要素数が指定された範囲内にあるかを検証
 *
 * @param {any[]} array - チェック対象の配列
 * @param {number} [minLength] - 最小要素数（省略時は下限なし）
 * @param {number} [maxLength] - 最大要素数（省略時は上限なし）
 * @returns {boolean} 要素数が範囲内にある場合true、範囲外の場合false
 * @throws {never} この関数は例外をスローしません
 * @example
 * ```typescript
 * isValidArrayLength([1, 2, 3], 1, 5); // true
 * isValidArrayLength([], 1, 5); // false（最小要素数より少ない）
 * isValidArrayLength([1, 2, 3, 4, 5, 6], 1, 5); // false（最大要素数を超える）
 * isValidArrayLength([1, 2], 0, undefined); // true（上限なし）
 * ```
 */
export function isValidArrayLength(array: any[], minLength?: number, maxLength?: number): boolean {
  if (minLength !== undefined && array.length < minLength) return false;
  if (maxLength !== undefined && array.length > maxLength) return false;
  return true;
}

/**
 * 列挙値のチェック
 * 値が指定された有効な値のリストに含まれているかを検証
 *
 * @param {any} value - チェック対象の値
 * @param {readonly any[]} validValues - 有効な値のリスト
 * @returns {boolean} 有効な値に含まれている場合true、含まれていない場合false
 * @throws {never} この関数は例外をスローしません
 * @example
 * ```typescript
 * isValidEnum("red", ["red", "green", "blue"]); // true
 * isValidEnum("yellow", ["red", "green", "blue"]); // false
 * isValidEnum(1, [1, 2, 3]); // true
 * isValidEnum(null, ["red", "green", null]); // true（nullも有効な値として扱える）
 * ```
 */
export function isValidEnum(value: any, validValues: readonly any[]): boolean {
  return validValues.includes(value);
}

/**
 * 設定値の総合バリデーション
 * 複数のルールを適用して設定値を検証し、詳細なエラーメッセージを提供
 *
 * @param {string} key - バリデーション対象のキー名（エラーメッセージに使用）
 * @param {any} value - バリデーション対象の値
 * @param {Object} rules - バリデーションルール
 * @param {string} [rules.type] - 期待される型（"string", "number", "boolean", "array", "object"）
 * @param {boolean} [rules.required] - 必須かどうか（デフォルト: false）
 * @param {number} [rules.min] - 数値の最小値（type="number"の場合）
 * @param {number} [rules.max] - 数値の最大値（type="number"の場合）
 * @param {number} [rules.minLength] - 文字列/配列の最小長（type="string"または"array"の場合）
 * @param {number} [rules.maxLength] - 文字列/配列の最大長（type="string"または"array"の場合）
 * @param {readonly any[]} [rules.enum] - 有効な値のリスト
 * @param {function(any): boolean} [rules.custom] - カスタムバリデーション関数
 * @returns {{valid: boolean, error?: string}} バリデーション結果とエラーメッセージ
 * @throws {never} この関数は例外をスローしません
 * @example
 * ```typescript
 * const result = validateConfigValue("port", 8080, {
 *   type: "number",
 *   required: true,
 *   min: 1000,
 *   max: 65535
 * });
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 *
 * // カスタムバリデーションの例
 * const emailResult = validateConfigValue("email", "user@example.com", {
 *   type: "string",
 *   required: true,
 *   custom: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
 * });
 * ```
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

/**
 * バリデーションルールのインターフェース
 * validateConfigValueで使用されるルールの型定義
 *
 * @interface ValidationRules
 */
export interface ValidationRules {
  /** 期待される型名 */
  type?: "string" | "number" | "boolean" | "array" | "object";
  /** 必須フィールドかどうか */
  required?: boolean;
  /** 数値の最小値 */
  min?: number;
  /** 数値の最大値 */
  max?: number;
  /** 文字列/配列の最小長 */
  minLength?: number;
  /** 文字列/配列の最大長 */
  maxLength?: number;
  /** 有効な値のリスト */
  enum?: readonly any[];
  /** カスタムバリデーション関数 */
  custom?: (value: any) => boolean;
}

/**
 * バリデーション結果のインターフェース
 * バリデーション関数の戻り値として使用される
 *
 * @interface ValidationResult
 */
export interface ValidationResult {
  /** バリデーションが成功したかどうか */
  valid: boolean;
  /** エラーメッセージ（失敗時のみ） */
  error?: string;
}

/**
 * 複数の設定値を一括でバリデーション
 * オブジェクトの各プロパティに対してルールを適用
 *
 * @param {Record<string, any>} config - バリデーション対象の設定オブジェクト
 * @param {Record<string, ValidationRules>} rulesMap - 各キーに対するバリデーションルールのマップ
 * @returns {ValidationResult & {errors?: Record<string, string>}} 全体のバリデーション結果とエラーの詳細
 * @throws {never} この関数は例外をスローしません
 * @example
 * ```typescript
 * const config = { port: 8080, host: "localhost", debug: true };
 * const rules = {
 *   port: { type: "number", required: true, min: 1000, max: 65535 },
 *   host: { type: "string", required: true, minLength: 1 },
 *   debug: { type: "boolean" }
 * };
 * const result = validateConfigObject(config, rules);
 *
 * if (!result.valid) {
 *   console.error("バリデーションエラー:", result.error);
 *   console.error("詳細:", result.errors);
 * }
 * ```
 */
export function validateConfigObject(
  config: Record<string, any>,
  rulesMap: Record<string, ValidationRules>
): ValidationResult & { errors?: Record<string, string> } {
  const errors: Record<string, string> = {};
  let hasError = false;

  for (const [key, rules] of Object.entries(rulesMap)) {
    const result = validateConfigValue(key, config[key], rules);
    if (!result.valid && result.error) {
      errors[key] = result.error;
      hasError = true;
    }
  }

  return {
    valid: !hasError,
    ...(hasError && { error: `Validation failed for: ${Object.keys(errors).join(", ")}` }),
    ...(hasError && { errors })
  };
}

/**
 * ハイライトグループ名の検証
 * Vimのハイライトグループ名の命名規則に従って検証を行う
 *
 * @param {string} groupName - 検証するハイライトグループ名
 * @returns {boolean} 有効な場合true、無効な場合false
 * @throws {never} この関数は例外をスローしません
 * @example
 * ```typescript
 * validateHighlightGroupName("MyGroup"); // true
 * validateHighlightGroupName("_underscore"); // true
 * validateHighlightGroupName("123invalid"); // false（数字で始まる）
 * validateHighlightGroupName(""); // false（空文字列）
 * validateHighlightGroupName("Group-Name"); // false（ハイフンは無効）
 * ```
 */
export function validateHighlightGroupName(groupName: string): boolean {
  // 空文字列チェック
  if (!groupName || groupName.length === 0) {
    return false;
  }

  // 長さチェック（100文字以下）
  if (groupName.length > 100) {
    return false;
  }

  // 英字またはアンダースコアで始まる
  if (!/^[a-zA-Z_]/.test(groupName)) {
    return false;
  }

  // 英数字とアンダースコアのみ使用可能
  if (!/^[a-zA-Z0-9_]+$/.test(groupName)) {
    return false;
  }

  return true;
}

/**
 * 色名の検証
 * Vimで使用可能な標準色名かどうかを検証
 *
 * @param {string} colorName - 検証する色名
 * @returns {boolean} 有効な色名の場合true、無効な場合false
 * @throws {never} この関数は例外をスローしません
 * @example
 * ```typescript
 * isValidColorName("red"); // true
 * isValidColorName("Red"); // true（大文字小文字不区別）
 * isValidColorName("darkblue"); // true
 * isValidColorName("invalidcolor"); // false
 * isValidColorName(""); // false（空文字列）
 * ```
 */
export function isValidColorName(colorName: string): boolean {
  if (!colorName || typeof colorName !== "string") {
    return false;
  }

  // 標準的なVim色名（大文字小文字不区別）
  const validColorNames = [
    "black", "darkblue", "darkgreen", "darkcyan", "darkred", "darkmagenta",
    "brown", "darkyellow", "lightgray", "lightgrey", "darkgray", "darkgrey",
    "blue", "lightblue", "green", "lightgreen", "cyan", "lightcyan", "red",
    "lightred", "magenta", "lightmagenta", "yellow", "lightyellow", "white",
    "orange", "gray", "grey", "seagreen", "none"
  ];

  return validColorNames.includes(colorName.toLowerCase());
}

/**
 * 16進数色表記の検証
 * 16進数カラーコード（#RRGGBB または #RGB 形式）の検証を行う
 *
 * @param {string} hexColor - 検証する16進数色（例: "#ff0000", "#fff"）
 * @returns {boolean} 有効な16進数色の場合true、無効な場合false
 * @throws {never} この関数は例外をスローしません
 * @example
 * ```typescript
 * isValidHexColor("#ff0000"); // true（6桁形式）
 * isValidHexColor("#fff"); // true（3桁形式）
 * isValidHexColor("#FF0000"); // true（大文字も有効）
 * isValidHexColor("ff0000"); // false（#が必要）
 * isValidHexColor("#gg0000"); // false（無効な文字）
 * isValidHexColor("#ff00"); // false（4桁は無効）
 * ```
 */
export function isValidHexColor(hexColor: string): boolean {
  if (!hexColor || typeof hexColor !== "string") {
    return false;
  }

  // #で始まること
  if (!hexColor.startsWith("#")) {
    return false;
  }

  // #を除いた部分
  const hex = hexColor.slice(1);

  // 3桁または6桁の16進数のみ許可
  if (hex.length !== 3 && hex.length !== 6) {
    return false;
  }

  // 16進数文字のみ
  return /^[0-9a-fA-F]+$/.test(hex);
}

/**
 * ハイライト色設定インターフェース
 * fg（前景色）とbg（背景色）を個別に指定するための型定義
 *
 * @interface HighlightColor
 */
export interface HighlightColor {
  /** 前景色（テキスト色） */
  fg?: string;
  /** 背景色 */
  bg?: string;
}

/**
 * ハイライト色設定の総合検証
 * 文字列（ハイライトグループ名）またはオブジェクト（色設定）の検証を行う
 *
 * @param {string | HighlightColor} colorConfig - 検証するハイライト色設定
 * @returns {{valid: boolean, errors: string[]}} 検証結果とエラーメッセージのリスト
 * @throws {never} この関数は例外をスローしません
 * @example
 * ```typescript
 * // ハイライトグループ名での設定
 * validateHighlightColor("Error"); // { valid: true, errors: [] }
 * validateHighlightColor("123invalid"); // { valid: false, errors: [...] }
 *
 * // 色設定オブジェクトでの設定
 * validateHighlightColor({ fg: "red", bg: "white" }); // { valid: true, errors: [] }
 * validateHighlightColor({ fg: "#ff0000" }); // { valid: true, errors: [] }
 * validateHighlightColor({ fg: "invalidcolor" }); // { valid: false, errors: [...] }
 * validateHighlightColor({}); // { valid: false, errors: ["At least one of fg or bg must be specified"] }
 * ```
 */
export function validateHighlightColor(
  colorConfig: string | HighlightColor,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // null と undefined のチェック
  if (colorConfig === null) {
    errors.push("highlight_hint_marker must be a string");
    return { valid: false, errors };
  }

  // 数値や配列などの無効な型チェック
  if (typeof colorConfig === "number") {
    errors.push("highlight_hint_marker must be a string");
    return { valid: false, errors };
  }

  if (Array.isArray(colorConfig)) {
    errors.push("highlight_hint_marker must be a string");
    return { valid: false, errors };
  }

  // 文字列の場合（従来のハイライトグループ名）
  if (typeof colorConfig === "string") {
    // 空文字列チェック
    if (colorConfig === "") {
      errors.push("highlight_hint_marker must be a non-empty string");
      return { valid: false, errors };
    }

    // ハイライトグループ名のバリデーション
    if (!validateHighlightGroupName(colorConfig)) {
      // より詳細なエラーメッセージを提供
      if (!/^[a-zA-Z_]/.test(colorConfig)) {
        errors.push("highlight_hint_marker must start with a letter or underscore");
      } else if (!/^[a-zA-Z0-9_]+$/.test(colorConfig)) {
        errors.push(
          "highlight_hint_marker must contain only alphanumeric characters and underscores",
        );
      } else if (colorConfig.length > 100) {
        errors.push("highlight_hint_marker must be 100 characters or less");
      } else {
        errors.push(`Invalid highlight group name: ${colorConfig}`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  // オブジェクトの場合（fg/bg個別指定）
  if (typeof colorConfig === "object" && colorConfig !== null) {
    const { fg, bg } = colorConfig;

    // fgの検証
    if (fg !== undefined) {
      if (typeof fg !== "string") {
        errors.push("fg must be a string");
      } else if (fg === "") {
        errors.push("fg cannot be empty string");
      } else if (!isValidColorName(fg) && !isValidHexColor(fg)) {
        errors.push(`Invalid fg color: ${fg}`);
      }
    }

    // bgの検証
    if (bg !== undefined) {
      if (typeof bg !== "string") {
        errors.push("bg must be a string");
      } else if (bg === "") {
        errors.push("bg cannot be empty string");
      } else if (!isValidColorName(bg) && !isValidHexColor(bg)) {
        errors.push(`Invalid bg color: ${bg}`);
      }
    }

    // fgもbgも指定されていない場合
    if (fg === undefined && bg === undefined) {
      errors.push("At least one of fg or bg must be specified");
    }

    return { valid: errors.length === 0, errors };
  }

  errors.push("Color configuration must be a string or object");
  return { valid: false, errors };
}
