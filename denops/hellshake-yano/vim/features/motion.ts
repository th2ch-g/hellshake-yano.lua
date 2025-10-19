/**
 * motion.ts - モーション検出
 *
 * Vim Layer: モーション検出コンポーネント
 *
 * Vim モーション (h, j, k, l, w, W, b, B等) の検出
 */

/**
 * モーション タイプ
 */
export enum MotionType {
  Character = "char", // h, l, 矢印キー
  Word = "word", // w, W, b, B
  Line = "line", // j, k
  Other = "other", // その他
}

/**
 * モーション情報
 */
export interface MotionInfo {
  key: string; // モーションキー (例: 'w', 'h', 'j')
  type: MotionType;
  count?: number; // 繰り返し回数 (例: '3w' -> count: 3)
}

/**
 * VimMotion - モーション検出クラス
 */
export class VimMotion {
  private static readonly CHARACTER_MOTIONS = new Set(["h", "l", "k", "j"]);
  private static readonly WORD_MOTIONS = new Set(["w", "W", "b", "B", "e", "E"]);
  private static readonly LINE_MOTIONS = new Set(["g", "G", "0", "$"]);

  /**
   * キー入力からモーション情報を検出
   *
   * @param key - 入力キー
   * @returns モーション情報
   *
   * @example
   * const motion = VimMotion.detectMotion('w');
   * // { key: 'w', type: MotionType.Word }
   */
  static detectMotion(key: string): MotionInfo {
    const type = this.getMotionType(key);
    return {
      key,
      type,
    };
  }

  /**
   * キーからモーション タイプを判定
   *
   * @param key - 入力キー
   * @returns モーション タイプ
   */
  private static getMotionType(key: string): MotionType {
    if (this.CHARACTER_MOTIONS.has(key)) {
      return MotionType.Character;
    }
    if (this.WORD_MOTIONS.has(key)) {
      return MotionType.Word;
    }
    if (this.LINE_MOTIONS.has(key)) {
      return MotionType.Line;
    }
    return MotionType.Other;
  }

  /**
   * モーション情報が有効か検証
   *
   * @param motion - モーション情報
   * @returns 有効な場合true
   */
  static isValidMotion(motion: MotionInfo): boolean {
    return motion.type !== MotionType.Other;
  }
}
