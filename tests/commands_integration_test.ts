/**
 * commands.ts統合テスト - TDD Red-Green-Refactor
 *
 * このテストは commands.ts の全機能が core.ts に統合されることを確認する
 *
 * Phase: RED - 失敗するテストを先に作成
 */

import { assertEquals, assertThrows } from "@std/assert";
import { describe, it, beforeEach } from "@std/testing/bdd";
import { Core } from "../denops/hellshake-yano/core.ts";
import { getDefaultUnifiedConfig } from "../denops/hellshake-yano/config.ts";
import type { UnifiedConfig } from "../denops/hellshake-yano/config.ts";

describe("Commands Integration Tests - TDD Red Phase", () => {
  let core: Core;
  let config: UnifiedConfig;

  beforeEach(() => {
    // テスト間の分離
    Core.resetForTesting();
    config = getDefaultUnifiedConfig();
    core = Core.getInstance(config);
  });

  describe("Plugin Controller Methods", () => {
    it("should enable plugin via core.enablePlugin()", () => {
      // RED: この方法はまだ実装されていない
      core.enablePlugin();
      assertEquals(core.isPluginEnabled(), true);
    });

    it("should disable plugin via core.disablePlugin()", () => {
      // RED: この方法はまだ実装されていない
      core.disablePlugin();
      assertEquals(core.isPluginEnabled(), false);
    });

    it("should toggle plugin state via core.togglePlugin()", () => {
      // RED: この方法はまだ実装されていない
      const initialState = core.isPluginEnabled();
      const newState = core.togglePlugin();
      assertEquals(newState, !initialState);
      assertEquals(core.isPluginEnabled(), !initialState);
    });

    it("should check plugin enabled state via core.isPluginEnabled()", () => {
      // RED: この方法はまだ実装されていない
      const isEnabled = core.isPluginEnabled();
      assertEquals(typeof isEnabled, "boolean");
    });
  });

  describe("Config Manager Methods", () => {
    it("should set motion count via core.setMotionCount()", () => {
      // RED: この方法はまだ実装されていない
      core.setMotionCount(5);
      const currentConfig = core.getConfig();
      assertEquals(currentConfig.motionCount, 5);
    });

    it("should throw error for invalid motion count", () => {
      // RED: この方法はまだ実装されていない
      assertThrows(
        () => core.setMotionCount(-1),
        Error,
        "count must be a positive integer"
      );
    });

    it("should set motion timeout via core.setMotionTimeout()", () => {
      // RED: この方法はまだ実装されていない
      core.setMotionTimeout(2000);
      const currentConfig = core.getConfig();
      assertEquals(currentConfig.motionTimeout, 2000);
    });

    it("should throw error for invalid timeout", () => {
      // RED: この方法はまだ実装されていない
      assertThrows(
        () => core.setMotionTimeout(50),
        Error,
        "timeout must be an integer >= 100ms"
      );
    });

    it("should update config partially via core.updateConfig()", () => {
      // RED: この方法はまだ実装されていない
      const updates = { motionCount: 10, enabled: false };
      core.updateConfig(updates);
      const currentConfig = core.getConfig();
      assertEquals(currentConfig.motionCount, 10);
      assertEquals(currentConfig.enabled, false);
    });
  });

  describe("Debug Controller Methods", () => {
    it("should toggle debug mode via core.toggleDebugMode()", () => {
      // RED: この方法はまだ実装されていない
      const initialDebugMode = core.getConfig().debugMode;
      const newDebugMode = core.toggleDebugMode();
      assertEquals(newDebugMode, !initialDebugMode);
      assertEquals(core.getConfig().debugMode, !initialDebugMode);
    });

    it("should toggle performance log via core.togglePerformanceLog()", () => {
      // RED: この方法はまだ実装されていない
      const initialPerformanceLog = core.getConfig().performanceLog;
      const newPerformanceLog = core.togglePerformanceLog();
      assertEquals(newPerformanceLog, !initialPerformanceLog);
      assertEquals(core.getConfig().performanceLog, !initialPerformanceLog);
    });

    it("should toggle coordinate debug via core.toggleCoordinateDebug()", () => {
      // RED: この方法はまだ実装されていない
      const initialCoordinateDebug = core.getConfig().debugCoordinates;
      const newCoordinateDebug = core.toggleCoordinateDebug();
      assertEquals(newCoordinateDebug, !initialCoordinateDebug);
      assertEquals(core.getConfig().debugCoordinates, !initialCoordinateDebug);
    });
  });

  describe("Command Factory Integration", () => {
    it("should access command factory via core.getCommandFactory()", () => {
      // RED: この方法はまだ実装されていない
      const factory = core.getCommandFactory();
      assertEquals(typeof factory.getController, "function");
      assertEquals(typeof factory.getConfigManager, "function");
      assertEquals(typeof factory.getDebugController, "function");
    });

    it("should use factory controller methods", () => {
      // RED: この方法はまだ実装されていない
      const factory = core.getCommandFactory();
      const controller = factory.getController();

      controller.enable();
      assertEquals(core.isPluginEnabled(), true);

      controller.disable();
      assertEquals(core.isPluginEnabled(), false);
    });
  });

  describe("Advanced Config Operations", () => {
    it("should support safe config update with validation", () => {
      // RED: この方法はまだ実装されていない
      const validator = (updates: Partial<UnifiedConfig>) => {
        const errors: string[] = [];
        if (updates.motionCount && updates.motionCount <= 0) {
          errors.push('motionCount must be positive');
        }
        return { valid: errors.length === 0, errors };
      };

      core.updateConfigSafely({ motionCount: 5 }, validator);
      assertEquals(core.getConfig().motionCount, 5);

      assertThrows(
        () => core.updateConfigSafely({ motionCount: -1 }, validator),
        Error,
        "Configuration validation failed"
      );
    });

    it("should support config update with rollback", () => {
      // RED: この方法はまだ実装されていない
      const originalCount = core.getConfig().motionCount;
      const { rollback } = core.updateConfigWithRollback({ motionCount: 10 });

      assertEquals(core.getConfig().motionCount, 10);
      rollback();
      assertEquals(core.getConfig().motionCount, originalCount);
    });

    it("should support batch config updates", () => {
      // RED: この方法はまだ実装されていない
      const updateFunctions = [
        (cfg: UnifiedConfig) => cfg.motionCount = 5,
        (cfg: UnifiedConfig) => cfg.motionTimeout = 3000,
        (cfg: UnifiedConfig) => cfg.enabled = false
      ];

      core.batchUpdateConfig(updateFunctions);
      const config = core.getConfig();
      assertEquals(config.motionCount, 5);
      assertEquals(config.motionTimeout, 3000);
      assertEquals(config.enabled, false);
    });

    it("should rollback all changes if batch update fails", () => {
      // RED: この方法はまだ実装されていない
      const originalConfig = { ...core.getConfig() };
      const errorFunctions = [
        (cfg: UnifiedConfig) => cfg.motionCount = 5,
        () => { throw new Error('Update failed'); },
        (cfg: UnifiedConfig) => cfg.enabled = false
      ];

      assertThrows(
        () => core.batchUpdateConfig(errorFunctions),
        Error,
        "Update failed"
      );

      // 設定は元に戻っている必要がある
      const currentConfig = core.getConfig();
      assertEquals(currentConfig.motionCount, originalConfig.motionCount);
      assertEquals(currentConfig.enabled, originalConfig.enabled);
    });
  });

  describe("Legacy Function Support", () => {
    it("should still support legacy enable/disable functions through core", () => {
      // RED: この方法はまだ実装されていない
      core.enableLegacy();
      assertEquals(core.getConfig().enabled, true);

      core.disableLegacy();
      assertEquals(core.getConfig().enabled, false);
    });

    it("should support legacy setCount and setTimeout functions", () => {
      // RED: この方法はまだ実装されていない
      core.setCountLegacy(7);
      assertEquals(core.getConfig().motionCount, 7);

      core.setTimeoutLegacy(5000);
      assertEquals(core.getConfig().motionTimeout, 5000);
    });
  });
});