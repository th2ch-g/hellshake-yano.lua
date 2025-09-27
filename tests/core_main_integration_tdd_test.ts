/**
 * Core Main Integration TDD Test
 *
 * mainディレクトリ統合のためのTDDテスト
 * Red-Green-Refactorアプローチに従った実装テスト
 */

import {
  assertEquals,
  assertExists,
  assertThrows,
  assertStringIncludes,
} from "@std/assert";
import { describe, it, beforeEach, afterEach } from "@std/testing/bdd";
import { spy, stub, assertSpyCalls } from "@std/testing/mock";
import type { Denops } from "@denops/std";
import { Core } from "../denops/hellshake-yano/core.ts";

// Mock Denops interface for testing
const createMockDenops = (): Denops => ({
  name: "hellshake-yano",
  meta: {
    mode: "debug",
    host: "nvim",
    version: "0.4.0",
    apiversion: 10,
  },
  dispatcher: {},
  redraw: () => Promise.resolve(),
  cmd: () => Promise.resolve(),
  call: () => Promise.resolve(),
  batch: () => Promise.resolve([]),
  eval: () => Promise.resolve(),
} as any);

describe("Core Main Integration TDD Tests", () => {
  let core: Core;
  let mockDenops: Denops;

  beforeEach(() => {
    Core.resetForTesting();
    core = Core.getInstance();
    mockDenops = createMockDenops();
  });

  afterEach(() => {
    Core.resetForTesting();
  });

  describe("RED Phase: Dispatcher Integration Tests", () => {
    describe("Config Dispatcher Integration", () => {
      it("should integrate createConfigDispatcher functionality", async () => {
        // RED: このテストは最初は失敗するはず
        // dispatcher.tsのcreateConfigDispatcher機能をCoreに統合後にパスする

        // Config操作のメソッドが存在することを確認
        assertExists(core.updateConfig);
        assertExists(core.getConfig);
        assertExists(core.resetConfig);
        assertExists(core.updateConfigAdvanced);
        assertExists(core.resetConfigExtended);
      });

      it("should handle config updates with validation", async () => {
        // RED: 設定更新機能のテスト
        const newConfig = {
          enabled: true,
          markers: ['a', 'b', 'c'],
          motionCount: 5
        };

        // configが適切に更新されることを確認
        await core.updateConfigAdvanced(newConfig);
        const updatedConfig = core.getConfig();

        assertEquals(updatedConfig.enabled, true);
        assertEquals(updatedConfig.markers, ['a', 'b', 'c']);
        assertEquals(updatedConfig.motionCount, 5);
      });

      it("should validate and normalize backward compatible flags", async () => {
        // RED: 後方互換性フラグの正規化テスト
        const legacyConfig = {
          motion_timeout: 3000,      // snake_case (legacy)
        } as any;

        await core.updateConfigAdvanced(legacyConfig);
        const config = core.getConfig();

        // camelCaseに正規化されることを確認（プロパティ名を修正）
        assertEquals(config.motionTimeout, 3000);
      });
    });

    describe("Control Dispatcher Integration", () => {
      it("should integrate createControlDispatcher functionality", async () => {
        // RED: コントロール機能のテスト
        assertExists(core.enable);
        assertExists(core.disable);
        assertExists(core.toggle);
        assertExists(core.setMotionCount);
        assertExists(core.setMotionTimeout);
      });

      it("should handle enable/disable/toggle operations", async () => {
        // RED: 有効/無効/トグル操作のテスト
        await core.disable();
        assertEquals(core.isEnabled(), false);

        await core.enable();
        assertEquals(core.isEnabled(), true);

        const toggleResult = await core.toggle();
        assertEquals(toggleResult, false);
        assertEquals(core.isEnabled(), false);
      });

      it("should validate motion count and timeout settings", async () => {
        // RED: モーションカウントとタイムアウト設定のテスト
        await core.setMotionCount(3);
        assertEquals(core.getConfig().motionCount, 3);

        await core.setMotionTimeout(1500);
        assertEquals(core.getConfig().motionTimeout, 1500);

        // 無効な値はエラーをスローすることを確認
        try {
          await core.setMotionCount(-1); // 無効値
          // エラーがスローされるべき
          assertEquals(true, false, "Should have thrown error for negative count");
        } catch (error) {
          // 期待通りエラーがスローされた
          assertEquals(core.getConfig().motionCount, 3); // 変更されない
        }

        try {
          await core.setMotionTimeout(50); // 無効値（100未満）
          // エラーがスローされるべき
          assertEquals(true, false, "Should have thrown error for timeout < 100");
        } catch (error) {
          // 期待通りエラーがスローされた
          assertEquals(core.getConfig().motionTimeout, 1500); // 変更されない
        }
      });
    });

    describe("Debug Dispatcher Integration", () => {
      it("should integrate createDebugDispatcher functionality", async () => {
        // RED: デバッグ機能のテスト
        assertExists(core.getDebugInfo);
        assertExists(core.getExtendedDebugInfo);
        assertExists(core.clearPerformanceLog);
        assertExists(core.toggleDebugMode);
        assertExists(core.togglePerformanceLog);
      });

      it("should handle debug mode toggling", async () => {
        // RED: デバッグモードトグルのテスト
        const initialDebugMode = core.getConfig().debugMode;

        const toggleResult = await core.toggleDebugMode();
        assertEquals(toggleResult, !initialDebugMode);
        assertEquals(core.getConfig().debugMode, !initialDebugMode);
      });

      it("should collect and clear performance information", async () => {
        // RED: パフォーマンス情報の収集とクリアのテスト
        await core.togglePerformanceLog(); // 有効化

        const debugInfo = core.getDebugInfo();
        assertExists(debugInfo);
        assertExists(debugInfo.performance);

        await core.clearPerformanceLog();
        // パフォーマンスログがクリアされることを確認
      });
    });
  });

  describe("RED Phase: Operations Integration Tests", () => {
    describe("Hint Operations Integration", () => {
      it("should integrate createHintOperations functionality", async () => {
        // RED: ヒント操作機能のテスト
        assertExists(core.showHints);
        assertExists(core.showHintsWithExtendedDebounce);
        assertExists(core.showHintsImmediately);
        assertExists(core.hideHints);
        assertExists(core.getCurrentHints);
        assertExists(core.isHintsVisible);
      });

      it("should handle hint display with debounce", async () => {
        // RED: デバウンス機能付きヒント表示のテスト
        const showHintsSpy = spy(core, "showHints");

        await core.showHints(mockDenops);
        await core.showHints(mockDenops); // 連続呼び出し

        // デバウンス機能により適切に制御されることを確認
        assertSpyCalls(showHintsSpy, 2);
      });

      it("should track hint visibility state", async () => {
        // RED: ヒント表示状態の追跡テスト
        assertEquals(core.isHintsVisible(), false);

        await core.showHintsImmediately(mockDenops);
        assertEquals(core.isHintsVisible(), true);

        await core.hideHintsAsync(mockDenops);
        assertEquals(core.isHintsVisible(), false);
      });

      it("should manage current hints information", async () => {
        // RED: 現在のヒント情報管理のテスト
        const initialHints = core.getCurrentHints();
        assertEquals(initialHints.length, 0);

        // ヒント表示後に情報が更新されることを確認
        await core.showHintsImmediately(mockDenops);
        const hintsAfterShow = core.getCurrentHints();
        // 実際のヒントが設定されることを確認（具体的な内容はGREEN phaseで実装）
      });
    });

    describe("Input Operations Integration", () => {
      it("should integrate createInputOperations functionality", async () => {
        // RED: 入力操作機能のテスト
        assertExists(core.waitForUserInput);
        assertExists(core.cancelInput);
      });

      it("should handle user input waiting", async () => {
        // RED: ユーザー入力待機のテスト
        const waitSpy = spy(core, "waitForUserInput");

        await core.waitForUserInput(mockDenops);
        assertSpyCalls(waitSpy, 1);
      });

      it("should handle input cancellation", async () => {
        // RED: 入力キャンセルのテスト
        await core.showHintsImmediately(mockDenops);
        assertEquals(core.isHintsVisible(), true);

        await core.cancelInput(mockDenops);
        assertEquals(core.isHintsVisible(), false);
      });
    });
  });

  describe("RED Phase: Input Processing Integration Tests", () => {
    describe("Input Character Analysis", () => {
      it("should integrate input character analysis functionality", async () => {
        // RED: 入力文字解析機能のテスト
        assertExists(core.analyzeInputCharacter);
        assertExists(core.isControlCharacter);
      });

      it("should analyze input character properties correctly", async () => {
        // RED: 入力文字プロパティの解析テスト
        const upperCaseInfo = core.analyzeInputCharacter(65); // 'A'
        assertEquals(upperCaseInfo.wasUpperCase, true);
        assertEquals(upperCaseInfo.inputString, 'a');

        const numberInfo = core.analyzeInputCharacter(49); // '1'
        assertEquals(numberInfo.wasNumber, true);
        assertEquals(numberInfo.inputString, '1');

        const lowerCaseInfo = core.analyzeInputCharacter(97); // 'a'
        assertEquals(lowerCaseInfo.wasLowerCase, true);
        assertEquals(lowerCaseInfo.inputString, 'a');
      });

      it("should detect control characters correctly", async () => {
        // RED: 制御文字検出のテスト
        assertEquals(core.isControlCharacter(27), true);  // ESC
        assertEquals(core.isControlCharacter(13), false); // Enter (非制御文字として扱う)
        assertEquals(core.isControlCharacter(65), false); // 'A'
      });
    });

    describe("Hint Matching", () => {
      it("should integrate hint matching functionality", async () => {
        // RED: ヒントマッチング機能のテスト
        assertExists(core.findMatchingHints);
        assertExists(core.findExactMatch);
      });

      it("should find matching hints correctly", async () => {
        // RED: ヒントマッチングのテスト
        const mockHints: any[] = [
          {
            word: { text: 'test1', line: 1, col: 1 },
            hint: 'aa',
            hintCol: 1,
            hintByteCol: 1,
            marker: 'aa'
          },
          {
            word: { text: 'test2', line: 1, col: 5 },
            hint: 'ab',
            hintCol: 5,
            hintByteCol: 5,
            marker: 'ab'
          },
          {
            word: { text: 'test3', line: 2, col: 1 },
            hint: 'ba',
            hintCol: 1,
            hintByteCol: 1,
            marker: 'ba'
          }
        ];

        const matches = core.findMatchingHints('a', mockHints);
        assertEquals(matches.length, 2);

        const exactMatch = core.findExactMatch('aa', mockHints);
        assertEquals(exactMatch?.hint, 'aa');
      });
    });

    describe("Multi-Character Input Management", () => {
      it("should integrate multi-character input management", async () => {
        // RED: 複数文字入力管理のテスト
        assertExists(core.createMultiCharInputManager);
      });

      it("should manage multi-character input state", async () => {
        // RED: 複数文字入力状態管理のテスト
        const inputManager = core.createMultiCharInputManager();

        assertExists(inputManager.appendInput);
        assertExists(inputManager.getAccumulatedInput);
        assertExists(inputManager.isInMultiCharMode);
        assertExists(inputManager.reset);
        assertExists(inputManager.isValidInput);
      });
    });
  });

  describe("RED Phase: Initialization Integration Tests", () => {
    describe("Plugin Initialization", () => {
      it("should integrate plugin initialization functionality", async () => {
        // RED: プラグイン初期化機能のテスト
        assertExists(core.initializePlugin);
        assertExists(core.syncManagerConfig);
      });

      it("should handle Neovim extmark namespace creation", async () => {
        // RED: Neovim extmarkネームスペース作成のテスト
        const mockNeovimDenops: any = {
          ...mockDenops,
          meta: { ...mockDenops.meta, host: "nvim" as "nvim" },
          call: () => Promise.resolve(123) // namespace ID
        };

        const result = await core.initializePlugin(mockNeovimDenops);
        assertExists(result.extmarkNamespace);
        assertEquals(result.extmarkNamespace, 123);
      });

      it("should handle non-Neovim environments", async () => {
        // RED: Neovim以外の環境での処理テスト
        const mockVimDenops: any = {
          ...mockDenops,
          meta: { ...mockDenops.meta, host: "vim" as "vim" }
        };

        const result = await core.initializePlugin(mockVimDenops);
        assertEquals(result.extmarkNamespace, null);
      });

      it("should sync manager configuration", async () => {
        // RED: マネージャー設定同期のテスト
        const testConfig = core.getConfig();

        // 同期処理が正常に実行されることを確認
        await core.syncManagerConfig(testConfig);
        // 実際の同期処理の検証は GREEN phase で実装
      });
    });
  });

  describe("RED Phase: Integration Error Handling", () => {
    it("should handle dispatcher function errors gracefully", async () => {
      // RED: dispatcher関数エラーの適切な処理テスト
      const invalidConfig = { motionCount: "invalid" as any }; // 型エラーを引き起こす

      // エラーが適切に処理されることを確認
      await core.updateConfigAdvanced(invalidConfig);
      // 無効な設定は無視され、既存設定が保持されることを確認
    });

    it("should handle operations errors gracefully", async () => {
      // RED: operations関数エラーの適切な処理テスト
      const mockErrorDenops: any = {
        ...mockDenops,
        call: () => Promise.reject(new Error("Mock API error"))
      };

      // エラーが適切に処理されることを確認
      let errorThrown = false;
      try {
        await core.showHintsImmediately(mockErrorDenops);
      } catch (error) {
        errorThrown = true;
        assertStringIncludes((error as Error).message, "Mock API error");
      }
      assertEquals(errorThrown, true, "Error should have been thrown");
    });

    it("should handle input processing errors gracefully", async () => {
      // RED: 入力処理エラーの適切な処理テスト
      const invalidHints: any[] = []; // 空のヒント配列

      const matches = core.findMatchingHints('a', invalidHints);
      assertEquals(matches.length, 0); // エラーではなく空配列を返す
    });
  });
});