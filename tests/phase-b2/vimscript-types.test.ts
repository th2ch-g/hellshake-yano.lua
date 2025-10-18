/**
 * VimScript型定義とDenops型の相互変換テスト
 *
 * TDD Phase: RED
 * Process1: 型定義の統一
 *
 * テストケース:
 * 1. VimScriptWordからDenopsWordへの変換
 * 2. DenopsWordからVimScriptWordへの変換
 * 3. 往復変換の一致性
 * 4. 型ガードのテスト
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import {
  type DenopsWord,
  isVimScriptWord,
  toDenopsWord,
  toVimScriptWord,
  type VimScriptWord,
} from "../../denops/hellshake-yano/phase-b2/vimscript-types.ts";

Deno.test("VimScriptWord → DenopsWord 変換テスト", async (t) => {
  await t.step("基本的な変換が正しく動作する", () => {
    const vimWord: VimScriptWord = {
      text: "hello",
      lnum: 10,
      col: 5,
      end_col: 10,
    };

    const result = toDenopsWord(vimWord);

    assertEquals(result.text, "hello");
    assertEquals(result.line, 10);
    assertEquals(result.col, 5);
  });

  await t.step("行番号と列番号が正しくマッピングされる", () => {
    const vimWord: VimScriptWord = {
      text: "world",
      lnum: 1,
      col: 1,
      end_col: 6,
    };

    const result = toDenopsWord(vimWord);

    assertEquals(result.line, 1);
    assertEquals(result.col, 1);
  });

  await t.step("複数の単語を変換できる", () => {
    const vimWords: VimScriptWord[] = [
      { text: "foo", lnum: 1, col: 1, end_col: 4 },
      { text: "bar", lnum: 2, col: 5, end_col: 8 },
      { text: "baz", lnum: 3, col: 10, end_col: 13 },
    ];

    const results = vimWords.map(toDenopsWord);

    assertEquals(results.length, 3);
    assertEquals(results[0].text, "foo");
    assertEquals(results[1].line, 2);
    assertEquals(results[2].col, 10);
  });
});

Deno.test("DenopsWord → VimScriptWord 変換テスト", async (t) => {
  await t.step("基本的な逆変換が正しく動作する", () => {
    const denopsWord: DenopsWord = {
      text: "hello",
      line: 10,
      col: 5,
    };

    const result = toVimScriptWord(denopsWord);

    assertEquals(result.text, "hello");
    assertEquals(result.lnum, 10);
    assertEquals(result.col, 5);
    assertEquals(result.end_col, 10); // col(5) + text.length(5) = 10
  });

  await t.step("end_colが単語の長さから正しく計算される", () => {
    const denopsWord: DenopsWord = {
      text: "typescript",
      line: 1,
      col: 1,
    };

    const result = toVimScriptWord(denopsWord);

    assertEquals(result.end_col, 11); // col(1) + text.length(10) = 11
  });

  await t.step("1文字の単語でも正しく変換される", () => {
    const denopsWord: DenopsWord = {
      text: "x",
      line: 5,
      col: 10,
    };

    const result = toVimScriptWord(denopsWord);

    assertEquals(result.end_col, 11); // col(10) + text.length(1) = 11
  });
});

Deno.test("往復変換の一致性テスト", async (t) => {
  await t.step("VimScript → Denops → VimScript で元に戻る", () => {
    const original: VimScriptWord = {
      text: "test",
      lnum: 15,
      col: 20,
      end_col: 24,
    };

    const denopsWord = toDenopsWord(original);
    const restored = toVimScriptWord(denopsWord);

    assertEquals(restored.text, original.text);
    assertEquals(restored.lnum, original.lnum);
    assertEquals(restored.col, original.col);
    assertEquals(restored.end_col, original.end_col);
  });

  await t.step("Denops → VimScript → Denops で元に戻る", () => {
    const original: DenopsWord = {
      text: "example",
      line: 8,
      col: 12,
    };

    const vimWord = toVimScriptWord(original);
    const restored = toDenopsWord(vimWord);

    assertEquals(restored.text, original.text);
    assertEquals(restored.line, original.line);
    assertEquals(restored.col, original.col);
  });
});

Deno.test("型ガードテスト", async (t) => {
  await t.step("正しいVimScriptWord型を識別する", () => {
    const validWord = {
      text: "valid",
      lnum: 1,
      col: 1,
      end_col: 6,
    };

    assertEquals(isVimScriptWord(validWord), true);
  });

  await t.step("不正な型を拒否する - lnumがない", () => {
    const invalidWord = {
      text: "invalid",
      col: 1,
      end_col: 8,
    };

    assertEquals(isVimScriptWord(invalidWord), false);
  });

  await t.step("不正な型を拒否する - lnumが0以下", () => {
    const invalidWord = {
      text: "invalid",
      lnum: 0,
      col: 1,
      end_col: 8,
    };

    assertEquals(isVimScriptWord(invalidWord), false);
  });

  await t.step("不正な型を拒否する - colが0以下", () => {
    const invalidWord = {
      text: "invalid",
      lnum: 1,
      col: 0,
      end_col: 8,
    };

    assertEquals(isVimScriptWord(invalidWord), false);
  });

  await t.step("不正な型を拒否する - end_colが0以下", () => {
    const invalidWord = {
      text: "invalid",
      lnum: 1,
      col: 1,
      end_col: 0,
    };

    assertEquals(isVimScriptWord(invalidWord), false);
  });

  await t.step("不正な型を拒否する - null", () => {
    assertEquals(isVimScriptWord(null), false);
  });

  await t.step("不正な型を拒否する - undefined", () => {
    assertEquals(isVimScriptWord(undefined), false);
  });

  await t.step("不正な型を拒否する - 文字列", () => {
    assertEquals(isVimScriptWord("not an object"), false);
  });
});

Deno.test("エッジケーステスト", async (t) => {
  await t.step("空文字列の単語を変換できる", () => {
    const vimWord: VimScriptWord = {
      text: "",
      lnum: 1,
      col: 1,
      end_col: 1,
    };

    const denopsWord = toDenopsWord(vimWord);
    assertEquals(denopsWord.text, "");

    const restored = toVimScriptWord(denopsWord);
    assertEquals(restored.end_col, 1); // col(1) + text.length(0) = 1
  });

  await t.step("大きな行番号・列番号を正しく処理する", () => {
    const vimWord: VimScriptWord = {
      text: "large",
      lnum: 10000,
      col: 5000,
      end_col: 5005,
    };

    const denopsWord = toDenopsWord(vimWord);
    assertEquals(denopsWord.line, 10000);
    assertEquals(denopsWord.col, 5000);
  });
});
