import { extractWordsFromLineWithConfig, type WordConfig } from "./denops/hellshake-yano/word.ts";

console.log("Test 1 (Japanese mode):");
const result1 = extractWordsFromLineWithConfig("コードcode実装implement", 1, { use_japanese: true });
console.log("Result:", result1.map(w => w.text));

console.log("\nTest 2 (Multi-line):");
const lines = [
  "第一行first line",
  "  indented second行",
  "最後のlast line"
];
const allWords = [];
lines.forEach((lineText, index) => {
  const lineWords = extractWordsFromLineWithConfig(lineText, index + 1, { use_japanese: false });
  allWords.push(...lineWords);
});
console.log("Words:", allWords.map(w => `${w.text}(${w.line}:${w.col})`));

console.log("\nTest 3 (Configuration):");
const lineText = "設定config変更change適用apply";
const words1 = extractWordsFromLineWithConfig(lineText, 1, { use_japanese: false });
const words2 = extractWordsFromLineWithConfig(lineText, 1, { use_japanese: true });
console.log("English only:", words1.map(w => w.text));
console.log("Japanese inclusive:", words2.map(w => w.text));