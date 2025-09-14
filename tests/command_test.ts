/**
 * コマンド機能のテスト
 * Process 10のVimコマンド機能をテストします
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.221.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.221.0/testing/bdd.ts";

// Vimコマンドのモック実装
class CommandManager {
  private enabled = true;
  private motionCount = 3;
  private motionTimeout = 2000;
  private hintsVisible = false;
  private debugInfo: Record<string, any> = {};

  // :HellshakeYanoEnable
  enable(): string {
    this.enabled = true;
    return "[hellshake-yano] Enabled";
  }

  // :HellshakeYanoDisable
  disable(): string {
    this.enabled = false;
    if (this.hintsVisible) {
      this.hintsVisible = false;
    }
    return "[hellshake-yano] Disabled";
  }

  // :HellshakeYanoToggle
  toggle(): string {
    if (this.enabled) {
      return this.disable();
    } else {
      return this.enable();
    }
  }

  // :HellshakeYanoShow
  show(): string {
    if (!this.enabled) {
      return "[hellshake-yano] Plugin is disabled";
    }
    this.hintsVisible = true;
    return "[hellshake-yano] Hints shown";
  }

  // :HellshakeYanoHide
  hide(): string {
    this.hintsVisible = false;
    return "[hellshake-yano] Hints hidden";
  }

  // :HellshakeYanoSetCount
  setCount(count: number): string {
    if (count <= 0) {
      throw new Error("[hellshake-yano] Count must be greater than 0");
    }
    this.motionCount = count;
    return `[hellshake-yano] Motion count set to ${count}`;
  }

  // :HellshakeYanoSetTimeout
  setTimeout(timeout: number): string {
    if (timeout <= 0) {
      throw new Error("[hellshake-yano] Timeout must be greater than 0");
    }
    this.motionTimeout = timeout;
    return `[hellshake-yano] Timeout set to ${timeout}ms`;
  }

  // 状態を取得（テスト用）
  getState() {
    return {
      enabled: this.enabled,
      motionCount: this.motionCount,
      motionTimeout: this.motionTimeout,
      hintsVisible: this.hintsVisible,
    };
  }

  // デバッグ情報を取得
  getDebugInfo(): string[] {
    return [
      "=== hellshake-yano Debug Info ===",
      `Enabled: ${this.enabled}`,
      `Motion count threshold: ${this.motionCount}`,
      `Timeout: ${this.motionTimeout}ms`,
      `Hints visible: ${this.hintsVisible}`,
    ];
  }
}

describe("Command Tests", () => {
  describe("Enable/Disable Commands", () => {
    it("should enable the plugin", () => {
      const cmd = new CommandManager();
      const result = cmd.enable();

      assertEquals(result, "[hellshake-yano] Enabled");
      assertEquals(cmd.getState().enabled, true);
    });

    it("should disable the plugin", () => {
      const cmd = new CommandManager();
      const result = cmd.disable();

      assertEquals(result, "[hellshake-yano] Disabled");
      assertEquals(cmd.getState().enabled, false);
    });

    it("should hide hints when disabling", () => {
      const cmd = new CommandManager();
      cmd.show(); // まずヒントを表示
      assertEquals(cmd.getState().hintsVisible, true);

      cmd.disable();
      assertEquals(cmd.getState().enabled, false);
      assertEquals(cmd.getState().hintsVisible, false);
    });

    it("should toggle plugin state", () => {
      const cmd = new CommandManager();

      // 初期状態: enabled
      assertEquals(cmd.getState().enabled, true);

      // 無効化
      const result1 = cmd.toggle();
      assertEquals(result1, "[hellshake-yano] Disabled");
      assertEquals(cmd.getState().enabled, false);

      // 有効化
      const result2 = cmd.toggle();
      assertEquals(result2, "[hellshake-yano] Enabled");
      assertEquals(cmd.getState().enabled, true);
    });
  });

  describe("Show/Hide Commands", () => {
    it("should show hints when enabled", () => {
      const cmd = new CommandManager();
      const result = cmd.show();

      assertEquals(result, "[hellshake-yano] Hints shown");
      assertEquals(cmd.getState().hintsVisible, true);
    });

    it("should not show hints when disabled", () => {
      const cmd = new CommandManager();
      cmd.disable();
      const result = cmd.show();

      assertEquals(result, "[hellshake-yano] Plugin is disabled");
      assertEquals(cmd.getState().hintsVisible, false);
    });

    it("should hide hints", () => {
      const cmd = new CommandManager();
      cmd.show(); // まずヒントを表示
      assertEquals(cmd.getState().hintsVisible, true);

      const result = cmd.hide();
      assertEquals(result, "[hellshake-yano] Hints hidden");
      assertEquals(cmd.getState().hintsVisible, false);
    });

    it("should hide hints even when already hidden", () => {
      const cmd = new CommandManager();
      assertEquals(cmd.getState().hintsVisible, false);

      const result = cmd.hide();
      assertEquals(result, "[hellshake-yano] Hints hidden");
      assertEquals(cmd.getState().hintsVisible, false);
    });
  });

  describe("SetCount Command", () => {
    it("should set motion count to valid values", () => {
      const cmd = new CommandManager();

      const result1 = cmd.setCount(1);
      assertEquals(result1, "[hellshake-yano] Motion count set to 1");
      assertEquals(cmd.getState().motionCount, 1);

      const result2 = cmd.setCount(5);
      assertEquals(result2, "[hellshake-yano] Motion count set to 5");
      assertEquals(cmd.getState().motionCount, 5);

      const result3 = cmd.setCount(10);
      assertEquals(result3, "[hellshake-yano] Motion count set to 10");
      assertEquals(cmd.getState().motionCount, 10);
    });

    it("should reject invalid motion count values", () => {
      const cmd = new CommandManager();

      // 0以下の値
      try {
        cmd.setCount(0);
        throw new Error("Should have thrown");
      } catch (e) {
        assertEquals((e as Error).message, "[hellshake-yano] Count must be greater than 0");
      }

      try {
        cmd.setCount(-1);
        throw new Error("Should have thrown");
      } catch (e) {
        assertEquals((e as Error).message, "[hellshake-yano] Count must be greater than 0");
      }

      // 値が変更されていないことを確認
      assertEquals(cmd.getState().motionCount, 3); // デフォルト値
    });

    it("should handle large motion count values", () => {
      const cmd = new CommandManager();

      const result = cmd.setCount(999);
      assertEquals(result, "[hellshake-yano] Motion count set to 999");
      assertEquals(cmd.getState().motionCount, 999);
    });
  });

  describe("SetTimeout Command", () => {
    it("should set timeout to valid values", () => {
      const cmd = new CommandManager();

      const result1 = cmd.setTimeout(100);
      assertEquals(result1, "[hellshake-yano] Timeout set to 100ms");
      assertEquals(cmd.getState().motionTimeout, 100);

      const result2 = cmd.setTimeout(1000);
      assertEquals(result2, "[hellshake-yano] Timeout set to 1000ms");
      assertEquals(cmd.getState().motionTimeout, 1000);

      const result3 = cmd.setTimeout(5000);
      assertEquals(result3, "[hellshake-yano] Timeout set to 5000ms");
      assertEquals(cmd.getState().motionTimeout, 5000);
    });

    it("should reject invalid timeout values", () => {
      const cmd = new CommandManager();

      // 0以下の値
      try {
        cmd.setTimeout(0);
        throw new Error("Should have thrown");
      } catch (e) {
        assertEquals((e as Error).message, "[hellshake-yano] Timeout must be greater than 0");
      }

      try {
        cmd.setTimeout(-100);
        throw new Error("Should have thrown");
      } catch (e) {
        assertEquals((e as Error).message, "[hellshake-yano] Timeout must be greater than 0");
      }

      // 値が変更されていないことを確認
      assertEquals(cmd.getState().motionTimeout, 2000); // デフォルト値
    });

    it("should handle large timeout values", () => {
      const cmd = new CommandManager();

      const result = cmd.setTimeout(60000);
      assertEquals(result, "[hellshake-yano] Timeout set to 60000ms");
      assertEquals(cmd.getState().motionTimeout, 60000);
    });
  });

  describe("Command Combinations", () => {
    it("should handle multiple command executions", () => {
      const cmd = new CommandManager();

      // 複数のコマンドを順番に実行
      cmd.setCount(5);
      cmd.setTimeout(3000);
      cmd.show();

      const state = cmd.getState();
      assertEquals(state.motionCount, 5);
      assertEquals(state.motionTimeout, 3000);
      assertEquals(state.hintsVisible, true);
      assertEquals(state.enabled, true);
    });

    it("should maintain state across enable/disable cycles", () => {
      const cmd = new CommandManager();

      // 設定を変更
      cmd.setCount(7);
      cmd.setTimeout(1500);

      // 無効化
      cmd.disable();
      assertEquals(cmd.getState().enabled, false);
      assertEquals(cmd.getState().motionCount, 7); // 設定は保持
      assertEquals(cmd.getState().motionTimeout, 1500); // 設定は保持

      // 再度有効化
      cmd.enable();
      assertEquals(cmd.getState().enabled, true);
      assertEquals(cmd.getState().motionCount, 7); // 設定は保持
      assertEquals(cmd.getState().motionTimeout, 1500); // 設定は保持
    });

    it("should handle rapid toggle operations", () => {
      const cmd = new CommandManager();

      // 連続してトグル
      cmd.toggle(); // disabled
      cmd.toggle(); // enabled
      cmd.toggle(); // disabled
      cmd.toggle(); // enabled

      assertEquals(cmd.getState().enabled, true);
    });
  });

  describe("Debug Information", () => {
    it("should provide debug information", () => {
      const cmd = new CommandManager();
      cmd.setCount(4);
      cmd.setTimeout(1234);
      cmd.show();

      const debugInfo = cmd.getDebugInfo();

      assertEquals(debugInfo[0], "=== hellshake-yano Debug Info ===");
      assertEquals(debugInfo[1], "Enabled: true");
      assertEquals(debugInfo[2], "Motion count threshold: 4");
      assertEquals(debugInfo[3], "Timeout: 1234ms");
      assertEquals(debugInfo[4], "Hints visible: true");
    });

    it("should update debug info when state changes", () => {
      const cmd = new CommandManager();

      // 初期状態
      let debugInfo = cmd.getDebugInfo();
      assertEquals(debugInfo[1], "Enabled: true");

      // 無効化後
      cmd.disable();
      debugInfo = cmd.getDebugInfo();
      assertEquals(debugInfo[1], "Enabled: false");
    });
  });

  describe("Edge Cases", () => {
    it("should handle decimal values for setCount", () => {
      const cmd = new CommandManager();

      // 小数点は整数として扱われることを想定
      const result = cmd.setCount(3.5);
      assertEquals(result, "[hellshake-yano] Motion count set to 3.5");
      assertEquals(cmd.getState().motionCount, 3.5);
    });

    it("should handle decimal values for setTimeout", () => {
      const cmd = new CommandManager();

      // 小数点のミリ秒も許可
      const result = cmd.setTimeout(1500.5);
      assertEquals(result, "[hellshake-yano] Timeout set to 1500.5ms");
      assertEquals(cmd.getState().motionTimeout, 1500.5);
    });

    it("should handle very small positive values", () => {
      const cmd = new CommandManager();

      const result1 = cmd.setCount(1);
      assertEquals(result1, "[hellshake-yano] Motion count set to 1");

      const result2 = cmd.setTimeout(1);
      assertEquals(result2, "[hellshake-yano] Timeout set to 1ms");
    });
  });
});
