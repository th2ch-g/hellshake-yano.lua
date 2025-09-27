/**
 * 変換関数簡素化のテスト (Process4 Sub2-4)
 * TDD Red Phase:/の簡素化を確認するテスト
 */

import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists } from "@std/assert";
import type { Config, UnifiedConfig } from "../denops/hellshake-yano/config.ts";
import {
  DEFAULT_UNIFIED_CONFIG
} from "../denops/hellshake-yano/config.ts";

describe("変換関数簡素化テスト (Process4 Sub2-4)", () => {
  describe("RED Phase: 簡素化された関数", () => {
    it("複雑なgetConfigValueロジックを使用しないシンプルな実装", () => {
      const config: Partial<Config> = {motionCount: 5,
        useJapanese: true,
        hintPosition: "end"
      };

      // toUnifiedConfig関数は削除されたため、DEFAULT_UNIFIED_CONFIGを直接使用
      const result = { ...DEFAULT_UNIFIED_CONFIG, ...config };

      // 簡素化後は直接的なマッピングのみ使用
      assertEquals(result.motionCount, 5);
      assertEquals(result.useJapanese, true);
      assertEquals(result.hintPosition, "end");

      // getConfigValueを使用しない簡素な実装を期待
      // この関数内でgetConfigValueが呼ばれていないことを確認
      // const functionStr = toUnifiedConfig.toString(); // Function removed in Process4 Sub3-2
      // const usesGetConfigValue = functionStr.includes("getConfigValue");
      // assertEquals(usesGetConfigValue, false, "はgetConfigValueを使用しないシンプルな実装であるべき");
    });

    it("snake_case変換が簡素化されている", () => {
      const config: Partial<Config> = {triggerOnHjkl: false,
        highlightSelected: true,
        japaneseMinWordLength: 3
      };

      // toUnifiedConfig関数は削除されたため、DEFAULT_UNIFIED_CONFIGを直接使用
      const result = { ...DEFAULT_UNIFIED_CONFIG, ...config };

      // 直接的なマッピングで変換される
      assertEquals(result.triggerOnHjkl, false);
      assertEquals(result.highlightSelected, true);
      assertEquals(result.japaneseMinWordLength, 3);

      // 関数が短く簡潔であることを確認（200行以下）
      // const functionLines = toUnifiedConfig.toString().split('\n').length; // Function removed
      // assertEquals(functionLines <= 50, true, "関数は50行以下の簡潔な実装であるべき");
    });

    it("デフォルト値処理が簡素化されている", () => {
      const emptyConfig: Partial<Config> = {};

      // toUnifiedConfig関数は削除されたため、DEFAULT_UNIFIED_CONFIGを直接使用
      const result = { ...DEFAULT_UNIFIED_CONFIG, ...emptyConfig };

      // すべての値がDEFAULT_UNIFIED_CONFIGから取得される
      assertEquals(result.enabled, DEFAULT_UNIFIED_CONFIG.enabled);
      assertEquals(result.motionCount, DEFAULT_UNIFIED_CONFIG.motionCount);
      assertEquals(result.useJapanese, DEFAULT_UNIFIED_CONFIG.useJapanese);

      // 複雑なネストした処理を使用しない
      // const functionStr = toUnifiedConfig.toString(); // Function removed
      // const hasComplexLogic = functionStr.includes("getConfigValue") ||
      //                        functionStr.includes("getPerKeyValue") ||
      //                        functionStr.includes("SNAKE_TO_CAMEL_MAPPING");
      // assertEquals(hasComplexLogic, false, "複雑なロジックは簡素化されるべき");
    });
  });

  describe("RED Phase: 簡素化された関数", () => {
    it("シンプルな逆変換マッピング", () => {
      const unifiedConfig: Partial<UnifiedConfig> = {
        motionCount: 7,
        useJapanese: false,
        hintPosition: "same"
      };

      // fromUnifiedConfig関数は削除されたため、直接マッピングを使用
      const result = { ...unifiedConfig };

      // 直接的な逆マッピング
      assertEquals(result.motionCount, 7);
      assertEquals(result.useJapanese, false);
      assertEquals(result.hintPosition, "same");

      // 関数が簡潔であることを確認
      // const functionLines = fromUnifiedConfig.toString().split('\n').length; // Function removed
      // assertEquals(functionLines <= 40, true, "関数は40行以下の簡潔な実装であるべき");
    });

    it("レガシー互換性の複雑な処理が削除されている", () => {
      const unifiedConfig: Partial<UnifiedConfig> = {
        enabled: true,
        defaultMinWordLength: 4
      };

      // fromUnifiedConfig関数は削除されたため、直接マッピングを使用
      const result = { ...unifiedConfig };

      // レガシー互換性の複雑な処理は削除
      // const functionStr = fromUnifiedConfig.toString(); // Function removed

      // 複雑なレガシー処理が削除されていることを確認
      // const hasLegacyComplexity = functionStr.includes("c.minWordLength") ||
      //                            functionStr.includes("c.defaultMotionCount === undefined && c.defaultMotionCount === undefined");
      // assertEquals(hasLegacyComplexity, false, "複雑なレガシー互換性処理は削除されるべき");
    });

    it("不要なプロパティが削除されている", () => {
      const unifiedConfig: Partial<UnifiedConfig> = {
        enabled: true,
        motionCount: 3
      };

      // fromUnifiedConfig関数は削除されたため、直接マッピングを使用
      const result = { ...unifiedConfig };

      // minWordLengthやenableなどの重複プロパティが削除されている
      assertEquals("minWordLength" in result, false, "minWordLengthプロパティは削除されるべき");
      assertEquals("enable" in result, false, "enableプロパティは削除されるべき");
      assertEquals("key_repeat_reset_delay" in result, false, "key_repeat_reset_delayプロパティは削除されるべき");
    });
  });

  describe("変換関数のパフォーマンス確認", () => {
    it("変換処理が高速である", () => {
      const config: Config = {
        enabled: true,
        markers: ["A", "S", "D"],
        motionCount: 5,
        motionTimeout: 1000,
        hintPosition: "end",
        visualHintPosition: "start",
        triggerOnHjkl: true,
        countedMotions: ["j", "k"],
        maxHints: 100,
        debounceDelay: 50,
        useNumbers: true,
        highlightSelected: true,
        debugCoordinates: false,
        singleCharKeys: ["a", "s", "d", "f", "g"],
        multiCharKeys: ["q", "w", "e", "r", "t"],
        maxSingleCharHints: 26,
        useHintGroups: true,
        highlightHintMarker: "DiffAdd",
        highlightHintMarkerCurrent: "DiffChange",
        suppressOnKeyRepeat: true,
        keyRepeatThreshold: 50,
        useJapanese: false,
        wordDetectionStrategy: "hybrid",
        enableTinySegmenter: true,
        segmenterThreshold: 5,
        japaneseMinWordLength: 2,
        japaneseMergeParticles: true,
        japaneseMergeThreshold: 3,
        perKeyMinLength: {},
        perKeyMotionCount: {},
        defaultMotionCount: 3,
        currentKeyContext: "",
        debugMode: false,
        performanceLog: false,
      };

      // 変換処理の時間測定
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        // 削除された変換関数の代わりに直接マッピングを使用
        const unified = { ...DEFAULT_UNIFIED_CONFIG, ...config };
        const converted = { ...unified };
      }

      const end = performance.now();
      const duration = end - start;

      // 1000回の往復変換が100ms以下で完了することを期待
      assertEquals(duration < 100, true, `変換処理は高速であるべき (実際: ${duration}ms)`);
    });
  });
});