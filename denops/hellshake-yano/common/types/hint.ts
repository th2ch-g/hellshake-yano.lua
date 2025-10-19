/**
 * denops/hellshake-yano/common/types/hint.ts
 *
 * ヒント関連の型定義
 *
 * ヒント表示に関連する型を定義します。
 */

import type { DenopsWord } from "./word.ts";

/**
 * HintDisplayMode: ヒント表示モード
 *
 * - before: 単語の前に表示
 * - after: 単語の後に表示
 * - overlay: 単語の上に重ねて表示
 */
export type HintDisplayMode = "before" | "after" | "overlay";

/**
 * HintPosition: ヒント表示位置
 *
 * @property line - 行番号（1-indexed）
 * @property col - 列番号（1-indexed）
 * @property display_mode - 表示モード
 */
export interface HintPosition {
  line: number;
  col: number;
  display_mode: HintDisplayMode;
}

/**
 * HintMapping: ヒントと単語のマッピング
 *
 * @property word - 対象の単語
 * @property hint - ヒント文字列
 * @property hintCol - ヒント表示列（1-indexed）
 * @property hintByteCol - ヒント表示列（バイト単位）
 */
export interface HintMapping {
  word: DenopsWord;
  hint: string;
  hintCol: number;
  hintByteCol: number;
}

/**
 * Hint: ヒント情報
 *
 * @property key - ヒントキー
 * @property position - ヒント表示位置
 * @property word - 対象の単語
 */
export interface Hint {
  key: string;
  position: HintPosition;
  word: DenopsWord;
}
