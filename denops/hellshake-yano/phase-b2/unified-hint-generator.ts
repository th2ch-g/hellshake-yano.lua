/**
 * unified-hint-generator.ts - VimScript版hint_generator.vimの完全移植
 *
 * TDD Phase: GREEN
 * Process4-sub2: 実装
 *
 * VimScript版のアルゴリズムを完全再現し、ヒント生成順序を100%一致させます。
 *
 * ## VimScript版との互換性保証
 * - 単一文字ヒント: 'asdfgnm' (7文字)
 * - 複数文字ヒント: 'bceiopqrtuvwxyz' (15文字) から生成
 * - 最大49個の制限（7単一文字 + 42複数文字）
 * - インデックス計算: first_idx = i / len, second_idx = i % len
 *
 * ## アルゴリズム（VimScript版と同一）
 * 1. count が 0 以下の場合、空配列を返す
 * 2. count <= 7: 単一文字ヒントのみ
 * 3. count > 7: 単一文字ヒント + 複数文字ヒント
 * 4. 最大49個まで（7 + 42 = 49）
 */

/**
 * ヒント生成設定
 */
export interface HintGeneratorConfig {
  /**
   * 単一文字ヒント用のキー
   * デフォルト: ['a', 's', 'd', 'f', 'g', 'n', 'm']
   */
  singleCharKeys?: string[];

  /**
   * 複数文字ヒント用のキー
   * デフォルト: ['b', 'c', 'e', 'i', 'o', 'p', 'q', 'r', 't', 'u', 'v', 'w', 'x', 'y', 'z']
   */
  multiCharKeys?: string[];
}

/**
 * UnifiedHintGenerator - ヒント文字列生成クラス
 *
 * VimScript版のhellshake_yano_vim#hint_generator#generate()を完全移植
 */
export class UnifiedHintGenerator {
  private singleCharKeys: string[];
  private multiCharKeys: string[];
  private maxTotal = 49;

  constructor(config?: HintGeneratorConfig) {
    // VimScript版のデフォルト値
    this.singleCharKeys = config?.singleCharKeys ?? [
      "a",
      "s",
      "d",
      "f",
      "g",
      "n",
      "m",
    ];
    this.multiCharKeys = config?.multiCharKeys ?? [
      "b",
      "c",
      "e",
      "i",
      "o",
      "p",
      "q",
      "r",
      "t",
      "u",
      "v",
      "w",
      "x",
      "y",
      "z",
    ];
  }

  /**
   * ヒント文字列を生成
   *
   * VimScript版のgenerate()関数を完全再現
   *
   * @param count - 生成するヒント数
   * @returns ヒント文字列の配列
   *
   * @example
   * const generator = new UnifiedHintGenerator();
   * const hints = generator.generate(3);
   * // ['a', 's', 'd']
   *
   * const hints14 = generator.generate(14);
   * // ['a', 's', 'd', 'f', 'g', 'n', 'm', 'bb', 'bc', 'be', 'bi', 'bo', 'bp', 'bq']
   */
  generate(count: number): string[] {
    // VimScript版: count <= 0 の場合は空配列
    if (count <= 0) {
      return [];
    }

    // VimScript版: 最大49個まで
    const actualCount = Math.min(count, this.maxTotal);

    // VimScript版: 単一文字ヒント（最大7個）
    const singleCharCount = Math.min(actualCount, this.singleCharKeys.length);
    const hints = this.singleCharKeys.slice(0, singleCharCount);

    // VimScript版: 複数文字ヒント（8個目以降）
    if (actualCount > this.singleCharKeys.length) {
      const multiCharCount = actualCount - this.singleCharKeys.length;
      const multiCharHints = this.generateMultiCharHints(multiCharCount);
      hints.push(...multiCharHints);
    }

    return hints;
  }

  /**
   * 複数文字ヒントを生成
   *
   * VimScript版のs:generate_multi_char_hints()を完全再現
   *
   * アルゴリズム:
   * - インデックス i に基づいて2文字ヒントを生成
   * - first_idx = i / len(multiCharKeys)
   * - second_idx = i % len(multiCharKeys)
   * - 例（multiCharKeys='bce...'の場合）: i=0 → 'bb', i=1 → 'bc'
   *
   * @param count - 生成する複数文字ヒント数
   * @returns 複数文字ヒントの配列
   *
   * @private
   */
  private generateMultiCharHints(count: number): string[] {
    const hints: string[] = [];
    const baseChars = this.multiCharKeys;
    const maxHints = baseChars.length * baseChars.length;

    // VimScript版: 最大 len(multi_char_keys)^2 個まで
    const actualCount = Math.min(count, maxHints);

    for (let i = 0; i < actualCount; i++) {
      // VimScript版のインデックス計算を完全再現
      // first_idx = l:i / len(l:base_chars)
      // second_idx = l:i % len(l:base_chars)
      const firstIdx = Math.floor(i / baseChars.length);
      const secondIdx = i % baseChars.length;
      const hint = baseChars[firstIdx] + baseChars[secondIdx];
      hints.push(hint);
    }

    return hints;
  }

  /**
   * 現在の設定を取得（テスト用）
   *
   * @returns 現在の設定
   */
  getConfig(): HintGeneratorConfig {
    return {
      singleCharKeys: [...this.singleCharKeys],
      multiCharKeys: [...this.multiCharKeys],
    };
  }
}
