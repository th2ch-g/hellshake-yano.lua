/**
 * @fileoverview TDD Tests for waitForUserInput async highlighting implementation
 * RED phase - failing tests for process2 sub1 implementation
 */

import { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import { assertEquals, assertExists, assertRejects } from "https://deno.land/std@0.201.0/assert/mod.ts";
import { delay } from "https://deno.land/std@0.201.0/async/delay.ts";
import type { HintMapping, Word } from "../denops/hellshake-yano/types.ts";
import { Core } from "../denops/hellshake-yano/core.ts";
import { getDefaultConfig } from "../denops/hellshake-yano/config.ts";

// Mock Denops interface for waitForUserInput testing
class MockDenopsForInput implements Partial<Denops> {
  meta: { host: "nvim" | "vim"; mode: "release"; version: string; platform: "mac" };
  private callHistory: Array<{ method: string; args: any[] }> = [];
  private inputQueue: number[] = [];
  private currentInputIndex = 0;

  constructor(host: "nvim" | "vim" = "nvim") {
    this.meta = { host, mode: "release" as const, version: "0.0.0", platform: "mac" as const };
  }

  // キュー化された入力をセット
  setInputQueue(inputs: number[]) {
    this.inputQueue = inputs;
    this.currentInputIndex = 0;
  }

  async call(method: string, ...args: any[]): Promise<any> {
    this.callHistory.push({ method, args });

    if (method === "getchar") {
      if (this.currentInputIndex < this.inputQueue.length) {
        const input = this.inputQueue[this.currentInputIndex];
        this.currentInputIndex++;
        return input;
      }
      // タイムアウト模擬
      await delay(2100);
      return -2; // timeout
    }

    // その他のメソッドのモック
    switch (method) {
      case "bufnr":
        return 1;
      case "nvim_create_namespace":
        return 1;
      case "nvim_buf_set_extmark":
        return 1;
      default:
        return 1;
    }
  }

  getCallHistory() {
    return this.callHistory;
  }

  clearCallHistory() {
    this.callHistory = [];
  }
}

// Create mock hints for testing
const createMockHints = (): HintMapping[] => [
  {
    hint: "a",
    word: { line: 1, col: 1, byteCol: 1, text: "apple" } as Word,
    hintCol: 1,
    hintByteCol: 1,
  },
  {
    hint: "ab",
    word: { line: 2, col: 1, byteCol: 1, text: "about" } as Word,
    hintCol: 1,
    hintByteCol: 1,
  },
  {
    hint: "b",
    word: { line: 3, col: 1, byteCol: 1, text: "banana" } as Word,
    hintCol: 1,
    hintByteCol: 1,
  },
];

Deno.test("waitForUserInput - RED: Should call highlightCandidateHintsAsync instead of Sync", async () => {
  // This test will initially FAIL because highlightCandidateHintsAsync doesn't exist yet
  const core = Core.getInstance();
  const mockDenops = new MockDenopsForInput();
  const mockHints = createMockHints();

  // Core のinternalSetup
  core.setCurrentHints(mockHints);
  // configはgetDefaultConfig()で初期化済み

  // 'a' → 'b' の入力をキューイング
  mockDenops.setInputQueue([97, 98]); // 'a', 'b' in ASCII

  const startTime = Date.now();

  // waitForUserInputを呼び出し（内部でhighlightCandidateHintsAsyncを呼ぶはず）
  await core.waitForUserInput(mockDenops as unknown as Denops);

  const endTime = Date.now();
  const duration = endTime - startTime;

  // 検証：highlightCandidateHintsAsyncが呼び出されたかチェック
  // （現在は失敗する - メソッドが存在しないため）
  const hasAsyncMethod = typeof (core as any).highlightCandidateHintsAsync === "function";
  assertEquals(hasAsyncMethod, true, "highlightCandidateHintsAsync method should exist");

  // fire-and-forgetなので、ハイライト処理を待たずに入力処理が続行されるべき
  assertEquals(duration < 1000, true, "Should not wait for highlighting to complete");
});

Deno.test("waitForUserInput - RED: Should use fire-and-forget pattern (no await)", async () => {
  // This test will FAIL initially - highlighting is currently synchronous
  const core = Core.getInstance();
  const mockDenops = new MockDenopsForInput();
  const mockHints = createMockHints();

  core.setCurrentHints(mockHints);
  // configはgetDefaultConfig()で初期化済み

  // 'a' の入力をキューイング
  mockDenops.setInputQueue([97]); // 'a' in ASCII

  const startTime = Date.now();

  // 現在のwaitForUserInputはhighlightCandidateHintsSyncを呼び出している
  // これをhighlightCandidateHintsAsyncに変更し、awaitを使わない実装が必要
  await core.waitForUserInput(mockDenops as unknown as Denops);

  const endTime = Date.now();
  const duration = endTime - startTime;

  // fire-and-forget実装では、ハイライト処理が完了する前に入力処理が続行される
  // 現在の同期実装ではこのテストは失敗する
  assertEquals(duration < 100, true, "Should return quickly with fire-and-forget highlighting");
});

Deno.test("waitForUserInput - RED: Should implement AbortController for cancellation", async () => {
  // This test will FAIL - AbortController is not implemented yet
  const core = Core.getInstance();
  const mockDenops = new MockDenopsForInput();
  const mockHints = createMockHints();

  core.setCurrentHints(mockHints);
  // configはgetDefaultConfig()で初期化済み

  // 連続で異なる文字を入力（'a' → 'b'）
  mockDenops.setInputQueue([97, 98]); // 'a', 'b'

  // 最初の文字入力
  await core.waitForUserInput(mockDenops as unknown as Denops);

  // 2回目の入力時に、前のハイライト処理がキャンセルされることを確認
  // AbortControllerは_renderingAbortControllerとして実装されている
  const hasAbortController = (core as any)._renderingAbortController !== undefined;
  assertEquals(hasAbortController, true, "Should have AbortController for cancelling highlights");
});

Deno.test("waitForUserInput - RED: Should continue immediately to 2nd character input", async () => {
  // This test will FAIL - current sync implementation blocks
  const core = Core.getInstance();
  const mockDenops = new MockDenopsForInput();
  const mockHints = createMockHints();

  core.setCurrentHints(mockHints);
  // configはgetDefaultConfig()で初期化済み

  // 2文字入力 'a' → 'b'
  mockDenops.setInputQueue([97, 98]); // 'a', 'b'

  const timestamps: number[] = [];

  // 元のgetcharをラップして呼び出し時間を記録
  const originalCall = mockDenops.call.bind(mockDenops);
  mockDenops.call = async function(method: string, ...args: any[]) {
    if (method === "getchar") {
      timestamps.push(Date.now());
    }
    return originalCall(method, ...args);
  };

  const startTime = Date.now();
  await core.waitForUserInput(mockDenops as unknown as Denops);
  const endTime = Date.now();

  // 2文字目の入力待機が即座に開始されることを確認
  // 現在の同期実装では、ハイライト処理が完了するまで2文字目の入力待機が遅延する
  if (timestamps.length >= 2) {
    const timeBetweenInputs = timestamps[1] - timestamps[0];
    assertEquals(timeBetweenInputs < 50, true, "Should immediately continue to 2nd character input");
  }
});

Deno.test("waitForUserInput - RED: Should be type-safe with deno check", async () => {
  // This test will FAIL - new method signature doesn't exist yet
  const core = Core.getInstance();
  const mockDenops = new MockDenopsForInput();
  const mockHints = createMockHints();

  core.setCurrentHints(mockHints);

  // Type check: highlightCandidateHintsAsync should exist and not return Promise
  const hasMethod = typeof (core as any).highlightCandidateHintsAsync === "function";
  assertEquals(hasMethod, true, "highlightCandidateHintsAsync should exist");

  if (hasMethod) {
    const result = (core as any).highlightCandidateHintsAsync(
      mockDenops as unknown as Denops,
      mockHints,
      "a",
      { mode: "normal" }
    );
    assertEquals(result, undefined, "Should return undefined (fire-and-forget)");

    // タイマーリーク防止のためクリーンアップ
    await delay(10);
    (core as any).abortCurrentRendering();
  }
});

console.log("🔴 RED Phase: waitForUserInput async highlighting tests defined (should FAIL)");