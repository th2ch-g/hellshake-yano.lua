/**
 * コマンド処理モジュール
 * Phase 1: モジュール分割でmain.tsから分離
 */

import type { Denops } from "@denops/std";
import type { Config } from "./config.ts";

/**
 * プラグインの有効/無効を制御するインターフェース
 */
export interface PluginController {
  enable(): void;
  disable(): void;
  toggle(): boolean;
  isEnabled(): boolean;
}

/**
 * 設定管理インターフェース
 */
export interface ConfigManager {
  setCount(count: number): void;
  setTimeout(timeout: number): void;
  getConfig(): Config;
  updateConfig(newConfig: Partial<Config>): void;
}

/**
 * プラグインコントローラーの実装
 */
export class HellshakeYanoController implements PluginController {
  constructor(private config: Config) {}

  /**
   * プラグインを有効化
   */
  enable(): void {
    this.config.enabled = true;
  }

  /**
   * プラグインを無効化
   */
  disable(): void {
    this.config.enabled = false;
  }

  /**
   * プラグインの有効/無効を切り替え
   */
  toggle(): boolean {
    this.config.enabled = !this.config.enabled;
    return this.config.enabled;
  }

  /**
   * プラグインが有効かどうかをチェック
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}

/**
 * 設定マネージャーの実装
 */
export class HellshakeYanoConfigManager implements ConfigManager {
  constructor(private config: Config) {}

  /**
   * motion_countを設定
   */
  setCount(count: number): void {
    if (!Number.isInteger(count) || count <= 0) {
      throw new Error("count must be a positive integer");
    }
    this.config.motion_count = count;
  }

  /**
   * motion_timeoutを設定
   */
  setTimeout(timeout: number): void {
    if (!Number.isInteger(timeout) || timeout < 100) {
      throw new Error("timeout must be an integer >= 100ms");
    }
    this.config.motion_timeout = timeout;
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): Config {
    return { ...this.config };
  }

  /**
   * 設定を部分更新
   */
  updateConfig(newConfig: Partial<Config>): void {
    Object.assign(this.config, newConfig);
  }
}

/**
 * デバッグ機能のコントローラー
 */
export class DebugController {
  constructor(private config: Config) {}

  /**
   * デバッグモードを切り替え
   */
  toggleDebugMode(): boolean {
    this.config.debug_mode = !this.config.debug_mode;
    return this.config.debug_mode;
  }

  /**
   * パフォーマンスログを切り替え
   */
  togglePerformanceLog(): boolean {
    this.config.performance_log = !this.config.performance_log;
    return this.config.performance_log;
  }

  /**
   * 座標デバッグを切り替え
   */
  toggleCoordinateDebug(): boolean {
    this.config.debug_coordinates = !this.config.debug_coordinates;
    return this.config.debug_coordinates;
  }
}

/**
 * コマンドファクトリー - 各種コントローラーを生成
 */
export class CommandFactory {
  private controller: HellshakeYanoController;
  private configManager: HellshakeYanoConfigManager;
  private debugController: DebugController;

  constructor(config: Config) {
    this.controller = new HellshakeYanoController(config);
    this.configManager = new HellshakeYanoConfigManager(config);
    this.debugController = new DebugController(config);
  }

  getController(): HellshakeYanoController {
    return this.controller;
  }

  getConfigManager(): HellshakeYanoConfigManager {
    return this.configManager;
  }

  getDebugController(): DebugController {
    return this.debugController;
  }
}

// 単純なコマンド関数をエクスポート（後方互換性のため）

/**
 * プラグインを有効化する関数
 */
export function enable(config: Config): void {
  config.enabled = true;
}

/**
 * プラグインを無効化する関数
 */
export function disable(config: Config): void {
  config.enabled = false;
}

/**
 * プラグインの有効/無効を切り替える関数
 */
export function toggle(config: Config): boolean {
  config.enabled = !config.enabled;
  return config.enabled;
}

/**
 * motion_countを設定する関数
 */
export function setCount(config: Config, count: number): void {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error("count must be a positive integer");
  }
  config.motion_count = count;
}

/**
 * motion_timeoutを設定する関数
 */
export function setTimeout(config: Config, timeout: number): void {
  if (!Number.isInteger(timeout) || timeout < 100) {
    throw new Error("timeout must be an integer >= 100ms");
  }
  config.motion_timeout = timeout;
}

/**
 * 設定を安全に更新する関数
 */
export function updateConfigSafely(
  config: Config,
  updates: Partial<Config>,
  validator?: (config: Partial<Config>) => { valid: boolean; errors: string[] }
): void {
  if (validator) {
    const result = validator(updates);
    if (!result.valid) {
      throw new Error(`Configuration validation failed: ${result.errors.join(", ")}`);
    }
  }

  Object.assign(config, updates);
}

/**
 * 設定を元に戻す機能付きの更新関数
 */
export function updateConfigWithRollback(
  config: Config,
  updates: Partial<Config>
): { rollback: () => void } {
  const originalValues: Partial<Config> = {};

  // 変更される値をバックアップ
  for (const key in updates) {
    if (key in config) {
      const configKey = key as keyof Config;
      (originalValues as any)[configKey] = config[configKey];
    }
  }

  // 設定を更新
  Object.assign(config, updates);

  // ロールバック関数を返す
  return {
    rollback: () => {
      Object.assign(config, originalValues);
    },
  };
}

/**
 * バッチ設定更新（複数の設定変更をアトミックに実行）
 */
export function batchUpdateConfig(
  config: Config,
  updateFunctions: Array<(config: Config) => void>
): void {
  const backup = { ...config };

  try {
    updateFunctions.forEach(fn => fn(config));
  } catch (error) {
    // エラーが発生した場合は設定を元に戻す
    Object.assign(config, backup);
    throw error;
  }
}