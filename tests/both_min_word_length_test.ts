/**
 * @fileoverview bothMinWordLength機能のTDDテスト
 *
 * TDD Red-Green-Refactor方式で実装
 *
 * このテストは以下をカバー:
 * 1. Config型とDEFAULT_CONFIGにbothMinWordLengthが含まれること
 * 2. validateConfig/validateUnifiedConfigでbothMinWordLengthを検証すること
 * 3. assignHintsToWordsでbothMinWordLengthに基づいてヒント割り当てが変わること
 * 4. キャッシュキーにbothMinWordLengthが含まれること
 * 5. 後方互換性（未設定時は従来の動作を維持）
 */

import { assertEquals } from "@std/assert";
import {
  DEFAULT_CONFIG,
  validateConfig,
  validateUnifiedConfig,
  type Config,
} from "../denops/hellshake-yano/config.ts";
import {
  assignHintsToWords,
} from "../denops/hellshake-yano/hint.ts";
import type { Word } from "../denops/hellshake-yano/types.ts";

// ========================================
// Process1 Sub1: 設定スキーマと伝搬ルート
// ========================================

Deno.test("Config型にbothMinWordLengthが含まれること", () => {
  // Config型がbothMinWordLengthプロパティを持つことを確認
  const config: Config = {
    ...DEFAULT_CONFIG,
    bothMinWordLength: 5,
  };

  assertEquals(typeof config.bothMinWordLength, "number");
});

Deno.test("DEFAULT_CONFIGにbothMinWordLengthのデフォルト値が設定されていること", () => {
  // デフォルト設定を確認
  assertEquals(typeof DEFAULT_CONFIG.bothMinWordLength, "number");
  assertEquals(DEFAULT_CONFIG.bothMinWordLength, 5);
});

Deno.test("validateConfig - bothMinWordLengthの正常系テスト", () => {
  // 正常な値
  let result = validateConfig({ bothMinWordLength: 5 });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 最小値（1）
  result = validateConfig({ bothMinWordLength: 1 });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 大きな値
  result = validateConfig({ bothMinWordLength: 100 });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 未設定（undefined）は許可される
  result = validateConfig({ bothMinWordLength: undefined });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("validateConfig - bothMinWordLengthの異常系テスト", () => {
  // 0は無効
  let result = validateConfig({ bothMinWordLength: 0 } as any);
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some(e => e.includes("bothMinWordLength must be a positive integer")),
    true
  );

  // 負の値は無効
  result = validateConfig({ bothMinWordLength: -1 } as any);
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some(e => e.includes("bothMinWordLength must be a positive integer")),
    true
  );

  // 小数は無効
  result = validateConfig({ bothMinWordLength: 5.5 } as any);
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some(e => e.includes("bothMinWordLength must be a positive integer")),
    true
  );
});

Deno.test("validateUnifiedConfig - bothMinWordLengthの検証", () => {
  // 正常系
  let result = validateUnifiedConfig({ bothMinWordLength: 5 });
  assertEquals(result.valid, true);

  // 異常系
  result = validateUnifiedConfig({ bothMinWordLength: 0 } as any);
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some(e => e.includes("bothMinWordLength must be a positive integer")),
    true
  );
});

Deno.test("hintPosition: 'both' がサポートされていること", () => {
  // hintPositionに "both" を設定できることを確認
  let result = validateConfig({ hintPosition: "both" });
  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);

  // 他の有効な値も確認
  result = validateConfig({ hintPosition: "start" });
  assertEquals(result.valid, true);

  result = validateConfig({ hintPosition: "end" });
  assertEquals(result.valid, true);

  result = validateConfig({ hintPosition: "overlay" });
  assertEquals(result.valid, true);

  // 無効な値
  result = validateConfig({ hintPosition: "invalid" as any });
  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some(e => e.includes("hintPosition must be one of: start, end, overlay, both")),
    true
  );
});

// ========================================
// Process1 Sub2: ヒント割当とキャッシュ整備
// ========================================

Deno.test("assignHintsToWords - bothMinWordLength未設定時は全単語に両端ヒント", () => {
  const words: Word[] = [
    { text: "ab", line: 1, col: 1 },     // 2文字
    { text: "abc", line: 1, col: 5 },    // 3文字
    { text: "abcde", line: 1, col: 10 }, // 5文字
    { text: "abcdefg", line: 1, col: 20 }, // 7文字
  ];

  const hints = ["A", "B", "C", "D", "E", "F", "G", "H"];

  const mappings = assignHintsToWords(
    words,
    hints,
    1,
    1,
    "normal",
    { hintPosition: "both", bothMinWordLength: undefined }
  );

  // bothMinWordLength未設定時は全単語に2つずつヒントが割り当てられる
  assertEquals(mappings.length, 8); // 4単語 × 2ヒント

  // 最初の単語（2文字）に2つのヒント
  assertEquals(mappings[0].hint, "A"); // start
  assertEquals(mappings[1].hint, "B"); // end
});

Deno.test("assignHintsToWords - bothMinWordLength設定時は閾値未満の単語は片側ヒント", () => {
  const words: Word[] = [
    { text: "ab", line: 1, col: 1 },     // 2文字 < 5
    { text: "abc", line: 1, col: 5 },    // 3文字 < 5
    { text: "abcde", line: 1, col: 10 }, // 5文字 = 5
    { text: "abcdefg", line: 1, col: 20 }, // 7文字 > 5
  ];

  const hints = ["A", "B", "C", "D", "E", "F", "G"];

  const mappings = assignHintsToWords(
    words,
    hints,
    1,
    1,
    "normal",
    { hintPosition: "both", bothMinWordLength: 5 }
  );

  // 2文字の単語: 片側ヒントのみ (1個)
  // 3文字の単語: 片側ヒントのみ (1個)
  // 5文字の単語: 両端ヒント (2個)
  // 7文字の単語: 両端ヒント (2個)
  // 合計: 1 + 1 + 2 + 2 = 6個
  assertEquals(mappings.length, 6);

  // 最初の単語（2文字）は片側ヒントのみ
  assertEquals(mappings[0].hint, "A");
  assertEquals(mappings[0].word.text, "ab");

  // 2番目の単語（3文字）も片側ヒントのみ
  assertEquals(mappings[1].hint, "B");
  assertEquals(mappings[1].word.text, "abc");

  // 3番目の単語（5文字）は両端ヒント
  assertEquals(mappings[2].hint, "C");
  assertEquals(mappings[2].word.text, "abcde");
  assertEquals(mappings[3].hint, "D");
  assertEquals(mappings[3].word.text, "abcde");

  // 4番目の単語（7文字）も両端ヒント
  assertEquals(mappings[4].hint, "E");
  assertEquals(mappings[4].word.text, "abcdefg");
  assertEquals(mappings[5].hint, "F");
  assertEquals(mappings[5].word.text, "abcdefg");
});

Deno.test("assignHintsToWords - bothMinWordLength=1で全単語が両端ヒント", () => {
  const words: Word[] = [
    { text: "a", line: 1, col: 1 },      // 1文字
    { text: "ab", line: 1, col: 5 },     // 2文字
  ];

  const hints = ["A", "B", "C", "D"];

  const mappings = assignHintsToWords(
    words,
    hints,
    1,
    1,
    "normal",
    { hintPosition: "both", bothMinWordLength: 1 }
  );

  // 全単語が閾値以上なので、全て両端ヒント
  assertEquals(mappings.length, 4); // 2単語 × 2ヒント
});

Deno.test("assignHintsToWords - bothMinWordLength=100で全単語が片側ヒント", () => {
  const words: Word[] = [
    { text: "abc", line: 1, col: 1 },    // 3文字
    { text: "abcde", line: 1, col: 5 },  // 5文字
  ];

  const hints = ["A", "B", "C", "D"];

  const mappings = assignHintsToWords(
    words,
    hints,
    1,
    1,
    "normal",
    { hintPosition: "both", bothMinWordLength: 100 }
  );

  // 全単語が閾値未満なので、全て片側ヒント（先頭側にフォールバック）
  assertEquals(mappings.length, 2); // 2単語 × 1ヒント

  // 各単語に片側ヒントのみ
  assertEquals(mappings[0].hint, "A");
  assertEquals(mappings[0].word.text, "abc");
  assertEquals(mappings[1].hint, "B");
  assertEquals(mappings[1].word.text, "abcde");
});

Deno.test("assignHintsToWords - hintPosition='start'ではbothMinWordLengthは無視される", () => {
  const words: Word[] = [
    { text: "ab", line: 1, col: 1 },
    { text: "abcdefg", line: 1, col: 5 },
  ];

  const hints = ["A", "B"];

  const mappings = assignHintsToWords(
    words,
    hints,
    1,
    1,
    "normal",
    { hintPosition: "start", bothMinWordLength: 5 }
  );

  // hintPosition='start'なので各単語に1つのヒントのみ
  assertEquals(mappings.length, 2);
  assertEquals(mappings[0].hint, "A");
  assertEquals(mappings[1].hint, "B");
});

Deno.test("後方互換性 - bothMinWordLength未設定でも動作すること", () => {
  const words: Word[] = [
    { text: "test", line: 1, col: 1 },
  ];

  const hints = ["A", "B"];

  // bothMinWordLengthを指定しない
  const mappings1 = assignHintsToWords(
    words,
    hints,
    1,
    1,
    "normal",
    { hintPosition: "both" }
  );

  // 従来通り両端ヒントが割り当てられる
  assertEquals(mappings1.length, 2);

  // ConfigにbothMinWordLengthがない場合も動作する
  const mappings2 = assignHintsToWords(
    words,
    hints,
    1,
    1,
    "normal",
    { hintPosition: "start" }
  );

  assertEquals(mappings2.length, 1);
});

Deno.test("キャッシュキーにbothMinWordLengthが含まれること（統合テスト）", () => {
  const words: Word[] = [
    { text: "test", line: 1, col: 1 },
  ];

  const hints = ["A", "B", "C", "D"];

  // 同じ単語でも、bothMinWordLengthが異なればキャッシュキーも異なるはず
  const mappings1 = assignHintsToWords(
    words,
    hints,
    1,
    1,
    "normal",
    { hintPosition: "both", bothMinWordLength: 3 }
  );

  const mappings2 = assignHintsToWords(
    words,
    hints,
    1,
    1,
    "normal",
    { hintPosition: "both", bothMinWordLength: 5 }
  );

  // bothMinWordLength=3の場合、"test"(4文字)は両端ヒント
  assertEquals(mappings1.length, 2);

  // bothMinWordLength=5の場合、"test"(4文字)は片側ヒント
  assertEquals(mappings2.length, 1);

  // 異なる結果が得られることで、キャッシュキーが正しく機能していることを確認
});

Deno.test("デフォルト設定との整合性 - defaultMinWordLengthとの関係", () => {
  // bothMinWordLengthはdefaultMinWordLengthとは独立した設定
  const config: Config = {
    ...DEFAULT_CONFIG,
    defaultMinWordLength: 3,
    bothMinWordLength: 5,
  };

  const result = validateConfig(config);
  assertEquals(result.valid, true);

  // どちらも設定可能で、それぞれ独立した役割を持つ
  assertEquals(config.defaultMinWordLength, 3);
  assertEquals(config.bothMinWordLength, 5);
});

console.log("🔴 RED PHASE: bothMinWordLength機能のテストを定義完了");
console.log("✅ 次はGREEN PHASEでテストが通るように実装を確認・修正します");
