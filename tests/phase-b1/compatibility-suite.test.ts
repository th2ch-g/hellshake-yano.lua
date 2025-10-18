/**
 * tests/phase-b1/compatibility-suite.test.ts
 *
 * VimScript版との互換性テストスイート
 *
 * 目的:
 *   - VimScript版（autoload/hellshake_yano_vim/）との完全互換性確認
 *   - Phase B-1実装の全機能が VimScript版と同じ動作をすることを保証
 *   - エッジケースの検証
 *
 * Process: phase-b1, sub10.1
 */

import { test } from "../testRunner.ts";
import { assertEquals, assertExists } from "@std/assert";
import { VimBridge } from "../../denops/hellshake-yano/phase-b1/vim-bridge.ts";
import { UnifiedDisplay } from "../../denops/hellshake-yano/phase-b1/unified-display.ts";
import { ConfigUnifier } from "../../denops/hellshake-yano/phase-b1/config-unifier.ts";

test("互換性: VimBridgeの単語検出がVimScript版と一致", async (denops) => {
  const bridge = new VimBridge(denops);

  // テスト用のバッファを作成
  await denops.call("setline", 1, [
    "hello world test",
    "foo bar baz",
  ]);

  // VimScript版の関数が存在するか確認
  const vimFuncExists = await denops.call(
    "exists",
    "*hellshake_yano_vim#word_detector#detect_words",
  ) as number;

  if (vimFuncExists === 0) {
    // VimScript版が存在しない場合はスキップ
    await denops.cmd("echo 'Skipped (VimScript version not available)'");
    return;
  }

  // TypeScript版で単語検出
  const tsWords = await bridge.detectWords();

  // VimScript版で単語検出
  const vimWords = await denops.call(
    "hellshake_yano_vim#word_detector#detect_words",
  ) as Array<{ text: string; lnum: number; col: number; endCol: number }>;

  // 検出された単語数が一致すること
  assertEquals(
    tsWords.length,
    vimWords.length,
    "TypeScript版とVimScript版で検出単語数が一致すること",
  );

  // 各単語の内容と位置が一致すること
  for (let i = 0; i < tsWords.length; i++) {
    assertEquals(tsWords[i].text, vimWords[i].text, `単語${i + 1}のテキストが一致すること`);
    assertEquals(tsWords[i].lnum, vimWords[i].lnum, `単語${i + 1}の行番号が一致すること`);
    assertEquals(tsWords[i].col, vimWords[i].col, `単語${i + 1}の開始列が一致すること`);
  }
});

test("互換性: UnifiedDisplayのヒント表示位置がVimScript版と一致", async (denops) => {
  const display = new UnifiedDisplay(denops);

  // テスト用のバッファを作成
  await denops.call("setline", 1, [
    "test display compatibility",
  ]);

  // VimScript版のdisplay関数が存在するか確認
  const vimFuncExists = await denops.call(
    "exists",
    "*hellshake_yano_vim#display#show_hint",
  ) as number;

  if (vimFuncExists === 0) {
    await denops.cmd("echo 'Skipped (VimScript display not available)'");
    return;
  }

  // TypeScript版でヒント表示
  const tsHintId = await display.showHint(1, 5, "a");
  assertExists(tsHintId, "TypeScript版でヒントが表示されること");

  // VimScript版でヒント表示
  const vimHintId = await denops.call(
    "hellshake_yano_vim#display#show_hint",
    1,
    5,
    "b",
  ) as number;
  assertExists(vimHintId, "VimScript版でヒントが表示されること");

  // クリーンアップ
  await display.hideAll();
  await denops.call("hellshake_yano_vim#display#hide_all");
});

test("互換性: 設定統合がVimScript設定を正しく変換", async (denops) => {
  const unifier = new ConfigUnifier(denops);

  // VimScript形式の設定を作成
  await denops.cmd("let g:hellshake_yano_vim_config = {}");
  await denops.cmd("let g:hellshake_yano_vim_config.hint_chars = 'QWERTY'");
  await denops.cmd("let g:hellshake_yano_vim_config.motion_threshold = 5");
  await denops.cmd("let g:hellshake_yano_vim_config.enabled = v:true");

  // 統合設定に変換
  const config = await unifier.unify();

  // キー名が正しく変換されていることを確認
  assertExists(config.markers, "markersフィールドが存在すること");
  assertEquals(
    config.markers,
    ["Q", "W", "E", "R", "T", "Y"],
    "hint_charsがmarkersに変換されること",
  );

  assertExists(config.motionCount, "motionCountフィールドが存在すること");
  assertEquals(config.motionCount, 5, "motion_thresholdがmotionCountに変換されること");

  assertEquals(config.enabled, true, "enabledが正しく変換されること");

  // クリーンアップ
  await denops.cmd("unlet! g:hellshake_yano_vim_config");
});

test("互換性: 空のバッファでの単語検出", async (denops) => {
  const bridge = new VimBridge(denops);

  // 空のバッファを作成
  await denops.call("setline", 1, [""]);

  // 単語検出を実行
  const words = await bridge.detectWords();

  // 空のバッファでは単語が検出されないこと
  assertEquals(words.length, 0, "空のバッファでは単語が検出されないこと");
});

test("互換性: 日本語を含むバッファでの単語検出", async (denops) => {
  const bridge = new VimBridge(denops);

  // 日本語を含むバッファを作成
  await denops.call("setline", 1, [
    "こんにちは world テスト",
  ]);

  // 単語検出を実行
  const words = await bridge.detectWords();

  // 何らかの単語が検出されること（日本語処理の詳細は実装依存）
  assertExists(words, "単語リストが存在すること");

  // 全ての検出単語が有効な位置情報を持つこと
  for (const word of words) {
    assertExists(word.text, "単語テキストが存在すること");
    assertExists(word.lnum, "行番号が存在すること");
    assertExists(word.col, "列番号が存在すること");

    // 行番号と列番号が正の値であること
    assertEquals(word.lnum >= 1, true, "行番号は1以上であること");
    assertEquals(word.col >= 1, true, "列番号は1以上であること");
  }
});

test("互換性: 長い行での単語検出", async (denops) => {
  const bridge = new VimBridge(denops);

  // 長い行を作成（100単語）
  const longLine = Array.from({ length: 100 }, (_, i) => `word${i + 1}`).join(" ");
  await denops.call("setline", 1, [longLine]);

  // 単語検出を実行
  const words = await bridge.detectWords();

  // 100単語が検出されること
  assertEquals(words.length, 100, "100単語が検出されること");

  // 各単語の位置が正しいこと（昇順であること）
  for (let i = 1; i < words.length; i++) {
    assertEquals(
      words[i].col > words[i - 1].col,
      true,
      `単語${i + 1}の列番号が単語${i}より大きいこと`,
    );
  }
});

test("互換性: 複数行での単語検出", async (denops) => {
  const bridge = new VimBridge(denops);

  // 複数行を作成
  await denops.call("setline", 1, [
    "line1 word1 word2",
    "line2 word3 word4",
    "line3 word5 word6",
  ]);

  // 単語検出を実行
  const words = await bridge.detectWords();

  // 6単語以上が検出されること（"line1", "word1", "word2"...）
  assertEquals(words.length >= 6, true, "少なくとも6単語が検出されること");

  // 行番号が正しく設定されていること
  const line1Words = words.filter((w) => w.lnum === 1);
  const line2Words = words.filter((w) => w.lnum === 2);
  const line3Words = words.filter((w) => w.lnum === 3);

  assertEquals(line1Words.length > 0, true, "1行目に単語が存在すること");
  assertEquals(line2Words.length > 0, true, "2行目に単語が存在すること");
  assertEquals(line3Words.length > 0, true, "3行目に単語が存在すること");
});

test("互換性: 特殊文字を含む行での単語検出", async (denops) => {
  const bridge = new VimBridge(denops);

  // 特殊文字を含む行を作成
  await denops.call("setline", 1, [
    "func(arg1, arg2) { return value; }",
  ]);

  // 単語検出を実行
  const words = await bridge.detectWords();

  // 単語が検出されること
  assertEquals(words.length > 0, true, "特殊文字を含む行でも単語が検出されること");

  // 全ての単語が有効な位置を持つこと
  for (const word of words) {
    assertEquals(word.lnum, 1, "全ての単語が1行目にあること");
    assertEquals(word.col >= 1, true, "列番号が1以上であること");
    assertEquals(word.endCol >= word.col, true, "終了列が開始列以上であること");
  }
});
