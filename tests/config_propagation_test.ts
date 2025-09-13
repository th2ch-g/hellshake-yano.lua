/**
 * use_japanese設定の伝播を検証するテスト
 * 設定がデフォルト値で上書きされないことを確認
 */

import { assertEquals } from "@std/assert";
import {
  extractWordsFromLineWithConfig,
  detectWordsWithConfig,
  detectWordsWithManager,
  type WordConfig,
  type EnhancedWordConfig
} from "../denops/hellshake-yano/word.ts";
import { RegexWordDetector, HybridWordDetector, TinySegmenterWordDetector } from "../denops/hellshake-yano/word/detector.ts";
import { WordDetectionManager, resetWordDetectionManager } from "../denops/hellshake-yano/word/manager.ts";

// モックDenopsオブジェクト
const mockDenops = {
  call: async (fn: string, ...args: any[]) => {
    if (fn === "line") {
      if (args[0] === "w0") return 1;
      if (args[0] === "w$") return 1;
    }
    if (fn === "getline") {
      return "私はプログラマーです";
    }
    if (fn === "getbufline") {
      return ["私はプログラマーです"];
    }
    return null;
  },
} as any;

Deno.test("use_japanese設定の伝播検証", async (t) => {

  await t.step("extractWordsFromLineWithConfig: use_japanese=trueが維持される", () => {
    const config: WordConfig = { use_japanese: true };
    const words = extractWordsFromLineWithConfig("私は本", 1, config);

    // 日本語文字が個別に検出されることを確認
    const wordTexts = words.map(w => w.text);
    assertEquals(wordTexts.includes("私"), true, "「私」が検出されるべき");
    assertEquals(wordTexts.includes("は"), true, "「は」が検出されるべき");
    assertEquals(wordTexts.includes("本"), true, "「本」が検出されるべき");
  });

  await t.step("detectWordsWithConfig: use_japanese=trueが維持される", async () => {
    const config: WordConfig = {
      use_japanese: true,
      use_improved_detection: false  // extractWordsFromLineWithConfigを強制使用
    };
    const words = await detectWordsWithConfig(mockDenops, config);

    // 日本語が検出されることを確認
    const hasJapanese = words.some(w => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(w.text));
    assertEquals(hasJapanese, true, "日本語文字が検出されるべき");

    console.log("detectWordsWithConfig words:", words.map(w => w.text));
  });

  await t.step("RegexWordDetector: 初期化時のuse_japanese設定", () => {
    const config = { use_japanese: true };
    const detector = new RegexWordDetector(config);

    // 内部設定を確認（プライベートプロパティへの直接アクセス）
    const internalConfig = (detector as any).config;
    assertEquals(internalConfig.use_japanese, true, "RegexWordDetectorのuse_japaneseはtrueであるべき");
  });

  await t.step("HybridWordDetector: 初期化時のuse_japanese設定", () => {
    const config = { use_japanese: true };
    const detector = new HybridWordDetector(config);

    // 内部設定を確認
    const internalConfig = (detector as any).config;
    assertEquals(internalConfig.use_japanese, true, "HybridWordDetectorのuse_japaneseはtrueであるべき");
  });

  await t.step("TinySegmenterWordDetector: 初期化時のuse_japanese設定", () => {
    const config = { use_japanese: true, enable_tinysegmenter: true };
    const detector = new TinySegmenterWordDetector(config);

    // 内部設定を確認
    const internalConfig = (detector as any).config;
    assertEquals(internalConfig.use_japanese, true, "TinySegmenterWordDetectorのuse_japaneseはtrueであるべき");
  });

  await t.step("WordDetectionManager: 初期化時のuse_japanese設定", () => {
    resetWordDetectionManager();
    const config = { use_japanese: true };
    const manager = new WordDetectionManager(config);

    // 内部設定を確認
    const internalConfig = (manager as any).config;
    assertEquals(internalConfig.use_japanese, true, "WordDetectionManagerのuse_japaneseはtrueであるべき");
  });

  await t.step("detectWordsWithManager: use_japanese=trueが維持される", async () => {
    resetWordDetectionManager();

    const config: EnhancedWordConfig = {
      use_japanese: true,
      enable_tinysegmenter: true,
      strategy: "hybrid",
    };

    const result = await detectWordsWithManager(mockDenops, config);

    // 日本語が検出されることを確認
    const hasJapanese = result.words.some(w => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(w.text));
    assertEquals(hasJapanese, true, "日本語文字が検出されるべき");
    assertEquals(result.success, true, "検出は成功するべき");

    console.log("detectWordsWithManager detector:", result.detector);
    console.log("detectWordsWithManager sample words:", result.words.slice(0, 5).map(w => w.text));
  });

  await t.step("デフォルト値の上書きチェック", () => {
    // 各クラスのデフォルト値を確認
    const regexDefault = new RegexWordDetector({});
    const regexConfig = (regexDefault as any).config;
    console.log("RegexWordDetector default use_japanese:", regexConfig.use_japanese);

    const hybridDefault = new HybridWordDetector({});
    const hybridConfig = (hybridDefault as any).config;
    console.log("HybridWordDetector default use_japanese:", hybridConfig.use_japanese);

    // デフォルトがfalseまたはundefinedであることを確認
    assertEquals(
      regexConfig.use_japanese === false || regexConfig.use_japanese === undefined,
      true,
      "RegexWordDetectorのデフォルトはfalseまたはundefinedであるべき"
    );
  });

  await t.step("設定の優先順位チェック", () => {
    // 明示的にtrueを設定
    const explicitTrue = { use_japanese: true };
    const detector1 = new RegexWordDetector(explicitTrue);
    assertEquals((detector1 as any).config.use_japanese, true, "明示的なtrueは維持されるべき");

    // 明示的にfalseを設定
    const explicitFalse = { use_japanese: false };
    const detector2 = new RegexWordDetector(explicitFalse);
    assertEquals((detector2 as any).config.use_japanese, false, "明示的なfalseは維持されるべき");

    // 未設定（undefined）
    const noSetting = {};
    const detector3 = new RegexWordDetector(noSetting);
    const defaultValue = (detector3 as any).config.use_japanese;
    console.log("RegexWordDetector with empty config, use_japanese:", defaultValue);
  });
});

Deno.test("設定伝播の統合テスト", async (t) => {
  await t.step("エンドツーエンドの設定伝播", async () => {
    resetWordDetectionManager();

    // Vimから渡される設定をシミュレート
    const vimConfig = {
      use_japanese: true,
      enable_tinysegmenter: true,
      word_detection_strategy: 'hybrid',
      use_improved_detection: true,
    };

    // detectWordsWithManagerを通じて処理
    const result = await detectWordsWithManager(mockDenops, vimConfig);

    console.log("=== End-to-end test results ===");
    console.log("Config passed:", vimConfig);
    console.log("Detector used:", result.detector);
    console.log("Success:", result.success);
    console.log("Word count:", result.words.length);

    if (result.words.length > 0) {
      console.log("First 5 words:", result.words.slice(0, 5).map(w => w.text));

      // 日本語文字が個別に検出されていることを確認
      const japaneseChars = result.words.filter(w =>
        w.text.length === 1 && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(w.text)
      );

      assertEquals(japaneseChars.length > 0, true, "日本語文字が個別に検出されるべき");
      console.log("Japanese single chars detected:", japaneseChars.map(w => w.text));
    }
  });
});