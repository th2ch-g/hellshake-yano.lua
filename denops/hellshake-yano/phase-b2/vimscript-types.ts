/**
 * VimScript型定義とDenops型の相互変換
 *
 * このモジュールはVimScript版の単語データとDenops版のWord型を相互変換します。
 *
 * ## 座標系の違い
 * - VimScript: lnum, col, end_col（全て1-indexed）
 * - Denops: line, col（全て1-indexed、既存実装に合わせる）
 *
 * ## データ構造
 * - VimScriptWord: VimScript版の単語データ（text, lnum, col, end_col）
 * - DenopsWord: Denops版のWord型（text, line, col）
 */

/**
 * VimScript版の単語データ型定義
 *
 * VimScript版のword_detector.vimが返すデータ構造
 *
 * @property text - 単語文字列
 * @property lnum - 行番号（1-indexed）
 * @property col - 開始列（1-indexed）
 * @property end_col - 終了列（1-indexed、matchstrposの戻り値 + 1）
 */
export interface VimScriptWord {
  text: string;
  lnum: number;
  col: number;
  end_col: number;
}

/**
 * Denops版のWord型（既存types.tsから参照）
 *
 * @property text - 単語文字列
 * @property line - 行番号（1-indexed）
 * @property col - 開始列（1-indexed）
 * @property byteCol - バイト列（オプショナル）
 */
export interface DenopsWord {
  text: string;
  line: number;
  col: number;
  byteCol?: number;
}

/**
 * VimScriptWord型をDenopsWord型に変換
 *
 * VimScript版の単語データをDenops版のWord型に変換します。
 * end_col情報は失われますが、Phase B-2ではtext, line, colのみを使用します。
 *
 * @param vimWord - VimScript版の単語データ
 * @returns Denops版のWord型
 *
 * @example
 * const vimWord = { text: "hello", lnum: 10, col: 5, end_col: 10 };
 * const denopsWord = toDenopsWord(vimWord);
 * // { text: "hello", line: 10, col: 5 }
 */
export function toDenopsWord(vimWord: VimScriptWord): DenopsWord {
  return {
    text: vimWord.text,
    line: vimWord.lnum,
    col: vimWord.col,
  };
}

/**
 * DenopsWord型をVimScriptWord型に変換
 *
 * Denops版のWord型をVimScript版の単語データに変換します。
 * end_colは単語の長さから計算します（col + text.length）。
 *
 * @param denopsWord - Denops版のWord型
 * @returns VimScript版の単語データ
 *
 * @example
 * const denopsWord = { text: "hello", line: 10, col: 5 };
 * const vimWord = toVimScriptWord(denopsWord);
 * // { text: "hello", lnum: 10, col: 5, end_col: 10 }
 */
export function toVimScriptWord(denopsWord: DenopsWord): VimScriptWord {
  return {
    text: denopsWord.text,
    lnum: denopsWord.line,
    col: denopsWord.col,
    end_col: denopsWord.col + denopsWord.text.length,
  };
}

/**
 * VimScriptWord型の型ガード
 *
 * @param obj - チェック対象のオブジェクト
 * @returns VimScriptWord型かどうか
 */
export function isVimScriptWord(obj: unknown): obj is VimScriptWord {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as VimScriptWord).text === "string" &&
    typeof (obj as VimScriptWord).lnum === "number" &&
    typeof (obj as VimScriptWord).col === "number" &&
    typeof (obj as VimScriptWord).end_col === "number" &&
    (obj as VimScriptWord).lnum > 0 &&
    (obj as VimScriptWord).col > 0 &&
    (obj as VimScriptWord).end_col > 0
  );
}
