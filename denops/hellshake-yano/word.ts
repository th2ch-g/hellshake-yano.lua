import type { Denops } from "@denops/std";

export interface Word {
  text: string;
  line: number;
  col: number;
}

/**
 * 画面内の単語を検出する
 */
export async function detectWords(denops: Denops): Promise<Word[]> {
  const words: Word[] = [];

  // 画面の表示範囲を取得
  const topLine = await denops.call("line", "w0") as number;
  const bottomLine = await denops.call("line", "w$") as number;

  // 各行から単語を検出
  for (let line = topLine; line <= bottomLine; line++) {
    const lineText = await denops.call("getline", line) as string;

    // 単語を検出（\b\w+\b パターン）
    const wordRegex = /\b\w+\b/g;
    let match;

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
 * 標準的な単語検出
 */
async function detectWordsStandard(denops: Denops, topLine: number, bottomLine: number): Promise<Word[]> {
  const words: Word[] = [];
  
  // 各行から単語を検出
  for (let line = topLine; line <= bottomLine; line++) {
    const lineText = await denops.call("getline", line) as string;
    const lineWords = extractWordsFromLine(lineText, line);
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
        const lineWords = extractWordsFromLine(lineText, actualLine);
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
 * 1行から単語を抽出（最適化版）
 */
function extractWordsFromLine(lineText: string, lineNumber: number): Word[] {
  const words: Word[] = [];
  
  // 空行や短すぎる行はスキップ
  if (!lineText || lineText.trim().length < 2) {
    return words;
  }
  
  // 最適化された正規表現（ユニコード対応）
  const wordRegex = /[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]+/g;
  let match;
  
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
      const lineWords = extractWordsFromLine(lineText, line);
      
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
