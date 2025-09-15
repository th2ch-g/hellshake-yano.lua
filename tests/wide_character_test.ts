import { assertEquals } from "@std/assert";
import { extractWordsFromLine } from "../denops/hellshake-yano/word.ts";

Deno.test("全角文字を含む行の正確な位置計算", () => {
  // 実際の問題のテキスト
  const lineText = "\t\t・案件番号の表示と検索実装をとりあえずやるところまで or 計画を詰める";
  const words = extractWordsFromLine(lineText, 1, true, false);

  // 詳細なログ出力
  console.log("=== All Words ===");
  words.forEach((w, i) => {
    console.log(`[${i}] "${w.text}" at col ${w.col}`);
  });

  // タブ2つ = 16列
  // ・ = 2列（全角）
  // 合計18列目から「案」が始まるべき

  // 「案件番号」の位置確認
  const ankenWord = words.find(w => w.text === "案件番号");
  if (ankenWord) {
    console.log(`\n"案件番号" found at col ${ankenWord.col}`);
    // タブ16列 + ・2列 + 1 = 19列目
    assertEquals(ankenWord.col, 19, "案件番号は19列目から始まるべき（全角文字考慮）");
  }

  // 「or」の位置確認（全角文字を考慮した計算）
  const orWord = words.find(w => w.text === "or");
  if (orWord) {
    console.log(`"or" found at col ${orWord.col}`);
    // タブ16列 + 全角文字列（・案件番号の表示と検索実装をとりあえずやるところまで = 27文字×2列 = 54列）+ スペース1列 + 1
    // 実際には文字列の構成により異なるが、大幅に増加するはず
    assertEquals(orWord.col > 60, true, "orは全角文字考慮で60列目以降にあるべき");
  }
});

Deno.test("全角半角混在テキストの位置計算", () => {
  // 全角と半角が混在するシンプルなケース
  const lineText = "あいうabc";
  const words = extractWordsFromLine(lineText, 1, true, false);

  console.log("\n=== Mixed Width Test ===");
  words.forEach(w => {
    console.log(`"${w.text}" at col ${w.col}`);
  });

  // 「あいう」は6列分（3文字×2列）
  // 「abc」は7列目から
  const abc = words.find(w => w.text === "abc");
  if (abc) {
    assertEquals(abc.col, 7, "abcは全角3文字（6列）の後の7列目から");
  }
});

Deno.test("タブと全角文字の組み合わせ", () => {
  const lineText = "\t案件\t番号";
  const words = extractWordsFromLine(lineText, 1, true, false);

  console.log("\n=== Tab + Wide Char Test ===");
  words.forEach(w => {
    console.log(`"${w.text}" at col ${w.col}`);
  });

  const anken = words.find(w => w.text === "案件");
  const bangou = words.find(w => w.text === "番号");

  if (anken) {
    // 最初のタブ（8列）+ 1 = 9列目
    assertEquals(anken.col, 9, "案件は最初のタブ後の9列目から");
  }

  if (bangou) {
    // タブ（8列）+ 案件（4列 = 2文字×2列）= 12列
    // 次のタブは16列まで進む + 1 = 17列目
    assertEquals(bangou.col, 17, "番号は2つ目のタブ後の17列目から");
  }
});

Deno.test("中点（・）の幅確認", () => {
  const lineText = "・test";
  const words = extractWordsFromLine(lineText, 1, true, false);

  const dot = words.find(w => w.text === "・");
  const test = words.find(w => w.text === "test");

  if (dot) {
    assertEquals(dot.col, 1, "中点は1列目から");
  }

  if (test) {
    // 中点は2列分
    assertEquals(test.col, 3, "testは中点（2列）の後の3列目から");
  }
});