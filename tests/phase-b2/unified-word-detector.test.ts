/**
 * unified-word-detector.ts のテスト
 *
 * TDD Phase: RED
 * Process2-sub1: テストファイル作成
 *
 * VimScript版のword_detector.vimと完全互換性を保証するテストスイート
 *
 * テストカテゴリ:
 * 1. 基本機能テスト（4件）
 * 2. VimScript完全互換テスト（3件）
 * 3. エッジケーステスト（3件）
 */

import { assertEquals } from "jsr:@std/assert";
import { assertSpyCallArgs, assertSpyCalls, returnsNext, stub } from "jsr:@std/testing/mock";
import type { Denops } from "@denops/std";
import {
  UnifiedWordDetector,
} from "../../denops/hellshake-yano/phase-b2/unified-word-detector.ts";
import type { DenopsWord } from "../../denops/hellshake-yano/phase-b2/vimscript-types.ts";

// モックDenopsインスタンスの作成ヘルパー
function createMockDenops(): Denops {
  return {
    name: "hellshake-yano",
    dispatcher: {},
    redraw: () => Promise.resolve(),
    eval: () => Promise.resolve(0),
    call: () => Promise.resolve(""),
  } as unknown as Denops;
}

Deno.test("基本機能テスト", async (t) => {
  await t.step("空のバッファで空配列を返す", async () => {
    const denops = createMockDenops();

    // line('w0') = 0, line('w$') = 0 をモック
    const evalStub = stub(
      denops,
      "eval",
      returnsNext([
        Promise.resolve(0), // line('w0')
        Promise.resolve(0), // line('w$')
      ]),
    );

    const detector = new UnifiedWordDetector(denops);
    const result = await detector.detectVisible();

    assertEquals(result, []);

    evalStub.restore();
  });

  await t.step("単一行の単語を正しく検出", async () => {
    const denops = createMockDenops();

    // line('w0') = 1, line('w$') = 1, getline(1) = "hello world"
    const evalStub = stub(
      denops,
      "eval",
      returnsNext([
        Promise.resolve(1), // line('w0')
        Promise.resolve(1), // line('w$')
      ]),
    );

    const callStub = stub(
      denops,
      "call",
      returnsNext([
        Promise.resolve("hello world"), // getline(1)
      ]),
    );

    const detector = new UnifiedWordDetector(denops);
    const result = await detector.detectVisible();

    assertEquals(result.length, 2);
    assertEquals(result[0].text, "hello");
    assertEquals(result[0].line, 1);
    assertEquals(result[0].col, 1);
    assertEquals(result[1].text, "world");
    assertEquals(result[1].line, 1);
    assertEquals(result[1].col, 7);

    evalStub.restore();
    callStub.restore();
  });

  await t.step("複数行の単語を検出", async () => {
    const denops = createMockDenops();

    // line('w0') = 1, line('w$') = 3
    const evalStub = stub(
      denops,
      "eval",
      returnsNext([
        Promise.resolve(1), // line('w0')
        Promise.resolve(3), // line('w$')
      ]),
    );

    const callStub = stub(
      denops,
      "call",
      returnsNext([
        Promise.resolve("foo"), // getline(1)
        Promise.resolve("bar"), // getline(2)
        Promise.resolve("baz"), // getline(3)
      ]),
    );

    const detector = new UnifiedWordDetector(denops);
    const result = await detector.detectVisible();

    assertEquals(result.length, 3);
    assertEquals(result[0].text, "foo");
    assertEquals(result[0].line, 1);
    assertEquals(result[1].text, "bar");
    assertEquals(result[1].line, 2);
    assertEquals(result[2].text, "baz");
    assertEquals(result[2].line, 3);

    evalStub.restore();
    callStub.restore();
  });

  await t.step("空行を正しくスキップ", async () => {
    const denops = createMockDenops();

    // line('w0') = 1, line('w$') = 3
    const evalStub = stub(
      denops,
      "eval",
      returnsNext([
        Promise.resolve(1), // line('w0')
        Promise.resolve(3), // line('w$')
      ]),
    );

    const callStub = stub(
      denops,
      "call",
      returnsNext([
        Promise.resolve("foo"), // getline(1)
        Promise.resolve(""), // getline(2) - 空行
        Promise.resolve("bar"), // getline(3)
      ]),
    );

    const detector = new UnifiedWordDetector(denops);
    const result = await detector.detectVisible();

    assertEquals(result.length, 2);
    assertEquals(result[0].text, "foo");
    assertEquals(result[0].line, 1);
    assertEquals(result[1].text, "bar");
    assertEquals(result[1].line, 3);

    evalStub.restore();
    callStub.restore();
  });
});

Deno.test("VimScript完全互換テスト", async (t) => {
  await t.step("matchstrpos()と同じ位置情報を返す", async () => {
    const denops = createMockDenops();

    // "hello world" の場合:
    // - "hello": start=0, end=5 → col=1 (0+1)
    // - "world": start=6, end=11 → col=7 (6+1)
    const evalStub = stub(
      denops,
      "eval",
      returnsNext([
        Promise.resolve(1), // line('w0')
        Promise.resolve(1), // line('w$')
      ]),
    );

    const callStub = stub(
      denops,
      "call",
      returnsNext([
        Promise.resolve("hello world"), // getline(1)
      ]),
    );

    const detector = new UnifiedWordDetector(denops);
    const result = await detector.detectVisible();

    // VimScript版のmatchstrpos()と同じ位置情報
    assertEquals(result[0].col, 1); // matchstrpos start(0) + 1
    assertEquals(result[1].col, 7); // matchstrpos start(6) + 1

    evalStub.restore();
    callStub.restore();
  });

  await t.step("line('w0')とline('w$')の範囲制限を守る", async () => {
    const denops = createMockDenops();

    // line('w0') = 2, line('w$') = 3 (1行目と4行目は範囲外)
    const evalStub = stub(
      denops,
      "eval",
      returnsNext([
        Promise.resolve(2), // line('w0')
        Promise.resolve(3), // line('w$')
      ]),
    );

    const callStub = stub(
      denops,
      "call",
      returnsNext([
        Promise.resolve("line2"), // getline(2)
        Promise.resolve("line3"), // getline(3)
      ]),
    );

    const detector = new UnifiedWordDetector(denops);
    const result = await detector.detectVisible();

    // 範囲内の行のみ検出
    assertEquals(result.length, 2);
    assertEquals(result[0].line, 2);
    assertEquals(result[1].line, 3);

    // getlineは2回だけ呼ばれる（範囲外の行は呼ばれない）
    assertSpyCalls(callStub, 2);

    evalStub.restore();
    callStub.restore();
  });

  await t.step("VimScript版と同一の単語リストを返す", async () => {
    const denops = createMockDenops();

    // VimScript版と同じテストケース
    const evalStub = stub(
      denops,
      "eval",
      returnsNext([
        Promise.resolve(1), // line('w0')
        Promise.resolve(1), // line('w$')
      ]),
    );

    const callStub = stub(
      denops,
      "call",
      returnsNext([
        Promise.resolve("foo_bar baz123"), // getline(1)
      ]),
    );

    const detector = new UnifiedWordDetector(denops);
    const result = await detector.detectVisible();

    // VimScript版の \w\+ パターンと同じ結果
    assertEquals(result.length, 2);
    assertEquals(result[0].text, "foo_bar");
    assertEquals(result[1].text, "baz123");

    evalStub.restore();
    callStub.restore();
  });
});

Deno.test("エッジケーステスト", async (t) => {
  await t.step("日本語を含む行（Phase B-3で対応予定）", async () => {
    const denops = createMockDenops();

    const evalStub = stub(
      denops,
      "eval",
      returnsNext([
        Promise.resolve(1), // line('w0')
        Promise.resolve(1), // line('w$')
      ]),
    );

    const callStub = stub(
      denops,
      "call",
      returnsNext([
        Promise.resolve("hello こんにちは world"), // getline(1)
      ]),
    );

    const detector = new UnifiedWordDetector(denops);
    const result = await detector.detectVisible();

    // Phase B-2では英数字のみ対応（日本語はスキップ）
    assertEquals(result.length, 2);
    assertEquals(result[0].text, "hello");
    assertEquals(result[1].text, "world");

    evalStub.restore();
    callStub.restore();
  });

  await t.step("特殊文字のみの行", async () => {
    const denops = createMockDenops();

    const evalStub = stub(
      denops,
      "eval",
      returnsNext([
        Promise.resolve(1), // line('w0')
        Promise.resolve(1), // line('w$')
      ]),
    );

    const callStub = stub(
      denops,
      "call",
      returnsNext([
        Promise.resolve("!@#$%^&*()"), // getline(1)
      ]),
    );

    const detector = new UnifiedWordDetector(denops);
    const result = await detector.detectVisible();

    // 特殊文字のみの行は単語なし
    assertEquals(result, []);

    evalStub.restore();
    callStub.restore();
  });

  await t.step("最大単語数の制限なし（呼び出し側で制限）", async () => {
    const denops = createMockDenops();

    // 10単語を含む行
    const manyWords = Array.from({ length: 10 }, (_, i) => `word${i}`).join(" ");

    const evalStub = stub(
      denops,
      "eval",
      returnsNext([
        Promise.resolve(1), // line('w0')
        Promise.resolve(1), // line('w$')
      ]),
    );

    const callStub = stub(
      denops,
      "call",
      returnsNext([
        Promise.resolve(manyWords), // getline(1)
      ]),
    );

    const detector = new UnifiedWordDetector(denops);
    const result = await detector.detectVisible();

    // 全ての単語を検出（制限なし）
    assertEquals(result.length, 10);

    evalStub.restore();
    callStub.restore();
  });
});

Deno.test("VimScript完全互換性: 座標計算テスト", async (t) => {
  await t.step("0-indexed → 1-indexed変換の正確性", async () => {
    const denops = createMockDenops();

    const evalStub = stub(
      denops,
      "eval",
      returnsNext([
        Promise.resolve(1), // line('w0')
        Promise.resolve(1), // line('w$')
      ]),
    );

    const callStub = stub(
      denops,
      "call",
      returnsNext([
        Promise.resolve("  hello"), // getline(1) - 先頭に2つのスペース
      ]),
    );

    const detector = new UnifiedWordDetector(denops);
    const result = await detector.detectVisible();

    // "  hello" の "hello" は位置2（0-indexed）から開始
    // VimScript matchstrpos は [match, 2, 7] を返す
    // col は 2 + 1 = 3（1-indexed）
    assertEquals(result[0].col, 3);

    evalStub.restore();
    callStub.restore();
  });

  await t.step("複数の単語の位置が正確", async () => {
    const denops = createMockDenops();

    const evalStub = stub(
      denops,
      "eval",
      returnsNext([
        Promise.resolve(1), // line('w0')
        Promise.resolve(1), // line('w$')
      ]),
    );

    const callStub = stub(
      denops,
      "call",
      returnsNext([
        Promise.resolve("a bc def"), // getline(1)
      ]),
    );

    const detector = new UnifiedWordDetector(denops);
    const result = await detector.detectVisible();

    // "a": 位置0 → col=1
    // "bc": 位置2 → col=3
    // "def": 位置5 → col=6
    assertEquals(result[0].col, 1);
    assertEquals(result[1].col, 3);
    assertEquals(result[2].col, 6);

    evalStub.restore();
    callStub.restore();
  });
});
