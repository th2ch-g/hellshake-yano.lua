/**
 * Initializer Test - Phase B-4 TDD Implementation
 * REDフェーズ: テストファースト実装
 *
 * テスト要件:
 * - Denops環境での初期化テスト（3ケース）
 * - VimScript環境での初期化テスト（3ケース）
 * - エラー時のフォールバックテスト（4ケース）
 */
import { assertEquals, assertRejects } from "jsr:@std/assert@1.0.9";
import { describe, it } from "jsr:@std/testing@1.0.7/bdd";
import type { Denops } from "jsr:@denops/std@7.4.0";

// 実装予定のInitializerをインポート
import { Initializer } from "../../denops/hellshake-yano/phase-b4/initializer.ts";

describe("Initializer", () => {
  describe("Denops environment initialization", () => {
    it("should initialize successfully with Denops available", async () => {
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "exists('g:loaded_denops')") return 1;
          if (expr === "denops#server#status()") return "running";
          if (expr === "has('nvim')") return 1;
          if (expr === "exists('g:hellshake_yano_use_legacy')") return 0;
          if (expr === "exists('g:hellshake_yano_vim_config')") return 0;
          if (expr === "exists('g:hellshake_yano')") return 0;
          return undefined;
        },
        cmd: async (_command: string) => {},
      } as Denops;

      const initializer = new Initializer(mockDenops);
      const result = await initializer.initialize();

      assertEquals(result.success, true);
      assertEquals(result.implementation, "denops-unified");
      assertEquals(result.migrated, false);
    });

    it("should migrate config during Denops initialization", async () => {
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "exists('g:loaded_denops')") return 1;
          if (expr === "denops#server#status()") return "running";
          if (expr === "has('nvim')") return 1;
          if (expr === "exists('g:hellshake_yano_use_legacy')") return 0;
          if (expr === "exists('g:hellshake_yano_vim_config')") return 1;
          if (expr.includes("g:hellshake_yano_vim_config")) {
            return { hint_chars: "aoeuidhtns", motion_enabled: 1 };
          }
          if (expr === "exists('g:hellshake_yano')") return 0;
          return undefined;
        },
        cmd: async (_command: string) => {},
        call: async (_fn: string, ..._args: unknown[]) => {},
      } as Denops;

      const initializer = new Initializer(mockDenops);
      const result = await initializer.initialize();

      assertEquals(result.success, true);
      assertEquals(result.migrated, true);
    });

    it("should register unified commands after initialization", async () => {
      const commands: string[] = [];
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "exists('g:loaded_denops')") return 1;
          if (expr === "denops#server#status()") return "running";
          if (expr === "has('nvim')") return 1;
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

      const hasUnifiedCommands = commands.some((cmd) => cmd.includes("denops#request"));
      assertEquals(hasUnifiedCommands, true);
    });
  });

  describe("VimScript environment initialization", () => {
    it("should fallback to VimScript when Denops not available", async () => {
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "exists('g:loaded_denops')") return 0;
          if (expr === "exists('g:hellshake_yano_vim_config')") return 0;
          if (expr === "exists('g:hellshake_yano')") return 0;
          return undefined;
        },
        cmd: async (_command: string) => {},
      } as Denops;

      const initializer = new Initializer(mockDenops);
      const result = await initializer.initialize();

      assertEquals(result.success, true);
      assertEquals(result.implementation, "vimscript-pure");
    });

    it("should register VimScript commands in fallback mode", async () => {
      const commands: string[] = [];
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "exists('g:loaded_denops')") return 0;
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

      const hasVimScriptCommands = commands.some((cmd) => cmd.includes("hellshake_yano_vim#"));
      assertEquals(hasVimScriptCommands, true);
    });

    it("should show warning when using legacy mode", async () => {
      const warnings: string[] = [];
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "exists('g:loaded_denops')") return 0;
          if (expr === "has('nvim')") return 1; // Neovimの場合に警告が出る
          if (expr === "exists('g:hellshake_yano_vim_config')") return 0;
          if (expr === "exists('g:hellshake_yano')") return 0;
          return undefined;
        },
        cmd: async (_command: string) => {},
        call: async (fn: string, ...args: unknown[]) => {
          if (fn === "hellshake_yano#utils#show_warning") {
            warnings.push(String(args[0]));
          }
        },
      } as Denops;

      const initializer = new Initializer(mockDenops);
      const result = await initializer.initialize();

      // Neovimでlegacy modeの場合、Denops推奨の警告が出る
      assertEquals(result.warnings.length > 0, true);
    });
  });

  describe("error handling and fallback", () => {
    it("should fallback when environment detection fails", async () => {
      const mockDenops = {
        eval: async (_expr: string): Promise<unknown> => {
          throw new Error("eval failed");
        },
        cmd: async (_command: string) => {},
      } as Denops;

      const initializer = new Initializer(mockDenops);
      const result = await initializer.initialize();

      // エラーでもフォールバックして成功
      assertEquals(result.success, true);
      assertEquals(result.implementation, "vimscript-pure");
    });

    it("should fallback when config migration fails", async () => {
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "exists('g:loaded_denops')") return 1;
          if (expr === "denops#server#status()") return "running";
          if (expr === "has('nvim')") return 1;
          if (expr === "exists('g:hellshake_yano_vim_config')") return 1;
          if (expr.includes("g:hellshake_yano_vim_config")) {
            throw new Error("config read failed");
          }
          return undefined;
        },
        cmd: async (_command: string) => {},
      } as Denops;

      const initializer = new Initializer(mockDenops);
      const result = await initializer.initialize();

      // マイグレーション失敗でもフォールバック
      assertEquals(result.success, true);
    });

    it("should recover when command registration fails partially", async () => {
      let cmdCount = 0;
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "exists('g:loaded_denops')") return 1;
          if (expr === "denops#server#status()") return "running";
          if (expr === "has('nvim')") return 1;
          if (expr === "exists('g:hellshake_yano_use_legacy')") return 0;
          if (expr === "exists('g:hellshake_yano_vim_config')") return 0;
          if (expr === "exists('g:hellshake_yano')") return 0;
          return undefined;
        },
        cmd: async (_command: string) => {
          cmdCount++;
          if (cmdCount === 2) {
            throw new Error("command registration failed");
          }
        },
      } as Denops;

      const initializer = new Initializer(mockDenops);
      const result = await initializer.initialize();

      // 部分的な失敗でもリカバリー
      assertEquals(result.success, true);
    });

    it("should collect all errors during initialization", async () => {
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "exists('g:loaded_denops')") return 1;
          if (expr === "denops#server#status()") return "running";
          if (expr === "has('nvim')") return 1;
          if (expr === "exists('g:hellshake_yano_vim_config')") return 1;
          if (expr.includes("g:hellshake_yano_vim_config")) {
            // 設定読み込みで無効なデータを返してマイグレーションエラーを引き起こす
            return { invalid_key: "this will cause error" };
          }
          if (expr === "exists('g:hellshake_yano')") return 0;
          if (expr === "exists('g:hellshake_yano_use_legacy')") return 0;
          return undefined;
        },
        cmd: async (command: string) => {
          // コマンド登録でエラーを起こす
          if (command.includes("HellshakeYanoWord")) {
            throw new Error("command registration failed");
          }
        },
      } as Denops;

      const initializer = new Initializer(mockDenops);
      const result = await initializer.initialize();

      // マイグレーションやコマンド登録でエラーが発生している
      assertEquals(result.errors.length > 0, true);
    });
  });

  describe("initialization steps", () => {
    it("should execute all steps in correct order", async () => {
      const steps: string[] = [];
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "exists('g:loaded_denops')") {
            steps.push("detect-denops");
            return 1;
          }
          if (expr === "denops#server#status()") {
            steps.push("check-status");
            return "running";
          }
          if (expr === "has('nvim')") {
            steps.push("check-editor");
            return 1;
          }
          if (expr === "exists('g:hellshake_yano_vim_config')") {
            steps.push("check-old-config");
            return 0;
          }
          if (expr === "exists('g:hellshake_yano')") {
            steps.push("check-new-config");
            return 0;
          }
          if (expr === "exists('g:hellshake_yano_use_legacy')") {
            steps.push("check-legacy-flag");
            return 0;
          }
          return undefined;
        },
        cmd: async (_command: string) => {
          steps.push("register-commands");
        },
      } as Denops;

      const initializer = new Initializer(mockDenops);
      await initializer.initialize();

      // ステップの順序を確認
      const detectIndex = steps.indexOf("detect-denops");
      const configIndex = steps.indexOf("check-old-config");
      const commandsIndex = steps.indexOf("register-commands");

      assertEquals(detectIndex < configIndex, true);
      assertEquals(configIndex < commandsIndex, true);
    });
  });
});
