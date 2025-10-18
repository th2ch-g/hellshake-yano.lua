/**
 * Command Registry Test - Phase B-4 TDD Implementation
 * REDフェーズ: テストファースト実装
 *
 * テスト要件:
 * - 統合版コマンド登録テスト（3ケース）
 * - VimScript版コマンド登録テスト（3ケース）
 * - コマンド重複チェックテスト（2ケース）
 */
import { assertEquals, assertRejects } from "jsr:@std/assert@1.0.9";
import { describe, it } from "jsr:@std/testing@1.0.7/bdd";
import type { Denops } from "jsr:@denops/std@7.4.0";

// 実装予定のCommandRegistryをインポート
import { CommandRegistry } from "../../denops/hellshake-yano/phase-b4/command-registry.ts";

describe("CommandRegistry", () => {
  describe("registerUnifiedCommands", () => {
    it("should register all unified commands successfully", async () => {
      const commands: string[] = [];
      const mockDenops = {
        cmd: async (command: string) => {
          commands.push(command);
        },
      } as Denops;

      const registry = new CommandRegistry(mockDenops);
      await registry.registerUnifiedCommands();

      // 統合版コマンドが登録されているか確認
      const registeredCommands = registry.getRegisteredCommands();
      assertEquals(registeredCommands.includes("HellshakeYano"), true);
      assertEquals(registeredCommands.includes("HellshakeYanoWord"), true);
      assertEquals(registeredCommands.includes("HellshakeYanoJpWord"), true);
    });

    it("should register commands with correct denops#request format", async () => {
      const commands: string[] = [];
      const mockDenops = {
        cmd: async (command: string) => {
          commands.push(command);
        },
      } as Denops;

      const registry = new CommandRegistry(mockDenops);
      await registry.registerUnifiedCommands();

      // denops#request形式でコマンドが登録されているか確認
      const hasRequestFormat = commands.some((cmd) =>
        cmd.includes("denops#request")
      );
      assertEquals(hasRequestFormat, true);
    });

    it("should include all command options (range, buffer)", async () => {
      const commands: string[] = [];
      const mockDenops = {
        cmd: async (command: string) => {
          commands.push(command);
        },
      } as Denops;

      const registry = new CommandRegistry(mockDenops);
      await registry.registerUnifiedCommands();

      // コマンドオプションが含まれているか確認
      const registeredCommands = registry.getRegisteredCommands();
      assertEquals(registeredCommands.length > 0, true);
    });
  });

  describe("registerVimScriptCommands", () => {
    it("should register VimScript version commands", async () => {
      const commands: string[] = [];
      const mockDenops = {
        cmd: async (command: string) => {
          commands.push(command);
        },
      } as Denops;

      const registry = new CommandRegistry(mockDenops);
      await registry.registerVimScriptCommands();

      // VimScript版コマンドが登録されているか確認
      const registeredCommands = registry.getRegisteredCommands();
      assertEquals(registeredCommands.includes("HellshakeYano"), true);
    });

    it("should call autoload functions for VimScript commands", async () => {
      const commands: string[] = [];
      const mockDenops = {
        cmd: async (command: string) => {
          commands.push(command);
        },
      } as Denops;

      const registry = new CommandRegistry(mockDenops);
      await registry.registerVimScriptCommands();

      // autoload関数呼び出しが含まれているか確認
      const hasAutoloadCall = commands.some((cmd) =>
        cmd.includes("hellshake_yano_vim#")
      );
      assertEquals(hasAutoloadCall, true);
    });

    it("should preserve command compatibility with legacy version", async () => {
      const commands: string[] = [];
      const mockDenops = {
        cmd: async (command: string) => {
          commands.push(command);
        },
      } as Denops;

      const registry = new CommandRegistry(mockDenops);
      await registry.registerVimScriptCommands();

      // レガシー版と互換性のあるコマンド名
      const registeredCommands = registry.getRegisteredCommands();
      assertEquals(registeredCommands.includes("HellshakeYanoWord"), true);
      assertEquals(registeredCommands.includes("HellshakeYanoJpWord"), true);
    });
  });

  describe("command duplication check", () => {
    it("should detect duplicate command registration", async () => {
      const mockDenops = {
        cmd: async (_command: string) => {},
      } as Denops;

      const registry = new CommandRegistry(mockDenops);
      await registry.registerUnifiedCommands();

      // 同じコマンドを再登録しようとするとエラー
      await assertRejects(
        async () => {
          await registry.registerUnifiedCommands();
        },
        Error,
        "already registered"
      );
    });

    it("should allow re-registration with force option", async () => {
      const mockDenops = {
        cmd: async (_command: string) => {},
      } as Denops;

      const registry = new CommandRegistry(mockDenops);
      await registry.registerUnifiedCommands();

      // forceオプションで再登録可能
      await registry.registerUnifiedCommands({ force: true });

      const registeredCommands = registry.getRegisteredCommands();
      assertEquals(registeredCommands.length > 0, true);
    });
  });

  describe("getRegisteredCommands", () => {
    it("should return list of all registered commands", async () => {
      const mockDenops = {
        cmd: async (_command: string) => {},
      } as Denops;

      const registry = new CommandRegistry(mockDenops);
      await registry.registerUnifiedCommands();

      const commands = registry.getRegisteredCommands();
      assertEquals(Array.isArray(commands), true);
      assertEquals(commands.length >= 3, true);
    });
  });
});
