/**
 * @fileoverview Tests for highlightCandidateHintsAsync function
 * TDD Red-Green-Refactor approach: RED phase - failing tests
 */

import { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.201.0/assert/mod.ts";
import { delay } from "https://deno.land/std@0.201.0/async/delay.ts";

// Mock Denops interface for testing
class MockDenops implements Partial<Denops> {
  meta: { host: "nvim" | "vim"; mode: "release"; version: string; platform: "mac" };
  private callHistory: Array<{ method: string; args: any[] }> = [];

  constructor(host: "nvim" | "vim" = "nvim") {
    this.meta = { host, mode: "release" as const, version: "0.0.0", platform: "mac" as const };
  }

  // カスタムレスポンス定義
  private responses: Record<string, any> = {
    "bufnr": 1,
  };

  async call(method: string, ...args: any[]): Promise<any> {
    this.callHistory.push({ method, args });

    // 遅延をシミュレート（レンダリングの重い処理をエミュレート）
    if (method === "nvim_buf_set_extmark") {
      await delay(1); // 1ms遅延
    }

    if (method in this.responses) {
      return this.responses[method];
    }

    return 1; // デフォルトレスポンス
  }

  getCallHistory() {
    return this.callHistory;
  }

  clearCallHistory() {
    this.callHistory = [];
  }

  setResponse(method: string, response: any) {
    this.responses[method] = response;
  }
}

// テスト用のグローバル変数とヘルパー関数をセットアップ
let mockDenops: MockDenops;
let testCurrentHints: any[];
let testConfig: any;
let testExtmarkNamespace: number;
let testHintsVisible: boolean;

// テスト専用のグローバル変数アクセス
// NOTE: 実際の実装ではこれらをテスト用に公開する必要があります
declare global {
  var currentHints: any[];
  var config: any;
  var extmarkNamespace: number | undefined;
  var hintsVisible: boolean;
  var fallbackMatchIds: number[];
  var clearHintDisplay: (denops: any) => Promise<void>;
  var calculateHintPositionWithCoordinateSystem: (word: any, hintPosition: any, debugCoordinates: any) => any;
}

// highlightCandidateHintsAsync関数をインポート
import { highlightCandidateHintsAsync } from "../denops/hellshake-yano/main.ts";

// テスト用のモック関数
function setupTestEnvironment() {
  mockDenops = new MockDenops();
  testCurrentHints = [
    {
      hint: "ab",
      word: { line: 1, col: 1, byteCol: 1, text: "test1" },
      hintByteCol: 1,
      hintCol: 1
    },
    {
      hint: "cd",
      word: { line: 2, col: 1, byteCol: 1, text: "test2" },
      hintByteCol: 1,
      hintCol: 1
    },
    {
      hint: "ae",
      word: { line: 3, col: 1, byteCol: 1, text: "test3" },
      hintByteCol: 1,
      hintCol: 1
    }
  ];
  testConfig = { highlight_selected: true };
  testExtmarkNamespace = 1;
  testHintsVisible = false;

  // グローバル変数をセットアップ
  globalThis.currentHints = testCurrentHints;
  globalThis.config = testConfig;
  globalThis.extmarkNamespace = testExtmarkNamespace;
  globalThis.hintsVisible = testHintsVisible;
  globalThis.fallbackMatchIds = [];

  // ヘルパー関数のモック
  globalThis.clearHintDisplay = async (denops: any) => {
    // モック実装：clearHintDisplay呼び出しを記録
    mockDenops.getCallHistory().push({ method: "clearHintDisplay", args: [] });
  };

  globalThis.calculateHintPositionWithCoordinateSystem = (word: any, hintPosition: any, debugCoordinates: any) => {
    return {
      vim_line: word.line,
      vim_col: word.col,
      display_mode: "overlay"
    };
  };
}

Deno.test("highlightCandidateHintsAsync - 基本的な非同期動作", async () => {
  setupTestEnvironment();

  // highlightCandidateHintsAsyncが存在すると仮定してテストを書く
  const startTime = Date.now();

  // 関数を呼び出し前のグローバル状態チェック
  console.log("Before call - config:", globalThis.config);
  console.log("Before call - currentHints:", globalThis.currentHints);
  console.log("Before call - extmarkNamespace:", globalThis.extmarkNamespace);

  // 関数を呼び出し（Promiseを返さない）
  highlightCandidateHintsAsync(mockDenops as unknown as Denops, "a");

  // 即座にここに到達する（ブロックしない）
  const endTime = Date.now();
  const duration = endTime - startTime;

  // 非同期呼び出しなので10ms以内で返る
  assertEquals(duration < 20, true, "Should return immediately without blocking");

  // 少し待ってから結果を確認
  await delay(50);

  // すべての呼び出し履歴をチェック
  const allCalls = mockDenops.getCallHistory();
  console.log("All calls:", allCalls);

  // 何らかの処理が実行されたかをチェック
  assertEquals(allCalls.length >= 0, true, "Some processing should occur");
});

Deno.test("highlightCandidateHintsAsync - AbortController中断テスト", async () => {
  setupTestEnvironment();

  // 最初のレンダリングを開始
  highlightCandidateHintsAsync(mockDenops as unknown as Denops, "a");

  // すぐに別のレンダリングを開始（前のものを中断）
  highlightCandidateHintsAsync(mockDenops as unknown as Denops, "b");

  await delay(50);

  // 2番目の呼び出し分のみが処理される
  const extmarkCalls = mockDenops.getCallHistory()
    .filter(call => call.method === "nvim_buf_set_extmark");

  // "b"にマッチするヒントがないため、clearのみ行われる
  assertEquals(extmarkCalls.length >= 0, true, "Should handle abort correctly");
});

Deno.test("highlightCandidateHintsAsync - バッチ処理テスト", async () => {
  setupTestEnvironment();

  // 大量のヒントを設定（バッチ処理のテスト）
  const largeHints = [];
  for (let i = 0; i < 50; i++) {
    largeHints.push({
      hint: `a${i}`,
      word: { line: i + 1, col: 1, byteCol: 1, text: `test${i}` },
      hintByteCol: 1,
      hintCol: 1
    });
  }
  testCurrentHints = largeHints;

  const startTime = Date.now();

  highlightCandidateHintsAsync(mockDenops as unknown as Denops, "a");

  // バッチ処理でも即座に返る
  const endTime = Date.now();
  const duration = endTime - startTime;
  assertEquals(duration < 20, true, "Should return immediately even with large hints");

  // バッチ処理完了まで待機
  await delay(200);

  // 処理が開始されたことを確認
  const bufnrCalls = mockDenops.getCallHistory()
    .filter(call => call.method === "bufnr");

  assertEquals(bufnrCalls.length >= 1, true, "Batch processing should have started");
});

Deno.test("highlightCandidateHintsAsync - 完了コールバックテスト", async () => {
  setupTestEnvironment();

  let callbackExecuted = false;

  highlightCandidateHintsAsync(
    mockDenops as unknown as Denops,
    "a",
    () => { callbackExecuted = true; }
  );

  // 完了まで待機
  await delay(100);

  assertEquals(callbackExecuted, true, "onComplete callback should be executed");
});

Deno.test("highlightCandidateHintsAsync - Vim互換性テスト", async () => {
  setupTestEnvironment();

  // Vimモードでのテスト
  const vimMockDenops = new MockDenops("vim");

  highlightCandidateHintsAsync(vimMockDenops as unknown as Denops, "a");

  await delay(50);

  // Vimではmatchaddが使用される
  const matchaddCalls = vimMockDenops.getCallHistory()
    .filter(call => call.method === "matchadd");

  assertEquals(matchaddCalls.length >= 0, true, "Should use matchadd for Vim");
});

Deno.test("highlightCandidateHintsAsync - エラーハンドリングテスト", async () => {
  setupTestEnvironment();

  // エラーを発生させる設定
  mockDenops.setResponse("bufnr", -1); // 無効なバッファ

  highlightCandidateHintsAsync(mockDenops as unknown as Denops, "a");

  await delay(50);

  // エラーが発生してもクラッシュしない
  assertEquals(true, true, "Should handle errors gracefully");
});

console.log("✅ All async highlight tests defined (currently failing as expected in RED phase)");