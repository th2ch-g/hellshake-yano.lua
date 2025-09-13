import type { Denops } from "@denops/std";
import { getWordDetectionManager, type WordDetectionManagerConfig } from "./word/manager.ts";
import type { WordDetectionResult } from "./word/detector.ts";
import { charIndexToByteIndex } from "./utils/encoding.ts";

/**
 * Process 50 Sub3: 日本語除外機能の設定インターフェース（後方互換性のため保持）
 * @description 単語検出時の日本語サポート設定
 * @since 1.0.0
 * @deprecated 新しいEnhancedWordConfigを使用してください
 */
export interface WordConfig {
  /** 日本語を含む単語検出を行うか（デフォルト: false） */
  use_japanese?: boolean;
}

/**
 * Process 50 Sub7: 新しい単語検出設定インターフェース（WordDetectionManagerConfig のエイリアス）
 * @description 高機能単語検出マネージャー用の設定インターフェース
 * @since 1.0.0
 */
export interface EnhancedWordConfig extends WordDetectionManagerConfig {
  /** 後方互換性のための単語検出ストラテジー */
  strategy?: "regex" | "tinysegmenter" | "hybrid";
}

/**
 * 単語情報インターフェース
 * @description 検出された単語の情報を格納するインターフェース
 * @since 1.0.0
 */
export interface Word {
  /** 単語のテキスト */
  text: string;
  /** 行番号（1ベース） */
  line: number;
  /** 列番号（1ベース、文字ベース） */
  col: number;
  /** バイトベースの列番号（1ベース、UTF-8互換性用） */
  byteCol?: number;
}

// キャッシュとパフォーマンス設定
const CACHE_MAX_SIZE = 100;
const LARGE_FILE_THRESHOLD = 1000;
const MAX_WORDS_PER_FILE = 1000;
const wordDetectionCache = new Map<string, Word[]>();

/**
 * 画面内の単語を検出する（レガシー版、後方互換性のため保持）
 * @description 現在の表示範囲内の単語を検出するレガシー実装
 * @param denops - Denopsインスタンス
 * @returns Promise<Word[]> - 検出された単語の配列
 * @deprecated 新しいdetectWordsWithManagerを使用してください
 * @since 1.0.0
 * @example
 * ```typescript
 * const words = await detectWords(denops);
 * console.log(`Found ${words.length} words`);
 * ```
 */
export async function detectWords(denops: Denops): Promise<Word[]> {
  // console.warn("[DEPRECATED] detectWords: Use detectWordsWithManager for enhanced capabilities");

  const words: Word[] = [];

  // 画面の表示範囲を取得
  const topLine = await denops.call("line", "w0") as number;
  const bottomLine = await denops.call("line", "w$") as number;

  // 各行から単語を検出（オリジナル実装）
  for (let line = topLine; line <= bottomLine; line++) {
    const lineText = await denops.call("getline", line) as string;

    // 単語を検出（\b\w+\b パターン）
    const wordRegex = /\b\w+\b/g;
    let match: RegExpExecArray | null;

    while ((match = wordRegex.exec(lineText)) !== null) {
      const byteIndex = charIndexToByteIndex(lineText, match.index);

      words.push({
        text: match[0],
        line: line,
        col: match.index + 1, // Vimの列番号は1から始まる
        byteCol: byteIndex + 1, // Vimのバイト列番号は1から始まる
      });
    }
  }

  return words;
}

/**
 * Process 50 Sub7: 新しい単語検出マネージャーを使用した高機能版検出
 * @description 高機能単語検出マネージャーを使用して単語を検出。TinySegmenterやハイブリッドモードをサポート
 * @param denops - Denopsインスタンス
 * @param config - 高機能単語検出設定（省略時はデフォルト設定）
 * @returns Promise<WordDetectionResult> - 検出結果とパフォーマンス情報を含むオブジェクト
 * @throws {Error} 単語検出マネージャーの初期化に失敗した場合
 * @since 1.0.0
 * @example
 * ```typescript
 * const result = await detectWordsWithManager(denops, {
 *   strategy: 'hybrid',
 *   use_japanese: true,
 *   enable_tinysegmenter: true
 * });
 * if (result.success) {
 *   console.log(`Found ${result.words.length} words using ${result.detector}`);
 * }
 * ```
 */
export async function detectWordsWithManager(
  denops: Denops,
  config: EnhancedWordConfig = {},
): Promise<WordDetectionResult> {
  try {
    const manager = getWordDetectionManager(config);
    return await manager.detectWordsFromBuffer(denops);
  } catch (error) {
    // console.error("[detectWordsWithManager] Error:", error);

    // フォールバックとして従来のメソッドを使用
    const fallbackWords = await detectWordsWithConfig(denops, config);
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

/**
 * Process 50 Sub3: 設定に基づいて画面内の単語を検出する（統合版）
 * @description 設定に基づいて単語検出を行う中級レベルの関数。日本語サポートと改善版検出を含む
 * @param denops - Denopsインスタンス
 * @param config - 単語検出設定（省略時はデフォルト設定）
 * @returns Promise<Word[]> - 検出された単語の配列
 * @since 1.0.0
 * @example
 * ```typescript
 * const words = await detectWordsWithConfig(denops, { use_japanese: true });
 * console.log(`Found ${words.length} words with Japanese support`);
 * ```
 */
export async function detectWordsWithConfig(
  denops: Denops,
  config: WordConfig = {},
): Promise<Word[]> {
  const words: Word[] = [];

  // 画面の表示範囲を取得
  const topLine = await denops.call("line", "w0") as number;
  const bottomLine = await denops.call("line", "w$") as number;

  // 各行から設定に基づいて単語を検出（常に改善版を使用）
  for (let line = topLine; line <= bottomLine; line++) {
    const lineText = await denops.call("getline", line) as string;

    // use_japanese設定に基づいてexcludeJapaneseを決定
    const excludeJapanese = config.use_japanese !== true;
    const lineWords = extractWordsFromLine(lineText, line, true, excludeJapanese);
    words.push(...lineWords);
  }

  return words;
}

/**
 * 標準的な単語検出
 * @description 基本的な正規表現パターンを使用した単語検出
 * @param denops - Denopsインスタンス
 * @param topLine - 検出開始行番号
 * @param bottomLine - 検出終了行番号
 * @returns Promise<Word[]> - 検出された単語の配列
 * @since 1.0.0
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
    const lineWords = extractWordsFromLine(lineText, line, false); // オリジナル版を使用
    words.push(...lineWords);
  }

  return words;
}

/**
 * 大ファイル用の最適化された単語検出
 * @description 大量の行数を持つファイルに対してバッチ処理で効率的に単語検出を行う
 * @param denops - Denopsインスタンス
 * @param topLine - 検出開始行番号
 * @param bottomLine - 検出終了行番号
 * @returns Promise<Word[]> - 検出された単語の配列
 * @since 1.0.0
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
        const lineWords = extractWordsFromLine(lineText, actualLine, false); // オリジナル版を使用
        words.push(...lineWords);
      });

      // CPU負荷を減らすための小さな遅延
      if (words.length > 1000) {
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    } catch (error) {
      // console.error(`[hellshake-yano] Error processing batch ${startLine}-${endLine}:`, error);
      // エラーが発生したバッチはスキップして続行
      continue;
    }
  }

  return words;
}

/**
 * 改善された日本語テキスト分割関数
 * @description TinySegmenterが利用できない場合の代替手段として、文字種別に基づいて自然な単語境界を検出
 * @param text - 分割する日本語テキスト
 * @param baseIndex - 元の文字列内での開始インデックス
 * @returns {{ text: string, index: number }[]} - 分割された単語とその位置の配列
 * @since 1.0.0
 * @example
 * ```typescript
 * const result = splitJapaneseTextImproved('こんにちはworld123', 0);
 * // [{ text: 'こんにちは', index: 0 }, { text: 'world', index: 5 }, { text: '123', index: 10 }]
 * ```
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
 * 1行から単語を抽出（オリジナル版 - 既存テスト用）
 * @description オリジナルの単語抽出ロジック。既存テストとの互換性を保つために保持
 * @param lineText - 解析する行のテキスト
 * @param lineNumber - 行番号
 * @returns Word[] - 抽出された単語の配列
 * @deprecated 新しいextractWordsFromLineを使用してください
 * @since 1.0.0
 */
export function extractWordsFromLineOriginal(lineText: string, lineNumber: number): Word[] {
  const words: Word[] = [];

  // 空行や短すぎる行はスキップ
  if (!lineText || lineText.trim().length < 2) {
    return words;
  }

  // 最適化された正規表現（ユニコード対応）
  const wordRegex = /[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]+/g;
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

    words.push({
      text: match.text,
      line: lineNumber,
      col: match.index + 1, // Vimの列番号は1から始まる
      byteCol: byteIndex + 1, // Vimのバイト列番号は1から始まる
    });
  }

  return words;
}

/**
 * 1行から単語を抽出（改善版 - Process50 Sub6対応）
 * @description 改善された単語抽出アルゴリズム。kebab-case、snake_case、日本語文字種別分割などをサポート
 * @param lineText - 解析する行のテキスト
 * @param lineNumber - 行番号
 * @param useImprovedDetection - 改善版検出を使用するか（デフォルト: false）
 * @param excludeJapanese - 日本語を除外するか（デフォルト: false）
 * @returns Word[] - 抽出された単語の配列
 * @since 1.0.0
 * @example
 * ```typescript
 * const words = extractWordsFromLine('hello-world snake_case こんにちは', 1, true, false);
 * // こんにちは、hello、world、snake、caseなどの単語が抽出される
 * ```
 */
export function extractWordsFromLine(
  lineText: string,
  lineNumber: number,
  useImprovedDetection = false,
  excludeJapanese = false,
): Word[] {
  // 既存テストとの互換性を保つためデフォルトはオリジナル版を使用
  if (!useImprovedDetection) {
    return extractWordsFromLineOriginal(lineText, lineNumber);
  }
  const words: Word[] = [];

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

    if (!isAlreadyMatched && numberMatch[0].length >= 1) {
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

  // 5. 1文字の数字を別途検出（"1", "2", "8"など）
  const singleDigitRegex = /\b\d\b/g;
  let digitMatch: RegExpExecArray | null;
  while ((digitMatch = singleDigitRegex.exec(lineText)) !== null) {
    // 既存のマッチと重複していないかチェック
    const isAlreadyMatched = splitMatches.some((existing) =>
      existing.index <= digitMatch!.index &&
      existing.index + existing.text.length >= digitMatch!.index + digitMatch![0].length
    );

    if (!isAlreadyMatched) {
      splitMatches.push({ text: digitMatch[0], index: digitMatch.index });
    }
  }

  // 6. インデックスでソートして重複除去
  const uniqueMatches = splitMatches
    .sort((a, b) => a.index - b.index)
    .filter((match, index, array) => {
      // 同じ位置で同じテキストの重複を除去
      if (index === 0) return true;
      const prev = array[index - 1];
      return !(prev.index === match.index && prev.text === match.text);
    });

  // 7. パフォーマンス保護：1行あたり200個まで
  const finalMatches = uniqueMatches.slice(0, 200);

  // 8. Wordオブジェクトに変換
  for (const match of finalMatches) {
    // Calculate byte position for UTF-8 compatibility
    const byteIndex = charIndexToByteIndex(lineText, match.index);

    words.push({
      text: match.text,
      line: lineNumber,
      col: match.index + 1, // Vimの列番号は1から始まる
      byteCol: byteIndex + 1, // Vimのバイト列番号は1から始まる
    });
  }

  return words;
}

/**
 * Process 50 Sub3: 設定に基づいて1行から単語を抽出（統合版）
 * @description 設定オブジェクトに基づいて単語抽出を行うラッパー関数
 * @param lineText - 解析する行のテキスト
 * @param lineNumber - 行番号
 * @param config - 単語検出設定（省略時はデフォルト設定）
 * @returns Word[] - 抽出された単語の配列
 * @since 1.0.0
 * @example
 * ```typescript
 * const words = extractWordsFromLineWithConfig('hello こんにちは', 1, { use_japanese: true });
 * ```
 */
export function extractWordsFromLineWithConfig(
  lineText: string,
  lineNumber: number,
  config: WordConfig = {},
): Word[] {
  // 常に改善版を使用し、use_japanese設定に基づいてexcludeJapaneseを決定
  const excludeJapanese = config.use_japanese !== true;
  return extractWordsFromLine(lineText, lineNumber, true, excludeJapanese);
}

/**
 * 特定範囲の単語を検出（パフォーマンステスト用）
 * @description 指定された行範囲内の単語を検出。パフォーマンステストや部分的な単語検出に使用
 * @param denops - Denopsインスタンス
 * @param startLine - 検出開始行番号（1ベース）
 * @param endLine - 検出終了行番号（1ベース）
 * @param maxWords - 最大単語数制限（省略時はデフォルト値使用）
 * @returns Promise<Word[]> - 検出された単語の配列
 * @throws {Error} 範囲指定が無効な場合（空の配列を返す）
 * @since 1.0.0
 * @example
 * ```typescript
 * const words = await detectWordsInRange(denops, 1, 100, 50);
 * console.log(`Found ${words.length} words in lines 1-100`);
 * ```
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
      const lineWords = extractWordsFromLine(lineText, line, false); // オリジナル版を使用

      // 単語数制限を適用
      const remainingSlots = effectiveMaxWords - words.length;
      words.push(...lineWords.slice(0, remainingSlots));
    }

    return words;
  } catch (error) {
    // console.error("[hellshake-yano] Error in detectWordsInRange:", error);
    return [];
  }
}

/**
 * 単語検出キャッシュをクリア
 * @description 単語検出関連のキャッシュをすべてクリアする
 * @returns void
 * @since 1.0.0
 * @example
 * ```typescript
 * clearWordDetectionCache(); // キャッシュをリセット
 * ```
 */
export function clearWordDetectionCache(): void {
  wordDetectionCache.clear();
}

/**
 * キャッシュの統計情報を取得
 * @description 単語検出キャッシュの使用状況と設定値を取得
 * @returns {{ cacheSize: number, cacheKeys: string[], maxCacheSize: number, largeFileThreshold: number, maxWordsPerFile: number }} キャッシュ統計情報
 * @since 1.0.0
 * @example
 * ```typescript
 * const stats = getWordDetectionCacheStats();
 * console.log(`Cache size: ${stats.cacheSize}/${stats.maxCacheSize}`);
 * console.log(`Large file threshold: ${stats.largeFileThreshold} lines`);
 * ```
 */
export function getWordDetectionCacheStats(): {
  cacheSize: number;
  cacheKeys: string[];
  maxCacheSize: number;
  largeFileThreshold: number;
  maxWordsPerFile: number;
} {
  return {
    cacheSize: wordDetectionCache.size,
    cacheKeys: Array.from(wordDetectionCache.keys()),
    maxCacheSize: CACHE_MAX_SIZE,
    largeFileThreshold: LARGE_FILE_THRESHOLD,
    maxWordsPerFile: MAX_WORDS_PER_FILE,
  };
}

/**
 * Process2: レガシー互換性アダプター関数
 * @description extractWordsFromLineOriginalと100%互換性のある結果を返すアダプター関数。
 * 将来的には新しい実装をベースとした最適化版に切り替え可能な設計。
 *
 * **レガシー互換性の特徴:**
 * - 最小単語長: 2文字以上
 * - 数字のみの単語を除外
 * - kebab-caseは分割（ハイフンで区切られる）
 * - snake_caseは保持（アンダースコアは単語文字として扱う）
 * - 連続する日本語は1つの単語として扱う
 * - パフォーマンス制限: 1行あたり最大100単語
 *
 * @param lineText - 解析する行のテキスト
 * @param lineNumber - 行番号（1ベース）
 * @returns Word[] - レガシー互換性を保った抽出された単語の配列
 * @since 1.0.0
 * @version Process2 - TDD実装によるアダプターパターン
 *
 * @example
 * ```typescript
 * // kebab-caseの分割
 * const kebabWords = extractWordsFromLineLegacy('hello-world foo-bar', 1);
 * console.log(kebabWords.map(w => w.text)); // ["hello", "world", "foo", "bar"]
 *
 * // snake_caseの保持
 * const snakeWords = extractWordsFromLineLegacy('hello_world foo_bar', 1);
 * console.log(snakeWords.map(w => w.text)); // ["hello_world", "foo_bar"]
 *
 * // 日本語の連続処理
 * const japaneseWords = extractWordsFromLineLegacy('これは日本語のテストです', 1);
 * console.log(japaneseWords.map(w => w.text)); // ["これは日本語のテストです"]
 *
 * // フィルタリング（2文字未満、数字のみを除外）
 * const filteredWords = extractWordsFromLineLegacy('a bb 123 word1', 1);
 * console.log(filteredWords.map(w => w.text)); // ["bb", "word1"]
 * ```
 */
export function extractWordsFromLineLegacy(
  lineText: string,
  lineNumber: number,
): Word[] {
  // TDD Process2: アダプターパターンによる実装
  // 現在の実装: 100%互換性保証のためオリジナル関数を使用
  //
  // 設計ノート:
  // - Phase1: オリジナル関数の直接使用（現在のフェーズ）
  // - Phase2: 新しい実装 + フィルタリングによる最適化（将来予定）
  // - Phase3: 完全にカスタマイズされた実装（長期計画）

  return extractWordsFromLineOriginal(lineText, lineNumber);
}
