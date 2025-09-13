import type { Word } from "./word.ts";

// Process 50 Sub3: ヒント表示位置の型定義
export interface HintPosition {
  line: number;
  col: number;
  display_mode: "before" | "after" | "overlay";
}

// 座標系対応版のヒント表示位置型定義
export interface HintPositionWithCoordinateSystem {
  line: number;
  col: number;
  display_mode: "before" | "after" | "overlay";
  // Vim座標系（1ベース）とNeovim extmark座標系（0ベース）の両方を提供
  vim_col: number;      // 1ベース（Vim matchadd用）
  nvim_col: number;     // 0ベース（Neovim extmark用）
  vim_line: number;     // 1ベース（Vim matchadd用）
  nvim_line: number;    // 0ベース（Neovim extmark用）
}

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
    if (firstKey !== undefined) {
      hintCache.delete(firstKey);
    }
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
    if (firstKey !== undefined) {
      assignmentCache.delete(firstKey);
    }
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

/**
 * Process 50 Sub3: ヒント表示位置を計算する
 * マークは単語の先頭に表示する
 */
export function calculateHintPosition(
  word: Word,
  hintPosition: string
): HintPosition {
  let col: number;
  let display_mode: "before" | "after" | "overlay";

  // デバッグログ追加（パフォーマンスのためコメントアウト）
  // console.log(`[calculateHintPosition] word: "${word.text}", col: ${word.col}, hintPosition: ${hintPosition}`);

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
 *
 * @param word 単語情報（1ベース座標で提供されることを前提）
 * @param hintPosition ヒント位置設定
 * @returns Vim/Neovim両方の座標系に対応した位置情報
 */
export function calculateHintPositionWithCoordinateSystem(
  word: Word,
  hintPosition: string,
  enableDebug: boolean = false
): HintPositionWithCoordinateSystem {
  let col: number;
  let display_mode: "before" | "after" | "overlay";

  // デバッグログ追加
  if (enableDebug) {
    console.log(`[calculateHintPositionWithCoordinateSystem] word: "${word.text}", col: ${word.col}, line: ${word.line}, hintPosition: ${hintPosition}`);
  }

  switch (hintPosition) {
    case "start":
      col = word.col; // 1ベース
      display_mode = "before";
      break;
    case "end":
      col = word.col + word.text.length - 1; // 1ベース
      display_mode = "after";
      break;
    case "overlay":
      col = word.col; // 1ベース
      display_mode = "overlay";
      break;
    default:
      // 無効な設定の場合はデフォルトで "start" 動作
      col = word.col; // 1ベース
      display_mode = "before";
      break;
  }

  // 座標系変換
  const vim_line = word.line;        // Vim: 1ベース行番号
  const nvim_line = word.line - 1;   // Neovim: 0ベース行番号
  const vim_col = col;               // Vim: 1ベース列番号
  const nvim_col = Math.max(0, col - 1); // Neovim: 0ベース列番号（負の値を防ぐ）

  if (enableDebug) {
    console.log(`[calculateHintPositionWithCoordinateSystem] calculated - vim(${vim_line},${vim_col}) nvim(${nvim_line},${nvim_col})`);
  }

  return {
    line: word.line,     // 後方互換性のため
    col: col,            // 後方互換性のため
    display_mode: display_mode,
    vim_col,
    nvim_col,
    vim_line,
    nvim_line,
  };
}

/**
 * Process 50 Sub2: ヒントキー設定インターフェース
 * 1文字ヒントと2文字以上ヒントで使用するキーを個別に設定
 */
export interface HintKeyConfig {
  // 1文字ヒント専用キー（例: ["A","S","D","F","G","H","J","K","L",";"]）
  single_char_keys?: string[];

  // 2文字以上ヒント専用キー（例: ["Q","W","E","R","T","Y","U","I","O","P"]）
  multi_char_keys?: string[];

  // 従来のmarkers（後方互換性のため維持）
  markers?: string[];

  // 1文字ヒントの最大数（この数を超えたら2文字ヒントを使用）
  max_single_char_hints?: number;

  // カーソルからの距離で1文字/2文字を決定するか
  use_distance_priority?: boolean;
}

/**
 * キーグループを使用したヒント生成
 * 1文字ヒント用と2文字以上ヒント用のキーを分けて管理
 */
export function generateHintsWithGroups(
  wordCount: number,
  config: HintKeyConfig
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
 */
function generateSingleCharHints(keys: string[], count: number): string[] {
  return keys.slice(0, count);
}

/**
 * 指定されたキーから複数文字ヒントを生成（2桁数字フォールバック付き）
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

  // 2桁数字ヒント（00-99）- アルファベット使い切り後のフォールバック
  if (generated < count) {
    const remainingCount = count - generated;
    const maxNumbers = Math.min(remainingCount, 100); // 最大100個の数字ヒント

    for (let i = 0; i < maxNumbers; i++) {
      hints.push(i.toString().padStart(2, '0')); // 00, 01, 02, ..., 99
      generated++;
    }
  }

  // 3文字の組み合わせ（数字でも足りない場合のみ）
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
 */
export function validateHintKeyConfig(config: HintKeyConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 1文字キーの検証
  if (config.single_char_keys) {
    const invalidSingle = config.single_char_keys.filter(k => k.length !== 1);
    if (invalidSingle.length > 0) {
      errors.push(`Invalid single char keys: ${invalidSingle.join(", ")}`);
    }
  }

  // 2文字キーの検証（実際は1文字である必要がある）
  if (config.multi_char_keys) {
    const invalidMulti = config.multi_char_keys.filter(k => k.length !== 1);
    if (invalidMulti.length > 0) {
      errors.push(`Multi char keys must be single characters: ${invalidMulti.join(", ")}`);
    }
  }

  // 重複チェック
  if (config.single_char_keys && config.multi_char_keys) {
    const overlap = config.single_char_keys.filter(k =>
      config.multi_char_keys!.includes(k)
    );
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
    errors
  };
}