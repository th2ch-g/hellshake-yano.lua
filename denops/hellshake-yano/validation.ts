import type { Config, HighlightColor } from "./types.ts";
import { validateConfig as validateConfigFromConfig } from "./config.ts";
import {validateHighlightGroupName,isValidColorName,isValidHexColor,validateHighlightColor} from "./validation-utils.ts";
export function validateConfig(cfg: Partial<Config>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const c = cfg as Record<string, unknown>;
  if (c.highlightHintMarker === null) errors.push("highlightHintMarker must be a string");
  if (c.highlightHintMarker === "") errors.push("highlightHintMarker must be a non-empty string");
  if (c.highlightHintMarkerCurrent === null) errors.push("highlightHintMarkerCurrent must be a string");
  if (c.highlightHintMarkerCurrent === "") errors.push("highlightHintMarkerCurrent must be a non-empty string");
  if (typeof c.highlightHintMarker === "number") errors.push("highlightHintMarker must be a string");
  if (typeof c.highlightHintMarkerCurrent === "number") errors.push("highlightHintMarkerCurrent must be a string");
  if (Array.isArray(c.highlightHintMarker)) errors.push("highlightHintMarker must be a string");
  if (Array.isArray(c.highlightHintMarkerCurrent)) errors.push("highlightHintMarkerCurrent must be a string");
  if (c.continuousHintMode !== undefined && typeof c.continuousHintMode !== "boolean") {
    errors.push("continuousHintMode must be a boolean");
  }
  if (c.recenterCommand !== undefined) {
    if (typeof c.recenterCommand !== "string" || c.recenterCommand.trim() === "") {
      errors.push("recenterCommand must be a non-empty string");
    }
  }
  if (c.maxContinuousJumps !== undefined && (!Number.isInteger(c.maxContinuousJumps) || c.maxContinuousJumps <= 0)) {
    errors.push("maxContinuousJumps must be a positive integer");
  }
  if (typeof c.highlightHintMarker === "string" && c.highlightHintMarker !== "") {
    if (/^[0-9]/.test(c.highlightHintMarker)) errors.push("highlightHintMarker must start with a letter or underscore");
    else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(c.highlightHintMarker)) errors.push("highlightHintMarker must contain only alphanumeric characters and underscores");
    else if (c.highlightHintMarker.length > 100) errors.push("highlightHintMarker must be 100 characters or less");
  }
  if (typeof c.highlightHintMarkerCurrent === "string" && c.highlightHintMarkerCurrent !== "") {
    if (/^[0-9]/.test(c.highlightHintMarkerCurrent)) errors.push("highlightHintMarkerCurrent must start with a letter or underscore");
    else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(c.highlightHintMarkerCurrent)) errors.push("highlightHintMarkerCurrent must contain only alphanumeric characters and underscores");
    else if (c.highlightHintMarkerCurrent.length > 100) errors.push("highlightHintMarkerCurrent must be 100 characters or less");
  }
  if (errors.length > 0) return { valid: false, errors };
  const configObj = cfg as Config;
  const result = validateConfigFromConfig(configObj);
  return { valid: result.valid, errors: result.errors };
}
export function normalizeColorName(color: string): string {
  if (typeof color !== "string") return "";
  if (color.toLowerCase() === "none") return "None";
  return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
}
export {validateHighlightGroupName,isValidColorName,isValidHexColor,validateHighlightColor};
export function generateHighlightCommand(groupName: string, color: HighlightColor): string {
  const parts = [`highlight ${groupName}`];
  if (color.fg) {
    const fg = color.fg.toLowerCase() === "none" ? "None" : isValidHexColor(color.fg) ? color.fg : color.fg.charAt(0).toUpperCase() + color.fg.slice(1).toLowerCase();
    if (isValidHexColor(color.fg)) {
      parts.push(`guifg=${fg}`);
    } else {
      parts.push(`ctermfg=${fg}`);
      parts.push(`guifg=${fg}`);
    }
  }
  if (color.bg) {
    const bg = color.bg.toLowerCase() === "none" ? "None" : isValidHexColor(color.bg) ? color.bg : color.bg.charAt(0).toUpperCase() + color.bg.slice(1).toLowerCase();
    if (isValidHexColor(color.bg)) {
      parts.push(`guibg=${bg}`);
    } else {
      parts.push(`ctermbg=${bg}`);
      parts.push(`guibg=${bg}`);
    }
  }
  return parts.join(" ");
}
export function validateHighlightConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const highlightKeys = ["highlightHintMarker","highlightHintMarkerCurrent","highlight_hint_marker","highlight_hint_marker_current"];
  for (const [key, value] of Object.entries(config)) {
    if (!highlightKeys.includes(key)) continue;
    if (typeof value === "string") {
      if (value.includes("-") || value.includes(" ") || /^\d/.test(value) || value === "") {
        errors.push(`Invalid highlight group name for ${key}: ${value}`);
      }
    } else if (typeof value === "object" && value !== null) {
      if (!("fg" in value || "bg" in value)) {
        errors.push(`Invalid highlight config for ${key}: must have fg or bg`);
      } else {
        if ("fg" in value) {
          const fg = value.fg;
          if (fg === null) errors.push(`fg must be a string for ${key}`);
          else if (fg !== undefined) {
            if (typeof fg !== "string") errors.push(`fg must be a string for ${key}`);
            else {
              const fgStr = fg;
              if (fgStr === "") errors.push(`fg cannot be empty string for ${key}`);
              else if (!isValidColorName(fgStr) && !isValidHexColor(fgStr) && fgStr.toLowerCase() !== "none") {
                if (!validateHighlightGroupName(fgStr)) errors.push(`Invalid value for ${key}.fg: ${fgStr}`);
              }
            }
          }
        }
        if ("bg" in value) {
          const bg = value.bg;
          if (bg === null) errors.push(`bg must be a string for ${key}`);
          else if (bg !== undefined) {
            if (typeof bg !== "string") errors.push(`bg must be a string for ${key}`);
            else {
              const bgStr = bg;
              if (bgStr === "") errors.push(`bg cannot be empty string for ${key}`);
              else if (!isValidColorName(bgStr) && !isValidHexColor(bgStr) && bgStr.toLowerCase() !== "none") {
                if (!validateHighlightGroupName(bgStr)) errors.push(`Invalid value for ${key}.bg: ${bgStr}`);
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
