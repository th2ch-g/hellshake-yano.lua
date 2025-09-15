import { generateHintsWithGroups } from "../denops/hellshake-yano/hint.ts";

// 数字を1文字ヒントとして使用するテスト
const config = {
  single_char_keys: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'N', 'M', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  multi_char_keys: ['B', 'C', 'E', 'I', 'O', 'P', 'Q', 'R', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
  max_single_char_hints: 21  // 11文字（A-M） + 10数字（0-9）
};

console.log("=== 数字を1文字ヒントとして生成するテスト ===");

// 少数のヒント（1文字のみ）
const fewHints = generateHintsWithGroups(10, config);
console.log("\n10個のヒント:");
console.log(fewHints);
console.log(`期待: A, S, D, F, G, H, J, K, L, N（アルファベットが先）`);

// 1文字ヒントの最大数まで
const maxSingleHints = generateHintsWithGroups(21, config);
console.log("\n21個のヒント（1文字ヒントの最大）:");
console.log(maxSingleHints);
console.log(`期待: A-M + 0-9 の21個の1文字ヒント`);

// 数字が1文字ヒントとして含まれているか確認
const hasNumberHints = maxSingleHints.some(h => /^[0-9]$/.test(h));
console.log(`\n数字の1文字ヒントが含まれている: ${hasNumberHints}`);

// 1文字ヒントを超えた場合
const moreHints = generateHintsWithGroups(30, config);
console.log("\n30個のヒント（2文字ヒントも含む）:");
console.log(moreHints.slice(0, 25));
console.log("...");
console.log(moreHints.slice(25));

// 2文字ヒントに数字（00-99）が含まれていないか確認
const hasTwoDigitNumbers = moreHints.some(h => /^[0-9]{2}$/.test(h));
console.log(`\n2桁数字（00-99）が含まれている: ${hasTwoDigitNumbers}`);
console.log("期待: false（数字フォールバックは削除済み）");

// 2文字ヒントの内容を確認
const twoCharHints = moreHints.filter(h => h.length === 2);
console.log("\n2文字ヒント:");
console.log(twoCharHints.slice(0, 10));
console.log("期待: BB, BC, BE... などのアルファベット組み合わせのみ");