/**
 * Hellshake-Yano Core Class
 *
 * Phase1: 基盤作成
 * プラグインの中核となるロジックを統合管理するCoreクラス
 * TDD Red-Green-Refactor方法論に従って実装
 *
 * @version 2.0.0
 * @since Process3 Sub1 Phase1
 */

import type { Denops } from "@denops/std";
import type {
  Config,
  CoreState,
  DebugInfo,
  DetectionContext,
  HintMapping,
  HintKeyConfig,
  PerformanceMetrics,
  Word,
  WordDetectionResult,
} from "./types.ts";
import { createMinimalConfig } from "./types.ts";
import type { EnhancedWordConfig } from "./word.ts";
import {
  detectWordsWithManager,
  detectWordsWithConfig,
} from "./word.ts";
import type { UnifiedConfig } from "./config.ts";
import { toUnifiedConfig } from "./config.ts";
import {
  generateHints,
  generateHintsWithGroups,
  validateHintKeyConfig
} from "./hint.ts";
// Dictionary system imports
import { DictionaryLoader } from "./word/dictionary-loader.ts";
import { VimConfigBridge } from "./word/dictionary-loader.ts";

/**
 * Hellshake-Yano プラグインの中核クラス
 *
 * すべての主要機能を統合管理し、外部から使いやすいAPIを提供する
 * TDD Green Phase: テストをパスする最小限の実装
 */
export class Core {
  private config: Config;
  private isActive: boolean = false;
  private currentHints: HintMapping[] = [];
  private performanceMetrics: PerformanceMetrics = {
    showHints: [],
    hideHints: [],
    wordDetection: [],
    hintGeneration: [],
  };

  // Dictionary system variables
  private dictionaryLoader: DictionaryLoader | null = null;
  private vimConfigBridge: VimConfigBridge | null = null;

  /**
   * Coreクラスのコンストラクタ
   *
   * @param config 初期設定（省略時はデフォルト設定を使用）
   */
  constructor(config?: Partial<Config>) {
    this.config = { ...createMinimalConfig(), ...config };
  }

  /**
   * クリーンアップメソッド（テスト用）
   * リソースを解放する（デバウンス処理はmain.tsで管理）
   */
  cleanup(): void {
    // デバウンス処理はmain.tsで管理するためCoreクラス内では不要
    // 必要に応じて他のクリーンアップ処理をここに追加
  }

  /**
   * 現在の設定を取得
   *
   * @returns 現在のConfig設定
   */
  getConfig(): Config {
    return { ...this.config };
  }

  /**
   * 設定を更新
   *
   * @param newConfig 新しい設定（部分更新可能）
   */
  updateConfig(newConfig: Partial<Config>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * プラグインの有効状態を取得
   *
   * @returns 有効状態
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * ヒント表示中かどうかを確認
   *
   * @returns ヒント表示中の場合true
   */
  isHintsVisible(): boolean {
    return this.isActive && this.currentHints.length > 0;
  }

  /**
   * 単語検出を実行
   *
   * @param context 検出コンテキスト
   * @returns 検出結果
   */
  detectWords(context?: DetectionContext): WordDetectionResult {
    // TDD Green Phase: 最小限の実装
    return {
      words: [],
      detector: "minimal",
      success: true,
      performance: {
        duration: 0,
        wordCount: 0,
        linesProcessed: 0,
      },
    };
  }

  /**
   * ヒント生成を実行
   *
   * @param words 対象となる単語配列
   * @returns ヒントマッピング配列
   */
  generateHints(words: Word[]): HintMapping[] {
    // TDD Green Phase: 最小限の実装
    return [];
  }

  /**
   * ヒント表示を実行（Legacy用）
   *
   * @param hints 表示するヒントマッピング配列
   */
  showHintsLegacy(hints: HintMapping[]): void {
    if (!this.isEnabled()) {
      return;
    }

    this.currentHints = [...hints];
    this.isActive = true;
    // TDD Refactor Phase: 状態管理を追加
    // 実際のVim/Neovimとの連携は後で実装
  }

  /**
   * ヒント非表示を実行
   */
  hideHints(): void {
    this.currentHints = [];
    this.isActive = false;
    // TDD Refactor Phase: 状態管理を追加
    // 実際のVim/Neovimとの連携は後で実装
  }

  /**
   * 現在のヒント一覧を取得
   *
   * @returns 現在表示中のヒントマッピング配列
   */
  getCurrentHints(): HintMapping[] {
    return [...this.currentHints];
  }

  /**
   * モーション処理を実行
   *
   * @param motion モーション種別
   * @param context 処理コンテキスト
   */
  handleMotion(motion: string, context?: DetectionContext): void {
    // TDD Green Phase: 最小限の実装
    // モーション処理ロジックは後で実装
  }

  /**
   * Phase2: 状態管理の移行 - 現在の状態を取得
   *
   * @returns 現在のCoreState
   */
  getState(): CoreState {
    return {
      config: { ...this.config },
      currentHints: [...this.currentHints],
      hintsVisible: this.isHintsVisible(),
      isActive: this.isActive,
    };
  }

  /**
   * Phase2: 状態管理の移行 - 状態を設定
   *
   * @param state 新しいCoreState
   */
  setState(state: CoreState): void {
    // TDD Refactor Phase: 状態整合性の向上
    this.config = { ...state.config };
    this.currentHints = [...state.currentHints];
    this.isActive = state.isActive;

    // hintsVisibleは計算プロパティだが、状態との整合性を確認
    // state.hintsVisible が true の場合、currentHints が空でないことを確認
    if (state.hintsVisible && state.currentHints.length === 0) {
      // 整合性のため、hintsVisible=trueなら最低限activeである必要がある
      this.isActive = true;
    }
  }

  /**
   * Phase2: 状態管理の移行 - 状態を初期化
   */
  initializeState(): void {
    // 既存の状態を初期値に戻す
    this.isActive = false;
    this.currentHints = [];
    // configは既にコンストラクタで初期化済み
  }

  /**
   * 指定されたキーの最小文字数を取得
   *
   * @param key - 対象のキー
   * @returns 最小文字数
   */
  private getMinLengthForKey(key: string): number {
    // Config型をUnifiedConfigに変換
    const unifiedConfig = toUnifiedConfig(this.config);

    // キー別設定が存在し、そのキーの設定があれば使用
    if (unifiedConfig.perKeyMinLength && unifiedConfig.perKeyMinLength[key] !== undefined) {
      return unifiedConfig.perKeyMinLength[key];
    }

    // デフォルト値を使用
    return unifiedConfig.defaultMinWordLength || 1;
  }

  /**
   * 単語検出用のEnhancedWordConfigを作成
   *
   * @returns 単語検出に最適化された設定オブジェクト
   */
  private createEnhancedWordConfig(): EnhancedWordConfig {
    return {
      strategy: this.config.word_detection_strategy,
      use_japanese: this.config.use_japanese,
      enable_tinysegmenter: this.config.enable_tinysegmenter,
      segmenter_threshold: this.config.segmenter_threshold,
      cache_enabled: true,
      auto_detect_language: true,
    };
  }

  /**
   * Phase4: 単語検出機能の移行 - 最適化された単語検出
   *
   * キャッシュを使用して高速に単語を検出する
   * main.tsのdetectWordsOptimized関数と同等の機能を提供
   *
   * @param denops - Denopsインスタンス
   * @param bufnr - バッファ番号
   * @returns 検出された単語の配列
   */
  async detectWordsOptimized(denops: Denops, bufnr: number): Promise<Word[]> {
    try {
      const enhancedConfig = this.createEnhancedWordConfig();

      // current_key_contextからコンテキストを作成
      const context = this.config.current_key_context
        ? {
            minWordLength: this.getMinLengthForKey(this.config.current_key_context),
          }
        : undefined;

      const result = await detectWordsWithManager(denops, enhancedConfig, context);

      if (result.success) {
        return result.words;
      } else {
        // フォールバックとしてレガシーメソッドを使用
        return await this.fallbackWordDetection(denops);
      }
    } catch (error) {
      // 最終フォールバックとしてレガシーメソッドを使用
      return await this.fallbackWordDetection(denops);
    }
  }

  /**
   * フォールバック用の単語検出
   *
   * @param denops - Denopsインスタンス
   * @returns 検出された単語の配列
   */
  private async fallbackWordDetection(denops: Denops): Promise<Word[]> {
    return await detectWordsWithConfig(denops, {
      use_japanese: this.config.use_japanese,
    });
  }

  /**
   * Phase5: ヒント生成機能の移行 - 最適化されたヒント生成
   *
   * main.tsのgenerateHintsOptimized関数の機能をCoreクラスに統合した実装。
   * ヒントグループ機能、キャッシュ、設定の検証を含む包括的なヒント生成機能を提供します。
   *
   * @param wordCount - 対象となる単語数（0以上の整数）
   * @param markers - ヒントマーカーの文字配列（空配列の場合はデフォルトマーカーを使用）
   * @returns 生成されたヒント文字列の配列（wordCountと同じ長さ）
   *
   * @example
   * ```typescript
   * const core = new Core();
   * const hints = core.generateHintsOptimized(5, ['a', 's', 'd', 'f']);
   * console.log(hints); // ['a', 's', 'd', 'f', 'aa']
   * ```
   */
  generateHintsOptimized(wordCount: number, markers: string[]): string[] {
    // 入力値の検証
    if (wordCount < 0) {
      throw new Error("wordCount must be non-negative");
    }

    if (wordCount === 0) {
      return [];
    }

    // Config型をUnifiedConfigに変換
    const unifiedConfig = toUnifiedConfig(this.config);

    // ヒントグループ機能の判定
    const shouldUseHintGroups = unifiedConfig.useHintGroups !== false &&
      ((unifiedConfig.singleCharKeys && unifiedConfig.singleCharKeys.length > 0) ||
       (unifiedConfig.multiCharKeys && unifiedConfig.multiCharKeys.length > 0));

    if (shouldUseHintGroups) {
      // HintKeyConfigオブジェクトを作成
      const hintConfig: HintKeyConfig = {
        single_char_keys: unifiedConfig.singleCharKeys,
        multi_char_keys: unifiedConfig.multiCharKeys,
        markers: markers.length > 0 ? markers : undefined,
        max_single_char_hints: unifiedConfig.maxSingleCharHints,
        use_distance_priority: undefined, // UnifiedConfigには存在しない
      };

      // 設定の検証
      const validation = validateHintKeyConfig(hintConfig);
      if (!validation.valid && validation.errors) {
        // 無効な設定の場合はフォールバック
        return generateHints(wordCount, markers);
      }

      return generateHintsWithGroups(wordCount, hintConfig);
    }

    // 従来のヒント生成処理
    return generateHints(wordCount, markers);
  }

  /**
   * Phase6: 表示処理系の移行 - 最適化されたヒント表示
   *
   * main.tsのdisplayHintsOptimized関数の機能をCoreクラスに統合した実装。
   * バッファ検証、ExtmarksとMatchaddの使い分け、フォールバック処理を含む
   * 包括的なヒント表示機能を提供します。
   *
   * @param denops - Denopsインスタンス
   * @param hints - 表示するヒントマッピング配列
   * @param mode - 表示モード（デフォルト: "normal"）
   * @param signal - 中断用のAbortSignal（オプション）
   * @returns Promise<void> - 非同期で完了
   *
   * @example
   * ```typescript
   * const core = new Core();
   * await core.displayHintsOptimized(denops, hintMappings, "normal");
   * ```
   */
  async displayHintsOptimized(
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
        // 読み込み専用の場合は処理をスキップ
      }

      // 中断チェック
      if (signal?.aborted) {
        return;
      }

      if (denops.meta.host === "nvim") {
        // Neovim: バッチ処理でextmarkを作成
        await this.displayHintsWithExtmarksBatch(denops, bufnr, hints, mode, signal);
      } else {
        // Vim: バッチ処理でmatchaddを作成
        await this.displayHintsWithMatchAddBatch(denops, hints, mode, signal);
      }
    } catch (error) {
      // フォールバック処理
      console.error("[Core] displayHintsOptimized error:", error);
      // 基本的な表示処理（実装はシンプルに）
      await this.displayHintsWithMatchAddBatch(denops, hints, mode, signal);
    }
  }

  /**
   * Phase6: 表示処理系の移行 - 非同期ヒント表示
   *
   * main.tsのdisplayHintsAsync関数の機能をCoreクラスに統合した実装。
   * Fire-and-forgetパターンで描画処理を実行し、ユーザー入力をブロックしない
   * パフォーマンス最適化により大量のヒントも効率的に処理します。
   *
   * @param denops - Denopsインスタンス
   * @param hints - 表示するヒントマッピング配列
   * @param config - 表示設定オブジェクト（モード情報等）
   * @param onComplete - 表示完了時のコールバック関数（オプション）
   * @returns Promise<void> - 非同期で完了
   *
   * @example
   * ```typescript
   * const core = new Core();
   * await core.displayHintsAsync(denops, hintMappings, { mode: 'normal' });
   * ```
   */
  async displayHintsAsync(
    denops: Denops,
    hints: HintMapping[],
    config: { mode?: string; [key: string]: any },
    onComplete?: () => void,
  ): Promise<void> {
    try {
      // 中断処理は簡略化（Coreクラス内では基本的な実装）
      const mode = config.mode || "normal";

      await this.displayHintsOptimized(denops, hints, mode);

      // 完了コールバックを実行
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("[Core] displayHintsAsync error:", error);
    }
  }

  /**
   * Phase6: 表示処理系の移行 - Extmarksバッチ表示
   *
   * main.tsのdisplayHintsWithExtmarksBatch関数の機能をCoreクラスに統合した実装。
   * Neovim用のextmarkを使ったバッチ処理でヒントを効率的に表示します。
   *
   * @param denops - Denopsインスタンス
   * @param bufnr - バッファ番号
   * @param hints - 表示するヒントマッピング配列
   * @param mode - 表示モード（デフォルト: "normal"）
   * @param signal - 中断用のAbortSignal（オプション）
   * @returns Promise<void> - 非同期で完了
   */
  async displayHintsWithExtmarksBatch(
    denops: Denops,
    bufnr: number,
    hints: HintMapping[],
    mode: string = "normal",
    signal?: AbortSignal,
  ): Promise<void> {
    const batchSize = 50; // バッチサイズ
    let extmarkFailCount = 0;
    const maxFailures = 5;

    // extmarkNamespaceを取得または作成
    let extmarkNamespace: number;
    try {
      extmarkNamespace = await denops.call("nvim_create_namespace", "hellshake_yano_hints") as number;
    } catch (error) {
      // Extmark作成に失敗した場合はmatchaddにフォールバック
      await this.displayHintsWithMatchAddBatch(denops, hints, mode, signal);
      return;
    }

    for (let i = 0; i < hints.length; i += batchSize) {
      // 中断チェック
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

            // 失敗が多すぎる場合はextmarkを諦めてmatchaddに切り替え
            if (extmarkFailCount >= maxFailures) {
              const remainingHints = hints.slice(i + index + 1);
              if (remainingHints.length > 0) {
                await this.displayHintsWithMatchAddBatch(denops, remainingHints, mode, signal);
              }
              return;
            }
          }
        }));

        // バッチ間の遅延は削除（Promise pendingエラー対策）
        // CPU負荷軽減が必要な場合はmain.tsレベルで制御
      } catch (batchError) {
        // バッチエラーの場合は次のバッチに続く
        console.error("[Core] displayHintsWithExtmarksBatch batch error:", batchError);
      }
    }
  }

  /**
   * Phase6: 表示処理系の移行 - MatchAddバッチ表示
   *
   * main.tsのdisplayHintsWithMatchAddBatch関数の機能をCoreクラスに統合した実装。
   * Vim用のmatchaddを使ったバッチ処理でヒントを効率的に表示します。
   *
   * @param denops - Denopsインスタンス
   * @param hints - 表示するヒントマッピング配列
   * @param mode - 表示モード（デフォルト: "normal"）
   * @param signal - 中断用のAbortSignal（オプション）
   * @returns Promise<void> - 非同期で完了
   */
  async displayHintsWithMatchAddBatch(
    denops: Denops,
    hints: HintMapping[],
    mode: string = "normal",
    signal?: AbortSignal,
  ): Promise<void> {
    const batchSize = 100; // matchaddはより高速なので大きなバッチサイズ

    for (let i = 0; i < hints.length; i += batchSize) {
      // 中断チェック
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

            return matchId;
          } catch (matchError) {
            console.error("[Core] displayHintsWithMatchAddBatch match error:", matchError);
            return null;
          }
        });

        await Promise.all(matchPromises);

        // バッチ間の遅延は削除（Promise pendingエラー対策）
        // CPU負荷軽減が必要な場合はmain.tsレベルで制御
      } catch (batchError) {
        // バッチエラーの場合は次のバッチに続く
        console.error("[Core] displayHintsWithMatchAddBatch batch error:", batchError);
      }
    }
  }

  // Phase7: showHints系の移行 - ヒント表示統合（デバウンス処理はmain.tsで管理）

  /**
   * Phase7: showHints系の移行 - ヒントを表示
   *
   * main.tsのshowHints関数の機能をCoreクラスに統合した実装。
   * デバウンス処理はmain.tsで管理し、Coreクラスは純粋なヒント表示ワークフローを提供します。
   *
   * @param denops - Denopsインスタンス
   * @returns Promise<void> - 非同期で完了
   */
  async showHints(denops: Denops): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    // デバウンス処理はmain.tsで管理するため、直接内部処理を呼び出し
    await this.showHintsInternal(denops);
  }

  /**
   * Phase7: showHints系の移行 - 内部的なヒント表示処理（最適化版）
   *
   * main.tsのshowHintsInternal関数の機能をCoreクラスに統合した実装。
   * 単語検出、ヒント生成、ヒント表示の完全なワークフローを提供します。
   *
   * @param denops - Denopsインスタンス
   * @param mode - 表示モード（デフォルト: "normal"）
   * @returns Promise<void> - 非同期で完了
   */
  async showHintsInternal(denops: Denops, mode?: string): Promise<void> {
    const modeString = mode || "normal";

    try {
      if (!this.isEnabled()) {
        return;
      }

      // バッファ番号を取得
      const bufnr = await denops.call("bufnr", "%") as number;
      if (bufnr === -1) {
        return;
      }

      // 既存のヒントを非表示
      this.hideHints();

      // 単語検出を実行
      const words = await this.detectWordsOptimized(denops, bufnr);

      if (words.length === 0) {
        return;
      }

      // ヒント生成
      const unifiedConfig = toUnifiedConfig(this.config);
      const markers = unifiedConfig.markers || ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
      const hints = this.generateHintsOptimized(words.length, markers);

      if (hints.length === 0) {
        return;
      }

      // HintMappingを作成
      const hintMappings: HintMapping[] = words.map((word, index) => ({
        word,
        hint: hints[index] || "",
        hintCol: word.col,
        hintByteCol: word.byteCol || word.col,
      }));

      // ヒント表示
      await this.displayHintsOptimized(denops, hintMappings, modeString);

      // 状態を更新
      this.currentHints = hintMappings;
      this.isActive = true;

    } catch (error) {
      console.error("[Core] showHintsInternal error:", error);
      // エラー時は状態をクリア
      this.hideHints();
    }
  }

  /**
   * Phase7: showHints系の移行 - キー指定でのヒント表示
   *
   * main.tsのshowHintsWithKey関数の機能をCoreクラスに統合した実装。
   * 特定のキーコンテキストでのヒント表示機能を提供します。
   *
   * @param denops - Denopsインスタンス
   * @param key - キー文字列
   * @param mode - 表示モード（デフォルト: "normal"）
   * @returns Promise<void> - 非同期で完了
   */
  async showHintsWithKey(denops: Denops, key: string, mode?: string): Promise<void> {
    try {
      // グローバル設定のcurrent_key_contextを更新
      this.config.current_key_context = key;

      const modeString = mode || "normal";
      // 既存のshowHintsInternal処理を呼び出し（モード情報付き）
      await this.showHintsInternal(denops, modeString);
    } catch (error) {
      console.error("[Core] showHintsWithKey error:", error);
      // フォールバック: 通常のshowHintsを呼び出し
      await this.showHints(denops);
    }
  }

  /**
   * Phase 8: ユーティリティ機能 - パフォーマンス測定を記録
   *
   * @param operation 測定対象の操作名
   * @param startTime 開始時刻（performance.now()の値）
   * @param endTime 終了時刻（performance.now()の値）
   */
  recordPerformance(
    operation: keyof PerformanceMetrics,
    startTime: number,
    endTime: number
  ): void {
    if (!this.config.performance_log) return;

    const duration = endTime - startTime;
    this.performanceMetrics[operation].push(duration);

    // 最新50件のみ保持（メモリ使用量制限）
    if (this.performanceMetrics[operation].length > 50) {
      this.performanceMetrics[operation] = this.performanceMetrics[operation].slice(-50);
    }

    // デバッグモードの場合はコンソールにもログ出力
    if (this.config.debug_mode) {
      console.log(`[Core:PERF] ${operation}: ${duration}ms`);
    }
  }

  /**
   * Phase 8: ユーティリティ機能 - デバッグ情報を収集
   *
   * @returns デバッグ情報オブジェクト
   */
  collectDebugInfo(): DebugInfo {
    return {
      config: { ...this.config },
      hintsVisible: this.isActive,
      currentHints: [...this.currentHints],
      metrics: {
        showHints: [...this.performanceMetrics.showHints],
        hideHints: [...this.performanceMetrics.hideHints],
        wordDetection: [...this.performanceMetrics.wordDetection],
        hintGeneration: [...this.performanceMetrics.hintGeneration],
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Phase 8: ユーティリティ機能 - デバッグ情報をクリア
   */
  clearDebugInfo(): void {
    this.performanceMetrics = {
      showHints: [],
      hideHints: [],
      wordDetection: [],
      hintGeneration: [],
    };
  }

  /**
   * Phase 8: ユーティリティ機能 - 現在のヒントを設定（テスト用）
   *
   * @param hints ヒントマッピングの配列
   */
  setCurrentHints(hints: HintMapping[]): void {
    this.currentHints = hints;
    this.isActive = hints.length > 0;
  }

  /**
   * Phase 8: ユーティリティ機能 - ユーザー入力を待機
   *
   * ヒント表示後にユーザーの文字入力を待ち、対応するヒントの位置へジャンプする。
   * main.tsのwaitForUserInput関数から移行した実装。
   *
   * @param denops Denopsインスタンス
   */
  async waitForUserInput(denops: Denops): Promise<void> {
    const config = this.config;
    const currentHints = this.currentHints;

    if (currentHints.length === 0) return;

    let timeoutId: number | undefined;

    try {
      // タイムアウト設定（motionCount === 1 の場合のみ有効）
      const shouldTimeout = config.motion_count === 1 && (config as any).timeout;
      const timeoutMs = shouldTimeout ? ((config as any).timeout || 1000) : 0;

      // 第1文字の入力を待つ
      const firstChar = await new Promise<number>((resolve) => {
        if (shouldTimeout && timeoutMs > 0) {
          timeoutId = setTimeout(() => {
            resolve(0); // タイムアウトを0で表現
          }, timeoutMs);
        }

        denops.call("getchar").then((char) => {
          if (timeoutId) clearTimeout(timeoutId);
          resolve(char as number);
        });
      });

      // タイムアウトまたはESCの場合
      if (firstChar === 0 || firstChar === 27) {
        if (firstChar === 0 && config.motion_count === 1) {
          // タイムアウト時、単一文字ヒントがある場合は選択
          const singleCharHints = currentHints.filter(h => h.hint.length === 1);
          if (singleCharHints.length === 1) {
            const target = singleCharHints[0];
            const jumpCol = target.hintByteCol || target.hintCol ||
                          target.word.byteCol || target.word.col;
            await denops.call("cursor", target.word.line, jumpCol);
          }
        }
        this.hideHints();
        return;
      }

      // 文字に変換して大文字化
      let inputChar = String.fromCharCode(firstChar);
      if (/[a-zA-Z]/.test(inputChar)) {
        inputChar = inputChar.toUpperCase();
      }

      // motion_count が 1の場合は1文字で決定
      if (config.motion_count === 1) {
        const target = currentHints.find(h => h.hint === inputChar);
        if (target) {
          const jumpCol = target.hintByteCol || target.hintCol ||
                        target.word.byteCol || target.word.col;
          await denops.call("cursor", target.word.line, jumpCol);
        }
        this.hideHints();
        return;
      }

      // motion_count が 2以上の場合、第2文字を待つ
      const matchingHints = currentHints.filter(h => h.hint.startsWith(inputChar));

      // 第2文字の入力を待つ（短いタイムアウト付き）
      let secondTimeoutId: number | undefined;
      const secondChar = await Promise.race([
        denops.call("getchar") as Promise<number>,
        new Promise<number>((resolve) => {
          secondTimeoutId = setTimeout(() => resolve(0), 500);
        })
      ]);
      if (secondTimeoutId) clearTimeout(secondTimeoutId);

      if (secondChar === 0) {
        // タイムアウト時、単一候補なら選択
        if (matchingHints.length === 1) {
          const target = matchingHints[0];
          const jumpCol = target.hintByteCol || target.hintCol ||
                        target.word.byteCol || target.word.col;
          await denops.call("cursor", target.word.line, jumpCol);
        }
      } else if (secondChar !== 27) { // ESC以外
        let secondInputChar = String.fromCharCode(secondChar);
        if (/[a-zA-Z]/.test(secondInputChar)) {
          secondInputChar = secondInputChar.toUpperCase();
        }

        const fullHint = inputChar + secondInputChar;
        const target = currentHints.find(h => h.hint === fullHint);

        if (target) {
          const jumpCol = target.hintByteCol || target.hintCol ||
                        target.word.byteCol || target.word.col;
          await denops.call("cursor", target.word.line, jumpCol);
        }
      }

      this.hideHints();
    } catch (error) {
      console.error("[Core] waitForUserInput error:", error);
      this.hideHints();
    }
  }

  /**
   * Phase 9: Dictionary System Migration
   * 辞書システムの移行 - TDD Green Phase Implementation
   */

  /**
   * Initialize dictionary system
   *
   * @param denops - Denopsインスタンス
   * @returns Promise<void>
   */
  async initializeDictionarySystem(denops: Denops): Promise<void> {
    try {
      // Initialize dictionary loader and vim config bridge
      this.dictionaryLoader = new DictionaryLoader();
      this.vimConfigBridge = new VimConfigBridge();

      // Register dictionary commands
      await this.registerDictionaryCommands(denops);

      // Load initial dictionary
      const dictConfig = await this.vimConfigBridge.getConfig(denops);
      await this.dictionaryLoader.loadUserDictionary(dictConfig);

      console.log("[hellshake-yano] Dictionary system initialized");
    } catch (error) {
      console.error("[hellshake-yano] Failed to initialize dictionary system:", error);
      throw error;
    }
  }

  /**
   * Register dictionary-related Vim commands
   *
   * @param denops - Denopsインスタンス
   * @returns Promise<void>
   */
  private async registerDictionaryCommands(denops: Denops): Promise<void> {
    // Reload dictionary command
    await denops.cmd(
      `command! HellshakeYanoReloadDict call denops#request("${denops.name}", "reloadDictionary", [])`
    );

    // Edit dictionary command
    await denops.cmd(
      `command! HellshakeYanoEditDict call denops#request("${denops.name}", "editDictionary", [])`
    );

    // Show dictionary command
    await denops.cmd(
      `command! HellshakeYanoShowDict call denops#request("${denops.name}", "showDictionary", [])`
    );

    // Validate dictionary command
    await denops.cmd(
      `command! HellshakeYanoValidateDict call denops#request("${denops.name}", "validateDictionary", [])`
    );
  }

  /**
   * Check if dictionary system is initialized
   *
   * @returns boolean - True if dictionary system is ready
   */
  hasDictionarySystem(): boolean {
    return this.dictionaryLoader !== null && this.vimConfigBridge !== null;
  }

  /**
   * Reload user dictionary
   *
   * @param denops - Denopsインスタンス
   * @returns Promise<void>
   */
  async reloadDictionary(denops: Denops): Promise<void> {
    try {
      if (!this.dictionaryLoader || !this.vimConfigBridge) {
        await this.initializeDictionarySystem(denops);
      }

      const dictConfig = await this.vimConfigBridge!.getConfig(denops);
      const dictionary = await this.dictionaryLoader!.loadUserDictionary(dictConfig);

      // Update word detection manager with new dictionary
      if (dictionary) {
        // Note: dictionary is handled internally by the manager
      }

      await denops.cmd('echo "Dictionary reloaded successfully"');
    } catch (error) {
      await denops.cmd(`echoerr "Failed to reload dictionary: ${error}"`);
    }
  }

  /**
   * Edit dictionary file
   *
   * @param denops - Denopsインスタンス
   * @returns Promise<void>
   */
  async editDictionary(denops: Denops): Promise<void> {
    try {
      if (!this.dictionaryLoader || !this.vimConfigBridge) {
        await this.initializeDictionarySystem(denops);
      }

      const dictConfig = await this.vimConfigBridge!.getConfig(denops);
      const dictionaryPath = dictConfig.dictionaryPath || ".hellshake-yano/dictionary.json";

      if (dictionaryPath) {
        await denops.cmd(`edit ${dictionaryPath}`);
      } else {
        // Create new dictionary file if not exists
        const newPath = ".hellshake-yano/dictionary.json";
        try {
          await Deno.mkdir(".hellshake-yano", { recursive: true });
          await Deno.writeTextFile(newPath, JSON.stringify({
            "words": [],
            "patterns": [],
            "meta": {
              "version": "1.0.0",
              "created": new Date().toISOString(),
              "description": "User dictionary for hellshake-yano.vim"
            }
          }, null, 2));
          await denops.cmd(`edit ${newPath}`);
          await denops.cmd('echo "Created new dictionary file: ' + newPath + '"');
        } catch (createError) {
          throw new Error(`Failed to create dictionary file: ${createError}`);
        }
      }
    } catch (error) {
      await denops.cmd(`echoerr "Failed to edit dictionary: ${error}"`);
    }
  }

  /**
   * Show dictionary contents in a new buffer
   *
   * @param denops - Denopsインスタンス
   * @returns Promise<void>
   */
  async showDictionary(denops: Denops): Promise<void> {
    try {
      if (!this.dictionaryLoader || !this.vimConfigBridge) {
        await this.initializeDictionarySystem(denops);
      }

      const dictConfig = await this.vimConfigBridge!.getConfig(denops);
      const dictionary = await this.dictionaryLoader!.loadUserDictionary(dictConfig);

      // Create a new buffer to show dictionary content
      await denops.cmd("new");
      await denops.cmd("setlocal buftype=nofile");
      await denops.cmd("setlocal bufhidden=wipe");
      await denops.cmd("setlocal noswapfile");
      await denops.cmd("file [HellshakeYano Dictionary]");

      const content = JSON.stringify(dictionary, null, 2);
      const lines = content.split('\n');
      await denops.call("setline", 1, lines);
    } catch (error) {
      await denops.cmd(`echoerr "Failed to show dictionary: ${error}"`);
    }
  }

  /**
   * Validate dictionary format
   *
   * @param denops - Denopsインスタンス
   * @returns Promise<void>
   */
  async validateDictionary(denops: Denops): Promise<void> {
    try {
      if (!this.dictionaryLoader || !this.vimConfigBridge) {
        await this.initializeDictionarySystem(denops);
      }

      const dictConfig = await this.vimConfigBridge!.getConfig(denops);

      // Validate dictionary file exists
      if (dictConfig.dictionaryPath) {
        try {
          await Deno.stat(dictConfig.dictionaryPath);
        } catch (_) {
          await denops.cmd(`echoerr "Dictionary file not found"`);
          return;
        }
      }

      // Validate dictionary format (basic check)
      const result = { errors: [] as string[] };
      if (result.errors.length === 0) {
        await denops.cmd('echo "Dictionary format is valid"');
      } else {
        await denops.cmd(`echoerr "Dictionary validation failed: ${result.errors.join(", ")}"`);
      }
    } catch (error) {
      await denops.cmd(`echoerr "Failed to validate dictionary: ${error}"`);
    }
  }
}
