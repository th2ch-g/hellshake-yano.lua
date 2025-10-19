/**
 * numeric_multi_char_hints_test.ts - 2桁数字ヒント機能のテスト
 *
 * TDD Phase: RED
 * Process1-sub2: 2桁数字ヒント機能のテスト作成
 *
 * 機能要件:
 * - useNumericMultiCharHints: true の場合、通常のヒント文字の後に00-99の数字ヒントを追加
 * - 最大100個の追加ヒント（00-99）
 * - 既存のヒント生成ロジックとの統合
 *
 * テストカテゴリ:
 * 1. 基本動作テスト
 * 2. 範囲テスト（00-99）
 * 3. 既存ヒントとの統合テスト
 * 4. エッジケーステスト
 */

import { assertEquals } from "jsr:@std/assert";
import { VimHintGenerator } from "../denops/hellshake-yano/vim/core/hint-generator.ts";

Deno.test("2桁数字ヒント - 基本動作", async (t) => {
  await t.step("useNumericMultiCharHints: false で数字ヒントなし", () => {
    const generator = new VimHintGenerator({
      useNumericMultiCharHints: false,
    });

    const hints = generator.generate(10);
    // 通常のヒント生成のみ
    assertEquals(hints.length, 10);
    // 数字ヒントが含まれないことを確認
    const hasNumericHints = hints.some(h => /^\d{2}$/.test(h));
    assertEquals(hasNumericHints, false);
  });

  await t.step("useNumericMultiCharHints: true で数字ヒント追加", () => {
    const generator = new VimHintGenerator({
      useNumericMultiCharHints: true,
    });

    // デフォルトキーの通常ヒント上限: 7単一 + 15*15複数 = 232個
    const normalHintMax = 232;

    // 通常のヒント上限を超える数をリクエスト
    const hints = generator.generate(normalHintMax + 11);

    // 通常ヒント232個 + 数字ヒント11個 = 243個
    assertEquals(hints.length, 243);

    // 最初の1個は単一文字ヒントの先頭
    assertEquals(hints[0], "a");

    // normalHintMax+1個目以降は数字ヒント（Neovim準拠: 01, 02, ..., 09, 10, ...）
    assertEquals(hints[normalHintMax], "01");
    assertEquals(hints[normalHintMax + 1], "02");
    assertEquals(hints[normalHintMax + 9], "10");
  });
});

Deno.test("2桁数字ヒント - 範囲テスト", async (t) => {
  await t.step("00-99の範囲で生成", () => {
    const generator = new VimHintGenerator({
      useNumericMultiCharHints: true,
    });

    // デフォルトキーの通常ヒント上限: 232個
    const normalHintMax = 232;

    // 最大数（通常232個 + 数字100個 = 332個）をリクエスト
    const hints = generator.generate(500);

    // 最大332個まで
    assertEquals(hints.length, 332);

    // 最後の数字ヒントは "00"（Neovim準拠）
    assertEquals(hints[331], "00");

    // 数字ヒント部分を抽出
    const numericHints = hints.slice(normalHintMax);
    assertEquals(numericHints.length, 100);

    // Neovim準拠の順序を確認: 01-09, 10-99, 00
    const expectedOrder = [];
    for (let i = 1; i <= 9; i++) expectedOrder.push(String(i).padStart(2, "0"));
    for (let i = 10; i < 100; i++) expectedOrder.push(String(i).padStart(2, "0"));
    expectedOrder.push("00");

    for (let i = 0; i < 100; i++) {
      assertEquals(numericHints[i], expectedOrder[i], `インデックス${i}で期待値 ${expectedOrder[i]} を取得できませんでした`);
    }
  });

  await t.step("数字ヒントは常に2桁", () => {
    const generator = new VimHintGenerator({
      useNumericMultiCharHints: true,
    });

    // デフォルトキーの通常ヒント上限: 232個
    const normalHintMax = 232;
    const hints = generator.generate(normalHintMax + 11);

    // 数字ヒント部分（インデックスnormalHintMax以降）
    const numericHints = hints.slice(normalHintMax);

    // すべて2桁であることを確認
    numericHints.forEach((hint, i) => {
      assertEquals(hint.length, 2, `ヒント "${hint}" は2桁ではありません`);
      assertEquals(/^\d{2}$/.test(hint), true, `ヒント "${hint}" は数字2桁ではありません`);
    });
  });
});

Deno.test("2桁数字ヒント - 既存ヒントとの統合", async (t) => {
  await t.step("通常ヒント上限前では数字ヒントなし", () => {
    const generator = new VimHintGenerator({
      useNumericMultiCharHints: true,
    });

    // 通常ヒントの範囲内
    const hints = generator.generate(30);
    assertEquals(hints.length, 30);

    // すべて通常のヒント（数字ヒントではない）
    const hasNumericHints = hints.some(h => /^\d{2}$/.test(h));
    assertEquals(hasNumericHints, false);
  });

  await t.step("通常ヒント232個 + 数字ヒント", () => {
    const generator = new VimHintGenerator({
      useNumericMultiCharHints: true,
    });

    // デフォルトキーの通常ヒント上限: 232個
    const normalHintMax = 232;
    const hints = generator.generate(normalHintMax + 51);

    // 232通常 + 51数字 = 283
    assertEquals(hints.length, 283);

    // 境界の確認
    assertEquals(/^\d{2}$/.test(hints[normalHintMax - 1]), false); // 232個目は通常ヒント
    assertEquals(hints[normalHintMax], "01"); // 233個目から数字ヒント（Neovim準拠: 01から開始）
  });

  await t.step("カスタムキーと数字ヒントの共存", () => {
    const generator = new VimHintGenerator({
      singleCharKeys: ["x", "y"],
      multiCharKeys: ["a", "b"],
      useNumericMultiCharHints: true,
    });

    // 2単一 + 4複数(aa,ab,ba,bb) = 6通常 + 数字4 = 10
    const hints = generator.generate(10);
    assertEquals(hints.length, 10);

    // 最初の6個はカスタムヒント
    assertEquals(hints.slice(0, 6), ["x", "y", "aa", "ab", "ba", "bb"]);

    // 残り4個は数字ヒント（Neovim準拠: 01から開始）
    assertEquals(hints.slice(6), ["01", "02", "03", "04"]);
  });
});

Deno.test("2桁数字ヒント - エッジケース", async (t) => {
  await t.step("count=0で空配列", () => {
    const generator = new VimHintGenerator({
      useNumericMultiCharHints: true,
    });

    assertEquals(generator.generate(0), []);
  });

  await t.step("count=1で通常ヒント1個のみ", () => {
    const generator = new VimHintGenerator({
      useNumericMultiCharHints: true,
    });

    const hints = generator.generate(1);
    assertEquals(hints, ["a"]);
  });

  await t.step("上限を超える要求は149個まで", () => {
    const generator = new VimHintGenerator({
      useNumericMultiCharHints: true,
    });

    const hints = generator.generate(1000);
    // 通常232個 + 数字100個 = 332個
    assertEquals(hints.length, 332);
  });

  await t.step("ちょうど232個の要求では数字ヒントなし", () => {
    const generator = new VimHintGenerator({
      useNumericMultiCharHints: true,
    });

    // デフォルトキーの通常ヒント上限: 232個
    const normalHintMax = 232;
    const hints = generator.generate(normalHintMax);
    assertEquals(hints.length, 232);

    // すべて通常ヒント
    const hasNumericHints = hints.some(h => /^\d{2}$/.test(h));
    assertEquals(hasNumericHints, false);
  });

  await t.step("233個の要求で1個の数字ヒント", () => {
    const generator = new VimHintGenerator({
      useNumericMultiCharHints: true,
    });

    // デフォルトキーの通常ヒント上限: 232個
    const normalHintMax = 232;
    const hints = generator.generate(normalHintMax + 1);
    assertEquals(hints.length, 233);
    assertEquals(hints[normalHintMax], "01"); // Neovim準拠: 01から開始
  });
});
