/**
 * Hint Utility Functions
 *
 * Helper functions for hint processing with display width support
 * Following PLAN.md process2 requirements
 */

import { getDisplayWidth } from "./utils/display.ts";
import type { Word } from "./types.ts";

/**
 * Convert character index to display column position
 * @param line - The line text
 * @param charIndex - Character index (0-based)
 * @param tabWidth - Tab width setting (default: 8)
 * @returns Display column position (1-based)
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
 * Get the display end column of a word
 * @param word - Word object
 * @param tabWidth - Tab width setting (default: 8)
 * @returns Display end column position (1-based)
 */
export function getWordDisplayEndCol(word: Word, tabWidth = 8): number {
  const textWidth = getDisplayWidth(word.text, tabWidth);
  return word.col + textWidth - 1;
}

/**
 * Check if two words are adjacent based on display width
 * @param word1 - First word
 * @param word2 - Second word
 * @param tabWidth - Tab width setting (default: 8)
 * @returns True if words are adjacent (gap <= 1 display positions)
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
 * Get the display start column of a word
 * @param word - Word object
 * @param tabWidth - Tab width setting (default: 8)
 * @returns Display start column position (1-based)
 */
export function getWordDisplayStartCol(word: Word, tabWidth = 8): number {
  return word.col;
}

/**
 * Calculate hint position with display width consideration
 * @param word - Word object
 * @param position - Position type ("start" | "end" | "overlay")
 * @param tabWidth - Tab width setting (default: 8)
 * @returns Display column position for hint placement
 */
export function calculateHintDisplayPosition(
  word: Word,
  position: "start" | "end" | "overlay",
  tabWidth = 8
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
 * Get byte length of a string (for UTF-8 compatibility)
 * @param text - Input text
 * @returns Byte length
 */
export function getByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/**
 * Check if a position is within a word's display range
 * @param position - Column position to check (1-based)
 * @param word - Word object
 * @param tabWidth - Tab width setting (default: 8)
 * @returns True if position is within word's display range
 */
export function isPositionWithinWord(position: number, word: Word, tabWidth = 8): boolean {
  const startCol = getWordDisplayStartCol(word, tabWidth);
  const endCol = getWordDisplayEndCol(word, tabWidth);
  return position >= startCol && position <= endCol;
}

/**
 * Calculate the gap between two words in display positions
 * @param word1 - First word
 * @param word2 - Second word
 * @param tabWidth - Tab width setting (default: 8)
 * @returns Gap in display positions (negative if overlapping)
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