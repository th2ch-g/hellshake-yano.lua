import type { Word } from "./word.ts";

export interface HintMapping {
  word: Word;
  hint: string;
}

/**
 * 指定数のヒントを生成する
 */
export function generateHints(wordCount: number, markers?: string[]): string[] {
  const defaultMarkers = markers || "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const hints: string[] = [];
  
  if (wordCount <= 0) {
    return hints;
  }
  
  if (wordCount <= defaultMarkers.length) {
    // 26個以下の場合は単一文字
    return defaultMarkers.slice(0, wordCount);
  } else {
    // 26個を超える場合は2文字のヒント
    for (let i = 0; i < wordCount; i++) {
      if (i < defaultMarkers.length) {
        hints.push(defaultMarkers[i]);
      } else {
        const idx = i - defaultMarkers.length;
        const firstChar = defaultMarkers[Math.floor(idx / defaultMarkers.length)];
        const secondChar = defaultMarkers[idx % defaultMarkers.length];
        hints.push(firstChar + secondChar);
      }
    }
  }
  
  return hints;
}

/**
 * 単語にヒントを割り当てる
 */
export function assignHintsToWords(
  words: Word[],
  hints: string[],
  cursorLine: number,
  cursorCol: number,
): HintMapping[] {
  if (words.length === 0 || hints.length === 0) {
    return [];
  }
  
  // カーソル位置からの距離でソート
  const wordsWithDistance = words.map(word => {
    const lineDiff = Math.abs(word.line - cursorLine);
    const colDiff = Math.abs(word.col - cursorCol);
    const distance = lineDiff * 1000 + colDiff; // 行の差を重視
    return { word, distance };
  });
  
  wordsWithDistance.sort((a, b) => a.distance - b.distance);
  
  // ヒントを割り当て
  return wordsWithDistance.map((item, index) => ({
    word: item.word,
    hint: hints[index] || "",
  }));
}