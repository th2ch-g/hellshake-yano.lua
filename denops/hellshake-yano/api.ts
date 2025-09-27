/**
 * 公開APIモジュール
 *
 * process4 sub4-1: api.tsの機能をcore.tsに統合済み
 * 後方互換性のため、このファイルはcore.tsの機能を再エクスポートします
 */

import type { Denops } from "@denops/std";
import type { UnifiedConfig, HighlightColor } from "./config.ts";
import { getDefaultUnifiedConfig } from "./config.ts";
import { HellshakeYanoCore } from "./core.ts";

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
  getConfig(): UnifiedConfig;

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
  updateConfig(config: Partial<UnifiedConfig>): void;

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
 * process4 sub4-1: core.tsに移行済み、後方互換性のためのプロキシクラス
 */
export class HellshakeYanoAPIImpl implements HellshakeYanoAPI {
  /** core.tsのインスタンス */
  private core: HellshakeYanoCore;

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
  constructor(initialConfig: UnifiedConfig = getDefaultUnifiedConfig()) {
    this.core = new HellshakeYanoCore(initialConfig);
  }

  // 基本制御 - core.tsに委譲

  enable(): void {
    return this.core.enable();
  }

  disable(): void {
    return this.core.disable();
  }

  toggle(): boolean {
    return this.core.toggle();
  }

  isEnabled(): boolean {
    return this.core.isEnabled();
  }

  // 設定管理 - core.tsに委譲

  getConfig(): UnifiedConfig {
    return this.core.getConfig();
  }

  updateConfig(updates: Partial<UnifiedConfig>): void {
    return this.core.updateConfig(updates);
  }

  resetConfig(): void {
    return this.core.resetConfig();
  }

  setCount(count: number): void {
    return this.core.setCount(count);
  }

  setTimeout(timeout: number): void {
    return this.core.setTimeout(timeout);
  }

  // ライフサイクル - core.tsに委譲

  async initialize(denops: Denops, options: any = {}): Promise<void> {
    return await this.core.initialize(denops, options);
  }

  async cleanup(denops: Denops): Promise<void> {
    return await this.core.cleanup(denops);
  }

  // デバッグ・統計 - core.tsに委譲

  getDebugInfo(): any {
    return this.core.getDebugInfo();
  }

  getStatistics(): any {
    return this.core.getStatistics();
  }

  async healthCheck(denops: Denops): Promise<any> {
    return await this.core.healthCheck(denops);
  }

  // ヒント制御 - core.tsに委譲

  async showHints(denops: Denops): Promise<void> {
    return await this.core.showHints(denops);
  }

  async hideHints(denops: Denops): Promise<void> {
    return await this.core.hideHints(denops);
  }

  clearCache(): void {
    return this.core.clearCache();
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
export function getAPI(config?: UnifiedConfig): HellshakeYanoAPIImpl {
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
export type { UnifiedConfig, HighlightColor } from "./config.ts";

// process4 sub4-1完了: api.ts → core.ts統合
// 後方互換性を完全に維持しつつ、実装をcore.tsに委譲