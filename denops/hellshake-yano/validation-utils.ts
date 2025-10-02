/**
 * @fileoverview 共通バリデーションユーティリティ
 * core.ts, validation.ts, hint.ts から重複するバリデーション関数を統合
 */
import type { HighlightColor } from "./types.ts";

/**
 * ハイライトグループ名の妥当性を検証する
 * @param groupName - ハイライトグループ名
 * @returns 有効な場合 true
 */
export function validateHighlightGroupName(groupName: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(groupName) && groupName.length <= 100;
}

/**
 * 標準的な色名の妥当性を検証する
 * @param colorName - 色名
 * @returns 有効な色名の場合 true
 */
export function isValidColorName(colorName: string): boolean {
  if (typeof colorName !== "string") return false;
  const standardColors = [
    "black",
    "red",
    "green",
    "yellow",
    "blue",
    "magenta",
    "cyan",
    "white",
    "gray",
    "grey",
    "none",
  ];
  return standardColors.includes(colorName.toLowerCase());
}

/**
 * 16進数色コードの妥当性を検証する
 * @param hexColor - 16進数色コード
 * @returns 有効な16進数色コードの場合 true（3桁・6桁をサポート）
 */
export function isValidHexColor(hexColor: string): boolean {
  if (typeof hexColor !== "string") return false;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hexColor);
}

/**
 * ハイライト色設定の妥当性を検証する（オブジェクトのみ）
 * @param color - ハイライト色設定オブジェクト
 * @returns 検証結果（有効性とエラーメッセージ）
 */
export function validateHighlightColorObject(
  color: HighlightColor,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!color || typeof color !== "object") {
    errors.push("Invalid highlight color object");
    return { valid: false, errors };
  }

  if (Object.keys(color).length === 0 && !("fg" in color) && !("bg" in color)) {
    errors.push("Highlight color must have fg or bg property");
    return { valid: false, errors };
  }

  if (color.fg !== undefined && color.fg !== null) {
    if (typeof color.fg !== "string") {
      errors.push("fg must be a string");
    } else {
      const fg = color.fg;
      if (fg === "") {
        errors.push("fg cannot be empty string");
      } else if (!isValidColorName(fg) && !isValidHexColor(fg) && fg.toLowerCase() !== "none") {
        errors.push(`Invalid fg color: ${fg}`);
      }
    }
  }

  if (color.bg !== undefined && color.bg !== null) {
    if (typeof color.bg !== "string") {
      errors.push("bg must be a string");
    } else {
      const bg = color.bg;
      if (bg === "") {
        errors.push("bg cannot be empty string");
      } else if (!isValidColorName(bg) && !isValidHexColor(bg) && bg.toLowerCase() !== "none") {
        errors.push(`Invalid bg color: ${bg}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * ハイライト色設定の総合検証（拡張版）
 * string | HighlightColor の両方をサポート
 * @param colorConfig - ハイライト色設定（文字列またはオブジェクト）
 * @returns 検証結果（有効性とエラーメッセージ）
 */
export function validateHighlightColor(
  colorConfig: string | HighlightColor,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (colorConfig === null) {
    errors.push("highlight_hint_marker must be a string");
    return { valid: false, errors };
  }

  if (typeof colorConfig === "number") {
    errors.push("highlight_hint_marker must be a string");
    return { valid: false, errors };
  }

  if (Array.isArray(colorConfig)) {
    errors.push("highlight_hint_marker must be a string");
    return { valid: false, errors };
  }

  // 文字列の場合（ハイライトグループ名）
  if (typeof colorConfig === "string") {
    if (colorConfig === "") {
      errors.push("highlight_hint_marker must be a non-empty string");
      return { valid: false, errors };
    }

    if (!validateHighlightGroupName(colorConfig)) {
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

  // オブジェクトの場合
  if (typeof colorConfig === "object" && colorConfig !== null) {
    return validateHighlightColorObject(colorConfig);
  }

  errors.push("Color configuration must be a string or object");
  return { valid: false, errors };
}

/**
 * 有効な記号のセット
 */
const VALID_SYMBOL_SET = new Set([";", ":", "[", "]", "'", '"', ",", ".", "/", "\\", "-", "=", "`"]);

/**
 * 文字が有効な記号かどうかを判定
 * @param char - 判定する文字
 * @returns 有効な記号の場合 true
 */
export function isValidSymbol(char: string): boolean {
  return VALID_SYMBOL_SET.has(char);
}

/**
 * 文字が英数字かどうかを判定
 * @param char - 判定する文字
 * @returns 英数字の場合 true
 */
export function isAlphanumeric(char: string): boolean {
  return /^[a-zA-Z0-9]$/.test(char);
}

/**
 * 文字が空白文字かどうかを判定
 * @param char - 判定する文字
 * @returns 空白文字の場合 true
 */
export function isWhitespace(char: string): boolean {
  return /^\s$/.test(char);
}

/**
 * 文字が制御文字かどうかを判定
 * @param char - 判定する文字
 * @returns 制御文字の場合 true
 */
export function isControlCharacter(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 0x00 && code <= 0x1F) || (code >= 0x7F && code <= 0x9F);
}

/**
 * 文字が数字かどうかを判定
 * @param char - 判定する文字
 * @returns 数字の場合 true
 */
export function isDigit(char: string): boolean {
  return /^\d$/.test(char);
}
