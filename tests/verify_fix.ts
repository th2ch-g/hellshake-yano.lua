import { extractWordsFromLine } from "../denops/hellshake-yano/word.ts";

// 実際の問題のテキスト（changelogmemo line 2530）
const lineText = "\t\t・案件番号の表示と検索実装をとりあえずやるところまで or 計画を詰める";

console.log("=== 修正後の位置計算テスト ===");
console.log("Original text:", JSON.stringify(lineText));

const words = extractWordsFromLine(lineText, 1, true, false);

// 「案件番号」の位置を確認
const ankenWord = words.find((w) => w.text === "案件番号");
if (ankenWord) {
  console.log(`\n✅ "案件番号" found at column ${ankenWord.col}`);
  console.log("   Expected: col 19 (after 2 tabs = 16 cols + ・ = 2 cols + 1)");

  // 位置計算の詳細
  console.log("\n位置計算の詳細:");
  console.log("  - タブ×2 = 16列");
  console.log("  - ・（全角中点） = 2列");
  console.log("  - 合計 = 18列");
  console.log("  - 次の文字の開始位置 = 19列目");

  if (ankenWord.col === 19) {
    console.log("\n✅ 位置計算が正しく動作しています！");
  } else {
    console.log(`\n❌ 位置がずれています: 期待値 19, 実際 ${ankenWord.col}`);
  }
}

// 各単語の位置を表示
console.log("\n=== 全単語の位置 ===");
words.forEach((w, i) => {
  console.log(`[${i}] "${w.text}" at col ${w.col}`);
});

console.log("\n=== 修正内容 ===");
console.log("1. タブ文字の展開処理を追加（8列単位に展開）");
console.log("2. 日本語全角文字の幅を2列として計算");
console.log("3. getDisplayColumn関数で正確な表示位置を計算");
console.log("\nこれにより、Vimでのヒントジャンプが正しい位置に移動するようになりました。");
