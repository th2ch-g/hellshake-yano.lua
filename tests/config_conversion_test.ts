/**
 * 設定変換レイヤーのテスト (Process2 Sub2)
 * TDD Red-Green-Refactor方式で実装
 *()と()関数の全31個のプロパティマッピングをテスト
 */

import { assertEquals, assertExists, assertObjectMatch } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import type { Config, UnifiedConfig } from "../denops/hellshake-yano/config.ts";
import {
  getDefaultConfig,
  DEFAULT_UNIFIED_CONFIG,  // これから実装する関数// これから実装する関数
} from "../denops/hellshake-yano/config.ts";

describe("設定変換レイヤー Tests (Process2 Sub2)", () => {
  describe("TDD Implementation Verification", () => {
    it("function should be implemented", () => {
      // 関数が正常に動作することを確認
      const oldConfig: Partial<Config> = {
        enabled: true,
        motionCount: 5
      };

      const result =(oldConfig);
      assertEquals(result.enabled, true);
      assertEquals(result.motionCount, 5);
    });

    it("function should be implemented", () => {
      // 関数が正常に動作することを確認
      const unifiedConfig: Partial<UnifiedConfig> = {
        enabled: true,
        motionCount: 5
      };

      const result =(unifiedConfig);
      assertEquals(result.enabled, true);
      assertEquals(result.motionCount, 5);
    });
  });

  describe("() - 旧設定→UnifiedConfigへの変換", () => {
    // これらのテストは最初は失敗する（Red Phase）

    it("should convert core settings (6 properties)", () => {
      const oldConfig: Partial<Config> = {
        enabled: true,
        markers: ["A", "S", "D"],
        motionCount: 5,
        motionTimeout: 3000,
        hintPosition: "end",
        visual_hintPosition: "start"
      };

      const result =(oldConfig);

      assertEquals(result.enabled, true);
      assertEquals(result.markers, ["A", "S", "D"]);
      assertEquals(result.motionCount, 5);
      assertEquals(result.motionTimeout, 3000);
      assertEquals(result.hintPosition, "end");
      assertEquals(result.visualHintPosition, "start");
    });

    it("should convert hint settings (8 properties)", () => {
      const oldConfig: Partial<Config> = {triggerOnHjkl: false,
        countedMotions: ["j", "k"],
        maxHints: 200,
        debounceDelay: 100,
        useNumbers: false,
        highlightSelected: false,
        debugCoordinates: true,
        single_char_keys: ["A", "S"]
      };

      const result =(oldConfig);

      assertEquals(result.triggerOnHjkl, false);
      assertEquals(result.countedMotions, ["j", "k"]);
      assertEquals(result.maxHints, 200);
      assertEquals(result.debounceDelay, 100);
      assertEquals(result.useNumbers, false);
      assertEquals(result.highlightSelected, false);
      assertEquals(result.debugCoordinates, true);
      assertEquals(result.singleCharKeys, ["A", "S"]);
    });

    it("should convert extended hint settings (4 properties)", () => {
      const oldConfig: Partial<Config> = {multiCharKeys: ["B", "C"],
        max_single_char_hints: 15,
        use_hint_groups: false,
        highlight_hint_marker: "DiffChange"
      };

      const result =(oldConfig);

      assertEquals(result.multiCharKeys, ["B", "C"]);
      assertEquals(result.maxSingleCharHints, 15);
      assertEquals(result.useHintGroups, false);
      assertEquals(result.highlightHintMarker, "DiffChange");
    });

    it("should convert word detection settings (7 properties)", () => {
      const oldConfig: Partial<Config> = {highlightHintMarkerCurrent: "Visual",
        suppress_on_key_repeat: false,
        key_repeat_threshold: 75,
        useJapanese: true,
        word_detection_strategy: "tinysegmenter",
        enableTinySegmenter: false,
        segmenter_threshold: 6
      };

      const result =(oldConfig);

      assertEquals(result.highlightHintMarkerCurrent, "Visual");
      assertEquals(result.suppressOnKeyRepeat, false);
      assertEquals(result.keyRepeatThreshold, 75);
      assertEquals(result.useJapanese, true);
      assertEquals(result.wordDetectionStrategy, "tinysegmenter");
      assertEquals(result.enableTinySegmenter, false);
      assertEquals(result.segmenterThreshold, 6);
    });

    it("should convert japanese word settings (7 properties)", () => {
      const oldConfig: Partial<Config> = {japaneseMinWordLength: 3,
        japanese_merge_particles: false,
        japanese_merge_threshold: 4,
        perKeyMinLength: { "w": 2, "b": 1 },
        defaultMinWordLength: 4,
        per_key_motionCount: { "j": 2, "k": 4 },
        default_motionCount: 5
      };

      const result =(oldConfig);

      assertEquals(result.japaneseMinWordLength, 3);
      assertEquals(result.japaneseMergeParticles, false);
      assertEquals(result.japaneseMergeThreshold, 4);
      assertEquals(result.perKeyMinLength, { "w": 2, "b": 1 });
      assertEquals(result.defaultMinWordLength, 4);
      assertEquals(result.perKeyMotionCount, { "j": 2, "k": 4 });
      assertEquals(result.defaultMotionCount, 5);
    });

    it("should use default values for missing properties", () => {
      const oldConfig: Partial<Config> = {
        enabled: false
      };

      const result =(oldConfig);

      // 指定されたプロパティ
      assertEquals(result.enabled, false);

      // デフォルト値が使用されるべきプロパティ
      assertEquals(result.motionCount, DEFAULT_UNIFIED_CONFIG.motionCount);
      assertEquals(result.hintPosition, DEFAULT_UNIFIED_CONFIG.hintPosition);
      assertEquals(result.useNumbers, DEFAULT_UNIFIED_CONFIG.useNumbers);
    });

    it("should handle all 31 properties in one conversion", () => {
      const oldConfig: Config = getDefaultConfig();

      // 一部の値を変更してテスト
      oldConfig.motionCount = 7;
      oldConfig.useNumbers = false;
      oldConfig.japaneseMinWordLength = 4;

      const result =(oldConfig);

      // 31個すべてのプロパティが存在することを確認
      assertExists(result.enabled);
      assertExists(result.markers);
      assertExists(result.motionCount);
      assertExists(result.motionTimeout);
      assertExists(result.hintPosition);
      assertExists(result.visualHintPosition);
      assertExists(result.triggerOnHjkl);
      assertExists(result.countedMotions);
      assertExists(result.maxHints);
      assertExists(result.debounceDelay);
      assertExists(result.useNumbers);
      assertExists(result.highlightSelected);
      assertExists(result.debugCoordinates);
      assertExists(result.singleCharKeys);
      assertExists(result.multiCharKeys);
      assertExists(result.maxSingleCharHints);
      assertExists(result.useHintGroups);
      assertExists(result.highlightHintMarker);
      assertExists(result.highlightHintMarkerCurrent);
      assertExists(result.suppressOnKeyRepeat);
      assertExists(result.keyRepeatThreshold);
      assertExists(result.useJapanese);
      assertExists(result.wordDetectionStrategy);
      assertExists(result.enableTinySegmenter);
      assertExists(result.segmenterThreshold);
      assertExists(result.japaneseMinWordLength);
      assertExists(result.japaneseMergeParticles);
      assertExists(result.japaneseMergeThreshold);
      assertExists(result.perKeyMinLength);
      assertExists(result.defaultMinWordLength);
      assertExists(result.perKeyMotionCount);
      assertExists(result.defaultMotionCount);

      // 変更した値が正しく変換されることを確認
      assertEquals(result.motionCount, 7);
      assertEquals(result.useNumbers, false);
      assertEquals(result.japaneseMinWordLength, 4);
    });
  });

  describe("() - UnifiedConfig→旧設定への変換", () => {
    // これらのテストは最初は失敗する（Red Phase）

    it("should convert core settings back to old format", () => {
      const unifiedConfig: Partial<UnifiedConfig> = {
        enabled: false,
        markers: ["X", "Y", "Z"],
        motionCount: 8,
        motionTimeout: 5000,
        hintPosition: "same",
        visualHintPosition: "both"
      };

      const result =(unifiedConfig);

      assertEquals(result.enabled, false);
      assertEquals(result.markers, ["X", "Y", "Z"]);
      assertEquals(result.motionCount, 8);
      assertEquals(result.motionTimeout, 5000);
      assertEquals(result.hintPosition, "same");
      assertEquals(result.visualHintPosition, "both");
    });

    it("should convert hint settings back to snake_case", () => {
      const unifiedConfig: Partial<UnifiedConfig> = {
        triggerOnHjkl: false,
        countedMotions: ["h", "l"],
        maxHints: 150,
        debounceDelay: 25,
        useNumbers: true,
        highlightSelected: true,
        debugCoordinates: false,
        singleCharKeys: ["F", "G"]
      };

      const result =(unifiedConfig);

      assertEquals(result.triggerOnHjkl, false);
      assertEquals(result.countedMotions, ["h", "l"]);
      assertEquals(result.maxHints, 150);
      assertEquals(result.debounceDelay, 25);
      assertEquals(result.useNumbers, true);
      assertEquals(result.highlightSelected, true);
      assertEquals(result.debugCoordinates, false);
      assertEquals(result.singleCharKeys, ["F", "G"]);
    });

    it("should handle round-trip conversion correctly", () => {
      const originalConfig: Config = getDefaultConfig();
      originalConfig.motionCount = 4;
      originalConfig.hintPosition = "end";
      originalConfig.useJapanese = true;

      // 旧設定 → Unified → 旧設定の往復変換
      const unified =(originalConfig);
      const converted =(unified);

      // 重要なプロパティが正しく変換されることを確認
      assertEquals(converted.motionCount, 4);
      assertEquals(converted.hintPosition, "end");
      assertEquals(converted.useJapanese, true);
      assertEquals(converted.enabled, originalConfig.enabled);
      assertEquals(converted.markers, originalConfig.markers);
    });
  });

  describe("snake_case/camelCase双方向マッピング完全テスト (32個)", () => {
    it("should map all 32 properties bidirectionally", () => {
      const mappings = [
        // Core settings (5) - enabled と markers は共通なのでカウントしない
        { snake: "motion_count", camel: "motionCount" },
        { snake: "motion_timeout", camel: "motionTimeout" },
        { snake: "hint_position", camel: "hintPosition" },
        { snake: "visual_hint_position", camel: "visualHintPosition" },

        // Hint settings (6) - maxHints と debounceDelay は共通なのでカウントしない
        { snake: "trigger_on_hjkl", camel: "triggerOnHjkl" },
        { snake: "counted_motions", camel: "countedMotions" },
        { snake: "use_numbers", camel: "useNumbers" },
        { snake: "highlight_selected", camel: "highlightSelected" },
        { snake: "debug_coordinates", camel: "debugCoordinates" },
        { snake: "single_char_keys", camel: "singleCharKeys" },

        // Extended hint settings (4)
        { snake: "multi_char_keys", camel: "multiCharKeys" },
        { snake: "max_single_char_hints", camel: "maxSingleCharHints" },
        { snake: "use_hint_groups", camel: "useHintGroups" },
        { snake: "highlight_hint_marker", camel: "highlightHintMarker" },

        // Word detection settings (7)
        { snake: "highlight_hint_marker_current", camel: "highlightHintMarkerCurrent" },
        { snake: "suppress_on_key_repeat", camel: "suppressOnKeyRepeat" },
        { snake: "key_repeat_threshold", camel: "keyRepeatThreshold" },
        { snake: "use_japanese", camel: "useJapanese" },
        { snake: "word_detection_strategy", camel: "wordDetectionStrategy" },
        { snake: "enable_tinysegmenter", camel: "enableTinySegmenter" },
        { snake: "segmenter_threshold", camel: "segmenterThreshold" },

        // Japanese word settings (7)
        { snake: "japanese_min_word_length", camel: "japaneseMinWordLength" },
        { snake: "japanese_merge_particles", camel: "japaneseMergeParticles" },
        { snake: "japanese_merge_threshold", camel: "japaneseMergeThreshold" },
        { snake: "per_key_min_length", camel: "perKeyMinLength" },
        { snake: "default_min_word_length", camel: "defaultMinWordLength" },
        { snake: "per_key_motion_count", camel: "perKeyMotionCount" },
        { snake: "default_motion_count", camel: "defaultMotionCount" },

        // Common properties (共通プロパティも含める)
        { snake: "enabled", camel: "enabled" },
        { snake: "markers", camel: "markers" },
        { snake: "maxHints", camel: "maxHints" },
        { snake: "debounceDelay", camel: "debounceDelay" }
      ];

      assertEquals(mappings.length, 32, "32個すべてのプロパティマッピングが定義されている必要があります");

      // 各マッピングの双方向変換をテスト
      for (const { snake, camel } of mappings) {
        // snake_case → camelCase の変換テスト
        const snakeConfig = { [snake]: getTestValue(snake) } as any;
        const unified =(snakeConfig);

        if (snake === camel) {
          // 共通プロパティの場合
          assertEquals((unified as any)[camel], getTestValue(snake), `共通プロパティ ${camel} の変換が失敗`);
        } else {
          assertEquals((unified as any)[camel], getTestValue(snake), `snake_case ${snake} → camelCase ${camel} の変換が失敗`);
        }

        // camelCase → snake_case の変換テスト
        const camelConfig = { [camel]: getTestValue(camel) } as any;
        const converted =(camelConfig);

        if (snake === camel) {
          // 共通プロパティの場合
          assertEquals((converted as any)[snake], getTestValue(camel), `共通プロパティ ${snake} の逆変換が失敗`);
        } else {
          assertEquals((converted as any)[snake], getTestValue(camel), `camelCase ${camel} → snake_case ${snake} の変換が失敗`);
        }
      }
    });
  });

  describe("階層設定からの変換サポート", () => {
    it("should support conversion from CoreConfig", () => {
      const coreConfig = {
        enabled: true,
        markers: ["Q", "W", "E"],
        motionCount: 6  // camelCase形式
      };

      const result =(coreConfig);

      assertEquals(result.enabled, true);
      assertEquals(result.markers, ["Q", "W", "E"]);
      assertEquals(result.motionCount, 6);
    });

    it("should support mixed snake_case and camelCase input", () => {
      const mixedConfig = {motionCount: 3,      // snake_case
        hintPosition: "end",  // camelCase
        useJapanese: true,   // snake_case
        debugCoordinates: false // camelCase
      };

      const result =(mixedConfig);

      assertEquals(result.motionCount, 3);
      assertEquals(result.hintPosition, "end");
      assertEquals(result.useJapanese, true);
      assertEquals(result.debugCoordinates, false);
    });
  });
});

/**
 * テスト用の値を生成するヘルパー関数
 * プロパティ名に応じて適切なテスト値を返す
 */
function getTestValue(propertyName: string): any {
  // ブール値系
  if (propertyName.includes("enable") || propertyName.includes("use") ||
      propertyName.includes("trigger") || propertyName.includes("highlight") ||
      propertyName.includes("debug") || propertyName.includes("suppress") ||
      propertyName.includes("merge") || propertyName === "enabled") {
    return true;
  }

  // 数値系
  if (propertyName.includes("count") || propertyName.includes("timeout") ||
      propertyName.includes("hints") || propertyName.includes("delay") ||
      propertyName.includes("threshold") || propertyName.includes("length")) {
    return 42;
  }

  // 配列系
  if (propertyName.includes("markers") || propertyName.includes("keys") ||
      propertyName.includes("motions")) {
    return ["A", "B", "C"];
  }

  // 文字列系 (位置やストラテジー)
  if (propertyName.includes("position")) {
    return "end";
  }
  if (propertyName.includes("strategy")) {
    return "hybrid";
  }
  if (propertyName.includes("marker")) {
    return "DiffAdd";
  }

  // オブジェクト系
  if (propertyName.includes("per_key") || propertyName.includes("perKey")) {
    return { "w": 2, "b": 3 };
  }

  // デフォルト
  return "test-value";
}