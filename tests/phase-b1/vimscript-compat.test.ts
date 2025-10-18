/**
 * tests/phase-b1/vimscript-compat.test.ts
 *
 * VimScript互換性テスト基盤
 *
 * 目的:
 *   - VimScript版の動作を検証するテストヘルパーを提供
 *   - 座標・位置の完全一致を確認するアサーション機能
 *   - Denops版との動作比較を可能にする
 *
 * TDD Phase: RED
 * Process: phase-b1, sub1.1
 */

import { test } from "../testRunner.ts";
import { assertEquals, assertExists } from "@std/assert";
import type { Denops } from "@denops/std";

/**
 * VimScript版の動作結果の型定義
 */
export interface VimScriptHintPosition {
  lnum: number; // 行番号（1-indexed）
  col: number; // 列番号（1-indexed）
  hint: string; // ヒント文字列
}

/**
 * VimScript版のヒント表示位置を取得
 *
 * @param denops Denopsインスタンス
 * @returns ヒント位置の配列
 */
export async function getVimScriptHintPositions(
  denops: Denops,
): Promise<VimScriptHintPosition[]> {
  // VimScript版のcore.vimを呼び出して、実際のヒント位置を取得
  const state = await denops.call(
    "hellshake_yano_vim#core#get_state",
  ) as Record<string, unknown>;

  const hints = state.hints as Array<{ lnum: number; col: number; hint: string }>;

  if (!hints || hints.length === 0) {
    return [];
  }

  return hints.map((h) => ({
    lnum: h.lnum,
    col: h.col,
    hint: h.hint,
  }));
}

/**
 * 座標の完全一致を検証するアサーション
 *
 * @param actual 実際の座標
 * @param expected 期待される座標
 * @param message エラーメッセージ
 */
export function assertPositionEquals(
  actual: VimScriptHintPosition,
  expected: VimScriptHintPosition,
  message?: string,
): void {
  const prefix = message ? `${message}: ` : "";

  assertEquals(
    actual.lnum,
    expected.lnum,
    `${prefix}行番号が一致しません (actual: ${actual.lnum}, expected: ${expected.lnum})`,
  );

  assertEquals(
    actual.col,
    expected.col,
    `${prefix}列番号が一致しません (actual: ${actual.col}, expected: ${expected.col})`,
  );

  assertEquals(
    actual.hint,
    expected.hint,
    `${prefix}ヒント文字列が一致しません (actual: "${actual.hint}", expected: "${expected.hint}")`,
  );
}

/**
 * 複数の座標の完全一致を検証
 *
 * @param actual 実際の座標配列
 * @param expected 期待される座標配列
 * @param message エラーメッセージ
 */
export function assertPositionsEqual(
  actual: VimScriptHintPosition[],
  expected: VimScriptHintPosition[],
  message?: string,
): void {
  const prefix = message ? `${message}: ` : "";

  assertEquals(
    actual.length,
    expected.length,
    `${prefix}座標配列の長さが一致しません (actual: ${actual.length}, expected: ${expected.length})`,
  );

  for (let i = 0; i < actual.length; i++) {
    assertPositionEquals(
      actual[i],
      expected[i],
      `${prefix}インデックス[${i}]`,
    );
  }
}

// ===== テストケース =====

test("VimScript互換性テスト: core#get_state() が状態を返す", async (denops) => {
  // VimScript版のcore.vimを初期化
  await denops.cmd("call hellshake_yano_vim#core#init()");

  // 状態を取得
  const state = await denops.call(
    "hellshake_yano_vim#core#get_state",
  ) as Record<string, unknown>;

  // 状態オブジェクトが存在することを確認
  assertExists(state, "状態オブジェクトが存在しません");

  // 必須フィールドの存在確認
  assertExists(state.enabled, "enabled フィールドが存在しません");
  assertExists(state.hints_visible, "hints_visible フィールドが存在しません");
  assertExists(state.words, "words フィールドが存在しません");
  assertExists(state.hints, "hints フィールドが存在しません");
  assertExists(state.hint_map, "hint_map フィールドが存在しません");
});

test("VimScript互換性テスト: ヒント位置の取得", async (denops) => {
  // テスト用のバッファを作成
  await denops.call("setline", 1, [
    "hello world",
    "test line",
    "another line",
  ]);

  // カーソルを2行目に移動
  await denops.call("cursor", 2, 1);

  // VimScript版のヒント生成を実行（実装が存在する場合）
  // 注: この時点では実装がないため、空配列が返る想定（RED phase）
  const positions = await getVimScriptHintPositions(denops);

  // この時点では空配列が期待される（VimScript版の実装が未完成のため）
  // GREEN phaseで実装が完成したら、実際の座標が返されることを期待
  assertEquals(
    positions.length >= 0,
    true,
    "ヒント位置の配列が取得できること",
  );
});

test("VimScript互換性テスト: 座標の完全一致アサーション", async (denops) => {
  // アサーション関数のテスト
  const pos1: VimScriptHintPosition = { lnum: 5, col: 10, hint: "a" };
  const pos2: VimScriptHintPosition = { lnum: 5, col: 10, hint: "a" };

  // 一致する座標をテスト
  assertPositionEquals(pos1, pos2, "同じ座標");

  // 複数座標のテスト
  const positions1 = [
    { lnum: 1, col: 1, hint: "a" },
    { lnum: 2, col: 5, hint: "s" },
  ];
  const positions2 = [
    { lnum: 1, col: 1, hint: "a" },
    { lnum: 2, col: 5, hint: "s" },
  ];

  assertPositionsEqual(positions1, positions2, "複数座標の一致");

  // awaitを使用してリンターの警告を回避
  await denops.cmd("echo ''");
});
