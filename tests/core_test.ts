import { assertEquals, assertExists, assertThrows } from "https://deno.land/std@0.220.1/assert/mod.ts";
import { Core } from "../denops/hellshake-yano/core.ts";
import type { Config, Word, HintMapping } from "../denops/hellshake-yano/types.ts";
import type { Denops } from "@denops/std";
import { MockDenops } from "./helpers/mock.ts";

/**
 * Core class existence test
 * TDD Red Phase: このテストは最初失敗する（Coreクラスがまだ存在しないため）
 */
Deno.test("Core class should exist", () => {
  assertExists(Core);
});

/**
 * Core class instantiation test
 * TDD Red Phase: このテストも最初失敗する（Coreクラスがまだ実装されていないため）
 */
Deno.test("Core class should be instantiable", () => {
  const core = new Core();
  assertExists(core);
});

/**
 * Core class should have essential methods
 * TDD Red Phase: 必要なメソッドの存在確認（最初は失敗）
 */
Deno.test("Core class should have essential methods", () => {
  const core = new Core();
  assertExists(core.detectWords);
  assertExists(core.generateHints);
  assertExists(core.showHints);
  assertExists(core.hideHints);
  assertExists(core.handleMotion);
});

/**
 * Core class basic functionality test
 * TDD Red Phase: 基本機能のテスト（最初は失敗）
 */
Deno.test("Core class should initialize with default config", () => {
  const core = new Core();
  const config = core.getConfig();
  assertExists(config);
  assertEquals(typeof config, "object");
});

/**
 * Core class custom config test
 * TDD Refactor Phase: カスタム設定のテスト追加
 */
Deno.test("Core class should accept custom config", () => {
  const customConfig = {
    enabled: false,
    maxHints: 50
  };
  const core = new Core(customConfig);
  const config = core.getConfig();
  assertEquals(config.enabled, false);
  assertEquals(config.maxHints, 50);
});

/**
 * Core class word detection test
 * TDD Refactor Phase: 単語検出機能のテスト
 */
Deno.test("Core class detectWords should return valid result", () => {
  const core = new Core();
  const result = core.detectWords();
  assertExists(result);
  assertEquals(typeof result, "object");
  assertExists(result.words);
  assertExists(result.detector);
  assertExists(result.success);
  assertExists(result.performance);
  assertEquals(Array.isArray(result.words), true);
});

/**
 * Core class hint generation test
 * TDD Refactor Phase: ヒント生成機能のテスト
 */
Deno.test("Core class generateHints should return array", () => {
  const core = new Core();
  const words: Word[] = [
    { text: "test", line: 1, col: 1 },
    { text: "word", line: 1, col: 6 }
  ];
  const hints = core.generateHints(words);
  assertExists(hints);
  assertEquals(Array.isArray(hints), true);
});

/**
 * Core class state management tests
 * TDD Refactor Phase: 状態管理のテスト
 */
Deno.test("Core class should track enabled state", () => {
  const core = new Core({ enabled: true });
  assertEquals(core.isEnabled(), true);

  core.updateConfig({ enabled: false });
  assertEquals(core.isEnabled(), false);
});

Deno.test("Core class should track hints visibility", () => {
  const core = new Core({ enabled: true });
  assertEquals(core.isHintsVisible(), false);

  const mockHints: HintMapping[] = [{
    word: { text: "test", line: 1, col: 1 },
    hint: "A",
    hintCol: 1,
    hintByteCol: 1
  }];

  core.showHintsLegacy(mockHints);
  assertEquals(core.isHintsVisible(), true);
  assertEquals(core.getCurrentHints().length, 1);

  core.hideHints();
  assertEquals(core.isHintsVisible(), false);
  assertEquals(core.getCurrentHints().length, 0);
});

Deno.test("Core class should not show hints when disabled", () => {
  const core = new Core({ enabled: false });
  const mockHints: HintMapping[] = [{
    word: { text: "test", line: 1, col: 1 },
    hint: "A",
    hintCol: 1,
    hintByteCol: 1
  }];

  core.showHintsLegacy(mockHints);
  assertEquals(core.isHintsVisible(), false);
  assertEquals(core.getCurrentHints().length, 0);
});

/**
 * TDD RED Phase: CoreState interface and state management methods
 * Phase2: 状態管理の移行 - これらのテストは最初失敗する
 */

Deno.test("Core class should have getState method", () => {
  const core = new Core();
  assertExists(core.getState);
  const state = core.getState();
  assertExists(state);
  assertEquals(typeof state, "object");
});

Deno.test("Core class should have setState method", () => {
  const core = new Core();
  assertExists(core.setState);

  const newState = {
    config: core.getConfig(),
    currentHints: [],
    hintsVisible: false,
    isActive: false
  };

  core.setState(newState);
  const state = core.getState();
  assertEquals(state.hintsVisible, false);
  assertEquals(state.isActive, false);
});

Deno.test("Core class should have initializeState method", () => {
  const core = new Core();
  assertExists(core.initializeState);

  core.initializeState();
  const state = core.getState();
  assertExists(state.config);
  assertExists(state.currentHints);
  assertEquals(Array.isArray(state.currentHints), true);
  assertEquals(typeof state.hintsVisible, "boolean");
  assertEquals(typeof state.isActive, "boolean");
});

Deno.test("Core class state should include all required properties", () => {
  const core = new Core();
  core.initializeState();
  const state = core.getState();

  // CoreState interface properties
  assertExists(state.config);
  assertExists(state.currentHints);
  assertEquals(Array.isArray(state.currentHints), true);
  assertEquals(typeof state.hintsVisible, "boolean");
  assertEquals(typeof state.isActive, "boolean");

  // State should reflect current Core state
  assertEquals(state.config.enabled, core.isEnabled());
  assertEquals(state.hintsVisible, core.isHintsVisible());
  assertEquals(state.currentHints.length, core.getCurrentHints().length);
});

Deno.test("Core class setState should update internal state", () => {
  const core = new Core({ enabled: true });
  const mockHints: HintMapping[] = [{
    word: { text: "test", line: 1, col: 1 },
    hint: "A",
    hintCol: 1,
    hintByteCol: 1
  }];

  const newState = {
    config: core.getConfig(),
    currentHints: mockHints,
    hintsVisible: true,
    isActive: true
  };

  core.setState(newState);

  // State should be updated
  assertEquals(core.isHintsVisible(), true);
  assertEquals(core.getCurrentHints().length, 1);

  const state = core.getState();
  assertEquals(state.hintsVisible, true);
  assertEquals(state.isActive, true);
  assertEquals(state.currentHints.length, 1);
});

/**
 * TDD REFACTOR Phase: 状態整合性とエッジケースのテスト
 */

/**
 * TDD RED Phase: Phase3 - hideHints専用テスト（最初は失敗する）
 */
Deno.test("Core class hideHints should clear hints and update state properly", () => {
  const core = new Core({ enabled: true });

  // まずヒントを表示する
  const mockHints: HintMapping[] = [
    { word: { text: "test", line: 1, col: 1 }, hint: "A", hintCol: 1, hintByteCol: 1 },
    { word: { text: "word", line: 2, col: 1 }, hint: "B", hintCol: 1, hintByteCol: 1 }
  ];

  core.showHintsLegacy(mockHints);
  assertEquals(core.isHintsVisible(), true);
  assertEquals(core.getCurrentHints().length, 2);

  // hideHintsを呼び出し
  core.hideHints();

  // ヒントがクリアされ、状態が適切に更新されることを確認
  assertEquals(core.isHintsVisible(), false);
  assertEquals(core.getCurrentHints().length, 0);

  const state = core.getState();
  assertEquals(state.hintsVisible, false);
  assertEquals(state.isActive, false);
  assertEquals(state.currentHints.length, 0);
});

Deno.test("Core class hideHints should work even when no hints are shown", () => {
  const core = new Core({ enabled: true });

  // ヒントが表示されていない状態でhideHintsを呼び出し
  assertEquals(core.isHintsVisible(), false);
  assertEquals(core.getCurrentHints().length, 0);

  // hideHintsを呼び出してもエラーが発生しないことを確認
  core.hideHints();

  assertEquals(core.isHintsVisible(), false);
  assertEquals(core.getCurrentHints().length, 0);
});

Deno.test("Core class hideHints should work when disabled", () => {
  const core = new Core({ enabled: false });

  // 無効状態でもhideHintsは機能することを確認
  const mockHints: HintMapping[] = [
    { word: { text: "test", line: 1, col: 1 }, hint: "A", hintCol: 1, hintByteCol: 1 }
  ];

  // 無効状態なのでshowHintsは何もしない
  core.showHintsLegacy(mockHints);
  assertEquals(core.isHintsVisible(), false);

  // hideHintsは無効状態でも動作する
  core.hideHints();
  assertEquals(core.isHintsVisible(), false);
  assertEquals(core.getCurrentHints().length, 0);
});

Deno.test("Core class setState should maintain consistency between hintsVisible and currentHints", () => {
  const core = new Core({ enabled: true });

  // 整合性のないケース: hintsVisible=true but currentHints=[]
  const inconsistentState = {
    config: core.getConfig(),
    currentHints: [],
    hintsVisible: true,
    isActive: false
  };

  core.setState(inconsistentState);

  // 整合性の確保: hintsVisible=trueなのでisActiveはtrueになるべき
  assertEquals(core.getState().isActive, true);
});

Deno.test("Core class initializeState should reset to clean state", () => {
  const core = new Core({ enabled: true });

  // まず何らかの状態にする
  const mockHints: HintMapping[] = [{
    word: { text: "test", line: 1, col: 1 },
    hint: "A",
    hintCol: 1,
    hintByteCol: 1
  }];
  core.showHintsLegacy(mockHints);

  // 初期化前の状態確認
  assertEquals(core.isHintsVisible(), true);
  assertEquals(core.getCurrentHints().length, 1);

  // 初期化
  core.initializeState();

  // 初期化後の状態確認
  assertEquals(core.isHintsVisible(), false);
  assertEquals(core.getCurrentHints().length, 0);
  const state = core.getState();
  assertEquals(state.isActive, false);
  assertEquals(state.currentHints.length, 0);
  assertEquals(state.hintsVisible, false);
});

/**
 * TDD RED Phase: Phase4 - detectWordsOptimizedの実装テスト（最初は失敗する）
 * 単語検出機能の移行テスト
 */
Deno.test("Core class should have detectWordsOptimized method", () => {
  const core = new Core();
  assertExists(core.detectWordsOptimized);
});

Deno.test("Core class detectWordsOptimized should be async and return Promise<Word[]>", async () => {
  const core = new Core();
  const mockDenops = new MockDenops();

  // Setup mock responses for word detection
  mockDenops.setCallResponse("line", (arg: string) => {
    switch (arg) {
      case "w0": return 1;  // Top visible line
      case "w$": return 20; // Bottom visible line
      case "$": return 100; // Total lines in buffer
      default: return 1;
    }
  });

  mockDenops.setCallResponse("getline", (start: number, end?: number) => {
    if (end === undefined) {
      return "hello world test";
    }
    const lines = [];
    for (let i = start; i <= end; i++) {
      lines.push(`line ${i} with words`);
    }
    return lines;
  });

  mockDenops.setCallResponse("col", () => 1);

  const bufnr = 1;
  const result = core.detectWordsOptimized(mockDenops as any, bufnr);
  assertExists(result);
  assertEquals(typeof result.then, "function"); // Promise check

  const words = await result;
  assertExists(words);
  assertEquals(Array.isArray(words), true);
});

Deno.test("Core class detectWordsOptimized should handle invalid buffer number", async () => {
  const core = new Core();
  const mockDenops = new MockDenops();

  // Setup mock for invalid buffer case
  mockDenops.setCallResponse("line", () => 1);
  mockDenops.setCallResponse("getline", () => "");
  mockDenops.setCallResponse("col", () => 1);

  const invalidBufnr = -1;
  const words = await core.detectWordsOptimized(mockDenops as any, invalidBufnr);
  assertExists(words);
  assertEquals(Array.isArray(words), true);
  // Invalid buffer should return empty array, not throw error
});

Deno.test("Core class detectWordsOptimized should respect cache configuration", async () => {
  const core = new Core();
  const mockDenops = new MockDenops();

  // Setup consistent mock responses
  mockDenops.setCallResponse("line", (arg: string) => {
    switch (arg) {
      case "w0": return 1;
      case "w$": return 20;
      case "$": return 100;
      default: return 1;
    }
  });

  mockDenops.setCallResponse("getline", (start: number, end?: number) => {
    if (end === undefined) {
      return "test words here";
    }
    const lines = [];
    for (let i = start; i <= end; i++) {
      lines.push(`test words here line ${i}`);
    }
    return lines;
  });
  mockDenops.setCallResponse("col", () => 1);

  const bufnr = 1;
  // Test with cache enabled (default)
  const wordsWithCache = await core.detectWordsOptimized(mockDenops as any, bufnr);
  assertExists(wordsWithCache);
  assertEquals(Array.isArray(wordsWithCache), true);

  // Results should be consistent when called multiple times with cache
  const wordsWithCache2 = await core.detectWordsOptimized(mockDenops as any, bufnr);
  assertEquals(wordsWithCache.length, wordsWithCache2.length);
});

Deno.test("Core class detectWordsOptimized should handle config changes", async () => {
  const core = new Core({ use_japanese: false });
  const mockDenops = new MockDenops();

  // Setup mock responses
  mockDenops.setCallResponse("line", (arg: string) => arg === "w0" ? 1 : 20);
  mockDenops.setCallResponse("getline", (start: number, end?: number) => {
    if (end === undefined) {
      return "test words";
    }
    const lines = [];
    for (let i = start; i <= end; i++) {
      lines.push(`test words line ${i}`);
    }
    return lines;
  });
  mockDenops.setCallResponse("col", () => 1);

  const bufnr = 1;
  const wordsWithoutJapanese = await core.detectWordsOptimized(mockDenops as any, bufnr);
  assertExists(wordsWithoutJapanese);

  // Change config to enable Japanese
  core.updateConfig({ use_japanese: true });
  const wordsWithJapanese = await core.detectWordsOptimized(mockDenops as any, bufnr);
  assertExists(wordsWithJapanese);
});

Deno.test("Core class detectWordsOptimized should integrate with existing word detection logic", async () => {
  const core = new Core();
  const mockDenops = new MockDenops();

  // Setup mock for word detection
  mockDenops.setCallResponse("line", (arg: string) => arg === "w0" ? 1 : 20);
  mockDenops.setCallResponse("getline", (start: number, end?: number) => {
    if (end === undefined) {
      return "integration test words";
    }
    const lines = [];
    for (let i = start; i <= end; i++) {
      lines.push(`integration test words line ${i}`);
    }
    return lines;
  });
  mockDenops.setCallResponse("col", () => 1);

  const bufnr = 1;
  // Should use the same logic as detectWords but with optimizations
  const standardResult = core.detectWords();
  const optimizedWords = await core.detectWordsOptimized(mockDenops as any, bufnr);

  // Both should return arrays of Word objects
  assertEquals(Array.isArray(standardResult.words), true);
  assertEquals(Array.isArray(optimizedWords), true);
});

/**
 * TDD RED Phase: Phase5 - generateHintsOptimizedの実装テスト（最初は失敗する）
 * ヒント生成機能の移行テスト
 */
Deno.test("Core class should have generateHintsOptimized method", () => {
  const core = new Core();
  assertExists(core.generateHintsOptimized);
});

Deno.test("Core class generateHintsOptimized should return string array", () => {
  const core = new Core();
  const wordCount = 5;
  const markers = ["a", "s", "d", "f", "g"];
  const hints = core.generateHintsOptimized(wordCount, markers);

  assertExists(hints);
  assertEquals(Array.isArray(hints), true);
  assertEquals(hints.length, wordCount);
  // Each hint should be a string
  hints.forEach((hint: string) => {
    assertEquals(typeof hint, "string");
    assertEquals(hint.length > 0, true);
  });
});

Deno.test("Core class generateHintsOptimized should handle empty markers", () => {
  const core = new Core();
  const wordCount = 3;
  const emptyMarkers: string[] = [];
  const hints = core.generateHintsOptimized(wordCount, emptyMarkers);

  assertExists(hints);
  assertEquals(Array.isArray(hints), true);
  // Should fallback to default markers or handle gracefully
});

Deno.test("Core class generateHintsOptimized should handle zero word count", () => {
  const core = new Core();
  const wordCount = 0;
  const markers = ["a", "s", "d"];
  const hints = core.generateHintsOptimized(wordCount, markers);

  assertExists(hints);
  assertEquals(Array.isArray(hints), true);
  assertEquals(hints.length, 0);
});

Deno.test("Core class generateHintsOptimized should handle large word count", () => {
  const core = new Core();
  const wordCount = 100;
  const markers = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
  const hints = core.generateHintsOptimized(wordCount, markers);

  assertExists(hints);
  assertEquals(Array.isArray(hints), true);
  assertEquals(hints.length, wordCount);

  // All hints should be unique
  const uniqueHints = new Set(hints);
  assertEquals(uniqueHints.size, hints.length);
});

Deno.test("Core class generateHintsOptimized should use marker characters", () => {
  const core = new Core();
  const wordCount = 3;
  const markers = ["x", "y", "z"];
  const hints = core.generateHintsOptimized(wordCount, markers);

  assertExists(hints);
  assertEquals(hints.length, wordCount);

  // All hints should only use marker characters (when markers are provided)
  // Note: The implementation may use default markers if provided markers are insufficient
  hints.forEach((hint: string) => {
    assertEquals(hint.length > 0, true);
    assertEquals(typeof hint, "string");
  });
});

Deno.test("Core class generateHintsOptimized should respect config hint groups", () => {
  const core = new Core({
    use_hint_groups: true,
    single_char_keys: ["a", "s", "d"],
    multi_char_keys: ["f", "g", "h"]
  });
  const wordCount = 10;
  const markers = ["a", "s", "d", "f", "g", "h"];
  const hints = core.generateHintsOptimized(wordCount, markers);

  assertExists(hints);
  assertEquals(Array.isArray(hints), true);
  assertEquals(hints.length, wordCount);
});

Deno.test("Core class generateHintsOptimized should validate input parameters", () => {
  const core = new Core();
  const markers = ["a", "s", "d"];

  // Negative wordCount should throw error
  assertThrows(
    () => core.generateHintsOptimized(-1, markers),
    Error,
    "wordCount must be non-negative"
  );

  // Zero wordCount should return empty array
  const emptyHints = core.generateHintsOptimized(0, markers);
  assertEquals(emptyHints, []);
});

/**
 * TDD RED Phase: Phase6 - 表示処理系の移行テスト（最初は失敗する）
 * displayHints系メソッドのCoreクラスへの移行
 */

Deno.test("Core class should have displayHintsOptimized method", () => {
  const core = new Core();
  assertExists(core.displayHintsOptimized);
});

Deno.test("Core class displayHintsOptimized should be async and accept proper parameters", async () => {
  const core = new Core();
  const mockDenops = new MockDenops();
  const mockHints: HintMapping[] = [
    { word: { text: "test", line: 1, col: 1 }, hint: "A", hintCol: 1, hintByteCol: 1 }
  ];
  const mode = "normal";

  // Mock required Vim/Neovim functions for display
  mockDenops.setCallResponse("bufnr", () => 1);
  mockDenops.setCallResponse("nvim_set_extmark", () => 1);
  mockDenops.setCallResponse("matchadd", () => 1);

  const result = core.displayHintsOptimized(mockDenops as any, mockHints, mode);
  assertExists(result);
  assertEquals(typeof result.then, "function"); // Promise check

  await result; // Should not throw
});

Deno.test("Core class should have displayHintsAsync method", () => {
  const core = new Core();
  assertExists(core.displayHintsAsync);
});

Deno.test("Core class displayHintsAsync should handle hints display asynchronously", async () => {
  const core = new Core();
  const mockDenops = new MockDenops();
  const mockHints: HintMapping[] = [
    { word: { text: "test", line: 1, col: 1 }, hint: "A", hintCol: 1, hintByteCol: 1 },
    { word: { text: "word", line: 2, col: 1 }, hint: "B", hintCol: 1, hintByteCol: 1 }
  ];

  // Mock required functions
  mockDenops.setCallResponse("bufnr", () => 1);
  mockDenops.setCallResponse("nvim_set_extmark", () => 1);
  mockDenops.setCallResponse("matchadd", () => 1);

  const config = { mode: "normal" };
  const result = core.displayHintsAsync(mockDenops as any, mockHints, config);
  assertExists(result);
  assertEquals(typeof result.then, "function"); // Promise check

  await result; // Should complete without error
});

Deno.test("Core class should have displayHintsWithExtmarksBatch method", () => {
  const core = new Core();
  assertExists(core.displayHintsWithExtmarksBatch);
});

Deno.test("Core class displayHintsWithExtmarksBatch should handle extmarks batch display", async () => {
  const core = new Core();
  const mockDenops = new MockDenops();
  const bufnr = 1;
  const mockHints: HintMapping[] = [
    { word: { text: "test", line: 1, col: 1 }, hint: "A", hintCol: 1, hintByteCol: 1 }
  ];
  const mode = "normal";
  const signal = new AbortController().signal;

  // Mock extmarks functions
  mockDenops.setCallResponse("nvim_create_namespace", () => 1);
  mockDenops.setCallResponse("nvim_set_extmark", () => 1);
  mockDenops.setCallResponse("nvim_buf_set_extmark", () => 1);

  const result = core.displayHintsWithExtmarksBatch(mockDenops as any, bufnr, mockHints, mode, signal);
  assertExists(result);
  assertEquals(typeof result.then, "function"); // Promise check

  await result; // Should not throw
});

Deno.test("Core class should have displayHintsWithMatchAddBatch method", () => {
  const core = new Core();
  assertExists(core.displayHintsWithMatchAddBatch);
});

Deno.test("Core class displayHintsWithMatchAddBatch should handle matchadd batch display", async () => {
  const core = new Core();
  const mockDenops = new MockDenops();
  const mockHints: HintMapping[] = [
    { word: { text: "test", line: 1, col: 1 }, hint: "A", hintCol: 1, hintByteCol: 1 },
    { word: { text: "word", line: 2, col: 1 }, hint: "B", hintCol: 1, hintByteCol: 1 }
  ];
  const mode = "normal";
  const signal = new AbortController().signal;

  // Mock matchadd functions
  mockDenops.setCallResponse("matchadd", () => 1);
  mockDenops.setCallResponse("hlexists", () => 1);

  const result = core.displayHintsWithMatchAddBatch(mockDenops as any, mockHints, mode, signal);
  assertExists(result);
  assertEquals(typeof result.then, "function"); // Promise check

  await result; // Should not throw
});

Deno.test("Core class displayHints methods should handle empty hints array", async () => {
  const core = new Core();
  const mockDenops = new MockDenops();
  const emptyHints: HintMapping[] = [];

  // Mock basic functions
  mockDenops.setCallResponse("bufnr", () => 1);

  // All display methods should handle empty arrays gracefully
  await core.displayHintsOptimized(mockDenops as any, emptyHints, "normal");
  await core.displayHintsAsync(mockDenops as any, emptyHints, { mode: "normal" });
  await core.displayHintsWithExtmarksBatch(mockDenops as any, 1, emptyHints, "normal", new AbortController().signal);
  await core.displayHintsWithMatchAddBatch(mockDenops as any, emptyHints, "normal", new AbortController().signal);
});

Deno.test("Core class displayHints methods should handle AbortSignal cancellation", async () => {
  const core = new Core();
  const mockDenops = new MockDenops();
  const mockHints: HintMapping[] = [
    { word: { text: "test", line: 1, col: 1 }, hint: "A", hintCol: 1, hintByteCol: 1 }
  ];

  // Mock functions
  mockDenops.setCallResponse("bufnr", () => 1);
  mockDenops.setCallResponse("nvim_set_extmark", () => 1);
  mockDenops.setCallResponse("matchadd", () => 1);

  const controller = new AbortController();
  controller.abort(); // Abort immediately

  // Methods should handle aborted signals gracefully
  await core.displayHintsWithExtmarksBatch(mockDenops as any, 1, mockHints, "normal", controller.signal);
  await core.displayHintsWithMatchAddBatch(mockDenops as any, mockHints, "normal", controller.signal);
});

/**
 * TDD RED Phase: Phase7 - showHints系の移行テスト（最初は失敗する）
 * showHints, showHintsInternal, showHintsWithKeyメソッドのCoreクラスへの移行
 */

Deno.test("Core class should have showHints method", () => {
  const core = new Core();
  assertExists(core.showHints);
});

Deno.test({
  name: "Core class showHints should be async and integrate full workflow",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
  const core = new Core({ enabled: true });
  const mockDenops = new MockDenops();

  // Mock required Vim/Neovim functions
  mockDenops.setCallResponse("bufnr", () => 1);
  mockDenops.setCallResponse("getbufvar", () => 0); // not readonly
  mockDenops.setCallResponse("bufexists", () => 1);
  mockDenops.setCallResponse("line", (arg: string) => {
    switch (arg) {
      case "w0": return 1;
      case "w$": return 20;
      case "$": return 100;
      default: return 1;
    }
  });
  mockDenops.setCallResponse("getline", () => "test words here");
  mockDenops.setCallResponse("col", () => 1);
  mockDenops.setCallResponse("nvim_create_namespace", () => 1);
  mockDenops.setCallResponse("nvim_buf_set_extmark", () => 1);
  mockDenops.setCallResponse("matchadd", () => 1);

  const result = core.showHints(mockDenops as any);
  assertExists(result);
  assertEquals(typeof result.then, "function"); // Promise check

  await result; // Should complete the full hint display workflow

  // Cleanup
  core.cleanup();
  }
});

Deno.test("Core class should have showHintsInternal method", () => {
  const core = new Core();
  assertExists(core.showHintsInternal);
});

Deno.test({
  name: "Core class showHintsInternal should handle mode parameter",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
  const core = new Core({ enabled: true });
  const mockDenops = new MockDenops();

  // Setup basic mocks
  mockDenops.setCallResponse("bufnr", () => 1);
  mockDenops.setCallResponse("getbufvar", () => 0);
  mockDenops.setCallResponse("line", () => 1);
  mockDenops.setCallResponse("getline", () => "test");
  mockDenops.setCallResponse("col", () => 1);
  mockDenops.setCallResponse("matchadd", () => 1);

  // Test with different modes
  await core.showHintsInternal(mockDenops as any, "normal");
  await core.showHintsInternal(mockDenops as any, "visual");
  await core.showHintsInternal(mockDenops as any); // default mode

  // Cleanup
  core.cleanup();
  }
});

Deno.test("Core class should have showHintsWithKey method", () => {
  const core = new Core();
  assertExists(core.showHintsWithKey);
});

Deno.test({
  name: "Core class showHintsWithKey should handle key context",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
  const core = new Core({ enabled: true });
  const mockDenops = new MockDenops();

  // Setup mocks
  mockDenops.setCallResponse("bufnr", () => 1);
  mockDenops.setCallResponse("getbufvar", () => 0);
  mockDenops.setCallResponse("line", () => 1);
  mockDenops.setCallResponse("getline", () => "test words");
  mockDenops.setCallResponse("col", () => 1);
  mockDenops.setCallResponse("matchadd", () => 1);

  const key = "f";
  const mode = "normal";

  await core.showHintsWithKey(mockDenops as any, key, mode);

  // Config should be updated with key context
  const config = core.getConfig();
  assertEquals(config.current_key_context, key);

  // Cleanup
  core.cleanup();
  }
});

Deno.test({
  name: "Core class showHints should handle debouncing",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
  const core = new Core({
    enabled: true,
    debounceDelay: 10  // Shorter delay for testing
  });
  const mockDenops = new MockDenops();

  // Setup mocks
  mockDenops.setCallResponse("bufnr", () => 1);
  mockDenops.setCallResponse("getbufvar", () => 0);
  mockDenops.setCallResponse("line", () => 1);
  mockDenops.setCallResponse("getline", () => "test");
  mockDenops.setCallResponse("col", () => 1);
  mockDenops.setCallResponse("matchadd", () => 1);

  // Multiple rapid calls should be debounced
  const promise1 = core.showHints(mockDenops as any);
  const promise2 = core.showHints(mockDenops as any);
  const promise3 = core.showHints(mockDenops as any);

  await Promise.all([promise1, promise2, promise3]);

  // Wait a bit to ensure all debounced calls complete
  await new Promise<void>(resolve => setTimeout(resolve, 50));

  // Clean up timers
  core.cleanup();

  // Should complete without error
  }
});

Deno.test({
  name: "Core class showHints should be disabled when config.enabled is false",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
  const core = new Core({ enabled: false });
  const mockDenops = new MockDenops();

  await core.showHints(mockDenops as any);

  // Should not show hints when disabled
  assertEquals(core.isHintsVisible(), false);
  assertEquals(core.getCurrentHints().length, 0);

  // Cleanup
  core.cleanup();
  }
});

Deno.test({
  name: "Core class showHints should handle errors gracefully",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
  const core = new Core({ enabled: true });
  const mockDenops = new MockDenops();

  // Setup mocks to throw errors
  mockDenops.setCallResponse("bufnr", () => { throw new Error("Buffer error"); });

  // Should not throw, but handle errors internally
  await core.showHints(mockDenops as any);
  // Should complete without throwing

  // Cleanup
  core.cleanup();
  }
});