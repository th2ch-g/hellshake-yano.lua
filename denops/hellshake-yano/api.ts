/**
 * 公開APIモジュール
 * Phase 1: モジュール分割でAPIエンドポイントを整理
 */

import type { Denops } from "@denops/std";
import type { Config, HighlightColor } from "./config.ts";
import { getDefaultConfig, validateConfig, mergeConfig } from "./config.ts";
import {
  enable,
  disable,
  toggle,
  setCount,
  setTimeout as setTimeoutCommand,
  CommandFactory
} from "./commands.ts";
import {
  initializePlugin,
  cleanupPlugin,
  getPluginState,
  healthCheck,
  getPluginStatistics
} from "./lifecycle.ts";

/**
 * プラグインの公開API
 */
export interface HellshakeYanoAPI {
  // 基本制御
  enable(): void;
  disable(): void;
  toggle(): boolean;
  isEnabled(): boolean;

  // 設定管理
  getConfig(): Config;
  updateConfig(config: Partial<Config>): void;
  resetConfig(): void;
  setCount(count: number): void;
  setTimeout(timeout: number): void;

  // ライフサイクル
  initialize(denops: Denops, options?: any): Promise<void>;
  cleanup(denops: Denops): Promise<void>;

  // デバッグ・統計
  getDebugInfo(): any;
  getStatistics(): any;
  healthCheck(denops: Denops): Promise<any>;

  // ヒント制御
  showHints(denops: Denops): Promise<void>;
  hideHints(denops: Denops): Promise<void>;
  clearCache(): void;
}

/**
 * メインAPIクラスの実装
 */
export class HellshakeYanoAPIImpl implements HellshakeYanoAPI {
  private config: Config;
  private commandFactory: CommandFactory;

  constructor(initialConfig: Config = getDefaultConfig()) {
    this.config = initialConfig;
    this.commandFactory = new CommandFactory(this.config);
  }

  // 基本制御
  enable(): void {
    enable(this.config);
  }

  disable(): void {
    disable(this.config);
  }

  toggle(): boolean {
    return toggle(this.config);
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  // 設定管理
  getConfig(): Config {
    return { ...this.config };
  }

  updateConfig(updates: Partial<Config>): void {
    const validation = validateConfig(updates);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(", ")}`);
    }

    this.config = mergeConfig(this.config, updates);
  }

  resetConfig(): void {
    this.config = getDefaultConfig();
    this.commandFactory = new CommandFactory(this.config);
  }

  setCount(count: number): void {
    setCount(this.config, count);
  }

  setTimeout(timeout: number): void {
    setTimeoutCommand(this.config, timeout);
  }

  // ライフサイクル
  async initialize(denops: Denops, options: any = {}): Promise<void> {
    await initializePlugin(denops, { config: this.config, ...options });
  }

  async cleanup(denops: Denops): Promise<void> {
    await cleanupPlugin(denops);
  }

  // デバッグ・統計
  getDebugInfo(): any {
    const state = getPluginState();
    return {
      config: this.config,
      state: {
        initialized: state.initialized,
        hintsVisible: state.hintsVisible,
        currentHintsCount: state.currentHints.length,
      },
      cacheStats: {
        words: state.caches.words.getStatistics(),
        hints: state.caches.hints.getStatistics(),
      },
    };
  }

  getStatistics(): any {
    return getPluginStatistics();
  }

  async healthCheck(denops: Denops): Promise<any> {
    return await healthCheck(denops);
  }

  // ヒント制御（スタブ実装）
  async showHints(denops: Denops): Promise<void> {
    // 実際の実装は既存のmain.tsから移行予定
    throw new Error("showHints not yet implemented in modular architecture");
  }

  async hideHints(denops: Denops): Promise<void> {
    // 実際の実装は既存のmain.tsから移行予定
    throw new Error("hideHints not yet implemented in modular architecture");
  }

  clearCache(): void {
    const state = getPluginState();
    state.caches.words.clear();
    state.caches.hints.clear();
  }
}

// シングルトンインスタンス
let apiInstance: HellshakeYanoAPIImpl | null = null;

/**
 * APIインスタンスを取得（シングルトンパターン）
 */
export function getAPI(config?: Config): HellshakeYanoAPIImpl {
  if (!apiInstance) {
    apiInstance = new HellshakeYanoAPIImpl(config);
  }
  return apiInstance;
}


// 型エクスポート（再エクスポート）
export type { Config, HighlightColor } from "./config.ts";
export type { PluginController, ConfigManager } from "./commands.ts";
export type { PluginState, InitializationOptions } from "./lifecycle.ts";
export type { LRUCache, CacheStatistics } from "./utils/cache.ts";

/**
 * 全モジュールの再エクスポート（便利関数）
 */
export * as ConfigModule from "./config.ts";
export * as CommandsModule from "./commands.ts";
export * as LifecycleModule from "./lifecycle.ts";
export * as CacheModule from "./utils/cache.ts";
export * as ValidationModule from "./utils/validation.ts";