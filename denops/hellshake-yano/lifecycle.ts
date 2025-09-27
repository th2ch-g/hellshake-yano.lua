/**
 * Hellshake-Yano プラグインライフサイクル管理モジュール
 *
 * @fileoverview プラグインの初期化から終了まで全てのライフサイクルを管理するモジュール
 *
 * @description このモジュールは以下の機能を提供します：
 * - プラグインの初期化と終了処理
 * - 状態管理（初期化状態、ヒント表示状態、キャッシュ状態）
 * - パフォーマンス監視（実行時間の計測と統計収集）
 * - 健全性チェック（設定、キャッシュ効率、パフォーマンス問題の検出）
 * - Vim/Neovim環境の違いを吸収した統一インターフェース
 *
 * @example モジュールの基本的な使用方法:
 * ```typescript
 * import { initializePlugin, cleanupPlugin, getPluginState } from './lifecycle.ts';
 *
 * // プラグイン初期化
 * const state = await initializePlugin(denops, {
 *   cacheSizes: { words: 200, hints: 100 },
 *   enablePerformanceMetrics: true
 * });
 *
 * // 状態確認
 * const currentState = getPluginState();
 * console.log('初期化済み:', currentState.initialized);
 *
 * // 終了処理
 * await cleanupPlugin(denops);
 * ```
 *
 * @version 1.0.0
 * @author hellshake-yano.vim team
 * @since Phase 1: モジュール分割でライフサイクル管理を分離
 */

import type { Denops } from "@denops/std";
import type { UnifiedConfig } from "./config.ts";
import { getDefaultUnifiedConfig } from "./config.ts";
import { LRUCache } from "./cache.ts";
import { UnifiedCache, CacheType } from "./cache.ts";

/**
 * プラグインの初期化状態を管理するインターフェース
 *
 * @description プラグインの実行時状態を一元的に管理し、
 * ヒント表示機能の制御とパフォーマンス監視を提供します。
 *
 * @example
 * ```typescript
 * const state: PluginState = {
 *   initialized: true,
 *   extmarkNamespace: 1,
 *   fallbackMatchIds: [],
 *   currentHints: [],
 *   hintsVisible: false,
 *   lastShowHintsTime: Date.now(),
 *   caches: {
 *     words: new LRUCache(100),
 *     hints: new LRUCache(50)
 *   },
 *   performanceMetrics: {
 *     showHints: [12.5, 8.3, 15.1],
 *     hideHints: [2.1, 1.8, 3.2],
 *     wordDetection: [5.4, 4.2, 6.1],
 *     hintGeneration: [8.7, 7.3, 9.2]
 *   }
 * };
 * ```
 */
export interface PluginState {
  /** プラグインが初期化済みかどうかを示すフラグ */
  initialized: boolean;
  /** Neovim用extmarkのネームスペースID（Neovim環境でのみ使用） */
  extmarkNamespace?: number;
  /** Vim用フォールバック実装で使用するマッチハイライトIDの配列 */
  fallbackMatchIds: number[];
  /** 現在表示中のヒントオブジェクトの配列 */
  currentHints: any[];
  /** ヒントが現在表示されているかどうかを示すフラグ */
  hintsVisible: boolean;
  /** デバウンス処理用のタイムアウトID */
  debounceTimeoutId?: number;
  /** 最後にヒントを表示した時刻（ミリ秒単位のタイムスタンプ） */
  lastShowHintsTime: number;
  /** パフォーマンス向上のためのキャッシュ群 (UnifiedCache統合) */
  caches: {
    /** 単語検出結果のキャッシュ (UnifiedCache.WORDS) */
    words: LRUCache<string, any>;
    /** ヒント生成結果のキャッシュ (UnifiedCache.HINTS) */
    hints: LRUCache<string, string[]>;
  };
  /** 各機能の実行時間を記録するパフォーマンスメトリクス */
  performanceMetrics: {
    /** ヒント表示処理の実行時間（ミリ秒）の履歴 */
    showHints: number[];
    /** ヒント非表示処理の実行時間（ミリ秒）の履歴 */
    hideHints: number[];
    /** 単語検出処理の実行時間（ミリ秒）の履歴 */
    wordDetection: number[];
    /** ヒント生成処理の実行時間（ミリ秒）の履歴 */
    hintGeneration: number[];
  };
}

/**
 * プラグインの初期化時に設定可能なオプション
 *
 * @description プラグインの動作をカスタマイズするための設定群。
 * すべてのオプションは省略可能で、未指定の場合はデフォルト値が使用されます。
 *
 * @example
 * ```typescript
 * const options: InitializationOptions = {
 *   config: {
 *     trigger: { key: 'f', modifier: null },
 *     ui: { hints: { style: 'overlay' } }
 *   },
 *   cacheSizes: {
 *     words: 200,  // デフォルトの100から増加
 *     hints: 100   // デフォルトの50から増加
 *   },
 *   enablePerformanceMetrics: true
 * };
 * await initializePlugin(denops, options);
 * ```
 */
export interface InitializationOptions {
  /** プラグインの設定オプション（部分的な設定が可能） */
  config?: Partial<UnifiedConfig>;
  /** キャッシュサイズの設定 */
  cacheSizes?: {
    /** 単語検出結果のキャッシュサイズ（デフォルト: 100） */
    words?: number;
    /** ヒント生成結果のキャッシュサイズ（デフォルト: 50） */
    hints?: number;
  };
  /** パフォーマンスメトリクスの収集を有効にするかどうか */
  enablePerformanceMetrics?: boolean;
}

/**
 * プラグイン状態の管理クラス
 *
 * @description プラグインのライフサイクル全体にわたって状態を一元管理し、
 * 初期化、更新、リセット機能を提供します。シングルトンパターンで実装され、
 * アプリケーション全体で一意の状態を保持します。
 *
 * @example
 * ```typescript
 * const manager = new PluginStateManager();
 *
 * // 状態の取得
 * const state = manager.getState();
 *
 * // 状態の更新
 * manager.updateState({ hintsVisible: true });
 *
 * // 初期化状態の確認
 * if (manager.isInitialized()) {
 *   console.log('プラグインは初期化済みです');
 * }
 *
 * // 状態のリセット
 * manager.resetState();
 * ```
 */
export class PluginStateManager {
  /** プラグインの内部状態 */
  private state: PluginState;

  /**
   * プラグイン状態管理クラスのコンストラクタ
   *
   * @description 初期状態を作成してプライベート変数に設定します。
   */
  constructor() {
    this.state = this.createInitialState();
  }

  /**
   * プラグインの初期状態を作成する
   *
   * @returns {PluginState} デフォルト値で初期化されたプラグイン状態
   *
   * @description 全ての状態フィールドをデフォルト値で初期化し、
   * 新しいLRUキャッシュインスタンスを作成します。
   */
  private createInitialState(): PluginState {
    return {
      initialized: false,
      fallbackMatchIds: [],
      currentHints: [],
      hintsVisible: false,
      lastShowHintsTime: 0,
      caches: {
        words: unifiedCacheInstance.getCache<string, any>(CacheType.WORDS),
        hints: unifiedCacheInstance.getCache<string, string[]>(CacheType.HINTS),
      },
      performanceMetrics: {
        showHints: [],
        hideHints: [],
        wordDetection: [],
        hintGeneration: [],
      },
    };
  }

  /**
   * 現在のプラグイン状態を取得する
   *
   * @returns {PluginState} 現在のプラグイン状態オブジェクト
   *
   * @description プラグインの内部状態への読み取り専用アクセスを提供します。
   * 状態を直接変更することは推奨されません。
   */
  getState(): PluginState {
    return this.state;
  }

  /**
   * プラグイン状態を部分的に更新する
   *
   * @param {Partial<PluginState>} updates 更新する状態フィールド
   *
   * @description 提供されたフィールドのみを現在の状態にマージし、
   * その他のフィールドは既存の値を保持します。
   *
   * @example
   * ```typescript
   * manager.updateState({
   *   hintsVisible: true,
   *   currentHints: ['hint1', 'hint2']
   * });
   * ```
   */
  updateState(updates: Partial<PluginState>): void {
    Object.assign(this.state, updates);
  }

  /**
   * プラグイン状態を初期状態にリセットする
   *
   * @description 現在の状態を完全に初期化し、新しい初期状態で置き換えます。
   * キャッシュ、パフォーマンスメトリクス、表示状態などすべてがクリアされます。
   */
  resetState(): void {
    this.state = this.createInitialState();
  }

  /**
   * プラグインが初期化済みかどうかを確認する
   *
   * @returns {boolean} 初期化済みの場合はtrue、未初期化の場合はfalse
   *
   * @description プラグインの初期化状態を安全に確認するためのメソッドです。
   */
  isInitialized(): boolean {
    return this.state.initialized;
  }

  /**
   * プラグインの初期化状態を設定する
   *
   * @param {boolean} initialized 設定する初期化状態
   *
   * @description プラグインの初期化フラグを明示的に設定します。
   * 通常は初期化処理の完了時にtrueを、終了処理時にfalseを設定します。
   */
  setInitialized(initialized: boolean): void {
    this.state.initialized = initialized;
  }
}

/**
 * UnifiedCacheインスタンスのキャッシュ (REFACTOR: パフォーマンス最適化)
 *
 * @description 頻繁なUnifiedCache.getInstance()呼び出しを最適化するため、
 * モジュールレベルでインスタンスをキャッシュします。
 */
const unifiedCacheInstance = UnifiedCache.getInstance();

/**
 * グローバルプラグイン状態マネージャーのインスタンス
 *
 * @description アプリケーション全体で共有される唯一のプラグイン状態管理インスタンス。
 * すべてのライフサイクル関数はこのインスタンスを通じて状態にアクセスします。
 */
const globalStateManager = new PluginStateManager();

/**
 * プラグインを初期化する
 *
 * @param {Denops} denops - Denopsインスタンス（Vim/Neovimとの通信用）
 * @param {InitializationOptions} [options={}] - 初期化オプション
 *
 * @returns {Promise<PluginState>} 初期化後のプラグイン状態
 *
 * @throws {Error} 初期化に失敗した場合
 *
 * @description プラグインの初期化を実行し、以下の処理を行います：
 * - 重複初期化の防止チェック
 * - Neovim環境でのextmarkネームスペース作成
 * - キャッシュサイズの設定
 * - パフォーマンスメトリクスの初期化
 * - 初期化フラグの設定
 *
 * @example
 * ```typescript
 * try {
 *   const state = await initializePlugin(denops, {
 *     cacheSizes: { words: 200, hints: 100 },
 *     enablePerformanceMetrics: true
 *   });
 *   console.log('プラグインが初期化されました:', state);
 * } catch (error) {
 *   console.error('初期化エラー:', error.message);
 * }
 * ```
 */
export async function initializePlugin(
  denops: Denops,
  options: InitializationOptions = {},
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

    // キャッシュサイズの設定 (UnifiedCache統合)
    // 注意: UnifiedCacheはシングルトンで初期化時にサイズが決まるため、
    // 現在の統合段階では動的サイズ変更をサポートしていない。
    // 必要に応じて将来のUnifiedCache機能拡張で対応予定。
    if (options.cacheSizes && (options.cacheSizes.words !== 1000 || options.cacheSizes.hints !== 500)) {
      console.warn("[lifecycle] Custom cache sizes will be supported in future UnifiedCache updates. Using configured defaults for now.");
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
    throw new Error(
      `Failed to initialize plugin: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * プラグインをクリーンアップ（終了処理）
 *
 * @param {Denops} denops - Denopsインスタンス（Vim/Neovimとの通信用）
 *
 * @returns {Promise<void>} クリーンアップ処理の完了を示すPromise
 *
 * @throws {Error} クリーンアップに失敗した場合
 *
 * @description プラグインの終了処理を実行し、以下の処理を行います：
 * - アクティブなデバウンスタイムアウトのクリア
 * - 表示中のヒントの非表示化
 * - すべてのキャッシュのクリア
 * - プラグイン状態の完全リセット
 *
 * @example
 * ```typescript
 * try {
 *   await cleanupPlugin(denops);
 *   console.log('プラグインがクリーンアップされました');
 * } catch (error) {
 *   console.error('クリーンアップエラー:', error.message);
 * }
 * ```
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

    // キャッシュをクリア (UnifiedCache統合)
    unifiedCacheInstance.clearByType(CacheType.WORDS);
    unifiedCacheInstance.clearByType(CacheType.HINTS);

    // 状態をリセット
    globalStateManager.resetState();
  } catch (error) {
    throw new Error(
      `Failed to cleanup plugin: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * ヒントを非表示にする内部関数
 *
 * @param {Denops} denops - Denopsインスタンス（Vim/Neovimとの通信用）
 *
 * @returns {Promise<void>} ヒント非表示処理の完了を示すPromise
 *
 * @throws {Error} ヒントの非表示化に失敗した場合
 *
 * @description 現在表示中の全てのヒントを非表示にします：
 * - Neovim: extmarkを使用したヒントを削除
 * - Vim: matchdeleteを使用したハイライトを削除
 * - 状態フラグの更新（hintsVisible: false）
 *
 * @private
 * @internal この関数は内部使用専用です
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
    throw new Error(
      `Failed to hide hints: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * 現在のプラグイン状態を取得
 *
 * @returns {PluginState} 現在のプラグイン状態オブジェクト
 *
 * @description グローバル状態管理インスタンスから現在のプラグイン状態を取得します。
 * この関数は状態への読み取り専用アクセスを提供し、デバッグや監視目的に使用されます。
 *
 * @example
 * ```typescript
 * const state = getPluginState();
 * console.log('初期化状態:', state.initialized);
 * console.log('ヒント表示状態:', state.hintsVisible);
 * console.log('キャッシュ統計:', {
 *   words: state.caches.words.getStatistics(),
 *   hints: state.caches.hints.getStatistics()
 * });
 * ```
 */
export function getPluginState(): PluginState {
  return globalStateManager.getState();
}

/**
 * プラグイン状態を部分更新
 *
 * @param {Partial<PluginState>} updates - 更新するプラグイン状態のフィールド
 *
 * @description プラグイン状態の指定されたフィールドのみを更新します。
 * 他のフィールドは既存の値を保持し、安全な部分更新を提供します。
 *
 * @example
 * ```typescript
 * // ヒントの表示状態を更新
 * updatePluginState({
 *   hintsVisible: true,
 *   currentHints: [{ text: 'a', line: 1, col: 5 }],
 *   lastShowHintsTime: Date.now()
 * });
 *
 * // デバウンスタイムアウトをクリア
 * updatePluginState({
 *   debounceTimeoutId: undefined
 * });
 * ```
 */
export function updatePluginState(updates: Partial<PluginState>): void {
  globalStateManager.updateState(updates);
}

/**
 * 指定されたキャッシュタイプをリセットする
 *
 * @param {CacheType[]} cacheTypes - リセットするキャッシュタイプの配列
 *
 * @description UnifiedCacheのclearByTypeメソッドを使用して、
 * 指定されたキャッシュタイプのみをクリアします。
 *
 * @example
 * ```typescript
 * // 単語キャッシュとヒントキャッシュをリセット
 * resetCaches([CacheType.WORDS, CacheType.HINTS]);
 *
 * // 全キャッシュをリセット
 * resetCaches([
 *   CacheType.WORDS,
 *   CacheType.HINTS,
 *   CacheType.DISPLAY,
 *   CacheType.ANALYSIS,
 *   CacheType.TEMP
 * ]);
 * ```
 */
export function resetCaches(cacheTypes: CacheType[]): void {
  for (const cacheType of cacheTypes) {
    unifiedCacheInstance.clearByType(cacheType);
  }
}

/**
 * プラグインの健全性チェックを実行する
 *
 * @param {Denops} denops - Denopsインスタンス（Vim/Neovimとの通信用）
 *
 * @returns {Promise<HealthCheckResult>} 健全性チェックの結果
 * @returns {Promise<{ healthy: boolean; issues: string[]; recommendations: string[]; }>} 健全性チェック結果オブジェクト
 *
 * @description プラグインの現在の状態を詳細に分析し、以下をチェックします：
 * - プラグインの初期化状態
 * - Neovim環境でのextmarkネームスペース
 * - キャッシュのヒット率とパフォーマンス
 * - ヒント表示の平均実行時間
 *
 * @example
 * ```typescript
 * const result = await healthCheck(denops);
 *
 * if (result.healthy) {
 *   console.log('プラグインは正常に動作しています');
 * } else {
 *   console.log('検出された問題:', result.issues);
 *   console.log('推奨される対策:', result.recommendations);
 * }
 * ```
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

    // キャッシュ統計をチェック (UnifiedCache統合)
    const unifiedStats = unifiedCacheInstance.getAllStats();

    const wordsStats = unifiedStats[CacheType.WORDS] || state.caches.words.getStatistics();
    const hintsStats = unifiedStats[CacheType.HINTS] || state.caches.hints.getStatistics();

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
 * プラグインの詳細統計情報を取得する
 *
 * @returns {PluginStatistics} プラグインの包括的な統計情報
 * @returns {{ cacheStats: object; performanceStats: object; currentState: object; }} 統計情報オブジェクト
 *
 * @description プラグインの動作状況を詳細に分析するための統計データを提供します：
 *
 * **キャッシュ統計:**
 * - ヒット率、ミス率、総アクセス数
 * - 単語検出キャッシュとヒント生成キャッシュの個別統計
 *
 * **パフォーマンス統計:**
 * - 各機能の実行時間（平均、最大、最小）
 * - 実行回数とパフォーマンストレンド
 *
 * **現在の状態:**
 * - 初期化状態、ヒント表示状態
 * - 現在表示中のヒント数
 *
 * @example
 * ```typescript
 * const stats = getPluginStatistics();
 *
 * console.log('キャッシュ効率:', {
 *   words: `${(stats.cacheStats.words.hitRate * 100).toFixed(1)}%`,
 *   hints: `${(stats.cacheStats.hints.hitRate * 100).toFixed(1)}%`
 * });
 *
 * console.log('平均実行時間:', {
 *   show: `${stats.performanceStats.showHints.average.toFixed(2)}ms`,
 *   hide: `${stats.performanceStats.hideHints.average.toFixed(2)}ms`
 * });
 *
 * console.log('現在の状態:', stats.currentState);
 * ```
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

  /**
   * パフォーマンスメトリクス配列から統計データを計算する内部関数
   *
   * @param {number[]} times - 実行時間の配列（ミリ秒単位）
   * @returns {object} 統計データオブジェクト
   * @returns {number} returns.count - 実行回数
   * @returns {number} returns.average - 平均実行時間
   * @returns {number} returns.max - 最大実行時間
   * @returns {number} returns.min - 最小実行時間
   *
   * @description 指定された実行時間配列から基本的な統計値を計算します。
   * 空の配列が渡された場合は、全ての値を0で初期化したオブジェクトを返します。
   *
   * @example
   * ```typescript
   * const times = [12.5, 8.3, 15.1, 9.7];
   * const stats = calculateStats(times);
   * // => { count: 4, average: 11.4, max: 15.1, min: 8.3 }
   * ```
   *
   * @private
   * @internal この関数はgetPluginStatistics内でのみ使用されます
   */
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

  // UnifiedCache統合: 統計情報をUnifiedCacheから取得
  const unifiedStats = unifiedCacheInstance.getAllStats();

  return {
    cacheStats: {
      // UnifiedCacheの統計情報を使用し、後方互換性を保持
      words: unifiedStats[CacheType.WORDS] || state.caches.words.getStatistics(),
      hints: unifiedStats[CacheType.HINTS] || state.caches.hints.getStatistics(),
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
