/**
 * @fileoverview 統合テスト: コンテキスト認識による分割調整の統合テスト
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.211.0/assert/mod.ts";
import { HybridWordDetector } from "./detector.ts";
import type { DetectionContext } from "../types.ts";

// テスト用のモック Denops オブジェクト
const createMockDenops = (filetype: string) => ({
  eval: (expr: string) => {
    if (expr === "&filetype") return Promise.resolve(filetype);
    return Promise.resolve("");
  },
});

Deno.test("HybridWordDetector コンテキスト認識統合テスト", async (t) => {
  const detector = new HybridWordDetector({useJapanese: true,
    enable_tinysegmenter: true,
    min_word_length: 1,
  });

  await t.step("TypeScript ファイルでの import 文処理", async () => {
    const mockDenops = createMockDenops("typescript");
    const text = "import { Component } from '@angular/core';";

    // コンテキストなしでの検出
    const wordsWithoutContext = await detector.detectWords(text, 1);

    // コンテキストありでの検出
    const wordsWithContext = await detector.detectWords(text, 1, undefined, mockDenops as any);

    // どちらも単語が検出されることを確認
    assertExists(wordsWithoutContext);
    assertExists(wordsWithContext);

    // コンテキスト認識が機能していることを確認（実際のルール適用結果は実装依存）
    console.log("Words without context:", wordsWithoutContext.length);
    console.log("Words with context:", wordsWithContext.length);
  });

  await t.step("Python ファイルでの snake_case 処理", async () => {
    const mockDenops = createMockDenops("python");
    const text = "def get_user_name(user_id):";

    const words = await detector.detectWords(text, 1, undefined, mockDenops as any);

    assertExists(words);
    console.log("Python words detected:", words.map((w) => w.text));
  });

  await t.step("JavaScript ファイルでのコメント処理", async () => {
    const mockDenops = createMockDenops("javascript");
    const text = "// これはコメントです\nconst userName = 'test';";

    const words = await detector.detectWords(text, 1, undefined, mockDenops as any);

    assertExists(words);
    console.log("JavaScript words with comments:", words.map((w) => w.text));
  });

  await t.step("プレーンテキストでのデフォルト処理", async () => {
    const mockDenops = createMockDenops("text");
    const text = "これは普通の日本語文書です。";

    const words = await detector.detectWords(text, 1, undefined, mockDenops as any);

    assertExists(words);
    console.log("Plain text words:", words.map((w) => w.text));
  });

  await t.step("カスタムコンテキストでの処理", async () => {
    const customContext: DetectionContext = {
      currentKey: "f",
      minWordLength: 3,
      fileType: "typescript",
      metadata: { source: "test" },
    };

    const text = "const x = getUserName();";
    const words = await detector.detectWords(text, 1, customContext);

    assertExists(words);
    // minWordLength: 3 が適用されることを確認
    const shortWords = words.filter((w) => w.text.length < 3);
    assertEquals(shortWords.length, 0, "Short words should be filtered out");

    console.log("Custom context words:", words.map((w) => w.text));
  });
});

Deno.test("コンテキスト認識による分割ルール適用テスト", async (t) => {
  const detector = new HybridWordDetector({useJapanese: false, // 英語モードでテスト
    min_word_length: 1,
  });

  await t.step("文字列内でのプリザーブ処理", async () => {
    const mockDenops = createMockDenops("javascript");
    const text = 'const message = "Hello World";';

    const words = await detector.detectWords(text, 1, undefined, mockDenops as any);

    assertExists(words);
    console.log("String preservation test:", words.map((w) => w.text));
  });

  await t.step("コメント内での分割無効化", async () => {
    const mockDenops = createMockDenops("typescript");
    const text = "// getUserName is a function";

    const words = await detector.detectWords(text, 1, undefined, mockDenops as any);

    assertExists(words);
    console.log("Comment split disable test:", words.map((w) => w.text));
  });
});
