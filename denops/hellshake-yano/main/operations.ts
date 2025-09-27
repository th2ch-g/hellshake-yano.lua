/**
 * Plugin Operations Module
 *
 * main関数から抽出された主要操作処理を担当
 * 単一責任: ヒント表示・非表示・ユーザー入力処理のコア機能のみを実行
 */

import type { Denops } from "@denops/std";
import { type Config, type UnifiedConfig } from "../config.ts";
import { detectWordsOptimized } from "../main.ts";
import { generateHintsOptimized } from "../main.ts";
import { assignHintsToWords } from "../hint.ts";
import { displayHintsOptimized, displayHintsAsync } from "../main.ts";
import { hideHints } from "../main.ts";

// グローバル状態の管理
let hintsVisible = false;
let currentHints: any[] = [];
let debounceTimeoutId: number | undefined;
let lastShowHintsTime = 0;

/**
 * ヒント表示の操作処理を作成
 *
 * @param denops - Denopsインスタンス
 * @param config - 現在の設定への参照
 * @returns ヒント操作用のdispatcher関数群
 */
export function createHintOperations(
  denops: Denops,
  config: Config,
): Record<string, (...args: unknown[]) => unknown> {
  return {
    /**
     * ヒントを表示（デバウンス機能付き）
     */
    async showHints(): Promise<void> {
      // デバウンス処理
      if (debounceTimeoutId) {
        clearTimeout(debounceTimeoutId);
      }

      debounceTimeoutId = setTimeout(async () => {
        await showHintsInternal(denops, config);
      }, config.debounceDelay || 50);
    },

    /**
     * ヒントを即座に表示
     */
    async showHintsImmediately(): Promise<void> {
      await showHintsInternal(denops, config);
    },

    /**
     * ヒントを非表示
     */
    async hideHints(): Promise<void> {
      await hideHints(denops);
      hintsVisible = false;
      currentHints = [];
    },

    /**
     * 現在のヒント情報を取得
     */
    getCurrentHints(): any[] {
      return [...currentHints];
    },

    /**
     * ヒント表示状態を取得
     */
    isHintsVisible(): boolean {
      return hintsVisible;
    },
  };
}

/**
 * ユーザー入力待機の操作処理を作成
 *
 * @param denops - Denopsインスタンス
 * @param config - 現在の設定への参照
 * @returns 入力待機用のdispatcher関数群
 */
export function createInputOperations(
  denops: Denops,
  config: Config,
): Record<string, (...args: unknown[]) => unknown> {
  return {
    /**
     * ユーザー入力を待機
     */
    async waitForUserInput(): Promise<void> {
      await waitForUserInputInternal(denops, config);
    },

    /**
     * 入力待機をキャンセル
     */
    async cancelInput(): Promise<void> {
      await hideHints(denops);
      hintsVisible = false;
      currentHints = [];
    },
  };
}

// プライベート関数

/**
 * 内部的なヒント表示処理（最適化版）
 */
async function showHintsInternal(
  denops: Denops,
  config: Config,
  mode?: string,
): Promise<void> {
  const modeString = mode || "normal";
  const startTime = performance.now();
  lastShowHintsTime = Date.now();

  await processHintDisplay(denops, config, modeString, startTime);
}

/**
 * ヒント表示の主処理
 */
async function processHintDisplay(
  denops: Denops,
  config: Config,
  mode: string,
  startTime: number,
): Promise<void> {
  // デバウンスタイムアウトをクリア
  clearDebounceTimeout();

  // キャッシュクリア
  clearHintCache();

  const maxRetries = 2;
  let retryCount = 0;

  while (retryCount <= maxRetries) {
    try {
      if (await shouldSkipHintDisplay(denops, config)) {
        return;
      }

      const words = await fetchWordsForHints(denops, config);
      if (words.length === 0) {
        await denops.cmd("echo 'No words found for hints'");
        return;
      }

      await generateAndDisplayHints(denops, config, words, mode);
      break;

    } catch (error) {
      retryCount++;
      if (retryCount > maxRetries) {
        console.error(`[hellshake-yano] Failed to show hints after ${maxRetries} retries:`, error);
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
}

/**
 * ヒント表示をスキップするかどうかをチェック
 */
async function shouldSkipHintDisplay(denops: Denops, config: Config): Promise<boolean> {
  // プラグインが無効化されている場合
  if (!config.enabled) {
    await denops.cmd("echo 'hellshake-yano is disabled'");
    return true;
  }

  // すでに表示中の場合
  if (hintsVisible) {
    return true;
  }

  // バッファの状態をチェック
  const bufnr = await denops.call("bufnr", "%") as number;
  if (bufnr === -1) {
    throw new Error("No valid buffer available");
  }

  const buftype = await denops.call("getbufvar", bufnr, "&buftype") as string;
  if (buftype && buftype !== "") {
    await denops.cmd("echo 'hellshake-yano: Cannot show hints in special buffer type'");
    return true;
  }

  return false;
}

/**
 * ヒント用の単語を取得
 */
async function fetchWordsForHints(denops: Denops, config: Config): Promise<any[]> {
  const bufnr = await denops.call("bufnr", "%") as number;
  return await detectWordsOptimized(denops, bufnr);
}

/**
 * ヒントを生成して表示
 */
async function generateAndDisplayHints(
  denops: Denops,
  config: Config,
  words: any[],
  mode: string,
): Promise<void> {
  // maxHints設定を使用してヒント数を制限
  const effectiveMaxHints = calculateEffectiveMaxHints(config);
  const limitedWords = words.slice(0, effectiveMaxHints);

  if (words.length > effectiveMaxHints) {
    await denops.cmd(
      `echo 'Too many words (${words.length}), showing first ${effectiveMaxHints} hints'`,
    );
  }

  // カーソル位置を取得
  const cursorLine = await denops.call("line", ".") as number;
  const cursorCol = await denops.call("col", ".") as number;

  // ヒントを生成
  const hints = generateHintsOptimized(limitedWords.length, config.markers);
  currentHints = assignHintsToWords(
    limitedWords,
    hints,
    cursorLine,
    cursorCol,
    mode,
    {hintPosition: config.hintPosition,
      visualHintPosition: config.visualHintPosition,
    },
  );

  // ヒントを非同期で表示（入力をブロックしない）（旧Config → UnifiedConfigに変換）
  await displayHintsAsync(denops, config as UnifiedConfig, currentHints);
  hintsVisible = true;
}

/**
 * 有効な最大ヒント数を計算
 */
function calculateEffectiveMaxHints(config: Config): number {
  if (config.useHintGroups && config.singleCharKeys && config.multiCharKeys) {
    const singleCharCount = Math.min(
      config.singleCharKeys.length,
      config.maxSingleCharHints || config.singleCharKeys.length,
    );
    const multiCharCount = config.multiCharKeys.length * config.multiCharKeys.length;
    const numberHintCount = 100; // 2桁数字ヒント
    const totalCapacity = singleCharCount + multiCharCount + numberHintCount;
    return Math.min(config.maxHints, totalCapacity);
  } else {
    return Math.min(
      config.maxHints,
      config.markers.length * config.markers.length,
    );
  }
}

/**
 * 内部的なユーザー入力待機処理
 */
async function waitForUserInputInternal(denops: Denops, config: Config): Promise<void> {
  // 実装は元のwaitForUserInput関数から移行
  // この関数も非常に大きいため、さらに分割が必要
}

// ユーティリティ関数

function clearDebounceTimeout(): void {
  if (debounceTimeoutId) {
    clearTimeout(debounceTimeoutId);
    debounceTimeoutId = undefined;
  }
}

function clearHintCache(): void {
  // キャッシュクリア処理
  // 実装は元の処理から移行
}