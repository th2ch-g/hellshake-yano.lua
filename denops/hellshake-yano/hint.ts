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
/** ASCII文字幅キャッシュの初期化 */
for (let i = 0x20; i <= 0x7E; i++) {
  if (!CHAR_WIDTH_CACHE.has(i)) CHAR_WIDTH_CACHE.set(i, 1);
}

function calculateCharWidth(codePoint: number, tabWidth: number): number {
  if (codePoint === 0x09) return tabWidth;
  if (codePoint >= 0x20 && codePoint <= 0x7E) return 1;
  if (codePoint < 0x20 || (codePoint >= 0x7F && codePoint < 0xA0)) return 0;
  // CJK、絵文字、数学記号、全角記号などの全角文字
  if ((codePoint >= 0x00B0 && codePoint <= 0x00F7) ||
      (codePoint >= 0x2000 && codePoint <= 0x2EFF) ||
      (codePoint >= 0x3000 && codePoint <= 0x9FFF) ||
      (codePoint >= 0xF900 && codePoint <= 0xFAFF) ||
      (codePoint >= 0xFF00 && codePoint <= 0xFFEF) ||
      (codePoint >= 0x1F000 && codePoint <= 0x1F9FF) ||
      (codePoint >= 0x20000 && codePoint <= 0x2EBEF)) return 2;
  return 1;
}
export function getCharDisplayWidth(char: string, tabWidth = 8): number {
  if (!char) return 0;
  const codePoint = char.codePointAt(0);
  if (codePoint === undefined) return 0;
  if (tabWidth === 8 && CHAR_WIDTH_CACHE.has(codePoint)) {
    return CHAR_WIDTH_CACHE.get(codePoint)!;
  }
  const width = calculateCharWidth(codePoint, tabWidth);
  if (tabWidth === 8 && width !== tabWidth) CHAR_WIDTH_CACHE.set(codePoint, width);
  return width;
}

export function getDisplayWidth(text: string, tabWidth = 8): number {
  if (!text) return 0;
  let totalWidth = 0;
  for (let i = 0; i < text.length;) {
    const codePoint = text.codePointAt(i);
    if (codePoint === undefined) { i++; continue; }
    totalWidth += calculateCharWidth(codePoint, tabWidth);
    i += codePoint > 0xFFFF ? 2 : 1;
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
function createSingleHintMapping(word: Word, hint: string, effectiveHintPosition: string): HintMapping {
  let cachedHintCol: number | undefined;
  let cachedHintByteCol: number | undefined;
  const compute = () => {
    if (cachedHintCol === undefined) {
      if (effectiveHintPosition === "end") {
        cachedHintCol = word.col + word.text.length - 1;
        cachedHintByteCol = word.byteCol ? word.byteCol + getByteLength(word.text) - 1 : cachedHintCol;
      } else {
        cachedHintCol = word.col;
        cachedHintByteCol = word.byteCol ?? word.col;
      }
    }
  };
  return {
    word, hint,
    get hintCol(): number { compute(); return cachedHintCol ?? word.col; },
    get hintByteCol(): number { compute(); return cachedHintByteCol ?? (word.byteCol ?? word.col); }
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
    if (hintPositionSetting === "both") {
      const mappings: HintMapping[] = [];
      cachedWords.forEach((word, i) => {
        if (hints[i * 2]) mappings.push(createSingleHintMapping(word, hints[i * 2], "start"));
        if (hints[i * 2 + 1]) mappings.push(createSingleHintMapping(word, hints[i * 2 + 1], "end"));
      });
      return mappings;
    }
    return cachedWords.map((word, i) => createSingleHintMapping(word, hints[i] || "", hintPositionSetting));
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
  const mappings: HintMapping[] = [];
  if (hintPositionSetting === "both") {
    sortedWords.forEach((word, i) => {
      if (hints[i * 2]) mappings.push(createSingleHintMapping(word, hints[i * 2], "start"));
      if (hints[i * 2 + 1]) mappings.push(createSingleHintMapping(word, hints[i * 2 + 1], "end"));
    });
  } else {
    sortedWords.forEach((word, i) => mappings.push(createSingleHintMapping(word, hints[i] || "", hintPositionSetting)));
  }
  storeAssignmentCache(assignmentCache, cacheKey, sortedWords);
  return mappings;
}
function sortWordsByDistanceOptimized(words: Word[], cursorLine: number, cursorCol: number): Word[] {
  return words.map(word => ({
    word,
    distance: Math.abs(word.line - cursorLine) * 1000 + Math.abs(word.col - cursorCol)
  }))
  .sort((a, b) => a.distance !== b.distance ? a.distance - b.distance :
    a.word.line !== b.word.line ? a.word.line - b.word.line : a.word.col - b.word.col)
  .map(item => item.word);
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
export interface CalculateHintPositionOptions {
  hintPosition?: string;
  coordinateSystem?: 'vim' | 'nvim';
  displayMode?: 'before' | 'after' | 'overlay';
  enableDebug?: boolean;
  tabWidth?: number;
}

export function calculateHintPosition(
  word: Word,
  hintPositionOrOptions?: string | CalculateHintPositionOptions,
): HintPosition | HintPositionWithCoordinateSystem {
  const options: CalculateHintPositionOptions = typeof hintPositionOrOptions === 'string'
    ? { hintPosition: hintPositionOrOptions } : (hintPositionOrOptions || {});
  const hintPosition = options.hintPosition || 'start';
  const tabWidth = options.tabWidth || 8;
  const isEnd = hintPosition === 'end';
  const col = isEnd ? getWordDisplayEndCol(word, tabWidth) : word.col;
  const byteCol = isEnd && word.byteCol ? word.byteCol + getByteLength(word.text) - 1 : word.byteCol || word.col;
  const display_mode = options.displayMode || (isEnd ? 'after' : hintPosition === 'overlay' ? 'overlay' : 'before');
  if (options.coordinateSystem) {
    return {
      line: word.line, col, display_mode,
      vim_col: col, nvim_col: Math.max(0, byteCol - 1),
      vim_line: word.line, nvim_line: word.line - 1
    };
  }
  return { line: word.line, col, display_mode };
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
export function prioritizeHints(words: { word: Word; adjacentWords: Word[] }[], tabWidth = 8): Word[] {
  const processed = new Set<Word>();
  return words.filter(({ word, adjacentWords }) => {
    if (processed.has(word)) return false;
    const canDisplay = canDisplayHint(word, adjacentWords, 2, tabWidth);
    if (canDisplay) processed.add(word);
    return canDisplay;
  }).map(w => w.word);
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
export class HintManager {
  private config: Config;
  private currentKeyContext?: string;
  constructor(config: Config) {
    this.config = config;
    this.currentKeyContext = config.currentKeyContext;
  }
  onKeyPress(key: string): void {
    if (this.currentKeyContext !== key) this.clearCurrentHints();
    this.currentKeyContext = key;
    this.config.currentKeyContext = key;
  }
  getMinLengthForKey(key: string): number {
    return Core.getMinLengthForKey(this.config, key);
  }
  clearCurrentHints(): void {}
  getCurrentKeyContext(): string | undefined {
    return this.currentKeyContext;
  }
  getConfig(): Readonly<Config> {
    return this.config;
  }
}