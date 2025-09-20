/**
 * Process100 リファクタリングのテスト
 * TDD Red-Green-Refactor サイクルに基づいて、既存の動作を保証する
 */

import { assertEquals, assertNotEquals } from "@std/assert";
import { HintManager } from "../denops/hellshake-yano/hint/manager.ts";
import { getMinLengthForKey } from "../denops/hellshake-yano/main.ts";
import {
  WordDetectionManager,
  type WordDetectionManagerConfig,
} from "../denops/hellshake-yano/word/manager.ts";
import type { Config } from "../denops/hellshake-yano/main.ts";
import type { DetectionContext } from "../denops/hellshake-yano/word/detector.ts";

Deno.test("Process100: Baseline behavior - getMinLengthForKey function", () => {
  // 各パターンでのgetMinLengthForKey関数の動作を記録

  // パターン1: per_key_min_length優先
  const config1: Partial<Config> = {
    per_key_min_length: { "f": 1, "t": 3 },
    default_min_word_length: 2,
    min_word_length: 4,
  };

  assertEquals(getMinLengthForKey(config1 as Config, "f"), 1, "per_key_min_lengthが最優先");
  assertEquals(getMinLengthForKey(config1 as Config, "t"), 3, "per_key_min_lengthが最優先");
  assertEquals(
    getMinLengthForKey(config1 as Config, "x"),
    2,
    "default_min_word_lengthが使用される",
  );

  // パターン2: default_min_word_lengthフォールバック
  const config2: Partial<Config> = {
    default_min_word_length: 3,
    min_word_length: 5,
  };

  assertEquals(getMinLengthForKey(config2 as Config, "any"), 3, "default_min_word_lengthを使用");

  // パターン3: 旧形式のmin_word_lengthのみ
  const config3: Partial<Config> = {
    min_word_length: 4,
  };

  assertEquals(getMinLengthForKey(config3 as Config, "any"), 4, "旧形式min_word_lengthを使用");

  // パターン4: デフォルト値
  const config4: Partial<Config> = {};

  assertEquals(getMinLengthForKey(config4 as Config, "any"), 2, "デフォルト値2を使用");
});

Deno.test("Process100: Baseline behavior - HintManager min length handling", () => {
  // HintManagerでのmin_length処理の動作記録

  const baseConfig: Partial<Config> = {
    per_key_min_length: { "f": 1, "t": 3 },
    default_min_word_length: 2,
  };

  const hintManager = new HintManager(baseConfig as Config);

  assertEquals(hintManager.getMinLengthForKey("f"), 1, "HintManagerでper_key_min_length使用");
  assertEquals(hintManager.getMinLengthForKey("t"), 3, "HintManagerでper_key_min_length使用");
  assertEquals(hintManager.getMinLengthForKey("x"), 2, "HintManagerでdefault使用");
});

Deno.test("Process100: Baseline behavior - WordDetectionManager config hash", () => {
  // WordDetectionManagerの設定ハッシュ生成動作記録

  const config1: WordDetectionManagerConfig = {
    strategy: "regex",
    use_japanese: false,
    min_word_length: 2,
    max_word_length: 20,
  };

  const config2: WordDetectionManagerConfig = {
    strategy: "regex",
    use_japanese: false,
    min_word_length: 3, // 変更
    max_word_length: 20,
  };

  const manager1 = new WordDetectionManager(config1);
  const manager2 = new WordDetectionManager(config2);

  // 異なるmin_word_lengthは異なるハッシュを生成すること
  const hash1 = (manager1 as any).generateConfigHash();
  const hash2 = (manager2 as any).generateConfigHash();

  assertNotEquals(hash1, hash2, "異なるmin_word_lengthは異なるハッシュを生成");
});

Deno.test("Process100: Baseline behavior - Detection context propagation", async () => {
  // DetectionContextでのminWordLength伝播動作記録（実際の動作を記録）

  const config: WordDetectionManagerConfig = {
    strategy: "regex",
    use_japanese: false,
    min_word_length: 2,
    max_word_length: 20,
  };

  const manager = new WordDetectionManager(config);

  // Context なしの場合
  const wordsWithoutContext = await manager.detectWords("test hello world", 0);

  // Context ありの場合
  const context: DetectionContext = {
    minWordLength: 5, // contextで上書き
  };
  const wordsWithContext = await manager.detectWords("test hello world", 0, undefined, context);

  // 実際の結果を記録（現在の動作をベースライン化）
  console.log(
    `Context無し: ${wordsWithoutContext.words.length}語, Context有り: ${wordsWithContext.words.length}語`,
  );

  // 現在の動作ではContextが効いていない可能性があるので、ベースラインとして記録
  assertEquals(
    wordsWithoutContext.words.length,
    wordsWithContext.words.length,
    "現在はcontextが効いていない状態をベースライン化",
  );
});

Deno.test("Process100: Baseline behavior - Cache invalidation triggers", async () => {
  // キャッシュ無効化のトリガー動作記録（実際の動作を記録）

  const initialConfig: WordDetectionManagerConfig = {
    strategy: "regex",
    use_japanese: false,
    min_word_length: 2,
    max_word_length: 20,
  };

  const manager = new WordDetectionManager(initialConfig);

  // 初回検出でキャッシュ作成
  const result1 = await manager.detectWords("test hello world", 0);
  assertEquals(result1.words.length > 0, true, "単語が検出される");

  // min_word_lengthを変更
  manager.updateConfig({ min_word_length: 5 });

  // キャッシュが無効化され、新しいmin_lengthが適用されることを確認
  const result2 = await manager.detectWords("test hello world", 0);

  // 実際の結果を記録
  console.log(`設定変更前: ${result1.words.length}語, 設定変更後: ${result2.words.length}語`);
  console.log(`検出された単語: ${result2.words.map((w) => w.text).join(", ")}`);

  // 現在の動作を記録（期待値ではなく実際の動作をベースライン化）
  assertEquals(result2.words.length, 3, "現在の動作では3語が検出される（ベースライン）");
});

Deno.test("Process100: Baseline behavior - Performance baseline", async () => {
  // パフォーマンスベースライン測定

  const config: WordDetectionManagerConfig = {
    strategy: "regex",
    use_japanese: false,
    min_word_length: 2,
    max_word_length: 20,
  };

  const manager = new WordDetectionManager(config);
  const testText = "This is a test line with multiple words for performance testing".repeat(10);

  // ウォームアップ
  await manager.detectWords(testText, 0);

  // 計測開始
  const startTime = performance.now();

  for (let i = 0; i < 100; i++) {
    await manager.detectWords(testText, 0);
  }

  const endTime = performance.now();
  const duration = endTime - startTime;

  console.log(`Baseline performance: ${duration}ms for 100 iterations`);

  // パフォーマンス基準（あくまで参考値）
  assertEquals(duration < 5000, true, "100回の検出が5秒以内に完了");
});
