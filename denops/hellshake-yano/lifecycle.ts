/**
 * 初期化・終了処理モジュール
 * Phase 1: モジュール分割でライフサイクル管理を分離
 */

import type { Denops } from "@denops/std";
import type { Config } from "./config.ts";
import { getDefaultConfig, mergeConfig } from "./config.ts";
import { LRUCache } from "./utils/cache.ts";

/**
 * プラグインの初期化状態
 */
export interface PluginState {
  initialized: boolean;
  extmarkNamespace?: number;
  fallbackMatchIds: number[];
  currentHints: any[];
  hintsVisible: boolean;
  debounceTimeoutId?: number;
  lastShowHintsTime: number;
  caches: {
    words: LRUCache<string, any>;
    hints: LRUCache<string, string[]>;
  };
  performanceMetrics: {
    showHints: number[];
    hideHints: number[];
    wordDetection: number[];
    hintGeneration: number[];
  };
}

/**
 * プラグインの初期化オプション
 */
export interface InitializationOptions {
  config?: Partial<Config>;
  cacheSizes?: {
    words?: number;
    hints?: number;
  };
  enablePerformanceMetrics?: boolean;
}

/**
 * プラグイン状態の管理クラス
 */
export class PluginStateManager {
  private state: PluginState;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): PluginState {
    return {
      initialized: false,
      fallbackMatchIds: [],
      currentHints: [],
      hintsVisible: false,
      lastShowHintsTime: 0,
      caches: {
        words: new LRUCache<string, any>(100),
        hints: new LRUCache<string, string[]>(50),
      },
      performanceMetrics: {
        showHints: [],
        hideHints: [],
        wordDetection: [],
        hintGeneration: [],
      },
    };
  }

  getState(): PluginState {
    return this.state;
  }

  updateState(updates: Partial<PluginState>): void {
    Object.assign(this.state, updates);
  }

  resetState(): void {
    this.state = this.createInitialState();
  }

  isInitialized(): boolean {
    return this.state.initialized;
  }

  setInitialized(initialized: boolean): void {
    this.state.initialized = initialized;
  }
}

// グローバル状態マネージャー
const globalStateManager = new PluginStateManager();

/**
 * プラグインを初期化する
 */
export async function initializePlugin(
  denops: Denops,
  options: InitializationOptions = {}
): Promise<PluginState> {
  try {
    const state = globalStateManager.getState();

    // 既に初期化済みの場合は何もしない
    if (globalStateManager.isInitialized()) {
      return state;
    }

    // Neovimの場合のみextmarkのnamespaceを作成
    if (denops.meta.host === "nvim") {
      const extmarkNamespace = await denops.call(
        "nvim_create_namespace",
        "hellshake_yano_hints",
      ) as number;

      globalStateManager.updateState({ extmarkNamespace });
    }

    // キャッシュサイズの設定
    if (options.cacheSizes) {
      const { words: wordsSize = 100, hints: hintsSize = 50 } = options.cacheSizes;
      state.caches.words = new LRUCache<string, any>(wordsSize);
      state.caches.hints = new LRUCache<string, string[]>(hintsSize);
    }

    // パフォーマンスメトリクスの初期化
    if (options.enablePerformanceMetrics) {
      globalStateManager.updateState({
        performanceMetrics: {
          showHints: [],
          hideHints: [],
          wordDetection: [],
          hintGeneration: [],
        },
      });
    }

    // 初期化完了フラグを設定
    globalStateManager.setInitialized(true);

    return globalStateManager.getState();
  } catch (error) {
    throw new Error(`Failed to initialize plugin: ${error instanceof Error ? error.message : String(error)}`);
  }
}


/**
 * プラグインをクリーンアップ（終了処理）
 */
export async function cleanupPlugin(denops: Denops): Promise<void> {
  try {
    const state = globalStateManager.getState();

    // デバウンスタイムアウトをクリア
    if (state.debounceTimeoutId) {
      clearTimeout(state.debounceTimeoutId);
    }

    // ヒントが表示されている場合は非表示にする
    if (state.hintsVisible) {
      await hideAllHints(denops);
    }

    // キャッシュをクリア
    state.caches.words.clear();
    state.caches.hints.clear();

    // 状態をリセット
    globalStateManager.resetState();

  } catch (error) {
    throw new Error(`Failed to cleanup plugin: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * ヒントを非表示にする内部関数
 */
async function hideAllHints(denops: Denops): Promise<void> {
  const state = globalStateManager.getState();

  try {
    // Neovimの場合：extmarkを削除
    if (denops.meta.host === "nvim" && state.extmarkNamespace !== undefined) {
      await denops.call("nvim_buf_clear_namespace", 0, state.extmarkNamespace, 0, -1);
    }

    // Vimまたはフォールバック：matchdeleteでハイライトを削除
    if (state.fallbackMatchIds.length > 0) {
      for (const id of state.fallbackMatchIds) {
        try {
          await denops.call("matchdelete", id);
        } catch {
          // ハイライトが既に削除されている場合は無視
        }
      }
      state.fallbackMatchIds.length = 0;
    }

    // 状態を更新
    globalStateManager.updateState({
      hintsVisible: false,
      currentHints: [],
    });

  } catch (error) {
    throw new Error(`Failed to hide hints: ${error instanceof Error ? error.message : String(error)}`);
  }
}


/**
 * 現在のプラグイン状態を取得
 */
export function getPluginState(): PluginState {
  return globalStateManager.getState();
}

/**
 * プラグイン状態を部分更新
 */
export function updatePluginState(updates: Partial<PluginState>): void {
  globalStateManager.updateState(updates);
}

/**
 * プラグインの健全性チェック
 */
export async function healthCheck(denops: Denops): Promise<{
  healthy: boolean;
  issues: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];

  try {
    const state = globalStateManager.getState();

    // 初期化チェック
    if (!globalStateManager.isInitialized()) {
      issues.push("Plugin is not initialized");
    }

    // Neovimでextmarkが利用可能かチェック
    if (denops.meta.host === "nvim") {
      if (state.extmarkNamespace === undefined) {
        issues.push("Extmark namespace is not created");
        recommendations.push("Try reinitializing the plugin");
      }
    }

    // キャッシュ統計をチェック
    const wordsStats = state.caches.words.getStatistics();
    const hintsStats = state.caches.hints.getStatistics();

    if (wordsStats.hitRate < 0.3 && wordsStats.hits + wordsStats.misses > 100) {
      recommendations.push("Word detection cache hit rate is low, consider increasing cache size");
    }

    if (hintsStats.hitRate < 0.5 && hintsStats.hits + hintsStats.misses > 50) {
      recommendations.push("Hints cache hit rate is low, consider increasing cache size");
    }

    // パフォーマンスメトリクスをチェック
    const { showHints } = state.performanceMetrics;
    if (showHints.length > 0) {
      const avgTime = showHints.reduce((a, b) => a + b, 0) / showHints.length;
      if (avgTime > 100) {
        recommendations.push("Average hint display time is high (>100ms), consider optimizing");
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
      recommendations,
    };

  } catch (error) {
    issues.push(`Health check failed: ${error instanceof Error ? error.message : String(error)}`);
    return {
      healthy: false,
      issues,
      recommendations,
    };
  }
}

/**
 * プラグインの統計情報を取得
 */
export function getPluginStatistics(): {
  cacheStats: {
    words: any;
    hints: any;
  };
  performanceStats: {
    showHints: { count: number; average: number; max: number; min: number };
    hideHints: { count: number; average: number; max: number; min: number };
    wordDetection: { count: number; average: number; max: number; min: number };
    hintGeneration: { count: number; average: number; max: number; min: number };
  };
  currentState: {
    initialized: boolean;
    hintsVisible: boolean;
    currentHintsCount: number;
  };
} {
  const state = globalStateManager.getState();

  const calculateStats = (times: number[]) => {
    if (times.length === 0) {
      return { count: 0, average: 0, max: 0, min: 0 };
    }
    return {
      count: times.length,
      average: times.reduce((a, b) => a + b, 0) / times.length,
      max: Math.max(...times),
      min: Math.min(...times),
    };
  };

  return {
    cacheStats: {
      words: state.caches.words.getStatistics(),
      hints: state.caches.hints.getStatistics(),
    },
    performanceStats: {
      showHints: calculateStats(state.performanceMetrics.showHints),
      hideHints: calculateStats(state.performanceMetrics.hideHints),
      wordDetection: calculateStats(state.performanceMetrics.wordDetection),
      hintGeneration: calculateStats(state.performanceMetrics.hintGeneration),
    },
    currentState: {
      initialized: globalStateManager.isInitialized(),
      hintsVisible: state.hintsVisible,
      currentHintsCount: state.currentHints.length,
    },
  };
}