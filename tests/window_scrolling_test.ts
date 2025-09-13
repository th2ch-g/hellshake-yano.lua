#!/usr/bin/env -S deno test --allow-all

/**
 * ウィンドウスクロール時の単語検出テスト
 * 画面に表示されている範囲のみを検出することを確認
 */

import { assertEquals } from "https://deno.land/std@0.221.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.221.0/testing/bdd.ts";
import { detectWordsWithConfig, type WordConfig } from "../denops/hellshake-yano/word.ts";

describe("Window Scrolling Detection", () => {
  describe("Visible window detection", () => {
    it("should detect only visible words in current window", async () => {
      // Mock denops for different window positions
      const createMockDenops = (w0: number, w$: number) => ({
        async call(fn: string, ...args: any[]): Promise<any> {
          if (fn === "line") {
            if (args[0] === "w0") return w0; // 表示範囲の最初の行
            if (args[0] === "w$") return w$; // 表示範囲の最後の行
          }
          if (fn === "getline") {
            const lineNumber = args[0];
            // 100行のファイルをシミュレート
            const lines: { [key: number]: string } = {};
            for (let i = 1; i <= 100; i++) {
              lines[i] = `Line ${i}: word${i} test${i} sample${i}`;
            }
            return lines[lineNumber] || "";
          }
          return null;
        }
      });

      const config: WordConfig = {
        use_improved_detection: true,
        use_japanese: false
      };

      // ウィンドウ位置1: 行1-20
      const denops1 = createMockDenops(1, 20);
      const words1 = await detectWordsWithConfig(denops1 as any, config);

      // 行1-20の単語のみが検出されるべき
      const texts1 = words1.map(w => w.text);
      assertEquals(texts1.includes("word1"), true);
      assertEquals(texts1.includes("word20"), true);
      assertEquals(texts1.includes("word21"), false); // 21行目は表示範囲外
      assertEquals(words1.every(w => w.line >= 1 && w.line <= 20), true);

      // ウィンドウ位置2: 行50-70（PgDn後）
      const denops2 = createMockDenops(50, 70);
      const words2 = await detectWordsWithConfig(denops2 as any, config);

      // 行50-70の単語のみが検出されるべき
      const texts2 = words2.map(w => w.text);
      assertEquals(texts2.includes("word1"), false); // 1行目は表示範囲外
      assertEquals(texts2.includes("word50"), true);
      assertEquals(texts2.includes("word70"), true);
      assertEquals(texts2.includes("word71"), false); // 71行目は表示範囲外
      assertEquals(words2.every(w => w.line >= 50 && w.line <= 70), true);

      // ウィンドウ位置3: 行80-100（ファイル末尾）
      const denops3 = createMockDenops(80, 100);
      const words3 = await detectWordsWithConfig(denops3 as any, config);

      // 行80-100の単語のみが検出されるべき
      const texts3 = words3.map(w => w.text);
      assertEquals(texts3.includes("word79"), false); // 79行目は表示範囲外
      assertEquals(texts3.includes("word80"), true);
      assertEquals(texts3.includes("word100"), true);
      assertEquals(words3.every(w => w.line >= 80 && w.line <= 100), true);
    });

    it("should handle small windows correctly", async () => {
      // 小さいウィンドウ（5行のみ表示）
      const mockDenops = {
        async call(fn: string, ...args: any[]): Promise<any> {
          if (fn === "line") {
            if (args[0] === "w0") return 10;
            if (args[0] === "w$") return 14; // 5行のみ
          }
          if (fn === "getline") {
            const lineNumber = args[0];
            return `Line ${lineNumber}: small window test`;
          }
          return null;
        }
      };

      const config: WordConfig = {
        use_improved_detection: true,
        use_japanese: false
      };

      const words = await detectWordsWithConfig(mockDenops as any, config);

      // 5行分の単語のみが検出される
      assertEquals(words.every(w => w.line >= 10 && w.line <= 14), true);

      // 各行から3単語ずつ（Line, number, small, window, test）
      const expectedWordsPerLine = 5;
      assertEquals(words.length, 5 * expectedWordsPerLine);
    });

    it("should handle single line window", async () => {
      // 1行のみのウィンドウ（分割ウィンドウなど）
      const mockDenops = {
        async call(fn: string, ...args: any[]): Promise<any> {
          if (fn === "line") {
            if (args[0] === "w0") return 42;
            if (args[0] === "w$") return 42; // 同じ行
          }
          if (fn === "getline") {
            if (args[0] === 42) {
              return "Single line with multiple words here";
            }
            return "";
          }
          return null;
        }
      };

      const config: WordConfig = {
        use_improved_detection: true,
        use_japanese: false
      };

      const words = await detectWordsWithConfig(mockDenops as any, config);

      // 1行分の単語のみ
      assertEquals(words.every(w => w.line === 42), true);
      assertEquals(words.map(w => w.text), ["Single", "line", "with", "multiple", "words", "here"]);
    });
  });

  describe("Cache behavior with scrolling", () => {
    it("should invalidate cache when window scrolls", async () => {
      // このテストは実際のキャッシュ機能をテストするために
      // detectWordsOptimized関数を直接テストする必要があるが、
      // ここでは単語検出が表示範囲に限定されることを確認

      const mockDenops = {
        callCount: 0,
        async call(fn: string, ...args: any[]): Promise<any> {
          this.callCount++;
          if (fn === "line") {
            // スクロール前後で異なる値を返す
            if (args[0] === "w0") return this.callCount <= 2 ? 1 : 50;
            if (args[0] === "w$") return this.callCount <= 2 ? 20 : 70;
          }
          if (fn === "getline") {
            const lineNumber = args[0];
            return `Line ${lineNumber}: content`;
          }
          return null;
        }
      };

      const config: WordConfig = {
        use_improved_detection: true,
        use_japanese: false
      };

      // 最初の検出
      const words1 = await detectWordsWithConfig(mockDenops as any, config);
      const lines1 = words1.map(w => w.line);

      // 2回目の検出（スクロール後を想定）
      mockDenops.callCount = 3; // スクロール後の状態にリセット
      const words2 = await detectWordsWithConfig(mockDenops as any, config);
      const lines2 = words2.map(w => w.line);

      // 異なる行範囲の単語が検出されるべき
      assertEquals(Math.min(...lines1), 1);
      assertEquals(Math.max(...lines1), 20);
      assertEquals(Math.min(...lines2), 50);
      assertEquals(Math.max(...lines2), 70);
    });
  });
});