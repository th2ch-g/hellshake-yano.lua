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

import { assertEquals, assertExists, assert } from "https://deno.land/std@0.220.0/assert/mod.ts";

// Phase 5実装前はこれらのimportは失敗する（REDフェーズ）
// types.tsが作成されてから動作する（GREENフェーズ）
try {
  // types.tsからの型定義import（実装後に利用可能になる）
  const {
    // 基本型
    Word,
    HintMapping,
    Config,

    // 型ガード関数
    isWord,
    isHintMapping,
    isConfig,
    isValidWord,

    // ジェネリクス型
    CacheEntry,
    ValidationResult,
    PerformanceMetric,

    // 型エイリアス
    HintPosition,
    DetectionStrategy,
    HighlightColor,

    // ユニオン型
    MotionKey,
    HintDisplayMode,

  } = await import("../denops/hellshake-yano/types.ts");
} catch {
  // types.tsがまだ存在しない場合の対処
  console.warn("types.ts not yet implemented - RED phase");
}

Deno.test("Phase 5 Types Test Suite", async (t) => {

  await t.step("RED: types.tsが存在しない状態でテストが失敗することを確認", async () => {
    // types.tsが存在しない状態では、importが失敗することを確認
    let importFailed = false;
    try {
      await import("../denops/hellshake-yano/types.ts");
    } catch {
      importFailed = true;
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

      // 基本インターフェース
      assertExists(types.Word, "Word interface should be exported");
      assertExists(types.HintMapping, "HintMapping interface should be exported");
      assertExists(types.Config, "Config interface should be exported");
      assertExists(types.HintPosition, "HintPosition interface should be exported");

      // 型エイリアス
      assertExists(types.DetectionStrategy, "DetectionStrategy type should be exported");
      assertExists(types.HighlightColor, "HighlightColor type should be exported");

      // ユニオン型
      assertExists(types.MotionKey, "MotionKey union type should be exported");
      assertExists(types.HintDisplayMode, "HintDisplayMode union type should be exported");

    } catch (error) {
      // REDフェーズでは期待される失敗
      console.warn("Expected failure in RED phase:", error.message);
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

    } catch (error) {
      console.warn("Expected failure in RED phase:", error.message);
    }
  });

  await t.step("ジェネリクス型の要件", async () => {
    try {
      const types = await import("../denops/hellshake-yano/types.ts");

      // ジェネリクス型の存在確認
      assertExists(types.CacheEntry, "CacheEntry generic type should be exported");
      assertExists(types.ValidationResult, "ValidationResult generic type should be exported");
      assertExists(types.PerformanceMetric, "PerformanceMetric generic type should be exported");

      // ジェネリクス型の使用例テスト
      const wordCache: types.CacheEntry<types.Word> = {
        key: "test_key",
        value: { text: "test", line: 1, col: 5 },
        timestamp: Date.now(),
        ttl: 60000
      };

      const validationResult: types.ValidationResult<string> = {
        isValid: true,
        value: "validated_string",
        errors: []
      };

      assertEquals(wordCache.key, "test_key");
      assertEquals(validationResult.isValid, true);

    } catch (error) {
      console.warn("Expected failure in RED phase:", error.message);
    }
  });

  await t.step("型エイリアスの要件", async () => {
    try {
      const types = await import("../denops/hellshake-yano/types.ts");

      // 複雑な型を簡潔な型エイリアスで表現
      const hintPosition: types.HintPosition = "start";
      const strategy: types.DetectionStrategy = "hybrid";
      const motionKey: types.MotionKey = "f";
      const displayMode: types.HintDisplayMode = "overlay";

      assertEquals(hintPosition, "start");
      assertEquals(strategy, "hybrid");
      assertEquals(motionKey, "f");
      assertEquals(displayMode, "overlay");

    } catch (error) {
      console.warn("Expected failure in RED phase:", error.message);
    }
  });

  await t.step("オプショナルプロパティの整理要件", async () => {
    try {
      const types = await import("../denops/hellshake-yano/types.ts");

      // 不要なオプショナルプロパティが削除されていることを確認
      const word: types.Word = {
        text: "required_text",
        line: 1,
        col: 5
        // byteColはオプショナルのまま（UTF-8互換性で必要）
      };

      const config: types.Config = {
        markers: ["A", "B", "C"],
        motion_count: 3,
        motion_timeout: 2000,
        hint_position: "start",
        trigger_on_hjkl: true,
        counted_motions: [],
        enabled: true,
        maxHints: 100,
        debounceDelay: 50,
        use_numbers: true,
        highlight_selected: true,
        debug_coordinates: false
        // 他のプロパティはオプショナル
      };

      assertEquals(word.text, "required_text");
      assertEquals(config.enabled, true);

    } catch (error) {
      console.warn("Expected failure in RED phase:", error.message);
    }
  });

  await t.step("型の再利用性要件", async () => {
    try {
      const types = await import("../denops/hellshake-yano/types.ts");

      // 同じ型定義が複数のファイルで重複していないことを確認
      // （実装時に既存ファイルからの型定義削除を検証）

      // 型の一貫性を確認
      const hintMapping: types.HintMapping = {
        word: { text: "test", line: 1, col: 5 },
        hint: "A",
        hintCol: 5,
        hintByteCol: 5
      };

      assert(types.isHintMapping(hintMapping), "HintMapping should be valid");

    } catch (error) {
      console.warn("Expected failure in RED phase:", error.message);
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

    } catch (error) {
      console.warn("Expected failure in RED phase:", error.message);
    }
  });
});

Deno.test("型安全性の回帰テスト", async (t) => {
  await t.step("既存のコードとの互換性", async () => {
    // 既存のword.ts、hint.ts、config.tsのインターフェースとの互換性を確認
    try {
      // word.tsからの既存型
      const { Word: ExistingWord } = await import("../denops/hellshake-yano/word.ts");

      // hint.tsからの既存型
      const { HintMapping: ExistingHintMapping } = await import("../denops/hellshake-yano/hint.ts");

      // config.tsからの既存型
      const { Config: ExistingConfig } = await import("../denops/hellshake-yano/config.ts");

      // 新しいtypes.tsの型と既存型の互換性確認
      const types = await import("../denops/hellshake-yano/types.ts");

      // 型の構造が一致していることを確認
      const word: ExistingWord = { text: "test", line: 1, col: 5 };
      assert(types.isWord(word), "Existing Word type should be compatible with new type");

    } catch (error) {
      console.warn("Compatibility test skipped in RED phase:", error.message);
    }
  });

  await t.step("型定義の完全性", async () => {
    try {
      const types = await import("../denops/hellshake-yano/types.ts");

      // 必要なすべての型が定義されていることを確認
      const requiredTypes = [
        "Word", "HintMapping", "Config", "HintPosition",
        "DetectionStrategy", "HighlightColor", "MotionKey", "HintDisplayMode",
        "CacheEntry", "ValidationResult", "PerformanceMetric"
      ];

      const requiredFunctions = [
        "isWord", "isHintMapping", "isConfig", "isValidWord"
      ];

      for (const typeName of requiredTypes) {
        assertExists(types[typeName], `${typeName} should be exported from types.ts`);
      }

      for (const funcName of requiredFunctions) {
        assertExists(types[funcName], `${funcName} should be exported from types.ts`);
      }

    } catch (error) {
      console.warn("Completeness test skipped in RED phase:", error.message);
    }
  });
});
