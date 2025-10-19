/**
 * Integration Test - Phase B-4 TDD Implementation
 * REFACTORフェーズ: テストヘルパーを使用してリファクタリング
 *
 * テスト要件:
 * - 完全な初期化フロー（Denops環境）テスト（5ステップ）
 * - フォールバックフロー（Denops不可）テスト（5ステップ）
 * - エラーリカバリーテスト（5ステップ）
 */
import { assertEquals, assertExists } from "jsr:@std/assert@1.0.9";
import { describe, it } from "jsr:@std/testing@1.0.7/bdd";
import type { Denops } from "jsr:@denops/std@7.4.0";

import { Initializer } from "../../denops/hellshake-yano/integration/initializer.ts";
import { EnvironmentDetector } from "../../denops/hellshake-yano/integration/environment-detector.ts";
import { ConfigMigrator } from "../../denops/hellshake-yano/vim/config/config-migrator.ts";
import { ImplementationSelector } from "../../denops/hellshake-yano/integration/implementation-selector.ts";
import { CommandRegistry } from "../../denops/hellshake-yano/integration/command-registry.ts";
import {
  createCustomOldConfig,
  createDenopsAvailableMock,
  createDenopsMock,
  createDenopsStoppedMock,
  createDenopsUnavailableMock,
  createMigrationTestMock,
  hasUnifiedCommands,
  hasVimScriptCommands,
} from "./test-helpers.ts";

/**
 * 完全な初期化フローテスト（Denops環境）
 *
 * 5ステップの統合テスト:
 * 1. 環境判定 → Denops利用可能を検出
 * 2. 設定マイグレーション → 旧設定を新設定に変換
 * 3. 実装選択 → denops-unifiedを選択
 * 4. コマンド登録 → 統合版コマンドを登録
 * 5. マッピング設定 → 統合版マッピングを設定
 */
describe("Integration: Complete Initialization Flow (Denops Environment)", () => {
  it("Step 1: Environment Detection - should detect Denops availability", async () => {
    const mockDenops = createDenopsAvailableMock();

    const detector = new EnvironmentDetector(mockDenops);
    const denopsStatus = await detector.isDenopsAvailable();
    const editorInfo = await detector.getEditorInfo();

    assertEquals(denopsStatus.available, true);
    assertEquals(denopsStatus.running, true);
    assertEquals(editorInfo.type, "neovim");
  });

  it("Step 2: Config Migration - should migrate old config to new format", async () => {
    const oldConfig = createCustomOldConfig({
      hint_chars: "asdfghjkl",
      motion_threshold: 3,
      motion_timeout_ms: 2000,
      motion_enabled: true,
      use_japanese: false,
    });
    const mockDenops = createMigrationTestMock(oldConfig);

    const migrator = new ConfigMigrator(mockDenops);
    const result = await migrator.migrate();

    assertEquals(result.status, "migrated");
    assertExists(result.migratedConfig);
    assertEquals(result.migratedConfig?.markers?.length, 9);
    assertEquals(result.migratedConfig?.motionCount, 3);
    assertEquals(result.migratedConfig?.motionTimeout, 2000);
  });

  it("Step 3: Implementation Selection - should select denops-unified", async () => {
    const mockDenops = {
      eval: async (expr: string) => {
        if (expr === "exists('g:loaded_denops')") return 1;
        if (expr === "denops#server#status()") return "running";
        if (expr === "has('nvim')") return 1;
        if (expr === "v:version") return 800;
        if (expr === "exists('g:hellshake_yano_use_legacy')") return 0;
        return undefined;
      },
    } as Denops;

    const detector = new EnvironmentDetector(mockDenops);
    const selector = new ImplementationSelector(mockDenops);
    const envDetails = await detector.getEnvironmentDetails();
    const result = await selector.select({ environment: envDetails });

    assertEquals(result.implementation, "denops-unified");
    assertEquals(result.reason, "Denops is available and running");
  });

  it("Step 4: Command Registration - should register unified commands", async () => {
    const commands: string[] = [];
    const mockDenops = createDenopsAvailableMock(commands);

    const registry = new CommandRegistry(mockDenops);
    await registry.registerUnifiedCommands();

    // 統合版コマンドが登録されている
    assertEquals(hasUnifiedCommands(commands), true);
  });

  it("Step 5: Complete Flow - should initialize successfully end-to-end", async () => {
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
          return { hint_chars: "abc", motion_threshold: 2 };
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

    // 初期化成功
    assertEquals(result.success, true);
    assertEquals(result.implementation, "denops-unified");
    assertEquals(result.migrated, true);
    // 統合版コマンドが登録されている
    assertEquals(commands.length > 0, true);
  });
});

/**
 * フォールバックフローテスト（Denops不可）
 *
 * 5ステップの統合テスト:
 * 1. 環境判定 → Denops利用不可を検出
 * 2. VimScript版へのフォールバック決定
 * 3. 警告メッセージの確認
 * 4. VimScriptコマンドの登録
 * 5. フォールバック完了確認
 */
describe("Integration: Fallback Flow (Denops Unavailable)", () => {
  it("Step 1: Environment Detection - should detect Denops unavailability", async () => {
    const mockDenops = createDenopsUnavailableMock();

    const detector = new EnvironmentDetector(mockDenops);
    const denopsStatus = await detector.isDenopsAvailable();

    assertEquals(denopsStatus.available, false);
    assertEquals(denopsStatus.running, false);
  });

  it("Step 2: Implementation Selection - should fallback to vimscript-pure", async () => {
    const mockDenops = {
      eval: async (expr: string) => {
        if (expr === "exists('g:loaded_denops')") return 0;
        if (expr === "has('nvim')") return 1;
        if (expr === "v:version") return 800;
        if (expr === "exists('g:hellshake_yano_use_legacy')") return 0;
        return undefined;
      },
    } as Denops;

    const detector = new EnvironmentDetector(mockDenops);
    const selector = new ImplementationSelector(mockDenops);
    const envDetails = await detector.getEnvironmentDetails();
    const result = await selector.select({ environment: envDetails });

    assertEquals(result.implementation, "vimscript-pure");
    assertEquals(result.warnings.length > 0, true);
  });

  it("Step 3: Warning Messages - should show appropriate warnings", async () => {
    const mockDenops = {
      eval: async (expr: string) => {
        if (expr === "exists('g:loaded_denops')") return 0;
        if (expr === "has('nvim')") return 1; // Neovimで警告が出る
        if (expr === "v:version") return 800;
        if (expr === "exists('g:hellshake_yano_use_legacy')") return 0;
        return undefined;
      },
    } as Denops;

    const detector = new EnvironmentDetector(mockDenops);
    const selector = new ImplementationSelector(mockDenops);
    const envDetails = await detector.getEnvironmentDetails();
    const result = await selector.select({ environment: envDetails });

    // NeovimでDenopsが無い場合、警告が出る
    assertEquals(result.warnings.length > 0, true);
    const warningText = result.warnings.join(" ");
    assertEquals(
      warningText.includes("Denops") || warningText.includes("limited"),
      true,
    );
  });

  it("Step 4: VimScript Command Registration - should register fallback commands", async () => {
    const commands: string[] = [];
    const mockDenops = createDenopsUnavailableMock(commands);

    const registry = new CommandRegistry(mockDenops);
    await registry.registerVimScriptCommands();

    // VimScriptコマンドが登録されている
    assertEquals(hasVimScriptCommands(commands), true);
  });

  it("Step 5: Complete Fallback Flow - should initialize with fallback", async () => {
    const commands: string[] = [];
    const mockDenops = {
      eval: async (expr: string) => {
        if (expr === "exists('g:loaded_denops')") return 0;
        if (expr === "has('nvim')") return 1;
        if (expr === "v:version") return 800;
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

    // フォールバック成功
    assertEquals(result.success, true);
    assertEquals(result.implementation, "vimscript-pure");
    assertEquals(result.warnings.length > 0, true);
    // VimScriptコマンドが登録されている
    assertEquals(commands.length > 0, true);
  });
});
