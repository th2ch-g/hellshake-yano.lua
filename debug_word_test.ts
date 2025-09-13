import { extractWordsFromLineWithConfig } from "./denops/hellshake-yano/word.ts";

console.log("Test 1 (word boundaries):");
const result1 = extractWordsFromLineWithConfig("hello,world test;case code:block", 1, { use_japanese: false });
console.log("Result:", result1.map(w => w.text));

console.log("\nTest 2 (Japanese inclusive):");
const result2 = extractWordsFromLineWithConfig("こんにちはworld テストtest", 1, { use_japanese: true });
console.log("Result:", result2.map(w => w.text));

console.log("\nTest 3 (special characters):");
const result3 = extractWordsFromLineWithConfig("test@email.com function() {return value;}", 1, { use_japanese: false });
console.log("Result:", result3.map(w => w.text));