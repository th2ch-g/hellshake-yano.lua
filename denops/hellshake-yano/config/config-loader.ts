/**
 * config-loader.ts
 * YAML設定ファイルローダー
 *
 * 外部設定ファイルを読み込んでTypeScriptオブジェクトに変換します。
 */

import { parse as parseYaml } from "https://deno.land/std@0.224.0/yaml/mod.ts";
import { join, dirname, fromFileUrl } from "https://deno.land/std@0.224.0/path/mod.ts";

/**
 * 文字範囲設定
 */
export interface CharacterRanges {
  cjk_ranges: number[][];
  emoji_ranges: number[][];
  latin_math_symbol_ranges: number[][];
  valid_symbols: string[];
  ascii_range: {
    start: number;
    end: number;
  };
}

/**
 * ヒントキー設定
 */
export interface HintKeys {
  default_markers: string;
  default_single_char_keys: string;
  default_multi_char_keys: string;
  numeric_keys: {
    home_row: string;
    top_row: string;
  };
  key_groups: {
    home_position: {
      left_hand: string;
      right_hand: string;
    };
    top_row: string;
    middle_row: string;
    bottom_row: string;
  };
  recommended: {
    single_char_max: number;
    multi_char_max: number;
    numeric_enabled: boolean;
  };
}

/**
 * 日本語パターン設定
 */
export interface JapanesePatterns {
  japanese_particles: string[];
  japanese_auxiliary_verbs: string[];
  japanese_special_chars: {
    iteration_marks: string[];
    punctuation: string[];
  };
  merge_settings: {
    particles_enabled: boolean;
    threshold: number;
    max_merge_count: number;
  };
  tinysegmenter: {
    enabled: boolean;
    cache_size: number;
    threshold: number;
  };
}

/**
 * 設定キャッシュ
 */
class ConfigCache {
  private static characterRanges?: CharacterRanges;
  private static hintKeys?: HintKeys;
  private static japanesePatterns?: JapanesePatterns;

  static getCharacterRanges(): CharacterRanges | undefined {
    return this.characterRanges;
  }

  static setCharacterRanges(config: CharacterRanges): void {
    this.characterRanges = config;
  }

  static getHintKeys(): HintKeys | undefined {
    return this.hintKeys;
  }

  static setHintKeys(config: HintKeys): void {
    this.hintKeys = config;
  }

  static getJapanesePatterns(): JapanesePatterns | undefined {
    return this.japanesePatterns;
  }

  static setJapanesePatterns(config: JapanesePatterns): void {
    this.japanesePatterns = config;
  }

  static clear(): void {
    this.characterRanges = undefined;
    this.hintKeys = undefined;
    this.japanesePatterns = undefined;
  }
}

/**
 * 設定ファイルのベースディレクトリを取得
 */
function getConfigDir(): string {
  const currentFile = import.meta.url;
  return dirname(fromFileUrl(currentFile));
}

/**
 * YAMLファイルを読み込んでパースする
 */
async function loadYamlFile<T>(filename: string): Promise<T> {
  const configDir = getConfigDir();
  const filepath = join(configDir, filename);

  try {
    const content = await Deno.readTextFile(filepath);
    const parsed = parseYaml(content) as T;
    return parsed;
  } catch (error) {
    console.error(`Failed to load config file: ${filepath}`, error);
    throw new Error(`Config file not found or invalid: ${filename}`);
  }
}

/**
 * 文字範囲設定を読み込む
 */
export async function loadCharacterRanges(): Promise<CharacterRanges> {
  const cached = ConfigCache.getCharacterRanges();
  if (cached) return cached;

  const config = await loadYamlFile<CharacterRanges>("character-ranges.yml");
  ConfigCache.setCharacterRanges(config);
  return config;
}

/**
 * ヒントキー設定を読み込む
 */
export async function loadHintKeys(): Promise<HintKeys> {
  const cached = ConfigCache.getHintKeys();
  if (cached) return cached;

  const config = await loadYamlFile<HintKeys>("hint-keys.yml");
  ConfigCache.setHintKeys(config);
  return config;
}

/**
 * 日本語パターン設定を読み込む
 */
export async function loadJapanesePatterns(): Promise<JapanesePatterns> {
  const cached = ConfigCache.getJapanesePatterns();
  if (cached) return cached;

  const config = await loadYamlFile<JapanesePatterns>("japanese-patterns.yml");
  ConfigCache.setJapanesePatterns(config);
  return config;
}

/**
 * すべての設定を読み込む
 */
export async function loadAllConfigs(): Promise<{
  characterRanges: CharacterRanges;
  hintKeys: HintKeys;
  japanesePatterns: JapanesePatterns;
}> {
  const [characterRanges, hintKeys, japanesePatterns] = await Promise.all([
    loadCharacterRanges(),
    loadHintKeys(),
    loadJapanesePatterns(),
  ]);

  return {
    characterRanges,
    hintKeys,
    japanesePatterns,
  };
}

/**
 * 設定キャッシュをクリア
 */
export function clearConfigCache(): void {
  ConfigCache.clear();
}

/**
 * 同期的に文字範囲設定を取得（キャッシュのみ）
 */
export function getCharacterRangesSync(): CharacterRanges | undefined {
  return ConfigCache.getCharacterRanges();
}

/**
 * 同期的にヒントキー設定を取得（キャッシュのみ）
 */
export function getHintKeysSync(): HintKeys | undefined {
  return ConfigCache.getHintKeys();
}

/**
 * 同期的に日本語パターン設定を取得（キャッシュのみ）
 */
export function getJapanesePatternsSync(): JapanesePatterns | undefined {
  return ConfigCache.getJapanesePatterns();
}
