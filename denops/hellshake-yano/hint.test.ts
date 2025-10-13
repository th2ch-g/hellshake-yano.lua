/**
 * hint.ts のテストスイート
 * Process2: カーソル位置基準のヒント割り当てテスト
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import type { Word, HintMapping, HintKeyConfig } from "./types.ts";
import { assignHintsToWords, clearHintCache, generateHints, type GenerateHintsOptions } from "./hint.ts";
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
  // テストデータ: カーソル位置(5, 8)から様々な距離の単語（カーソル位置に単語なし）
  const words: Word[] = [
    { text: "far1", line: 1, col: 1 },      // 距離: 4007
    { text: "near1", line: 5, col: 1 },    // 距離: 7 (近い)
    { text: "near2", line: 5, col: 10 },   // 距離: 2 (最も近い)
    { text: "near3", line: 5, col: 20 },   // 距離: 12
    { text: "far2", line: 10, col: 1 },    // 距離: 5007
  ];

  // 1文字ヒント用のキー: 3個
  const singleCharHints = ["A", "S", "D"];
  // 2文字ヒント用のキー
  const multiCharHints = ["BB", "BC"];
  const allHints = [...singleCharHints, ...multiCharHints];

  const cursorLine = 5;
  const cursorCol = 8;  // 単語間の空白位置（near1とnear2の間）

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

  // 結果の検証（カーソル位置に単語がないため、全5単語にヒントが割り当てられる）
  assertEquals(result.length, 5, "5つの単語すべてにヒントが割り当てられる");

  // カーソルに最も近い単語から順に1文字ヒントが割り当てられることを確認
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
  const cursorCol = 7;  // 単語間の位置（word0とword1の間）

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

Deno.test("Sub2: generateHints (groups mode) - カーソル近傍の単語数に基づく動的調整", () => {
  // カーソル近傍に10個の単語があると仮定
  const nearbyWordCount = 10;

  const config = {
    singleCharKeys: ["A", "S", "D", "F", "G", "H", "J", "K", "L"], // 9個
    multiCharKeys: ["B", "C", "E", "I", "O", "P"],
    maxSingleCharHints: 21, // 最大21個の1文字ヒント
  };

  const options: GenerateHintsOptions = {
    groups: true,
    singleCharKeys: config.singleCharKeys,
    multiCharKeys: config.multiCharKeys,
    maxSingleCharHints: config.maxSingleCharHints
  };
  const hints = generateHints(nearbyWordCount, options);

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

Deno.test("Sub2: generateHints (groups mode) - maxSingleCharHintsの制限を考慮", () => {
  // 30個の単語
  const wordCount = 30;

  const config = {
    singleCharKeys: ["A", "S", "D", "F", "G", "H", "J", "K", "L", "N", "M"], // 11個
    multiCharKeys: ["B", "C", "E", "I", "O", "P", "Q", "R", "T", "U"],
    maxSingleCharHints: 5, // 最大5個に制限
  };

  const options: GenerateHintsOptions = {
    groups: true,
    singleCharKeys: config.singleCharKeys,
    multiCharKeys: config.multiCharKeys,
    maxSingleCharHints: config.maxSingleCharHints,
  };
  const hints = generateHints(wordCount, options);

  assertEquals(hints.length, wordCount);

  // maxSingleCharHintsで制限された1文字ヒント
  const singleCharCount = hints.filter(h => h.length === 1).length;
  assertEquals(singleCharCount, 5, "maxSingleCharHintsで制限される");

  // 残りは2文字ヒント
  const multiCharCount = hints.filter(h => h.length === 2).length;
  assertEquals(multiCharCount, 25);
});

Deno.test("Sub2: generateHints (groups mode) - 単語数がsingleCharKeys以下の場合", () => {
  // 3個の単語のみ
  const wordCount = 3;

  const config = {
    singleCharKeys: ["A", "S", "D", "F", "G", "H", "J", "K", "L"], // 9個
    multiCharKeys: ["B", "C", "E", "I", "O", "P"],
    maxSingleCharHints: 21,
  };

  const options: GenerateHintsOptions = {
    groups: true,
    singleCharKeys: config.singleCharKeys,
    multiCharKeys: config.multiCharKeys,
    maxSingleCharHints: config.maxSingleCharHints,
  };
  const hints = generateHints(wordCount, options);

  assertEquals(hints.length, wordCount);

  // すべて1文字ヒント
  const singleCharCount = hints.filter(h => h.length === 1).length;
  assertEquals(singleCharCount, 3, "単語数が少ない場合はすべて1文字ヒント");
});

Deno.test("Sub2: generateHints (groups mode) - 大量の単語でも正しく生成", () => {
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

  const options: GenerateHintsOptions = {
    groups: true,
    singleCharKeys: config.singleCharKeys,
    multiCharKeys: config.multiCharKeys,
    maxSingleCharHints: config.maxSingleCharHints,
  };
  const hints = generateHints(wordCount, options);

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

// ===== Process3: 数字専用モードのヒント生成 =====
// Note: isNumericOnlyKeys と generateMultiCharHintsFromKeys は実装後にexportする必要があります

Deno.test("Sub3: isNumericOnlyKeys - 数字専用キー判定", async () => {
  const { isNumericOnlyKeys } = await import("./hint.ts");

  // 数字のみの配列
  assertEquals(isNumericOnlyKeys(["0", "1", "2", "3"]), true);
  assertEquals(isNumericOnlyKeys(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]), true);
  assertEquals(isNumericOnlyKeys(["5", "6", "7"]), true);

  // アルファベットが混在
  assertEquals(isNumericOnlyKeys(["0", "1", "A"]), false);
  assertEquals(isNumericOnlyKeys(["A", "B", "C"]), false);

  // 記号が混在
  assertEquals(isNumericOnlyKeys(["0", "1", "."]), false);
  assertEquals(isNumericOnlyKeys([".", "-"]), false);

  // 空配列
  assertEquals(isNumericOnlyKeys([]), false);

  // 2桁の数字（文字列として）
  assertEquals(isNumericOnlyKeys(["10", "20"]), false);
});

Deno.test("Sub3: generateMultiCharHintsFromKeys - 数字専用モードで01-99,00の生成", async () => {
  const { generateMultiCharHintsFromKeys } = await import("./hint.ts");

  // 10個の数字キーで数字専用モード
  const keys = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const hints = generateMultiCharHintsFromKeys(keys, 100);

  // 100個生成される
  assertEquals(hints.length, 100);

  // 優先順位を確認: 01-09が最初
  assertEquals(hints.slice(0, 9), ["01", "02", "03", "04", "05", "06", "07", "08", "09"]);

  // 次に10-99
  const expectedTens = [];
  for (let i = 10; i < 100; i++) {
    expectedTens.push(String(i).padStart(2, "0"));
  }
  assertEquals(hints.slice(9, 99), expectedTens);

  // 最後に00
  assertEquals(hints[99], "00");
});

Deno.test("Sub3: generateMultiCharHintsFromKeys - 数字専用モードで途中まで生成", async () => {
  const { generateMultiCharHintsFromKeys } = await import("./hint.ts");

  const keys = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const hints = generateMultiCharHintsFromKeys(keys, 50);

  // 50個のみ生成
  assertEquals(hints.length, 50);

  // 01-09の9個 + 10-49の40個 + 50の1個
  assertEquals(hints[0], "01");
  assertEquals(hints[8], "09");
  assertEquals(hints[9], "10");
  assertEquals(hints[49], "50");
});

Deno.test("Sub3: generateMultiCharHintsFromKeys - アルファベットキーで通常モード", async () => {
  const { generateMultiCharHintsFromKeys } = await import("./hint.ts");

  // アルファベットキー
  const keys = ["A", "B", "C"];
  const hints = generateMultiCharHintsFromKeys(keys, 10);

  // 通常の2文字組み合わせ: AA, AB, AC, BA, BB, BC, CA, CB, CC
  assertEquals(hints.length, 9); // 3² = 9
  assertEquals(hints, ["AA", "AB", "AC", "BA", "BB", "BC", "CA", "CB", "CC"]);
});

Deno.test("Sub3: generateMultiCharHintsFromKeys - 数字とアルファベット混在時は通常モード", async () => {
  const { generateMultiCharHintsFromKeys } = await import("./hint.ts");

  // 混在キー
  const keys = ["0", "1", "A", "B"];
  const hints = generateMultiCharHintsFromKeys(keys, 16);

  // 通常の2文字組み合わせ: 4² = 16
  assertEquals(hints.length, 16);
  assertEquals(hints[0], "00");
  assertEquals(hints[1], "01");
  assertEquals(hints[2], "0A");
  assertEquals(hints[3], "0B");
  // 数字専用モードの優先順位は適用されない
});

Deno.test("Sub4: generateHints (groups mode) - アルファベットsingle + 数字専用multi", () => {
  const config = {
    singleCharKeys: ["A", "S", "D"], // 通常のキー
    multiCharKeys: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"], // 数字専用
    maxSingleCharHints: 3,
  };

  const options: GenerateHintsOptions = {
    groups: true,
    singleCharKeys: config.singleCharKeys,
    multiCharKeys: config.multiCharKeys,
    maxSingleCharHints: config.maxSingleCharHints,
  };
  const hints = generateHints(50, options);

  // 最初の3個が1文字ヒント
  assertEquals(hints.slice(0, 3), ["A", "S", "D"]);

  // 残りが数字専用モードの2文字ヒント（01から開始）
  assertEquals(hints[3], "01");
  assertEquals(hints[4], "02");
  assertEquals(hints[11], "09");
  assertEquals(hints[12], "10");
});

Deno.test("Sub4: generateHints (groups mode) - 記号single + 数字専用multi", () => {
  const config = {
    singleCharKeys: [".", ",", ";"], // 記号
    multiCharKeys: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"], // 数字専用
    maxSingleCharHints: 3,
  };

  const options: GenerateHintsOptions = {
    groups: true,
    singleCharKeys: config.singleCharKeys,
    multiCharKeys: config.multiCharKeys,
    maxSingleCharHints: config.maxSingleCharHints,
  };
  const hints = generateHints(20, options);

  // 記号が1文字ヒントとして使用される
  assertEquals(hints[0], ".");
  assertEquals(hints[1], ",");
  assertEquals(hints[2], ";");

  // 数字専用モードの2文字ヒント
  assertEquals(hints[3], "01");
  assertEquals(hints[4], "02");
});

// ===== Process5: useNumericMultiCharHints機能のテスト =====

Deno.test("Sub5: useNumericMultiCharHints - プロパティ存在確認", () => {
  // useNumericMultiCharHintsプロパティが存在することを確認
  const config: HintKeyConfig = {
    singleCharKeys: ["A", "S", "D"],
    multiCharKeys: ["B", "C", "E"],
    useNumericMultiCharHints: true
  };

  assertEquals(typeof config.useNumericMultiCharHints, "boolean");
});

Deno.test("Sub6: generateHints (numeric mode) - 100個の数字ヒント生成", () => {
  // 100個の数字ヒントを生成
  const hints = generateHints(100, { numeric: true });

  // 100個生成される
  assertEquals(hints.length, 100);

  // 優先順位を確認: 01-09が最初
  assertEquals(hints.slice(0, 9), ["01", "02", "03", "04", "05", "06", "07", "08", "09"]);

  // 次に10-99 (90個)
  for (let i = 10; i <= 99; i++) {
    assertEquals(hints[i - 1], String(i).padStart(2, "0"));
  }

  // 最後に00
  assertEquals(hints[99], "00");
});

Deno.test("Sub6: generateHints (numeric mode) - 途中まで生成", () => {
  // 50個のみ要求
  const hints = generateHints(50, { numeric: true });
  assertEquals(hints.length, 50);
  assertEquals(hints[0], "01");
  assertEquals(hints[8], "09");
  assertEquals(hints[9], "10");
  assertEquals(hints[49], "50");

  // 10個のみ要求
  const hints10 = generateHints(10, { numeric: true });
  assertEquals(hints10.length, 10);
  assertEquals(hints10, ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"]);

  // 1個のみ要求
  const hints1 = generateHints(1, { numeric: true });
  assertEquals(hints1.length, 1);
  assertEquals(hints1[0], "01");
});

Deno.test("Sub6: generateHints (numeric mode) - ゼロまたは負の数", () => {
  assertEquals(generateHints(0, { numeric: true }), []);
  assertEquals(generateHints(-1, { numeric: true }), []);
  assertEquals(generateHints(-10, { numeric: true }), []);
});

Deno.test("Sub6: generateHints (numeric mode) - 最大100個制限", () => {
  const hints = generateHints(150, { numeric: true });
  assertEquals(hints.length, 100, "最大100個まで生成");
  assertEquals(hints[99], "00");
});

Deno.test("Sub7: HintKeyConfig - 完全な設定オブジェクト", () => {
  const config: HintKeyConfig = {
    singleCharKeys: ["A", "S", "D"],
    multiCharKeys: ["B", "C", "E"],
    maxSingleCharHints: 3,
    useNumericMultiCharHints: true
  };

  // 20個のヒントを要求
  const hints = generateHints(20, {
    groups: true,
    singleCharKeys: config.singleCharKeys,
    multiCharKeys: config.multiCharKeys,
    maxSingleCharHints: config.maxSingleCharHints,
    useNumericMultiCharHints: config.useNumericMultiCharHints
  });

  assertEquals(hints.length, 20);

  // 最初の3個が1文字ヒント
  assertEquals(hints[0], "A");
  assertEquals(hints[1], "S");
  assertEquals(hints[2], "D");

  // 次にアルファベット2文字ヒント（multiCharKeys使用）
  // B, C, Eから生成: BB, BC, BE, CB, CC, CE, EB, EC, EE = 9個
  const alphabetHints = hints.slice(3, 12);
  assertEquals(alphabetHints.length, 9);
  assertEquals(alphabetHints, ["BB", "BC", "BE", "CB", "CC", "CE", "EB", "EC", "EE"]);

  // 残り8個が数字ヒント: 01-08
  assertEquals(hints[12], "01");
  assertEquals(hints[13], "02");
  assertEquals(hints[14], "03");
  assertEquals(hints[15], "04");
  assertEquals(hints[16], "05");
  assertEquals(hints[17], "06");
  assertEquals(hints[18], "07");
  assertEquals(hints[19], "08");
});

Deno.test("Sub7: generateHints (groups mode) - useNumericMultiCharHints=false時の動作", () => {
  const config: HintKeyConfig = {
    singleCharKeys: ["A", "S"],
    multiCharKeys: ["B", "C"],
    maxSingleCharHints: 2,
    useNumericMultiCharHints: false
  };

  // 10個のヒントを要求
  const hints = generateHints(10, {
    groups: true,
    singleCharKeys: config.singleCharKeys,
    multiCharKeys: config.multiCharKeys,
    maxSingleCharHints: config.maxSingleCharHints,
  });

  // multiCharKeysで生成できるのは2x2=4個のみ
  // 合計: 1文字2個 + 2文字4個 = 6個
  assertEquals(hints.length, 6);

  // 最初の2個が1文字ヒント
  assertEquals(hints[0], "A");
  assertEquals(hints[1], "S");

  // 残り4個がアルファベット2文字ヒント: BB, BC, CB, CC
  const multiCharHints = hints.slice(2);
  assertEquals(multiCharHints.length, 4);
  assertEquals(multiCharHints, ["BB", "BC", "CB", "CC"]);

  // useNumericMultiCharHints=falseなので数字ヒントは含まれない
  assertEquals(multiCharHints.every(h => !/^\d+$/.test(h)), true, "数字のみのヒントは含まれない");
});

Deno.test("Sub5: generateHints (groups mode) - useNumericMultiCharHints未定義時の動作", () => {
  const config: HintKeyConfig = {
    singleCharKeys: ["A"],
    multiCharKeys: ["B"],
    maxSingleCharHints: 1
    // useNumericMultiCharHints未定義
  };

  const hints = generateHints(5, {
    groups: true,
    singleCharKeys: config.singleCharKeys,
    multiCharKeys: config.multiCharKeys,
    maxSingleCharHints: config.maxSingleCharHints,
  });

  // multiCharKeysで生成できるのは1x1=1個のみ
  // 合計: 1文字1個 + 2文字1個 = 2個
  assertEquals(hints.length, 2);
  assertEquals(hints[0], "A");
  assertEquals(hints[1], "BB");

  // useNumericMultiCharHints未定義（デフォルトfalse）なので数字ヒントは追加されない
});

// ===== Process1 Sub2-1: bothMinWordLength のテスト =====

Deno.test("Process1 Sub2-1: 閾値未満は片側、閾値以上は両端ヒント", () => {
  clearHintCache();
  const words: Word[] = [
    { text: "go", line: 1, col: 1 },      // 2文字 (閾値未満)
    { text: "rust", line: 1, col: 10 },   // 4文字 (閾値未満)
    { text: "hello", line: 1, col: 20 },  // 5文字 (閾値以上)
    { text: "world!", line: 1, col: 30 }, // 6文字 (閾値以上)
  ];
  const hints = ["h0", "h1", "h2", "h3", "h4", "h5", "h6", "h7"];

  const result = assignHintsToWords(
    words,
    hints,
    2,  // 異なる行に移動（単語のない行）
    5,
    "normal",
    { hintPosition: "both", bothMinWordLength: 5 },
    { skipOverlapDetection: true },
  );

  const countFor = (label: string) => result.filter((m) => m.word.text === label).length;
  assertEquals(countFor("go"), 1);
  assertEquals(countFor("rust"), 1);
  assertEquals(countFor("hello"), 2);
  assertEquals(countFor("world!"), 2);

  const helloHints = result
    .filter((m) => m.word.text === "hello")
    .map((m) => ({ hint: m.hint, col: m.hintCol }))
    .sort((a, b) => a.col - b.col);
  assertEquals(helloHints.map((h) => h.hint), ["h2", "h3"]);
  assertEquals(helloHints[0].col, 20);
  assertEquals(helloHints[1].col, 20 + "hello".length - 1);

  const worldHints = result
    .filter((m) => m.word.text === "world!")
    .map((m) => ({ hint: m.hint, col: m.hintCol }))
    .sort((a, b) => a.col - b.col);
  assertEquals(worldHints.map((h) => h.hint), ["h4", "h5"]);
});

Deno.test("Process1 Sub2-1: bothMinWordLength 未指定時は従来通り両端", () => {
  clearHintCache();
  const words: Word[] = [
    { text: "hi", line: 1, col: 1 },
    { text: "there", line: 1, col: 5 },
  ];
  const hints = ["h0", "h1", "h2", "h3"];

  const result = assignHintsToWords(
    words,
    hints,
    2,  // 異なる行に移動（単語のない行）
    3,
    "normal",
    { hintPosition: "both" },
    { skipOverlapDetection: true },
  );

  assertEquals(result.length, 4);
  const counts = new Map(result.map((m) => [m.word.text, 0]));
  result.forEach((m) => counts.set(m.word.text, (counts.get(m.word.text) ?? 0) + 1));
  assertEquals(counts.get("hi"), 2);
  assertEquals(counts.get("there"), 2);
});

Deno.test("Process1 Sub2-1: hintPosition が both 以外の場合は閾値を無視", () => {
  clearHintCache();
  const words: Word[] = [
    { text: "go", line: 1, col: 1 },
    { text: "typescript", line: 1, col: 10 },
  ];
  const hints = ["h0", "h1"];

  const result = assignHintsToWords(
    words,
    hints,
    2,  // 異なる行に移動（単語のない行）
    5,
    "normal",
    { hintPosition: "start", bothMinWordLength: 5 },
    { skipOverlapDetection: true },
  );

  assertEquals(result.length, 2);
  assertEquals(result.every((m) => m.hintCol === m.word.col), true);
});

Deno.test("Sub7: generateHints (groups mode) - 大量のヒント要求時の数字ヒント追加", () => {
  const config: HintKeyConfig = {
    singleCharKeys: ["A", "S", "D", "F"], // 4個
    multiCharKeys: ["B", "C", "E", "I"], // 4個 → 16個の2文字ヒント
    maxSingleCharHints: 4,
    useNumericMultiCharHints: true
  };

  // 120個のヒントを要求（1文字4個 + アルファベット2文字16個 + 数字100個）
  const hints = generateHints(120, {
    groups: true,
    singleCharKeys: config.singleCharKeys,
    multiCharKeys: config.multiCharKeys,
    maxSingleCharHints: config.maxSingleCharHints,
    useNumericMultiCharHints: config.useNumericMultiCharHints
  });

  assertEquals(hints.length, 120);

  // 最初の4個が1文字ヒント
  assertEquals(hints.slice(0, 4), ["A", "S", "D", "F"]);

  // 次の16個がアルファベット2文字ヒント
  const alphabetHints = hints.slice(4, 20);
  assertEquals(alphabetHints.length, 16);

  // 残り100個が数字ヒント: 01-99, 00
  assertEquals(hints[20], "01");
  assertEquals(hints[28], "09");
  assertEquals(hints[29], "10");
  assertEquals(hints[118], "99");
  assertEquals(hints[119], "00");
});

Deno.test("Sub7: generateHints (groups mode) - multiCharKeys空配列時の数字ヒント", () => {
  const config: HintKeyConfig = {
    singleCharKeys: ["A", "S", "D"],
    multiCharKeys: [], // 空配列
    maxSingleCharHints: 3,
    useNumericMultiCharHints: true
  };

  const hints = generateHints(15, {
    groups: true,
    singleCharKeys: config.singleCharKeys,
    multiCharKeys: config.multiCharKeys,
    maxSingleCharHints: config.maxSingleCharHints,
    useNumericMultiCharHints: config.useNumericMultiCharHints
  });

  assertEquals(hints.length, 15);

  // 最初の3個が1文字ヒント
  assertEquals(hints.slice(0, 3), ["A", "S", "D"]);

  // multiCharKeysが空なので、直接数字ヒントへ
  assertEquals(hints[3], "01");
  assertEquals(hints[4], "02");
  assertEquals(hints[14], "12");
});

Deno.test("Sub8: validateHintKeyConfig - useNumericMultiCharHintsの型検証", async () => {
  const { validateHintKeyConfig } = await import("./hint.ts");

  // boolean値は有効
  const validTrue = validateHintKeyConfig({
    useNumericMultiCharHints: true
  });
  assertEquals(validTrue.valid, true);

  const validFalse = validateHintKeyConfig({
    useNumericMultiCharHints: false
  });
  assertEquals(validFalse.valid, true);

  // 未定義も有効
  const validUndefined = validateHintKeyConfig({});
  assertEquals(validUndefined.valid, true);
});

Deno.test("Sub9: generateHints (groups mode) - useNumericMultiCharHints優先順位の確認", () => {
  const config: HintKeyConfig = {
    singleCharKeys: ["A", "S"],
    multiCharKeys: ["B", "C"],
    maxSingleCharHints: 2,
    useNumericMultiCharHints: true
  };

  const hints = generateHints(10, {
    groups: true,
    singleCharKeys: config.singleCharKeys,
    multiCharKeys: config.multiCharKeys,
    maxSingleCharHints: config.maxSingleCharHints,
    useNumericMultiCharHints: config.useNumericMultiCharHints
  });

  // 優先順位の確認
  assertEquals(hints[0], "A", "1. singleCharKeys");
  assertEquals(hints[1], "S", "1. singleCharKeys");
  assertEquals(hints[2], "BB", "2. multiCharKeys (アルファベット2文字)");
  assertEquals(hints[3], "BC", "2. multiCharKeys (アルファベット2文字)");
  assertEquals(hints[4], "CB", "2. multiCharKeys (アルファベット2文字)");
  assertEquals(hints[5], "CC", "2. multiCharKeys (アルファベット2文字)");
  assertEquals(hints[6], "01", "3. 数字2文字（01から）");
  assertEquals(hints[7], "02", "3. 数字2文字");
  assertEquals(hints[8], "03", "3. 数字2文字");
  assertEquals(hints[9], "04", "3. 数字2文字");
});

// ===== カーソル位置の単語除外機能のテスト =====

Deno.test("Cursor Exclusion: カーソル位置の単語にはヒントが割り当てられない", () => {
  clearHintCache();

  const words: Word[] = [
    { text: "word1", line: 5, col: 10 },  // カーソル位置
    { text: "word2", line: 5, col: 20 },  // カーソル位置以外
    { text: "word3", line: 5, col: 30 },  // カーソル位置以外
    { text: "word4", line: 6, col: 10 },  // カーソル位置以外
  ];

  const hints = ["A", "S", "D", "F"];
  const cursorLine = 5;
  const cursorCol = 10;  // word1の開始位置

  const result = assignHintsToWords(
    words,
    hints,
    cursorLine,
    cursorCol,
    "normal",
    { hintPosition: "start" },
    { skipOverlapDetection: true }
  );

  // word1にはヒントが割り当てられない
  const word1Hints = result.filter(m => m.word.text === "word1");
  assertEquals(word1Hints.length, 0, "カーソル位置の単語にはヒントが割り当てられない");

  // 他の単語にはヒントが割り当てられる
  assertEquals(result.length, 3, "カーソル位置以外の3単語にヒントが割り当てられる");
  const assignedWords = result.map(m => m.word.text).sort();
  assertEquals(assignedWords, ["word2", "word3", "word4"]);
});

Deno.test("Cursor Exclusion: カーソルが単語の中間位置にある場合も除外", () => {
  clearHintCache();

  const words: Word[] = [
    { text: "hello", line: 5, col: 10 },   // 5文字: col 10-14
    { text: "world", line: 5, col: 20 },   // カーソル位置以外
  ];

  const hints = ["A", "S"];
  const cursorLine = 5;
  const cursorCol = 12;  // "hello"の中間位置（'l'の位置）

  const result = assignHintsToWords(
    words,
    hints,
    cursorLine,
    cursorCol,
    "normal",
    { hintPosition: "start" },
    { skipOverlapDetection: true }
  );

  // helloにはヒントが割り当てられない
  const helloHints = result.filter(m => m.word.text === "hello");
  assertEquals(helloHints.length, 0, "カーソルが中間にある単語は除外される");

  // worldにはヒントが割り当てられる
  assertEquals(result.length, 1);
  assertEquals(result[0].word.text, "world");
});

Deno.test("Cursor Exclusion: カーソルが単語の終端位置にある場合も除外", () => {
  clearHintCache();

  const words: Word[] = [
    { text: "test", line: 5, col: 10 },    // 4文字: col 10-13
    { text: "word", line: 5, col: 20 },    // カーソル位置以外
  ];

  const hints = ["A", "S"];
  const cursorLine = 5;
  const cursorCol = 13;  // "test"の終端位置

  const result = assignHintsToWords(
    words,
    hints,
    cursorLine,
    cursorCol,
    "normal",
    { hintPosition: "start" },
    { skipOverlapDetection: true }
  );

  // testにはヒントが割り当てられない
  const testHints = result.filter(m => m.word.text === "test");
  assertEquals(testHints.length, 0, "カーソルが終端にある単語は除外される");

  // wordにはヒントが割り当てられる
  assertEquals(result.length, 1);
  assertEquals(result[0].word.text, "word");
});

Deno.test("Cursor Exclusion: 異なる行の単語は除外されない", () => {
  clearHintCache();

  const words: Word[] = [
    { text: "same", line: 5, col: 10 },    // カーソル行の単語
    { text: "same", line: 6, col: 10 },    // 異なる行、同じカラム位置
  ];

  const hints = ["A", "S"];
  const cursorLine = 5;
  const cursorCol = 10;

  const result = assignHintsToWords(
    words,
    hints,
    cursorLine,
    cursorCol,
    "normal",
    { hintPosition: "start" },
    { skipOverlapDetection: true }
  );

  // カーソル行の単語のみ除外される
  assertEquals(result.length, 1);
  assertEquals(result[0].word.line, 6, "異なる行の単語は除外されない");
});

Deno.test("Cursor Exclusion: bothモードでもカーソル位置の単語は除外", () => {
  clearHintCache();

  const words: Word[] = [
    { text: "cursor", line: 5, col: 10 },  // カーソル位置
    { text: "other", line: 5, col: 20 },   // カーソル位置以外
  ];

  const hints = ["A", "S", "D", "F"];
  const cursorLine = 5;
  const cursorCol = 10;

  const result = assignHintsToWords(
    words,
    hints,
    cursorLine,
    cursorCol,
    "normal",
    { hintPosition: "both" },
    { skipOverlapDetection: true }
  );

  // "cursor"には割り当てられず、"other"には両端ヒントが割り当てられる
  const cursorHints = result.filter(m => m.word.text === "cursor");
  assertEquals(cursorHints.length, 0, "bothモードでもカーソル位置は除外");

  const otherHints = result.filter(m => m.word.text === "other");
  assertEquals(otherHints.length, 2, "他の単語には両端ヒントが割り当てられる");
});
