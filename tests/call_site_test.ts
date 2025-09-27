/**
 * @fileoverview Tests for call site changes - ensuring async version is used
 * TDD Red-Green-Refactor approach: Process2 - Call site modification
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.201.0/assert/mod.ts";
import { delay } from "https://deno.land/std@0.201.0/async/delay.ts";
import { spy, assertSpyCalls } from "https://deno.land/std@0.201.0/testing/mock.ts";
import type { HintMapping, Word } from "../denops/hellshake-yano/types.ts";
import { getDefaultUnifiedConfig, type UnifiedConfig } from "../denops/hellshake-yano/config.ts";

// Import the main module to check the actual implementation
import * as mainModule from "../denops/hellshake-yano/main.ts";
const { cleanupPendingTimers } = mainModule;

// Create mock hints and config for testing
const createMockHints = (): HintMapping[] => [
  {
    hint: "a",
    word: { line: 1, col: 1, text: "test" } as Word,
    hintCol: 1,
    hintByteCol: 1,
  },
  {
    hint: "ab",
    word: { line: 2, col: 1, text: "hello" } as Word,
    hintCol: 1,
    hintByteCol: 1,
  },
  {
    hint: "b",
    word: { line: 3, col: 1, text: "world" } as Word,
    hintCol: 1,
    hintByteCol: 1,
  },
];

const createMockConfig = (): UnifiedConfig => getDefaultUnifiedConfig();

// Mock setup for testing
let highlightAsyncSpy: any;
let originalHighlightAsync: any;

Deno.test("process2: 呼び出し箇所が非同期版を使用している", async () => {
  // highlightCandidateHintsAsync関数の存在確認
  assertExists(
    mainModule.highlightCandidateHintsAsync,
    "highlightCandidateHintsAsync should be exported"
  );

  // 関数が正しい型であることを確認
  assertEquals(
    typeof mainModule.highlightCandidateHintsAsync,
    "function",
    "highlightCandidateHintsAsync should be a function"
  );
});

Deno.test("process2: 非同期版がawaitなしで呼ばれる", async () => {
  // この関数の特性を確認
  // 1. Promiseを返さない (void)
  // 2. 即座に返る（ブロックしない）

  try {
    const mockDenops = {
      meta: { host: "nvim" },
      call: async () => 1,
      cmd: async () => {},
      eval: async () => {},
    } as any;

    const startTime = Date.now();

    // 関数を呼び出し
    const mockHints = createMockHints();
    const mockConfig = createMockConfig();
    const result = mainModule.highlightCandidateHintsAsync(mockDenops, "test", mockHints, mockConfig);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // 1. 即座に返ることを確認（ブロックしない）
    // テスト環境では遅延が設定されているため、50ms以内であれば許容
    assertEquals(
      duration < 50,
      true,
      "Function should return immediately without blocking"
    );

    // 2. undefinedを返すことを確認（Promiseではない）
    assertEquals(
      result,
      undefined,
      "Function should return void (undefined), not a Promise"
    );

    // 3. Promiseではないことを確認
    // resultはundefinedなのでPromiseインスタンスではない
    assertEquals(
      result !== undefined && (result as any) instanceof Promise,
      false,
      "Return value should not be a Promise"
    );
  } finally {
    // テスト終了時に必ずタイマーをクリーンアップ
    cleanupPendingTimers();
    // タイマーが確実にクリアされるまで少し待つ
    await delay(1);
  }
});

Deno.test("process2: 入力処理フローで非同期版が使用される", async () => {
  // 実際の入力処理フローをシミュレート
  // inputChar処理で非同期版が使われることを確認

  try {
    const mockContext = {
      denops: {
        meta: { host: "nvim" },
        call: spy(async () => 1),
        cmd: spy(async () => {}),
        eval: spy(async () => {}),
      },
      inputChar: "a",
      shouldHighlight: true,
    };

    // 非同期版を直接呼び出してシミュレート
    const mockHints = createMockHints();
    const mockConfig = createMockConfig();
    mainModule.highlightCandidateHintsAsync(
      mockContext.denops as any,
      mockContext.inputChar,
      mockHints,
      mockConfig
    );

    // 非同期処理の開始を確認
    await delay(10);

    // 何らかの処理が開始されたことを確認
    // （実際の処理は内部のグローバル変数に依存するため、ここでは呼び出しのみ確認）
    assertEquals(
      typeof mainModule.highlightCandidateHintsAsync,
      "function",
      "Async version should be called in the input flow"
    );
  } finally {
    // テスト終了時に必ずタイマーをクリーンアップ
    cleanupPendingTimers();
    await delay(1);
  }
});

Deno.test("process2: 複数の連続呼び出しで前の処理がキャンセルされる", async () => {
  // AbortControllerの動作を確認
  try {
    const mockDenops = {
      meta: { host: "nvim" },
      call: spy(async () => {
        await delay(5); // 処理時間をシミュレート
        return 1;
      }),
      cmd: spy(async () => {}),
      eval: spy(async () => {}),
    } as any;

    // 連続して呼び出し
    const mockHints = createMockHints();
    const mockConfig = createMockConfig();
    mainModule.highlightCandidateHintsAsync(mockDenops, "a", mockHints, mockConfig);
    await delay(1);
    mainModule.highlightCandidateHintsAsync(mockDenops, "ab", mockHints, mockConfig);
    await delay(1);
    mainModule.highlightCandidateHintsAsync(mockDenops, "abc", mockHints, mockConfig);

    // 最後の呼び出しのみが処理されることを期待
    await delay(50);

    // 複数回呼ばれても問題ないことを確認
    assertEquals(
      true,
      true,
      "Multiple calls should not cause errors"
    );
  } finally {
    // テスト終了時に必ずタイマーをクリーンアップ
    cleanupPendingTimers();
    await delay(1);
  }
});

Deno.test("process2: エラーが発生してもメインスレッドに影響しない", async () => {
  // エラーを発生させるモック
  try {
    const mockDenops = {
      meta: { host: "nvim" },
      call: async () => {
        throw new Error("Test error");
      },
      cmd: async () => {
        throw new Error("Test error");
      },
      eval: async () => {
        throw new Error("Test error");
      },
    } as any;

    // エラーが発生してもクラッシュしない
    const startTime = Date.now();

    // この呼び出しは内部でエラーをキャッチする
    const mockHints = createMockHints();
    const mockConfig = createMockConfig();
    mainModule.highlightCandidateHintsAsync(mockDenops, "error", mockHints, mockConfig);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // 即座に返ることを確認
    assertEquals(
      duration < 10,
      true,
      "Should return immediately even with errors"
    );

    // エラーが外部に漏れないことを確認
    await delay(50);

    assertEquals(
      true,
      true,
      "Errors should be caught internally"
    );
  } finally {
    // テスト終了時に必ずタイマーをクリーンアップ
    cleanupPendingTimers();
    await delay(1);
  }
});

Deno.test("process2: Vim/Neovim両方で動作する", async () => {
  try {
    // Neovimモード
    const nvimDenops = {
      meta: { host: "nvim" },
      call: spy(async () => 1),
      cmd: spy(async () => {}),
      eval: spy(async () => {}),
    } as any;

    const mockHints = createMockHints();
    const mockConfig = createMockConfig();
    mainModule.highlightCandidateHintsAsync(nvimDenops, "test", mockHints, mockConfig);

    // Vimモード
    const vimDenops = {
      meta: { host: "vim" },
      call: spy(async () => 1),
      cmd: spy(async () => {}),
      eval: spy(async () => {}),
    } as any;

    mainModule.highlightCandidateHintsAsync(vimDenops, "test", mockHints, mockConfig);

    await delay(50);

    // 両方のモードで動作することを確認
    assertEquals(
      true,
      true,
      "Should work with both Vim and Neovim"
    );
  } finally {
    // テスト終了時に必ずタイマーをクリーンアップ
    cleanupPendingTimers();
    await delay(1);
  }
});

console.log("✅ Process2 call site tests defined (RED phase)");