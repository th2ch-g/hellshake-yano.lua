/**
 * tests/phase-b1/side-effect-checker.test.ts
 *
 * SideEffectCheckerのテスト
 *
 * Process: phase-b1, sub2.2
 */

import { test } from "../testRunner.ts";
import { assertEquals, assertExists } from "@std/assert";
import { SideEffectChecker } from "../../denops/hellshake-yano/phase-b1/side-effect-checker.ts";

test("SideEffectChecker: カーソル位置の保存", async (denops) => {
  const checker = new SideEffectChecker(denops);

  // テスト用のバッファを作成
  await denops.call("setline", 1, [
    "line 1",
    "line 2",
    "line 3",
  ]);

  // カーソルを2行目、5列目に移動
  await denops.call("cursor", 2, 5);

  // 状態を保存
  const state = await checker.save();

  // カーソル位置が保存されていることを確認
  assertExists(state.cursorPosition, "カーソル位置が保存されること");
  assertEquals(state.cursorPosition.length, 4, "カーソル位置は4要素の配列");
});

test("SideEffectChecker: カーソル位置の復元", async (denops) => {
  const checker = new SideEffectChecker(denops);

  // テスト用のバッファを作成
  await denops.call("setline", 1, [
    "hello world",
    "test line",
    "foo bar",
  ]);

  // 初期位置: 2行目、3列目
  await denops.call("cursor", 2, 3);
  const originalPos = await denops.call("getpos", ".") as number[];

  // 状態を保存
  const state = await checker.save();

  // カーソルを移動
  await denops.call("cursor", 3, 7);

  // 状態を復元
  await checker.restore(state);

  // カーソル位置が復元されていることを確認
  const restoredPos = await denops.call("getpos", ".") as number[];
  assertEquals(restoredPos[1], originalPos[1], "行番号が復元されること");
  assertEquals(restoredPos[2], originalPos[2], "列番号が復元されること");
});

test("SideEffectChecker: withSafeExecution - 正常系", async (denops) => {
  const checker = new SideEffectChecker(denops);

  // テスト用のバッファを作成
  await denops.call("setline", 1, [
    "test line 1",
    "test line 2",
  ]);

  // 初期位置: 1行目、1列目
  await denops.call("cursor", 1, 1);
  const originalPos = await denops.call("getpos", ".") as number[];

  // 副作用を管理しながら関数を実行
  const result = await checker.withSafeExecution(async () => {
    // 関数内でカーソルを移動
    await denops.call("cursor", 2, 5);

    // 何か値を返す
    return "success";
  });

  // 関数の戻り値が正しいこと
  assertEquals(result, "success", "関数の戻り値が正しいこと");

  // カーソル位置が復元されていること
  const restoredPos = await denops.call("getpos", ".") as number[];
  assertEquals(restoredPos[1], originalPos[1], "行番号が復元されること");
  assertEquals(restoredPos[2], originalPos[2], "列番号が復元されること");
});

test("SideEffectChecker: withSafeExecution - エラー時も復元", async (denops) => {
  const checker = new SideEffectChecker(denops);

  // テスト用のバッファを作成
  await denops.call("setline", 1, [
    "error test line 1",
    "error test line 2",
  ]);

  // 初期位置: 1行目、3列目
  await denops.call("cursor", 1, 3);
  const originalPos = await denops.call("getpos", ".") as number[];

  try {
    // エラーを発生させる関数を実行
    await checker.withSafeExecution(async () => {
      // カーソルを移動
      await denops.call("cursor", 2, 8);

      // エラーを投げる
      throw new Error("test error");
    });
  } catch (_error) {
    // エラーは無視
  }

  // エラー時もカーソル位置が復元されていること
  const restoredPos = await denops.call("getpos", ".") as number[];
  assertEquals(restoredPos[1], originalPos[1], "エラー時も行番号が復元されること");
  assertEquals(restoredPos[2], originalPos[2], "エラー時も列番号が復元されること");
});
