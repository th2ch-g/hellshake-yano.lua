/**
 * Display Width Calculation Utilities for Hint Positioning
 *
 * This module provides comprehensive display width calculation functions
 * that handle:
 * - CJK characters (Chinese, Japanese, Korean)
 * - Emojis and emoji sequences
 * - TAB characters
 * - Grapheme clusters
 * - Mathematical symbols
 */

import type { Word } from "../types.ts";
import { CacheType, GlobalCache } from "../cache.ts";

/** Character width cache */
const CHAR_WIDTH_CACHE = GlobalCache.getInstance().getCache<number, number>(CacheType.CHAR_WIDTH);

/** CJK character ranges */
const CJK_RANGES = [[0x3000, 0x303F], [0x3040, 0x309F], [0x30A0, 0x30FF], [0x4E00, 0x9FFF], [0xFF00, 0xFFEF]] as const;

/** Emoji ranges */
const EMOJI_RANGES = [[0x1F600, 0x1F64F], [0x1F300, 0x1F5FF], [0x1F680, 0x1F6FF], [0x1F1E6, 0x1F1FF]] as const;

/**
 * Initialize ASCII character width cache
 */
function initializeASCIICache(): void {
  for (let i = 0x20; i <= 0x7E; i++) {
    if (CHAR_WIDTH_CACHE.get(i) === undefined) {
      CHAR_WIDTH_CACHE.set(i, 1);
    }
  }
}
initializeASCIICache();

/**
 * Check if code point is a Latin mathematical symbol
 */
function isLatinMathSymbol(codePoint: number): boolean {
  return (codePoint >= 0x00B0 && codePoint <= 0x00B1) || (codePoint >= 0x00B7 && codePoint <= 0x00B7) ||
         (codePoint >= 0x00D7 && codePoint <= 0x00D7) || (codePoint >= 0x00F7 && codePoint <= 0x00F7) ||
         (codePoint >= 0x2190 && codePoint <= 0x21FF) || (codePoint >= 0x2200 && codePoint <= 0x22FF) ||
         (codePoint >= 0x2300 && codePoint <= 0x23FF) || (codePoint >= 0x25A0 && codePoint <= 0x25FF) ||
         (codePoint >= 0x2600 && codePoint <= 0x26FF) || (codePoint >= 0x2700 && codePoint <= 0x27BF);
}

/**
 * Check if code point is in CJK range
 */
function isInCJKRange(codePoint: number): boolean {
  for (const [start, end] of CJK_RANGES) {
    if (codePoint >= start && codePoint <= end) return true;
  }
  return false;
}

/**
 * Check if code point is in emoji range
 */
function isInEmojiRange(codePoint: number): boolean {
  for (const [start, end] of EMOJI_RANGES) {
    if (codePoint >= start && codePoint <= end) return true;
  }
  return false;
}

/**
 * Check if code point is in extended wide character range
 */
function isInExtendedWideRange(codePoint: number): boolean {
  return isLatinMathSymbol(codePoint) || (codePoint >= 0x2460 && codePoint <= 0x24FF) ||
         (codePoint >= 0x2E80 && codePoint <= 0x2EFF) || (codePoint >= 0x2F00 && codePoint <= 0x2FDF) ||
         (codePoint >= 0x2FF0 && codePoint <= 0x2FFF) || (codePoint >= 0x3400 && codePoint <= 0x4DBF) ||
         (codePoint >= 0x20000 && codePoint <= 0x2A6DF) || (codePoint >= 0x2A700 && codePoint <= 0x2B73F) ||
         (codePoint >= 0x2B740 && codePoint <= 0x2B81F) || (codePoint >= 0x2B820 && codePoint <= 0x2CEAF) ||
         (codePoint >= 0x2CEB0 && codePoint <= 0x2EBEF) || (codePoint >= 0xF900 && codePoint <= 0xFAFF) ||
         (codePoint >= 0xFE30 && codePoint <= 0xFE4F);
}

/**
 * Calculate character display width
 */
function calculateCharWidth(codePoint: number, tabWidth: number): number {
  if (codePoint === 0x09) return tabWidth;
  if (codePoint >= 0x20 && codePoint <= 0x7E) return 1;
  if (codePoint < 0x20 || (codePoint >= 0x7F && codePoint < 0xA0)) return 0;
  if (isLatinMathSymbol(codePoint)) return 2;
  if (codePoint < 0x100) return 1;
  if (isInCJKRange(codePoint) || isInEmojiRange(codePoint)) return 2;
  if (isInExtendedWideRange(codePoint)) return 2;
  return 1;
}

/**
 * Get character display width with caching
 */
export function getCharDisplayWidth(char: string, tabWidth = 8): number {
  if (!char || char.length === 0) return 0;
  const codePoint = char.codePointAt(0);
  if (codePoint === undefined) return 0;
  if (tabWidth === 8) {
    const cached = CHAR_WIDTH_CACHE.get(codePoint);
    if (cached !== undefined) return cached;
  }
  const width = calculateCharWidth(codePoint, tabWidth);
  if (tabWidth === 8 && width !== tabWidth) {
    CHAR_WIDTH_CACHE.set(codePoint, width);
  }
  return width;
}

/**
 * Check if text is an emoji sequence
 */
function isEmojiSequence(text: string): boolean {
  return /[\u{1F1E6}-\u{1F1FF}]{2}/u.test(text) || /[\u{1F600}-\u{1F64F}]/u.test(text) ||
         /[\u{1F300}-\u{1F5FF}]/u.test(text) || /[\u{1F680}-\u{1F6FF}]/u.test(text) ||
         /[\u{1F900}-\u{1F9FF}]/u.test(text);
}

/**
 * Get display width fallback (without grapheme cluster support)
 */
function getDisplayWidthFallback(text: string, tabWidth = 8): number {
  let totalWidth = 0;
  for (let i = 0; i < text.length;) {
    const codePoint = text.codePointAt(i);
    if (codePoint === undefined) {
      i++;
      continue;
    }
    const char = String.fromCodePoint(codePoint);
    totalWidth += getCharDisplayWidth(char, tabWidth);
    i += codePoint > 0xFFFF ? 2 : 1;
  }
  return totalWidth;
}

/**
 * Get text display width with grapheme cluster support
 */
export function getDisplayWidth(text: string, tabWidth = 8): number {
  if (text == null || text.length === 0) return 0;
  let totalWidth = 0;
  try {
    let segmenter: Intl.Segmenter;
    try {
      segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    } catch (e) {
      return getDisplayWidthFallback(text, tabWidth);
    }
    for (const segment of segmenter.segment(text)) {
      const cluster = segment.segment;
      if (cluster.length === 1) {
        totalWidth += getCharDisplayWidth(cluster, tabWidth);
      } else {
        const hasZWJ = cluster.includes('\u200D');
        const hasEmojiModifier = /[\u{1F3FB}-\u{1F3FF}]/u.test(cluster);
        const hasVariationSelector = /[\uFE0E\uFE0F]/u.test(cluster);
        if (hasZWJ || hasEmojiModifier || hasVariationSelector || isEmojiSequence(cluster)) {
          totalWidth += 2;
        } else {
          for (let i = 0; i < cluster.length;) {
            const codePoint = cluster.codePointAt(i);
            if (codePoint === undefined) {
              i++;
              continue;
            }
            const char = String.fromCodePoint(codePoint);
            totalWidth += getCharDisplayWidth(char, tabWidth);
            i += codePoint > 0xFFFF ? 2 : 1;
          }
        }
      }
    }
  } catch (error) {
    return getDisplayWidthFallback(text, tabWidth);
  }
  return totalWidth;
}

/**
 * Convert character index to display column position
 */
export function convertToDisplayColumn(line: string, charIndex: number, tabWidth = 8): number {
  if (charIndex <= 0) {
    return 1;
  }
  const substring = line.slice(0, charIndex);
  return getDisplayWidth(substring, tabWidth);
}

/**
 * Get word's display end column position
 */
export function getWordDisplayEndCol(word: Word, tabWidth = 8): number {
  const textWidth = getDisplayWidth(word.text, tabWidth);
  return word.col + textWidth - 1;
}

/**
 * Get word's display start column position
 */
export function getWordDisplayStartCol(word: Word, tabWidth = 8): number {
  return word.col;
}

/**
 * Check if two words are adjacent in display width
 */
export function areWordsAdjacent(word1: Word, word2: Word, tabWidth = 8): boolean {
  if (word1.line !== word2.line) {
    return false;
  }

  const word1EndCol = getWordDisplayEndCol(word1, tabWidth);
  const word2EndCol = getWordDisplayEndCol(word2, tabWidth);

  let distance: number;
  if (word1.col < word2.col) {
    distance = word2.col - word1EndCol - 1;
  } else {
    distance = word1.col - word2EndCol - 1;
  }

  return distance <= 0;
}

/**
 * Check if position is within word bounds
 */
export function isPositionWithinWord(position: number, word: Word, tabWidth = 8): boolean {
  const startCol = getWordDisplayStartCol(word, tabWidth);
  const endCol = getWordDisplayEndCol(word, tabWidth);
  return position >= startCol && position <= endCol;
}

/**
 * Calculate gap between two words
 */
export function calculateWordGap(word1: Word, word2: Word, tabWidth = 8): number {
  if (word1.line !== word2.line) {
    return Infinity;
  }

  const word1EndCol = getWordDisplayEndCol(word1, tabWidth);
  const word2StartCol = getWordDisplayStartCol(word2, tabWidth);

  if (word1.col < word2.col) {
    return word2StartCol - word1EndCol - 1;
  } else {
    const word2EndCol = getWordDisplayEndCol(word2, tabWidth);
    return word1.col - word2EndCol - 1;
  }
}
