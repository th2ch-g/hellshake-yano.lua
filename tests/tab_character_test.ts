import { assertEquals } from "@std/assert";
import { extractWords } from "../denops/hellshake-yano/neovim/core/word.ts";

Deno.test("タブ文字を含む行の単語位置計算", () => {
  // タブ文字を含む実際のテキスト
  const lineText = "\t\t・案件番号の表示と検索実装をとりあえずやるところまで or 計画を詰める";
  const words = extractWords(lineText, 1, { useJapanese: true });

  // 単語が検出されることを確認
  const foundWords = words.map((w) => ({ text: w.text, col: w.col }));
  console.log("検出された単語:", foundWords);

  // タブ文字2つ = 16列分（各タブ8列）
  // "・案件番号の表示と検索実装をとりあえずやるところまで" は17列目から開始
  const firstWord = words.find((w) => w.text.includes("案件"));
  if (firstWord) {
    // タブ2つ分（16列）+ 中点の後（1列）= 17列目
    console.log(`"${firstWord.text}" の列位置: ${firstWord.col}`);
    assertEquals(firstWord.col >= 17, true, "最初の単語はタブ展開後の正しい位置にあるべき");
  }

  // "or" の位置確認
  const orWord = words.find((w) => w.text === "or");
  if (orWord) {
    console.log(`"or" の列位置: ${orWord.col}`);
    // タブ2つ（16列）+ 日本語文字列（約27文字）+ スペース = 約44列目
    assertEquals(orWord.col > 40, true, "orはタブと日本語文字列の後に位置するべき");
  }
});

Deno.test("単一タブ文字の処理", () => {
  const lineText = "\thello\tworld";
  const words = extractWords(lineText, 1, {});

  const hello = words.find((w) => w.text === "hello");
  const world = words.find((w) => w.text === "world");

  if (hello) {
    // 最初のタブ（8列）+ 1 = 9列目
    assertEquals(hello.col, 9, "helloは最初のタブの後に位置");
  }

  if (world) {
    // タブ（8列）+ "hello"（5文字）+ タブ（次の8の倍数まで = 16列）+ 1 = 17列目
    assertEquals(world.col, 17, "worldは2つ目のタブの後に位置");
  }
});

Deno.test("タブなしテキストの後方互換性", () => {
  const lineText = "hello world";
  const words = extractWords(lineText, 1, {});

  const hello = words.find((w) => w.text === "hello");
  const world = words.find((w) => w.text === "world");

  if (hello) {
    assertEquals(hello.col, 1, "タブなしの場合は通常の位置");
  }

  if (world) {
    assertEquals(world.col, 7, "タブなしの場合は通常の位置");
  }
});

Deno.test("混在パターン: タブ、スペース、日本語", () => {
  const lineText = "\t  こんにちは\tworld";
  const words = extractWords(lineText, 1, { useJapanese: true });

  const japanese = words.find((w) => w.text.includes("こんにちは"));
  const world = words.find((w) => w.text === "world");

  if (japanese) {
    // タブ（8列）+ スペース2つ（2列）+ 1 = 11列目
    console.log(`日本語の列位置: ${japanese.col}`);
    assertEquals(japanese.col, 11, "日本語はタブとスペースの後に位置");
  }

  if (world) {
    // タブ（8列）+ スペース2つ（2列）+ 日本語5文字（5列）+ タブ（次の8の倍数 = 16列）+ 1 = 17列目
    console.log(`worldの列位置: ${world.col}`);
    assertEquals(world.col >= 17, true, "worldは正しく位置");
  }
});
