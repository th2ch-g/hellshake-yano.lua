/**
 * 日本語検出のデバッグテスト
 */

import { detectWordsWithManager, detectWordsWithEnhancedConfig, extractWordsFromLineWithEnhancedConfig, type EnhancedWordConfig } from "../denops/hellshake-yano/word.ts";
import { getWordDetectionManager, resetWordDetectionManager } from "../denops/hellshake-yano/word/manager.ts";

// モックDenopsオブジェクト
const mockDenops = {
  call: async (fn: string, ...args: any[]) => {
    if (fn === "line") {
      if (args[0] === "w0") return 1;
      if (args[0] === "w$") return 5;
    }
    if (fn === "getline") {
      const line = args[0] as number;
      const lines = [
        "私は本を読む",
        "今日は良い天気です",
        "プログラミングProgramming",
        "春夏秋冬",
        "test code テスト",
      ];
      return lines[line - 1] || "";
    }
    if (fn === "getbufline") {
      return [
        "私は本を読む",
        "今日は良い天気です",
        "プログラミングProgramming",
        "春夏秋冬",
        "test code テスト",
      ];
    }
    return null;
  },
} as any;

Deno.test("日本語検出デバッグ", async (t) => {
  await t.step("detectWordsWithManager with use_japanese: true", async () => {
    resetWordDetectionManager();

    const config: EnhancedWordConfig = {
      use_japanese: true,
      enable_tinysegmenter: true,
      strategy: "hybrid",
      use_improved_detection: true,
    };


    const result = await detectWordsWithManager(mockDenops, config);

    console.log("Manager Result:", {
      detector: result.detector,
      success: result.success,
      wordCount: result.words.length,
      error: result.error,
    });

    if (result.words.length > 0) {
      console.log("Words detected:", result.words.map(w => w.text));
    } else {
      console.log("No words detected");
    }

    // Manager configuration check
    const manager = getWordDetectionManager();
  });

  await t.step("detectWordsWithEnhancedConfig with use_japanese: true", async () => {
    const config: EnhancedWordConfig = {
      use_japanese: true,
      strategy: "regex", // Use regex strategy for consistent behavior
    };


    const words = await detectWordsWithEnhancedConfig(mockDenops, config);

    console.log("Enhanced Config Result:", { wordCount: words.length });
    if (words.length > 0) {
      console.log("Words detected:", words.map(w => w.text));
    } else {
      console.log("No words detected");
    }
  });

  await t.step("Direct call to extractWordsFromLineWithEnhancedConfig", async () => {
    const config: EnhancedWordConfig = {
      use_japanese: true,
    };

    const words = extractWordsFromLineWithEnhancedConfig("私は本を読む", 1, config);

    console.log("Direct call result:", { wordCount: words.length });
    console.log("Words:", words.map(w => w.text));
  });
});