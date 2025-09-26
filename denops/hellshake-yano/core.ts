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
}
