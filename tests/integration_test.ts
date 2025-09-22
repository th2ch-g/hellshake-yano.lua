import { assertEquals, assertNotEquals } from "@std/assert";
import {
  getWordDetectionManager,
  resetWordDetectionManager,
} from "../denops/hellshake-yano/word/manager.ts";
import { detectWordsWithManager, type EnhancedWordConfig } from "../denops/hellshake-yano/word.ts";

// Mock Denops for testing
const mockDenops = {
  call: async (func: string, ...args: any[]) => {
    switch (func) {
      case "line":
        if (args[0] === "w0") return 1;
        if (args[0] === "w$") return 10;
        if (args[0] === "$") return 10;
        return 5;
      case "getbufline":
        return ["これはテスト行です", "Hello world test", "混在したcontent"];
      case "bufnr":
        return 1;
      case "bufexists":
        return 1;
      default:
        return null;
    }
  },
  meta: { host: "nvim" },
} as any;

Deno.test("Integration Test: Word Detection Abstraction", async (t) => {
  await t.step("End-to-end detection with manager", async () => {
    const config: EnhancedWordConfig = {
      strategy: "hybrid" as const,
      use_japanese: true,
      enable_tinysegmenter: true,
      cache_enabled: true,
    };

    const result = await detectWordsWithManager(mockDenops, config);

    assertEquals(result.success, true);
    assertEquals(result.words.length > 0, true);
    assertEquals(typeof result.detector, "string");
    assertEquals(typeof result.performance.duration, "number");

    console.log({
      success: result.success,
      wordCount: result.words.length,
      detector: result.detector,
      duration: result.performance.duration,
    });
  });

  await t.step("Manager singleton behavior", () => {
    const manager1 = getWordDetectionManager();
    const manager2 = getWordDetectionManager();

    // Should return the same instance
    assertEquals(manager1, manager2);

    // Reset and get new instance
    resetWordDetectionManager();
    const manager3 = getWordDetectionManager();

    assertNotEquals(manager1, manager3);
  });

  await t.step("Strategy switching", async () => {
    const strategies = ["regex", "tinysegmenter", "hybrid"] as const;
    const testText = "テストtext混在";

    for (const strategy of strategies) {
      const config: EnhancedWordConfig = {
        strategy,
        use_japanese: true,
        enable_tinysegmenter: true,
      };

      const result = await detectWordsWithManager(mockDenops, config);

      assertEquals(result.success, true);
    }
  });

  await t.step("Error handling with fallback", async () => {
    // Test with segmenter disabled but strategy set to tinysegmenter
    const config: EnhancedWordConfig = {
      strategy: "tinysegmenter",
      enable_tinysegmenter: false,
      enable_fallback: true,
      fallback_to_regex: true,
      use_japanese: true,
    };

    const result = await detectWordsWithManager(mockDenops, config);

    // Should succeed with fallback
    assertEquals(result.success, true);
    assertEquals(result.words.length > 0, true);

    console.log({
      success: result.success,
      detector: result.detector,
      wordCount: result.words.length,
    });
  });

  await t.step("Performance monitoring", async () => {
    const manager = getWordDetectionManager({
      performance_monitoring: true,
      cache_enabled: true,
    });

    await manager.initialize();

    // Make multiple calls to test performance tracking
    for (let i = 0; i < 5; i++) {
      await manager.detectWords("パフォーマンステスト" + i, 1);
    }

    const stats = manager.getStats();
    const cacheStats = manager.getCacheStats();

    assertEquals(stats.total_calls >= 5, true);
    assertEquals(typeof stats.average_duration, "number");
    assertEquals(typeof cacheStats.hitRate, "number");
  });

  await t.step("Configuration validation", async () => {
    const validConfigs: EnhancedWordConfig[] = [
      { strategy: "regex" },
      { strategy: "tinysegmenter", enable_tinysegmenter: true },
      { strategy: "hybrid", use_japanese: true },
      { cache_enabled: false },
      { min_word_length: 2, max_word_length: 20 },
    ];

    for (const config of validConfigs) {
      const result = await detectWordsWithManager(mockDenops, config);
      assertEquals(result.success, true);
    }
  });

  await t.step("Memory and resource management", async () => {
    const manager = getWordDetectionManager({
      cache_enabled: true,
      cache_max_size: 10, // Small cache for testing
    });

    await manager.initialize();

    // Fill cache beyond limit
    for (let i = 0; i < 15; i++) {
      await manager.detectWords(`テスト${i}`, 1);
    }

    const cacheStats = manager.getCacheStats();
    assertEquals(cacheStats.size <= cacheStats.maxSize, true); // Should not exceed max size

    // Clear cache
    manager.clearCache();
    const clearedStats = manager.getCacheStats();
    assertEquals(clearedStats.size, 0);
  });

  await t.step("Real-world text scenarios", async () => {
    const scenarios = [
      {
        name: "Pure Japanese",
        text: "これは純粋な日本語のテキストです。形態素解析が必要です。",
      },
      {
        name: "Pure English",
        text: "This is pure English text that should be handled by regex detection.",
      },
      {
        name: "Mixed Languages",
        text: "This is 混在した content with both English and 日本語 words.",
      },
      {
        name: "Code with Comments",
        text: `function test() {
  // これはコメントです
  const value = "hello";
  return value; // 戻り値
}`,
      },
      {
        name: "Technical Terms",
        text: "API エンドポイント database サーバー configuration ファイル",
      },
    ];

    for (const scenario of scenarios) {
      const config: EnhancedWordConfig = {
        strategy: "hybrid" as const,
        use_japanese: true,
        enable_tinysegmenter: true,
      };

      // Mock denops to return the test text
      const scenarioDenops = {
        ...mockDenops,
        call: async (func: string, ...args: any[]) => {
          if (func === "getbufline") {
            return [scenario.text];
          }
          return mockDenops.call(func, ...args);
        },
      };

      const result = await detectWordsWithManager(scenarioDenops, config);

      assertEquals(result.success, true);
      assertEquals(result.words.length > 0, true);
    }
  });
});

// ========================================
// process20: 実際の編集シナリオテスト
// ========================================

Deno.test("Real editing scenarios - per-key min_length integration", async (t) => {
  // Mock Denopsを拡張してキー別設定をサポート
  const createMockDenopsWithPerKeyConfig = (config: any) => ({
    ...mockDenops,
    call: async (func: string, ...args: any[]) => {
      switch (func) {
        case "getbufline":
          return [
            "function test() { return 'hello world'; }",
            "const value = test();",
            "console.log(value);",
          ];
        case "get_config":
          return config;
        default:
          return mockDenops.call(func, ...args);
      }
    },
  });

  await t.step("User types 'v' and gets hints with min_length=1", async () => {
    const config = {
      per_key_min_length: {
        "v": 1, // 精密移動
        "h": 2, // 通常移動
      },
      default_min_word_length: 2,
      strategy: "hybrid" as const,
      use_japanese: false,
    };

    const testDenops = createMockDenopsWithPerKeyConfig(config);
    const result = await detectWordsWithManager(testDenops, config);

    assertEquals(result.success, true);
    assertEquals(result.words.length > 0, true);

    // 1文字の単語も検出されることを確認（'v'キーでmin_length=1）
    const singleCharWords = result.words.filter((word) => word.text.length === 1);
    assertEquals(
      singleCharWords.length > 0,
      true,
      "Should detect single character words for 'v' key",
    );
  });

  await t.step("User types 'h' and gets hints with min_length=2", async () => {
    const config = {
      per_key_min_length: {
        "v": 1,
        "h": 2, // 通常移動
      },
      default_min_word_length: 2,
      strategy: "hybrid" as const,
      use_japanese: false,
      min_word_length: 2, // 明示的にmin_lengthを設定
    };

    const testDenops = createMockDenopsWithPerKeyConfig(config);
    const result = await detectWordsWithManager(testDenops, config);

    assertEquals(result.success, true);
    assertEquals(result.words.length > 0, true);

    // 2文字以上の単語のみ検出されることを確認（'h'キーでmin_length=2）
    const filteredWords = result.words.filter((word) => word.text.length >= 2);
    assertEquals(
      result.words.length,
      filteredWords.length,
      "Should only detect words with 2+ characters for 'h' key",
    );
  });

  await t.step("Combined motion sequences with different thresholds", async () => {
    const scenarios = [
      { key: "v", expectedMinLength: 1, description: "Visual mode - precision movement" },
      { key: "w", expectedMinLength: 1, description: "Word movement - forward" },
      { key: "b", expectedMinLength: 1, description: "Word movement - backward" },
      { key: "h", expectedMinLength: 2, description: "Character movement - left" },
      { key: "j", expectedMinLength: 2, description: "Line movement - down" },
      { key: "k", expectedMinLength: 2, description: "Line movement - up" },
      { key: "l", expectedMinLength: 2, description: "Character movement - right" },
      { key: "f", expectedMinLength: 3, description: "Character search - forward" },
      { key: "F", expectedMinLength: 3, description: "Character search - backward" },
    ];

    const config = {
      per_key_min_length: {
        "v": 1,
        "w": 1,
        "b": 1,
        "h": 2,
        "j": 2,
        "k": 2,
        "l": 2,
        "f": 3,
        "F": 3,
      },
      default_min_word_length: 2,
      strategy: "hybrid" as const,
      use_japanese: false,
    };

    for (const scenario of scenarios) {
      const testDenops = createMockDenopsWithPerKeyConfig({
        ...config,
        current_key_context: scenario.key,
        min_word_length: scenario.expectedMinLength,
      });

      const result = await detectWordsWithManager(testDenops, config);

      assertEquals(result.success, true, `${scenario.description} should succeed`);

      // 期待される最小長に基づいて単語をフィルタ
      const validWords = result.words.filter((word) =>
        word.text.length >= scenario.expectedMinLength
      );
      assertEquals(
        result.words.length,
        validWords.length,
        `${scenario.description}: All words should meet min_length=${scenario.expectedMinLength}`,
      );
    }
  });
});

// ========================================
// 閾値切り替えストレステスト
// ========================================

Deno.test("Threshold switching stress tests", async (t) => {
  await t.step("Rapidly switching between keys with different thresholds", async () => {
    const config = {
      per_key_min_length: {
        "v": 1, // 最小
        "h": 2, // 中間
        "f": 3, // 最大
        "G": 5, // 極大
      },
      default_min_word_length: 2,
      strategy: "hybrid" as const,
      use_japanese: false,
    };

    const keys = ["v", "h", "f", "G"];
    const expectedMinLengths = [1, 2, 3, 5];

    // 高速切り替えテスト（1000回）
    for (let i = 0; i < 1000; i++) {
      const keyIndex = i % keys.length;
      const key = keys[keyIndex];
      const expectedMinLength = expectedMinLengths[keyIndex];

      const testConfig = {
        ...config,
        current_key_context: key,
        min_word_length: expectedMinLength,
      };

      const testDenops = {
        ...mockDenops,
        call: async (func: string, ...args: any[]) => {
          if (func === "getbufline") {
            return [`iteration${i} test content with various word lengths a ab abc abcd abcde`];
          }
          return mockDenops.call(func, ...args);
        },
      };

      const result = await detectWordsWithManager(testDenops, testConfig);
      assertEquals(result.success, true, `Iteration ${i} with key '${key}' should succeed`);

      // 最小長の検証
      const invalidWords = result.words.filter((word) => word.text.length < expectedMinLength);
      assertEquals(
        invalidWords.length,
        0,
        `Iteration ${i}: Key '${key}' should filter words < ${expectedMinLength} chars`,
      );
    }
  });

  await t.step("Performance under heavy switching", async () => {
    const config = {
      per_key_min_length: {
        "v": 1,
        "h": 2,
        "j": 2,
        "k": 2,
        "l": 2,
        "w": 1,
        "b": 1,
        "e": 1,
        "f": 3,
        "F": 3,
        "t": 3,
        "T": 3,
      },
      default_min_word_length: 2,
      strategy: "hybrid" as const,
      use_japanese: false,
    };

    const keys = Object.keys(config.per_key_min_length);
    const iterations = 500;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const key = keys[i % keys.length];
      const testConfig = {
        ...config,
        current_key_context: key,
        min_word_length: (config.per_key_min_length as Record<string, number>)[key],
      };

      const testDenops = {
        ...mockDenops,
        call: async (func: string, ...args: any[]) => {
          if (func === "getbufline") {
            return ["performance test content with multiple words of different lengths"];
          }
          return mockDenops.call(func, ...args);
        },
      };

      await detectWordsWithManager(testDenops, testConfig);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    const avgDuration = duration / iterations;

    console.log(
      `Threshold switching performance: ${iterations} operations in ${duration}ms (avg: ${avgDuration}ms)`,
    );

    // パフォーマンス要件: 平均1操作あたり50ms以下
    assertEquals(
      avgDuration < 50,
      true,
      `Average operation time too slow: ${avgDuration}ms > 50ms`,
    );
  });

  await t.step("UI responsiveness during rapid switching", async () => {
    const config = {
      per_key_min_length: {
        "v": 1,
        "h": 3,
      },
      default_min_word_length: 2,
      strategy: "hybrid" as const,
      use_japanese: false,
    };

    // UIレスポンシブネステスト：短時間での大量切り替え
    const rapidSwitches = 100;
    const switchInterval = 10; // 10ms間隔
    const results: boolean[] = [];

    for (let i = 0; i < rapidSwitches; i++) {
      const key = i % 2 === 0 ? "v" : "h";
      const expectedMinLength = key === "v" ? 1 : 3;

      const testConfig = {
        ...config,
        current_key_context: key,
        min_word_length: expectedMinLength,
      };

      const testDenops = {
        ...mockDenops,
        call: async (func: string, ...args: any[]) => {
          if (func === "getbufline") {
            return ["ui responsiveness test a ab abc abcd"];
          }
          return mockDenops.call(func, ...args);
        },
      };

      const start = performance.now();
      const result = await detectWordsWithManager(testDenops, testConfig);
      const operationTime = performance.now() - start;

      results.push(result.success && operationTime < switchInterval);

      // 実際のUI切り替え間隔をシミュレート
      if (i < rapidSwitches - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    }

    const successRate = results.filter((r) => r).length / rapidSwitches;
    console.log(
      `UI responsiveness: ${
        (successRate * 100).toFixed(1)
      }% operations completed within ${switchInterval}ms`,
    );

    // 95%以上の操作が時間内に完了すること
    assertEquals(
      successRate >= 0.95,
      true,
      `UI responsiveness too low: ${(successRate * 100).toFixed(1)}% < 95%`,
    );
  });
});

// ========================================
// ビジュアルモード統合テスト
// ========================================

Deno.test("Visual mode integration tests", async (t) => {
  await t.step("Visual mode with per-key settings", async () => {
    const config = {
      per_key_min_length: {
        "v": 1, // ビジュアルモード（文字単位）
        "V": 1, // ビジュアルラインモード
        "h": 2, // 通常の文字移動
        "j": 2, // 通常の行移動
      },
      default_min_word_length: 2,
      strategy: "hybrid" as const,
      use_japanese: false,
    };

    // ビジュアルモードのテスト
    const visualModeTests = [
      {
        mode: "v",
        description: "Character-wise visual mode",
        expectedBehavior: "Should detect single characters for precise selection",
      },
      {
        mode: "V",
        description: "Line-wise visual mode",
        expectedBehavior: "Should detect single characters for line selection",
      },
    ];

    for (const test of visualModeTests) {
      const testConfig = {
        ...config,
        current_key_context: test.mode,
        min_word_length: 1,
      };

      const testDenops = {
        ...mockDenops,
        call: async (func: string, ...args: any[]) => {
          if (func === "getbufline") {
            return ["function test() { return a + b; }", "const x = 1, y = 2;"];
          }
          return mockDenops.call(func, ...args);
        },
      };

      const result = await detectWordsWithManager(testDenops, testConfig);

      assertEquals(result.success, true, `${test.description} should succeed`);

      // 1文字の単語（変数名など）が検出されることを確認
      const singleCharWords = result.words.filter((word) => word.text.length === 1);
      assertEquals(
        singleCharWords.length > 0,
        true,
        `${test.description}: ${test.expectedBehavior}`,
      );
    }
  });

  await t.step("Visual line mode", async () => {
    const config = {
      per_key_min_length: {
        "V": 1, // ビジュアルラインモード
        "j": 2, // 通常の行移動
        "k": 2, // 通常の行移動
      },
      default_min_word_length: 2,
      strategy: "hybrid" as const,
      use_japanese: false,
    };

    const testConfig = {
      ...config,
      current_key_context: "V",
      min_word_length: 1,
    };

    const testDenops = {
      ...mockDenops,
      call: async (func: string, ...args: any[]) => {
        if (func === "getbufline") {
          return [
            "if (condition) {",
            "  doSomething();",
            "  x = y + z;",
            "}",
            "return result;",
          ];
        }
        return mockDenops.call(func, ...args);
      },
    };

    const result = await detectWordsWithManager(testDenops, testConfig);

    assertEquals(result.success, true, "Visual line mode should succeed");

    // 行選択に適した単語検出の確認
    const shortWords = result.words.filter((word) => word.text.length === 1);
    assertEquals(shortWords.length > 0, true, "Should detect short identifiers for line selection");

    // 変数名 'x', 'y', 'z' などが検出されることを確認
    const variableNames = result.words.filter((word) => ["x", "y", "z"].includes(word.text));
    assertEquals(variableNames.length > 0, true, "Should detect single-character variable names");
  });

  await t.step("Visual block mode", async () => {
    // ビジュアルブロックモードは特別な処理が必要
    const config = {
      per_key_min_length: {
        "v": 1, // 通常のビジュアルモード
        "V": 1, // ラインビジュアルモード
        "<C-v>": 1, // ブロックビジュアルモード（Ctrl+V）
      },
      default_min_word_length: 2,
      strategy: "hybrid" as const,
      use_japanese: false,
    };

    const testConfig = {
      ...config,
      current_key_context: "<C-v>",
      min_word_length: 1,
    };

    const testDenops = {
      ...mockDenops,
      call: async (func: string, ...args: any[]) => {
        if (func === "getbufline") {
          return [
            "col1  col2  col3",
            "val1  val2  val3",
            "dat1  dat2  dat3",
            "num1  num2  num3",
          ];
        }
        return mockDenops.call(func, ...args);
      },
    };

    const result = await detectWordsWithManager(testDenops, testConfig);

    assertEquals(result.success, true, "Visual block mode should succeed");

    // ブロック選択に適した短い識別子の検出
    const columnWords = result.words.filter((word) => word.text.match(/^(col|val|dat|num)\d+$/));
    assertEquals(
      columnWords.length > 0,
      true,
      "Should detect column-like identifiers for block selection",
    );
  });

  await t.step("Visual mode performance with different text patterns", async () => {
    const textPatterns = [
      {
        name: "Code with variables",
        content: ["const a = 1, b = 2, c = 3;", "function f(x, y) { return x + y; }"],
      },
      {
        name: "Table-like data",
        content: ["A | B | C", "1 | 2 | 3", "X | Y | Z"],
      },
      {
        name: "Mixed content",
        content: ["# Header", "Some text with a, b, c variables", "* List item 1", "* List item 2"],
      },
    ];

    const config = {
      per_key_min_length: {
        "v": 1,
        "V": 1,
      },
      default_min_word_length: 2,
      strategy: "hybrid" as const,
      use_japanese: false,
    };

    for (const pattern of textPatterns) {
      const testConfig = {
        ...config,
        current_key_context: "v",
        min_word_length: 1,
      };

      const testDenops = {
        ...mockDenops,
        call: async (func: string, ...args: any[]) => {
          if (func === "getbufline") {
            return pattern.content;
          }
          return mockDenops.call(func, ...args);
        },
      };

      const start = performance.now();
      const result = await detectWordsWithManager(testDenops, testConfig);
      const duration = performance.now() - start;

      assertEquals(result.success, true, `${pattern.name} should be processed successfully`);
      assertEquals(
        duration < 100,
        true,
        `${pattern.name} processing should be fast (${duration}ms < 100ms)`,
      );

      console.log(
        `Visual mode ${pattern.name}: ${result.words.length} words in ${duration.toFixed(2)}ms`,
      );
    }
  });
});
