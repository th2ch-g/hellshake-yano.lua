/**
 * 統一設定インターフェース(UnifiedConfig)のテスト
 * Process2 sub1: TDD Red-Green-Refactor方式での実装テスト
 */

import { assertEquals, assertExists, assertInstanceOf } from "@std/assert";
import { describe, it } from "@std/testing/bdd";

// これらはまだ実装されていないため、最初はエラーになる（Red phase）
import type { UnifiedConfig } from "../denops/hellshake-yano/config.ts";
import { DEFAULT_UNIFIED_CONFIG } from "../denops/hellshake-yano/config.ts";

describe("UnifiedConfig Tests", () => {
  describe("UnifiedConfig Interface Structure", () => {
    it("should have all 32 camelCase properties", () => {
      // UnifiedConfigが32個のプロパティを持つことを確認
      const expectedProperties = [
        // Core settings (6 properties)
        "enabled",
        "markers",
        "motionCount",
        "motionTimeout",
        "hintPosition",
        "visualHintPosition",

        // Hint settings (8 properties)
        "triggerOnHjkl",
        "countedMotions",
        "maxHints",
        "debounceDelay",
        "useNumbers",
        "highlightSelected",
        "debugCoordinates",
        "singleCharKeys",

        // Extended hint settings (4 properties)
        "multiCharKeys",
        "maxSingleCharHints",
        "useHintGroups",
        "highlightHintMarker",

        // Word detection settings (7 properties)
        "highlightHintMarkerCurrent",
        "suppressOnKeyRepeat",
        "keyRepeatThreshold",
        "useJapanese",
        "wordDetectionStrategy",
        "enableTinySegmenter",
        "segmenterThreshold",

        // Japanese word settings (7 properties)
        "japaneseMinWordLength",
        "japaneseMergeParticles",
        "japaneseMergeThreshold",
        "perKeyMinLength",
        "defaultMinWordLength",
        "perKeyMotionCount",
        "defaultMotionCount",

        // Legacy and additional settings - 残りは未定義時用のオプショナル
      ];

      assertEquals(expectedProperties.length, 32, "Must have exactly 32 properties defined");

      // DEFAULT_UNIFIED_CONFIGから実際のプロパティ数を確認
      const actualProperties = Object.keys(DEFAULT_UNIFIED_CONFIG);
      assertEquals(actualProperties.length >= 32, true, "DEFAULT_UNIFIED_CONFIG should have at least 32 properties");
    });

    it("should use camelCase naming convention for all properties", () => {
      const config: UnifiedConfig = DEFAULT_UNIFIED_CONFIG;
      const properties = Object.keys(config);

      // すべてのプロパティがcamelCaseであることを確認
      for (const prop of properties) {
        // snake_caseではない（アンダースコアを含まない）
        assertEquals(prop.includes('_'), false, `Property ${prop} should not contain underscores`);

        // 最初の文字が小文字である
        assertEquals(prop[0] === prop[0].toLowerCase(), true, `Property ${prop} should start with lowercase`);
      }
    });

    it("should be completely flat (no nested objects)", () => {
      const config: UnifiedConfig = DEFAULT_UNIFIED_CONFIG;

      for (const [key, value] of Object.entries(config)) {
        if (value !== null && value !== undefined) {
          // 配列とRecord<string, X>は許可するが、ネストしたオブジェクトは禁止
          if (typeof value === 'object' && !Array.isArray(value)) {
            // Record<string, number>のようなフラットなマップのみ許可
            const isRecord = Object.values(value).every(v =>
              typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
            );
            assertEquals(isRecord, true, `Property ${key} contains nested objects, should be flat`);
          }
        }
      }
    });
  });

  describe("DEFAULT_UNIFIED_CONFIG Structure", () => {
    it("should exist and be a valid object", () => {
      assertExists(DEFAULT_UNIFIED_CONFIG);
      assertInstanceOf(DEFAULT_UNIFIED_CONFIG, Object);
    });

    it("should have type-safe initial values", () => {
      const config = DEFAULT_UNIFIED_CONFIG;

      // Core settings
      assertEquals(typeof config.enabled, "boolean");
      assertEquals(Array.isArray(config.markers), true);
      assertEquals(typeof config.motionCount, "number");
      assertEquals(typeof config.motionTimeout, "number");
      assertEquals(typeof config.hintPosition, "string");

      // Validate specific values
      assertEquals(config.enabled, true);
      assertEquals(config.motionCount > 0, true);
      assertEquals(config.motionTimeout > 0, true);
      assertEquals(["start", "end", "same"].includes(config.hintPosition), true);
    });

    it("should have sensible default values", () => {
      const config = DEFAULT_UNIFIED_CONFIG;

      // Reasonable defaults
      assertEquals(config.motionCount, 3);
      assertEquals(config.motionTimeout, 2000);
      assertEquals(config.hintPosition, "start");
      assertEquals(config.maxHints, 336);
      assertEquals(config.debounceDelay, 50);
      assertEquals(config.useNumbers, false);
      assertEquals(config.highlightSelected, false);
    });
  });

  describe("Type Safety", () => {
    it("should enforce correct types for each property", () => {
      const config: UnifiedConfig = DEFAULT_UNIFIED_CONFIG;

      // Type assertions that will fail at compile time if types are wrong
      const _enabled: boolean = config.enabled;
      const _markers: string[] = config.markers;
      const _motionCount: number = config.motionCount;
      const _hintPosition: "start" | "end" | "same" = config.hintPosition;

      // Verify runtime types match
      assertEquals(typeof config.enabled, "boolean");
      assertEquals(Array.isArray(config.markers), true);
      assertEquals(typeof config.motionCount, "number");
      assertEquals(typeof config.motionTimeout, "number");
    });

    it("should handle optional properties correctly", () => {
      const config: UnifiedConfig = DEFAULT_UNIFIED_CONFIG;

      // Optional properties should be present in default config
      if (config.visualHintPosition !== undefined) {
        assertEquals(["start", "end", "same", "both"].includes(config.visualHintPosition), true);
      }

      if (config.useJapanese !== undefined) {
        assertEquals(typeof config.useJapanese, "boolean");
      }
    });
  });

  describe("Compatibility with existing Config", () => {
    it("should maintain backward compatibility with snake_case Config", () => {
      // UnifiedConfigから従来のConfigへの変換ができることを確認
      const unifiedConfig = DEFAULT_UNIFIED_CONFIG;

      // 重要な設定項目が存在することを確認
      assertExists(unifiedConfig.motionCount);
      assertExists(unifiedConfig.motionTimeout);
      assertExists(unifiedConfig.hintPosition);
      assertExists(unifiedConfig.enabled);
      assertExists(unifiedConfig.markers);
    });
  });

  describe("Validation and Error Handling", () => {
    it("should validate required properties exist", () => {
      const config = DEFAULT_UNIFIED_CONFIG;

      // 必須プロパティの存在確認
      const requiredProps = [
        "enabled", "markers", "motionCount", "motionTimeout",
        "hintPosition", "maxHints", "debounceDelay"
      ];

      for (const prop of requiredProps) {
        assertExists((config as any)[prop], `Required property ${prop} must exist`);
      }
    });
  });

  describe("Comprehensive Type Tests", () => {
    it("should enforce string union types for position properties", () => {
      const config: UnifiedConfig = DEFAULT_UNIFIED_CONFIG;

      // hintPosition should only accept specific values
      assertEquals(["start", "end", "same"].includes(config.hintPosition), true);

      // visualHintPosition should only accept specific values (if defined)
      if (config.visualHintPosition) {
        assertEquals(["start", "end", "same", "both"].includes(config.visualHintPosition), true);
      }

      // wordDetectionStrategy should only accept specific values
      assertEquals(["regex", "tinysegmenter", "hybrid"].includes(config.wordDetectionStrategy), true);
    });

    it("should enforce numeric constraints", () => {
      const config = DEFAULT_UNIFIED_CONFIG;

      // Positive integers
      assertEquals(config.motionCount > 0, true);
      assertEquals(config.motionTimeout > 0, true);
      assertEquals(config.maxHints > 0, true);
      assertEquals(config.segmenterThreshold > 0, true);
      assertEquals(config.japaneseMinWordLength > 0, true);
      assertEquals(config.japaneseMergeThreshold > 0, true);
      assertEquals(config.defaultMinWordLength > 0, true);

      // Non-negative integers
      assertEquals(config.debounceDelay >= 0, true);
      assertEquals(config.keyRepeatThreshold >= 0, true);

      // Optional numeric constraints
      if (config.maxSingleCharHints !== undefined) {
        assertEquals(config.maxSingleCharHints > 0, true);
      }
      if (config.defaultMotionCount !== undefined) {
        assertEquals(config.defaultMotionCount > 0, true);
      }
    });

    it("should enforce array types and constraints", () => {
      const config = DEFAULT_UNIFIED_CONFIG;

      // Required arrays
      assertEquals(Array.isArray(config.markers), true);
      assertEquals(Array.isArray(config.singleCharKeys), true);
      assertEquals(Array.isArray(config.multiCharKeys), true);
      assertEquals(Array.isArray(config.countedMotions), true);
      assertEquals(config.markers.length > 0, true);

      // Array elements should be strings
      for (const marker of config.markers) {
        assertEquals(typeof marker, "string");
      }
      for (const key of config.singleCharKeys) {
        assertEquals(typeof key, "string");
      }
      for (const key of config.multiCharKeys) {
        assertEquals(typeof key, "string");
      }
    });

    it("should enforce boolean types", () => {
      const config = DEFAULT_UNIFIED_CONFIG;

      const booleanProps = [
        "enabled", "triggerOnHjkl", "useNumbers", "highlightSelected",
        "debugCoordinates", "useHintGroups", "suppressOnKeyRepeat",
        "enableTinySegmenter", "japaneseMergeParticles"
      ];

      for (const prop of booleanProps) {
        assertEquals(typeof (config as any)[prop], "boolean");
      }

      // Optional boolean
      if (config.useJapanese !== undefined) {
        assertEquals(typeof config.useJapanese, "boolean");
      }
    });

    it("should enforce Record types for optional key mappings", () => {
      const config = DEFAULT_UNIFIED_CONFIG;

      if (config.perKeyMinLength !== undefined) {
        assertEquals(typeof config.perKeyMinLength, "object");
        assertEquals(Array.isArray(config.perKeyMinLength), false);

        // All values should be numbers
        for (const value of Object.values(config.perKeyMinLength)) {
          assertEquals(typeof value, "number");
          assertEquals(value > 0, true);
        }
      }

      if (config.perKeyMotionCount !== undefined) {
        assertEquals(typeof config.perKeyMotionCount, "object");
        assertEquals(Array.isArray(config.perKeyMotionCount), false);

        // All values should be numbers
        for (const value of Object.values(config.perKeyMotionCount)) {
          assertEquals(typeof value, "number");
          assertEquals(value > 0, true);
        }
      }
    });

    it("should maintain consistency between related properties", () => {
      const config = DEFAULT_UNIFIED_CONFIG;

      // maxSingleCharHints should not exceed singleCharKeys length
      if (config.maxSingleCharHints !== undefined) {
        assertEquals(config.maxSingleCharHints <= config.singleCharKeys.length, true);
      }

      // Japanese settings should be consistent
      if (config.useJapanese === true) {
        assertEquals(config.enableTinySegmenter, true);
        assertEquals(config.wordDetectionStrategy === "tinysegmenter" || config.wordDetectionStrategy === "hybrid", true);
      }

      // Motion count consistency
      if (config.defaultMotionCount !== undefined) {
        assertEquals(config.defaultMotionCount === config.motionCount, true);
      }
    });
  });

  describe("Integration Tests", () => {
    it("should be compatible with existing Config interface", () => {
      // Test conversion scenarios (conceptual - actual conversion functions would need implementation)
      const unifiedConfig = DEFAULT_UNIFIED_CONFIG;

      // Verify all essential properties exist for potential snake_case conversion
      const essentialProperties = {
        motion_count: unifiedConfig.motionCount,
        motion_timeout: unifiedConfig.motionTimeout,
        hint_position: unifiedConfig.hintPosition,
        trigger_on_hjkl: unifiedConfig.triggerOnHjkl,
        use_numbers: unifiedConfig.useNumbers,
        highlight_selected: unifiedConfig.highlightSelected,
      };

      for (const [key, value] of Object.entries(essentialProperties)) {
        assertExists(value, `Essential property for ${key} should exist`);
      }
    });

    it("should support partial configuration updates", () => {
      const baseConfig = DEFAULT_UNIFIED_CONFIG;

      // Simulate partial update (spread operation should work)
      const updatedConfig: UnifiedConfig = {
        ...baseConfig,
        motionCount: 5,
        useNumbers: false,
        hintPosition: "end" as const,
      };

      assertEquals(updatedConfig.motionCount, 5);
      assertEquals(updatedConfig.useNumbers, false);
      assertEquals(updatedConfig.hintPosition, "end");
      assertEquals(updatedConfig.enabled, baseConfig.enabled); // Should retain base values
    });

    it("should validate default values make logical sense", () => {
      const config = DEFAULT_UNIFIED_CONFIG;

      // Performance settings should be reasonable
      assertEquals(config.debounceDelay >= 0 && config.debounceDelay <= 1000, true);
      assertEquals(config.motionTimeout >= 100 && config.motionTimeout <= 10000, true);
      assertEquals(config.keyRepeatThreshold >= 10 && config.keyRepeatThreshold <= 500, true);

      // Japanese settings should be reasonable
      assertEquals(config.japaneseMinWordLength >= 1 && config.japaneseMinWordLength <= 10, true);
      assertEquals(config.segmenterThreshold >= 1 && config.segmenterThreshold <= 20, true);
      assertEquals(config.defaultMinWordLength >= 1 && config.defaultMinWordLength <= 20, true);

      // Hint settings should be reasonable
      assertEquals(config.maxHints >= 10 && config.maxHints <= 10000, true);

      // Check that singleCharKeys and multiCharKeys are reasonable
      assertEquals(config.singleCharKeys.length > 0, true);
      assertEquals(config.multiCharKeys.length > 0, true);

      // singleCharKeys + multiCharKeys may include numbers, so can be larger than markers
      assertEquals(config.singleCharKeys.length + config.multiCharKeys.length >= config.markers.length, true);
    });
  });
});