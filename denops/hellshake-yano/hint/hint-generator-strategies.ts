/**
 * hint-generator-strategies.ts
 * ヒント生成戦略の実装
 *
 * Strategy パターンを適用してヒント生成ロジックを簡潔化します。
 */

import type { HintKeyConfig } from "../types.ts";
import { DEFAULT_HINT_MARKERS } from "../types.ts";

/**
 * ヒント生成戦略の基底インターフェース
 */
export interface HintGenerationStrategy {
  /** 戦略名 */
  readonly name: string;
  /** 優先度（値が高いほど優先される） */
  readonly priority: number;

  /**
   * 指定された数のヒントを生成
   * @param count ヒント数
   * @param config ヒントキー設定
   * @returns ヒント文字列配列
   */
  generate(count: number, config?: HintKeyConfig): string[];

  /**
   * この戦略が利用可能かどうかを判定
   * @param count ヒント数
   * @param config ヒントキー設定
   * @returns 利用可能な場合true
   */
  canHandle(count: number, config?: HintKeyConfig): boolean;
}

/**
 * 単一文字ヒント生成戦略
 */
export class SingleCharHintStrategy implements HintGenerationStrategy {
  readonly name = "SingleChar";
  readonly priority = 10;

  generate(count: number, config?: HintKeyConfig): string[] {
    const keys = this.getKeys(config);
    return keys.slice(0, Math.min(count, keys.length));
  }

  canHandle(count: number, config?: HintKeyConfig): boolean {
    const keys = this.getKeys(config);
    return count > 0 && count <= keys.length;
  }

  private getKeys(config?: HintKeyConfig): string[] {
    if (!config) return "ASDFGHJKLNM0123456789".split("");

    const singleCharKeys = Array.isArray(config.singleCharKeys)
      ? config.singleCharKeys
      : typeof config.singleCharKeys === 'string'
        ? (config.singleCharKeys as string).split('')
        : [];

    return singleCharKeys.length > 0
      ? singleCharKeys
      : "ASDFGHJKLNM0123456789".split("");
  }
}

/**
 * 複数文字ヒント生成戦略
 */
export class MultiCharHintStrategy implements HintGenerationStrategy {
  readonly name = "MultiChar";
  readonly priority = 8;

  generate(count: number, config?: HintKeyConfig): string[] {
    const keys = this.getKeys(config);
    const hints: string[] = [];

    // 数字専用モードの判定
    if (this.isNumericOnlyKeys(keys)) {
      // 数字専用モード: 01-09, 10-99, 00の順で生成
      for (let i = 1; i <= 9 && hints.length < count; i++) {
        hints.push(String(i).padStart(2, "0"));
      }
      for (let i = 10; i < 100 && hints.length < count; i++) {
        hints.push(String(i).padStart(2, "0"));
      }
      if (hints.length < count) {
        hints.push("00");
      }
      return hints;
    }

    // 通常モード: 2文字ヒントを生成
    const maxHints = keys.length * keys.length;
    const actualCount = Math.min(count, maxHints);

    for (let i = 0; i < actualCount; i++) {
      const firstChar = keys[Math.floor(i / keys.length)];
      const secondChar = keys[i % keys.length];
      hints.push(firstChar + secondChar);
    }

    return hints;
  }

  canHandle(count: number, config?: HintKeyConfig): boolean {
    const keys = this.getKeys(config);
    return count > 0 && keys.length > 0;
  }

  private isNumericOnlyKeys(keys: string[]): boolean {
    if (!Array.isArray(keys) || keys.length === 0) {
      return false;
    }
    return keys.every(key => key.length === 1 && key >= "0" && key <= "9");
  }

  private getKeys(config?: HintKeyConfig): string[] {
    if (!config) return "BCEIOPQRTUVWXYZ".split("");

    const multiCharKeys = Array.isArray(config.multiCharKeys)
      ? config.multiCharKeys
      : typeof config.multiCharKeys === 'string'
        ? (config.multiCharKeys as string).split('')
        : [];

    return multiCharKeys.length > 0
      ? multiCharKeys
      : "BCEIOPQRTUVWXYZ".split("");
  }
}

/**
 * 数字ヒント生成戦略
 */
export class NumericHintStrategy implements HintGenerationStrategy {
  readonly name = "Numeric";
  readonly priority = 5;

  generate(count: number, config?: HintKeyConfig): string[] {
    const hints: string[] = [];

    // 0個以下の要求は空配列を返す
    if (count <= 0) {
      return hints;
    }

    // 最大100個まで生成
    const maxCount = Math.min(count, 100);

    // 優先順位1: 01-09を生成
    for (let i = 1; i <= 9 && hints.length < maxCount; i++) {
      hints.push(String(i).padStart(2, "0"));
    }

    // 優先順位2: 10-99を生成
    for (let i = 10; i < 100 && hints.length < maxCount; i++) {
      hints.push(String(i).padStart(2, "0"));
    }

    // 優先順位3: 00を最後に追加（必要な場合）
    if (hints.length < maxCount) {
      hints.push("00");
    }

    return hints;
  }

  canHandle(count: number, config?: HintKeyConfig): boolean {
    return count > 0 && config?.useNumericMultiCharHints === true;
  }
}

/**
 * ハイブリッドヒント生成戦略
 * 単一文字 → 複数文字 → 数字の順で生成
 */
export class HybridHintStrategy implements HintGenerationStrategy {
  readonly name = "Hybrid";
  readonly priority = 15;

  private singleCharStrategy = new SingleCharHintStrategy();
  private multiCharStrategy = new MultiCharHintStrategy();
  private numericStrategy = new NumericHintStrategy();

  generate(count: number, config?: HintKeyConfig): string[] {
    const hints: string[] = [];
    let remaining = count;

    // 単一文字と複数文字キーが両方未定義の場合はフォールバック
    const hasSingleCharKeys = config?.singleCharKeys && (
      (Array.isArray(config.singleCharKeys) && config.singleCharKeys.length > 0) ||
      (typeof config.singleCharKeys === 'string' && (config.singleCharKeys as string).length > 0)
    );
    const hasMultiCharKeys = config?.multiCharKeys && (
      (Array.isArray(config.multiCharKeys) && config.multiCharKeys.length > 0) ||
      (typeof config.multiCharKeys === 'string' && (config.multiCharKeys as string).length > 0)
    );

    // 両方未定義の場合はmarkersまたはデフォルト値を使用
    if (!hasSingleCharKeys && !hasMultiCharKeys) {
      const markers = config?.markers
        ? (Array.isArray(config.markers) ? config.markers : (config.markers as string).split(""))
        : DEFAULT_HINT_MARKERS.split("");
      return this.generateFromMarkers(count, markers);
    }

    // 1. 単一文字ヒント
    if (hasSingleCharKeys) {
      const singleCharKeys = Array.isArray(config?.singleCharKeys)
        ? config.singleCharKeys
        : typeof config?.singleCharKeys === 'string'
          ? (config.singleCharKeys as string).split('')
          : [];
      const maxSingleChars = config?.maxSingleCharHints ?? singleCharKeys.length;
      const singleCharCount = Math.min(remaining, maxSingleChars, singleCharKeys.length);
      if (singleCharCount > 0) {
        hints.push(...this.singleCharStrategy.generate(singleCharCount, config));
        remaining -= singleCharCount;
      }
    }

    // 2. 複数文字ヒント
    if (remaining > 0 && hasMultiCharKeys) {
      const multiCharHints = this.multiCharStrategy.generate(remaining, config);
      hints.push(...multiCharHints);
      remaining -= multiCharHints.length;
    }

    // 3. 数字ヒント（設定有効時のみ）
    if (remaining > 0 && config?.useNumericMultiCharHints) {
      const numericHints = this.numericStrategy.generate(remaining, config);
      hints.push(...numericHints);
    }

    return hints;
  }

  private generateFromMarkers(count: number, markers: string[]): string[] {
    const hints: string[] = [];

    // まず単一文字ヒントを追加
    hints.push(...markers.slice(0, Math.min(count, markers.length)));

    // 残りのヒントを2文字で生成
    const remaining = count - markers.length;
    if (remaining > 0) {
      const maxDoubleHints = markers.length * markers.length;
      const actualDoubleHints = Math.min(remaining, maxDoubleHints);

      for (let i = 0; i < actualDoubleHints; i++) {
        const firstChar = markers[Math.floor(i / markers.length)];
        const secondChar = markers[i % markers.length];
        hints.push(firstChar + secondChar);
      }
    }

    return hints.slice(0, count);
  }

  canHandle(count: number, config?: HintKeyConfig): boolean {
    return count > 0;
  }
}

/**
 * HintGeneratorFactory - Factory パターン実装
 */
export class HintGeneratorFactory {
  private static strategies: HintGenerationStrategy[] = [
    new HybridHintStrategy(),
    new SingleCharHintStrategy(),
    new MultiCharHintStrategy(),
    new NumericHintStrategy(),
  ];

  /**
   * 最適な戦略を選択してヒントを生成
   * @param count ヒント数
   * @param config ヒントキー設定
   * @returns ヒント文字列配列
   */
  static generate(count: number, config?: HintKeyConfig): string[] {
    // 数字専用モードの場合は直接NumericStrategyを使用
    if (config?.useNumericMultiCharHints && !config.singleCharKeys && !config.multiCharKeys) {
      return new NumericHintStrategy().generate(count, config);
    }

    // 優先度順にソート
    const sortedStrategies = [...this.strategies].sort((a, b) => b.priority - a.priority);

    // 最初に処理可能な戦略を使用
    for (const strategy of sortedStrategies) {
      if (strategy.canHandle(count, config)) {
        return strategy.generate(count, config);
      }
    }

    // フォールバック: ハイブリッド戦略
    return new HybridHintStrategy().generate(count, config);
  }

  /**
   * カスタム戦略を登録
   * @param strategy 追加する戦略
   */
  static registerStrategy(strategy: HintGenerationStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * 登録されている戦略一覧を取得
   * @returns 戦略配列
   */
  static getStrategies(): readonly HintGenerationStrategy[] {
    return this.strategies;
  }
}
