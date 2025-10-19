/**
 * tests/vim/config/config-unifier.test.ts
 *
 * ConfigUnifierのテスト
 *
 * 目的:
 *   - VimScript設定からTypeScript設定への変換テスト
 *   - キー名のマッピング検証（hint_chars → markers等）
 *   - デフォルト値の適用確認
 *
 * Process: phase-2, process11
 */

import { test } from "../../testRunner.ts";
import { assertEquals, assertExists } from "@std/assert";
import { ConfigUnifier } from "../../../denops/hellshake-yano/vim/config/config-unifier.ts";

test("ConfigUnifier: VimScript設定からTypeScript設定への基本変換", async (denops) => {
  const unifier = new ConfigUnifier(denops);

  // VimScript形式の設定を作成
  await denops.cmd("let g:hellshake_yano_vim_config = {}");
  await denops.cmd("let g:hellshake_yano_vim_config.hint_chars = 'ASDF'");
  await denops.cmd("let g:hellshake_yano_vim_config.motion_threshold = 3");

  // 統合設定に変換
  const config = await unifier.unify();

  // markersに正しく変換されていることを確認
  assertExists(config.markers, "markers フィールドが存在すること");
  assertEquals(config.markers, ["A", "S", "D", "F"], "hint_charsがmarkersに変換されること");

  // motionCountに正しく変換されていることを確認
  assertExists(config.motionCount, "motionCount フィールドが存在すること");
  assertEquals(config.motionCount, 3, "motion_thresholdがmotionCountに変換されること");

  // awaitを使用
  await denops.cmd("echo ''");
});

test("ConfigUnifier: デフォルト値の適用", async (denops) => {
  const unifier = new ConfigUnifier(denops);

  // 空の設定
  await denops.cmd("let g:hellshake_yano_vim_config = {}");

  // 統合設定に変換
  const config = await unifier.unify();

  // デフォルト値が適用されていることを確認
  assertExists(config.markers, "デフォルトmarkersが存在すること");
  assertExists(config.motionCount, "デフォルトmotionCountが存在すること");
  assertEquals(config.enabled, true, "enabledのデフォルト値がtrueであること");

  await denops.cmd("echo ''");
});

test("ConfigUnifier: 複数のキーマッピング", async (denops) => {
  const unifier = new ConfigUnifier(denops);

  // 複数の設定項目
  await denops.cmd("let g:hellshake_yano_vim_config = {}");
  await denops.cmd("let g:hellshake_yano_vim_config.enabled = v:false");
  await denops.cmd("let g:hellshake_yano_vim_config.motion_timeout_ms = 3000");
  await denops.cmd("let g:hellshake_yano_vim_config.max_hints = 30");

  const config = await unifier.unify();

  assertEquals(config.enabled, false, "enabledが変換されること");
  assertEquals(config.motionTimeout, 3000, "motion_timeout_msがmotionTimeoutに変換されること");
  assertEquals(config.maxHints, 30, "max_hintsがmaxHintsに変換されること");

  await denops.cmd("echo ''");
});

test("ConfigUnifier: 設定が存在しない場合", async (denops) => {
  const unifier = new ConfigUnifier(denops);

  // g:hellshake_yano_vim_config が存在しない状態
  await denops.cmd("unlet! g:hellshake_yano_vim_config");

  // デフォルト設定が返されること
  const config = await unifier.unify();

  assertExists(config, "設定オブジェクトが存在すること");
  assertExists(config.markers, "デフォルトmarkersが存在すること");
  assertEquals(config.enabled, true, "デフォルトenabledがtrueであること");

  await denops.cmd("echo ''");
});

test("ConfigUnifier: 部分的な設定のマージ", async (denops) => {
  const unifier = new ConfigUnifier(denops);

  // 一部のキーのみ設定
  await denops.cmd("let g:hellshake_yano_vim_config = {}");
  await denops.cmd("let g:hellshake_yano_vim_config.hint_chars = 'JKL'");

  const config = await unifier.unify();

  // 指定したキーは変換される
  assertEquals(config.markers, ["J", "K", "L"], "指定されたhint_charsが変換されること");

  // 未指定のキーはデフォルト値が適用される
  assertExists(config.motionCount, "未指定のmotionCountにデフォルト値が適用されること");
  assertExists(config.motionTimeout, "未指定のmotionTimeoutにデフォルト値が適用されること");

  await denops.cmd("echo ''");
});
