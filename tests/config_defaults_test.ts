/**
 * Process2 Sub4: デフォルト値管理統一のテスト
 * TDD Red-Green-Refactor方式で実装
 */

import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  getDefaultUnifiedConfig,
  getDefaultConfig,
  createMinimalConfig,
  DEFAULT_UNIFIED_CONFIG,
  type UnifiedConfig,
  type Config
} from "../denops/hellshake-yano/config.ts";

describe("Process2 Sub4: Default Value Management Unification", () => {
  describe("getDefaultUnifiedConfig function", () => {
    it("should have getDefaultUnifiedConfig function", () => {
      // このテストは最初失敗する（関数が存在しないため）
      assertExists(getDefaultUnifiedConfig);
    });

    it("should return complete UnifiedConfig with all 32 properties", () => {
      const config = getDefaultUnifiedConfig();

      // Core settings (6 properties)
      assertExists(config.enabled);
      assertExists(config.markers);
      assertExists(config.motionCount);
      assertExists(config.motionTimeout);
      assertExists(config.hintPosition);
      assertExists(config.visualHintPosition);

      // Hint settings (8 properties)
      assertExists(config.triggerOnHjkl);
      assertExists(config.countedMotions);
      assertExists(config.maxHints);
      assertExists(config.debounceDelay);
      assertExists(config.useNumbers);
      assertExists(config.highlightSelected);
      assertExists(config.debugCoordinates);
      assertExists(config.singleCharKeys);

      // Extended hint settings (4 properties)
      assertExists(config.multiCharKeys);
      assertExists(config.useHintGroups);
      assertExists(config.highlightHintMarker);

      // Word detection settings (7 properties)
      assertExists(config.highlightHintMarkerCurrent);
      assertExists(config.suppressOnKeyRepeat);
      assertExists(config.keyRepeatThreshold);
      assertExists(config.wordDetectionStrategy);
      assertExists(config.enableTinySegmenter);
      assertExists(config.segmenterThreshold);

      // Japanese word settings (7 properties)
      assertExists(config.japaneseMinWordLength);
      assertExists(config.japaneseMergeParticles);
      assertExists(config.japaneseMergeThreshold);
      assertExists(config.defaultMinWordLength);
    });

    it("should return exactly the same values as DEFAULT_UNIFIED_CONFIG", () => {
      const config = getDefaultUnifiedConfig();

      // この段階では一致しない（関数がまだ存在しないため）
      assertEquals(config.enabled, DEFAULT_UNIFIED_CONFIG.enabled);
      assertEquals(config.motionCount, DEFAULT_UNIFIED_CONFIG.motionCount);
      assertEquals(config.hintPosition, DEFAULT_UNIFIED_CONFIG.hintPosition);
      assertEquals(config.useNumbers, DEFAULT_UNIFIED_CONFIG.useNumbers);
    });
  });

  describe("getDefaultConfig redirection", () => {
    it("should have consistent values between getDefaultConfig and getDefaultUnifiedConfig", () => {
      const oldConfig = getDefaultConfig();
      const newConfig = getDefaultUnifiedConfig();

      // 対応するプロパティの値が一致することをテスト
      assertEquals(oldConfig.enabled, newConfig.enabled);
      assertEquals(oldConfig.motionCount, newConfig.motionCount);
      assertEquals(oldConfig.motionTimeout, newConfig.motionTimeout);
      assertEquals(oldConfig.hintPosition, newConfig.hintPosition);
      assertEquals(oldConfig.useNumbers, newConfig.useNumbers);
      assertEquals(oldConfig.highlightSelected, newConfig.highlightSelected);
    });
  });

  // getDefaultHierarchicalConfig removed as part of Process4 Sub2-4

  describe("createMinimalConfig with UnifiedConfig", () => {
    it("should accept UnifiedConfig partial input", () => {
      // この段階では失敗する（まだUnifiedConfigベースに更新されていないため）
      const minimal = createMinimalConfig({
        motionCount: 5,
        hintPosition: "end" as const,
        useNumbers: false
      });

      assertEquals(minimal.motionCount, 5);
      assertEquals(minimal.hintPosition, "end");
      assertEquals(minimal.useNumbers, false);
    });

    it("should return UnifiedConfig type", () => {
      const minimal = createMinimalConfig({});

      // UnifiedConfigのプロパティが存在することを確認
      assertExists(minimal.enabled);
      assertExists(minimal.motionCount);
      assertExists(minimal.hintPosition);
      assertExists(minimal.useNumbers);
    });
  });

  describe("Default value consistency between config types", () => {
    it("should have consistent enabled values", () => {
      const oldConfig = getDefaultConfig();
      const newConfig = getDefaultUnifiedConfig();
      assertEquals(oldConfig.enabled, newConfig.enabled);
    });

    it("should have consistent motion count values", () => {
      const oldConfig = getDefaultConfig();
      const newConfig = getDefaultUnifiedConfig();
      assertEquals(oldConfig.motionCount, newConfig.motionCount);
    });

    it("should have consistent hint position values", () => {
      const oldConfig = getDefaultConfig();
      const newConfig = getDefaultUnifiedConfig();
      assertEquals(oldConfig.hintPosition, newConfig.hintPosition);
    });

    it("should have consistent marker values", () => {
      const oldConfig = getDefaultConfig();
      const newConfig = getDefaultUnifiedConfig();
      assertEquals(oldConfig.markers.length, newConfig.markers.length);
      assertEquals(oldConfig.markers[0], newConfig.markers[0]);
    });

    it("should have consistent use_numbers/useNumbers values", () => {
      const oldConfig = getDefaultConfig();
      const newConfig = getDefaultUnifiedConfig();
      assertEquals(oldConfig.useNumbers, newConfig.useNumbers);
    });
  });
});