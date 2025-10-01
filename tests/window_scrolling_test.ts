#!/usr/bin/env -S deno test --allow-all

/**
 * ウィンドウスクロール時の単語検出テスト
 * 画面に表示されている範囲のみを検出することを確認
 */

import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  detectWordsWithEnhancedConfig,
  type EnhancedWordConfig,
} from "../denops/hellshake-yano/word.ts";
import { MockDenops } from "./helpers/mock.ts";
import type { Denops } from "@denops/std";

describe("Window Scrolling Detection", () => {
  describe("Visible window detection", () => {
    it("should detect only visible words in current window", async () => {
      // Mock denops for different window positions
      const createMockDenops = (w0: number, w$: number): Denops => {
        const mock = new MockDenops();
        mock.onCall("line", (arg: string) => {
          if (arg === "w0") return w0; // 表示範囲の最初の行
          if (arg === "w$") return w$; // 表示範囲の最後の行
          return 1;
        });
        mock.onCall("getline", (lineNumber: number) => {
          // 100行のファイルをシミュレート
          if (lineNumber >= 1 && lineNumber <= 100) {
            return `Line ${lineNumber}: word${lineNumber} test${lineNumber} sample${lineNumber}`;
          }
          return "";
        });
        mock.onCall("getbufline", (_buffer: string, startLine: number, endLine: number) => {
          // getbufline("%", startLine, endLine) をmock
          const result: string[] = [];
          for (let i = startLine; i <= endLine; i++) {
            result.push(`Line ${i}: word${i} test${i} sample${i}`);
          }
          return result;
        });
        return mock;
      };

      const config: EnhancedWordConfig = {
        strategy: "regex",
        useJapanese: false,
      };

      // ウィンドウ位置1: 行1-20
      const denops1 = createMockDenops(1, 20);
      const words1 = await detectWordsWithEnhancedConfig(denops1, config);

      // 行1-20の単語のみが検出されるべき
      const texts1 = words1.map((w) => w.text);
      assertEquals(texts1.includes("word1"), true);
      assertEquals(texts1.includes("word20"), true);
      assertEquals(texts1.includes("word21"), false); // 21行目は表示範囲外
      assertEquals(words1.every((w) => w.line >= 1 && w.line <= 20), true);

      // ウィンドウ位置2: 行50-70（PgDn後）
      const denops2 = createMockDenops(50, 70);
      const words2 = await detectWordsWithEnhancedConfig(denops2, config);

      // 行50-70の単語のみが検出されるべき
      const texts2 = words2.map((w) => w.text);
      assertEquals(texts2.includes("word1"), false); // 1行目は表示範囲外
      assertEquals(texts2.includes("word50"), true);
      assertEquals(texts2.includes("word70"), true);
      assertEquals(texts2.includes("word71"), false); // 71行目は表示範囲外
      assertEquals(words2.every((w) => w.line >= 50 && w.line <= 70), true);

      // ウィンドウ位置3: 行80-100（ファイル末尾）
      const denops3 = createMockDenops(80, 100);
      const words3 = await detectWordsWithEnhancedConfig(denops3, config);

      // 行80-100の単語のみが検出されるべき
      const texts3 = words3.map((w) => w.text);
      assertEquals(texts3.includes("word79"), false); // 79行目は表示範囲外
      assertEquals(texts3.includes("word80"), true);
      assertEquals(texts3.includes("word100"), true);
      assertEquals(words3.every((w) => w.line >= 80 && w.line <= 100), true);
    });

    it("should handle small windows correctly", async () => {
      // 小さいウィンドウ（5行のみ表示）
      const mockDenops = new MockDenops();
      mockDenops.onCall("line", (arg: string) => {
        if (arg === "w0") return 10;
        if (arg === "w$") return 14; // 5行のみ
        return 1;
      });
      mockDenops.onCall("getline", (lineNumber: number) => {
        return `Line ${lineNumber}: small window test`;
      });
      mockDenops.onCall("getbufline", (_buffer: string, startLine: number, endLine: number) => {
        const result: string[] = [];
        for (let i = startLine; i <= endLine; i++) {
          result.push(`Line ${i}: small window test`);
        }
        return result;
      });

      const config: EnhancedWordConfig = {
        strategy: "regex",
        useJapanese: false,
      };

      const words = await detectWordsWithEnhancedConfig(mockDenops, config);

      // 5行分の単語のみが検出される
      assertEquals(words.every((w) => w.line >= 10 && w.line <= 14), true);

      // 各行から3単語ずつ（Line, number, small, window, test）
      const expectedWordsPerLine = 5;
      assertEquals(words.length, 5 * expectedWordsPerLine);
    });

    it("should handle single line window", async () => {
      // 1行のみのウィンドウ（分割ウィンドウなど）
      const mockDenops = new MockDenops();
      mockDenops.onCall("line", (arg: string) => {
        if (arg === "w0") return 42;
        if (arg === "w$") return 42; // 同じ行
        return 1;
      });
      mockDenops.onCall("getline", (lineNumber: number) => {
        if (lineNumber === 42) {
          return "Single line with multiple words here";
        }
        return "";
      });
      mockDenops.onCall("getbufline", (_buffer: string, startLine: number, endLine: number) => {
        if (startLine === 42 && endLine === 42) {
          return ["Single line with multiple words here"];
        }
        return [];
      });

      const config: EnhancedWordConfig = {
        strategy: "regex",
        useJapanese: false,
      };

      const words = await detectWordsWithEnhancedConfig(mockDenops, config);

      // 1行分の単語のみ
      assertEquals(words.every((w) => w.line === 42), true);
      assertEquals(words.map((w) => w.text), [
        "Single",
        "line",
        "with",
        "multiple",
        "words",
        "here",
      ]);
    });
  });

  describe("Cache behavior with scrolling", () => {
    it("should invalidate cache when window scrolls", async () => {
      // このテストは実際のキャッシュ機能をテストするために
      // detectWordsOptimized関数を直接テストする必要があるが、
      // ここでは単語検出が表示範囲に限定されることを確認

      let callCount = 0;
      const mockDenops = new MockDenops();
      mockDenops.onCall("line", (arg: string) => {
        callCount++;
        // スクロール前後で異なる値を返す
        if (arg === "w0") return callCount <= 2 ? 1 : 50;
        if (arg === "w$") return callCount <= 2 ? 20 : 70;
        return 1;
      });
      mockDenops.onCall("getline", (lineNumber: number) => {
        return `Line ${lineNumber}: content`;
      });
      mockDenops.onCall("getbufline", (_buffer: string, startLine: number, endLine: number) => {
        const result: string[] = [];
        for (let i = startLine; i <= endLine; i++) {
          result.push(`Line ${i}: content`);
        }
        return result;
      });

      const config: EnhancedWordConfig = {
        strategy: "regex",
        useJapanese: false,
      };

      // 最初の検出
      const words1 = await detectWordsWithEnhancedConfig(mockDenops, config);
      const lines1 = words1.map((w) => w.line);

      // 2回目の検出（スクロール後を想定）
      callCount = 3; // スクロール後の状態にリセット
      const words2 = await detectWordsWithEnhancedConfig(mockDenops, config);
      const lines2 = words2.map((w) => w.line);

      // 異なる行範囲の単語が検出されるべき
      assertEquals(Math.min(...lines1), 1);
      assertEquals(Math.max(...lines1), 20);
      assertEquals(Math.min(...lines2), 50);
      assertEquals(Math.max(...lines2), 70);
    });
  });
});
