/**
 * 文字エンコーディングと列位置のテスト
 * マルチバイト文字が含まれる行での列計算を確認
 */

import { assertEquals } from "https://deno.land/std@0.221.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.221.0/testing/bdd.ts";

describe("Character Encoding and Column Position", () => {
  it("should calculate correct byte position for ASCII text", () => {
    const text = "- **最終更新**: 2025-09-13 (Process8)";

    // Process8の位置を手動で計算
    const beforeProcess = "- **最終更新**: 2025-09-13 (";
    const processIndex = text.indexOf("Process8");


    // JavaScriptのindexOfは文字単位
    assertEquals(processIndex, 25);
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
      if (char === 'P') {
      }
    });

    // Process8のPの位置（0ベース）
    const pIndex = text.indexOf('P');
    assertEquals(pIndex, 25);

    // Vim/Neovimでは1ベースなので+1
    const vimColumn = pIndex + 1;
    assertEquals(vimColumn, 26);
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
});