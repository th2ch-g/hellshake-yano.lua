/**
 * hint.ts のテストスイート
 * Process2: カーソル位置基準のヒント割り当てテスト
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import type { Word, HintMapping } from "./types.ts";
import { assignHintsToWords, generateHintsWithGroups } from "./hint.ts";
import type { Config } from "./config.ts";

// ===== テストヘルパー関数 =====

/**
 * テスト用のWord配列を生成
 */
function createTestWords(count: number, startLine: number = 1): Word[] {
  const words: Word[] = [];
  for (let i = 0; i < count; i++) {
    words.push({
      text: `word${i}`,
      line: startLine + Math.floor(i / 5), // 5個ごとに次の行
      col: (i % 5) * 10 + 1, // 10文字ごとに配置
    });
  }
  return words;
}

/**
 * カーソルからの距離を計算
 */
function calculateDistance(word: Word, cursorLine: number, cursorCol: number): number {
  const lineDiff = Math.abs(word.line - cursorLine);
  const colDiff = Math.abs(word.col - cursorCol);
  return lineDiff * 1000 + colDiff;
}

// ===== Sub1: 距離ベースのシンプルな割り当て実装 =====

Deno.test("Sub1: assignHintsToWords - カーソル近傍の単語に1文字ヒントを割り当てる", () => {
  // テストデータ: カーソル位置(5, 5)から様々な距離の単語
  const words: Word[] = [
    { text: "far1", line: 1, col: 1 },      // 距離: 4004
    { text: "near1", line: 5, col: 1 },    // 距離: 4 (近い)
    { text: "cursor", line: 5, col: 5 },   // 距離: 0 (最も近い)
    { text: "near2", line: 5, col: 10 },   // 距離: 5
    { text: "far2", line: 10, col: 1 },    // 距離: 5004
  ];

  // 1文字ヒント用のキー: 3個
  const singleCharHints = ["A", "S", "D"];
  // 2文字ヒント用のキー
  const multiCharHints = ["BB", "BC"];
  const allHints = [...singleCharHints, ...multiCharHints];

  const cursorLine = 5;
  const cursorCol = 5;

  // assignHintsToWordsを呼び出し
  const result = assignHintsToWords(
    words,
    allHints,
    cursorLine,
    cursorCol,
    "normal",
    { hintPosition: "start" },
    { skipOverlapDetection: true } // オーバーラップ検出をスキップ
  );

  // 結果の検証
  assertEquals(result.length, 5, "5つの単語すべてにヒントが割り当てられる");

  // カーソルに最も近い単語から順に1文字ヒントが割り当てられることを確認
  // 期待される順序: cursor(0) → near1(4) → near2(5) → far1(4004) → far2(5004)
  const sortedWords = [...words].sort((a, b) => {
    const distA = calculateDistance(a, cursorLine, cursorCol);
    const distB = calculateDistance(b, cursorLine, cursorCol);
    return distA - distB;
  });

  // 最初の3個（singleCharHintsの数）が1文字ヒント
  for (let i = 0; i < 3; i++) {
    const mapping = result.find(m => m.word.text === sortedWords[i].text);
    assertExists(mapping, `${sortedWords[i].text}のマッピングが存在する`);
    assertEquals(mapping.hint.length, 1, `${sortedWords[i].text}には1文字ヒント`);
    assertEquals(singleCharHints.includes(mapping.hint), true, `${sortedWords[i].text}のヒントは1文字キーから選ばれる`);
  }

  // 残りの2個が2文字ヒント
  for (let i = 3; i < 5; i++) {
    const mapping = result.find(m => m.word.text === sortedWords[i].text);
    assertExists(mapping, `${sortedWords[i].text}のマッピングが存在する`);
    assertEquals(mapping.hint.length, 2, `${sortedWords[i].text}には2文字ヒント`);
    assertEquals(multiCharHints.includes(mapping.hint), true, `${sortedWords[i].text}のヒントは2文字キーから選ばれる`);
  }
});

Deno.test("Sub1: assignHintsToWords - 1文字ヒントが不足する場合", () => {
  // 10個の単語
  const words = createTestWords(10, 1);

  // 1文字ヒント: 3個のみ
  const singleCharHints = ["A", "S", "D"];
  // 2文字ヒント: 十分な数
  const multiCharHints = ["BB", "BC", "BD", "BE", "BF", "BG", "BH"];
  const allHints = [...singleCharHints, ...multiCharHints];

  const cursorLine = 1;
  const cursorCol = 1;

  const result = assignHintsToWords(
    words,
    allHints,
    cursorLine,
    cursorCol,
    "normal",
    { hintPosition: "start" },
    { skipOverlapDetection: true }
  );

  // 10個すべてにヒントが割り当てられる
  assertEquals(result.length, 10);

  // 最初の3個が1文字、残り7個が2文字
  let singleCharCount = 0;
  let multiCharCount = 0;

  for (const mapping of result) {
    if (mapping.hint.length === 1) singleCharCount++;
    if (mapping.hint.length === 2) multiCharCount++;
  }

  assertEquals(singleCharCount, 3, "1文字ヒントは3個");
  assertEquals(multiCharCount, 7, "2文字ヒントは7個");
});

// ===== Sub2: ヒント生成の動的調整 =====

Deno.test("Sub2: generateHintsWithGroups - カーソル近傍の単語数に基づく動的調整", () => {
  // カーソル近傍に10個の単語があると仮定
  const nearbyWordCount = 10;

  const config = {
    singleCharKeys: ["A", "S", "D", "F", "G", "H", "J", "K", "L"], // 9個
    multiCharKeys: ["B", "C", "E", "I", "O", "P"],
    maxSingleCharHints: 21, // 最大21個の1文字ヒント
  };

  const hints = generateHintsWithGroups(nearbyWordCount, config);

  // 生成されたヒントを検証
  assertEquals(hints.length, nearbyWordCount, `${nearbyWordCount}個のヒントが生成される`);

  // 1文字ヒントの数をカウント
  const singleCharCount = hints.filter(h => h.length === 1).length;

  // singleCharKeysの数（9個）まで1文字ヒントが生成される
  assertEquals(singleCharCount, Math.min(nearbyWordCount, config.singleCharKeys.length));

  // 残りは2文字ヒント
  const multiCharCount = hints.filter(h => h.length === 2).length;
  assertEquals(multiCharCount, nearbyWordCount - singleCharCount);
});

Deno.test("Sub2: generateHintsWithGroups - maxSingleCharHintsの制限を考慮", () => {
  // 30個の単語
  const wordCount = 30;

  const config = {
    singleCharKeys: ["A", "S", "D", "F", "G", "H", "J", "K", "L", "N", "M"], // 11個
    multiCharKeys: ["B", "C", "E", "I", "O", "P", "Q", "R", "T", "U"],
    maxSingleCharHints: 5, // 最大5個に制限
  };

  const hints = generateHintsWithGroups(wordCount, config);

  assertEquals(hints.length, wordCount);

  // maxSingleCharHintsで制限された1文字ヒント
  const singleCharCount = hints.filter(h => h.length === 1).length;
  assertEquals(singleCharCount, 5, "maxSingleCharHintsで制限される");

  // 残りは2文字ヒント
  const multiCharCount = hints.filter(h => h.length === 2).length;
  assertEquals(multiCharCount, 25);
});

Deno.test("Sub2: generateHintsWithGroups - 単語数がsingleCharKeys以下の場合", () => {
  // 3個の単語のみ
  const wordCount = 3;

  const config = {
    singleCharKeys: ["A", "S", "D", "F", "G", "H", "J", "K", "L"], // 9個
    multiCharKeys: ["B", "C", "E", "I", "O", "P"],
    maxSingleCharHints: 21,
  };

  const hints = generateHintsWithGroups(wordCount, config);

  assertEquals(hints.length, wordCount);

  // すべて1文字ヒント
  const singleCharCount = hints.filter(h => h.length === 1).length;
  assertEquals(singleCharCount, 3, "単語数が少ない場合はすべて1文字ヒント");
});

Deno.test("Sub2: generateHintsWithGroups - 大量の単語でも正しく生成", () => {
  // 100個の単語
  const wordCount = 100;

  const config = {
    singleCharKeys: [
      "A", "S", "D", "F", "G", "H", "J", "K", "L", "N", "M",
      "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"
    ], // 21個
    multiCharKeys: ["B", "C", "E", "I", "O", "P", "Q", "R", "T", "U", "V", "W", "X", "Y", "Z"], // 15個
    maxSingleCharHints: 21,
  };

  const hints = generateHintsWithGroups(wordCount, config);

  assertEquals(hints.length, wordCount);

  // 最初の21個が1文字ヒント
  const singleCharCount = hints.filter(h => h.length === 1).length;
  assertEquals(singleCharCount, 21);

  // 残り79個が2文字ヒント
  const multiCharCount = hints.filter(h => h.length === 2).length;
  assertEquals(multiCharCount, 79);

  // すべてのヒントが一意であることを確認
  const uniqueHints = new Set(hints);
  assertEquals(uniqueHints.size, wordCount, "すべてのヒントが一意");
});