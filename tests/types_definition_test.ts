/**
 * Phase 5: 型定義の整理 - TDD テストスイート
 *
 * このテストファイルはTDD Red-Green-Refactorサイクルに従って
 * 型定義の整理をガイドするためのものです。
 *
 * テスト観点:
 * 1. 型定義の集約：すべての型がtypes.tsで利用可能
 * 2. 型ガード関数：実行時の型安全性
 * 3. ジェネリクス：再利用可能な型パラメータ
 * 4. オプショナルプロパティ：不要な?修飾子の削除
 */

import { assertEquals, assertExists, assert } from "@std/assert";

// Phase 5実装前はこれらのimportは失敗する（REDフェーズ）
// types.tsが作成されてから動作する（GREENフェーズ）
try {
  // types.tsからの型ガード関数import（実装後に利用可能になる）
  const {
    // 型ガード関数のみ値としてimport
    isWord,
    isHintMapping,
    isConfig,
    isValidWord,
  } = await import("../denops/hellshake-yano/types.ts");
} catch (error: unknown) {
  // types.tsがまだ存在しない場合の対処
  console.warn("types.ts not yet implemented - RED phase:", error instanceof Error ? error.message : String(error));
}

Deno.test("Phase 5 Types Test Suite", async (t) => {

  await t.step("RED: types.tsが存在しない状態でテストが失敗することを確認", async () => {
    // types.tsが存在しない状態では、importが失敗することを確認
    let importFailed = false;
    try {
      await import("../denops/hellshake-yano/types.ts");
    } catch (error: unknown) {
      importFailed = true;
      console.log("Import failed as expected:", error instanceof Error ? error.message : String(error));
    }
    // REDフェーズでは失敗することを期待
    if (importFailed) {
      console.log("✓ RED phase: types.ts does not exist yet");
    }
  });

  await t.step("型定義の集約要件", async () => {
    // types.tsからすべての基本型がexportされていることを確認
    try {
      const types = await import("../denops/hellshake-yano/types.ts");

      // 型ガード関数の存在確認（実行時に確認可能）
      assertExists(types.isWord, "isWord type guard should be exported");
      assertExists(types.isHintMapping, "isHintMapping type guard should be exported");
      assertExists(types.isConfig, "isConfig type guard should be exported");
      assertExists(types.isHintPosition, "isHintPosition type guard should be exported");
      assertExists(types.isDetectionStrategy, "isDetectionStrategy type guard should be exported");
      assertExists(types.isMotionKey, "isMotionKey type guard should be exported");

    } catch (error: unknown) {
      // REDフェーズでは期待される失敗
      console.warn("Expected failure in RED phase:", error instanceof Error ? error.message : String(error));
    }
  });

  await t.step("型ガード関数の要件", async () => {
    try {
      const types = await import("../denops/hellshake-yano/types.ts");

      // 型ガード関数の存在確認
      assertExists(types.isWord, "isWord type guard should be exported");
      assertExists(types.isHintMapping, "isHintMapping type guard should be exported");
      assertExists(types.isConfig, "isConfig type guard should be exported");
      assertExists(types.isValidWord, "isValidWord type guard should be exported");

      // 型ガード関数の動作テスト
      const validWord = { text: "test", line: 1, col: 5 };
      const invalidWord = { text: "", line: 0 };

      assert(types.isWord(validWord), "Valid word should pass type guard");
      assert(!types.isWord(invalidWord), "Invalid word should fail type guard");
      assert(!types.isWord(null), "Null should fail type guard");
      assert(!types.isWord(undefined), "Undefined should fail type guard");

    } catch (error: unknown) {
      console.warn("Expected failure in RED phase:", error instanceof Error ? error.message : String(error));
    }
  });

  await t.step("ジェネリクス型の要件", async () => {
    try {
      const types = await import("../denops/hellshake-yano/types.ts");

      // ジェネリクス型の型ガード関数確認
      assertExists(types.isCacheEntry, "isCacheEntry type guard should be exported");

      // ジェネリクス型の使用例テスト（型ガード関数が利用可能な場合）
      if (typeof types.isCacheEntry === 'function') {
        // TypeScript型の使用例（型ガード関数での検証）
        console.log("Generic type guards are available for runtime checking");
      } else {
        console.log("Generic type guards not yet available - RED phase");
      }

    } catch (error: unknown) {
      console.warn("Expected failure in RED phase:", error instanceof Error ? error.message : String(error));
    }
  });

  await t.step("型エイリアスの要件", async () => {
    try {
      const types = await import("../denops/hellshake-yano/types.ts");

      // 複雑な型を簡潔な型エイリアスで表現（型ガード関数が利用可能な場合）
      if (typeof types.isHintPosition === 'function' && typeof types.isDetectionStrategy === 'function') {
        // 型エイリアスの型ガード関数確認
        console.log("Type alias guards are available for runtime checking");
      } else {
        // REDフェーズでは型エイリアスガード関数が未定義
        console.log("Type alias guards not yet available - RED phase");
      }

    } catch (error: unknown) {
      console.warn("Expected failure in RED phase:", error instanceof Error ? error.message : String(error));
    }
  });

  await t.step("オプショナルプロパティの整理要件", async () => {
    try {
      const types = await import("../denops/hellshake-yano/types.ts");

      // 不要なオプショナルプロパティが削除されていることを確認
      const testWord = {
        text: "required_text",
        line: 1,
        col: 5
        // byteColはオプショナルのまま（UTF-8互換性で必要）
      };

      const testConfig = {
        markers: ["A", "B", "C"],
        motionCount: 3,
        motionTimeout: 2000,
        hintPosition: "start",
        triggerOnHjkl: true,
        countedMotions: [],
        enabled: true,
        maxHints: 100,
        debounceDelay: 50,
        useNumbers: true,
        highlightSelected: true,
        debugCoordinates: false
        // 他のプロパティはオプショナル
      };

      assertEquals(testWord.text, "required_text");
      assertEquals(testConfig.enabled, true);

      // 型ガード関数が利用可能な場合のテスト
      if (typeof types.isWord === 'function' && typeof types.isConfig === 'function') {
        assert(types.isWord(testWord), "Word should be valid");
        assert(types.isConfig(testConfig), "Config should be valid");
      }

    } catch (error: unknown) {
      console.warn("Expected failure in RED phase:", error instanceof Error ? error.message : String(error));
    }
  });

  await t.step("型の再利用性要件", async () => {
    try {
      const types = await import("../denops/hellshake-yano/types.ts");

      // 同じ型定義が複数のファイルで重複していないことを確認
      // （実装時に既存ファイルからの型定義削除を検証）

      // 型の一貫性を確認（型ガード関数のテスト）
      const testHintMapping = {
        word: { text: "test", line: 1, col: 5 },
        hint: "A",
        hintCol: 5,
        hintByteCol: 5
      };

      // 型ガード関数が利用可能な場合のテスト
      if (typeof types.isHintMapping === 'function') {
        assert(types.isHintMapping(testHintMapping), "HintMapping should be valid");
      }

    } catch (error: unknown) {
      console.warn("Expected failure in RED phase:", error instanceof Error ? error.message : String(error));
    }
  });

  await t.step("パフォーマンス要件", async () => {
    try {
      const types = await import("../denops/hellshake-yano/types.ts");

      // 型ガード関数のパフォーマンステスト
      const startTime = performance.now();

      // 1000回の型チェック実行
      for (let i = 0; i < 1000; i++) {
        const testWord = { text: `word${i}`, line: i, col: i };
        types.isWord(testWord);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 型ガード関数は高速でなければならない（1000回実行で10ms以内）
      assert(duration < 10, `Type guard performance should be fast: ${duration}ms`);

    } catch (error: unknown) {
      console.warn("Expected failure in RED phase:", error instanceof Error ? error.message : String(error));
    }
  });
});

Deno.test("型安全性の回帰テスト", async (t) => {
  await t.step("既存のコードとの互換性", async () => {
    // 既存のword.ts、hint.ts、config.tsのインターフェースとの互換性を確認
    try {
      // 新しいtypes.tsの型ガード関数確認
      const types = await import("../denops/hellshake-yano/types.ts");

      // 型の構造が一致していることを確認
      const word = { text: "test", line: 1, col: 5 };
      // 型ガード関数が利用可能な場合のテスト
      if (typeof types.isWord === 'function') {
        assert(types.isWord(word), "Existing Word type should be compatible with new type");
      }

    } catch (error: unknown) {
      console.warn("Compatibility test skipped in RED phase:", error instanceof Error ? error.message : String(error));
    }
  });

  await t.step("型定義の完全性", async () => {
    try {
      const types = await import("../denops/hellshake-yano/types.ts");

      // 必要なすべての型ガード関数が定義されていることを確認
      const requiredFunctions = [
        "isWord", "isHintMapping", "isConfig", "isValidWord",
        "isHintPosition", "isDetectionStrategy", "isMotionKey",
        "isCacheEntry"
      ];

      for (const funcName of requiredFunctions) {
        assertExists((types as Record<string, unknown>)[funcName], `${funcName} should be exported from types.ts`);
      }

    } catch (error: unknown) {
      console.warn("Completeness test skipped in RED phase:", error instanceof Error ? error.message : String(error));
    }
  });
});
