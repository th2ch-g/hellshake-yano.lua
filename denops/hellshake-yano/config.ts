/**
 * 設定管理モジュール
 */

import type { HighlightColor, HintPositionType } from "./types.ts";

export interface Config {
  enabled: boolean;
  markers: string[];
  motionCount: number;
  motionTimeout: number;
  hintPosition: "start" | "end" | "overlay";
  triggerOnHjkl: boolean;
  countedMotions: string[];
  maxHints: number;
  debounceDelay: number;
  useNumbers: boolean;
  highlightSelected: boolean;
  debugCoordinates: boolean;
  singleCharKeys: string[];
  multiCharKeys: string[];
  maxSingleCharHints?: number;
  useHintGroups: boolean;
  highlightHintMarker: string | HighlightColor;
  highlightHintMarkerCurrent: string | HighlightColor;
  suppressOnKeyRepeat: boolean;
  keyRepeatThreshold: number;
  useJapanese: boolean;
  wordDetectionStrategy: "regex" | "tinysegmenter" | "hybrid";
  enableTinySegmenter: boolean;
  segmenterThreshold: number;
  japaneseMinWordLength: number;
  japaneseMergeParticles: boolean;
  japaneseMergeThreshold: number;
  perKeyMinLength?: Record<string, number>;
  defaultMinWordLength: number;
  perKeyMotionCount?: Record<string, number>;
  defaultMotionCount: number;
  currentKeyContext?: string;
  motionCounterEnabled: boolean;
  motionCounterThreshold: number;
  motionCounterTimeout: number;
  showHintOnMotionThreshold: boolean;
  debugMode: boolean;
  performanceLog: boolean;
  debug?: boolean;
  useNumericMultiCharHints?: boolean;
}

export const DEFAULT_CONFIG: Config = {
  enabled: true,
  markers: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  motionCount: 3,
  motionTimeout: 2000,
  hintPosition: "start",
  triggerOnHjkl: true,
  countedMotions: [],
  maxHints: 336,
  debounceDelay: 50,
  useNumbers: false,
  highlightSelected: false,
  debugCoordinates: false,
  singleCharKeys: [
    "A", "S", "D", "F", "G", "H", "J", "K", "L", "N", "M",
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  ],
  multiCharKeys: ["B", "C", "E", "I", "O", "P", "Q", "R", "T", "U", "V", "W", "X", "Y", "Z"],
  maxSingleCharHints: 21,
  useHintGroups: true,
  highlightHintMarker: "DiffAdd",
  highlightHintMarkerCurrent: "DiffText",
  suppressOnKeyRepeat: true,
  keyRepeatThreshold: 50,
  useJapanese: false,
  wordDetectionStrategy: "hybrid",
  enableTinySegmenter: true,
  segmenterThreshold: 4,
  japaneseMinWordLength: 2,
  japaneseMergeParticles: true,
  japaneseMergeThreshold: 2,
  perKeyMinLength: {},
  defaultMinWordLength: 3,
  perKeyMotionCount: {},
  defaultMotionCount: 3,
  motionCounterEnabled: true,
  motionCounterThreshold: 3,
  motionCounterTimeout: 2000,
  showHintOnMotionThreshold: true,
  debugMode: false,
  performanceLog: false,
  debug: false,
  useNumericMultiCharHints: false,
};

export const DEFAULT_UNIFIED_CONFIG: Config = DEFAULT_CONFIG;

export function getDefaultConfig(): Config {
  return DEFAULT_CONFIG;
}

export function getDefaultUnifiedConfig(): Config {
  return DEFAULT_UNIFIED_CONFIG;
}

export function createMinimalConfig(partialConfig: Partial<Config> = {}): Config {
  const defaults = getDefaultConfig();
  return { ...defaults, ...partialConfig };
}

function isValidHighlightGroup(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) && name.length <= 100;
}

function validateCoreSettings(config: Partial<Config>, errors: string[]): void {
  if (config.markers !== undefined) {
    if (!Array.isArray(config.markers)) {
      errors.push("markers must be an array");
    } else if (config.markers.length === 0) {
      errors.push("markers must not be empty");
    } else {
      if (!config.markers.every(m => typeof m === "string")) {
        errors.push("markers must be an array of strings");
      } else {
        const uniqueMarkers = new Set(config.markers);
        if (uniqueMarkers.size !== config.markers.length) {
          errors.push("markers must contain unique values");
        }
      }
    }
  }

  if (config.motionCount !== undefined) {
    if (config.motionCount === null || !Number.isInteger(config.motionCount) || config.motionCount <= 0) {
      errors.push("motionCount must be a positive integer");
    }
  }

  if (config.motionTimeout !== undefined) {
    if (!Number.isInteger(config.motionTimeout) || config.motionTimeout < 100) {
      errors.push("motionTimeout must be at least 100ms");
    }
  }

  if (config.hintPosition !== undefined) {
    const validPositions = ["start", "end", "overlay"];
    if (config.hintPosition === null || !validPositions.includes(config.hintPosition)) {
      errors.push("hintPosition must be one of: start, end, overlay");
    }
  }
}

function validateHintSettings(config: Partial<Config>, errors: string[]): void {
  if (config.maxHints !== undefined) {
    if (!Number.isInteger(config.maxHints) || config.maxHints <= 0) {
      errors.push("maxHints must be a positive integer");
    }
  }

  if (config.debounceDelay !== undefined) {
    if (!Number.isInteger(config.debounceDelay) || config.debounceDelay < 0) {
      errors.push("debounceDelay must be a non-negative number");
    }
  }

  if (config.useNumbers !== undefined && typeof config.useNumbers !== "boolean") {
    errors.push("useNumbers must be a boolean");
  }

  if (config.singleCharKeys !== undefined) {
    if (!Array.isArray(config.singleCharKeys)) {
      errors.push("singleCharKeys must be an array");
    } else if (config.singleCharKeys.length > 0) {
      const validSymbols = new Set([";", ":", "[", "]", "'", '"', ",", ".", "/", "\\", "-", "=", "`"]);

      for (let i = 0; i < config.singleCharKeys.length; i++) {
        const key = config.singleCharKeys[i];

        if (typeof key !== "string") {
          errors.push("singleCharKeys must be an array of strings");
          break;
        }

        if (key === "") {
          errors.push("singleCharKeys must not contain empty strings");
          break;
        }

        if (key.length !== 1) {
          errors.push("singleCharKeys must contain only single character strings");
          break;
        }

        const isAlphanumeric = /^[a-zA-Z0-9]$/.test(key);
        const isValidSymbol = validSymbols.has(key);
        const isWhitespace = /^\s$/.test(key);
        const isControlChar = key.charCodeAt(0) < 32 || key.charCodeAt(0) === 127;

        if (!isAlphanumeric && !isValidSymbol) {
          if (isWhitespace) {
            errors.push("singleCharKeys must not contain whitespace characters (space, tab, newline)");
          } else if (isControlChar) {
            errors.push("singleCharKeys must not contain control characters");
          } else {
            errors.push(`singleCharKeys contains invalid character: '${key}'. Valid symbols are: ; : [ ] ' " , . / \\ - = \``);
          }
          break;
        }
      }

      const uniqueKeys = new Set(config.singleCharKeys);
      if (uniqueKeys.size !== config.singleCharKeys.length) {
        errors.push("singleCharKeys must contain unique values");
      }
    }
  }
}

function validateExtendedHintSettings(config: Partial<Config>, errors: string[]): void {
  if (config.maxSingleCharHints !== undefined) {
    if (!Number.isInteger(config.maxSingleCharHints) || config.maxSingleCharHints <= 0) {
      errors.push("maxSingleCharHints must be a positive integer");
    }
  }

  if (config.highlightHintMarker !== undefined) {
    if (typeof config.highlightHintMarker === 'string') {
      if (config.highlightHintMarker === '') {
        errors.push("highlightHintMarker must be a non-empty string");
      } else if (!isValidHighlightGroup(config.highlightHintMarker)) {
        if (config.highlightHintMarker.length > 100) {
          errors.push("highlightHintMarker must be 100 characters or less");
        } else if (/^[0-9]/.test(config.highlightHintMarker)) {
          errors.push("highlightHintMarker must start with a letter or underscore");
        } else {
          errors.push("highlightHintMarker must contain only alphanumeric characters and underscores");
        }
      }
    } else if (typeof config.highlightHintMarker !== 'object') {
      errors.push("highlightHintMarker must be a string or HighlightColor object");
    }
  }

  if (config.highlightHintMarkerCurrent !== undefined) {
    if (typeof config.highlightHintMarkerCurrent === 'string') {
      if (config.highlightHintMarkerCurrent === '') {
        errors.push("highlightHintMarkerCurrent must be a non-empty string");
      } else if (!isValidHighlightGroup(config.highlightHintMarkerCurrent)) {
        if (config.highlightHintMarkerCurrent.length > 100) {
          errors.push("highlightHintMarkerCurrent must be 100 characters or less");
        } else if (/^[0-9]/.test(config.highlightHintMarkerCurrent)) {
          errors.push("highlightHintMarkerCurrent must start with a letter or underscore");
        } else {
          errors.push("highlightHintMarkerCurrent must contain only alphanumeric characters and underscores");
        }
      }
    } else if (typeof config.highlightHintMarkerCurrent !== 'object') {
      errors.push("highlightHintMarkerCurrent must be a string or HighlightColor object");
    }
  }
}

function validateWordDetectionSettings(config: Partial<Config>, errors: string[]): void {
  if (config.keyRepeatThreshold !== undefined) {
    if (!Number.isInteger(config.keyRepeatThreshold) || config.keyRepeatThreshold < 0) {
      errors.push("keyRepeatThreshold must be a non-negative integer");
    }
  }

  if (config.wordDetectionStrategy !== undefined) {
    const validStrategies = ["regex", "tinysegmenter", "hybrid"];
    if (!validStrategies.includes(config.wordDetectionStrategy)) {
      errors.push(`wordDetectionStrategy must be one of: ${validStrategies.join(", ")}`);
    }
  }

  if (config.segmenterThreshold !== undefined) {
    if (!Number.isInteger(config.segmenterThreshold) || config.segmenterThreshold <= 0) {
      errors.push("segmenterThreshold must be a positive integer");
    }
  }
}

function validateJapaneseWordSettings(config: Partial<Config>, errors: string[]): void {
  if (config.japaneseMinWordLength !== undefined) {
    if (!Number.isInteger(config.japaneseMinWordLength) || config.japaneseMinWordLength <= 0) {
      errors.push("japaneseMinWordLength must be a positive integer");
    }
  }

  if (config.japaneseMergeThreshold !== undefined) {
    if (!Number.isInteger(config.japaneseMergeThreshold) || config.japaneseMergeThreshold <= 0) {
      errors.push("japaneseMergeThreshold must be a positive integer");
    }
  }

  if (config.defaultMinWordLength !== undefined) {
    if (!Number.isInteger(config.defaultMinWordLength) || config.defaultMinWordLength <= 0) {
      errors.push("defaultMinWordLength must be a positive integer");
    }
  }

  if (config.defaultMotionCount !== undefined) {
    if (!Number.isInteger(config.defaultMotionCount) || config.defaultMotionCount <= 0) {
      errors.push("defaultMotionCount must be a positive integer");
    }
  }
}

export function validateUnifiedConfig(
  config: Partial<Config>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  validateCoreSettings(config, errors);
  validateHintSettings(config, errors);
  validateExtendedHintSettings(config, errors);
  validateWordDetectionSettings(config, errors);
  validateJapaneseWordSettings(config, errors);

  return { valid: errors.length === 0, errors };
}

export function validateConfig(
  config: Partial<Config>,
): { valid: boolean; errors: string[] } {
  // 入力されたconfigが数値型のhighlightHintMarkerなどを含む場合、
  // 直接バリデーションする必要がある
  const errors: string[] = [];
  const c = config as Record<string, unknown>;

  // motionCount の型チェック
  if (c.motionCount !== undefined && c.motionCount === null) {
    errors.push("motionCount cannot be null");
  }

  // hintPosition の型チェック
  if (c.hintPosition !== undefined && c.hintPosition === null) {
    errors.push("hintPosition cannot be null");
  }

  // highlightHintMarker の型チェック
  if (c.highlightHintMarker !== undefined) {
    if (c.highlightHintMarker === null) {
      errors.push("highlightHintMarker cannot be null");
    } else if (typeof c.highlightHintMarker === 'number') {
      errors.push("highlightHintMarker must be a string");
    } else if (Array.isArray(c.highlightHintMarker)) {
      errors.push("highlightHintMarker must be a string");
    } else if (typeof c.highlightHintMarker === 'string') {
      if (c.highlightHintMarker === '') {
        errors.push("highlightHintMarker must be a non-empty string");
      } else if (!isValidHighlightGroup(c.highlightHintMarker)) {
        if (c.highlightHintMarker.length > 100) {
          errors.push("highlightHintMarker must be 100 characters or less");
        } else if (/^[0-9]/.test(c.highlightHintMarker)) {
          errors.push("highlightHintMarker must start with a letter or underscore");
        } else {
          errors.push("highlightHintMarker must contain only alphanumeric characters and underscores");
        }
      }
    }
  }

  // highlightHintMarkerCurrent の型チェック
  if (c.highlightHintMarkerCurrent !== undefined) {
    if (c.highlightHintMarkerCurrent === null) {
      errors.push("highlightHintMarkerCurrent cannot be null");
    } else if (typeof c.highlightHintMarkerCurrent === 'number') {
      errors.push("highlightHintMarkerCurrent must be a string");
    } else if (Array.isArray(c.highlightHintMarkerCurrent)) {
      errors.push("highlightHintMarkerCurrent must be a string");
    } else if (typeof c.highlightHintMarkerCurrent === 'string') {
      if (c.highlightHintMarkerCurrent === '') {
        errors.push("highlightHintMarkerCurrent must be a non-empty string");
      } else if (!isValidHighlightGroup(c.highlightHintMarkerCurrent)) {
        if (c.highlightHintMarkerCurrent.length > 100) {
          errors.push("highlightHintMarkerCurrent must be 100 characters or less");
        } else if (/^[0-9]/.test(c.highlightHintMarkerCurrent)) {
          errors.push("highlightHintMarkerCurrent must start with a letter or underscore");
        } else {
          errors.push("highlightHintMarkerCurrent must contain only alphanumeric characters and underscores");
        }
      }
    }
  }

  // 早期エラーがあれば返す
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Process1: 直接Configとして扱う
  const configObj = config as Config;
  const result = validateUnifiedConfig(configObj);

  // snake_caseは完全に廃止されたため、変換は不要
  const allErrors = [...errors, ...result.errors];
  return { valid: result.valid && errors.length === 0, errors: allErrors };
}

export function mergeConfig(baseConfig: Config, updates: Partial<Config>): Config {
  // バリデーションを実行
  const validation = validateConfig(updates);
  if (!validation.valid) {
    throw new Error(`Invalid config: ${validation.errors.join(", ")}`);
  }

  return { ...baseConfig, ...updates };
}

export function cloneConfig(config: Config): Config {
  return JSON.parse(JSON.stringify(config));
}

export function getPerKeyValue<T>(
  config: Config,
  key: string,
  perKeyRecord: Record<string, T> | undefined,
  defaultValue: T | undefined,
  fallbackValue: T,
): T {
  // キー別設定が存在する場合
  if (perKeyRecord && perKeyRecord[key] !== undefined) {
    return perKeyRecord[key];
  }

  // デフォルト値が設定されている場合
  if (defaultValue !== undefined) {
    return defaultValue;
  }

  // フォールバック値を使用
  return fallbackValue;
}


export interface DeprecationWarning {
  property: string;
  replacement: string;
  message: string;
}

export interface NamingValidation {
  followsConvention: boolean;
  hasConfigSuffix: boolean;
  hasManagerSuffix: boolean;
  hasBooleanPrefix: boolean;
}


export function createModernConfig(input: Partial<Config> = {}): Config {
  return createMinimalConfig(input);
}

export function validateNamingConvention(name: string): NamingValidation {
  const hasConfigSuffix = name.endsWith("Config");
  const hasManagerSuffix = name.endsWith("Manager");
  const hasBooleanPrefix = /^(is|has|should)[A-Z]/.test(name);

  const followsConvention = hasConfigSuffix || hasManagerSuffix || hasBooleanPrefix;

  return {
    followsConvention,
    hasConfigSuffix,
    hasManagerSuffix,
    hasBooleanPrefix,
  };
}

export function getDeprecationWarnings(
  config: Partial<Config>,
): DeprecationWarning[] {
  return [];
}

export interface ValidationRules {
  type?: "string" | "number" | "boolean" | "array" | "object";
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  enum?: readonly (string | number | boolean)[];
  custom?: (value: unknown) => boolean;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function isValidType(value: unknown, expectedType: string): boolean {
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

export function isInRange(value: number, min?: number, max?: number): boolean {
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

export function isValidLength(value: string, minLength?: number, maxLength?: number): boolean {
  if (minLength !== undefined && value.length < minLength) return false;
  if (maxLength !== undefined && value.length > maxLength) return false;
  return true;
}

export function isValidArrayLength(array: unknown[], minLength?: number, maxLength?: number): boolean {
  if (minLength !== undefined && array.length < minLength) return false;
  if (maxLength !== undefined && array.length > maxLength) return false;
  return true;
}

export function isValidEnum(value: unknown, validValues: readonly (string | number | boolean)[]): boolean {
  return validValues.includes(value as string | number | boolean);
}

export function validateConfigValue(
  key: string,
  value: unknown,
  rules: {
    type?: string;
    required?: boolean;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    enum?: readonly (string | number | boolean)[];
    custom?: (value: unknown) => boolean;
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

  // 数値の範囲チェック（型ガードで型を絞り込む）
  if (rules.type === "number" && typeof value === "number") {
    if (!isInRange(value, rules.min, rules.max)) {
      const minStr = rules.min !== undefined ? `min: ${rules.min}` : "";
      const maxStr = rules.max !== undefined ? `max: ${rules.max}` : "";
      const rangeStr = [minStr, maxStr].filter(s => s).join(", ");
      return { valid: false, error: `${key} is out of range (${rangeStr})` };
    }
  }

  // 文字列の長さチェック（型ガードで型を絞り込む）
  if (rules.type === "string" && typeof value === "string") {
    if (!isValidLength(value, rules.minLength, rules.maxLength)) {
      const minStr = rules.minLength !== undefined ? `min: ${rules.minLength}` : "";
      const maxStr = rules.maxLength !== undefined ? `max: ${rules.maxLength}` : "";
      const lengthStr = [minStr, maxStr].filter(s => s).join(", ");
      return { valid: false, error: `${key} length is invalid (${lengthStr})` };
    }
  }

  // 配列の要素数チェック（型ガードで型を絞り込む）
  if (rules.type === "array" && Array.isArray(value)) {
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

export function validateConfigObject(
  config: Record<string, unknown>,
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
