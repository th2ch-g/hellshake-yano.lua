/**
 * 変換関数簡素化のテスト (Process4 Sub2-4)
 * TDD Red Phase: toUnifiedConfig/fromUnifiedConfigの簡素化を確認するテスト
 */

import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists } from "@std/assert";
import type { Config, UnifiedConfig } from "../denops/hellshake-yano/config.ts";
import {
  toUnifiedConfig,
  fromUnifiedConfig,
  DEFAULT_UNIFIED_CONFIG
} from "../denops/hellshake-yano/config.ts";

describe("変換関数簡素化テスト (Process4 Sub2-4)", () => {
  describe("RED Phase: 簡素化されたtoUnifiedConfig関数", () => {
    it("複雑なgetConfigValueロジックを使用しないシンプルな実装", () => {
      const config: Partial<Config> = {
        motion_count: 5,
        use_japanese: true,
        hint_position: "end"
      };

      const result = toUnifiedConfig(config);

      // 簡素化後は直接的なマッピングのみ使用
      assertEquals(result.motionCount, 5);
      assertEquals(result.useJapanese, true);
      assertEquals(result.hintPosition, "end");

      // getConfigValueを使用しない簡素な実装を期待
      // この関数内でgetConfigValueが呼ばれていないことを確認
      const functionStr = toUnifiedConfig.toString();
      const usesGetConfigValue = functionStr.includes("getConfigValue");
      assertEquals(usesGetConfigValue, false, "toUnifiedConfigはgetConfigValueを使用しないシンプルな実装であるべき");
    });

    it("snake_case変換が簡素化されている", () => {
      const config: Partial<Config> = {
        trigger_on_hjkl: false,
        highlight_selected: true,
        japanese_min_word_length: 3
      };

      const result = toUnifiedConfig(config);

      // 直接的なマッピングで変換される
      assertEquals(result.triggerOnHjkl, false);
      assertEquals(result.highlightSelected, true);
      assertEquals(result.japaneseMinWordLength, 3);

      // 関数が短く簡潔であることを確認（200行以下）
      const functionLines = toUnifiedConfig.toString().split('\n').length;
      assertEquals(functionLines <= 50, true, "toUnifiedConfig関数は50行以下の簡潔な実装であるべき");
    });

    it("デフォルト値処理が簡素化されている", () => {
      const emptyConfig: Partial<Config> = {};

      const result = toUnifiedConfig(emptyConfig);

      // すべての値がDEFAULT_UNIFIED_CONFIGから取得される
      assertEquals(result.enabled, DEFAULT_UNIFIED_CONFIG.enabled);
      assertEquals(result.motionCount, DEFAULT_UNIFIED_CONFIG.motionCount);
      assertEquals(result.useJapanese, DEFAULT_UNIFIED_CONFIG.useJapanese);

      // 複雑なネストした処理を使用しない
      const functionStr = toUnifiedConfig.toString();
      const hasComplexLogic = functionStr.includes("getConfigValue") ||
                             functionStr.includes("getPerKeyValue") ||
                             functionStr.includes("SNAKE_TO_CAMEL_MAPPING");
      assertEquals(hasComplexLogic, false, "複雑なロジックは簡素化されるべき");
    });
  });

  describe("RED Phase: 簡素化されたfromUnifiedConfig関数", () => {
    it("シンプルな逆変換マッピング", () => {
      const unifiedConfig: Partial<UnifiedConfig> = {
        motionCount: 7,
        useJapanese: false,
        hintPosition: "same"
      };

      const result = fromUnifiedConfig(unifiedConfig);

      // 直接的な逆マッピング
      assertEquals(result.motion_count, 7);
      assertEquals(result.use_japanese, false);
      assertEquals(result.hint_position, "same");

      // 関数が簡潔であることを確認
      const functionLines = fromUnifiedConfig.toString().split('\n').length;
      assertEquals(functionLines <= 40, true, "fromUnifiedConfig関数は40行以下の簡潔な実装であるべき");
    });

    it("レガシー互換性の複雑な処理が削除されている", () => {
      const unifiedConfig: Partial<UnifiedConfig> = {
        enabled: true,
        defaultMinWordLength: 4
      };

      const result = fromUnifiedConfig(unifiedConfig);

      // レガシー互換性の複雑な処理は削除
      const functionStr = fromUnifiedConfig.toString();

      // 複雑なレガシー処理が削除されていることを確認
      const hasLegacyComplexity = functionStr.includes("c.min_word_length") ||
                                 functionStr.includes("c.default_motion_count === undefined && c.defaultMotionCount === undefined");
      assertEquals(hasLegacyComplexity, false, "複雑なレガシー互換性処理は削除されるべき");
    });

    it("不要なプロパティが削除されている", () => {
      const unifiedConfig: Partial<UnifiedConfig> = {
        enabled: true,
        motionCount: 3
      };

      const result = fromUnifiedConfig(unifiedConfig);

      // min_word_lengthやenableなどの重複プロパティが削除されている
      assertEquals("min_word_length" in result, false, "min_word_lengthプロパティは削除されるべき");
      assertEquals("enable" in result, false, "enableプロパティは削除されるべき");
      assertEquals("key_repeat_reset_delay" in result, false, "key_repeat_reset_delayプロパティは削除されるべき");
    });
  });

  describe("変換関数のパフォーマンス確認", () => {
    it("変換処理が高速である", () => {
      const config: Config = {
        enabled: true,
        markers: ["A", "S", "D"],
        motion_count: 5,
        motion_timeout: 1000,
        hint_position: "end",
        visual_hint_position: "start",
        trigger_on_hjkl: true,
        counted_motions: ["j", "k"],
        maxHints: 100,
        debounceDelay: 50,
        use_numbers: true,
        highlight_selected: true,
        debug_coordinates: false,
        single_char_keys: ["a", "s", "d", "f", "g"],
        multi_char_keys: ["q", "w", "e", "r", "t"],
        max_single_char_hints: 26,
        use_hint_groups: true,
        highlight_hint_marker: "DiffAdd",
        highlight_hint_marker_current: "DiffChange",
        suppress_on_key_repeat: true,
        key_repeat_threshold: 50,
        use_japanese: false,
        word_detection_strategy: "hybrid",
        enable_tinysegmenter: true,
        segmenter_threshold: 5,
        japanese_min_word_length: 2,
        japanese_merge_particles: true,
        japanese_merge_threshold: 3,
        per_key_min_length: {},
        default_min_word_length: 3,
        per_key_motion_count: {},
        default_motion_count: 3,
        current_key_context: "",
        debug_mode: false,
        performance_log: false,
        min_word_length: 3,
        enable: true,
        key_repeat_reset_delay: 300
      };

      // 変換処理の時間測定
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        const unified = toUnifiedConfig(config);
        const converted = fromUnifiedConfig(unified);
      }

      const end = performance.now();
      const duration = end - start;

      // 1000回の往復変換が100ms以下で完了することを期待
      assertEquals(duration < 100, true, `変換処理は高速であるべき (実際: ${duration}ms)`);
    });
  });
});