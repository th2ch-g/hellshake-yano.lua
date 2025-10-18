/**
 * tests/phase-b1/e2e.test.ts
 *
 * E2Eテスト（エンドツーエンド）
 *
 * 目的:
 *   - ヒント表示からジャンプまでの全フローをテスト
 *   - Phase B-1実装の統合動作を検証
 *   - Vim/Neovim両環境での完全動作確認
 *
 * Process: phase-b1, sub10.3
 */

import { test } from "../testRunner.ts";
import { assertEquals, assertExists } from "@std/assert";
import { VimBridge } from "../../denops/hellshake-yano/phase-b1/vim-bridge.ts";
import { UnifiedDisplay } from "../../denops/hellshake-yano/phase-b1/unified-display.ts";
import { SideEffectChecker } from "../../denops/hellshake-yano/phase-b1/side-effect-checker.ts";

test("E2E: 単語検出からヒント表示までの完全フロー", async (denops) => {
  const bridge = new VimBridge(denops);
  const display = new UnifiedDisplay(denops);

  // ステップ1: テストデータを準備
  await denops.call("setline", 1, [
    "hello world test",
    "foo bar baz",
  ]);

  // ステップ2: 単語検出
  const words = await bridge.detectWords();
  assertExists(words, "単語が検出されること");
  assertEquals(words.length > 0, true, "少なくとも1つの単語が検出されること");

  // ステップ3: 各単語にヒントを表示
  const markers = ["a", "s", "d", "f", "j", "k"];
  const hintIds: number[] = [];

  for (let i = 0; i < Math.min(words.length, markers.length); i++) {
    const word = words[i];
    const marker = markers[i];
    const hintId = await display.showHint(word.lnum, word.col, marker);
    hintIds.push(hintId);
  }

  // ステップ4: ヒントが正しく表示されていることを確認
  const displayedCount = display.getPopupCount();
  assertEquals(displayedCount, hintIds.length, "表示されたヒント数が正しいこと");

  // ステップ5: クリーンアップ
  await display.hideAll();
  const finalCount = display.getPopupCount();
  assertEquals(finalCount, 0, "全てのヒントが非表示になること");
});

test("E2E: 副作用管理を含む完全フロー", async (denops) => {
  const bridge = new VimBridge(denops);
  const display = new UnifiedDisplay(denops);
  const checker = new SideEffectChecker(denops);

  // ステップ1: テストデータとカーソル位置を設定
  await denops.call("setline", 1, [
    "line one",
    "line two",
    "line three",
  ]);
  await denops.call("cursor", 2, 3);

  const originalPos = await denops.call("getpos", ".") as number[];

  // ステップ2: 副作用を管理しながら処理を実行
  await checker.withSafeExecution(async () => {
    // 単語検出
    const words = await bridge.detectWords();

    // ヒント表示
    for (let i = 0; i < Math.min(words.length, 3); i++) {
      await display.showHint(words[i].lnum, words[i].col, `${i + 1}`);
    }

    // カーソルを移動（副作用）
    await denops.call("cursor", 3, 7);
  });

  // ステップ3: カーソル位置が復元されていることを確認
  const restoredPos = await denops.call("getpos", ".") as number[];
  assertEquals(restoredPos[1], originalPos[1], "行番号が復元されること");
  assertEquals(restoredPos[2], originalPos[2], "列番号が復元されること");

  // クリーンアップ
  await display.hideAll();
});

test("E2E: 部分マッチフィルタリングを含むフロー", async (denops) => {
  const bridge = new VimBridge(denops);
  const display = new UnifiedDisplay(denops);

  // ステップ1: テストデータを準備
  await denops.call("setline", 1, [
    "apple banana cherry date",
  ]);

  // ステップ2: 単語検出
  const words = await bridge.detectWords();
  assertEquals(words.length >= 4, true, "4つ以上の単語が検出されること");

  // ステップ3: 2文字ヒントを表示
  const hints = ["aa", "ab", "ba", "bb"];
  for (let i = 0; i < Math.min(words.length, hints.length); i++) {
    await display.showHint(words[i].lnum, words[i].col, hints[i]);
  }

  const initialCount = display.getPopupCount();
  assertEquals(initialCount, hints.length, "全てのヒントが表示されること");

  // ステップ4: 'a' で始まるヒントのみにフィルタ
  await display.highlightPartialMatches(["aa", "ab"]);

  const filteredCount = display.getPopupCount();
  assertEquals(filteredCount, 2, "フィルタ後は2つのヒントのみ表示されること");

  // クリーンアップ
  await display.hideAll();
});

test("E2E: 複数行にわたる完全フロー", async (denops) => {
  const bridge = new VimBridge(denops);
  const display = new UnifiedDisplay(denops);

  // ステップ1: 複数行のテストデータを準備
  const lines = [
    "first line with multiple words",
    "second line with more words",
    "third line with even more words",
  ];
  await denops.call("setline", 1, lines);

  // ステップ2: 全単語を検出
  const words = await bridge.detectWords();
  assertEquals(words.length > 0, true, "単語が検出されること");

  // ステップ3: 各行の最初の単語にヒントを表示
  const markers = ["1", "2", "3"];
  const line1Words = words.filter((w) => w.lnum === 1);
  const line2Words = words.filter((w) => w.lnum === 2);
  const line3Words = words.filter((w) => w.lnum === 3);

  assertEquals(line1Words.length > 0, true, "1行目に単語が存在すること");
  assertEquals(line2Words.length > 0, true, "2行目に単語が存在すること");
  assertEquals(line3Words.length > 0, true, "3行目に単語が存在すること");

  // 各行の最初の単語にヒントを表示
  await display.showHint(line1Words[0].lnum, line1Words[0].col, markers[0]);
  await display.showHint(line2Words[0].lnum, line2Words[0].col, markers[1]);
  await display.showHint(line3Words[0].lnum, line3Words[0].col, markers[2]);

  const count = display.getPopupCount();
  assertEquals(count, 3, "3つのヒントが表示されること");

  // クリーンアップ
  await display.hideAll();
});

test("E2E: Vim環境での完全動作確認", async (denops) => {
  // Vim環境かチェック
  const isVim = !(await denops.call("has", "nvim")) as boolean;

  if (!isVim) {
    await denops.cmd("echo 'Skipped (Neovim環境)'");
    return;
  }

  const bridge = new VimBridge(denops);
  const display = new UnifiedDisplay(denops);

  // Vim環境での完全フローを実行
  await denops.call("setline", 1, ["vim environment test"]);

  const words = await bridge.detectWords();
  assertExists(words, "Vim環境で単語が検出されること");

  for (let i = 0; i < Math.min(words.length, 2); i++) {
    await display.showHint(words[i].lnum, words[i].col, `v${i + 1}`);
  }

  const count = display.getPopupCount();
  assertEquals(count > 0, true, "Vim環境でヒントが表示されること");

  await display.hideAll();
});

test("E2E: Neovim環境での完全動作確認", async (denops) => {
  // Neovim環境かチェック
  const isNeovim = await denops.call("has", "nvim") as boolean;

  if (!isNeovim) {
    await denops.cmd("echo 'Skipped (Vim環境)'");
    return;
  }

  const bridge = new VimBridge(denops);
  const display = new UnifiedDisplay(denops);

  // Neovim環境での完全フローを実行
  await denops.call("setline", 1, ["neovim environment test"]);

  const words = await bridge.detectWords();
  assertExists(words, "Neovim環境で単語が検出されること");

  for (let i = 0; i < Math.min(words.length, 2); i++) {
    await display.showHint(words[i].lnum, words[i].col, `n${i + 1}`);
  }

  const count = display.getPopupCount();
  assertEquals(count > 0, true, "Neovim環境でヒントが表示されること");

  await display.hideAll();
});

test("E2E: エラーハンドリングを含むフロー", async (denops) => {
  const display = new UnifiedDisplay(denops);
  const checker = new SideEffectChecker(denops);

  // テストデータを準備
  await denops.call("setline", 1, ["error handling test"]);
  await denops.call("cursor", 1, 1);

  const originalPos = await denops.call("getpos", ".") as number[];

  // エラーが発生しても状態が復元されることを確認
  try {
    await checker.withSafeExecution(async () => {
      // ヒントを表示
      await display.showHint(1, 1, "e");

      // カーソルを移動
      await denops.call("cursor", 1, 10);

      // 意図的にエラーを発生させる
      throw new Error("test error");
    });
  } catch (error) {
    // エラーをキャッチ
    assertEquals(error instanceof Error, true, "エラーがキャッチされること");
  }

  // カーソル位置が復元されていることを確認
  const restoredPos = await denops.call("getpos", ".") as number[];
  assertEquals(restoredPos[1], originalPos[1], "エラー時も行番号が復元されること");
  assertEquals(restoredPos[2], originalPos[2], "エラー時も列番号が復元されること");
});
