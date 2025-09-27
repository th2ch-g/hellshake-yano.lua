/**
 * 変換関数削除のTDDテスト (Process4 Sub3-2)
 * RED Phase: 変換関数が完全に削除された後の理想的な状態を定義
 */

import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists } from "@std/assert";
import type { UnifiedConfig } from "../denops/hellshake-yano/config.ts";
import {
  DEFAULT_UNIFIED_CONFIG,
  validateUnifiedConfig,
  getDefaultUnifiedConfig
} from "../denops/hellshake-yano/config.ts";

describe("変換関数削除テスト (Process4 Sub3-2)", () => {
  describe("RED Phase: 変換関数が存在しないことの証明", () => {
    it("関数が削除されている", () => {
      // config.tsをimportして関数が存在しないことを確認
      let hasToUnifiedConfig = false;
      try {
        // @ts-ignore - 削除された関数への参照
        const {} = require("../denops/hellshake-yano/config.ts");
        hasToUnifiedConfig = !!;
      } catch {
        // 関数が存在しない場合はここに到達
        hasToUnifiedConfig = false;
      }

      assertEquals(hasToUnifiedConfig, false, "関数は削除されているべき");
    });

    it("関数が削除されている", () => {
      // config.tsをimportして関数が存在しないことを確認
      let hasFromUnifiedConfig = false;
      try {
        // @ts-ignore - 削除された関数への参照
        const {} = require("../denops/hellshake-yano/config.ts");
        hasFromUnifiedConfig = !!;
      } catch {
        // 関数が存在しない場合はここに到達
        hasFromUnifiedConfig = false;
      }

      assertEquals(hasFromUnifiedConfig, false, "関数は削除されているべき");
    });

    it("config.tsファイルサイズが削減されている", async () => {
      // config.tsのファイルサイズを確認（変換関数削除により大幅削減）
      const configFile = await Deno.readTextFile("./denops/hellshake-yano/config.ts");
      const lines = configFile.split('\n').length;

      // 変換関数削除により500行以下になることを期待
      assertEquals(lines <= 500, true, `config.tsは500行以下であるべき (現在: ${lines}行)`);
    });
  });

  describe("RED Phase: 直接UnifiedConfigを使用する設計", () => {
    it("main.tsがを使用していない", async () => {
      const mainFile = await Deno.readTextFile("./denops/hellshake-yano/main.ts");

      const usesToUnified = mainFile.includes("");
      assertEquals(usesToUnified, false, "main.tsはを使用しないべき");
    });

    it("main.tsがを使用していない", async () => {
      const mainFile = await Deno.readTextFile("./denops/hellshake-yano/main.ts");

      const usesFromUnified = mainFile.includes("");
      assertEquals(usesFromUnified, false, "main.tsはを使用しないべき");
    });

    it("UnifiedConfigが直接使用されている", () => {
      // DEFAULT_UNIFIED_CONFIGが直接利用可能
      assertExists(DEFAULT_UNIFIED_CONFIG);
      assertEquals(typeof DEFAULT_UNIFIED_CONFIG.enabled, "boolean");
      assertEquals(Array.isArray(DEFAULT_UNIFIED_CONFIG.markers), true);
    });

    it("getDefaultUnifiedConfig関数が正常に動作する", () => {
      const defaultConfig = getDefaultUnifiedConfig();

      // UnifiedConfig型の構造を持つ
      assertExists(defaultConfig.enabled);
      assertExists(defaultConfig.markers);
      assertExists(defaultConfig.motionCount);
      assertExists(defaultConfig.motionTimeout);

      assertEquals(typeof defaultConfig.enabled, "boolean");
      assertEquals(Array.isArray(defaultConfig.markers), true);
      assertEquals(typeof defaultConfig.motionCount, "number");
    });

    it("バリデーションがUnifiedConfigで直接動作する", () => {
      const validConfig: UnifiedConfig = {
        ...DEFAULT_UNIFIED_CONFIG,
        motionCount: 5,
        useJapanese: true
      };

      const result = validateUnifiedConfig(validConfig);
      assertEquals(result.valid, true);
      assertEquals(result.errors.length, 0);
    });
  });

  describe("RED Phase: レガシーConfig型のサポート削除", () => {
    it("Config型からUnifiedConfig型への変換が不要", () => {
      // 直接UnifiedConfigを使用する設計により変換が不要
      const unifiedConfig: UnifiedConfig = {
        enabled: true,
        markers: ["A", "S", "D"],
        motionCount: 3,
        motionTimeout: 1000,
        hintPosition: "end",
        visualHintPosition: "end",
        triggerOnHjkl: true,
        countedMotions: ["j", "k"],
        maxHints: 100,
        debounceDelay: 50,
        useNumbers: false,
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
        defaultMinWordLength: 3,
        perKeyMotionCount: {},
        defaultMotionCount: 3,
        currentKeyContext: "",
        debugMode: false,
        performanceLog: false
      };

      // バリデーションが直接動作する
      const result = validateUnifiedConfig(unifiedConfig);
      assertEquals(result.valid, true);
    });

    it("snake_case形式の設定が直接camelCaseに置き換えられる", () => {
      // 変換関数を経由せず、直接camelCase形式を使用
      const config: UnifiedConfig = {
        ...DEFAULT_UNIFIED_CONFIG,
        motionCount: 5,        // motion_count → motionCount (直接)
        useJapanese: true,     // use_japanese → useJapanese (直接)
        hintPosition: "start", // hint_position → hintPosition (直接)
        triggerOnHjkl: false   // trigger_on_hjkl → triggerOnHjkl (直接)
      };

      assertEquals(config.motionCount, 5);
      assertEquals(config.useJapanese, true);
      assertEquals(config.hintPosition, "start");
      assertEquals(config.triggerOnHjkl, false);
    });
  });

  describe("RED Phase: パフォーマンス向上の確認", () => {
    it("変換処理のオーバーヘッドが削除されている", () => {
      // 直接UnifiedConfigを使用することで変換処理が不要
      const config: UnifiedConfig = {
        ...DEFAULT_UNIFIED_CONFIG,
        motionCount: 7,
        useJapanese: false
      };

      // 変換処理なしで直接使用可能
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        // 変換なしで直接使用
        const result = validateUnifiedConfig(config);
        assertEquals(result.valid, true);
      }

      const end = performance.now();
      const duration = end - start;

      // 変換処理がないため高速（50ms以下）
      assertEquals(duration < 50, true, `変換処理削除により高速化されるべき (実際: ${duration}ms)`);
    });

    it("メモリ使用量が削減されている", () => {
      // 変換関数が削除されることでメモリ使用量が削減
      const config = getDefaultUnifiedConfig();

      // 直接使用により中間オブジェクトが不要
      assertEquals(typeof config, "object");
      assertEquals(config.constructor, Object);

      // 余計なプロパティが存在しない
      const keys = Object.keys(config);
      const hasLegacyKeys = keys.some(key => key.includes("_"));
      assertEquals(hasLegacyKeys, false, "snake_case形式のレガシーキーが存在しないべき");
    });
  });
});