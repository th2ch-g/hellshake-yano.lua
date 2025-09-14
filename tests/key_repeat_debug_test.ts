import { assert, assertMatch } from "@std/assert";
import { sleep, test } from "./testRunner.ts";

// Debug info should include key repeat settings and current state

test("デバッグ: キーリピート設定と状態が表示される", async (denops) => {
  await denops.cmd("source plugin/hellshake-yano.vim");

  // カスタム設定で上書き
  await denops.cmd("let g:hellshake_yano.suppress_on_key_repeat = v:true");
  await denops.cmd("let g:hellshake_yano.key_repeat_threshold = 55");
  await denops.cmd("let g:hellshake_yano.key_repeat_reset_delay = 280");

  // デバッグ情報を取得（リスト）
  const info = await denops.call("hellshake_yano#get_debug_info") as string[];
  const dbg = info.join("\n");

  // 設定値が含まれていること
  assertMatch(dbg, /Key repeat suppression:\s*[01]/);
  assertMatch(dbg, /Key repeat threshold:\s*55ms/);
  assertMatch(dbg, /Key repeat reset delay:\s*280ms/);
});

test("デバッグ: キーリピート状態がtrue→falseに遷移する", async (denops) => {
  await denops.cmd("source plugin/hellshake-yano.vim");
  await denops.cmd("enew!");
  await denops.cmd("call setline(1, ['hello world'])");
  await denops.cmd("normal! gg0");

  // 設定（抑制を有効、しきい値=50ms、リセット=300ms）
  await denops.cmd("let g:hellshake_yano.motion_count = 10");
  await denops.cmd("let g:hellshake_yano.suppress_on_key_repeat = v:true");
  await denops.cmd("let g:hellshake_yano.key_repeat_threshold = 50");
  await denops.cmd("let g:hellshake_yano.key_repeat_reset_delay = 300");

  // 2回の高速入力でリピート判定させる
  await denops.cmd("call hellshake_yano#motion('l')");
  await sleep(30);
  await denops.cmd("call hellshake_yano#motion('l')");

  // 直後はリピート中(true=1)であるべき
  const info1 = await denops.call("hellshake_yano#get_debug_info") as string[];
  const dbg1 = info1.join("\n");
  assertMatch(dbg1, /Key repeating \(current buffer\):\s*1/);

  // リセット待ち後はfalse(0)
  await sleep(350);
  const info2 = await denops.call("hellshake_yano#get_debug_info") as string[];
  const dbg2 = info2.join("\n");
  assertMatch(dbg2, /Key repeating \(current buffer\):\s*0/);
});
