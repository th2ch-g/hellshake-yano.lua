/**
 * コマンド処理モジュール
 */

import type { Denops } from "@denops/std";
import type { Config } from "./config.ts";

/**
 * プラグインの有効/無効を制御するインターフェース
 * プラグインの状態管理を行うメソッドを定義します。
 *
 * @interface PluginController
 * @example
 * ```typescript
 * const controller: PluginController = new HellshakeYanoController(config);
 * controller.enable();
 * if (controller.isEnabled()) {
 *   console.log('プラグインが有効化されています');
 * }
 * ```
 */
export interface PluginController {
  /**
   * プラグインを有効化します
   * @returns {void}
   */
  enable(): void;

  /**
   * プラグインを無効化します
   * @returns {void}
   */
  disable(): void;

  /**
   * プラグインの有効/無効を切り替えます
   * @returns {boolean} 切り替え後の状態（true: 有効, false: 無効）
   */
  toggle(): boolean;

  /**
   * プラグインが現在有効かどうかを確認します
   * @returns {boolean} true: 有効, false: 無効
   */
  isEnabled(): boolean;
}

/**
 * 設定管理インターフェース
 * プラグインの設定値を管理するメソッドを定義します。
 *
 * @interface ConfigManager
 * @example
 * ```typescript
 * const manager: ConfigManager = new HellshakeYanoConfigManager(config);
 * manager.setCount(5);
 * manager.setTimeout(3000);
 * const currentConfig = manager.getConfig();
 * ```
 */
export interface ConfigManager {
  /**
   * モーション回数を設定します
   * @param {number} count 正の整数のモーション回数
   * @throws {Error} countが正の整数でない場合
   * @returns {void}
   */
  setCount(count: number): void;

  /**
   * モーションタイムアウト時間を設定します
   * @param {number} timeout 100以上の整数のタイムアウト時間（ミリ秒）
   * @throws {Error} timeoutが100未満の整数でない場合
   * @returns {void}
   */
  setTimeout(timeout: number): void;

  /**
   * 現在の設定のコピーを取得します
   * @returns {Config} 現在の設定のディープコピー
   */
  getConfig(): Config;

  /**
   * 設定を部分的に更新します
   * @param {Partial<Config>} newConfig 更新する設定値
   * @returns {void}
   */
  updateConfig(newConfig: Partial<Config>): void;
}

/**
 * プラグインコントローラーの実装
 * PluginControllerインターフェースを実装し、プラグインの状態管理を行います。
 *
 * @class HellshakeYanoController
 * @implements {PluginController}
 * @example
 * ```typescript
 * const config = getDefaultConfig();
 * const controller = new HellshakeYanoController(config);
 * controller.enable();
 * console.log(controller.isEnabled()); // true
 * ```
 */
export class HellshakeYanoController implements PluginController {
  /**
   * HellshakeYanoControllerのコンストラクタ
   * @param {Config} config プラグインの設定オブジェクト
   */
  constructor(private config: Config) {}

  /**
   * プラグインを有効化します
   * config.enabledをtrueに設定します。
   *
   * @returns {void}
   * @example
   * ```typescript
   * controller.enable();
   * console.log(controller.isEnabled()); // true
   * ```
   */
  enable(): void {
    this.config.enabled = true;
  }

  /**
   * プラグインを無効化します
   * config.enabledをfalseに設定します。
   *
   * @returns {void}
   * @example
   * ```typescript
   * controller.disable();
   * console.log(controller.isEnabled()); // false
   * ```
   */
  disable(): void {
    this.config.enabled = false;
  }

  /**
   * プラグインの有効/無効を切り替えます
   * 現在の状態を反転させ、新しい状態を返します。
   *
   * @returns {boolean} 切り替え後の状態（true: 有効, false: 無効）
   * @example
   * ```typescript
   * const newState = controller.toggle();
   * console.log(`プラグインは${newState ? '有効' : '無効'}です`);
   * ```
   */
  toggle(): boolean {
    this.config.enabled = !this.config.enabled;
    return this.config.enabled;
  }

  /**
   * プラグインが現在有効かどうかを確認します
   *
   * @returns {boolean} プラグインの状態（true: 有効, false: 無効）
   * @example
   * ```typescript
   * if (controller.isEnabled()) {
   *   console.log('プラグインが動作中です');
   * }
   * ```
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}

/**
 * 設定マネージャーの実装
 * ConfigManagerインターフェースを実装し、設定値の管理を行います。
 *
 * @class HellshakeYanoConfigManager
 * @implements {ConfigManager}
 * @example
 * ```typescript
 * const config = getDefaultConfig();
 * const manager = new HellshakeYanoConfigManager(config);
 * manager.setCount(5);
 * manager.setTimeout(3000);
 * ```
 */
export class HellshakeYanoConfigManager implements ConfigManager {
  /**
   * HellshakeYanoConfigManagerのコンストラクタ
   * @param {Config} config プラグインの設定オブジェクト
   */
  constructor(private config: Config) {}

  /**
   * motion_countを設定します
   * 指定された値が正の整数でない場合はエラーをスローします。
   *
   * @param {number} count 設定するモーション回数（正の整数）
   * @throws {Error} countが正の整数でない場合
   * @returns {void}
   * @example
   * ```typescript
   * manager.setCount(5); // motion_countが5に設定される
   * manager.setCount(-1); // Error: count must be a positive integer
   * ```
   */
  setCount(count: number): void {
    if (!Number.isInteger(count) || count <= 0) {
      throw new Error("count must be a positive integer");
    }
    this.config.motion_count = count;
  }

  /**
   * motion_timeoutを設定します
   * 指定された値が100未満の整数の場合はエラーをスローします。
   *
   * @param {number} timeout 設定するタイムアウト時間（100以上の整数、ミリ秒）
   * @throws {Error} timeoutが100未満の整数でない場合
   * @returns {void}
   * @example
   * ```typescript
   * manager.setTimeout(2000); // motion_timeoutが2000msに設定される
   * manager.setTimeout(50); // Error: timeout must be an integer >= 100ms
   * ```
   */
  setTimeout(timeout: number): void {
    if (!Number.isInteger(timeout) || timeout < 100) {
      throw new Error("timeout must be an integer >= 100ms");
    }
    this.config.motion_timeout = timeout;
  }

  /**
   * 現在の設定のコピーを取得します
   * 設定オブジェクトのディープコピーを返すため、返された設定を変更しても元の設定には影響しません。
   *
   * @returns {Config} 現在の設定のディープコピー
   * @example
   * ```typescript
   * const currentConfig = manager.getConfig();
   * console.log(currentConfig.motion_count); // 現在のモーション回数
   * ```
   */
  getConfig(): Config {
    return { ...this.config };
  }

  /**
   * 設定を部分的に更新します
   * 既存の設定値を保持しながら、指定された設定値のみを更新します。
   *
   * @param {Partial<Config>} newConfig 更新する設定値のオブジェクト
   * @returns {void}
   * @example
   * ```typescript
   * manager.updateConfig({ motion_count: 10, enabled: false });
   * // motion_countが10に、enabledがfalseに更新される
   * ```
   */
  updateConfig(newConfig: Partial<Config>): void {
    Object.assign(this.config, newConfig);
  }
}

/**
 * デバッグ機能のコントローラー
 * プラグインのデバッグ関連設定を管理するクラスです。
 * デバッグモード、パフォーマンスログ、座標デバッグの切り替えを行います。
 *
 * @class DebugController
 * @example
 * ```typescript
 * const config = getDefaultConfig();
 * const debugController = new DebugController(config);
 * debugController.toggleDebugMode();
 * ```
 */
export class DebugController {
  /**
   * DebugControllerのコンストラクタ
   * @param {Config} config プラグインの設定オブジェクト
   */
  constructor(private config: Config) {}

  /**
   * デバッグモードを切り替えます
   * 現在のデバッグモードを反転させ、新しい状態を返します。
   *
   * @returns {boolean} 切り替え後のデバッグモード状態（true: 有効, false: 無効）
   * @example
   * ```typescript
   * const isDebugEnabled = debugController.toggleDebugMode();
   * console.log(`デバッグモードは${isDebugEnabled ? '有効' : '無効'}です`);
   * ```
   */
  toggleDebugMode(): boolean {
    this.config.debug_mode = !this.config.debug_mode;
    return this.config.debug_mode;
  }

  /**
   * パフォーマンスログを切り替えます
   * 現在のパフォーマンスログ設定を反転させ、新しい状態を返します。
   *
   * @returns {boolean} 切り替え後のパフォーマンスログ状態（true: 有効, false: 無効）
   * @example
   * ```typescript
   * const isPerfLogEnabled = debugController.togglePerformanceLog();
   * console.log(`パフォーマンスログは${isPerfLogEnabled ? '有効' : '無効'}です`);
   * ```
   */
  togglePerformanceLog(): boolean {
    this.config.performance_log = !this.config.performance_log;
    return this.config.performance_log;
  }

  /**
   * 座標デバッグを切り替えます
   * 現在の座標デバッグ設定を反転させ、新しい状態を返します。
   *
   * @returns {boolean} 切り替え後の座標デバッグ状態（true: 有効, false: 無効）
   * @example
   * ```typescript
   * const isCoordDebugEnabled = debugController.toggleCoordinateDebug();
   * console.log(`座標デバッグは${isCoordDebugEnabled ? '有効' : '無効'}です`);
   * ```
   */
  toggleCoordinateDebug(): boolean {
    this.config.debug_coordinates = !this.config.debug_coordinates;
    return this.config.debug_coordinates;
  }
}

/**
 * コマンドファクトリー - 各種コントローラーを生成
 * プラグイン、設定、デバッグの各コントローラーを一元管理するファクトリークラスです。
 * 単一の設定オブジェクトから必要なコントローラーインスタンスを生成・提供します。
 *
 * @class CommandFactory
 * @example
 * ```typescript
 * const config = getDefaultConfig();
 * const factory = new CommandFactory(config);
 * const controller = factory.getController();
 * const configManager = factory.getConfigManager();
 * const debugController = factory.getDebugController();
 * ```
 */
export class CommandFactory {
  private controller: HellshakeYanoController;
  private configManager: HellshakeYanoConfigManager;
  private debugController: DebugController;

  /**
   * CommandFactoryのコンストラクタ
   * 指定された設定オブジェクトを使用して各種コントローラーを初期化します。
   *
   * @param {Config} config プラグインの設定オブジェクト
   */
  constructor(config: Config) {
    this.controller = new HellshakeYanoController(config);
    this.configManager = new HellshakeYanoConfigManager(config);
    this.debugController = new DebugController(config);
  }

  /**
   * プラグインコントローラーを取得します
   * @returns {HellshakeYanoController} プラグインの状態を管理するコントローラー
   */
  getController(): HellshakeYanoController {
    return this.controller;
  }

  /**
   * 設定マネージャーを取得します
   * @returns {HellshakeYanoConfigManager} プラグインの設定を管理するマネージャー
   */
  getConfigManager(): HellshakeYanoConfigManager {
    return this.configManager;
  }

  /**
   * デバッグコントローラーを取得します
   * @returns {DebugController} プラグインのデバッグ設定を管理するコントローラー
   */
  getDebugController(): DebugController {
    return this.debugController;
  }
}

// 単純なコマンド関数をエクスポート（後方互換性のため）

/**
 * プラグインを有効化する関数
 * 後方互換性のために残された単純なコマンド関数です。
 * 新しい実装では HellshakeYanoController.enable() を使用することを推奨します。
 *
 * @param {Config} config プラグインの設定オブジェクト
 * @returns {void}
 * @example
 * ```typescript
 * const config = getDefaultConfig();
 * enable(config);
 * console.log(config.enabled); // true
 * ```
 */
export function enable(config: Config): void {
  config.enabled = true;
}

/**
 * プラグインを無効化する関数
 * 後方互換性のために残された単純なコマンド関数です。
 * 新しい実装では HellshakeYanoController.disable() を使用することを推奨します。
 *
 * @param {Config} config プラグインの設定オブジェクト
 * @returns {void}
 * @example
 * ```typescript
 * const config = getDefaultConfig();
 * disable(config);
 * console.log(config.enabled); // false
 * ```
 */
export function disable(config: Config): void {
  config.enabled = false;
}

/**
 * プラグインの有効/無効を切り替える関数
 * 現在の状態を反転させ、新しい状態を返します。
 * 後方互換性のために残された単純なコマンド関数です。
 * 新しい実装では HellshakeYanoController.toggle() を使用することを推奨します。
 *
 * @param {Config} config プラグインの設定オブジェクト
 * @returns {boolean} 切り替え後の状態（true: 有効, false: 無効）
 * @example
 * ```typescript
 * const config = getDefaultConfig();
 * const newState = toggle(config);
 * console.log(`プラグインは${newState ? '有効' : '無効'}です`);
 * ```
 */
export function toggle(config: Config): boolean {
  config.enabled = !config.enabled;
  return config.enabled;
}

/**
 * motion_countを設定する関数
 * 指定された値が正の整数でない場合はエラーをスローします。
 * 後方互換性のために残された単純なコマンド関数です。
 * 新しい実装では HellshakeYanoConfigManager.setCount() を使用することを推奨します。
 *
 * @param {Config} config プラグインの設定オブジェクト
 * @param {number} count 設定するモーション回数（正の整数）
 * @throws {Error} countが正の整数でない場合
 * @returns {void}
 * @example
 * ```typescript
 * const config = getDefaultConfig();
 * setCount(config, 5);
 * console.log(config.motion_count); // 5
 *
 * setCount(config, -1); // Error: count must be a positive integer
 * ```
 */
export function setCount(config: Config, count: number): void {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error("count must be a positive integer");
  }
  config.motion_count = count;
}

/**
 * motion_timeoutを設定する関数
 * 指定された値が100未満の整数の場合はエラーをスローします。
 * 後方互換性のために残された単純なコマンド関数です。
 * 新しい実装では HellshakeYanoConfigManager.setTimeout() を使用することを推奨します。
 *
 * @param {Config} config プラグインの設定オブジェクト
 * @param {number} timeout 設定するタイムアウト時間（100以上の整数、ミリ秒）
 * @throws {Error} timeoutが100未満の整数でない場合
 * @returns {void}
 * @example
 * ```typescript
 * const config = getDefaultConfig();
 * setTimeout(config, 2000);
 * console.log(config.motion_timeout); // 2000
 *
 * setTimeout(config, 50); // Error: timeout must be an integer >= 100ms
 * ```
 */
export function setTimeout(config: Config, timeout: number): void {
  if (!Number.isInteger(timeout) || timeout < 100) {
    throw new Error("timeout must be an integer >= 100ms");
  }
  config.motion_timeout = timeout;
}

/**
 * 設定を安全に更新する関数
 * オプションでバリデーション関数を指定して設定値を検証できます。
 * バリデーションに失敗した場合、元の設定は変更されずにエラーがスローされます。
 *
 * @param {Config} config プラグインの設定オブジェクト
 * @param {Partial<Config>} updates 更新する設定値
 * @param {function} [validator] 設定値を検証する関数（オプション）
 * @throws {Error} バリデーションが失敗した場合
 * @returns {void}
 * @example
 * ```typescript
 * const config = getDefaultConfig();
 * const validator = (updates) => {
 *   const errors = [];
 *   if (updates.motion_count && updates.motion_count <= 0) {
 *     errors.push('motion_count must be positive');
 *   }
 *   return { valid: errors.length === 0, errors };
 * };
 *
 * updateConfigSafely(config, { motion_count: 5 }, validator);
 * updateConfigSafely(config, { motion_count: -1 }, validator); // Error
 * ```
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
 * 設定を更新し、必要に応じて元の値に戻すことができるrollback関数を返します。
 * トランザクション的な設定更新に便利です。
 *
 * @param {Config} config プラグインの設定オブジェクト
 * @param {Partial<Config>} updates 更新する設定値
 * @returns {{ rollback: () => void }} ロールバック関数を含むオブジェクト
 * @example
 * ```typescript
 * const config = getDefaultConfig();
 * const originalCount = config.motion_count;
 *
 * const { rollback } = updateConfigWithRollback(config, {
 *   motion_count: 10,
 *   enabled: false
 * });
 *
 * console.log(config.motion_count); // 10
 * rollback();
 * console.log(config.motion_count); // 元の値に戻る
 * ```
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
 * 複数の設定更新関数を順次実行し、いずれかでエラーが発生した場合は
 * 全ての変更を元に戻します（all-or-nothing 動作）。
 *
 * @param {Config} config プラグインの設定オブジェクト
 * @param {Array<(config: Config) => void>} updateFunctions 設定更新関数の配列
 * @throws {Error} いずれかの更新関数でエラーが発生した場合（この場合設定は元に戻される）
 * @returns {void}
 * @example
 * ```typescript
 * const config = getDefaultConfig();
 *
 * const updateFunctions = [
 *   (cfg) => cfg.motion_count = 5,
 *   (cfg) => cfg.motion_timeout = 3000,
 *   (cfg) => cfg.enabled = false
 * ];
 *
 * batchUpdateConfig(config, updateFunctions);
 * // 全ての更新が成功した場合のみ設定が反映される
 *
 * const errorFunctions = [
 *   (cfg) => cfg.motion_count = 5,
 *   (cfg) => { throw new Error('Update failed'); },
 *   (cfg) => cfg.enabled = false // この関数は実行されない
 * ];
 *
 * try {
 *   batchUpdateConfig(config, errorFunctions);
 * } catch (error) {
 *   // config は元の状態に戻っている
 * }
 * ```
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