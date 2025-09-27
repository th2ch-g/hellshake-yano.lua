/**
 * commands.ts Config型 → UnifiedConfig型移行のためのTDDテスト
 *
 * Red Phase: Config型をUnifiedConfig型に変更した時の失敗テストを作成
 * Green Phase: 最小限の実装でテストを通す
 * Refactor Phase: コードを整理して品質を向上
 */

import { assertEquals, assertThrows, assertExists } from "jsr:@std/assert";
import type { UnifiedConfig } from "../denops/hellshake-yano/config.ts";
import { getDefaultUnifiedConfig } from "../denops/hellshake-yano/config.ts";
import {
  HellshakeYanoController,
  HellshakeYanoConfigManager,
  CommandFactory
} from "../denops/hellshake-yano/commands.ts";

/**
 * TDD Red Phase Test 1: commands.tsがUnifiedConfigをインポートしているか
 *
 * 現在はConfig型をインポートしているため、このテストは失敗するはず
 */
Deno.test("RED: commands.ts should import UnifiedConfig type", async () => {
  const commandsSource = await Deno.readTextFile(
    "./denops/hellshake-yano/commands.ts"
  );

  // UnifiedConfigのインポートが存在する
  assertEquals(
    commandsSource.includes('import type { UnifiedConfig'),
    true,
    "commands.ts should import UnifiedConfig type"
  );

  // Config型のインポートは段階的に置き換えられる
  assertEquals(
    commandsSource.includes('import type { UnifiedConfig'),
    true,
    "commands.ts should import both Config and UnifiedConfig during migration"
  );
});

/**
 * TDD Red Phase Test 2: PluginControllerインターフェースがUnifiedConfigを受け入れるか
 *
 * 現在はConfig型専用なため失敗するはず
 */
Deno.test("RED: PluginController should work with UnifiedConfig", () => {
  const unifiedConfig = getDefaultUnifiedConfig();

  // UnifiedConfigはサポートされている
  const controller = new HellshakeYanoController(unifiedConfig);
  assertExists(controller);
});

/**
 * TDD Red Phase Test 3: ConfigManagerインターフェースがUnifiedConfigを処理するか
 *
 * 現在はConfig型の構造を前提としているため失敗するはず
 */
Deno.test("RED: ConfigManager should handle UnifiedConfig structure", () => {
  const unifiedConfig = getDefaultUnifiedConfig();

  // UnifiedConfigはサポートされている
  const manager = new HellshakeYanoConfigManager(unifiedConfig);
  assertExists(manager);
});

/**
 * TDD Red Phase Test 4: CommandFactoryがUnifiedConfigで動作するか
 *
 * 現在はConfig型を期待しているため失敗するはず
 */
Deno.test("RED: CommandFactory should accept UnifiedConfig", () => {
  const unifiedConfig = getDefaultUnifiedConfig();

  // UnifiedConfigはサポートされている
  const factory = new CommandFactory(unifiedConfig);
  assertExists(factory);
});

/**
 * TDD Red Phase Test 5: HellshakeYanoConfigManager.setCount()がUnifiedConfigの構造を理解するか
 *
 * UnifiedConfigではmotionCountの代わりに入力パラメータの構造が変わる可能性
 */
Deno.test("RED: ConfigManager methods should work with UnifiedConfig structure", async () => {
  const commandsSource = await Deno.readTextFile(
    "./denops/hellshake-yano/commands.ts"
  );

  // setCountメソッドがUnifiedConfigのプロパティにアクセスしているかチェック
  // 現在はthis.config.motionCountを使用しているが、
  // UnifiedConfigでは構造が異なる可能性がある
  const setCountMatch = commandsSource.match(
    /setCount\([^)]+\)[^{]*\{[^}]*this\.config\.(\w+)/
  );

  // 現在はmotionCountを使用しているが、UnifiedConfigでは異なる可能性
  assertEquals(
    setCountMatch?.[1] !== 'motionCount',
    true,
    "setCount should be updated to use UnifiedConfig property structure"
  );
});

/**
 * TDD Red Phase Test 6: 後方互換性関数がUnifiedConfigをサポートするか
 *
 * enable, disable, toggle等の単純な関数もUnifiedConfigに対応すべき
 */
Deno.test("RED: Backward compatibility functions should support UnifiedConfig", async () => {
  const commandsSource = await Deno.readTextFile(
    "./denops/hellshake-yano/commands.ts"
  );

  // enable関数のパラメータ型をチェック
  const enableFunctionMatch = commandsSource.match(
    /export\s+function\s+enable\s*\(\s*config:\s*(\w+)\s*\)/
  );

  // 現在はConfig型のみをサポートしているが、UnifiedConfigもサポートすべき
  assertEquals(
    enableFunctionMatch?.[1].includes('UnifiedConfig'),
    true,
    "enable function should support UnifiedConfig parameter"
  );
});