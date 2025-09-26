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
  DetectionContext,
  HintMapping,
  HintKeyConfig,
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

  /**
   * Coreクラスのコンストラクタ
   *
   * @param config 初期設定（省略時はデフォルト設定を使用）
   */
  constructor(config?: Partial<Config>) {
    this.config = { ...createMinimalConfig(), ...config };
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
   * ヒント表示を実行
   *
   * @param hints 表示するヒントマッピング配列
   */
  showHints(hints: HintMapping[]): void {
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

        // バッチ間の小さな遅延（CPU負荷を減らす）
        if (i + batchSize < hints.length && hints.length > 100) {
          await new Promise((resolve) => setTimeout(resolve, 1));
        }
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

        // バッチ間の小さな遅延（CPU負荷を減らす）
        if (i + batchSize < hints.length && hints.length > 200) {
          await new Promise((resolve) => setTimeout(resolve, 1));
        }
      } catch (batchError) {
        // バッチエラーの場合は次のバッチに続く
        console.error("[Core] displayHintsWithMatchAddBatch batch error:", batchError);
      }
    }
  }
}
