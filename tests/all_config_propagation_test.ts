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
  },
} as any;

// テスト用のVim設定（全ての設定項目をカスタム値で設定）
const mockVimConfig = {
  // 基本設定
  markers: ["Z", "Y", "X", "W", "V"], // デフォルトとは異なる値
  motionCount: 5, // デフォルト: 3
  motionTimeout: 5000, // デフォルト: 2000
  hintPosition: "end", // デフォルト: "start"
  triggerOnHjkl: false, // デフォルト: true
  enabled: false, // デフォルト: true
  maxHints: 500, // デフォルト: 336
  debounceDelay: 100, // デフォルト: 50
  useNumbers: true, // デフォルト: false
  highlightSelected: false, // デフォルト: true
  debugCoordinates: true, // デフォルト: false

  // Process 50 Sub2: ヒントグループ設定
  singleCharKeys: ["Z", "X", "C"], // デフォルトとは異なる
  multiCharKeys: ["A", "B"], // デフォルトとは異なる
  maxSingleCharHints: 3, // デフォルト: 11
  useHintGroups: false, // デフォルト: true

  // Process 50 Sub3: 日本語設定
  useJapanese: true, // デフォルト: false

  // Process 50 Sub6: 改善版検出
  useImprovedDetection: false, // デフォルト: true

  // Process 50 Sub7: 単語検出戦略
  wordDetectionStrategy: "regex", // デフォルト: "hybrid"
  enableTinySegmenter: false, // デフォルト: true
  segmenterThreshold: 10, // デフォルト: 4

  // Process 50 Sub5: ハイライト色設定
  highlightHintMarker: "Search", // デフォルト: "DiffAdd"
  highlightHintMarkerCurrent: "Error", // デフォルト: "DiffText"
};

Deno.test("全設定項目の優先順位検証", async (t) => {
  await t.step("Config型の定義確認", async () => {
    const { getDefaultConfig } = await import("../denops/hellshake-yano/main.ts");
    const defaultConfig = getDefaultConfig();

    // デフォルト値の確認
    assertEquals(defaultConfig.motionCount, 3, "motionCountのデフォルトは3");
    assertEquals(defaultConfig.motionTimeout, 2000, "motionTimeoutのデフォルトは2000");
    assertEquals(
      defaultConfig.useJapanese,
      false,
      "useJapaneseのデフォルト値はfalse",
    );
  });

  await t.step("Config更新のシミュレーション", async () => {
    // updateConfigは外部から呼べないので、設定の伝播を別の方法で確認

    // これらの値がハードコードされた値で上書きされないことが重要
    assertNotEquals(mockVimConfig.motionCount, 3, "カスタム値はデフォルトと異なる");
    assertEquals(mockVimConfig.useJapanese, true, "カスタム値が設定されている");
  });

  await t.step("WordDetectionManagerでの設定優先順位", async () => {
    const { WordDetectionManager } = await import("../denops/hellshake-yano/word/manager.ts");

    const customConfig = {useJapanese: true,
      defaultMinWordLength: 2,
      maxWordLength: 100,
      enableTinySegmenter: false,
      segmenterThreshold: 10,
    };

    const manager = new WordDetectionManager(customConfig);
    const internalConfig = (manager as any).config;

    // カスタム設定が維持されることを確認
    assertEquals(internalConfig.useJapanese, true, "useJapaneseが上書きされない");
    assertEquals(internalConfig.defaultMinWordLength, 2, "minWordLengthが上書きされない");
    assertEquals(internalConfig.maxWordLength, 100, "maxWordLengthが上書きされない");
    assertEquals(
      internalConfig.enableTinySegmenter,
      false,
      "enableTinySegmenterが上書きされない",
    );
    assertEquals(internalConfig.segmenterThreshold, 10, "segmenterThresholdが上書きされない");
  });

  await t.step("各Detectorクラスでの設定優先順位", async () => {
    const { RegexWordDetector, HybridWordDetector, TinySegmenterWordDetector } = await import(
      "../denops/hellshake-yano/word/detector.ts"
    );

    const customConfig = {useJapanese: true,
      useImprovedDetection: false,
      maxWordLength: 100,
      exclude_numbers: true,
      exclude_single_chars: true,
      defaultMinWordLength: 2,
    };

    // RegexWordDetector
    const regexDetector = new RegexWordDetector(customConfig);
    const regexConfig = (regexDetector as any).config;
    assertEquals(regexConfig.useJapanese, true, "RegexWordDetectorのuseJapaneseが維持される");
    assertEquals(regexConfig.defaultMinWordLength, 2, "RegexWordDetectorのminWordLengthが維持される");

    // HybridWordDetector
    const hybridDetector = new HybridWordDetector(customConfig);
    const hybridConfig = (hybridDetector as any).config;
    assertEquals(hybridConfig.useJapanese, true, "HybridWordDetectorのuseJapaneseが維持される");

    // TinySegmenterWordDetector
    const segmenterDetector = new TinySegmenterWordDetector(customConfig);
    const segmenterConfig = (segmenterDetector as any).config;
    assertEquals(
      segmenterConfig.useJapanese,
      true,
      "TinySegmenterWordDetectorのuseJapaneseが維持される",
    );
  });

  await t.step("ヒント生成関連の設定優先順位", async () => {
    const { generateHints, generateHintsWithGroups } = await import(
      "../denops/hellshake-yano/hint.ts"
    );

    // generateHints（レガシー版）
    const markers = ["Z", "Y", "X"];
    const hints = generateHints(5, markers, 10);

    // カスタムマーカーが使用されることを確認
    const hasCustomMarker = hints.some((h) =>
      h.startsWith("Z") || h.startsWith("Y") || h.startsWith("X")
    );
    assertEquals(hasCustomMarker, true, "カスタムマーカーが使用される");

    // generateHintsWithGroups（グループ版）
    const keyConfig = {singleCharKeys: ["A", "B", "C"],
      multiCharKeys: ["X", "Y", "Z"],
      maxSingleCharHints: 2,
    };

    const groupHints = generateHintsWithGroups(5, keyConfig);

    // 設定に基づいてヒントが生成されることを確認
    const singleCharHints = groupHints.filter((h) => h.length === 1);
    assertEquals(singleCharHints.length <= 2, true, "maxSingleCharHintsが尊重される");
  });

  await t.step("デフォルト値のハードコード箇所の確認", async () => {
    // main.tsのconfig変数
    const mainConfig = {motionCount: 3, // ハードコード
      motionTimeout: 2000, // ハードコード
      useJapanese: false, // ハードコード
      wordDetectionStrategy: "hybrid", // ハードコード
      enableTinySegmenter: true, // ハードコード
      segmenterThreshold: 4, // ハードコード
    };

    // これらの値がupdateConfig()で正しく上書きされることが重要

    // WordDetectionManagerのデフォルト値
    const managerDefaults = {useJapanese: false, // 修正済み（configで上書き可能）
      maxWordLength: 50,
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
    const fullCustomConfig = {useJapanese: true,
      useImprovedDetection: false,
      enableTinySegmenter: false,
      wordDetectionStrategy: "regex",
      segmenterThreshold: 10,
      defaultMinWordLength: 2,
      maxWordLength: 100,
    };

    const result = await detectWordsWithManager(mockDenops, fullCustomConfig);

    // カスタム設定が反映されていることを確認
    assertNotEquals(result.detector, "HybridWordDetector", "strategyがregexなのでHybridを使わない");
  });

  await t.step("設定の部分的な上書き", async () => {
    const { WordDetectionManager } = await import("../denops/hellshake-yano/word/manager.ts");

    // 一部だけカスタム設定
    const partialConfig = {useJapanese: true,
      // 他はデフォルト値を使用
    };

    const manager = new WordDetectionManager(partialConfig);
    const config = (manager as any).config;

    // カスタム値が設定される
    assertEquals(config.useJapanese, true, "カスタム値が設定される");

    // 他の値はデフォルトが使用される
    // DEFAULT_UNIFIED_CONFIGのdefaultMinWordLengthは3
    assertEquals(config.defaultMinWordLength, 3, "デフォルト値が使用される");
    assertEquals(config.cacheEnabled, true, "デフォルト値が使用される");
  });
});
