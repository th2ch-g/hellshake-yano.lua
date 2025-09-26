/**
 * @fileoverview Hellshake-Yano.vim プラグインのメインエントリーポイント
 *
 * このファイルは、Vim/Neovim用のヒント表示プラグインのコア機能を提供します。
 * 主な機能：
 * - グローバル設定とステート管理
 * - プラグインの初期化（main関数）
 * - 各種コマンドのディスパッチャーAPI
 * - パフォーマンス監視とデバッグ機能
 * - ヒントの表示・非表示機能
 * - 単語検出とヒント生成
 * - キャッシュ管理
 * - エラーハンドリングとリトライロジック
 *
 * @author Hellshake-Yano Team
 * @version 2.0.0
 * @since 1.0.0
 */

import type { Denops } from "@denops/std";
import {
  detectWords,
  detectWordsWithConfig,
  detectWordsWithManager,
  type EnhancedWordConfig,
  extractWordsFromLineWithConfig,
  extractWordsUnified,
  type UnifiedWordExtractionConfig,
} from "./word.ts";
import {
  getWordDetectionManager,
  resetWordDetectionManager,
  type WordDetectionManagerConfig,
} from "./word/manager.ts";
import {
  assignHintsToWords,
  calculateHintPosition,
  calculateHintPositionWithCoordinateSystem,
  clearHintCache,
  generateHints,
  generateHintsWithGroups,
  validateHintKeyConfig,
} from "./hint.ts";
// Dictionary system imports
import { DictionaryLoader } from "./word/dictionary-loader.ts";
import { VimConfigBridge } from "./word/dictionary-loader.ts";
// Core class import for Phase3 migration
import { Core } from "./core.ts";

// Phase7: 既存のcoreInstanceを使用
// Import types from the central types module for consistency
import type {
  Config,
  DebugInfo,
  HighlightColor,
  HintKeyConfig,
  HintMapping,
  HintPositionWithCoordinateSystem,
  PerformanceMetrics,
  Word,
} from "./types.ts";

// Re-export types for backward compatibility
export type { Config, HighlightColor };
import {
  fromUnifiedConfig,
  getDefaultUnifiedConfig,
  getPerKeyValue,
  mergeConfig,
  toUnifiedConfig,
  UnifiedConfig,
  validateConfig as validateConfigFromConfigModule,
  validateUnifiedConfig,
} from "./config.ts";
import {
  CommandFactory,
  disable,
  enable,
  setCount,
  setTimeout as setTimeoutCommand,
  toggle,
} from "./commands.ts";
import {
  cleanupPlugin,
  getPluginState,
  getPluginStatistics,
  healthCheck,
  initializePlugin,
  type PluginState,
  updatePluginState,
} from "./lifecycle.ts";
import { LRUCache } from "./utils/cache.ts";
import { validateConfigValue } from "./utils/validation.ts";

/**
 * プラグインのグローバル設定オブジェクト
 * すべての設定値とオプションを管理します。
 * Process2 Sub5: UnifiedConfig型に移行（camelCase統一）
 * @type {UnifiedConfig}
 * @since 1.0.0
 */
// deno-lint-ignore prefer-const
let config: UnifiedConfig = getDefaultUnifiedConfig();

/**
 * Phase10: Coreクラスのシングルトンパターン使用
 * Process3 Sub1 Phase10: 最終統合とクリーンアップ
 * Core.getInstance() を直接使用する
 * @since 2.0.0
 */
// Phase 10: シングルトンパターン採用により coreInstance 変数は不要

/**
 * 現在表示中のヒントマッピングの配列
 * @type {HintMapping[]}
 * @since 1.0.0
 */
let currentHints: HintMapping[] = [];

/**
 * ヒントが現在表示されているかどうかのフラグ
 * @type {boolean}
 * @since 1.0.0
 */
let hintsVisible = false;

/**
 * Neovimのextmark用ネームスペースID（Vimの場合はundefined）
 * Neovimでのハイライト表示に使用される名前空間の識別子
 * @type {number | undefined}
 * @since 1.0.0
 */
let extmarkNamespace: number | undefined;

/**
 * matchadd()のフォールバック用IDリスト
 * VimやNeovim extmarkが使用できない場合の代替手段として使用
 * @type {number[]}
 * @since 1.0.0
 */
let fallbackMatchIds: number[] = [];

/**
 * デバウンス用のタイムアウトID
 * ヒント表示/非表示の頻繁な切り替えを防ぐため
 * @type {number | undefined}
 * @since 1.0.0
 */
let debounceTimeoutId: number | undefined;

/**
 * 最後にヒントを表示した時刻（ミリ秒）
 * パフォーマンス測定とタイミング制御に使用
 * @type {number}
 * @since 1.0.0
 */
let lastShowHintsTime = 0;

/**
 * 単語検出結果のキャッシュ
 * 検出済みの単語情報を保存し、パフォーマンスを向上
 * @type {LRUCache<string, Word[]>}
 * @since 1.0.0
 */
const wordsCache = new LRUCache<string, Word[]>(100);

/**
 * ヒント生成結果のキャッシュ
 * 生成済みのヒント文字列を保存し、計算コストを削減
 * @type {LRUCache<string, string[]>}
 * @since 1.0.0
 */
const hintsCache = new LRUCache<string, string[]>(50);

/**
 * パフォーマンス測定結果を保持するインターフェース
 * 各操作の実行時間を配列形式で記録し、統計分析に利用
 * @interface
 * @since 1.0.0
 */
// PerformanceMetrics type moved to types.ts

/**
 * パフォーマンス測定結果を格納するグローバルオブジェクト
 * 最新50件の処理時間を保持し、メモリ使用量を制限
 * @type {PerformanceMetrics}
 * @since 1.0.0
 */
let performanceMetrics: PerformanceMetrics = {
  showHints: [],
  hideHints: [],
  wordDetection: [],
  hintGeneration: [],
};

/**
 * デバッグ情報を格納するインターフェース
 * プラグインの現在状態とパフォーマンス情報を包含
 * @interface
 * @since 1.0.0
 */
// DebugInfo type moved to types.ts

/**
 * パフォーマンス測定結果を記録する内部関数
 * 操作の実行時間を測定し、統計情報として蓄積
 *
 * Phase8: Coreクラスに移行済み
 *
 * @param operation 測定対象の操作名（PerformanceMetricsのキー）
 * @param startTime 操作開始時刻（ミリ秒、performance.now()の戻り値）
 * @param endTime 操作終了時刻（ミリ秒、performance.now()の戻り値）
 * @returns {void}
 * @since 1.0.0
 * @example
 * const start = performance.now();
 * // 何らかの処理
 * recordPerformance('showHints', start, performance.now());
 */
function recordPerformance(
  operation: keyof PerformanceMetrics,
  startTime: number,
  endTime: number,
): void {
  // Phase10: シングルトンインスタンスを使用
  const core = Core.getInstance(config);
  core.recordPerformance(operation, startTime, endTime);
}

/**
 * 指定されたキーに対する最小文字数を取得する
 * キー別の設定、デフォルト設定、後方互換設定の順に優先度を適用
 *
 * @param config プラグインの設定オブジェクト
 * @param key 対象のキー文字（例: 'f', 't', 'w'など）
 * @returns {number} そのキーに対応する最小文字数（デフォルト: 2）
 * @since 1.0.0
 * @example
 * const minLength = getMinLengthForKey(config, 'f');
 * // 'f'キーに対する最小文字数を取得（例: 3）
 */
export function getMinLengthForKey(config: UnifiedConfig | Config, key: string): number {
  // Config型の場合はUnifiedConfigに変換
  // Config型は motion_count を持ち、UnifiedConfig型は motionCount を持つ
  const unifiedConfig = "motionCount" in config
    ? config as UnifiedConfig
    : toUnifiedConfig(config as Config);
  // キー別設定が存在し、そのキーの設定があれば使用
  if (unifiedConfig.perKeyMinLength && unifiedConfig.perKeyMinLength[key] !== undefined) {
    return unifiedConfig.perKeyMinLength[key];
  }

  // defaultMinWordLength が設定されていれば使用
  if (unifiedConfig.defaultMinWordLength !== undefined) {
    return unifiedConfig.defaultMinWordLength;
  }

  // デフォルト値
  return 2;
}

/**
 * キー別motion_count設定を取得する
 * モーションに応じた動作回数の設定値を決定
 *
 * @param key 対象のキー文字（例: 'f', 't', 'w'など）
 * @param config プラグインの設定オブジェクト
 * @returns {number} そのキーに対するmotion_count値（デフォルト: 3）
 * @since 1.0.0
 * @example
 * const motionCount = getMotionCountForKey('f', config);
 * // 'f'モーションに対する動作回数を取得（例: 5）
 */
export function getMotionCountForKey(key: string, config: UnifiedConfig | Config): number {
  // Config型の場合はUnifiedConfigに変換
  // Config型は motion_count を持ち、UnifiedConfig型は motionCount を持つ
  const unifiedConfig = "motionCount" in config
    ? config as UnifiedConfig
    : toUnifiedConfig(config as Config);
  // キー別設定が存在し、そのキーの設定があれば使用
  if (unifiedConfig.perKeyMotionCount && unifiedConfig.perKeyMotionCount[key] !== undefined) {
    const value = unifiedConfig.perKeyMotionCount[key];
    // 1以上の整数値のみ有効とみなす
    if (value >= 1 && Number.isInteger(value)) {
      return value;
    }
  }

  // defaultMotionCount が設定されていれば使用
  if (unifiedConfig.defaultMotionCount !== undefined && unifiedConfig.defaultMotionCount >= 1) {
    return unifiedConfig.defaultMotionCount;
  }

  // 後方互換性：既存のmotionCountを使用
  if (unifiedConfig.motionCount !== undefined && unifiedConfig.motionCount >= 1) {
    return unifiedConfig.motionCount;
  }

  // 最終的なデフォルト値
  return 3;
}

/**
 * 現在のデバッグ情報を収集する内部関数
 * プラグインの状態とパフォーマンス情報を統合して取得
 *
 * @returns {DebugInfo} 設定、ヒント状態、パフォーマンス指標を含む包括的なデバッグ情報
 * @since 1.0.0
 * @example
 * const debugInfo = collectDebugInfo();
 * console.log(`現在のヒント数: ${debugInfo.currentHints.length}`);
 */
function collectDebugInfo(): DebugInfo {
  // Phase10: シングルトンインスタンスを使用
  const core = Core.getInstance(config);
  return core.collectDebugInfo();
}

/**
 * デバッグ情報をクリアする内部関数
 * 蓄積されたパフォーマンス測定データを初期化
 *
 * Phase8: Coreクラスに移行済み
 *
 * @returns {void}
 * @since 1.0.0
 */
function clearDebugInfo(): void {
  // Phase10: シングルトンインスタンスを使用
  const core = Core.getInstance(config);
  core.clearDebugInfo();
}

/**
 * 後方互換性のあるフラグを正規化する内部関数
 * 廃止された設定項目を除去し、互換性を保持
 *
 * @param cfg 正規化対象の部分的な設定オブジェクト
 * @returns {Partial<Config>} 後方互換性を保ちつつ正規化された設定
 * @since 1.0.0
 */
function normalizeBackwardCompatibleFlags(cfg: Partial<Config>): Partial<Config> {
  const normalized = { ...cfg };

  if ("use_improved_detection" in normalized) {
    delete normalized.use_improved_detection;
  }

  return normalized;
}

/**
 * メイン設定を単語検出マネージャー用設定に変換する内部関数
 * プラグイン設定を単語検出エンジン用の形式にマッピング
 *
 * @param config 変換元のメイン設定オブジェクト
 * @returns {WordDetectionManagerConfig} 単語検出マネージャー用の設定形式
 * @since 1.0.0
 */
function convertConfigForManager(config: UnifiedConfig): WordDetectionManagerConfig {
  return {
    // 基本設定
    strategy: config.wordDetectionStrategy || "hybrid",
    use_japanese: config.useJapanese,
    enable_tinysegmenter: config.enableTinySegmenter,
    segmenter_threshold: config.segmenterThreshold,

    // 日本語分割精度設定
    min_word_length: config.japaneseMinWordLength,

    // パフォーマンス設定
    cache_enabled: true,
    auto_detect_language: true,
    performance_monitoring: false, // デバッグ情報が必要な場合のみ有効

    // タイムアウト設定（motion_timeoutから算出）
    timeout_ms: Math.max(config.motionTimeout || 2000, 1000),

    // デフォルトストラテジー
    default_strategy: config.wordDetectionStrategy || "hybrid",
  };
}

/**
 * メイン設定と単語検出マネージャーの設定を同期する内部関数
 * プラグイン設定の変更を単語検出エンジンに反映
 *
 * @param config 同期元のメイン設定オブジェクト
 * @returns {void}
 * @since 1.0.0
 * @throws 設定の同期に失敗した場合（エラーは内部で処理され、ログ出力される）
 */
function syncManagerConfig(config: UnifiedConfig): void {
  try {
    // マネージャー用設定に変換
    const managerConfig = convertConfigForManager(config);

    // マネージャーを取得または作成し、設定を更新（globalConfigも渡す）
    const manager = getWordDetectionManager(managerConfig, fromUnifiedConfig(config));

    // 既存のマネージャーがある場合は設定を更新
    if (manager) {
      manager.updateConfig(managerConfig);
    }
  } catch (error) {
  }
}

/**
 * プラグインのメインエントリポイント関数
 * Vim/Neovim用のHellshake-Yanoプラグインを初期化し、ディスパッチャーを設定
 *
 * 主な処理内容：
 * - Neovim環境でのextmarkネームスペース作成
 * - 単語検出マネージャーの設定同期
 * - ディスパッチャーAPIの定義と登録
 * - プラグインの各種機能（設定更新、ヒント表示、デバッグなど）の提供
 *
 * @param denops Denosランタイムオブジェクト（Vim/Neovimとの通信インターフェース）
 * @returns {Promise<void>} プラグイン初期化完了のPromise
 * @since 1.0.0
 * @throws プラグイン初期化に失敗した場合
 * @example
 * // プラグインの初期化（通常はDenopsによって自動実行）
 * await main(denops);
 */
export async function main(denops: Denops): Promise<void> {
  // Neovimの場合のみextmarkのnamespaceを作成
  if (denops.meta.host === "nvim") {
    extmarkNamespace = await denops.call(
      "nvim_create_namespace",
      "hellshake_yano_hints",
    ) as number;
  }

  // プラグイン初期化時にマネージャーに初期設定を同期
  syncManagerConfig(config);

  // dispatcherの設定
  denops.dispatcher = {
    /**
     * プラグイン設定を更新する（検証処理付き）
     * 新しい設定値を検証し、有効な項目のみを適用
     *
     * @param newConfig 更新する設定オブジェクト（型安全でない外部入力）
     * @returns {void}
     * @since 1.0.0
     * @example
     * // Vim scriptから設定を更新
     * call denops#request('hellshake-yano', 'updateConfig', [{'motion_count': 5}])
     */
    updateConfig(newConfig: unknown): void {
      // 型安全のため、Partial<Config>として処理
      let cfg = newConfig as Partial<Config>;

      // 後方互換性のあるフラグを正規化
      cfg = normalizeBackwardCompatibleFlags(cfg);

      // カスタムマーカー設定の検証と適用
      if (cfg.markers && Array.isArray(cfg.markers)) {
        // マーカーの検証: 文字列配列であることを確認
        const validMarkers = cfg.markers.filter((m): m is string =>
          typeof m === "string" && m.length > 0
        );
        if (validMarkers.length > 0) {
          config.markers = validMarkers;
        } else {
        }
      }

      // motion_count の検証（1以上の整数）
      if (typeof cfg.motion_count === "number") {
        if (cfg.motion_count >= 1 && Number.isInteger(cfg.motion_count)) {
          config.motionCount = cfg.motion_count;
        } else {
        }
      }

      // motion_timeout の検証（100ms以上）
      if (typeof cfg.motion_timeout === "number") {
        if (cfg.motion_timeout >= 100) {
          config.motionTimeout = cfg.motion_timeout;
        } else {
        }
      }

      // hint_position の検証（'start', 'end', 'overlay'のみ許可）
      if (typeof cfg.hint_position === "string") {
        const validPositions: Array<"start" | "end" | "same"> = ["start", "end", "same"];
        if (validPositions.includes(cfg.hint_position as "start" | "end" | "same")) {
          config.hintPosition = cfg.hint_position as "start" | "end" | "same";
        } else {
        }
      }

      // visual_hint_position の検証と適用
      if (typeof cfg.visual_hint_position === "string") {
        const validPositions: Array<"start" | "end" | "same" | "both"> = [
          "start",
          "end",
          "same",
          "both",
        ];
        if (
          validPositions.includes(cfg.visual_hint_position as "start" | "end" | "same" | "both")
        ) {
          config.visualHintPosition = cfg.visual_hint_position as "start" | "end" | "same" | "both";
        } else {
        }
      }

      // trigger_on_hjkl の適用
      if (typeof cfg.trigger_on_hjkl === "boolean") {
        config.triggerOnHjkl = cfg.trigger_on_hjkl;
      }

      // counted_motions の適用
      if (Array.isArray(cfg.counted_motions)) {
        // 各要素が1文字の文字列か検証（型安全性向上：Process2 Sub6）
        // unknown型からstring型へのtype guard使用でany型を排除
        const validKeys = cfg.counted_motions.filter((key: unknown): key is string =>
          typeof key === "string" && key.length === 1
        );
        if (validKeys.length === cfg.counted_motions.length) {
          config.countedMotions = [...validKeys];
        } else {
          console.warn(
            `[hellshake-yano] Some keys in counted_motions are invalid, using valid keys only: ${validKeys}`,
          );
          config.countedMotions = [...validKeys];
        }
      }

      // enabled の適用
      if (typeof cfg.enabled === "boolean") {
        config.enabled = cfg.enabled;
      }

      // use_numbers の適用（数字対応）
      if (typeof cfg.use_numbers === "boolean") {
        config.useNumbers = cfg.use_numbers;
        // 数字を使用する場合、マーカーを再生成
        if (cfg.use_numbers) {
          const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
          const numbers = "0123456789".split("");
          config.markers = [...letters, ...numbers];
        } else {
          config.markers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
        }
      }

      // highlight_selected の適用（UX改善）
      if (typeof cfg.highlight_selected === "boolean") {
        config.highlightSelected = cfg.highlight_selected;
      }

      // debug_coordinates の適用（デバッグ用）
      if (typeof cfg.debug_coordinates === "boolean") {
        config.debugCoordinates = cfg.debug_coordinates;
      }

      // maxHints の検証（1以上の整数）
      if (typeof cfg.maxHints === "number") {
        if (cfg.maxHints >= 1 && Number.isInteger(cfg.maxHints)) {
          config.maxHints = cfg.maxHints;
        } else {
        }
      }

      // debounceDelay の検証（0以上の数値）
      if (typeof cfg.debounceDelay === "number") {
        if (cfg.debounceDelay >= 0) {
          config.debounceDelay = cfg.debounceDelay;
        } else {
        }
      }

      // single_char_keys の検証と適用
      if (cfg.single_char_keys && Array.isArray(cfg.single_char_keys)) {
        const validKeys = cfg.single_char_keys.filter((k): k is string =>
          typeof k === "string" && k.length === 1
        );
        if (validKeys.length > 0) {
          config.singleCharKeys = validKeys;
        } else {
        }
      }

      // multi_char_keys の検証と適用
      if (cfg.multi_char_keys && Array.isArray(cfg.multi_char_keys)) {
        const validKeys = cfg.multi_char_keys.filter((k): k is string =>
          typeof k === "string" && k.length === 1
        );
        if (validKeys.length > 0) {
          config.multiCharKeys = validKeys;
        } else {
        }
      }

      // max_single_char_hints の検証
      if (typeof cfg.max_single_char_hints === "number") {
        if (cfg.max_single_char_hints >= 0 && Number.isInteger(cfg.max_single_char_hints)) {
          config.maxSingleCharHints = cfg.max_single_char_hints;
        } else {
        }
      }

      // use_hint_groups の適用
      if (typeof cfg.use_hint_groups === "boolean") {
        config.useHintGroups = cfg.use_hint_groups;
      } else {
        // Option 2+3: Auto-detect hint groups mode when single_char_keys or multi_char_keys are defined
        // If use_hint_groups is not explicitly set but single/multi char keys are defined,
        // automatically enable hint groups for better user experience
        if (
          (config.singleCharKeys && config.singleCharKeys.length > 0) ||
          (config.multiCharKeys && config.multiCharKeys.length > 0)
        ) {
          config.useHintGroups = true;
          if (config.debugMode) {
            console.log(
              "[hellshake-yano] Auto-enabled hint groups due to single_char_keys/multi_char_keys presence",
            );
          }
        }
      }

      // per_key_motion_count の検証と適用
      if (cfg.per_key_motion_count && typeof cfg.per_key_motion_count === "object") {
        const validCounts: Record<string, number> = {};
        for (const [key, count] of Object.entries(cfg.per_key_motion_count)) {
          if (typeof count === "number" && count >= 1 && Number.isInteger(count)) {
            validCounts[key] = count;
          }
        }
        if (Object.keys(validCounts).length > 0) {
          config.perKeyMotionCount = validCounts;
        }
      }

      // default_motion_count の検証と適用
      if (typeof cfg.default_motion_count === "number") {
        if (cfg.default_motion_count >= 1 && Number.isInteger(cfg.default_motion_count)) {
          config.defaultMotionCount = cfg.default_motion_count;
        }
      }

      if (typeof cfg.use_japanese === "boolean") {
        config.useJapanese = cfg.use_japanese;
      }

      if (typeof cfg.word_detection_strategy === "string") {
        const validStrategies = ["regex", "tinysegmenter", "hybrid"];
        if (validStrategies.includes(cfg.word_detection_strategy)) {
          config.wordDetectionStrategy = cfg.word_detection_strategy;

          // マネージャーをリセットして新しい設定を適用
          resetWordDetectionManager();
        } else {
        }
      }

      if (typeof cfg.enable_tinysegmenter === "boolean") {
        config.enableTinySegmenter = cfg.enable_tinysegmenter;
        resetWordDetectionManager();
      }

      if (typeof cfg.segmenter_threshold === "number") {
        if (cfg.segmenter_threshold >= 1 && Number.isInteger(cfg.segmenter_threshold)) {
          config.segmenterThreshold = cfg.segmenter_threshold;
          resetWordDetectionManager();
        } else {
        }
      }

      if (cfg.highlight_hint_marker !== undefined) {
        const markerResult = validateHighlightColor(cfg.highlight_hint_marker);
        if (markerResult.valid) {
          config.highlightHintMarker = cfg.highlight_hint_marker;
          const displayValue = typeof cfg.highlight_hint_marker === "string"
            ? cfg.highlight_hint_marker
            : JSON.stringify(cfg.highlight_hint_marker);
        } else {
        }
      }

      if (cfg.highlight_hint_marker_current !== undefined) {
        const currentResult = validateHighlightColor(cfg.highlight_hint_marker_current);
        if (currentResult.valid) {
          config.highlightHintMarkerCurrent = cfg.highlight_hint_marker_current;
          const displayValue = typeof cfg.highlight_hint_marker_current === "string"
            ? cfg.highlight_hint_marker_current
            : JSON.stringify(cfg.highlight_hint_marker_current);
        } else {
        }
      }

      if (typeof cfg.debug_mode === "boolean") {
        config.debugMode = cfg.debug_mode;
      }

      if (typeof cfg.performance_log === "boolean") {
        config.performanceLog = cfg.performance_log;
        // パフォーマンスログが無効化された場合、既存のメトリクスをクリア
        if (!cfg.performance_log) {
          clearDebugInfo();
        }
      }

      // 設定更新後、マネージャーに設定を伝播
      syncManagerConfig(config);
    },

    /**
     * ヒントを表示（デバウンス機能付き）
     * Phase7: CoreクラスのshowHintsメソッドに委譲
     */
    async showHints(): Promise<void> {
      // Phase10: シングルトンインスタンスを使用
      const core = Core.getInstance(config);
      core.updateConfig(config);

      // CoreクラスのshowHintsメソッドを呼び出し
      await core.showHints(denops);
    },

    /**
     * 内部的なヒント表示処理（最適化版）
     */
    async showHintsInternal(mode?: unknown): Promise<void> {
      const modeString = mode ? String(mode) : "normal";
      const startTime = performance.now();
      lastShowHintsTime = Date.now();

      // Phase10: シングルトンインスタンスを関数の先頭で取得
      const core = Core.getInstance(config);

      // デバウンスタイムアウトをクリア
      if (debounceTimeoutId) {
        clearTimeout(debounceTimeoutId);
        debounceTimeoutId = undefined;
      }

      // 既存のヒントを強制的に非表示にして状態をリセット
      if (hintsVisible || currentHints.length > 0) {
        await hideHints(denops);
      }

      // 状態フラグを確実にリセット
      hintsVisible = false;
      currentHints = [];

      // 入力バッファをクリア（重要：前回の入力が残っていると即座にヒントが消える）
      try {
        // getchar(0)でバッファ内の文字を全て消費
        await denops.cmd("while getchar(0) | endwhile");
      } catch {
        // エラーが発生しても続行
      }

      // 日本語テキスト対応: 毎回キャッシュをクリアして正確な位置を計算
      clearHintCache();

      const maxRetries = 2;
      let retryCount = 0;

      while (retryCount <= maxRetries) {
        try {
          // プラグインが無効化されている場合は何もしない
          if (!config.enabled) {
            await denops.cmd("echo 'hellshake-yano is disabled'");
            return;
          }

          // すでに表示中の場合は何もしない
          if (hintsVisible) {
            return;
          }

          // バッファの状態をチェック
          const bufnr = await denops.call("bufnr", "%") as number;
          if (bufnr === -1) {
            throw new Error("No valid buffer available");
          }

          const buftype = await denops.call("getbufvar", bufnr, "&buftype") as string;
          if (buftype && buftype !== "") {
            await denops.cmd("echo 'hellshake-yano: Cannot show hints in special buffer type'");
            return;
          }

          // キャッシュを使用して単語を検出（最適化）
          // Phase4: CoreクラスのdetectWordsOptimizedメソッドを使用
          // Phase10: 関数先頭で宣言済みのcoreを使用
          const words = await core.detectWordsOptimized(denops, bufnr);
          if (words.length === 0) {
            await denops.cmd("echo 'No words found for hints'");
            return;
          }

          // maxHints設定を使用してヒント数を制限
          let effectiveMaxHints: number;

          // hint groups使用時は実際の容量を計算
          if (config.useHintGroups && config.singleCharKeys && config.multiCharKeys) {
            const singleCharCount = Math.min(
              config.singleCharKeys.length,
              config.maxSingleCharHints || config.singleCharKeys.length,
            );
            const multiCharCount = config.multiCharKeys.length * config.multiCharKeys.length;
            const numberHintCount = 100; // 2桁数字ヒント
            const totalCapacity = singleCharCount + multiCharCount + numberHintCount;
            effectiveMaxHints = Math.min(config.maxHints, totalCapacity);
          } else {
            // 従来の計算方法
            effectiveMaxHints = Math.min(
              config.maxHints,
              config.markers.length * config.markers.length,
            );
          }

          const limitedWords = words.slice(0, effectiveMaxHints);

          if (words.length > effectiveMaxHints) {
            await denops.cmd(
              `echo 'Too many words (${words.length}), showing first ${effectiveMaxHints} hints'`,
            );
          }

          // カーソル位置を取得
          const cursorLine = await denops.call("line", ".") as number;
          const cursorCol = await denops.call("col", ".") as number;

          // Phase5: Coreクラスのヒント生成機能を使用（最適化）
          // bothモードの場合は2倍のヒントを生成
          const isBothMode = modeString === "visual" && config.visualHintPosition === "both";
          const hintsNeeded = isBothMode ? limitedWords.length * 2 : limitedWords.length;

          // Coreインスタンスを使用してヒントを生成
          // Phase10: 関数先頭で宣言済みのcoreを使用
          const hints = core.generateHintsOptimized(hintsNeeded, config.markers);
          currentHints = assignHintsToWords(
            limitedWords,
            hints,
            cursorLine,
            cursorCol,
            modeString,
            {
              hint_position: config.hintPosition,
              visual_hint_position: config.visualHintPosition,
            },
          );

          if (currentHints.length === 0) {
            await denops.cmd("echo 'No valid hints could be generated'");
            return;
          }

          // Phase6: Coreクラスの displayHintsAsync メソッドを使用
          // Phase10: 関数先頭で宣言済みのcoreを使用
          // バッチ処理でヒントを非同期表示（最適化）
          core.displayHintsAsync(denops, currentHints, { mode: "normal" });

          // ヒント表示状態を確実に設定
          hintsVisible = true;

          const endTime = performance.now();
          recordPerformance("showHints", startTime, endTime);

          // ユーザー入力を待機
          await waitForUserInput(denops);
          return; // 成功した場合はリトライループを抜ける
        } catch (error) {
          retryCount++;

          // ヒントをクリア
          await hideHints(denops);

          if (retryCount <= maxRetries) {
            // リトライする場合
            await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms待機
          } else {
            // 最大リトライ回数に達した場合
            await denops.cmd(
              "echohl ErrorMsg | echo 'hellshake-yano: Failed to show hints after retries' | echohl None",
            );
            try {
              await denops.cmd("call feedkeys('\\<C-g>', 'n')"); // ベル音
            } catch {
              // ベル音が失敗しても続行
            }
            throw error;
          }
        }
      }
    },

    /**
     * キー情報付きヒント表示
     * Phase7: CoreクラスのshowHintsWithKeyメソッドに委譲
     * @param key - 押下されたキー文字
     * @param mode - 現在のVimモード
     */
    async showHintsWithKey(key: unknown, mode?: unknown): Promise<void> {
      // Phase10: シングルトンインスタンスを使用
      const core = Core.getInstance(config);
      core.updateConfig(config);

      const keyString = String(key);
      const modeString = mode ? String(mode) : "normal";

      // CoreクラスのshowHintsWithKeyメソッドを呼び出し
      await core.showHintsWithKey(denops, keyString, modeString);
    },

    /**
     * ヒントを非表示
     */
    async hideHints(): Promise<void> {
      const startTime = performance.now();
      // デバウンスタイムアウトをクリア
      if (debounceTimeoutId) {
        clearTimeout(debounceTimeoutId);
        debounceTimeoutId = undefined;
      }
      await hideHints(denops);

      const endTime = performance.now();
      recordPerformance("hideHints", startTime, endTime);
    },

    /**
     * 全てのキャッシュをクリアする
     * 単語検出とヒント生成の結果キャッシュを初期化
     *
     * @returns {void}
     * @since 1.0.0
     * @example
     * // Vim scriptからキャッシュをクリア
     * call denops#request('hellshake-yano', 'clearCache', [])
     */
    clearCache(): void {
      wordsCache.clear();
      hintsCache.clear();
    },

    /**
     * デバッグ情報を取得（拡充版）
     */
    async debug(): Promise<unknown> {
      try {
        const bufnr = await denops.call("bufnr", "%") as number;
        const bufname = await denops.call("bufname", bufnr) as string;
        const buftype = await denops.call("getbufvar", bufnr, "&buftype") as string;
        const readonly = await denops.call("getbufvar", bufnr, "&readonly") as number;
        const lineCount = await denops.call("line", "$") as number;

        return {
          config,
          hintsVisible,
          currentHintsCount: currentHints.length,
          currentHints: currentHints.map((h) => ({
            hint: h.hint,
            word: h.word.text,
            line: h.word.line,
            col: h.word.col,
          })),
          host: denops.meta.host,
          extmarkNamespace,
          fallbackMatchIdsCount: fallbackMatchIds.length,
          buffer: {
            number: bufnr,
            name: bufname,
            type: buftype,
            readonly: readonly === 1,
            lineCount,
          },
          capabilities: {
            hasExtmarks: denops.meta.host === "nvim" && extmarkNamespace !== undefined,
            canUseFallback: true,
          },
        };
      } catch (error) {
        return {
          error: `Failed to gather debug info: ${error}`,
          config,
          hintsVisible,
          currentHintsCount: currentHints.length,
          host: denops.meta.host,
          extmarkNamespace,
        };
      }
    },

    /**
     * エラーハンドリングのテスト
     */
    async testErrorHandling(): Promise<void> {
      try {
        // テスト1: 無効なバッファでのヒント表示
        try {
          await denops.cmd("new"); // 新しいバッファを作成
          await denops.cmd("setlocal buftype=nofile"); // 特殊バッファタイプに設定
          await denops.dispatcher.showHints?.();
        } catch (error) {
        }

        // テスト2: 読み取り専用バッファでのヒント表示
        try {
          await denops.cmd("new"); // 新しいバッファを作成
          await denops.cmd("put ='test content for hints'");
          await denops.cmd("setlocal readonly");
          await denops.dispatcher.showHints?.();
        } catch (error) {
        }

        // テスト3: プラグイン無効状態でのヒント表示
        try {
          const originalEnabled = config.enabled;
          config.enabled = false;
          await denops.dispatcher.showHints?.();
          config.enabled = originalEnabled;
        } catch (error) {
        }

        // テスト4: extmarkフォールバック機能
        try {
          // 通常のバッファでテスト
          await denops.cmd("new");
          await denops.cmd("put ='word1 word2 word3'");
          await denops.cmd("normal! gg");

          const debugInfo = await denops.dispatcher.debug?.() as {
            capabilities?: { hasExtmarks?: boolean };
            buffer?: { type?: string; readonly?: boolean };
          };
        } catch (error) {
        }

        await denops.cmd("echo 'Error handling tests completed. Check console for results.'");
      } catch (error) {
        await denops.cmd("echohl ErrorMsg | echo 'Error handling test failed' | echohl None");
      }
    },

    /**
     * 設定のテスト
     */
    async testConfig(): Promise<void> {
      try {
        // テスト1: カスタムマーカー設定
        await denops.dispatcher.updateConfig?.({
          markers: ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"],
        });

        // テスト2: 無効なマーカー設定
        await denops.dispatcher.updateConfig?.({
          markers: [123, null, "", "valid"], // 混在した無効な値
        });

        // テスト3: hint_position設定
        for (const pos of ["start", "end", "overlay", "invalid"]) {
          await denops.dispatcher.updateConfig?.({ hint_position: pos });
        }

        // テスト4: motion_count検証
        for (const count of [0, -1, 1.5, 3, 10]) {
          await denops.dispatcher.updateConfig?.({ motion_count: count });
        }

        // テスト5: motion_timeout検証
        for (const timeout of [50, 100, 500, 2000]) {
          await denops.dispatcher.updateConfig?.({ motion_timeout: timeout });
        }

        // 現在の設定を表示
        const debugInfo = await denops.dispatcher.debug?.();

        await denops.cmd("echo 'Configuration test completed. Check console for results.'");
      } catch (error) {
      }
    },

    /**
     * 複数文字ヒントのテスト
     */
    async testMultiCharHints(): Promise<void> {
      try {
        // テストファイルを開く
        await denops.cmd("edit tmp/claude/multi_char_test.txt");

        // ヒントを表示
        await denops.dispatcher.showHints?.();

        const debugInfo = await denops.dispatcher.debug?.() as {
          currentHints?: Array<{ hint: string; word: string; line: number; col: number }>;
        };

        if (debugInfo.currentHints) {
          debugInfo.currentHints.forEach((h, i: number) => {
          });

          // 複数文字ヒントの存在を確認
          const multiCharHints = debugInfo.currentHints.filter((h) => h.hint.length > 1);

          if (multiCharHints.length > 0) {
            multiCharHints.slice(0, 5).forEach((h) => {
            });
          }
        }
      } catch (error) {
      }
    },

    /**
     * パフォーマンステスト
     */
    async testPerformance(): Promise<void> {
      try {
        // テストファイルを開く
        await denops.cmd("edit tmp/claude/performance_test.txt");

        const startTime = Date.now();

        // 1. 単語検出の性能テスト
        const wordDetectionStart = Date.now();
        const words = await detectWords(denops);
        const wordDetectionTime = Date.now() - wordDetectionStart;

        // 2. ヒント生成の性能テスト
        const hintGenerationStart = Date.now();
        const hints = generateHints(words.length, config.markers, config.maxHints);
        const hintGenerationTime = Date.now() - hintGenerationStart;

        // 3. 実際のヒント表示性能テスト
        const fullTestStart = Date.now();
        await denops.dispatcher.showHints?.();
        const fullTestTime = Date.now() - fullTestStart;

        // 4. キャッシュ効果のテスト
        const cachedTestStart = Date.now();
        await denops.dispatcher.hideHints?.();
        await denops.dispatcher.showHints?.();
        const cachedTestTime = Date.now() - cachedTestStart;

        // 5. デバウンス機能のテスト
        const debounceTestStart = Date.now();
        await denops.dispatcher.hideHints?.();

        // 連続してshowHintsを呼び出してデバウンス効果をテスト
        const promises = [];
        for (let i = 0; i < 5; i++) {
          promises.push(denops.dispatcher.showHints?.());
        }
        await Promise.all(promises);
        const debounceTestTime = Date.now() - debounceTestStart;

        const totalTime = Date.now() - startTime;

        // 統計情報を表示
        const debugInfo = await denops.dispatcher.debug?.() as DebugInfo;

        // キャッシュ統計
        try {
          const { getWordDetectionCacheStats } = await import("./word.ts");
          const { getHintCacheStats } = await import("./hint.ts");

          const wordCacheStats = getWordDetectionCacheStats();
          const hintCacheStats = getHintCacheStats();
        } catch (error) {
        }

        await denops.cmd("echo 'Performance test completed. Check console for detailed results.'");
      } catch (error) {
        await denops.cmd("echohl ErrorMsg | echo 'Performance test failed' | echohl None");
      }
    },

    /**
     * 大量単語でのストレステスト
     */
    async testStress(): Promise<void> {
      try {
        // パフォーマンステストファイルを開く
        await denops.cmd("edit tmp/claude/performance_test.txt");

        // maxHintsを一時的に大きな値に設定
        const originalMaxHints = config.maxHints;
        config.maxHints = 500;

        const startTime = Date.now();

        // ストレステスト実行
        await denops.dispatcher.showHints?.();

        const endTime = Date.now();
        const executionTime = endTime - startTime;

        // 結果を取得
        const debugInfo = await denops.dispatcher.debug?.() as DebugInfo;

        // 設定を元に戻す
        config.maxHints = originalMaxHints;

        await denops.cmd(
          `echo 'Stress test completed in ${executionTime}ms with ${
            debugInfo?.currentHints?.length || 0
          } hints'`,
        );
      } catch (error) {
        await denops.cmd("echohl ErrorMsg | echo 'Stress test failed' | echohl None");
      }
    },

    /**
     * デバッグ情報を取得する
     * 現在のプラグイン状態とパフォーマンス情報を包含した詳細情報を返す
     *
     * @returns {DebugInfo} 設定、ヒント状態、パフォーマンス統計を含むデバッグ情報
     * @since 1.0.0
     * @example
     * // Vim scriptからデバッグ情報を取得
     * let debug_info = denops#request('hellshake-yano', 'getDebugInfo', [])
     */
    getDebugInfo(): DebugInfo {
      return collectDebugInfo();
    },

    /**
     * パフォーマンス測定ログをクリアする
     * 蓄積された全ての実行時間統計をリセット
     *
     * @returns {void}
     * @since 1.0.0
     * @example
     * // Vim scriptからパフォーマンスログをクリア
     * call denops#request('hellshake-yano', 'clearPerformanceLog', [])
     */
    clearPerformanceLog(): void {
      clearDebugInfo();
    },

    /**
     * デバッグモードの有効/無効を切り替える
     * デバッグ出力の表示状態をトグルし、新しい状態を返す
     *
     * @returns {boolean} 切り替え後のデバッグモード状態
     * @since 1.0.0
     * @example
     * // Vim scriptからデバッグモードを切り替え
     * let is_debug = denops#request('hellshake-yano', 'toggleDebugMode', [])
     */
    toggleDebugMode(): boolean {
      config.debugMode = !config.debugMode;
      return config.debugMode;
    },

    /**
     * パフォーマンスログの記録を切り替える
     * 実行時間測定の有効/無効をトグルし、無効化時はログをクリア
     *
     * @returns {boolean} 切り替え後のパフォーマンスログ記録状態
     * @since 1.0.0
     * @example
     * // Vim scriptからパフォーマンスログを切り替え
     * let is_logging = denops#request('hellshake-yano', 'togglePerformanceLog', [])
     */
    togglePerformanceLog(): boolean {
      config.performanceLog = !config.performanceLog;
      if (!config.performanceLog) {
        clearDebugInfo();
      }
      return config.performanceLog;
    },
  };
}

/**
 * キャッシュを使用した最適化済み単語検出
 * @param denops - Denopsインスタンス
 * @param bufnr - バッファ番号
 * @returns 検出された単語の配列
 */
async function detectWordsOptimized(denops: Denops, bufnr: number): Promise<Word[]> {
  try {
    const enhancedConfig: EnhancedWordConfig = {
      strategy: config.wordDetectionStrategy,
      use_japanese: config.useJapanese,
      enable_tinysegmenter: config.enableTinySegmenter,
      segmenter_threshold: config.segmenterThreshold,
      cache_enabled: true,
      auto_detect_language: true,
    };

    // current_key_contextからコンテキストを作成
    const context = config.currentKeyContext
      ? {
        minWordLength: getMinLengthForKey(config, config.currentKeyContext),
      }
      : undefined;

    const result = await detectWordsWithManager(denops, enhancedConfig, context);

    if (result.success) {
      return result.words;
    } else {
      // フォールバックとしてレガシーメソッドを使用
      return await detectWordsWithConfig(denops, {
        use_japanese: config.useJapanese,
      });
    }
  } catch (error) {
    // 最終フォールバックとしてレガシーメソッドを使用
    return await detectWordsWithConfig(denops, {
      use_japanese: config.useJapanese,
    });
  }
}

/**
 * キャッシュを使用した最適化済みヒント生成
 *
 * @deprecated Phase5以降: Core.generateHintsOptimized()を使用してください
 * この関数はCore.generateHintsOptimized()に移行済みです。後方互換性のために残されています。
 *
 * @param wordCount - 単語の数
 * @param markers - ヒントマーカーの文字配列
 * @returns 生成されたヒント文字列の配列
 */
function generateHintsOptimized(wordCount: number, markers: string[]): string[] {
  // Phase5: Coreクラスへの移行 - 廃止予定通知
  console.warn("[hellshake-yano] generateHintsOptimized関数は廃止予定です。Core.generateHintsOptimized()を使用してください。");
  // Option 2+3: Auto-detect hint groups mode when single_char_keys or multi_char_keys are defined
  // unless explicitly disabled by use_hint_groups=false
  const shouldUseHintGroups = config.useHintGroups !== false &&
    (config.singleCharKeys || config.multiCharKeys);

  if (shouldUseHintGroups && (config.singleCharKeys || config.multiCharKeys)) {
    if (config.debugMode) {
      console.log("[hellshake-yano] Auto-detected hint groups mode:", {
        use_hint_groups: config.useHintGroups,
        has_single_char_keys: !!config.singleCharKeys,
        has_multi_char_keys: !!config.multiCharKeys,
        shouldUseHintGroups,
      });
    }

    const hintConfig: HintKeyConfig = {
      single_char_keys: config.singleCharKeys,
      multi_char_keys: config.multiCharKeys,
      max_single_char_hints: config.maxSingleCharHints,
      markers: markers,
    };

    // 設定の検証
    const validation = validateHintKeyConfig(hintConfig);
    if (!validation.valid) {
      if (config.debugMode) {
        console.error("[hellshake-yano] Invalid hint key configuration:", validation.errors);
      }
      // フォールバックとして通常のヒント生成を使用
      return generateHints(wordCount, markers);
    }

    return generateHintsWithGroups(wordCount, hintConfig);
  }

  // 従来のヒント生成処理
  // キャッシュヒットチェック
  const cacheKey = `${wordCount}-${markers?.join("") || "default"}`;
  const cachedHints = hintsCache.get(cacheKey);
  if (cachedHints) {
    return cachedHints.slice(0, wordCount);
  }

  // キャッシュミスの場合、新たにヒントを生成
  const hints = generateHints(wordCount, markers);

  // キャッシュを更新（最大1000個まで）
  if (wordCount <= 1000) {
    hintsCache.set(cacheKey, hints);
  }

  return hints;
}

/**
 * バッチ処理で最適化されたヒント表示
 */
async function displayHintsOptimized(
  denops: Denops,
  hints: HintMapping[],
  mode: string = "normal",
  signal?: AbortSignal,
): Promise<void> {
  try {
    // バッファの存在確認
    const bufnr = await denops.call("bufnr", "%") as number;
    if (bufnr === -1) {
      throw new Error("Invalid buffer: no current buffer available");
    }

    // バッファが読み込み専用かチェック
    const readonly = await denops.call("getbufvar", bufnr, "&readonly") as number;
    if (readonly) {
    }

    if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
      // Neovim: バッチ処理でextmarkを作成
      await displayHintsWithExtmarksBatch(denops, bufnr, hints, mode, signal);
    } else {
      // Vim: バッチ処理でmatchaddを作成
      await displayHintsWithMatchAddBatch(denops, hints, mode, signal);
    }
  } catch (error) {
    // フォールバックとして通常の表示処理を使用
    await displayHints(denops, hints, mode);
  }
}

// グローバル状態管理
let _isRenderingHints = false;
let _renderingAbortController: AbortController | null = null;
let _highlightAbortController: AbortController | null = null;

// バッチ処理の設定
const HIGHLIGHT_BATCH_SIZE = 15; // 1バッチあたりの処理数（パフォーマンス調整可能）

/**
 * 非同期でヒントを表示する
 * Fire-and-forgetパターンで描画処理を実行し、ユーザー入力をブロックしない
 * パフォーマンス最適化により大量のヒントも効率的に処理
 *
 * @param denops Denosランタイムオブジェクト
 * @param hints 表示するヒントマッピングの配列
 * @param config 表示設定オブジェクト（モード情報等）
 * @param onComplete 表示完了時のコールバック関数（オプション）
 * @returns {void}
 * @since 1.0.0
 * @example
 * // ヒントを非同期で表示
 * displayHintsAsync(denops, hintMappings, { mode: 'normal' }, () => {
 *   console.log('ヒント表示完了');
 * });
 */
export function displayHintsAsync(
  denops: Denops,
  hints: HintMapping[],
  config: UnifiedConfig,
  onComplete?: () => void,
): void {
  // 前の描画をキャンセル
  if (_renderingAbortController) {
    _renderingAbortController.abort();
  }

  // 新しいAbortControllerを作成
  _renderingAbortController = new AbortController();
  const currentController = _renderingAbortController;

  // 描画状態を設定
  _isRenderingHints = true;

  // 非同期で描画を実行（awaitしない）
  (async () => {
    try {
      // AbortSignalをチェックしながら描画
      if (currentController.signal.aborted) {
        return;
      }

      await displayHintsOptimized(denops, hints, "normal", currentController.signal);

      // 完了コールバックを実行
      if (onComplete && !currentController.signal.aborted) {
        onComplete();
      }
    } catch (error) {
      // エラーは内部でキャッチして、外部に投げない
      console.error("[hellshake-yano] Async rendering error:", error);
    } finally {
      // この描画が現在のものである場合のみフラグをリセット
      if (currentController === _renderingAbortController) {
        _isRenderingHints = false;
        _renderingAbortController = null;
      }
    }
  })();
}

/**
 * ヒントの描画処理中かどうかを取得する
 * 非同期描画の状態を外部から確認するためのステータス関数
 *
 * @returns {boolean} 描画処理中の場合はtrue、そうでなければfalse
 * @since 1.0.0
 * @example
 * // 描画状態を確認してから次の処理を実行
 * if (!isRenderingHints()) {
 *   displayHintsAsync(denops, hints, config);
 * }
 */
export function isRenderingHints(): boolean {
  return _isRenderingHints;
}

/**
 * 現在実行中の描画処理を中断する
 * 長時間の描画処理をキャンセルし、リソースを解放
 *
 * @returns {void}
 * @since 1.0.0
 * @example
 * // ユーザーが別のアクションを実行した際に描画を中断
 * abortCurrentRendering();
 * displayHintsAsync(denops, newHints, config);
 */
export function abortCurrentRendering(): void {
  if (_renderingAbortController) {
    _renderingAbortController.abort();
    _renderingAbortController = null;
    _isRenderingHints = false;
  }
}

/**
 * バッチ処理でextmarkを作成
 */
async function displayHintsWithExtmarksBatch(
  denops: Denops,
  bufnr: number,
  hints: HintMapping[],
  mode: string = "normal",
  signal?: AbortSignal,
): Promise<void> {
  const batchSize = 50; // バッチサイズ
  let extmarkFailCount = 0;
  const maxFailures = 5;

  for (let i = 0; i < hints.length; i += batchSize) {
    // Check if the operation was aborted
    if (signal?.aborted) {
      return;
    }

    const batch = hints.slice(i, i + batchSize);

    try {
      // バッチ内の各extmarkを作成
      await Promise.all(batch.map(async (mapping, index) => {
        const { word, hint } = mapping;
        try {
          // バッファの有効性を再確認
          const bufValid = await denops.call("bufexists", bufnr) as number;
          if (!bufValid) {
            throw new Error(`Buffer ${bufnr} no longer exists`);
          }

          // HintMappingのhintCol/hintByteColを使用して位置を決定
          // bothモードでも各マッピングは正しい位置情報を持っている
          const hintLine = word.line;
          const hintCol = mapping.hintCol || word.col;
          const hintByteCol = mapping.hintByteCol || mapping.hintCol || word.byteCol || word.col;

          // 行とカラムの境界チェック
          const lineCount = await denops.call("line", "$") as number;
          if (hintLine > lineCount || hintLine < 1) {
            return;
          }

          // Neovim用の0ベース座標に変換
          const nvimLine = hintLine - 1;
          const nvimCol = hintByteCol - 1;

          await denops.call(
            "nvim_buf_set_extmark",
            bufnr,
            extmarkNamespace,
            nvimLine,
            Math.max(0, nvimCol),
            {
              virt_text: [[hint, "HellshakeYanoMarker"]],
              virt_text_pos: "overlay",
              priority: 100,
            },
          );
        } catch (extmarkError) {
          extmarkFailCount++;

          // フォールバックとしてmatchaddを使用
          try {
            const pattern = `\\%${word.line}l\\%${word.col}c.`;
            const matchId = await denops.call(
              "matchadd",
              "HellshakeYanoMarker",
              pattern,
              100,
            ) as number;
            fallbackMatchIds.push(matchId);
          } catch (matchError) {
          }

          // 失敗が多すぎる場合はextmarkを諦めてmatchaddに切り替え
          if (extmarkFailCount >= maxFailures) {
            const remainingHints = hints.slice(i + index + 1);
            if (remainingHints.length > 0) {
              await displayHintsWithMatchAddBatch(denops, remainingHints, mode, signal);
            }
            return;
          }
        }
      }));

      // バッチ間の小さな遅延（CPU負荷を減らす）
      if (i + batchSize < hints.length && hints.length > 100) {
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    } catch (batchError) {
      // バッチエラーの場合は次のバッチに続く
    }
  }
}

/**
 * バッチ処理でmatchaddを作成
 */
async function displayHintsWithMatchAddBatch(
  denops: Denops,
  hints: HintMapping[],
  mode: string = "normal",
  signal?: AbortSignal,
): Promise<void> {
  const batchSize = 100; // matchaddはより高速なので大きなバッチサイズ

  for (let i = 0; i < hints.length; i += batchSize) {
    // Check if the operation was aborted
    if (signal?.aborted) {
      return;
    }

    const batch = hints.slice(i, i + batchSize);

    try {
      // バッチ内の各matchを作成
      const matchPromises = batch.map(async (mapping) => {
        const { word, hint } = mapping;
        try {
          // HintMappingのhintCol/hintByteColを使用して位置を決定
          // bothモードでも各マッピングは正しい位置情報を持っている
          const hintLine = word.line;
          const hintCol = mapping.hintCol || word.col;
          const hintByteCol = mapping.hintByteCol || mapping.hintCol || word.byteCol || word.col;

          // VimはbyteColを使用
          const vimCol = hintByteCol;
          const pattern = `\\%${hintLine}l\\%${vimCol}c.`;

          const matchId = await denops.call(
            "matchadd",
            "HellshakeYanoMarker",
            pattern,
            100,
          ) as number;
          fallbackMatchIds.push(matchId);

          return matchId;
        } catch (matchError) {
          return null;
        }
      });

      await Promise.all(matchPromises);

      // バッチ間の小さな遅延（CPU負荷を減らす）
      if (i + batchSize < hints.length && hints.length > 200) {
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    } catch (batchError) {
      // バッチエラーの場合は次のバッチに続く
    }
  }
}

/**
 * ヒントを表示する（エラーハンドリング強化版）
 */
async function displayHints(
  denops: Denops,
  hints: HintMapping[],
  mode: string = "normal",
): Promise<void> {
  try {
    // バッファの存在確認
    const bufnr = await denops.call("bufnr", "%") as number;
    if (bufnr === -1) {
      throw new Error("Invalid buffer: no current buffer available");
    }

    // バッファが読み込み専用かチェック
    const readonly = await denops.call("getbufvar", bufnr, "&readonly") as number;
    if (readonly) {
    }

    if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
      // Neovim: extmarkを使用（フォールバック付き）
      let extmarkFailCount = 0;
      const maxFailures = 3;

      for (const { word, hint } of hints) {
        try {
          // バッファの有効性を再確認
          const bufValid = await denops.call("bufexists", bufnr) as number;
          if (!bufValid) {
            throw new Error(`Buffer ${bufnr} no longer exists`);
          }

          const position = calculateHintPositionWithCoordinateSystem(
            word,
            config.hintPosition,
            config.debugCoordinates,
            mode === "visual",
            config.visualHintPosition,
          );
          // デバッグログ追加（パフォーマンスのためコメントアウト）
          const col = position.nvim_col; // Neovim extmark用（既に0ベース変換済み）
          let virtTextPos: "overlay" | "eol" = "overlay";

          if (position.display_mode === "overlay") {
            virtTextPos = "overlay";
          }

          // 行とカラムの境界チェック
          const lineCount = await denops.call("line", "$") as number;
          if (word.line > lineCount || word.line < 1) {
            continue;
          }

          await denops.call(
            "nvim_buf_set_extmark",
            bufnr,
            extmarkNamespace,
            position.nvim_line,
            Math.max(0, col),
            {
              virt_text: [[hint, "HellshakeYanoMarker"]],
              virt_text_pos: virtTextPos,
              priority: 100,
            },
          );
        } catch (extmarkError) {
          extmarkFailCount++;

          // フォールバックとしてmatchadd()を使用
          try {
            const pattern = `\\%${word.line}l\\%${word.col}c.`;
            const matchId = await denops.call(
              "matchadd",
              "HellshakeYanoMarker",
              pattern,
              100,
            ) as number;
            fallbackMatchIds.push(matchId);
          } catch (matchError) {
          }

          // 失敗が多すぎる場合はextmarkを諦めてmatchaddに切り替え
          if (extmarkFailCount >= maxFailures) {
            const currentIndex = hints.findIndex((h) => h.word === word && h.hint === hint);
            if (currentIndex !== -1) {
              await displayHintsWithMatchAdd(denops, hints.slice(currentIndex));
            }
            break;
          }
        }
      }
    } else {
      // Vim または extmark が利用できない場合: matchadd()を使用
      await displayHintsWithMatchAdd(denops, hints);
    }
  } catch (error) {
    // 最後の手段としてユーザーに通知
    await denops.cmd(
      "echohl ErrorMsg | echo 'hellshake-yano: Failed to display hints' | echohl None",
    );

    // 音声フィードバック（可能な場合）
    try {
      await denops.cmd("call feedkeys('\\<C-g>', 'n')"); // ベル音
    } catch {
      // ベル音も失敗した場合は何もしない
    }

    throw error;
  }
}

/**
 * matchadd()を使用してヒントを表示する（フォールバック機能）
 */
async function displayHintsWithMatchAdd(
  denops: Denops,
  hints: HintMapping[],
  mode: string = "normal",
): Promise<void> {
  try {
    for (const { word, hint } of hints) {
      try {
        const position = calculateHintPositionWithCoordinateSystem(
          word,
          config.hintPosition,
          config.debugCoordinates,
        );
        let pattern: string;

        switch (position.display_mode) {
          case "before":
          case "after":
            pattern = `\\%${position.vim_line}l\\%${position.vim_col}c.`;
            break;
          case "overlay":
            // 単語全体にマッチ（オーバーレイ風）
            pattern = `\\%${position.vim_line}l\\%>${position.vim_col - 1}c\\%<${
              position.vim_col + word.text.length + 1
            }c`;
            break;
          default:
            pattern = `\\%${position.vim_line}l\\%${position.vim_col}c.`;
        }

        const matchId = await denops.call(
          "matchadd",
          "HellshakeYanoMarker",
          pattern,
          100,
        ) as number;
        fallbackMatchIds.push(matchId);

        // Vimではテキストの表示はできないので、ヒント文字の情報をコメントとして記録
      } catch (matchError) {
      }
    }
  } catch (error) {
    throw error;
  }
}

/**
 * ヒントの表示だけをクリアする（currentHintsは保持）
 * highlightCandidateHints用の専用関数
 *
 * @param denops - Denopsインスタンス
 */
async function clearHintDisplay(denops: Denops): Promise<void> {
  try {
    if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
      // Neovim: extmarkをクリア
      try {
        const bufnr = await denops.call("bufnr", "%") as number;
        if (bufnr !== -1) {
          const bufExists = await denops.call("bufexists", bufnr) as number;
          if (bufExists) {
            await denops.call("nvim_buf_clear_namespace", bufnr, extmarkNamespace, 0, -1);
          }
        }
      } catch (extmarkError) {
      }
    }

    // フォールバック用のmatchをクリア
    if (fallbackMatchIds.length > 0) {
      try {
        for (const matchId of fallbackMatchIds) {
          try {
            await denops.call("matchdelete", matchId);
          } catch (matchError) {
            // 個別のmatch削除エラーは警告のみ
          }
        }
        fallbackMatchIds = [];
      } catch (error) {
        // 最後の手段として全matchをクリア
        try {
          await denops.call("clearmatches");
        } catch (clearError) {
        }
      }
    }

    // Vim またはその他のケース: 全matchをクリア
    if (denops.meta.host !== "nvim") {
      try {
        await denops.call("clearmatches");
      } catch (clearError) {
      }
    }
  } catch (error) {
  }
  // 注意: currentHints, hintsVisible, fallbackMatchIds は保持する
}

/**
 * ヒントを非表示にする（エラーハンドリング強化版）
 *
 * @param denops - Denopsインスタンス
 * @throws Vim/Neovim APIエラーが発生した場合（ただし内部でキャッチして継続）
 */
async function hideHints(denops: Denops): Promise<void> {
  // Phase10: シングルトンインスタンスを使用
  const core = Core.getInstance(config);
  core.hideHints();

  // 既にヒントが非表示で、currentHintsも空の場合は早期リターン
  if (!hintsVisible && currentHints.length === 0 && fallbackMatchIds.length === 0) {
    return;
  }

  // 状態を先にリセットして、再入を防ぐ
  hintsVisible = false;

  try {
    if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
      // Neovim: extmarkをクリア
      try {
        const bufnr = await denops.call("bufnr", "%") as number;
        if (bufnr !== -1) {
          const bufExists = await denops.call("bufexists", bufnr) as number;
          if (bufExists) {
            await denops.call("nvim_buf_clear_namespace", bufnr, extmarkNamespace, 0, -1);
          }
        }
      } catch (extmarkError) {
      }
    }

    // フォールバック用のmatchをクリア
    if (fallbackMatchIds.length > 0) {
      try {
        for (const matchId of fallbackMatchIds) {
          try {
            await denops.call("matchdelete", matchId);
          } catch (matchError) {
            // 個別のmatch削除エラーは警告のみ
          }
        }
      } catch (error) {
        // 最後の手段として全matchをクリア
        try {
          await denops.call("clearmatches");
        } catch (clearError) {
        }
      }
    }

    // Vim またはその他のケース: 全matchをクリア
    if (denops.meta.host !== "nvim") {
      try {
        await denops.call("clearmatches");
      } catch (clearError) {
      }
    }
  } catch (error) {
  } finally {
    // エラーが発生しても状態は必ずリセットする
    currentHints = [];
    hintsVisible = false;
    fallbackMatchIds = [];
  }
}

/**
 * 候補のヒントをハイライト表示（UX改善）
 */
async function highlightCandidateHints(
  denops: Denops,
  inputPrefix: string,
): Promise<void> {
  if (!config.highlightSelected) return;

  try {
    // 候補となるヒントを分類
    const matchingHints = currentHints.filter((h) => h.hint.startsWith(inputPrefix));
    const nonMatchingHints = currentHints.filter((h) => !h.hint.startsWith(inputPrefix));

    if (currentHints.length === 0) return;

    // バッファの存在確認
    const bufnr = await denops.call("bufnr", "%") as number;
    if (bufnr === -1) return;

    // 表示だけをクリア（currentHintsは保持）
    await clearHintDisplay(denops);

    // Neovimの場合はextmarkで再表示
    if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
      // マッチするヒントを表示（1文字目をハイライト）
      for (const hint of matchingHints) {
        try {
          // 既存の位置情報を使用（再計算しない）
          const line = hint.word.line - 1; // 0ベースに変換
          let col = 0;
          if (hint.hintByteCol !== undefined && hint.hintByteCol > 0) {
            col = hint.hintByteCol - 1;
          } else if (hint.hintCol !== undefined && hint.hintCol > 0) {
            col = hint.hintCol - 1;
          } else {
            col = (hint.word.byteCol || hint.word.col) - 1;
          }

          // ヒントテキストを分割
          const firstChar = hint.hint.substring(0, inputPrefix.length);
          const remainingChars = hint.hint.substring(inputPrefix.length);

          // 分割したテキストを異なるハイライトで表示
          const virtText: Array<[string, string]> = [];
          if (firstChar) {
            virtText.push([firstChar, "HellshakeYanoMarkerCurrent"]);
          }
          if (remainingChars) {
            virtText.push([remainingChars, "HellshakeYanoMarker"]);
          }

          await denops.call(
            "nvim_buf_set_extmark",
            bufnr,
            extmarkNamespace,
            line,
            Math.max(0, col),
            {
              virt_text: virtText,
              virt_text_pos: "overlay",
              priority: 999,
            },
          );
        } catch (error) {
        }
      }

      // マッチしないヒントを通常表示
      for (const hint of nonMatchingHints) {
        try {
          // 既存の位置情報を使用（再計算しない）
          const line = hint.word.line - 1; // 0ベースに変換
          let col = 0;
          if (hint.hintByteCol !== undefined && hint.hintByteCol > 0) {
            col = hint.hintByteCol - 1;
          } else if (hint.hintCol !== undefined && hint.hintCol > 0) {
            col = hint.hintCol - 1;
          } else {
            col = (hint.word.byteCol || hint.word.col) - 1;
          }

          await denops.call(
            "nvim_buf_set_extmark",
            bufnr,
            extmarkNamespace,
            line,
            Math.max(0, col),
            {
              virt_text: [[hint.hint, "HellshakeYanoMarker"]],
              virt_text_pos: "overlay",
              priority: 100,
            },
          );
        } catch (error) {
        }
      }
    } else {
      // Vimの場合はmatchaddで再表示
      // マッチするヒントをHellshakeYanoMarkerCurrentで表示
      for (const hint of matchingHints) {
        try {
          const position = calculateHintPositionWithCoordinateSystem(
            hint.word,
            config.hintPosition,
            config.debugCoordinates,
          );

          let pattern: string;
          switch (position.display_mode) {
            case "before":
            case "after":
              pattern = `\\%${position.vim_line}l\\%${position.vim_col}c.`;
              break;
            case "overlay":
              pattern = `\\%${position.vim_line}l\\%>${position.vim_col - 1}c\\%<${
                position.vim_col + hint.word.text.length + 1
              }c`;
              break;
            default:
              pattern = `\\%${position.vim_line}l\\%${position.vim_col}c.`;
          }

          const matchId = await denops.call(
            "matchadd",
            "HellshakeYanoMarkerCurrent",
            pattern,
            999,
          ) as number;
          fallbackMatchIds.push(matchId);
        } catch (error) {
        }
      }

      // マッチしないヒントをHellshakeYanoMarkerで表示
      for (const hint of nonMatchingHints) {
        try {
          const position = calculateHintPositionWithCoordinateSystem(
            hint.word,
            config.hintPosition,
            config.debugCoordinates,
          );

          let pattern: string;
          switch (position.display_mode) {
            case "before":
            case "after":
              pattern = `\\%${position.vim_line}l\\%${position.vim_col}c.`;
              break;
            case "overlay":
              pattern = `\\%${position.vim_line}l\\%>${position.vim_col - 1}c\\%<${
                position.vim_col + hint.word.text.length + 1
              }c`;
              break;
            default:
              pattern = `\\%${position.vim_line}l\\%${position.vim_col}c.`;
          }

          const matchId = await denops.call(
            "matchadd",
            "HellshakeYanoMarker",
            pattern,
            100,
          ) as number;
          fallbackMatchIds.push(matchId);
        } catch (error) {
        }
      }
    }

    // ヒント表示状態を保持
    hintsVisible = true;
  } catch (error) {
    // エラー時は元のヒントを復元
    hintsVisible = false;
  }
}

/**
 * 候補ヒントを非同期でハイライト表示する（UX改善）
 * Fire-and-forgetパターンで描画を実行し、ユーザー入力をブロックしない
 * 入力プレフィックスに一致するヒントのみを強調表示
 *
 * @param denops Denosランタイムオブジェクト
 * @param inputPrefix ユーザーが入力した文字列のプレフィックス
 * @param onComplete 描画完了時のコールバック関数（オプション）
 * @returns {void} Promiseを返さない（非ブロッキング処理）
 * @since 1.0.0
 * @example
 * // 1文字目入力後のハイライト更新
 * highlightCandidateHintsAsync(denops, "a");
 *
 * // 完了コールバック付き実行
 * highlightCandidateHintsAsync(denops, "ab", () => {
 *   console.log("ハイライト描画完了");
 * });
 */
export function highlightCandidateHintsAsync(
  denops: Denops,
  inputPrefix: string,
  onComplete?: () => void,
): void {
  // 前のハイライト描画をキャンセル
  if (_highlightAbortController) {
    _highlightAbortController.abort();
  }

  // 新しいAbortControllerを作成
  _highlightAbortController = new AbortController();
  const currentController = _highlightAbortController;

  // 非同期でハイライト処理を実行（awaitしない）
  (async () => {
    try {
      // AbortSignalをチェックしながら処理
      if (currentController.signal.aborted) {
        return;
      }

      await highlightCandidateHintsOptimized(denops, inputPrefix, currentController.signal);

      // 完了コールバックを実行
      if (onComplete && !currentController.signal.aborted) {
        onComplete();
      }
    } catch (error) {
      // エラーは内部でキャッチして、外部に投げない（非ブロッキング保証）
      if (error instanceof Error) {
        console.error("[hellshake-yano] Async highlight error:", error.message, error.stack);
      } else {
        console.error("[hellshake-yano] Async highlight error:", error);
      }
    } finally {
      // この描画が現在のものである場合のみフラグをリセット
      if (currentController === _highlightAbortController) {
        _highlightAbortController = null;
      }
    }
  })();
}

/**
 * バッチ処理でヒントのハイライトを最適化
 *
 * @description 大量のヒントを処理する際にメインスレッドをブロックしないよう、
 *              バッチごとに制御を返しながら段階的に描画を行う
 * @param denops - Denops インスタンス
 * @param inputPrefix - マッチングに使用する入力プレフィックス
 * @param signal - 中断シグナル
 * @throws Error - バッファが無効な場合やその他の描画エラー
 */
async function highlightCandidateHintsOptimized(
  denops: Denops,
  inputPrefix: string,
  signal: AbortSignal,
): Promise<void> {
  if (!config.highlightSelected) return;

  // 候補となるヒントを分類
  const matchingHints = currentHints.filter((h) => h.hint.startsWith(inputPrefix));
  const nonMatchingHints = currentHints.filter((h) => !h.hint.startsWith(inputPrefix));

  if (currentHints.length === 0) return;

  // バッファの存在確認
  const bufnr = await denops.call("bufnr", "%") as number;
  if (bufnr === -1 || signal.aborted) return;

  // 表示だけをクリア（currentHintsは保持）
  await clearHintDisplay(denops);

  if (signal.aborted) return;

  // Neovimの場合はextmarkで再表示
  if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
    await processExtmarksBatched(
      denops,
      matchingHints,
      nonMatchingHints,
      inputPrefix,
      bufnr,
      signal,
    );
  } else {
    // Vimの場合はmatchaddで再表示
    await processMatchaddBatched(denops, matchingHints, nonMatchingHints, signal);
  }

  if (!signal.aborted) {
    // ヒント表示状態を保持
    hintsVisible = true;
  }
}

/**
 * Neovim extmarkのバッチ処理
 */
async function processExtmarksBatched(
  denops: Denops,
  matchingHints: HintMapping[],
  nonMatchingHints: HintMapping[],
  inputPrefix: string,
  bufnr: number,
  signal: AbortSignal,
): Promise<void> {
  // マッチするヒントを優先的に処理
  let processed = 0;

  for (const hint of matchingHints) {
    if (signal.aborted) return;

    try {
      const line = hint.word.line - 1; // 0ベースに変換
      let col = 0;
      if (hint.hintByteCol !== undefined && hint.hintByteCol > 0) {
        col = hint.hintByteCol - 1;
      } else if (hint.hintCol !== undefined && hint.hintCol > 0) {
        col = hint.hintCol - 1;
      } else {
        col = (hint.word.byteCol || hint.word.col) - 1;
      }

      // ヒントテキストを分割
      const firstChar = hint.hint.substring(0, inputPrefix.length);
      const remainingChars = hint.hint.substring(inputPrefix.length);

      // 分割したテキストを異なるハイライトで表示
      const virtText: Array<[string, string]> = [];
      if (firstChar) {
        virtText.push([firstChar, "HellshakeYanoMarkerCurrent"]);
      }
      if (remainingChars) {
        virtText.push([remainingChars, "HellshakeYanoMarker"]);
      }

      await denops.call(
        "nvim_buf_set_extmark",
        bufnr,
        extmarkNamespace,
        line,
        Math.max(0, col),
        {
          virt_text: virtText,
          virt_text_pos: "overlay",
          priority: 999,
        },
      );
    } catch (error) {
      // エラーは無視して続行
    }

    processed++;
    // バッチサイズに達したら制御を返す
    if (processed % HIGHLIGHT_BATCH_SIZE === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  // マッチしないヒントを通常表示
  for (const hint of nonMatchingHints) {
    if (signal.aborted) return;

    try {
      const line = hint.word.line - 1; // 0ベースに変換
      let col = 0;
      if (hint.hintByteCol !== undefined && hint.hintByteCol > 0) {
        col = hint.hintByteCol - 1;
      } else if (hint.hintCol !== undefined && hint.hintCol > 0) {
        col = hint.hintCol - 1;
      } else {
        col = (hint.word.byteCol || hint.word.col) - 1;
      }

      await denops.call(
        "nvim_buf_set_extmark",
        bufnr,
        extmarkNamespace,
        line,
        Math.max(0, col),
        {
          virt_text: [[hint.hint, "HellshakeYanoMarker"]],
          virt_text_pos: "overlay",
          priority: 100,
        },
      );
    } catch (error) {
      // エラーは無視して続行
    }

    processed++;
    // バッチサイズに達したら制御を返す
    if (processed % HIGHLIGHT_BATCH_SIZE === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
}

/**
 * Vim matchaddのバッチ処理
 */
async function processMatchaddBatched(
  denops: Denops,
  matchingHints: HintMapping[],
  nonMatchingHints: HintMapping[],
  signal: AbortSignal,
): Promise<void> {
  let processed = 0;

  // マッチするヒントをHellshakeYanoMarkerCurrentで表示
  for (const hint of matchingHints) {
    if (signal.aborted) return;

    try {
      const position = calculateHintPositionWithCoordinateSystem(
        hint.word,
        config.hintPosition,
        config.debugCoordinates,
      );

      let pattern: string;
      switch (position.display_mode) {
        case "before":
        case "after":
          pattern = `\\%${position.vim_line}l\\%${position.vim_col}c.`;
          break;
        case "overlay":
          pattern = `\\%${position.vim_line}l\\%>${position.vim_col - 1}c\\%<${
            position.vim_col + hint.word.text.length + 1
          }c`;
          break;
        default:
          pattern = `\\%${position.vim_line}l\\%${position.vim_col}c.`;
      }

      const matchId = await denops.call(
        "matchadd",
        "HellshakeYanoMarkerCurrent",
        pattern,
        999,
      ) as number;
      fallbackMatchIds.push(matchId);
    } catch (error) {
      // エラーは無視して続行
    }

    processed++;
    // バッチサイズに達したら制御を返す
    if (processed % HIGHLIGHT_BATCH_SIZE === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  // マッチしないヒントをHellshakeYanoMarkerで表示
  for (const hint of nonMatchingHints) {
    if (signal.aborted) return;

    try {
      const position = calculateHintPositionWithCoordinateSystem(
        hint.word,
        config.hintPosition,
        config.debugCoordinates,
      );

      let pattern: string;
      switch (position.display_mode) {
        case "before":
        case "after":
          pattern = `\\%${position.vim_line}l\\%${position.vim_col}c.`;
          break;
        case "overlay":
          pattern = `\\%${position.vim_line}l\\%>${position.vim_col - 1}c\\%<${
            position.vim_col + hint.word.text.length + 1
          }c`;
          break;
        default:
          pattern = `\\%${position.vim_line}l\\%${position.vim_col}c.`;
      }

      const matchId = await denops.call(
        "matchadd",
        "HellshakeYanoMarker",
        pattern,
        100,
      ) as number;
      fallbackMatchIds.push(matchId);
    } catch (error) {
      // エラーは無視して続行
    }

    processed++;
    // バッチサイズに達したら制御を返す
    if (processed % HIGHLIGHT_BATCH_SIZE === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
}

/**
 * ユーザーのヒント選択入力を待機し、選択された位置にジャンプする
 *
 * ユーザーが入力したヒント文字列に対応する位置にカーソルを移動します。
 * 複数文字のヒントにも対応し、タイムアウト機能を備えています。
 *
 * @param denops - Denopsインスタンス
 * @throws ユーザーがESCでキャンセルした場合
 * @example
 * ```typescript
 * // ヒント表示後に呼び出し
 * await waitForUserInput(denops);
 * // ユーザーが "A" を入力すると、ヒント "A" の位置にジャンプ
 * ```
 */
async function waitForUserInput(denops: Denops): Promise<void> {
  let timeoutId: number | undefined;

  try {
    // 入力タイムアウト設定（設定可能）
    const inputTimeout = config.motionTimeout || 2000;

    // プロンプトを表示
    // await denops.cmd("echo 'Select hint: '");

    // 短い待機時間を入れて、前回の入力が誤って拾われるのを防ぐ
    await new Promise((resolve) => setTimeout(resolve, 50));

    // タイムアウト付きでユーザー入力を取得
    const inputPromise = denops.call("getchar") as Promise<number>;
    const timeoutPromise = new Promise<number>((resolve) => {
      timeoutId = setTimeout(() => resolve(-2), inputTimeout) as unknown as number; // -2 = 全体タイムアウト
    });

    const char = await Promise.race([inputPromise, timeoutPromise]);

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }

    // 全体タイムアウトの場合
    if (char === -2) {
      await hideHints(denops);
      return;
    }

    // ESCキーの場合はキャンセル
    if (char === 27) {
      await hideHints(denops);
      return;
    }

    // Ctrl+C やその他の制御文字の処理
    if (char < 32 && char !== 13) { // Enter(13)以外の制御文字
      await hideHints(denops);
      return;
    }

    // 元の入力が大文字かどうかを記録（A-Z: 65-90）
    const wasUpperCase = char >= 65 && char <= 90;
    // 元の入力が数字かどうかを記録（0-9: 48-57）
    const wasNumber = char >= 48 && char <= 57;
    // 元の入力が小文字かどうかを記録（a-z: 97-122）
    const wasLowerCase = char >= 97 && char <= 122;

    // 小文字の場合は、ヒントをキャンセルして通常のVim動作を実行
    if (wasLowerCase) {
      await hideHints(denops);
      // 小文字をそのままVimに渡す
      const originalChar = String.fromCharCode(char);
      await denops.call("feedkeys", originalChar, "n");
      return;
    }

    // 文字に変換
    let inputChar: string;
    try {
      inputChar = String.fromCharCode(char);
      // アルファベットの場合は大文字に変換（数字はそのまま）
      if (/[a-zA-Z]/.test(inputChar)) {
        inputChar = inputChar.toUpperCase();
      }
    } catch (_charError) {
      await denops.cmd("echohl ErrorMsg | echo 'Invalid character input' | echohl None");
      await hideHints(denops);
      return;
    }

    // 現在のキー設定に数字が含まれているかチェック
    const allKeys = [...(config.singleCharKeys || []), ...(config.multiCharKeys || [])];
    const hasNumbers = allKeys.some((k) => /^\d$/.test(k));

    // 有効な文字範囲チェック（use_numbersがtrueまたはキー設定に数字が含まれていれば数字を許可）
    const validPattern = (config.useNumbers || hasNumbers) ? /[A-Z0-9]/ : /[A-Z]/;
    const errorMessage = (config.useNumbers || hasNumbers)
      ? "Please use alphabetic characters (A-Z) or numbers (0-9) only"
      : "Please use alphabetic characters only";

    if (!validPattern.test(inputChar)) {
      await denops.cmd(`echohl WarningMsg | echo '${errorMessage}' | echohl None`);
      try {
        await denops.cmd("call feedkeys('\\<C-g>', 'n')"); // ベル音
      } catch {
        // ベル音が失敗しても続行
      }
      await hideHints(denops);
      return;
    }

    // 入力文字で始まる全てのヒントを探す（単一文字と複数文字の両方）
    const matchingHints = currentHints.filter((h) => h.hint.startsWith(inputChar));

    if (matchingHints.length === 0) {
      // 該当するヒントがない場合は終了（視覚・音声フィードバック付き）
      await denops.cmd("echohl WarningMsg | echo 'No matching hint found' | echohl None");
      try {
        await denops.cmd("call feedkeys('\\<C-g>', 'n')"); // ベル音
      } catch {
        // ベル音が失敗しても続行
      }
      await hideHints(denops);
      return;
    }

    // 単一文字のヒントと複数文字のヒントを分離
    const singleCharTarget = matchingHints.find((h) => h.hint === inputChar);
    const multiCharHints = matchingHints.filter((h) => h.hint.length > 1);

    if (config.useHintGroups) {
      // デフォルトのキー設定
      const singleOnlyKeys = config.singleCharKeys ||
        [
          "A",
          "S",
          "D",
          "F",
          "G",
          "H",
          "J",
          "K",
          "L",
          "N",
          "M",
          "0",
          "1",
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
        ];
      const multiOnlyKeys = config.multiCharKeys ||
        ["B", "C", "E", "I", "O", "P", "Q", "R", "T", "U", "V", "W", "X", "Y", "Z"];

      // 1文字専用キーの場合：即座にジャンプ（タイムアウトなし）
      if (singleOnlyKeys.includes(inputChar) && singleCharTarget) {
        try {
          // ヒント位置情報を使用（Visual modeでの語尾ジャンプ対応）
          const jumpCol = singleCharTarget.hintByteCol || singleCharTarget.hintCol ||
            singleCharTarget.word.byteCol || singleCharTarget.word.col;

          // デバッグログ: ジャンプ位置の詳細
          if (config.debugMode) {
            console.log(`[hellshake-yano:DEBUG] Jump to single char hint:`);
            console.log(`  - text: "${singleCharTarget.word.text}"`);
            console.log(`  - line: ${singleCharTarget.word.line}`);
            console.log(`  - col: ${singleCharTarget.word.col} (display)`);
            console.log(`  - byteCol: ${singleCharTarget.word.byteCol} (byte)`);
            console.log(`  - hintCol: ${singleCharTarget.hintCol} (hint display)`);
            console.log(`  - hintByteCol: ${singleCharTarget.hintByteCol} (hint byte)`);
            console.log(`  - jumpCol (used): ${jumpCol}`);
          }

          await denops.call("cursor", singleCharTarget.word.line, jumpCol);
          // await denops.cmd(`echo 'Jumped to "${singleCharTarget.word.text}"' | redraw`);
        } catch (jumpError) {
          await denops.cmd("echohl ErrorMsg | echo 'Failed to jump to target' | echohl None");
        }
        await hideHints(denops);
        return;
      }

      // 2文字専用キーの場合：必ず2文字目を待つ（タイムアウトなし）
      if (multiOnlyKeys.includes(inputChar) && multiCharHints.length > 0) {
        // 2文字目の入力を待つ処理は後続のコードで実行される
        // ただし、タイムアウト処理をスキップするフラグを設定
        // この場合は通常の処理フローを続ける
      }
    } else {
      // Option 3: 1文字ヒントが存在する場合は即座にジャンプ（他の条件に関係なく）
      if (singleCharTarget) {
        try {
          // ヒント位置情報を使用（Visual modeでの語尾ジャンプ対応）
          const jumpCol = singleCharTarget.hintByteCol || singleCharTarget.hintCol ||
            singleCharTarget.word.byteCol || singleCharTarget.word.col;

          // デバッグログ: ジャンプ位置の詳細
          if (config.debugMode) {
            console.log(`[hellshake-yano:DEBUG] Jump to single char target (Option 3):`);
            console.log(`  - text: "${singleCharTarget.word.text}"`);
            console.log(`  - line: ${singleCharTarget.word.line}`);
            console.log(`  - col: ${singleCharTarget.word.col} (display)`);
            console.log(`  - byteCol: ${singleCharTarget.word.byteCol} (byte)`);
            console.log(`  - hintCol: ${singleCharTarget.hintCol} (hint display)`);
            console.log(`  - hintByteCol: ${singleCharTarget.hintByteCol} (hint byte)`);
            console.log(`  - jumpCol (used): ${jumpCol}`);
          }

          await denops.call("cursor", singleCharTarget.word.line, jumpCol);
          // await denops.cmd(`echo 'Jumped to "${singleCharTarget.word.text}"' | redraw`);
        } catch (jumpError) {
          await denops.cmd("echohl ErrorMsg | echo 'Failed to jump to target' | echohl None");
        }
        await hideHints(denops);
        return;
      }
    }

    // 候補のヒントをハイライト表示（UX改善）
    // Option 3: 1文字ヒントが存在する場合はハイライト処理をスキップ
    const shouldHighlight = config.highlightSelected && !singleCharTarget;

    if (shouldHighlight) {
      // 非同期版を使用してメインスレッドをブロックしない
      // awaitを使用せず非同期実行することで、ユーザー入力の応答性を維持
      highlightCandidateHintsAsync(denops, inputChar);
    }

    // 第2文字の入力を待機
    // await denops.cmd(`echo 'Select hint: ${inputChar}' | redraw`);

    let secondChar: number;

    if (config.useHintGroups) {
      const multiOnlyKeys = config.multiCharKeys ||
        ["B", "C", "E", "I", "O", "P", "Q", "R", "T", "U", "V", "W", "X", "Y", "Z"];

      if (multiOnlyKeys.includes(inputChar)) {
        // 2文字専用キーの場合：タイムアウトなしで2文字目を待つ
        secondChar = await denops.call("getchar") as number;
      } else {
        // それ以外（従来の動作）：タイムアウトあり
        const secondInputPromise = denops.call("getchar") as Promise<number>;
        const secondTimeoutPromise = new Promise<number>((resolve) => {
          timeoutId = setTimeout(() => resolve(-1), 800) as unknown as number; // 800ms後にタイムアウト
        });

        secondChar = await Promise.race([secondInputPromise, secondTimeoutPromise]);

        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
      }
    } else {
      // 従来の動作：タイムアウトあり
      const secondInputPromise = denops.call("getchar") as Promise<number>;
      const secondTimeoutPromise = new Promise<number>((resolve) => {
        timeoutId = setTimeout(() => resolve(-1), 800) as unknown as number; // 800ms後にタイムアウト
      });

      secondChar = await Promise.race([secondInputPromise, secondTimeoutPromise]);

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    }

    if (secondChar === -1) {
      // タイムアウトの場合
      if (matchingHints.length === 1) {
        // 候補が1つの場合は自動選択
        const target = matchingHints[0];
        try {
          // ヒント位置情報を使用（Visual modeでの語尾ジャンプ対応）
          const jumpCol = target.hintByteCol || target.hintCol || target.word.byteCol ||
            target.word.col;

          // デバッグログ: ジャンプ位置の詳細
          if (config.debugMode) {
            console.log(`[hellshake-yano:DEBUG] Auto-select single candidate:`);
            console.log(`  - text: "${target.word.text}"`);
            console.log(`  - line: ${target.word.line}`);
            console.log(`  - col: ${target.word.col} (display)`);
            console.log(`  - byteCol: ${target.word.byteCol} (byte)`);
            console.log(`  - hintCol: ${target.hintCol} (hint display)`);
            console.log(`  - hintByteCol: ${target.hintByteCol} (hint byte)`);
            console.log(`  - jumpCol (used): ${jumpCol}`);
          }

          await denops.call("cursor", target.word.line, jumpCol);
          // await denops.cmd(`echo 'Auto-selected "${target.word.text}"'`);
        } catch (jumpError) {
          await denops.cmd("echohl ErrorMsg | echo 'Failed to jump to target' | echohl None");
        }
      } else if (singleCharTarget) {
        // タイムアウトで単一文字ヒントがある場合はそれを選択
        try {
          // ヒント位置情報を使用（Visual modeでの語尾ジャンプ対応）
          const jumpCol = singleCharTarget.hintByteCol || singleCharTarget.hintCol ||
            singleCharTarget.word.byteCol || singleCharTarget.word.col;

          // デバッグログ: ジャンプ位置の詳細
          if (config.debugMode) {
            console.log(`[hellshake-yano:DEBUG] Timeout select single char hint:`);
            console.log(`  - text: "${singleCharTarget.word.text}"`);
            console.log(`  - line: ${singleCharTarget.word.line}`);
            console.log(`  - col: ${singleCharTarget.word.col} (display)`);
            console.log(`  - byteCol: ${singleCharTarget.word.byteCol} (byte)`);
            console.log(`  - hintCol: ${singleCharTarget.hintCol} (hint display)`);
            console.log(`  - hintByteCol: ${singleCharTarget.hintByteCol} (hint byte)`);
            console.log(`  - jumpCol (used): ${jumpCol}`);
          }

          await denops.call("cursor", singleCharTarget.word.line, jumpCol);
          // await denops.cmd(`echo 'Selected "${singleCharTarget.word.text}" (timeout)' | redraw`);
        } catch (jumpError) {
          await denops.cmd("echohl ErrorMsg | echo 'Failed to jump to target' | echohl None");
        }
      } else {
        await denops.cmd(`echo 'Timeout - ${matchingHints.length} candidates available'`);
      }
      await hideHints(denops);
      return;
    }

    // ESCキーの場合はキャンセル
    if (secondChar === 27) {
      await denops.cmd("echo 'Cancelled'");
      await hideHints(denops);
      return;
    }

    // 第2文字を結合
    let secondInputChar: string;
    try {
      secondInputChar = String.fromCharCode(secondChar);
      // アルファベットの場合は大文字に変換（数字はそのまま）
      if (/[a-zA-Z]/.test(secondInputChar)) {
        secondInputChar = secondInputChar.toUpperCase();
      }
    } catch (_charError) {
      await denops.cmd("echohl ErrorMsg | echo 'Invalid second character' | echohl None");
      await hideHints(denops);
      return;
    }

    // 有効な文字範囲チェック（数字対応）
    const secondValidPattern = config.useNumbers ? /[A-Z0-9]/ : /[A-Z]/;
    const secondErrorMessage = config.useNumbers
      ? "Second character must be alphabetic or numeric"
      : "Second character must be alphabetic";

    if (!secondValidPattern.test(secondInputChar)) {
      await denops.cmd(`echohl WarningMsg | echo '${secondErrorMessage}' | echohl None`);
      await hideHints(denops);
      return;
    }

    const fullHint = inputChar + secondInputChar;

    // 完全なヒントを探す
    const target = currentHints.find((h) => h.hint === fullHint);

    if (target) {
      // カーソルを移動（byteColが利用可能な場合は使用）
      try {
        // ヒント位置情報を使用（Visual modeでの語尾ジャンプ対応）
        const jumpCol = target.hintByteCol || target.hintCol || target.word.byteCol ||
          target.word.col;

        // デバッグログ: ジャンプ位置の詳細
        if (config.debugMode) {
          console.log(`[hellshake-yano:DEBUG] Jump to hint "${fullHint}":`);
          console.log(`  - text: "${target.word.text}"`);
          console.log(`  - line: ${target.word.line}`);
          console.log(`  - col: ${target.word.col} (display)`);
          console.log(`  - byteCol: ${target.word.byteCol} (byte)`);
          console.log(`  - hintCol: ${target.hintCol} (hint display)`);
          console.log(`  - hintByteCol: ${target.hintByteCol} (hint byte)`);
          console.log(`  - jumpCol (used): ${jumpCol}`);
        }

        await denops.call("cursor", target.word.line, jumpCol);
        // await denops.cmd(`echo 'Jumped to "${target.word.text}"'`);
      } catch (jumpError) {
        await denops.cmd("echohl ErrorMsg | echo 'Failed to jump to target' | echohl None");
      }
    } else {
      // 無効なヒント組み合わせの場合（視覚・音声フィードバック付き）
      await denops.cmd(
        `echohl ErrorMsg | echo 'Invalid hint combination: ${fullHint}' | echohl None`,
      );
      try {
        await denops.cmd("call feedkeys('\\<C-g>', 'n')"); // ベル音
      } catch {
        // ベル音が失敗しても続行
      }
    }

    // ヒントを非表示
    await hideHints(denops);
  } catch (error) {
    // タイムアウトをクリア
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // エラー時のユーザーフィードバック
    try {
      await denops.cmd("echohl ErrorMsg | echo 'Input error - hints cleared' | echohl None");
      await denops.cmd("call feedkeys('\\<C-g>', 'n')"); // ベル音
    } catch {
      // フィードバックが失敗しても続行
    }

    await hideHints(denops);
    throw error;
  }
}

/**
 * 設定値を検証する (DEPRECATED)
 * プラグイン設定の妥当性をチェックし、エラー情報を返す
 *
 * @deprecated この関数は廃止予定です。代わりに config.ts の validateUnifiedConfig() を使用してください。
 * この関数は Process2 Sub3 の統合バリデーション実装により、重複したバリデーションロジックとなりました。
 * 新しいコードでは import { validateUnifiedConfig } from "./config.ts" を使用してください。
 *
 * @param cfg 検証対象の設定オブジェクト（部分的でも可）
 * @returns {{valid: boolean, errors: string[]}} 検証結果とエラーメッセージのリスト
 * @since 1.0.0
 * @example
 * // 旧方式（非推奨）
 * const result = validateConfig({ motion_count: -1 });
 *
 * // 新方式（推奨）
 * import { validateUnifiedConfig } from "./config.ts";
 * const result = validateUnifiedConfig({ motionCount: -1 });
 */
export function validateConfig(cfg: Partial<Config>): { valid: boolean; errors: string[] } {
  // Process2 Sub5: config.tsのvalidateConfig()に委譲
  // config.tsのvalidateConfigは型チェックとUnifiedConfig変換を適切に処理する
  return validateConfigFromConfigModule(cfg);
}

/**
 * プラグインのデフォルト設定を取得する
 * 初期化時や設定リセット時に使用される標準設定値を提供
 *
 * @returns {Config} すべてのデフォルト設定値を含む設定オブジェクト
 * @since 1.0.0
 * @example
 * // デフォルト設定を取得して一部を変更
 * const config = getDefaultConfig();
 * config.motionCount = 5;
 */
export function getDefaultConfig(): Config {
  // Process2 Sub5: config.tsのgetDefaultUnifiedConfig()に委譲し、Config型に変換
  const unifiedConfig = getDefaultUnifiedConfig();
  return fromUnifiedConfig(unifiedConfig);
}

/**
 * Vimのハイライトグループ名として有効かどうか検証する
 * REFACTOR Phase: Core.validateHighlightGroupNameメソッドのラッパー関数
 *
 * Vimのハイライトグループ名は以下のルールに従う必要がある：
 * - 英字またはアンダースコアで始まる
 * - 英数字とアンダースコアのみ使用可能
 * - 100文字以下
 * @param groupName 検証するハイライトグループ名
 * @returns 有効な場合はtrue、無効な場合はfalse
 */
export function validateHighlightGroupName(groupName: string): boolean {
  return Core.validateHighlightGroupName(groupName);
}

/**
 * 色名が有効なVim色名かどうか検証する
 * @param colorName 検証する色名
 * @returns 有効な場合はtrue、無効な場合はfalse
 */
export function isValidColorName(colorName: string): boolean {
  if (!colorName || typeof colorName !== "string") {
    return false;
  }

  // 標準的なVim色名（大文字小文字不区別）
  const validColorNames = [
    "black",
    "darkblue",
    "darkgreen",
    "darkcyan",
    "darkred",
    "darkmagenta",
    "brown",
    "darkgray",
    "darkgrey",
    "lightgray",
    "lightgrey",
    "lightblue",
    "lightgreen",
    "lightcyan",
    "lightred",
    "lightmagenta",
    "yellow",
    "white",
    "red",
    "green",
    "blue",
    "cyan",
    "magenta",
    "gray",
    "grey",
    "none",
  ];

  return validColorNames.includes(colorName.toLowerCase());
}

/**
 * 16進数色表記が有効かどうか検証する
 * @param hexColor 検証する16進数色（例: "#ff0000", "#fff"）
 * @returns 有効な場合はtrue、無効な場合はfalse
 */
export function isValidHexColor(hexColor: string): boolean {
  if (!hexColor || typeof hexColor !== "string") {
    return false;
  }

  // #で始まること
  if (!hexColor.startsWith("#")) {
    return false;
  }

  // #を除いた部分
  const hex = hexColor.slice(1);

  // 3桁または6桁の16進数
  if (hex.length !== 3 && hex.length !== 6) {
    return false;
  }

  // 有効な16進数文字のみ
  return /^[0-9a-fA-F]+$/.test(hex);
}

/**
 * 色値を正規化する（大文字小文字を統一）
 * @param color 正規化する色値
 * @returns 正規化された色値
 */
export function normalizeColorName(color: string): string {
  if (!color || typeof color !== "string") {
    return color;
  }

  // 16進数色の場合はそのまま返す
  if (color.startsWith("#")) {
    return color;
  }

  // 色名の場合は最初の文字を大文字、残りを小文字にする
  return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
}

/**
 * ハイライト色設定を検証する
 * @param colorConfig 検証するハイライト色設定
 * @returns 検証結果
 */
export function validateHighlightColor(
  colorConfig: string | HighlightColor,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // null と undefined のチェック
  if (colorConfig === null) {
    errors.push("highlight_hint_marker must be a string");
    return { valid: false, errors };
  }

  // 数値や配列などの無効な型チェック
  if (typeof colorConfig === "number") {
    errors.push("highlight_hint_marker must be a string");
    return { valid: false, errors };
  }

  if (Array.isArray(colorConfig)) {
    errors.push("highlight_hint_marker must be a string");
    return { valid: false, errors };
  }

  // 文字列の場合（従来のハイライトグループ名）
  if (typeof colorConfig === "string") {
    // 空文字列チェック
    if (colorConfig === "") {
      errors.push("highlight_hint_marker must be a non-empty string");
      return { valid: false, errors };
    }

    // ハイライトグループ名のバリデーション
    if (!validateHighlightGroupName(colorConfig)) {
      // より詳細なエラーメッセージを提供
      if (!/^[a-zA-Z_]/.test(colorConfig)) {
        errors.push("highlight_hint_marker must start with a letter or underscore");
      } else if (!/^[a-zA-Z0-9_]+$/.test(colorConfig)) {
        errors.push(
          "highlight_hint_marker must contain only alphanumeric characters and underscores",
        );
      } else if (colorConfig.length > 100) {
        errors.push("highlight_hint_marker must be 100 characters or less");
      } else {
        errors.push(`Invalid highlight group name: ${colorConfig}`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  // オブジェクトの場合（fg/bg個別指定）
  if (typeof colorConfig === "object" && colorConfig !== null) {
    const { fg, bg } = colorConfig;

    // fgの検証
    if (fg !== undefined) {
      if (typeof fg !== "string") {
        errors.push("fg must be a string");
      } else if (fg === "") {
        errors.push("fg cannot be empty string");
      } else if (!isValidColorName(fg) && !isValidHexColor(fg)) {
        errors.push(`Invalid fg color: ${fg}`);
      }
    }

    // bgの検証
    if (bg !== undefined) {
      if (typeof bg !== "string") {
        errors.push("bg must be a string");
      } else if (bg === "") {
        errors.push("bg cannot be empty string");
      } else if (!isValidColorName(bg) && !isValidHexColor(bg)) {
        errors.push(`Invalid bg color: ${bg}`);
      }
    }

    // fgもbgも指定されていない場合
    if (fg === undefined && bg === undefined) {
      errors.push("At least one of fg or bg must be specified");
    }

    return { valid: errors.length === 0, errors };
  }

  errors.push("Color configuration must be a string or object");
  return { valid: false, errors };
}

/**
 * ハイライトコマンドを生成する
 * @param hlGroupName ハイライトグループ名
 * @param colorConfig 色設定
 * @returns 生成されたハイライトコマンド
 */
export function generateHighlightCommand(
  hlGroupName: string,
  colorConfig: string | HighlightColor,
): string {
  // 文字列の場合（従来のハイライトグループ名）
  if (typeof colorConfig === "string") {
    return `highlight default link ${hlGroupName} ${colorConfig}`;
  }

  // オブジェクトの場合（fg/bg個別指定）
  const { fg, bg } = colorConfig;
  const parts = [`highlight ${hlGroupName}`];

  if (fg !== undefined) {
    const normalizedFg = normalizeColorName(fg);
    if (fg.startsWith("#")) {
      // 16進数色の場合はguifgのみ
      parts.push(`guifg=${fg}`);
    } else {
      // 色名の場合はctermfgとguifgの両方
      parts.push(`ctermfg=${normalizedFg}`);
      parts.push(`guifg=${normalizedFg}`);
    }
  }

  if (bg !== undefined) {
    const normalizedBg = normalizeColorName(bg);
    if (bg.startsWith("#")) {
      // 16進数色の場合はguibgのみ
      parts.push(`guibg=${bg}`);
    } else {
      // 色名の場合はctermbgとguibgの両方
      parts.push(`ctermbg=${normalizedBg}`);
      parts.push(`guibg=${normalizedBg}`);
    }
  }

  return parts.join(" ");
}

/**
 * ハイライト設定を検証する（設定更新時に使用）
 * @param config 検証する設定オブジェクト
 * @returns 検証結果
 */
export function validateHighlightConfig(
  config: {
    highlightHintMarker?: string | HighlightColor;
    highlightHintMarkerCurrent?: string | HighlightColor;
  },
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // highlightHintMarkerの検証
  if (config.highlightHintMarker !== undefined) {
    const markerResult = validateHighlightColor(config.highlightHintMarker);
    if (!markerResult.valid) {
      errors.push(...markerResult.errors.map((e) => `highlightHintMarker: ${e}`));
    }
  }

  // highlightHintMarkerCurrentの検証
  if (config.highlightHintMarkerCurrent !== undefined) {
    const currentResult = validateHighlightColor(config.highlightHintMarkerCurrent);
    if (!currentResult.valid) {
      errors.push(...currentResult.errors.map((e) => `highlightHintMarkerCurrent: ${e}`));
    }
  }

  return { valid: errors.length === 0, errors };
}

// Dictionary system variables (deprecated - migrated to Core class)
let dictionaryLoader: DictionaryLoader | null = null;
let vimConfigBridge: VimConfigBridge | null = null;

/**
 * Get or create Core instance for dictionary system operations
 * Helper function to ensure Core instance is available
 */
async function getCoreForDictionary(denops: Denops): Promise<Core> {
  // Phase10: シングルトンインスタンスを使用
  const core = Core.getInstance(config);

  // Ensure dictionary system is initialized
  if (!core.hasDictionarySystem()) {
    await core.initializeDictionarySystem(denops);
  }
  return core;
}

/**
 * Initialize dictionary system (deprecated - migrated to Core class)
 * @deprecated Use Core.initializeDictionarySystem() instead
 */
async function initializeDictionarySystem(denops: Denops): Promise<void> {
  console.warn("[hellshake-yano] initializeDictionarySystem is deprecated. Using Core class instead.");
  const core = await getCoreForDictionary(denops);
  // Initialization handled by getCoreForDictionary
}

/**
 * Register dictionary-related Vim commands (deprecated - migrated to Core class)
 * @deprecated Commands are now registered by Core.initializeDictionarySystem()
 */
async function registerDictionaryCommands(denops: Denops): Promise<void> {
  console.warn("[hellshake-yano] registerDictionaryCommands is deprecated. Commands are registered by Core class.");
  // Commands are now registered in Core.initializeDictionarySystem()
}

/**
 * 辞書ファイルから辞書データを再読み込みする
 * 辞書ファイルが更新された際に最新の単語データを反映
 *
 * @param denops Denosランタイムオブジェクト
 * @returns {Promise<void>} 再読み込み完了のPromise
 * @since 1.0.0
 * @throws 辞書ファイルの読み込みに失敗した場合
 * @example
 * // 辞書を再読み込み
 * await reloadDictionary(denops);
 */
export async function reloadDictionary(denops: Denops): Promise<void> {
  try {
    const core = await getCoreForDictionary(denops);
    await core.reloadDictionary(denops);
  } catch (error) {
    await denops.cmd(`echoerr "Failed to reload dictionary: ${error}"`);
  }
}

/**
 * 辞書ファイルを編集用に開く
 * ユーザー定義の辞書ファイルをVim/Neovimで編集可能にする
 *
 * @param denops Denosランタイムオブジェクト
 * @returns {Promise<void>} ファイルオープン完了のPromise
 * @since 1.0.0
 * @throws ファイルのオープンに失敗した場合
 * @example
 * // 辞書ファイルを編集モードで開く
 * await editDictionary(denops);
 */
export async function editDictionary(denops: Denops): Promise<void> {
  try {
    const core = await getCoreForDictionary(denops);
    await core.editDictionary(denops);
  } catch (error) {
    await denops.cmd(`echoerr "Failed to edit dictionary: ${error}"`);
  }
}

/**
 * 現在の辞書内容を表示する
 * 読み込まれている辞書データの一覧をVim/Neovimに表示
 *
 * @param denops Denosランタイムオブジェクト
 * @returns {Promise<void>} 表示完了のPromise
 * @since 1.0.0
 * @throws 辞書データの取得に失敗した場合
 * @example
 * // 現在の辞書内容を表示
 * await showDictionary(denops);
 */
export async function showDictionary(denops: Denops): Promise<void> {
  try {
    const core = await getCoreForDictionary(denops);
    await core.showDictionary(denops);
  } catch (error) {
    await denops.cmd(`echoerr "Failed to show dictionary: ${error}"`);
  }
}

/**
 * 辞書ファイルの形式を検証する
 * 辞書データの整合性と形式の正当性を確認し、結果を報告
 *
 * @param denops Denosランタイムオブジェクト
 * @returns {Promise<void>} 検証完了のPromise
 * @since 1.0.0
 * @throws 検証処理に失敗した場合
 * @example
 * // 辞書ファイルの形式を検証
 * await validateDictionary(denops);
 */
export async function validateDictionary(denops: Denops): Promise<void> {
  try {
    const core = await getCoreForDictionary(denops);
    await core.validateDictionary(denops);
  } catch (error) {
    await denops.cmd(`echoerr "Failed to validate dictionary: ${error}"`);
  }
}

// Export necessary functions for dispatcher and testing
export {
  clearDebugInfo,
  collectDebugInfo,
  detectWordsOptimized,
  // displayHintsOptimized, // Phase6: Coreクラスに移行済み、廃止予定
  // generateHintsOptimized, // Phase5: Coreクラスに移行済み、廃止予定
  hideHints,
  syncManagerConfig,
};
