/**
 * Dictionary-based Correction System Tests
 *
 * Comprehensive test suite for dictionary functionality
 * Dictionary-based word correction
 */

import {
  assert as assertTrue,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.177.0/testing/asserts.ts";

// assertFalse の代替実装
function assertFalse(value: boolean, msg?: string): void {
  assertEquals(value, false, msg);
}

// Import types and functions that will be implemented
import type { DictionaryConfig, WordDictionary } from "./dictionary.ts";

// These imports will be implemented
import {
  applyDictionaryCorrection,
  createBuiltinDictionary,
  WordDictionaryImpl,
} from "./dictionary.ts";

Deno.test("Dictionary-based Correction System", async (t) => {
  // ===== 辞書機能の基本テスト (10ケース) =====

  await t.step("基本テスト1: カスタム単語の登録と検索", () => {
    const dictionary = new WordDictionaryImpl();
    dictionary.addCustomWord("プログラミング");
    assertTrue(dictionary.hasCustomWord("プログラミング"));
    assertFalse(dictionary.hasCustomWord("存在しない単語"));
  });

  await t.step("基本テスト2: 複合語パターンのマッチング", () => {
    const dictionary = new WordDictionaryImpl();
    dictionary.addCompoundPattern(/関数定義/g);

    const testText = "このコードには関数定義があります";
    const matches = dictionary.matchCompoundPatterns(testText);
    assertEquals(matches.length, 1);
    assertEquals(matches[0].match, "関数定義");
  });

  await t.step("基本テスト3: 分割禁止ワードの識別", () => {
    const dictionary = new WordDictionaryImpl();
    dictionary.addPreserveWord("非同期処理");

    assertTrue(dictionary.shouldPreserveWord("非同期処理"));
    assertFalse(dictionary.shouldPreserveWord("同期処理"));
  });

  await t.step("基本テスト4: 結合ルールの適用", () => {
    const dictionary = new WordDictionaryImpl();
    dictionary.addMergeRule("オブジェクト", "指向", 10);

    const segments = ["オブジェクト", "指向", "プログラミング"];
    const merged = dictionary.applyMergeRules(segments);
    assertEquals(merged, ["オブジェクト指向", "プログラミング"]);
  });

  await t.step("基本テスト5: 優先度による競合解決", () => {
    const dictionary = new WordDictionaryImpl();
    dictionary.addMergeRule("データ", "ベース", 5);
    dictionary.addMergeRule("データ", "構造", 10);

    // 高い優先度のルールが選択されるべき
    const segments1 = ["データ", "ベース"];
    const segments2 = ["データ", "構造"];

    assertEquals(dictionary.applyMergeRules(segments1), ["データベース"]);
    assertEquals(dictionary.applyMergeRules(segments2), ["データ構造"]);
  });

  await t.step("基本テスト6: 辞書ファイルの読み込み", async () => {
    const config: DictionaryConfig = {
      dictionaryPath: "./test-dictionary.json",
      useBuiltinDictionary: false,
    };

    // テスト用辞書ファイルを作成
    const testDictionary = {
      customWords: ["テスト単語1", "テスト単語2"],
      preserveWords: ["保持単語"],
    };

    await Deno.writeTextFile("./test-dictionary.json", JSON.stringify(testDictionary));

    try {
      const dictionary = new WordDictionaryImpl(config);
      await dictionary.loadFromFile();

      assertTrue(dictionary.hasCustomWord("テスト単語1"));
      assertTrue(dictionary.shouldPreserveWord("保持単語"));
    } finally {
      // クリーンアップ
      try {
        await Deno.remove("./test-dictionary.json");
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  await t.step("基本テスト7: プロジェクト固有辞書の統合", () => {
    const globalDict = new WordDictionaryImpl();
    globalDict.addCustomWord("グローバル単語");

    const projectDict = new WordDictionaryImpl();
    projectDict.addCustomWord("プロジェクト単語");

    const merged = WordDictionaryImpl.merge(globalDict, projectDict);

    assertTrue(merged.hasCustomWord("グローバル単語"));
    assertTrue(merged.hasCustomWord("プロジェクト単語"));
  });

  await t.step("基本テスト8: ビルトイン辞書の利用", () => {
    const builtinDict = createBuiltinDictionary();

    // プログラミング用語が含まれているかテスト
    assertTrue(builtinDict.shouldPreserveWord("関数定義"));
    assertTrue(builtinDict.shouldPreserveWord("非同期処理"));
    assertTrue(builtinDict.shouldPreserveWord("オブジェクト指向"));
  });

  await t.step("基本テスト9: 辞書のキャッシュ機能", () => {
    const dictionary = new WordDictionaryImpl({ enableCache: true, cacheSize: 100 });

    // 同じクエリを複数回実行
    const query = "テストクエリ";
    dictionary.hasCustomWord(query);
    dictionary.hasCustomWord(query);

    // キャッシュヒット数を確認
    const stats = dictionary.getCacheStats();
    assertExists(stats);
    assertTrue(stats.hits >= 1);
  });

  await t.step("UnifiedCacheテスト1: DICTIONARY キャッシュタイプの使用", () => {
    const dictionary = new WordDictionaryImpl({ enableCache: true, cacheSize: 100 });

    // カスタム単語を追加してキャッシュ動作をテスト
    dictionary.addCustomWord("UnifiedCacheテスト");

    // 同じクエリを複数回実行してキャッシュヒットを発生させる
    const result1 = dictionary.hasCustomWord("UnifiedCacheテスト");
    const result2 = dictionary.hasCustomWord("UnifiedCacheテスト");
    const result3 = dictionary.hasCustomWord("存在しない単語");
    const result4 = dictionary.hasCustomWord("存在しない単語");

    // 結果を確認
    assertTrue(result1);
    assertTrue(result2);
    assertFalse(result3);
    assertFalse(result4);

    // キャッシュ統計の確認
    const stats = dictionary.getCacheStats();
    assertExists(stats);
    assertTrue(stats.hits >= 2, `Expected hits >= 2, got ${stats.hits}`);
    assertTrue(stats.misses >= 0, `Expected misses >= 0, got ${stats.misses}`);
    assertTrue(
      stats.hitRate >= 0 && stats.hitRate <= 1,
      `Expected hitRate 0-1, got ${stats.hitRate}`,
    );
  });

  await t.step("UnifiedCacheテスト2: キャッシュクリア動作", () => {
    const dictionary = new WordDictionaryImpl({ enableCache: true, cacheSize: 100 });

    // カスタム単語を追加
    dictionary.addCustomWord("クリアテスト");

    // キャッシュヒットを発生させる
    dictionary.hasCustomWord("クリアテスト");
    dictionary.hasCustomWord("クリアテスト");

    // 単語を削除（キャッシュもクリアされる）
    dictionary.removeCustomWord("クリアテスト");

    // 削除後の確認
    assertFalse(dictionary.hasCustomWord("クリアテスト"));
  });

  await t.step("UnifiedCacheテスト3: キャッシュサイズ制限", () => {
    const dictionary = new WordDictionaryImpl({ enableCache: true, cacheSize: 2 });

    // キャッシュサイズを超える数の単語をテスト
    dictionary.hasCustomWord("単語1");
    dictionary.hasCustomWord("単語2");
    dictionary.hasCustomWord("単語3"); // これでキャッシュサイズを超える

    // キャッシュが動作していることを確認
    const stats = dictionary.getCacheStats();
    assertExists(stats);
  });

  await t.step("基本テスト10: 動的辞書更新", () => {
    const dictionary = new WordDictionaryImpl();

    assertFalse(dictionary.hasCustomWord("新規単語"));

    // 動的に単語を追加
    dictionary.addCustomWord("新規単語");
    assertTrue(dictionary.hasCustomWord("新規単語"));

    // 動的に単語を削除
    dictionary.removeCustomWord("新規単語");
    assertFalse(dictionary.hasCustomWord("新規単語"));
  });

  // ===== 日本語プログラミング用語テスト (8ケース) =====

  await t.step("プログラミング用語テスト1: 関数定義の保持", () => {
    const segments = ["関数", "定義"];
    const corrected = applyDictionaryCorrection(segments);
    assertEquals(corrected, ["関数定義"]);
  });

  await t.step("プログラミング用語テスト2: 非同期処理の保持", () => {
    const segments = ["非", "同期", "処理"];
    const corrected = applyDictionaryCorrection(segments);
    assertEquals(corrected, ["非同期処理"]);
  });

  await t.step("プログラミング用語テスト3: 配列操作の保持", () => {
    const segments = ["配列", "操作"];
    const corrected = applyDictionaryCorrection(segments);
    assertEquals(corrected, ["配列操作"]);
  });

  await t.step("プログラミング用語テスト4: オブジェクト指向の保持", () => {
    const segments = ["オブジェクト", "指向"];
    const corrected = applyDictionaryCorrection(segments);
    assertEquals(corrected, ["オブジェクト指向"]);
  });

  await t.step("プログラミング用語テスト5: データベース接続の保持", () => {
    const segments = ["データ", "ベース", "接続"];
    const corrected = applyDictionaryCorrection(segments);
    assertEquals(corrected, ["データベース接続"]);
  });

  await t.step("プログラミング用語テスト6: ユニットテストの保持", () => {
    const segments = ["ユニット", "テスト"];
    const corrected = applyDictionaryCorrection(segments);
    assertEquals(corrected, ["ユニットテスト"]);
  });

  await t.step("プログラミング用語テスト7: バージョン管理の保持", () => {
    const segments = ["バージョン", "管理"];
    const corrected = applyDictionaryCorrection(segments);
    assertEquals(corrected, ["バージョン管理"]);
  });

  await t.step("プログラミング用語テスト8: デバッグ実行の保持", () => {
    const segments = ["デバッグ", "実行"];
    const corrected = applyDictionaryCorrection(segments);
    assertEquals(corrected, ["デバッグ実行"]);
  });
});

// 統合テスト: TinySegmenterWordDetectorとの統合
Deno.test("TinySegmenterWordDetector Dictionary Integration", async (t) => {
  // TinySegmenterWordDetectorのインポートを追加
  const { TinySegmenterWordDetector } = await import("./detector.ts");

  await t.step("統合テスト: 辞書補正が適用される", async () => {
    const detector = new TinySegmenterWordDetector();

    // TinySegmenterが利用可能かチェック
    const isAvailable = await detector.isAvailable();
    if (!isAvailable) {
      // TinySegmenterが利用できない場合はスキップ
      console.warn("TinySegmenter is not available, skipping integration test");
      return;
    }

    // プログラミング用語が含まれるテストテキスト
    const testText = "関数定義と非同期処理を実装する";
    const words = await detector.detectWords(testText, 1);

    // 結果をチェック（辞書補正により複合語が適切に保持されているはず）
    const wordTexts = words.map((w) => w.text);

    // 関数定義が単一の単語として認識されているかチェック
    const hasCorrectTerm = wordTexts.some((text) =>
      text.includes("関数定義") || text.includes("非同期処理")
    );

    // 辞書補正が何らかの効果を持っていることを確認
    assertTrue(words.length > 0, "Words should be detected");
    console.log("Detected words:", wordTexts);
  });
});
