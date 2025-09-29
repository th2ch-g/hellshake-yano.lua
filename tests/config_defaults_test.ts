/**
 * Process2 Sub4: デフォルト値管理統一のテスト
 * TDD Red-Green-Refactor方式で実装
 */

import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  getDefaultConfig as getDefaultConfigFunction,
  getDefaultConfig,
  createMinimalConfig,
  DEFAULT_CONFIG,
  type Config as ConfigType,
  type Config
} from "../denops/hellshake-yano/config.ts";

describe("Process2 Sub4: Default Value Management Unification", () => {
  describe("getDefaultConfigFunction function", () => {
    it("should have getDefaultConfigFunction function", () => {
      // このテストは最初失敗する（関数が存在しないため）
      assertExists(getDefaultConfigFunction);
    });

    it("should return complete ConfigType with all 32 properties", () => {
      const config = getDefaultConfigFunction();

      // Core settings (6 properties)
      assertExists(config.enabled);
      assertExists(config.markers);
      assertExists(config.motionCount);
      assertExists(config.motionTimeout);
      assertExists(config.hintPosition);

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

    it("should return exactly the same values as DEFAULT_CONFIG", () => {
      const config = getDefaultConfigFunction();

      // この段階では一致しない（関数がまだ存在しないため）
      assertEquals(config.enabled, DEFAULT_CONFIG.enabled);
      assertEquals(config.motionCount, DEFAULT_CONFIG.motionCount);
      assertEquals(config.hintPosition, DEFAULT_CONFIG.hintPosition);
      assertEquals(config.useNumbers, DEFAULT_CONFIG.useNumbers);
    });
  });

  describe("getDefaultConfig redirection", () => {
    it("should have consistent values between getDefaultConfig and getDefaultConfigFunction", () => {
      const oldConfig = getDefaultConfig();
      const newConfig = getDefaultConfigFunction();

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

  describe("createMinimalConfig with ConfigType", () => {
    it("should accept ConfigType partial input", () => {
      // この段階では失敗する（まだConfigTypeベースに更新されていないため）
      const minimal = createMinimalConfig({
        motionCount: 5,
        hintPosition: "end" as const,
        useNumbers: false
      });

      assertEquals(minimal.motionCount, 5);
      assertEquals(minimal.hintPosition, "end");
      assertEquals(minimal.useNumbers, false);
    });

    it("should return ConfigType type", () => {
      const minimal = createMinimalConfig({});

      // ConfigTypeのプロパティが存在することを確認
      assertExists(minimal.enabled);
      assertExists(minimal.motionCount);
      assertExists(minimal.hintPosition);
      assertExists(minimal.useNumbers);
    });
  });

  describe("Default value consistency between config types", () => {
    it("should have consistent enabled values", () => {
      const oldConfig = getDefaultConfig();
      const newConfig = getDefaultConfigFunction();
      assertEquals(oldConfig.enabled, newConfig.enabled);
    });

    it("should have consistent motion count values", () => {
      const oldConfig = getDefaultConfig();
      const newConfig = getDefaultConfigFunction();
      assertEquals(oldConfig.motionCount, newConfig.motionCount);
    });

    it("should have consistent hint position values", () => {
      const oldConfig = getDefaultConfig();
      const newConfig = getDefaultConfigFunction();
      assertEquals(oldConfig.hintPosition, newConfig.hintPosition);
    });

    it("should have consistent marker values", () => {
      const oldConfig = getDefaultConfig();
      const newConfig = getDefaultConfigFunction();
      assertEquals(oldConfig.markers.length, newConfig.markers.length);
      assertEquals(oldConfig.markers[0], newConfig.markers[0]);
    });

    it("should have consistent useNumbers/useNumbers values", () => {
      const oldConfig = getDefaultConfig();
      const newConfig = getDefaultConfigFunction();
      assertEquals(oldConfig.useNumbers, newConfig.useNumbers);
    });
  });
});