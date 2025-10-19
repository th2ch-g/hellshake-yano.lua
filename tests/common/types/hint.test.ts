/**
 * tests/common/types/hint.test.ts
 *
 * Hint型、HintMapping型のテスト
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import type {
  Hint,
  HintDisplayMode,
  HintMapping,
  HintPosition,
} from "../../../denops/hellshake-yano/common/types/hint.ts";

Deno.test("HintMapping型: 基本的な構造検証", () => {
  const hintMapping: HintMapping = {
    word: {
      text: "hello",
      line: 1,
      col: 5,
    },
    hint: "A",
    hintCol: 5,
    hintByteCol: 5,
  };

  assertExists(hintMapping);
  assertEquals(hintMapping.word.text, "hello");
  assertEquals(hintMapping.hint, "A");
  assertEquals(hintMapping.hintCol, 5);
  assertEquals(hintMapping.hintByteCol, 5);
});

Deno.test("HintPosition型: 基本的な構造検証", () => {
  const hintPosition: HintPosition = {
    line: 10,
    col: 5,
    display_mode: "before",
  };

  assertExists(hintPosition);
  assertEquals(hintPosition.line, 10);
  assertEquals(hintPosition.col, 5);
  assertEquals(hintPosition.display_mode, "before");
});

Deno.test("HintDisplayMode型: 有効な値の検証", () => {
  const validModes: HintDisplayMode[] = ["before", "after", "overlay"];

  for (const mode of validModes) {
    const position: HintPosition = {
      line: 1,
      col: 1,
      display_mode: mode,
    };
    assertExists(position);
  }
});

Deno.test("Hint型: 基本的な構造検証", () => {
  const hint: Hint = {
    key: "A",
    position: {
      line: 1,
      col: 5,
      display_mode: "before",
    },
    word: {
      text: "test",
      line: 1,
      col: 5,
    },
  };

  assertExists(hint);
  assertEquals(hint.key, "A");
  assertEquals(hint.position.line, 1);
  assertEquals(hint.word.text, "test");
});
