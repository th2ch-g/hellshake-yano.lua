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
 */
export type { HintKeyConfig, HintMapping, HintPosition };
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
/** 文字幅キャッシュ */
const CHAR_WIDTH_CACHE = globalCache.getCache<number, number>(CacheType.CHAR_WIDTH);
/** CJK文字範囲の定義 */
const CJK_RANGES = [[0x3000, 0x303F], [0x3040, 0x309F], [0x30A0, 0x30FF], [0x4E00, 0x9FFF], [0xFF00, 0xFFEF]] as const;
/** 絵文字範囲の定義 */
const EMOJI_RANGES = [[0x1F600, 0x1F64F], [0x1F300, 0x1F5FF], [0x1F680, 0x1F6FF], [0x1F1E6, 0x1F1FF]] as const;
/**
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
 * @returns 
 */
function isEmojiSequence(text: string): boolean {
  return /[\u{1F1E6}-\u{1F1FF}]{2}/u.test(text) || /[\u{1F600}-\u{1F64F}]/u.test(text) ||
         /[\u{1F300}-\u{1F5FF}]/u.test(text) || /[\u{1F680}-\u{1F6FF}]/u.test(text) ||
         /[\u{1F900}-\u{1F9FF}]/u.test(text);
}
/**
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
/** バッチ処理を開始する単語数の閾値 */
export const BATCH_PROCESS_THRESHOLD = 500;
/** バッチ処理時のバッチサイズ */
export const BATCH_BATCH_SIZE = 250;
import { getByteLength } from "./word.ts";
/**
 * @param line
 * @param charIndex
 * @param tabWidth
 * @returns 
 */
export function convertToDisplayColumn(line: string, charIndex: number, tabWidth = 8): number {
  if (charIndex <= 0) {
    return 1;
  }
  const substring = line.slice(0, charIndex);
  return getDisplayWidth(substring, tabWidth);
}
/**
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
 * @param word1
 * @param word2
 * @param tabWidth
 * @returns 
 */
export function areWordsAdjacent(word1: Word, word2: Word, tabWidth = 8): boolean {
  if (word1.line !== word2.line) {
    return false;
  }
  const word1EndCol = getWordDisplayEndCol(word1, tabWidth);
  const word2EndCol = getWordDisplayEndCol(word2, tabWidth);
  let distance: number;
  if (word1.col < word2.col) {
    distance = word2.col - word1EndCol - 1;
  } else {
    distance = word1.col - word2EndCol - 1;
  }
  return distance <= 0;
}
/**
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
  if (effectiveHintPosition === "both" && endHint) {
    const startMapping = createSingleHintMapping(word, hint, "start");
    const endMapping = createSingleHintMapping(word, endHint, "end");
    return [startMapping, endMapping];
  }
  return createSingleHintMapping(word, hint, effectiveHintPosition);
}
/**
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
 * @param cacheKey
 * @param sortedWords
 */
function storeAssignmentCache(
  cache: ReturnType<typeof globalCache.getCache>,
  cacheKey: string,
  sortedWords: Word[],
): void {
  cache.set(cacheKey, sortedWords.slice());
}
/**
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
 */
export function generateHints(wordCount: number, options?: GenerateHintsOptions): string[];

export function generateHints(wordCount: number, markers?: string[], maxHints?: number): string[];
export function generateHints(
  wordCount: number,
  optionsOrMarkers?: GenerateHintsOptions | string[],
  maxHints?: number
): string[] {
  let options: GenerateHintsOptions;
  if (Array.isArray(optionsOrMarkers)) {
    options = {
      markers: optionsOrMarkers,
      maxHints: maxHints,
    };
  } else {
    options = optionsOrMarkers || {};
  }
  const effectiveWordCount = options.maxHints ? Math.min(wordCount, options.maxHints) : wordCount;

  if (effectiveWordCount <= 0) {
    return [];
  }
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
  const cacheKey = createAssignmentCacheKey(
    words,
    cursorLine,
    cursorCol,
    hintPositionSetting,
    optimizationConfig,
  );
  const cachedWords = assignmentCache.get(cacheKey);
  if (cachedWords) {
    const effectiveHintPosition = hintPositionSetting;
    if (effectiveHintPosition === "both") {
      const mappings: HintMapping[] = [];
      cachedWords.forEach((word, index) => {
        const startHintIndex = index * 2;
        const endHintIndex = index * 2 + 1;
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
  let filteredWords = words;
  const shouldSkipOverlapDetection = optimizationConfig?.skipOverlapDetection ?? false;

  if (!shouldSkipOverlapDetection) {
    const adjacencyResults = detectAdjacentWords(words);
    const priorityRules = { symbolsPriority: 1, wordsPriority: 2 };
    const wordsToSkip = new Set<Word>();
    for (const { word, adjacentWords } of adjacencyResults) {
      if (shouldSkipHintForOverlap(word, adjacentWords, priorityRules)) {
        wordsToSkip.add(word);
      }
    }
    filteredWords = words.filter((word) => !wordsToSkip.has(word));
  }
  const sortedWords = sortWordsByDistanceOptimized(filteredWords, cursorLine, cursorCol);
  const effectiveHintPosition = hintPositionSetting;
  const mappings: HintMapping[] = [];

  if (effectiveHintPosition === "both") {
    sortedWords.forEach((word, index) => {
      const startHintIndex = index * 2;
      const endHintIndex = index * 2 + 1;
      const startHint = hints[startHintIndex] || "";
      const endHint = hints[endHintIndex] || "";
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
 * @param words
 * @param cursorCol
 * @returns 
 */
function sortWordsByDistanceOptimized(
  words: Word[],
  cursorLine: number,
  cursorCol: number,
): Word[] {
  if (words.length > BATCH_PROCESS_THRESHOLD) {
    return sortWordsInBatches(words, cursorLine, cursorCol);
  }
  const wordsWithDistance = words.map((word) => {
    const lineDiff = Math.abs(word.line - cursorLine);
    const colDiff = Math.abs(word.col - cursorCol);
    const distance = lineDiff * 1000 + colDiff;
    return { word, distance };
  });
  wordsWithDistance.sort((a, b) => {
    if (a.distance !== b.distance) {
      return a.distance - b.distance;
    }
    if (a.word.line !== b.word.line) {
      return a.word.line - b.word.line;
    }
    return a.word.col - b.word.col;
  });
  return wordsWithDistance.map((item) => item.word);
}
/**
 * @param words
 * @param cursorCol
 * @returns 
 */
function sortWordsInBatches(words: Word[], cursorLine: number, cursorCol: number): Word[] {
  const batchSize = BATCH_BATCH_SIZE;
  const sortedBatches: Word[][] = [];
  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    const sortedBatch = sortWordsByDistanceOptimized(batch, cursorLine, cursorCol);
    sortedBatches.push(sortedBatch);
  }
  return mergeSortedBatches(sortedBatches, cursorLine, cursorCol);
}
/**
 * @param batches
 * @param cursorCol
 * @returns 
 */
function mergeSortedBatches(batches: Word[][], cursorLine: number, cursorCol: number): Word[] {
  if (batches.length === 0) return [];
  if (batches.length === 1) return batches[0];
  const result: Word[] = [];
  const pointers = new Array(batches.length).fill(0);
  while (result.length < batches.reduce((sum, batch) => sum + batch.length, 0)) {
    let minDistance = Infinity;
    let minBatchIndex = -1;
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
 */
export function clearHintCache(): void {
  hintCache.clear();
  assignmentCacheNormal.clear();
  assignmentCacheVisual.clear();
  assignmentCacheOther.clear();
}
/**
 */
export function getHintCacheStats(): { hintCacheSize: number; assignmentCacheSize: number } {
  return {
    hintCacheSize: hintCache.size(),
    assignmentCacheSize: assignmentCacheNormal.size() + assignmentCacheVisual.size() +
      assignmentCacheOther.size(),
  };
}
/**
 * @returns 
 */
/**
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
 */
export function calculateHintPosition(
  word: Word,
  hintPositionOrOptions?: string | CalculateHintPositionOptions,
): HintPosition | HintPositionWithCoordinateSystem {
  const options: CalculateHintPositionOptions = typeof hintPositionOrOptions === 'string'
    ? { hintPosition: hintPositionOrOptions }
    : (hintPositionOrOptions || {});

  const hintPosition = options.hintPosition || 'start';
  const tabWidth = options.tabWidth || 8;
  const enableDebug = options.enableDebug || false;
  const coordinateSystem = options.coordinateSystem;
  if (coordinateSystem) {
    let col: number;
    let byteCol: number;
    let display_mode: "before" | "after" | "overlay";
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
    const vim_line = word.line; // Vim: 1ベース行番号
    const nvim_line = word.line - 1; // Neovim: 0ベース行番号
    const vim_col = col; // Vim: 1ベース表示列番号
    const nvim_col = Math.max(0, byteCol - 1); // Neovim: 0ベースバイト列番号

    if (enableDebug) {
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
  let col: number;
  let display_mode: "before" | "after" | "overlay";
  if (options.displayMode) {
    display_mode = options.displayMode;
  }
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
        col = getWordDisplayEndCol(word, tabWidth);
        if (!options.displayMode) display_mode = "after";
        break;
      case "overlay":
        col = word.col;
        if (!options.displayMode) display_mode = "overlay";
        break;
      default:
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
/**
 * @param keys
 * @param count
 * @returns 
 */
/**
 */
export function isNumericOnlyKeys(keys: string[]): boolean {
  if (!Array.isArray(keys) || keys.length === 0) {
    return false;
  }
  return keys.every(key => key.length === 1 && key >= "0" && key <= "9");
}
export function generateMultiCharHintsFromKeys(
  keys: string[],
  count: number,
  startLength: number = 2,
): string[] {
  const hints: string[] = [];
  if (count <= 0 || keys.length === 0) {
    return hints;
  }
  if (isNumericOnlyKeys(keys)) {

    for (let i = 1; i <= 9 && hints.length < count; i++) {
      hints.push(String(i).padStart(2, "0"));
    }
    for (let i = 10; i < 100 && hints.length < count; i++) {
      hints.push(String(i).padStart(2, "0"));
    }
    if (hints.length < count) {
      hints.push("00");
    }
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
 */
const VALID_SYMBOLS = [";", ":", "[", "]", "'", '"', ",", ".", "/", "\\", "-", "=", "`"];
/**
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
 */
export function validateHintKeyConfig(config: HintKeyConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (config.singleCharKeys) {
    const invalidLength = config.singleCharKeys.filter((k) => k.length !== 1);
    if (invalidLength.length > 0) {
      errors.push(`Invalid single char keys (must be single character): ${invalidLength.join(", ")}`);
    }
    if (config.singleCharKeys.some((k) => k.length === 0)) {
      errors.push("singleCharKeys cannot contain empty strings");
    }
    errors.push(...validateCharacterValidity(config.singleCharKeys));
    const uniqueKeys = new Set(config.singleCharKeys);
    if (uniqueKeys.size !== config.singleCharKeys.length) {
      errors.push("singleCharKeys must contain unique values");
    }
  }
  if (config.multiCharKeys) {
    const invalidMulti = config.multiCharKeys.filter((k) => k.length !== 1);
    if (invalidMulti.length > 0) {
      errors.push(`Multi char keys must be single characters: ${invalidMulti.join(", ")}`);
    }
  }
  if (config.singleCharKeys && config.multiCharKeys) {
    const overlap = config.singleCharKeys.filter((k) => config.multiCharKeys!.includes(k));
    if (overlap.length > 0) {
      errors.push(`Keys cannot be in both groups: ${overlap.join(", ")}`);
    }
  }
  errors.push(...validateNumericOnlyMode(config));
  if (config.maxSingleCharHints !== undefined) {
    if (config.maxSingleCharHints < 0) {
      errors.push("max_single_char_hints must be non-negative");
    }
  }
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
/**
 */
let adjacencyCache = GlobalCache.getInstance().getCache<string, { word: Word; adjacentWords: Word[] }[]>(CacheType.ADJACENCY);

/**
 * @param words
 * @returns 
 */
export function detectAdjacentWords(words: Word[]): { word: Word; adjacentWords: Word[] }[] {
  if (words.length === 0) {
    return [];
  }
  const cacheKey = words.map((w) => `${w.text}:${w.line}:${w.col}`).join("|");

  if (adjacencyCache.has(cacheKey)) {
    return adjacencyCache.get(cacheKey)!;
  }
  const result: { word: Word; adjacentWords: Word[] }[] = [];
  const tabWidth = 8;

  for (const word of words) {
    const adjacentWords: Word[] = [];

    for (const otherWord of words) {
      if (word === otherWord) continue;
      if (word.line !== otherWord.line) continue;
      if (areWordsAdjacent(word, otherWord, tabWidth)) {
        adjacentWords.push(otherWord);
      }
    }

    result.push({ word, adjacentWords });
  }
  adjacencyCache.set(cacheKey, result);
  return result;
}
/**
 * @param word
 * @returns 
 */
export function isSymbolWord(word: Word): boolean {
  if (!word.text || word.text.trim().length === 0) {
    return false;
  }
  const symbolPattern = /^[\-\*#`\[\](){}.,;:!?]+$/;

  return symbolPattern.test(word.text);
}
/**
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
    if (isCurrentSymbol && !isAdjacentSymbol) {
      if (priorityRules.symbolsPriority < priorityRules.wordsPriority) {
        return true;
      }
    }
    if (isCurrentSymbol === isAdjacentSymbol) {
      if (word.text.length < adjacentWord.text.length) {
        return true;
      } else if (word.text.length === adjacentWord.text.length) {
        if (word.col < adjacentWord.col) {
          return true;
        }
      }
    }
  }
  return false;
}
/**
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
  for (const adjacentWord of adjacentWords) {
    if (word.line !== adjacentWord.line) {
      continue; // Different lines, no conflict
    }
    const adjacentWordDisplayWidth = getDisplayWidth(adjacentWord.text, tabWidth);
    const currentWordEndPos = word.col + currentWordDisplayWidth - 1;
    const adjacentWordEndPos = adjacentWord.col + adjacentWordDisplayWidth - 1;
    let availableSpace = 0;
    if (currentWordEndPos < adjacentWord.col) {
      availableSpace = adjacentWord.col - currentWordEndPos - 1;
    } // Check if current word is to the right of adjacent word
    else if (word.col > adjacentWordEndPos) {
      availableSpace = word.col - adjacentWordEndPos - 1;
    } // Words overlap or are adjacent - no space available
    else {
      availableSpace = 0;
    }
    if (availableSpace < minHintWidth) {
      return false;
    }
  }
  return true; // Sufficient space available
}
/**
 * @param words
 * @param tabWidth
 * @returns 
 */
export function prioritizeHints(
  words: { word: Word; adjacentWords: Word[] }[],
  tabWidth = 8,
): Word[] {
  const prioritizedWords: Word[] = [];
  const wordsByLine = new Map<number, { word: Word; adjacentWords: Word[] }[]>();

  for (const wordInfo of words) {
    const line = wordInfo.word.line;
    if (!wordsByLine.has(line)) {
      wordsByLine.set(line, []);
    }
    wordsByLine.get(line)!.push(wordInfo);
  }
  for (const [line, lineWords] of wordsByLine) {
    const lineResult = prioritizeWordsOnLine(lineWords, tabWidth);
    prioritizedWords.push(...lineResult);
  }
  return prioritizedWords;
}
/**
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
  const sortedWords = lineWords.sort((a, b) => a.word.col - b.word.col);

  for (const wordInfo of sortedWords) {
    if (processedWords.has(wordInfo.word)) {
      continue; // Already processed in a conflict resolution
    }
    const conflicts = findConflictingWords(wordInfo, lineWords, tabWidth);

    if (conflicts.length === 0) {
      result.push(wordInfo.word);
      processedWords.add(wordInfo.word);
    } else {
      const winner = resolveConflict([
        wordInfo,
        ...conflicts.map((w) => lineWords.find((lw) => lw.word === w)!),
      ]);
      result.push(winner);
      processedWords.add(wordInfo.word);
      for (const conflict of conflicts) {
        processedWords.add(conflict);
      }
    }
  }
  return result;
}
/**
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
 * @param conflictingWords
 * @returns 
 */
function resolveConflict(conflictingWords: { word: Word; adjacentWords: Word[] }[]): Word {
  if (conflictingWords.length === 1) {
    return conflictingWords[0].word;
  }
  const textWords = conflictingWords.filter((w) => !isSymbolWord(w.word));
  const symbolWords = conflictingWords.filter((w) => isSymbolWord(w.word));

  if (textWords.length > 0) {
    return resolveSameTypeConflict(textWords);
  } else {
    return resolveSameTypeConflict(symbolWords);
  }
}
/**
 * @param words
 * @returns 
 */
function resolveSameTypeConflict(words: { word: Word; adjacentWords: Word[] }[]): Word {
  if (words.length === 1) {
    return words[0].word;
  }
  const maxLength = Math.max(...words.map((w) => w.word.text.length));
  const longestWords = words.filter((w) => w.word.text.length === maxLength);

  if (longestWords.length === 1) {
    return longestWords[0].word;
  }
  longestWords.sort((a, b) => a.word.col - b.word.col);
  return longestWords[0].word;
}
/**
 * @param word
 * @param word
 * @returns 
 */
export function getWordDisplayStartCol(word: Word, tabWidth = 8): number {
  return word.col;
}
/**
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
    return word2.col - word1EndCol - 1;
  } else {
    return word1.col - word2EndCol - 1;
  }
}
/**
 */
export class HintManager {
  /** ヒント管理に必要な設定オブジェクト */
  private config: Config;
  /** 現在のキーコンテキスト */
  private currentKeyContext?: string;
  /**
   */
  constructor(config: Config) {
    this.config = config;
    this.currentKeyContext = config.currentKeyContext;
  }
  /**
 * @param key
   */
  onKeyPress(key: string): void {
    const hasKeyChanged = this.currentKeyContext !== key;

    if (hasKeyChanged) {
      this.clearCurrentHints();
    }
    this.currentKeyContext = key;
    this.config.currentKeyContext = key;
  }
  /**
 * @param key
 * @returns 
   */
  getMinLengthForKey(key: string): number {
    return Core.getMinLengthForKey(this.config, key);
  }
  /**
   */
  clearCurrentHints(): void {

    if (this.currentKeyContext) {
    }
  }
  /**
 * @returns 
   */
  getCurrentKeyContext(): string | undefined {
    return this.currentKeyContext;
  }
  /**
 * @returns 
   */
  getConfig(): Readonly<Config> {
    return this.config;
  }
}