import { assertEquals, assertNotEquals } from "https://deno.land/std@0.217.0/assert/mod.ts";
import { extractWordsFromLineOriginal } from "../denops/hellshake-yano/word.ts";

/**
 * Legacy behavior regression test suite for extractWordsFromLineOriginal
 *
 * This test documents the existing behavior of extractWordsFromLineOriginal
 * to serve as regression tests during the migration process.
 *
 * Key characteristics of extractWordsFromLineOriginal:
 * - Minimum word length: 2 characters
 * - Skips number-only words
 * - SPLITS kebab-case (hyphens are NOT word characters)
 * - Does NOT split snake_case (underscores ARE word characters)
 * - Simple regex matching with Unicode support
 * - Handles Japanese text (hiragana, katakana, kanji)
 */

Deno.test("Legacy Behavior Tests: extractWordsFromLineOriginal", async (t) => {
  await t.step("Minimum word length requirement (2 characters)", () => {
    // Single characters should be excluded
    const singleCharLine = "a b c d e 1 2 3";
    const singleCharWords = extractWordsFromLineOriginal(singleCharLine, 1);
    assertEquals(singleCharWords.length, 0, "Should exclude all single characters");

    // Two character words should be included
    const twoCharLine = "aa bb cc dd";
    const twoCharWords = extractWordsFromLineOriginal(twoCharLine, 1);
    assertEquals(twoCharWords.length, 4, "Should include all two-character words");
    assertEquals(twoCharWords.map(w => w.text), ["aa", "bb", "cc", "dd"]);
  });

  await t.step("Number-only word exclusion", () => {
    // Pure numbers should be skipped regardless of length
    const numberLine = "12 123 1234 word1 word2 123word word123";
    const words = extractWordsFromLineOriginal(numberLine, 1);

    // Should exclude pure numbers (12, 123, 1234) but include words with numbers
    const expectedTexts = ["word1", "word2", "123word", "word123"];
    assertEquals(words.length, 4, "Should exclude pure numbers but include alphanumeric words");
    assertEquals(words.map(w => w.text), expectedTexts);
  });

  await t.step("Word boundary behavior: kebab-case vs snake_case", () => {
    // kebab-case gets split by hyphens (hyphens are NOT word characters)
    const kebabLine = "hello-world foo-bar-baz my-component";
    const kebabWords = extractWordsFromLineOriginal(kebabLine, 1);
    assertEquals(kebabWords.length, 7, "Should split kebab-case by hyphens");
    assertEquals(kebabWords.map(w => w.text), ["hello", "world", "foo", "bar", "baz", "my", "component"]);

    // snake_case stays together (underscores ARE word characters in \w)
    const snakeLine = "hello_world foo_bar_baz my_variable";
    const snakeWords = extractWordsFromLineOriginal(snakeLine, 1);
    assertEquals(snakeWords.length, 3, "Should keep snake_case words together");
    assertEquals(snakeWords.map(w => w.text), ["hello_world", "foo_bar_baz", "my_variable"]);

    // Mixed case
    const mixedLine = "camelCase PascalCase hello-world foo_bar";
    const mixedWords = extractWordsFromLineOriginal(mixedLine, 1);
    assertEquals(mixedWords.length, 5, "Should handle mixed naming conventions");
    assertEquals(mixedWords.map(w => w.text), ["camelCase", "PascalCase", "hello", "world", "foo_bar"]);
  });

  await t.step("Japanese text handling", () => {
    // Hiragana (single chars like "の" are excluded due to 2-char minimum)
    const hiraganaLine = "これは ひらがな の テスト です";
    const hiraganaWords = extractWordsFromLineOriginal(hiraganaLine, 1);
    assertEquals(hiraganaWords.length, 4, "Should detect hiragana words (excluding single chars)");
    assertEquals(hiraganaWords.map(w => w.text), ["これは", "ひらがな", "テスト", "です"]);

    // Katakana (single chars like "ノ" are excluded)
    const katakanaLine = "コレハ カタカナ ノ テスト デス";
    const katakanaWords = extractWordsFromLineOriginal(katakanaLine, 1);
    assertEquals(katakanaWords.length, 4, "Should detect katakana words (excluding single chars)");
    assertEquals(katakanaWords.map(w => w.text), ["コレハ", "カタカナ", "テスト", "デス"]);

    // Kanji
    const kanjiLine = "日本語 文字列 処理 テスト";
    const kanjiWords = extractWordsFromLineOriginal(kanjiLine, 1);
    assertEquals(kanjiWords.length, 4, "Should detect kanji words");
    assertEquals(kanjiWords.map(w => w.text), ["日本語", "文字列", "処理", "テスト"]);

    // Mixed Japanese
    const mixedJapaneseLine = "これは日本語のテストです";
    const mixedJapaneseWords = extractWordsFromLineOriginal(mixedJapaneseLine, 1);
    assertEquals(mixedJapaneseWords.length, 1, "Should treat continuous Japanese as one word");
    assertEquals(mixedJapaneseWords[0].text, "これは日本語のテストです");
  });

  await t.step("Mixed language content", () => {
    const mixedLine = "Hello 世界 test テスト 123 word";
    const mixedWords = extractWordsFromLineOriginal(mixedLine, 1);

    // Should exclude "123" (number only), include others
    const expectedTexts = ["Hello", "世界", "test", "テスト", "word"];
    assertEquals(mixedWords.length, 5, "Should handle mixed language content");
    assertEquals(mixedWords.map(w => w.text), expectedTexts);
  });

  await t.step("Edge cases", () => {
    // Empty line
    const emptyWords = extractWordsFromLineOriginal("", 1);
    assertEquals(emptyWords.length, 0, "Should handle empty lines");

    // Single character line
    const singleCharWords = extractWordsFromLineOriginal("a", 1);
    assertEquals(singleCharWords.length, 0, "Should exclude single character lines");

    // Only spaces
    const spaceWords = extractWordsFromLineOriginal("   ", 1);
    assertEquals(spaceWords.length, 0, "Should handle whitespace-only lines");

    // Special characters
    const specialLine = "hello! @world #test $money 50% (test)";
    const specialWords = extractWordsFromLineOriginal(specialLine, 1);
    // Should extract: hello, world, test, money, test (excluding 50 as number-only)
    assertEquals(specialWords.length, 5, "Should handle special characters properly");
    assertEquals(specialWords.map(w => w.text), ["hello", "world", "test", "money", "test"]);
  });

  await t.step("Column and byte position accuracy", () => {
    const testLine = "hello world test";
    const words = extractWordsFromLineOriginal(testLine, 5);

    // Check line number
    assertEquals(words.every(w => w.line === 5), true, "Should set correct line number");

    // Check column positions (1-based)
    assertEquals(words[0].col, 1, "First word should start at column 1");
    assertEquals(words[1].col, 7, "Second word should start at column 7");
    assertEquals(words[2].col, 13, "Third word should start at column 13");

    // Check byte positions (1-based)
    assertEquals(words[0].byteCol, 1, "First word should start at byte 1");
    assertEquals(words[1].byteCol, 7, "Second word should start at byte 7");
    assertEquals(words[2].byteCol, 13, "Third word should start at byte 13");
  });

  await t.step("UTF-8 multibyte character handling", () => {
    const utf8Line = "hello 世界 test";
    const utf8Words = extractWordsFromLineOriginal(utf8Line, 1);

    assertEquals(utf8Words.length, 3, "Should handle UTF-8 characters");
    assertEquals(utf8Words.map(w => w.text), ["hello", "世界", "test"]);

    // Check positions with multibyte characters
    assertEquals(utf8Words[0].col, 1, "First word at column 1");
    assertEquals(utf8Words[1].col, 7, "Japanese word at column 7");
    assertEquals(utf8Words[2].col, 10, "Last word at column 10");

    // Byte positions should account for UTF-8 encoding
    assertEquals(utf8Words[0].byteCol, 1, "First word at byte 1");
    assertEquals(utf8Words[1].byteCol, 7, "Japanese word at byte 7");
    // "世界" takes 6 bytes (3 bytes each), so next word starts at byte 14
    assertEquals(utf8Words[2].byteCol, 14, "Last word should account for UTF-8 byte length");
  });

  await t.step("Performance limits (max 100 words per line)", () => {
    // Create a line with more than 100 potential words
    const manyWords = Array.from({length: 150}, (_, i) => `word${i}`).join(" ");
    const limitedWords = extractWordsFromLineOriginal(manyWords, 1);

    // Should be limited to 100 words maximum
    assertEquals(limitedWords.length, 100, "Should limit to 100 words per line for performance");
  });

  await t.step("Real-world code examples", () => {
    // Typical programming content
    const codeLine = "function getUserName(userId) { return user.name; }";
    const codeWords = extractWordsFromLineOriginal(codeLine, 1);

    // Should detect: function, getUserName, userId, return, user, name
    assertEquals(codeWords.length, 6, "Should detect words in code");
    assertEquals(codeWords.map(w => w.text), ["function", "getUserName", "userId", "return", "user", "name"]);

    // CSS example (hyphens and colons split words)
    const cssLine = "background-color: #ff0000; margin-top: 10px;";
    const cssWords = extractWordsFromLineOriginal(cssLine, 1);

    // Should detect: background, color, ff0000, margin, top, 10px (hyphens split words)
    assertEquals(cssWords.length, 6, "Should handle CSS content");
    assertEquals(cssWords.map(w => w.text), ["background", "color", "ff0000", "margin", "top", "10px"]);
  });
});