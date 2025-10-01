/**
 * @fileoverview 設定と検証関連の関数
 */
import type { Config, HighlightColor } from "./types.ts";
import { validateConfig as validateConfigFromConfig } from "./config.ts";

/**
 * プラグイン設定を検証する
 * @param cfg - 部分的な設定オブジェクト
 * @returns 検証結果（有効性とエラーメッセージ）
 */
export function validateConfig(cfg: Partial<Config>): { valid: boolean; errors: string[] } {
  // null値の明示的チェック
  const errors: string[] = [];
  // Process4 Sub3: as any → as Record<string, unknown> に変更
  // unknown型により型ガードを強制し、型安全性を向上
  const c = cfg as Record<string, unknown>;

  // highlightHintMarker のnullチェック
  if (c.highlightHintMarker === null) {
    errors.push("highlightHintMarker must be a string");
  }

  // highlightHintMarker のempty string チェック
  if (c.highlightHintMarker === "") {
    errors.push("highlightHintMarker must be a non-empty string");
  }

  // highlightHintMarkerCurrent のnullチェック
  if (c.highlightHintMarkerCurrent === null) {
    errors.push("highlightHintMarkerCurrent must be a string");
  }

  // highlightHintMarkerCurrent のempty string チェック
  if (c.highlightHintMarkerCurrent === "") {
    errors.push("highlightHintMarkerCurrent must be a non-empty string");
  }

  // 数値型のチェック
  if (typeof c.highlightHintMarker === "number") {
    errors.push("highlightHintMarker must be a string");
  }

  if (typeof c.highlightHintMarkerCurrent === "number") {
    errors.push("highlightHintMarkerCurrent must be a string");
  }

  // 配列型のチェック
  if (Array.isArray(c.highlightHintMarker)) {
    errors.push("highlightHintMarker must be a string");
  }

  if (Array.isArray(c.highlightHintMarkerCurrent)) {
    errors.push("highlightHintMarkerCurrent must be a string");
  }

  // ハイライトグループ名として有効な文字列であるかチェック
  if (typeof c.highlightHintMarker === "string" && c.highlightHintMarker !== "") {
    // 最初の文字が数字で始まる場合
    if (/^[0-9]/.test(c.highlightHintMarker)) {
      errors.push("highlightHintMarker must start with a letter or underscore");
    } // アルファベット、数字、アンダースコア以外の文字を含む場合
    else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(c.highlightHintMarker)) {
      errors.push("highlightHintMarker must contain only alphanumeric characters and underscores");
    } // 100文字を超える場合
    else if (c.highlightHintMarker.length > 100) {
      errors.push("highlightHintMarker must be 100 characters or less");
    }
  }

  if (typeof c.highlightHintMarkerCurrent === "string" && c.highlightHintMarkerCurrent !== "") {
    // 最初の文字が数字で始まる場合
    if (/^[0-9]/.test(c.highlightHintMarkerCurrent)) {
      errors.push("highlightHintMarkerCurrent must start with a letter or underscore");
    } // アルファベット、数字、アンダースコア以外の文字を含む場合
    else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(c.highlightHintMarkerCurrent)) {
      errors.push(
        "highlightHintMarkerCurrent must contain only alphanumeric characters and underscores",
      );
    } // 100文字を超える場合
    else if (c.highlightHintMarkerCurrent.length > 100) {
      errors.push("highlightHintMarkerCurrent must be 100 characters or less");
    }
  }

  // 事前チェックでエラーがある場合は早期返却
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Configを直接バリデーション
  const configObj = cfg as Config;
  const result = validateConfigFromConfig(configObj);

  // Process4 sub3-2-3: camelCase統一 - エラーメッセージはそのまま返す
  // snake_caseは完全に廃止されたため、変換は不要
  return { valid: result.valid, errors: result.errors };
}

/**
 * ハイライトグループ名の妥当性を検証する
 * @param groupName - ハイライトグループ名
 * @returns 有効な場合 true
 */
export function validateHighlightGroupName(groupName: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(groupName);
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
  // Support both 3-digit and 6-digit hex colors
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hexColor);
}

/**
 * 色名を正規化する（Vim の標準形式に合わせる）
 * @param color - 色名
 * @returns 正規化された色名
 */
export function normalizeColorName(color: string): string {
  if (typeof color !== "string") return "";
  // Capitalize first letter for standard Vim color names
  if (color.toLowerCase() === "none") return "None";
  return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
}

/**
 * ハイライト色設定の妥当性を検証する
 * @param color - ハイライト色設定オブジェクト
 * @returns 検証結果（有効性とエラーメッセージ）
 */
export function validateHighlightColor(
  color: HighlightColor,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Handle null/undefined input
  if (!color || typeof color !== "object") {
    errors.push("Invalid highlight color object");
    return { valid: false, errors };
  }

  // Empty object is invalid
  if (Object.keys(color).length === 0 && !("fg" in color) && !("bg" in color)) {
    errors.push("Highlight color must have fg or bg property");
    return { valid: false, errors };
  }

  if (color.fg !== undefined && color.fg !== null) {
    // Type check: only string is allowed
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
    // Type check: only string is allowed
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
 * ハイライトコマンドを生成する
 * @param groupName - ハイライトグループ名
 * @param color - ハイライト色設定
 * @returns Vim ハイライトコマンド文字列
 */
export function generateHighlightCommand(groupName: string, color: HighlightColor): string {
  const parts = [`highlight ${groupName}`];

  if (color.fg) {
    const fg = color.fg.toLowerCase() === "none"
      ? "None"
      : isValidHexColor(color.fg)
      ? color.fg
      : color.fg.charAt(0).toUpperCase() + color.fg.slice(1).toLowerCase();
    if (isValidHexColor(color.fg)) {
      parts.push(`guifg=${fg}`);
    } else {
      parts.push(`ctermfg=${fg}`);
      parts.push(`guifg=${fg}`);
    }
  }

  if (color.bg) {
    const bg = color.bg.toLowerCase() === "none"
      ? "None"
      : isValidHexColor(color.bg)
      ? color.bg
      : color.bg.charAt(0).toUpperCase() + color.bg.slice(1).toLowerCase();
    if (isValidHexColor(color.bg)) {
      parts.push(`guibg=${bg}`);
    } else {
      parts.push(`ctermbg=${bg}`);
      parts.push(`guibg=${bg}`);
    }
  }

  return parts.join(" ");
}

/**
 * ハイライト設定の妥当性を検証する
 * @param config - ハイライト設定オブジェクト（Process4 Sub3: any → unknown に変更）
 * @returns 検証結果（有効性とエラーメッセージ）
 */
export function validateHighlightConfig(
  config: Record<string, unknown>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Handle various config key formats
  const highlightKeys = [
    "highlightHintMarker",
    "highlightHintMarkerCurrent",
    "highlight_hint_marker",
    "highlight_hint_marker_current",
  ];

  for (const [key, value] of Object.entries(config)) {
    // Only validate known highlight configuration keys
    if (!highlightKeys.includes(key)) continue;

    if (typeof value === "string") {
      // String values are valid as highlight group names
      // But some special strings are invalid as group names
      if (value.includes("-") || value.includes(" ") || /^\d/.test(value) || value === "") {
        errors.push(`Invalid highlight group name for ${key}: ${value}`);
      }
    } else if (typeof value === "object" && value !== null) {
      // Check if it's a valid color object
      if (!("fg" in value || "bg" in value)) {
        // Empty object or invalid structure
        errors.push(`Invalid highlight config for ${key}: must have fg or bg`);
      } else {
        // Validate individual color properties
        if ("fg" in value) {
          const fg = value.fg;
          if (fg === null) {
            errors.push(`fg must be a string for ${key}`);
          } else if (fg !== undefined) {
            if (typeof fg !== "string") {
              errors.push(`fg must be a string for ${key}`);
            } else {
              const fgStr = fg;
              if (fgStr === "") {
                errors.push(`fg cannot be empty string for ${key}`);
              } else if (
                !isValidColorName(fgStr) && !isValidHexColor(fgStr) &&
                fgStr.toLowerCase() !== "none"
              ) {
                // It might be a highlight group name
                if (!validateHighlightGroupName(fgStr)) {
                  errors.push(`Invalid value for ${key}.fg: ${fgStr}`);
                }
              }
            }
          }
        }
        if ("bg" in value) {
          const bg = value.bg;
          if (bg === null) {
            errors.push(`bg must be a string for ${key}`);
          } else if (bg !== undefined) {
            if (typeof bg !== "string") {
              errors.push(`bg must be a string for ${key}`);
            } else {
              const bgStr = bg;
              if (bgStr === "") {
                errors.push(`bg cannot be empty string for ${key}`);
              } else if (
                !isValidColorName(bgStr) && !isValidHexColor(bgStr) &&
                bgStr.toLowerCase() !== "none"
              ) {
                if (!validateHighlightGroupName(bgStr)) {
                  errors.push(`Invalid value for ${key}.bg: ${bgStr}`);
                }
              }
            }
          }
        }
      }
    } else {
      errors.push(`Invalid highlight config for ${key}`);
    }
  }

  return { valid: errors.length === 0, errors };
}