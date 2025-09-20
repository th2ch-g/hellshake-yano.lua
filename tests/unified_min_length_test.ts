/**
 * 統一的なmin_length処理の検証テスト
 * TDD Red-Green-Refactor サイクルによるリファクタリング効果の検証
 */

import { assertEquals } from "@std/assert";
import {
  WordDetectionManager,
  type WordDetectionManagerConfig,
} from "../denops/hellshake-yano/word/manager.ts";
import type { Config } from "../denops/hellshake-yano/main.ts";
import type { DetectionContext } from "../denops/hellshake-yano/word/detector.ts";

Deno.test("Unified min_length: Context overrides GlobalConfig", async () => {
  // グローバル設定でper_key_min_lengthを設定
  const globalConfig: Partial<Config> = {
    per_key_min_length: { "f": 3, "t": 2 },
    default_min_word_length: 4,
  };

  const managerConfig: WordDetectionManagerConfig = {
    strategy: "regex",
    use_japanese: false,
    min_word_length: 1, // ローカル設定
    max_word_length: 20,
  };

  const manager = new WordDetectionManager(managerConfig, globalConfig as Config);

  const testText = "a bb ccc dddd";

  // Contextなし: グローバル設定のper_key_min_lengthが効く
  const contextF: DetectionContext = {
    currentKey: "f", // globalConfig.per_key_min_length["f"] = 3
  };

  const contextT: DetectionContext = {
    currentKey: "t", // globalConfig.per_key_min_length["t"] = 2
  };

  // Context最優先: minWordLength指定で上書き
  const contextOverride: DetectionContext = {
    currentKey: "f",
    minWordLength: 1, // これが最優先
  };

  const resultF = await manager.detectWords(testText, 0, undefined, contextF);
  const resultT = await manager.detectWords(testText, 0, undefined, contextT);
  const resultOverride = await manager.detectWords(testText, 0, undefined, contextOverride);

  console.log(`Key "f" (min=3): ${resultF.words.map((w) => w.text).join(", ")}`);
  console.log(`Key "t" (min=2): ${resultT.words.map((w) => w.text).join(", ")}`);
  console.log(`Override (min=1): ${resultOverride.words.map((w) => w.text).join(", ")}`);

  // 期待値の検証
  assertEquals(resultF.words.length, 2, 'Key "f": 3文字以上の単語のみ（"ccc", "dddd"）');
  assertEquals(resultT.words.length, 3, 'Key "t": 2文字以上の単語のみ（"bb", "ccc", "dddd"）');
  assertEquals(resultOverride.words.length, 4, "Override: 1文字以上の単語すべて");
});

Deno.test("Unified min_length: GlobalConfig fallback hierarchy", async () => {
  // フォールバック階層のテスト
  const globalConfig: Partial<Config> = {
    per_key_min_length: { "f": 3 }, // "t"は未定義
    default_min_word_length: 2,
    min_word_length: 5, // 後方互換性
  };

  const managerConfig: WordDetectionManagerConfig = {
    strategy: "regex",
    use_japanese: false,
    min_word_length: 1, // ローカル設定
  };

  const manager = new WordDetectionManager(managerConfig, globalConfig as Config);

  const testText = "a bb ccc dddd";

  // 定義されているキー: per_key_min_lengthを使用
  const contextF: DetectionContext = { currentKey: "f" };

  // 未定義のキー: default_min_word_lengthを使用
  const contextUnknown: DetectionContext = { currentKey: "x" };

  const resultF = await manager.detectWords(testText, 0, undefined, contextF);
  const resultUnknown = await manager.detectWords(testText, 0, undefined, contextUnknown);

  console.log(`Key "f" (min=3): ${resultF.words.map((w) => w.text).join(", ")}`);
  console.log(`Key "x" (default=2): ${resultUnknown.words.map((w) => w.text).join(", ")}`);

  assertEquals(resultF.words.length, 2, 'Key "f": per_key_min_length[f]=3を使用');
  assertEquals(resultUnknown.words.length, 3, 'Key "x": default_min_word_length=2を使用');
});

Deno.test("Unified min_length: Legacy compatibility", async () => {
  // 旧形式min_word_lengthのみの場合の動作確認
  const globalConfig: Partial<Config> = {
    min_word_length: 3, // 旧形式のみ
  };

  const managerConfig: WordDetectionManagerConfig = {
    strategy: "regex",
    use_japanese: false,
    min_word_length: 1, // ローカル設定（上書きされる）
  };

  const manager = new WordDetectionManager(managerConfig, globalConfig as Config);

  const testText = "a bb ccc dddd";

  const context: DetectionContext = { currentKey: "any" };
  const result = await manager.detectWords(testText, 0, undefined, context);

  console.log(`Legacy min_word_length=3: ${result.words.map((w) => w.text).join(", ")}`);

  assertEquals(result.words.length, 2, "旧形式min_word_length=3が適用される");
});

Deno.test("Unified min_length: No GlobalConfig fallback", async () => {
  // globalConfigなしの場合、ローカル設定を使用
  const managerConfig: WordDetectionManagerConfig = {
    strategy: "regex",
    use_japanese: false,
    min_word_length: 2,
  };

  const manager = new WordDetectionManager(managerConfig); // globalConfig未指定

  const testText = "a bb ccc dddd";

  const context: DetectionContext = { currentKey: "f" };
  const result = await manager.detectWords(testText, 0, undefined, context);

  console.log(`No GlobalConfig (local=2): ${result.words.map((w) => w.text).join(", ")}`);

  assertEquals(result.words.length, 3, "ローカル設定min_word_length=2を使用");
});

Deno.test("Unified min_length: Performance impact verification", async () => {
  // パフォーマンス影響の検証
  const globalConfig: Partial<Config> = {
    per_key_min_length: { "f": 2, "t": 3, "w": 1, "b": 4 },
    default_min_word_length: 2,
  };

  const managerConfig: WordDetectionManagerConfig = {
    strategy: "regex",
    use_japanese: false,
    min_word_length: 1,
  };

  const manager = new WordDetectionManager(managerConfig, globalConfig as Config);
  const testText =
    "This is a comprehensive test line with multiple words for performance evaluation".repeat(5);

  // ウォームアップ
  await manager.detectWords(testText, 0);

  // パフォーマンス測定
  const startTime = performance.now();

  for (let i = 0; i < 50; i++) {
    const key = ["f", "t", "w", "b"][i % 4];
    const context: DetectionContext = { currentKey: key };
    await manager.detectWords(testText, 0, undefined, context);
  }

  const endTime = performance.now();
  const duration = endTime - startTime;

  console.log(`統一処理パフォーマンス: ${duration}ms for 50 iterations`);

  // パフォーマンス基準（統一化によって大幅に遅くならないこと）
  assertEquals(duration < 1000, true, "統一処理でも1秒以内に完了");
});
