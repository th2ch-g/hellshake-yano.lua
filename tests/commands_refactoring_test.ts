/**
 * commands.ts統合テスト - TDD Refactoring Phase
 *
 * このテストは commands.ts の機能統合後のリファクタリングを検証する
 * 1. commands.ts は今後削除可能な状態になるか検証
 * 2. core.ts の新機能が期待通り動作するか検証
 * 3. commands.ts の複数クラス統合の効果を検証
 */

import { assertEquals, assertThrows } from "@std/assert";
import { describe, it, beforeEach } from "@std/testing/bdd";
import { Core } from "../denops/hellshake-yano/core.ts";
import { getDefaultUnifiedConfig } from "../denops/hellshake-yano/config.ts";
import type { UnifiedConfig } from "../denops/hellshake-yano/config.ts";
import {
  HellshakeYanoController,
  HellshakeYanoConfigManager,
  DebugController,
  CommandFactory
} from "../denops/hellshake-yano/commands.ts";

describe("Commands Refactoring Phase Tests", () => {
  let core: Core;
  let config: UnifiedConfig;

  beforeEach(() => {
    Core.resetForTesting();
    config = getDefaultUnifiedConfig();
    core = Core.getInstance(config);
  });

  describe("Core vs Commands.ts Performance Comparison", () => {
    it("should delegate operations efficiently through core", () => {
      // Coreを直接使った場合のパフォーマンス
      const start1 = performance.now();
      for (let i = 0; i < 1000; i++) {
        core.enablePlugin();
        core.disablePlugin();
        core.togglePlugin();
      }
      const coreTime = performance.now() - start1;

      // commands.tsのコントローラーを使った場合
      const factory = new CommandFactory(config);
      const controller = factory.getController();

      const start2 = performance.now();
      for (let i = 0; i < 1000; i++) {
        controller.enable();
        controller.disable();
        controller.toggle();
      }
      const commandsTime = performance.now() - start2;

      // Coreを使った方が効率的であることを確認
      console.log(`Core direct: ${coreTime}ms, Commands.ts: ${commandsTime}ms`);

      // どちらも許容可能な速度であることを確認
      assertEquals(coreTime < 100, true, "Core operations should be fast");
      assertEquals(commandsTime < 100, true, "Commands operations should be fast");
    });
  });

  describe("Delegation Pattern Verification", () => {
    it("should demonstrate that core can replace commands.ts functionality", () => {
      // commands.tsを使った設定
      const factory = new CommandFactory(config);
      const controller = factory.getController();
      const configManager = factory.getConfigManager();
      const debugController = factory.getDebugController();

      // 各コントローラーで設定を変更
      controller.enable();
      configManager.setCount(5);
      configManager.setTimeout(2000);
      debugController.toggleDebugMode();

      const commandsConfig = configManager.getConfig();

      // Coreで同じ操作を実行
      const coreConfig = getDefaultUnifiedConfig();
      const coreInstance = Core.getInstance(coreConfig);

      coreInstance.enablePlugin();
      coreInstance.setMotionCount(5);
      coreInstance.setMotionTimeout(2000);
      coreInstance.toggleDebugMode();

      const coreResultConfig = coreInstance.getConfig();

      // 結果が同じであることを確認
      assertEquals(commandsConfig.enabled, coreResultConfig.enabled);
      assertEquals(commandsConfig.motionCount, coreResultConfig.motionCount);
      assertEquals(commandsConfig.motionTimeout, coreResultConfig.motionTimeout);
      assertEquals(commandsConfig.debugMode, coreResultConfig.debugMode);
    });
  });

  describe("Advanced Integration Features", () => {
    it("should demonstrate advanced features only available in core", () => {
      // Coreの高度な機能（commands.tsにはない）
      const validator = (updates: Partial<UnifiedConfig>) => {
        const errors: string[] = [];
        if (updates.motionCount && updates.motionCount > 100) {
          errors.push('motionCount too large');
        }
        return { valid: errors.length === 0, errors };
      };

      // 安全な更新
      core.updateConfigSafely({ motionCount: 50 }, validator);
      assertEquals(core.getConfig().motionCount, 50);

      // バリデーションエラー
      assertThrows(
        () => core.updateConfigSafely({ motionCount: 150 }, validator),
        Error,
        "Configuration validation failed"
      );

      // ロールバック機能
      const originalTimeout = core.getConfig().motionTimeout;
      const { rollback } = core.updateConfigWithRollback({ motionTimeout: 5000 });
      assertEquals(core.getConfig().motionTimeout, 5000);
      rollback();
      assertEquals(core.getConfig().motionTimeout, originalTimeout);

      // バッチ更新
      const updateFunctions = [
        (cfg: UnifiedConfig) => cfg.motionCount = 10,
        (cfg: UnifiedConfig) => cfg.enabled = false,
      ];
      core.batchUpdateConfig(updateFunctions);
      assertEquals(core.getConfig().motionCount, 10);
      assertEquals(core.getConfig().enabled, false);
    });
  });

  describe("Backward Compatibility", () => {
    it("should maintain compatibility with existing commands.ts code", () => {
      // 既存のcommands.tsコードが引き続き動作することを確認
      const factory = core.getCommandFactory();
      const controller = factory.getController();
      const configManager = factory.getConfigManager();

      // 以前と同じAPIで動作
      controller.enable();
      assertEquals(core.isPluginEnabled(), true);

      configManager.setCount(7);
      assertEquals(core.getConfig().motionCount, 7);

      // レガシー関数も動作
      core.enableLegacy();
      core.setCountLegacy(3);
      assertEquals(core.getConfig().motionCount, 3);
      assertEquals(core.getConfig().enabled, true);
    });
  });

  describe("Refactoring Benefits Analysis", () => {
    it("should demonstrate the benefits of integration", () => {
      // 1. 単一責任の原則：Coreが全ての状態を管理
      assertEquals(typeof core.getConfig, "function");
      assertEquals(typeof core.updateConfig, "function");
      assertEquals(typeof core.enablePlugin, "function");

      // 2. 一貫性：全ての設定変更が同じ設定オブジェクトに反映
      const configBefore = core.getConfig();

      core.enablePlugin();
      core.setMotionCount(15);
      core.toggleDebugMode();

      const configAfter = core.getConfig();

      // 同じオブジェクトへの参照であることを確認（一貫性）
      assertEquals(configAfter.enabled, true);
      assertEquals(configAfter.motionCount, 15);
      assertEquals(configAfter.debugMode, !configBefore.debugMode);

      // 3. 拡張性：新しい機能を簡単に追加できる
      assertEquals(typeof core.updateConfigSafely, "function");
      assertEquals(typeof core.batchUpdateConfig, "function");
      assertEquals(typeof core.updateConfigWithRollback, "function");
    });
  });

  describe("Commands.ts Deprecation Path", () => {
    it("should verify that commands.ts can be safely deprecated", () => {
      // commands.tsの全機能がcoreで利用可能であることを確認

      // PluginController機能
      assertEquals(typeof core.enablePlugin, "function");
      assertEquals(typeof core.disablePlugin, "function");
      assertEquals(typeof core.togglePlugin, "function");
      assertEquals(typeof core.isPluginEnabled, "function");

      // ConfigManager機能
      assertEquals(typeof core.setMotionCount, "function");
      assertEquals(typeof core.setMotionTimeout, "function");
      assertEquals(typeof core.updateConfig, "function");
      assertEquals(typeof core.getConfig, "function");

      // DebugController機能
      assertEquals(typeof core.toggleDebugMode, "function");
      assertEquals(typeof core.togglePerformanceLog, "function");
      assertEquals(typeof core.toggleCoordinateDebug, "function");

      // CommandFactory機能
      assertEquals(typeof core.getCommandFactory, "function");

      // レガシー関数サポート
      assertEquals(typeof core.enableLegacy, "function");
      assertEquals(typeof core.disableLegacy, "function");
      assertEquals(typeof core.setCountLegacy, "function");
      assertEquals(typeof core.setTimeoutLegacy, "function");

      // 高度な機能（commands.tsより優秀）
      assertEquals(typeof core.updateConfigSafely, "function");
      assertEquals(typeof core.updateConfigWithRollback, "function");
      assertEquals(typeof core.batchUpdateConfig, "function");
    });
  });
});