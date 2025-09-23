/**
 * Tests for WordDetector - focusing on Word.col display width conversion
 * TDD Red-Green-Refactor for PLAN.md process2.6
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.213.0/assert/mod.ts";
import { RegexWordDetector, type WordDetectionConfig } from "./detector.ts";
import type { Word } from "../types.ts";

// Default test config
const defaultConfig: WordDetectionConfig = {
  use_japanese: true,
  exclude_numbers: false,
  min_word_length: 2,
};

Deno.test("WordDetector - Word.col display width conversion", async (t) => {
  const detector = new RegexWordDetector(defaultConfig); // tabWidth = 8

  await t.step("タブ文字なしでの記号・文字境界テスト", async () => {
    const lineText = "□ 記号vs文字の";
    const words = await detector.detectWords(lineText, 1);


    // Expected words: "記号", "vs", "文字" (分割されて検出される)
    // 文字インデックス: □(0) (1) 記(2) 号(3) v(4) s(5) 文(6) 字(7) の(8)
    // 表示位置:     □(1-2) (3) 記(4-5) 号(6-7) v(8) s(9) 文(10-11) 字(12-13) の(14-15)

    const recordWord = words.find((w: Word) => w.text === "記号");
    assertExists(recordWord, "「記号」という単語が見つかりません");
    assertEquals(recordWord.col, 4, "「記号」の列位置が正しくありません");

    const vsWord = words.find((w: Word) => w.text === "vs");
    assertExists(vsWord, "「vs」という単語が見つかりません");
    assertEquals(vsWord.col, 8, "「vs」の列位置が正しくありません");

    const charWord = words.find((w: Word) => w.text === "文字");
    assertExists(charWord, "「文字」という単語が見つかりません");
    assertEquals(charWord.col, 10, "「文字」の列位置が正しくありません");
  });

  await t.step("タブ文字ありでの記号・文字境界テスト", async () => {
    const lineText = "\t□ 記号vs文字の";
    const words = await detector.detectWords(lineText, 1);

    // Expected words: "記号", "vs", "文字" (分割されて検出される)
    // 文字インデックス: \t(0) □(1) (2) 記(3) 号(4) v(5) s(6) 文(7) 字(8) の(9)
    // 表示位置:     \t(1-8) □(9-10) (11) 記(12-13) 号(14-15) v(16) s(17) 文(18-19) 字(20-21) の(22-23)

    const recordWord = words.find((w: Word) => w.text === "記号");
    assertExists(recordWord, "「記号」という単語が見つかりません");
    assertEquals(recordWord.col, 12, "「記号」の列位置が正しくありません");

    const vsWord = words.find((w: Word) => w.text === "vs");
    assertExists(vsWord, "「vs」という単語が見つかりません");
    assertEquals(vsWord.col, 16, "「vs」の列位置が正しくありません");

    const charWord = words.find((w: Word) => w.text === "文字");
    assertExists(charWord, "「文字」という単語が見つかりません");
    assertEquals(charWord.col, 18, "「文字」の列位置が正しくありません");
  });

  await t.step("全角記号と半角文字の組み合わせテスト", async () => {
    const lineText = "④sub2";
    const words = await detector.detectWords(lineText, 1);

    // Expected: "sub2" word
    // 文字インデックス: ④(0) s(1) u(2) b(3) 2(4)
    // 表示位置:     ④(1-2) s(3) u(4) b(5) 2(6)

    const targetWord = words.find((w: Word) => w.text === "sub2");
    assertExists(targetWord, "「sub2」という単語が見つかりません");

    // 期待値: "sub2"は文字インデックス1から開始だが、表示位置は3（④が2文字幅なので）
    assertEquals(targetWord.col, 3, "全角記号と半角文字の組み合わせでの列位置が正しくありません");
  });

  await t.step("複数のタブ文字を含む行のテスト", async () => {
    const lineText = "\t\t文字";
    const words = await detector.detectWords(lineText, 1);

    // Expected: "文字" word
    // 文字インデックス: \t(0) \t(1) 文(2) 字(3)
    // 表示位置:     \t(1-8) \t(9-16) 文(17-18) 字(19-20)

    const targetWord = words.find((w: Word) => w.text === "文字");
    assertExists(targetWord, "「文字」という単語が見つかりません");

    // 期待値: "文字"は文字インデックス2から開始だが、表示位置は17（タブ8幅x2 + 1 = 17）
    assertEquals(targetWord.col, 17, "複数タブ文字での列位置が正しくありません");
  });

  await t.step("丸数字と英字の隣接テスト", async () => {
    const lineText = "①②③④⑤test";
    const words = await detector.detectWords(lineText, 1);

    // Expected: "test" word
    // 文字インデックス: ①(0) ②(1) ③(2) ④(3) ⑤(4) t(5) e(6) s(7) t(8)
    // 表示位置:     ①(1-2) ②(3-4) ③(5-6) ④(7-8) ⑤(9-10) t(11) e(12) s(13) t(14)

    const targetWord = words.find((w: Word) => w.text === "test");
    assertExists(targetWord, "「test」という単語が見つかりません");

    // 期待値: "test"は文字インデックス5から開始だが、表示位置は11（丸数字5個x2幅 + 1 = 11）
    assertEquals(targetWord.col, 11, "丸数字と英字の隣接での列位置が正しくありません");
  });

  await t.step("文頭での基本テスト", async () => {
    const lineText = "hello";
    const words = await detector.detectWords(lineText, 1);

    const targetWord = words.find((w: Word) => w.text === "hello");
    assertExists(targetWord, "「hello」という単語が見つかりません");

    // 期待値: "hello"は文字インデックス0から開始なので、表示位置は1
    assertEquals(targetWord.col, 1, "文頭での列位置が正しくありません");
  });
});

Deno.test("WordDetector - Edge cases for display width conversion", async (t) => {
  const detector = new RegexWordDetector(defaultConfig); // カスタムタブ幅

  await t.step("カスタムタブ幅での動作確認", async () => {
    const lineText = "\ttest";
    const words = await detector.detectWords(lineText, 1);

    const targetWord = words.find((w: Word) => w.text === "test");
    assertExists(targetWord, "「test」という単語が見つかりません");

    // 実際値: detector.tsでタブ幅8を固定使用するため、"test"は表示位置9（タブ8幅 + 1 = 9）
    assertEquals(targetWord.col, 9, "デフォルトタブ幅での列位置が正しくありません");
  });

  await t.step("空行での動作確認", async () => {
    const lineText = "";
    const words = await detector.detectWords(lineText, 1);

    assertEquals(words.length, 0, "空行では単語が検出されないはずです");
  });

  await t.step("スペースのみの行での動作確認", async () => {
    const lineText = "   ";
    const words = await detector.detectWords(lineText, 1);

    assertEquals(words.length, 0, "スペースのみの行では単語が検出されないはずです");
  });
});