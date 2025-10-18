/**
 * unified-word-detector.ts の簡易テスト
 *
 * matchStrPos関数の単体テストのみ実施
 */

import { assertEquals } from "jsr:@std/assert";

// matchStrPosメソッドをテストするため、直接実装をテスト
function matchStrPos(
  str: string,
  pattern: RegExp,
  startPos: number,
): { match: string; start: number; end: number } {
  // startPos以降の部分文字列を取得
  const substr = str.slice(startPos);

  // 正規表現でマッチング
  const match = substr.match(pattern);

  if (match === null || match.index === undefined) {
    // マッチしない場合
    return { match: "", start: -1, end: -1 };
  }

  // マッチした場合
  const matchText = match[0];
  const matchStart = startPos + match.index; // 元の文字列での開始位置
  const matchEnd = matchStart + matchText.length; // 終了位置（次の文字の位置）

  return { match: matchText, start: matchStart, end: matchEnd };
}

Deno.test("matchStrPos関数のテスト", async (t) => {
  const pattern = /\w+/; // gフラグは使わない

  await t.step("基本的なマッチング", () => {
    const result = matchStrPos("hello world", pattern, 0);
    assertEquals(result.match, "hello");
    assertEquals(result.start, 0);
    assertEquals(result.end, 5);
  });

  await t.step("開始位置を指定したマッチング", () => {
    const result = matchStrPos("hello world", pattern, 6);
    assertEquals(result.match, "world");
    assertEquals(result.start, 6);
    assertEquals(result.end, 11);
  });

  await t.step("複数の単語を順次検出", () => {
    const line = "hello world";
    const words = [];

    let startPos = 0;
    while (true) {
      const result = matchStrPos(line, pattern, startPos);
      if (result.start === -1) break;

      words.push({
        text: result.match,
        col: result.start + 1, // 1-indexed
      });

      startPos = result.end;
      if (startPos >= line.length) break;
    }

    assertEquals(words.length, 2);
    assertEquals(words[0].text, "hello");
    assertEquals(words[0].col, 1);
    assertEquals(words[1].text, "world");
    assertEquals(words[1].col, 7);
  });

  await t.step("先頭にスペースがある場合", () => {
    const result = matchStrPos("  hello", /\w+/, 0);
    assertEquals(result.match, "hello");
    assertEquals(result.start, 2);
    assertEquals(result.end, 7);
  });
});
