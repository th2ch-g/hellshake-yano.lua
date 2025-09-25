/**
 * @fileoverview コンテキスト認識による分割調整のテストスイート
 * 失敗するテストケースを先に定義
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.211.0/assert/mod.ts";
import { ContextDetector } from "./context.ts";
import type { DetectionContext, SyntaxContext, LineContext } from "../types.ts";

// テスト用のモック Denops オブジェクト
const createMockDenops = (filetype: string) => ({
  eval: (expr: string) => {
    if (expr === '&filetype') return Promise.resolve(filetype);
    return Promise.resolve('');
  }
});

Deno.test("ContextDetector ファイルタイプ別分割テスト", async (t) => {
  const detector = new ContextDetector();

  await t.step("TypeScript: import文とコンポーネントを適切に分割", async () => {
    const mockDenops = createMockDenops('typescript');
    const text = "import { Component } from '@angular/core'";

    const fileType = await detector.detectFileType(mockDenops as any);
    assertEquals(fileType, 'typescript');

    const context = detector.detectSyntaxContext(text, 1, fileType);
    assertEquals(context.language, 'typescript');
    assertEquals(context.inComment, false);
    assertEquals(context.inString, false);

    const lineContext = detector.detectLineContext(text, fileType);
    assertEquals(lineContext.isImport, true);
    assertEquals(lineContext.lineType, 'import');
  });

  await t.step("JavaScript: 関数名と変数を認識", async () => {
    const mockDenops = createMockDenops('javascript');
    const text = "const getUserName = (id) => users[id]";

    const fileType = await detector.detectFileType(mockDenops as any);
    assertEquals(fileType, 'javascript');

    const context = detector.detectSyntaxContext(text, 1, fileType);
    assertEquals(context.language, 'javascript');
    assertEquals(context.inFunction, true);

    const lineContext = detector.detectLineContext(text, fileType);
    assertEquals(lineContext.lineType, 'code');
  });

  await t.step("Python: snake_caseを保持", async () => {
    const mockDenops = createMockDenops('python');
    const text = "def get_user_name(user_id):";

    const fileType = await detector.detectFileType(mockDenops as any);
    assertEquals(fileType, 'python');

    const context = detector.detectSyntaxContext(text, 1, fileType);
    assertEquals(context.language, 'python');
    assertEquals(context.inFunction, true);

    const lineContext = detector.detectLineContext(text, fileType);
    assertEquals(lineContext.lineType, 'code');
  });

  await t.step("Markdown: 構造要素を認識", async () => {
    const mockDenops = createMockDenops('markdown');
    const text = "# 見出し [リンク](url)";

    const fileType = await detector.detectFileType(mockDenops as any);
    assertEquals(fileType, 'markdown');

    const context = detector.detectSyntaxContext(text, 1, fileType);
    assertEquals(context.language, 'markdown');

    const lineContext = detector.detectLineContext(text, fileType);
    assertEquals(lineContext.lineType, 'heading');
  });

  await t.step("JSON: プロパティ名を保持", async () => {
    const mockDenops = createMockDenops('json');
    const text = '"propertyName": "value"';

    const fileType = await detector.detectFileType(mockDenops as any);
    assertEquals(fileType, 'json');

    const context = detector.detectSyntaxContext(text, 1, fileType);
    assertEquals(context.language, 'json');
    assertEquals(context.inString, true);
  });

  await t.step("YAML: コメントを分離", async () => {
    const mockDenops = createMockDenops('yaml');
    const text = "key: value # comment";

    const fileType = await detector.detectFileType(mockDenops as any);
    assertEquals(fileType, 'yaml');

    const context = detector.detectSyntaxContext(text, 1, fileType);
    assertEquals(context.language, 'yaml');
    assertEquals(context.inComment, false); // コメント開始位置ではない

    const lineContext = detector.detectLineContext(text, fileType);
    assertEquals(lineContext.isComment, false); // 行全体がコメントではない
  });

  await t.step("HTML: タグと属性を認識", async () => {
    const mockDenops = createMockDenops('html');
    const text = '<div class="container">';

    const fileType = await detector.detectFileType(mockDenops as any);
    assertEquals(fileType, 'html');

    const context = detector.detectSyntaxContext(text, 1, fileType);
    assertEquals(context.language, 'html');
    assertEquals(context.inString, false);
  });

  await t.step("プレーンテキスト: 標準分割", async () => {
    const mockDenops = createMockDenops('text');
    const text = "これは普通の日本語文書です。";

    const fileType = await detector.detectFileType(mockDenops as any);
    assertEquals(fileType, 'text');

    const context = detector.detectSyntaxContext(text, 1, fileType);
    assertEquals(context.language, 'text');
    assertEquals(context.inComment, false);
    assertEquals(context.inString, false);
  });
});

Deno.test("ContextDetector 文脈認識テスト", async (t) => {
  const detector = new ContextDetector();

  await t.step("コメント内を認識", () => {
    const text = "// これはコメントです";
    const context = detector.detectSyntaxContext(text, 1, 'typescript');
    assertEquals(context.inComment, true);
    assertEquals(context.language, 'typescript');
  });

  await t.step("文字列リテラル内を保持", () => {
    const text = '"Hello World"';
    const context = detector.detectSyntaxContext(text, 1, 'javascript');
    assertEquals(context.inString, true);
    assertEquals(context.language, 'javascript');
  });

  await t.step("関数名を認識", () => {
    const text = "function getUserName() {";
    const context = detector.detectSyntaxContext(text, 1, 'javascript');
    assertEquals(context.inFunction, true);
    assertEquals(context.language, 'javascript');
  });

  await t.step("変数名を認識", () => {
    const text = "const userName = 'test';";
    const context = detector.detectSyntaxContext(text, 1, 'javascript');
    assertEquals(context.language, 'javascript');

    const lineContext = detector.detectLineContext(text, 'javascript');
    assertEquals(lineContext.lineType, 'code');
  });

  await t.step("クラス名を認識", () => {
    const text = "class UserManager {";
    const context = detector.detectSyntaxContext(text, 1, 'typescript');
    assertEquals(context.inClass, true);
    assertEquals(context.language, 'typescript');
  });

  await t.step("import文を処理", () => {
    const text = "import { Component } from 'react';";
    const lineContext = detector.detectLineContext(text, 'typescript');
    assertEquals(lineContext.isImport, true);
    assertEquals(lineContext.lineType, 'import');
  });

  await t.step("CamelCaseを分割 (設定による)", () => {
    const text = "getUserName";
    const context: DetectionContext = {
      fileType: 'typescript',
      syntaxContext: detector.detectSyntaxContext(text, 1, 'typescript')
    };

    const rules = detector.getSplittingRules(context);
    assertExists(rules);
    // CamelCase分割ルールが適用されることを確認
  });

  await t.step("snake_caseをそのまま保持", () => {
    const text = "user_name";
    const context: DetectionContext = {
      fileType: 'python',
      syntaxContext: detector.detectSyntaxContext(text, 1, 'python')
    };

    const rules = detector.getSplittingRules(context);
    assertExists(rules);
    // snake_case保持ルールが適用されることを確認
  });

  await t.step("kebab-caseをそのまま保持", () => {
    const text = "user-name";
    const context: DetectionContext = {
      fileType: 'css',
      syntaxContext: detector.detectSyntaxContext(text, 1, 'css')
    };

    const rules = detector.getSplittingRules(context);
    assertExists(rules);
    // kebab-case保持ルールが適用されることを確認
  });

  await t.step("インデントレベルによる重要度変化", () => {
    const texts = [
      "function topLevel() {",           // インデント0
      "  function nested() {",          // インデント2
      "    function deepNested() {",    // インデント4
      "      function veryDeep() {"     // インデント6
    ];

    texts.forEach((text, index) => {
      const lineContext = detector.detectLineContext(text, 'javascript');
      assertEquals(lineContext.indentLevel, index * 2);
    });
  });
});

Deno.test("ContextDetector コンテキスト統合テスト", async (t) => {
  const detector = new ContextDetector();

  await t.step("コメント内では CamelCase 分割を無効化", () => {
    const context: DetectionContext = {
      fileType: 'typescript',
      syntaxContext: {
        inComment: true,
        inString: false,
        inFunction: false,
        inClass: false,
        language: 'typescript'
      }
    };

    const rules = detector.getSplittingRules(context);
    assertEquals(rules.splitCamelCase, false);
  });

  await t.step("文字列内ではすべてを保持", () => {
    const context: DetectionContext = {
      fileType: 'javascript',
      syntaxContext: {
        inComment: false,
        inString: true,
        inFunction: false,
        inClass: false,
        language: 'javascript'
      }
    };

    const rules = detector.getSplittingRules(context);
    assertEquals(rules.preserveAll, true);
  });

  await t.step("デフォルトファイルタイプの処理", () => {
    const context: DetectionContext = {};
    const rules = detector.getSplittingRules(context);
    assertExists(rules);
    // デフォルトルールが適用されることを確認
  });
});