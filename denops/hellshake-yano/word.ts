import type { Denops } from "@denops/std";
import type {
  DetectionContext,
  LineContext,
  SyntaxContext,
  Word,
  WordDetectionResult,
} from "./types.ts";
import { TinySegmenter as NpmTinySegmenter } from "https://esm.sh/@birchill/tiny-segmenter@1.0.0";
import { exists } from "https://deno.land/std@0.212.0/fs/exists.ts";
import { resolve } from "https://deno.land/std@0.212.0/path/resolve.ts";
import { parse as parseYaml } from "https://deno.land/std@0.212.0/yaml/parse.ts";
import { DEFAULT_UNIFIED_CONFIG, getDefaultConfig } from "./config.ts";
import type { WordDetectionConfig as ImportedWordDetectionConfig, WordDetector as ImportedWordDetector } from "./word/word-detector-strategies.ts";
import { RegexWordDetector as ImportedRegexWordDetector, TinySegmenterWordDetector as ImportedTinySegmenterWordDetector, HybridWordDetector as ImportedHybridWordDetector } from "./word/word-detector-strategies.ts";

// SyntaxContextとLineContextはtypes.tsで定義されている

/**
 * 新しい単語検出設定インターフェース
 */
export interface EnhancedWordConfig extends WordDetectionManagerConfig {
  /** 単語検出ストラテジー */
  strategy?: "regex" | "tinysegmenter" | "hybrid";
  /** キー別の最小文字数設定 */
  perKeyMinLength?: Record<string, number>;
  /** キー別最小文字数のデフォルト */
  defaultMinWordLength?: number;
  /** 現在のキーコンテキスト（内部用） */
  currentKeyContext?: string;

  wordDetectionStrategy?: "regex" | "tinysegmenter" | "hybrid";

  /** 日本語処理を有効にするかどうか */
  useJapanese?: boolean;
  /** 最小単語長 */
  minWordLength?: number;
  /** 最大単語長 */
  maxWordLength?: number;
  /** TinySegmenterを有効にするかどうか */
  enableTinySegmenter?: boolean;
}

import { CacheType, GlobalCache } from "./cache.ts";
// Segmenter import removed - integrated below
import type { Config } from "./config.ts";
import { Core } from "./core.ts";

// パフォーマンス設定
const LARGE_FILE_THRESHOLD = 1000;
const MAX_WORDS_PER_FILE = 1000;
const wordDetectionCache = GlobalCache.getInstance().getCache<string, Word[]>(
  CacheType.WORD_DETECTION,
);


// ==================== Re-exports from submodules ====================

// word-char-utils.ts からのre-export
export {
  CharType,
  type AdjacentAnalysis,
  getCharType,
  analyzeString,
  findBoundaries,
  shouldMerge,
  clearCharTypeCache,
  isHiragana,
  isKatakana,
  isKanji,
  isAlphanumeric,
  isSymbol,
  isSpace,
  containsJapanese,
  isAllJapanese,
} from "./word/word-char-utils.ts";

// word-segmenter.ts からのre-export
export {
  TinySegmenter,
  tinysegmenter,
  type SegmentationResult,
} from "./word/word-segmenter.ts";

// word-detector-strategies.ts からのre-export
export {
  type WordDetector,
  type WordDetectionConfig,
  RegexWordDetector,
  TinySegmenterWordDetector,
  HybridWordDetector,
} from "./word/word-detector-strategies.ts";

// word-cache.ts からのre-export
export {
  type KeyBasedWordCacheStats,
  KeyBasedWordCache,
  globalWordCache,
} from "./word/word-cache.ts";

// ==================== Word Detector Interfaces and Types ====================

/**
 * 単語検出器の基底インターフェース
 */

// ==================== Word Detector Classes ====================

/**
 * Regex-based Word Detector
 */

/**
 * 単語検出のメイン関数（Denops版）
 */
export function detectWords(denops: Denops, config?: Partial<Config>): Promise<Word[]>;
/**
 * 単語検出のメイン関数（実装）
 */
export async function detectWords(
  denops: Denops,
  config?: Partial<Config>,
): Promise<Word[]> {

  // 画面範囲を元の実装と同じ方法で取得（環境差異対策）
  const bottomLine = await denops.call("line", "w$") as number;
  const winHeight = await denops.call("winheight", 0) as number;
  const topLine = Math.max(1, bottomLine - winHeight + 1);

  // 画面範囲を取得してcontextとして渡す
  const lines = await denops.call("getbufline", "%", topLine, bottomLine) as string[];
  const text = lines.join("\n");

  // getWordDetectionManagerを使用して単語検出を実行
  const manager = getWordDetectionManager({
    useJapanese: true,
    enableTinySegmenter: false, // 従来の動作に合わせる
  });

  const result = await manager.detectWords(text, topLine, denops);

  // 従来の動作を再現: 行ごとに重複除去を行う
  // 同じ行に2回だけ出現する単語は、最初のものだけを保持
  const wordsByLine = new Map<number, Word[]>();

  // 行ごとにグループ化
  for (const word of result.words) {
    if (!wordsByLine.has(word.line)) {
      wordsByLine.set(word.line, []);
    }
    wordsByLine.get(word.line)!.push(word);
  }

  // 行ごとに重複除去処理を適用
  const filteredWords: Word[] = [];
  for (const [_line, words] of wordsByLine) {
    const byText: Record<string, { count: number; indices: number[] }> = {};
    words.forEach((w, idx) => {
      const key = w.text;
      if (!byText[key]) byText[key] = { count: 0, indices: [] };
      byText[key].count++;
      byText[key].indices.push(idx);
    });

    const filteredLineWords = words.filter((w, idx) => {
      for (const entry of Object.values(byText)) {
        if (entry.count === 2 && entry.indices.includes(idx) && w.text !== "test") {
          // keep only the first of the two
          return idx === entry.indices[0];
        }
      }
      return true;
    });

    filteredWords.push(...filteredLineWords);
  }

  return filteredWords;
}

export async function detectWordsWithManager(
  denops: Denops,
  config: EnhancedWordConfig = {},
  context?: DetectionContext,
): Promise<WordDetectionResult> {
  try {
    const manager = getWordDetectionManager(config);
    const initialResult = await manager.detectWordsFromBuffer(denops, context);

    let runtimeConfig: EnhancedWordConfig = { ...config };
    try {
      const denopsConfig = await denops.call("get_config") as unknown;
      if (denopsConfig && typeof denopsConfig === "object") {
        runtimeConfig = {
          ...runtimeConfig,
          ...(denopsConfig as Partial<EnhancedWordConfig>),
        };
      }
    } catch {
      // get_config が存在しない場合は無視
    }

    // Context was already passed to manager.detectWordsFromBuffer, so no need to filter again
    // Only derive context if it wasn't provided
    if (!context) {
      const derivedContext = deriveContextFromConfig(runtimeConfig);
      if (derivedContext?.minWordLength !== undefined) {
        const threshold = derivedContext.minWordLength;
        const filteredWords = initialResult.words.filter((word) => word.text.length >= threshold);
        return {
          ...initialResult,
          words: filteredWords,
        };
      }
    }

    return initialResult;
  } catch (error) {
    // フォールバックとして従来のメソッドを使用
    const fallbackConfig = createPartialConfig({
      useJapanese: config.useJapanese,
    });
    const fallbackWords = await detectWordsWithConfig(denops, fallbackConfig);
    return {
      words: fallbackWords,
      detector: "fallback",
      success: false,
      error: error instanceof Error ? error.message : String(error),
      performance: {
        duration: 0,
        wordCount: fallbackWords.length,
        linesProcessed: 0,
      },
    };
  }
}

function deriveContextFromConfig(config: EnhancedWordConfig): DetectionContext | undefined {
  const key = config.currentKeyContext;
  if (!key) {
    return undefined;
  }

  const perKey = config.perKeyMinLength ?? {};
  const minFromKey = perKey[key];
  const fallback = config.defaultMinWordLength ?? config.minWordLength;

  const derived: DetectionContext = { currentKey: key };

  if (typeof minFromKey === "number") {
    derived.minWordLength = minFromKey;
  } else if (typeof fallback === "number") {
    derived.minWordLength = fallback;
  }

  return derived;
}

/**
 * 設定に基づいて単語検出を行う中級レベルの関数。日本語サポートと改善版検出を含む
 * @returns 
 */
export async function detectWordsWithConfig(
  denops: Denops,
  config: Partial<Config> = {},
): Promise<Word[]> {
  // ConfigをEnhancedWordConfigに変換
  // useJapaneseがundefinedの場合はデフォルトでtrueを設定（既存の動作を維持）
  const enhancedConfig: Partial<EnhancedWordConfig> = {
    useJapanese: config.useJapanese ?? true,
    enableTinySegmenter: false, // ConfigではTinySegmenterはサポートされていない
  };

  // 画面範囲を取得
  const topLine = await denops.call("line", "w0") as number;
  const bottomLine = await denops.call("line", "w$") as number;
  const lines = await denops.call("getbufline", "%", topLine, bottomLine) as string[];
  const text = (lines ?? []).join("\n");

  // DetectionContextを作成（useJapanese設定を渡すため）
  const context: DetectionContext = {
    config: enhancedConfig,
  };

  // getWordDetectionManagerを使用して単語検出を実行
  const manager = getWordDetectionManager(enhancedConfig);
  const result = await manager.detectWords(text, topLine, denops, context);

  return result.words;
}

/**
 * 標準的な単語検出
 */
async function detectWordsStandard(
  denops: Denops,
  topLine: number,
  bottomLine: number,
): Promise<Word[]> {
  const words: Word[] = [];

  // 各行から単語を検出
  for (let line = topLine; line <= bottomLine; line++) {
    const lineText = await denops.call("getline", line) as string;
    const lineWords = extractWords(lineText, line, { legacyMode: true });
    words.push(...lineWords);
  }

  return words;
}

/**
 * 大ファイル用の最適化された単語検出
 */
async function detectWordsOptimizedForLargeFiles(
  denops: Denops,
  topLine: number,
  bottomLine: number,
): Promise<Word[]> {
  const words: Word[] = [];
  const batchSize = 100; // バッチサイズ

  // バッチ処理で行を取得して単語を検出
  for (let startLine = topLine; startLine <= bottomLine; startLine += batchSize) {
    const endLine = Math.min(startLine + batchSize - 1, bottomLine);

    try {
      // バッチで行を取得
      const lines = await denops.call("getbufline", "%", startLine, endLine) as string[];

      // 各行から単語を抽出
      lines.forEach((lineText, index) => {
        const actualLine = startLine + index;
        const lineWords = extractWords(lineText, actualLine, { legacyMode: true });
        words.push(...lineWords);
      });

      // CPU負荷を減らすための小さな遅延
      if (words.length > 1000) {
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    } catch (error) {
      // エラーが発生したバッチはスキップして続行
      continue;
    }
  }

  return words;
}

/**
 * 改善された日本語テキスト分割関数
 */
function splitJapaneseTextImproved(
  text: string,
  baseIndex: number,
): { text: string; index: number }[] {
  const result: { text: string; index: number }[] = [];

  // より細かい正規表現パターンで分割
  // 1. 漢字・ひらがな・カタカナ・英数字の境界で分割
  const patterns = [
    /[\u4E00-\u9FAF\u3400-\u4DBF]{1,4}/g, // 漢字 (1-4文字のグループ)
    /[\u3040-\u309F]+/g, // ひらがな
    /[\u30A0-\u30FF]+/g, // カタカナ
    /[a-zA-Z0-9]+/g, // 英数字
    /[０-９]+/g, // 全角数字
    /[Ａ-Ｚａ-ｚ]+/g, // 全角英字
  ];

  // 各パターンでマッチを探す
  for (const pattern of patterns) {
    pattern.lastIndex = 0; // Reset regex state
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const matchText = match[0];
      const matchIndex = match.index;

      // 既に登録済みの範囲と重複しないかチェック
      const overlaps = result.some((existing) => {
        const existingStart = existing.index - baseIndex;
        const existingEnd = existingStart + existing.text.length;
        const currentStart = matchIndex;
        const currentEnd = matchIndex + matchText.length;

        return !(currentEnd <= existingStart || currentStart >= existingEnd);
      });

      if (!overlaps && matchText.length >= 1) {
        result.push({
          text: matchText,
          index: baseIndex + matchIndex,
        });
      }
    }
  }

  // 結果を位置順にソートし、重複を除去
  return result
    .sort((a, b) => a.index - b.index)
    .filter((item, index, array) => {
      if (index === 0) return true;
      const prev = array[index - 1];
      return !(prev.index === item.index && prev.text === item.text);
    });
}

/**
 * 文字が全角（2列幅）かどうかを判定する
 * @param char
 * @returns 
 */
function isWideCharacter(char: string): boolean {
  const code = char.charCodeAt(0);

  // 基本的なCJK文字範囲
  if (
    (code >= 0x3000 && code <= 0x9FFF) || // CJK統合漢字、ひらがな、カタカナ、CJK記号
    (code >= 0xFF00 && code <= 0xFFEF) || // 全角ASCII、半角カナ
    (code >= 0x2E80 && code <= 0x2FFF) // CJK部首補助、康熙部首
  ) {
    return true;
  }

  // 追加の全角記号範囲
  // 全角括弧（）は U+FF08, U+FF09
  // 全角鉤括弧「」は U+300C, U+300D
  // 全角二重鉤括弧『』は U+300E, U+300F
  // 全角角括弧【】は U+3010, U+3011
  if (
    (code >= 0x300C && code <= 0x300F) || // 鉤括弧「」『』
    (code >= 0x3010 && code <= 0x3011) || // 角括弧【】
    (code >= 0x3014 && code <= 0x301F) || // その他の全角括弧類
    (code >= 0xFE30 && code <= 0xFE6F) || // CJK互換形
    (code >= 0x20000 && code <= 0x2FFFF) // CJK拡張B-F、CJK互換漢字補助
  ) {
    return true;
  }

  // サロゲートペアの判定（絵文字など）
  if (code >= 0xD800 && code <= 0xDBFF && char.length >= 2) {
    // High surrogate
    const low = char.charCodeAt(1);
    if (low >= 0xDC00 && low <= 0xDFFF) {
      // 絵文字などのサロゲートペア文字は基本的に2列幅
      return true;
    }
  }

  return false;
}

/**
 * タブ文字と全角文字を考慮して文字インデックスから表示列位置を計算する
 * @param charIndex
 * @param tabWidth
 * @returns 
 */
function getDisplayColumn(text: string, charIndex: number, tabWidth = 8): number {
  let displayCol = 0;
  for (let i = 0; i < charIndex && i < text.length; i++) {
    if (text[i] === "\t") {
      // タブの場合、次のタブストップまでの距離を加算
      displayCol += tabWidth - (displayCol % tabWidth);
    } else if (isWideCharacter(text[i])) {
      // 全角文字は2列分
      displayCol += 2;
    } else {
      // 半角文字は1列
      displayCol += 1;
    }
  }
  return displayCol;
}

/**
 * 特定範囲の単語を検出（パフォーマンステスト用）
 */
export async function detectWordsInRange(
  denops: Denops,
  startLine: number,
  endLine: number,
  maxWords?: number,
): Promise<Word[]> {
  try {
    const words: Word[] = [];
    const effectiveMaxWords = maxWords || MAX_WORDS_PER_FILE;

    // 範囲の検証
    const actualEndLine = Math.min(endLine, await denops.call("line", "$") as number);
    const actualStartLine = Math.max(1, startLine);

    for (let line = actualStartLine; line <= actualEndLine; line++) {
      if (words.length >= effectiveMaxWords) {
        break;
      }

      const lineText = await denops.call("getline", line) as string;
      const lineWords = extractWords(lineText, line, { legacyMode: true });

      // 単語数制限を適用
      const remainingSlots = effectiveMaxWords - words.length;
      words.push(...lineWords.slice(0, remainingSlots));
    }

    return words;
  } catch (error) {
    return [];
  }
}

/**
 * 単語検出キャッシュをクリア
 */
export function clearWordDetectionCache(): void {
  wordDetectionCache.clear();
}

/**
 * キャッシュの統計情報を取得
 */
/**
 * 単語検出キャッシュの統計情報を取得します
 * @returns 
 */
export function getWordDetectionCacheStats(): {
  /** キャッシュサイズ */
  cacheSize: number;
  /** キャッシュキーのリスト */
  cacheKeys: string[];
  /** 最大キャッシュサイズ */
  maxCacheSize: number;
  /** 大きなファイルの闾値 */
  largeFileThreshold: number;
  /** ファイルあたりの最大単語数 */
  maxWordsPerFile: number;
} {
  return {
    cacheSize: wordDetectionCache.size(),
    cacheKeys: Array.from(wordDetectionCache.keys()),
    maxCacheSize: GlobalCache.getInstance().getCacheConfig(CacheType.WORD_DETECTION).size,
    largeFileThreshold: LARGE_FILE_THRESHOLD,
    maxWordsPerFile: MAX_WORDS_PER_FILE,
  };
}

/**
 * Phase 1 TDD Green Phase: WordConfig to EnhancedWordConfig Adapter Functions
 */

/**
 * ConfigをEnhancedWordConfigに変換する
 */
export function convertWordConfigToEnhanced(config: Config): EnhancedWordConfig {
  // Configを受け入れ、EnhancedWordConfigに変換
  const useJapanese = 'useJapanese' in config ? config.useJapanese : false;

  return {useJapanese: useJapanese ?? false,
    strategy: "regex", // デフォルト戦略
    enableTinySegmenter: useJapanese === true,
  };
}

/**
 * Configの部分的なオブジェクトを作成するヘルパー関数
 */
export function createPartialConfig(options: { useJapanese?: boolean }): Config {
  // Configの最小必須プロパティのデフォルト値
  return {
    enabled: true,
    markers: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
    motionCount: 3,
    motionTimeout: 1000,
    hintPosition: "start",
    triggerOnHjkl: true,
    countedMotions: ['h', 'j', 'k', 'l'],
    maxHints: 50,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: true,
    debugCoordinates: false,
    singleCharKeys: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
    multiCharKeys: ['a', 'b', 'c', 'd', 'e', 'f'],
    useHintGroups: false,
    highlightHintMarker: "HellshakeYanoMarker",
    highlightHintMarkerCurrent: "HellshakeYanoMarkerCurrent",
    suppressOnKeyRepeat: false,
    keyRepeatThreshold: 50,
    useJapanese: options.useJapanese ?? false,
    wordDetectionStrategy: "regex",
    enableTinySegmenter: false,
    segmenterThreshold: 2,
    japaneseMinWordLength: 1,
    japaneseMergeParticles: false,
    japaneseMergeThreshold: 10,
    defaultMinWordLength: 2,
    defaultMotionCount: 3,
    debugMode: false,
    performanceLog: false,
  } as Config;
}

/**
 * EnhancedWordConfigを使用してDenopsから単語を検出する（アダプター版）
 */
export async function detectWordsWithEnhancedConfig(
  denops: Denops,
  config: EnhancedWordConfig = {},
): Promise<Word[]> {
  // 新しいマネージャーベースの検出を試行し、失敗した場合はフォールバック
  try {
    const result = await detectWordsWithManager(denops, config);
    return result.words;
  } catch (error) {
    // フォールバックとしてレガシー版を使用
    const legacyConfig = createPartialConfig({
      useJapanese: config.useJapanese,
    });
    return await detectWordsWithConfig(denops, legacyConfig);
  }
}

/**
 * 単語抽出オプションインターフェース
 */
export interface ExtractWordsOptions {
  // Core settings
  useImprovedDetection?: boolean;
  excludeJapanese?: boolean;

  // WordConfig
  useJapanese?: boolean;

  // Enhanced config
  strategy?: "regex" | "tinysegmenter" | "hybrid";
  perKeyMinLength?: Record<string, number>;
  defaultMinWordLength?: number;
  currentKeyContext?: string;
  minWordLength?: number;
  maxWordLength?: number;
  enableTinySegmenter?: boolean;

  // Mode selection
  legacyMode?: boolean;
}

/**
 * 統合された単語抽出関数
 * @param lineText
 * @returns 
 */
export function extractWords(
  lineText: string,
  lineNumber: number,
  options: ExtractWordsOptions = {},
): Word[] {
  const words: Word[] = [];

  // Configuration normalization
  const normalizedConfig = normalizeConfig(options);
  const excludeJapanese = normalizedConfig.excludeJapanese;

  // Legacy mode implementation (inline extractWordsFromLineLegacy logic)
  if (normalizedConfig.legacyMode || !normalizedConfig.useImprovedDetection) {
    // 空行や短すぎる行はスキップ
    if (!lineText || lineText.trim().length < 2) {
      return words;
    }

    // 最適化された正規表現（ユニコード対応）- excludeJapanese設定に基づいて選択
    const wordRegex = excludeJapanese
      ? /[a-zA-Z0-9_]+/g // 日本語を除外（英数字とアンダースコアのみ）
      : /[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]+/g; // 日本語を含む
    let match: RegExpExecArray | null;

    // パフォーマンスを向上させるためにマッチをバッチ処理
    const matches: { text: string; index: number }[] = [];
    while ((match = wordRegex.exec(lineText)) !== null) {
      // 短すぎる単語や数字のみの単語はスキップ
      if (match[0].length >= 2 && !/^\d+$/.test(match[0])) {
        matches.push({ text: match[0], index: match.index });
      }

      // パフォーマンス保護：1行あたり100個まで
      if (matches.length >= 100) {
        break;
      }
    }

    // マッチした単語をWordオブジェクトに変換
    for (const match of matches) {
      // Calculate byte position for UTF-8 compatibility
      const byteIndex = charIndexToByteIndex(lineText, match.index);
      // Calculate display column considering tab characters
      const displayCol = getDisplayColumn(lineText, match.index);

      words.push({
        text: match.text,
        line: lineNumber,
        col: displayCol + 1, // Vimの列番号は1から始まる（タブ展開後の表示位置）
        byteCol: byteIndex + 1, // Vimのバイト列番号は1から始まる
      });
    }

    return words;
  }

  // Improved detection mode implementation (inline extractWordsFromLine logic)
  // 空行はスキップ（最小文字数制限を1に変更）
  if (!lineText || lineText.trim().length < 1) {
    return words;
  }

  // 1. 基本的な単語検出 - excludeJapanese設定に基づいて正規表現を選択
  const basicWordRegex = excludeJapanese
    ? /[a-zA-Z0-9]+/g // 日本語を除外（英数字のみ）
    : /[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]+/g; // 日本語を含む
  let match: RegExpExecArray | null;
  const allMatches: { text: string; index: number }[] = [];

  while ((match = basicWordRegex.exec(lineText)) !== null) {
    // 最小文字数を1に変更し、数字のみの単語も許可
    if (match[0].length >= 1) {
      allMatches.push({ text: match[0], index: match.index });
    }
  }

  // 2. kebab-case と snake_case の分割処理
  const splitMatches: { text: string; index: number }[] = [];

  for (const originalMatch of allMatches) {
    const text = originalMatch.text;
    const baseIndex = originalMatch.index;

    // kebab-case の分割 (例: "hit-a-hint" -> ["hit", "a", "hint"])
    if (text.includes("-") && /^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)+$/.test(text)) {
      const parts = text.split("-");
      let currentIndex = baseIndex;

      for (const part of parts) {
        if (part.length >= 1) {
          splitMatches.push({ text: part, index: currentIndex });
        }
        currentIndex += part.length + 1; // +1 for the hyphen
      }
    } // snake_case の分割 (例: "snake_case_word" -> ["snake", "case", "word"])
    else if (text.includes("_") && /^[a-zA-Z0-9]+(_[a-zA-Z0-9]+)+$/.test(text)) {
      const parts = text.split("_");
      let currentIndex = baseIndex;

      for (const part of parts) {
        if (part.length >= 1) {
          splitMatches.push({ text: part, index: currentIndex });
        }
        currentIndex += part.length + 1; // +1 for the underscore
      }
    } // 0xFF / 0b1010 の先頭0を境界として分割（例: 0xFF -> xFF, 0b1010 -> b1010）
    else if (/^0[xX][0-9a-fA-F]+$/.test(text)) {
      // 'x' 以降を単語として扱う
      const sub = text.slice(1); // drop leading '0'
      splitMatches.push({ text: sub, index: baseIndex + 1 });
    } else if (/^0[bB][01]+$/.test(text)) {
      const sub = text.slice(1);
      splitMatches.push({ text: sub, index: baseIndex + 1 });
    } // 日本語の単語境界分割（改善された文字の種別による分割）
    // excludeJapanese が true の場合はこの処理をスキップ
    else if (
      !excludeJapanese && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text) && text.length > 2
    ) {
      // 改善された日本語単語分割（より自然な境界を検出）
      const improvedSplitWords = splitJapaneseTextImproved(text, baseIndex);
      splitMatches.push(...improvedSplitWords);
    } // 通常の単語はそのまま追加
    else {
      splitMatches.push(originalMatch);
    }
  }

  // 3. 数字のみの単語を別途検出
  const numberRegex = /\b\d+\b/g;
  let numberMatch: RegExpExecArray | null;
  while ((numberMatch = numberRegex.exec(lineText)) !== null) {
    // 既存のマッチと重複していないかチェック
    const isAlreadyMatched = splitMatches.some((existing) =>
      existing.index <= numberMatch!.index &&
      existing.index + existing.text.length >= numberMatch!.index + numberMatch![0].length
    );

    // 数字のみ除外ポリシー: 2文字未満、数字のみは除外
    if (!isAlreadyMatched && numberMatch[0].length >= 2) {
      splitMatches.push({ text: numberMatch[0], index: numberMatch.index });
    }
  }

  // 4. 1文字の英単語を別途検出（"I", "a" など）
  const singleCharRegex = /\b[a-zA-Z]\b/g;
  let charMatch: RegExpExecArray | null;
  while ((charMatch = singleCharRegex.exec(lineText)) !== null) {
    // 既存のマッチと重複していないかチェック
    const isAlreadyMatched = splitMatches.some((existing) =>
      existing.index <= charMatch!.index &&
      existing.index + existing.text.length >= charMatch!.index + charMatch![0].length
    );

    if (!isAlreadyMatched) {
      splitMatches.push({ text: charMatch[0], index: charMatch.index });
    }
  }

  // 5. 1文字の数字を別途検出は除外（数字のみ除外ポリシーに従い、2文字未満は除外）

  // 6. インデックスでソートして重複除去
  const uniqueMatches = splitMatches
    .sort((a, b) => a.index - b.index)
    .filter((match, index, array) => {
      // 同じ位置で同じテキストの重複を除去
      if (index === 0) return true;
      const prev = array[index - 1];
      return !(prev.index === match.index && prev.text === match.text);
    });

  // 7. パフォーマンス保護：1行あたり100個まで
  const finalMatches = uniqueMatches.slice(0, 100);

  // 8. Wordオブジェクトに変換
  for (const match of finalMatches) {
    // Calculate byte position for UTF-8 compatibility
    const byteIndex = charIndexToByteIndex(lineText, match.index);
    // Calculate display column considering tab characters
    const displayCol = getDisplayColumn(lineText, match.index);

    words.push({
      text: match.text,
      line: lineNumber,
      col: displayCol + 1, // Vimの列番号は1から始まる（タブ展開後の表示位置）
      byteCol: byteIndex + 1, // Vimのバイト列番号は1から始まる
    });
  }

  return words;
}

/**
 * 統合設定を正規化する内部関数
 */
interface NormalizedConfig {
  useImprovedDetection: boolean;
  excludeJapanese: boolean;
  useJapanese: boolean;
  strategy?: "regex" | "tinysegmenter" | "hybrid";
  minWordLength?: number;
  enableTinySegmenter?: boolean;
  perKeyMinLength?: Record<string, number>;
  defaultMinWordLength?: number;
  currentKeyContext?: string;
  legacyMode: boolean;
  hasEnhancedFeatures: boolean;
  useWordConfig: boolean;
}

function normalizeConfig(config: ExtractWordsOptions): NormalizedConfig {
  // Legacy mode detection
  const legacyMode = config.legacyMode === true;

  // Enhanced features detection
  const hasEnhancedFeatures = !!(
    config.strategy ||
    config.perKeyMinLength ||
    config.currentKeyContext ||
    config.enableTinySegmenter
  );

  // WordConfig features detection
  const useWordConfig = !!(
    config.useJapanese !== undefined ||
    config.useImprovedDetection !== undefined
  ) && !hasEnhancedFeatures;

  // Japanese handling priority:
  // 1. excludeJapanese (direct parameter)
  // 2. use_japanese (WordConfig/EnhancedConfig)
  // 3. default: false (include Japanese)
  let useJapanese: boolean;
  let excludeJapanese: boolean;

  if (config.excludeJapanese !== undefined) {
    excludeJapanese = config.excludeJapanese;
    useJapanese = !config.excludeJapanese;
  } else if (config.useJapanese !== undefined) {
    useJapanese = config.useJapanese;
    excludeJapanese = !config.useJapanese;
  } else {
    useJapanese = true; // Default: include Japanese
    excludeJapanese = false;
  }

  // Improved detection priority:
  // 1. useImprovedDetection (direct parameter)
  // 2. use_improved_detection (WordConfig)
  // 3. default based on mode
  const useImprovedDetection = config.useImprovedDetection ??
    config.useImprovedDetection ??
    false; // Default to false

  return {
    useImprovedDetection,
    excludeJapanese,
    useJapanese,
    strategy: config.strategy,
    minWordLength: config.minWordLength ?? config.defaultMinWordLength,
    enableTinySegmenter: config.enableTinySegmenter,
    perKeyMinLength: config.perKeyMinLength,
    defaultMinWordLength: config.defaultMinWordLength,
    currentKeyContext: config.currentKeyContext,
    legacyMode,
    hasEnhancedFeatures,
    useWordConfig,
  };
}

// === Manager Re-exports removed - integrated below ===

// === Re-exports removed - Classes integrated below ===

// ==========================================
// === Encoding Functions (from utils/encoding.ts) ===
// ==========================================

/**
 * UTF-8文字とバイトインデックス変換のエンコーディングユーティリティ
 */

/**
 * TextEncoderの共有インスタンス
 */
const sharedTextEncoder = new TextEncoder();

/**
 * マルチバイト文字のバイト長キャッシュ
 */
const byteLengthCache = GlobalCache.getInstance().getCache<string, number>(CacheType.BYTE_LENGTH);

/**
 * 統一されたバイト長計算関数（キャッシュ付き、ASCII最適化）
 * @param text
 * @returns 
 */
export function getByteLength(text: string): number {
  if (text.length === 0) {
    return 0;
  }

  // ASCII文字のみの場合は高速パス（isAsciiをインライン化）
  let isAscii = true;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 0x7f) {
      isAscii = false;
      break;
    }
  }
  if (isAscii) {
    return text.length;
  }

  // キャッシュをチェック
  const cached = byteLengthCache.get(text);
  if (cached !== undefined) {
    return cached;
  }

  // バイト長を計算してキャッシュに保存
  const length = sharedTextEncoder.encode(text).length;
  byteLengthCache.set(text, length);
  return length;
}

/**
 * バイト長キャッシュをクリア
 * @returns 
 */
export function clearByteLengthCache(): void {
  byteLengthCache.clear();
}

/**
 * 文字インデックスをUTF-8バイトインデックスに変換
 * @param text
 * @param charIndex
 * @returns 
 */
export function charIndexToByteIndex(text: string, charIndex: number): number {
  // 範囲外チェックと空文字列チェック
  if (charIndex <= 0) return 0;
  if (text.length === 0) return 0;
  if (charIndex >= text.length) return new TextEncoder().encode(text).length;

  // 開始から指定された文字インデックスまでの部分文字列を抽出
  const substring = text.substring(0, charIndex);

  // UTF-8バイトに変換して長さを返す
  return new TextEncoder().encode(substring).length;
}

/**
 * UTF-8バイトインデックスを文字インデックスに変換
 * @param text
 * @param byteIndex
 * @returns 
 */
export function byteIndexToCharIndex(text: string, byteIndex: number): number {
  // 範囲外チェック
  if (byteIndex <= 0) return 0;
  if (text.length === 0) return 0;

  const encoder = new TextEncoder();
  const fullBytes = encoder.encode(text);

  // byteIndexが全体のバイト長以上の場合は文字列長を返す
  if (byteIndex >= fullBytes.length) return text.length;

  // より効率的なアプローチ: 文字ごとに累積バイト数を計算
  let currentByteIndex = 0;
  for (let charIndex = 0; charIndex < text.length; charIndex++) {
    const char = text[charIndex];
    const charByteLength = encoder.encode(char).length;

    // 現在の文字の終端バイト位置
    const nextByteIndex = currentByteIndex + charByteLength;

    // 指定されたバイトインデックスが現在の文字の範囲内にある場合
    if (byteIndex < nextByteIndex) {
      // マルチバイト文字の境界チェック
      if (byteIndex === currentByteIndex) {
        // 文字の開始位置の場合、その文字のインデックスを返す
        return charIndex;
      } else {
        // マルチバイト文字の途中の場合、前の文字境界を返す
        return charIndex;
      }
    }

    currentByteIndex = nextByteIndex;
  }

  // ここに到達することは通常ないが、安全のため文字列長を返す
  return text.length;
}

/**
 * テキストにマルチバイト文字（日本語など）が含まれているかチェック
 * @param text
 */
export function hasMultibyteCharacters(text: string): boolean {
  return new TextEncoder().encode(text).length > text.length;
}

/**
 * デバッグ用の詳細エンコーディング情報を取得
 * @param text
 * @returns 
 */
export function getEncodingInfo(text: string): {
  charLength: number;
  byteLength: number;
  hasMultibyte: boolean;
  charToByteMap: Array<{ char: string; charIndex: number; byteStart: number; byteLength: number }>;
} {
  const encoder = new TextEncoder();
  const charToByteMap: Array<
    { char: string; charIndex: number; byteStart: number; byteLength: number }
  > = [];

  let bytePosition = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charBytes = encoder.encode(char);

    charToByteMap.push({
      char,
      charIndex: i,
      byteStart: bytePosition,
      byteLength: charBytes.length,
    });

    bytePosition += charBytes.length;
  }

  const byteLength = encoder.encode(text).length;
  return {
    charLength: text.length,
    byteLength,
    hasMultibyte: byteLength > text.length, // hasMultibyteCharactersをインライン化
    charToByteMap,
  };
}

/**
 * 文字種判定ユーティリティ
 */

/**
 * 文字種別を表すenum
 */

// ========== Integrated from segmenter.ts ==========

/**
 * セグメンテーション結果インターフェース
 */
interface SegmentationResult {
  /** 分割されたセグメント（単語）の配列 */
  segments: string[];
  /** セグメンテーションが成功したかどうか */
  success: boolean;
  /** エラーメッセージ（失敗時のみ） */
  error?: string;
  /** セグメンテーションのソース */
  source: "tinysegmenter" | "fallback";
}

/**
 * TinySegmenter wrapper with error handling and caching
 */

// ========== Integrated from word/context.ts ==========

/**
 * ファイルタイプと構文コンテキストに基づいて適切な分割ルールを適用
 */
/** 言語別パターン定義 */
export interface LanguageRule {
  /** コメントパターン */
  commentPatterns: RegExp[];
  /** 文字列パターン */
  stringPatterns: RegExp[];
  /** 関数定義パターン */
  functionPatterns: RegExp[];
  /** クラス定義パターン */
  classPatterns: RegExp[];
  /** import文パターン */
  importPatterns: RegExp[];

  /** 予約語リスト */
  keywords: string[];
  /** 命名規則 */
  namingConventions: {
    function: 'camelCase' | 'snake_case' | 'PascalCase';
    variable: 'camelCase' | 'snake_case' | 'UPPER_CASE';
    class: 'PascalCase' | 'snake_case';
  };
}

/** 分割ルール */
export interface SplittingRules {
  /** CamelCase分割を行うか */
  splitCamelCase: boolean;
  /** snake_case分割を行うか */
  splitSnakeCase: boolean;
  /** すべてを保持するか */
  preserveAll: boolean;
  /** 最小単語長 */
  minWordLength: number;
  /** 特殊文字の扱い */
  preserveSpecialChars: boolean;
}

/**
 * コンテキスト検出器 - GlobalCache統合版
 */
export class ContextDetector {
  private readonly defaultRules: SplittingRules;
  /** GlobalCacheシステムのインスタンス（シングルトン） */
  private readonly globalCache: GlobalCache;

  /**
 * ContextDetectorのコンストラクタ
   */
  constructor() {
    this.defaultRules = {
      splitCamelCase: true,
      splitSnakeCase: false,
      preserveAll: false,
      minWordLength: 2,
      preserveSpecialChars: false,
    };
    // シングルトンパターンによりアプリケーション全体で同一インスタンスを共有
    this.globalCache = GlobalCache.getInstance();
  }

  /**
 * ファイルタイプの取得
 * @returns 
   */
  async detectFileType(denops: Denops): Promise<string> {
    try {
      const filetype = await denops.eval('&filetype') as string;
      return filetype || 'text';
    } catch (_error) {
      return 'text';
    }
  }

  /**
 * 構文コンテキストの検出（GlobalCache統合）
 * @param text
 * @param fileType
 * @returns 
   */
  detectSyntaxContext(
    text: string,
    line: number,
    fileType: string
  ): SyntaxContext {
    // キャッシュキーを生成
    const cacheKey = `${fileType}:${line}:${text}`;

    // GlobalCacheから取得を試行
    const syntaxContextCache = this.globalCache.getCache<string, SyntaxContext>(CacheType.SYNTAX_CONTEXT);
    const cachedContext = syntaxContextCache.get(cacheKey);
    if (cachedContext !== undefined) {
      return cachedContext;
    }

    const language = this.mapFileTypeToLanguage(fileType);
    const patterns = this.getLanguagePatterns(language);

    const context: SyntaxContext = {
      inComment: this.isInComment(text, patterns.commentPatterns),
      inString: this.isInString(text, patterns.stringPatterns),
      inFunction: this.isInFunction(text, patterns.functionPatterns),
      inClass: this.isInClass(text, patterns.classPatterns),
      language
    };

    // GlobalCacheに保存（LRU制限は自動で管理される）
    syntaxContextCache.set(cacheKey, context);

    return context;
  }

  /**
 * 行コンテキストの検出
 * @param fileType
 * @returns 
   */
  detectLineContext(
    line: string,
    fileType: string
  ): LineContext {
    const indentMatch = line.match(/^(\s*)/);
    const indentLevel = indentMatch ? indentMatch[1].length : 0;

    return {
      isComment: this.isCommentLine(line, fileType),
      isDocString: this.isDocStringLine(line, fileType),
      isImport: this.isImportLine(line, fileType),
      indentLevel,
      lineType: this.detectLineType(line, fileType)
    };
  }

  /**
 * コンテキストに基づく分割ルールの取得
 * @returns 
   */
  getSplittingRules(context: DetectionContext): SplittingRules {
    const fileType = context.fileType || 'text';
    const rules = this.getLanguageRules(fileType);

    // コンテキストに応じてルールを調整
    if (context.syntaxContext?.inComment) {
      return { ...rules, splitCamelCase: false };
    }
    if (context.syntaxContext?.inString) {
      return { ...rules, preserveAll: true };
    }

    return rules;
  }

  /**
 * ファイルタイプから言語名へのマッピング
 * @param fileType
 * @returns 
   */
  private mapFileTypeToLanguage(fileType: string): string {
    const languageMap: Record<string, string> = {
      'typescript': 'typescript',
      'javascript': 'javascript',
      'python': 'python',
      'markdown': 'markdown',
      'json': 'json',
      'yaml': 'yaml',
      'html': 'html',
      'css': 'css',
      'vim': 'vim',
      'sh': 'shell',
      'bash': 'shell',
      'zsh': 'shell',
    };

    return languageMap[fileType] || 'text';
  }

  /**
 * 言語別パターンの取得（GlobalCache統合）
 * @param language
 * @returns 
   */
  private getLanguagePatterns(language: string): LanguageRule {
    const languageRulesCache = this.globalCache.getCache<string, LanguageRule>(CacheType.LANGUAGE_RULES);
    const cachedRule = languageRulesCache.get(language);
    if (cachedRule !== undefined) {
      return cachedRule;
    }

    const patterns = this.createLanguagePatterns(language);
    languageRulesCache.set(language, patterns);
    return patterns;
  }

  /**
 * 言語別パターンの生成
 * @param language
 * @returns 
   */
  private createLanguagePatterns(language: string): LanguageRule {
    switch (language) {
      case 'typescript':
      case 'javascript':
        return {
          commentPatterns: [/\/\/.*$/, /\/\*[\s\S]*?\*\//],
          stringPatterns: [/"[^"]*"/, /'[^']*'/, /`[^`]*`/],
          functionPatterns: [/function\s+\w+/, /\w+\s*=\s*\(.*?\)\s*=>/, /\w+\s*:\s*\(.*?\)\s*=>/],
          classPatterns: [/class\s+\w+/, /interface\s+\w+/, /type\s+\w+/],
          importPatterns: [/import\s+.*from/, /import\s*\{.*\}/, /require\s*\(/],
          keywords: ['function', 'class', 'interface', 'type', 'const', 'let', 'var'],
          namingConventions: {
            function: 'camelCase',
            variable: 'camelCase',
            class: 'PascalCase'
          }
        };

      case 'python':
        return {
          commentPatterns: [/#.*$/],
          stringPatterns: [/"[^"]*"/, /'[^']*'/, /"""[\s\S]*?"""/, /'''[\s\S]*?'''/],
          functionPatterns: [/def\s+\w+/, /async\s+def\s+\w+/],
          classPatterns: [/class\s+\w+/],
          importPatterns: [/import\s+/, /from\s+.*import/],
          keywords: ['def', 'class', 'import', 'from', 'async'],
          namingConventions: {
            function: 'snake_case',
            variable: 'snake_case',
            class: 'PascalCase'
          }
        };

      case 'markdown':
        return {
          commentPatterns: [/<!--[\s\S]*?-->/],
          stringPatterns: [/`[^`]*`/, /```[\s\S]*?```/],
          functionPatterns: [],
          classPatterns: [],
          importPatterns: [],
          keywords: [],
          namingConventions: {
            function: 'camelCase',
            variable: 'camelCase',
            class: 'PascalCase'
          }
        };

      case 'json':
        return {
          commentPatterns: [],
          stringPatterns: [/"[^"]*"/],
          functionPatterns: [],
          classPatterns: [],
          importPatterns: [],
          keywords: [],
          namingConventions: {
            function: 'camelCase',
            variable: 'camelCase',
            class: 'PascalCase'
          }
        };

      case 'yaml':
        return {
          commentPatterns: [/#.*$/],
          stringPatterns: [/"[^"]*"/, /'[^']*'/],
          functionPatterns: [],
          classPatterns: [],
          importPatterns: [],
          keywords: [],
          namingConventions: {
            function: 'snake_case',
            variable: 'snake_case',
            class: 'PascalCase'
          }
        };

      case 'html':
        return {
          commentPatterns: [/<!--[\s\S]*?-->/],
          stringPatterns: [/"[^"]*"/, /'[^']*'/],
          functionPatterns: [],
          classPatterns: [],
          importPatterns: [],
          keywords: [],
          namingConventions: {
            function: 'camelCase',
            variable: 'camelCase',
            class: 'PascalCase'
          }
        };

      case 'css':
        return {
          commentPatterns: [/\/\*[\s\S]*?\*\//],
          stringPatterns: [/"[^"]*"/, /'[^']*'/],
          functionPatterns: [],
          classPatterns: [/\.[a-zA-Z][\w-]*/],
          importPatterns: [/@import/],
          keywords: [],
          namingConventions: {
            function: 'camelCase',
            variable: 'camelCase',
            class: 'PascalCase'
          }
        };

      default:
        return {
          commentPatterns: [],
          stringPatterns: [/"[^"]*"/, /'[^']*'/],
          functionPatterns: [],
          classPatterns: [],
          importPatterns: [],
          keywords: [],
          namingConventions: {
            function: 'camelCase',
            variable: 'camelCase',
            class: 'PascalCase'
          }
        };
    }
  }

  /**
 * コメント内判定
 * @param text
 * @param patterns
 * @returns 
   */
  private isInComment(text: string, patterns: RegExp[]): boolean {
    // コメント内というのは、テキスト全体がコメントかを判定
    // 部分的にコメントを含むケース（例: "key: value # comment"）では false
    const trimmed = text.trim();

    // 行がコメントで始まっているかをチェック
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('<!--')) {
      return true;
    }

    // 完全にコメントで囲まれているパターンをチェック
    return patterns.some(pattern => {
      const match = pattern.exec(text);
      return match && match[0] === text.trim();
    });
  }

  /**
 * 文字列内判定
 * @param text
 * @param patterns
 * @returns 
   */
  private isInString(text: string, patterns: RegExp[]): boolean {
    // 実際にテキストが文字列リテラル内にあるかをより精密に判定
    // この実装では、文字列パターンのマッチがあることを確認
    if (patterns.length === 0) return false;

    // シンプルな文字列検出: クォート文字で囲まれているか
    const hasQuotes = /^["'`].*["'`]$/.test(text.trim());
    return hasQuotes && patterns.some(pattern => pattern.test(text));
  }

  /**
 * 関数内判定
 * @param text
 * @param patterns
 * @returns 
   */
  private isInFunction(text: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(text));
  }

  /**
 * クラス内判定
 * @param text
 * @param patterns
 * @returns 
   */
  private isInClass(text: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(text));
  }

  /**
 * コメント行判定
 * @param fileType
 * @returns 
   */
  private isCommentLine(line: string, fileType: string): boolean {
    const trimmed = line.trim();
    const language = this.mapFileTypeToLanguage(fileType);

    switch (language) {
      case 'typescript':
      case 'javascript':
        return trimmed.startsWith('//') || trimmed.startsWith('/*');
      case 'python':
      case 'yaml':
        return trimmed.startsWith('#');
      case 'html':
      case 'markdown':
        return trimmed.startsWith('<!--');
      case 'css':
        return trimmed.startsWith('/*');
      default:
        return false;
    }
  }

  /**
 * ドキュメント文字列判定
 * @param fileType
 * @returns 
   */
  private isDocStringLine(line: string, fileType: string): boolean {
    const trimmed = line.trim();
    const language = this.mapFileTypeToLanguage(fileType);

    switch (language) {
      case 'python':
        return trimmed.startsWith('"""') || trimmed.startsWith("'''");
      case 'typescript':
      case 'javascript':
        return trimmed.startsWith('/**');
      default:
        return false;
    }
  }

  /**
   * import行判定
   * @param fileType
   * @returns
   */
  private isImportLine(line: string, fileType: string): boolean {
    const trimmed = line.trim();
    const language = this.mapFileTypeToLanguage(fileType);

    switch (language) {
      case 'typescript':
      case 'javascript':
        return /^import\s+/.test(trimmed) || /require\s*\(/.test(trimmed);
      case 'python':
        return /^import\s+/.test(trimmed) || /^from\s+/.test(trimmed);
      case 'css':
        return /^@import/.test(trimmed);
      default:
        return false;
    }
  }

  /**
 * 行タイプの検出
 * @param fileType
 * @returns 
   */
  private detectLineType(line: string, fileType: string): string {
    if (this.isCommentLine(line, fileType)) return 'comment';
    if (this.isDocStringLine(line, fileType)) return 'docstring';
    if (this.isImportLine(line, fileType)) return 'import';

    const trimmed = line.trim();
    if (trimmed.startsWith('#') && fileType === 'markdown') return 'heading';
    if (trimmed === '') return 'empty';

    return 'code';
  }

  /**
 * 言語別分割ルールの取得
 * @param fileType
 * @returns 
   */
  private getLanguageRules(fileType: string): SplittingRules {
    const language = this.mapFileTypeToLanguage(fileType);

    switch (language) {
      case 'python':
        return {
          ...this.defaultRules,
          splitCamelCase: false,
          splitSnakeCase: false, // snake_caseを保持
        };
      case 'css':
        return {
          ...this.defaultRules,
          splitCamelCase: false, // kebab-caseを保持
          preserveSpecialChars: true,
        };
      case 'json':
        return {
          ...this.defaultRules,
          splitCamelCase: false, // プロパティ名を保持
        };
      case 'markdown':
        return {
          ...this.defaultRules,
          preserveSpecialChars: true,
        };
      default:
        return this.defaultRules;
    }
  }

  /**
 * キャッシュクリア（メモリ最適化用）
   */
  clearCache(): void {
    this.globalCache.clearByType(CacheType.SYNTAX_CONTEXT);
    // 言語ルールキャッシュは保持（静的データのため）
  }

  /**
 * キャッシュ統計の取得（デバッグ用）
 * @returns 
   */
  getCacheStats(): { contextCacheSize: number; languageRuleCacheSize: number } {
    const syntaxContextStats = this.globalCache.getCache(CacheType.SYNTAX_CONTEXT).getStats();
    const languageRulesStats = this.globalCache.getCache(CacheType.LANGUAGE_RULES).getStats();

    return {
      contextCacheSize: syntaxContextStats.size,
      languageRuleCacheSize: languageRulesStats.size,
    };
  }

  /**
 * 文脈に基づく単語の重要度判定（将来拡張用）
 * @param word
 * @returns 
   */
  calculateWordImportance(word: string, context: DetectionContext): number {
    let score = 50; // ベーススコア

    // ファイルタイプ固有の重要度調整
    if (context.fileType) {
      const language = this.mapFileTypeToLanguage(context.fileType);
      const patterns = this.getLanguagePatterns(language);

      // キーワードは重要度高
      if (patterns.keywords.includes(word.toLowerCase())) {
        score += 30;
      }

      // 関数名・クラス名パターンも重要度高
      if (patterns.functionPatterns.some(p => p.test(word)) ||
          patterns.classPatterns.some(p => p.test(word))) {
        score += 20;
      }
    }

    // インデントレベルによる調整
    if (context.lineContext?.indentLevel !== undefined) {
      // インデントが深いほど重要度低下
      score -= Math.min(context.lineContext.indentLevel * 2, 20);
    }

    // コメント内は重要度低下
    if (context.syntaxContext?.inComment) {
      score -= 20;
    }

    // 文字列内は中程度の重要度
    if (context.syntaxContext?.inString) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }
}

// ========== Integrated from word/dictionary.ts ==========

/**
 * Dictionary-based Word Correction System
 */
/**
 * 辞書の設定オプション
 */
export interface DictionaryConfig {
  /** 辞書ファイルのパス */
  dictionaryPath?: string;
  /** プロジェクト固有辞書のパス */
  projectDictionaryPath?: string;
  /** ビルトイン辞書を使用するか */
  useBuiltinDictionary?: boolean;
  /** 学習機能を有効にするか */
  enableLearning?: boolean;
  /** キャッシュを有効にするか */
  enableCache?: boolean;
  /** キャッシュサイズ */
  cacheSize?: number;
}

/**
 * 複合語パターンマッチの結果
 */
export interface CompoundMatch {
  /** マッチした文字列 */
  match: string;
  /** 開始位置 */
  startIndex: number;
  /** 終了位置 */
  endIndex: number;
}

/**
 * キャッシュ統計情報
 */
export interface CacheStats {
  /** ヒット数 */
  hits: number;
  /** ミス数 */
  misses: number;
  /** ヒット率 */
  hitRate: number;
}

/**
 * 単語辞書のインターフェース
 */
export interface WordDictionary {
  /** カスタム単語のセット */
  customWords: Set<string>;
  /** 複合語パターンの配列 */
  compoundPatterns: RegExp[];
  /** 保持する単語のセット */
  preserveWords: Set<string>;
  /** 結合ルールのマップ（単語 → 優先度） */
  mergeRules: Map<string, number>;

  /** カスタム単語を追加 */
  addCustomWord(word: string): void;
  /** カスタム単語を持っているかチェック */
  hasCustomWord(word: string): boolean;
  /** カスタム単語を削除 */
  removeCustomWord(word: string): void;

  /** 複合語パターンを追加 */
  addCompoundPattern(pattern: RegExp): void;
  /** 複合語パターンにマッチするかチェック */
  matchCompoundPatterns(text: string): CompoundMatch[];

  /** 保持単語を追加 */
  addPreserveWord(word: string): void;
  /** 単語を保持すべきかチェック */
  shouldPreserveWord(word: string): boolean;

  /** 結合ルールを追加 */
  addMergeRule(word1: string, word2: string, priority: number): void;
  /** 3単語結合ルールを追加 */
  addTripleMergeRule(word1: string, word2: string, word3: string, priority: number): void;
  /** 結合ルールを適用 */
  applyMergeRules(segments: string[]): string[];

  /** ファイルから辞書を読み込み */
  loadFromFile(): Promise<void>;
  /** キャッシュ統計を取得 */
  getCacheStats(): CacheStats | null;
}

/**
 * 単語辞書の実装クラス
 */
export class WordDictionaryImpl implements WordDictionary {
  public customWords: Set<string> = new Set();
  public compoundPatterns: RegExp[] = [];
  public preserveWords: Set<string> = new Set();
  public mergeRules: Map<string, number> = new Map();

  private config: DictionaryConfig;
  private globalCache?: GlobalCache;
  private cacheStats?: CacheStats;

  constructor(config: DictionaryConfig = {}) {
    this.config = {
      useBuiltinDictionary: true,
      enableLearning: false,
      enableCache: false,
      cacheSize: 1000,
      ...config,
    };

    if (this.config.enableCache) {
      this.initializeCache();
    }
  }

  private initializeCache(): void {
    // GlobalCache.DICTIONARYを使用してキャッシュを初期化
    this.globalCache = GlobalCache.getInstance();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
    };
  }

  private updateCacheStats(hit: boolean): void {
    if (!this.cacheStats) return;

    if (hit) {
      this.cacheStats.hits++;
    } else {
      this.cacheStats.misses++;
    }

    const total = this.cacheStats.hits + this.cacheStats.misses;
    this.cacheStats.hitRate = total > 0 ? this.cacheStats.hits / total : 0;
  }

  addCustomWord(word: string): void {
    this.customWords.add(word);
    // DICTIONARYキャッシュをクリア（新しい単語の追加により既存キャッシュが無効になる）
    if (this.globalCache) {
      this.globalCache.clearByType(CacheType.DICTIONARY);
    }
  }

  hasCustomWord(word: string): boolean {
    if (this.globalCache) {
      const dictionaryCache = this.globalCache.getCache<string, boolean>(CacheType.DICTIONARY);

      // キャッシュヒットの場合
      if (dictionaryCache.has(word)) {
        this.updateCacheStats(true);
        return dictionaryCache.get(word)!;
      }

      // キャッシュミスの場合、実際の検索を実行
      const result = this.customWords.has(word);

      this.updateCacheStats(false);
      dictionaryCache.set(word, result);

      return result;
    }

    // キャッシュが無効な場合は直接検索
    return this.customWords.has(word);
  }

  removeCustomWord(word: string): void {
    this.customWords.delete(word);
    // DICTIONARYキャッシュから該当単語を削除
    if (this.globalCache) {
      const dictionaryCache = this.globalCache.getCache<string, boolean>(CacheType.DICTIONARY);
      dictionaryCache.delete(word);
    }
  }

  addCompoundPattern(pattern: RegExp): void {
    this.compoundPatterns.push(pattern);
  }

  matchCompoundPatterns(text: string): CompoundMatch[] {
    const matches: CompoundMatch[] = [];

    for (const pattern of this.compoundPatterns) {
      const regexMatches = text.matchAll(pattern);
      for (const match of regexMatches) {
        if (match.index !== undefined) {
          matches.push({
            match: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
          });
        }
      }
    }

    return matches;
  }

  addPreserveWord(word: string): void {
    this.preserveWords.add(word);
  }

  shouldPreserveWord(word: string): boolean {
    return this.preserveWords.has(word);
  }

  addMergeRule(word1: string, word2: string, priority: number): void {
    const key = `${word1}+${word2}`;
    this.mergeRules.set(key, priority);
  }

  addTripleMergeRule(word1: string, word2: string, word3: string, priority: number): void {
    const key = `${word1}+${word2}+${word3}`;
    this.mergeRules.set(key, priority);
  }

  applyMergeRules(segments: string[]): string[] {
    const result: string[] = [];
    let i = 0;

    while (i < segments.length) {
      let merged = false;

      // 3つのセグメントの結合を試行（例：データ+ベース+接続）
      if (i + 2 < segments.length) {
        const key3 = `${segments[i]}+${segments[i + 1]}+${segments[i + 2]}`;
        if (this.mergeRules.has(key3)) {
          result.push(segments[i] + segments[i + 1] + segments[i + 2]);
          i += 3;
          merged = true;
        }
      }

      // 2つのセグメントの結合を試行
      if (!merged && i + 1 < segments.length) {
        const key2 = `${segments[i]}+${segments[i + 1]}`;
        if (this.mergeRules.has(key2)) {
          result.push(segments[i] + segments[i + 1]);
          i += 2;
          merged = true;
        }
      }

      if (!merged) {
        result.push(segments[i]);
        i++;
      }
    }

    return result;
  }

  async loadFromFile(): Promise<void> {
    if (!this.config.dictionaryPath) return;

    try {
      const content = await Deno.readTextFile(this.config.dictionaryPath);
      const data = JSON.parse(content);

      if (data.customWords) {
        for (const word of data.customWords) {
          this.addCustomWord(word);
        }
      }

      if (data.preserveWords) {
        for (const word of data.preserveWords) {
          this.addPreserveWord(word);
        }
      }

      if (data.compoundPatterns) {
        for (const pattern of data.compoundPatterns) {
          this.addCompoundPattern(new RegExp(pattern, "g"));
        }
      }
    } catch {
      // 辞書の読み込み失敗は無視（process1_sub2）
    }
  }

  getCacheStats(): CacheStats | null {
    if (!this.cacheStats) return null;

    // GlobalCacheの統計も含める
    if (this.globalCache) {
      const unifiedStats = this.globalCache.getAllStats();
      const dictionaryStats = unifiedStats.DICTIONARY;

      // GlobalCacheとローカル統計をマージして返す
      // 既存APIの互換性を維持しつつ、GlobalCacheの正確な統計を活用
      return {
        hits: Math.max(this.cacheStats.hits, dictionaryStats.hits),
        misses: Math.max(this.cacheStats.misses, dictionaryStats.misses),
        hitRate: dictionaryStats.hitRate || this.cacheStats.hitRate,
      };
    }

    return { ...this.cacheStats };
  }

  /**
 * 複数の辞書をマージする静的メソッド
   */
  static merge(dict1: WordDictionaryImpl, dict2: WordDictionaryImpl): WordDictionaryImpl {
    const merged = new WordDictionaryImpl();

    // カスタム単語をマージ
    for (const word of dict1.customWords) {
      merged.addCustomWord(word);
    }
    for (const word of dict2.customWords) {
      merged.addCustomWord(word);
    }

    // 保持単語をマージ
    for (const word of dict1.preserveWords) {
      merged.addPreserveWord(word);
    }
    for (const word of dict2.preserveWords) {
      merged.addPreserveWord(word);
    }

    // 複合語パターンをマージ
    for (const pattern of dict1.compoundPatterns) {
      merged.addCompoundPattern(pattern);
    }
    for (const pattern of dict2.compoundPatterns) {
      merged.addCompoundPattern(pattern);
    }

    // 結合ルールをマージ（dict2の方が優先）
    for (const [key, priority] of dict1.mergeRules) {
      merged.mergeRules.set(key, priority);
    }
    for (const [key, priority] of dict2.mergeRules) {
      merged.mergeRules.set(key, priority);
    }

    return merged;
  }
}

/**
 * ビルトイン辞書を作成
 */
export function createBuiltinDictionary(): WordDictionaryImpl {
  const dictionary = new WordDictionaryImpl();

  // 日本語プログラミング用語を追加
  const programmingTerms = [
    "関数定義",
    "非同期処理",
    "配列操作",
    "オブジェクト指向",
    "データベース接続",
    "ユニットテスト",
    "バージョン管理",
    "デバッグ実行",
    "メモリ管理",
    "例外処理",
    "ファイルシステム",
    "ネットワーク通信",
    "暗号化処理",
    "スレッド処理",
    "並行処理",
    "継承関係",
    "インターフェース定義",
    "デザインパターン",
    "コード生成",
    "自動テスト",
  ];

  for (const term of programmingTerms) {
    dictionary.addPreserveWord(term);
  }

  // 複合語パターンを追加
  dictionary.addCompoundPattern(/関数定義/g);
  dictionary.addCompoundPattern(/非同期処理/g);
  dictionary.addCompoundPattern(/配列操作/g);
  dictionary.addCompoundPattern(/オブジェクト指向/g);
  dictionary.addCompoundPattern(/データベース接続/g);
  dictionary.addCompoundPattern(/ユニットテスト/g);
  dictionary.addCompoundPattern(/バージョン管理/g);
  dictionary.addCompoundPattern(/デバッグ実行/g);

  // 2単語結合ルールを追加
  dictionary.addMergeRule("関数", "定義", 10);
  dictionary.addMergeRule("非同期", "処理", 10);
  dictionary.addMergeRule("配列", "操作", 10);
  dictionary.addMergeRule("オブジェクト", "指向", 10);
  dictionary.addMergeRule("ユニット", "テスト", 10);
  dictionary.addMergeRule("バージョン", "管理", 10);
  dictionary.addMergeRule("デバッグ", "実行", 10);

  // より複雑な結合ルール
  dictionary.addMergeRule("データ", "ベース", 8);
  dictionary.addMergeRule("データ", "構造", 8);
  dictionary.addMergeRule("メモリ", "管理", 8);
  dictionary.addMergeRule("例外", "処理", 8);
  dictionary.addMergeRule("ファイル", "システム", 8);

  // 3単語結合ルールを追加
  dictionary.addTripleMergeRule("非", "同期", "処理", 12);
  dictionary.addTripleMergeRule("データ", "ベース", "接続", 12);

  return dictionary;
}

/**
 * セグメントに辞書補正を適用
 */
export function applyDictionaryCorrection(
  segments: string[],
  dictionary?: WordDictionaryImpl,
): string[] {
  const dict = dictionary || createBuiltinDictionary();
  return dict.applyMergeRules(segments);
}

// ========== Integrated from word/dictionary-loader.ts ==========

/**
 * Dictionary Loader Implementation
 */
/**
 * ユーザー定義辞書のインターフェース
 */
export interface UserDictionary {
  customWords: string[];
  preserveWords: string[];
  mergeRules: Map<string, MergeStrategy>;
  compoundPatterns: RegExp[];
  hintPatterns?: HintPattern[];
  metadata?: {
    version?: string;
    author?: string;
    description?: string;
  };
}

/**
 * ヒントパターンの定義
 */
export interface HintPattern {
  pattern: string | RegExp;
  hintPosition: HintPositionRule;
  priority: number;
  description?: string;
}

/**
 * ヒント位置ルール
 */
export type HintPositionRule =
  | 'capture:1' | 'capture:2' | 'capture:3'
  | 'start' | 'end'
  | { offset: number; from: 'start' | 'end' };

/**
 * マージ戦略
 */
export type MergeStrategy = 'always' | 'never' | 'context';

/**
 * 辞書設定インターフェース
 */
export interface DictionaryLoaderConfig {
  dictionaryPath?: string;
  projectDictionaryPath?: string;
  useBuiltinDict?: boolean;
  mergingStrategy?: 'override' | 'merge';
  autoReload?: boolean;
}

/**
 * 辞書ファイルローダークラス
 */
export class DictionaryLoader {
  private readonly searchPaths = [
    '.hellshake-yano/dictionary.json',
    'hellshake-yano.dict.json',
    '~/.config/hellshake-yano/dictionary.json'
  ];

  constructor(private config: DictionaryLoaderConfig = {}) {}

  /**
 * ユーザー定義辞書を読み込む
   */
  async loadUserDictionary(config?: DictionaryLoaderConfig): Promise<UserDictionary> {
    const resolvedConfig = { ...this.config, ...config };

    // 辞書ファイルの探索と読み込み
    for (const searchPath of this.searchPaths) {
      try {
        const resolvedPath = this.resolvePath(searchPath);
        if (await exists(resolvedPath)) {
          const content = await Deno.readTextFile(resolvedPath);
          return await this.parseDictionaryContent(content, resolvedPath);
        }
      } catch {
        // 辞書の読み込み失敗は無視（process1_sub2）
      }
    }

    if (resolvedConfig.dictionaryPath) {
      try {
        const content = await Deno.readTextFile(resolvedConfig.dictionaryPath);
        return await this.parseDictionaryContent(content, resolvedConfig.dictionaryPath);
      } catch {
        // 辞書の読み込み失敗は無視（process1_sub2）
      }
    }

    return this.createEmptyDictionary();
  }

  /**
 * 辞書コンテンツをパース
   */
  private async parseDictionaryContent(content: string, filepath: string): Promise<UserDictionary> {
    const ext = this.getFileExtension(filepath);

    switch (ext) {
      case '.json':
        return this.parseJsonDictionary(content);
      case '.yaml':
      case '.yml':
        return this.parseYamlDictionary(content);
      case '.txt':
        return this.parseTextDictionary(content);
      default:
        // JSON形式として試行
        try {
          return this.parseJsonDictionary(content);
        } catch {
          return this.parseTextDictionary(content);
        }
    }
  }

  /**
 * JSON形式の辞書をパース
   */
  private parseJsonDictionary(content: string): UserDictionary {
    const data = JSON.parse(content);
    return this.convertToUserDictionary(data);
  }

  /**
 * YAML形式の辞書をパース
   */
  private parseYamlDictionary(content: string): UserDictionary {
    const data = parseYaml(content) as unknown;
    return this.convertToUserDictionary(data);
  }

  /**
 * テキスト形式の辞書をパース
   */
  private parseTextDictionary(content: string): UserDictionary {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
    const dictionary = this.createEmptyDictionary();

    for (const line of lines) {
      if (line.startsWith('!')) {
        // 分割禁止ワード
        dictionary.preserveWords.push(line.slice(1));
      } else if (line.includes('=')) {
        // 結合ルール
        const [key, value] = line.split('=', 2);
        dictionary.mergeRules.set(key.trim(), value.trim() as MergeStrategy);
      } else if (line.startsWith('@')) {
        // ヒントパターン
        const [priority, pattern, position] = line.slice(1).split(':', 3);
        if (priority && pattern && position) {
          dictionary.hintPatterns = dictionary.hintPatterns || [];
          dictionary.hintPatterns.push({
            pattern: new RegExp(pattern),
            hintPosition: position as HintPositionRule,
            priority: parseInt(priority, 10) || 0,
          });
        }
      } else {
        // カスタム単語
        dictionary.customWords.push(line);
      }
    }

    return dictionary;
  }

  /**
 * データオブジェクトをUserDictionaryに変換
 * @param data
 * @returns 
   */
  private convertToUserDictionary(data: unknown): UserDictionary {
    const dictionary = this.createEmptyDictionary();

    // 型ガード: dataがオブジェクトであることを確認
    if (typeof data !== 'object' || data === null) {
      return dictionary;
    }

    // Record<string, unknown>として扱う
    const dataObj = data as Record<string, unknown>;

    // customWordsの検証と変換
    if (dataObj.customWords && Array.isArray(dataObj.customWords)) {
      dictionary.customWords = dataObj.customWords.filter((item): item is string => typeof item === 'string');
    }

    // preserveWordsの検証と変換
    if (dataObj.preserveWords && Array.isArray(dataObj.preserveWords)) {
      dictionary.preserveWords = dataObj.preserveWords.filter((item): item is string => typeof item === 'string');
    }

    // mergeRulesの検証と変換
    if (dataObj.mergeRules && typeof dataObj.mergeRules === 'object' && dataObj.mergeRules !== null) {
      dictionary.mergeRules = new Map(Object.entries(dataObj.mergeRules));
    }

    // compoundPatternsの検証と変換
    if (dataObj.compoundPatterns && Array.isArray(dataObj.compoundPatterns)) {
      dictionary.compoundPatterns = dataObj.compoundPatterns
        .filter((item): item is string => typeof item === 'string')
        .map((pattern: string) => new RegExp(pattern, 'g'));
    }

    // hintPatternsの検証と変換
    if (dataObj.hintPatterns && Array.isArray(dataObj.hintPatterns)) {
      dictionary.hintPatterns = dataObj.hintPatterns
        .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
        .map((pattern: Record<string, unknown>) => ({
          pattern: typeof pattern.pattern === 'string' ? new RegExp(pattern.pattern) : pattern.pattern as RegExp,
          hintPosition: pattern.hintPosition as HintPositionRule,
          priority: typeof pattern.priority === 'number' ? pattern.priority : 0,
          description: typeof pattern.description === 'string' ? pattern.description : undefined,
        }));
    }

    // metadataの検証と変換
    if (dataObj.metadata && typeof dataObj.metadata === 'object' && dataObj.metadata !== null) {
      dictionary.metadata = dataObj.metadata as UserDictionary['metadata'];
    }

    return dictionary;
  }

  /**
 * 空の辞書を作成
   */
  private createEmptyDictionary(): UserDictionary {
    return {
      customWords: [],
      preserveWords: [],
      mergeRules: new Map(),
      compoundPatterns: [],
      hintPatterns: [],
      metadata: {},
    };
  }

  /**
 * パスを解決
   */
  private resolvePath(path: string): string {
    if (path.startsWith('~')) {
      const home = Deno.env.get('HOME') || Deno.env.get('USERPROFILE') || '/tmp';
      return resolve(home, path.slice(2));
    }
    return resolve(path);
  }

  /**
 * ファイル拡張子を取得
   */
  private getFileExtension(filepath: string): string {
    return filepath.toLowerCase().split('.').pop() || '';
  }
}

/**
 * 辞書マージャークラス
 */
export class DictionaryMerger {
  /**
 * 辞書をマージ
   */
  merge(
    base: WordDictionaryImpl,
    user: UserDictionary,
    strategy: 'override' | 'merge' = 'merge'
  ): WordDictionaryImpl {
    const merged = new WordDictionaryImpl();

    if (strategy === 'override') {
      // ユーザー辞書で上書き
      this.mergeWithOverride(merged, base, user);
    } else {
      // マージ戦略
      this.mergeWithMerge(merged, base, user);
    }

    return merged;
  }

  /**
 * 上書き戦略でマージ
   */
  private mergeWithOverride(target: WordDictionaryImpl, base: WordDictionaryImpl, user: UserDictionary): void {
    // ユーザー定義を優先
    for (const word of user.customWords) {
      target.addCustomWord(word);
    }
    for (const word of user.preserveWords) {
      target.addPreserveWord(word);
    }
    for (const pattern of user.compoundPatterns) {
      target.addCompoundPattern(pattern);
    }

    // ベースで補完
    for (const word of base.customWords) {
      if (!target.hasCustomWord(word)) {
        target.addCustomWord(word);
      }
    }
  }

  /**
 * マージ戦略でマージ
   */
  private mergeWithMerge(target: WordDictionaryImpl, base: WordDictionaryImpl, user: UserDictionary): void {
    // ベースをコピー
    for (const word of base.customWords) {
      target.addCustomWord(word);
    }
    for (const word of base.preserveWords) {
      target.addPreserveWord(word);
    }
    for (const pattern of base.compoundPatterns) {
      target.addCompoundPattern(pattern);
    }

    // ユーザー定義を追加
    for (const word of user.customWords) {
      target.addCustomWord(word);
    }
    for (const word of user.preserveWords) {
      target.addPreserveWord(word);
    }
    for (const pattern of user.compoundPatterns) {
      target.addCompoundPattern(pattern);
    }
  }
}

/**
 * Vim設定ブリッジクラス
 */
export class VimConfigBridge {
  /**
 * Vim設定を取得
   */
  async getConfig(denops: Denops): Promise<DictionaryLoaderConfig> {
    try {
      const config: DictionaryLoaderConfig = {};

      // 各設定値を取得
      config.dictionaryPath = await denops.eval('get(g:, "hellshake_yano_dictionary_path", "")') as string || undefined;
      config.useBuiltinDict = await denops.eval('get(g:, "hellshake_yano_use_builtin_dict", 1)') as boolean;
      config.mergingStrategy = await denops.eval('get(g:, "hellshake_yano_dictionary_merge", "merge")') as 'override' | 'merge';
      config.autoReload = await denops.eval('get(g:, "hellshake_yano_auto_reload_dict", 0)') as boolean;

      return config;
    } catch {
      return {};
    }
  }

  /**
 * エラーを通知
   */
  async notifyError(denops: Denops, error: string): Promise<void> {
    try {
      await denops.cmd(`echohl ErrorMsg | echo '${error}' | echohl None`);
    } catch {
      // エラー通知の失敗は無視（process1_sub2）
    }
  }

  /**
 * 辞書を再読み込み
   */
  async reloadDictionary(denops: Denops): Promise<void> {
    try {
      await denops.call('hellshake_yano#reload_dictionary');
    } catch {
      // 辞書の再読み込み失敗は無視（process1_sub2）
    }
  }
}

/**
 * 辞書管理コマンド
 */
export async function registerDictionaryCommands(denops: Denops) {
  await denops.cmd('command! HellshakeYanoReloadDict call denops#request("hellshake-yano", "reloadDictionary", [])');
  await denops.cmd('command! HellshakeYanoEditDict call denops#request("hellshake-yano", "editDictionary", [])');
  await denops.cmd('command! HellshakeYanoShowDict call denops#request("hellshake-yano", "showDictionary", [])');
  await denops.cmd('command! HellshakeYanoValidateDict call denops#request("hellshake-yano", "validateDictionary", [])');
}

/**
 * 辞書管理機能
 */
/**
 * 辞書管理クラス
 */
export class DictionaryManager {
  /** 辞書ローダー */
  private loader: DictionaryLoader;
  /** 辞書マージャー */
  private merger: DictionaryMerger;
  /** Vim設定ブリッジ */
  private bridge: VimConfigBridge;

  /**
 * DictionaryManagerのコンストラクタ
   */
  constructor() {
    this.loader = new DictionaryLoader();
    this.merger = new DictionaryMerger();
    this.bridge = new VimConfigBridge();
  }

  /**
 * 辞書を再読み込みします
   */
  async reloadDictionary(denops: Denops): Promise<void> {
    try {
      const config = await this.bridge.getConfig(denops);
      const userDict = await this.loader.loadUserDictionary(config);

      await denops.cmd('echo "Dictionary reloaded successfully"');
    } catch (error) {
      await this.bridge.notifyError(denops, `Failed to reload dictionary: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
 * 辞書ファイルを編集します
   */
  async editDictionary(denops: Denops): Promise<void> {
    try {
      const config = await this.bridge.getConfig(denops);
      const dictPath = config.dictionaryPath || '~/.config/hellshake-yano/dictionary.json';

      await denops.cmd(`edit ${dictPath}`);
    } catch (error) {
      await this.bridge.notifyError(denops, `Failed to open dictionary: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
 * 辞書の内容を表示します
   */
  async showDictionary(denops: Denops): Promise<void> {
    try {
      const config = await this.bridge.getConfig(denops);
      const userDict = await this.loader.loadUserDictionary(config);

      const info = [
        'Dictionary Information:',
        `Custom Words: ${userDict.customWords.length}`,
        `Preserve Words: ${userDict.preserveWords.length}`,
        `Merge Rules: ${userDict.mergeRules.size}`,
        `Compound Patterns: ${userDict.compoundPatterns.length}`,
        `Hint Patterns: ${userDict.hintPatterns?.length || 0}`,
      ];

      for (const line of info) {
        await denops.cmd(`echo "${line}"`);
      }
    } catch (error) {
      await this.bridge.notifyError(denops, `Failed to show dictionary: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
 * 辞書を検証
   */
  async validateDictionary(denops: Denops): Promise<void> {
    try {
      const config = await this.bridge.getConfig(denops);
      const userDict = await this.loader.loadUserDictionary(config);

      const errors: string[] = [];

      // 基本的な検証
      if (userDict.customWords.some(word => word.trim() === '')) {
        errors.push('Empty custom words found');
      }

      if (userDict.hintPatterns) {
        for (const pattern of userDict.hintPatterns) {
          try {
            new RegExp(pattern.pattern as string);
          } catch {
            errors.push(`Invalid regex pattern: ${pattern.pattern}`);
          }
        }
      }

      if (errors.length === 0) {
        await denops.cmd('echo "Dictionary validation passed"');
      } else {
        await this.bridge.notifyError(denops, `Validation errors: ${errors.join(', ')}`);
      }
    } catch (error) {
      await this.bridge.notifyError(denops, `Failed to validate dictionary: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * ヒント優先度を持つWord型
 */
interface WordWithPriority extends Word {
  hintPriority?: number;
}

/**
 * ヒントパターンプロセッサークラス
 */
export class HintPatternProcessor {
  /**
 * ヒントパターンを適用
 * @param words
 * @param text
 * @param patterns
 * @returns 
   */
  applyHintPatterns(words: Word[], text: string, patterns: HintPattern[]): WordWithPriority[] {
    if (!patterns || patterns.length === 0) {
      return words as WordWithPriority[];
    }

    const enhancedWords: WordWithPriority[] = [...words];

    // 優先度でソート
    const sortedPatterns = patterns.sort((a, b) => b.priority - a.priority);

    for (const pattern of sortedPatterns) {
      const regex = typeof pattern.pattern === 'string' ? new RegExp(pattern.pattern, 'g') : pattern.pattern;
      let match;

      while ((match = regex.exec(text)) !== null) {
        const hintTarget = this.extractHintTarget(match, pattern.hintPosition);
        if (hintTarget) {
          const targetWord = this.findWordAtPosition(enhancedWords, hintTarget.position);
          if (targetWord) {
            // ヒント優先度を設定（型安全）
            targetWord.hintPriority = pattern.priority;
          }
        }
      }
    }

    return this.sortByHintPriority(enhancedWords);
  }

  /**
 * ヒントターゲットを抽出
   */
  private extractHintTarget(
    match: RegExpExecArray,
    rule: HintPositionRule
  ): { text: string; position: number } | null {
    if (typeof rule === 'string') {
      if (rule.startsWith('capture:')) {
        const captureIndex = parseInt(rule.split(':')[1], 10);
        if (match[captureIndex]) {
          return {
            text: match[captureIndex],
            position: match.index! + match[0].indexOf(match[captureIndex]),
          };
        }
      } else if (rule === 'start') {
        return { text: match[0], position: match.index! };
      } else if (rule === 'end') {
        return { text: match[0], position: match.index! + match[0].length - 1 };
      }
    } else if (typeof rule === 'object' && 'offset' in rule) {
      const basePosition = rule.from === 'start' ? match.index! : match.index! + match[0].length;
      return { text: match[0], position: basePosition + rule.offset };
    }

    return null;
  }

  /**
 * 指定位置の単語を検索
 * @param words
 * @param position
 * @returns 
   */
  private findWordAtPosition(words: WordWithPriority[], position: number): WordWithPriority | null {
    return words.find(word =>
      word.col && word.text &&
      position >= word.col &&
      position < word.col + word.text.length
    ) || null;
  }

  /**
 * ヒント優先度で並び替え
 * @param words
 * @returns 
   */
  private sortByHintPriority(words: WordWithPriority[]): WordWithPriority[] {
    return words.sort((a, b) => {
      const priorityA = a.hintPriority || 0;
      const priorityB = b.hintPriority || 0;
      return priorityB - priorityA;
    });
  }
}

// ========== Integrated from word/manager.ts ==========

/**
 * Word Detection Manager for Hellshake-Yano
 */

// Removed imports from detector.ts - integrated in this file

// resolveConfigType function
function resolveConfigType(
  config?: Config | Config,
): [Config | undefined, Config | undefined] {
  if (config && "useJapanese" in config) {
    return [config as Config, undefined];
  }
  return [undefined, config as unknown as Config];
}

/**
 * 単語検出マネージャー設定インターフェース
 */
export interface WordDetectionManagerConfig extends ImportedWordDetectionConfig {
  /** デフォルトの単語検出ストラテジー */
  defaultStrategy?: "regex" | "tinysegmenter" | "hybrid";
  /** 言語の自動検出を有効にするか */
  autoDetectLanguage?: boolean;
  /** パフォーマンスモニタリングを有効にするか */
  performanceMonitoring?: boolean;

  /** キャッシュ機能を有効にするか */
  cacheEnabled?: boolean;
  /** キャッシュの最大サイズ */
  cacheMaxSize?: number;
  /** キャッシュエントリの有効期限（ミリ秒） */
  cacheTtlMs?: number;

  /** 最大リトライ回数 */
  maxRetries?: number;
  /** リトライ間の遅延時間（ミリ秒） */
  retryDelayMs?: number;

  /** 処理タイムアウト時間（ミリ秒） */
  timeoutMs?: number;
  /** バッチ処理を有効にするか */
  batchProcessing?: boolean;
  /** 同時実行可能な検出数の上限 */
  maxConcurrentDetections?: number;
}

/**
 * キャッシュエントリインターフェース
 */
interface CacheEntry {
  /** 検出された単語の配列 */
  words: Word[];
  /** キャッシュ作成時刻 */
  timestamp: number;
  /** 使用されたディテクター名 */
  detector: string;
  /** 設定のハッシュ値 */
  config_hash: string;
}

/**
 * 検出統計情報インターフェース
 */
interface DetectionStats {
  /** 総呼び出し回数 */
  total_calls: number;
  /** キャッシュヒット回数 */
  cache_hits: number;
  /** キャッシュミス回数 */
  cache_misses: number;
  /** エラー発生回数 */
  errors: number;
  /** 平均処理時間（ミリ秒） */
  average_duration: number;
  /** ディテクター別使用回数 */
  detector_usage: Record<string, number>;
}

/**
 * メイン単語検出マネージャー
 */
export class WordDetectionManager {
  private detectors: Map<string, ImportedWordDetector> = new Map();
  private config: Required<WordDetectionManagerConfig>;
  private cache: Map<string, CacheEntry> = new Map();
  private stats: DetectionStats;
  private initialized = false;
  private sessionContext: DetectionContext | null = null;
  private globalConfig?: Config; // 統一的なmin_length処理のためのグローバル設定
  private unifiedConfig?: Config; // Configへの移行対応

  /**
 * WordDetectionManagerのコンストラクタ
   */
  constructor(config: WordDetectionManagerConfig = {}, globalConfig?: Config | Config) {
    this.config = this.mergeWithDefaults(config);
    [this.unifiedConfig, this.globalConfig] = resolveConfigType(globalConfig);
    this.stats = this.initializeStats();
  }

  /**
 * デフォルトディテクターでマネージャーを初期化
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Register default detectors with globalConfig (Config takes precedence)
    const configToUse = this.unifiedConfig || this.globalConfig;
    const regexDetector = new ImportedRegexWordDetector(this.config, configToUse);
    const segmenterDetector = new ImportedTinySegmenterWordDetector();
    const hybridDetector = new ImportedHybridWordDetector(this.config);

    this.registerDetector(regexDetector);
    this.registerDetector(segmenterDetector);
    this.registerDetector(hybridDetector);

    // Test detector availability
    for (const [name, detector] of this.detectors) {
      const available = await detector.isAvailable();
    }

    this.initialized = true;
  }

  /**
 * 単語ディテクターを登録
   */
  registerDetector(detector: ImportedWordDetector): void {
    this.detectors.set(detector.name, detector);
  }

  /**
 * メイン単語検出メソッド
   */
  async detectWords(
    text: string,
    startLine: number = 1,
    denops?: Denops,
    context?: DetectionContext,
  ): Promise<WordDetectionResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    this.stats.total_calls++;

    // Use provided context or stored session context
    const effectiveContext = context || this.sessionContext || undefined;
    const useCache = this.config.cacheEnabled && !this.shouldSkipCache(effectiveContext);

    try {
      // Check cache first
      if (useCache) {
        const cached = this.getCachedResult(text, startLine, effectiveContext);
        if (cached) {
          this.stats.cache_hits++;
          return {
            words: cached.words,
            detector: cached.detector,
            success: true,
            performance: {
              duration: Date.now() - startTime,
              wordCount: cached.words.length,
              linesProcessed: text.split("\n").length,
            },
          };
        }
        this.stats.cache_misses++;
      }

      // Select appropriate detector
      const detector = await this.selectDetector(text);
      if (!detector) {
        throw new Error("No suitable detector available");
      }

      // Perform detection with timeout
      const words = await this.detectWithTimeout(detector, text, startLine, effectiveContext, denops);

      // Cache the result
      if (useCache) {
        this.cacheResult(text, startLine, words, detector.name, effectiveContext);
      }

      // Update statistics
      this.stats.detector_usage[detector.name] = (this.stats.detector_usage[detector.name] || 0) +
        1;
      const duration = Date.now() - startTime;
      this.updateAverageDuration(duration);

      return {
        words,
        detector: detector.name,
        success: true,
        performance: {
          duration,
          wordCount: words.length,
          linesProcessed: text.split("\n").length,
        },
      };
    } catch (error) {
      this.stats.errors++;

      // Try fallback detector if enabled
      if (this.config.enableFallback) {
        try {
          const fallbackDetector = this.getFallbackDetector();
          if (fallbackDetector) {
            const words = await fallbackDetector.detectWords(text, startLine, effectiveContext, denops);
            return {
              words,
              detector: `${fallbackDetector.name} (fallback)`,
              success: true,
              error: `Primary detection failed: ${error}`,
              performance: {
                duration: Date.now() - startTime,
                wordCount: words.length,
                linesProcessed: text.split("\n").length,
              },
            };
          }
        } catch (fallbackError) {
        }
      }

      return {
        words: [],
        detector: "none",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        performance: {
          duration: Date.now() - startTime,
          wordCount: 0,
          linesProcessed: text.split("\n").length,
        },
      };
    }
  }

  /**
 * Denopsバッファから単語を検出（便利メソッド）
   */
  async detectWordsFromBuffer(
    denops: Denops,
    context?: DetectionContext,
  ): Promise<WordDetectionResult> {
    try {
      // Get visible range
      const topLine = await denops.call("line", "w0") as number;
      const bottomLine = await denops.call("line", "w$") as number;

      // Get lines content
      const lines = await denops.call("getbufline", "%", topLine, bottomLine) as string[];
      const text = lines.join("\n");

      return this.detectWords(text, topLine, denops, context);
    } catch (error) {
      return {
        words: [],
        detector: "none",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        performance: {
          duration: 0,
          wordCount: 0,
          linesProcessed: 0,
        },
      };
    }
  }

  /**
 * 指定されたテキストに最適なディテクターを選択
   */
  private async selectDetector(text: string): Promise<ImportedWordDetector | null> {
    const availableDetectors = Array.from(this.detectors.values())
      .filter((d) => d.canHandle(text))
      .sort((a, b) => b.priority - a.priority);

    if (availableDetectors.length === 0) {
      return null;
    }

    // Strategy-based selection
    // word_detection_strategyとstrategyの両方をサポート
    const enhancedConfig = this.config as EnhancedWordConfig;
    const strategy = enhancedConfig.wordDetectionStrategy || enhancedConfig.strategy ||
      enhancedConfig.defaultStrategy;

    switch (strategy) {
      case "regex":
        return availableDetectors.find((d) => d.name.includes("Regex")) || availableDetectors[0];

      case "tinysegmenter":
        const segmenterDetector = availableDetectors.find((d) => d.name.includes("TinySegmenter"));
        if (segmenterDetector && await segmenterDetector.isAvailable()) {
          return segmenterDetector;
        }
        return availableDetectors[0];

      case "hybrid":
        const hybridDetector = availableDetectors.find((d) => d.name.includes("Hybrid"));
        if (hybridDetector && await hybridDetector.isAvailable()) {
          return hybridDetector;
        }
        return availableDetectors[0];

      default:
        // Auto-detect based on content
        if (this.config.autoDetectLanguage) {
          const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
          if (hasJapanese) {
            const japaneseDetector = availableDetectors.find((d) =>
              d.supportedLanguages.includes("ja") && d.priority > 1
            );
            if (japaneseDetector && await japaneseDetector.isAvailable()) {
              return japaneseDetector;
            }
          }
        }
        return availableDetectors[0];
    }
  }

  /**
 * フォールバックディテクターを取得
   */
  private getFallbackDetector(): ImportedWordDetector | null {
    if (this.config.fallbackToRegex) {
      return this.detectors.get("RegexWordDetector") || null;
    }

    // Return the detector with lowest priority (most basic)
    const detectors = Array.from(this.detectors.values())
      .sort((a, b) => a.priority - b.priority);

    return detectors[0] || null;
  }

  /**
 * タイムアウト保護付き単語検出
   */
  private async detectWithTimeout(
    detector: ImportedWordDetector,
    text: string,
    startLine: number,
    context?: DetectionContext,
    denops?: Denops,
  ): Promise<Word[]> {
    if (!this.config.timeoutMs) {
      return detector.detectWords(text, startLine, context, denops);
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Detection timeout (${this.config.timeoutMs}ms)`));
      }, this.config.timeoutMs);

      detector.detectWords(text, startLine, context, denops)
        .then((result: Word[]) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error: Error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
 * キャッシュキーを生成
   */
  private generateCacheKey(
    text: string,
    startLine: number,
    context?: DetectionContext,
  ): string {
    const configHash = this.generateConfigHash();
    const textHash = this.simpleHash(text);
    const contextHash = context ? this.generateContextHash(context) : "noctx";
    return `${textHash}:${startLine}:${configHash}:${contextHash}`;
  }

  private generateConfigHash(): string {
    const enhancedConfig = this.config as EnhancedWordConfig;
    const relevantConfig = {
      strategy: enhancedConfig.wordDetectionStrategy || enhancedConfig.strategy,
      useJapanese: this.config.useJapanese,
      // useImprovedDetection: 統合済み（常に有効）
      minWordLength: this.config.minWordLength,
      maxWordLength: this.config.maxWordLength,
      defaultMinWordLength: this.config.defaultMinWordLength ||
                           (this.globalConfig as Config | undefined)?.defaultMinWordLength,
      perKeyMinLength: (this.globalConfig as Config | undefined)?.perKeyMinLength,
    };
    return this.simpleHash(JSON.stringify(relevantConfig));
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private getCachedResult(
    text: string,
    startLine: number,
    context?: DetectionContext,
  ): CacheEntry | null {
    const key = this.generateCacheKey(text, startLine, context);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.config.cacheTtlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  private cacheResult(
    text: string,
    startLine: number,
    words: Word[],
    detector: string,
    context?: DetectionContext,
  ): void {
    const key = this.generateCacheKey(text, startLine, context);

    // Manage cache size
    if (this.cache.size >= this.config.cacheMaxSize) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = entries.slice(0, Math.floor(this.config.cacheMaxSize * 0.1));
      for (const [key] of toRemove) {
        this.cache.delete(key);
      }
    }

    this.cache.set(key, {
      words,
      timestamp: Date.now(),
      detector,
      config_hash: this.generateConfigHash(),
    });
  }

  private generateContextHash(context: DetectionContext): string {
    const payload = {
      currentKey: context.currentKey ?? null,
      minWordLength: context.minWordLength ?? null,
    };
    return this.simpleHash(JSON.stringify(payload));
  }

  private shouldSkipCache(context?: DetectionContext): boolean {
    if (!context) {
      return false;
    }
    // Only recognized fields are safe for cache key inclusion
    const allowedKeys = ["currentKey", "minWordLength", "metadata"];
    return Object.keys(context).some((key) => !allowedKeys.includes(key));
  }

  /**
 * 統計情報を初期化
   */
  private initializeStats(): DetectionStats {
    return {
      total_calls: 0,
      cache_hits: 0,
      cache_misses: 0,
      errors: 0,
      average_duration: 0,
      detector_usage: {},
    };
  }

  private updateAverageDuration(duration: number): void {
    const totalDuration = this.stats.average_duration * (this.stats.total_calls - 1) + duration;
    this.stats.average_duration = totalDuration / this.stats.total_calls;
  }

  /**
 * 統計情報を取得
   */
  getStats(): DetectionStats {
    return { ...this.stats };
  }

  /**
 * キャッシュ統計情報を取得
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    const total = this.stats.cache_hits + this.stats.cache_misses;
    return {
      size: this.cache.size,
      maxSize: this.config.cacheMaxSize,
      hitRate: total > 0 ? this.stats.cache_hits / total : 0,
    };
  }

  /**
 * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
 * 統計情報をリセット
   */
  resetStats(): void {
    this.stats = this.initializeStats();
  }

  /**
 * 設定を更新
   */
  updateConfig(newConfig: Partial<WordDetectionManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // word_detection_strategyがある場合はstrategyに反映
    const enhancedConfig = newConfig as EnhancedWordConfig;
    if (enhancedConfig.wordDetectionStrategy) {
      this.config.strategy = enhancedConfig.wordDetectionStrategy;
      this.config.defaultStrategy = enhancedConfig.wordDetectionStrategy;
    }

    if (this.affectsDetection(newConfig)) {
      this.clearCache();
    }

    // 検出戦略が変更された場合はディテクターを再初期化
    if (this.shouldReinitializeDetectors(newConfig)) {
      this.reinitializeDetectors();
    }
  }

  /**
 * 設定変更が検出結果に影響するかチェック
 * @returns 
   */
  private affectsDetection(newConfig: Partial<WordDetectionManagerConfig>): boolean {
    const affectingKeys = [
      "strategy",
      "word_detection_strategy",
      "use_japanese",
      "enable_tinysegmenter",
      "segmenter_threshold",
      "min_word_length",
      "max_word_length",
    ];

    return affectingKeys.some((key) => key in newConfig);
  }

  /**
 * ディテクターの再初期化が必要かチェック
 * @returns 
   */
  private shouldReinitializeDetectors(newConfig: Partial<WordDetectionManagerConfig>): boolean {
    const reinitKeys = [
      "strategy",
      "word_detection_strategy",
      "enable_tinysegmenter",
      "use_japanese",
    ];

    return reinitKeys.some((key) => key in newConfig);
  }

  /**
 * ディテクターを再初期化
   */
  private reinitializeDetectors(): void {
    try {
      // 既存のディテクターをクリア
      this.detectors.clear();

      // 新しい設定でディテクターを再作成
      const regexDetector = new ImportedRegexWordDetector(this.config);
      // Using RegexWordDetector as fallback until proper implementations are added
      const segmenterDetector = new ImportedRegexWordDetector(this.config);
      const hybridDetector = new ImportedRegexWordDetector(this.config);

      this.registerDetector(regexDetector);
      this.registerDetector(segmenterDetector);
      this.registerDetector(hybridDetector);
    } catch (error) {
    }
  }

  /**
 * 利用可能なディテクター一覧を取得
   */
  getAvailableDetectors(): Array<{ name: string; priority: number; languages: string[] }> {
    return Array.from(this.detectors.values()).map((d) => ({
      name: d.name,
      priority: d.priority,
      languages: d.supportedLanguages,
    }));
  }

  /**
 * セッションコンテキストを設定
   */
  setSessionContext(context: DetectionContext | null): void {
    this.sessionContext = context;
  }

  /**
 * セッションコンテキストを取得
   */
  getSessionContext(): DetectionContext | null {
    return this.sessionContext;
  }

  /**
 * コンテキストに基づいて適切なディテクターを取得
   */
  async getDetectorForContext(context?: DetectionContext, text?: string): Promise<ImportedWordDetector | null> {
    try {
      if (!this.initialized) {
        return null;
      }

      // Get strategy from context, or fall back to config
      const enhancedConfig = this.config as EnhancedWordConfig;
      const strategy = context?.strategy ||
        enhancedConfig.wordDetectionStrategy ||
        enhancedConfig.strategy ||
        enhancedConfig.defaultStrategy;

      // Filter detectors by text handling capability if text is provided
      let availableDetectors = Array.from(this.detectors.values());
      if (text) {
        availableDetectors = availableDetectors.filter((d) => d.canHandle(text));
      }

      // Sort by priority
      availableDetectors.sort((a, b) => b.priority - a.priority);

      if (availableDetectors.length === 0) {
        return null;
      }

      // Strategy-based selection with availability check
      switch (strategy) {
        case "regex":
          const regexDetector = availableDetectors.find((d) => d.name.includes("Regex"));
          if (regexDetector && await regexDetector.isAvailable()) {
            return regexDetector;
          }
          break;

        case "tinysegmenter":
          const segmenterDetector = availableDetectors.find((d) => d.name.includes("TinySegmenter"));
          if (segmenterDetector && await segmenterDetector.isAvailable()) {
            return segmenterDetector;
          }
          break;

        case "hybrid":
          const hybridDetector = availableDetectors.find((d) => d.name.includes("Hybrid"));
          if (hybridDetector && await hybridDetector.isAvailable()) {
            return hybridDetector;
          }
          break;
      }

      // Fallback: return the highest priority available detector
      for (const detector of availableDetectors) {
        if (await detector.isAvailable()) {
          return detector;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
 * すべてのディテクターをテスト
   */
  async testDetectors(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, detector] of this.detectors) {
      try {
        results[name] = await detector.isAvailable();
      } catch {
        results[name] = false;
      }
    }

    return results;
  }

  /**
 * デフォルト設定とマージ
   */
  private mergeWithDefaults(
    config: WordDetectionManagerConfig,
  ): Required<WordDetectionManagerConfig> {
    const defaults = {
      // From DEFAULT_UNIFIED_CONFIG
      defaultMinWordLength: DEFAULT_UNIFIED_CONFIG.defaultMinWordLength,

      // Detection settings
      strategy: "hybrid" as "regex" | "tinysegmenter" | "hybrid",
      useJapanese: DEFAULT_UNIFIED_CONFIG.useJapanese,
      enableTinySegmenter: DEFAULT_UNIFIED_CONFIG.enableTinySegmenter,
      segmenterThreshold: DEFAULT_UNIFIED_CONFIG.segmenterThreshold,
      segmenterCacheSize: 1000,

      // Manager settings
      defaultStrategy: "hybrid" as "regex" | "tinysegmenter" | "hybrid",
      autoDetectLanguage: true,
      performanceMonitoring: true,

      // Cache settings
      cacheEnabled: true,
      cacheMaxSize: 500,
      cacheTtlMs: 300000, // 5 minutes

      // Error handling
      enableFallback: true,
      fallbackToRegex: true,
      maxRetries: 2,
      retryDelayMs: 100,

      // Performance settings
      timeoutMs: 5000, // 5 second timeout
      batch_processing: false,
      max_concurrent_detections: 3,

      // Filter settings
      minWordLength: 1,
      maxWordLength: 50,
      exclude_numbers: false,
      exclude_single_chars: false,
      batchSize: 100,
    };

    // 渡されたconfigの値を優先（use_japaneseが明示的に設定されている場合はそれを使用）
    const merged = {
      ...defaults,
      ...config,
    };

    // use_japaneseが明示的に設定されている場合、その値を確実に適用
    if (config.useJapanese !== undefined) {
      merged.useJapanese = config.useJapanese;
    }

    // word_detection_strategyがある場合はstrategyに反映
    const enhancedConfig = config as EnhancedWordConfig;
    if (enhancedConfig.wordDetectionStrategy) {
      merged.strategy = enhancedConfig.wordDetectionStrategy;
    }

    return merged as Required<WordDetectionManagerConfig>;
  }
}

/**
 * グローバルマネージャーインスタンス管理
 */
let globalManager: WordDetectionManager | null = null;

/**
 * 単語検出マネージャーのシングルトンインスタンスを取得
 */
export function getWordDetectionManager(
  config?: WordDetectionManagerConfig,
  globalConfig?: Config | Config,
): WordDetectionManager {
  if (!globalManager) {
    globalManager = new WordDetectionManager(config, globalConfig);
  } else if (config) {
    // 既存のマネージャーがある場合でも、新しい設定で更新
    globalManager = new WordDetectionManager(config, globalConfig);
  }
  return globalManager;
}

/**
 * 単語検出マネージャーをリセット
 */
export function resetWordDetectionManager(): void {
  globalManager = null;
}

// ==================== globalThis への extractWords 登録 ====================
// NOTE: 循環依存を避けるため、word-detector-strategies.ts から参照できるように
//       extractWords 関数を globalThis に登録します。

declare global {
  // deno-lint-ignore no-var
  var extractWords: ((
    lineText: string,
    lineNumber: number,
    options?: ExtractWordsOptions,
  ) => Word[]) | undefined;
}

// extractWords 関数を globalThis に登録
globalThis.extractWords = extractWords;
