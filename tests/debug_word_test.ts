import { extractWordsFromLineWithConfig } from "../denops/hellshake-yano/word.ts";

const result1 = extractWordsFromLineWithConfig("hello,world test;case code:block", 1, { use_japanese: false });

const result2 = extractWordsFromLineWithConfig("こんにちはworld テストtest", 1, { use_japanese: true });

const result3 = extractWordsFromLineWithConfig("test@email.com function() {return value;}", 1, { use_japanese: false });
