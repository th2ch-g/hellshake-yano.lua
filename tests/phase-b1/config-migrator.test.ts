/**
 * tests/phase-b1/config-migrator.test.ts
 *
 * ConfigMigratorのテスト
 *
 * 目的:
 *   - 既存設定の自動検出
 *   - 設定の自動変換
 *   - 警告メッセージの表示確認
 *
 * Process: phase-b1, sub3.2
 */

import { test } from "../testRunner.ts";
import { assertEquals, assertExists } from "@std/assert";
import { ConfigMigrator } from "../../denops/hellshake-yano/phase-b1/config-migrator.ts";

test("ConfigMigrator: VimScript設定の検出", async (denops) => {
  const migrator = new ConfigMigrator(denops);

  // VimScript設定を作成
  await denops.cmd("let g:hellshake_yano_vim_config = {}");
  await denops.cmd("let g:hellshake_yano_vim_config.hint_chars = 'ASDF'");

  // 設定が検出されることを確認
  const detected = await migrator.detectVimScriptConfig();
  assertEquals(detected, true, "VimScript設定が検出されること");

  await denops.cmd("echo ''");
});

test("ConfigMigrator: 設定が存在しない場合", async (denops) => {
  const migrator = new ConfigMigrator(denops);

  // 設定を削除
  await denops.cmd("unlet! g:hellshake_yano_vim_config");

  // 設定が検出されないことを確認
  const detected = await migrator.detectVimScriptConfig();
  assertEquals(detected, false, "VimScript設定が存在しない場合はfalseが返されること");

  await denops.cmd("echo ''");
});

test("ConfigMigrator: マイグレーションの必要性チェック", async (denops) => {
  const migrator = new ConfigMigrator(denops);

  // VimScript設定のみ存在
  await denops.cmd("let g:hellshake_yano_vim_config = {}");
  await denops.cmd("unlet! g:hellshake_yano");

  const needed = await migrator.needsMigration();
  assertEquals(needed, true, "VimScript設定のみ存在する場合はマイグレーションが必要");

  await denops.cmd("echo ''");
});

test("ConfigMigrator: マイグレーション不要の場合", async (denops) => {
  const migrator = new ConfigMigrator(denops);

  // 両方の設定を削除
  await denops.cmd("unlet! g:hellshake_yano_vim_config");
  await denops.cmd("unlet! g:hellshake_yano");

  const needed = await migrator.needsMigration();
  assertEquals(needed, false, "設定が存在しない場合はマイグレーション不要");

  await denops.cmd("echo ''");
});

test("ConfigMigrator: 設定の取得", async (denops) => {
  const migrator = new ConfigMigrator(denops);

  // VimScript設定を作成
  await denops.cmd("let g:hellshake_yano_vim_config = {}");
  await denops.cmd("let g:hellshake_yano_vim_config.hint_chars = 'XYZ'");
  await denops.cmd("let g:hellshake_yano_vim_config.enabled = v:true");

  const config = await migrator.getVimScriptConfig();

  assertExists(config, "設定オブジェクトが取得できること");
  assertEquals(config.hint_chars, "XYZ", "hint_charsが取得できること");
  assertEquals(config.enabled, true, "enabledが取得できること");

  await denops.cmd("echo ''");
});
