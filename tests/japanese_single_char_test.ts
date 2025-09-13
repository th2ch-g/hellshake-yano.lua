/**
 * 日本語1文字単語検出のテスト
 * TDDアプローチ: RED → GREEN → REFACTOR
 */

import { assertEquals } from "@std/assert";
import { extractWordsFromLineWithConfig, type WordConfig } from "../denops/hellshake-yano/word.ts";

Deno.test("日本語1文字単語の検出", async (t) => {
  await t.step("1文字の日本語漢字が検出される", () => {
    const config: WordConfig = { use_japanese: true };
    const text = "私は本を読む";
    const words = extractWordsFromLineWithConfig(text, 1, config);

    const wordTexts = words.map(w => w.text);
    console.log("検出された単語:", wordTexts);

    // 最低限「私」と「本」が検出されることを期待
    assertEquals(wordTexts.includes("私"), true, "「私」が検出されるべき");
    assertEquals(wordTexts.includes("本"), true, "「本」が検出されるべき");
  });

  await t.step("1文字のひらがなが検出される", () => {
    const config: WordConfig = { use_japanese: true };
    const text = "これはよいものだ";
    const words = extractWordsFromLineWithConfig(text, 1, config);

    const wordTexts = words.map(w => w.text);
    console.log("検出された単語:", wordTexts);

    // ひらがなが何らかの形で検出されることを確認
    assertEquals(words.length > 0, true, "ひらがなの単語が検出されるべき");
  });

  await t.step("1文字のカタカナが検出される", () => {
    const config: WordConfig = { use_japanese: true };
    const text = "アイウエオ";
    const words = extractWordsFromLineWithConfig(text, 1, config);

    const wordTexts = words.map(w => w.text);
    console.log("検出された単語:", wordTexts);

    // カタカナが検出されることを確認
    assertEquals(words.length > 0, true, "カタカナの単語が検出されるべき");
  });

  await t.step("日本語モードで最小文字数制限が1文字になる", () => {
    const config: WordConfig = { use_japanese: true };
    const text = "今日";
    const words = extractWordsFromLineWithConfig(text, 1, config);

    const wordTexts = words.map(w => w.text);
    console.log("検出された単語:", wordTexts);

    // 「今」と「日」が個別に検出されるか、「今日」として検出される
    assertEquals(words.length > 0, true, "日本語の単語が検出されるべき");
  });

  await t.step("英数字モードでは3文字未満の単語は除外される", () => {
    const config: WordConfig = { use_japanese: false };
    const text = "I am a programmer";
    const words = extractWordsFromLineWithConfig(text, 1, config);

    const wordTexts = words.map(w => w.text);
    console.log("検出された単語:", wordTexts);

    // 1文字の "I" と "a" は除外される
    assertEquals(wordTexts.includes("I"), false, "1文字の'I'は除外されるべき");
    assertEquals(wordTexts.includes("a"), false, "1文字の'a'は除外されるべき");
    assertEquals(wordTexts.includes("programmer"), true, "'programmer'は検出されるべき");
  });

  await t.step("混在テキストで日本語と英語が適切に処理される", () => {
    const config: WordConfig = { use_japanese: true };
    const text = "私はProgrammerです";
    const words = extractWordsFromLineWithConfig(text, 1, config);

    const wordTexts = words.map(w => w.text);
    console.log("検出された単語:", wordTexts);

    // 日本語と英語の両方が検出される
    assertEquals(wordTexts.includes("私"), true, "「私」が検出されるべき");
    assertEquals(wordTexts.includes("Programmer"), true, "'Programmer'が検出されるべき");
  });
});

Deno.test("日本語文字の個別分割", async (t) => {
  await t.step("連続する漢字が個別に分割される", () => {
    const config: WordConfig = { use_japanese: true };
    const text = "今日明日";
    const words = extractWordsFromLineWithConfig(text, 1, config);

    const wordTexts = words.map(w => w.text);
    console.log("個別分割された単語:", wordTexts);

    // 各文字が個別に検出されることを期待
    assertEquals(wordTexts.includes("今"), true, "「今」が検出されるべき");
    assertEquals(wordTexts.includes("日"), true, "「日」が検出されるべき");
    assertEquals(wordTexts.includes("明"), true, "「明」が検出されるべき");
  });

  await t.step("ひらがなが個別に分割される", () => {
    const config: WordConfig = { use_japanese: true };
    const text = "あいうえお";
    const words = extractWordsFromLineWithConfig(text, 1, config);

    const wordTexts = words.map(w => w.text);
    console.log("個別分割された単語:", wordTexts);

    // 各ひらがなが個別に検出される
    assertEquals(wordTexts.includes("あ"), true, "「あ」が検出されるべき");
    assertEquals(wordTexts.includes("い"), true, "「い」が検出されるべき");
    assertEquals(wordTexts.includes("う"), true, "「う」が検出されるべき");
    assertEquals(wordTexts.includes("え"), true, "「え」が検出されるべき");
    assertEquals(wordTexts.includes("お"), true, "「お」が検出されるべき");
  });

  await t.step("カタカナが個別に分割される", () => {
    const config: WordConfig = { use_japanese: true };
    const text = "カタカナ";
    const words = extractWordsFromLineWithConfig(text, 1, config);

    const wordTexts = words.map(w => w.text);
    console.log("個別分割された単語:", wordTexts);

    // 各カタカナが個別に検出される
    assertEquals(wordTexts.includes("カ"), true, "「カ」が検出されるべき");
    assertEquals(wordTexts.includes("タ"), true, "「タ」が検出されるべき");
    assertEquals(wordTexts.includes("ナ"), true, "「ナ」が検出されるべき");
  });

  await t.step("単語の位置（col）が正しく設定される", () => {
    const config: WordConfig = { use_japanese: true };
    const text = "私は元気";
    const words = extractWordsFromLineWithConfig(text, 1, config);

    console.log("単語と位置:", words.map(w => ({ text: w.text, col: w.col })));

    // 「私」の位置確認
    const watashi = words.find(w => w.text === "私");
    if (watashi) {
      assertEquals(watashi.col, 1, "「私」の位置は1であるべき");
    }

    // 「元」の位置確認（「私は」の後）
    const gen = words.find(w => w.text === "元");
    if (gen) {
      // UTF-8での位置を考慮
      assertEquals(gen.col > 1, true, "「元」の位置は1より大きいべき");
    }
  });
});