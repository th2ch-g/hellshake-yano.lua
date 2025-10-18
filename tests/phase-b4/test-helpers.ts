/**
 * Test Helpers for Phase B-4
 * REFACTORフェーズ: 共通のテストヘルパーとモックを抽出
 */
import type { Denops } from "jsr:@denops/std@7.4.0";

/**
 * Denopsモックの設定オプション
 */
export interface DenopsMockOptions {
  /** Denopsがロードされているか */
  denopsLoaded?: boolean;
  /** Denopsサーバーの状態 */
  denopsStatus?: "running" | "stopped";
  /** Neovimかどうか */
  isNeovim?: boolean;
  /** Vimバージョン */
  vimVersion?: number;
  /** レガシーモード強制フラグ */
  useLegacy?: boolean;
  /** 旧設定が存在するか */
  hasOldConfig?: boolean;
  /** 旧設定の内容 */
  oldConfig?: Record<string, unknown>;
  /** 新設定が存在するか */
  hasNewConfig?: boolean;
  /** 新設定の内容 */
  newConfig?: Record<string, unknown>;
  /** コマンドトラッカー */
  commandTracker?: string[];
  /** evalでエラーを発生させるか */
  throwOnEval?: boolean;
  /** cmdでエラーを発生させるか */
  throwOnCmd?: boolean;
}

/**
 * Denopsモックを作成
 *
 * @param options - モックの設定オプション
 * @returns モックDenopsインスタンス
 */
export function createDenopsMock(
  options: DenopsMockOptions = {},
): Denops {
  const {
    denopsLoaded = true,
    denopsStatus = "running",
    isNeovim = true,
    vimVersion = 800,
    useLegacy = false,
    hasOldConfig = false,
    oldConfig = {},
    hasNewConfig = false,
    newConfig = {},
    commandTracker = [],
    throwOnEval = false,
    throwOnCmd = false,
  } = options;

  return {
    eval: async (expr: string) => {
      if (throwOnEval) {
        throw new Error("eval failed");
      }

      if (expr === "exists('g:loaded_denops')") {
        return denopsLoaded ? 1 : 0;
      }
      if (expr === "denops#server#status()") {
        return denopsStatus;
      }
      if (expr === "has('nvim')") {
        return isNeovim ? 1 : 0;
      }
      if (expr === "v:version") {
        return vimVersion;
      }
      if (expr === "exists('g:hellshake_yano_use_legacy')") {
        return useLegacy ? 1 : 0;
      }
      if (expr === "exists('g:hellshake_yano_vim_config')") {
        return hasOldConfig ? 1 : 0;
      }
      if (expr === "g:hellshake_yano_vim_config") {
        return oldConfig;
      }
      if (expr === "exists('g:hellshake_yano')") {
        return hasNewConfig ? 1 : 0;
      }
      if (expr === "g:hellshake_yano") {
        return newConfig;
      }
      return undefined;
    },
    cmd: async (command: string) => {
      if (throwOnCmd) {
        throw new Error("cmd failed");
      }
      commandTracker.push(command);
    },
    call: async (_fn: string, ..._args: unknown[]) => {
      return undefined;
    },
  } as Denops;
}

/**
 * Denops利用可能環境のモックを作成
 */
export function createDenopsAvailableMock(
  commandTracker: string[] = [],
): Denops {
  return createDenopsMock({
    denopsLoaded: true,
    denopsStatus: "running",
    isNeovim: true,
    commandTracker,
  });
}

/**
 * Denops停止環境のモックを作成
 */
export function createDenopsStoppedMock(
  commandTracker: string[] = [],
): Denops {
  return createDenopsMock({
    denopsLoaded: true,
    denopsStatus: "stopped",
    isNeovim: true,
    commandTracker,
  });
}

/**
 * Denops不在環境のモックを作成
 */
export function createDenopsUnavailableMock(
  commandTracker: string[] = [],
): Denops {
  return createDenopsMock({
    denopsLoaded: false,
    isNeovim: true,
    commandTracker,
  });
}

/**
 * 設定マイグレーションテスト用のモックを作成
 */
export function createMigrationTestMock(
  oldConfigData: Record<string, unknown>,
  commandTracker: string[] = [],
): Denops {
  return createDenopsMock({
    denopsLoaded: true,
    denopsStatus: "running",
    isNeovim: true,
    hasOldConfig: true,
    oldConfig: oldConfigData,
    hasNewConfig: false,
    commandTracker,
  });
}

/**
 * 統合版コマンドが登録されているかチェック
 */
export function hasUnifiedCommands(commands: string[]): boolean {
  return commands.some(
    (cmd) => cmd.includes("denops#request") || cmd.includes("denops#notify"),
  );
}

/**
 * VimScriptコマンドが登録されているかチェック
 */
export function hasVimScriptCommands(commands: string[]): boolean {
  return commands.some((cmd) => cmd.includes("hellshake_yano_vim#"));
}

/**
 * 特定のコマンドが登録されているかチェック
 */
export function hasCommand(
  commands: string[],
  commandName: string,
): boolean {
  return commands.some((cmd) => cmd.includes(commandName));
}

/**
 * デフォルトの旧設定を作成
 */
export function createDefaultOldConfig(): Record<string, unknown> {
  return {
    hint_chars: "asdfghjkl",
    motion_threshold: 3,
    motion_timeout_ms: 2000,
    motion_enabled: true,
    use_japanese: false,
    max_hints: 49,
    min_word_length: 1,
  };
}

/**
 * カスタム旧設定を作成
 */
export function createCustomOldConfig(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ...createDefaultOldConfig(),
    ...overrides,
  };
}
