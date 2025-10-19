/**
 * visual.ts のテスト
 *
 * TDD Phase: RED
 * Process10-sub1: テストファイル作成
 */

import { assertEquals } from "jsr:@std/assert";
import { returnsNext, stub } from "jsr:@std/testing/mock";
import type { Denops } from "@denops/std";
import { VimVisual, VisualMode } from "../../../denops/hellshake-yano/vim/features/visual.ts";

function createMockDenops(): Denops {
  return {
    name: "hellshake-yano",
    dispatcher: {},
    redraw: () => Promise.resolve(),
    eval: () => Promise.resolve(0),
    call: () => Promise.resolve(0),
  } as unknown as Denops;
}

Deno.test("VimVisual: ビジュアルモード", async (t) => {
  await t.step("ビジュアルモード検出", async () => {
    const denops = createMockDenops();

    const evalStub = stub(
      denops,
      "eval",
      returnsNext([Promise.resolve("v")]),
    );

    const visual = new VimVisual(denops);
    const mode = await visual.getVisualMode();

    assertEquals(mode, VisualMode.Characterwise);
    evalStub.restore();
  });

  await t.step("ビジュアル範囲取得", async () => {
    const denops = createMockDenops();

    const evalStub = stub(
      denops,
      "eval",
      returnsNext([
        Promise.resolve("v"),
        Promise.resolve(5),
        Promise.resolve(3),
        Promise.resolve(10),
        Promise.resolve(8),
      ]),
    );

    const visual = new VimVisual(denops);
    const range = await visual.getVisualRange();

    assertEquals(range.mode, VisualMode.Characterwise);
    assertEquals(range.startLine, 5);
    assertEquals(range.startCol, 3);
    assertEquals(range.endLine, 10);
    assertEquals(range.endCol, 8);

    evalStub.restore();
  });

  await t.step("ビジュアルモード状態確認", () => {
    const denops = createMockDenops();
    const visual = new VimVisual(denops);

    assertEquals(visual.isInVisualMode(), false);
  });
});
