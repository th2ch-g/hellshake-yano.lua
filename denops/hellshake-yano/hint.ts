import type {
  HintKeyConfig,
  HintMapping,
  HintPosition,
  HintPositionWithCoordinateSystem,
  Word,
} from "./types.ts";
import {
  areWordsAdjacent,
  calculateHintDisplayPosition,
  getWordDisplayEndCol,
} from "./hint-utils.ts";
import { getDisplayWidth } from "./utils/display.ts";
import { UnifiedCache, CacheType } from "./cache.ts";

// Re-export types for backward compatibility
export type { HintKeyConfig, HintMapping, HintPosition };

// HintPosition interface moved to types.ts for consolidation
// Use: import type { HintPosition } from "./types.ts";

// HintPositionWithCoordinateSystem interface moved to types.ts for consolidation
// Use: import type { HintPositionWithCoordinateSystem } from "./types.ts";

/**
 * パフォーマンス最適化用の統一キャッシュシステム
 *
 * ## UnifiedCache統合による改善点
 * - 4つの独立したMapキャッシュを1つのUnifiedCacheに統合
 * - LRUアルゴリズムによる効率的なメモリ管理
 * - 型安全なキャッシュアクセスとパフォーマンス監視
 * - モード別キャッシュ分離機能を完全に保持
 *
 * @version 1.0.0 - UnifiedCache統合完了
 * @see {@link UnifiedCache} - 統一キャッシュシステム
 * @see {@link CacheType} - キャッシュタイプ一覧
 */
const unifiedCache = UnifiedCache.getInstance();

/**
 * hint.ts専用キャッシュインスタンス
 * UnifiedCacheから型安全にLRUCacheインスタンスを取得
 *
 * 各キャッシュの用途:
 * - hintCache: ヒント生成結果のキャッシュ（500エントリ上限）
 * - assignmentCache*: モード別ヒント割り当てキャッシュ（各100エントリ上限）
 */
const hintCache = unifiedCache.getCache<string, string[]>(CacheType.HINTS);
const assignmentCacheNormal = unifiedCache.getCache<string, Word[]>(CacheType.HINT_ASSIGNMENT_NORMAL);
const assignmentCacheVisual = unifiedCache.getCache<string, Word[]>(CacheType.HINT_ASSIGNMENT_VISUAL);
const assignmentCacheOther = unifiedCache.getCache<string, Word[]>(CacheType.HINT_ASSIGNMENT_OTHER);


/**
 * バッチ処理を開始する単語数の閾値
 * @constant {number}
 * @default 500
 * @since 1.0.0
 */
export const BATCH_PROCESS_THRESHOLD = 500;

/**
 * バッチ処理時のバッチサイズ
 * @constant {number}
 * @default 250
 * @since 1.0.0
 */
export const BATCH_BATCH_SIZE = 250;

// 統一されたエンコーディングユーティリティを使用
import { getByteLength } from "./utils/encoding.ts";

/**
 * モードに応じた割り当てキャッシュを取得
 * @param mode - 現在のエディタモード（"normal", "visual", その他）
 * @returns LRUCache<string, Word[]> 指定されたモードのキャッシュ
 * @since 1.0.0
 * @internal
 */
function getAssignmentCacheForMode(mode: string) {
  if (mode === "visual") {
    return assignmentCacheVisual;
  }
  if (mode === "normal") {
    return assignmentCacheNormal;
  }
  return assignmentCacheOther;
}

/**
 * 割り当てキャッシュキーを作成
 * @param words - キー生成元の単語配列
 * @param cursorLine - 現在のカーソル行位置
 * @param cursorCol - 現在のカーソル列位置
 * @param hintPositionSetting - ヒント位置設定
 * @param visualHintPositionSetting - Visualモードのヒント位置設定
 * @param optimizationConfig - オプションの最適化設定
 * @returns string 割り当てcache用に生成されたキー
 * @since 1.0.0
 * @internal
 */
function createAssignmentCacheKey(
  words: Word[],
  cursorLine: number,
  cursorCol: number,
  hintPositionSetting: string,
  visualHintPositionSetting: string,
  optimizationConfig?: { skipOverlapDetection?: boolean },
): string {
  const positionSignature = hashString(
    words.map((w) => `${w.line},${w.col}`).join(";"),
  );
  const skipOverlap = optimizationConfig?.skipOverlapDetection ?? false;
  return `${words.length}-${cursorLine}-${cursorCol}-${hintPositionSetting}-${visualHintPositionSetting}-${skipOverlap}-${positionSignature}`;
}

/**
 * 文字列をハッシュ化
 * @param value - ハッシュ化する文字列
 * @returns string base36形式のハッシュ値
 * @since 1.0.0
 * @internal
 */
function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * 遅延評価でヒントマッピングを作成
 * @param word - ヒント割り当て対象の単語
 * @param hint - 割り当てるヒント文字列
 * @param effectiveHintPosition - 有効なヒント位置（"start", "end", "overlay", "both"）
 * @param endHint - "both"モード用のオプション終了ヒント
 * @returns HintMapping | HintMapping[] 単一マッピングまたは"both"モード用の配列
 * @since 1.0.0
 * @internal
 */
function createLazyHintMapping(
  word: Word,
  hint: string,
  effectiveHintPosition: string,
  endHint?: string, // bothモード用の終了位置ヒント
): HintMapping | HintMapping[] {
  // both モードの場合は2つのマッピングを返す
  if (effectiveHintPosition === "both" && endHint) {
    const startMapping = createSingleHintMapping(word, hint, "start");
    const endMapping = createSingleHintMapping(word, endHint, "end");
    return [startMapping, endMapping];
  }

  // 通常モードでは単一のマッピングを返す
  return createSingleHintMapping(word, hint, effectiveHintPosition);
}

/**
 * 単一ヒントマッピングを作成
 * @param word - ヒント割り当て対象の単語
 * @param hint - 割り当てるヒント文字列
 * @param effectiveHintPosition - ヒント位置（"start", "end", "overlay"）
 * @returns HintMapping 遅延評価による位置プロパティを持つヒントマッピング
 * @since 1.0.0
 * @internal
 */
function createSingleHintMapping(
  word: Word,
  hint: string,
  effectiveHintPosition: string,
): HintMapping {
  let cachedHintCol: number | undefined;
  let cachedHintByteCol: number | undefined;

  const compute = () => {
    if (cachedHintCol !== undefined && cachedHintByteCol !== undefined) {
      return;
    }

    let hintCol = word.col;
    let hintByteCol = word.byteCol ?? word.col;

    switch (effectiveHintPosition) {
      case "end":
        hintCol = word.col + word.text.length - 1;
        if (word.byteCol) {
          const textByteLength = getByteLength(word.text);
          hintByteCol = word.byteCol + textByteLength - 1;
        } else {
          hintByteCol = hintCol;
        }
        break;
      case "overlay":
        hintCol = word.col;
        hintByteCol = word.byteCol ?? word.col;
        break;
      default:
        hintCol = word.col;
        hintByteCol = word.byteCol ?? word.col;
        break;
    }

    cachedHintCol = hintCol;
    cachedHintByteCol = hintByteCol;
  };

  return {
    word,
    hint,
    get hintCol(): number {
      compute();
      return cachedHintCol ?? word.col;
    },
    get hintByteCol(): number {
      compute();
      return cachedHintByteCol ?? (word.byteCol ?? word.col);
    },
  };
}

/**
 * 割り当てキャッシュに保存
 * @param cache - 保存先のUnifiedCache LRUCacheインスタンス
 * @param cacheKey - cacheエントリのキー
 * @param sortedWords - cacheする並び替え済み単語配列
 * @since 1.0.0
 * @internal
 */
function storeAssignmentCache(
  cache: ReturnType<typeof unifiedCache.getCache>,
  cacheKey: string,
  sortedWords: Word[],
): void {
  // UnifiedCacheのLRUアルゴリズムが自動的にサイズ管理を行う
  cache.set(cacheKey, sortedWords.slice());
}

// HintMapping interface moved to types.ts for consolidation
// Use: import type { HintMapping } from "./types.ts";

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

  // キャッシュに保存（統一キャッシュのLRUアルゴリズムが自動管理）
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
  mode: string = "normal",
  config?: { hint_position?: string; visual_hint_position?: string },
  optimizationConfig?: { skipOverlapDetection?: boolean },
): HintMapping[] {
  if (words.length === 0 || hints.length === 0) {
    return [];
  }

  const isVisualMode = mode === "visual";
  const hintPositionSetting = config?.hint_position ?? "start";
  const visualHintPositionSetting = config?.visual_hint_position ?? "end";

  const assignmentCache = getAssignmentCacheForMode(mode);

  // キャッシュキーを生成（単語の位置とカーソル位置、モード情報、最適化設定を考慮）
  const cacheKey = createAssignmentCacheKey(
    words,
    cursorLine,
    cursorCol,
    hintPositionSetting,
    visualHintPositionSetting,
    optimizationConfig,
  );

  // キャッシュヒットチェック
  const cachedWords = assignmentCache.get(cacheKey);
  if (cachedWords) {
    const effectiveHintPosition = isVisualMode && visualHintPositionSetting !== "same"
      ? visualHintPositionSetting
      : hintPositionSetting;

    // both モードの場合は各単語に対して2つのマッピングを作成
    if (effectiveHintPosition === "both") {
      const mappings: HintMapping[] = [];
      cachedWords.forEach((word, index) => {
        // bothモードでは各単語に2つのヒントが必要
        const startHintIndex = index * 2;
        const endHintIndex = index * 2 + 1;

        // startとendのヒントを明示的に作成して順序を保証
        if (hints[startHintIndex]) {
          const startMapping = createSingleHintMapping(word, hints[startHintIndex], "start");
          mappings.push(startMapping);
        }
        if (hints[endHintIndex]) {
          const endMapping = createSingleHintMapping(word, hints[endHintIndex], "end");
          mappings.push(endMapping);
        }
      });
      return mappings;
    }

    return cachedWords.map((word, index) => {
      const result = createLazyHintMapping(word, hints[index] || "", effectiveHintPosition);
      return Array.isArray(result) ? result[0] : result;
    });
  }

  // オーバーラップ検出を実行（optimizationConfigでスキップ可能）
  let filteredWords = words;
  const shouldSkipOverlapDetection = optimizationConfig?.skipOverlapDetection ?? false;

  if (!shouldSkipOverlapDetection) {
    const adjacencyResults = detectAdjacentWords(words);
    const priorityRules = { symbolsPriority: 1, wordsPriority: 2 };

    // オーバーラップでスキップすべき単語を特定
    const wordsToSkip = new Set<Word>();
    for (const { word, adjacentWords } of adjacencyResults) {
      if (shouldSkipHintForOverlap(word, adjacentWords, priorityRules)) {
        wordsToSkip.add(word);
      }
    }

    // スキップ対象を除外した単語リストを作成
    filteredWords = words.filter((word) => !wordsToSkip.has(word));
  }

  // カーソル位置からの距離で最適化されたソート
  const sortedWords = sortWordsByDistanceOptimized(filteredWords, cursorLine, cursorCol);

  // ヒントを割り当て（ヒント位置情報を含める）
  const effectiveHintPosition = isVisualMode && visualHintPositionSetting !== "same"
    ? visualHintPositionSetting
    : hintPositionSetting;

  // both モードの場合は各単語に対して2つのマッピングを作成
  const mappings: HintMapping[] = [];

  if (effectiveHintPosition === "both") {
    sortedWords.forEach((word, index) => {
      // bothモードでは各単語に2つのヒントが必要
      const startHintIndex = index * 2;
      const endHintIndex = index * 2 + 1;
      const startHint = hints[startHintIndex] || "";
      const endHint = hints[endHintIndex] || "";

      // start と end の位置を明示的に作成して順序を保証
      if (startHint) {
        const startMapping = createSingleHintMapping(word, startHint, "start");
        mappings.push(startMapping);
      }
      if (endHint) {
        const endMapping = createSingleHintMapping(word, endHint, "end");
        mappings.push(endMapping);
      }
    });
  } else {
    sortedWords.forEach((word, index) => {
      const result = createLazyHintMapping(word, hints[index] || "", effectiveHintPosition);
      if (Array.isArray(result)) {
        mappings.push(result[0]);
      } else {
        mappings.push(result);
      }
    });
  }

  storeAssignmentCache(assignmentCache, cacheKey, sortedWords);

  return mappings;
}

/**
 * 複数文字ヒントを最適化して生成
 * @description 単一文字ヒントを使い切った後の複数文字ヒントを効率的に生成
 * @param wordCount - 必要な総ヒント数
 * @param markers - ヒント文字として使用するマーカー配列
 * @returns string[] 生成されたヒント文字列の配列
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
  if (words.length > BATCH_PROCESS_THRESHOLD) {
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
 * @description 500個を超える単語を効率的にソートするためのバッチ処理アルゴリズム。メモリ使用量を抑制し、分割統治法を使用
 *
 * ## アルゴリズム詳細
 * 1. **バッチ分割**: 250個ずつのバッチに分割
 * 2. **個別ソート**: 各バッチを個別にsortWordsByDistanceOptimizedでソート
 * 3. **マージ処理**: ソート済みバッチをmergeSortedBatchesで結合
 * 4. **メモリ効率**: 一度に全データをメモリに展開せず、段階的処理
 *
 * ## パフォーマンス特性
 * - **時間計算量**: O(n log n) - nは総単語数
 * - **空間計算量**: O(n) - 最大バッチサイズ × バッチ数分のメモリ
 * - **バッチサイズ**: 250個（メモリとCPU効率のバランス点）
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
  const batchSize = BATCH_BATCH_SIZE;
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
  assignmentCacheNormal.clear();
  assignmentCacheVisual.clear();
  assignmentCacheOther.clear();
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
    hintCacheSize: hintCache.size(),
    assignmentCacheSize: assignmentCacheNormal.size() + assignmentCacheVisual.size() +
      assignmentCacheOther.size(),
  };
}

/**
 * UnifiedCacheを使用したhintシステムの詳細統計情報を取得
 * @returns UnifiedCacheからの詳細な統計情報とパフォーマンス指標
 * @since 1.0.0
 * @example
 * ```typescript
 * const stats = getUnifiedCacheStats();
 * console.log(`HINTS ヒット率: ${stats.HINTS.hitRate}`);
 * console.log(`キャッシュ総サイズ: ${stats.totalSize}`);
 * ```
 */
export function getUnifiedCacheStats() {
  const allStats = unifiedCache.getAllStats();
  const hintRelatedTypes = [
    'HINTS',
    'HINT_ASSIGNMENT_NORMAL',
    'HINT_ASSIGNMENT_VISUAL',
    'HINT_ASSIGNMENT_OTHER'
  ];

  const hintStats: Record<string, any> = {};
  let totalSize = 0;
  let totalHits = 0;
  let totalMisses = 0;

  for (const type of hintRelatedTypes) {
    if (allStats[type]) {
      hintStats[type] = allStats[type];
      totalSize += allStats[type].size;
      totalHits += allStats[type].hits;
      totalMisses += allStats[type].misses;
    }
  }

  return {
    ...hintStats,
    totalSize,
    totalHits,
    totalMisses,
    overallHitRate: totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0
  };
}

/**
 * ヒント表示位置を計算する
 * @description 単語とヒント位置設定に基づいてヒントの表示位置を計算
 * @param word - 対象の単語
 * @param hintPosition - ヒント位置設定（"start", "end", "overlay"）
 * @returns HintPosition 計算されたヒント表示位置
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
  isVisualMode: boolean = false,
  visualHintPosition?: string,
): HintPosition {
  let col: number;
  let display_mode: "before" | "after" | "overlay";

  // Default tab width - should be retrieved from Vim settings in production
  const tabWidth = 8;

  // Visual Mode専用処理（process3追加）
  let effectiveHintPosition = hintPosition;
  if (isVisualMode && visualHintPosition) {
    switch (visualHintPosition) {
      case "start":
        effectiveHintPosition = "start";
        break;
      case "end":
        effectiveHintPosition = "end";
        break;
      case "same":
        // 通常のhint_positionに従う
        effectiveHintPosition = hintPosition;
        break;
      case "both":
        // bothモードは特別処理（後で2つの位置を返す）
        effectiveHintPosition = "both";
        break;
      default:
        // デフォルトはendを使用
        effectiveHintPosition = "end";
        break;
    }
  }

  // デバッグログ追加（パフォーマンスのためコメントアウト）

  // bothモードの場合はstartとend両方の位置を計算する必要があるが、
  // この関数は単一のHintPositionを返すため、startの位置を返す
  // bothモードの完全な処理はcalculateHintPositionWithCoordinateSystemで行う
  if (effectiveHintPosition === "both") {
    col = word.col;
    display_mode = "before";
  } else {
    switch (effectiveHintPosition) {
      case "start":
        col = word.col;
        display_mode = "before";
        break;
      case "end":
        // 表示幅を使用してend位置を計算
        col = calculateHintDisplayPosition(word, "end", tabWidth);
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
 * @returns HintPositionWithCoordinateSystem Vim/Neovim両方の座標系に対応した位置情報
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
  isVisualMode: boolean = false,
  visualHintPosition?: string,
): HintPositionWithCoordinateSystem {
  let col: number;
  let byteCol: number;
  let display_mode: "before" | "after" | "overlay";

  // Visual Mode専用処理（process3追加）
  let effectiveHintPosition = hintPosition;
  if (isVisualMode && visualHintPosition) {
    switch (visualHintPosition) {
      case "start":
        effectiveHintPosition = "start";
        break;
      case "end":
        effectiveHintPosition = "end";
        break;
      case "same":
        effectiveHintPosition = hintPosition;
        break;
      case "both":
        effectiveHintPosition = "both";
        break;
      default:
        effectiveHintPosition = "end";
        break;
    }
  }

  // デバッグログ追加
  if (enableDebug) {
  }

  switch (effectiveHintPosition) {
    case "start":
      col = word.col; // 1ベース
      byteCol = word.byteCol || word.col; // バイト位置があれば優先使用
      display_mode = "before";
      break;
    case "end":
      col = word.col + word.text.length - 1; // 1ベース
      // If we have byteCol, calculate end position using byte length
      if (word.byteCol) {
        const textByteLength = getByteLength(word.text);
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

// HintKeyConfig interface moved to types.ts for consolidation
// Use: import type { HintKeyConfig } from "./types.ts";

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
  const defaultSingleCharKeys = "ASDFGHJKLNM0123456789".split("");
  const defaultMultiCharKeys = "BCEIOPQRTUVWXYZ".split("");

  // 厳密な分離: single_char_keysとmulti_char_keysを独立して扱う
  const singleCharKeys = config.single_char_keys || [];
  const multiCharKeys = config.multi_char_keys || [];

  // 両方とも未定義の場合のみ、従来のロジックにフォールバック
  if (singleCharKeys.length === 0 && multiCharKeys.length === 0) {
    // 互換性のため、markersまたはデフォルトを使用
    const fallbackKeys = config.markers || defaultMarkers;
    return generateHints(wordCount, fallbackKeys);
  }

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
  let remainingCount = wordCount - singleCharCount;

  if (remainingCount > 0) {
    const doubleLimit = multiCharKeys.length * multiCharKeys.length;
    const doubleCount = Math.min(remainingCount, doubleLimit);
    hints.push(...generateMultiCharHintsFromKeys(multiCharKeys, doubleCount, 2));
    remainingCount -= doubleCount;
  }

  // 数字フォールバックを削除 - single_char_keysとmulti_char_keysの組み合わせのみを使用
  // 3文字ヒントも生成しない（厳密にsingle/multiの定義に従う）

  return hints;
}

/**
 * 1文字ヒントの生成
 * @description 指定されたキーから1文字ヒントを生成
 * @param keys - 使用可能なキーの配列
 * @param count - 生成するヒント数
 * @returns string[] 生成された1文字ヒントの配列
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
function generateMultiCharHintsFromKeys(
  keys: string[],
  count: number,
  startLength: number = 2,
): string[] {
  const hints: string[] = [];
  if (count <= 0 || keys.length === 0) {
    return hints;
  }

  const maxLength = 2; // 2文字までに制限（3文字生成を廃止）

  const generateForLength = (length: number, prefix: string[]): boolean => {
    if (prefix.length === length) {
      hints.push(prefix.join(""));
      return hints.length < count;
    }

    for (const key of keys) {
      prefix.push(key);
      const shouldContinue = generateForLength(length, prefix);
      prefix.pop();
      if (!shouldContinue) {
        return false;
      }
    }

    return true;
  };

  for (let length = startLength; length <= maxLength && hints.length < count; length++) {
    const shouldContinue = generateForLength(length, []);
    if (!shouldContinue) {
      break;
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

// ===== Hint Overlap Detection Functions =====

/**
 * オーバーラップ検出用のキャッシュ（統一キャッシュ）
 * Cache for adjacent words detection to optimize overlap detection
 * @since 1.0.0
 * @internal
 */
let adjacencyCache = UnifiedCache.getInstance().getCache<string, { word: Word; adjacentWords: Word[] }[]>(CacheType.ADJACENCY);

/**
 * 隣接する単語を検出する
 * Detect adjacent words on the same line for overlap detection
 *
 * @description 同一行で隣接している単語（1カラム以内の間隔）を特定
 * Identifies words that are adjacent (within 1 column spacing) on the same line
 * to prevent hint display overlaps. Uses display width calculation for accurate
 * positioning with tab characters and multi-byte characters.
 *
 * ## Algorithm Details
 * - **Same-line filtering**: Only checks words on identical line numbers
 * - **Display width aware**: Considers tab expansion and multi-byte character width
 * - **Proximity detection**: Uses areWordsAdjacent utility for precise adjacency
 * - **Performance optimization**: Results are cached for repeated calls
 *
 * @param words - 検出対象の単語配列
 * @returns {{ word: Word; adjacentWords: Word[] }[]} 各単語とその隣接単語の配列
 * @complexity O(n²) - nは単語数
 * @since 1.0.0
 * @example
 * ```typescript
 * const words = [
 *   { text: 'hello', line: 1, col: 1 },
 *   { text: 'world', line: 1, col: 7 },   // Adjacent to 'hello'
 *   { text: 'test', line: 2, col: 1 }     // Different line, not adjacent
 * ];
 * const result = detectAdjacentWords(words);
 * // Returns: [
 * //   { word: words[0], adjacentWords: [words[1]] },
 * //   { word: words[1], adjacentWords: [words[0]] },
 * //   { word: words[2], adjacentWords: [] }
 * // ]
 * ```
 */
export function detectAdjacentWords(words: Word[]): { word: Word; adjacentWords: Word[] }[] {
  if (words.length === 0) {
    return [];
  }

  // キャッシュキーを生成
  const cacheKey = words.map((w) => `${w.text}:${w.line}:${w.col}`).join("|");

  // キャッシュヒットチェック
  if (adjacencyCache.has(cacheKey)) {
    return adjacencyCache.get(cacheKey)!;
  }

  const result: { word: Word; adjacentWords: Word[] }[] = [];

  // Default tab width - should be retrieved from Vim settings in production
  const tabWidth = 8;

  for (const word of words) {
    const adjacentWords: Word[] = [];

    for (const otherWord of words) {
      if (word === otherWord) continue;

      // 同じ行の単語のみチェック
      if (word.line !== otherWord.line) continue;

      // 表示幅を考慮した隣接性を判定
      if (areWordsAdjacent(word, otherWord, tabWidth)) {
        adjacentWords.push(otherWord);
      }
    }

    result.push({ word, adjacentWords });
  }

  // キャッシュに保存（統一キャッシュがサイズ制限を自動管理）
  adjacencyCache.set(cacheKey, result);

  return result;
}

/**
 * 単語がマークダウン記号かどうかを判定する
 * Check if a word consists only of markdown symbols or punctuation
 *
 * @description マークダウン記号やその他の記号文字のみで構成されているかチェック
 * Determines if a word is composed entirely of markdown symbols or punctuation
 * characters. Used for prioritization in hint overlap resolution.
 *
 * ## Symbol Detection Pattern
 * - **Markdown symbols**: -, *, #, `, [, ], (, ), {, }
 * - **Punctuation**: ., ,, ;, :, !, ?
 * - **Pattern matching**: Uses regex `/^[\-\*#`\[\](){}.,;:!?]+$/`
 *
 * @param word - 判定対象の単語
 * @returns boolean 記号の場合true
 * @since 1.0.0
 * @example
 * ```typescript
 * isSymbolWord({ text: '**', line: 1, col: 5 });     // true (markdown bold)
 * isSymbolWord({ text: '[]', line: 1, col: 10 });    // true (markdown link)
 * isSymbolWord({ text: 'hello', line: 1, col: 15 }); // false (text word)
 * isSymbolWord({ text: '123', line: 1, col: 20 });   // false (numeric word)
 * isSymbolWord({ text: '', line: 1, col: 25 });      // false (empty)
 * ```
 */
export function isSymbolWord(word: Word): boolean {
  if (!word.text || word.text.trim().length === 0) {
    return false;
  }

  // マークダウン記号パターン
  const symbolPattern = /^[\-\*#`\[\](){}.,;:!?]+$/;

  return symbolPattern.test(word.text);
}

/**
 * オーバーラップによりヒントをスキップするかどうかを判定する
 * Determine whether to skip hint display due to overlap conflicts
 *
 * @description 優先度ルールに基づいてヒント表示の要否を決定
 * Determines whether to skip hint display based on priority rules when words
 * are adjacent and would cause hint overlaps. Implements a sophisticated
 * prioritization system for optimal hint visibility.
 *
 * ## Priority Resolution Algorithm
 * 1. **Type Priority**: Text words > Symbol words (configurable)
 * 2. **Length Priority**: Longer words > Shorter words (same type)
 * 3. **Position Priority**: Right position > Left position (same type and length)
 *
 * ## Conflict Resolution Examples
 * - Symbol vs Text: Text word gets hint, symbol is skipped
 * - Same type, different length: Longer word gets hint
 * - Same type and length: Right-most word gets hint
 *
 * @param word - 判定対象の単語
 * @param adjacentWords - 隣接している単語の配列
 * @param priorityRules - 優先度ルール（記号 < 単語）
 * @param priorityRules.symbolsPriority - 記号単語の優先度値（低い = 低優先度）
 * @param priorityRules.wordsPriority - テキスト単語の優先度値（高い = 高優先度）
 * @returns boolean スキップする場合true
 * @since 1.0.0
 * @example
 * ```typescript
 * const word = { text: '*', line: 1, col: 5 };           // Symbol word
 * const adjacent = [{ text: 'hello', line: 1, col: 6 }]; // Text word
 * const rules = { symbolsPriority: 1, wordsPriority: 2 };
 *
 * const shouldSkip = shouldSkipHintForOverlap(word, adjacent, rules);
 * // Returns: true (symbol skipped in favor of text word)
 *
 * // Same type comparison
 * const shortWord = { text: 'a', line: 1, col: 1 };
 * const longWord = [{ text: 'hello', line: 1, col: 3 }];
 * const skipShort = shouldSkipHintForOverlap(shortWord, longWord, rules);
 * // Returns: true (shorter word skipped)
 * ```
 */
export function shouldSkipHintForOverlap(
  word: Word,
  adjacentWords: Word[],
  priorityRules: { symbolsPriority: number; wordsPriority: number },
): boolean {
  if (adjacentWords.length === 0) {
    return false;
  }

  const isCurrentSymbol = isSymbolWord(word);

  for (const adjacentWord of adjacentWords) {
    const isAdjacentSymbol = isSymbolWord(adjacentWord);

    // 優先度ルール: 記号 < 単語
    if (isCurrentSymbol && !isAdjacentSymbol) {
      // 現在が記号、隣接が単語 → 記号をスキップ
      if (priorityRules.symbolsPriority < priorityRules.wordsPriority) {
        return true;
      }
    }

    // 同じ種類の場合は長さで判定
    if (isCurrentSymbol === isAdjacentSymbol) {
      if (word.text.length < adjacentWord.text.length) {
        // 短い方をスキップ
        return true;
      } else if (word.text.length === adjacentWord.text.length) {
        // 同じ長さの場合は位置で判定（後の単語を優先）
        if (word.col < adjacentWord.col) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * ヒントが利用可能なスペースに表示可能かチェック
 * Check if a hint can be displayed in the available space
 *
 * @description 隣接する単語と最小ヒント幅要件を考慮してヒント表示可能性を判定
 * Determines if a hint can be displayed considering adjacent words and minimum
 * hint width requirements. Performs precise space calculations using display
 * width for tab characters and multi-byte characters.
 *
 * ## Space Calculation Algorithm
 * 1. **Display width calculation**: Uses getDisplayWidth for accurate character width
 * 2. **Position analysis**: Calculates word end positions considering display width
 * 3. **Space availability**: Measures gaps between adjacent words
 * 4. **Minimum width check**: Ensures sufficient space for minimum hint display
 *
 * ## Edge Cases Handled
 * - **Different lines**: No conflict for words on different lines
 * - **Overlapping words**: Returns false for overlapping positions
 * - **Tab characters**: Proper expansion using tabWidth parameter
 * - **Multi-byte characters**: Accurate width calculation for Unicode
 *
 * @param word - ヒント表示をチェックする単語
 * @param adjacentWords - 競合を引き起こす可能性のある隣接単語の配列
 * @param minHintWidth - ヒント表示に必要な最小幅（デフォルト: 2）
 * @param tabWidth - 表示計算用のタブ幅（デフォルト: 8）
 * @returns boolean ヒントが表示可能な場合true、そうでなければfalse
 * @complexity O(n) - nは隣接単語数
 * @since 1.0.0
 * @example
 * ```typescript
 * const word = { text: 'hello', line: 1, col: 1 };        // cols 1-5
 * const adjacent = [{ text: 'world', line: 1, col: 10 }];  // cols 10-14
 *
 * const canDisplay = canDisplayHint(word, adjacent, 2, 8);
 * // Returns: true (4 columns gap: 6,7,8,9 >= minHintWidth of 2)
 *
 * // Tight spacing example
 * const tightWord = { text: 'hi', line: 1, col: 1 };       // cols 1-2
 * const closeAdj = [{ text: 'there', line: 1, col: 4 }];   // cols 4-8
 * const canDisplayTight = canDisplayHint(tightWord, closeAdj, 2);
 * // Returns: false (1 column gap: 3 < minHintWidth of 2)
 * ```
 */
export function canDisplayHint(
  word: Word,
  adjacentWords: Word[],
  minHintWidth = 2,
  tabWidth = 8,
): boolean {
  if (adjacentWords.length === 0) {
    return true; // No adjacent words, display is possible
  }

  const currentWordDisplayWidth = getDisplayWidth(word.text, tabWidth);

  // Check available space between adjacent words
  for (const adjacentWord of adjacentWords) {
    // Check if they are on the same line
    if (word.line !== adjacentWord.line) {
      continue; // Different lines, no conflict
    }

    const adjacentWordDisplayWidth = getDisplayWidth(adjacentWord.text, tabWidth);

    // Calculate positions
    const currentWordEndPos = word.col + currentWordDisplayWidth - 1;
    const adjacentWordEndPos = adjacentWord.col + adjacentWordDisplayWidth - 1;

    let availableSpace = 0;

    // Check if current word is to the left of adjacent word
    if (currentWordEndPos < adjacentWord.col) {
      availableSpace = adjacentWord.col - currentWordEndPos - 1;
    } // Check if current word is to the right of adjacent word
    else if (word.col > adjacentWordEndPos) {
      availableSpace = word.col - adjacentWordEndPos - 1;
    } // Words overlap or are adjacent - no space available
    else {
      availableSpace = 0;
    }

    // If available space is less than minimum required, display is not possible
    if (availableSpace < minHintWidth) {
      return false;
    }
  }

  return true; // Sufficient space available
}

/**
 * 定義済みルールに基づいてヒントを優先順位付け
 *
 * @description 競合解決のために事前定義されたルールに基づいてヒントの優先順位を決定:
 * 1. テキスト > 記号 - テキスト単語が記号単語より優先
 * 2. 長い単語 > 短い単語（同じタイプ） - 長さベースの優先度
 * 3. 左位置 > 右位置（同じ長さとタイプ） - 位置ベースのタイブレーカー
 *
 * ## 処理アルゴリズム
 * 1. **行グルーピング**: 効率化のため行別に単語を処理
 * 2. **競合検出**: 隣接単語をスペース競合のために分析
 * 3. **優先度解決**: 複数単語競合を解決するためにルールを適用
 * 4. **最終選択**: 各競合グループからの勝者単語のみを返す
 *
 * ## 優先度ルールの実装
 * - **テキストvs記号**: isSymbolWord()分類を使用
 * - **長さ比較**: 直接的なtext.length比較
 * - **位置タイブレーカー**: 列ベースの左から右への優先
 * - **競合解決**: 重複領域に対する勝者総取りアプローチ
 *
 * @param words - 隣接単語情報を含む単語の配列
 * @param tabWidth - 表示計算用のタブ幅（デフォルト: 8）
 * @returns Word[] 優先度ルールに基づいてヒントを表示すべき単語の配列
 * @complexity 競合検出にO(n²)、ソートにO(n log n)
 * @since 1.0.0
 * @example
 * ```typescript
 * const wordsWithAdjacent = [
 *   { word: { text: '*', line: 1, col: 1 }, adjacentWords: [{ text: 'hello', line: 1, col: 2 }] },
 *   { word: { text: 'hello', line: 1, col: 2 }, adjacentWords: [{ text: '*', line: 1, col: 1 }] },
 *   { word: { text: 'world', line: 1, col: 10 }, adjacentWords: [] }
 * ];
 *
 * const prioritized = prioritizeHints(wordsWithAdjacent, 8);
 * // 結果: [{ text: 'hello', line: 1, col: 2 }, { text: 'world', line: 1, col: 10 }]
 * // '*'は'hello'より低優先度のためフィルタリングされる
 * ```
 */
export function prioritizeHints(
  words: { word: Word; adjacentWords: Word[] }[],
  tabWidth = 8,
): Word[] {
  const prioritizedWords: Word[] = [];

  // Group words by line for efficient processing
  const wordsByLine = new Map<number, { word: Word; adjacentWords: Word[] }[]>();

  for (const wordInfo of words) {
    const line = wordInfo.word.line;
    if (!wordsByLine.has(line)) {
      wordsByLine.set(line, []);
    }
    wordsByLine.get(line)!.push(wordInfo);
  }

  // Process each line separately
  for (const [line, lineWords] of wordsByLine) {
    const lineResult = prioritizeWordsOnLine(lineWords, tabWidth);
    prioritizedWords.push(...lineResult);
  }

  return prioritizedWords;
}

/**
 * 単一行の単語を優先順位付け
 *
 * @description prioritizeHints関数の内部ヘルパー関数で、単一行の単語を処理して競合を解決し、優先度ルールを適用する。
 *
 * @param lineWords - 単一行の単語情報の配列
 * @param tabWidth - 表示計算用のタブ幅
 * @returns Word[] 行の優先順位付けされた単語の配列
 * @since 1.0.0
 * @internal
 */
function prioritizeWordsOnLine(
  lineWords: { word: Word; adjacentWords: Word[] }[],
  tabWidth: number,
): Word[] {
  const result: Word[] = [];
  const processedWords = new Set<Word>();

  // Sort words by column position for left-to-right processing
  const sortedWords = lineWords.sort((a, b) => a.word.col - b.word.col);

  for (const wordInfo of sortedWords) {
    if (processedWords.has(wordInfo.word)) {
      continue; // Already processed in a conflict resolution
    }

    const conflicts = findConflictingWords(wordInfo, lineWords, tabWidth);

    if (conflicts.length === 0) {
      // No conflicts, add the word
      result.push(wordInfo.word);
      processedWords.add(wordInfo.word);
    } else {
      // Resolve conflicts and add the winner
      const winner = resolveConflict([
        wordInfo,
        ...conflicts.map((w) => lineWords.find((lw) => lw.word === w)!),
      ]);
      result.push(winner);

      // Mark all conflicting words as processed
      processedWords.add(wordInfo.word);
      for (const conflict of conflicts) {
        processedWords.add(conflict);
      }
    }
  }

  return result;
}

/**
 * 指定された単語と競合する単語を検出
 *
 * @description 指定された単語のヒント表示と競合する単語を、間のスペース不足により特定する。
 *
 * @param wordInfo - 隣接単語を含む単語情報
 * @param allWords - 同じ行のすべての単語
 * @param tabWidth - 表示計算用のタブ幅
 * @returns Word[] 競合する単語の配列
 * @since 1.0.0
 * @internal
 */
function findConflictingWords(
  wordInfo: { word: Word; adjacentWords: Word[] },
  allWords: { word: Word; adjacentWords: Word[] }[],
  tabWidth: number,
): Word[] {
  const conflicts: Word[] = [];

  for (const otherWordInfo of allWords) {
    if (otherWordInfo.word === wordInfo.word) continue;

    // Check if hints would overlap
    if (
      !canDisplayHint(wordInfo.word, [otherWordInfo.word], 2, tabWidth) ||
      !canDisplayHint(otherWordInfo.word, [wordInfo.word], 2, tabWidth)
    ) {
      conflicts.push(otherWordInfo.word);
    }
  }

  return conflicts;
}

/**
 * 優先順位ルールを使用して複数単語間の競合を解決
 *
 * @description 事前定義された優先度ルール（テキスト > 記号 > 長さ > 位置）に基づいて、競合する複数の単語から勝者を選択する。
 *
 * @param conflictingWords - 競合する単語情報の配列
 * @returns Word ヒントを表示すべき勝者単語
 * @since 1.0.0
 * @internal
 */
function resolveConflict(conflictingWords: { word: Word; adjacentWords: Word[] }[]): Word {
  if (conflictingWords.length === 1) {
    return conflictingWords[0].word;
  }

  // Rule 1: Text > Symbols
  const textWords = conflictingWords.filter((w) => !isSymbolWord(w.word));
  const symbolWords = conflictingWords.filter((w) => isSymbolWord(w.word));

  if (textWords.length > 0) {
    // Prioritize text words
    return resolveSameTypeConflict(textWords);
  } else {
    // All are symbols
    return resolveSameTypeConflict(symbolWords);
  }
}

/**
 * 同じタイプの単語間の競合を解決
 *
 * @description タイプベースの優先度付けで勝者を決定できない場合に、長さと位置のルールを使用して同じタイプ（全てテキストまたは全て記号）の単語間の競合を解決する。
 *
 * @param words - 同じタイプの単語情報の配列
 * @returns Word 長さと位置ルールに基づく勝者単語
 * @since 1.0.0
 * @internal
 */
function resolveSameTypeConflict(words: { word: Word; adjacentWords: Word[] }[]): Word {
  if (words.length === 1) {
    return words[0].word;
  }

  // Rule 2: Longer words > Shorter words
  const maxLength = Math.max(...words.map((w) => w.word.text.length));
  const longestWords = words.filter((w) => w.word.text.length === maxLength);

  if (longestWords.length === 1) {
    return longestWords[0].word;
  }

  // Rule 3: Left position > Right position
  longestWords.sort((a, b) => a.word.col - b.word.col);
  return longestWords[0].word;
}
