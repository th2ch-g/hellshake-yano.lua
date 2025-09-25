/**
 * ヒントユーティリティ関数
 *
 * 表示幅サポート付きヒント処理のためのヘルパー関数
 */

import { getDisplayWidth } from "./utils/display.ts";
import type { Word } from "./types.ts";

/**
 * 文字インデックスを表示column位置に変換
 *
 * 行内の0ベースの文字インデックスを1ベースの表示column位置に変換します。
 * tab文字とその表示幅を考慮します。これは表示ベースの座標を使用する
 * エディタでの正確なカーソル位置決めに不可欠です。
 *
 * @param line - 文字を含む行のテキスト
 * @param charIndex - 行内の文字インデックス（0ベース座標系）
 * @param tabWidth - 表示計算用のtab幅設定（デフォルト: 8）
 * @returns 表示column位置（1ベース座標系）
 *
 * @example
 * ```typescript
 * // tabのないシンプルなテキスト
 * convertToDisplayColumn("hello world", 5, 8); // Returns 6
 *
 * // tab文字を含むテキスト
 * convertToDisplayColumn("hello\tworld", 6, 8); // Returns 9 (tab expands to column 8)
 *
 * // 境界ケース: 行の始まり
 * convertToDisplayColumn("text", 0, 8); // Returns 1
 * ```
 */
export function convertToDisplayColumn(line: string, charIndex: number, tabWidth = 8): number {
  if (charIndex <= 0) {
    return 1;
  }

  // Get substring from start to charIndex
  const substring = line.slice(0, charIndex);
  return getDisplayWidth(substring, tabWidth) + 1; // +1 for 1-based column position
}

/**
 * 単語の表示終了column位置を取得
 *
 * tabやマルチバイト文字を含む文字の視覚的幅を考慮して、単語が占める
 * 最後の表示column位置を計算します。これは正確なヒント配置と
 * 単語境界検出に重要です。
 *
 * @param word - テキスト、行、column情報を含む単語オブジェクト
 * @param word.text - 単語のテキスト内容
 * @param word.col - 開始column位置（1ベース）
 * @param word.line - 行番号（1ベース）
 * @param tabWidth - 表示計算用のtab幅設定（デフォルト: 8）
 * @returns 表示終了column位置（1ベース座標系）
 *
 * @example
 * ```typescript
 * const word = { text: "hello", col: 5, line: 1 };
 * getWordDisplayEndCol(word, 8); // Returns 9 (5 + 5 - 1)
 *
 * const wordWithTab = { text: "a\tb", col: 1, line: 1 };
 * getWordDisplayEndCol(wordWithTab, 8); // Returns calculated based on tab expansion
 * ```
 */
export function getWordDisplayEndCol(word: Word, tabWidth = 8): number {
  const textWidth = getDisplayWidth(word.text, tabWidth);
  return word.col + textWidth - 1;
}

/**
 * 表示幅に基づいて2つの単語が隣接しているかチェック
 *
 * 表示幅の計算を考慮して、2つの単語が同じ行で視覚的に隣接しているかを
 * 判定します。単語が接触または重複している場合（gap <= 0）、隣接していると
 * みなされます。これはヒントのクラスタリングとレイアウト最適化に使用されます。
 *
 * @param word1 - 最初の単語オブジェクト
 * @param word2 - 2番目の単語オブジェクト
 * @param tabWidth - 表示計算用のtab幅設定（デフォルト: 8）
 * @returns 単語が隣接している（接触または重複）場合はtrue、そうでなければfalse
 *
 * @example
 * ```typescript
 * const word1 = { text: "hello", col: 1, line: 1 };
 * const word2 = { text: "world", col: 7, line: 1 };
 * areWordsAdjacent(word1, word2, 8); // Returns true (touching: gap = 0)
 *
 * const word3 = { text: "far", col: 10, line: 1 };
 * areWordsAdjacent(word1, word3, 8); // Returns false (gap > 0)
 *
 * const word4 = { text: "other", col: 1, line: 2 };
 * areWordsAdjacent(word1, word4, 8); // Returns false (different lines)
 * ```
 */
export function areWordsAdjacent(word1: Word, word2: Word, tabWidth = 8): boolean {
  // Must be on the same line
  if (word1.line !== word2.line) {
    return false;
  }

  // Calculate display end positions
  const word1EndCol = getWordDisplayEndCol(word1, tabWidth);
  const word2EndCol = getWordDisplayEndCol(word2, tabWidth);

  // Calculate distance between words
  let distance: number;
  if (word1.col < word2.col) {
    // word1 comes before word2
    distance = word2.col - word1EndCol - 1;
  } else {
    // word2 comes before word1
    distance = word1.col - word2EndCol - 1;
  }

  // Adjacent if touching (distance 0) or overlapping (negative distance)
  // Distance 0 = touching, Distance 1 = one space between (not adjacent), Distance < 0 = overlapping
  return distance <= 0;
}

/**
 * 単語の表示開始column位置を取得
 *
 * 単語の開始表示column位置を返します。現在は単語がすでに表示位置を
 * 格納しているため、単語のcolumnを直接返しますが、この関数は単語境界
 * 計算のための一貫したAPIを提供します。
 *
 * @param word - 位置情報を含む単語オブジェクト
 * @param word.col - 開始column位置（1ベース）
 * @param tabWidth - tab幅設定（API一貫性のため含む、デフォルト: 8）
 * @returns 表示開始column位置（1ベース座標系）
 *
 * @example
 * ```typescript
 * const word = { text: "example", col: 10, line: 1 };
 * getWordDisplayStartCol(word, 8); // Returns 10
 * ```
 */
export function getWordDisplayStartCol(word: Word, tabWidth = 8): number {
  return word.col;
}

/**
 * 表示幅を考慮したヒント位置の計算
 *
 * 単語に対するヒント配置の最適な表示column位置を決定し、異なる配置
 * ストラテジーをサポートします。この関数はヒント表示システムの中核であり、
 * ヒントが視覚的に適切な位置に配置されることを保証します。
 *
 * @param word - ヒント位置を計算する単語オブジェクト
 * @param word.col - 開始column位置（1ベース）
 * @param word.text - 単語のテキスト内容
 * @param position - ヒント配置のストラテジー
 *   - "start": 単語の始まりにヒントを配置
 *   - "end": 単語の終わりにヒントを配置
 *   - "overlay": 単語に重ねてヒントを配置（startと同じ）
 * @param tabWidth - 表示計算用のtab幅設定（デフォルト: 8）
 * @returns ヒント配置用の表示column位置（1ベース座標系）
 *
 * @example
 * ```typescript
 * const word = { text: "function", col: 5, line: 1 };
 *
 * calculateHintDisplayPosition(word, "start", 8);   // Returns 5 (word start)
 * calculateHintDisplayPosition(word, "end", 8);     // Returns 12 (word end)
 * calculateHintDisplayPosition(word, "overlay", 8); // Returns 5 (overlay on start)
 * ```
 */
export function calculateHintDisplayPosition(
  word: Word,
  position: "start" | "end" | "overlay",
  tabWidth = 8,
): number {
  switch (position) {
    case "start":
      return word.col;
    case "end":
      return getWordDisplayEndCol(word, tabWidth);
    case "overlay":
      return word.col;
    default:
      return word.col;
  }
}

/**
 * 文字列のバイト長を取得（UTF-8互換性のため）
 *
 * UTF-8文字列のバイト長を計算します。これはマルチバイト文字の場合、
 * 文字長とは異なる場合があります。これはエディタ互換性と
 * Vim/Neovim環境での正確なバッファ操作に重要です。
 *
 * @param text - 測定する入力テキスト文字列
 * @returns UTF-8エンコーディングでの文字列のバイト長
 *
 * @example
 * ```typescript
 * getByteLength("hello");    // Returns 5 (ASCII characters)
 * getByteLength("こんにちは");  // Returns 15 (5 characters × 3 bytes each)
 * getByteLength("café");     // Returns 5 (4 characters, 'é' = 2 bytes)
 * getByteLength("");         // Returns 0 (empty string)
 * ```
 */
export function getByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/**
 * 位置が単語の表示範囲内にあるかをチェック
 *
 * 指定された表示column位置が単語の境界内にあるかを判定します。
 * tabやマルチバイト文字を含む単語の視覚的幅を考慮します。
 * これはカーソル位置決めと単語選択の検証に使用されます。
 *
 * @param position - チェックするcolumn位置（1ベース座標系）
 * @param word - チェック対象の単語オブジェクト
 * @param word.col - 単語の開始column位置（1ベース）
 * @param word.text - 単語のテキスト内容
 * @param tabWidth - 表示計算用のtab幅設定（デフォルト: 8）
 * @returns 位置が単語の表示範囲内（境界含む）にある場合はtrue、そうでなければfalse
 *
 * @example
 * ```typescript
 * const word = { text: "example", col: 5, line: 1 };
 * // 単語はcolumn 5-11にまたがる（column 5から始まる7文字）
 *
 * isPositionWithinWord(5, word, 8);  // Returns true (start of word)
 * isPositionWithinWord(8, word, 8);  // Returns true (middle of word)
 * isPositionWithinWord(11, word, 8); // Returns true (end of word)
 * isPositionWithinWord(4, word, 8);  // Returns false (before word)
 * isPositionWithinWord(12, word, 8); // Returns false (after word)
 * ```
 */
export function isPositionWithinWord(position: number, word: Word, tabWidth = 8): boolean {
  const startCol = getWordDisplayStartCol(word, tabWidth);
  const endCol = getWordDisplayEndCol(word, tabWidth);
  return position >= startCol && position <= endCol;
}

/**
 * 表示位置での2つの単語間のギャップを計算
 *
 * 同じ行の2つの単語間の視覚的距離を表示column位置で測定して計算します。
 * 単語間の空の位置数を返すか、単語が重複している場合は負の値を返します。
 * これはヒントの間隔とレイアウト決定に不可欠です。
 *
 * @param word1 - 最初の単語オブジェクト
 * @param word2 - 2番目の単語オブジェクト
 * @param tabWidth - 表示計算用のtab幅設定（デフォルト: 8）
 * @returns 単語間の表示位置でのギャップ
 *   - 正数: 単語間の空のcolumn数
 *   - ゼロ: 単語が接触している（隣接）
 *   - 負数: 単語が重複している
 *   - Infinity: 単語が異なる行にある
 *
 * @example
 * ```typescript
 * const word1 = { text: "hello", col: 1, line: 1 };  // Spans columns 1-5
 * const word2 = { text: "world", col: 7, line: 1 };  // Spans columns 7-11
 * calculateWordGap(word1, word2, 8); // Returns 0 (touching: 5->6->7)
 *
 * const word3 = { text: "far", col: 10, line: 1 };   // Spans columns 10-12
 * calculateWordGap(word1, word3, 8); // Returns 3 (gap: columns 6,7,8,9)
 *
 * const word4 = { text: "overlap", col: 3, line: 1 }; // Spans columns 3-9
 * calculateWordGap(word1, word4, 8); // Returns -3 (overlapping by 3 columns)
 *
 * const word5 = { text: "other", col: 1, line: 2 };
 * calculateWordGap(word1, word5, 8); // Returns Infinity (different lines)
 * ```
 */
export function calculateWordGap(word1: Word, word2: Word, tabWidth = 8): number {
  if (word1.line !== word2.line) {
    return Infinity; // Different lines
  }

  const word1EndCol = getWordDisplayEndCol(word1, tabWidth);
  const word2EndCol = getWordDisplayEndCol(word2, tabWidth);

  if (word1.col < word2.col) {
    // word1 comes before word2
    return word2.col - word1EndCol - 1;
  } else {
    // word2 comes before word1
    return word1.col - word2EndCol - 1;
  }
}
