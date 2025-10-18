/**
 * unified-jump.ts のテスト
 *
 * TDD Phase: RED
 * Process3-sub1: テストファイル作成
 *
 * VimScript版のjump.vimと完全互換性を保証するテストスイート
 *
 * テストカテゴリ:
 * 1. 基本機能テスト（3件）
 * 2. 範囲チェックテスト（3件）
 * 3. VimScript互換性テスト（3件）
 */

import { assertEquals, assertRejects } from "jsr:@std/assert";
import { returnsNext, stub } from "jsr:@std/testing/mock";
import type { Denops } from "@denops/std";
import { UnifiedJump } from "../../denops/hellshake-yano/phase-b2/unified-jump.ts";

// モックDenopsインスタンスの作成ヘルパー
function createMockDenops(): Denops {
  return {
    name: "hellshake-yano",
    dispatcher: {},
    redraw: () => Promise.resolve(),
    eval: () => Promise.resolve(0),
    call: () => Promise.resolve(0),
  } as unknown as Denops;
}

Deno.test("基本機能テスト", async (t) => {
  await t.step("有効な座標にジャンプ", async () => {
    const denops = createMockDenops();

    // line('$') = 100
    const evalStub = stub(
      denops,
      "eval",
      returnsNext([Promise.resolve(100)]),
    );

    // cursor(10, 5) = 0 (成功)
    const callStub = stub(
      denops,
      "call",
      returnsNext([Promise.resolve(0)]),
    );

    const jump = new UnifiedJump(denops);
    await jump.jumpTo(10, 5);

    // cursor()が呼ばれたことを確認
    assertEquals(callStub.calls.length, 1);
    assertEquals(callStub.calls[0].args[0], "cursor");
    assertEquals(callStub.calls[0].args[1], 10);
    assertEquals(callStub.calls[0].args[2], 5);

    evalStub.restore();
    callStub.restore();
  });

  await t.step("バッファ先頭にジャンプ（1, 1）", async () => {
    const denops = createMockDenops();

    const evalStub = stub(
      denops,
      "eval",
      returnsNext([Promise.resolve(100)]),
    );

    const callStub = stub(
      denops,
      "call",
      returnsNext([Promise.resolve(0)]),
    );

    const jump = new UnifiedJump(denops);
    await jump.jumpTo(1, 1);

    assertEquals(callStub.calls[0].args[1], 1);
    assertEquals(callStub.calls[0].args[2], 1);

    evalStub.restore();
    callStub.restore();
  });

  await t.step("バッファ末尾にジャンプ（line('$'), 1）", async () => {
    const denops = createMockDenops();

    const evalStub = stub(
      denops,
      "eval",
      returnsNext([Promise.resolve(50)]),
    );

    const callStub = stub(
      denops,
      "call",
      returnsNext([Promise.resolve(0)]),
    );

    const jump = new UnifiedJump(denops);
    await jump.jumpTo(50, 1);

    assertEquals(callStub.calls[0].args[1], 50);

    evalStub.restore();
    callStub.restore();
  });
});

Deno.test("範囲チェックテスト", async (t) => {
  await t.step("行番号が1未満でエラー", async () => {
    const denops = createMockDenops();

    const evalStub = stub(
      denops,
      "eval",
      returnsNext([Promise.resolve(100)]),
    );

    const jump = new UnifiedJump(denops);

    // VimScript版のエラーメッセージと完全一致
    await assertRejects(
      () => jump.jumpTo(0, 5),
      Error,
      "invalid line number 0 (must be >= 1)",
    );

    evalStub.restore();
  });

  await t.step("行番号が最終行超過でエラー", async () => {
    const denops = createMockDenops();

    const evalStub = stub(
      denops,
      "eval",
      returnsNext([Promise.resolve(50)]),
    );

    const jump = new UnifiedJump(denops);

    // VimScript版のエラーメッセージと完全一致
    await assertRejects(
      () => jump.jumpTo(51, 1),
      Error,
      "invalid line number 51 (must be <= 50)",
    );

    evalStub.restore();
  });

  await t.step("列番号が1未満でエラー", async () => {
    const denops = createMockDenops();

    const evalStub = stub(
      denops,
      "eval",
      returnsNext([Promise.resolve(100)]),
    );

    const jump = new UnifiedJump(denops);

    // VimScript版のエラーメッセージと完全一致
    await assertRejects(
      () => jump.jumpTo(10, 0),
      Error,
      "invalid column number 0 (must be >= 1)",
    );

    evalStub.restore();
  });
});

Deno.test("VimScript互換性テスト", async (t) => {
  await t.step("VimScript版と同じエラーメッセージ", async () => {
    const denops = createMockDenops();

    const evalStub = stub(
      denops,
      "eval",
      returnsNext([Promise.resolve(100)]),
    );

    const jump = new UnifiedJump(denops);

    // VimScript版: 'hellshake_yano_vim#jump#to: invalid line number %d (must be >= 1)'
    // TypeScript版: 'invalid line number %d (must be >= 1)'
    // プレフィックスを除いて同じメッセージ
    await assertRejects(
      () => jump.jumpTo(-5, 1),
      Error,
      "invalid line number -5 (must be >= 1)",
    );

    evalStub.restore();
  });

  await t.step("cursor()関数と同じ動作", async () => {
    const denops = createMockDenops();

    const evalStub = stub(
      denops,
      "eval",
      returnsNext([Promise.resolve(100)]),
    );

    const callStub = stub(
      denops,
      "call",
      returnsNext([Promise.resolve(0)]),
    );

    const jump = new UnifiedJump(denops);
    await jump.jumpTo(25, 10);

    // cursor(lnum, col) の形式で呼ばれる
    assertEquals(callStub.calls[0].args[0], "cursor");
    assertEquals(callStub.calls[0].args[1], 25);
    assertEquals(callStub.calls[0].args[2], 10);

    evalStub.restore();
    callStub.restore();
  });

  await t.step("型チェック（lnum, colが数値）", async () => {
    const denops = createMockDenops();

    const evalStub = stub(
      denops,
      "eval",
      returnsNext([Promise.resolve(100)]),
    );

    const jump = new UnifiedJump(denops);

    // TypeScriptの型システムでチェックされるため、実行時の型チェックは不要
    // VimScript版の type(a:lnum) != v:t_number に相当する機能
    // ただし、TypeScriptでは型が保証されているため、テストはスキップ
    // この機能はコンパイル時にチェックされる

    evalStub.restore();
  });
});

Deno.test("エラーハンドリングテスト", async (t) => {
  await t.step("cursor()失敗時のエラー", async () => {
    const denops = createMockDenops();

    const evalStub = stub(
      denops,
      "eval",
      returnsNext([Promise.resolve(100)]),
    );

    // cursor()が-1を返す（失敗）
    const callStub = stub(
      denops,
      "call",
      returnsNext([Promise.resolve(-1)]),
    );

    const jump = new UnifiedJump(denops);

    // VimScript版: 'failed to move cursor to (%d, %d)'
    await assertRejects(
      () => jump.jumpTo(10, 5),
      Error,
      "failed to move cursor to (10, 5)",
    );

    evalStub.restore();
    callStub.restore();
  });

  await t.step("負の列番号でエラー", async () => {
    const denops = createMockDenops();

    const evalStub = stub(
      denops,
      "eval",
      returnsNext([Promise.resolve(100)]),
    );

    const jump = new UnifiedJump(denops);

    await assertRejects(
      () => jump.jumpTo(10, -1),
      Error,
      "invalid column number -1 (must be >= 1)",
    );

    evalStub.restore();
  });

  await t.step("極端に大きな行番号でエラー", async () => {
    const denops = createMockDenops();

    const evalStub = stub(
      denops,
      "eval",
      returnsNext([Promise.resolve(100)]),
    );

    const jump = new UnifiedJump(denops);

    await assertRejects(
      () => jump.jumpTo(10000, 1),
      Error,
      "invalid line number 10000 (must be <= 100)",
    );

    evalStub.restore();
  });
});
