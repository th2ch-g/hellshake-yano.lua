/**
 * UTF-8 Encoding Utilities for Word Detection
 *
 * This module provides efficient UTF-8 byte/character index conversion
 * and encoding information utilities with caching support.
 */

import { CacheType, GlobalCache } from "../cache.ts";

// Shared TextEncoder instance for performance
const sharedTextEncoder = new TextEncoder();

// Byte length cache using GlobalCache
const byteLengthCache = GlobalCache.getInstance().getCache<string, number>(CacheType.BYTE_LENGTH);

/**
 * Get UTF-8 byte length of text (cached, ASCII-optimized)
 */
export function getByteLength(text: string): number {
  if (text.length === 0) {
    return 0;
  }

  // Fast path for ASCII-only text
  let isAscii = true;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 0x7f) {
      isAscii = false;
      break;
    }
  }
  if (isAscii) {
    return text.length;
  }

  // Check cache
  const cached = byteLengthCache.get(text);
  if (cached !== undefined) {
    return cached;
  }

  // Calculate and cache byte length
  const length = sharedTextEncoder.encode(text).length;
  byteLengthCache.set(text, length);
  return length;
}

/**
 * Clear byte length cache
 */
export function clearByteLengthCache(): void {
  byteLengthCache.clear();
}

/**
 * Convert character index to UTF-8 byte index
 */
export function charIndexToByteIndex(text: string, charIndex: number): number {
  if (charIndex <= 0) return 0;
  if (text.length === 0) return 0;
  if (charIndex >= text.length) return new TextEncoder().encode(text).length;

  const substring = text.substring(0, charIndex);
  return new TextEncoder().encode(substring).length;
}

/**
 * Convert UTF-8 byte index to character index
 */
export function byteIndexToCharIndex(text: string, byteIndex: number): number {
  if (byteIndex <= 0) return 0;
  if (text.length === 0) return 0;

  const encoder = new TextEncoder();
  const fullBytes = encoder.encode(text);

  if (byteIndex >= fullBytes.length) return text.length;

  // Efficient approach: accumulate byte count per character
  let currentByteIndex = 0;
  for (let charIndex = 0; charIndex < text.length; charIndex++) {
    const char = text[charIndex];
    const charByteLength = encoder.encode(char).length;
    const nextByteIndex = currentByteIndex + charByteLength;

    if (byteIndex < nextByteIndex) {
      return charIndex;
    }

    currentByteIndex = nextByteIndex;
  }

  return text.length;
}

/**
 * Check if text contains multibyte characters (Japanese, etc.)
 */
export function hasMultibyteCharacters(text: string): boolean {
  return new TextEncoder().encode(text).length > text.length;
}

/**
 * Get detailed encoding information for debugging
 */
export function getEncodingInfo(text: string): {
  charLength: number;
  byteLength: number;
  hasMultibyte: boolean;
  charToByteMap: Array<{ char: string; charIndex: number; byteStart: number; byteLength: number }>;
} {
  const encoder = new TextEncoder();
  const charToByteMap: Array<
    { char: string; charIndex: number; byteStart: number; byteLength: number }
  > = [];

  let bytePosition = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charBytes = encoder.encode(char);

    charToByteMap.push({
      char,
      charIndex: i,
      byteStart: bytePosition,
      byteLength: charBytes.length,
    });

    bytePosition += charBytes.length;
  }

  const byteLength = encoder.encode(text).length;
  return {
    charLength: text.length,
    byteLength,
    hasMultibyte: byteLength > text.length,
    charToByteMap,
  };
}
