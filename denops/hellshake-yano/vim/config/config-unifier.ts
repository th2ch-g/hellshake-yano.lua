/**
 * denops/hellshake-yano/vim/config/config-unifier.ts
 *
 * ConfigUnifier - VimScript設定とTypeScript設定の統合
 *
 * 目的:
 *   - VimScript版（g:hellshake_yano_vim_config）の設定を読み取り
 *   - TypeScript版のConfig型に変換
 *   - キー名の変換（hint_chars → markers等）
 *   - デフォルト値の適用
 *
 * 参照: autoload/hellshake_yano_vim/config.vim
 * 参照: denops/hellshake-yano/config.ts
 * Process: phase-2, process11
 */

import type { Denops } from "@denops/std";

/**
 * 統合設定の型定義
 *
 * VimScript版とDenops版の設定を統合した型
 */
export interface UnifiedConfig {
  enabled: boolean;
  markers: string[]; // VimScript: hint_chars → markers
  motionCount: number; // VimScript: motion_threshold → motionCount
  motionTimeout: number; // VimScript: motion_timeout_ms → motionTimeout
  maxHints: number; // VimScript: max_hints → maxHints
  useJapanese: boolean; // VimScript: use_japanese → useJapanese
  minWordLength: number; // VimScript: min_word_length → minWordLength
  visualModeEnabled: boolean; // VimScript: visual_mode_enabled → visualModeEnabled
  excludeNumbers: boolean; // VimScript: exclude_numbers → excludeNumbers
  debugMode: boolean; // VimScript: debug_mode → debugMode
}

/**
 * VimScript設定キーからTypeScript設定キーへのマッピング
 */
const CONFIG_MAP: Record<string, string> = {
  enabled: "enabled",
  hint_chars: "markers",
  motion_threshold: "motionCount",
  motion_timeout_ms: "motionTimeout",
  max_hints: "maxHints",
  use_japanese: "useJapanese",
  min_word_length: "minWordLength",
  visual_mode_enabled: "visualModeEnabled",
  exclude_numbers: "excludeNumbers",
  debug_mode: "debugMode",
};

/**
 * デフォルト統合設定
 */
const DEFAULT_UNIFIED_CONFIG: UnifiedConfig = {
  enabled: true,
  markers: "ASDFJKL".split(""),
  motionCount: 2,
  motionTimeout: 2000,
  maxHints: 49,
  useJapanese: false,
  minWordLength: 1,
  visualModeEnabled: true,
  excludeNumbers: false,
  debugMode: false,
};

/**
 * 設定値の変換関数の型定義
 */
type ConfigConverter = (value: unknown) => unknown;

/**
 * ConfigUnifierクラス
 *
 * VimScript設定とTypeScript設定を統合する
 */
export class ConfigUnifier {
  /**
   * VimScript設定キーから TypeScript設定キーへの変換と型変換を定義
   */
  private static readonly CONVERTER_MAP: Record<string, ConfigConverter> = {
    enabled: (v) => v as boolean,
    markers: (v) => typeof v === "string" ? v.split("") : (v as string[]),
    motionCount: (v) => v as number,
    motionTimeout: (v) => v as number,
    maxHints: (v) => v as number,
    useJapanese: (v) => v as boolean,
    minWordLength: (v) => v as number,
    visualModeEnabled: (v) => v as boolean,
    excludeNumbers: (v) => v as boolean,
    debugMode: (v) => v as boolean,
  };

  constructor(private denops: Denops) {}

  /**
   * VimScript設定を読み取り、TypeScript設定に変換
   *
   * @returns 統合設定
   */
  async unify(): Promise<UnifiedConfig> {
    // デフォルト設定から開始
    const config: UnifiedConfig = { ...DEFAULT_UNIFIED_CONFIG };

    // VimScript設定が存在するか確認
    const exists = await this.denops.call(
      "exists",
      "g:hellshake_yano_vim_config",
    ) as number;

    if (!exists) {
      // 設定が存在しない場合はデフォルトを返す
      return config;
    }

    // VimScript設定を取得
    const vimConfig = await this.denops.eval(
      "g:hellshake_yano_vim_config",
    ) as Record<string, unknown>;

    // 各設定項目を変換
    for (const [vimKey, tsKey] of Object.entries(CONFIG_MAP)) {
      if (vimKey in vimConfig) {
        const converter = ConfigUnifier.CONVERTER_MAP[tsKey];
        if (converter) {
          const value = converter(vimConfig[vimKey]);
          this.applyConfigValue(config, tsKey as keyof UnifiedConfig, value);
        }
      }
    }

    return config;
  }

  /**
   * 設定値を適用する（型安全なアプローチ）
   */
  private applyConfigValue(
    config: UnifiedConfig,
    key: keyof UnifiedConfig,
    value: unknown,
  ): void {
    // 各キーに対して型チェック付きで値を適用
    switch (key) {
      case "markers":
        config.markers = Array.isArray(value)
          ? (value as string[])
          : typeof value === "string"
          ? value.split("")
          : config.markers;
        break;
      case "enabled":
      case "useJapanese":
      case "visualModeEnabled":
      case "excludeNumbers":
      case "debugMode":
        if (typeof value === "boolean") {
          config[key] = value;
        }
        break;
      case "motionCount":
      case "motionTimeout":
      case "maxHints":
      case "minWordLength":
        if (typeof value === "number") {
          config[key] = value;
        }
        break;
    }
  }
}
