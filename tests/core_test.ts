import { assert, assertEquals, assertExists, assertThrows } from "https://deno.land/std@0.220.1/assert/mod.ts";
import { Core } from "../denops/hellshake-yano/core.ts";
import type { Config, Word, HintMapping, HighlightColor } from "../denops/hellshake-yano/types.ts";
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
  Core.resetForTesting(); // テスト分離のため
  const core = Core.getInstance();
  assertExists(core);
});

/**
 * Core class should have essential methods
 * TDD Red Phase: 必要なメソッドの存在確認（最初は失敗）
 */
Deno.test("Core class should have essential methods", () => {
  Core.resetForTesting(); // テスト分離のため
  const core = Core.getInstance();
  assertExists(core.detectWordsOptimized);
  assertExists(core.generateHintsOptimized);
  assertExists(core.showHints);
  assertExists(core.hideHints);
});

/**
 * Core class basic functionality test
 * TDD Red Phase: 基本機能のテスト（最初は失敗）
 */
Deno.test("Core class should initialize with default config", () => {
  Core.resetForTesting(); // テスト分離のため
  const core = Core.getInstance();
  const config = core.getConfig();
  assertExists(config);
  assertEquals(typeof config, "object");
});

/**
 * Singleton pattern test - Phase 10.1
 * TDD Red Phase: シングルトンパターンのテスト（最初は失敗）
 */
Deno.test("Core should implement singleton pattern", () => {
  Core.resetForTesting();
  const core1 = Core.getInstance();
  const core2 = Core.getInstance();
  assertEquals(core1, core2, "getInstance should return the same instance");
  assertExists(core1);
});

/**
 * Singleton reset test for testing isolation
 * TDD Red Phase: テスト分離のためのリセット機能
 */
Deno.test("Core should provide reset method for testing", () => {
  const core1 = Core.getInstance();
  Core.resetForTesting();
  const core2 = Core.getInstance();
  // リセット後は新しいインスタンスが作成される
  assertExists(core1);
  assertExists(core2);
});

/**
 * Core class custom config test
 * TDD Refactor Phase: カスタム設定のテスト追加
 */
Deno.test("Core class should accept custom config", () => {
  Core.resetForTesting(); // テスト分離のため
  const customConfig = {
    enabled: false,
    maxHints: 50
  };
  const core = Core.getInstance(customConfig);
  const config = core.getConfig();
  assertEquals(config.enabled, false);
  assertEquals(config.maxHints, 50);
});

/**
 * Core class word detection test
 * TDD Refactor Phase: 単語検出機能のテスト
 */
Deno.test("Core class detectWords should return valid result", () => {
  Core.resetForTesting();
  const core = Core.getInstance();
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
  Core.resetForTesting();
  const core = Core.getInstance();
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
  Core.resetForTesting();
  const core = Core.getInstance({ enabled: true });
  assertEquals(core.isEnabled(), true);

  core.updateConfig({ enabled: false });
  assertEquals(core.isEnabled(), false);
});

Deno.test("Core class should track hints visibility", () => {
  Core.resetForTesting();
  const core = Core.getInstance({ enabled: true });
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
  Core.resetForTesting();
  const core = Core.getInstance({ enabled: false });
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
  Core.resetForTesting();
  const core = Core.getInstance();
  assertExists(core.getState);
  const state = core.getState();
  assertExists(state);
  assertEquals(typeof state, "object");
});

Deno.test("Core class should have setState method", () => {
  Core.resetForTesting();
  const core = Core.getInstance();
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
  Core.resetForTesting();
  const core = Core.getInstance();
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
  Core.resetForTesting();
  const core = Core.getInstance();
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
  Core.resetForTesting();
  const core = Core.getInstance({ enabled: true });
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
  Core.resetForTesting();
  const core = Core.getInstance({ enabled: true });

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
  Core.resetForTesting();
  const core = Core.getInstance({ enabled: true });

  // ヒントが表示されていない状態でhideHintsを呼び出し
  assertEquals(core.isHintsVisible(), false);
  assertEquals(core.getCurrentHints().length, 0);

  // hideHintsを呼び出してもエラーが発生しないことを確認
  core.hideHints();

  assertEquals(core.isHintsVisible(), false);
  assertEquals(core.getCurrentHints().length, 0);
});

Deno.test("Core class hideHints should work when disabled", () => {
  Core.resetForTesting();
  const core = Core.getInstance({ enabled: false });

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
  Core.resetForTesting();
  const core = Core.getInstance({ enabled: true });

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
  Core.resetForTesting();
  const core = Core.getInstance({ enabled: true });

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
  Core.resetForTesting();
  const core = Core.getInstance();
  assertExists(core.detectWordsOptimized);
});

Deno.test("Core class detectWordsOptimized should be async and return Promise<Word[]>", async () => {
  const core = Core.getInstance();
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
  const core = Core.getInstance();
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
  const core = Core.getInstance();
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
  const core = Core.getInstance({useJapanese: false });
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
  core.updateConfig({useJapanese: true });
  const wordsWithJapanese = await core.detectWordsOptimized(mockDenops as any, bufnr);
  assertExists(wordsWithJapanese);
});

Deno.test("Core class detectWordsOptimized should integrate with existing word detection logic", async () => {
  const core = Core.getInstance();
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
  const core = Core.getInstance();
  assertExists(core.generateHintsOptimized);
});

Deno.test("Core class generateHintsOptimized should return string array", () => {
  const core = Core.getInstance();
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
  const core = Core.getInstance();
  const wordCount = 3;
  const emptyMarkers: string[] = [];
  const hints = core.generateHintsOptimized(wordCount, emptyMarkers);

  assertExists(hints);
  assertEquals(Array.isArray(hints), true);
  // Should fallback to default markers or handle gracefully
});

Deno.test("Core class generateHintsOptimized should handle zero word count", () => {
  const core = Core.getInstance();
  const wordCount = 0;
  const markers = ["a", "s", "d"];
  const hints = core.generateHintsOptimized(wordCount, markers);

  assertExists(hints);
  assertEquals(Array.isArray(hints), true);
  assertEquals(hints.length, 0);
});

Deno.test("Core class generateHintsOptimized should handle large word count", () => {
  const core = Core.getInstance();
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
  const core = Core.getInstance();
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
  const core = Core.getInstance({useHintGroups: true,
    singleCharKeys: ["a", "s", "d"],
    multiCharKeys: ["f", "g", "h"]
  });
  const wordCount = 10;
  const markers = ["a", "s", "d", "f", "g", "h"];
  const hints = core.generateHintsOptimized(wordCount, markers);

  assertExists(hints);
  assertEquals(Array.isArray(hints), true);
  assertEquals(hints.length, wordCount);
});

Deno.test("Core class generateHintsOptimized should validate input parameters", () => {
  const core = Core.getInstance();
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
  const core = Core.getInstance();
  assertExists(core.displayHintsOptimized);
});

Deno.test("Core class displayHintsOptimized should be async and accept proper parameters", async () => {
  const core = Core.getInstance();
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
  const core = Core.getInstance();
  assertExists(core.displayHintsAsync);
});

Deno.test("Core class displayHintsAsync should handle hints display asynchronously", async () => {
  const core = Core.getInstance();
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
  const core = Core.getInstance();
  assertExists(core.displayHintsWithExtmarksBatch);
});

Deno.test("Core class displayHintsWithExtmarksBatch should handle extmarks batch display", async () => {
  const core = Core.getInstance();
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
  const core = Core.getInstance();
  assertExists(core.displayHintsWithMatchAddBatch);
});

Deno.test("Core class displayHintsWithMatchAddBatch should handle matchadd batch display", async () => {
  const core = Core.getInstance();
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
  const core = Core.getInstance();
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
  const core = Core.getInstance();
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
  const core = Core.getInstance();
  assertExists(core.showHints);
});

Deno.test("Core class showHints should be async and integrate full workflow", async () => {
  const core = Core.getInstance({ enabled: true });
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
});

Deno.test("Core class should have showHintsInternal method", () => {
  const core = Core.getInstance();
  assertExists(core.showHintsInternal);
});

Deno.test("Core class showHintsInternal should handle mode parameter", async () => {
  const core = Core.getInstance({ enabled: true });
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
});

Deno.test("Core class should have showHintsWithKey method", () => {
  const core = Core.getInstance();
  assertExists(core.showHintsWithKey);
});

Deno.test("Core class showHintsWithKey should handle key context", async () => {
  const core = Core.getInstance({ enabled: true });
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
  assertEquals(config.currentKeyContext, key);

  // Cleanup
  core.cleanup();
});

Deno.test("Core class showHints should handle multiple calls", async () => {
  const core = Core.getInstance({
    enabled: true,
    debounceDelay: 10  // Shorter delay for testing (handled by main.ts)
  });
  const mockDenops = new MockDenops();

  // Setup mocks
  mockDenops.setCallResponse("bufnr", () => 1);
  mockDenops.setCallResponse("getbufvar", () => 0);
  mockDenops.setCallResponse("line", () => 1);
  mockDenops.setCallResponse("getline", () => "test");
  mockDenops.setCallResponse("col", () => 1);
  mockDenops.setCallResponse("matchadd", () => 1);

  // Multiple rapid calls (debouncing handled at main.ts level)
  const promise1 = core.showHints(mockDenops as any);
  const promise2 = core.showHints(mockDenops as any);
  const promise3 = core.showHints(mockDenops as any);

  await Promise.all([promise1, promise2, promise3]);

  // Clean up
  core.cleanup();

  // Should complete without error
});

Deno.test("Core class showHints should be disabled when config.enabled is false", async () => {
  const core = Core.getInstance({ enabled: false });
  const mockDenops = new MockDenops();

  await core.showHints(mockDenops as any);

  // Should not show hints when disabled
  assertEquals(core.isHintsVisible(), false);
  assertEquals(core.getCurrentHints().length, 0);

  // Cleanup
  core.cleanup();
});

Deno.test("Core class showHints should handle errors gracefully", async () => {
  const core = Core.getInstance({ enabled: true });
  const mockDenops = new MockDenops();

  // Setup mocks to throw errors
  mockDenops.setCallResponse("bufnr", () => { throw new Error("Buffer error"); });

  // Should not throw, but handle errors internally
  await core.showHints(mockDenops as any);
  // Should complete without throwing

  // Cleanup
  core.cleanup();
});

// Phase 8: Utility Functions Tests (TDD RED phase)
Deno.test("Core class recordPerformance should track operation metrics", () => {
  Core.resetForTesting();
  const core = Core.getInstance({performanceLog: true });

  // Record performance for various operations
  (core as any).recordPerformance("showHints", 100, 150);
  (core as any).recordPerformance("hideHints", 50, 60);
  (core as any).recordPerformance("wordDetection", 20, 45);
  (core as any).recordPerformance("hintGeneration", 30, 50);

  const debugInfo = (core as any).collectDebugInfo();

  // Verify metrics were recorded
  assertEquals(debugInfo.metrics.showHints.length, 1);
  assertEquals(debugInfo.metrics.showHints[0], 50); // 150 - 100
  assertEquals(debugInfo.metrics.hideHints.length, 1);
  assertEquals(debugInfo.metrics.hideHints[0], 10); // 60 - 50
  assertEquals(debugInfo.metrics.wordDetection.length, 1);
  assertEquals(debugInfo.metrics.wordDetection[0], 25); // 45 - 20
  assertEquals(debugInfo.metrics.hintGeneration.length, 1);
  assertEquals(debugInfo.metrics.hintGeneration[0], 20); // 50 - 30

  // Cleanup
  core.cleanup();
});

Deno.test("Core class recordPerformance should not record when performanceLog is disabled", () => {
  Core.resetForTesting();
  const core = Core.getInstance({performanceLog: false });

  // Try to record performance
  (core as any).recordPerformance("showHints", 100, 150);

  const debugInfo = (core as any).collectDebugInfo();

  // Metrics should be empty
  assertEquals(debugInfo.metrics.showHints.length, 0);

  // Cleanup
  core.cleanup();
});

Deno.test("Core class recordPerformance should limit metrics to 50 entries", () => {
  Core.resetForTesting();
  const core = Core.getInstance({performanceLog: true });

  // Record more than 50 entries
  for (let i = 0; i < 60; i++) {
    (core as any).recordPerformance("showHints", i, i + 10);
  }

  const debugInfo = (core as any).collectDebugInfo();

  // Should only keep last 50 entries
  assertEquals(debugInfo.metrics.showHints.length, 50);
  // Check that we have the last 50 values (10ms each)
  debugInfo.metrics.showHints.forEach((duration: number) => {
    assertEquals(duration, 10);
  });

  // Cleanup
  core.cleanup();
});

Deno.test("Core class collectDebugInfo should return complete debug information", () => {
  Core.resetForTesting();
  const core = Core.getInstance({
    enabled: true,
    performanceLog: true,
    markers: ["w", "e", "b"]
  });

  // Record some performance metrics
  (core as any).recordPerformance("showHints", 100, 150);

  // Set some hints
  (core as any).setCurrentHints([
    { hint: "A", word: { text: "test", line: 1, col: 1, byteCol: 1 } }
  ]);

  const debugInfo = (core as any).collectDebugInfo();

  // Verify debug info structure
  assertExists(debugInfo.config);
  assertEquals(debugInfo.config.enabled, true);
  assertEquals(debugInfo.config.markers, ["w", "e", "b"]);
  assertEquals(typeof debugInfo.hintsVisible, "boolean");
  assertEquals(Array.isArray(debugInfo.currentHints), true);
  assertEquals(debugInfo.currentHints.length, 1);
  assertExists(debugInfo.metrics);
  assertEquals(debugInfo.metrics.showHints.length, 1);
  assertEquals(typeof debugInfo.timestamp, "number");
  assert(debugInfo.timestamp > 0);

  // Cleanup
  core.cleanup();
});

Deno.test("Core class clearDebugInfo should reset all performance metrics", () => {
  Core.resetForTesting();
  const core = Core.getInstance({performanceLog: true });

  // Record some metrics
  (core as any).recordPerformance("showHints", 100, 150);
  (core as any).recordPerformance("hideHints", 50, 60);
  (core as any).recordPerformance("wordDetection", 20, 45);
  (core as any).recordPerformance("hintGeneration", 30, 50);

  // Clear debug info
  (core as any).clearDebugInfo();

  const debugInfo = (core as any).collectDebugInfo();

  // All metrics should be empty
  assertEquals(debugInfo.metrics.showHints.length, 0);
  assertEquals(debugInfo.metrics.hideHints.length, 0);
  assertEquals(debugInfo.metrics.wordDetection.length, 0);
  assertEquals(debugInfo.metrics.hintGeneration.length, 0);

  // Cleanup
  core.cleanup();
});

Deno.test("Core class waitForUserInput should handle user input for hints", async () => {
  const core = Core.getInstance({ enabled: true, motionCount: 2 });
  const mockDenops = new MockDenops();

  // Setup hints
  (core as any).setCurrentHints([
    { hint: "AA", word: { text: "test1", line: 1, col: 1, byteCol: 1 } },
    { hint: "AB", word: { text: "test2", line: 1, col: 5, byteCol: 5 } },
    { hint: "A", word: { text: "test3", line: 2, col: 1, byteCol: 1 } }
  ]);

  // Mock getchar to return 'A' (65)
  let getcharCallCount = 0;
  mockDenops.setCallResponse("getchar", () => {
    getcharCallCount++;
    if (getcharCallCount === 1) return 65; // First char: 'A'
    if (getcharCallCount === 2) return 66; // Second char: 'B'
    return 27; // ESC
  });

  // Mock cursor movement
  mockDenops.setCallResponse("cursor", () => {});

  // Execute waitForUserInput
  await (core as any).waitForUserInput(mockDenops as any);

  // Verify getchar was called
  assert(getcharCallCount > 0);

  // Cleanup
  core.cleanup();
});

Deno.test("Core class waitForUserInput should handle ESC to cancel", async () => {
  const core = Core.getInstance({ enabled: true });
  const mockDenops = new MockDenops();

  // Setup hints
  (core as any).setCurrentHints([
    { hint: "A", word: { text: "test", line: 1, col: 1, byteCol: 1 } }
  ]);

  // Mock getchar to return ESC (27)
  mockDenops.setCallResponse("getchar", () => 27);

  // Execute waitForUserInput
  await (core as any).waitForUserInput(mockDenops as any);

  // Should handle ESC gracefully without error

  // Cleanup
  core.cleanup();
});

Deno.test("Core class waitForUserInput should handle timeout", async () => {
  const core = Core.getInstance({ enabled: true, timeout: 100 } as any); // 100ms timeout
  const mockDenops = new MockDenops();

  // Setup hints
  (core as any).setCurrentHints([
    { hint: "A", word: { text: "test", line: 1, col: 1, byteCol: 1 } }
  ]);

  // Mock getchar with timeout simulation
  mockDenops.setCallResponse("getchar", () => {
    // Simulate timeout by returning 0
    return 0;
  });

  // Execute waitForUserInput
  await (core as any).waitForUserInput(mockDenops as any);

  // Should handle timeout gracefully

  // Cleanup
  core.cleanup();
});

/**
 * Dictionary System Tests - TDD Red Phase
 * これらのテストは最初は失敗する（辞書システムメソッドがCore class に未実装のため）
 */

Deno.test("Core class should have dictionary system methods", () => {
  const core = Core.getInstance();

  // Dictionary system methods should exist
  assertExists(core.initializeDictionarySystem);
  assertExists(core.reloadDictionary);
  assertExists(core.editDictionary);
  assertExists(core.showDictionary);
  assertExists(core.validateDictionary);
});

Deno.test("Core initializeDictionarySystem should initialize dictionary loader", async () => {
  const core = Core.getInstance();
  const mockDenops = new MockDenops();

  // Should be able to initialize dictionary system
  await core.initializeDictionarySystem(mockDenops as any);

  // Dictionary system should be initialized
  const hasDictionarySystem = (core as any).hasDictionarySystem();
  assertEquals(hasDictionarySystem, true);

  // Cleanup
  core.cleanup();
});

Deno.test("Core reloadDictionary should reload user dictionary", async () => {
  const core = Core.getInstance();
  const mockDenops = new MockDenops();

  // Initialize dictionary system first
  await core.initializeDictionarySystem(mockDenops as any);

  // Should be able to reload dictionary
  await core.reloadDictionary(mockDenops as any);

  // Should show success message
  const commands = mockDenops.getExecutedCommands();
  assert(commands.some(cmd => cmd.includes('Dictionary reloaded successfully')));

  // Cleanup
  core.cleanup();
});

Deno.test("Core editDictionary should open dictionary file for editing", async () => {
  const core = Core.getInstance();
  const mockDenops = new MockDenops();

  // Initialize dictionary system first
  await core.initializeDictionarySystem(mockDenops as any);

  // Should be able to edit dictionary
  await core.editDictionary(mockDenops as any);

  // Should execute edit command
  const commands = mockDenops.getExecutedCommands();
  assert(commands.some((cmd: string) => cmd.includes('edit')));

  // Cleanup
  core.cleanup();
});

Deno.test("Core editDictionary should create new dictionary file if not exists", async () => {
  const core = Core.getInstance();
  const mockDenops = new MockDenops();

  // Initialize dictionary system first
  await core.initializeDictionarySystem(mockDenops as any);

  // Should be able to edit dictionary and create new file
  await core.editDictionary(mockDenops as any);

  // Should execute edit command and show creation message
  const commands = mockDenops.getExecutedCommands();
  assert(commands.some((cmd: string) => cmd.includes('edit')));

  // Cleanup
  core.cleanup();
});

Deno.test("Core editDictionary should handle errors gracefully", async () => {
  const core = Core.getInstance();
  const mockDenops = new MockDenops();

  // Initialize dictionary system first
  await core.initializeDictionarySystem(mockDenops as any);

  // Should handle error gracefully (simulate file system error by testing with invalid path)
  await core.editDictionary(mockDenops as any);

  // Should complete without throwing (error handling is internal)
  // Cleanup
  core.cleanup();
});

Deno.test("Core showDictionary should display dictionary contents", async () => {
  const core = Core.getInstance();
  const mockDenops = new MockDenops();

  // Initialize dictionary system first
  await core.initializeDictionarySystem(mockDenops as any);

  // Should be able to show dictionary
  await core.showDictionary(mockDenops as any);

  // Should create buffer and set content
  const commands = mockDenops.getExecutedCommands();
  assert(commands.some((cmd: string) => cmd.includes('new')));
  assert(commands.some((cmd: string) => cmd.includes('file [HellshakeYano Dictionary]')));

  // Cleanup
  core.cleanup();
});

Deno.test("Core showDictionary should handle empty dictionary", async () => {
  const core = Core.getInstance();
  const mockDenops = new MockDenops();

  // Initialize dictionary system first
  await core.initializeDictionarySystem(mockDenops as any);

  // Should handle empty dictionary
  await core.showDictionary(mockDenops as any);

  // Should still create buffer
  const commands = mockDenops.getExecutedCommands();
  assert(commands.some((cmd: string) => cmd.includes('new')));

  // Cleanup
  core.cleanup();
});

Deno.test("Core showDictionary should handle errors gracefully", async () => {
  const core = Core.getInstance();
  const mockDenops = new MockDenops();

  // Initialize dictionary system first
  await core.initializeDictionarySystem(mockDenops as any);

  // Should handle error gracefully
  await core.showDictionary(mockDenops as any);

  // Should complete without throwing (error handling is internal)
  // Cleanup
  core.cleanup();
});

Deno.test("Core validateDictionary should validate dictionary format", async () => {
  const core = Core.getInstance();
  const mockDenops = new MockDenops();

  // Initialize dictionary system first
  await core.initializeDictionarySystem(mockDenops as any);

  // Should be able to validate dictionary
  await core.validateDictionary(mockDenops as any);

  // Should show validation result
  const commands = mockDenops.getExecutedCommands();
  assert(commands.some((cmd: string) => cmd.includes('Dictionary format is valid') || cmd.includes('Dictionary validation failed')));

  // Cleanup
  core.cleanup();
});

Deno.test("Core validateDictionary should handle missing dictionary file", async () => {
  const core = Core.getInstance();
  const mockDenops = new MockDenops();

  // Initialize dictionary system first
  await core.initializeDictionarySystem(mockDenops as any);

  // Should handle missing file gracefully
  await core.validateDictionary(mockDenops as any);

  // Should show result (either valid or not found)
  const commands = mockDenops.getExecutedCommands();
  assert(commands.some((cmd: string) =>
    cmd.includes('Dictionary format is valid') ||
    cmd.includes('Dictionary file not found') ||
    cmd.includes('Dictionary validation failed')
  ));

  // Cleanup
  core.cleanup();
});

Deno.test("Core validateDictionary should handle errors gracefully", async () => {
  const core = Core.getInstance();
  const mockDenops = new MockDenops();

  // Initialize dictionary system first
  await core.initializeDictionarySystem(mockDenops as any);

  // Should handle error gracefully
  await core.validateDictionary(mockDenops as any);

  // Should complete without throwing (error handling is internal)
  // Cleanup
  core.cleanup();
});

/**
 * TDD RED Phase: addToDictionary method tests
 * これらのテストは最初失敗する（Core.addToDictionaryメソッドが未実装のため）
 */

Deno.test("Core class should have addToDictionary method", () => {
  const core = Core.getInstance();
  assertExists(core.addToDictionary);
});

Deno.test("Core addToDictionary should add word to user dictionary", async () => {
  const mockDenops = new MockDenops();
  const core = Core.getInstance();

  // Initialize dictionary system first
  await core.initializeDictionarySystem(mockDenops as any);

  // Should be able to add word to dictionary
  await core.addToDictionary(mockDenops as any, "testword", "test", "noun");

  // Should show success message
  const commands = mockDenops.getExecutedCommands();
  assert(commands.some((cmd: string) => cmd.includes('Word added to dictionary')));

  // Cleanup
  core.cleanup();
});

Deno.test("Core addToDictionary should handle invalid word input", async () => {
  const mockDenops = new MockDenops();
  const core = Core.getInstance();

  // Initialize dictionary system first
  await core.initializeDictionarySystem(mockDenops as any);

  // Should handle empty word
  await core.addToDictionary(mockDenops as any, "", "", "");

  // Should show error message
  const commands = mockDenops.getExecutedCommands();
  assert(commands.some((cmd: string) => cmd.includes('echoerr') && cmd.includes('Invalid word')));

  // Cleanup
  core.cleanup();
});

Deno.test("Core addToDictionary should handle different word types", async () => {
  const mockDenops = new MockDenops();
  const core = Core.getInstance();

  // Initialize dictionary system first
  await core.initializeDictionarySystem(mockDenops as any);

  // Should handle different word types
  await core.addToDictionary(mockDenops as any, "run", "走る", "verb");
  await core.addToDictionary(mockDenops as any, "fast", "速い", "adjective");
  await core.addToDictionary(mockDenops as any, "dog", "犬", "noun");

  // Should show success messages for each
  const commands = mockDenops.getExecutedCommands();
  const successCommands = commands.filter((cmd: string) => cmd.includes('Word added to dictionary'));
  assertEquals(successCommands.length, 3);

  // Cleanup
  core.cleanup();
});

/**
 * TDD RED Phase: validateHighlightGroupName method tests
 * これらのテストは最初失敗する（Core.validateHighlightGroupNameメソッドが未実装のため）
 */

Deno.test("Core class should have static validateHighlightGroupName method", () => {
  assertExists(Core.validateHighlightGroupName);
  assertEquals(typeof Core.validateHighlightGroupName, "function");
});

Deno.test("Core.validateHighlightGroupName should validate normal highlight group names", () => {
  // 正常なグループ名のテスト
  assertEquals(Core.validateHighlightGroupName("MyHighlight"), true);
  assertEquals(Core.validateHighlightGroupName("Normal"), true);
  assertEquals(Core.validateHighlightGroupName("Function"), true);
  assertEquals(Core.validateHighlightGroupName("String"), true);
  assertEquals(Core.validateHighlightGroupName("Comment"), true);
  assertEquals(Core.validateHighlightGroupName("SpecialChar"), true);
  assertEquals(Core.validateHighlightGroupName("LineNr"), true);
  assertEquals(Core.validateHighlightGroupName("CursorLine"), true);
  assertEquals(Core.validateHighlightGroupName("Visual"), true);
  assertEquals(Core.validateHighlightGroupName("Search"), true);
});

Deno.test("Core.validateHighlightGroupName should validate names with underscores", () => {
  // アンダースコアを含むグループ名のテスト
  assertEquals(Core.validateHighlightGroupName("_Valid"), true);
  assertEquals(Core.validateHighlightGroupName("My_Highlight"), true);
  assertEquals(Core.validateHighlightGroupName("User_Defined_Group"), true);
  assertEquals(Core.validateHighlightGroupName("_"), true);
  assertEquals(Core.validateHighlightGroupName("__double"), true);
});

Deno.test("Core.validateHighlightGroupName should validate names with numbers", () => {
  // 数字を含むグループ名のテスト（開始文字以外）
  assertEquals(Core.validateHighlightGroupName("Group1"), true);
  assertEquals(Core.validateHighlightGroupName("Highlight123"), true);
  assertEquals(Core.validateHighlightGroupName("User42Group"), true);
  assertEquals(Core.validateHighlightGroupName("Version2"), true);
});

Deno.test("Core.validateHighlightGroupName should reject invalid group names", () => {
  // 無効なグループ名のテスト
  // 数字で開始
  assertEquals(Core.validateHighlightGroupName("1Invalid"), false);
  assertEquals(Core.validateHighlightGroupName("123Group"), false);
  assertEquals(Core.validateHighlightGroupName("9Test"), false);

  // 特殊文字を含む
  assertEquals(Core.validateHighlightGroupName("Invalid-Group"), false);
  assertEquals(Core.validateHighlightGroupName("My.Highlight"), false);
  assertEquals(Core.validateHighlightGroupName("Group@Name"), false);
  assertEquals(Core.validateHighlightGroupName("Hash#Group"), false);
  assertEquals(Core.validateHighlightGroupName("Dollar$Group"), false);
  assertEquals(Core.validateHighlightGroupName("Percent%Group"), false);
  assertEquals(Core.validateHighlightGroupName("Space Group"), false);
  assertEquals(Core.validateHighlightGroupName("Tab\tGroup"), false);
  assertEquals(Core.validateHighlightGroupName("New\nLine"), false);
});

Deno.test("Core.validateHighlightGroupName should reject empty or null names", () => {
  // 空文字列や無効な値のテスト
  assertEquals(Core.validateHighlightGroupName(""), false);
  assertEquals(Core.validateHighlightGroupName("   "), false);
  assertEquals(Core.validateHighlightGroupName("\t"), false);
  assertEquals(Core.validateHighlightGroupName("\n"), false);
});

Deno.test("Core.validateHighlightGroupName should enforce length limits", () => {
  // 長さ制限のテスト
  // 100文字以下は有効
  const validLongName = "A".repeat(100);
  assertEquals(Core.validateHighlightGroupName(validLongName), true);

  const validMediumName = "MyHighlight".repeat(9); // 99文字
  assertEquals(Core.validateHighlightGroupName(validMediumName), true);

  // 100文字を超える場合は無効
  const invalidLongName = "A".repeat(101);
  assertEquals(Core.validateHighlightGroupName(invalidLongName), false);

  const tooLongName = "VeryLongHighlightGroupName".repeat(10); // 260文字
  assertEquals(Core.validateHighlightGroupName(tooLongName), false);
});

Deno.test("Core.validateHighlightGroupName should handle edge cases", () => {
  // エッジケースのテスト
  // 最小有効名（1文字）
  assertEquals(Core.validateHighlightGroupName("A"), true);
  assertEquals(Core.validateHighlightGroupName("_"), true);
  assertEquals(Core.validateHighlightGroupName("z"), true);

  // 有効な境界値
  assertEquals(Core.validateHighlightGroupName("A0"), true);
  assertEquals(Core.validateHighlightGroupName("Z9"), true);
  assertEquals(Core.validateHighlightGroupName("_0"), true);
  assertEquals(Core.validateHighlightGroupName("a_Z_9"), true);
});

/**
 * TDD RED Phase: Core.isValidColorName static method tests
 * sub2-1-2: これらのテストは最初失敗する（Core.isValidColorNameメソッドが未実装のため）
 */

Deno.test("Core class should have static isValidColorName method", () => {
  assertExists(Core.isValidColorName);
  assertEquals(typeof Core.isValidColorName, "function");
});

Deno.test("Core.isValidColorName should validate standard Vim color names", () => {
  // 基本色のテスト
  assertEquals(Core.isValidColorName("black"), true);
  assertEquals(Core.isValidColorName("white"), true);
  assertEquals(Core.isValidColorName("red"), true);
  assertEquals(Core.isValidColorName("green"), true);
  assertEquals(Core.isValidColorName("blue"), true);
  assertEquals(Core.isValidColorName("cyan"), true);
  assertEquals(Core.isValidColorName("magenta"), true);
  assertEquals(Core.isValidColorName("yellow"), true);
  assertEquals(Core.isValidColorName("none"), true);
});

Deno.test("Core.isValidColorName should validate dark color variants", () => {
  // dark系色のテスト
  assertEquals(Core.isValidColorName("darkblue"), true);
  assertEquals(Core.isValidColorName("darkgreen"), true);
  assertEquals(Core.isValidColorName("darkcyan"), true);
  assertEquals(Core.isValidColorName("darkred"), true);
  assertEquals(Core.isValidColorName("darkmagenta"), true);
  assertEquals(Core.isValidColorName("darkgray"), true);
  assertEquals(Core.isValidColorName("darkgrey"), true);
});

Deno.test("Core.isValidColorName should validate light color variants", () => {
  // light系色のテスト
  assertEquals(Core.isValidColorName("lightgray"), true);
  assertEquals(Core.isValidColorName("lightgrey"), true);
  assertEquals(Core.isValidColorName("lightblue"), true);
  assertEquals(Core.isValidColorName("lightgreen"), true);
  assertEquals(Core.isValidColorName("lightcyan"), true);
  assertEquals(Core.isValidColorName("lightred"), true);
  assertEquals(Core.isValidColorName("lightmagenta"), true);
});

Deno.test("Core.isValidColorName should handle case insensitive validation", () => {
  // 大文字小文字のテスト
  assertEquals(Core.isValidColorName("BLACK"), true);
  assertEquals(Core.isValidColorName("White"), true);
  assertEquals(Core.isValidColorName("ReD"), true);
  assertEquals(Core.isValidColorName("GREEN"), true);
  assertEquals(Core.isValidColorName("bLuE"), true);
  assertEquals(Core.isValidColorName("DARKBLUE"), true);
  assertEquals(Core.isValidColorName("LightGreen"), true);
  assertEquals(Core.isValidColorName("NONE"), true);
});

Deno.test("Core.isValidColorName should validate special colors", () => {
  // 特殊色のテスト
  assertEquals(Core.isValidColorName("brown"), true);
  assertEquals(Core.isValidColorName("gray"), true);
  assertEquals(Core.isValidColorName("grey"), true);
  assertEquals(Core.isValidColorName("none"), true);
});

Deno.test("Core.isValidColorName should reject invalid color names", () => {
  // 無効な色名のテスト
  assertEquals(Core.isValidColorName("orange"), false);
  assertEquals(Core.isValidColorName("purple"), false);
  assertEquals(Core.isValidColorName("pink"), false);
  assertEquals(Core.isValidColorName("gold"), false);
  assertEquals(Core.isValidColorName("silver"), false);
  assertEquals(Core.isValidColorName("transparent"), false);
  assertEquals(Core.isValidColorName("invalid"), false);
  assertEquals(Core.isValidColorName("custom"), false);
  assertEquals(Core.isValidColorName("color123"), false);
});

Deno.test("Core.isValidColorName should reject empty or null values", () => {
  // 空文字列や無効な値のテスト
  assertEquals(Core.isValidColorName(""), false);
  assertEquals(Core.isValidColorName("  "), false);
  assertEquals(Core.isValidColorName("\t"), false);
  assertEquals(Core.isValidColorName("\n"), false);
});

Deno.test("Core.isValidColorName should handle type validation", () => {
  // 型バリデーションのテスト（実際のランタイムでは文字列以外は渡されないが、安全性のため）
  assertEquals(Core.isValidColorName("black"), true); // 正常な文字列
  // Note: TypeScriptの型システムにより、実際には文字列以外は渡せない
  // しかし、実装では安全性のためランタイムチェックを行う
});

Deno.test("Core.isValidColorName should validate all supported Vim colors", () => {
  // 全サポート色の網羅テスト
  const validColors = [
    "black", "darkblue", "darkgreen", "darkcyan", "darkred", "darkmagenta",
    "brown", "darkgray", "darkgrey", "lightgray", "lightgrey", "lightblue",
    "lightgreen", "lightcyan", "lightred", "lightmagenta", "yellow", "white",
    "red", "green", "blue", "cyan", "magenta", "gray", "grey", "none"
  ];

  validColors.forEach(color => {
    assertEquals(Core.isValidColorName(color), true, `Color '${color}' should be valid`);
  });
});

Deno.test("Core.isValidColorName should reject hex colors", () => {
  // 16進数色は別の関数で処理するため、ここでは無効とする
  assertEquals(Core.isValidColorName("#ffffff"), false);
  assertEquals(Core.isValidColorName("#000"), false);
  assertEquals(Core.isValidColorName("#ff0000"), false);
  assertEquals(Core.isValidColorName("#123456"), false);
});

/**
 * TDD RED Phase: Core.isValidHexColor static method tests
 * sub2-1-3: これらのテストは最初失敗する（Core.isValidHexColorメソッドが未実装のため）
 */

Deno.test("Core class should have static isValidHexColor method", () => {
  assertExists(Core.isValidHexColor);
  assertEquals(typeof Core.isValidHexColor, "function");
});

Deno.test("Core.isValidHexColor should validate valid hex colors", () => {
  // 6桁16進数のテスト
  assertEquals(Core.isValidHexColor("#ffffff"), true);
  assertEquals(Core.isValidHexColor("#000000"), true);
  assertEquals(Core.isValidHexColor("#ff0000"), true);
  assertEquals(Core.isValidHexColor("#00ff00"), true);
  assertEquals(Core.isValidHexColor("#0000ff"), true);
  assertEquals(Core.isValidHexColor("#123456"), true);
  assertEquals(Core.isValidHexColor("#abcdef"), true);
  assertEquals(Core.isValidHexColor("#ABCDEF"), true);
  assertEquals(Core.isValidHexColor("#789abc"), true);
});

Deno.test("Core.isValidHexColor should validate 3-digit hex colors", () => {
  // 3桁16進数のテスト
  assertEquals(Core.isValidHexColor("#fff"), true);
  assertEquals(Core.isValidHexColor("#000"), true);
  assertEquals(Core.isValidHexColor("#f00"), true);
  assertEquals(Core.isValidHexColor("#0f0"), true);
  assertEquals(Core.isValidHexColor("#00f"), true);
  assertEquals(Core.isValidHexColor("#123"), true);
  assertEquals(Core.isValidHexColor("#abc"), true);
  assertEquals(Core.isValidHexColor("#ABC"), true);
  assertEquals(Core.isValidHexColor("#789"), true);
});

Deno.test("Core.isValidHexColor should handle case sensitivity", () => {
  // 大文字小文字混在のテスト
  assertEquals(Core.isValidHexColor("#AaBbCc"), true);
  assertEquals(Core.isValidHexColor("#1a2B3c"), true);
  assertEquals(Core.isValidHexColor("#FfFfFf"), true);
  assertEquals(Core.isValidHexColor("#AbC"), true);
  assertEquals(Core.isValidHexColor("#9aF"), true);
});

Deno.test("Core.isValidHexColor should reject colors without hash", () => {
  // #無しの文字列は無効
  assertEquals(Core.isValidHexColor("ffffff"), false);
  assertEquals(Core.isValidHexColor("000"), false);
  assertEquals(Core.isValidHexColor("ff0000"), false);
  assertEquals(Core.isValidHexColor("abc"), false);
  assertEquals(Core.isValidHexColor("123456"), false);
});

Deno.test("Core.isValidHexColor should reject invalid hex lengths", () => {
  // 不正な長さのテスト（3桁、6桁以外）
  assertEquals(Core.isValidHexColor("#ff"), false);        // 2桁
  assertEquals(Core.isValidHexColor("#ffff"), false);      // 4桁
  assertEquals(Core.isValidHexColor("#fffff"), false);     // 5桁
  assertEquals(Core.isValidHexColor("#fffffff"), false);   // 7桁
  assertEquals(Core.isValidHexColor("#ffffffff"), false);  // 8桁
  assertEquals(Core.isValidHexColor("#1"), false);         // 1桁
  assertEquals(Core.isValidHexColor("#"), false);          // 0桁
});

Deno.test("Core.isValidHexColor should reject invalid hex characters", () => {
  // 無効な文字を含むテスト
  assertEquals(Core.isValidHexColor("#gggggg"), false);    // 'g'は無効
  assertEquals(Core.isValidHexColor("#zzzzzz"), false);    // 'z'は無効
  assertEquals(Core.isValidHexColor("#12345g"), false);    // 'g'は無効
  assertEquals(Core.isValidHexColor("#12g"), false);       // 'g'は無効
  assertEquals(Core.isValidHexColor("#ff ff"), false);     // 空白は無効
  assertEquals(Core.isValidHexColor("#ff-ff"), false);     // '-'は無効
  assertEquals(Core.isValidHexColor("#ff.ff"), false);     // '.'は無効
});

Deno.test("Core.isValidHexColor should reject empty or null values", () => {
  // 空文字列や無効な値のテスト
  assertEquals(Core.isValidHexColor(""), false);
  assertEquals(Core.isValidHexColor("   "), false);
  assertEquals(Core.isValidHexColor("\t"), false);
  assertEquals(Core.isValidHexColor("\n"), false);
});

Deno.test("Core.isValidHexColor should handle type validation", () => {
  // 型バリデーションのテスト（実際のランタイムでは文字列以外は渡されないが、安全性のため）
  assertEquals(Core.isValidHexColor("#ff0000"), true);     // 正常な文字列
  // Note: TypeScriptの型システムにより、実際には文字列以外は渡せない
  // しかし、実装では安全性のためランタイムチェックを行う
});

Deno.test("Core.isValidHexColor should reject color names", () => {
  // 色名は別の関数で処理するため、ここでは無効とする
  assertEquals(Core.isValidHexColor("red"), false);
  assertEquals(Core.isValidHexColor("blue"), false);
  assertEquals(Core.isValidHexColor("green"), false);
  assertEquals(Core.isValidHexColor("black"), false);
  assertEquals(Core.isValidHexColor("white"), false);
  assertEquals(Core.isValidHexColor("none"), false);
});

Deno.test("Core.isValidHexColor should validate edge cases", () => {
  // エッジケースのテスト
  assertEquals(Core.isValidHexColor("#0"), false);         // 最小無効
  assertEquals(Core.isValidHexColor("#00"), false);        // 最小無効
  assertEquals(Core.isValidHexColor("#000"), true);        // 最小有効（3桁）
  assertEquals(Core.isValidHexColor("#000000"), true);     // 最小有効（6桁）
  assertEquals(Core.isValidHexColor("#FFF"), true);        // 最大有効（3桁）
  assertEquals(Core.isValidHexColor("#FFFFFF"), true);     // 最大有効（6桁）
});

/**
 * TDD RED Phase: Core.normalizeColorName static method tests
 * sub2-1-4: これらのテストは最初失敗する（Core.normalizeColorNameメソッドが未実装のため）
 */

Deno.test("Core class should have static normalizeColorName method", () => {
  assertExists(Core.normalizeColorName);
  assertEquals(typeof Core.normalizeColorName, "function");
});

Deno.test("Core.normalizeColorName should normalize color names", () => {
  // 基本的な正規化（最初の文字を大文字、残りを小文字）
  assertEquals(Core.normalizeColorName("red"), "Red");
  assertEquals(Core.normalizeColorName("RED"), "Red");
  assertEquals(Core.normalizeColorName("Red"), "Red");
  assertEquals(Core.normalizeColorName("blue"), "Blue");
  assertEquals(Core.normalizeColorName("BLUE"), "Blue");
  assertEquals(Core.normalizeColorName("green"), "Green");
});

Deno.test("Core.normalizeColorName should handle compound color names", () => {
  // 複合色名の正規化
  assertEquals(Core.normalizeColorName("darkblue"), "Darkblue");
  assertEquals(Core.normalizeColorName("DARKBLUE"), "Darkblue");
  assertEquals(Core.normalizeColorName("lightgreen"), "Lightgreen");
  assertEquals(Core.normalizeColorName("LIGHTGREEN"), "Lightgreen");
  assertEquals(Core.normalizeColorName("lightgray"), "Lightgray");
});

Deno.test("Core.normalizeColorName should preserve hex colors", () => {
  // 16進数色はそのまま返す
  assertEquals(Core.normalizeColorName("#ff0000"), "#ff0000");
  assertEquals(Core.normalizeColorName("#FF0000"), "#FF0000");
  assertEquals(Core.normalizeColorName("#fff"), "#fff");
  assertEquals(Core.normalizeColorName("#FFF"), "#FFF");
  assertEquals(Core.normalizeColorName("#123456"), "#123456");
});

Deno.test("Core.normalizeColorName should handle edge cases", () => {
  // エッジケースの処理
  assertEquals(Core.normalizeColorName(""), "");
  assertEquals(Core.normalizeColorName("a"), "A");
  assertEquals(Core.normalizeColorName("none"), "None");
  assertEquals(Core.normalizeColorName("NONE"), "None");
});

/**
 * TDD RED Phase: Core.validateHighlightColor static method tests
 * sub2-1-5: これらのテストは最初失敗する（Core.validateHighlightColorメソッドが未実装のため）
 */

Deno.test("Core class should have static validateHighlightColor method", () => {
  assertExists(Core.validateHighlightColor);
  assertEquals(typeof Core.validateHighlightColor, "function");
});

Deno.test("Core.validateHighlightColor should validate string colors", () => {
  // 文字列（ハイライトグループ名）の検証
  const result1 = Core.validateHighlightColor("Normal");
  assertEquals(result1.valid, true);
  assertEquals(result1.errors.length, 0);

  const result2 = Core.validateHighlightColor("MyGroup");
  assertEquals(result2.valid, true);
  assertEquals(result2.errors.length, 0);
});

Deno.test("Core.validateHighlightColor should reject invalid string colors", () => {
  // 無効な文字列の検証
  const result1 = Core.validateHighlightColor("");
  assertEquals(result1.valid, false);
  assert(result1.errors.length > 0);

  const result2 = Core.validateHighlightColor("123Invalid");
  assertEquals(result2.valid, false);
  assert(result2.errors.length > 0);
});

Deno.test("Core.validateHighlightColor should validate object colors", () => {
  // オブジェクト形式の色設定の検証
  const result1 = Core.validateHighlightColor({ fg: "red", bg: "blue" });
  assertEquals(result1.valid, true);
  assertEquals(result1.errors.length, 0);

  const result2 = Core.validateHighlightColor({ fg: "#ff0000" });
  assertEquals(result2.valid, true);
  assertEquals(result2.errors.length, 0);
});

/**
 * TDD RED Phase: Core.generateHighlightCommand static method tests
 * sub2-1-6: これらのテストは最初失敗する（Core.generateHighlightCommandメソッドが未実装のため）
 */

Deno.test("Core class should have static generateHighlightCommand method", () => {
  assertExists(Core.generateHighlightCommand);
  assertEquals(typeof Core.generateHighlightCommand, "function");
});

Deno.test("Core.generateHighlightCommand should generate link commands for strings", () => {
  // 文字列（ハイライトグループ名）の場合のlinkコマンド生成
  const result = Core.generateHighlightCommand("MyGroup", "Normal");
  assertEquals(result, "highlight default link MyGroup Normal");
});

Deno.test("Core.generateHighlightCommand should generate color commands for objects", () => {
  // オブジェクト形式の場合の色指定コマンド生成
  const result1 = Core.generateHighlightCommand("MyGroup", { fg: "red" });
  assertEquals(result1, "highlight MyGroup ctermfg=Red guifg=Red");

  const result2 = Core.generateHighlightCommand("MyGroup", { fg: "#ff0000" });
  assertEquals(result2, "highlight MyGroup guifg=#ff0000");
});

/**
 * TDD RED Phase: Core.validateHighlightConfig static method tests
 * sub2-1-7: これらのテストは最初失敗する（Core.validateHighlightConfigメソッドが未実装のため）
 */

Deno.test("Core class should have static validateHighlightConfig method", () => {
  assertExists(Core.validateHighlightConfig);
  assertEquals(typeof Core.validateHighlightConfig, "function");
});

Deno.test("Core.validateHighlightConfig should validate valid configs", () => {
  // 有効な設定の検証
  const result1 = Core.validateHighlightConfig({
    highlightHintMarker: "Search",
    highlightHintMarkerCurrent: "Visual"
  });
  assertEquals(result1.valid, true);
  assertEquals(result1.errors.length, 0);
});

Deno.test("Core.validateHighlightConfig should reject invalid configs", () => {
  // 無効な設定の検証
  const result1 = Core.validateHighlightConfig({
    highlightHintMarker: ""
  });
  assertEquals(result1.valid, false);
  assert(result1.errors.length > 0);
});

/**
 * TDD RED Phase: Core.getMinLengthForKey static method tests
 * sub2-2-1: これらのテストは最初失敗する（Core.getMinLengthForKeyメソッドが未実装のため）
 */
Deno.test("Core.getMinLengthForKey should return correct min length for key", () => {
  const config = {motionCount: 3,
    perKeyMinLength: { f: 4, t: 2, w: 3 }
  } as any; // Test config

  assertEquals(Core.getMinLengthForKey(config, "f"), 4);
  assertEquals(Core.getMinLengthForKey(config, "t"), 2);
  assertEquals(Core.getMinLengthForKey(config, "w"), 3);
  assertEquals(Core.getMinLengthForKey(config, "x"), 3); // defaultMinWordLength from config.defaultMinWordLength
});

Deno.test("Core.getMinLengthForKey should work with UnifiedConfig", () => {
  const unifiedConfig = {
    motionCount: 3,
    perKeyMinLength: { f: 5 },
    defaultMinWordLength: 3
  } as any; // Test config

  assertEquals(Core.getMinLengthForKey(unifiedConfig, "f"), 5);
  assertEquals(Core.getMinLengthForKey(unifiedConfig, "w"), 3); // default min word length
});

Deno.test("Core.getMinLengthForKey should return default when no config", () => {
  const config = {motionCount: 3 } as any; // Test config
  assertEquals(Core.getMinLengthForKey(config, "f"), 3); // default value from config.defaultMinWordLength
});

/**
 * TDD RED Phase: Core.getMotionCountForKey static method tests
 * sub2-2-2: これらのテストは最初失敗する（Core.getMotionCountForKeyメソッドが未実装のため）
 */
Deno.test("Core.getMotionCountForKey should return correct motion count for key", () => {
  const config = {motionCount: 3,
    perKeyMotionCount: { f: 5, t: 2, w: 4 }
  } as any; // Test config

  assertEquals(Core.getMotionCountForKey("f", config), 5);
  assertEquals(Core.getMotionCountForKey("t", config), 2);
  assertEquals(Core.getMotionCountForKey("w", config), 4);
  assertEquals(Core.getMotionCountForKey("x", config), 3); // fallback to motionCount
});

Deno.test("Core.getMotionCountForKey should work with UnifiedConfig", () => {
  const unifiedConfig = {
    motionCount: 5,
    perKeyMotionCount: { f: 7 },
    defaultMotionCount: 4
  } as any; // Test config

  assertEquals(Core.getMotionCountForKey("f", unifiedConfig), 7);
  assertEquals(Core.getMotionCountForKey("w", unifiedConfig), 4); // default motion count
});

Deno.test("Core.getMotionCountForKey should validate values", () => {
  const config = {motionCount: 3,
    perKeyMotionCount: { f: 0, t: -1, w: 2.5, x: 4 }
  } as any; // Test config

  assertEquals(Core.getMotionCountForKey("f", config), 3); // invalid 0, uses fallback
  assertEquals(Core.getMotionCountForKey("t", config), 3); // invalid negative, uses fallback
  assertEquals(Core.getMotionCountForKey("w", config), 3); // invalid non-integer, uses fallback
  assertEquals(Core.getMotionCountForKey("x", config), 4); // valid integer
});

Deno.test("Core.getMotionCountForKey should return final default when no config", () => {
  const config = {} as any; // Test config
  assertEquals(Core.getMotionCountForKey("f", config), 3); // final default value
});

/**
 * Phase 6: Display Functions Tests (TDD RED phase - sub2-3)
 * 表示関連の機能のテスト実装
 * displayHintsAsync, isRenderingHints, abortCurrentRendering, highlightCandidateHintsAsync
 */

// sub2-3-1: displayHintsAsync機能のテスト
Deno.test("Core class should have displayHintsAsync method", () => {
  const core = Core.getInstance();
  assertExists(core.displayHintsAsync);
});

Deno.test("Core displayHintsAsync should display hints asynchronously", async () => {
  Core.resetForTesting();
  const core = Core.getInstance({ enabled: true });
  const mockDenops = new MockDenops();

  // Setup basic mocks for display
  mockDenops.setCallResponse("bufnr", () => 1);
  mockDenops.setCallResponse("nvim_create_namespace", () => 1);
  mockDenops.setCallResponse("nvim_buf_set_extmark", () => 1);

  const hintMappings = [
    {
      hint: "A",
      word: { text: "test", line: 1, col: 1, byteCol: 1 },
      hintCol: 1,
      hintByteCol: 1
    }
  ];

  // Should complete without error
  await core.displayHintsAsync(mockDenops as any, hintMappings, { mode: "normal" });

  // Clean up
  core.cleanup();
});

Deno.test("Core displayHintsAsync should handle abort signal", async () => {
  Core.resetForTesting();
  const core = Core.getInstance({ enabled: true });
  const mockDenops = new MockDenops();

  // Setup mocks
  mockDenops.setCallResponse("bufnr", () => 1);
  mockDenops.setCallResponse("nvim_create_namespace", () => 1);

  const hintMappings = [
    {
      hint: "A",
      word: { text: "test", line: 1, col: 1, byteCol: 1 },
      hintCol: 1,
      hintByteCol: 1
    }
  ];

  // Start async display then abort
  const abortController = new AbortController();
  const displayPromise = core.displayHintsAsync(mockDenops as any, hintMappings, { mode: "normal" }, abortController.signal);
  abortController.abort();

  // Should handle abort gracefully
  await displayPromise;

  // Clean up
  core.cleanup();
});

// sub2-3-2: isRenderingHints機能のテスト
Deno.test("Core class should have isRenderingHints method", () => {
  const core = Core.getInstance();
  assertExists(core.isRenderingHints);
});

Deno.test("Core isRenderingHints should return rendering status", async () => {
  Core.resetForTesting();
  const core = Core.getInstance({ enabled: true });
  const mockDenops = new MockDenops();

  // Initially should not be rendering
  assertEquals(core.isRenderingHints(), false);

  // Setup mocks for async display
  mockDenops.setCallResponse("bufnr", () => 1);
  mockDenops.setCallResponse("nvim_create_namespace", () => 1);
  mockDenops.setCallResponse("nvim_buf_set_extmark", () => 1);

  const hintMappings = [
    {
      hint: "A",
      word: { text: "test", line: 1, col: 1, byteCol: 1 },
      hintCol: 1,
      hintByteCol: 1
    }
  ];

  // Start async display
  const displayPromise = core.displayHintsAsync(mockDenops as any, hintMappings, { mode: "normal" });

  // Should be rendering during async operation
  // Note: Due to async nature, this may or may not be true depending on timing

  await displayPromise;

  // After completion, should not be rendering
  assertEquals(core.isRenderingHints(), false);

  // Clean up
  core.cleanup();
});

// sub2-3-3: abortCurrentRendering機能のテスト
Deno.test("Core class should have abortCurrentRendering method", () => {
  const core = Core.getInstance();
  assertExists(core.abortCurrentRendering);
});

Deno.test("Core abortCurrentRendering should abort ongoing rendering", async () => {
  Core.resetForTesting();
  const core = Core.getInstance({ enabled: true });
  const mockDenops = new MockDenops();

  // Setup mocks with delay to ensure rendering takes time
  mockDenops.setCallResponse("bufnr", () => 1);
  mockDenops.setCallResponse("nvim_create_namespace", () => 1);
  mockDenops.setCallResponse("nvim_buf_set_extmark", async () => {
    await new Promise(resolve => setTimeout(resolve, 50)); // Add delay
    return 1;
  });

  const hintMappings = Array.from({ length: 10 }, (_, i) => ({
    hint: String.fromCharCode(65 + i), // A, B, C...
    word: { text: `test${i}`, line: 1, col: 1 + i, byteCol: 1 + i },
    hintCol: 1 + i,
    hintByteCol: 1 + i
  }));

  // Start async display
  const displayPromise = core.displayHintsAsync(mockDenops as any, hintMappings, { mode: "normal" });

  // Immediately abort
  core.abortCurrentRendering();

  // Should complete without error (aborted)
  await displayPromise;

  // Clean up
  core.cleanup();
});

// sub2-3-4: highlightCandidateHintsAsync機能のテスト
Deno.test("Core class should have highlightCandidateHintsAsync method", () => {
  const core = Core.getInstance();
  assertExists(core.highlightCandidateHintsAsync);
});

Deno.test("Core highlightCandidateHintsAsync should highlight matching hints", async () => {
  Core.resetForTesting();
  const core = Core.getInstance({ enabled: true });
  const mockDenops = new MockDenops();

  // Setup mocks for highlighting
  mockDenops.setCallResponse("bufnr", () => 1);
  mockDenops.setCallResponse("nvim_create_namespace", () => 1);
  mockDenops.setCallResponse("nvim_buf_set_extmark", () => 1);
  mockDenops.setCallResponse("nvim_buf_clear_namespace", () => undefined);

  const hintMappings = [
    {
      hint: "AA",
      word: { text: "test1", line: 1, col: 1, byteCol: 1 },
      hintCol: 1,
      hintByteCol: 1
    },
    {
      hint: "AB",
      word: { text: "test2", line: 2, col: 1, byteCol: 1 },
      hintCol: 1,
      hintByteCol: 1
    },
    {
      hint: "BA",
      word: { text: "test3", line: 3, col: 1, byteCol: 1 },
      hintCol: 1,
      hintByteCol: 1
    }
  ];

  // Should highlight hints starting with "A"
  await core.highlightCandidateHintsAsync(mockDenops as any, hintMappings, "A", { mode: "normal" });

  // Clean up
  core.cleanup();
});

Deno.test("Core highlightCandidateHintsAsync should handle empty partial input", async () => {
  Core.resetForTesting();
  const core = Core.getInstance({ enabled: true });
  const mockDenops = new MockDenops();

  // Setup mocks
  mockDenops.setCallResponse("bufnr", () => 1);
  mockDenops.setCallResponse("nvim_create_namespace", () => 1);

  const hintMappings = [
    {
      hint: "A",
      word: { text: "test", line: 1, col: 1, byteCol: 1 },
      hintCol: 1,
      hintByteCol: 1
    }
  ];

  // Should handle empty input gracefully
  await core.highlightCandidateHintsAsync(mockDenops as any, hintMappings, "", { mode: "normal" });

  // Clean up
  core.cleanup();
});

// ========================================
// sub2-5: Dispatcher Integration Functions Tests
// TDD Red Phase: Tests for dispatcher integration
// ========================================

// sub2-5-1: updateConfig method integration tests
Deno.test("Core updateConfig method should work correctly", () => {
  Core.resetForTesting();
  const core = Core.getInstance({ enabled: false });

  // Initial state
  assertEquals(core.getConfig().enabled, false);

  // Update config
  core.updateConfig({ enabled: true, motionCount: 5 });

  // Verify changes
  const updatedConfig = core.getConfig();
  assertEquals(updatedConfig.enabled, true);
  assertEquals(updatedConfig.motionCount, 5);
});

Deno.test("Core updateConfig should handle partial updates", () => {
  Core.resetForTesting();
  const core = Core.getInstance({ enabled: true, motionCount: 2, useJapanese: false });

  // Update only one field
  core.updateConfig({motionCount: 3 });

  const config = core.getConfig();
  assertEquals(config.enabled, true); // Unchanged
  assertEquals(config.motionCount, 3); // Changed
  assertEquals(config.useJapanese, false); // Unchanged
});

// sub2-5-2: showHints method waitForUserInput integration tests
Deno.test("Core showHints should include user input waiting", async () => {
  Core.resetForTesting();
  const core = Core.getInstance({ enabled: true, motionCount: 1 });
  const mockDenops = new MockDenops();

  // Setup mocks for showHints workflow
  mockDenops.setCallResponse("bufnr", () => 1);
  mockDenops.setCallResponse("bufexists", () => 1);
  mockDenops.setCallResponse("getbufvar", () => 0);
  mockDenops.setCallResponse("nvim_create_namespace", () => 1);
  mockDenops.setCallResponse("nvim_buf_set_extmark", () => 1);
  mockDenops.setCallResponse("line", () => 10);
  mockDenops.setCallResponse("getchar", () => 65); // 'A' key
  mockDenops.setCallResponse("cursor", () => true);

  // Mock word detection
  const mockWords = [
    { text: "test", line: 1, col: 1, byteCol: 1 }
  ];

  // Set up Core to return mock words for detectWordsOptimized
  const originalDetectWords = core.detectWordsOptimized;
  core.detectWordsOptimized = async () => mockWords;

  try {
    // This should complete the full workflow including waitForUserInput
    await core.showHints(mockDenops as any);

    // Hints should have been shown and user input processed
    assertEquals(core.isHintsVisible(), false); // Should be hidden after jump
  } finally {
    // Restore original method
    core.detectWordsOptimized = originalDetectWords;
    core.cleanup();
  }
});

// sub2-5-3: hideHints method integration tests
Deno.test("Core hideHints should clear extmarks in Neovim", async () => {
  Core.resetForTesting();
  const core = Core.getInstance({ enabled: true });
  const mockDenops = new MockDenops();

  // Setup Neovim environment
  mockDenops.meta.host = "nvim";
  mockDenops.setCallResponse("bufnr", () => 1);
  mockDenops.setCallResponse("nvim_create_namespace", () => 1);
  mockDenops.setCallResponse("nvim_buf_clear_namespace", () => true);

  // Set some hints as active
  const testHints = [
    {
      hint: "A",
      word: { text: "test", line: 1, col: 1, byteCol: 1 },
      hintCol: 1,
      hintByteCol: 1
    }
  ];
  core.setCurrentHints(testHints);
  assertEquals(core.isHintsVisible(), true);

  // hideHints should clear Neovim extmarks and reset state
  await core.hideHintsOptimized(mockDenops as any);

  assertEquals(core.isHintsVisible(), false);
  assertEquals(core.getCurrentHints().length, 0);

  // Verify nvim_buf_clear_namespace was called
  const calls = mockDenops.getCalls();
  const clearCalls = calls.filter(call => call.fn === "nvim_buf_clear_namespace");
  assert(clearCalls.length > 0, "nvim_buf_clear_namespace should have been called");
});

Deno.test("Core hideHints should clear matches in Vim", async () => {
  Core.resetForTesting();
  const core = Core.getInstance({ enabled: true });
  const mockDenops = new MockDenops();

  // Setup Vim environment
  mockDenops.meta.host = "vim";
  mockDenops.setCallResponse("getmatches", () => [
    { id: 1, group: "HellshakeYanoMarker" },
    { id: 2, group: "HellshakeYanoMarker" }
  ]);
  mockDenops.setCallResponse("matchdelete", () => true);

  // Set some hints as active
  const testHints = [
    {
      hint: "A",
      word: { text: "test", line: 1, col: 1, byteCol: 1 },
      hintCol: 1,
      hintByteCol: 1
    }
  ];
  core.setCurrentHints(testHints);
  assertEquals(core.isHintsVisible(), true);

  // hideHints should clear Vim matches and reset state
  await core.hideHintsOptimized(mockDenops as any);

  assertEquals(core.isHintsVisible(), false);
  assertEquals(core.getCurrentHints().length, 0);

  // Verify matchdelete was called
  const calls = mockDenops.getCalls();
  const deleteCalls = calls.filter(call => call.fn === "matchdelete");
  assert(deleteCalls.length > 0, "matchdelete should have been called");
});

// sub2-5-4: clearCache method implementation tests
Deno.test("Core clearCache method should exist", () => {
  Core.resetForTesting();
  const core = Core.getInstance();
  assertExists(core.clearCache);
});

Deno.test("Core clearCache should clear internal caches", () => {
  Core.resetForTesting();
  const core = Core.getInstance();

  // Set up some cached data
  const testHints = [
    {
      hint: "A",
      word: { text: "test", line: 1, col: 1, byteCol: 1 },
      hintCol: 1,
      hintByteCol: 1
    }
  ];
  core.setCurrentHints(testHints);

  // Clear cache should reset hints and internal cache state
  core.clearCache();

  // Verify cache was cleared
  assertEquals(core.getCurrentHints().length, 0);
  assertEquals(core.isHintsVisible(), false);
});

// sub2-5-5: debug method integration tests
Deno.test("Core debug method should collect comprehensive info", () => {
  Core.resetForTesting();
  const core = Core.getInstance({
    enabled: true,
    motionCount: 2,
    debugMode: true
  });

  // Set up some state
  const testHints = [
    {
      hint: "A",
      word: { text: "test", line: 1, col: 1, byteCol: 1 },
      hintCol: 1,
      hintByteCol: 1
    }
  ];
  core.setCurrentHints(testHints);

  // Collect debug info
  const debugInfo = core.collectDebugInfo();

  // Verify debug info structure
  assertExists(debugInfo);
  assertExists(debugInfo.config);
  assertExists(debugInfo.metrics);
  assertExists(debugInfo.currentHints);
  assertEquals(typeof debugInfo.hintsVisible, "boolean");
  assertEquals(typeof debugInfo.timestamp, "number");

  // Verify content
  assertEquals(debugInfo.hintsVisible, true);
  assertEquals(debugInfo.currentHints.length, 1);
  assertEquals(debugInfo.currentHints[0].hint, "A");
  assertEquals(debugInfo.config.enabled, true);
  assertEquals(debugInfo.config.motionCount, 2);
});

// Integration test: waitForUserInput critical bug fix
Deno.test("showHints should call waitForUserInput after display", async () => {
  Core.resetForTesting();
  const core = Core.getInstance({ enabled: true, motionCount: 1 });
  const mockDenops = new MockDenops();

  let waitForUserInputCalled = false;
  let displayCompleted = false;

  // Setup mocks
  mockDenops.setCallResponse("bufnr", () => 1);
  mockDenops.setCallResponse("bufexists", () => 1);
  mockDenops.setCallResponse("getbufvar", () => 0);
  mockDenops.setCallResponse("nvim_create_namespace", () => 1);
  mockDenops.setCallResponse("nvim_buf_set_extmark", () => {
    displayCompleted = true;
    return 1;
  });
  mockDenops.setCallResponse("line", () => 10);
  mockDenops.setCallResponse("getchar", () => {
    waitForUserInputCalled = true;
    return 27; // ESC to exit
  });

  // Mock word detection to return a test word
  const originalDetectWords = core.detectWordsOptimized;
  core.detectWordsOptimized = async () => [
    { text: "test", line: 1, col: 1, byteCol: 1 }
  ];

  // Mock waitForUserInput to track when it's called
  const originalWaitForInput = core.waitForUserInput;
  core.waitForUserInput = async (denops) => {
    // Ensure display was completed before this is called
    assert(displayCompleted, "Display should be completed before waitForUserInput");
    waitForUserInputCalled = true;
    return originalWaitForInput.call(core, denops);
  };

  try {
    await core.showHints(mockDenops as any);

    // Verify the sequence: display completed, then waitForUserInput was called
    assert(displayCompleted, "Display should have completed");
    assert(waitForUserInputCalled, "waitForUserInput should have been called after display");
  } finally {
    // Restore original methods
    core.detectWordsOptimized = originalDetectWords;
    core.waitForUserInput = originalWaitForInput;
    core.cleanup();
  }
});
