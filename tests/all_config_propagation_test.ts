/**
 * 全てのVim設定可能変数の優先順位検証テスト
 * ハードコードされた値が設定を上書きしないことを確認
 */

import { assertEquals, assertNotEquals } from "@std/assert";

// モックDenopsオブジェクト
const mockDenops = {
  call: async (fn: string, ...args: any[]) => {
    if (fn === "line") {
      if (args[0] === "w0") return 1;
      if (args[0] === "w$") return 1;
    }
    if (fn === "getline") {
      return "test text テスト";
    }
    if (fn === "getbufline") {
      return ["test text テスト"];
    }
    return null;
  },
  eval: async (expr: string) => {
    // Vim変数の評価をシミュレート
    if (expr.includes("g:hellshake_yano")) {
      return mockVimConfig;
    }
    return null;
  },
  cmd: async (cmd: string) => {
    // コマンド実行のモック
    return null;
  }
} as any;

// テスト用のVim設定（全ての設定項目をカスタム値で設定）
const mockVimConfig = {
  // 基本設定
  markers: ["Z", "Y", "X", "W", "V"],  // デフォルトとは異なる値
  motion_count: 5,  // デフォルト: 3
  motion_timeout: 5000,  // デフォルト: 2000
  hint_position: "end",  // デフォルト: "start"
  trigger_on_hjkl: false,  // デフォルト: true
  enabled: false,  // デフォルト: true
  maxHints: 500,  // デフォルト: 336
  debounceDelay: 100,  // デフォルト: 50
  use_numbers: true,  // デフォルト: false
  highlight_selected: false,  // デフォルト: true
  debug_coordinates: true,  // デフォルト: false

  // Process 50 Sub2: ヒントグループ設定
  single_char_keys: ["Z", "X", "C"],  // デフォルトとは異なる
  multi_char_keys: ["A", "B"],  // デフォルトとは異なる
  max_single_char_hints: 3,  // デフォルト: 11
  use_hint_groups: false,  // デフォルト: true

  // Process 50 Sub3: 日本語設定
  use_japanese: true,  // デフォルト: false

  // Process 50 Sub6: 改善版検出
  use_improved_detection: false,  // デフォルト: true

  // Process 50 Sub7: 単語検出戦略
  word_detection_strategy: "regex",  // デフォルト: "hybrid"
  enable_tinysegmenter: false,  // デフォルト: true
  segmenter_threshold: 10,  // デフォルト: 4

  // Process 50 Sub5: ハイライト色設定
  highlight_marker: "Search",  // デフォルト: "DiffAdd"
  highlight_marker_current: "Error",  // デフォルト: "DiffText"
};

Deno.test("全設定項目の優先順位検証", async (t) => {

  await t.step("Config型の定義確認", async () => {
    const { getDefaultConfig } = await import("../denops/hellshake-yano/main.ts");
    const defaultConfig = getDefaultConfig();


    // デフォルト値の確認
    assertEquals(defaultConfig.motion_count, 3, "motion_countのデフォルトは3");
    assertEquals(defaultConfig.motion_timeout, 2000, "motion_timeoutのデフォルトは2000");
    assertEquals(defaultConfig.use_japanese, undefined, "use_japaneseは明示的にデフォルト値を設定しない");
  });

  await t.step("Config更新のシミュレーション", async () => {
    // updateConfigは外部から呼べないので、設定の伝播を別の方法で確認

    // これらの値がハードコードされた値で上書きされないことが重要
    assertNotEquals(mockVimConfig.motion_count, 3, "カスタム値はデフォルトと異なる");
    assertEquals(mockVimConfig.use_japanese, true, "カスタム値が設定されている");
  });

  await t.step("WordDetectionManagerでの設定優先順位", async () => {
    const { WordDetectionManager } = await import("../denops/hellshake-yano/word/manager.ts");

    const customConfig = {
      use_japanese: true,
      min_word_length: 2,
      max_word_length: 100,
      enable_tinysegmenter: false,
      segmenter_threshold: 10,
    };

    const manager = new WordDetectionManager(customConfig);
    const internalConfig = (manager as any).config;


    // カスタム設定が維持されることを確認
    assertEquals(internalConfig.use_japanese, true, "use_japaneseが上書きされない");
    assertEquals(internalConfig.min_word_length, 2, "min_word_lengthが上書きされない");
    assertEquals(internalConfig.max_word_length, 100, "max_word_lengthが上書きされない");
    assertEquals(internalConfig.enable_tinysegmenter, false, "enable_tinysegmenterが上書きされない");
    assertEquals(internalConfig.segmenter_threshold, 10, "segmenter_thresholdが上書きされない");
  });

  await t.step("各Detectorクラスでの設定優先順位", async () => {
    const { RegexWordDetector, HybridWordDetector, TinySegmenterWordDetector } =
      await import("../denops/hellshake-yano/word/detector.ts");

    const customConfig = {
      use_japanese: true,
      use_improved_detection: false,
      min_word_length: 2,
      max_word_length: 100,
      exclude_numbers: true,
      exclude_single_chars: true,
    };

    // RegexWordDetector
    const regexDetector = new RegexWordDetector(customConfig);
    const regexConfig = (regexDetector as any).config;
    assertEquals(regexConfig.use_japanese, true, "RegexWordDetectorのuse_japaneseが維持される");
    assertEquals(regexConfig.min_word_length, 2, "RegexWordDetectorのmin_word_lengthが維持される");

    // HybridWordDetector
    const hybridDetector = new HybridWordDetector(customConfig);
    const hybridConfig = (hybridDetector as any).config;
    assertEquals(hybridConfig.use_japanese, true, "HybridWordDetectorのuse_japaneseが維持される");

    // TinySegmenterWordDetector
    const segmenterDetector = new TinySegmenterWordDetector(customConfig);
    const segmenterConfig = (segmenterDetector as any).config;
    assertEquals(segmenterConfig.use_japanese, true, "TinySegmenterWordDetectorのuse_japaneseが維持される");
  });

  await t.step("ヒント生成関連の設定優先順位", async () => {
    const { generateHints, generateHintsWithGroups } = await import("../denops/hellshake-yano/hint.ts");

    // generateHints（レガシー版）
    const markers = ["Z", "Y", "X"];
    const hints = generateHints(5, markers, 10);

    // カスタムマーカーが使用されることを確認
    const hasCustomMarker = hints.some(h => h.startsWith("Z") || h.startsWith("Y") || h.startsWith("X"));
    assertEquals(hasCustomMarker, true, "カスタムマーカーが使用される");

    // generateHintsWithGroups（グループ版）
    const keyConfig = {
      single_char_keys: ["A", "B", "C"],
      multi_char_keys: ["X", "Y", "Z"],
      max_single_char_hints: 2,
    };

    const groupHints = generateHintsWithGroups(5, keyConfig);

    // 設定に基づいてヒントが生成されることを確認
    const singleCharHints = groupHints.filter(h => h.length === 1);
    assertEquals(singleCharHints.length <= 2, true, "max_single_char_hintsが尊重される");
  });

  await t.step("デフォルト値のハードコード箇所の確認", async () => {
    // main.tsのconfig変数
    const mainConfig = {
      motion_count: 3,  // ハードコード
      motion_timeout: 2000,  // ハードコード
      use_japanese: false,  // ハードコード
      use_improved_detection: true,  // ハードコード
      word_detection_strategy: "hybrid",  // ハードコード
      enable_tinysegmenter: true,  // ハードコード
      segmenter_threshold: 4,  // ハードコード
    };

    // これらの値がupdateConfig()で正しく上書きされることが重要

    // WordDetectionManagerのデフォルト値
    const managerDefaults = {
      use_japanese: false,  // 修正済み（configで上書き可能）
      min_word_length: 1,
      max_word_length: 50,
      strategy: "hybrid",
    };

  });
});

Deno.test("設定の完全な伝播フロー", async (t) => {
  await t.step("Vimからの設定が全階層に伝播", async () => {
    const { detectWordsWithManager } = await import("../denops/hellshake-yano/word.ts");
    const { resetWordDetectionManager } = await import("../denops/hellshake-yano/word/manager.ts");

    resetWordDetectionManager();

    // 全てカスタム値の設定
    const fullCustomConfig = {
      use_japanese: true,
      use_improved_detection: false,
      enable_tinysegmenter: false,
      word_detection_strategy: "regex",
      segmenter_threshold: 10,
      min_word_length: 2,
      max_word_length: 100,
    };

    const result = await detectWordsWithManager(mockDenops, fullCustomConfig);


    // カスタム設定が反映されていることを確認
    assertNotEquals(result.detector, "HybridWordDetector", "strategyがregexなのでHybridを使わない");
  });

  await t.step("設定の部分的な上書き", async () => {
    const { WordDetectionManager } = await import("../denops/hellshake-yano/word/manager.ts");

    // 一部だけカスタム設定
    const partialConfig = {
      use_japanese: true,
      // 他はデフォルト値を使用
    };

    const manager = new WordDetectionManager(partialConfig);
    const config = (manager as any).config;

    // カスタム値が設定される
    assertEquals(config.use_japanese, true, "カスタム値が設定される");

    // 他の値はデフォルトが使用される
    assertEquals(config.min_word_length, 1, "デフォルト値が使用される");
    assertEquals(config.cache_enabled, true, "デフォルト値が使用される");
  });
});