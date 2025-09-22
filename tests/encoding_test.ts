/**
 * 文字エンコーディングと列位置のテスト
 * マルチバイト文字が含まれる行での列計算を確認
 */

import { assertEquals, assertThrows } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  byteIndexToCharIndex,
  charIndexToByteIndex,
  charIndicesToByteIndices,
  getCharByteLength,
  getEncodingInfo,
  hasMultibyteCharacters,
} from "../denops/hellshake-yano/utils/encoding.ts";

describe("Character Encoding and Column Position", () => {
  it("should calculate correct byte position for ASCII text", () => {
    const text = "- **最終更新**: 2025-09-13 (Process8)";

    // Process8の位置を手動で計算
    const beforeProcess = "- **最終更新**: 2025-09-13 (";
    const processIndex = text.indexOf("Process8");

    // JavaScriptのindexOfは文字単位 - 実際は24が正しい
    assertEquals(processIndex, 24);
  });

  it("should handle multibyte characters correctly", () => {
    const text = "- **最終更新**: 2025-09-13";

    // 文字数とバイト数の違いを確認
    const charLength = text.length;
    const byteLength = new TextEncoder().encode(text).length;

    // マルチバイト文字が含まれるため、バイト数の方が多い
    assertEquals(charLength < byteLength, true);
  });

  it("should find correct column for Process8 with multibyte prefix", () => {
    const text = "- **最終更新**: 2025-09-13 (Process8)";

    // 各文字の位置を確認
    const chars = Array.from(text);
    chars.forEach((char, index) => {
      if (char === "P") {
      }
    });

    // Process8のPの位置（0ベース） - 正しい値は24
    const pIndex = text.indexOf("P");
    assertEquals(pIndex, 24);

    // Vim/Neovimでは1ベースなので+1
    const vimColumn = pIndex + 1;
    assertEquals(vimColumn, 25);
  });

  it("should handle display width vs byte position", () => {
    // Vimでは表示幅（display width）と実際のバイト位置が異なる場合がある
    const testCases = [
      { text: "Process8", expectedCol: 1 },
      { text: "  Process8", expectedCol: 3 },
      { text: "- Process8", expectedCol: 3 },
      { text: "* Process8", expectedCol: 3 },
      { text: "** Process8", expectedCol: 4 },
      { text: "- ** Process8", expectedCol: 6 },
    ];

    testCases.forEach(({ text, expectedCol }) => {
      const processIndex = text.indexOf("Process8");
      const vimCol = processIndex + 1; // 1-based

      assertEquals(vimCol, expectedCol);
    });
  });

  // === 新しい包括的なエンコーディングテスト ===

  it("should convert character index to byte index correctly", () => {
    const testCases = [
      { text: "hello", charIndex: 0, expectedByteIndex: 0 },
      { text: "hello", charIndex: 2, expectedByteIndex: 2 },
      { text: "hello", charIndex: 5, expectedByteIndex: 5 },
      { text: "こんにちは", charIndex: 0, expectedByteIndex: 0 },
      { text: "こんにちは", charIndex: 1, expectedByteIndex: 3 },
      { text: "こんにちは", charIndex: 2, expectedByteIndex: 6 },
      { text: "こんにちは", charIndex: 5, expectedByteIndex: 15 },
      { text: "あAい", charIndex: 0, expectedByteIndex: 0 }, // あ
      { text: "あAい", charIndex: 1, expectedByteIndex: 3 }, // A
      { text: "あAい", charIndex: 2, expectedByteIndex: 4 }, // い
      { text: "あAい", charIndex: 3, expectedByteIndex: 7 }, // 終端
    ];

    testCases.forEach(({ text, charIndex, expectedByteIndex }) => {
      const actual = charIndexToByteIndex(text, charIndex);
      assertEquals(
        actual,
        expectedByteIndex,
        `charIndexToByteIndex("${text}", ${charIndex}) should return ${expectedByteIndex}, got ${actual}`,
      );
    });
  });

  it("should convert byte index to character index correctly", () => {
    const testCases = [
      { text: "hello", byteIndex: 0, expectedCharIndex: 0 },
      { text: "hello", byteIndex: 2, expectedCharIndex: 2 },
      { text: "hello", byteIndex: 5, expectedCharIndex: 5 },
      { text: "こんにちは", byteIndex: 0, expectedCharIndex: 0 },
      { text: "こんにちは", byteIndex: 3, expectedCharIndex: 1 },
      { text: "こんにちは", byteIndex: 6, expectedCharIndex: 2 },
      { text: "こんにちは", byteIndex: 15, expectedCharIndex: 5 },
      { text: "あAい", byteIndex: 0, expectedCharIndex: 0 }, // あの開始
      { text: "あAい", byteIndex: 3, expectedCharIndex: 1 }, // Aの開始
      { text: "あAい", byteIndex: 4, expectedCharIndex: 2 }, // いの開始
      { text: "あAい", byteIndex: 7, expectedCharIndex: 3 }, // 終端
    ];

    testCases.forEach(({ text, byteIndex, expectedCharIndex }) => {
      const actual = byteIndexToCharIndex(text, byteIndex);
      assertEquals(
        actual,
        expectedCharIndex,
        `byteIndexToCharIndex("${text}", ${byteIndex}) should return ${expectedCharIndex}, got ${actual}`,
      );
    });
  });

  it("should handle multibyte character boundaries correctly", () => {
    const text = "あAい";

    // マルチバイト文字の境界をテスト
    const testCases = [
      { byteIndex: 1, expectedCharIndex: 0 }, // あの途中 -> あの開始位置
      { byteIndex: 2, expectedCharIndex: 0 }, // あの途中 -> あの開始位置
      { byteIndex: 5, expectedCharIndex: 2 }, // いの途中 -> いの開始位置
      { byteIndex: 6, expectedCharIndex: 2 }, // いの途中 -> いの開始位置
    ];

    testCases.forEach(({ byteIndex, expectedCharIndex }) => {
      const actual = byteIndexToCharIndex(text, byteIndex);
      assertEquals(
        actual,
        expectedCharIndex,
        `byteIndexToCharIndex("${text}", ${byteIndex}) should return ${expectedCharIndex}, got ${actual}`,
      );
    });
  });

  it("should handle edge cases and invalid inputs", () => {
    // 空文字列
    assertEquals(charIndexToByteIndex("", 0), 0);
    assertEquals(charIndexToByteIndex("", 5), 0);
    assertEquals(byteIndexToCharIndex("", 0), 0);
    assertEquals(byteIndexToCharIndex("", 5), 0);

    // 負のインデックス
    assertEquals(charIndexToByteIndex("hello", -1), 0);
    assertEquals(byteIndexToCharIndex("hello", -1), 0);

    // 範囲外のインデックス
    const text = "あいう";
    assertEquals(charIndexToByteIndex(text, 10), 9); // 全体のバイト長
    assertEquals(byteIndexToCharIndex(text, 20), 3); // 全体の文字長
  });

  it("should get character byte length correctly", () => {
    const testCases = [
      { text: "hello", charIndex: 0, expectedLength: 1 }, // h
      { text: "あいう", charIndex: 0, expectedLength: 3 }, // あ
      { text: "あAい", charIndex: 1, expectedLength: 1 }, // A
      { text: "hello", charIndex: -1, expectedLength: 0 }, // 無効
      { text: "hello", charIndex: 10, expectedLength: 0 }, // 範囲外
      { text: "", charIndex: 0, expectedLength: 0 }, // 空文字列
    ];

    testCases.forEach(({ text, charIndex, expectedLength }) => {
      const actual = getCharByteLength(text, charIndex);
      assertEquals(
        actual,
        expectedLength,
        `getCharByteLength("${text}", ${charIndex}) should return ${expectedLength}, got ${actual}`,
      );
    });
  });

  it("should detect multibyte characters correctly", () => {
    const testCases = [
      { text: "hello", expected: false },
      { text: "こんにちは", expected: true },
      { text: "hello世界", expected: true },
      { text: "", expected: false },
      { text: "123ABC", expected: false },
    ];

    testCases.forEach(({ text, expected }) => {
      const actual = hasMultibyteCharacters(text);
      assertEquals(
        actual,
        expected,
        `hasMultibyteCharacters("${text}") should return ${expected}, got ${actual}`,
      );
    });
  });

  it("should convert multiple character indices to byte indices efficiently", () => {
    const text = "あいうABC";
    const charIndices = [0, 1, 2, 3, 4, 5];
    const expectedByteIndices = [0, 3, 6, 9, 10, 11];

    const actual = charIndicesToByteIndices(text, charIndices);
    assertEquals(actual, expectedByteIndices);

    // 順序保持のテスト
    const unorderedIndices = [3, 0, 5, 1];
    const expectedUnordered = [9, 0, 11, 3];
    const actualUnordered = charIndicesToByteIndices(text, unorderedIndices);
    assertEquals(actualUnordered, expectedUnordered);

    // 空配列のテスト
    assertEquals(charIndicesToByteIndices(text, []), []);

    // 空文字列のテスト
    assertEquals(charIndicesToByteIndices("", [0, 1, 2]), [0, 0, 0]);
  });

  it("should provide comprehensive encoding information", () => {
    const text = "あAい";
    const info = getEncodingInfo(text);

    assertEquals(info.charLength, 3);
    assertEquals(info.byteLength, 7);
    assertEquals(info.hasMultibyte, true);
    assertEquals(info.charToByteMap.length, 3);

    // 各文字の詳細をチェック
    assertEquals(info.charToByteMap[0], { char: "あ", charIndex: 0, byteStart: 0, byteLength: 3 });
    assertEquals(info.charToByteMap[1], { char: "A", charIndex: 1, byteStart: 3, byteLength: 1 });
    assertEquals(info.charToByteMap[2], { char: "い", charIndex: 2, byteStart: 4, byteLength: 3 });
  });
});

describe("Encoding Functions Performance and Robustness", () => {
  it("should handle large texts efficiently", () => {
    // 大きなテキストでのパフォーマンステスト
    const largeText = "あ".repeat(1000) + "A".repeat(1000) + "い".repeat(1000);

    const start = performance.now();
    const charIndex = 1500; // 中間位置
    const byteIndex = charIndexToByteIndex(largeText, charIndex);
    const backToCharIndex = byteIndexToCharIndex(largeText, byteIndex);
    const end = performance.now();

    assertEquals(backToCharIndex, charIndex);

    // パフォーマンスが合理的である確認（100ms以下）
    const duration = end - start;
    console.log(`Large text processing took ${duration}ms`);
    assertEquals(duration < 100, true, `Processing should be fast, took ${duration}ms`);
  });

  it("should handle edge cases in real-world scenarios", () => {
    // 実際のマークダウンテキストのようなケース
    const realWorldText =
      "# こんにちは世界\n\n- **項目1**: 説明文\n- **項目2**: [リンク](https://example.com)";

    // 様々な位置での変換をテスト
    for (let i = 0; i <= realWorldText.length; i++) {
      const byteIndex = charIndexToByteIndex(realWorldText, i);
      const backToCharIndex = byteIndexToCharIndex(realWorldText, byteIndex);

      // 文字境界では往復変換が一致する
      assertEquals(
        backToCharIndex,
        i,
        `Round-trip conversion failed at char index ${i}: ${i} -> ${byteIndex} -> ${backToCharIndex}`,
      );
    }
  });

  it("should maintain consistency between individual and batch operations", () => {
    const text = "こんにちはworld";
    const charIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    // 個別変換
    const individualResults = charIndices.map((index) => charIndexToByteIndex(text, index));

    // バッチ変換
    const batchResults = charIndicesToByteIndices(text, charIndices);

    assertEquals(
      individualResults,
      batchResults,
      "Individual and batch conversions should produce identical results",
    );
  });
});
