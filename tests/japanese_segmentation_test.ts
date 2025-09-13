import { assertEquals, assertNotEquals } from "https://deno.land/std@0.217.0/assert/mod.ts";
import { TinySegmenter } from "../denops/hellshake-yano/segmenter.ts";
import {
  RegexWordDetector,
  TinySegmenterWordDetector,
  HybridWordDetector,
  type WordDetectionConfig
} from "../denops/hellshake-yano/word/detector.ts";
import { WordDetectionManager } from "../denops/hellshake-yano/word/manager.ts";

Deno.test("TinySegmenter Basic Functionality", async (t) => {
  const segmenter = TinySegmenter.getInstance();

  await t.step("Segment simple Japanese text", async () => {
    const result = await segmenter.segment("これはテストです");

    assertEquals(result.success, true);
    assertEquals(result.source, "tinysegmenter");
    assertEquals(result.segments.length > 0, true);

    console.log("Segmentation result:", result.segments);
  });

  await t.step("Handle empty text", async () => {
    const result = await segmenter.segment("");

    assertEquals(result.success, true);
    assertEquals(result.segments.length, 0);
  });

  await t.step("Handle mixed content", async () => {
    const result = await segmenter.segment("Hello世界123");

    assertEquals(result.success, true);
    assertEquals(result.segments.length > 0, true);

    console.log("Mixed content segments:", result.segments);
  });

  await t.step("Check Japanese detection", () => {
    assertEquals(segmenter.hasJapanese("これは日本語です"), true);
    assertEquals(segmenter.hasJapanese("This is English"), false);
    assertEquals(segmenter.hasJapanese("Englishと日本語"), true);
  });

  await t.step("Test segmentation threshold", () => {
    assertEquals(segmenter.shouldSegment("短い", 4), false);
    assertEquals(segmenter.shouldSegment("これは長い文章です", 4), true);
    assertEquals(segmenter.shouldSegment("English text", 4), false);
  });

  await t.step("Test caching functionality", async () => {
    const text = "キャッシュテスト";

    // Clear cache first
    segmenter.clearCache();

    // First call
    const result1 = await segmenter.segment(text);
    const stats1 = segmenter.getCacheStats();

    // Second call (should use cache)
    const result2 = await segmenter.segment(text);
    const stats2 = segmenter.getCacheStats();

    assertEquals(result1.success, true);
    assertEquals(result2.success, true);
    assertEquals(result1.segments.length, result2.segments.length);
    assertEquals(stats2.size, 1);
  });

  await t.step("Test segmenter enable/disable", async () => {
    segmenter.setEnabled(false);
    assertEquals(segmenter.isEnabled(), false);

    const result = await segmenter.segment("テスト");
    assertEquals(result.success, false);
    assertEquals(result.source, "fallback");

    // Re-enable for other tests
    segmenter.setEnabled(true);
    assertEquals(segmenter.isEnabled(), true);
  });

  await t.step("Run segmenter self-test", async () => {
    const testResult = await segmenter.test();

    console.log("Segmenter test results:");
    for (let i = 0; i < testResult.results.length; i++) {
      const result = testResult.results[i];
      console.log(`  Test ${i + 1}: ${result.success ? 'PASS' : 'FAIL'} - ${result.segments.length} segments`);
    }

    // At least some tests should pass
    const passCount = testResult.results.filter(r => r.success).length;
    assertEquals(passCount > 0, true);
  });
});

Deno.test("Word Detector Integration Tests", async (t) => {
  await t.step("RegexWordDetector with Japanese", async () => {
    const config: WordDetectionConfig = {
      use_japanese: true,
      use_improved_detection: true
    };

    const detector = new RegexWordDetector(config);
    const words = await detector.detectWords("これはテスト用の日本語テキストです", 1);

    assertEquals(words.length > 0, true);
    assertEquals(detector.canHandle("any text"), true);
    assertEquals(await detector.isAvailable(), true);

    console.log("Regex detector words:", words.map(w => w.text));
  });

  await t.step("TinySegmenterWordDetector basic functionality", async () => {
    const config: WordDetectionConfig = {
      enable_tinysegmenter: true,
      segmenter_threshold: 3,
      use_japanese: true
    };

    const detector = new TinySegmenterWordDetector(config);
    const japaneseWords = await detector.detectWords("私の名前は田中です", 1);
    const englishWords = await detector.detectWords("Hello world test", 1);

    assertEquals(japaneseWords.length > 0, true);
    assertEquals(englishWords.length > 0, true);
    assertEquals(detector.canHandle("日本語テキスト"), true);
    assertEquals(detector.canHandle("English text"), false);
    assertEquals(await detector.isAvailable(), true);

    console.log("TinySegmenter Japanese words:", japaneseWords.map(w => w.text));
    console.log("TinySegmenter English fallback:", englishWords.map(w => w.text));
  });

  await t.step("HybridWordDetector auto-detection", async () => {
    const config: WordDetectionConfig = {
      use_japanese: true,
      enable_tinysegmenter: true,
      segmenter_threshold: 3
    };

    const detector = new HybridWordDetector(config);

    // Test Japanese content
    const japaneseWords = await detector.detectWords("今日は良い天気ですね", 1);

    // Test English content
    const englishWords = await detector.detectWords("Today is a beautiful day", 1);

    // Test mixed content
    const mixedWords = await detector.detectWords("Hello 世界 World", 1);

    assertEquals(japaneseWords.length > 0, true);
    assertEquals(englishWords.length > 0, true);
    assertEquals(mixedWords.length > 0, true);
    assertEquals(detector.canHandle("anything"), true);
    assertEquals(await detector.isAvailable(), true);

    console.log("Hybrid Japanese words:", japaneseWords.map(w => w.text));
    console.log("Hybrid English words:", englishWords.map(w => w.text));
    console.log("Hybrid mixed words:", mixedWords.map(w => w.text));
  });

  await t.step("Compare detection strategies", async () => {
    const testText = "プログラミング言語のテストを実行します";

    const regexDetector = new RegexWordDetector({ use_japanese: true });
    const segmenterDetector = new TinySegmenterWordDetector({ enable_tinysegmenter: true });
    const hybridDetector = new HybridWordDetector({ use_japanese: true });

    const regexWords = await regexDetector.detectWords(testText, 1);
    const segmenterWords = await segmenterDetector.detectWords(testText, 1);
    const hybridWords = await hybridDetector.detectWords(testText, 1);

    console.log("Comparison for:", testText);
    console.log("  Regex words:", regexWords.map(w => w.text));
    console.log("  Segmenter words:", segmenterWords.map(w => w.text));
    console.log("  Hybrid words:", hybridWords.map(w => w.text));

    // All should detect some words
    assertEquals(regexWords.length > 0, true);
    assertEquals(segmenterWords.length > 0, true);
    assertEquals(hybridWords.length > 0, true);

    // Segmenter should potentially provide different segmentation
    // (exact results depend on TinySegmenter implementation)
  });
});

Deno.test("WordDetectionManager Integration Tests", async (t) => {
  await t.step("Manager initialization and detector registration", async () => {
    const manager = new WordDetectionManager({
      strategy: "hybrid",
      use_japanese: true,
      enable_tinysegmenter: true,
      cache_enabled: true
    });

    await manager.initialize();

    const detectors = manager.getAvailableDetectors();
    assertEquals(detectors.length >= 3, true); // At least regex, segmenter, hybrid

    const availability = await manager.testDetectors();
    console.log("Detector availability:", availability);

    // At least regex should be available
    assertEquals(Object.values(availability).some(v => v), true);
  });

  await t.step("Strategy-based detection", async () => {
    const testCases = [
      { strategy: "regex" as const, text: "simple english text" },
      { strategy: "tinysegmenter" as const, text: "日本語のテストテキスト" },
      { strategy: "hybrid" as const, text: "Mixed 日本語 and English" }
    ];

    for (const testCase of testCases) {
      const manager = new WordDetectionManager({
        strategy: testCase.strategy,
        use_japanese: true,
        enable_tinysegmenter: true
      });

      await manager.initialize();

      const result = await manager.detectWords(testCase.text, 1);

      assertEquals(result.success, true);
      assertEquals(result.words.length > 0, true);

      console.log(`Strategy ${testCase.strategy}:`, {
        text: testCase.text,
        words: result.words.map(w => w.text),
        detector: result.detector,
        duration: result.performance.duration
      });
    }
  });

  await t.step("Error handling and fallback", async () => {
    // Create a manager with TinySegmenter disabled to test fallback
    const manager = new WordDetectionManager({
      strategy: "tinysegmenter",
      enable_tinysegmenter: false,
      enable_fallback: true,
      fallback_to_regex: true,
      use_japanese: true
    });

    await manager.initialize();

    const result = await manager.detectWords("日本語テキスト", 1);

    // Should succeed (might use fallback or different detector)
    assertEquals(result.success || result.words.length > 0, true);
    console.log("Fallback test result:", {
      success: result.success,
      detector: result.detector,
      wordCount: result.words.length,
      error: result.error
    });

    console.log("Fallback result:", result);
  });

  await t.step("Performance monitoring and caching", async () => {
    const manager = new WordDetectionManager({
      cache_enabled: true,
      cache_max_size: 100,
      performance_monitoring: true
    });

    await manager.initialize();

    const text = "パフォーマンステスト用のテキストです";

    // First call (cache miss)
    const result1 = await manager.detectWords(text, 1);
    const stats1 = manager.getStats();
    const cache1 = manager.getCacheStats();

    // Second call (cache hit)
    const result2 = await manager.detectWords(text, 1);
    const stats2 = manager.getStats();
    const cache2 = manager.getCacheStats();

    assertEquals(result1.success, true);
    assertEquals(result2.success, true);
    assertEquals(result1.words.length, result2.words.length);

    // Statistics should show cache usage
    assertEquals(stats2.total_calls, 2);
    assertEquals(cache2.size >= 1, true);
    assertEquals(cache2.hitRate > 0, true);

    console.log("Performance stats:", stats2);
    console.log("Cache stats:", cache2);
  });

  await t.step("Configuration updates", async () => {
    const manager = new WordDetectionManager({
      strategy: "regex",
      use_japanese: false
    });

    await manager.initialize();

    // Test initial configuration
    const result1 = await manager.detectWords("test 日本語 mixed", 1);

    // Update configuration
    manager.updateConfig({
      strategy: "hybrid",
      use_japanese: true
    });

    // Test with new configuration
    const result2 = await manager.detectWords("test 日本語 mixed", 1);

    assertEquals(result1.success, true);
    assertEquals(result2.success, true);

    // Results might differ due to different strategy and Japanese handling
    console.log("Before config update:", result1.words.map(w => w.text));
    console.log("After config update:", result2.words.map(w => w.text));
  });

  await t.step("Large text performance", async () => {
    const manager = new WordDetectionManager({
      strategy: "hybrid",
      cache_enabled: true,
      timeout_ms: 10000 // 10 second timeout
    });

    await manager.initialize();

    // Generate large text with mixed content
    const largeText = Array(100).fill(0).map((_, i) =>
      i % 2 === 0 ? `英語のテキスト${i}番目` : `Japanese text number ${i}`
    ).join(" ");

    const startTime = Date.now();
    const result = await manager.detectWords(largeText, 1);
    const duration = Date.now() - startTime;

    assertEquals(result.success, true);
    assertEquals(result.words.length > 0, true);

    console.log(`Large text performance: ${result.words.length} words in ${duration}ms`);
    console.log(`Performance: ${(result.words.length / duration * 1000).toFixed(2)} words/second`);

    // Should complete within reasonable time
    assertEquals(duration < 5000, true); // Less than 5 seconds
  });
});

Deno.test("Real-world Usage Scenarios", async (t) => {
  await t.step("Code file with Japanese comments", async () => {
    const codeText = `
function calculateTotal(items) {
  // アイテムの合計を計算する
  let total = 0;
  for (const item of items) {
    total += item.price; // 価格を追加
  }
  return total; // 合計を返す
}`;

    const manager = new WordDetectionManager({
      strategy: "hybrid",
      use_japanese: true,
      use_improved_detection: true
    });

    await manager.initialize();

    const result = await manager.detectWords(codeText, 1);

    assertEquals(result.success, true);
    assertEquals(result.words.length > 0, true);

    const words = result.words.map(w => w.text);
    console.log("Code with Japanese comments words:", words);

    // Should detect both English and Japanese words
    const hasEnglish = words.some(w => /[a-zA-Z]/.test(w));
    const hasJapanese = words.some(w => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(w));

    assertEquals(hasEnglish, true);
    assertEquals(hasJapanese, true);
  });

  await t.step("Documentation with mixed languages", async () => {
    const docText = `
# API Documentation

This API provides access to user データ.

## Methods

- getUserInfo(): ユーザー情報を取得
- updateProfile(): プロフィールを更新
- deleteAccount(): アカウントを削除

For more information, see the 詳細ドキュメント.
`;

    const manager = new WordDetectionManager({
      strategy: "hybrid",
      use_japanese: true,
      min_word_length: 2
    });

    await manager.initialize();

    const result = await manager.detectWords(docText, 1);

    assertEquals(result.success, true);
    assertEquals(result.words.length > 0, true);

    console.log("Documentation words:", result.words.map(w => w.text));
  });

  await t.step("Configuration file with Japanese keys", async () => {
    const configText = `
{
  "アプリ名": "MyApp",
  "バージョン": "1.0.0",
  "設定": {
    "デバッグモード": true,
    "ログレベル": "info",
    "database_url": "localhost:5432"
  }
}`;

    const manager = new WordDetectionManager({
      strategy: "tinysegmenter",
      use_japanese: true,
      enable_tinysegmenter: true
    });

    await manager.initialize();

    const result = await manager.detectWords(configText, 1);

    assertEquals(result.success, true);
    assertEquals(result.words.length > 0, true);

    console.log("Configuration file words:", result.words.map(w => w.text));
  });
});

console.log("✓ Japanese segmentation tests ready to run");