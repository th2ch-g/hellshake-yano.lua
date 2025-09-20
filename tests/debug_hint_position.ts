import { extractWordsFromLine } from "../denops/hellshake-yano/word.ts";

// 実際の問題を再現するテスト
const lineText = "\t\t・案件番号の表示と検索実装をとりあえずやるところまで or 計画を詰める";
console.log("Original text:", JSON.stringify(lineText));

// 改善版検出を使用（実際の使用時と同じ設定）
const words = extractWordsFromLine(lineText, 1, true, false);

console.log("\n=== Detected Words ===");
words.forEach((word, index) => {
  console.log(`[${index}] "${word.text}"`);
  console.log(`    Line: ${word.line}, Col: ${word.col}, ByteCol: ${word.byteCol}`);

  // 各文字の実際の位置を確認
  const charIndex = lineText.indexOf(word.text);
  if (charIndex !== -1) {
    console.log(`    Original char index: ${charIndex}`);

    // タブ展開後の表示位置を手動計算
    let displayPos = 0;
    for (let i = 0; i < charIndex; i++) {
      if (lineText[i] === "\t") {
        displayPos += 8 - (displayPos % 8);
      } else {
        displayPos += 1;
      }
    }
    console.log(`    Manual calc display pos: ${displayPos + 1} (1-based)`);
  }
});

// 「案件番号」が一つの単語として検出されているか確認
const ankenWord = words.find((w) => w.text === "案件番号");
if (ankenWord) {
  console.log("\n=== 案件番号 Found ===");
  console.log(`Position: col=${ankenWord.col}`);
} else {
  console.log("\n=== 案件番号 NOT found as single word ===");
  console.log("Words containing '案':");
  words.filter((w) => w.text.includes("案")).forEach((w) => {
    console.log(`  "${w.text}" at col ${w.col}`);
  });
}

// 日本語文字幅の考慮が必要かチェック
console.log("\n=== Character Width Check ===");
const testChars = ["・", "案", "件", "番", "号", "o", "r"];
testChars.forEach((char) => {
  const code = char.charCodeAt(0);
  const isWide = (code >= 0x3000 && code <= 0x9FFF) || (code >= 0xFF00 && code <= 0xFFEF);
  console.log(`'${char}' (code: ${code}): ${isWide ? "WIDE (2 cols)" : "NARROW (1 col)"}`);
});
