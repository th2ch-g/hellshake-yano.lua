/**
 * word-detector-base.ts
 * WordDetectorの基底クラス（Template Method パターン実装）
 *
 * 共通処理を抽出して重複コードを削減します。
 */

import type { Denops } from "@denops/std";
import type { DetectionContext, Word } from "../types.ts";
import type { Config } from "../config.ts";
import { Core } from "../core.ts";
import type { WordDetector, WordDetectionConfig } from "./word-detector-strategies.ts";

/**
 * Config型の識別と分離
 */
export function resolveConfigType(
  globalConfig?: Config | Config,
): [Config | undefined, Config | undefined] {
  if (!globalConfig) {
    return [undefined, undefined];
  }

  // 統一的なConfigインターフェースを持つ場合は第一引数に
  if ('perKeyMinLength' in globalConfig || 'defaultMinWordLength' in globalConfig) {
    return [globalConfig as Config, undefined];
  }

  // 従来のConfigの場合は第二引数に
  return [undefined, globalConfig as Config];
}

/**
 * WordDetector基底クラス
 * Template Method パターンで共通処理を実装
 */
export abstract class BaseWordDetector implements WordDetector {
  abstract readonly name: string;
  abstract readonly priority: number;
  abstract readonly supportedLanguages: string[];

  protected config: WordDetectionConfig;
  protected unifiedConfig?: Config;
  protected globalConfig?: Config;

  constructor(config: WordDetectionConfig = {}, globalConfig?: Config | Config) {
    this.config = this.mergeWithDefaults(config);
    [this.unifiedConfig, this.globalConfig] = resolveConfigType(globalConfig);
  }

  /**
   * Template Method: 単語検出のメインフロー
   */
  async detectWords(
    text: string,
    startLine: number,
    context?: DetectionContext,
    denops?: Denops,
  ): Promise<Word[]> {
    // 1. 前処理
    const preprocessedText = this.preprocess(text, context);

    // 2. 行ごとに分割
    const lines = preprocessedText.split("\n");
    const words: Word[] = [];

    // 3. 各行から単語を抽出（サブクラスで実装）
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const lineNumber = startLine + i;
      const lineWords = await this.extractWordsFromLine(lineText, lineNumber, context, denops);
      words.push(...lineWords);
    }

    // 4. フィルター適用
    const filtered = this.applyFilters(words, context);

    // 5. 後処理
    return this.postprocess(filtered, context);
  }

  /**
   * 前処理（サブクラスでオーバーライド可能）
   */
  protected preprocess(text: string, context?: DetectionContext): string {
    return text;
  }

  /**
   * 行から単語を抽出（サブクラスで実装必須）
   */
  protected abstract extractWordsFromLine(
    lineText: string,
    lineNumber: number,
    context?: DetectionContext,
    denops?: Denops,
  ): Promise<Word[]>;

  /**
   * フィルター適用（共通処理）
   */
  protected applyFilters(words: Word[], context?: DetectionContext): Word[] {
    let filtered = words;

    // 最小単語長フィルター
    const minLength = this.getEffectiveMinLength(context, context?.currentKey);
    if (minLength >= 1) {
      filtered = filtered.filter((word) => word.text.length >= minLength);
    }

    // 最大単語長フィルター
    if (this.config.maxWordLength) {
      filtered = filtered.filter((word) => word.text.length <= this.config.maxWordLength!);
    }

    // 数字除外フィルター
    if (this.config.exclude_numbers) {
      filtered = filtered.filter((word) => !/^\d+$/.test(word.text));
    }

    // 単一文字除外フィルター（minLengthが1の場合はスキップ）
    if (this.config.exclude_single_chars && minLength !== 1) {
      filtered = filtered.filter((word) => word.text.length > 1);
    }

    return filtered;
  }

  /**
   * 後処理（サブクラスでオーバーライド可能）
   */
  protected postprocess(words: Word[], context?: DetectionContext): Word[] {
    return words;
  }

  /**
   * 有効な最小単語長を取得
   */
  protected getEffectiveMinLength(context?: DetectionContext, key?: string): number {
    // 1. Context優先
    if (context?.minWordLength !== undefined) {
      return context.minWordLength;
    }

    // 2. Config/グローバル設定のper_key_min_length
    if (this.unifiedConfig && key) {
      return this.unifiedConfig.perKeyMinLength?.[key] || this.unifiedConfig.defaultMinWordLength;
    }
    if (this.globalConfig && key) {
      return Core.getMinLengthForKey(this.globalConfig, key);
    }

    // 3. ローカル設定のmin_word_length
    return this.config.minWordLength || 1;
  }

  /**
   * 設定をデフォルト値とマージ（サブクラスでオーバーライド可能）
   */
  protected mergeWithDefaults(config: WordDetectionConfig): WordDetectionConfig {
    return {
      strategy: "regex",
      useJapanese: true,
      minWordLength: 1,
      maxWordLength: 50,
      exclude_numbers: false,
      exclude_single_chars: false,
      cacheEnabled: true,
      batchSize: 50,
      ...config,
    };
  }

  /**
   * テキストを処理できるかどうかを判定
   */
  abstract canHandle(text: string): boolean;

  /**
   * 検出器が利用可能かどうかを確認
   */
  abstract isAvailable(): Promise<boolean>;
}
