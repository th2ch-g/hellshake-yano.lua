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
 * Hellshake-Yano Vimプラグインの全機能にアクセスするためのメインインターフェース
 */
export interface HellshakeYanoAPI {
  // 基本制御

  /**
   * プラグインを有効化します
   * @example
   * ```typescript
   * api.enable();
   * ```
   */
  enable(): void;

  /**
   * プラグインを無効化します
   * @example
   * ```typescript
   * api.disable();
   * ```
   */
  disable(): void;

  /**
   * プラグインの有効/無効を切り替えます
   * @returns 切り替え後の有効状態（true: 有効, false: 無効）
   * @example
   * ```typescript
   * const isEnabled = api.toggle();
   * console.log(`Plugin is now ${isEnabled ? 'enabled' : 'disabled'}`);
   * ```
   */
  toggle(): boolean;

  /**
   * プラグインの現在の有効状態を取得します
   * @returns プラグインが有効かどうか（true: 有効, false: 無効）
   * @example
   * ```typescript
   * if (api.isEnabled()) {
   *   console.log('Plugin is active');
   * }
   * ```
   */
  isEnabled(): boolean;

  // 設定管理

  /**
   * 現在の設定を取得します
   * @returns 現在の設定のコピー（変更しても元の設定には影響しません）
   * @example
   * ```typescript
   * const config = api.getConfig();
   * console.log(`Timeout: ${config.timeout}ms`);
   * ```
   */
  getConfig(): Config;

  /**
   * 設定を更新します
   * @param config - 更新する設定項目（部分的な更新が可能）
   * @throws {Error} 無効な設定が指定された場合
   * @example
   * ```typescript
   * api.updateConfig({
   *   timeout: 5000,
   *   highlightColor: 'yellow'
   * });
   * ```
   */
  updateConfig(config: Partial<Config>): void;

  /**
   * 設定をデフォルト値にリセットします
   * @example
   * ```typescript
   * api.resetConfig();
   * ```
   */
  resetConfig(): void;

  /**
   * ヒント表示の文字数を設定します
   * @param count - 表示する文字数
   * @example
   * ```typescript
   * api.setCount(3); // 3文字のヒントを表示
   * ```
   */
  setCount(count: number): void;

  /**
   * タイムアウト時間を設定します
   * @param timeout - タイムアウト時間（ミリ秒）
   * @example
   * ```typescript
   * api.setTimeout(3000); // 3秒のタイムアウト
   * ```
   */
  setTimeout(timeout: number): void;

  // ライフサイクル

  /**
   * プラグインを初期化します
   * @param denops - Denopsインスタンス
   * @param options - 初期化オプション（オプショナル）
   * @returns 初期化完了のPromise
   * @throws {Error} 初期化に失敗した場合
   * @example
   * ```typescript
   * await api.initialize(denops, { debug: true });
   * ```
   */
  initialize(denops: Denops, options?: any): Promise<void>;

  /**
   * プラグインをクリーンアップします
   * @param denops - Denopsインスタンス
   * @returns クリーンアップ完了のPromise
   * @throws {Error} クリーンアップに失敗した場合
   * @example
   * ```typescript
   * await api.cleanup(denops);
   * ```
   */
  cleanup(denops: Denops): Promise<void>;

  // デバッグ・統計

  /**
   * デバッグ情報を取得します
   * @returns 設定、状態、キャッシュ統計を含むデバッグ情報
   * @example
   * ```typescript
   * const debugInfo = api.getDebugInfo();
   * console.log('Current config:', debugInfo.config);
   * console.log('Cache stats:', debugInfo.cacheStats);
   * ```
   */
  getDebugInfo(): any;

  /**
   * プラグインの統計情報を取得します
   * @returns 統計情報オブジェクト
   * @example
   * ```typescript
   * const stats = api.getStatistics();
   * console.log('Plugin statistics:', stats);
   * ```
   */
  getStatistics(): any;

  /**
   * プラグインのヘルスチェックを実行します
   * @param denops - Denopsインスタンス
   * @returns ヘルスチェック結果のPromise
   * @throws {Error} ヘルスチェックに失敗した場合
   * @example
   * ```typescript
   * const health = await api.healthCheck(denops);
   * console.log('Health status:', health.status);
   * ```
   */
  healthCheck(denops: Denops): Promise<any>;

  // ヒント制御

  /**
   * ヒントを表示します
   * @param denops - Denopsインスタンス
   * @returns ヒント表示完了のPromise
   * @throws {Error} ヒント表示に失敗した場合
   * @example
   * ```typescript
   * await api.showHints(denops);
   * ```
   */
  showHints(denops: Denops): Promise<void>;

  /**
   * ヒントを非表示にします
   * @param denops - Denopsインスタンス
   * @returns ヒント非表示完了のPromise
   * @throws {Error} ヒント非表示に失敗した場合
   * @example
   * ```typescript
   * await api.hideHints(denops);
   * ```
   */
  hideHints(denops: Denops): Promise<void>;

  /**
   * キャッシュをクリアします
   * @example
   * ```typescript
   * api.clearCache(); // 単語キャッシュとヒントキャッシュをクリア
   * ```
   */
  clearCache(): void;
}

/**
 * メインAPIクラスの実装
 * HellshakeYanoAPIインターフェースの具体的な実装を提供します
 */
export class HellshakeYanoAPIImpl implements HellshakeYanoAPI {
  /** プラグインの設定 */
  private config: Config;
  /** コマンドファクトリーインスタンス */
  private commandFactory: CommandFactory;

  /**
   * HellshakeYanoAPIImplのインスタンスを作成します
   * @param initialConfig - 初期設定（省略時はデフォルト設定を使用）
   * @example
   * ```typescript
   * // デフォルト設定で作成
   * const api = new HellshakeYanoAPIImpl();
   *
   * // カスタム設定で作成
   * const customApi = new HellshakeYanoAPIImpl({
   *   enabled: true,
   *   timeout: 3000,
   *   highlightColor: 'red'
   * });
   * ```
   */
  constructor(initialConfig: Config = getDefaultConfig()) {
    this.config = initialConfig;
    this.commandFactory = new CommandFactory(this.config);
  }

  // 基本制御

  /**
   * プラグインを有効化します
   * 内部的にコマンドモジュールのenable関数を呼び出します
   */
  enable(): void {
    enable(this.config);
  }

  /**
   * プラグインを無効化します
   * 内部的にコマンドモジュールのdisable関数を呼び出します
   */
  disable(): void {
    disable(this.config);
  }

  /**
   * プラグインの有効/無効を切り替えます
   * @returns 切り替え後の有効状態（true: 有効, false: 無効）
   */
  toggle(): boolean {
    return toggle(this.config);
  }

  /**
   * プラグインの現在の有効状態を取得します
   * @returns プラグインが有効かどうか（true: 有効, false: 無効）
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  // 設定管理

  /**
   * 現在の設定を取得します
   * @returns 現在の設定のコピー（元の設定オブジェクトは変更されません）
   */
  getConfig(): Config {
    return { ...this.config };
  }

  /**
   * 設定を更新します
   * @param updates - 更新する設定項目（部分的な更新が可能）
   * @throws {Error} 無効な設定が指定された場合、バリデーションエラーメッセージを含む
   */
  updateConfig(updates: Partial<Config>): void {
    const validation = validateConfig(updates);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(", ")}`);
    }

    this.config = mergeConfig(this.config, updates);
  }

  /**
   * 設定をデフォルト値にリセットします
   * CommandFactoryインスタンスも新しい設定で再作成されます
   */
  resetConfig(): void {
    this.config = getDefaultConfig();
    this.commandFactory = new CommandFactory(this.config);
  }

  /**
   * ヒント表示の文字数を設定します
   * @param count - 表示する文字数
   */
  setCount(count: number): void {
    setCount(this.config, count);
  }

  /**
   * タイムアウト時間を設定します
   * @param timeout - タイムアウト時間（ミリ秒）
   */
  setTimeout(timeout: number): void {
    setTimeoutCommand(this.config, timeout);
  }

  // ライフサイクル

  /**
   * プラグインを初期化します
   * @param denops - Denopsインスタンス
   * @param options - 初期化オプション（省略可能、デフォルト: {}）
   * @returns 初期化完了のPromise
   * @throws {Error} 初期化処理でエラーが発生した場合
   */
  async initialize(denops: Denops, options: any = {}): Promise<void> {
    await initializePlugin(denops, { config: this.config, ...options });
  }

  /**
   * プラグインをクリーンアップします
   * @param denops - Denopsインスタンス
   * @returns クリーンアップ完了のPromise
   * @throws {Error} クリーンアップ処理でエラーが発生した場合
   */
  async cleanup(denops: Denops): Promise<void> {
    await cleanupPlugin(denops);
  }

  // デバッグ・統計

  /**
   * デバッグ情報を取得します
   * @returns 現在の設定、プラグイン状態、キャッシュ統計を含むデバッグ情報オブジェクト
   * @returns {Object} debugInfo
   * @returns {Config} debugInfo.config - 現在の設定
   * @returns {Object} debugInfo.state - プラグインの状態情報
   * @returns {boolean} debugInfo.state.initialized - 初期化状態
   * @returns {boolean} debugInfo.state.hintsVisible - ヒント表示状態
   * @returns {number} debugInfo.state.currentHintsCount - 現在のヒント数
   * @returns {Object} debugInfo.cacheStats - キャッシュ統計情報
   */
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

  /**
   * プラグインの統計情報を取得します
   * ライフサイクルモジュールのgetPluginStatistics関数を呼び出します
   * @returns プラグインの統計情報オブジェクト
   */
  getStatistics(): any {
    return getPluginStatistics();
  }

  /**
   * プラグインのヘルスチェックを実行します
   * @param denops - Denopsインスタンス
   * @returns ヘルスチェック結果のPromise
   * @throws {Error} ヘルスチェック実行中にエラーが発生した場合
   */
  async healthCheck(denops: Denops): Promise<any> {
    return await healthCheck(denops);
  }

  // ヒント制御（スタブ実装）

  /**
   * ヒントを表示します
   * @param denops - Denopsインスタンス
   * @returns ヒント表示完了のPromise
   * @throws {Error} 現在はスタブ実装のため、常にエラーをスローします
   * @todo 既存のmain.tsから実装を移行する予定
   */
  async showHints(denops: Denops): Promise<void> {
    // 実際の実装は既存のmain.tsから移行予定
    throw new Error("showHints not yet implemented in modular architecture");
  }

  /**
   * ヒントを非表示にします
   * @param denops - Denopsインスタンス
   * @returns ヒント非表示完了のPromise
   * @throws {Error} 現在はスタブ実装のため、常にエラーをスローします
   * @todo 既存のmain.tsから実装を移行する予定
   */
  async hideHints(denops: Denops): Promise<void> {
    // 実際の実装は既存のmain.tsから移行予定
    throw new Error("hideHints not yet implemented in modular architecture");
  }

  /**
   * キャッシュをクリアします
   * 単語キャッシュとヒントキャッシュの両方をクリアします
   */
  clearCache(): void {
    const state = getPluginState();
    state.caches.words.clear();
    state.caches.hints.clear();
  }
}

/**
 * シングルトンAPIインスタンス
 * アプリケーション全体で単一のAPIインスタンスを保持するために使用
 */
let apiInstance: HellshakeYanoAPIImpl | null = null;

/**
 * APIインスタンスを取得（シングルトンパターン）
 * 初回呼び出し時にインスタンスを作成し、以降は同じインスタンスを返します
 * @param config - 初期設定（初回作成時のみ使用、省略時はデフォルト設定を使用）
 * @returns HellshakeYanoAPIImplのシングルトンインスタンス
 * @example
 * ```typescript
 * // デフォルト設定でAPIを取得
 * const api = getAPI();
 *
 * // カスタム設定でAPIを取得（初回のみ有効）
 * const api = getAPI({
 *   enabled: true,
 *   timeout: 3000,
 *   highlightColor: 'red'
 * });
 *
 * // 2回目以降の呼び出しでは既存インスタンスを返す
 * const sameApi = getAPI(); // 初回と同じインスタンス
 * ```
 */
export function getAPI(config?: Config): HellshakeYanoAPIImpl {
  if (!apiInstance) {
    apiInstance = new HellshakeYanoAPIImpl(config);
  }
  return apiInstance;
}


/**
 * 型エクスポート（再エクスポート）
 * 他のモジュールから重要な型定義を再エクスポートして、APIの利用者が
 * 必要な型にアクセスしやすくします
 */
export type { Config, HighlightColor } from "./config.ts";
export type { PluginController, ConfigManager } from "./commands.ts";
export type { PluginState, InitializationOptions } from "./lifecycle.ts";
export type { LRUCache, CacheStatistics } from "./utils/cache.ts";

/**
 * 全モジュールの再エクスポート（便利関数）
 * 各モジュール全体を名前空間として再エクスポートし、
 * 詳細な機能にアクセスする必要がある場合に使用します
 * @example
 * ```typescript
 * import { ConfigModule, CommandsModule } from './api.ts';
 *
 * // 設定モジュールの詳細機能にアクセス
 * const defaultConfig = ConfigModule.getDefaultConfig();
 * const validation = ConfigModule.validateConfig(config);
 *
 * // コマンドモジュールの詳細機能にアクセス
 * const factory = new CommandsModule.CommandFactory(config);
 * ```
 */
export * as ConfigModule from "./config.ts";
export * as CommandsModule from "./commands.ts";
export * as LifecycleModule from "./lifecycle.ts";
export * as CacheModule from "./utils/cache.ts";
export * as ValidationModule from "./utils/validation.ts";