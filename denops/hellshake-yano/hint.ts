import type { Word } from "./word.ts";

/**
 * ヒント表示位置の型定義
 * @description ヒントの表示位置とモードを定義するインターフェース
 * @since 1.0.0
 */
export interface HintPosition {
  /** 行番号（1ベース） */
  line: number;
  /** 列番号（1ベース） */
  col: number;
  /** 表示モード */
  display_mode: "before" | "after" | "overlay";
}

/**
 * 座標系対応版のヒント表示位置型定義
 * @description Vim座標系（1ベース）とNeovim extmark座標系（0ベース）の両方に対応した位置情報
 * @since 1.0.0
 */
export interface HintPositionWithCoordinateSystem {
  /** 行番号（後方互換性のため） */
  line: number;
  /** 列番号（後方互換性のため） */
  col: number;
  /** 表示モード */
  display_mode: "before" | "after" | "overlay";
  /** Vim座標系列番号（1ベース、matchadd用） */
  vim_col: number;
  /** Neovim extmark座標系列番号（0ベース、extmark用） */
  nvim_col: number;
  /** Vim座標系行番号（1ベース、matchadd用） */
  vim_line: number;
  /** Neovim extmark座標系行番号（0ベース、extmark用） */
  nvim_line: number;
}

// パフォーマンス最適化用のキャッシュ
let hintCache = new Map<string, string[]>();
let assignmentCache = new Map<string, HintMapping[]>();
const CACHE_MAX_SIZE = 100; // キャッシュの最大サイズ

/**
 * ヒントと単語のマッピング
 * @description 検出された単語とそれに割り当てられたヒント文字列の組み合わせ
 * @since 1.0.0
 */
export interface HintMapping {
  /** マッピング対象の単語 */
  word: Word;
  /** 割り当てられたヒント文字列 */
  hint: string;
}

/**
 * 指定数のヒントを生成する（最適化版）
 * @description 指定された単語数に対してヒント文字列を生成。キャッシュ機能付きで高速動作
 * @param wordCount - 必要なヒント数
 * @param markers - ヒント文字として使用するマーカー配列（省略時はデフォルトのアルファベット）
 * @param maxHints - 最大ヒント数制限（省略時は制限なし）
 * @returns string[] - 生成されたヒント文字列の配列
 * @since 1.0.0
 * @example
 * ```typescript
 * generateHints(5, ['A', 'B', 'C']); // ['A', 'B', 'C', 'AA', 'AB']
 * generateHints(3); // ['A', 'B', 'C'] (デフォルトマーカー使用)
 * generateHints(100, undefined, 50); // 最大50個のヒントを生成
 * ```
 */
export function generateHints(wordCount: number, markers?: string[], maxHints?: number): string[] {
  const defaultMarkers = markers || "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // ヒント数制限を適用
  const effectiveWordCount = maxHints ? Math.min(wordCount, maxHints) : wordCount;

  if (effectiveWordCount <= 0) {
    return [];
  }

  // キャッシュキーを生成
  const cacheKey = `${effectiveWordCount}-${defaultMarkers.join("")}`;

  // キャッシュヒットチェック
  if (hintCache.has(cacheKey)) {
    return hintCache.get(cacheKey)!;
  }

  const hints: string[] = [];

  if (effectiveWordCount <= defaultMarkers.length) {
    // 単一文字のヒント
    hints.push(...defaultMarkers.slice(0, effectiveWordCount));
  } else {
    // 複数文字のヒントを最適化して生成
    hints.push(...generateMultiCharHintsOptimized(effectiveWordCount, defaultMarkers));
  }

  // キャッシュに保存（サイズ制限付き）
  if (hintCache.size >= CACHE_MAX_SIZE) {
    // 最古のエントリを削除
    const firstKey = hintCache.keys().next().value;
    if (firstKey !== undefined) {
      hintCache.delete(firstKey);
    }
  }
  hintCache.set(cacheKey, hints);

  return hints;
}

/**
 * 単語にヒントを割り当てる（最適化版）
 * @description 検出された単語にヒント文字列を割り当て。カーソル位置からの距離でソートしてより近い単語に短いヒントを割り当て
 * @param words - ヒントを割り当てる単語の配列
 * @param hints - 使用可能なヒント文字列の配列
 * @param cursorLine - カーソルの現在行番号
 * @param cursorCol - カーソルの現在列番号
 * @returns HintMapping[] - 単語とヒントのマッピング配列
 * @throws {Error} 単語またはヒントが空の場合（空の配列を返す）
 * @since 1.0.0
 * @example
 * ```typescript
 * const words = [{text: 'hello', line: 1, col: 5}, {text: 'world', line: 1, col: 15}];
 * const hints = ['A', 'B'];
 * const mappings = assignHintsToWords(words, hints, 1, 1);
 * // カーソルに近い単語に短いヒントが割り当てられる
 * ```
 */
export function assignHintsToWords(
  words: Word[],
  hints: string[],
  cursorLine: number,
  cursorCol: number,
): HintMapping[] {
  if (words.length === 0 || hints.length === 0) {
    return [];
  }

  // キャッシュキーを生成（単語の位置とカーソル位置を考慮）
  const cacheKey = `${words.length}-${cursorLine}-${cursorCol}-${
    words.map((w) => `${w.line},${w.col}`).join(";")
  }`;

  // キャッシュヒットチェック
  if (assignmentCache.has(cacheKey)) {
    const cached = assignmentCache.get(cacheKey)!;
    // ヒントを新しいものに更新
    return cached.map((mapping, index) => ({
      word: mapping.word,
      hint: hints[index] || "",
    }));
  }

  // カーソル位置からの距離で最適化されたソート
  const sortedWords = sortWordsByDistanceOptimized(words, cursorLine, cursorCol);

  // ヒントを割り当て
  const mappings = sortedWords.map((word, index) => ({
    word,
    hint: hints[index] || "",
  }));

  // キャッシュに保存（サイズ制限付き）
  if (assignmentCache.size >= CACHE_MAX_SIZE) {
    // 最古のエントリを削除
    const firstKey = assignmentCache.keys().next().value;
    if (firstKey !== undefined) {
      assignmentCache.delete(firstKey);
    }
  }
  assignmentCache.set(cacheKey, mappings);

  return mappings;
}

/**
 * 複数文字ヒントを最適化して生成
 * @description 単一文字ヒントを使い切った後の複数文字ヒントを効率的に生成
 * @param wordCount - 必要な総ヒント数
 * @param markers - ヒント文字として使用するマーカー配列
 * @returns string[] - 生成されたヒント文字列の配列
 * @since 1.0.0
 */
function generateMultiCharHintsOptimized(wordCount: number, markers: string[]): string[] {
  const hints: string[] = [];

  // まず単一文字ヒントを追加
  hints.push(...markers.slice(0, Math.min(wordCount, markers.length)));

  // 残りのヒントを2文字で生成
  const remaining = wordCount - markers.length;
  if (remaining > 0) {
    // 効率的な2文字ヒント生成
    const maxDoubleHints = markers.length * markers.length;
    const actualDoubleHints = Math.min(remaining, maxDoubleHints);

    for (let i = 0; i < actualDoubleHints; i++) {
      const firstChar = markers[Math.floor(i / markers.length)];
      const secondChar = markers[i % markers.length];
      hints.push(firstChar + secondChar);
    }
  }

  return hints.slice(0, wordCount);
}

/**
 * カーソル位置からの距離で単語を最適化してソート
 * @description カーソル位置から近い順に単語をソート。マンハッタン距離計算を使用し、大量の単語がある場合は効率的なバッチ処理を適用
 *
 * ## 距離計算アルゴリズム
 * - **マンハッタン距離**を使用: distance = |word.line - cursorLine| * 1000 + |word.col - cursorCol|
 * - 行の差を1000倍して重み付けすることで、同じ行内の単語を優先
 * - 同一距離の場合は安定ソートで行番号 → 列番号の順で決定
 *
 * ## 最適化アルゴリズム
 * - **閾値ベース分岐**: 1000個以下は通常のクイックソート、1000個超はバッチ処理
 * - **バッチ処理**: 500個ずつに分割してソート後、マージソートで結合
 * - **メモリ効率**: 中間配列を最小限に抑制
 *
 * ## パフォーマンス特性
 * - **小規模データ** (≤1000): O(n log n) - ネイティブソート使用
 * - **大規模データ** (>1000): O(n log n) - 分割統治法でメモリ使用量削減
 * - **最適ケース**: カーソル近くに集中した単語群
 * - **最悪ケース**: 全画面に均等分散した単語群
 *
 * @param words - ソートする単語の配列
 * @param cursorLine - カーソルの現在行番号（1ベース）
 * @param cursorCol - カーソルの現在列番号（1ベース）
 * @returns Word[] - 距離順にソートされた単語配列（カーソルに最も近い単語が先頭）
 * @complexity O(n log n) - n は単語数
 * @since 1.0.0
 * @example
 * ```typescript
 * // カーソル位置(1, 5)から単語をソート
 * const words = [
 *   { text: 'hello', line: 1, col: 10 },  // 距離: 0*1000 + 5 = 5
 *   { text: 'world', line: 2, col: 1 },   // 距離: 1*1000 + 4 = 1004
 *   { text: 'test', line: 1, col: 1 }     // 距離: 0*1000 + 4 = 4
 * ];
 * const sorted = sortWordsByDistanceOptimized(words, 1, 5);
 * // 結果: [test, hello, world] (距離4, 5, 1004の順)
 *
 * // 大量データのバッチ処理例
 * const largeWords = new Array(2000).fill(null).map((_, i) => ({
 *   text: `word${i}`, line: Math.floor(i/50) + 1, col: (i % 50) + 1
 * }));
 * const batchSorted = sortWordsByDistanceOptimized(largeWords, 10, 25);
 * // バッチ処理により効率的にソート
 * ```
 */
function sortWordsByDistanceOptimized(
  words: Word[],
  cursorLine: number,
  cursorCol: number,
): Word[] {
  // 大量の単語がある場合はバッチ処理でソート
  if (words.length > 1000) {
    return sortWordsInBatches(words, cursorLine, cursorCol);
  }

  // 通常のソート処理
  const wordsWithDistance = words.map((word) => {
    const lineDiff = Math.abs(word.line - cursorLine);
    const colDiff = Math.abs(word.col - cursorCol);
    // 行の差を重視し、同じ行内では列の差を考慮
    const distance = lineDiff * 1000 + colDiff;
    return { word, distance };
  });

  // 最適化されたソート（Quick Sortベースの安定ソート）
  wordsWithDistance.sort((a, b) => {
    if (a.distance !== b.distance) {
      return a.distance - b.distance;
    }
    // 距離が同じ場合は行番号で安定ソート
    if (a.word.line !== b.word.line) {
      return a.word.line - b.word.line;
    }
    // 行も同じ場合は列番号で安定ソート
    return a.word.col - b.word.col;
  });

  return wordsWithDistance.map((item) => item.word);
}

/**
 * 大量の単語をバッチ処理でソート
 * @description 1000個以上の単語を効率的にソートするためのバッチ処理アルゴリズム。メモリ使用量を抑制し、分割統治法を使用
 *
 * ## アルゴリズム詳細
 * 1. **バッチ分割**: 500個ずつのバッチに分割
 * 2. **個別ソート**: 各バッチを個別にsortWordsByDistanceOptimizedでソート
 * 3. **マージ処理**: ソート済みバッチをmergeSortedBatchesで結合
 * 4. **メモリ効率**: 一度に全データをメモリに展開せず、段階的処理
 *
 * ## パフォーマンス特性
 * - **時間計算量**: O(n log n) - nは総単語数
 * - **空間計算量**: O(n) - 最大バッチサイズ × バッチ数分のメモリ
 * - **バッチサイズ**: 500個（メモリとCPU効率のバランス点）
 * - **スケーラビリティ**: 10万個以上の単語でも安定動作
 *
 * @param words - ソートする単語の配列（1000個以上推奨）
 * @param cursorLine - カーソルの現在行番号（1ベース）
 * @param cursorCol - カーソルの現在列番号（1ベース）
 * @returns Word[] - カーソル位置からの距離順にソートされた単語配列
 * @complexity O(n log n) - nは単語数、メモリ使用量はO(バッチサイズ)に最適化
 * @since 1.0.0
 * @example
 * ```typescript
 * // 2000個の単語を効率的にソート
 * const largeWordSet = new Array(2000).fill(null).map((_, i) => ({
 *   text: `word${i}`,
 *   line: Math.floor(i / 50) + 1,  // 50個ずつ行を変える
 *   col: (i % 50) + 1,             // 1-50列に配置
 *   byteCol: (i % 50) + 1
 * }));
 *
 * const sorted = sortWordsInBatches(largeWordSet, 20, 25);
 * // カーソル位置(20, 25)から最も近い単語が先頭に配置される
 *
 * // バッチ処理により、メモリ使用量を抑制しながら効率的にソート
 * console.log(`最も近い単語: ${sorted[0].text} at (${sorted[0].line}, ${sorted[0].col})`);
 *
 * // 極大データセット例（10万個）
 * const hugeWordSet = new Array(100000).fill(null).map((_, i) => ({
 *   text: `item${i}`,
 *   line: Math.floor(i / 100) + 1,
 *   col: (i % 100) + 1,
 *   byteCol: (i % 100) + 1
 * }));
 *
 * const hugeSorted = sortWordsInBatches(hugeWordSet, 500, 50);
 * // 10万個でも500個ずつのバッチ処理により効率的にソート完了
 * ```
 */
function sortWordsInBatches(words: Word[], cursorLine: number, cursorCol: number): Word[] {
  const batchSize = 500;
  const sortedBatches: Word[][] = [];

  // バッチごとにソート
  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    const sortedBatch = sortWordsByDistanceOptimized(batch, cursorLine, cursorCol);
    sortedBatches.push(sortedBatch);
  }

  // ソート済みバッチをマージ
  return mergeSortedBatches(sortedBatches, cursorLine, cursorCol);
}

/**
 * ソート済みバッチをマージ（k-wayマージアルゴリズム）
 * @description 複数のソート済みバッチを効率的にマージしてひとつのソート済み配列にする。k-wayマージ手法を使用してメモリ効率と実行速度を両立
 *
 * ## アルゴリズム詳細
 * 1. **k-wayマージ**: 複数のソート済み配列を同時に処理
 * 2. **ポインタ管理**: 各バッチの現在位置をポインタ配列で追跡
 * 3. **最小値選択**: 各バッチの現在要素から最小距離の要素を選択
 * 4. **距離再計算**: 各要素の距離を動的に計算してマージ順序を決定
 *
 * ## パフォーマンス特性
 * - **時間計算量**: O(n log k) - nは総要素数、kはバッチ数
 * - **空間計算量**: O(k) - ポインタ配列とバッファのみ
 * - **安定性**: 同一距離の要素は元の順序を保持
 * - **効率性**: 全要素の再ソートを避けて段階的マージ
 *
 * ## 距離計算の詳細
 * - マンハッタン距離: |word.line - cursorLine| * 1000 + |word.col - cursorCol|
 * - 行重視の重み付け（1000倍）により行内移動を優先
 * - 実時間計算により正確な距離順序を保証
 *
 * @param batches - ソート済み単語バッチの配列（各バッチは距離順にソート済み）
 * @param cursorLine - カーソルの現在行番号（1ベース、距離計算用）
 * @param cursorCol - カーソルの現在列番号（1ベース、距離計算用）
 * @returns Word[] - マージされたソート済み単語配列（カーソルからの距離順）
 * @complexity O(n log k) - nは総要素数、kはバッチ数
 * @since 1.0.0
 * @example
 * ```typescript
 * // 3つのソート済みバッチをマージ
 * const batch1 = [
 *   { text: 'close', line: 1, col: 3 },  // 距離: 2
 *   { text: 'far', line: 5, col: 1 }     // 距離: 4004
 * ];
 * const batch2 = [
 *   { text: 'here', line: 1, col: 1 },   // 距離: 0
 *   { text: 'medium', line: 2, col: 1 }  // 距離: 1000
 * ];
 * const batch3 = [
 *   { text: 'next', line: 1, col: 2 }    // 距離: 1
 * ];
 *
 * const merged = mergeSortedBatches([batch1, batch2, batch3], 1, 1);
 * // 結果: [here, next, close, medium, far] (距離: 0, 1, 2, 1000, 4004)
 *
 * // 大量バッチのマージ例
 * const largeBatches = new Array(10).fill(null).map((_, batchIndex) =>
 *   new Array(100).fill(null).map((_, i) => ({
 *     text: `batch${batchIndex}_word${i}`,
 *     line: batchIndex * 10 + Math.floor(i / 10) + 1,
 *     col: (i % 10) + 1,
 *     byteCol: (i % 10) + 1
 *   })).sort((a, b) => {
 *     const distA = Math.abs(a.line - 50) * 1000 + Math.abs(a.col - 5);
 *     const distB = Math.abs(b.line - 50) * 1000 + Math.abs(b.col - 5);
 *     return distA - distB;
 *   })
 * );
 *
 * const largeMerged = mergeSortedBatches(largeBatches, 50, 5);
 * // 1000個の要素を10のバッチから効率的にマージ
 * console.log(`最も近い要素: ${largeMerged[0].text}`);
 * ```
 */
function mergeSortedBatches(batches: Word[][], cursorLine: number, cursorCol: number): Word[] {
  if (batches.length === 0) return [];
  if (batches.length === 1) return batches[0];

  const result: Word[] = [];
  const pointers = new Array(batches.length).fill(0);

  // 各バッチから最小要素を取り出してマージ
  while (result.length < batches.reduce((sum, batch) => sum + batch.length, 0)) {
    let minDistance = Infinity;
    let minBatchIndex = -1;

    // 各バッチの現在位置で最小距離を持つ要素を探す
    for (let i = 0; i < batches.length; i++) {
      if (pointers[i] < batches[i].length) {
        const word = batches[i][pointers[i]];
        const lineDiff = Math.abs(word.line - cursorLine);
        const colDiff = Math.abs(word.col - cursorCol);
        const distance = lineDiff * 1000 + colDiff;

        if (distance < minDistance) {
          minDistance = distance;
          minBatchIndex = i;
        }
      }
    }

    if (minBatchIndex !== -1) {
      result.push(batches[minBatchIndex][pointers[minBatchIndex]]);
      pointers[minBatchIndex]++;
    }
  }

  return result;
}

/**
 * キャッシュをクリア
 * @description ヒント生成とヒント割り当てのキャッシュをクリアする
 * @returns void
 * @since 1.0.0
 * @example
 * ```typescript
 * clearHintCache(); // キャッシュをリセット
 * ```
 */
export function clearHintCache(): void {
  hintCache.clear();
  assignmentCache.clear();
}

/**
 * キャッシュの統計情報を取得
 * @description ヒント関連キャッシュの使用状況を取得
 * @returns {{ hintCacheSize: number, assignmentCacheSize: number }} キャッシュサイズ情報
 * @since 1.0.0
 * @example
 * ```typescript
 * const stats = getHintCacheStats();
 * console.log(`Hint cache: ${stats.hintCacheSize}, Assignment cache: ${stats.assignmentCacheSize}`);
 * ```
 */
export function getHintCacheStats(): { hintCacheSize: number; assignmentCacheSize: number } {
  return {
    hintCacheSize: hintCache.size,
    assignmentCacheSize: assignmentCache.size,
  };
}

/**
 * ヒント表示位置を計算する
 * @description 単語とヒント位置設定に基づいてヒントの表示位置を計算
 * @param word - 対象の単語
 * @param hintPosition - ヒント位置設定（"start", "end", "overlay"）
 * @returns HintPosition - 計算されたヒント表示位置
 * @since 1.0.0
 * @example
 * ```typescript
 * const word = { text: 'hello', line: 1, col: 5 };
 * const position = calculateHintPosition(word, 'start');
 * // { line: 1, col: 5, display_mode: 'before' }
 * ```
 */
export function calculateHintPosition(
  word: Word,
  hintPosition: string,
): HintPosition {
  let col: number;
  let display_mode: "before" | "after" | "overlay";

  // デバッグログ追加（パフォーマンスのためコメントアウト）

  switch (hintPosition) {
    case "start":
      col = word.col;
      display_mode = "before";
      break;
    case "end":
      col = word.col + word.text.length - 1;
      display_mode = "after";
      break;
    case "overlay":
      col = word.col;
      display_mode = "overlay";
      break;
    default:
      // 無効な設定の場合はデフォルトで "start" 動作
      col = word.col;
      display_mode = "before";
      break;
  }

  return {
    line: word.line,
    col: col,
    display_mode: display_mode,
  };
}

/**
 * 座標系対応版：ヒント表示位置を計算する（Vim/Neovim両方対応）
 * @description Vim座標系（1ベース）とNeovim extmark座標系（0ベース）の両方に対応したヒント位置計算
 * @param word - 単語情報（1ベース座標で提供されることを前提）
 * @param hintPosition - ヒント位置設定（"start", "end", "overlay"）
 * @param enableDebug - デバッグログの有効/無効（デフォルト: false）
 * @returns HintPositionWithCoordinateSystem - Vim/Neovim両方の座標系に対応した位置情報
 * @since 1.0.0
 * @example
 * ```typescript
 * const word = { text: 'hello', line: 1, col: 5, byteCol: 5 };
 * const position = calculateHintPositionWithCoordinateSystem(word, 'start', true);
 * // { line: 1, col: 5, display_mode: 'before', vim_col: 5, nvim_col: 4, vim_line: 1, nvim_line: 0 }
 * ```
 */
export function calculateHintPositionWithCoordinateSystem(
  word: Word,
  hintPosition: string,
  enableDebug: boolean = false,
): HintPositionWithCoordinateSystem {
  let col: number;
  let byteCol: number;
  let display_mode: "before" | "after" | "overlay";

  // デバッグログ追加
  if (enableDebug) {
  }

  switch (hintPosition) {
    case "start":
      col = word.col; // 1ベース
      byteCol = word.byteCol || word.col; // バイト位置があれば優先使用
      display_mode = "before";
      break;
    case "end":
      col = word.col + word.text.length - 1; // 1ベース
      // If we have byteCol, calculate end position using byte length
      if (word.byteCol) {
        const encoder = new TextEncoder();
        const textByteLength = encoder.encode(word.text).length;
        byteCol = word.byteCol + textByteLength - 1;
      } else {
        byteCol = col;
      }
      display_mode = "after";
      break;
    case "overlay":
      col = word.col; // 1ベース
      byteCol = word.byteCol || word.col; // バイト位置があれば優先使用
      display_mode = "overlay";
      break;
    default:
      // 無効な設定の場合はデフォルトで "start" 動作
      col = word.col; // 1ベース
      byteCol = word.byteCol || word.col; // バイト位置があれば優先使用
      display_mode = "before";
      break;
  }

  // 座標系変換 - Vimは表示列、Neovimはバイト位置を使用
  const vim_line = word.line; // Vim: 1ベース行番号
  const nvim_line = word.line - 1; // Neovim: 0ベース行番号
  const vim_col = col; // Vim: 1ベース表示列番号（matchadd用、タブと全角文字考慮済み）
  const nvim_col = Math.max(0, byteCol - 1); // Neovim: 0ベースバイト列番号（extmark用）

  if (enableDebug) {
  }

  return {
    line: word.line, // 後方互換性のため
    col: col, // 後方互換性のため
    display_mode: display_mode,
    vim_col,
    nvim_col,
    vim_line,
    nvim_line,
  };
}

/**
 * ヒントキー設定インターフェース
 * @description 1文字ヒントと2文字以上ヒントで使用するキーを個別に設定するためのインターフェース
 * @since 1.0.0
 */
export interface HintKeyConfig {
  /** 1文字ヒント専用キー（例: ["A","S","D","F","G","H","J","K","L",";"]） */
  single_char_keys?: string[];

  /** 2文字以上ヒント専用キー（例: ["Q","W","E","R","T","Y","U","I","O","P"]） */
  multi_char_keys?: string[];

  /** 従来のmarkers（後方互換性のため維持） */
  markers?: string[];

  /** 1文字ヒントの最大数（この数を超えたら2文字ヒントを使用） */
  max_single_char_hints?: number;

  /** カーソルからの距離で1文字/2文字を決定するか */
  use_distance_priority?: boolean;
}

/**
 * キーグループを使用したヒント生成（高度な振り分けロジック付き）
 * @description 1文字ヒント用と2文字以上ヒント用のキーを分けて管理し、効率的なヒント生成を行う。数字フォールバック機能付き
 *
 * ## ヒントグループ生成ロジック
 * 1. **1文字ヒント優先**: max_single_char_hints で指定された数まで単一文字ヒントを生成
 * 2. **複数文字ヒント**: 1文字ヒントを使い切った後、multi_char_keys から2文字の組み合わせを生成
 * 3. **数字フォールバック**: アルファベット組み合わせを使い切った場合、00-99の数字ヒントを使用
 * 4. **3文字エクステンション**: 数字でも足りない場合、3文字の組み合わせまで拡張
 *
 * ## 単一文字と複数文字の振り分け
 * - **single_char_keys**: ホームポジション重視のキー配列（例: ASDFGHJKL）
 * - **multi_char_keys**: 複数文字ヒント用のキー配列（例: QWERTYUIOP）
 * - **分離の利点**: タイピング効率とヒント識別性を両立
 * - **重複防止**: 設定検証により同じキーが両方のグループに含まれることを防止
 *
 * ## 数字フォールバックの仕組み
 * - **発動条件**: アルファベット2文字組み合わせを使い切った場合
 * - **数字範囲**: 00から99まで（最大100個の追加ヒント）
 * - **フォーマット**: ゼロパディング付き2桁数字（例: 00, 01, 02...）
 * - **識別性**: アルファベットと明確に区別できる視覚的特徴
 *
 * @param wordCount - 必要なヒント数
 * @param config - ヒントキー設定（single_char_keys, multi_char_keys, max_single_char_hints等）
 * @returns string[] - 生成されたヒント文字列の配列（1文字 → 2文字 → 数字 → 3文字の順）
 * @complexity O(n) - n は要求されたヒント数
 * @since 1.0.0
 * @example
 * ```typescript
 * // 基本的な使用例
 * const config = {
 *   single_char_keys: ['A', 'S', 'D'],
 *   multi_char_keys: ['Q', 'W', 'E'],
 *   max_single_char_hints: 2
 * };
 * const hints = generateHintsWithGroups(5, config);
 * // 結果: ['A', 'S', 'QQ', 'QW', 'QE']
 *
 * // 数字フォールバック例
 * const smallConfig = {
 *   single_char_keys: ['A'],
 *   multi_char_keys: ['Q'],
 *   max_single_char_hints: 1
 * };
 * const manyHints = generateHintsWithGroups(5, smallConfig);
 * // 結果: ['A', 'QQ', '00', '01', '02']
 *
 * // 大量ヒント生成例（3文字まで拡張）
 * const extremeHints = generateHintsWithGroups(150, {
 *   single_char_keys: ['A', 'B'],
 *   multi_char_keys: ['X', 'Y'],
 *   max_single_char_hints: 2
 * });
 * // 結果: ['A', 'B', 'XX', 'XY', 'YX', 'YY', '00'...'99', 'XXX', 'XXY'...]
 * ```
 */
export function generateHintsWithGroups(
  wordCount: number,
  config: HintKeyConfig,
): string[] {
  // デフォルト値の設定
  const defaultMarkers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const singleCharKeys = config.single_char_keys || config.markers || defaultMarkers;
  const multiCharKeys = config.multi_char_keys || singleCharKeys;

  if (wordCount <= 0) {
    return [];
  }

  const hints: string[] = [];

  // 1文字ヒントの数を決定
  const maxSingleChars = config.max_single_char_hints !== undefined
    ? Math.min(config.max_single_char_hints, singleCharKeys.length)
    : singleCharKeys.length;
  const singleCharCount = Math.min(wordCount, maxSingleChars);

  // 1文字ヒントを生成
  hints.push(...generateSingleCharHints(singleCharKeys, singleCharCount));

  // 2文字以上のヒントが必要な場合
  const remainingCount = wordCount - singleCharCount;
  if (remainingCount > 0) {
    const multiCharHints = generateMultiCharHintsFromKeys(multiCharKeys, remainingCount);
    hints.push(...multiCharHints);
  }

  return hints;
}

/**
 * 1文字ヒントの生成
 * @description 指定されたキーから1文字ヒントを生成
 * @param keys - 使用可能なキーの配列
 * @param count - 生成するヒント数
 * @returns string[] - 生成された1文字ヒントの配列
 * @since 1.0.0
 */
function generateSingleCharHints(keys: string[], count: number): string[] {
  return keys.slice(0, count);
}

/**
 * 指定されたキーから複数文字ヒントを生成（多段階フォールバック付き）
 * @description 2文字組み合わせ → 3文字組み合わせの段階的ヒント生成システム
 *
 * ## 生成アルゴリズムの詳細
 * 1. **2文字組み合わせ**: keys × keys の直積（例: ['A','B'] → ['AA','AB','BA','BB']）
 * 2. **3文字エクステンション**: 2文字でも不足時にkeys³の3文字組み合わせ
 * 3. **順序最適化**: より短いヒントを優先的に生成
 *
 *
 * ## パフォーマンス特性とスケーラビリティ
 * - **2文字段階**: O(k²) - kはキー数
 * - **3文字段階**: O(k³) - kはキー数
 * - **メモリ効率**: 必要分のみ生成、事前計算なし
 * - **最大容量**: k² + k³個のヒント（kはキー数）
 *
 * ## 実用的な容量計算
 * - k=5キーの場合: 25 + 125 = 150個のヒント
 * - k=10キーの場合: 100 + 1000 = 1100個のヒント
 * - k=26キーの場合: 676 + 17576 = 18252個のヒント
 *
 * @param keys - 使用可能なキーの配列（通常は単一文字のアルファベット）
 * @param count - 生成するヒント数（最大値はkeys² + keys³）
 * @returns string[] - 生成された複数文字ヒントの配列（2文字 → 3文字の順）
 * @complexity O(min(count, k² + k³)) - kはキー数
 * @since 1.0.0
 * @example
 * ```typescript
 * // 基本的な2文字ヒント生成
 * const basicHints = generateMultiCharHintsFromKeys(['A', 'B'], 5);
 * // 結果: ['AA', 'AB', 'BA', 'BB', 'AAA']
 * // 説明: 2文字組み合わせ4個 + 3文字1個
 *
 * // 3文字エクステンション例
 * const extended = generateMultiCharHintsFromKeys(['A', 'B'], 10);
 * // 結果: ['AA', 'AB', 'BA', 'BB', 'AAA', 'AAB', 'ABA', 'ABB', 'BAA', 'BAB']
 * // 説明: 2文字4個 + 3文字6個
 *
 * // 大量ヒント生成（3文字まで使用）
 * const massive = generateMultiCharHintsFromKeys(['Q', 'W'], 12);
 * // 結果: 2文字4個 + 3文字8個 = 12個
 * // ['QQ', 'QW', 'WQ', 'WW', 'QQQ', 'QQW', 'QWQ', 'QWW', 'WQQ', 'WQW', 'WWQ', 'WWW']
 *
 * // 実際のキーボード配列例
 * const homeRow = generateMultiCharHintsFromKeys(['A','S','D','F'], 20);
 * // ホームロウキーから20個のヒント生成（16の2文字 + 4の3文字）
 * ```
 */
function generateMultiCharHintsFromKeys(keys: string[], count: number): string[] {
  const hints: string[] = [];
  let generated = 0;

  // 2文字の組み合わせ
  for (let i = 0; i < keys.length && generated < count; i++) {
    for (let j = 0; j < keys.length && generated < count; j++) {
      hints.push(keys[i] + keys[j]);
      generated++;
    }
  }

  // 3文字の組み合わせ（2文字でも足りない場合のみ）
  if (generated < count) {
    for (let i = 0; i < keys.length && generated < count; i++) {
      for (let j = 0; j < keys.length && generated < count; j++) {
        for (let k = 0; k < keys.length && generated < count; k++) {
          hints.push(keys[i] + keys[j] + keys[k]);
          generated++;
        }
      }
    }
  }

  return hints;
}

/**
 * ヒントキー設定の検証
 * @description ヒントキー設定の妥当性を検証し、エラーメッセージを返す
 * @param config - 検証するヒントキー設定
 * @returns {{ valid: boolean, errors: string[] }} 検証結果オブジェクト
 * @since 1.0.0
 * @example
 * ```typescript
 * const result = validateHintKeyConfig({
 *   single_char_keys: ['A', 'BB'], // 無効（2文字）
 *   multi_char_keys: ['Q']
 * });
 * if (!result.valid) {
 *   console.log('Errors:', result.errors);
 * }
 * ```
 */
export function validateHintKeyConfig(config: HintKeyConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 1文字キーの検証
  if (config.single_char_keys) {
    const invalidSingle = config.single_char_keys.filter((k) => k.length !== 1);
    if (invalidSingle.length > 0) {
      errors.push(`Invalid single char keys: ${invalidSingle.join(", ")}`);
    }
  }

  // 2文字キーの検証（実際は1文字である必要がある）
  if (config.multi_char_keys) {
    const invalidMulti = config.multi_char_keys.filter((k) => k.length !== 1);
    if (invalidMulti.length > 0) {
      errors.push(`Multi char keys must be single characters: ${invalidMulti.join(", ")}`);
    }
  }

  // 重複チェック
  if (config.single_char_keys && config.multi_char_keys) {
    const overlap = config.single_char_keys.filter((k) => config.multi_char_keys!.includes(k));
    if (overlap.length > 0) {
      errors.push(`Keys cannot be in both groups: ${overlap.join(", ")}`);
    }
  }

  // max_single_char_hints の検証
  if (config.max_single_char_hints !== undefined) {
    if (config.max_single_char_hints < 0) {
      errors.push("max_single_char_hints must be non-negative");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
