/**
 * 日本語検出のデバッグテスト
 */

import { detectWordsWithManager, detectWordsWithConfig, type EnhancedWordConfig, type WordConfig } from "../denops/hellshake-yano/word.ts";
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

      detector: result.detector,
      success: result.success,
      wordCount: result.words.length,
      error: result.error,
    });

    if (result.words.length > 0) {
    } else {
    }

    // Manager configuration check
    const manager = getWordDetectionManager();
  });

  await t.step("detectWordsWithConfig with use_japanese: true", async () => {
    const config: WordConfig = {
      use_japanese: true,
      use_improved_detection: false, // Force using extractWordsFromLineWithConfig
    };


    const words = await detectWordsWithConfig(mockDenops, config);

    if (words.length > 0) {
    } else {
    }
  });

  await t.step("Direct call to extractWordsFromLineWithConfig", async () => {
    const { extractWordsFromLineWithConfig } = await import("../denops/hellshake-yano/word.ts");

    const config: WordConfig = {
      use_japanese: true,
    };

    const words = extractWordsFromLineWithConfig("私は本を読む", 1, config);

  });
});