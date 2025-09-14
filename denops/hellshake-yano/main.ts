import type { Denops } from "@denops/std";
import {
  detectWords,
  detectWordsWithConfig,
  detectWordsWithManager,
  type EnhancedWordConfig,
  extractWordsFromLineWithConfig,
} from "./word.ts";
import { getWordDetectionManager, resetWordDetectionManager } from "./word/manager.ts";
import {
  assignHintsToWords,
  calculateHintPosition,
  calculateHintPositionWithCoordinateSystem,
  generateHints,
  generateHintsWithGroups,
  type HintKeyConfig,
  type HintMapping,
  type HintPositionWithCoordinateSystem,
  validateHintKeyConfig,
} from "./hint.ts";

// ハイライト色の個別指定インターフェース
export interface HighlightColor {
  fg?: string; // 前景色（'Red' or '#ff0000' or 'NONE'）
  bg?: string; // 背景色（'Blue' or '#0000ff' or 'NONE'）
}

// 設定の型定義
export interface Config {
  markers: string[];
  motion_count: number;
  motion_timeout: number;
  hint_position: string;
  trigger_on_hjkl: boolean;
  counted_motions: string[];
  enabled: boolean;
  maxHints: number; // パフォーマンス最適化: 最大ヒント数
  debounceDelay: number; // デバウンス遅延時間
  use_numbers: boolean; // 数字(0-9)をヒント文字として使用
  highlight_selected: boolean; // 選択中のヒントをハイライト（UX改善）
  debug_coordinates: boolean; // 座標系デバッグログの有効/無効
  // Process 50 Sub2: 1文字/2文字ヒント割り当て設定
  single_char_keys?: string[]; // 1文字ヒント専用キー
  multi_char_keys?: string[]; // 2文字以上ヒント専用キー
  max_single_char_hints?: number; // 1文字ヒントの最大数
  use_hint_groups?: boolean; // ヒントグループ機能を使用するか
  // Process 50 Sub3: 日本語除外機能
  use_japanese?: boolean; // 日本語を含む単語検出を行うか（デフォルト: false）
  // Process 50 Sub7: 単語検出アブストラクション設定
  word_detection_strategy?: "regex" | "tinysegmenter" | "hybrid"; // 単語検出アルゴリズム（デフォルト: "hybrid"）
  enable_tinysegmenter?: boolean; // TinySegmenterを有効にするか（デフォルト: true）
  segmenter_threshold?: number; // TinySegmenterを使用する最小文字数（デフォルト: 4）
  // 日本語分割精度設定
  japanese_min_word_length?: number; // 日本語の最小単語長（デフォルト: 2）
  japanese_merge_particles?: boolean; // 助詞や接続詞を前の単語と結合（デフォルト: true）
  japanese_merge_threshold?: number; // 結合する最大文字数（デフォルト: 2）
  // Process 50 Sub5: ハイライト色設定（fg/bg個別指定対応）
  highlight_hint_marker?: string | HighlightColor; // ヒントマーカーのハイライト色
  highlight_hint_marker_current?: string | HighlightColor; // 選択中ヒントのハイライト色
}

// グローバル状態
// deno-lint-ignore prefer-const
let config: Config = {
  markers: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  motion_count: 3,
  motion_timeout: 2000,
  hint_position: "start",
  trigger_on_hjkl: true,
  counted_motions: [],
  enabled: true,
  maxHints: 336, // Approach A対応: 11単文字 + 225二文字 + 100数字 = 336個
  debounceDelay: 50, // 50msのデバウンス
  use_numbers: true, // デフォルトで数字を使用可能
  highlight_selected: true, // デフォルトで選択中ヒントをハイライト
  debug_coordinates: false, // デフォルトでデバッグログは無効
  // Process 50 Sub3: デフォルトのキー分離設定
  single_char_keys: [
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
  ],
  multi_char_keys: ["B", "C", "E", "I", "O", "P", "Q", "R", "T", "U", "V", "W", "X", "Y", "Z"],
  // max_single_char_hints: undefined, // デフォルトは制限なし（single_char_keysの長さ）
  use_hint_groups: true, // デフォルトで有効
  // use_japanese: デフォルト値を設定しない（ユーザー設定を優先）
  // Process 50 Sub7: 単語検出アブストラクションのデフォルト設定
  word_detection_strategy: "hybrid" as const, // ハイブリッド方式をデフォルトに
  enable_tinysegmenter: true, // TinySegmenterを有効に
  segmenter_threshold: 4, // 4文字以上でセグメンテーション
  japanese_min_word_length: 2, // 2文字以上の単語のみヒント表示
  japanese_merge_particles: true, // 助詞を前の単語と結合
  japanese_merge_threshold: 2, // 2文字以下の単語を結合対象とする
  // Process 50 Sub5: ハイライト色設定のデフォルト値
  highlight_hint_marker: "DiffAdd", // ヒントマーカーのハイライト色（後方互換性のため文字列）
  highlight_hint_marker_current: "DiffText", // 選択中ヒントのハイライト色（後方互換性のため文字列）
};

let currentHints: HintMapping[] = [];
let hintsVisible = false;
let extmarkNamespace: number | undefined;
let fallbackMatchIds: number[] = []; // matchadd()のフォールバック用ID

// パフォーマンス最適化用の状態管理
let debounceTimeoutId: number | undefined;
let lastShowHintsTime = 0;
let wordsCache: {
  bufnr: number;
  topLine: number;
  bottomLine: number;
  content: string;
  words: any[];
} | null = null;
let hintsCache: { wordCount: number; hints: string[] } | null = null;

/**
 * プラグインのメインエントリポイント
 */
export async function main(denops: Denops): Promise<void> {
  // Neovimの場合のみextmarkのnamespaceを作成
  if (denops.meta.host === "nvim") {
    extmarkNamespace = await denops.call(
      "nvim_create_namespace",
      "hellshake_yano_hints",
    ) as number;
  }

  // dispatcherの設定
  denops.dispatcher = {
    /**
     * 設定を更新（検証処理付き）
     */
    updateConfig(newConfig: unknown): void {
      // 型安全のため、Partial<Config>として処理
      const cfg = newConfig as Partial<Config>;

      // カスタムマーカー設定の検証と適用
      if (cfg.markers && Array.isArray(cfg.markers)) {
        // マーカーの検証: 文字列配列であることを確認
        const validMarkers = cfg.markers.filter((m): m is string =>
          typeof m === "string" && m.length > 0
        );
        if (validMarkers.length > 0) {
          config.markers = validMarkers;
        } else {
          // console.warn("[hellshake-yano] Invalid markers provided, keeping default");
        }
      }

      // motion_count の検証（1以上の整数）
      if (typeof cfg.motion_count === "number") {
        if (cfg.motion_count >= 1 && Number.isInteger(cfg.motion_count)) {
          config.motion_count = cfg.motion_count;
        } else {
          // console.warn(`[hellshake-yano] Invalid motion_count: ${cfg.motion_count}, must be integer >= 1`);
        }
      }

      // motion_timeout の検証（100ms以上）
      if (typeof cfg.motion_timeout === "number") {
        if (cfg.motion_timeout >= 100) {
          config.motion_timeout = cfg.motion_timeout;
        } else {
          // console.warn(`[hellshake-yano] Invalid motion_timeout: ${cfg.motion_timeout}, must be >= 100ms`);
        }
      }

      // hint_position の検証（'start', 'end', 'overlay'のみ許可）
      if (typeof cfg.hint_position === "string") {
        const validPositions = ["start", "end", "overlay"];
        if (validPositions.includes(cfg.hint_position)) {
          config.hint_position = cfg.hint_position;
        } else {
          // console.warn(`[hellshake-yano] Invalid hint_position: ${cfg.hint_position}, must be one of: ${validPositions.join(", ")}`);
        }
      }

      // trigger_on_hjkl の適用
      if (typeof cfg.trigger_on_hjkl === "boolean") {
        config.trigger_on_hjkl = cfg.trigger_on_hjkl;
      }

      // counted_motions の適用
      if (Array.isArray(cfg.counted_motions)) {
        // 各要素が1文字の文字列か検証
        const validKeys = cfg.counted_motions.filter((key: any) =>
          typeof key === "string" && key.length === 1
        );
        if (validKeys.length === cfg.counted_motions.length) {
          config.counted_motions = [...validKeys];
        } else {
          console.warn(
            `[hellshake-yano] Some keys in counted_motions are invalid, using valid keys only: ${validKeys}`,
          );
          config.counted_motions = [...validKeys];
        }
      }

      // enabled の適用
      if (typeof cfg.enabled === "boolean") {
        config.enabled = cfg.enabled;
      }

      // use_numbers の適用（数字対応）
      if (typeof cfg.use_numbers === "boolean") {
        config.use_numbers = cfg.use_numbers;
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
        config.highlight_selected = cfg.highlight_selected;
      }

      // debug_coordinates の適用（デバッグ用）
      if (typeof cfg.debug_coordinates === "boolean") {
        config.debug_coordinates = cfg.debug_coordinates;
      }

      // maxHints の検証（1以上の整数）
      if (typeof cfg.maxHints === "number") {
        if (cfg.maxHints >= 1 && Number.isInteger(cfg.maxHints)) {
          config.maxHints = cfg.maxHints;
        } else {
          // console.warn(`[hellshake-yano] Invalid maxHints: ${cfg.maxHints}, must be integer >= 1`);
        }
      }

      // debounceDelay の検証（0以上の数値）
      if (typeof cfg.debounceDelay === "number") {
        if (cfg.debounceDelay >= 0) {
          config.debounceDelay = cfg.debounceDelay;
        } else {
          // console.warn(`[hellshake-yano] Invalid debounceDelay: ${cfg.debounceDelay}, must be >= 0`);
        }
      }

      // Process 50 Sub2: ヒントグループ設定の適用
      // single_char_keys の検証と適用
      if (cfg.single_char_keys && Array.isArray(cfg.single_char_keys)) {
        const validKeys = cfg.single_char_keys.filter((k): k is string =>
          typeof k === "string" && k.length === 1
        );
        if (validKeys.length > 0) {
          config.single_char_keys = validKeys;
        } else {
          // console.warn("[hellshake-yano] Invalid single_char_keys provided");
        }
      }

      // multi_char_keys の検証と適用
      if (cfg.multi_char_keys && Array.isArray(cfg.multi_char_keys)) {
        const validKeys = cfg.multi_char_keys.filter((k): k is string =>
          typeof k === "string" && k.length === 1
        );
        if (validKeys.length > 0) {
          config.multi_char_keys = validKeys;
        } else {
          // console.warn("[hellshake-yano] Invalid multi_char_keys provided");
        }
      }

      // max_single_char_hints の検証
      if (typeof cfg.max_single_char_hints === "number") {
        if (cfg.max_single_char_hints >= 0 && Number.isInteger(cfg.max_single_char_hints)) {
          config.max_single_char_hints = cfg.max_single_char_hints;
        } else {
          // console.warn(`[hellshake-yano] Invalid max_single_char_hints: ${cfg.max_single_char_hints}`);
        }
      }

      // use_hint_groups の適用
      if (typeof cfg.use_hint_groups === "boolean") {
        config.use_hint_groups = cfg.use_hint_groups;
      }

      // Process 50 Sub3: use_japanese の適用
      if (typeof cfg.use_japanese === "boolean") {
        config.use_japanese = cfg.use_japanese;
      }

      // Process 50 Sub6: use_improved_detection は統合済み（常に有効）

      // Process 50 Sub7: 単語検出アブストラクション設定
      if (typeof cfg.word_detection_strategy === "string") {
        const validStrategies = ["regex", "tinysegmenter", "hybrid"];
        if (validStrategies.includes(cfg.word_detection_strategy)) {
          config.word_detection_strategy = cfg.word_detection_strategy;

          // マネージャーをリセットして新しい設定を適用
          resetWordDetectionManager();
        } else {
          // console.warn(`[hellshake-yano] Invalid word_detection_strategy: ${cfg.word_detection_strategy}, must be one of: ${validStrategies.join(", ")}`);
        }
      }

      if (typeof cfg.enable_tinysegmenter === "boolean") {
        config.enable_tinysegmenter = cfg.enable_tinysegmenter;
        resetWordDetectionManager();
      }

      if (typeof cfg.segmenter_threshold === "number") {
        if (cfg.segmenter_threshold >= 1 && Number.isInteger(cfg.segmenter_threshold)) {
          config.segmenter_threshold = cfg.segmenter_threshold;
          resetWordDetectionManager();
        } else {
          // console.warn(`[hellshake-yano] Invalid segmenter_threshold: ${cfg.segmenter_threshold}, must be integer >= 1`);
        }
      }

      // Process 50 Sub5: highlight_hint_marker の検証と適用（fg/bg対応）
      if (cfg.highlight_hint_marker !== undefined) {
        const markerResult = validateHighlightColor(cfg.highlight_hint_marker);
        if (markerResult.valid) {
          config.highlight_hint_marker = cfg.highlight_hint_marker;
          const displayValue = typeof cfg.highlight_hint_marker === "string"
            ? cfg.highlight_hint_marker
            : JSON.stringify(cfg.highlight_hint_marker);
        } else {
          // console.warn(`[hellshake-yano] Invalid highlight_hint_marker: ${markerResult.errors.join(', ')}`);
        }
      }

      // Process 50 Sub5: highlight_hint_marker_current の検証と適用（fg/bg対応）
      if (cfg.highlight_hint_marker_current !== undefined) {
        const currentResult = validateHighlightColor(cfg.highlight_hint_marker_current);
        if (currentResult.valid) {
          config.highlight_hint_marker_current = cfg.highlight_hint_marker_current;
          const displayValue = typeof cfg.highlight_hint_marker_current === "string"
            ? cfg.highlight_hint_marker_current
            : JSON.stringify(cfg.highlight_hint_marker_current);
        } else {
          // console.warn(`[hellshake-yano] Invalid highlight_hint_marker_current: ${currentResult.errors.join(', ')}`);
        }
      }
    },

    /**
     * ヒントを表示（デバウンス機能付き）
     */
    async showHints(): Promise<void> {
      // デバウンス処理
      const now = Date.now();
      if (now - lastShowHintsTime < config.debounceDelay) {
        if (debounceTimeoutId) {
          clearTimeout(debounceTimeoutId);
        }
        debounceTimeoutId = setTimeout(() => {
          this.showHintsInternal();
        }, config.debounceDelay) as unknown as number;
        return;
      }

      await this.showHintsInternal();
    },

    /**
     * 内部的なヒント表示処理（最適化版）
     */
    async showHintsInternal(): Promise<void> {
      lastShowHintsTime = Date.now();

      // デバウンスタイムアウトをクリア
      if (debounceTimeoutId) {
        clearTimeout(debounceTimeoutId);
        debounceTimeoutId = undefined;
      }

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
          const words = await detectWordsOptimized(denops, bufnr);
          if (words.length === 0) {
            await denops.cmd("echo 'No words found for hints'");
            return;
          }

          // maxHints設定を使用してヒント数を制限
          let effectiveMaxHints: number;

          // hint groups使用時は実際の容量を計算
          if (config.use_hint_groups && config.single_char_keys && config.multi_char_keys) {
            const singleCharCount = Math.min(
              config.single_char_keys.length,
              config.max_single_char_hints || config.single_char_keys.length,
            );
            const multiCharCount = config.multi_char_keys.length * config.multi_char_keys.length;
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

          // キャッシュを使用してヒントを生成（最適化）
          const hints = generateHintsOptimized(limitedWords.length, config.markers);
          currentHints = assignHintsToWords(
            limitedWords,
            hints,
            cursorLine,
            cursorCol,
          );

          if (currentHints.length === 0) {
            await denops.cmd("echo 'No valid hints could be generated'");
            return;
          }

          // バッチ処理でヒントを表示（最適化）
          await displayHintsOptimized(denops, currentHints);
          hintsVisible = true;

          // ユーザー入力を待機
          await waitForUserInput(denops);
          return; // 成功した場合はリトライループを抜ける
        } catch (error) {
          retryCount++;
          // console.error(`[hellshake-yano] Error in showHintsInternal (attempt ${retryCount}/${maxRetries + 1}):`, error);

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
     * ヒントを非表示
     */
    async hideHints(): Promise<void> {
      // デバウンスタイムアウトをクリア
      if (debounceTimeoutId) {
        clearTimeout(debounceTimeoutId);
        debounceTimeoutId = undefined;
      }
      await hideHints(denops);
    },

    /**
     * キャッシュをクリア
     */
    clearCache(): void {
      wordsCache = null;
      hintsCache = null;
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
          //             hasExtmarks: debugInfo.capabilities?.hasExtmarks,
          //             bufferType: debugInfo.buffer?.type,
          //             readonly: debugInfo.buffer?.readonly
          //           });
        } catch (error) {
        }

        await denops.cmd("echo 'Error handling tests completed. Check console for results.'");
      } catch (error) {
        // console.error("[hellshake-yano] Error in testErrorHandling:", error);
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
        // console.error("[hellshake-yano] Error in testConfig:", error);
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
        // console.error("[hellshake-yano] Error in testMultiCharHints:", error);
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
        const debugInfo = await denops.dispatcher.debug?.() as any;

        // キャッシュ統計
        try {
          const { getWordDetectionCacheStats } = await import("./word.ts");
          const { getHintCacheStats } = await import("./hint.ts");

          const wordCacheStats = getWordDetectionCacheStats();
          const hintCacheStats = getHintCacheStats();
        } catch (error) {
          // console.warn("Could not retrieve cache statistics:", error);
        }

        await denops.cmd("echo 'Performance test completed. Check console for detailed results.'");
      } catch (error) {
        // console.error("[hellshake-yano] Error in testPerformance:", error);
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
        const debugInfo = await denops.dispatcher.debug?.() as any;

        // 設定を元に戻す
        config.maxHints = originalMaxHints;

        await denops.cmd(
          `echo 'Stress test completed in ${executionTime}ms with ${
            debugInfo?.currentHintsCount || 0
          } hints'`,
        );
      } catch (error) {
        // console.error("[hellshake-yano] Error in testStress:", error);
        await denops.cmd("echohl ErrorMsg | echo 'Stress test failed' | echohl None");
      }
    },
  };
}

/**
 * キャッシュを使用した最適化済み単語検出
 */
async function detectWordsOptimized(denops: Denops, bufnr: number): Promise<any[]> {
  try {
    // Process 50 Sub7: 新しい単語検出マネージャーを使用
    const enhancedConfig: EnhancedWordConfig = {
      strategy: config.word_detection_strategy,
      use_japanese: config.use_japanese,
      // use_improved_detection は常にtrueとして統合済み
      enable_tinysegmenter: config.enable_tinysegmenter,
      segmenter_threshold: config.segmenter_threshold,
      cache_enabled: true,
      auto_detect_language: true,
    };

    const result = await detectWordsWithManager(denops, enhancedConfig);

    if (result.success) {
      return result.words;
    } else {
      // console.warn(`[hellshake-yano] Enhanced detection failed, using fallback: ${result.error}`);

      // フォールバックとしてレガシーメソッドを使用
      return await detectWordsWithConfig(denops, {
        use_japanese: config.use_japanese,
      });
    }
  } catch (error) {
    // console.error("[hellshake-yano] Error in detectWordsOptimized:", error);

    // 最終フォールバックとしてレガシーメソッドを使用
    return await detectWordsWithConfig(denops, {
      use_japanese: config.use_japanese,
    });
  }
}

/**
 * キャッシュを使用した最適化済みヒント生成
 */
function generateHintsOptimized(wordCount: number, markers: string[]): string[] {
  // Process 50 Sub2: ヒントグループ機能を使用する場合
  if (config.use_hint_groups && (config.single_char_keys || config.multi_char_keys)) {
    const hintConfig: HintKeyConfig = {
      single_char_keys: config.single_char_keys,
      multi_char_keys: config.multi_char_keys,
      max_single_char_hints: config.max_single_char_hints,
      markers: markers,
    };

    // 設定の検証
    const validation = validateHintKeyConfig(hintConfig);
    if (!validation.valid) {
      // console.error("[hellshake-yano] Invalid hint key configuration:", validation.errors);
      // フォールバックとして通常のヒント生成を使用
      return generateHints(wordCount, markers);
    }

    return generateHintsWithGroups(wordCount, hintConfig);
  }

  // 従来のヒント生成処理
  // キャッシュヒットチェック
  if (hintsCache && hintsCache.wordCount === wordCount) {
    return hintsCache.hints.slice(0, wordCount);
  }

  // キャッシュミスの場合、新たにヒントを生成
  const hints = generateHints(wordCount, markers);

  // キャッシュを更新（最大1000個まで）
  if (wordCount <= 1000) {
    hintsCache = { wordCount, hints };
  }

  return hints;
}

/**
 * バッチ処理で最適化されたヒント表示
 */
async function displayHintsOptimized(denops: Denops, hints: HintMapping[]): Promise<void> {
  try {
    // バッファの存在確認
    const bufnr = await denops.call("bufnr", "%") as number;
    if (bufnr === -1) {
      throw new Error("Invalid buffer: no current buffer available");
    }

    // バッファが読み込み専用かチェック
    const readonly = await denops.call("getbufvar", bufnr, "&readonly") as number;
    if (readonly) {
      // console.warn("[hellshake-yano] Buffer is readonly, hints may not display correctly");
    }

    if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
      // Neovim: バッチ処理でextmarkを作成
      await displayHintsWithExtmarksBatch(denops, bufnr, hints);
    } else {
      // Vim: バッチ処理でmatchaddを作成
      await displayHintsWithMatchAddBatch(denops, hints);
    }
  } catch (error) {
    // console.error("[hellshake-yano] Critical error in displayHintsOptimized:", error);

    // フォールバックとして通常の表示処理を使用
    await displayHints(denops, hints);
  }
}

/**
 * バッチ処理でextmarkを作成
 */
async function displayHintsWithExtmarksBatch(
  denops: Denops,
  bufnr: number,
  hints: HintMapping[],
): Promise<void> {
  const batchSize = 50; // バッチサイズ
  let extmarkFailCount = 0;
  const maxFailures = 5;

  for (let i = 0; i < hints.length; i += batchSize) {
    const batch = hints.slice(i, i + batchSize);

    try {
      // バッチ内の各extmarkを作成
      await Promise.all(batch.map(async ({ word, hint }, index) => {
        try {
          // バッファの有効性を再確認
          const bufValid = await denops.call("bufexists", bufnr) as number;
          if (!bufValid) {
            throw new Error(`Buffer ${bufnr} no longer exists`);
          }

          // Process 50 Sub3: 座標系対応の新しい位置計算関数を使用
          const position = calculateHintPositionWithCoordinateSystem(
            word,
            config.hint_position,
            config.debug_coordinates,
          );
          // デバッグログ追加
          if (config.debug_coordinates) {
          }
          const col = position.nvim_col; // Neovim extmark用（既に0ベース変換済み）
          let virtTextPos: "overlay" | "eol" = "overlay";

          if (position.display_mode === "overlay") {
            virtTextPos = "overlay";
          }

          // 行とカラムの境界チェック
          const lineCount = await denops.call("line", "$") as number;
          if (word.line > lineCount || word.line < 1) {
            // console.warn(`[hellshake-yano] Invalid line number: ${word.line} (max: ${lineCount})`);
            return;
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
          // console.warn(`[hellshake-yano] Extmark failed for hint '${hint}' in batch ${Math.floor(i / batchSize)}:`, extmarkError);

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
            // console.error(`[hellshake-yano] Both extmark and matchadd failed for hint '${hint}':`, matchError);
          }

          // 失敗が多すぎる場合はextmarkを諦めてmatchaddに切り替え
          if (extmarkFailCount >= maxFailures) {
            // console.warn("[hellshake-yano] Too many extmark failures, switching to matchadd for remaining hints");
            const remainingHints = hints.slice(i + index + 1);
            if (remainingHints.length > 0) {
              await displayHintsWithMatchAddBatch(denops, remainingHints);
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
      // console.error(`[hellshake-yano] Error in batch ${Math.floor(i / batchSize)}:`, batchError);
      // バッチエラーの場合は次のバッチに続く
    }
  }
}

/**
 * バッチ処理でmatchaddを作成
 */
async function displayHintsWithMatchAddBatch(denops: Denops, hints: HintMapping[]): Promise<void> {
  const batchSize = 100; // matchaddはより高速なので大きなバッチサイズ

  for (let i = 0; i < hints.length; i += batchSize) {
    const batch = hints.slice(i, i + batchSize);

    try {
      // バッチ内の各matchを作成
      const matchPromises = batch.map(async ({ word, hint }) => {
        try {
          // Process 50 Sub3: 座標系対応の新しい位置計算関数を使用してパターンを生成
          const position = calculateHintPositionWithCoordinateSystem(
            word,
            config.hint_position,
            config.debug_coordinates,
          );
          if (config.debug_coordinates) {
          }
          let pattern: string;

          switch (position.display_mode) {
            case "before":
            case "after":
              pattern = `\\%${position.vim_line}l\\%${position.vim_col}c.`;
              break;
            case "overlay":
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

          return matchId;
        } catch (matchError) {
          // console.warn(`[hellshake-yano] Failed to add match for hint '${hint}' at (${word.line}, ${word.col}):`, matchError);
          return null;
        }
      });

      await Promise.all(matchPromises);

      // バッチ間の小さな遅延（CPU負荷を減らす）
      if (i + batchSize < hints.length && hints.length > 200) {
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    } catch (batchError) {
      // console.error(`[hellshake-yano] Error in match batch ${Math.floor(i / batchSize)}:`, batchError);
      // バッチエラーの場合は次のバッチに続く
    }
  }
}

/**
 * ヒントを表示する（エラーハンドリング強化版）
 */
async function displayHints(denops: Denops, hints: HintMapping[]): Promise<void> {
  try {
    // バッファの存在確認
    const bufnr = await denops.call("bufnr", "%") as number;
    if (bufnr === -1) {
      throw new Error("Invalid buffer: no current buffer available");
    }

    // バッファが読み込み専用かチェック
    const readonly = await denops.call("getbufvar", bufnr, "&readonly") as number;
    if (readonly) {
      // console.warn("[hellshake-yano] Buffer is readonly, hints may not display correctly");
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

          // Process 50 Sub3: 座標系対応の新しい位置計算関数を使用
          const position = calculateHintPositionWithCoordinateSystem(
            word,
            config.hint_position,
            config.debug_coordinates,
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
            // console.warn(`[hellshake-yano] Invalid line number: ${word.line} (max: ${lineCount})`);
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
          // console.warn(`[hellshake-yano] Extmark failed for hint '${hint}' at (${word.line}, ${word.col}):`, extmarkError);

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
            // console.error(`[hellshake-yano] Both extmark and matchadd failed for hint '${hint}':`, matchError);
          }

          // 失敗が多すぎる場合はextmarkを諦めてmatchaddに切り替え
          if (extmarkFailCount >= maxFailures) {
            // console.warn("[hellshake-yano] Too many extmark failures, switching to matchadd for remaining hints");
            await displayHintsWithMatchAdd(denops, hints.slice(hints.indexOf({ word, hint })));
            break;
          }
        }
      }
    } else {
      // Vim または extmark が利用できない場合: matchadd()を使用
      await displayHintsWithMatchAdd(denops, hints);
    }
  } catch (error) {
    // console.error("[hellshake-yano] Critical error in displayHints:", error);

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
async function displayHintsWithMatchAdd(denops: Denops, hints: HintMapping[]): Promise<void> {
  try {
    for (const { word, hint } of hints) {
      try {
        // Process 50 Sub3: 座標系対応の新しい位置計算関数を使用してパターンを生成
        const position = calculateHintPositionWithCoordinateSystem(
          word,
          config.hint_position,
          config.debug_coordinates,
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
        // console.warn(`[hellshake-yano] Failed to add match for hint '${hint}' at (${word.line}, ${word.col}):`, matchError);
      }
    }
  } catch (error) {
    // console.error("[hellshake-yano] Error in displayHintsWithMatchAdd:", error);
    throw error;
  }
}

/**
 * ヒントを非表示にする（エラーハンドリング強化版）
 */
async function hideHints(denops: Denops): Promise<void> {
  if (!hintsVisible) {
    return;
  }

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
        // console.warn("[hellshake-yano] Failed to clear extmarks:", extmarkError);
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
            // console.warn(`[hellshake-yano] Failed to delete match ${matchId}:`, matchError);
          }
        }
        fallbackMatchIds = [];
      } catch (error) {
        // console.warn("[hellshake-yano] Error clearing fallback matches:", error);
        // 最後の手段として全matchをクリア
        try {
          await denops.call("clearmatches");
        } catch (clearError) {
          // console.error("[hellshake-yano] Failed to clear all matches:", clearError);
        }
      }
    }

    // Vim またはその他のケース: 全matchをクリア
    if (denops.meta.host !== "nvim") {
      try {
        await denops.call("clearmatches");
      } catch (clearError) {
        // console.warn("[hellshake-yano] Failed to clear matches:", clearError);
      }
    }
  } catch (error) {
    // console.error("[hellshake-yano] Error in hideHints:", error);
  } finally {
    // エラーが発生しても状態はリセットする
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
  if (!config.highlight_selected) return;

  try {
    // 候補となるヒントを見つける
    const candidates = currentHints.filter((h) => h.hint.startsWith(inputPrefix));

    if (candidates.length === 0) return;

    // バッファの存在確認
    const bufnr = await denops.call("bufnr", "%") as number;
    if (bufnr === -1) return;

    // Neovimの場合はextmarkでハイライト
    if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
      for (const candidate of candidates) {
        try {
          // Process 50 Sub5: 座標系対応の新しい位置計算関数を使用してカスタム色を適用
          const position = calculateHintPositionWithCoordinateSystem(
            candidate.word,
            config.hint_position,
            config.debug_coordinates,
          );
          const col = position.nvim_col; // Neovim extmark用（既に0ベース変換済み）
          let virtTextPos: "overlay" | "eol" = "overlay";

          if (position.display_mode === "overlay") {
            virtTextPos = "overlay";
          }

          await denops.call(
            "nvim_buf_set_extmark",
            bufnr,
            extmarkNamespace,
            position.nvim_line,
            Math.max(0, col),
            {
              virt_text: [[candidate.hint, "HellshakeYanoMarkerCurrent"]],
              virt_text_pos: virtTextPos,
              priority: 999,
            },
          );
        } catch (error) {
          // console.warn("[hellshake-yano] Failed to highlight candidate:", error);
        }
      }
    } else {
      // Vimの場合はmatchadd()でハイライト（フォールバック）
      for (const candidate of candidates) {
        try {
          // Process 50 Sub5: 座標系対応の新しい位置計算関数を使用してパターンを生成
          const position = calculateHintPositionWithCoordinateSystem(
            candidate.word,
            config.hint_position,
            config.debug_coordinates,
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
                position.vim_col + candidate.word.text.length + 1
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
          // console.warn("[hellshake-yano] Failed to highlight candidate with matchadd:", error);
        }
      }
    }
  } catch (error) {
    // console.error("[hellshake-yano] Error highlighting candidates:", error);
  }
}

/**
 * ユーザー入力を待機してジャンプ（エラーハンドリング強化版）
 */
async function waitForUserInput(denops: Denops): Promise<void> {
  let timeoutId: number | undefined;

  try {
    // 入力タイムアウト設定（設定可能）
    const inputTimeout = config.motion_timeout || 2000;

    // プロンプトを表示
    await denops.cmd("echo 'Select hint: '");

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
      // await denops.cmd("echohl WarningMsg | echo 'Input timeout - hints cleared' | echohl None");
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
      // await denops.cmd("echohl WarningMsg | echo 'Invalid input - hints cleared' | echohl None");
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
    const allKeys = [...(config.single_char_keys || []), ...(config.multi_char_keys || [])];
    const hasNumbers = allKeys.some((k) => /^\d$/.test(k));

    // 有効な文字範囲チェック（use_numbersがtrueまたはキー設定に数字が含まれていれば数字を許可）
    const validPattern = (config.use_numbers || hasNumbers) ? /[A-Z0-9]/ : /[A-Z]/;
    const errorMessage = (config.use_numbers || hasNumbers)
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

    // Process 50 Sub3: 1文字/2文字キーの完全分離
    if (config.use_hint_groups) {
      // デフォルトのキー設定
      const singleOnlyKeys = config.single_char_keys ||
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
      const multiOnlyKeys = config.multi_char_keys ||
        ["B", "C", "E", "I", "O", "P", "Q", "R", "T", "U", "V", "W", "X", "Y", "Z"];

      // 1文字専用キーの場合：即座にジャンプ（タイムアウトなし）
      if (singleOnlyKeys.includes(inputChar) && singleCharTarget) {
        try {
          await denops.call("cursor", singleCharTarget.word.line, singleCharTarget.word.col);
          // await denops.cmd(`echo 'Jumped to "${singleCharTarget.word.text}"' | redraw`);
        } catch (jumpError) {
          // console.error("[hellshake-yano] Failed to jump to target:", jumpError);
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
      // 従来のロジック（後方互換性）
      // 複数文字ヒントが存在する場合は待機、単一文字のみの場合は即座にジャンプ
      if (matchingHints.length === 1 && singleCharTarget) {
        // マッチするヒントが1つだけで、それが単一文字の場合のみ即座にジャンプ
        try {
          await denops.call("cursor", singleCharTarget.word.line, singleCharTarget.word.col);
          await denops.cmd(`echo 'Jumped to "${singleCharTarget.word.text}"' | redraw`);
        } catch (jumpError) {
          // console.error("[hellshake-yano] Failed to jump to target:", jumpError);
          await denops.cmd("echohl ErrorMsg | echo 'Failed to jump to target' | echohl None");
        }
        await hideHints(denops);
        return;
      }
    }

    // 候補のヒントをハイライト表示（UX改善）
    if (config.highlight_selected && matchingHints.length > 1) {
      await highlightCandidateHints(denops, inputChar);
    }

    // 第2文字の入力を待機
    await denops.cmd(`echo 'Select hint: ${inputChar}' | redraw`);

    let secondChar: number;

    // Process 50 Sub3: 2文字専用キーの場合はタイムアウトなし
    if (config.use_hint_groups) {
      const multiOnlyKeys = config.multi_char_keys ||
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
          await denops.call("cursor", target.word.line, target.word.col);
          await denops.cmd(`echo 'Auto-selected "${target.word.text}"'`);
        } catch (jumpError) {
          // console.error("[hellshake-yano] Failed to jump to auto-selected target:", jumpError);
          await denops.cmd("echohl ErrorMsg | echo 'Failed to jump to target' | echohl None");
        }
      } else if (singleCharTarget) {
        // タイムアウトで単一文字ヒントがある場合はそれを選択
        try {
          await denops.call("cursor", singleCharTarget.word.line, singleCharTarget.word.col);
          await denops.cmd(`echo 'Selected "${singleCharTarget.word.text}" (timeout)' | redraw`);
        } catch (jumpError) {
          // console.error("[hellshake-yano] Failed to jump to single char target:", jumpError);
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
    const secondValidPattern = config.use_numbers ? /[A-Z0-9]/ : /[A-Z]/;
    const secondErrorMessage = config.use_numbers
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
        const jumpCol = target.word.byteCol || target.word.col;
        await denops.call("cursor", target.word.line, jumpCol);
        await denops.cmd(`echo 'Jumped to "${target.word.text}"'`);
      } catch (jumpError) {
        // console.error("[hellshake-yano] Failed to jump to target:", jumpError);
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
    // console.error("[hellshake-yano] Critical error in waitForUserInput:", error);

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
 * 設定値を検証する関数（テスト用にエクスポート）
 * @param cfg 検証する設定オブジェクト
 * @returns 検証結果（valid: 成功/失敗、errors: エラーメッセージ配列）
 */
export function validateConfig(cfg: Partial<Config>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // motion_count の検証
  if (cfg.motion_count !== undefined) {
    if (
      typeof cfg.motion_count !== "number" || cfg.motion_count < 1 ||
      !Number.isInteger(cfg.motion_count)
    ) {
      errors.push("motion_count must be a positive integer");
    }
  }

  // motion_timeout の検証
  if (cfg.motion_timeout !== undefined) {
    if (typeof cfg.motion_timeout !== "number" || cfg.motion_timeout < 100) {
      errors.push("motion_timeout must be at least 100ms");
    }
  }

  // hint_position の検証
  if (cfg.hint_position !== undefined) {
    const validPositions = ["start", "end", "overlay"];
    if (!validPositions.includes(cfg.hint_position)) {
      errors.push(`hint_position must be one of: ${validPositions.join(", ")}`);
    }
  }

  // markers の検証
  if (cfg.markers !== undefined) {
    if (!Array.isArray(cfg.markers)) {
      errors.push("markers must be an array");
    } else if (cfg.markers.length === 0) {
      errors.push("markers must not be empty");
    } else if (!cfg.markers.every((m: any) => typeof m === "string" && m.length > 0)) {
      errors.push("markers must be an array of strings");
    }
  }

  // use_numbers の検証
  if (cfg.use_numbers !== undefined) {
    if (typeof cfg.use_numbers !== "boolean") {
      errors.push("use_numbers must be a boolean");
    }
  }

  // maxHints の検証
  if (cfg.maxHints !== undefined) {
    if (typeof cfg.maxHints !== "number" || cfg.maxHints < 1 || !Number.isInteger(cfg.maxHints)) {
      errors.push("maxHints must be a positive integer");
    }
  }

  // debounceDelay の検証
  if (cfg.debounceDelay !== undefined) {
    if (typeof cfg.debounceDelay !== "number" || cfg.debounceDelay < 0) {
      errors.push("debounceDelay must be a non-negative number");
    }
  }

  // highlight_selected の検証
  if (cfg.highlight_selected !== undefined) {
    if (typeof cfg.highlight_selected !== "boolean") {
      errors.push("highlight_selected must be a boolean");
    }
  }

  // debug_coordinates の検証
  if (cfg.debug_coordinates !== undefined) {
    if (typeof cfg.debug_coordinates !== "boolean") {
      errors.push("debug_coordinates must be a boolean");
    }
  }

  // trigger_on_hjkl の検証
  if (cfg.trigger_on_hjkl !== undefined) {
    if (typeof cfg.trigger_on_hjkl !== "boolean") {
      errors.push("trigger_on_hjkl must be a boolean");
    }
  }

  // counted_motions の検証
  if (cfg.counted_motions !== undefined) {
    if (!Array.isArray(cfg.counted_motions)) {
      errors.push("counted_motions must be an array");
    } else {
      for (const key of cfg.counted_motions) {
        if (typeof key !== "string" || key.length !== 1) {
          errors.push(
            `counted_motions contains invalid key: ${key} (must be single character strings)`,
          );
          break;
        }
      }
    }
  }

  // enabled の検証
  if (cfg.enabled !== undefined) {
    if (typeof cfg.enabled !== "boolean") {
      errors.push("enabled must be a boolean");
    }
  }

  // Process 50 Sub3: use_japanese の検証
  if (cfg.use_japanese !== undefined) {
    if (typeof cfg.use_japanese !== "boolean") {
      errors.push("use_japanese must be a boolean");
    }
  }

  // Process 50 Sub6: use_improved_detection は統合済み（検証不要）

  // Process 50 Sub5: highlight_hint_marker の検証（fg/bg対応）
  if (cfg.highlight_hint_marker !== undefined) {
    const markerResult = validateHighlightColor(cfg.highlight_hint_marker);
    if (!markerResult.valid) {
      errors.push(...markerResult.errors.map((e) => `highlight_hint_marker: ${e}`));
    }
  }

  // Process 50 Sub5: highlight_hint_marker_current の検証（fg/bg対応）
  if (cfg.highlight_hint_marker_current !== undefined) {
    const currentResult = validateHighlightColor(cfg.highlight_hint_marker_current);
    if (!currentResult.valid) {
      errors.push(...currentResult.errors.map((e) => `highlight_hint_marker_current: ${e}`));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * デフォルト設定を取得（テスト用にエクスポート）
 */
export function getDefaultConfig(): Config {
  return {
    markers: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
    motion_count: 3,
    motion_timeout: 2000,
    hint_position: "start",
    trigger_on_hjkl: true,
    counted_motions: [],
    enabled: true,
    maxHints: 336,
    debounceDelay: 50,
    use_numbers: false,
    highlight_selected: false,
    debug_coordinates: false, // デフォルトでデバッグログは無効
    // Process 50 Sub5: ハイライト色設定のデフォルト値
    highlight_hint_marker: "DiffAdd",
    highlight_hint_marker_current: "DiffText",
  };
}

/**
 * ハイライトグループ名を検証する関数
 * Vimのハイライトグループ名は以下のルールに従う必要がある：
 * - 英字またはアンダースコアで始まる
 * - 英数字とアンダースコアのみ使用可能
 * - 100文字以下
 * @param groupName 検証するハイライトグループ名
 * @returns 有効な場合はtrue、無効な場合はfalse
 */
export function validateHighlightGroupName(groupName: string): boolean {
  // 空文字列チェック
  if (!groupName || groupName.length === 0) {
    return false;
  }

  // 長さチェック（100文字以下）
  if (groupName.length > 100) {
    return false;
  }

  // 最初の文字は英字またはアンダースコアでなければならない
  const firstChar = groupName.charAt(0);
  if (!/[a-zA-Z_]/.test(firstChar)) {
    return false;
  }

  // 全体の文字列は英数字とアンダースコアのみ
  if (!/^[a-zA-Z0-9_]+$/.test(groupName)) {
    return false;
  }

  return true;
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

  // 文字列の場合（従来のハイライトグループ名）
  if (typeof colorConfig === "string") {
    if (!validateHighlightGroupName(colorConfig)) {
      errors.push(`Invalid highlight group name: ${colorConfig}`);
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
    highlight_hint_marker?: string | HighlightColor;
    highlight_hint_marker_current?: string | HighlightColor;
  },
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // highlight_hint_markerの検証
  if (config.highlight_hint_marker !== undefined) {
    const markerResult = validateHighlightColor(config.highlight_hint_marker);
    if (!markerResult.valid) {
      errors.push(...markerResult.errors.map((e) => `highlight_hint_marker: ${e}`));
    }
  }

  // highlight_hint_marker_currentの検証
  if (config.highlight_hint_marker_current !== undefined) {
    const currentResult = validateHighlightColor(config.highlight_hint_marker_current);
    if (!currentResult.valid) {
      errors.push(...currentResult.errors.map((e) => `highlight_hint_marker_current: ${e}`));
    }
  }

  return { valid: errors.length === 0, errors };
}
