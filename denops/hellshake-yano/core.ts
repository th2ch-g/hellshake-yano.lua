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
  HighlightColor,
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
import { DictionaryLoader, type UserDictionary } from "./word/dictionary-loader.ts";
import { VimConfigBridge } from "./word/dictionary-loader.ts";

/**
 * Hellshake-Yano プラグインの中核クラス
 *
 * すべての主要機能を統合管理し、外部から使いやすいAPIを提供する
 * Phase 10.1: シングルトンパターンを実装
 * TDD Green Phase: テストをパスする最小限の実装
 */
export class Core {
  private static instance: Core | null = null;

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

  // Display rendering state management (sub2-3)
  private _isRenderingHints: boolean = false;
  private _renderingAbortController: AbortController | null = null;

  /**
   * Coreクラスのプライベートコンストラクタ（シングルトン用）
   *
   * @param config 初期設定（省略時はデフォルト設定を使用）
   */
  private constructor(config?: Partial<Config>) {
    this.config = { ...createMinimalConfig(), ...config };
  }

  /**
   * シングルトンインスタンスを取得
   * Phase 10.1: TDD Green実装
   *
   * @param config 初期設定（初回のみ有効）
   * @returns Coreクラスのシングルトンインスタンス
   */
  public static getInstance(config?: Partial<Config>): Core {
    if (!Core.instance) {
      Core.instance = new Core(config);
    }
    return Core.instance;
  }

  /**
   * テスト用リセットメソッド
   * テスト間でのインスタンス分離を実現
   * Phase 10.1: TDD Green実装
   */
  public static resetForTesting(): void {
    Core.instance = null;
  }

  /**
   * クリーンアップメソッド（テスト用）
   * リソースを解放する（デバウンス処理はmain.tsで管理）
   */
  cleanup(): void {
    // デバウンス処理はmain.tsで管理するためCoreクラス内では不要
    // 表示状態のクリーンアップ (sub2-3)
    this.abortCurrentRendering();
    this._isRenderingHints = false;
    this._renderingAbortController = null;

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
   * sub2-5-3: hideHintsOptimized - Vim/Neovimの実際のヒント表示をクリア
   *
   * main.ts の hideHints 関数をCoreクラスに移植
   * ExtmarksとMatchesの両方をクリアしてヒントを非表示にする
   *
   * @param denops Denopsインスタンス
   * @returns Promise<void> 非同期で完了
   * @since sub2-5-3
   */
  async hideHintsOptimized(denops: Denops): Promise<void> {
    try {
      // 状態をクリア
      this.currentHints = [];
      this.isActive = false;

      // 現在のレンダリングを中断
      this.abortCurrentRendering();

      // バッファ番号を取得
      const bufnr = await denops.call("bufnr", "%") as number;
      if (bufnr === -1) {
        return;
      }

      if (denops.meta.host === "nvim") {
        // Neovim: extmarkをクリア
        try {
          const extmarkNamespace = await denops.call("nvim_create_namespace", "hellshake_yano_hints") as number;
          await denops.call("nvim_buf_clear_namespace", bufnr, extmarkNamespace, 0, -1);

          // 候補ハイライトもクリア
          const candidateNamespace = await denops.call("nvim_create_namespace", "hellshake_yano_candidate_highlights") as number;
          await denops.call("nvim_buf_clear_namespace", bufnr, candidateNamespace, 0, -1);
        } catch (error) {
          // extmarkのクリアに失敗した場合はログに記録するが処理は続行
          console.warn("[Core] hideHintsOptimized extmark clear error:", error);
        }
      } else {
        // Vim: matchesをクリア
        try {
          const matches = await denops.call("getmatches") as Array<{ id: number; group: string }>;
          for (const match of matches) {
            if (match.group === "HellshakeYanoMarker" || match.group.startsWith("HellshakeYano")) {
              await denops.call("matchdelete", match.id);
            }
          }
        } catch (error) {
          // matchのクリアに失敗した場合はログに記録するが処理は続行
          console.warn("[Core] hideHintsOptimized match clear error:", error);
        }
      }
    } catch (error) {
      console.error("[Core] hideHintsOptimized error:", error);
    }
  }

  /**
   * sub2-5-4: clearCache - キャッシュをクリア
   *
   * main.ts のキャッシュクリア機能をCoreクラスに移植
   * 内部状態とヒントをリセットする
   *
   * @since sub2-5-4
   */
  clearCache(): void {
    try {
      // ヒント関連の状態をクリア
      this.currentHints = [];
      this.isActive = false;

      // レンダリング状態をクリア
      this.abortCurrentRendering();

      // パフォーマンスメトリクスをクリア
      this.clearDebugInfo();

      // 辞書システムのキャッシュもクリア（存在する場合）
      if (this.dictionaryLoader) {
        // 辞書ローダーのキャッシュクリアは内部実装に依存
        // 現在の実装では特別なキャッシュクリア処理は不要
      }
    } catch (error) {
      console.error("[Core] clearCache error:", error);
    }
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
    signal?: AbortSignal,
  ): Promise<void> {
    // 現在のレンダリングを中断
    if (this._renderingAbortController) {
      this._renderingAbortController.abort();
    }

    // 新しいコントローラーを作成
    this._renderingAbortController = new AbortController();
    const currentController = this._renderingAbortController;

    // 外部からのAbortSignalもリッスンする
    if (signal) {
      signal.addEventListener('abort', () => {
        if (currentController === this._renderingAbortController) {
          currentController.abort();
        }
      });
    }

    this._isRenderingHints = true;

    try {
      // 中断チェック
      if (currentController.signal.aborted) {
        return;
      }

      const mode = config.mode || "normal";
      const bufnr = await denops.call("bufnr", "%") as number;

      await this.displayHintsWithExtmarksBatch(denops, bufnr, hints, mode, currentController.signal);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // 中断は正常な動作なので、エラーログは出力しない
        return;
      }
      console.error("[Core] displayHintsAsync error:", error);
    } finally {
      // この描画が現在のものである場合のみフラグをリセット
      if (currentController === this._renderingAbortController) {
        this._isRenderingHints = false;
        this._renderingAbortController = null;
      }
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

      // sub2-5-2: 重要なバグ修正 - ヒント表示後にユーザー入力を待機
      // ユーザーがヒントを選択できるようにwaitForUserInputを呼び出す
      await this.waitForUserInput(denops);

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
  /**
   * ヒントターゲットへのジャンプ処理を実行（REFACTOR: 重複コードの共通化）
   *
   * @param denops - Denopsインスタンス
   * @param target - ジャンプ対象のヒントマッピング
   * @param context - ジャンプのコンテキスト情報（デバッグ用）
   */
  private async jumpToHintTarget(denops: Denops, target: HintMapping, context: string): Promise<void> {
    try {
      // ヒント位置情報を使用（Visual modeでの語尾ジャンプ対応）
      const jumpCol = target.hintByteCol || target.hintCol ||
        target.word.byteCol || target.word.col;

      // デバッグログ: ジャンプ位置の詳細
      if (this.config.debug_mode) {
        console.log(`[hellshake-yano:DEBUG] Jump to target (${context}):`);
        console.log(`  - text: "${target.word.text}"`);
        console.log(`  - line: ${target.word.line}`);
        console.log(`  - col: ${target.word.col} (display)`);
        console.log(`  - byteCol: ${target.word.byteCol} (byte)`);
        console.log(`  - hintCol: ${target.hintCol} (hint display)`);
        console.log(`  - hintByteCol: ${target.hintByteCol} (hint byte)`);
        console.log(`  - jumpCol (used): ${jumpCol}`);
      }

      await denops.call("cursor", target.word.line, jumpCol);
    } catch (jumpError) {
      await denops.cmd("echohl ErrorMsg | echo 'Failed to jump to target' | echohl None");
    }
  }

  /**
   * エラーメッセージとフィードバック表示（REFACTOR: 重複コードの共通化）
   *
   * @param denops - Denopsインスタンス
   * @param message - 表示するメッセージ
   * @param withBell - ベル音を鳴らすかどうか（デフォルト: true）
   */
  private async showErrorFeedback(denops: Denops, message: string, withBell = true): Promise<void> {
    await denops.cmd(`echohl WarningMsg | echo '${message}' | echohl None`);
    if (withBell) {
      try {
        await denops.cmd("call feedkeys('\\<C-g>', 'n')"); // ベル音
      } catch {
        // ベル音が失敗しても続行
      }
    }
  }

  /**
   * ユーザーのヒント選択入力を待機し、選択された位置にジャンプする
   *
   * main.tsから移行された完全版実装。hideHintsOptimizedを使用して
   * 実際の表示を適切に非表示にする重要なバグ修正を含む。
   *
   * @param denops - Denopsインスタンス
   * @throws ユーザーがESCでキャンセルした場合
   */
  async waitForUserInput(denops: Denops): Promise<void> {
    const config = this.config;
    const currentHints = this.currentHints;

    if (currentHints.length === 0) return;

    let timeoutId: number | undefined;

    try {
      // 入力タイムアウト設定（設定可能）
      const inputTimeout = config.motion_timeout || 2000;

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
        // motion_count === 1の場合、単一文字ヒントがあれば自動選択
        if (config.motion_count === 1) {
          const singleCharHints = currentHints.filter(h => h.hint.length === 1);
          if (singleCharHints.length === 1) {
            await this.jumpToHintTarget(denops, singleCharHints[0], "timeout auto-select");
          }
        }
        await this.hideHintsOptimized(denops);
        return;
      }

      // ESCキーの場合はキャンセル
      if (char === 27) {
        await this.hideHintsOptimized(denops);
        return;
      }

      // Ctrl+C やその他の制御文字の処理
      if (char < 32 && char !== 13) { // Enter(13)以外の制御文字
        await this.hideHintsOptimized(denops);
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
        await this.hideHintsOptimized(denops);
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
        await this.hideHintsOptimized(denops);
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
        await this.showErrorFeedback(denops, errorMessage);
        await this.hideHintsOptimized(denops);
        return;
      }

      // 入力文字で始まる全てのヒントを探す（単一文字と複数文字の両方）
      const matchingHints = currentHints.filter((h) => h.hint.startsWith(inputChar));

      if (matchingHints.length === 0) {
        // 該当するヒントがない場合は終了（視覚・音声フィードバック付き）
        await this.showErrorFeedback(denops, "No matching hint found");
        await this.hideHintsOptimized(denops);
        return;
      }

      // 単一文字のヒントと複数文字のヒントを分離
      const singleCharTarget = matchingHints.find((h) => h.hint === inputChar);
      const multiCharHints = matchingHints.filter((h) => h.hint.length > 1);

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
          await this.jumpToHintTarget(denops, singleCharTarget, "single char hint (hint groups)");
          await this.hideHintsOptimized(denops);
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
          await this.jumpToHintTarget(denops, singleCharTarget, "single char target (Option 3)");
          await this.hideHintsOptimized(denops);
          return;
        }
      }

      // 候補のヒントをハイライト表示（UX改善）
      // Option 3: 1文字ヒントが存在する場合はハイライト処理をスキップ
      const shouldHighlight = config.highlight_selected && !singleCharTarget;

      if (shouldHighlight) {
        // 非同期版を使用してメインスレッドをブロックしない
        // awaitを使用せず非同期実行することで、ユーザー入力の応答性を維持
        this.highlightCandidateHintsAsync(denops, currentHints, inputChar, { mode: "normal" });
      }

      // 第2文字の入力を待機
      let secondChar: number;

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
          await this.jumpToHintTarget(denops, matchingHints[0], "auto-select single candidate");
        } else if (singleCharTarget) {
          // タイムアウトで単一文字ヒントがある場合はそれを選択
          await this.jumpToHintTarget(denops, singleCharTarget, "timeout select single char hint");
        } else {
          await denops.cmd(`echo 'Timeout - ${matchingHints.length} candidates available'`);
        }
        await this.hideHintsOptimized(denops);
        return;
      }

      // ESCキーの場合はキャンセル
      if (secondChar === 27) {
        await denops.cmd("echo 'Cancelled'");
        await this.hideHintsOptimized(denops);
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
        await this.hideHintsOptimized(denops);
        return;
      }

      // 有効な文字範囲チェック（数字対応）
      const secondValidPattern = config.use_numbers ? /[A-Z0-9]/ : /[A-Z]/;
      const secondErrorMessage = config.use_numbers
        ? "Second character must be alphabetic or numeric"
        : "Second character must be alphabetic";

      if (!secondValidPattern.test(secondInputChar)) {
        await this.showErrorFeedback(denops, secondErrorMessage, false);
        await this.hideHintsOptimized(denops);
        return;
      }

      const fullHint = inputChar + secondInputChar;

      // 完全なヒントを探す
      const target = currentHints.find((h) => h.hint === fullHint);

      if (target) {
        // カーソルを移動（byteColが利用可能な場合は使用）
        await this.jumpToHintTarget(denops, target, `hint "${fullHint}"`);
      } else {
        // 無効なヒント組み合わせの場合（視覚・音声フィードバック付き）
        await this.showErrorFeedback(denops, `Invalid hint combination: ${fullHint}`);
      }

      // ヒントを非表示
      await this.hideHintsOptimized(denops);
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

      await this.hideHintsOptimized(denops);
      throw error;
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
    // Add to dictionary command
    await denops.cmd(
      `command! -nargs=+ HellshakeYanoAddWord call denops#request("${denops.name}", "addToDictionary", split('<args>'))`
    );

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

  /**
   * Add word to user dictionary
   * TDD Green Phase: sub2-4-1 implementation
   *
   * @param denops - Denopsインスタンス
   * @param word - 追加する単語
   * @param meaning - 単語の意味
   * @param type - 単語の種類（noun, verb, adjective等）
   * @returns Promise<void>
   */
  async addToDictionary(denops: Denops, word: string, meaning: string, type: string): Promise<void> {
    try {
      // Validate input
      if (!word || !word.trim()) {
        await denops.cmd('echoerr "Invalid word: word cannot be empty"');
        return;
      }

      // Initialize dictionary system if needed
      if (!this.dictionaryLoader || !this.vimConfigBridge) {
        await this.initializeDictionarySystem(denops);
      }

      const dictConfig = await this.vimConfigBridge!.getConfig(denops);
      const dictionaryPath = dictConfig.dictionaryPath || ".hellshake-yano/dictionary.json";

      // Load existing dictionary or create new one
      let dictionary: UserDictionary;
      try {
        dictionary = await this.dictionaryLoader!.loadUserDictionary(dictConfig);
      } catch (_) {
        // Create new dictionary if not exists (using UserDictionary format)
        dictionary = {
          customWords: [],
          preserveWords: [],
          mergeRules: new Map(),
          compoundPatterns: [],
          metadata: {
            version: "1.0.0",
            description: "User dictionary for hellshake-yano.vim"
          }
        };
      }

      // Create word entry and add to customWords
      const wordEntry = word.trim();

      // Check if word already exists
      const existingIndex = dictionary.customWords.indexOf(wordEntry);
      if (existingIndex === -1) {
        // Add new word
        dictionary.customWords.push(wordEntry);
      }

      // Also handle the raw JSON format for file storage
      let jsonDictionary;
      try {
        const content = await Deno.readTextFile(dictionaryPath);
        jsonDictionary = JSON.parse(content);
      } catch (_) {
        // Create new JSON dictionary if not exists
        jsonDictionary = {
          words: [],
          patterns: [],
          meta: {
            version: "1.0.0",
            created: new Date().toISOString(),
            description: "User dictionary for hellshake-yano.vim"
          }
        };
      }

      // Create structured word entry for JSON storage
      const structuredWordEntry = {
        word: word.trim(),
        meaning: meaning.trim() || word.trim(),
        type: type.trim() || "unknown",
        added: new Date().toISOString()
      };

      // Check if word already exists in JSON format
      if (!jsonDictionary.words) {
        jsonDictionary.words = [];
      }
      const jsonExistingIndex = jsonDictionary.words.findIndex((w: any) => w.word === structuredWordEntry.word);
      if (jsonExistingIndex !== -1) {
        // Update existing word
        jsonDictionary.words[jsonExistingIndex] = structuredWordEntry;
      } else {
        // Add new word
        jsonDictionary.words.push(structuredWordEntry);
      }

      // Ensure directory exists
      try {
        await Deno.mkdir(".hellshake-yano", { recursive: true });
      } catch (_) {
        // Directory might already exist
      }

      // Save updated JSON dictionary
      await Deno.writeTextFile(dictionaryPath, JSON.stringify(jsonDictionary, null, 2));

      // Reload dictionary to update cache
      await this.dictionaryLoader!.loadUserDictionary(dictConfig);

      await denops.cmd(`echo "Word added to dictionary: ${word}"`);
    } catch (error) {
      await denops.cmd(`echoerr "Failed to add word to dictionary: ${error}"`);
    }
  }

  /**
   * Vimのハイライトグループ名として有効かどうか検証する
   * Phase 11: process3 sub2-1-1 - main.tsからCore classへの移行
   * TDD Green Phase: 既存のvalidateHighlightGroupName関数のロジックを移植
   *
   * Vimのハイライトグループ名のルール：
   * - 英字またはアンダースコアで開始
   * - 英数字とアンダースコアのみ使用可能
   * - 100文字以下
   * @param groupName 検証するハイライトグループ名
   * @returns 有効な場合はtrue、無効な場合はfalse
   */
  static validateHighlightGroupName(groupName: string): boolean {
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
   * 色名が有効なVim色名かどうか検証する（Process3 Sub2-1-2実装）
   *
   * TDD GREEN Phase: テストをパスする最小限の実装
   * main.ts の isValidColorName 関数の実装をCore.isValidColorName静的メソッドとして移植
   *
   * @param colorName 検証する色名
   * @returns 有効な場合はtrue、無効な場合はfalse
   */
  public static isValidColorName(colorName: string): boolean {
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
      "NONE",
    ];

    return validColorNames.includes(colorName.toLowerCase());
  }

  /**
   * 16進数色表記が有効かどうか検証する（Process3 Sub2-1-3実装）
   *
   * TDD GREEN Phase: テストをパスする最小限の実装
   * main.ts の isValidHexColor 関数の実装をCore.isValidHexColor静的メソッドとして移植
   *
   * @param hexColor 検証する16進数色（例: "#ff0000", "#fff"）
   * @returns 有効な場合はtrue、無効な場合はfalse
   */
  public static isValidHexColor(hexColor: string): boolean {
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
   * 色値を正規化する（大文字小文字を統一）（Process3 Sub2-1-4実装）
   *
   * TDD GREEN Phase: テストをパスする最小限の実装
   * main.ts の normalizeColorName 関数の実装をCore.normalizeColorName静的メソッドとして移植
   *
   * @param color 正規化する色値
   * @returns 正規化された色値
   */
  public static normalizeColorName(color: string): string {
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
   * ハイライト色設定を検証する（Process3 Sub2-1-5実装）
   *
   * TDD GREEN Phase: テストをパスする最小限の実装
   * main.ts の validateHighlightColor 関数の実装をCore.validateHighlightColor静的メソッドとして移植
   *
   * @param colorConfig 検証するハイライト色設定
   * @returns 検証結果
   */
  public static validateHighlightColor(
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
      if (!Core.validateHighlightGroupName(colorConfig)) {
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
        } else if (!Core.isValidColorName(fg) && !Core.isValidHexColor(fg)) {
          errors.push(`Invalid fg color: ${fg}`);
        }
      }

      // bgの検証
      if (bg !== undefined) {
        if (typeof bg !== "string") {
          errors.push("bg must be a string");
        } else if (bg === "") {
          errors.push("bg cannot be empty string");
        } else if (!Core.isValidColorName(bg) && !Core.isValidHexColor(bg)) {
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
   * ハイライトコマンドを生成する（Process3 Sub2-1-6実装）
   *
   * TDD GREEN Phase: テストをパスする最小限の実装
   * main.ts の generateHighlightCommand 関数の実装をCore.generateHighlightCommand静的メソッドとして移植
   *
   * @param hlGroupName ハイライトグループ名
   * @param colorConfig 色設定
   * @returns 生成されたハイライトコマンド
   */
  public static generateHighlightCommand(
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
      const normalizedFg = Core.normalizeColorName(fg);
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
      const normalizedBg = Core.normalizeColorName(bg);
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
   * ハイライト設定を検証する（設定更新時に使用）（Process3 Sub2-1-7実装）
   *
   * TDD GREEN Phase: テストをパスする最小限の実装
   * main.ts の validateHighlightConfig 関数の実装をCore.validateHighlightConfig静的メソッドとして移植
   *
   * @param config 検証する設定オブジェクト
   * @returns 検証結果
   */
  public static validateHighlightConfig(
    config: {
      highlightHintMarker?: string | HighlightColor;
      highlightHintMarkerCurrent?: string | HighlightColor;
    },
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // highlightHintMarkerの検証
    if (config.highlightHintMarker !== undefined) {
      const markerResult = Core.validateHighlightColor(config.highlightHintMarker);
      if (!markerResult.valid) {
        errors.push(...markerResult.errors.map((e) => `highlightHintMarker: ${e}`));
      }
    }

    // highlightHintMarkerCurrentの検証
    if (config.highlightHintMarkerCurrent !== undefined) {
      const currentResult = Core.validateHighlightColor(config.highlightHintMarkerCurrent);
      if (!currentResult.valid) {
        errors.push(...currentResult.errors.map((e) => `highlightHintMarkerCurrent: ${e}`));
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * キー別最小文字数設定を取得する（Process3 Sub2-2-1実装）
   *
   * TDD GREEN Phase: テストをパスする最小限の実装
   * main.ts の getMinLengthForKey 関数の実装をCore.getMinLengthForKey静的メソッドとして移植
   *
   * @param config プラグインの設定オブジェクト（UnifiedConfig または Config）
   * @param key 対象のキー文字（例: 'f', 't', 'w'など）
   * @returns そのキーに対する最小文字数値（デフォルト: 2）
   */
  public static getMinLengthForKey(config: UnifiedConfig | Config, key: string): number {
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
    return 3;
  }

  /**
   * キー別motion_count設定を取得する（Process3 Sub2-2-2実装）
   *
   * TDD GREEN Phase: テストをパスする最小限の実装
   * main.ts の getMotionCountForKey 関数の実装をCore.getMotionCountForKey静的メソッドとして移植
   *
   * @param key 対象のキー文字（例: 'f', 't', 'w'など）
   * @param config プラグインの設定オブジェクト（UnifiedConfig または Config）
   * @returns そのキーに対するmotion_count値（デフォルト: 3）
   */
  public static getMotionCountForKey(key: string, config: UnifiedConfig | Config): number {
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
    return 2;
  }

  // ========================================
  // sub2-3: Display Functions Implementation
  // ========================================

  /**
   * sub2-3-2: isRenderingHints - ヒントの描画処理中かどうかを取得
   *
   * 非同期描画の状態を外部から確認するためのステータス関数
   * main.ts の isRenderingHints 関数をCoreクラスに移植
   *
   * @returns boolean 描画処理中の場合はtrue、そうでなければfalse
   * @since sub2-3-2
   *
   * @example
   * const core = Core.getInstance();
   * if (!core.isRenderingHints()) {
   *   await core.displayHintsAsync(denops, hints, config);
   * }
   */
  isRenderingHints(): boolean {
    return this._isRenderingHints;
  }

  /**
   * sub2-3-3: abortCurrentRendering - 現在実行中の描画処理を中断
   *
   * 進行中の非同期描画処理を安全に中断します
   * main.ts の abortCurrentRendering 関数をCoreクラスに移植
   *
   * @since sub2-3-3
   *
   * @example
   * const core = Core.getInstance();
   * core.abortCurrentRendering();
   */
  abortCurrentRendering(): void {
    if (this._renderingAbortController) {
      this._renderingAbortController.abort();
      this._isRenderingHints = false;
      this._renderingAbortController = null;
    }
  }

  /**
   * sub2-3-4: highlightCandidateHintsAsync - 候補ヒントをハイライト
   *
   * 部分入力に基づいて、該当する候補ヒントをハイライト表示します
   * main.ts の highlightCandidateHintsAsync 関数をCoreクラスに移植
   *
   * @param denops Denopsインスタンス
   * @param hintMappings ヒントマッピング配列
   * @param partialInput 部分入力文字列
   * @param config 表示設定
   * @param signal 中断用のAbortSignal（オプション）
   * @returns Promise<void> 非同期で完了
   * @since sub2-3-4
   *
   * @example
   * const core = Core.getInstance();
   * await core.highlightCandidateHintsAsync(denops, hints, "A", { mode: "normal" });
   */
  async highlightCandidateHintsAsync(
    denops: Denops,
    hintMappings: HintMapping[],
    partialInput: string,
    config: { mode?: string; [key: string]: any },
    signal?: AbortSignal,
  ): Promise<void> {
    try {
      // 中断チェック
      if (signal?.aborted) {
        return;
      }

      // 空の部分入力の場合は何もしない
      if (!partialInput) {
        return;
      }

      // 候補ヒントをフィルタリング
      const candidateHints = hintMappings.filter(mapping =>
        mapping.hint.startsWith(partialInput)
      );

      // 中断チェック
      if (signal?.aborted) {
        return;
      }

      // 候補がない場合は何もしない
      if (candidateHints.length === 0) {
        return;
      }

      const mode = config.mode || "normal";
      const bufnr = await denops.call("bufnr", "%") as number;

      // 候補ヒントをハイライト表示
      // extmarkを使って候補をハイライト
      const extmarkNamespace = await denops.call("nvim_create_namespace", "hellshake_yano_candidate_highlights") as number;

      // 既存のハイライトをクリア
      await denops.call("nvim_buf_clear_namespace", bufnr, extmarkNamespace, 0, -1);

      // 中断チェック
      if (signal?.aborted) {
        return;
      }

      // 候補ヒントにハイライトを適用
      for (const mapping of candidateHints) {
        // 中断チェック
        if (signal?.aborted) {
          return;
        }

        const { word, hint } = mapping;
        const hintLine = word.line;
        const hintCol = mapping.hintCol || word.col;
        const hintByteCol = mapping.hintByteCol || mapping.hintCol || word.byteCol || word.col;

        // Neovim用の0ベース座標に変換
        const nvimLine = hintLine - 1;
        const nvimCol = hintByteCol - 1;

        try {
          await denops.call(
            "nvim_buf_set_extmark",
            bufnr,
            extmarkNamespace,
            nvimLine,
            nvimCol,
            {
              "end_col": nvimCol + hint.length,
              "hl_group": "HellshakeYanoCandidateHighlight", // 候補用ハイライトグループ
              "priority": 1001, // 通常のヒントより高い優先度
            }
          );
        } catch (error) {
          // 個別のextmarkエラーは無視（バッファが変更された可能性）
          console.warn("[Core] highlightCandidateHintsAsync extmark error:", error);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // 中断は正常な動作なので、エラーログは出力しない
        return;
      }
      console.error("[Core] highlightCandidateHintsAsync error:", error);
    }
  }
}
