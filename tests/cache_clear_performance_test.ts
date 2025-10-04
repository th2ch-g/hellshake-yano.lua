import { assertEquals } from "@std/assert";
import { test } from "./testRunner.ts";

// process50: キャッシュクリアのパフォーマンス検証

// キャッシュクリア回数をカウントするヘルパー
async function getCacheClearCount(denops: any): Promise<number> {
  // グローバル変数でキャッシュクリア回数を追跡
  const count = await denops.eval(
    "get(g:, 'hellshake_yano_test_cache_clear_count', 0)",
  );
  return count as number;
}

async function resetCacheClearCount(denops: any): Promise<void> {
  await denops.cmd("let g:hellshake_yano_test_cache_clear_count = 0");
}

async function setupCacheClearCounter(denops: any): Promise<void> {
  // キャッシュクリア関数をラップしてカウントする
  await denops.cmd(`
function! hellshake_yano#motion#clear_motion_count_cache() abort
  let g:hellshake_yano_test_cache_clear_count = get(g:, 'hellshake_yano_test_cache_clear_count', 0) + 1
  let s:motion_count_cache = {}
  if exists('*hellshake_yano#config#clear_motion_count_cache')
    call hellshake_yano#config#clear_motion_count_cache()
  endif
endfunction
  `);
}

test("キャッシュクリア: set_count()で2回呼ばれる（重複）", async (denops) => {
  await denops.cmd("source plugin/hellshake-yano.vim");
  await setupCacheClearCounter(denops);
  await resetCacheClearCount(denops);

  // set_count()を実行
  await denops.cmd("call hellshake_yano#command#set_count(5)");

  const count = await getCacheClearCount(denops);
  assertEquals(
    count,
    2,
    "set_count()では2回キャッシュクリアが呼ばれる（重複問題）",
  );
});

test("キャッシュクリア: set_timeout()で不要なクリアが実行される", async (denops) => {
  await denops.cmd("source plugin/hellshake-yano.vim");
  await setupCacheClearCounter(denops);
  await resetCacheClearCount(denops);

  // set_timeout()を実行
  await denops.cmd("call hellshake_yano#command#set_timeout(3000)");

  const count = await getCacheClearCount(denops);
  assertEquals(
    count,
    1,
    "set_timeout()でキャッシュクリアが呼ばれる（不要なクリア）",
  );
});

test("キャッシュクリア: update_highlight()で不要なクリアが実行される", async (denops) => {
  await denops.cmd("source plugin/hellshake-yano.vim");
  await setupCacheClearCounter(denops);
  await resetCacheClearCount(denops);

  // update_highlight()を実行
  await denops.cmd(
    "call hellshake_yano#command#update_highlight('DiffAdd', 'DiffText')",
  );

  const count = await getCacheClearCount(denops);
  assertEquals(
    count,
    1,
    "update_highlight()でキャッシュクリアが呼ばれる（不要なクリア）",
  );
});

test("キャッシュクリア: set_counted_motions()でクリアが実行される", async (denops) => {
  await denops.cmd("source plugin/hellshake-yano.vim");
  await setupCacheClearCounter(denops);
  await resetCacheClearCount(denops);

  // set_counted_motions()を実行
  await denops.cmd("call hellshake_yano#command#set_counted_motions(['h', 'j', 'k', 'l', 'w'])");

  const count = await getCacheClearCount(denops);
  assertEquals(
    count,
    1,
    "set_counted_motions()でキャッシュクリアが1回呼ばれる（これは必要な可能性あり）",
  );
});

test("パフォーマンス: 100回の設定変更でのキャッシュクリア頻度", async (denops) => {
  await denops.cmd("source plugin/hellshake-yano.vim");
  await setupCacheClearCounter(denops);
  await resetCacheClearCount(denops);

  // 様々な設定変更を100回実行
  for (let i = 0; i < 25; i++) {
    await denops.cmd(`call hellshake_yano#command#set_count(${3 + i % 5})`);
    await denops.cmd(`call hellshake_yano#command#set_timeout(${2000 + i * 100})`);
    await denops.cmd(
      "call hellshake_yano#command#update_highlight('DiffAdd', 'DiffText')",
    );
    await denops.cmd("call hellshake_yano#command#set_counted_motions(['h', 'j', 'k', 'l'])");
  }

  const count = await getCacheClearCount(denops);
  // 期待値: set_count(2回) + set_timeout(1回) + update_highlight(1回) + set_counted_motions(1回) = 5回/サイクル
  // 25サイクル = 125回
  assertEquals(
    count,
    125,
    "100回の設定変更で125回のキャッシュクリアが発生（最適化前）",
  );
});
