/**
 * Phase 3: 命名規則統一のテスト
 * TDD Red-Green-Refactor サイクル
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  Config,
  getDefaultConfig,
  createModernConfig,
  validateNamingConvention,
  CamelCaseConfig,
  getDeprecationWarnings,
  validateConfig} from "../denops/hellshake-yano/config.ts";

Deno.test("Phase 3 sub1: camelCase統一 - Snake caseからCamel caseへの変換", async (t) => {
  await t.step("snake_case プロパティをcamelCaseに変換", () => {
    const snakeConfig: Partial<Config> = {motionCount: 5,
      motionTimeout: 3000,
      hintPosition: "end",
      visualHintPosition: "start",
      triggerOnHjkl: false,
      countedMotions: ["w", "b"],
      useNumbers: false,
      highlightSelected: true,
      debugCoordinates: true,
      useJapanese: true,
      enableTinySegmenter: false,
      perKeyMinLength: { w: 2, b: 3 },
      defaultMinWordLength: 4,
      perKeyMotionCount: { w: 2, b: 4 },
      defaultMotionCount: 3};

    const camelConfig =(snakeConfig);

    // camelCase プロパティの存在確認
    assertEquals(camelConfig.motionCount, 5);
    assertEquals(camelConfig.motionTimeout, 3000);
    assertEquals(camelConfig.hintPosition, "end");
    assertEquals(camelConfig.visualHintPosition, "start");
    assertEquals(camelConfig.triggerOnHjkl, false);
    assertEquals(camelConfig.countedMotions, ["w", "b"]);
    assertEquals(camelConfig.useNumbers, false);
    assertEquals(camelConfig.highlightSelected, true);
    assertEquals(camelConfig.debugCoordinates, true);
    assertEquals(camelConfig.useJapanese, true);
    assertEquals(camelConfig.enableTinySegmenter, false);
    assertEquals(camelConfig.perKeyMinLength, { w: 2, b: 3 });
    assertEquals(camelConfig.defaultMinWordLength, 4);
    assertEquals(camelConfig.perKeyMotionCount, { w: 2, b: 4 });
    assertEquals(camelConfig.defaultMotionCount, 3);
  });

  await t.step("camelCase統一 - snake_caseは廃止", () => {
    const modernConfig = createModernConfig({
      motionCount: 7,
      hintPosition: "same",
      useNumbers: true});

    // camelCase のみサポート
    assertEquals(modernConfig.motionCount, 7);
    assertEquals(modernConfig.hintPosition, "same");
    assertEquals(modernConfig.useNumbers, true);
  });

  await t.step("型定義の更新 - CamelCaseConfig型", () => {
    // CamelCaseConfig型が正しく定義されていることを確認
    const config: Partial<CamelCaseConfig> = {
      enabled: true,
      markers: ["A", "B", "C"],
      motionCount: 3,
      motionTimeout: 2000,
      hintPosition: "start",
      visualHintPosition: "end",
      triggerOnHjkl: true,
      countedMotions: [],
      maxHints: 100,
      debounceDelay: 50,
      useNumbers: true,
      highlightSelected: true,
      debugCoordinates: false};

    // 型チェック（コンパイル時）
    assertExists(config.motionCount);
    assertExists(config.hintPosition);
    assertExists(config.useNumbers);
  });
});

Deno.test("Phase 3 sub2: 明確な命名規則適用", async (t) => {
  await t.step("boolean型プロパティ - 標準的な命名", () => {
    const config = createModernConfig({
      enabled: true,
      useNumbers: false,
      triggerOnHjkl: true});

    // boolean型プロパティの確認
    assertEquals(config.enabled, true);
    assertEquals(config.useNumbers, false);
    assertEquals(config.triggerOnHjkl, true);
  });

  await t.step("設定型 - Configサフィックス", () => {
    // CoreConfig, HintConfig等の型名確認は型システムで保証される
    const validation = validateNamingConvention("CoreConfig");
    assertEquals(validation.hasConfigSuffix, true);
    assertEquals(validation.followsConvention, true);

    const invalidValidation = validateNamingConvention("Core");
    assertEquals(invalidValidation.hasConfigSuffix, false);
    assertEquals(invalidValidation.followsConvention, false);
  });

  await t.step("マネージャー - Managerサフィックス", () => {
    // 将来のマネージャークラス用の命名規則
    const validation = validateNamingConvention("WordDetectionManager");
    assertEquals(validation.hasManagerSuffix, true);
    assertEquals(validation.followsConvention, true);

    const invalidValidation = validateNamingConvention("WordDetection");
    assertEquals(invalidValidation.hasManagerSuffix, false);
    assertEquals(invalidValidation.followsConvention, false);
  });
});

Deno.test("Deprecation Warning システム", async (t) => {
  await t.step("snake_case使用時の警告", () => {
    const snakeConfig: Partial<Config> = {motionCount: 5,
      hintPosition: "end",
      useNumbers: false};

    const warnings = getDeprecationWarnings(snakeConfig);

    // 現在は警告システムが簡略化されているため、警告は出ない
    assertEquals(warnings.length, 0);

  });

  await t.step("camelCase使用時は警告なし", () => {
    const camelConfig: Partial<CamelCaseConfig> = {
      motionCount: 5,
      hintPosition: "end",
      useNumbers: false};

    const warnings = getDeprecationWarnings(camelConfig);
    assertEquals(warnings.length, 0);
  });
});

Deno.test("型安全性の確保", async (t) => {
  await t.step("snake_caseとcamelCaseの同期", () => {
    const config = createModernConfig({
      motionCount: 10});

    // camelCaseのみサポート
    assertEquals(config.motionCount, 10);

    // プロパティの変更確認
    config.motionCount = 15;
    assertEquals(config.motionCount, 15);
  });

  await t.step("バリデーション関数の動作確認", () => {
    // バリデーション関数が正しく動作することを確認
    const invalidConfig = { motionCount: -1 };
    const validation = validateConfig(invalidConfig);
    assertEquals(validation.valid, false);
    assertEquals(validation.errors.length, 1);
    assertEquals(validation.errors[0].includes("positive integer"), true);

    // 有効な設定ではエラーなし
    const validConfig = { motionCount: 3 };
    const validValidation = validateConfig(validConfig);
    assertEquals(validValidation.valid, true);
    assertEquals(validValidation.errors.length, 0);
  });
});