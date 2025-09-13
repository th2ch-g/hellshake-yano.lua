import type { Word } from "./word.ts";

// パフォーマンス最適化用のキャッシュ
let hintCache = new Map<string, string[]>();
let assignmentCache = new Map<string, HintMapping[]>();
const CACHE_MAX_SIZE = 100; // キャッシュの最大サイズ

export interface HintMapping {
  word: Word;
  hint: string;
}

/**
 * 指定数のヒントを生成する（最適化版）
 */
export function generateHints(wordCount: number, markers?: string[], maxHints?: number): string[] {
  const defaultMarkers = markers || "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  
  // ヒント数制限を適用
  const effectiveWordCount = maxHints ? Math.min(wordCount, maxHints) : wordCount;
  
  if (effectiveWordCount <= 0) {
    return [];
  }
  
  // キャッシュキーを生成
  const cacheKey = `${effectiveWordCount}-${defaultMarkers.join('')}`;
  
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
    hintCache.delete(firstKey);
  }
  hintCache.set(cacheKey, hints);
  
  return hints;
}

/**
 * 単語にヒントを割り当てる（最適化版）
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
  const cacheKey = `${words.length}-${cursorLine}-${cursorCol}-${words.map(w => `${w.line},${w.col}`).join(';')}`;
  
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
    assignmentCache.delete(firstKey);
  }
  assignmentCache.set(cacheKey, mappings);
  
  return mappings;
}

/**
 * 複数文字ヒントを最適化して生成
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
 */
function sortWordsByDistanceOptimized(words: Word[], cursorLine: number, cursorCol: number): Word[] {
  // 大量の単語がある場合はバッチ処理でソート
  if (words.length > 1000) {
    return sortWordsInBatches(words, cursorLine, cursorCol);
  }
  
  // 通常のソート処理
  const wordsWithDistance = words.map(word => {
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
  
  return wordsWithDistance.map(item => item.word);
}

/**
 * 大量の単語をバッチ処理でソート
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
 * ソート済みバッチをマージ
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
  assignmentCache.clear();
  console.log("[hellshake-yano] Hint cache cleared");
}

/**
 * キャッシュの統計情報を取得
 */
export function getHintCacheStats(): { hintCacheSize: number; assignmentCacheSize: number } {
  return {
    hintCacheSize: hintCache.size,
    assignmentCacheSize: assignmentCache.size,
  };
}