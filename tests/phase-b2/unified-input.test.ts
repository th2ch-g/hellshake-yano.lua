/**
 * unified-input.ts のテスト
 *
 * TDD Phase: RED
 * Process5-sub1: テストファイル作成
 *
 * VimScript版のinput.vimと完全互換性を保証するテストスイート
 *
 * テストカテゴリ:
 * 1. 部分マッチテスト（2件）
 * 2. VimScript互換性テスト（4件）
 */

import { assertEquals } from "jsr:@std/assert";
import { UnifiedInput } from "../../denops/hellshake-yano/phase-b2/unified-input.ts";

Deno.test("部分マッチテスト", async (t) => {
  await t.step("部分マッチの正確な検出", () => {
    const input = new UnifiedInput();

    const hintMap = {
      "a": { line: 10, col: 5 },
      "aa": { line: 15, col: 3 },
      "as": { line: 20, col: 7 },
      "b": { line: 25, col: 1 },
    };

    // 'a' で始まるヒントを検出
    const matches = input.getPartialMatches("a", hintMap);
    assertEquals(matches.length, 3);
    assertEquals(matches.sort(), ["a", "aa", "as"].sort());
  });

  await t.step("マッチなしで空配列", () => {
    const input = new UnifiedInput();

    const hintMap = {
      "a": { line: 10, col: 5 },
      "s": { line: 15, col: 3 },
    };

    // 'x' で始まるヒントはない
    const matches = input.getPartialMatches("x", hintMap);
    assertEquals(matches, []);
  });
});

Deno.test("VimScript互換性テスト", async (t) => {
  await t.step("stridx()ロジックの完全移植", () => {
    const input = new UnifiedInput();

    const hintMap = {
      "bb": { line: 10, col: 5 },
      "bc": { line: 15, col: 3 },
      "be": { line: 20, col: 7 },
    };

    // VimScript版: stridx(hint, input_buffer) == 0
    // 前方一致チェック
    const matches = input.getPartialMatches("b", hintMap);
    assertEquals(matches.length, 3);
    assertEquals(matches.sort(), ["bb", "bc", "be"].sort());
  });

  await t.step("空文字列で全てマッチ", () => {
    const input = new UnifiedInput();

    const hintMap = {
      "a": { line: 10, col: 5 },
      "b": { line: 15, col: 3 },
      "c": { line: 20, col: 7 },
    };

    // VimScript版: stridx(hint, '') == 0 → 全てマッチ
    const matches = input.getPartialMatches("", hintMap);
    assertEquals(matches.length, 3);
  });

  await t.step("完全一致も部分マッチに含まれる", () => {
    const input = new UnifiedInput();

    const hintMap = {
      "a": { line: 10, col: 5 },
      "aa": { line: 15, col: 3 },
    };

    // 'a' は 'a' と 'aa' の両方とマッチ
    const matches1 = input.getPartialMatches("a", hintMap);
    assertEquals(matches1.sort(), ["a", "aa"].sort());

    // 'aa' は 'aa' のみとマッチ（完全一致）
    const matches2 = input.getPartialMatches("aa", hintMap);
    assertEquals(matches2, ["aa"]);
  });

  await t.step("複数文字入力の部分マッチ", () => {
    const input = new UnifiedInput();

    const hintMap = {
      "ab": { line: 10, col: 5 },
      "abc": { line: 15, col: 3 },
      "abd": { line: 20, col: 7 },
      "ac": { line: 25, col: 1 },
    };

    // 'ab' で始まるヒント
    const matches = input.getPartialMatches("ab", hintMap);
    assertEquals(matches.length, 3);
    assertEquals(matches.sort(), ["ab", "abc", "abd"].sort());
  });
});

Deno.test("エッジケーステスト", async (t) => {
  await t.step("空のヒントマップで空配列", () => {
    const input = new UnifiedInput();

    const matches = input.getPartialMatches("a", {});
    assertEquals(matches, []);
  });

  await t.step("単一文字ヒントのみ", () => {
    const input = new UnifiedInput();

    const hintMap = {
      "a": { line: 10, col: 5 },
      "s": { line: 15, col: 3 },
      "d": { line: 20, col: 7 },
    };

    const matches = input.getPartialMatches("a", hintMap);
    assertEquals(matches, ["a"]);
  });

  await t.step("大文字小文字の区別", () => {
    const input = new UnifiedInput();

    const hintMap = {
      "a": { line: 10, col: 5 },
      "A": { line: 15, col: 3 },
    };

    // 小文字 'a' は小文字 'a' のみとマッチ
    const matches = input.getPartialMatches("a", hintMap);
    assertEquals(matches, ["a"]);
  });
});

Deno.test("アルゴリズムテスト", async (t) => {
  await t.step("前方一致の正確性", () => {
    const input = new UnifiedInput();

    const hintMap = {
      "abc": { line: 10, col: 5 },
      "bca": { line: 15, col: 3 },
      "cab": { line: 20, col: 7 },
    };

    // 'a' で始まるのは 'abc' のみ
    assertEquals(input.getPartialMatches("a", hintMap), ["abc"]);

    // 'b' で始まるのは 'bca' のみ
    assertEquals(input.getPartialMatches("b", hintMap), ["bca"]);

    // 'c' で始まるのは 'cab' のみ
    assertEquals(input.getPartialMatches("c", hintMap), ["cab"]);
  });

  await t.step("複雑なヒントマップでの部分マッチ", () => {
    const input = new UnifiedInput();

    const hintMap = {
      "a": { line: 1, col: 1 },
      "aa": { line: 2, col: 1 },
      "aaa": { line: 3, col: 1 },
      "ab": { line: 4, col: 1 },
      "aba": { line: 5, col: 1 },
      "abb": { line: 6, col: 1 },
      "b": { line: 7, col: 1 },
    };

    // 'a' で始まる全てのヒント
    const matchesA = input.getPartialMatches("a", hintMap);
    assertEquals(matchesA.length, 6);

    // 'aa' で始まるヒント
    const matchesAA = input.getPartialMatches("aa", hintMap);
    assertEquals(matchesAA.sort(), ["aa", "aaa"].sort());

    // 'ab' で始まるヒント
    const matchesAB = input.getPartialMatches("ab", hintMap);
    assertEquals(matchesAB.sort(), ["ab", "aba", "abb"].sort());
  });
});
