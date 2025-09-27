/**
 * 設定型統合テスト (TDD Red-Green-Refactor)
 * Process4 Sub3-1: 設定型の統合と型定義の整理
 *
 * このテストは新しい統合されたConfigType型をテストします
 * - Config, UnifiedConfig, CamelCaseConfigの統合
 * - 単一のConfigType型への統一
 * - 型エイリアスの整理
 *
 * @created 2025-09-27
 * @methodology TDD Red-Green-Refactor
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";

// RED Phase: まだ実装されていない統合型をインポートしようとする（失敗する）
import type {
  ConfigType,     // 新しい統合型（まだ存在しない）
  Config,         // 既存の型
  UnifiedConfig   // 既存の型
} from "../denops/hellshake-yano/types.ts";

import {
  isConfigType,           // 新しい型ガード（まだ存在しない）
  createConfigType,       // 新しいファクトリ関数（まだ存在しない）
  validateConfigType      // 新しいバリデーション関数（まだ存在しない）
} from "../denops/hellshake-yano/types.ts";

Deno.test("ConfigType型統合テスト - GREEN Phase (成功予定)", async (t) => {

  await t.step("ConfigType型が定義されている", () => {
    // GREEN: createConfigType()を使用して完全な設定を作成
    const config: ConfigType = createConfigType({
      enabled: true,
      markers: ["A", "B", "C"],
      motionCount: 3,
      motionTimeout: 2000,
      hintPosition: "start"
    });

    assertExists(config);
    assertEquals(config.enabled, true);
    assertEquals(config.motionCount, 3);
  });

  await t.step("isConfigType型ガード関数が動作する", () => {
    // GREEN: createConfigType()で作成した完全な設定をテスト
    const validConfig = createConfigType({
      enabled: true,
      markers: ["A", "B"],
      motionCount: 3
    });

    assertEquals(isConfigType(validConfig), true);
    assertEquals(isConfigType(null), false);
    assertEquals(isConfigType({}), false);
  });

  await t.step("createConfigType ファクトリ関数が動作する", () => {
    // GREEN: ファクトリ関数の正常動作をテスト
    const config = createConfigType({
      motionCount: 5,
      hintPosition: "end"
    });

    assertEquals(config.motionCount, 5);
    assertEquals(config.hintPosition, "end");
    assertEquals(config.enabled, true); // デフォルト値
  });

  await t.step("validateConfigType バリデーション関数が動作する", () => {
    // GREEN: バリデーション関数の正常動作をテスト
    const validConfig = createConfigType({
      motionCount: 3,
      motionTimeout: 2000,
      hintPosition: "start"
    });

    const result = validateConfigType(validConfig);
    assertEquals(result.isValid, true);
    assertEquals(result.errors.length, 0);

    const invalidConfig = {
      enabled: "invalid" // 不正な型
    };

    const invalidResult = validateConfigType(invalidConfig);
    assertEquals(invalidResult.isValid, false);
    assertEquals(invalidResult.errors.length > 0, true);
  });

  await t.step("ConfigType型が既存の型と互換性がある", () => {
    // GREEN: ConfigType型はUnifiedConfigのエイリアスとして動作
    const configType: ConfigType = createConfigType();
    const unifiedConfig: UnifiedConfig = configType; // 互換性テスト
    // 注意: Config型との互換性は後方互換性レイヤーで実現

    assertExists(unifiedConfig);
    assertEquals(configType.enabled, unifiedConfig.enabled);
  });

  await t.step("型エイリアスが正しく設定されている", () => {
    // GREEN: ConfigType = UnifiedConfig として動作
    const config: ConfigType = createConfigType({
      enabled: true,
      markers: ["A"],
      motionCount: 3,
      motionTimeout: 2000,
      hintPosition: "start",
      // 以下はオプション項目
      visualHintPosition: "end",
      useJapanese: true,
      wordDetectionStrategy: "hybrid"
    });

    assertEquals(config.enabled, true);
    assertEquals(config.visualHintPosition, "end");
    assertEquals(config.useJapanese, true);
  });
});

Deno.test("Config型の重複削除テスト - GREEN Phase", async (t) => {

  await t.step("types.tsの統合型が正しく定義されている", () => {
    // GREEN: 統合後のConfigType/UnifiedConfigが正常に動作する
    const config: ConfigType = createConfigType({
      enabled: true,
      motionCount: 3,
      hintPosition: "start"
    });

    // ConfigTypeとUnifiedConfigが同じ型であることを確認
    const unifiedConfig: UnifiedConfig = config;
    assertEquals(config.enabled, unifiedConfig.enabled);
    assertEquals(config.motionCount, unifiedConfig.motionCount);
  });

  await t.step("統合型が基本的な型安全性を保証する", () => {
    // GREEN: 型ガードとバリデーションが動作する
    const config = createConfigType();

    assertEquals(isConfigType(config), true);

    const validation = validateConfigType(config);
    assertEquals(validation.isValid, true);
    assertEquals(validation.errors.length, 0);
  });
});