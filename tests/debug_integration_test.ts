import {
  type EnhancedWordConfig,
  extractWordsFromLineWithEnhancedConfig,
} from "../denops/hellshake-yano/word.ts";

const result1 = extractWordsFromLineWithEnhancedConfig("コードcode実装implement", 1, {
  use_japanese: true,
});

const lines = [
  "第一行first line",
  "  indented second行",
  "最後のlast line",
];
const allWords = [];
lines.forEach((lineText, index) => {
  const lineWords = extractWordsFromLineWithEnhancedConfig(lineText, index + 1, {
    use_japanese: false,
  });
  allWords.push(...lineWords);
});

const lineText = "設定config変更change適用apply";
const words1 = extractWordsFromLineWithEnhancedConfig(lineText, 1, { use_japanese: false });
const words2 = extractWordsFromLineWithEnhancedConfig(lineText, 1, { use_japanese: true });
