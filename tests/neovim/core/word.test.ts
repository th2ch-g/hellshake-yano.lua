/**
 * tests/common/types/word.test.ts
 *
 * Word型、VimScriptWord型、DenopsWord型、および座標系変換関数のテスト
 */

import { assertEquals } from "jsr:@std/assert";
import type {
  DenopsWord,
  VimScriptWord,
} from "../../../denops/hellshake-yano/common/types/word.ts";
import {
  denopsToVimScript,
  isDenopsWord,
  isVimScriptWord,
  vimScriptToDenops,
} from "../../../denops/hellshake-yano/common/types/word.ts";

Deno.test("VimScriptWord → DenopsWord 変換テスト", async (t) => {
  await t.step("基本的な変換が正しく動作する", () => {
    const vimWord: VimScriptWord = {
      text: "hello",
      lnum: 10,
      col: 5,
      end_col: 10,
    };

    const result = vimScriptToDenops(vimWord);

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

    const result = vimScriptToDenops(vimWord);

    assertEquals(result.line, 1);
    assertEquals(result.col, 1);
  });
});

Deno.test("DenopsWord → VimScriptWord 変換テスト", async (t) => {
  await t.step("基本的な逆変換が正しく動作する", () => {
    const denopsWord: DenopsWord = {
      text: "hello",
      line: 10,
      col: 5,
    };

    const result = denopsToVimScript(denopsWord);

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

    const result = denopsToVimScript(denopsWord);

    assertEquals(result.end_col, 11); // col(1) + text.length(10) = 11
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

    const denopsWord = vimScriptToDenops(original);
    const restored = denopsToVimScript(denopsWord);

    assertEquals(restored.text, original.text);
    assertEquals(restored.lnum, original.lnum);
    assertEquals(restored.col, original.col);
    assertEquals(restored.end_col, original.end_col);
  });
});

Deno.test("型ガードテスト - VimScriptWord", async (t) => {
  await t.step("正しいVimScriptWord型を識別する", () => {
    const validWord = {
      text: "valid",
      lnum: 1,
      col: 1,
      end_col: 6,
    };

    assertEquals(isVimScriptWord(validWord), true);
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

  await t.step("不正な型を拒否する - null", () => {
    assertEquals(isVimScriptWord(null), false);
  });
});

Deno.test("型ガードテスト - DenopsWord", async (t) => {
  await t.step("正しいDenopsWord型を識別する", () => {
    const validWord: DenopsWord = {
      text: "valid",
      line: 1,
      col: 1,
    };

    assertEquals(isDenopsWord(validWord), true);
  });

  await t.step("不正な型を拒否する - lineが0以下", () => {
    const invalidWord = {
      text: "invalid",
      line: 0,
      col: 1,
    };

    assertEquals(isDenopsWord(invalidWord), false);
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

    const denopsWord = vimScriptToDenops(vimWord);
    assertEquals(denopsWord.text, "");

    const restored = denopsToVimScript(denopsWord);
    assertEquals(restored.end_col, 1); // col(1) + text.length(0) = 1
  });
});
