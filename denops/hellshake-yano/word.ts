import type { Denops } from "@denops/std";
import { getWordDetectionManager, type WordDetectionManagerConfig } from "./word/manager.ts";
import type { WordDetectionResult } from "./word/detector.ts";

// Process 50 Sub3: 日本語除外機能の設定インターフェース（後方互換性のため保持）
export interface WordConfig {
  use_japanese?: boolean;
}

// Process 50 Sub7: 新しい単語検出設定インターフェース（WordDetectionManagerConfig のエイリアス）
export interface EnhancedWordConfig extends WordDetectionManagerConfig {
  // 後方互換性のための追加フィールド
  strategy?: "regex" | "tinysegmenter" | "hybrid";
}

export interface Word {
  text: string;
  line: number;
  col: number;
}

// キャッシュとパフォーマンス設定
const CACHE_MAX_SIZE = 100;
const LARGE_FILE_THRESHOLD = 1000;
const MAX_WORDS_PER_FILE = 1000;
const wordDetectionCache = new Map<string, Word[]>();

/**
 * 画面内の単語を検出する（レガシー版、後方互換性のため保持）
 */
export async function detectWords(denops: Denops): Promise<Word[]> {
  console.warn("[DEPRECATED] detectWords: Use detectWordsWithManager for enhanced capabilities");

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
      words.push({
        text: match[0],
        line: line,
        col: match.index + 1, // Vimの列番号は1から始まる
      });
    }
  }

  return words;
}

/**
 * Process 50 Sub7: 新しい単語検出マネージャーを使用した高機能版検出
 */
export async function detectWordsWithManager(
  denops: Denops,
  config: EnhancedWordConfig = {}
): Promise<WordDetectionResult> {
  try {
    const manager = getWordDetectionManager(config);
    return await manager.detectWordsFromBuffer(denops);
  } catch (error) {
    console.error("[detectWordsWithManager] Error:", error);

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
      }
    };
  }
}

/**
 * Process 50 Sub3: 設定に基づいて画面内の単語を検出する（統合版）
 */
export async function detectWordsWithConfig(denops: Denops, config: WordConfig = {}): Promise<Word[]> {
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
 */
async function detectWordsStandard(denops: Denops, topLine: number, bottomLine: number): Promise<Word[]> {
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
 */
async function detectWordsOptimizedForLargeFiles(denops: Denops, topLine: number, bottomLine: number): Promise<Word[]> {
  const words: Word[] = [];
  const batchSize = 100; // バッチサイズ
  
  console.log(`[hellshake-yano] Large file detected, using optimized batch processing (${topLine}-${bottomLine})`);
  
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
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    } catch (error) {
      console.error(`[hellshake-yano] Error processing batch ${startLine}-${endLine}:`, error);
      // エラーが発生したバッチはスキップして続行
      continue;
    }
  }
  
  return words;
}

/**
 * 1行から単語を抽出（オリジナル版 - 既存テスト用）
 */
function extractWordsFromLineOriginal(lineText: string, lineNumber: number): Word[] {
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
    words.push({
      text: match.text,
      line: lineNumber,
      col: match.index + 1, // Vimの列番号は1から始まる
    });
  }

  return words;
}

/**
 * 1行から単語を抽出（改善版 - Process50 Sub6対応）
 */
export function extractWordsFromLine(lineText: string, lineNumber: number, useImprovedDetection = false, excludeJapanese = false): Word[] {
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
    ? /[a-zA-Z0-9]+/g  // 日本語を除外（英数字のみ）
    : /[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]+/g;  // 日本語を含む
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
    if (text.includes('-') && /^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)+$/.test(text)) {
      const parts = text.split('-');
      let currentIndex = baseIndex;

      for (const part of parts) {
        if (part.length >= 1) {
          splitMatches.push({ text: part, index: currentIndex });
        }
        currentIndex += part.length + 1; // +1 for the hyphen
      }
    }
    // snake_case の分割 (例: "snake_case_word" -> ["snake", "case", "word"])
    else if (text.includes('_') && /^[a-zA-Z0-9]+(_[a-zA-Z0-9]+)+$/.test(text)) {
      const parts = text.split('_');
      let currentIndex = baseIndex;

      for (const part of parts) {
        if (part.length >= 1) {
          splitMatches.push({ text: part, index: currentIndex });
        }
        currentIndex += part.length + 1; // +1 for the underscore
      }
    }
    // 日本語の単語境界分割（文字の種別による分割）
    // excludeJapanese が true の場合はこの処理をスキップ
    else if (!excludeJapanese && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text) && text.length > 4) {
      // 日本語長文を単語境界で分割（閾値を6から4に変更）
      const japaneseWordRegex = /[\u4E00-\u9FAF\u3400-\u4DBF]+|[\u3040-\u309F]+|[\u30A0-\u30FF]+|[a-zA-Z0-9]+/g;
      let jpMatch;
      japaneseWordRegex.lastIndex = 0;

      while ((jpMatch = japaneseWordRegex.exec(text)) !== null) {
        if (jpMatch[0].length >= 1) {
          splitMatches.push({
            text: jpMatch[0],
            index: baseIndex + jpMatch.index
          });
        }
      }
    }
    // 通常の単語はそのまま追加
    else {
      splitMatches.push(originalMatch);
    }
  }

  // 3. 数字のみの単語を別途検出
  const numberRegex = /\b\d+\b/g;
  let numberMatch: RegExpExecArray | null;
  while ((numberMatch = numberRegex.exec(lineText)) !== null) {
    // 既存のマッチと重複していないかチェック
    const isAlreadyMatched = splitMatches.some(existing =>
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
    const isAlreadyMatched = splitMatches.some(existing =>
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
    const isAlreadyMatched = splitMatches.some(existing =>
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
    words.push({
      text: match.text,
      line: lineNumber,
      col: match.index + 1, // Vimの列番号は1から始まる
    });
  }

  return words;
}

/**
 * Process 50 Sub3: 設定に基づいて1行から単語を抽出（統合版）
 */
export function extractWordsFromLineWithConfig(
  lineText: string,
  lineNumber: number,
  config: WordConfig = {}
): Word[] {
  // 常に改善版を使用し、use_japanese設定に基づいてexcludeJapaneseを決定
  const excludeJapanese = config.use_japanese !== true;
  return extractWordsFromLine(lineText, lineNumber, true, excludeJapanese);
}

/**
 * 特定範囲の単語を検出（パフォーマンステスト用）
 */
export async function detectWordsInRange(
  denops: Denops,
  startLine: number,
  endLine: number,
  maxWords?: number
): Promise<Word[]> {
  try {
    const words: Word[] = [];
    const effectiveMaxWords = maxWords || MAX_WORDS_PER_FILE;
    
    // 範囲の検証
    const actualEndLine = Math.min(endLine, await denops.call("line", "$") as number);
    const actualStartLine = Math.max(1, startLine);
    
    console.log(`[hellshake-yano] Detecting words in range ${actualStartLine}-${actualEndLine} (max: ${effectiveMaxWords})`);
    
    for (let line = actualStartLine; line <= actualEndLine; line++) {
      if (words.length >= effectiveMaxWords) {
        console.log(`[hellshake-yano] Reached maximum word limit (${effectiveMaxWords})`);
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
    console.error("[hellshake-yano] Error in detectWordsInRange:", error);
    return [];
  }
}

/**
 * 単語検出キャッシュをクリア
 */
export function clearWordDetectionCache(): void {
  wordDetectionCache.clear();
  console.log("[hellshake-yano] Word detection cache cleared");
}

/**
 * キャッシュの統計情報を取得
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
