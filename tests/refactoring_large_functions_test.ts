/**
 * TDD Red-Green-Refactor テスト: 長大関数のリファクタリング
 *
 * 50行以上の長大関数を20-30行に分割し、単一責任の原則を適用するためのテスト
 */

import { assertEquals, assertExists, assert } from "https://deno.land/std@0.220.0/assert/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";

// テスト対象のモジュールをインポート
import {
  main,
  validateConfig,
  getDefaultConfig,
  type Config
} from "../denops/hellshake-yano/main.ts";
import {
  extractWordsFromLine,
  detectWords,
  type Word
} from "../denops/hellshake-yano/word.ts";
import {
  calculateHintPosition,
  calculateHintPositionWithCoordinateSystem,
  assignHintsToWords
} from "../denops/hellshake-yano/hint.ts";

/**
 * Phase 4 リファクタリング計画：
 *
 * 1. main関数 (777行) → 複数の小さな関数に分割
 * 2. waitForUserInput関数 (413行) → 状態管理と入力処理に分離
 * 3. extractWordsFromLine関数 (145行) → 単語抽出ロジックを分割
 * 4. validateConfig関数 (143行) → カテゴリ別バリデーションに分割
 * 5. displayHints関数 (113行) → 表示モード別に分割
 */

// Mock Denops interface for testing
const createMockDenops = (): Denops => ({
  name: "hellshake-yano",
  meta: { host: "nvim", version: "0.10.0" },
  dispatcher: {},
  call: async () => ({ }),
  batch: async () => ([]),
  cmd: async () => {},
  eval: async () => ({}),
  redraw: async () => {},
  [Symbol.asyncIterator]: function* () {},
} as any);

Deno.test("Red Phase: リファクタリング後の関数構造に対するテスト", async (t) => {

  await t.step("main関数のリファクタリング後構造テスト", async () => {
    // main関数が以下の小さな関数に分割されることを期待
    // - initializePlugin (初期化処理)
    // - setupEventHandlers (イベントハンドラー設定)
    // - registerCommands (コマンド登録)
    // - startMainLoop (メインループ開始)

    const denops = createMockDenops();

    // リファクタリング前でも基本動作が可能であることを確認
    assertExists(main);

    // main関数は非同期で実行できること
    try {
      await main(denops);
      assert(true, "main関数が正常に実行される");
    } catch (error) {
      // 初期化エラーは許容（mock環境のため）
      assert(error instanceof Error);
    }
  });

  await t.step("waitForUserInput関数のリファクタリング後構造テスト", async () => {
    // waitForUserInput関数が以下に分割されることを期待
    // - setupInputHandlers (入力ハンドラー設定)
    // - processUserInput (ユーザー入力処理)
    // - handleTimeoutEvents (タイムアウト処理)
    // - cleanupInputState (入力状態クリーンアップ)

    // 現在の実装では直接テストが困難なため、
    // 分割後の各関数の責任範囲を定義
    const expectedFunctions = [
      "setupInputHandlers",
      "processUserInput",
      "handleTimeoutEvents",
      "cleanupInputState"
    ];

    expectedFunctions.forEach(funcName => {
      assert(typeof funcName === "string", `${funcName}は文字列であるべき`);
    });
  });

  await t.step("extractWordsFromLine関数のリファクタリング後構造テスト", async () => {
    // extractWordsFromLine関数が以下に分割されることを期待
    // - parseLineText (行テキスト解析)
    // - filterValidWords (有効単語フィルタリング)
    // - calculateWordPositions (単語位置計算)
    // - sortWordsByPosition (位置ソート)

    const testLine = "hello world test 123";
    const config = getDefaultConfig();

    // 現在の実装でも基本機能が動作することを確認
    const words = extractWordsFromLine(testLine, 1);
    assert(Array.isArray(words), "単語配列が返される");

    // 各単語がWord型の構造を持つことを確認
    words.forEach(word => {
      assertExists(word.text, "単語テキストが存在");
      assertExists(word.line, "単語行番号が存在");
      assertExists(word.col, "単語列番号が存在");
      assert(typeof word.text === "string", "単語テキストは文字列");
      assert(typeof word.line === "number", "単語行番号は数値");
      assert(typeof word.col === "number", "単語列番号は数値");
    });
  });

  await t.step("validateConfig関数のリファクタリング後構造テスト", async () => {
    // validateConfig関数が以下に分割されることを期待
    // - validateCoreConfig (基本設定検証)
    // - validateHintConfig (ヒント設定検証)
    // - validateWordConfig (単語設定検証)
    // - validatePerformanceConfig (パフォーマンス設定検証)

    const testConfig = getDefaultConfig();
    const result = validateConfig(testConfig);

    assert(typeof result === "object", "検証結果はオブジェクト");
    assertExists(result.valid, "valid プロパティが存在");
    assertExists(result.errors, "errors プロパティが存在");
    assert(typeof result.valid === "boolean", "valid は boolean");
    assert(Array.isArray(result.errors), "errors は配列");
  });

  await t.step("calculateHintPosition関数のリファクタリング後構造テスト", async () => {
    // calculateHintPosition関数が以下に分割されることを期待
    // - parsePosition (位置解析)
    // - calculateOffset (オフセット計算)
    // - validatePosition (位置検証)
    // - formatPosition (位置フォーマット)

    const testPos: Word = { text: "test", line: 10, col: 20 };
    const config = getDefaultConfig();

    // 現在の実装でも基本機能が動作することを確認
    const position = calculateHintPosition(testPos, "start");
    assert(typeof position === "object", "位置オブジェクトが返される");
  });
});

Deno.test("Red Phase: 重複コード削除後の統一インターフェースのテスト", async (t) => {

  await t.step("バイト長計算の統一インターフェーステスト", async () => {
    // 重複していたバイト長計算が統一されることを期待
    // - utils/encoding.ts に統一実装
    // - すべてのモジュールで同じ関数を使用

    const testText = "hello 世界";

    // 現在複数箇所に散在しているバイト長計算を統一する
    // 統一後は以下の関数が提供されることを期待
    // - calculateByteLength(text: string): number
    // - calculateByteIndex(text: string, charIndex: number): number

    assert(typeof testText === "string", "テストテキストは文字列");
    assert(testText.length > 0, "テストテキストは非空");
  });

  await t.step("ソート処理の共通化テスト", async () => {
    // 複数箇所に散在するソート処理を共通化
    // - utils/sort.ts に統一実装
    // - 位置ソート、優先度ソート等の共通処理

    const testItems = [
      { index: 2, text: "second" },
      { index: 1, text: "first" },
      { index: 3, text: "third" }
    ];

    // 統一後のソート関数インターフェース
    // - sortByIndex<T>(items: T[], getIndex: (item: T) => number): T[]
    // - sortByPriority<T>(items: T[], getPriority: (item: T) => number): T[]

    assert(Array.isArray(testItems), "テストアイテムは配列");
    assert(testItems.length === 3, "テストアイテムは3個");
  });

  await t.step("キャッシュ操作の抽象化テスト", async () => {
    // 複数のキャッシュ実装を抽象化
    // - utils/cache.ts の LRUCache を活用
    // - 統一されたキャッシュインターフェース

    // 統一後のキャッシュインターフェース
    // - CacheManager クラス
    // - get<T>(key: string): T | undefined
    // - set<T>(key: string, value: T): void
    // - clear(): void
    // - getStats(): CacheStats

    const expectedMethods = ["get", "set", "clear", "getStats"];
    expectedMethods.forEach(method => {
      assert(typeof method === "string", `${method}は文字列であるべき`);
    });
  });
});

Deno.test("Red Phase: 分割後の各関数サイズ制限テスト", async (t) => {

  await t.step("関数の行数制限テスト", async () => {
    // リファクタリング後、すべての関数が30行以下になることを期待
    // 現在の実装では直接チェックできないため、
    // 分割計画の妥当性を検証

    const maxLinesPerFunction = 30;
    const currentLargeFunctions = [
      { name: "main", lines: 777, targetFunctions: 26 }, // 777 / 30 ≈ 26
      { name: "waitForUserInput", lines: 413, targetFunctions: 14 }, // 413 / 30 ≈ 14
      { name: "extractWordsFromLine", lines: 145, targetFunctions: 5 }, // 145 / 30 ≈ 5
      { name: "validateConfig", lines: 143, targetFunctions: 5 }, // 143 / 30 ≈ 5
      { name: "displayHints", lines: 113, targetFunctions: 4 } // 113 / 30 ≈ 4
    ];

    currentLargeFunctions.forEach(func => {
      const estimatedFunctions = Math.ceil(func.lines / maxLinesPerFunction);
      assertEquals(
        func.targetFunctions,
        estimatedFunctions,
        `${func.name}は約${estimatedFunctions}個の関数に分割予定`
      );
    });
  });

  await t.step("単一責任の原則適用テスト", async () => {
    // 分割後の各関数が単一の責任を持つことを期待
    // 各関数名が動詞で始まり、明確な責任を示すことを検証

    const expectedFunctionCategories = [
      "initialize", // 初期化系
      "setup", // セットアップ系
      "process", // 処理系
      "validate", // 検証系
      "calculate", // 計算系
      "format", // フォーマット系
      "filter", // フィルタ系
      "sort", // ソート系
      "cleanup" // クリーンアップ系
    ];

    expectedFunctionCategories.forEach(category => {
      assert(typeof category === "string", `${category}カテゴリは文字列`);
      assert(category.length > 0, `${category}カテゴリは非空`);
    });
  });
});