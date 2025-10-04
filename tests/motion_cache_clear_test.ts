import { assertEquals } from "@std/assert";
import { test } from "./testRunner.ts";

// process1: perKeyMotionCount が動的に反映されることを確認

test("perKeyMotionCount は設定更新後にモーションキャッシュがクリアされる", async (denops) => {
  await denops.cmd("source plugin/hellshake-yano.vim");
  await denops.cmd("let g:hellshake_yano.enabled = v:true");
  await denops.cmd("let g:hellshake_yano.perKeyMotionCount = {'h': 3}");
  await denops.cmd("let g:hellshake_yano.motionCount = 5");
  await denops.cmd("let g:hellshake_yano.defaultMotionCount = 5");

  await denops.cmd("call hellshake_yano#state#init_buffer_state(bufnr('%'))");
  await denops.cmd("call hellshake_yano#debug_reset_key_count(bufnr('%'), 'h')");

  // 既存のキャッシュを作成（3回目でトリガーされる設定）
  await denops.eval("hellshake_yano#motion#should_trigger_hints_for_key(bufnr('%'), 'h')");

  // 設定を更新して 1 回でヒントが出るようにする
  await denops.cmd("let g:hellshake_yano.perKeyMotionCount.h = 1");

  // 設定更新後の通知（キャッシュクリアが必要）
  await denops.cmd("call hellshake_yano#command#set_count(5)");

  await denops.cmd("call hellshake_yano#debug_reset_key_count(bufnr('%'), 'h')");
  await denops.cmd("call hellshake_yano#debug_increment_key_count(bufnr('%'), 'h')");

  const shouldTrigger = await denops.eval(
    "hellshake_yano#debug_should_trigger_hints_for_key(bufnr('%'), 'h')",
  );

  assertEquals(
    shouldTrigger,
    1,
    "per_key_motion_count の更新後は 1 回の入力でヒントが表示されるはず",
  );
});

test("複数のキーのキャッシュが同時にクリアされる", async (denops) => {
  await denops.cmd("source plugin/hellshake-yano.vim");
  await denops.cmd("let g:hellshake_yano.enabled = v:true");
  await denops.cmd("let g:hellshake_yano.perKeyMotionCount = {'h': 2, 'j': 2, 'w': 1}");
  await denops.cmd("let g:hellshake_yano.defaultMotionCount = 3");

  await denops.cmd("call hellshake_yano#state#init_buffer_state(bufnr('%'))");

  // 各キーのキャッシュを作成
  await denops.eval("hellshake_yano#debug_get_motion_count_for_key('h')");
  await denops.eval("hellshake_yano#debug_get_motion_count_for_key('j')");
  await denops.eval("hellshake_yano#debug_get_motion_count_for_key('w')");

  // 設定を更新
  await denops.cmd("let g:hellshake_yano.perKeyMotionCount = {'h': 1, 'j': 1, 'w': 2}");

  // キャッシュクリアを実行
  await denops.cmd("call hellshake_yano#motion#clear_motion_count_cache()");

  // 各キーで新しい設定値が取得されることを確認
  const hCount = await denops.eval("hellshake_yano#debug_get_motion_count_for_key('h')");
  const jCount = await denops.eval("hellshake_yano#debug_get_motion_count_for_key('j')");
  const wCount = await denops.eval("hellshake_yano#debug_get_motion_count_for_key('w')");

  assertEquals(hCount, 1, "h キーは新しい設定値 1 を返すはず");
  assertEquals(jCount, 1, "j キーは新しい設定値 1 を返すはず");
  assertEquals(wCount, 2, "w キーは新しい設定値 2 を返すはず");
});

test("キャッシュクリア後に異なるキーで正しい閾値が適用される", async (denops) => {
  await denops.cmd("source plugin/hellshake-yano.vim");
  await denops.cmd("let g:hellshake_yano.enabled = v:true");
  await denops.cmd("let g:hellshake_yano.perKeyMotionCount = {'w': 1, 'b': 1, 'e': 1, 'h': 2, 'j': 2, 'k': 2, 'l': 2}");
  await denops.cmd("let g:hellshake_yano.defaultMotionCount = 3");

  await denops.cmd("call hellshake_yano#state#init_buffer_state(bufnr('%'))");

  // wキーのテスト（1回でトリガー）
  await denops.cmd("call hellshake_yano#debug_reset_key_count(bufnr('%'), 'w')");
  await denops.cmd("call hellshake_yano#debug_increment_key_count(bufnr('%'), 'w')");
  const wShouldTrigger = await denops.eval(
    "hellshake_yano#debug_should_trigger_hints_for_key(bufnr('%'), 'w')",
  );
  assertEquals(wShouldTrigger, 1, "w キーは 1 回の入力でヒントが表示されるはず");

  // hキーのテスト（2回でトリガー）
  await denops.cmd("call hellshake_yano#debug_reset_key_count(bufnr('%'), 'h')");
  await denops.cmd("call hellshake_yano#debug_increment_key_count(bufnr('%'), 'h')");
  const h1ShouldTrigger = await denops.eval(
    "hellshake_yano#debug_should_trigger_hints_for_key(bufnr('%'), 'h')",
  );
  assertEquals(h1ShouldTrigger, 0, "h キーは 1 回の入力ではヒントが表示されないはず");

  await denops.cmd("call hellshake_yano#debug_increment_key_count(bufnr('%'), 'h')");
  const h2ShouldTrigger = await denops.eval(
    "hellshake_yano#debug_should_trigger_hints_for_key(bufnr('%'), 'h')",
  );
  assertEquals(h2ShouldTrigger, 1, "h キーは 2 回の入力でヒントが表示されるはず");
});
