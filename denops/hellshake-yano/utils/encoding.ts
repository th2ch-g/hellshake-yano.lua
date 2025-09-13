/**
 * Encoding Utilities for UTF-8 Character and Byte Index Conversion
 *
 * This module provides utilities to convert between character indices and byte indices
 * for UTF-8 encoded text, specifically handling Japanese characters (3 bytes per character).
 */

/**
 * Convert character index to byte index in UTF-8 encoded text
 *
 * @param text - The UTF-8 encoded text
 * @param charIndex - Character position (0-based)
 * @returns Byte position (0-based)
 */
export function charIndexToByteIndex(text: string, charIndex: number): number {
  if (charIndex <= 0) return 0;
  if (charIndex >= text.length) return new TextEncoder().encode(text).length;

  // Extract substring from start to character index
  const substring = text.substring(0, charIndex);

  // Convert to UTF-8 bytes and return length
  return new TextEncoder().encode(substring).length;
}

/**
 * Convert byte index to character index in UTF-8 encoded text
 *
 * @param text - The UTF-8 encoded text
 * @param byteIndex - Byte position (0-based)
 * @returns Character position (0-based)
 */
export function byteIndexToCharIndex(text: string, byteIndex: number): number {
  if (byteIndex <= 0) return 0;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const fullBytes = encoder.encode(text);

  if (byteIndex >= fullBytes.length) return text.length;

  // Find character index by decoding byte slice
  try {
    const byteSlice = fullBytes.slice(0, byteIndex);
    const decodedText = decoder.decode(byteSlice, { stream: false });
    return decodedText.length;
  } catch (error) {
    // If decoding fails (e.g., byte index is in middle of multi-byte character),
    // find the previous valid character boundary
    for (let i = byteIndex - 1; i >= 0; i--) {
      try {
        const byteSlice = fullBytes.slice(0, i);
        const decodedText = decoder.decode(byteSlice, { stream: false });
        return decodedText.length;
      } catch {
        continue;
      }
    }
    return 0;
  }
}

/**
 * Get byte length of a character at given position
 *
 * @param text - The UTF-8 encoded text
 * @param charIndex - Character position (0-based)
 * @returns Number of bytes for the character at position
 */
export function getCharByteLength(text: string, charIndex: number): number {
  if (charIndex < 0 || charIndex >= text.length) return 0;

  const char = text[charIndex];
  return new TextEncoder().encode(char).length;
}

/**
 * Check if text contains multibyte characters (like Japanese)
 *
 * @param text - The text to check
 * @returns True if text contains multibyte characters
 */
export function hasMultibyteCharacters(text: string): boolean {
  return new TextEncoder().encode(text).length > text.length;
}

/**
 * Get detailed encoding information for debugging
 *
 * @param text - The text to analyze
 * @returns Object with encoding details
 */
export function getEncodingInfo(text: string): {
  charLength: number;
  byteLength: number;
  hasMultibyte: boolean;
  charToByteMap: Array<{ char: string; charIndex: number; byteStart: number; byteLength: number }>;
} {
  const encoder = new TextEncoder();
  const charToByteMap: Array<{ char: string; charIndex: number; byteStart: number; byteLength: number }> = [];

  let bytePosition = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charBytes = encoder.encode(char);

    charToByteMap.push({
      char,
      charIndex: i,
      byteStart: bytePosition,
      byteLength: charBytes.length
    });

    bytePosition += charBytes.length;
  }

  return {
    charLength: text.length,
    byteLength: encoder.encode(text).length,
    hasMultibyte: hasMultibyteCharacters(text),
    charToByteMap
  };
}

/**
 * Convert multiple character indices to byte indices efficiently
 *
 * @param text - The UTF-8 encoded text
 * @param charIndices - Array of character positions
 * @returns Array of corresponding byte positions
 */
export function charIndicesToByteIndices(text: string, charIndices: number[]): number[] {
  if (charIndices.length === 0) return [];

  const encoder = new TextEncoder();
  const result: number[] = [];

  // Sort indices to process efficiently
  const sortedIndices = charIndices
    .map((index, originalIndex) => ({ index, originalIndex }))
    .sort((a, b) => a.index - b.index);

  let currentCharIndex = 0;
  let currentByteIndex = 0;
  let processedCount = 0;

  for (let i = 0; i < text.length && processedCount < sortedIndices.length; i++) {
    const char = text[i];
    const charByteLength = encoder.encode(char).length;

    // Check if this character position matches any of our target indices
    while (processedCount < sortedIndices.length &&
           sortedIndices[processedCount].index === currentCharIndex) {
      result[sortedIndices[processedCount].originalIndex] = currentByteIndex;
      processedCount++;
    }

    currentCharIndex++;
    currentByteIndex += charByteLength;
  }

  // Handle indices at or beyond text length
  while (processedCount < sortedIndices.length) {
    result[sortedIndices[processedCount].originalIndex] = currentByteIndex;
    processedCount++;
  }

  return result;
}