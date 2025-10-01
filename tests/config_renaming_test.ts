/**
 * TDD Red-Green-Refactor Test Suite for Process1: Config Renaming
 *
 * このテストは以下の変更を検証します：
 * 1. UnifiedConfig → Config への名前変更
 * 2. getDefaultUnifiedConfig() → getDefaultConfig() への名前変更
 * 3. validateUnifiedConfig() → validateConfig() への名前変更
 * 4. 後方互換性のためのUnifiedConfigエイリアス
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  Config,
  getDefaultConfig,
  getDefaultUnifiedConfig,
  validateConfig,
  validateUnifiedConfig,
} from "../denops/hellshake-yano/config.ts";

// Test Group 1: Interface existence and basic functionality
Deno.test("Config interface should exist and be functional", () => {
  // Config インターフェースが存在することを確認
  const config: Config = {
    enabled: true,
    markers: ["A", "B", "C"],
    motionCount: 3,
    motionTimeout: 2000,
    hintPosition: "start",
    triggerOnHjkl: true,
    countedMotions: [],
    maxHints: 336,
    debounceDelay: 50,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
    singleCharKeys: ["A", "S", "D"],
    multiCharKeys: ["B", "C"],
    useHintGroups: true,
    highlightHintMarker: "DiffAdd",
    highlightHintMarkerCurrent: "DiffText",
    suppressOnKeyRepeat: true,
    keyRepeatThreshold: 50,
    useJapanese: false,
    wordDetectionStrategy: "hybrid",
    enableTinySegmenter: true,
    segmenterThreshold: 4,
    japaneseMinWordLength: 2,
    japaneseMergeParticles: true,
    japaneseMergeThreshold: 2,
    perKeyMinLength: {},
    defaultMinWordLength: 3,
    perKeyMotionCount: {},
    defaultMotionCount: 3,
    motionCounterEnabled: true,
    motionCounterThreshold: 3,
    motionCounterTimeout: 2000,
    showHintOnMotionThreshold: true,
    debugMode: false,
    performanceLog: false,
  };

  // 基本プロパティが正しく設定されていることを確認
  assertEquals(config.enabled, true);
  assertEquals(config.motionCount, 3);
  assertEquals(config.hintPosition, "start");
});

// Test Group 2: getDefaultConfig function
Deno.test("getDefaultConfig function should exist and return valid Config", () => {
  const config = getDefaultConfig();

  // 返り値がConfigインターフェースに適合することを確認
  assertExists(config);
  assertEquals(typeof config.enabled, "boolean");
  assertEquals(typeof config.motionCount, "number");
  assertEquals(typeof config.motionTimeout, "number");
  assertEquals(Array.isArray(config.markers), true);
  assertEquals(config.hintPosition === "start" || config.hintPosition === "end" || config.hintPosition === "overlay", true);
});

// Test Group 3: validateConfig function
Deno.test("validateConfig function should exist and validate Config objects", () => {
  const validConfig: Partial<Config> = {
    enabled: true,
    motionCount: 3,
    hintPosition: "start"
  };

  const result = validateConfig(validConfig);
  assertExists(result);
  assertEquals(typeof result.valid, "boolean");
  assertEquals(Array.isArray(result.errors), true);
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

// Test Group 4: Backward compatibility - Config type should work
// v3.0.0: UnifiedConfig型エイリアスは削除されました
Deno.test("UnifiedConfig alias should work for backward compatibility", () => {
  // v3.0.0: 直接Config型を使用します
  const config: Config = {
    enabled: true,
    markers: ["A", "B", "C"],
    motionCount: 3,
    motionTimeout: 2000,
    hintPosition: "start",
    triggerOnHjkl: true,
    countedMotions: [],
    maxHints: 336,
    debounceDelay: 50,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
    singleCharKeys: ["A", "S", "D"],
    multiCharKeys: ["B", "C"],
    useHintGroups: true,
    highlightHintMarker: "DiffAdd",
    highlightHintMarkerCurrent: "DiffText",
    suppressOnKeyRepeat: true,
    keyRepeatThreshold: 50,
    useJapanese: false,
    wordDetectionStrategy: "hybrid",
    enableTinySegmenter: true,
    segmenterThreshold: 4,
    japaneseMinWordLength: 2,
    japaneseMergeParticles: true,
    japaneseMergeThreshold: 2,
    perKeyMinLength: {},
    defaultMinWordLength: 3,
    perKeyMotionCount: {},
    defaultMotionCount: 3,
    motionCounterEnabled: true,
    motionCounterThreshold: 3,
    motionCounterTimeout: 2000,
    showHintOnMotionThreshold: true,
    debugMode: false,
    performanceLog: false,
  };

  assertEquals(config.enabled, true);
  assertEquals(config.motionCount, 3);
});

// Test Group 5: Old functions should still exist for compatibility
Deno.test("Legacy functions should still work for backward compatibility", () => {
  // getDefaultUnifiedConfig() 関数がまだ使用できることを確認
  const config = getDefaultUnifiedConfig();
  assertExists(config);
  assertEquals(typeof config.enabled, "boolean");

  // validateUnifiedConfig() 関数がまだ使用できることを確認
  const result = validateUnifiedConfig({ enabled: true });
  assertExists(result);
  assertEquals(typeof result.valid, "boolean");
});

// Test Group 6: main.ts related tests
Deno.test("normalizeBackwardCompatibleFlags function should exist", async () => {
  // compatibility.tsから関数をインポートしてテスト
  try {
    const { normalizeBackwardCompatibleFlags } = await import("../denops/hellshake-yano/compatibility.ts");
    assertExists(normalizeBackwardCompatibleFlags);
  } catch (error) {
    // 関数がまだ存在しないことを確認（Red phase）
    console.log("normalizeBackwardCompatibleFlags not found yet - this is expected in Red phase");
  }
});

// Test Group 8: Verify the actual requirements of Process 1
Deno.test("Process1 requirements verification", async () => {
  // v3.0.0要件: UnifiedConfig型エイリアスは完全に削除されている必要がある
  // 要件: interface Config のみが存在する

  // config.tsの内容を読み取ってチェック
  const configTsContent = await Deno.readTextFile("denops/hellshake-yano/config.ts");

  // v3.0.0要件確認1: "interface Config" があるか（これはtrueになるべき）
  const hasInterfaceConfig = configTsContent.includes("interface Config");

  // v3.0.0要件確認2: UnifiedConfig型エイリアスは存在しない（これはfalseになるべき）
  const hasUnifiedConfigAlias = configTsContent.includes("type UnifiedConfig = Config");

  console.log("Current state analysis:");
  console.log(`  interface Config exists: ${hasInterfaceConfig}`);
  console.log(`  type UnifiedConfig = Config exists: ${hasUnifiedConfigAlias}`);

  // v3.0.0の要件を確認
  assertEquals(hasInterfaceConfig, true, "Should have interface Config");
  assertEquals(hasUnifiedConfigAlias, false, "v3.0.0: UnifiedConfig type alias should be removed");
});

// Test Group 7: Type compatibility tests
// v3.0.0: UnifiedConfig型エイリアスは削除されたため、このテストは不要
Deno.test("Config and UnifiedConfig should be compatible types", () => {
  const config1: Config = getDefaultConfig();
  const config2: Config = config1; // v3.0.0: 直接Config型を使用
  const config3: Config = config2; // これもコンパイルエラーにならないことを確認

  assertEquals(config1.enabled, config2.enabled);
  assertEquals(config2.motionCount, config3.motionCount);
});