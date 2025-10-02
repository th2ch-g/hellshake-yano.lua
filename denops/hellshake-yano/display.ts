/**
 * @fileoverview Display and rendering functions for Hellshake-Yano.vim
 * Handles hint display, highlighting, and rendering operations
 */
import type { Denops } from "@denops/std";
import type { Config, HintMapping, Word } from "./types.ts";
import { assignHintsToWords, calculateHintPosition } from "./hint.ts";
import { generateHintsFromConfig, recordPerformance } from "./performance.ts";

/** ハイライト処理のバッチサイズ */
export const HIGHLIGHT_BATCH_SIZE = 15;

/** ヒントレンダリング中フラグ */
let _isRenderingHints = false;

/** ハイライト処理のペンディングタイマー ID */
let pendingHighlightTimerId: number | undefined;

/**
 * ヒントのレンダリング中かどうかを確認する
 * @returns レンダリング中の場合 true
 */
export function isRenderingHints(): boolean {
  return _isRenderingHints;
}

/**
 * 現在のレンダリングを中止する
 */
export function abortCurrentRendering(): void {
  _isRenderingHints = false;
}

/**
 * テスト環境の検出とバッファ時間の設定
 * テスト環境では競合を防ぐため、より長いタイムアウトを使用
 * @returns タイムアウト遅延時間（ミリ秒）
 */
function getTimeoutDelay(): number {
  // Deno テスト環境またはCI環境を検出
  const isDeno = typeof Deno !== "undefined";
  const isTest = isDeno && (Deno.env?.get?.("DENO_TEST") === "1" || Deno.args?.includes?.("test"));
  const isCI = isDeno && Deno.env?.get?.("CI") === "true";

  // テスト環境では20ms、CI環境では30ms、本番では0ms
  if (isCI) return 30;
  if (isTest) return 20;
  return 0;
}

/**
 * テスト用のクリーンアップ関数
 * ペンディング中のタイマーをクリアする
 */
export function cleanupPendingTimers(): void {
  if (pendingHighlightTimerId !== undefined) {
    clearTimeout(pendingHighlightTimerId);
    pendingHighlightTimerId = undefined;
  }
}

/**
 * 最適化されたヒント表示
 * @param denops - Denops インスタンス
 * @param words - 対象の単語配列
 * @param hints - ヒント配列
 * @param config - プラグイン設定
 * @param extmarkNamespace - Neovim の extmark 名前空間（オプション）
 * @param fallbackMatchIds - matchadd のフォールバック ID 配列（オプション）
 * @param currentHints - 現在のヒントマッピング（更新用）
 * @param hintsVisible - ヒント表示状態（更新用）
 * @returns 生成されたヒントマッピング配列
 */
export async function displayHintsOptimized(
  denops: Denops,
  words: Word[],
  hints: string[],
  config: Config,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
  currentHints?: HintMapping[],
  hintsVisible?: { value: boolean },
): Promise<HintMapping[]> {
  // カーソル位置を取得 (実際のカーソル位置を使用)
  // getpos('.')は [bufnum, lnum, col, off] の形式を返す
  const cursorPos = await denops.call("getpos", ".") as [number, number, number, number];
  const cursorLine = cursorPos[1];
  const cursorCol = cursorPos[2];

  // ヒントが不足している場合、設定に基づいて追加生成
  let actualHints = hints;
  if (hints.length < words.length) {
    actualHints = generateHintsFromConfig(words.length, config);
  }

  const newHints = assignHintsToWords(words, actualHints, cursorLine, cursorCol, "normal");
  if (currentHints) {
    currentHints.length = 0;
    currentHints.push(...newHints);
  }
  if (hintsVisible) {
    hintsVisible.value = true;
  }
  await displayHintsBatched(denops, newHints, config, extmarkNamespace, fallbackMatchIds);
  return newHints;
}

/**
 * 非同期でヒントを表示する
 * @param denops - Denops インスタンス
 * @param config - プラグイン設定
 * @param hints - ヒントマッピング配列
 * @param extmarkNamespace - Neovim の extmark 名前空間（オプション）
 * @param fallbackMatchIds - matchadd のフォールバック ID 配列（オプション）
 * @returns Promise
 */
export function displayHintsAsync(
  denops: Denops,
  config: Config,
  hints: HintMapping[],
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
): Promise<void> {
  return displayHintsBatched(denops, hints, config, extmarkNamespace, fallbackMatchIds);
}

/**
 * バッチ処理でヒントを表示する
 * @param denops - Denops インスタンス
 * @param hints - ヒントマッピング配列
 * @param config - プラグイン設定
 * @param extmarkNamespace - Neovim の extmark 名前空間（オプション）
 * @param fallbackMatchIds - matchadd のフォールバック ID 配列（オプション）
 */
async function displayHintsBatched(
  denops: Denops,
  hints: HintMapping[],
  config: Config,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
): Promise<void> {
  _isRenderingHints = true;
  try {
    // デバッグ: 記号ヒントの検出
    const symbolHints = hints.filter(h =>
      [';', ':', '[', ']', "'", '"', ',', '.', '/', '\\', '-', '=', '`', '@'].includes(h.hint)
    );
    if (symbolHints.length > 0 && config.debug) {
      console.log(`[hellshake-yano] Symbol hints detected: ${symbolHints.map(h => h.hint).join(', ')}`);
    }

    for (let i = 0; i < hints.length; i += HIGHLIGHT_BATCH_SIZE) {
      if (!_isRenderingHints) break;
      const batch = hints.slice(i, i + HIGHLIGHT_BATCH_SIZE);
      if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
        await processExtmarksBatched(denops, batch, config, extmarkNamespace);
      } else if (fallbackMatchIds) {
        await processMatchaddBatched(denops, batch, config, fallbackMatchIds);
      }
      if (i + HIGHLIGHT_BATCH_SIZE < hints.length) {
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    }
  } finally {
    _isRenderingHints = false;
  }
}

/**
 * ヒント表示をクリアする
 * @param denops - Denops インスタンス
 * @param extmarkNamespace - Neovim の extmark 名前空間（オプション）
 * @param fallbackMatchIds - matchadd のフォールバック ID 配列（オプション）
 */
async function clearHintDisplay(
  denops: Denops,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
): Promise<void> {
  if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
    await denops.call("nvim_buf_clear_namespace", 0, extmarkNamespace, 0, -1);
  } else if (fallbackMatchIds) {
    for (const matchId of fallbackMatchIds) {
      try {
        await denops.call("matchdelete", matchId);
      } catch {
        // Ignore errors for non-existent matches
      }
    }
    fallbackMatchIds.length = 0;
  }
}

/**
 * ヒントを非表示にする
 * @param denops - Denops インスタンス
 * @param extmarkNamespace - Neovim の extmark 名前空間（オプション）
 * @param fallbackMatchIds - matchadd のフォールバック ID 配列（オプション）
 * @param hintsVisible - ヒント表示状態（更新用）
 * @param currentHints - 現在のヒントマッピング（更新用）
 */
export async function hideHints(
  denops: Denops,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
  hintsVisible?: { value: boolean },
  currentHints?: HintMapping[],
): Promise<void> {
  const startTime = performance.now();
  try {
    abortCurrentRendering();
    await clearHintDisplay(denops, extmarkNamespace, fallbackMatchIds);
    if (hintsVisible) {
      hintsVisible.value = false;
    }
    if (currentHints) {
      currentHints.length = 0;
    }
  } finally {
    recordPerformance("hideHints", performance.now() - startTime);
  }
}

/**
 * 候補ヒントの非同期ハイライト処理
 * @param denops - Denops インスタンス
 * @param input - 入力文字列
 * @param hints - ヒントマッピング配列
 * @param config - プラグイン設定
 * @param extmarkNamespace - Neovim の extmark 名前空間（オプション）
 * @param fallbackMatchIds - matchadd のフォールバック ID 配列（オプション）
 * @param onComplete - 処理完了時のコールバック関数（オプション）
 */
export function highlightCandidateHintsAsync(
  denops: Denops,
  input: string,
  hints: HintMapping[],
  config: Config,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
  onComplete?: () => void,
): void {
  // 既存のタイマーをクリア
  if (pendingHighlightTimerId !== undefined) {
    clearTimeout(pendingHighlightTimerId);
    pendingHighlightTimerId = undefined;
  }

  // Fire and forget - don't return the Promise
  // 環境に応じたタイムアウト遅延を使用
  const delay = getTimeoutDelay();
  pendingHighlightTimerId = setTimeout(() => {
    pendingHighlightTimerId = undefined;
    highlightCandidateHintsOptimized(denops, input, hints, config, extmarkNamespace, fallbackMatchIds)
      .then(() => {
        // 処理完了時にコールバックを呼び出し
        if (onComplete) {
          onComplete();
        }
      })
      .catch((err) => {
        console.error("highlightCandidateHintsAsync error:", err);
        // エラーが発生してもコールバックは呼び出す
        if (onComplete) {
          onComplete();
        }
      });
  }, delay) as unknown as number;
}

/**
 * ハイブリッドハイライト処理：最初の15-20個を同期処理、残りを非同期処理
 * プロセス3実装：1文字目入力時の即時ハイライト表示
 *
 * @param denops - Denopsインスタンス
 * @param input - 入力文字列
 * @param hints - ヒントマッピング配列
 * @param config - プラグイン設定
 * @param extmarkNamespace - Neovim の extmark 名前空間（オプション）
 * @param fallbackMatchIds - matchadd のフォールバック ID 配列（オプション）
 * @param onComplete - 処理完了時のコールバック関数（オプション）
 */
export async function highlightCandidateHintsHybrid(
  denops: Denops,
  input: string,
  hints: HintMapping[],
  config: Config,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
  onComplete?: () => void,
): Promise<void> {
  const SYNC_BATCH_SIZE = 15; // 同期処理する候補数
  const candidates = hints.filter((h) => h.hint.startsWith(input));

  // 古いハイライトをクリア
  await clearHintDisplay(denops, extmarkNamespace, fallbackMatchIds);

  if (candidates.length === 0) {
    if (onComplete) onComplete();
    return;
  }

  // Phase 1: 最初の15個を同期的に処理
  const syncCandidates = candidates.slice(0, SYNC_BATCH_SIZE);
  const asyncCandidates = candidates.slice(SYNC_BATCH_SIZE);

  // 同期バッチを即座に表示
  await displayHintsBatched(denops, syncCandidates, config, extmarkNamespace, fallbackMatchIds);

  // 即座にredrawして表示を更新
  await denops.cmd("redraw");

  // Phase 2: 残りを非同期で処理（fire-and-forget）
  if (asyncCandidates.length > 0) {
    // 非同期処理を開始（awaitしない）
    queueMicrotask(async () => {
      try {
        await displayHintsBatched(denops, asyncCandidates, config, extmarkNamespace, fallbackMatchIds);
        if (onComplete) onComplete();
      } catch (err) {
        console.error("highlightCandidateHintsHybrid async error:", err);
        if (onComplete) onComplete();
      }
    });
  } else {
    // 非同期処理がない場合は同期完了時点でコールバック実行
    if (onComplete) onComplete();
  }
}

/**
 * 最適化された候補ヒントのハイライト処理
 * @param denops - Denops インスタンス
 * @param input - 入力文字列
 * @param hints - ヒントマッピング配列
 * @param config - プラグイン設定
 * @param extmarkNamespace - Neovim の extmark 名前空間（オプション）
 * @param fallbackMatchIds - matchadd のフォールバック ID 配列（オプション）
 */
async function highlightCandidateHintsOptimized(
  denops: Denops,
  input: string,
  hints: HintMapping[],
  config: Config,
  extmarkNamespace?: number,
  fallbackMatchIds?: number[],
): Promise<void> {
  const candidates = hints.filter((h) => h.hint.startsWith(input));
  await clearHintDisplay(denops, extmarkNamespace, fallbackMatchIds);
  await displayHintsBatched(denops, candidates, config, extmarkNamespace, fallbackMatchIds);
}

/**
 * Neovim extmarks を使用したバッチ処理
 * @param denops - Denops インスタンス
 * @param hints - ヒントマッピング配列
 * @param config - プラグイン設定
 * @param extmarkNamespace - extmark 名前空間
 */
async function processExtmarksBatched(
  denops: Denops,
  hints: HintMapping[],
  config: Config,
  extmarkNamespace: number,
): Promise<void> {
  for (const hint of hints) {
    const position = calculateHintPosition(hint.word, { hintPosition: "offset" });
    // 記号を含むヒントのデバッグ
    if (config.debug && [';', ':', '[', ']', "'", '"', ',', '.', '/', '\\', '-', '=', '`', '@'].includes(hint.hint)) {
      console.log(`[extmark] Displaying symbol hint: "${hint.hint}" at line ${position.line}, col ${position.col}`);
    }
    await denops.call(
      "nvim_buf_set_extmark",
      0,
      extmarkNamespace,
      position.line - 1,
      position.col - 1,
      {
        virt_text: [[hint.hint, "HellshakeYanoMarker"]],
        virt_text_pos: "overlay",
      },
    );
  }
}

/**
 * matchadd を使用したバッチ処理（フォールバック）
 * @param denops - Denops インスタンス
 * @param hints - ヒントマッピング配列
 * @param config - プラグイン設定
 * @param fallbackMatchIds - matchadd ID 配列
 */
async function processMatchaddBatched(
  denops: Denops,
  hints: HintMapping[],
  config: Config,
  fallbackMatchIds: number[],
): Promise<void> {
  for (const hint of hints) {
    const position = calculateHintPosition(hint.word, "offset");

    // 記号を含むヒントの判定（より広範囲の記号をカバー）
    const isSymbol = !hint.hint.match(/^[A-Za-z0-9]+$/);

    if (isSymbol) {
      if (config.debug || config.debugMode) {
        console.log(`[matchadd] Symbol hint detected: "${hint.hint}" at line ${position.line}, col ${position.col}`);
      }

      try {
        // 方法1: prop_typeを使用（Vim 8.2以降）
        if (await denops.call("exists", "*prop_type_add") === 1) {
          // prop_typeを作成（既存の場合はスキップ）
          try {
            await denops.call("prop_type_add", "HellshakeYanoSymbol", {
              highlight: "HellshakeYanoMarker"
            });
          } catch {
            // Already exists
          }

          // テキストプロパティを追加
          await denops.call("prop_add", position.line, position.col, {
            type: "HellshakeYanoSymbol",
            length: hint.hint.length,
            text: hint.hint
          });
        } else {
          // 方法2: 従来のmatchaddを使用（改善版エスケープ）
          // Vimパターン用の最小限のエスケープ
          let escapedHint = hint.hint;

          // 特定の記号のみエスケープ
          const needsEscape = ['\\', '.', '[', ']', '^', '$', '*'];
          if (needsEscape.some(char => hint.hint.includes(char))) {
            escapedHint = hint.hint
              .replace(/\\/g, '\\\\')
              .replace(/\./g, '\\.')
              .replace(/\[/g, '\\[')
              .replace(/\]/g, '\\]')
              .replace(/\^/g, '\\^')
              .replace(/\$/g, '\\$')
              .replace(/\*/g, '\\*');
          }

          // シンプルなパターン: 位置と長さのみ指定
          const pattern = `\\%${position.line}l\\%${position.col}c.`;
          const matchId = await denops.call("matchadd", "HellshakeYanoMarker", pattern, 10) as number;
          fallbackMatchIds.push(matchId);
        }
      } catch (error) {
        console.error(`[matchadd] Failed to display symbol "${hint.hint}":`, error);
        // フォールバック: 通常の文字として処理
        const pattern = `\\%${position.line}l\\%${position.col}c.`;
        const matchId = await denops.call("matchadd", "HellshakeYanoMarker", pattern) as number;
        fallbackMatchIds.push(matchId);
      }
    } else {
      // 通常の英数字用パターン
      const pattern = `\\%${position.line}l\\%${position.col}c.\\{${hint.hint.length}}`;
      const matchId = await denops.call("matchadd", "HellshakeYanoMarker", pattern) as number;
      fallbackMatchIds.push(matchId);
    }
  }
}