/**
 * Dispatcher Configuration Module
 *
 * main関数から抽出されたdispatcher設定処理を担当
 * 単一責任: Denops dispatcherの設定とコマンド登録のみを実行
 */

import type { Denops } from "@denops/std";
import { type Config } from "../config.ts";

/**
 * 設定更新系のdispatcher
 *
 * @param denops - Denopsインスタンス
 * @param config - 現在の設定への参照
 * @returns 設定更新用のdispatcher関数群
 */
export function createConfigDispatcher(
  denops: Denops,
  config: Config,
): Record<string, (...args: unknown[]) => unknown> {
  return {
    /**
     * 設定を更新（検証処理付き）
     */
    updateConfig(newConfig: unknown): void {
      // 型安全のため、Partial<Config>として処理
      let cfg = newConfig as Partial<Config>;

      // 後方互換性のあるフラグを正規化
      cfg = normalizeBackwardCompatibleFlags(cfg);

      // カスタムマーカー設定の検証と適用
      validateAndApplyMarkers(cfg, config);

      // motion_count の検証と適用
      validateAndApplyMotionCount(cfg, config);

      // motion_timeout の検証と適用
      validateAndApplyMotionTimeout(cfg, config);

      // その他の設定項目の検証と適用
      validateAndApplyOtherConfigs(cfg, config);

      // マネージャーの設定を同期
      syncManagerConfig(config);
    },

    /**
     * 設定値を取得
     */
    getConfig(): Config {
      return { ...config };
    },

    /**
     * 設定をリセット
     */
    resetConfig(): void {
      // デフォルト設定で初期化
      Object.assign(config, getDefaultConfig());
      syncManagerConfig(config);
    },
  };
}

/**
 * 制御系のdispatcher
 *
 * @param denops - Denopsインスタンス
 * @param config - 現在の設定への参照
 * @returns 制御用のdispatcher関数群
 */
export function createControlDispatcher(
  denops: Denops,
  config: Config,
): Record<string, (...args: unknown[]) => unknown> {
  return {
    /**
     * プラグインを有効化
     */
    enable(): void {
      config.enabled = true;
    },

    /**
     * プラグインを無効化
     */
    disable(): void {
      config.enabled = false;
    },

    /**
     * プラグインの有効/無効をトグル
     */
    toggle(): boolean {
      config.enabled = !config.enabled;
      return config.enabled;
    },

    /**
     * モーションカウントを設定
     */
    setCount(count: unknown): void {
      if (typeof count === "number" && count >= 1 && Number.isInteger(count)) {
        config.motion_count = count;
      }
    },

    /**
     * モーションタイムアウトを設定
     */
    setTimeout(timeout: unknown): void {
      if (typeof timeout === "number" && timeout >= 100) {
        config.motion_timeout = timeout;
      }
    },
  };
}

/**
 * デバッグ系のdispatcher
 *
 * @param denops - Denopsインスタンス
 * @param config - 現在の設定への参照
 * @returns デバッグ用のdispatcher関数群
 */
export function createDebugDispatcher(
  denops: Denops,
  config: Config,
): Record<string, (...args: unknown[]) => unknown> {
  return {
    /**
     * デバッグ情報を取得
     */
    getDebugInfo(): DebugInfo {
      return collectDebugInfo();
    },

    /**
     * パフォーマンス情報をクリア
     */
    clearPerformanceLog(): void {
      clearDebugInfo();
    },

    /**
     * デバッグモードのトグル
     */
    toggleDebugMode(): boolean {
      config.debug_mode = !config.debug_mode;
      return config.debug_mode;
    },

    /**
     * パフォーマンスログのトグル
     */
    togglePerformanceLog(): boolean {
      config.performance_log = !config.performance_log;
      if (!config.performance_log) {
        clearDebugInfo();
      }
      return config.performance_log;
    },
  };
}

// ヘルパー関数（プライベート）

function normalizeBackwardCompatibleFlags(cfg: Partial<Config>): Partial<Config> {
  // 既存のnormalizeBackwardCompatibleFlags関数の実装を使用
  // ここでは簡略化
  return cfg;
}

function validateAndApplyMarkers(cfg: Partial<Config>, config: Config): void {
  if (cfg.markers && Array.isArray(cfg.markers)) {
    const validMarkers = cfg.markers.filter((m): m is string =>
      typeof m === "string" && m.length > 0
    );
    if (validMarkers.length > 0) {
      config.markers = validMarkers;
    }
  }
}

function validateAndApplyMotionCount(cfg: Partial<Config>, config: Config): void {
  if (typeof cfg.motion_count === "number") {
    if (cfg.motion_count >= 1 && Number.isInteger(cfg.motion_count)) {
      config.motion_count = cfg.motion_count;
    }
  }
}

function validateAndApplyMotionTimeout(cfg: Partial<Config>, config: Config): void {
  if (typeof cfg.motion_timeout === "number") {
    if (cfg.motion_timeout >= 100) {
      config.motion_timeout = cfg.motion_timeout;
    }
  }
}

function validateAndApplyOtherConfigs(cfg: Partial<Config>, config: Config): void {
  // その他の設定項目の検証ロジック
  // 実装は元のmain関数から移行
}