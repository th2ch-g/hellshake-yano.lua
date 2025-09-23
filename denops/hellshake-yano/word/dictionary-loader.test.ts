/**
 * Dictionary Loader Test Suite (Simplified)
 * TDD Red Phase: Test-first implementation for user-defined dictionary functionality
 * Following PLAN.md process4 sub1.5
 */

import { assertEquals } from "https://deno.land/std@0.212.0/assert/mod.ts";
import { join } from "https://deno.land/std@0.212.0/path/mod.ts";
import { WordDictionaryImpl } from "./dictionary.ts";

// 実装をインポート
import {
  DictionaryLoader,
  DictionaryMerger,
  VimConfigBridge,
  HintPatternProcessor,
  type UserDictionary,
  type HintPattern,
  type MergeStrategy,
} from "./dictionary-loader.ts";

// テスト用の一時ディレクトリを作成
const createTempDir = async (): Promise<string> => {
  const tempDir = await Deno.makeTempDir({ prefix: "hellshake_yano_test_" });
  return tempDir;
};

// テスト用の辞書ファイルを作成
const createTestDictionaryFile = async (tempDir: string, filename: string, content: string): Promise<string> => {
  const filepath = join(tempDir, filename);
  await Deno.writeTextFile(filepath, content);
  return filepath;
};

/**
 * 辞書ファイル読み込みテスト（3ケース：主要な形式のみ）
 */
Deno.test("Dictionary File Loading Tests", async (t) => {
  const tempDir = await createTempDir();

  try {
    await t.step("1. JSON形式の辞書ファイル読み込み", async () => {
      const jsonContent = JSON.stringify({
        customWords: ["機械学習", "深層学習"],
        preserveWords: ["HelloWorld"],
        mergeRules: { "の": "always" },
        compoundPatterns: [".*Controller$"],
        metadata: { version: "1.0", author: "test" }
      });

      const filepath = await createTestDictionaryFile(tempDir, "test.json", jsonContent);
      const loader = new DictionaryLoader({ dictionaryPath: filepath });
      const result = await loader.loadUserDictionary();

      // 正しく読み込まれることを確認
      assertEquals(result.customWords.length, 2);
      assertEquals(result.customWords[0], "機械学習");
      assertEquals(result.preserveWords[0], "HelloWorld");
    });

    await t.step("2. 存在しないファイルのハンドリング", async () => {
      const loader = new DictionaryLoader({ dictionaryPath: "/nonexistent/path.json" });
      const result = await loader.loadUserDictionary();

      // 空の辞書が返されることを確認
      assertEquals(result.customWords.length, 0);
      assertEquals(result.preserveWords.length, 0);
    });

    await t.step("3. 空の辞書ファイルの処理", async () => {
      const filepath = await createTestDictionaryFile(tempDir, "empty.json", "{}");
      const loader = new DictionaryLoader({ dictionaryPath: filepath });
      const result = await loader.loadUserDictionary();

      // 空の辞書が正しく処理されることを確認
      assertEquals(result.customWords.length, 0);
      assertEquals(result.preserveWords.length, 0);
    });

  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

/**
 * 辞書マージテスト（3ケース）
 */
Deno.test("Dictionary Merge Tests", async (t) => {
  await t.step("1. ビルトイン辞書との統合", () => {
    const merger = new DictionaryMerger();
    const baseDictionary = new WordDictionaryImpl();
    baseDictionary.addCustomWord("基本単語");

    const userDictionary: UserDictionary = {
      customWords: ["ユーザー単語"],
      preserveWords: [],
      mergeRules: new Map(),
      compoundPatterns: [],
    };

    const result = merger.merge(baseDictionary, userDictionary);

    // 両方の単語が含まれることを確認
    assertEquals(result.hasCustomWord("基本単語"), true);
    assertEquals(result.hasCustomWord("ユーザー単語"), true);
  });

  await t.step("2. override戦略でのマージ", () => {
    const merger = new DictionaryMerger();
    const baseDictionary = new WordDictionaryImpl();
    baseDictionary.addCustomWord("基本単語");

    const userDictionary: UserDictionary = {
      customWords: ["ユーザー単語"],
      preserveWords: [],
      mergeRules: new Map(),
      compoundPatterns: [],
    };

    const result = merger.merge(baseDictionary, userDictionary, 'override');

    // ユーザー単語が優先されることを確認
    assertEquals(result.hasCustomWord("ユーザー単語"), true);
  });

  await t.step("3. merge戦略でのマージ", () => {
    const merger = new DictionaryMerger();
    const baseDictionary = new WordDictionaryImpl();
    baseDictionary.addCustomWord("基本単語");

    const userDictionary: UserDictionary = {
      customWords: ["ユーザー単語"],
      preserveWords: [],
      mergeRules: new Map(),
      compoundPatterns: [],
    };

    const result = merger.merge(baseDictionary, userDictionary, 'merge');

    // 両方の単語が統合されることを確認
    assertEquals(result.hasCustomWord("基本単語"), true);
    assertEquals(result.hasCustomWord("ユーザー単語"), true);
  });
});

/**
 * ヒントパターンテスト（3ケース）
 */
Deno.test("Hint Pattern Tests", async (t) => {
  await t.step("1. 正規表現パターンマッチング", () => {
    const processor = new HintPatternProcessor();
    const words = [
      { col: 1, text: "テスト", line: 1 }
    ];
    const text = "- [ ] テストを実行する";
    const patterns: HintPattern[] = [
      {
        pattern: /^-\s*\[\s*\]\s*(.)/,
        hintPosition: 'capture:1',
        priority: 100,
      }
    ];

    const result = processor.applyHintPatterns(words, text, patterns);

    // 処理が正常に完了することを確認
    assertEquals(result.length, 1);
  });

  await t.step("2. キャプチャグループの抽出", () => {
    const processor = new HintPatternProcessor();
    const words = [
      { col: 7, text: "見出し", line: 1 }
    ];
    const text = "## 見出しテキスト";
    const patterns: HintPattern[] = [
      {
        pattern: /^(#+)\s*(.)/,
        hintPosition: 'capture:2',
        priority: 90,
      }
    ];

    const result = processor.applyHintPatterns(words, text, patterns);

    // キャプチャグループが正しく処理されることを確認
    assertEquals(result.length, 1);
  });

  await t.step("3. ヒント優先度の設定", () => {
    const processor = new HintPatternProcessor();
    const words = [
      { col: 1, text: "重要", line: 1 },
      { col: 7, text: "普通", line: 1 },
    ];
    const text = "「重要な普通のポイント」";
    const patterns: HintPattern[] = [
      {
        pattern: /「([^」])/,
        hintPosition: 'capture:1',
        priority: 80,
      }
    ];

    const result = processor.applyHintPatterns(words, text, patterns);

    // 優先度が設定されることを確認
    assertEquals(result.length, 2);
  });
});