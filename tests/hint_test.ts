import { assertEquals, assertExists, assertNotEquals } from "@std/assert";
import { generateTestBuffer, setCursor, test } from "./testRunner.ts";
import { mockBuffer, mockCursor } from "./helpers/mock.ts";

// ヒント生成機能をインポート
import {
  assignHintsToWords,
  generateHints,
  type HintMapping,
} from "../denops/hellshake-yano/hint.ts";
import type { Word } from "../denops/hellshake-yano/word.ts";

test("26個以下の単語に対するA-Zヒント生成", async (denops) => {
  // 10個の単語に対するヒント生成
  const hints = generateHints(10);

  assertEquals(hints.length, 10);
  assertEquals(hints[0], "A");
  assertEquals(hints[1], "B");
  assertEquals(hints[9], "J");

  // 全て単一文字
  hints.forEach((hint) => {
    assertEquals(hint.length, 1);
  });
});

test("ちょうど26個の単語に対するヒント生成", async (denops) => {
  const hints = generateHints(26);

  assertEquals(hints.length, 26);
  assertEquals(hints[0], "A");
  assertEquals(hints[25], "Z");

  // 全て単一文字
  hints.forEach((hint) => {
    assertEquals(hint.length, 1);
  });
});

test("26個超の単語に対するAA, AB...ヒント生成", async (denops) => {
  // 30個の単語に対するヒント生成
  const hints = generateHints(30);

  assertEquals(hints.length, 30);

  // 最初の26個は単一文字
  for (let i = 0; i < 26; i++) {
    assertEquals(hints[i].length, 1);
  }

  // 27個目以降は2文字
  assertEquals(hints[26], "AA");
  assertEquals(hints[27], "AB");
  assertEquals(hints[28], "AC");
  assertEquals(hints[29], "AD");
});

test("大量の単語に対するヒント生成", async (denops) => {
  // 100個の単語に対するヒント生成
  const hints = generateHints(100);

  assertEquals(hints.length, 100);

  // 最初の26個は単一文字
  for (let i = 0; i < 26; i++) {
    assertEquals(hints[i].length, 1);
  }

  // 27個目以降は2文字
  for (let i = 26; i < 100; i++) {
    assertEquals(hints[i].length, 2);
  }

  // 特定のヒントをチェック
  assertEquals(hints[26], "AA");
  assertEquals(hints[51], "AZ"); // 26 + 25 = 51
  assertEquals(hints[52], "BA"); // 次のセット
});

test("カーソル位置による優先順位", async (denops) => {
  const words: Word[] = [
    { text: "far", line: 1, col: 1 },
    { text: "near", line: 5, col: 10 },
    { text: "closest", line: 5, col: 15 },
    { text: "middle", line: 3, col: 5 },
  ];

  const hints = generateHints(4);
  const mappings = assignHintsToWords(words, hints, 5, 12);

  // カーソル位置(5, 12)に最も近い単語から順にヒントが割り当てられる
  const closestMapping = mappings.find((m) => m.word.text === "closest");
  const nearMapping = mappings.find((m) => m.word.text === "near");
  const middleMapping = mappings.find((m) => m.word.text === "middle");
  const farMapping = mappings.find((m) => m.word.text === "far");

  assertEquals(closestMapping?.hint, "B"); // 2番目に近い
  assertEquals(nearMapping?.hint, "A"); // 最も近い
  assertEquals(middleMapping?.hint, "C"); // 3番目
  assertEquals(farMapping?.hint, "D"); // 最も遠い
});

test("ヒントと単語位置のマッピング", async (denops) => {
  const words: Word[] = [
    { text: "word1", line: 1, col: 1 },
    { text: "word2", line: 1, col: 10 },
    { text: "word3", line: 2, col: 1 },
  ];

  const hints = generateHints(3);
  const mappings = assignHintsToWords(words, hints, 1, 1);

  assertEquals(mappings.length, 3);

  // 各単語にユニークなヒントが割り当てられる
  const hintSet = new Set(mappings.map((m) => m.hint));
  assertEquals(hintSet.size, 3);

  // 位置情報が保持される
  mappings.forEach((mapping) => {
    const originalWord = words.find((w) =>
      w.text === mapping.word.text &&
      w.line === mapping.word.line &&
      w.col === mapping.word.col
    );
    assertExists(originalWord);
  });
});

test("重複単語の処理", async (denops) => {
  const words: Word[] = [
    { text: "duplicate", line: 1, col: 1 },
    { text: "unique", line: 2, col: 1 },
    { text: "duplicate", line: 3, col: 1 },
    { text: "duplicate", line: 4, col: 1 },
  ];

  const hints = generateHints(4);
  const mappings = assignHintsToWords(words, hints, 1, 1);

  assertEquals(mappings.length, 4);

  // 同じテキストでも位置が異なれば別のヒントが割り当てられる
  const duplicateMappings = mappings.filter((m) => m.word.text === "duplicate");
  assertEquals(duplicateMappings.length, 3);

  // それぞれ異なるヒントを持つ
  const duplicateHints = duplicateMappings.map((m) => m.hint);
  const uniqueHints = new Set(duplicateHints);
  assertEquals(uniqueHints.size, 3);
});

test("カスタムマーカーでのヒント生成", async (denops) => {
  const customMarkers = ["あ", "い", "う", "え", "お"];
  const hints = generateHints(7, customMarkers);

  assertEquals(hints.length, 7);

  // 最初の5個はカスタムマーカー
  assertEquals(hints[0], "あ");
  assertEquals(hints[1], "い");
  assertEquals(hints[4], "お");

  // 6個目以降は2文字の組み合わせ
  assertEquals(hints[5], "ああ");
  assertEquals(hints[6], "あい");
});

test("空の単語リストに対するヒント生成", async (denops) => {
  const hints = generateHints(0);

  assertEquals(hints.length, 0);

  const words: Word[] = [];
  const mappings = assignHintsToWords(words, hints, 1, 1);

  assertEquals(mappings.length, 0);
});

test("同一行の単語の優先順位", async (denops) => {
  const words: Word[] = [
    { text: "left", line: 5, col: 1 },
    { text: "center", line: 5, col: 20 },
    { text: "right", line: 5, col: 40 },
  ];

  const hints = generateHints(3);

  // カーソルが中央の単語に近い場合
  const mappings = assignHintsToWords(words, hints, 5, 22);

  const centerMapping = mappings.find((m) => m.word.text === "center");
  const leftMapping = mappings.find((m) => m.word.text === "left");
  const rightMapping = mappings.find((m) => m.word.text === "right");

  // centerが最も優先される
  assertEquals(centerMapping?.hint, "A");

  // leftとrightの距離を比較
  assertExists(leftMapping?.hint);
  assertExists(rightMapping?.hint);
  assertNotEquals(leftMapping?.hint, rightMapping?.hint);
});

test("垂直方向の距離の重み付け", async (denops) => {
  const words: Word[] = [
    { text: "same_line_far", line: 5, col: 50 }, // 同じ行だが遠い
    { text: "near_line_close", line: 6, col: 11 }, // 次の行だが近い
  ];

  const hints = generateHints(2);

  // カーソル位置 (5, 10) の場合
  const mappings = assignHintsToWords(words, hints, 5, 10);

  // 実装により、行の差を重視するか列の差を重視するかが変わる
  // ここでは行の差を1000倍で重み付けしているので、同じ行が優先される
  const sameLineMapping = mappings.find((m) => m.word.text === "same_line_far");
  assertEquals(sameLineMapping?.hint, "A");
});
