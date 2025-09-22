/**
 * Phase 5: 型定義の整理 - 検証テスト
 *
 * このテストは型定義の整理が正しく完了していることを
 * 実際のimportとコンパイルを通じて検証します。
 */

import { assertEquals, assertExists, assert } from "@std/assert";

// types.tsからの型定義import
import type {
  Word,
  HintMapping,
  Config,
  HintPosition,
  HintPositionType,
  DetectionStrategy,
  MotionKey,
  CacheEntry,
  ValidationResult,
  PerformanceMetric,
} from "../denops/hellshake-yano/types.ts";

import {
  isWord,
  isHintMapping,
  isConfig,
  isValidWord,
  createDefaultWord,
  createDefaultHintMapping,
  createMinimalConfig,
  createCacheEntry,
  createValidationResult,
} from "../denops/hellshake-yano/types.ts";

Deno.test("Phase 5 型定義の整理 - 成功検証", async (t) => {

  await t.step("基本型定義の利用可能性", () => {
    // 型が正しく定義されてimportできることを確認
    const word: Word = { text: "hello", line: 1, col: 5 };
    const hintMapping: HintMapping = {
      word,
      hint: "A",
      hintCol: 5,
      hintByteCol: 5
    };

    assertEquals(word.text, "hello");
    assertEquals(hintMapping.hint, "A");
  });

  await t.step("型ガード関数の動作確認", () => {
    const validWord = { text: "test", line: 1, col: 5 };
    const invalidWord = { text: "", line: 0, col: 0 };

    assert(isWord(validWord), "Valid word should pass type guard");
    assert(!isWord(invalidWord), "Invalid word should fail type guard");
    assert(isValidWord(validWord), "Valid word should pass strict validation");
    assert(!isValidWord(invalidWord), "Invalid word should fail strict validation");
  });

  await t.step("ジェネリクス型の動作確認", () => {
    const wordCache: CacheEntry<Word> = createCacheEntry("test_key", {
      text: "cached",
      line: 1,
      col: 10
    });

    const validationResult: ValidationResult<string> = createValidationResult(
      true,
      "validated_value",
      []
    );

    assertEquals(wordCache.key, "test_key");
    assertEquals(wordCache.value.text, "cached");
    assertEquals(validationResult.isValid, true);
    assertEquals(validationResult.value, "validated_value");
  });

  await t.step("型エイリアスの動作確認", () => {
    const position: HintPositionType = "start";
    const strategy: DetectionStrategy = "hybrid";
    const key: MotionKey = "f";

    assertEquals(position, "start");
    assertEquals(strategy, "hybrid");
    assertEquals(key, "f");
  });

  await t.step("ファクトリ関数の動作確認", () => {
    const word = createDefaultWord("factory", 5, 10);
    const mapping = createDefaultHintMapping(word, "F");
    const config = createMinimalConfig();

    assertEquals(word.text, "factory");
    assertEquals(word.line, 5);
    assertEquals(word.col, 10);
    assertEquals(mapping.word, word);
    assertEquals(mapping.hint, "F");
    assertEquals(config.enabled, true);
    assertEquals(config.markers.length, 26); // A-Z
  });

  await t.step("Configインターフェースの必須項目確認", () => {
    const config: Config = createMinimalConfig();

    // 必須項目がすべて存在することを確認
    assertExists(config.markers);
    assertExists(config.motion_count);
    assertExists(config.motion_timeout);
    assertExists(config.hint_position);
    assertExists(config.trigger_on_hjkl);
    assertExists(config.counted_motions);
    assertExists(config.enabled);
    assertExists(config.maxHints);
    assertExists(config.debounceDelay);

    // 型安全性の確認
    assert(Array.isArray(config.markers), "markers should be array");
    assert(typeof config.motion_count === "number", "motion_count should be number");
    assert(typeof config.enabled === "boolean", "enabled should be boolean");
  });

  await t.step("HintMappingの必須項目確認", () => {
    const word = createDefaultWord("required", 1, 1);
    const mapping: HintMapping = {
      word,
      hint: "R",
      hintCol: 1,
      hintByteCol: 1
    };

    // 必須項目の確認（オプショナル修飾子が削除されていることを確認）
    assertEquals(mapping.hintCol, 1);
    assertEquals(mapping.hintByteCol, 1);
    assert(isHintMapping(mapping), "Mapping should pass strict type guard");
  });

  await t.step("型安全性とパフォーマンス", () => {
    // 大量の型チェックでもパフォーマンスが良好であることを確認
    const startTime = performance.now();

    for (let i = 1; i <= 1000; i++) { // i=0だとline=0になり無効な値になる
      const word = createDefaultWord(`word${i}`, i, i);
      assert(isValidWord(word), `Word ${i} should be valid`);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // 1000回の型チェックが100ms以内で完了することを確認（より現実的な値）
    assert(duration < 100, `Type checking should be fast: ${duration}ms`);
  });
});

Deno.test("Phase 5 互換性テスト", async (t) => {

  await t.step("既存インターフェースとの互換性", () => {
    // 既存のコードが期待する形式で型が利用できることを確認
    const legacyStyleWord: Word = {
      text: "legacy",
      line: 1,
      col: 5,
      byteCol: 5 // オプショナルだが設定可能
    };

    const modernStyleWord: Word = {
      text: "modern",
      line: 2,
      col: 10
      // byteColは省略可能
    };

    assert(isWord(legacyStyleWord), "Legacy style word should be valid");
    assert(isWord(modernStyleWord), "Modern style word should be valid");
  });

  await t.step("型定義のエクスポート確認", () => {
    // すべての重要な関数がexportされていることを確認
    const functions = [
      isWord, isHintMapping, isConfig, isValidWord,
      createDefaultWord, createDefaultHintMapping, createMinimalConfig
    ];

    for (const func of functions) {
      assertExists(func, `Function should be available: ${func.name}`);
      assertEquals(typeof func, "function", `${func.name} should be a function`);
    }
  });
});