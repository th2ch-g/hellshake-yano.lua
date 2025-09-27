import { assertEquals, assertExists, assertThrows } from "jsr:@std/assert";
import type { Config } from "../denops/hellshake-yano/types.ts";
import { getMinLengthForKey } from "../denops/hellshake-yano/main.ts";
import { HintManager } from "../denops/hellshake-yano/hint/manager.ts";

Deno.test("Config interface - should have perKeyMinLength property", () => {
  const config: Config = {perKeyMinLength: {
      "v": 1,
      "V": 1,
      "w": 1,
      "b": 1,
      "h": 2,
      "j": 2,
      "k": 2,
      "l": 2,
    },
    defaultMinWordLength: 2,
    enable: true,
    min_word_length: 2, // 後方互換性のため残す
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  assertExists(config.perKeyMinLength);
  assertEquals(config.perKeyMinLength["v"], 1);
  assertEquals(config.perKeyMinLength["h"], 2);
  assertEquals(config.defaultMinWordLength, 2);
});

Deno.test("Config interface - should support optional perKeyMinLength", () => {
  const config: Config = {
    enable: true,
    min_word_length: 2,
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  // perKeyMinLengthは省略可能
  assertEquals(config.perKeyMinLength, undefined);
});

Deno.test("Config interface - should have current_key_context for internal use", () => {
  const config: Config = {
    enable: true,
    min_word_length: 2,
    current_key_context: "v", // 内部使用のためのキーコンテキスト
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  assertEquals(config.currentKeyContext, "v");
});

Deno.test("getMinLengthForKey - should return per-key setting when available", () => {
  const config: Config = {perKeyMinLength: {
      "v": 1,
      "h": 2,
    },
    defaultMinWordLength: 3,
    min_word_length: 4, // 後方互換性
    enable: true,
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  // main.tsからエクスポートされた実際の関数を使用

  assertEquals(getMinLengthForKey(config, "v"), 1);
  assertEquals(getMinLengthForKey(config, "h"), 2);
  assertEquals(getMinLengthForKey(config, "x"), 3); // defaultMinWordLengthを使用
});

Deno.test("Config validation - should handle legacy min_word_length", () => {
  const legacyConfig: Config = {
    enable: true,
    min_word_length: 3, // 旧形式の設定
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  // 後方互換性：min_word_lengthがすべてのキーに適用される
  assertEquals(legacyConfig.min_word_length, 3);
  assertEquals(legacyConfig.perKeyMinLength, undefined);
  assertEquals(legacyConfig.defaultMinWordLength, undefined);
});

// ========================================
// process10: 包括的なキー別設定テスト
// ========================================

Deno.test("Per-key configuration - comprehensive settings", () => {
  const config: Config = {perKeyMinLength: {
      "v": 1, // ビジュアルモード（精密移動）
      "V": 1, // ビジュアルラインモード
      "w": 1, // 単語移動（前方）
      "b": 1, // 単語移動（後方）
      "e": 1, // 単語末尾
      "h": 2, // 文字移動（左）
      "j": 2, // 行移動（下）
      "k": 2, // 行移動（上）
      "l": 2, // 文字移動（右）
      "f": 3, // 文字検索（前方）
      "F": 3, // 文字検索（後方）
      "t": 3, // 文字検索（前方・手前）
      "T": 3, // 文字検索（後方・手前）
      "0": 4, // 行頭
      "$": 4, // 行末
      "G": 5, // ファイル末尾
      "gg": 5, // ファイル先頭（2文字キー）
    },
    defaultMinWordLength: 2,
    min_word_length: 3, // 後方互換性テスト用
    enable: true,
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  // 精密移動キー
  assertEquals(getMinLengthForKey(config, "v"), 1);
  assertEquals(getMinLengthForKey(config, "V"), 1);
  assertEquals(getMinLengthForKey(config, "w"), 1);
  assertEquals(getMinLengthForKey(config, "b"), 1);
  assertEquals(getMinLengthForKey(config, "e"), 1);

  // 基本移動キー
  assertEquals(getMinLengthForKey(config, "h"), 2);
  assertEquals(getMinLengthForKey(config, "j"), 2);
  assertEquals(getMinLengthForKey(config, "k"), 2);
  assertEquals(getMinLengthForKey(config, "l"), 2);

  // 検索系キー
  assertEquals(getMinLengthForKey(config, "f"), 3);
  assertEquals(getMinLengthForKey(config, "F"), 3);
  assertEquals(getMinLengthForKey(config, "t"), 3);
  assertEquals(getMinLengthForKey(config, "T"), 3);

  // 長距離移動キー
  assertEquals(getMinLengthForKey(config, "0"), 4);
  assertEquals(getMinLengthForKey(config, "$"), 4);
  assertEquals(getMinLengthForKey(config, "G"), 5);
  assertEquals(getMinLengthForKey(config, "gg"), 5);

  // 未定義キーはデフォルト値を使用
  assertEquals(getMinLengthForKey(config, "x"), 2); // defaultMinWordLength
  assertEquals(getMinLengthForKey(config, "y"), 2);
  assertEquals(getMinLengthForKey(config, "p"), 2);
});

Deno.test("Per-key configuration - edge cases and validation", () => {
  const config: Config = {perKeyMinLength: {
      "zero": 0, // ゼロ値
      "negative": -1, // 負の値
      "large": 100, // 非常に大きな値
      "empty": 0, // 空文字相当
    },
    defaultMinWordLength: 2,
    enable: true,
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  // エッジケースの動作確認
  assertEquals(getMinLengthForKey(config, "zero"), 0);
  assertEquals(getMinLengthForKey(config, "negative"), -1);
  assertEquals(getMinLengthForKey(config, "large"), 100);
  assertEquals(getMinLengthForKey(config, "empty"), 0);

  // 特殊文字キー
  const specialConfig: Config = {perKeyMinLength: {
      " ": 1, // スペース
      "\t": 2, // タブ
      "\n": 3, // 改行
      "<CR>": 1, // Vim形式のキー
      "<Esc>": 2, // エスケープ
    },
    defaultMinWordLength: 2,
    enable: true,
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  assertEquals(getMinLengthForKey(specialConfig, " "), 1);
  assertEquals(getMinLengthForKey(specialConfig, "\t"), 2);
  assertEquals(getMinLengthForKey(specialConfig, "\n"), 3);
  assertEquals(getMinLengthForKey(specialConfig, "<CR>"), 1);
  assertEquals(getMinLengthForKey(specialConfig, "<Esc>"), 2);
});

// ========================================
// フォールバック動作の包括的テスト
// ========================================

Deno.test("Fallback behavior - complete fallback chain", () => {
  // パターン1: perKeyMinLength → defaultMinWordLength → min_word_length
  const config1: Config = {perKeyMinLength: { "v": 1 },
    defaultMinWordLength: 3,
    min_word_length: 5,
    enable: true,
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  assertEquals(getMinLengthForKey(config1, "v"), 1); // per_key設定を使用
  assertEquals(getMinLengthForKey(config1, "h"), 3); // defaultMinWordLengthを使用

  // パターン2: defaultMinWordLength → min_word_length
  const config2: Config = {defaultMinWordLength: 4,
    min_word_length: 6,
    enable: true,
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  assertEquals(getMinLengthForKey(config2, "any"), 4); // defaultMinWordLengthを使用

  // パターン3: min_word_lengthのみ（レガシー）
  const config3: Config = {
    min_word_length: 7,
    enable: true,
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  assertEquals(getMinLengthForKey(config3, "any"), 7); // min_word_lengthを使用

  // パターン4: 何も設定されていない場合のデフォルト
  const config4: Config = {
    enable: true,
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  assertEquals(getMinLengthForKey(config4, "any"), 3); // デフォルト値（defaultMinWordLength）
});

Deno.test("Fallback behavior - missing configurations", () => {
  // perKeyMinLengthが空のオブジェクト
  const config1: Config = {perKeyMinLength: {},
    defaultMinWordLength: 3,
    enable: true,
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  assertEquals(getMinLengthForKey(config1, "v"), 3); // defaultMinWordLengthを使用

  // 部分的な設定
  const config2: Config = {perKeyMinLength: {
      "v": 1,
      // 'h'は設定されていない
    },
    defaultMinWordLength: 4,
    min_word_length: 5,
    enable: true,
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  assertEquals(getMinLengthForKey(config2, "v"), 1); // per_key設定
  assertEquals(getMinLengthForKey(config2, "h"), 4); // defaultMinWordLengthにフォールバック

  // undefined値の扱い
  const config3: Config = {perKeyMinLength: {
      "v": undefined as any, // 明示的にundefined
    },
    defaultMinWordLength: 6,
    enable: true,
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  assertEquals(getMinLengthForKey(config3, "v"), 6); // undefinedなのでdefaultMinWordLengthを使用
});

// ========================================
// キー切り替え時の再計算テスト
// ========================================

Deno.test("Key switching recalculation - HintManager integration", () => {
  const config: Config = {perKeyMinLength: {
      "v": 1,
      "h": 2,
      "f": 3,
    },
    defaultMinWordLength: 2,
    enable: true,
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  const hintManager = new HintManager(config);

  // 初期状態
  assertEquals(hintManager.getCurrentKeyContext(), undefined);

  // 最初のキー押下
  hintManager.onKeyPress("v");
  assertEquals(hintManager.getCurrentKeyContext(), "v");
  assertEquals(hintManager.getMinLengthForKey("v"), 1);

  // キー切り替え
  hintManager.onKeyPress("h");
  assertEquals(hintManager.getCurrentKeyContext(), "h");
  assertEquals(hintManager.getMinLengthForKey("h"), 2);

  // 別のキー切り替え
  hintManager.onKeyPress("f");
  assertEquals(hintManager.getCurrentKeyContext(), "f");
  assertEquals(hintManager.getMinLengthForKey("f"), 3);

  // 未定義キーへの切り替え
  hintManager.onKeyPress("x");
  assertEquals(hintManager.getCurrentKeyContext(), "x");
  assertEquals(hintManager.getMinLengthForKey("x"), 2); // defaultMinWordLength
});

Deno.test("Key switching recalculation - cache behavior verification", () => {
  const config: Config = {perKeyMinLength: {
      "v": 1,
      "h": 2,
    },
    defaultMinWordLength: 3,
    current_key_context: "initial", // 初期コンテキスト
    enable: true,
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  const hintManager = new HintManager(config);

  // 初期コンテキストの確認
  assertEquals(hintManager.getCurrentKeyContext(), "initial");

  // 同じキーの連続押下（キャッシュ使用想定）
  hintManager.onKeyPress("v");
  const firstCall = performance.now();
  hintManager.getMinLengthForKey("v");
  const firstDuration = performance.now() - firstCall;

  // 同じキーを再度押下
  hintManager.onKeyPress("v");
  const secondCall = performance.now();
  hintManager.getMinLengthForKey("v");
  const secondDuration = performance.now() - secondCall;

  // 両方とも同じ結果を返すことを確認
  assertEquals(hintManager.getMinLengthForKey("v"), 1);
  assertEquals(hintManager.getCurrentKeyContext(), "v");

  // 異なるキーに切り替え（再計算が必要）
  hintManager.onKeyPress("h");
  assertEquals(hintManager.getCurrentKeyContext(), "h");
  assertEquals(hintManager.getMinLengthForKey("h"), 2);
});

Deno.test("Key switching recalculation - rapid switching stress test", () => {
  const config: Config = {perKeyMinLength: {
      "v": 1,
      "h": 2,
      "j": 2,
      "k": 2,
      "l": 2,
      "w": 1,
      "b": 1,
      "f": 3,
      "F": 3,
    },
    defaultMinWordLength: 2,
    enable: true,
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  const hintManager = new HintManager(config);
  const keys = ["v", "h", "j", "k", "l", "w", "b", "f", "F"];
  const expectedValues = [1, 2, 2, 2, 2, 1, 1, 3, 3];

  // 高速切り替えテスト（1000回）
  for (let i = 0; i < 1000; i++) {
    const keyIndex = i % keys.length;
    const key = keys[keyIndex];
    const expectedValue = expectedValues[keyIndex];

    hintManager.onKeyPress(key);
    assertEquals(hintManager.getCurrentKeyContext(), key);
    assertEquals(hintManager.getMinLengthForKey(key), expectedValue);
  }

  // 最終状態の確認
  const finalKey = keys[(1000 - 1) % keys.length];
  const finalExpected = expectedValues[(1000 - 1) % keys.length];
  assertEquals(hintManager.getCurrentKeyContext(), finalKey);
  assertEquals(hintManager.getMinLengthForKey(finalKey), finalExpected);
});

// ========================================
// パフォーマンステスト
// ========================================

Deno.test("Performance test - large configuration handling", () => {
  // 大量のキー設定を作成
  const perKeyMinLength: Record<string, number> = {};
  for (let i = 0; i < 1000; i++) {
    perKeyMinLength[`key${i}`] = i % 10 + 1; // 1-10の範囲
  }

  const config: Config = {
    perKeyMinLength,
    defaultMinWordLength: 2,
    enable: true,
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  const hintManager = new HintManager(config);

  // パフォーマンス測定
  const startTime = performance.now();

  // 1000個のキーに対してテスト
  for (let i = 0; i < 1000; i++) {
    const key = `key${i}`;
    const expectedValue = i % 10 + 1;

    hintManager.onKeyPress(key);
    const actualValue = hintManager.getMinLengthForKey(key);
    assertEquals(actualValue, expectedValue);
  }

  const endTime = performance.now();
  const duration = endTime - startTime;

  // パフォーマンス要件：1000回の操作が1秒以内に完了すること
  console.log(`Large configuration test completed in ${duration}ms`);
  assertEquals(duration < 1000, true, `Performance test failed: ${duration}ms > 1000ms`);
});

Deno.test("Performance test - key switching with large word lists", () => {
  const config: Config = {perKeyMinLength: {
      "v": 1,
      "h": 3,
    },
    defaultMinWordLength: 2,
    enable: true,
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  const hintManager = new HintManager(config);

  // キー切り替えパフォーマンス測定
  const iterations = 10000;
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    const key = i % 2 === 0 ? "v" : "h";
    hintManager.onKeyPress(key);
    hintManager.getMinLengthForKey(key);
  }

  const endTime = performance.now();
  const duration = endTime - startTime;
  const avgDuration = duration / iterations;

  console.log(
    `Key switching test: ${iterations} operations in ${duration}ms (avg: ${avgDuration}ms per operation)`,
  );

  // パフォーマンス要件：平均操作時間が0.1ms以下
  assertEquals(
    avgDuration < 0.1,
    true,
    `Average operation time too slow: ${avgDuration}ms > 0.1ms`,
  );
});

Deno.test("Performance test - memory usage patterns", () => {
  const config: Config = {perKeyMinLength: {
      "v": 1,
      "h": 2,
      "j": 2,
      "k": 2,
      "l": 2,
    },
    defaultMinWordLength: 2,
    enable: true,
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  // 複数のHintManagerインスタンスを作成してメモリリーク確認
  const managers: HintManager[] = [];
  const startTime = performance.now();

  for (let i = 0; i < 1000; i++) {
    const manager = new HintManager({ ...config });
    managers.push(manager);

    // 各マネージャーでキー操作を実行
    manager.onKeyPress("v");
    manager.getMinLengthForKey("v");
    manager.onKeyPress("h");
    manager.getMinLengthForKey("h");
  }

  const endTime = performance.now();
  const duration = endTime - startTime;

  console.log(`Memory usage test: 1000 managers created in ${duration}ms`);

  // メモリ効率性の確認：1000個のマネージャー作成が3秒以内
  assertEquals(duration < 3000, true, `Memory test failed: ${duration}ms > 3000ms`);
  assertEquals(managers.length, 1000);

  // 各マネージャーが正常に動作することを確認
  managers.forEach((manager, index) => {
    assertEquals(manager.getMinLengthForKey("v"), 1);
    assertEquals(manager.getMinLengthForKey("h"), 2);
  });
});

// ========================================
// 後方互換性テスト
// ========================================

Deno.test("Backward compatibility - legacy min_word_length only", () => {
  const legacyConfig: Config = {
    min_word_length: 4, // 旧形式のみ
    enable: true,
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  const hintManager = new HintManager(legacyConfig);

  // すべてのキーで同じ値が返されることを確認
  const testKeys = ["v", "h", "j", "k", "l", "w", "b", "f", "F", "x", "y", "z"];
  testKeys.forEach((key) => {
    hintManager.onKeyPress(key);
    assertEquals(hintManager.getMinLengthForKey(key), 4);
  });
});

Deno.test("Backward compatibility - mixed old and new configurations", () => {
  const mixedConfig: Config = {perKeyMinLength: {
      "v": 1, // 新形式
      "h": 2,
    },
    defaultMinWordLength: 3, // 新形式のデフォルト
    min_word_length: 5, // 旧形式（使用されないはず）
    enable: true,
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  const hintManager = new HintManager(mixedConfig);

  // 新形式の設定が優先されることを確認
  hintManager.onKeyPress("v");
  assertEquals(hintManager.getMinLengthForKey("v"), 1); // perKeyMinLength

  hintManager.onKeyPress("h");
  assertEquals(hintManager.getMinLengthForKey("h"), 2); // perKeyMinLength

  hintManager.onKeyPress("x");
  assertEquals(hintManager.getMinLengthForKey("x"), 3); // defaultMinWordLength（min_word_lengthではない）
});

Deno.test("Backward compatibility - migration scenarios", () => {
  // シナリオ1: 旧設定から新設定への段階的移行
  const migrationStep1: Config = {
    min_word_length: 3, // 既存設定
    defaultMinWordLength: 3, // 新設定を追加（同じ値）
    enable: true,
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  const manager1 = new HintManager(migrationStep1);
  assertEquals(manager1.getMinLengthForKey("any"), 3); // defaultMinWordLengthを使用

  // シナリオ2: 部分的なキー別設定の追加
  const migrationStep2: Config = {perKeyMinLength: {
      "v": 1, // 精密移動のみ新設定
    },
    defaultMinWordLength: 3, // 他はデフォルト
    min_word_length: 3, // 後方互換性のため残す
    enable: true,
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  const manager2 = new HintManager(migrationStep2);
  assertEquals(manager2.getMinLengthForKey("v"), 1); // 新設定
  assertEquals(manager2.getMinLengthForKey("h"), 3); // デフォルト

  // シナリオ3: 完全移行（min_word_length削除）
  const migrationStep3: Config = {perKeyMinLength: {
      "v": 1,
      "h": 2,
      "j": 2,
      "k": 2,
      "l": 2,
    },
    defaultMinWordLength: 2,
    // min_word_lengthは削除済み
    enable: true,
    enabled: true,
    markers: [],
    motionCount: 0,
    motionTimeout: 500,
    hintPosition: "start",
    triggerOnHjkl: false,
    countedMotions: [],
    maxHints: 200,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
  };

  const manager3 = new HintManager(migrationStep3);
  assertEquals(manager3.getMinLengthForKey("v"), 1);
  assertEquals(manager3.getMinLengthForKey("h"), 2);
  assertEquals(manager3.getMinLengthForKey("x"), 2); // defaultMinWordLength
});
