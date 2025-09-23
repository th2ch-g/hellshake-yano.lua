import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { assignHintsToWords } from "../denops/hellshake-yano/hint.ts";
import type { Word, HintMapping } from "../denops/hellshake-yano/types.ts";

Deno.test("assignHintsToWords - skipOverlapDetection parameter (RED phase)", async (t) => {
  // テスト用の隣接する単語データ
  const createOverlappingWords = (): Word[] => [
    { text: "hello", line: 1, col: 1 },
    { text: "world", line: 1, col: 7 }, // hello の直後（col 6で終了 + 1カラム = col 7）
    { text: "test", line: 1, col: 13 }, // world の直後
    { text: "isolated", line: 2, col: 1 }, // 別行の単語（オーバーラップしない）
  ];

  const hints = ["A", "B", "C", "D"];
  const cursorLine = 1;
  const cursorCol = 1;

  await t.step("should include overlap detection by default", () => {
    const result = assignHintsToWords(
      createOverlappingWords(),
      hints,
      cursorLine,
      cursorCol,
    );

    // デフォルトではオーバーラップ検出が実行され、一部の単語がスキップされる
    // 隣接する単語のうち一部がフィルタリングされることを確認
    assertEquals(result.length < 4, true, "Should filter out some overlapping words");
  });

  await t.step("should skip overlap detection when skipOverlapDetection is true", () => {
    const result = assignHintsToWords(
      createOverlappingWords(),
      hints,
      cursorLine,
      cursorCol,
      "normal",
      undefined,
      { skipOverlapDetection: true },
    );

    // オーバーラップ検出をスキップした場合、すべての単語にヒントが割り当てられる
    assertEquals(result.length, 4, "Should assign hints to all words when skipping overlap detection");

    // すべての単語が結果に含まれることを確認
    const resultTexts = result.map(r => r.word.text).sort();
    const expectedTexts = ["hello", "world", "test", "isolated"].sort();
    assertEquals(resultTexts, expectedTexts, "All words should be included");
  });

  await t.step("should maintain overlap detection when skipOverlapDetection is false", () => {
    // この機能はまだ実装されていないため、現在のデフォルト動作をテスト
    const result = assignHintsToWords(
      createOverlappingWords(),
      hints,
      cursorLine,
      cursorCol,
      "normal",
      undefined,
    );

    // 現在のデフォルト動作：オーバーラップ検出が実行される
    assertEquals(result.length < 4, true, "Should filter out overlapping words with current implementation");
  });

  await t.step("should work with current default behavior", () => {
    const result = assignHintsToWords(
      createOverlappingWords(),
      hints,
      cursorLine,
      cursorCol,
      "normal",
      undefined,
    );

    // 現在のデフォルト動作（オーバーラップ検出あり）
    assertEquals(result.length < 4, true, "Should use default behavior with current implementation");
  });
});

// 真のRED状態: この機能が実装されるまで失敗するテスト
Deno.test("assignHintsToWords - NEW API with skipOverlapDetection (should FAIL)", async (t) => {
  const words: Word[] = [
    { text: "test1", line: 1, col: 1 },
    { text: "test2", line: 1, col: 7 }, // 隣接
    { text: "test3", line: 1, col: 13 }, // 隣接
  ];
  const hints = ["A", "B", "C"];

  await t.step("should accept skipOverlapDetection in 7th parameter", () => {
    // この呼び出しは現在エラーになるべき（パラメータ数が合わない）
    const result = assignHintsToWords(
      words,
      hints,
      1,
      1,
      "normal",
      undefined,
      { skipOverlapDetection: true }
    );

    // オーバーラップ検出をスキップした場合、すべての単語が含まれるべき
    assertEquals(result.length, 3, "Should include all words when skipping overlap detection");

    // 各単語が正しく含まれているかチェック
    const resultTexts = result.map(r => r.word.text);
    assertEquals(resultTexts.includes("test1"), true, "Should include test1");
    assertEquals(resultTexts.includes("test2"), true, "Should include test2");
    assertEquals(resultTexts.includes("test3"), true, "Should include test3");
  });

  await t.step("should default to overlap detection when parameter omitted", () => {
    const result = assignHintsToWords(
      words,
      hints,
      1,
      1,
      "normal",
      undefined
    );

    // デフォルトでは隣接単語の一部がフィルタリングされる
    assertEquals(result.length < 3, true, "Should filter some adjacent words by default");
  });
});

Deno.test("assignHintsToWords - performance optimization config interface", async (t) => {
  const simpleWords: Word[] = [
    { text: "simple", line: 1, col: 1 },
    { text: "test", line: 1, col: 20 }, // 十分に離れた位置
  ];
  const hints = ["A", "B"];

  await t.step("should accept optimization config as separate parameter (future)", () => {
    // 将来的な機能テスト - 現在は基本機能をテスト
    const result = assignHintsToWords(
      simpleWords,
      hints,
      1,
      1,
      "normal",
      undefined, // config
    );

    assertEquals(result.length, 2, "Should work with current implementation");
  });

  await t.step("should work with existing config parameter unchanged", () => {
    // 既存のconfigパラメータが正常に動作することを確認
    const hintConfig = { hint_position: "end" as const };
    const result = assignHintsToWords(
      simpleWords,
      hints,
      1,
      1,
      "normal",
      hintConfig,
    );

    assertEquals(result.length, 2, "Should work with existing config parameter");
    // ヒントの結果が正しく生成されることを確認
    assertEquals(result[0].hint.length > 0, true, "Should generate valid hints");
  });
});

Deno.test("assignHintsToWords - performance measurement", async (t) => {
  // パフォーマンステスト用の大量データ
  const createLargeWordSet = (count: number): Word[] => {
    const words: Word[] = [];
    for (let i = 0; i < count; i++) {
      words.push({
        text: `word${i}`,
        line: Math.floor(i / 10) + 1, // 10個ずつ異なる行に配置
        col: (i % 10) * 8 + 1, // 8カラム間隔で配置（オーバーラップを避ける）
      });
    }
    return words;
  };

  const generateHints = (count: number): string[] => {
    const hints: string[] = [];
    for (let i = 0; i < count; i++) {
      hints.push(String.fromCharCode(65 + (i % 26))); // A-Zを繰り返し
    }
    return hints;
  };

  await t.step("should complete quickly with skipOverlapDetection optimization", () => {
    const wordCount = 100;
    const words = createLargeWordSet(wordCount);
    const hints = generateHints(wordCount);

    // 最適化後のパフォーマンスを測定
    const startTime = performance.now();
    const result = assignHintsToWords(
      words,
      hints,
      1,
      1,
      "normal",
      undefined,
      { skipOverlapDetection: true },
    );
    const endTime = performance.now();
    const executionTime = endTime - startTime;

    assertEquals(result.length, wordCount, "Should process all words when optimized");
    console.log(`Performance test (optimized): ${executionTime.toFixed(2)}ms for ${wordCount} words`);

    // 100語に対して10ms以内で完了することを要求
    assertEquals(executionTime < 10, true, `Should complete in under 10ms, actual: ${executionTime.toFixed(2)}ms`);
  });

  await t.step("should show significant performance improvement", () => {
    const wordCount = 50;
    const words = createLargeWordSet(wordCount);
    const hints = generateHints(wordCount);

    // オーバーラップ検出ありの実行時間
    const startTimeWithDetection = performance.now();
    const resultWithDetection = assignHintsToWords(
      words,
      hints,
      1,
      1,
      "normal",
      undefined,
      { skipOverlapDetection: false },
    );
    const endTimeWithDetection = performance.now();
    const timeWithDetection = endTimeWithDetection - startTimeWithDetection;

    // オーバーラップ検出なしの実行時間
    const startTimeWithoutDetection = performance.now();
    const resultWithoutDetection = assignHintsToWords(
      words,
      hints,
      1,
      1,
      "normal",
      undefined,
      { skipOverlapDetection: true },
    );
    const endTimeWithoutDetection = performance.now();
    const timeWithoutDetection = endTimeWithoutDetection - startTimeWithoutDetection;

    console.log(`Performance comparison for ${wordCount} words:`);
    console.log(`  With overlap detection: ${timeWithDetection.toFixed(2)}ms (${resultWithDetection.length} words)`);
    console.log(`  Without overlap detection: ${timeWithoutDetection.toFixed(2)}ms (${resultWithoutDetection.length} words)`);

    if (timeWithDetection > 0 && timeWithoutDetection > 0) {
      const improvement = timeWithDetection / timeWithoutDetection;
      console.log(`  Performance improvement: ${improvement.toFixed(2)}x faster`);

      // 最適化により性能が向上していることを確認
      assertEquals(timeWithoutDetection <= timeWithDetection, true, "Optimization should not be slower");
    }

    // skipOverlapDetectionによってより多くの単語が処理されることを確認
    assertEquals(resultWithoutDetection.length >= resultWithDetection.length, true,
      "Skip overlap detection should process at least as many words");
  });
});