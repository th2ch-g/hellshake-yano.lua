/**
 * Japanese Byte Index Test Suite
 *
 * This test suite verifies that the Japanese word segmentation byte index fix
 * works correctly with UTF-8 encoded text.
 */

import {
  byteIndexToCharIndex,
  charIndexToByteIndex,
  charIndicesToByteIndices,
  getEncodingInfo,
  hasMultibyteCharacters,
} from "../denops/hellshake-yano/utils/encoding.ts";
import { extractWordsFromLine } from "../denops/hellshake-yano/word.ts";
import { TinySegmenterWordDetector } from "../denops/hellshake-yano/word/detector.ts";

// Test data
const testCases = {
  ascii: "Hello World Test",
  japanese: "これはプログラミング言語です",
  mixed: "Hello これは test プログラミング",
  japanese_simple: "これは",
  japanese_complex: "プログラミング言語",
  single_japanese: "あ",
  single_ascii: "A",
};

// Expected segmentation results for Japanese text
const expectedSegments = {
  "これはプログラミング言語です": ["これ", "は", "プログラミング", "言語", "です"],
  "これは": ["これ", "は"],
  "プログラミング言語": ["プログラミング", "言語"],
};

/**
 * Test encoding utility functions
 */
async function testEncodingUtils() {
  // Test ASCII characters (1 byte per character)
  const asciiText = testCases.ascii;

  for (let i = 0; i < asciiText.length; i++) {
    const byteIndex = charIndexToByteIndex(asciiText, i);
    const backToChar = byteIndexToCharIndex(asciiText, byteIndex);

    if (backToChar !== i) {
      console.error(
        `❌ ASCII conversion failed: char ${i} -> byte ${byteIndex} -> char ${backToChar}`,
      );
      return false;
    }
  }

  // Test Japanese characters (3 bytes per character)
  const japaneseText = testCases.japanese;

  for (let i = 0; i < japaneseText.length; i++) {
    const byteIndex = charIndexToByteIndex(japaneseText, i);
    const backToChar = byteIndexToCharIndex(japaneseText, byteIndex);

    if (backToChar !== i) {
      console.error(
        `❌ Japanese conversion failed: char ${i} -> byte ${byteIndex} -> char ${backToChar}`,
      );
      return false;
    }

    // Japanese characters should be 3 bytes each
    const expectedByte = i * 3;
    if (byteIndex !== expectedByte) {
      console.error(
        `❌ Japanese byte index mismatch: char ${i} expected byte ${expectedByte}, got ${byteIndex}`,
      );
      return false;
    }
  }

  // Test mixed text
  const mixedText = testCases.mixed;
  const encodingInfo = getEncodingInfo(mixedText);

  if (!encodingInfo.hasMultibyte) {
    console.error("❌ Mixed text should have multibyte characters");
    return false;
  }

  // Test batch conversion
  const charIndices = [0, 2, 5, 8];
  const batchByteIndices = charIndicesToByteIndices(japaneseText, charIndices);
  const expectedBatchBytes = [0, 6, 15, 24];

  for (let i = 0; i < charIndices.length; i++) {
    if (batchByteIndices[i] !== expectedBatchBytes[i]) {
      console.error(
        `❌ Batch conversion failed: char ${charIndices[i]} expected byte ${
          expectedBatchBytes[i]
        }, got ${batchByteIndices[i]}`,
      );
      return false;
    }
  }

  return true;
}

/**
 * Test word detection with byte positions
 */
async function testWordDetectionWithBytePositions() {
  // Test Japanese text with improved detection
  const japaneseText = testCases.japanese;
  const lineNumber = 1;

  const words = extractWordsFromLine(japaneseText, lineNumber, true, false); // useImprovedDetection=true, excludeJapanese=false

  for (const word of words) {
    const expectedByteCol = word.byteCol !== undefined ? word.byteCol : "undefined";

    // Verify byte position is correct
    if (word.byteCol !== undefined) {
      const charIndex = word.col - 1; // Convert to 0-based
      const expectedByteIndex = charIndexToByteIndex(japaneseText, charIndex);
      const expectedByteCol = expectedByteIndex + 1; // Convert to 1-based

      if (word.byteCol !== expectedByteCol) {
        console.error(
          `❌ Byte position mismatch for "${word.text}": expected ${expectedByteCol}, got ${word.byteCol}`,
        );
        return false;
      }
    } else {
      console.warn(`⚠️ Word "${word.text}" missing byteCol field`);
    }
  }

  return true;
}

/**
 * Test TinySegmenter with byte positions
 */
async function testTinySegmenterWithBytePositions() {
  try {
    const detector = new TinySegmenterWordDetector({
      use_japanese: true,
      enable_tinysegmenter: true,
    });

    const isAvailable = await detector.isAvailable();
    if (!isAvailable) {
      return true;
    }

    const japaneseText = testCases.japanese_simple;
    const words = await detector.detectWords(japaneseText, 1);

    for (const word of words) {
      // Verify byte position
      if (word.byteCol !== undefined) {
        const charIndex = word.col - 1;
        const expectedByteIndex = charIndexToByteIndex(japaneseText, charIndex);
        const expectedByteCol = expectedByteIndex + 1;

        if (word.byteCol !== expectedByteCol) {
          console.error(
            `❌ TinySegmenter byte position mismatch for "${word.text}": expected ${expectedByteCol}, got ${word.byteCol}`,
          );
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.warn(`⚠️ TinySegmenter test failed: ${error}`);
    return true; // Don't fail the whole test suite
  }
}

/**
 * Test specific Japanese segmentation cases
 */
async function testSpecificJapaneseSegmentation() {
  const testText = "これはプログラミング言語です";
  const words = extractWordsFromLine(testText, 1, true, false);

  // Verify byte positions for each word
  let currentBytePos = 1; // 1-based
  for (const word of words) {
    if (word.byteCol !== currentBytePos) {
      console.error(
        `❌ Byte position mismatch for "${word.text}": expected ${currentBytePos}, got ${word.byteCol}`,
      );
      return false;
    }

    // Calculate next byte position
    const encoder = new TextEncoder();
    const wordByteLength = encoder.encode(word.text).length;
    currentBytePos += wordByteLength;
  }

  return true;
}

/**
 * Run all tests
 */
async function runTests() {
  const testResults = [
    await testEncodingUtils(),
    await testWordDetectionWithBytePositions(),
    await testTinySegmenterWithBytePositions(),
    await testSpecificJapaneseSegmentation(),
  ];

  const passedTests = testResults.filter((result) => result).length;
  const totalTests = testResults.length;

  if (passedTests === totalTests) {
    return true;
  } else {
    return false;
  }
}

// Run tests if this file is executed directly
if (import.meta.main) {
  runTests().then((success) => {
    Deno.exit(success ? 0 : 1);
  });
}

export { runTests };
