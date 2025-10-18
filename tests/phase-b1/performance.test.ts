/**
 * tests/phase-b1/performance.test.ts
 *
 * パフォーマンステスト
 *
 * 目的:
 *   - Phase B-1実装のパフォーマンスを測定
 *   - VimScript版との速度比較
 *   - メモリ使用量の確認
 *   - 大量データでのスケーラビリティ検証
 *
 * Process: phase-b1, sub10.2
 */

import { test } from "../testRunner.ts";
import { assertEquals } from "@std/assert";
import { VimBridge } from "../../denops/hellshake-yano/phase-b1/vim-bridge.ts";
import { UnifiedDisplay } from "../../denops/hellshake-yano/phase-b1/unified-display.ts";

/**
 * パフォーマンス測定ヘルパー
 */
function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
  const start = performance.now();
  return fn().then((result) => {
    const end = performance.now();
    return { result, timeMs: end - start };
  });
}

test("パフォーマンス: 1000単語の処理時間測定", async (denops) => {
  const bridge = new VimBridge(denops);

  // 1000単語のバッファを作成（10行 × 100単語）
  const lines: string[] = [];
  for (let i = 0; i < 10; i++) {
    const words = Array.from({ length: 100 }, (_, j) => `word${i * 100 + j + 1}`);
    lines.push(words.join(" "));
  }

  await denops.call("setline", 1, lines);

  // 処理時間を測定
  const { result: words, timeMs } = await measureTime(() => bridge.detectWords());

  // 1000単語が検出されること
  assertEquals(words.length, 1000, "1000単語が検出されること");

  // 処理時間が妥当であること（目安: 1秒以内）
  console.log(`[Performance] 1000単語の処理時間: ${timeMs.toFixed(2)}ms`);
  assertEquals(timeMs < 1000, true, "処理時間が1秒以内であること");

  await denops.cmd("echo ''");
});

test("パフォーマンス: VimScript版との速度比較", async (denops) => {
  const bridge = new VimBridge(denops);

  // テストデータを作成（100単語）
  const lines: string[] = [];
  for (let i = 0; i < 5; i++) {
    const words = Array.from({ length: 20 }, (_, j) => `test${i * 20 + j + 1}`);
    lines.push(words.join(" "));
  }

  await denops.call("setline", 1, lines);

  // VimScript版の関数が存在するか確認
  const vimFuncExists = await denops.call(
    "exists",
    "*hellshake_yano_vim#word_detector#detect_words",
  ) as number;

  if (vimFuncExists === 0) {
    await denops.cmd("echo 'Skipped (VimScript version not available)'");
    return;
  }

  // TypeScript版の処理時間を測定
  const { result: tsWords, timeMs: tsTime } = await measureTime(() => bridge.detectWords());

  // VimScript版の処理時間を測定
  const { result: vimWords, timeMs: vimTime } = await measureTime(() =>
    denops.call("hellshake_yano_vim#word_detector#detect_words") as Promise<unknown[]>
  );

  // 検出単語数が一致すること
  assertEquals(
    tsWords.length,
    (vimWords as unknown[]).length,
    "検出単語数が一致すること",
  );

  // パフォーマンス比較
  console.log(`[Performance] TypeScript版: ${tsTime.toFixed(2)}ms`);
  console.log(`[Performance] VimScript版: ${vimTime.toFixed(2)}ms`);
  console.log(
    `[Performance] 速度比: ${(vimTime / tsTime).toFixed(2)}x`,
  );

  // TypeScript版がVimScript版と同等以上の速度であることを期待
  // ただし、環境によって変動するため、警告のみ
  if (tsTime > vimTime * 2) {
    console.warn(
      `[Performance Warning] TypeScript版がVimScript版の2倍以上遅い`,
    );
  }

  await denops.cmd("echo ''");
});

test("パフォーマンス: 大量ヒント表示の処理時間", async (denops) => {
  const display = new UnifiedDisplay(denops);

  // テスト用のバッファを作成
  const lines: string[] = [];
  for (let i = 0; i < 10; i++) {
    const words = Array.from({ length: 10 }, (_, j) => `hint${i * 10 + j + 1}`);
    lines.push(words.join(" "));
  }

  await denops.call("setline", 1, lines);

  // 100個のヒントを表示する時間を測定
  const { timeMs } = await measureTime(async () => {
    for (let i = 1; i <= 10; i++) {
      for (let j = 1; j <= 10; j++) {
        await display.showHint(i, j * 7, `h${i}${j}`);
      }
    }
  });

  // 100個のヒントが表示されていること
  const count = display.getPopupCount();
  assertEquals(count, 100, "100個のヒントが表示されていること");

  console.log(`[Performance] 100個のヒント表示時間: ${timeMs.toFixed(2)}ms`);

  // 処理時間が妥当であること（目安: 2秒以内）
  assertEquals(timeMs < 2000, true, "処理時間が2秒以内であること");

  // クリーンアップ
  await display.hideAll();
  await denops.cmd("echo ''");
});

test("パフォーマンス: ヒントの非表示処理時間", async (denops) => {
  const display = new UnifiedDisplay(denops);

  // 50個のヒントを表示
  await denops.call("setline", 1, ["performance test line"]);

  for (let i = 0; i < 50; i++) {
    await display.showHint(1, i * 2 + 1, `x${i}`);
  }

  // 全ヒントを非表示にする時間を測定
  const { timeMs } = await measureTime(() => display.hideAll());

  console.log(`[Performance] 50個のヒント非表示時間: ${timeMs.toFixed(2)}ms`);

  // 処理時間が妥当であること（目安: 500ms以内）
  assertEquals(timeMs < 500, true, "処理時間が500ms以内であること");

  // 全てのヒントが非表示になっていること
  const count = display.getPopupCount();
  assertEquals(count, 0, "全てのヒントが非表示になっていること");

  await denops.cmd("echo ''");
});

test("パフォーマンス: 部分マッチフィルタリングの処理時間", async (denops) => {
  const display = new UnifiedDisplay(denops);

  // 100個のヒントを表示
  await denops.call("setline", 1, ["filter test line"]);

  const hints = [];
  for (let i = 0; i < 100; i++) {
    const hint = `${String.fromCharCode(65 + (i % 26))}${i}`;
    hints.push(hint);
    await display.showHint(1, i * 2 + 1, hint);
  }

  // 'A' で始まるヒントのみをフィルタする時間を測定
  const matches = hints.filter((h) => h.startsWith("A"));
  const { timeMs } = await measureTime(() => display.highlightPartialMatches(matches));

  console.log(
    `[Performance] 100個中${matches.length}個のフィルタリング時間: ${timeMs.toFixed(2)}ms`,
  );

  // 処理時間が妥当であること（目安: 1秒以内）
  assertEquals(timeMs < 1000, true, "処理時間が1秒以内であること");

  // 正しい数のヒントが残っていること
  const count = display.getPopupCount();
  assertEquals(count, matches.length, "フィルタリング後のヒント数が正しいこと");

  // クリーンアップ
  await display.hideAll();
  await denops.cmd("echo ''");
});

test("パフォーマンス: 連続的な単語検出の処理時間", async (denops) => {
  const bridge = new VimBridge(denops);

  // テストデータを作成
  await denops.call("setline", 1, [
    "continuous detection test line with multiple words",
  ]);

  // 10回連続で単語検出を実行し、平均時間を測定
  const times: number[] = [];

  for (let i = 0; i < 10; i++) {
    const { timeMs } = await measureTime(() => bridge.detectWords());
    times.push(timeMs);
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const maxTime = Math.max(...times);
  const minTime = Math.min(...times);

  console.log(`[Performance] 平均処理時間: ${avgTime.toFixed(2)}ms`);
  console.log(`[Performance] 最大処理時間: ${maxTime.toFixed(2)}ms`);
  console.log(`[Performance] 最小処理時間: ${minTime.toFixed(2)}ms`);

  // 平均処理時間が妥当であること（目安: 100ms以内）
  assertEquals(avgTime < 100, true, "平均処理時間が100ms以内であること");

  await denops.cmd("echo ''");
});
