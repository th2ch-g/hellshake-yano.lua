import { generateHintsWithGroups } from "../denops/hellshake-yano/hint.ts";

// ジャンプのシミュレーションテスト
console.log("=== 数字キーでのジャンプ動作テスト ===");

const config = {
  single_char_keys: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'N', 'M', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  multi_char_keys: ['B', 'C', 'E', 'I', 'O', 'P', 'Q', 'R', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
  max_single_char_hints: 21
};

// 15個の単語がある場合
const wordCount = 15;
const hints = generateHintsWithGroups(wordCount, config);

console.log("\n生成されたヒント（15個の単語用）:");
console.log(hints);

// ヒントマッピングをシミュレート
const hintMapping = hints.map((hint, index) => ({
  hint: hint,
  word: { text: `word${index + 1}`, line: 1, col: (index + 1) * 10 }
}));

console.log("\n=== ジャンプテスト ===");

// 数字キーでのジャンプテスト
for (let i = 0; i <= 9; i++) {
  const inputChar = i.toString();
  const singleCharTarget = hintMapping.find(h => h.hint === inputChar);

  if (singleCharTarget) {
    console.log(`✅ 数字 '${inputChar}' を押下 → "${singleCharTarget.word.text}" へジャンプ可能`);
  } else {
    console.log(`❌ 数字 '${inputChar}' を押下 → ジャンプ先なし`);
  }
}

// アルファベットキーでのジャンプテスト
console.log("\n=== アルファベットキーのテスト ===");
const testKeys = ['A', 'S', 'D', 'F'];
for (const key of testKeys) {
  const target = hintMapping.find(h => h.hint === key);
  if (target) {
    console.log(`✅ キー '${key}' → "${target.word.text}" へジャンプ可能`);
  }
}

// 条件チェック（main.tsのロジックを再現）
console.log("\n=== main.ts のジャンプ条件チェック ===");
const singleOnlyKeys = config.single_char_keys;

function checkJumpCondition(inputChar: string) {
  const singleCharTarget = hintMapping.find(h => h.hint === inputChar);
  const canJump = singleOnlyKeys.includes(inputChar) && singleCharTarget;

  console.log(`入力: '${inputChar}'`);
  console.log(`  - single_char_keysに含まれる: ${singleOnlyKeys.includes(inputChar)}`);
  console.log(`  - 対応するヒントが存在: ${!!singleCharTarget}`);
  console.log(`  - ジャンプ可能: ${canJump}`);

  return canJump;
}

// 数字キーのテスト
console.log("\n数字 '3' のテスト:");
checkJumpCondition('3');

console.log("\n数字 '7' のテスト:");
checkJumpCondition('7');