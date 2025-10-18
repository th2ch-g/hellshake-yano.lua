/**
 * unified-hint-generator.ts のテスト
 *
 * TDD Phase: RED
 * Process4-sub1: テストファイル作成
 *
 * VimScript版のhint_generator.vimと完全互換性を保証するテストスイート
 *
 * テストカテゴリ:
 * 1. 単一文字ヒントテスト（2件）
 * 2. 複数文字ヒントテスト（3件）
 * 3. VimScript互換性テスト（3件）
 */

import { assertEquals } from "jsr:@std/assert";
import { UnifiedHintGenerator } from "../../denops/hellshake-yano/phase-b2/unified-hint-generator.ts";

Deno.test("単一文字ヒントテスト", async (t) => {
  await t.step("7個以下で単一文字のみ", () => {
    const generator = new UnifiedHintGenerator();

    // 3個の場合
    const hints3 = generator.generate(3);
    assertEquals(hints3, ["a", "s", "d"]);

    // 7個の場合（最大単一文字数）
    const hints7 = generator.generate(7);
    assertEquals(hints7, ["a", "s", "d", "f", "g", "n", "m"]);
  });

  await t.step("カスタムキー設定に対応", () => {
    // カスタム単一文字キー
    const customKeys = ["x", "y", "z"];
    const generator = new UnifiedHintGenerator({
      singleCharKeys: customKeys,
    });

    const hints = generator.generate(3);
    assertEquals(hints, ["x", "y", "z"]);
  });
});

Deno.test("複数文字ヒントテスト", async (t) => {
  await t.step("8個以上で複数文字を含む", () => {
    const generator = new UnifiedHintGenerator();

    // 8個の場合（7単一文字 + 1複数文字）
    const hints8 = generator.generate(8);
    assertEquals(hints8.length, 8);
    assertEquals(hints8.slice(0, 7), ["a", "s", "d", "f", "g", "n", "m"]);
    assertEquals(hints8[7], "bb"); // 最初の複数文字ヒント
  });

  await t.step("2文字ヒントの生成順序", () => {
    const generator = new UnifiedHintGenerator();

    // 14個の場合（7単一文字 + 7複数文字）
    const hints14 = generator.generate(14);
    assertEquals(hints14.length, 14);

    // VimScript版の生成順序と一致
    // multi_char_keys = 'bceiopqrtuvwxyz'
    // bb, bc, be, bi, bo, bp, bq
    assertEquals(hints14.slice(7, 14), [
      "bb",
      "bc",
      "be",
      "bi",
      "bo",
      "bp",
      "bq",
    ]);
  });

  await t.step("最大49個の制限", () => {
    const generator = new UnifiedHintGenerator();

    // 100個要求しても49個まで
    const hints100 = generator.generate(100);
    assertEquals(hints100.length, 49);

    // 先頭7個は単一文字
    assertEquals(hints100.slice(0, 7), ["a", "s", "d", "f", "g", "n", "m"]);

    // 残り42個は複数文字
    assertEquals(hints100.length - 7, 42);
  });
});

Deno.test("VimScript互換性テスト", async (t) => {
  await t.step("VimScript版と同じヒント順序", () => {
    const generator = new UnifiedHintGenerator();

    // VimScript版のテストケースと一致
    const hints = generator.generate(14);

    // 期待値: ['a', 's', 'd', 'f', 'g', 'n', 'm', 'bb', 'bc', 'be', 'bi', 'bo', 'bp', 'bq']
    assertEquals(hints, [
      "a",
      "s",
      "d",
      "f",
      "g",
      "n",
      "m",
      "bb",
      "bc",
      "be",
      "bi",
      "bo",
      "bp",
      "bq",
    ]);
  });

  await t.step("単一文字キーと複数文字キーの分離", () => {
    const generator = new UnifiedHintGenerator();

    const hints = generator.generate(10);

    // 最初の7個は単一文字キー（asdfgnm）
    assertEquals(hints.slice(0, 7), ["a", "s", "d", "f", "g", "n", "m"]);

    // 8個目以降は複数文字キー（bceiopqrtuvwxyzから生成）
    assertEquals(hints[7], "bb");
    assertEquals(hints[8], "bc");
    assertEquals(hints[9], "be");
  });

  await t.step("グローバル変数カスタマイズ対応", () => {
    // VimScript版: g:hellshake_yano_vim_single_char_keys
    // TypeScript版: コンストラクタオプション
    const generator = new UnifiedHintGenerator({
      singleCharKeys: ["1", "2", "3"],
      multiCharKeys: ["a", "b", "c"],
    });

    const hints = generator.generate(5);
    assertEquals(hints, ["1", "2", "3", "aa", "ab"]);
  });
});

Deno.test("エッジケーステスト", async (t) => {
  await t.step("count が 0 以下で空配列", () => {
    const generator = new UnifiedHintGenerator();

    assertEquals(generator.generate(0), []);
    assertEquals(generator.generate(-5), []);
  });

  await t.step("count が 1 で1文字のみ", () => {
    const generator = new UnifiedHintGenerator();

    assertEquals(generator.generate(1), ["a"]);
  });

  await t.step("最大49個を超える場合は49個まで", () => {
    const generator = new UnifiedHintGenerator();

    const hints = generator.generate(1000);
    assertEquals(hints.length, 49);
  });
});

Deno.test("アルゴリズムテスト", async (t) => {
  await t.step("インデックス計算の正確性", () => {
    const generator = new UnifiedHintGenerator();

    const hints = generator.generate(20);

    // multi_char_keys = 'bceiopqrtuvwxyz' (15文字)
    // i=0: first_idx=0, second_idx=0 → 'bb'
    // i=1: first_idx=0, second_idx=1 → 'bc'
    // i=14: first_idx=0, second_idx=14 → 'bz'
    // i=15: first_idx=1, second_idx=0 → 'cb'

    assertEquals(hints[7], "bb"); // i=0
    assertEquals(hints[8], "bc"); // i=1
    assertEquals(hints[9], "be"); // i=2
  });

  await t.step("カスタムキーでの2文字ヒント生成", () => {
    const generator = new UnifiedHintGenerator({
      singleCharKeys: ["a"],
      multiCharKeys: ["x", "y"],
    });

    const hints = generator.generate(5);
    // 1単一文字 + 4複数文字
    assertEquals(hints, ["a", "xx", "xy", "yx", "yy"]);
  });
});
