/**
 * Display Width Calculation Utilities
 *
 * Provides high-performance functions to calculate the display width of text considering:
 * - ASCII characters (width 1)
 * - Tab characters (configurable width, default 8)
 * - Japanese/fullwidth characters (width 2)
 * - Emoji and special characters (width 2)
 * - Unicode ZWJ sequences and grapheme clusters
 * - Optimized caching for performance
 *
 * This module follows the PLAN.md process1 implementation for accurate display width
 * calculation to fix adjacent hint detection issues in hellshake-yano.vim.
 *
 * @module display
 * @version 1.0.0
 */

import { LRUCache } from "./cache.ts";
import type { Denops } from "https://deno.land/x/denops_std@v5.0.1/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v5.0.1/function/mod.ts";

// Character width lookup table for common characters (performance optimization)
const CHAR_WIDTH_CACHE = new Map<number, number>();

// Pre-populate cache with common ASCII characters
for (let i = 0x20; i <= 0x7E; i++) {
  CHAR_WIDTH_CACHE.set(i, 1);
}

// Common CJK characters cache
const CJK_RANGES = [
  [0x3000, 0x303F], // CJK Symbols and Punctuation
  [0x3040, 0x309F], // Hiragana
  [0x30A0, 0x30FF], // Katakana
  [0x4E00, 0x9FFF], // CJK Unified Ideographs
  [0xFF00, 0xFFEF], // Halfwidth and Fullwidth Forms
] as const;

// Common emoji ranges for quick lookup
const EMOJI_RANGES = [
  [0x1F600, 0x1F64F], // Emoticons
  [0x1F300, 0x1F5FF], // Miscellaneous Symbols and Pictographs
  [0x1F680, 0x1F6FF], // Transport and Map Symbols
  [0x1F1E6, 0x1F1FF], // Regional Indicator Symbols
] as const;

/**
 * Calculate display width of a single character with optimized performance
 *
 * @param char - Single character or string (uses first character if multiple)
 * @param tabWidth - Width of tab character (default: 8)
 * @returns Display width of the character
 *
 * @example
 * ```typescript
 * getCharDisplayWidth('a')     // returns 1
 * getCharDisplayWidth('\t')    // returns 8 (default)
 * getCharDisplayWidth('\t', 4) // returns 4 (custom tab width)
 * getCharDisplayWidth('あ')    // returns 2 (Japanese)
 * getCharDisplayWidth('😀')    // returns 2 (emoji)
 * ```
 */
export function getCharDisplayWidth(char: string, tabWidth = 8): number {
  // Handle null/undefined/empty
  if (!char || char.length === 0) {
    return 0;
  }

  // Get the first code point (handles surrogate pairs correctly)
  const codePoint = char.codePointAt(0);

  if (codePoint === undefined) {
    return 0;
  }

  // Check cache first for performance
  if (tabWidth === 8) { // Only cache default tab width
    const cached = CHAR_WIDTH_CACHE.get(codePoint);
    if (cached !== undefined) {
      return cached;
    }
  }

  const width = calculateCharWidth(codePoint, tabWidth);

  // Cache the result for future lookups (only for default tab width)
  if (tabWidth === 8 && width !== tabWidth) { // Don't cache tab characters
    CHAR_WIDTH_CACHE.set(codePoint, width);
  }

  return width;
}

/**
 * Internal function to calculate character width without caching
 */
function calculateCharWidth(codePoint: number, tabWidth: number): number {
  // Tab character
  if (codePoint === 0x09) {
    return tabWidth;
  }

  // ASCII printable characters (0x20-0x7E) - fast path
  if (codePoint >= 0x20 && codePoint <= 0x7E) {
    return 1;
  }

  // Control characters
  if (codePoint < 0x20 || (codePoint >= 0x7F && codePoint < 0xA0)) {
    return 0;
  }

  // Check for Latin-1 Supplement math symbols first
  if (isLatinMathSymbol(codePoint)) {
    return 2;
  }

  // Simple ASCII range (excluding math symbols already checked)
  if (codePoint < 0x100) {
    return 1;
  }

  // Fast lookup for common ranges
  // CJK ranges (optimized)
  if (isInCJKRange(codePoint) || isInEmojiRange(codePoint)) {
    return 2;
  }

  // Extended ranges for completeness
  if (isInExtendedWideRange(codePoint)) {
    return 2;
  }

  // Default to width 1 for other characters
  return 1;
}

/**
 * Fast CJK range checker using optimized ranges
 */
function isInCJKRange(codePoint: number): boolean {
  for (const [start, end] of CJK_RANGES) {
    if (codePoint >= start && codePoint <= end) {
      return true;
    }
  }

  // Additional CJK ranges
  return (
    (codePoint >= 0x1100 && codePoint <= 0x115F) || // Hangul Jamo
    (codePoint >= 0x2E80 && codePoint <= 0x2EFF) || // CJK Radicals Supplement
    (codePoint >= 0x2F00 && codePoint <= 0x2FDF) || // Kangxi Radicals
    (codePoint >= 0x3100 && codePoint <= 0x312F) || // Bopomofo
    (codePoint >= 0x3130 && codePoint <= 0x318F) || // Hangul Compatibility Jamo
    (codePoint >= 0x3200 && codePoint <= 0x33FF) || // Enclosed CJK Letters and Months + CJK Compatibility
    (codePoint >= 0x3400 && codePoint <= 0x4DBF) || // CJK Extension A
    (codePoint >= 0xAC00 && codePoint <= 0xD7AF) || // Hangul Syllables
    (codePoint >= 0xF900 && codePoint <= 0xFAFF)    // CJK Compatibility Ideographs
  );
}

/**
 * Fast emoji range checker
 */
function isInEmojiRange(codePoint: number): boolean {
  for (const [start, end] of EMOJI_RANGES) {
    if (codePoint >= start && codePoint <= end) {
      return true;
    }
  }

  return (
    (codePoint >= 0x1F000 && codePoint <= 0x1F0FF) || // Mahjong/Domino/Playing Cards
    (codePoint >= 0x1F100 && codePoint <= 0x1F2FF) || // Enclosed Alphanumeric/Ideographic Supplement
    (codePoint >= 0x1F700 && codePoint <= 0x1F9FF) || // Extended emoji ranges
    (codePoint >= 0x1FA00 && codePoint <= 0x1FAFF)    // Chess Symbols + Extended Pictographs
  );
}

/**
 * Extended wide character ranges (arrows, symbols, etc.)
 */
function isInExtendedWideRange(codePoint: number): boolean {
  return (
    // Latin-1 Supplement math symbols (× ÷ etc.)
    isLatinMathSymbol(codePoint) ||
    (codePoint >= 0x2190 && codePoint <= 0x21FF) || // Arrows
    (codePoint >= 0x2460 && codePoint <= 0x24FF) || // Enclosed Alphanumerics (④ etc.)
    (codePoint >= 0x2500 && codePoint <= 0x25FF) || // Box Drawing (□ etc.)
    (codePoint >= 0x2600 && codePoint <= 0x26FF) || // Miscellaneous Symbols
    (codePoint >= 0x2700 && codePoint <= 0x27BF) || // Dingbats
    (codePoint >= 0xFE10 && codePoint <= 0xFE1F) || // Vertical Forms
    (codePoint >= 0xFE30 && codePoint <= 0xFE6F)    // CJK Compatibility Forms + Small Form Variants
  );
}

/**
 * Check if character is a Latin-1 Supplement math symbol that should be width 2
 */
function isLatinMathSymbol(codePoint: number): boolean {
  return (
    codePoint === 0x00D7 || // × (multiplication sign)
    codePoint === 0x00F7    // ÷ (division sign)
  );
}

/**
 * Calculate display width of a text string with optimal performance
 *
 * Handles complex Unicode scenarios including:
 * - ZWJ (Zero Width Joiner) sequences (emoji combinations)
 * - Grapheme clusters (combining characters)
 * - Surrogate pairs (high Unicode code points)
 * - Tab characters with configurable width
 * - CJK and emoji characters
 *
 * @param text - Text to calculate width for
 * @param tabWidth - Width of tab character (default: 8)
 * @returns Total display width of the text
 *
 * @example
 * ```typescript
 * getDisplayWidth("hello")           // returns 5
 * getDisplayWidth("hello\tworld")    // returns 18 (5+8+5)
 * getDisplayWidth("こんにちは")       // returns 10 (2×5)
 * getDisplayWidth("👨‍👩‍👧‍👦")       // returns 2 (ZWJ sequence)
 * getDisplayWidth("🇯🇵")              // returns 2 (flag)
 * ```
 */
export function getDisplayWidth(text: string, tabWidth = 8): number {
  // Handle null/undefined
  if (text == null) {
    return 0;
  }

  // Handle empty string
  if (text.length === 0) {
    return 0;
  }

  let totalWidth = 0;

  // Handle potential invalid UTF-8 gracefully
  try {
    // Use Intl.Segmenter for proper grapheme cluster handling (emoji ZWJ sequences)
    let segmenter: Intl.Segmenter;
    try {
      segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    } catch (e) {
      // Fallback to simpler iteration if Intl.Segmenter is not available
      return getDisplayWidthFallback(text, tabWidth);
    }

    for (const segment of segmenter.segment(text)) {
      const cluster = segment.segment;

      // For grapheme clusters (like ZWJ sequences), treat as single unit
      if (cluster.length === 1) {
        totalWidth += getCharDisplayWidth(cluster, tabWidth);
      } else {
        // Multi-character cluster (emoji ZWJ sequence, combining chars, etc.)
        // Check if it's a ZWJ sequence or other emoji cluster
        const hasZWJ = cluster.includes('\u200D'); // Zero Width Joiner
        const hasEmojiModifier = /[\u{1F3FB}-\u{1F3FF}]/u.test(cluster); // Skin tone modifiers
        const hasVariationSelector = /[\uFE0E\uFE0F]/u.test(cluster); // Variation selectors

        if (hasZWJ || hasEmojiModifier || hasVariationSelector || isEmojiSequence(cluster)) {
          // Treat the entire sequence as width 2 (single emoji display)
          totalWidth += 2;
        } else {
          // For other clusters, sum individual character widths
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
    // Fallback for any errors: use simple implementation
    return getDisplayWidthFallback(text, tabWidth);
  }

  return totalWidth;
}

/**
 * Fallback implementation without Intl.Segmenter
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

    // Move to next code point (might be 2 chars for surrogate pairs)
    i += codePoint > 0xFFFF ? 2 : 1;
  }

  return totalWidth;
}

/**
 * Check if a string contains emoji sequences
 */
function isEmojiSequence(text: string): boolean {
  // Check for common emoji patterns
  return /[\u{1F1E6}-\u{1F1FF}]{2}/u.test(text) || // Regional indicators (flags)
         /[\u{1F600}-\u{1F64F}]/u.test(text) ||    // Emoticons
         /[\u{1F300}-\u{1F5FF}]/u.test(text) ||    // Misc symbols
         /[\u{1F680}-\u{1F6FF}]/u.test(text) ||    // Transport symbols
         /[\u{1F900}-\u{1F9FF}]/u.test(text);      // Supplemental symbols
}

/**
 * Create a cache for display width calculations
 *
 * @param maxSize - Maximum number of entries in cache (default: 1000)
 * @returns LRUCache instance for caching display width calculations
 */
export function createDisplayWidthCache(maxSize = 1000): LRUCache<string, number> {
  return new LRUCache<string, number>(maxSize);
}

/**
 * Get display width using Vim's strdisplaywidth() function
 * Falls back to TypeScript implementation if Vim is not available
 *
 * @param denops - Denops instance for Vim integration
 * @param text - Text to calculate width for
 * @returns Promise resolving to display width
 *
 * @example
 * ```typescript
 * const width = await getVimDisplayWidth(denops, "hello\tworld");
 * console.log(width); // Uses Vim's native calculation or fallback
 * ```
 */
export async function getVimDisplayWidth(denops: Denops, text: string): Promise<number> {
  try {
    // Try to use Vim's native function
    const width = await fn.strdisplaywidth(denops, text);
    return typeof width === "number" ? width : 0;
  } catch (error) {
    // Fallback to TypeScript implementation
    return getDisplayWidth(text);
  }
}

// Global string cache for commonly calculated strings
const globalDisplayWidthCache = createDisplayWidthCache(2000);

/**
 * Cached version of getDisplayWidth for improved performance
 * Use this for repeated calculations of the same strings
 *
 * @param text - Text to calculate width for
 * @param tabWidth - Width of tab character (default: 8)
 * @returns Total display width of the text (cached result if available)
 *
 * @example
 * ```typescript
 * // First call calculates and caches
 * const width1 = getDisplayWidthCached("hello\tworld");
 * // Second call returns cached result (much faster)
 * const width2 = getDisplayWidthCached("hello\tworld");
 * ```
 */
export function getDisplayWidthCached(text: string, tabWidth = 8): number {
  if (text == null || text.length === 0) {
    return 0;
  }

  const cacheKey = `${text}_${tabWidth}`;
  const cached = globalDisplayWidthCache.get(cacheKey);

  if (cached !== undefined) {
    return cached;
  }

  const width = getDisplayWidth(text, tabWidth);
  globalDisplayWidthCache.set(cacheKey, width);

  return width;
}

/**
 * Clear the global display width cache
 * Useful for memory management or when cache becomes stale
 *
 * @example
 * ```typescript
 * clearDisplayWidthCache();
 * ```
 */
export function clearDisplayWidthCache(): void {
  globalDisplayWidthCache.clear();
  CHAR_WIDTH_CACHE.clear();

  // Re-populate ASCII cache
  for (let i = 0x20; i <= 0x7E; i++) {
    CHAR_WIDTH_CACHE.set(i, 1);
  }
}

/**
 * Get cache statistics for performance monitoring
 *
 * @returns Object containing cache hit/miss statistics
 *
 * @example
 * ```typescript
 * const stats = getDisplayWidthCacheStats();
 * console.log(`Hit rate: ${stats.hitRate * 100}%`);
 * ```
 */
export function getDisplayWidthCacheStats() {
  return {
    stringCache: globalDisplayWidthCache.getStats(),
    charCacheSize: CHAR_WIDTH_CACHE.size,
  };
}

/**
 * Utility function to check if text contains any wide characters
 * Useful for quick screening before expensive width calculations
 *
 * @param text - Text to check
 * @returns true if text contains any characters with width > 1
 *
 * @example
 * ```typescript
 * hasWideCharacters("hello")     // false
 * hasWideCharacters("こんにちは") // true
 * hasWideCharacters("hello😀")   // true
 * ```
 */
export function hasWideCharacters(text: string): boolean {
  if (!text || text.length === 0) {
    return false;
  }

  for (let i = 0; i < text.length;) {
    const codePoint = text.codePointAt(i);
    if (codePoint === undefined) {
      i++;
      continue;
    }

    if (codePoint >= 0x1100 && (
      isInCJKRange(codePoint) ||
      isInEmojiRange(codePoint) ||
      isInExtendedWideRange(codePoint)
    )) {
      return true;
    }

    i += codePoint > 0xFFFF ? 2 : 1;
  }

  return false;
}