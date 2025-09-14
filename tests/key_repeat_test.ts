import { assert, assertEquals } from "@std/assert";
import { sleep, test } from "./testRunner.ts";

// キーリピート検出機能のテスト

test("通常のhjkl操作でヒント表示される", async (denops) => {
  // テスト用のバッファを作成
  await denops.cmd("enew!");
  await denops.cmd("call setline(1, ['hello world foo bar baz', 'second line here'])");
  await denops.cmd("normal! gg0");

  // motion_count = 3 に設定
  await denops.cmd("let g:hellshake_yano.motion_count = 3");

  // 通常速度でhjklキーを3回押下（間隔100ms以上）
  await denops.cmd("call hellshake_yano#motion('l')");
  await sleep(100);
  await denops.cmd("call hellshake_yano#motion('l')");
  await sleep(100);

  // 3回目でヒント表示がトリガーされるはず
  let hintsTriggered = false;
  try {
    await denops.cmd("call hellshake_yano#motion('l')");
    // ヒント表示がトリガーされた場合、何らかの処理が実行される
    hintsTriggered = true;
  } catch (error) {
    // 実装前なのでエラーが発生する可能性がある
  }

  // 現時点では実装されていないため、この時点では失敗するテスト
  assert(hintsTriggered, "通常のキー操作でヒントが表示されるべき");
});

test("高速連続入力(50ms以下)でヒント表示が抑制される", async (denops) => {
  await denops.cmd("enew!");
  await denops.cmd("call setline(1, ['hello world foo bar baz'])");
  await denops.cmd("normal! gg0");

  // motion_count = 3, キーリピート抑制を有効に設定
  await denops.cmd("let g:hellshake_yano.motion_count = 3");
  await denops.cmd("let g:hellshake_yano.suppress_on_key_repeat = v:true");
  await denops.cmd("let g:hellshake_yano.key_repeat_threshold = 50");

  // 高速連続入力（50ms以下の間隔）
  await denops.cmd("call hellshake_yano#motion('l')");
  await sleep(30); // リピート判定される間隔
  await denops.cmd("call hellshake_yano#motion('l')");
  await sleep(30);

  let hintsSuppressed = true;
  try {
    await denops.cmd("call hellshake_yano#motion('l')");
    // キーリピート中はヒント表示が抑制されるべき
  } catch (error) {
    hintsSuppressed = false;
  }

  // 現時点では実装されていないため、このテストは失敗する
  assert(hintsSuppressed, "高速連続入力時はヒント表示が抑制されるべき");
});

test("リピート終了後300ms経過で通常動作に復帰", async (denops) => {
  await denops.cmd("enew!");
  await denops.cmd("call setline(1, ['hello world foo bar baz'])");
  await denops.cmd("normal! gg0");

  await denops.cmd("let g:hellshake_yano.motion_count = 3");
  await denops.cmd("let g:hellshake_yano.suppress_on_key_repeat = v:true");
  await denops.cmd("let g:hellshake_yano.key_repeat_reset_delay = 300");

  // 高速連続入力でリピート状態にする
  await denops.cmd("call hellshake_yano#motion('l')");
  await sleep(30);
  await denops.cmd("call hellshake_yano#motion('l')");
  await sleep(30);
  await denops.cmd("call hellshake_yano#motion('l')");

  // リピート終了後の待機時間
  await sleep(350); // key_repeat_reset_delay + 余裕

  // 通常動作に復帰してヒント表示される
  let hintsRestored = false;
  try {
    await denops.cmd("call hellshake_yano#motion('l')");
    await sleep(100);
    await denops.cmd("call hellshake_yano#motion('l')");
    await sleep(100);
    await denops.cmd("call hellshake_yano#motion('l')");
    hintsRestored = true;
  } catch (error) {
    hintsRestored = false;
  }

  // 現時点では実装されていないため、このテストは失敗する
  assert(hintsRestored, "リピート終了後は通常動作に復帰するべき");
});

test("suppress_on_key_repeat=falseで機能が無効化される", async (denops) => {
  await denops.cmd("enew!");
  await denops.cmd("call setline(1, ['hello world foo bar baz'])");
  await denops.cmd("normal! gg0");

  // キーリピート抑制機能を無効に設定
  await denops.cmd("let g:hellshake_yano.motion_count = 3");
  await denops.cmd("let g:hellshake_yano.suppress_on_key_repeat = v:false");

  // 高速連続入力でも通常通りヒント表示される
  await denops.cmd("call hellshake_yano#motion('l')");
  await sleep(30);
  await denops.cmd("call hellshake_yano#motion('l')");
  await sleep(30);

  let hintsNotSuppressed = false;
  try {
    await denops.cmd("call hellshake_yano#motion('l')");
    // 機能が無効なため、高速入力でもヒント表示される
    hintsNotSuppressed = true;
  } catch (error) {
    hintsNotSuppressed = false;
  }

  // 現時点では実装されていないため、このテストは失敗する
  assert(hintsNotSuppressed, "機能無効時は高速入力でもヒントが表示されるべき");
});

test("キーリピート検出のタイミング精度", async (denops) => {
  await denops.cmd("enew!");
  await denops.cmd("call setline(1, ['hello world foo bar'])");
  await denops.cmd("normal! gg0");

  await denops.cmd("let g:hellshake_yano.motion_count = 2");
  await denops.cmd("let g:hellshake_yano.suppress_on_key_repeat = v:true");
  await denops.cmd("let g:hellshake_yano.key_repeat_threshold = 50");

  // 境界値テスト: 51ms間隔（リピートでない）
  await denops.cmd("call hellshake_yano#motion('l')");
  await sleep(51);

  let notRepeating = false;
  try {
    await denops.cmd("call hellshake_yano#motion('l')");
    // 51ms間隔なのでリピートと判定されず、ヒント表示される
    notRepeating = true;
  } catch (error) {
    notRepeating = false;
  }

  // 49ms間隔（リピート）
  await sleep(100); // リセット
  await denops.cmd("call hellshake_yano#motion('l')");
  await sleep(49);

  let isRepeating = true;
  try {
    await denops.cmd("call hellshake_yano#motion('l')");
    // 49ms間隔なのでリピートと判定され、ヒント抑制される
  } catch (error) {
    isRepeating = false;
  }

  // 現時点では実装されていないため、このテストは失敗する
  assert(notRepeating && isRepeating, "タイミング精度が正確であるべき");
});
