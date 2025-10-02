import type {
  HintKeyConfig,
  HintMapping,
  HintPosition,
  HintPositionWithCoordinateSystem,
  Word,
} from "./types.ts";
import { DEFAULT_HINT_MARKERS } from "./types.ts";
import type { Config } from "./config.ts";
import { HintGeneratorFactory } from "./hint/hint-generator-strategies.ts";
// Utility functions migrated from hint-utils.ts are now defined in this file
// Display width calculation functions integrated from utils/display.ts
import { CacheType, GlobalCache, type CacheStatistics } from "./cache.ts";
import { Core } from "./core.ts";
import {
  isAlphanumeric,
  isValidSymbol,
  isWhitespace,
  isControlCharacter,
  isDigit,
} from "./validation-utils.ts";

/**
 * 型の再エクスポート
 */
export type { HintKeyConfig, HintMapping, HintPosition };

// HintPosition interface moved to types.ts for consolidation
// Use: import type { HintPosition } from "./types.ts";

// HintPositionWithCoordinateSystem interface moved to types.ts for consolidation
// Use: import type { HintPositionWithCoordinateSystem } from "./types.ts";

/** グローバルキャッシュインスタンス */
const globalCache = GlobalCache.getInstance();
/** ヒント文字列キャッシュ */
const hintCache = globalCache.getCache<string, string[]>(CacheType.HINTS);
/** ノーマルモード用ヒント割り当てキャッシュ */
const assignmentCacheNormal = globalCache.getCache<string, Word[]>(CacheType.HINT_ASSIGNMENT_NORMAL);
/** ビジュアルモード用ヒント割り当てキャッシュ */
const assignmentCacheVisual = globalCache.getCache<string, Word[]>(CacheType.HINT_ASSIGNMENT_VISUAL);
/** その他モード用ヒント割り当てキャッシュ */
const assignmentCacheOther = globalCache.getCache<string, Word[]>(CacheType.HINT_ASSIGNMENT_OTHER);

// ===== Display Width Functions (from utils/display.ts) =====
/** 文字幅キャッシュ */
const CHAR_WIDTH_CACHE = globalCache.getCache<number, number>(CacheType.CHAR_WIDTH);
/** CJK文字範囲の定義 */
const CJK_RANGES = [[0x3000, 0x303F], [0x3040, 0x309F], [0x30A0, 0x30FF], [0x4E00, 0x9FFF], [0xFF00, 0xFFEF]] as const;
/** 絵文字範囲の定義 */
const EMOJI_RANGES = [[0x1F600, 0x1F64F], [0x1F300, 0x1F5FF], [0x1F680, 0x1F6FF], [0x1F1E6, 0x1F1FF]] as const;

/**
 * ASCII文字幅キャッシュを初期化する
 */
function initializeASCIICache(): void {
  for (let i = 0x20; i <= 0x7E; i++) {
    if (CHAR_WIDTH_CACHE.get(i) === undefined) {
      CHAR_WIDTH_CACHE.set(i, 1);
    }
  }
}
initializeASCIICache();

/**
 * ラテン文字の数学記号かどうかを判定する
 * @param codePoint
 * @returns 
 */
function isLatinMathSymbol(codePoint: number): boolean {
  return (codePoint >= 0x00B0 && codePoint <= 0x00B1) || (codePoint >= 0x00B7 && codePoint <= 0x00B7) ||
         (codePoint >= 0x00D7 && codePoint <= 0x00D7) || (codePoint >= 0x00F7 && codePoint <= 0x00F7) ||
         (codePoint >= 0x2190 && codePoint <= 0x21FF) || (codePoint >= 0x2200 && codePoint <= 0x22FF) ||
         (codePoint >= 0x2300 && codePoint <= 0x23FF) || (codePoint >= 0x25A0 && codePoint <= 0x25FF) ||
         (codePoint >= 0x2600 && codePoint <= 0x26FF) || (codePoint >= 0x2700 && codePoint <= 0x27BF);
}

/**
 * コードポイントがCJK文字範囲内かどうかを判定する
 * @param codePoint
 * @returns 
 */
function isInCJKRange(codePoint: number): boolean {
  for (const [start, end] of CJK_RANGES) {
    if (codePoint >= start && codePoint <= end) return true;
  }
  return false;
}

/**
 * コードポイントが絵文字範囲内かどうかを判定する
 * @param codePoint
 * @returns 
 */
function isInEmojiRange(codePoint: number): boolean {
  for (const [start, end] of EMOJI_RANGES) {
    if (codePoint >= start && codePoint <= end) return true;
  }
  return false;
}

/**
 * コードポイントが拡張全角文字範囲内かどうかを判定する
 * @param codePoint
 * @returns 
 */
function isInExtendedWideRange(codePoint: number): boolean {
  return isLatinMathSymbol(codePoint) || (codePoint >= 0x2460 && codePoint <= 0x24FF) ||
         (codePoint >= 0x2E80 && codePoint <= 0x2EFF) || (codePoint >= 0x2F00 && codePoint <= 0x2FDF) ||
         (codePoint >= 0x2FF0 && codePoint <= 0x2FFF) || (codePoint >= 0x3400 && codePoint <= 0x4DBF) ||
         (codePoint >= 0x20000 && codePoint <= 0x2A6DF) || (codePoint >= 0x2A700 && codePoint <= 0x2B73F) ||
         (codePoint >= 0x2B740 && codePoint <= 0x2B81F) || (codePoint >= 0x2B820 && codePoint <= 0x2CEAF) ||
         (codePoint >= 0x2CEB0 && codePoint <= 0x2EBEF) || (codePoint >= 0xF900 && codePoint <= 0xFAFF) ||
         (codePoint >= 0xFE30 && codePoint <= 0xFE4F);
}

/**
 * 文字の表示幅を計算する
 * @param codePoint
 * @param tabWidth
 * @returns 
 */
function calculateCharWidth(codePoint: number, tabWidth: number): number {
  if (codePoint === 0x09) return tabWidth;
  if (codePoint >= 0x20 && codePoint <= 0x7E) return 1;
  if (codePoint < 0x20 || (codePoint >= 0x7F && codePoint < 0xA0)) return 0;
  if (isLatinMathSymbol(codePoint)) return 2;
  if (codePoint < 0x100) return 1;
  if (isInCJKRange(codePoint) || isInEmojiRange(codePoint)) return 2;
  if (isInExtendedWideRange(codePoint)) return 2;
  return 1;
}

/**
 * 文字の表示幅を取得する（キャッシュ機能付き）
 * @param char
 * @param tabWidth
 * @returns 
 */
export function getCharDisplayWidth(char: string, tabWidth = 8): number {
  if (!char || char.length === 0) return 0;
  const codePoint = char.codePointAt(0);
  if (codePoint === undefined) return 0;
  if (tabWidth === 8) {
    const cached = CHAR_WIDTH_CACHE.get(codePoint);
    if (cached !== undefined) return cached;
  }
  const width = calculateCharWidth(codePoint, tabWidth);
  if (tabWidth === 8 && width !== tabWidth) {
    CHAR_WIDTH_CACHE.set(codePoint, width);
  }
  return width;
}

/**
 * テキストが絵文字シーケンスかどうかを判定する
 * @returns 
 */
function isEmojiSequence(text: string): boolean {
  return /[\u{1F1E6}-\u{1F1FF}]{2}/u.test(text) || /[\u{1F600}-\u{1F64F}]/u.test(text) ||
         /[\u{1F300}-\u{1F5FF}]/u.test(text) || /[\u{1F680}-\u{1F6FF}]/u.test(text) ||
         /[\u{1F900}-\u{1F9FF}]/u.test(text);
}

/**
 * テキストの表示幅を計算する（フォールバック版）
 * @param text
 * @param tabWidth
 * @returns 
 */
function getDisplayWidthFallback(text: string, tabWidth = 8): number {
  let totalWidth = 0;
  for (let i = 0; i < text.length;) {
    const codePoint = text.codePointAt(i);
    if (codePoint === undefined) {
      i++;
      continue;
    }
    const char = String.fromCodePoint(codePoint);
    totalWidth += getCharDisplayWidth(char, tabWidth);
    i += codePoint > 0xFFFF ? 2 : 1;
  }
  return totalWidth;
}

/**
 * テキストの表示幅を計算する（グラフェムクラスター対応）
 * @param text
 * @param tabWidth
 * @returns 
 */
export function getDisplayWidth(text: string, tabWidth = 8): number {
  if (text == null || text.length === 0) return 0;
  let totalWidth = 0;
  try {
    let segmenter: Intl.Segmenter;
    try {
      segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    } catch (e) {
      return getDisplayWidthFallback(text, tabWidth);
    }
    for (const segment of segmenter.segment(text)) {
      const cluster = segment.segment;
      if (cluster.length === 1) {
        totalWidth += getCharDisplayWidth(cluster, tabWidth);
      } else {
        const hasZWJ = cluster.includes('\u200D');
        const hasEmojiModifier = /[\u{1F3FB}-\u{1F3FF}]/u.test(cluster);
        const hasVariationSelector = /[\uFE0E\uFE0F]/u.test(cluster);
        if (hasZWJ || hasEmojiModifier || hasVariationSelector || isEmojiSequence(cluster)) {
          totalWidth += 2;
        } else {
          for (let i = 0; i < cluster.length;) {
            const codePoint = cluster.codePointAt(i);
            if (codePoint === undefined) {
              i++;
              continue;
            }
            const char = String.fromCodePoint(codePoint);
            totalWidth += getCharDisplayWidth(char, tabWidth);
            i += codePoint > 0xFFFF ? 2 : 1;
          }
        }
      }
    }
  } catch (error) {
    return getDisplayWidthFallback(text, tabWidth);
  }
  return totalWidth;
}

// ===== End Display Width Functions =====

/** バッチ処理を開始する単語数の閾値 */
export const BATCH_PROCESS_THRESHOLD = 500;

/** バッチ処理時のバッチサイズ */
export const BATCH_BATCH_SIZE = 250;

// 統一されたエンコーディングユーティリティを使用
import { getByteLength } from "./word.ts";

/**
 * 文字インデックスを表示column位置に変換（0ベース→1ベース、tab対応）
 * @param line
 * @param charIndex
 * @param tabWidth
 * @returns 
 */
export function convertToDisplayColumn(line: string, charIndex: number, tabWidth = 8): number {
  if (charIndex <= 0) {
    return 1;
  }

  // Get substring from start to charIndex
  const substring = line.slice(0, charIndex);
  return getDisplayWidth(substring, tabWidth);
}

/**
 * 単語の表示終了column位置を取得（tab・マルチバイト対応）
 * @param word
 * @param tabWidth
 * @returns 
 */
export function getWordDisplayEndCol(word: Word, tabWidth = 8): number {
  const textWidth = getDisplayWidth(word.text, tabWidth);
  return word.col + textWidth - 1;
}

/** 2つの単語が表示幅で隣接しているかチェック（gap <= 0で隣接判定） */
/**
 * 2つの単語が表示幅で隣接しているかチェック（gap <= 0で隣接判定）
 * @param word1
 * @param word2
 * @param tabWidth
 * @returns 
 */
export function areWordsAdjacent(word1: Word, word2: Word, tabWidth = 8): boolean {
  // Must be on the same line
  if (word1.line !== word2.line) {
    return false;
  }

  // Calculate display end positions
  const word1EndCol = getWordDisplayEndCol(word1, tabWidth);
  const word2EndCol = getWordDisplayEndCol(word2, tabWidth);

  // Calculate distance between words
  let distance: number;
  if (word1.col < word2.col) {
    // word1 comes before word2
    distance = word2.col - word1EndCol - 1;
  } else {
    // word2 comes before word1
    distance = word1.col - word2EndCol - 1;
  }

  // Adjacent if touching (distance 0) or overlapping (negative distance)
  // Distance 0 = touching, Distance 1 = one space between (not adjacent), Distance < 0 = overlapping
  return distance <= 0;
}

/**
 * モードに応じた割り当てキャッシュを取得
 * @param mode
 * @returns 
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
 * @param words
 * @param cursorLine
 * @param cursorCol
 * @returns 
 */
function createAssignmentCacheKey(
  words: Word[],
  cursorLine: number,
  cursorCol: number,
  hintPositionSetting: string,
  optimizationConfig?: { skipOverlapDetection?: boolean },
): string {
  const positionSignature = hashString(
    words.map((w) => `${w.line},${w.col}`).join(";"),
  );
  const skipOverlap = optimizationConfig?.skipOverlapDetection ?? false;
  return `${words.length}-${cursorLine}-${cursorCol}-${hintPositionSetting}-${skipOverlap}-${positionSignature}`;
}

/**
 * 文字列をハッシュ化
 * @param value
 * @returns 
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
 * @param word
 * @param hint
 * @param effectiveHintPosition
 * @returns 
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
 * @param word
 * @param hint
 * @param effectiveHintPosition
 * @returns 
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
 * @param cacheKey
 * @param sortedWords
 */
function storeAssignmentCache(
  cache: ReturnType<typeof globalCache.getCache>,
  cacheKey: string,
  sortedWords: Word[],
): void {
  // GlobalCacheのLRUアルゴリズムが自動的にサイズ管理を行う
  cache.set(cacheKey, sortedWords.slice());
}

// HintMapping interface moved to types.ts for consolidation
// Use: import type { HintMapping } from "./types.ts";

/**
 * ヒント生成のオプション
 */
export interface GenerateHintsOptions {
  /** ヒント文字として使用するマーカー配列 */
  markers?: string[];
  /** 最大ヒント数制限 */
  maxHints?: number;
  /** 複数文字ヒント用のキー配列 */
  keys?: string[];
  /** 数字専用モード */
  numeric?: boolean;
  /** グループベースのヒント生成 */
  groups?: boolean;
  /** 1文字ヒント用のキー配列（groupsモード時） */
  singleCharKeys?: string[];
  /** 複数文字ヒント用のキー配列（groupsモード時） */
  multiCharKeys?: string[];
  /** 1文字ヒントの最大数（groupsモード時） */
  maxSingleCharHints?: number;
  /** 数字複数文字ヒントを使用（groupsモード時） */
  useNumericMultiCharHints?: boolean;
}

/**
 * 指定数のヒントを生成する（統合版）
 */
export function generateHints(wordCount: number, options?: GenerateHintsOptions): string[];

export function generateHints(wordCount: number, markers?: string[], maxHints?: number): string[];
export function generateHints(
  wordCount: number,
  optionsOrMarkers?: GenerateHintsOptions | string[],
  maxHints?: number
): string[] {
  // 旧シグネチャとの互換性を保つ
  let options: GenerateHintsOptions;
  if (Array.isArray(optionsOrMarkers)) {
    // 旧シグネチャ: generateHints(wordCount, markers, maxHints)
    options = {
      markers: optionsOrMarkers,
      maxHints: maxHints,
    };
  } else {
    // 新シグネチャ: generateHints(wordCount, options)
    options = optionsOrMarkers || {};
  }

  // ヒント数制限を適用
  const effectiveWordCount = options.maxHints ? Math.min(wordCount, options.maxHints) : wordCount;

  if (effectiveWordCount <= 0) {
    return [];
  }

  // Strategy パターンを使用してヒント生成（Factory経由）
  const config: HintKeyConfig = {
    singleCharKeys: options.singleCharKeys,
    multiCharKeys: options.multiCharKeys,
    maxSingleCharHints: options.maxSingleCharHints,
    useNumericMultiCharHints: options.useNumericMultiCharHints || options.numeric,
    markers: options.markers || DEFAULT_HINT_MARKERS.split(""),
  };

  return HintGeneratorFactory.generate(effectiveWordCount, config);
}

/**
 * 単語にヒントを割り当てる（最適化版）
 */
export function assignHintsToWords(
  words: Word[],
  hints: string[],
  cursorLine: number,
  cursorCol: number,
  mode: string = "normal",
  config?: { hintPosition?: string },
  optimizationConfig?: { skipOverlapDetection?: boolean },
): HintMapping[] {
  if (words.length === 0 || hints.length === 0) {
    return [];
  }

  const hintPositionSetting = config?.hintPosition ?? "start";

  const assignmentCache = getAssignmentCacheForMode(mode);

  // キャッシュキーを生成（単語の位置とカーソル位置、モード情報、最適化設定を考慮）
  const cacheKey = createAssignmentCacheKey(
    words,
    cursorLine,
    cursorCol,
    hintPositionSetting,
    optimizationConfig,
  );

  // キャッシュヒットチェック
  const cachedWords = assignmentCache.get(cacheKey);
  if (cachedWords) {
    const effectiveHintPosition = hintPositionSetting;

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
  const effectiveHintPosition = hintPositionSetting;

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

// generateMultiCharHintsOptimized: Strategy パターンに移行（hint-generator-strategies.ts）

/**
 * カーソル位置からの距離で単語を最適化してソート
 * @param words
 * @param cursorCol
 * @returns 
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
 * @param words
 * @param cursorCol
 * @returns 
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
 * @param batches
 * @param cursorCol
 * @returns 
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
 */
export function clearHintCache(): void {
  hintCache.clear();
  assignmentCacheNormal.clear();
  assignmentCacheVisual.clear();
  assignmentCacheOther.clear();
}

/**
 * キャッシュの統計情報を取得
 */
export function getHintCacheStats(): { hintCacheSize: number; assignmentCacheSize: number } {
  return {
    hintCacheSize: hintCache.size(),
    assignmentCacheSize: assignmentCacheNormal.size() + assignmentCacheVisual.size() +
      assignmentCacheOther.size(),
  };
}

/**
 * GlobalCacheを使用したhintシステムの詳細統計情報を取得
 * @returns 
 */
/**
 * ヒント関連のキャッシュ統計を集約した型
 */
interface HintCacheStatistics {
  [key: string]: CacheStatistics | number;
  totalSize: number;
  totalHits: number;
  totalMisses: number;
  overallHitRate: number;
}

export function getGlobalCacheStats(): HintCacheStatistics {
  const allStats = globalCache.getAllStats();
  const hintRelatedTypes = [
    'HINTS',
    'HINT_ASSIGNMENT_NORMAL',
    'HINT_ASSIGNMENT_VISUAL',
    'HINT_ASSIGNMENT_OTHER'
  ];

  const hintStats: Record<string, CacheStatistics> = {};
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
 * ヒント位置計算のオプション
 */
export interface CalculateHintPositionOptions {
  /** ヒント位置設定（"start", "end", "overlay", "both"） */
  hintPosition?: string;
  /** 座標系（"vim" または "nvim"）。指定するとVim/Neovim座標変換が有効になる */
  coordinateSystem?: 'vim' | 'nvim';
  /** 表示モード（"before", "after", "overlay"） */
  displayMode?: 'before' | 'after' | 'overlay';
  /** デバッグログの有効化 */
  enableDebug?: boolean;
  /** タブ幅（デフォルト: 8） */
  tabWidth?: number;
}

/**
 * ヒント表示位置を計算する（統合版）
 */
export function calculateHintPosition(
  word: Word,
  hintPositionOrOptions?: string | CalculateHintPositionOptions,
): HintPosition | HintPositionWithCoordinateSystem {
  // オプションの正規化
  const options: CalculateHintPositionOptions = typeof hintPositionOrOptions === 'string'
    ? { hintPosition: hintPositionOrOptions }
    : (hintPositionOrOptions || {});

  const hintPosition = options.hintPosition || 'start';
  const tabWidth = options.tabWidth || 8;
  const enableDebug = options.enableDebug || false;
  const coordinateSystem = options.coordinateSystem;

  // 座標系変換が必要な場合（coordinateSystemが指定されている）
  if (coordinateSystem) {
    let col: number;
    let byteCol: number;
    let display_mode: "before" | "after" | "overlay";

    // displayModeが明示的に指定されている場合は優先
    if (options.displayMode) {
      display_mode = options.displayMode;
    }

    switch (hintPosition) {
      case "start":
        col = word.col; // 1ベース
        byteCol = word.byteCol || word.col;
        if (!options.displayMode) display_mode = "before";
        break;
      case "end":
        col = word.col + word.text.length - 1; // 1ベース
        if (word.byteCol) {
          const textByteLength = getByteLength(word.text);
          byteCol = word.byteCol + textByteLength - 1;
        } else {
          byteCol = col;
        }
        if (!options.displayMode) display_mode = "after";
        break;
      case "overlay":
        col = word.col; // 1ベース
        byteCol = word.byteCol || word.col;
        if (!options.displayMode) display_mode = "overlay";
        break;
      case "both":
        // bothモードはstartの位置を返す
        col = word.col;
        byteCol = word.byteCol || word.col;
        if (!options.displayMode) display_mode = "before";
        break;
      default:
        col = word.col; // 1ベース
        byteCol = word.byteCol || word.col;
        if (!options.displayMode) display_mode = "before";
        break;
    }

    // 座標系変換 - Vimは表示列、Neovimはバイト位置を使用
    const vim_line = word.line; // Vim: 1ベース行番号
    const nvim_line = word.line - 1; // Neovim: 0ベース行番号
    const vim_col = col; // Vim: 1ベース表示列番号
    const nvim_col = Math.max(0, byteCol - 1); // Neovim: 0ベースバイト列番号

    if (enableDebug) {
      // デバッグログ（必要に応じて実装）
    }

    return {
      line: word.line,
      col: col,
      display_mode: display_mode!,
      vim_col,
      nvim_col,
      vim_line,
      nvim_line,
    };
  }

  // 通常の処理（座標系変換なし）
  let col: number;
  let display_mode: "before" | "after" | "overlay";

  // displayModeが明示的に指定されている場合は優先
  if (options.displayMode) {
    display_mode = options.displayMode;
  }

  // bothモードの場合はstartとend両方の位置を計算する必要があるが、
  // この関数は単一のHintPositionを返すため、startの位置を返す
  if (hintPosition === "both") {
    col = word.col;
    if (!options.displayMode) display_mode = "before";
  } else {
    switch (hintPosition) {
      case "start":
        col = word.col;
        if (!options.displayMode) display_mode = "before";
        break;
      case "end":
        // 表示幅を使用してend位置を計算
        col = getWordDisplayEndCol(word, tabWidth);
        if (!options.displayMode) display_mode = "after";
        break;
      case "overlay":
        col = word.col;
        if (!options.displayMode) display_mode = "overlay";
        break;
      default:
        // 無効な設定の場合はデフォルトで "start" 動作
        col = word.col;
        if (!options.displayMode) display_mode = "before";
        break;
    }
  }

  return {
    line: word.line,
    col: col,
    display_mode: display_mode!,
  };
}

// HintKeyConfig interface moved to types.ts for consolidation
// Use: import type { HintKeyConfig } from "./types.ts";

// generateHintsWithGroupsImpl: Strategy パターンに移行（hint-generator-strategies.ts の HybridHintStrategy に統合済み）
// generateSingleCharHints: Strategy パターンに移行（hint-generator-strategies.ts の SingleCharHintStrategy に統合済み）

/**
 * 指定されたキーから複数文字ヒントを生成（多段階フォールバック付き）
 * @param keys
 * @param count
 * @returns 
 */

/**
 * キー配列が数字のみで構成されているかをチェック
 */
export function isNumericOnlyKeys(keys: string[]): boolean {
  // 型チェックを追加（文字列が渡された場合の防御）
  if (!Array.isArray(keys) || keys.length === 0) {
    return false;
  }
  return keys.every(key => key.length === 1 && key >= "0" && key <= "9");
}

// generateNumericHintsImpl: Strategy パターンに移行（hint-generator-strategies.ts の NumericHintStrategy に統合済み）

export function generateMultiCharHintsFromKeys(
  keys: string[],
  count: number,
  startLength: number = 2,
): string[] {
  const hints: string[] = [];
  if (count <= 0 || keys.length === 0) {
    return hints;
  }

  // 数字専用モードの判定
  if (isNumericOnlyKeys(keys)) {
    // 数字専用モード: 00-99を優先順位に基づいて生成
    // 優先順位: 01-09, 10-99, 00

    // 01-09を生成
    for (let i = 1; i <= 9 && hints.length < count; i++) {
      hints.push(String(i).padStart(2, "0"));
    }

    // 10-99を生成
    for (let i = 10; i < 100 && hints.length < count; i++) {
      hints.push(String(i).padStart(2, "0"));
    }

    // 最後に00を生成
    if (hints.length < count) {
      hints.push("00");
    }

    return hints;
  }

  // 通常モード: 従来の2文字組み合わせ生成
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

// isAlphanumeric, isValidSymbol, isWhitespace, isControlCharacter, isDigit は
// validation-utils.ts からインポートされています

/**
 * 有効な記号のリスト定数（validateCharacterValidity関数で使用）
 */
const VALID_SYMBOLS = [";", ":", "[", "]", "'", '"', ",", ".", "/", "\\", "-", "=", "`"];

/**
 * singleCharKeysの文字の妥当性を検証
 * @param keys
 * @returns 
 */
function validateCharacterValidity(keys: string[]): string[] {
  const errors: string[] = [];
  const invalidChars: string[] = [];
  const whitespaceChars: string[] = [];
  const controlChars: string[] = [];

  for (const key of keys) {
    if (key.length !== 1) continue; // 長さエラーは別の関数で検出

    if (isWhitespace(key)) {
      whitespaceChars.push(key);
      continue;
    }

    if (isControlCharacter(key)) {
      controlChars.push(key);
      continue;
    }

    if (!isAlphanumeric(key) && !isValidSymbol(key)) {
      invalidChars.push(key);
    }
  }

  if (whitespaceChars.length > 0) {
    errors.push(`singleCharKeys cannot contain whitespace characters: ${JSON.stringify(whitespaceChars)}`);
  }
  if (controlChars.length > 0) {
    errors.push(`singleCharKeys cannot contain control characters: ${JSON.stringify(controlChars)}`);
  }
  if (invalidChars.length > 0) {
    errors.push(
      `singleCharKeys contains invalid characters: ${invalidChars.join(", ")} (allowed: a-z, A-Z, 0-9, ${VALID_SYMBOLS.join(" ")})`
    );
  }

  return errors;
}

/**
 * 数字専用モードの整合性を検証
 * @returns 
 */
function validateNumericOnlyMode(config: HintKeyConfig): string[] {
  const errors: string[] = [];

  if (config.numericOnlyMultiChar === true && config.multiCharKeys) {
    const isAllDigits = config.multiCharKeys.every(isDigit);

    if (!isAllDigits) {
      const nonDigits = config.multiCharKeys.filter((k) => !isDigit(k));
      errors.push(
        `numericOnlyMultiChar is true but multiCharKeys contains non-digit characters: ${nonDigits.join(", ")}`
      );
    }
  }

  return errors;
}

/**
 * ヒントキー設定の検証
 */
export function validateHintKeyConfig(config: HintKeyConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 1文字キーの検証
  if (config.singleCharKeys) {
    // 長さの検証
    const invalidLength = config.singleCharKeys.filter((k) => k.length !== 1);
    if (invalidLength.length > 0) {
      errors.push(`Invalid single char keys (must be single character): ${invalidLength.join(", ")}`);
    }

    // 空文字列の検証
    if (config.singleCharKeys.some((k) => k.length === 0)) {
      errors.push("singleCharKeys cannot contain empty strings");
    }

    // 文字の妥当性検証
    errors.push(...validateCharacterValidity(config.singleCharKeys));

    // 重複チェック
    const uniqueKeys = new Set(config.singleCharKeys);
    if (uniqueKeys.size !== config.singleCharKeys.length) {
      errors.push("singleCharKeys must contain unique values");
    }
  }

  // 2文字キーの検証（実際は1文字である必要がある）
  if (config.multiCharKeys) {
    const invalidMulti = config.multiCharKeys.filter((k) => k.length !== 1);
    if (invalidMulti.length > 0) {
      errors.push(`Multi char keys must be single characters: ${invalidMulti.join(", ")}`);
    }
  }

  // 重複チェック（singleCharKeysとmultiCharKeysの間）
  if (config.singleCharKeys && config.multiCharKeys) {
    const overlap = config.singleCharKeys.filter((k) => config.multiCharKeys!.includes(k));
    if (overlap.length > 0) {
      errors.push(`Keys cannot be in both groups: ${overlap.join(", ")}`);
    }
  }

  // 数字専用モードの検証
  errors.push(...validateNumericOnlyMode(config));

  // max_single_char_hints の検証
  if (config.maxSingleCharHints !== undefined) {
    if (config.maxSingleCharHints < 0) {
      errors.push("max_single_char_hints must be non-negative");
    }
  }

  // useNumericMultiCharHints の検証
  if (config.useNumericMultiCharHints !== undefined) {
    if (typeof config.useNumericMultiCharHints !== "boolean") {
      errors.push("useNumericMultiCharHints must be a boolean value");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ===== Hint Overlap Detection Functions =====

/**
 * 隣接単語検出結果のキャッシュ - オーバーラップ検出の最適化用
 */
let adjacencyCache = GlobalCache.getInstance().getCache<string, { word: Word; adjacentWords: Word[] }[]>(CacheType.ADJACENCY);

/**
 * 隣接する単語を検出する
 * @param words
 * @returns 
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
 * @param word
 * @returns 
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
 * @param word
 * @param adjacentWords
 * @param priorityRules
 * @param priorityRules
 * @param priorityRules
 * @returns 
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
 * @param word
 * @param adjacentWords
 * @param minHintWidth
 * @param tabWidth
 * @returns 
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
 * @param words
 * @param tabWidth
 * @returns 
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
 * @param lineWords
 * @param tabWidth
 * @returns 
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
 * @param wordInfo
 * @param allWords
 * @param tabWidth
 * @returns 
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
 * @param conflictingWords
 * @returns 
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
 * @param words
 * @returns 
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

// ===== Additional Utility Functions from hint-utils.ts =====

/**
 * 単語の表示開始column位置を取得
 * @param word
 * @param word
 * @returns 
 */
export function getWordDisplayStartCol(word: Word, tabWidth = 8): number {
  return word.col;
}

/**
 * 位置が単語の表示範囲内にあるかをチェック
 * @param position
 * @param word
 * @param word
 * @param word
 * @returns 
 */
export function isPositionWithinWord(position: number, word: Word, tabWidth = 8): boolean {
  const startCol = getWordDisplayStartCol(word, tabWidth);
  const endCol = getWordDisplayEndCol(word, tabWidth);
  return position >= startCol && position <= endCol;
}

/**
 * 表示位置での2つの単語間のギャップを計算
 * @param word1
 * @param word2
 * @returns 
 */
export function calculateWordGap(word1: Word, word2: Word, tabWidth = 8): number {
  if (word1.line !== word2.line) {
    return Infinity; // Different lines
  }

  const word1EndCol = getWordDisplayEndCol(word1, tabWidth);
  const word2EndCol = getWordDisplayEndCol(word2, tabWidth);

  if (word1.col < word2.col) {
    // word1 comes before word2
    return word2.col - word1EndCol - 1;
  } else {
    // word2 comes before word1
    return word1.col - word2EndCol - 1;
  }
}

// ===================================================================
// HintManager Class Integration (migrated from hint/manager.ts)
// ===================================================================

/**
 * HintManagerクラス - ヒント管理システム
 */
export class HintManager {
  /** ヒント管理に必要な設定オブジェクト */
  private config: Config;
  /** 現在のキーコンテキスト */
  private currentKeyContext?: string;

  /**
 * HintManagerのコンストラクタ
   */
  constructor(config: Config) {
    this.config = config;
    this.currentKeyContext = config.currentKeyContext;
  }

  /**
 * キー押下時の処理
 * @param key
   */
  onKeyPress(key: string): void {
    const hasKeyChanged = this.currentKeyContext !== key;

    if (hasKeyChanged) {
      this.clearCurrentHints();
    }

    // キーコンテキストの更新（内部状態と設定オブジェクトの両方）
    this.currentKeyContext = key;
    this.config.currentKeyContext = key;
  }

  /**
 * キー別最小文字数の取得
 * @param key
 * @returns 
   */
  getMinLengthForKey(key: string): number {
    return Core.getMinLengthForKey(this.config, key);
  }

  /**
 * 現在のヒントを即座にクリア
   */
  clearCurrentHints(): void {
    // 即座のヒントクリア機能の基本実装
    // この段階では状態管理を行い、実際のUI操作は将来の統合で実装予定

    // 内部状態をリセット
    // キー変更時の即座クリアを保証

    // キーコンテキストの変更を記録
    if (this.currentKeyContext) {
      // 前のキーコンテキストでのヒント状態をクリア
      // 実際のUI操作は統合フェーズで実装
    }
  }

  /**
 * 現在のキーコンテキストを取得
 * @returns 
   */
  getCurrentKeyContext(): string | undefined {
    return this.currentKeyContext;
  }

  /**
 * 設定オブジェクトへの読み取り専用アクセス
 * @returns 
   */
  getConfig(): Readonly<Config> {
    return this.config;
  }
}

// ===== 互換性のための非推奨エイリアス =====

