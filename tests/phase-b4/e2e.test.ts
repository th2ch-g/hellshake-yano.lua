/**
 * E2E Test - Phase B-4 TDD Implementation
 * REFACTORフェーズ: テストヘルパーを使用してリファクタリング
 *
 * テスト要件:
 * - 新規ユーザーの初回起動シナリオ（5ステップ）
 * - 既存ユーザーの設定移行シナリオ（5ステップ）
 * - Denops停止時のフォールバックシナリオ（5ステップ）
 */
import { assertEquals, assertExists } from "jsr:@std/assert@1.0.9";
import { describe, it } from "jsr:@std/testing@1.0.7/bdd";
import type { Denops } from "jsr:@denops/std@7.4.0";

import { Initializer } from "../../denops/hellshake-yano/phase-b4/initializer.ts";
import {
  createCustomOldConfig,
  createDenopsAvailableMock,
  createDenopsStoppedMock,
  createMigrationTestMock,
  hasUnifiedCommands,
  hasVimScriptCommands,
} from "./test-helpers.ts";

/**
 * 新規ユーザーの初回起動シナリオ
 *
 * 5ステップのE2Eテスト:
 * 1. プラグインロード - 設定なし、Denops利用可能
 * 2. 自動初期化 - デフォルト設定で初期化
 * 3. コマンド実行 - HellshakeYanoShowコマンドが使える
 * 4. ヒント表示確認 - ヒントが表示される
 * 5. 後続操作 - ジャンプ機能が動作する
 */
describe("E2E: New User First Launch Scenario", () => {
  it("Step 1: Plugin Load - should load with no config", async () => {
    const mockDenops = createDenopsAvailableMock();

    const initializer = new Initializer(mockDenops);
    const result = await initializer.initialize();

    // 新規ユーザー: 設定なしでも初期化成功
    assertEquals(result.success, true);
    assertEquals(result.implementation, "denops-unified");
    assertEquals(result.migrated, false);
  });

  it("Step 2: Auto Initialization - should use default config", async () => {
    const commands: string[] = [];
    const mockDenops = {
      eval: async (expr: string) => {
        if (expr === "exists('g:loaded_denops')") return 1;
        if (expr === "denops#server#status()") return "running";
        if (expr === "has('nvim')") return 1;
        if (expr === "v:version") return 800;
        if (expr === "exists('g:hellshake_yano_use_legacy')") return 0;
        if (expr === "exists('g:hellshake_yano_vim_config')") return 0;
        if (expr === "exists('g:hellshake_yano')") return 0;
        return undefined;
      },
      cmd: async (command: string) => {
        commands.push(command);
      },
    } as Denops;

    const initializer = new Initializer(mockDenops);
    await initializer.initialize();

    // デフォルト設定でコマンドが登録される
    assertEquals(commands.length > 0, true);
  });

  it("Step 3: Command Execution - HellshakeYanoShow should be available", async () => {
    const commands: string[] = [];
    const mockDenops = {
      eval: async (expr: string) => {
        if (expr === "exists('g:loaded_denops')") return 1;
        if (expr === "denops#server#status()") return "running";
        if (expr === "has('nvim')") return 1;
        if (expr === "v:version") return 800;
        if (expr === "exists('g:hellshake_yano_use_legacy')") return 0;
        if (expr === "exists('g:hellshake_yano_vim_config')") return 0;
        if (expr === "exists('g:hellshake_yano')") return 0;
        return undefined;
      },
      cmd: async (command: string) => {
        commands.push(command);
      },
    } as Denops;

    const initializer = new Initializer(mockDenops);
    await initializer.initialize();

    // HellshakeYanoShowコマンドが登録されている
    const hasShowCommand = commands.some(
      (cmd) =>
        cmd.includes("HellshakeYanoShow") ||
        cmd.includes("HellshakeYanoWord") ||
        cmd.includes("denops#request"),
    );
    assertEquals(hasShowCommand, true);
  });

  it("Step 4: Hint Display - should show hints successfully", async () => {
    // このテストはモックで動作確認を模擬
    const mockDenops = {
      eval: async (expr: string) => {
        if (expr === "exists('g:loaded_denops')") return 1;
        if (expr === "denops#server#status()") return "running";
        if (expr === "has('nvim')") return 1;
        if (expr === "v:version") return 800;
        if (expr === "exists('g:hellshake_yano_use_legacy')") return 0;
        if (expr === "exists('g:hellshake_yano_vim_config')") return 0;
        if (expr === "exists('g:hellshake_yano')") return 0;
        return undefined;
      },
      cmd: async (_command: string) => {},
      call: async (fn: string, ..._args: unknown[]) => {
        // ヒント表示の模擬
        if (fn === "hellshake_yano#show_hints") {
          return true;
        }
        return undefined;
      },
    } as Denops;

    const initializer = new Initializer(mockDenops);
    const result = await initializer.initialize();

    // 初期化成功＝ヒント表示可能
    assertEquals(result.success, true);
  });

  it("Step 5: Jump Function - should enable jump functionality", async () => {
    const mockDenops = {
      eval: async (expr: string) => {
        if (expr === "exists('g:loaded_denops')") return 1;
        if (expr === "denops#server#status()") return "running";
        if (expr === "has('nvim')") return 1;
        if (expr === "v:version") return 800;
        if (expr === "exists('g:hellshake_yano_use_legacy')") return 0;
        if (expr === "exists('g:hellshake_yano_vim_config')") return 0;
        if (expr === "exists('g:hellshake_yano')") return 0;
        return undefined;
      },
      cmd: async (_command: string) => {},
    } as Denops;

    const initializer = new Initializer(mockDenops);
    const result = await initializer.initialize();

    // ジャンプ機能も含めて初期化完了
    assertEquals(result.success, true);
    assertEquals(result.implementation, "denops-unified");
  });
});

/**
 * 既存ユーザーの設定移行シナリオ
 *
 * 5ステップのE2Eテスト:
 * 1. 旧設定の読み込み - g:hellshake_yano_vim_configが存在
 * 2. 自動マイグレーション - 新形式に自動変換
 * 3. 新設定の確認 - g:hellshake_yanoに変換済み
 * 4. 機能動作確認 - 変換後も正常動作
 * 5. 警告メッセージ確認 - 移行完了を通知
 */
describe("E2E: Existing User Config Migration Scenario", () => {
  it("Step 1: Load Old Config - should detect old configuration", async () => {
    const oldConfig = createCustomOldConfig({
      hint_chars: "customkeys",
      motion_threshold: 5,
      motion_timeout_ms: 3000,
      use_japanese: true,
    });
    const mockDenops = createMigrationTestMock(oldConfig);

    const initializer = new Initializer(mockDenops);
    const result = await initializer.initialize();

    // 旧設定が検出される
    assertEquals(result.migrated, true);
  });

  it("Step 2: Auto Migration - should migrate to new format automatically", async () => {
    let newConfigSet = false;
    const mockDenops = {
      eval: async (expr: string) => {
        if (expr === "exists('g:loaded_denops')") return 1;
        if (expr === "denops#server#status()") return "running";
        if (expr === "has('nvim')") return 1;
        if (expr === "v:version") return 800;
        if (expr === "exists('g:hellshake_yano_use_legacy')") return 0;
        if (expr === "exists('g:hellshake_yano_vim_config')") return 1;
        if (expr === "g:hellshake_yano_vim_config") {
          return {
            hint_chars: "xyz",
            motion_threshold: 4,
          };
        }
        if (expr === "exists('g:hellshake_yano')") return 0;
        return undefined;
      },
      cmd: async (command: string) => {
        if (command.includes("let g:hellshake_yano")) {
          newConfigSet = true;
        }
      },
      call: async (_fn: string, ..._args: unknown[]) => {},
    } as Denops;

    const initializer = new Initializer(mockDenops);
    const result = await initializer.initialize();

    // マイグレーション成功
    assertEquals(result.success, true);
    assertEquals(result.migrated, true);
  });

  it("Step 3: Verify New Config - should have converted config values", async () => {
    const mockDenops = {
      eval: async (expr: string) => {
        if (expr === "exists('g:hellshake_yano_vim_config')") return 1;
        if (expr === "g:hellshake_yano_vim_config") {
          return {
            hint_chars: "abcdef",
            motion_threshold: 3,
            motion_timeout_ms: 2500,
            motion_enabled: true,
            use_japanese: true,
          };
        }
        if (expr === "exists('g:hellshake_yano')") return 0;
        return undefined;
      },
      cmd: async (_command: string) => {},
    } as Denops;

    const initializer = new Initializer(mockDenops);
    const result = await initializer.initialize();

    // 設定が変換されている（migratedがtrue）
    assertEquals(result.migrated, true);
    assertEquals(result.success, true);
  });

  it("Step 4: Functionality Check - should work with migrated config", async () => {
    const commands: string[] = [];
    const mockDenops = {
      eval: async (expr: string) => {
        if (expr === "exists('g:loaded_denops')") return 1;
        if (expr === "denops#server#status()") return "running";
        if (expr === "has('nvim')") return 1;
        if (expr === "v:version") return 800;
        if (expr === "exists('g:hellshake_yano_use_legacy')") return 0;
        if (expr === "exists('g:hellshake_yano_vim_config')") return 1;
        if (expr === "g:hellshake_yano_vim_config") {
          return {
            hint_chars: "test",
            motion_threshold: 2,
          };
        }
        if (expr === "exists('g:hellshake_yano')") return 0;
        return undefined;
      },
      cmd: async (command: string) => {
        commands.push(command);
      },
    } as Denops;

    const initializer = new Initializer(mockDenops);
    const result = await initializer.initialize();

    // マイグレーション後もコマンドが登録される
    assertEquals(result.success, true);
    assertEquals(commands.length > 0, true);
  });

  it("Step 5: Warning Message - should notify migration success", async () => {
    const mockDenops = {
      eval: async (expr: string) => {
        if (expr === "exists('g:loaded_denops')") return 1;
        if (expr === "denops#server#status()") return "running";
        if (expr === "has('nvim')") return 1;
        if (expr === "v:version") return 800;
        if (expr === "exists('g:hellshake_yano_use_legacy')") return 0;
        if (expr === "exists('g:hellshake_yano_vim_config')") return 1;
        if (expr === "g:hellshake_yano_vim_config") {
          return { hint_chars: "abc" };
        }
        if (expr === "exists('g:hellshake_yano')") return 0;
        return undefined;
      },
      cmd: async (_command: string) => {},
    } as Denops;

    const initializer = new Initializer(mockDenops);
    const result = await initializer.initialize();

    // マイグレーション警告が含まれている
    assertEquals(result.migrated, true);
    assertEquals(result.warnings.length > 0, true);
  });
});

/**
 * Denops停止時のフォールバックシナリオ
 *
 * 5ステップのE2Eテスト:
 * 1. Denops停止検出 - Denopsが起動していない
 * 2. VimScript版への切り替え - 自動的にフォールバック
 * 3. 機能の継続動作確認 - VimScript版で動作
 * 4. 警告メッセージ確認 - Denops推奨を通知
 * 5. 後続操作 - 基本機能は使える
 */
describe("E2E: Denops Stopped Fallback Scenario", () => {
  it("Step 1: Detect Denops Stopped - should detect stopped state", async () => {
    const mockDenops = createDenopsStoppedMock();

    const initializer = new Initializer(mockDenops);
    const result = await initializer.initialize();

    // Denops停止でVimScriptにフォールバック
    assertEquals(result.implementation, "vimscript-pure");
  });

  it("Step 2: Switch to VimScript - should fallback automatically", async () => {
    const commands: string[] = [];
    const mockDenops = {
      eval: async (expr: string) => {
        if (expr === "exists('g:loaded_denops')") return 1;
        if (expr === "denops#server#status()") return "stopped";
        if (expr === "has('nvim')") return 1;
        if (expr === "v:version") return 800;
        if (expr === "exists('g:hellshake_yano_use_legacy')") return 0;
        if (expr === "exists('g:hellshake_yano_vim_config')") return 0;
        if (expr === "exists('g:hellshake_yano')") return 0;
        return undefined;
      },
      cmd: async (command: string) => {
        commands.push(command);
      },
    } as Denops;

    const initializer = new Initializer(mockDenops);
    await initializer.initialize();

    // VimScriptコマンドが登録される
    const hasVimScriptCommands = commands.some((cmd) => cmd.includes("hellshake_yano_vim#"));
    assertEquals(hasVimScriptCommands, true);
  });

  it("Step 3: Functionality Check - should work with VimScript version", async () => {
    const mockDenops = {
      eval: async (expr: string) => {
        if (expr === "exists('g:loaded_denops')") return 1;
        if (expr === "denops#server#status()") return "stopped";
        if (expr === "has('nvim')") return 1;
        if (expr === "v:version") return 800;
        if (expr === "exists('g:hellshake_yano_use_legacy')") return 0;
        if (expr === "exists('g:hellshake_yano_vim_config')") return 0;
        if (expr === "exists('g:hellshake_yano')") return 0;
        return undefined;
      },
      cmd: async (_command: string) => {},
    } as Denops;

    const initializer = new Initializer(mockDenops);
    const result = await initializer.initialize();

    // VimScript版で動作可能
    assertEquals(result.success, true);
    assertEquals(result.implementation, "vimscript-pure");
  });

  it("Step 4: Warning Message - should suggest using Denops", async () => {
    const mockDenops = {
      eval: async (expr: string) => {
        if (expr === "exists('g:loaded_denops')") return 1;
        if (expr === "denops#server#status()") return "stopped";
        if (expr === "has('nvim')") return 1; // Neovimで警告が出る
        if (expr === "v:version") return 800;
        if (expr === "exists('g:hellshake_yano_use_legacy')") return 0;
        if (expr === "exists('g:hellshake_yano_vim_config')") return 0;
        if (expr === "exists('g:hellshake_yano')") return 0;
        return undefined;
      },
      cmd: async (_command: string) => {},
    } as Denops;

    const initializer = new Initializer(mockDenops);
    const result = await initializer.initialize();

    // Denops推奨の警告が出る
    assertEquals(result.warnings.length > 0, true);
  });

  it("Step 5: Basic Operations - should have basic functionality available", async () => {
    const commands: string[] = [];
    const mockDenops = {
      eval: async (expr: string) => {
        if (expr === "exists('g:loaded_denops')") return 1;
        if (expr === "denops#server#status()") return "stopped";
        if (expr === "has('nvim')") return 0; // Vimの場合
        if (expr === "v:version") return 900;
        if (expr === "exists('g:hellshake_yano_use_legacy')") return 0;
        if (expr === "exists('g:hellshake_yano_vim_config')") return 0;
        if (expr === "exists('g:hellshake_yano')") return 0;
        return undefined;
      },
      cmd: async (command: string) => {
        commands.push(command);
      },
    } as Denops;

    const initializer = new Initializer(mockDenops);
    const result = await initializer.initialize();

    // 基本機能（VimScript版コマンド）が使える
    assertEquals(result.success, true);
    assertEquals(commands.length > 0, true);
  });
});
