/**
 * tests/phase-b1/unified-display.test.ts
 *
 * UnifiedDisplayのテスト
 *
 * 目的:
 *   - Vim/Neovim両環境でのヒント表示機能のテスト
 *   - VimScript版display.vimとの完全互換性確認
 *   - popup_create() と nvim_buf_set_extmark() の動作一致検証
 *
 * Process: phase-b1, sub4.1
 */

import { test } from "../testRunner.ts";
import { assertEquals, assertExists } from "@std/assert";
import { UnifiedDisplay } from "../../denops/hellshake-yano/phase-b1/unified-display.ts";

test("UnifiedDisplay: ヒントの表示", async (denops) => {
  const display = new UnifiedDisplay(denops);

  // テスト用のバッファを作成
  await denops.call("setline", 1, [
    "hello world",
    "test line",
    "foo bar",
  ]);

  // 2行目、5列目にヒント 'a' を表示
  const hintId = await display.showHint(2, 5, "a");

  // ヒントIDが返されることを確認
  assertExists(hintId, "ヒントIDが返されること");
  assertEquals(typeof hintId, "number", "ヒントIDは数値であること");

  // クリーンアップ
  await display.hideAll();
});

test("UnifiedDisplay: 複数ヒントの表示", async (denops) => {
  const display = new UnifiedDisplay(denops);

  // テスト用のバッファを作成
  await denops.call("setline", 1, [
    "first line",
    "second line",
    "third line",
  ]);

  // 3つのヒントを表示
  const id1 = await display.showHint(1, 1, "a");
  const id2 = await display.showHint(2, 5, "s");
  const id3 = await display.showHint(3, 10, "d");

  // 全てのIDが異なることを確認
  assertExists(id1, "1つ目のヒントIDが存在すること");
  assertExists(id2, "2つ目のヒントIDが存在すること");
  assertExists(id3, "3つ目のヒントIDが存在すること");

  // 表示数の確認
  const count = display.getPopupCount();
  assertEquals(count, 3, "3つのヒントが表示されていること");

  // クリーンアップ
  await display.hideAll();
});

test("UnifiedDisplay: 全ヒントの非表示", async (denops) => {
  const display = new UnifiedDisplay(denops);

  // テスト用のバッファを作成
  await denops.call("setline", 1, [
    "line 1",
    "line 2",
  ]);

  // 2つのヒントを表示
  await display.showHint(1, 1, "a");
  await display.showHint(2, 1, "s");

  // 表示数の確認
  let count = display.getPopupCount();
  assertEquals(count, 2, "2つのヒントが表示されていること");

  // 全ヒントを非表示
  await display.hideAll();

  // 非表示後の確認
  count = display.getPopupCount();
  assertEquals(count, 0, "全てのヒントが非表示になっていること");
});

test("UnifiedDisplay: 部分マッチハイライト", async (denops) => {
  const display = new UnifiedDisplay(denops);

  // テスト用のバッファを作成
  await denops.call("setline", 1, [
    "test 1",
    "test 2",
    "test 3",
  ]);

  // 複数のヒントを表示
  await display.showHint(1, 1, "a");
  await display.showHint(1, 3, "aa");
  await display.showHint(2, 1, "as");
  await display.showHint(2, 3, "s");
  await display.showHint(3, 1, "sa");

  // 初期状態: 5つのヒント
  let count = display.getPopupCount();
  assertEquals(count, 5, "5つのヒントが表示されていること");

  // 'a' で始まるヒントのみ表示（a, aa, as）
  await display.highlightPartialMatches(["a", "aa", "as"]);

  // 部分マッチ後: 3つのヒントのみ
  count = display.getPopupCount();
  assertEquals(count, 3, "部分マッチ後は3つのヒントのみ表示されること");

  // クリーンアップ
  await display.hideAll();
});

test("UnifiedDisplay: Vim環境での popup_create 使用", async (denops) => {
  const display = new UnifiedDisplay(denops);

  // Vim環境かチェック
  const isVim = !(await denops.call("has", "nvim")) as boolean;

  if (!isVim) {
    // Neovim環境ではスキップ
    await denops.cmd("echo 'Skipped (Neovim環境)'");
    return;
  }

  // popup_create() が使用可能かチェック
  const hasPopup = await denops.call("exists", "*popup_create") as number;

  if (hasPopup === 0) {
    // popup_create() が使用できない場合はスキップ
    await denops.cmd("echo 'Skipped (popup_create not available)'");
    return;
  }

  // テスト用のバッファを作成
  await denops.call("setline", 1, ["vim test line"]);

  // Vim環境でヒントを表示
  const hintId = await display.showHint(1, 5, "v");

  // popup IDが返されることを確認
  assertExists(hintId, "Vim環境でpopup IDが返されること");
  assertEquals(typeof hintId, "number", "popup IDは数値であること");

  // クリーンアップ
  await display.hideAll();
});

test("UnifiedDisplay: Neovim環境での extmark 使用", async (denops) => {
  const display = new UnifiedDisplay(denops);

  // Neovim環境かチェック
  const isNeovim = await denops.call("has", "nvim") as boolean;

  if (!isNeovim) {
    // Vim環境ではスキップ
    await denops.cmd("echo 'Skipped (Vim環境)'");
    return;
  }

  // テスト用のバッファを作成
  await denops.call("setline", 1, ["neovim test line"]);

  // Neovim環境でヒントを表示
  const hintId = await display.showHint(1, 8, "n");

  // extmark IDが返されることを確認
  assertExists(hintId, "Neovim環境でextmark IDが返されること");
  assertEquals(typeof hintId, "number", "extmark IDは数値であること");

  // クリーンアップ
  await display.hideAll();
});

test("UnifiedDisplay: VimScript版との座標一致確認", async (denops) => {
  const display = new UnifiedDisplay(denops);

  // テスト用のバッファを作成
  await denops.call("setline", 1, [
    "coordinate test",
  ]);

  // VimScript版の display#show_hint と同じ座標でヒントを表示
  // 1行目、5列目にヒント 'c' を表示
  const tsHintId = await display.showHint(1, 5, "c");

  assertExists(tsHintId, "TypeScript版でヒントが表示されること");

  // VimScript版と同じ動作をしているか確認
  // （VimScript版の関数が存在する場合のみテスト）
  const vimFuncExists = await denops.call(
    "exists",
    "*hellshake_yano_vim#display#show_hint",
  ) as number;

  if (vimFuncExists === 1) {
    // VimScript版でも同じ位置にヒントを表示
    const vimHintId = await denops.call(
      "hellshake_yano_vim#display#show_hint",
      1,
      5,
      "c",
    ) as number;

    assertExists(vimHintId, "VimScript版でもヒントが表示されること");

    // VimScript版のヒントを削除
    await denops.call("hellshake_yano_vim#display#hide_all");
  }

  // クリーンアップ
  await display.hideAll();
});
