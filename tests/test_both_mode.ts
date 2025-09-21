/**
 * visual_hint_position "both" モードのテスト
 *
 * このテストは、Visual Modeで単語の先頭と最後の両方にヒントを表示する
 * "both" モードが正しく動作することを検証します。
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { calculateHintPosition, calculateHintPositionWithCoordinateSystem, assignHintsToWords } from "../denops/hellshake-yano/hint.ts";
import type { Word, Config } from "../denops/hellshake-yano/types.ts";

Deno.test("calculateHintPosition - both mode returns start position for single call", () => {
  const word: Word = {
    text: "hello",
    line: 1,
    col: 5,
  };

  // Visual Mode で both を指定した場合、単一呼び出しは start 位置を返す
  const position = calculateHintPosition(word, "start", true, "both");

  assertEquals(position.line, 1);
  assertEquals(position.col, 5);
  assertEquals(position.display_mode, "before");
});

Deno.test("calculateHintPositionWithCoordinateSystem - both mode support", () => {
  const word: Word = {
    text: "world",
    line: 2,
    col: 10,
    byteCol: 10,
  };

  // Visual Mode で both を指定
  const position = calculateHintPositionWithCoordinateSystem(
    word,
    "start",
    false,
    true,
    "both"
  );

  // bothモードは"both"として処理される
  assertEquals(position.line, 2);
  // bothモードの場合、基本的にstartの位置を返す
  assertEquals(position.col, 10);
  assertEquals(position.vim_col, 10);
  assertEquals(position.nvim_col, 9); // 0-based
});

Deno.test("assignHintsToWords - both mode creates multiple mappings", () => {
  const words: Word[] = [
    { text: "apple", line: 1, col: 1 },
    { text: "banana", line: 1, col: 10 },
  ];

  // bothモードでは2倍のヒントが必要
  const hints = ["A", "B", "C", "D"];
  const config = {
    hint_position: "start",
    visual_hint_position: "both",
  };

  // Visual Mode で both モードでヒントを割り当て
  const mappings = assignHintsToWords(
    words,
    hints,
    1,
    1,
    "visual",
    config
  );

  // bothモードでは各単語に対して2つのマッピングが作成される
  assertExists(mappings);
  assertEquals(mappings.length, 4); // 2単語 * 2位置 = 4マッピング

  // 各マッピングが異なるヒントを持つことを確認
  const hints_used = mappings.map(m => m.hint);
  assertEquals(hints_used, ["A", "B", "C", "D"]);

  // 最初の単語の2つのマッピングが異なる位置を指していることを確認
  assertEquals(mappings[0].word.text, "apple"); // start位置
  assertEquals(mappings[1].word.text, "apple"); // end位置
  assertEquals(mappings[0].hintCol, 1); // start位置
  assertEquals(mappings[1].hintCol, 5); // end位置 ("apple"の最後)
});

Deno.test("both mode with Japanese text", () => {
  const word: Word = {
    text: "こんにちは",
    line: 3,
    col: 15,
    byteCol: 15,
  };

  // 日本語テキストでのbothモード
  const startPosition = calculateHintPositionWithCoordinateSystem(
    word,
    "start",
    false,
    true,
    "start"
  );

  const endPosition = calculateHintPositionWithCoordinateSystem(
    word,
    "end",
    false,
    true,
    "end"
  );

  // 開始位置
  assertEquals(startPosition.line, 3);
  assertEquals(startPosition.col, 15);

  // 終了位置（日本語の文字数を考慮）
  assertEquals(endPosition.line, 3);
  assertEquals(endPosition.col, 15 + "こんにちは".length - 1);
});

Deno.test("both mode should handle empty words array", () => {
  const words: Word[] = [];
  const hints: string[] = [];
  const config = {
    hint_position: "start",
    visual_hint_position: "both",
  };

  const mappings = assignHintsToWords(
    words,
    hints,
    1,
    1,
    "visual",
    config
  );

  assertEquals(mappings.length, 0);
});

Deno.test("both mode with single character words", () => {
  const word: Word = {
    text: "x",
    line: 5,
    col: 20,
  };

  // 1文字の単語でのbothモード
  const position = calculateHintPosition(word, "start", true, "both");

  // 1文字の場合、startとendは同じ位置になる
  assertEquals(position.line, 5);
  assertEquals(position.col, 20);
  assertEquals(position.display_mode, "before");
});

Deno.test("both mode position calculation performance", () => {
  const words: Word[] = [];

  // 大量の単語を生成
  for (let i = 0; i < 100; i++) {
    words.push({
      text: `word${i}`,
      line: Math.floor(i / 10) + 1,
      col: (i % 10) * 8 + 1,
    });
  }

  // bothモードでは2倍のヒントが必要
  const hints: string[] = [];
  for (let i = 0; i < words.length * 2; i++) {
    if (i < 26) {
      hints.push(String.fromCharCode(65 + i)); // A-Z
    } else {
      // 2文字ヒント
      const first = String.fromCharCode(65 + Math.floor((i - 26) / 26));
      const second = String.fromCharCode(65 + ((i - 26) % 26));
      hints.push(first + second);
    }
  }

  const config = {
    hint_position: "start",
    visual_hint_position: "both",
  };

  const startTime = performance.now();

  const mappings = assignHintsToWords(
    words,
    hints,
    50,
    50,
    "visual",
    config
  );

  const endTime = performance.now();
  const duration = endTime - startTime;

  // パフォーマンスが妥当な範囲内であることを確認（100単語で100ms以内）
  console.log(`Both mode assignment for ${words.length} words took ${duration.toFixed(2)}ms`);
  assertExists(mappings);
  assertEquals(mappings.length, words.length * 2); // bothモードでは2倍のマッピング

  // 処理時間が妥当であること
  assertEquals(duration < 100, true, `Processing took too long: ${duration}ms`);
});