/**
 * Command Registry - Phase B-4 TDD Implementation
 * GREENフェーズ: テストを通すための最小実装
 *
 * @module command-registry
 */

import type { Denops } from "jsr:@denops/std@7.4.0";

/**
 * コマンド登録オプション
 */
export interface CommandRegistrationOptions {
  /** 既存コマンドを上書きするか */
  force?: boolean;
}

/**
 * コマンド定義
 */
interface CommandDefinition {
  /** コマンド名 */
  name: string;
  /** コマンドの実装 */
  impl: string;
  /** コマンドオプション（-range, -bufferなど） */
  options?: string;
}

/**
 * CommandRegistry - コマンド登録システム
 *
 * 統合版とVimScript版のコマンドを登録・管理する
 */
export class CommandRegistry {
  private denops: Denops;
  private registeredCommands: Set<string>;

  // コマンド定義を外部化（REFACTOR: 保守性向上）
  private static readonly UNIFIED_COMMANDS: CommandDefinition[] = [
    {
      name: "HellshakeYano",
      impl: "denops#request('hellshake-yano', 'showHints', [])",
      options: "-range",
    },
    {
      name: "HellshakeYanoWord",
      impl: "denops#request('hellshake-yano', 'showWordHints', [])",
      options: "-range",
    },
    {
      name: "HellshakeYanoJpWord",
      impl: "denops#request('hellshake-yano', 'showJpWordHints', [])",
      options: "-range",
    },
  ];

  private static readonly VIMSCRIPT_COMMANDS: CommandDefinition[] = [
    {
      name: "HellshakeYano",
      impl: "hellshake_yano_vim#show_hints()",
      options: "-range",
    },
    {
      name: "HellshakeYanoWord",
      impl: "hellshake_yano_vim#show_word_hints()",
      options: "-range",
    },
    {
      name: "HellshakeYanoJpWord",
      impl: "hellshake_yano_vim#show_jp_word_hints()",
      options: "-range",
    },
  ];

  constructor(denops: Denops) {
    this.denops = denops;
    this.registeredCommands = new Set<string>();
  }

  /**
   * 統合版コマンドを登録
   *
   * Denops経由でTypeScript実装を呼び出すコマンド
   */
  async registerUnifiedCommands(
    options: CommandRegistrationOptions = {}
  ): Promise<void> {
    await this.registerCommands(
      CommandRegistry.UNIFIED_COMMANDS,
      "unified",
      options
    );
  }

  /**
   * VimScript版コマンドを登録
   *
   * autoload関数を呼び出すコマンド（Denops不在時のフォールバック）
   */
  async registerVimScriptCommands(
    options: CommandRegistrationOptions = {}
  ): Promise<void> {
    await this.registerCommands(
      CommandRegistry.VIMSCRIPT_COMMANDS,
      "vimscript",
      options
    );
  }

  /**
   * コマンド登録の共通処理（REFACTOR: DRY原則）
   */
  private async registerCommands(
    commands: CommandDefinition[],
    type: "unified" | "vimscript",
    options: CommandRegistrationOptions
  ): Promise<void> {
    // エラーハンドリング強化
    if (this.registeredCommands.size > 0 && !options.force) {
      throw new Error("Commands already registered");
    }

    try {
      for (const cmd of commands) {
        const cmdStr = `command! ${cmd.options || ""} ${cmd.name} call ${
          cmd.impl
        }`;
        await this.denops.cmd(cmdStr);
        this.registeredCommands.add(cmd.name);
      }
    } catch (error) {
      // エラーハンドリング強化: 登録失敗時にロールバック
      this.registeredCommands.clear();
      throw new Error(
        `Failed to register ${type} commands: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * 登録済みコマンドのリストを取得
   *
   * @returns コマンド名の配列
   */
  getRegisteredCommands(): string[] {
    return Array.from(this.registeredCommands);
  }
}
