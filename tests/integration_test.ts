import { assertEquals, assertNotEquals } from "https://deno.land/std@0.217.0/assert/mod.ts";
import { getWordDetectionManager, resetWordDetectionManager } from "../denops/hellshake-yano/word/manager.ts";
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
  meta: { host: "nvim" }
} as any;

Deno.test("Integration Test: Word Detection Abstraction", async (t) => {
  await t.step("End-to-end detection with manager", async () => {
    const config: EnhancedWordConfig = {
      strategy: "hybrid",
      use_japanese: true,
      enable_tinysegmenter: true,
      cache_enabled: true,
    };

    const result = await detectWordsWithManager(mockDenops, config);

    assertEquals(result.success, true);
    assertEquals(result.words.length > 0, true);
    assertEquals(typeof result.detector, "string");
    assertEquals(typeof result.performance.duration, "number");

    console.log("End-to-end result:", {
      success: result.success,
      wordCount: result.words.length,
      detector: result.detector,
      duration: result.performance.duration
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
      console.log(`Strategy ${strategy}: ${result.words.length} words via ${result.detector}`);
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

    console.log("Fallback test:", {
      success: result.success,
      detector: result.detector,
      wordCount: result.words.length
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

    console.log("Performance stats:", stats);
    console.log("Cache stats:", cacheStats);
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
      console.log(`Config ${JSON.stringify(config)}: OK`);
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
    console.log("Cache stats after overflow test:", cacheStats);
    assertEquals(cacheStats.size <= cacheStats.maxSize, true); // Should not exceed max size

    // Clear cache
    manager.clearCache();
    const clearedStats = manager.getCacheStats();
    assertEquals(clearedStats.size, 0);

    console.log("Cache management test passed");
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
        strategy: "hybrid",
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
        }
      };

      const result = await detectWordsWithManager(scenarioDenops, config);

      assertEquals(result.success, true);
      assertEquals(result.words.length > 0, true);

      console.log(`${scenario.name}: ${result.words.length} words via ${result.detector}`);
      console.log(`  Sample words: ${result.words.slice(0, 5).map(w => `"${w.text}"`).join(", ")}`);
    }
  });
});

console.log("✅ Integration tests loaded successfully");