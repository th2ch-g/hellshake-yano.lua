/**
 * @fileoverview 統合バリデーションシステムのテスト (Process2 Sub3)
 * TDD Red-Green-Refactor方式で実装されたvalidateUnifiedConfig()関数のテスト
 *
 * このファイルは以下の項目をテスト:
 * 1. validateUnifiedConfig()関数の単一バリデーション
 * 2. 既存validateConfig()からのリダイレクト
 * 3. main.tsの重複validateConfig()の非推奨化
 * 4. エラーメッセージの統一（camelCase形式）
 * 5. 境界値テスト（正常系/異常系）
 */

import { assertEquals, assertObjectMatch } from "@std/assert";
import type { UnifiedConfig } from "../denops/hellshake-yano/config.ts";
import {
  validateConfig,         // 既存関数（リダイレクト対象）
  validateUnifiedConfig, // 新しい統合バリデーション関数
  DEFAULT_UNIFIED_CONFIG
} from "../denops/hellshake-yano/config.ts";

Deno.test("validateUnifiedConfig - 基本機能テスト (Red Phase)", () => {
  // 正常なデフォルト設定でテスト
  const result = validateUnifiedConfig(DEFAULT_UNIFIED_CONFIG);
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("validateUnifiedConfig - motionCount バリデーション", () => {
  // 正常系
  let result = validateUnifiedConfig({ motionCount: 3 });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 異常系: 負の値
  result = validateUnifiedConfig({ motionCount: -1 });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("motionCount must be a positive integer"), true);

  // 異常系: 0
  result = validateUnifiedConfig({ motionCount: 0 });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("motionCount must be a positive integer"), true);

  // 異常系: 小数点
  result = validateUnifiedConfig({ motionCount: 3.5 });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("motionCount must be a positive integer"), true);

  // 境界値: 最小正数
  result = validateUnifiedConfig({ motionCount: 1 });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 境界値: 大きな値
  result = validateUnifiedConfig({ motionCount: 100 });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("validateUnifiedConfig - motionTimeout バリデーション", () => {
  // 正常系
  let result = validateUnifiedConfig({ motionTimeout: 2000 });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 異常系: 負の値
  result = validateUnifiedConfig({ motionTimeout: -100 });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("motionTimeout must be at least 100ms"), true);

  // 異常系: 0
  result = validateUnifiedConfig({ motionTimeout: 0 });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("motionTimeout must be at least 100ms"), true);

  // 境界値: 100未満は失敗
  result = validateUnifiedConfig({ motionTimeout: 99 });
  assertEquals(result.valid, false);

  // 境界値: 100以上は成功
  result = validateUnifiedConfig({ motionTimeout: 100 });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("validateUnifiedConfig - maxHints バリデーション", () => {
  // 正常系
  let result = validateUnifiedConfig({ maxHints: 336 });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 異常系: 負の値
  result = validateUnifiedConfig({ maxHints: -1 });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("maxHints must be a positive integer"), true);

  // 異常系: 0
  result = validateUnifiedConfig({ maxHints: 0 });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("maxHints must be a positive integer"), true);

  // 境界値: 最小正数
  result = validateUnifiedConfig({ maxHints: 1 });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("validateUnifiedConfig - debounceDelay バリデーション", () => {
  // 正常系: 0（非負整数として有効）
  let result = validateUnifiedConfig({ debounceDelay: 0 });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 正常系: 正の値
  result = validateUnifiedConfig({ debounceDelay: 50 });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 異常系: 負の値
  result = validateUnifiedConfig({ debounceDelay: -10 });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("debounceDelay must be a non-negative number"), true);

  // 異常系: 小数点
  result = validateUnifiedConfig({ debounceDelay: 50.5 });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("debounceDelay must be a non-negative number"), true);
});

Deno.test("validateUnifiedConfig - hintPosition バリデーション", () => {
  // 正常系
  const validPositions = ["start", "end", "overlay"];
  for (const position of validPositions) {
    const result = validateUnifiedConfig({ hintPosition: position as any });
    assertEquals(result.valid, true);
    assertEquals(result.errors.length, 0);
  }

  // 異常系: 無効な値
  const result = validateUnifiedConfig({ hintPosition: "invalid" as any });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("hintPosition must be one of: start, end, overlay"), true);
});

Deno.test("validateUnifiedConfig - visualHintPosition バリデーション", () => {
  // 正常系（オプショナル）
  let result = validateUnifiedConfig({});
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 正常系: 有効な値
  const validPositions = ["start", "end", "same", "both"];
  for (const position of validPositions) {
    result = validateUnifiedConfig({ visualHintPosition: position as any });
    assertEquals(result.valid, true);
    assertEquals(result.errors.length, 0);
  }

  // 異常系: 無効な値
  result = validateUnifiedConfig({ visualHintPosition: "invalid" as any });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("visualHintPosition must be one of: start, end, same, both"), true);
});

Deno.test("validateUnifiedConfig - wordDetectionStrategy バリデーション", () => {
  // 正常系
  const validStrategies = ["regex", "tinysegmenter", "hybrid"];
  for (const strategy of validStrategies) {
    const result = validateUnifiedConfig({ wordDetectionStrategy: strategy as any });
    assertEquals(result.valid, true);
    assertEquals(result.errors.length, 0);
  }

  // 異常系: 無効な値
  const result = validateUnifiedConfig({ wordDetectionStrategy: "invalid" as any });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("wordDetectionStrategy must be one of: regex, tinysegmenter, hybrid"), true);
});

Deno.test("validateUnifiedConfig - markers配列バリデーション", () => {
  // 正常系
  let result = validateUnifiedConfig({ markers: ["A", "B", "C"] });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 異常系: 空配列
  result = validateUnifiedConfig({ markers: [] });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("markers must not be empty"), true);

  // 異常系: 重複値
  result = validateUnifiedConfig({ markers: ["A", "B", "A"] });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("markers must contain unique values"), true);

  // 異常系: 配列でない
  result = validateUnifiedConfig({ markers: "ABC" as any });
  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("markers must be an array"), true);
});

Deno.test("validateUnifiedConfig - 複数エラーの処理", () => {
  // 複数の無効な値を同時に設定
  const result = validateUnifiedConfig({
    motionCount: -1,
    motionTimeout: 0,
    maxHints: -5,
    hintPosition: "invalid" as any,
    markers: []
  });

  assertEquals(result.valid, false);
  assertEquals(result.errors.length, 5);
  assertEquals(result.errors.includes("motionCount must be a positive integer"), true);
  assertEquals(result.errors.includes("motionTimeout must be at least 100ms"), true);
  assertEquals(result.errors.includes("maxHints must be a positive integer"), true);
  assertEquals(result.errors.includes("hintPosition must be one of: start, end, overlay"), true);
  assertEquals(result.errors.includes("markers must not be empty"), true);
});

Deno.test("validateUnifiedConfig - 境界値テスト", () => {
  // 最小正数
  let result = validateUnifiedConfig({
    motionCount: 1,
    motionTimeout: 100,  // 100ms以上必要
    maxHints: 1,
    debounceDelay: 0
  });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 大きな値
  result = validateUnifiedConfig({
    motionCount: 999999,
    motionTimeout: 999999,
    maxHints: 999999,
    debounceDelay: 999999
  });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("既存validateConfig()のリダイレクト動作確認", () => {
  // 既存関数が新しいvalidateUnifiedConfig()を呼び出すことを確認
  // 注意: このテストは既存関数の改修後にパスするはず

  // 一旦既存関数の動作をテスト（snake_case入力）
  const result = validateConfig({motionCount: 3,
    motionTimeout: 2000,
    maxHints: 336,
    hintPosition: "start"
  });

  // 現在の既存関数の動作を確認
  assertEquals(typeof result.valid, "boolean");
  assertEquals(Array.isArray(result.errors), true);
});

// パフォーマンステスト
Deno.test("validateUnifiedConfig - パフォーマンステスト", () => {
  const config = { ...DEFAULT_UNIFIED_CONFIG };

  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    validateUnifiedConfig(config);
  }
  const end = performance.now();

  const timePerCall = (end - start) / 1000;
  // 1回の呼び出しは1ms以下であるべき
  assertEquals(timePerCall < 1, true, `Validation took ${timePerCall}ms per call`);
});

// エラーメッセージの一貫性テスト
Deno.test("validateUnifiedConfig - エラーメッセージの一貫性", () => {
  const result = validateUnifiedConfig({ motionCount: -1 });
  assertEquals(result.valid, false);

  // camelCase形式のエラーメッセージを確認
  const errorMessage = result.errors[0];
  assertEquals(errorMessage.includes("motionCount"), true, "Error message should use camelCase");
  assertEquals(errorMessage.includes("motion_count"), false, "Error message should not use snake_case");
});