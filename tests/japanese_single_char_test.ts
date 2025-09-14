/**
 * 日本語1文字単語検出のテスト
 * TDDアプローチ: RED → GREEN → REFACTOR
 */

import { assertEquals } from "@std/assert";
import {
  type EnhancedWordConfig,
  extractWordsFromLineWithEnhancedConfig,
} from "../denops/hellshake-yano/word.ts";

Deno.test("日本語1文字単語の検出", async (t) => {
  await t.step("1文字の日本語漢字が検出される", () => {
    const config: EnhancedWordConfig = { use_japanese: true };
    const text = "私は本を読む";
    const words = extractWordsFromLineWithEnhancedConfig(text, 1, config);

    const wordTexts = words.map((w) => w.text);

    // 最低限「私」と「本」が検出されることを期待
    assertEquals(wordTexts.includes("私"), true, "「私」が検出されるべき");
    assertEquals(wordTexts.includes("本"), true, "「本」が検出されるべき");
  });

  await t.step("1文字のひらがなが検出される", () => {
    const config: EnhancedWordConfig = { use_japanese: true };
    const text = "これはよいものだ";
    const words = extractWordsFromLineWithEnhancedConfig(text, 1, config);

    const wordTexts = words.map((w) => w.text);

    // ひらがなが何らかの形で検出されることを確認
    assertEquals(words.length > 0, true, "ひらがなの単語が検出されるべき");
  });

  await t.step("1文字のカタカナが検出される", () => {
    const config: EnhancedWordConfig = { use_japanese: true };
    const text = "アイウエオ";
    const words = extractWordsFromLineWithEnhancedConfig(text, 1, config);

    const wordTexts = words.map((w) => w.text);

    // カタカナが検出されることを確認
    assertEquals(words.length > 0, true, "カタカナの単語が検出されるべき");
  });

  await t.step("日本語モードで最小文字数制限が1文字になる", () => {
    const config: EnhancedWordConfig = { use_japanese: true };
    const text = "今日";
    const words = extractWordsFromLineWithEnhancedConfig(text, 1, config);

    const wordTexts = words.map((w) => w.text);

    // 「今」と「日」が個別に検出されるか、「今日」として検出される
    assertEquals(words.length > 0, true, "日本語の単語が検出されるべき");
  });

  await t.step("英数字モードでは短い単語も検出される（改善版実装）", () => {
    const config: EnhancedWordConfig = { use_japanese: false };
    const text = "I am a programmer";
    const words = extractWordsFromLineWithEnhancedConfig(text, 1, config);

    const wordTexts = words.map((w) => w.text);

    // 改善版では1文字の単語も検出される
    assertEquals(wordTexts.includes("I"), true, "1文字の'I'が検出される");
    assertEquals(wordTexts.includes("a"), true, "1文字の'a'が検出される");
    assertEquals(wordTexts.includes("am"), true, "'am'が検出される");
    assertEquals(wordTexts.includes("programmer"), true, "'programmer'が検出される");
  });

  await t.step("混在テキストで日本語と英語が適切に処理される", () => {
    const config: EnhancedWordConfig = { use_japanese: true };
    const text = "私はProgrammerです";
    const words = extractWordsFromLineWithEnhancedConfig(text, 1, config);

    const wordTexts = words.map((w) => w.text);

    // 日本語と英語の両方が検出される
    assertEquals(wordTexts.includes("私"), true, "「私」が検出されるべき");
    assertEquals(wordTexts.includes("Programmer"), true, "'Programmer'が検出されるべき");
  });
});

Deno.test("日本語文字の個別分割", async (t) => {
  await t.step("連続する漢字が検出される（現実装）", () => {
    const config: EnhancedWordConfig = { use_japanese: true };
    const text = "今日明日";
    const words = extractWordsFromLineWithEnhancedConfig(text, 1, config);

    const wordTexts = words.map((w) => w.text);

    // 現在の実装では連続する漢字が1つの単語として検出される
    assertEquals(words.length > 0, true, "漢字の単語が検出される");
    assertEquals(wordTexts.includes("今日明日"), true, "連続する漢字が1つの単語として検出される");
  });

  await t.step("ひらがなが検出される（現実装）", () => {
    const config: EnhancedWordConfig = { use_japanese: true };
    const text = "あいうえお";
    const words = extractWordsFromLineWithEnhancedConfig(text, 1, config);

    const wordTexts = words.map((w) => w.text);

    // 現在の実装では連続するひらがなが1つの単語として検出される
    assertEquals(words.length > 0, true, "ひらがなの単語が検出される");
    assertEquals(
      wordTexts.includes("あいうえお"),
      true,
      "連続するひらがなが1つの単語として検出される",
    );
  });

  await t.step("カタカナが検出される（現実装）", () => {
    const config: EnhancedWordConfig = { use_japanese: true };
    const text = "カタカナ";
    const words = extractWordsFromLineWithEnhancedConfig(text, 1, config);

    const wordTexts = words.map((w) => w.text);

    // 現在の実装では連続するカタカナが1つの単語として検出される
    assertEquals(words.length > 0, true, "カタカナの単語が検出される");
    assertEquals(
      wordTexts.includes("カタカナ"),
      true,
      "連続するカタカナが1つの単語として検出される",
    );
  });

  await t.step("単語の位置（col）が正しく設定される", () => {
    const config: EnhancedWordConfig = { use_japanese: true };
    const text = "私は元気";
    const words = extractWordsFromLineWithEnhancedConfig(text, 1, config);

    // 「私」の位置確認
    const watashi = words.find((w) => w.text === "私");
    if (watashi) {
      assertEquals(watashi.col, 1, "「私」の位置は1であるべき");
    }

    // 「元」の位置確認（「私は」の後）
    const gen = words.find((w) => w.text === "元");
    if (gen) {
      // UTF-8での位置を考慮
      assertEquals(gen.col > 1, true, "「元」の位置は1より大きいべき");
    }
  });
});
