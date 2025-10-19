/**
 * popup-display.ts のテスト
 *
 * TDD Phase: RED
 * Process6-sub1: テストファイル作成
 *
 * Vim環境でのpopup_create()を使用したヒント表示テスト
 */

import { assertEquals } from "jsr:@std/assert";
import { returnsNext, stub } from "jsr:@std/testing/mock";
import type { Denops } from "@denops/std";
import { VimPopupDisplay } from "../../../denops/hellshake-yano/vim/display/popup-display.ts";

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

Deno.test("popup-display: ヒント表示機能", async (t) => {
  await t.step("単一ヒント表示", async () => {
    const denops = createMockDenops();

    // popup_create() が成功（ID 1を返す）
    const callStub = stub(
      denops,
      "call",
      returnsNext([Promise.resolve(1)]),
    );

    const display = new VimPopupDisplay(denops);
    const hintId = await display.showHint(10, 5, "a");

    // popup_create が呼ばれたことを確認
    assertEquals(callStub.calls.length, 1);
    assertEquals(callStub.calls[0].args[0], "popup_create");
    assertEquals(hintId, 1);

    callStub.restore();
  });

  await t.step("複数ヒント表示", async () => {
    const denops = createMockDenops();

    // popup_create() が複数回呼ばれ、異なるIDを返す
    const callStub = stub(
      denops,
      "call",
      returnsNext([
        Promise.resolve(1),
        Promise.resolve(2),
        Promise.resolve(3),
      ]),
    );

    const display = new VimPopupDisplay(denops);
    const id1 = await display.showHint(1, 1, "a");
    const id2 = await display.showHint(2, 5, "s");
    const id3 = await display.showHint(3, 10, "d");

    assertEquals(id1, 1);
    assertEquals(id2, 2);
    assertEquals(id3, 3);
    assertEquals(display.getPopupCount(), 3);

    callStub.restore();
  });

  await t.step("全ヒント非表示", async () => {
    const denops = createMockDenops();

    // popup_create() 2回、popup_close() 2回
    const callStub = stub(
      denops,
      "call",
      returnsNext([
        Promise.resolve(1),
        Promise.resolve(2),
        Promise.resolve(0),
        Promise.resolve(0),
      ]),
    );

    const display = new VimPopupDisplay(denops);
    await display.showHint(1, 1, "a");
    await display.showHint(2, 1, "s");

    await display.hideAll();

    // popup_close が2回呼ばれたことを確認
    const closeCalls = callStub.calls.filter((c) => c.args[0] === "popup_close");
    assertEquals(closeCalls.length, 2);
    assertEquals(display.getPopupCount(), 0);

    callStub.restore();
  });
});

Deno.test("popup-display: 部分マッチハイライト", async (t) => {
  await t.step("マッチするヒントのみ保持", async () => {
    const denops = createMockDenops();

    // popup_create() 3回、popup_close() 1回
    const callStub = stub(
      denops,
      "call",
      returnsNext([
        Promise.resolve(1),
        Promise.resolve(2),
        Promise.resolve(3),
        Promise.resolve(0),
      ]),
    );

    const display = new VimPopupDisplay(denops);
    await display.showHint(1, 1, "a");
    await display.showHint(2, 5, "aa");
    await display.showHint(3, 10, "b");

    // 'a' で始まるヒントのみ保持
    await display.highlightPartialMatches(["a", "aa"]);

    // 'b' のpopup_close が呼ばれたことを確認
    const closeCalls = callStub.calls.filter((c) => c.args[0] === "popup_close");
    assertEquals(closeCalls.length, 1);
    assertEquals(display.getPopupCount(), 2);

    callStub.restore();
  });
});

Deno.test("popup-display: エラーハンドリング", async (t) => {
  await t.step("popup_create失敗時", async () => {
    const denops = createMockDenops();

    // popup_create() が-1を返す（失敗）
    const callStub = stub(
      denops,
      "call",
      returnsNext([Promise.resolve(-1)]),
    );

    const display = new VimPopupDisplay(denops);

    try {
      await display.showHint(10, 5, "a");
      // エラーが発生するはず
      assertEquals(true, false, "エラーが発生するはず");
    } catch (e) {
      assertEquals(e instanceof Error, true);
    }

    callStub.restore();
  });
});
