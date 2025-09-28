/**
 * 表示幅計算ユーティリティ
 *
 * テキストの表示幅を正確に計算する高性能な関数群を提供。以下の文字種を考慮：
 * - ASCII文字（幅1）
 * - タブ文字（設定可能、デフォルトは8）
 * - 日本語・全角文字（幅2）
 * - 絵文字と特殊文字（幅2）
 * - Unicode ZWJシーケンスと書記素クラスター
 * - パフォーマンス最適化のためのキャッシュ機能
 *
 * hellshake-yano.vimの隣接ヒント検出問題を修正するための
 * 正確な表示幅計算実装です。
 *
 * @module display
 * @version 1.0.0
 */

import { LRUCache } from "../cache.ts";
import { UnifiedCache, CacheType } from "../cache.ts";
import type { Denops } from "https://deno.land/x/denops_std@v5.0.1/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v5.0.1/function/mod.ts";

/**
 * 統一キャッシュから文字幅キャッシュのインスタンスを取得
 * 頻繁に使用される文字の幅をキャッシュして高速化
 */
const CHAR_WIDTH_CACHE = UnifiedCache.getInstance().getCache<number, number>(CacheType.CHAR_WIDTH);

/**
 * ASCII文字のキャッシュを初期化する関数
 * テスト時のキャッシュクリア後も再初期化できるように関数化
 */
function initializeASCIICache(): void {
  for (let i = 0x20; i <= 0x7E; i++) {
    if (CHAR_WIDTH_CACHE.get(i) === undefined) {
      CHAR_WIDTH_CACHE.set(i, 1);
    }
  }
}

// モジュール初期化時にASCII文字をキャッシュ
initializeASCIICache();

/**
 * 一般的なCJK文字の範囲キャッシュ
 * 日本語、中国語、韓国語文字の高速検索のための範囲テーブル
 */
const CJK_RANGES = [
  [0x3000, 0x303F], // CJK記号と句読点
  [0x3040, 0x309F], // ひらがな
  [0x30A0, 0x30FF], // カタカナ
  [0x4E00, 0x9FFF], // CJK統合漢字
  [0xFF00, 0xFFEF], // 半角・全角形式
] as const;

/**
 * 一般的な絵文字範囲の高速検索テーブル
 * 頻繁に使用される絵文字範囲を高速検索できるよう管理
 */
const EMOJI_RANGES = [
  [0x1F600, 0x1F64F], // 顔文字
  [0x1F300, 0x1F5FF], // その他の記号と絵文字
  [0x1F680, 0x1F6FF], // 交通・地図記号
  [0x1F1E6, 0x1F1FF], // 地域表示記号
] as const;

/**
 * 最適化された単一文字の表示幅計算
 *
 * 高性能な文字幅計算を提供。キャッシュ機構により頻繁にアクセスされる文字の
 * 計算を高速化し、ASCII、CJK、絵文字、タブ文字に対応。
 *
 * @param char - 単一文字または文字列（複数の場合は最初の文字を使用）
 * @param tabWidth - タブ文字の表示幅（デフォルト: 8）
 * @returns 文字の表示幅
 *
 * @example
 * ```typescript
 * getCharDisplayWidth('a')     // 1を返す（ASCII文字）
 * getCharDisplayWidth('\t')    // 8を返す（デフォルトタブ幅）
 * getCharDisplayWidth('\t', 4) // 4を返す（カスタムタブ幅）
 * getCharDisplayWidth('あ')    // 2を返す（日本語文字）
 * getCharDisplayWidth('😀')    // 2を返す（絵文字）
 * ```
 */
export function getCharDisplayWidth(char: string, tabWidth = 8): number {
  // null/undefined/空文字の処理
  if (!char || char.length === 0) {
    return 0;
  }

  // 最初のコードポイントを取得（サロゲートペアを正しく処理）
  const codePoint = char.codePointAt(0);

  if (codePoint === undefined) {
    return 0;
  }

  // パフォーマンス向上のためキャッシュを最初にチェック
  if (tabWidth === 8) { // デフォルトタブ幅のみキャッシュ
    const cached = CHAR_WIDTH_CACHE.get(codePoint);
    if (cached !== undefined) {
      return cached;
    }
  }

  const width = calculateCharWidth(codePoint, tabWidth);

  // 今後の参照用に結果をキャッシュ（デフォルトタブ幅のみ）
  if (tabWidth === 8 && width !== tabWidth) { // タブ文字はキャッシュしない
    CHAR_WIDTH_CACHE.set(codePoint, width);
  }

  return width;
}

/**
 * キャッシュを使用せずに文字幅を計算する内部関数
 * @param codePoint Unicodeコードポイント
 * @param tabWidth タブ文字の幅
 * @returns 表示幅
 */
function calculateCharWidth(codePoint: number, tabWidth: number): number {
  // タブ文字
  if (codePoint === 0x09) {
    return tabWidth;
  }

  // ASCII印刷可能文字（0x20-0x7E）- 高速パス
  if (codePoint >= 0x20 && codePoint <= 0x7E) {
    return 1;
  }

  // 制御文字
  if (codePoint < 0x20 || (codePoint >= 0x7F && codePoint < 0xA0)) {
    return 0;
  }

  // Latin-1補助数学記号を最初にチェック
  if (isLatinMathSymbol(codePoint)) {
    return 2;
  }

  // 単純なASCII範囲（既にチェック済みの数学記号を除く）
  if (codePoint < 0x100) {
    return 1;
  }

  // 一般的な範囲の高速参照
  // CJK範囲（最適化済み）
  if (isInCJKRange(codePoint) || isInEmojiRange(codePoint)) {
    return 2;
  }

  // 完全性のための拡張範囲
  if (isInExtendedWideRange(codePoint)) {
    return 2;
  }

  // その他の文字はデフォルトで幅1
  return 1;
}

/**
 * 最適化された範囲を使用したCJK文字の高速チェック
 * @param codePoint Unicodeコードポイント
 * @returns CJK文字の場合true
 */
function isInCJKRange(codePoint: number): boolean {
  for (const [start, end] of CJK_RANGES) {
    if (codePoint >= start && codePoint <= end) {
      return true;
    }
  }

  // 追加のCJK範囲
  return (
    (codePoint >= 0x1100 && codePoint <= 0x115F) || // ハングル字母
    (codePoint >= 0x2E80 && codePoint <= 0x2EFF) || // CJK部首補助
    (codePoint >= 0x2F00 && codePoint <= 0x2FDF) || // 康熙部首
    (codePoint >= 0x3100 && codePoint <= 0x312F) || // 注音字母
    (codePoint >= 0x3130 && codePoint <= 0x318F) || // ハングル互換字母
    (codePoint >= 0x3200 && codePoint <= 0x33FF) || // 囲みCJK文字・月 + CJK互換
    (codePoint >= 0x3400 && codePoint <= 0x4DBF) || // CJK拡張A
    (codePoint >= 0xAC00 && codePoint <= 0xD7AF) || // ハングル音節
    (codePoint >= 0xF900 && codePoint <= 0xFAFF)    // CJK互換漢字
  );
}

/**
 * 絵文字範囲の高速チェッカー
 * @param codePoint Unicodeコードポイント
 * @returns 絵文字の場合true
 */
function isInEmojiRange(codePoint: number): boolean {
  for (const [start, end] of EMOJI_RANGES) {
    if (codePoint >= start && codePoint <= end) {
      return true;
    }
  }

  return (
    (codePoint >= 0x1F000 && codePoint <= 0x1F0FF) || // 麻雀/ドミノ/トランプ
    (codePoint >= 0x1F100 && codePoint <= 0x1F2FF) || // 囲み英数字/表意文字補助
    (codePoint >= 0x1F700 && codePoint <= 0x1F9FF) || // 拡張絵文字範囲
    (codePoint >= 0x1FA00 && codePoint <= 0x1FAFF)    // チェス記号 + 拡張絵記号
  );
}

/**
 * 拡張全角文字範囲チェッカー（矢印、記号など）
 * @param codePoint Unicodeコードポイント
 * @returns 幅が2の文字の場合true
 */
function isInExtendedWideRange(codePoint: number): boolean {
  return (
    // Latin-1補助数学記号（× ÷ など）
    isLatinMathSymbol(codePoint) ||
    (codePoint >= 0x2190 && codePoint <= 0x21FF) || // 矢印
    (codePoint >= 0x2460 && codePoint <= 0x24FF) || // 囲み英数字（④ など）
    (codePoint >= 0x2500 && codePoint <= 0x25FF) || // 罫線素片（□ など）
    (codePoint >= 0x2600 && codePoint <= 0x26FF) || // その他の記号
    (codePoint >= 0x2700 && codePoint <= 0x27BF) || // 装飾記号
    (codePoint >= 0xFE10 && codePoint <= 0xFE1F) || // 縦書き形式
    (codePoint >= 0xFE30 && codePoint <= 0xFE6F)    // CJK互換形式 + 小字形バリエーション
  );
}

/**
 * 幅が2であるべきLatin-1補助数学記号かチェック
 * @param codePoint Unicodeコードポイント
 * @returns 数学記号の場合true
 */
function isLatinMathSymbol(codePoint: number): boolean {
  return (
    codePoint === 0x00D7 || // × (multiplication sign)
    codePoint === 0x00F7    // ÷ (division sign)
  );
}

/**
 * Calculate display width of a text string with optimal performance
 *
 * Handles complex Unicode scenarios including:
 * - ZWJ (Zero Width Joiner) sequences (emoji combinations)
 * - Grapheme clusters (combining characters)
 * - Surrogate pairs (high Unicode code points)
 * - Tab characters with configurable width
 * - CJK and emoji characters
 *
 * @param text - Text to calculate width for
 * @param tabWidth - Width of tab character (default: 8)
 * @returns Total display width of the text
 *
 * @example
 * ```typescript
 * getDisplayWidth("hello")           // 5を返す
 * getDisplayWidth("hello\tworld")    // 18を返す（5+8+5）
 * getDisplayWidth("こんにちは")       // 10を返す（2×5）
 * getDisplayWidth("👨‍👩‍👧‍👦")       // 2を返す（ZWJシーケンス）
 * getDisplayWidth("🇯🇵")              // 2を返す（国旗）
 * ```
 */
export function getDisplayWidth(text: string, tabWidth = 8): number {
  // null/undefinedの処理
  if (text == null) {
    return 0;
  }

  // 空文字列の処理
  if (text.length === 0) {
    return 0;
  }

  let totalWidth = 0;

  // 潜在的な不正なUTF-8を適切に処理
  try {
    // 適切な書記素クラスター処理のためIntl.Segmenterを使用（絵文字ZWJシーケンス）
    let segmenter: Intl.Segmenter;
    try {
      segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    } catch (e) {
      // Intl.Segmenterが利用できない場合はより単純な反復処理にフォールバック
      return getDisplayWidthFallback(text, tabWidth);
    }

    for (const segment of segmenter.segment(text)) {
      const cluster = segment.segment;

      // 書記素クラスター（ZWJシーケンスなど）は単一単位として処理
      if (cluster.length === 1) {
        totalWidth += getCharDisplayWidth(cluster, tabWidth);
      } else {
        // 複数文字クラスター（絵文字ZWJシーケンス、結合文字など）
        // ZWJシーケンスまたは他の絵文字クラスターかチェック
        const hasZWJ = cluster.includes('\u200D'); // ゼロ幅接合子
        const hasEmojiModifier = /[\u{1F3FB}-\u{1F3FF}]/u.test(cluster); // 肌色修飾子
        const hasVariationSelector = /[\uFE0E\uFE0F]/u.test(cluster); // 異体字セレクタ

        if (hasZWJ || hasEmojiModifier || hasVariationSelector || isEmojiSequence(cluster)) {
          // シーケンス全体を幅2として処理（単一絵文字表示）
          totalWidth += 2;
        } else {
          // その他のクラスターは個々の文字幅を合計
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
    // エラーの場合のフォールバック：単純な実装を使用
    return getDisplayWidthFallback(text, tabWidth);
  }

  return totalWidth;
}

/**
 * Intl.Segmenterを使用しないフォールバック実装
 * @param text 表示幅を計算するテキスト
 * @param tabWidth タブ文字の幅
 * @returns 総表示幅
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

    // 次のコードポイントに移動（サロゲートペアの場合は2文字）
    i += codePoint > 0xFFFF ? 2 : 1;
  }

  return totalWidth;
}

/**
 * 文字列が絵文字シーケンスを含んでいるかチェック
 * @param text チェックする文字列
 * @returns 絵文字シーケンスが含まれている場合true
 */
function isEmojiSequence(text: string): boolean {
  // 一般的な絵文字パターンをチェック
  return /[\u{1F1E6}-\u{1F1FF}]{2}/u.test(text) || // 地域表示記号（国旗）
         /[\u{1F600}-\u{1F64F}]/u.test(text) ||    // 顔文字
         /[\u{1F300}-\u{1F5FF}]/u.test(text) ||    // その他記号
         /[\u{1F680}-\u{1F6FF}]/u.test(text) ||    // 交通記号
         /[\u{1F900}-\u{1F9FF}]/u.test(text);      // 補助記号
}

/**
 * Create a cache for display width calculations
 *
 * @param maxSize - Maximum number of entries in cache (default: 1000)
 * @returns LRUCache instance for caching display width calculations
 */
export function createDisplayWidthCache(maxSize = 1000): LRUCache<string, number> {
  return new LRUCache<string, number>(maxSize);
}

/**
 * Get display width using Vim's strdisplaywidth() function
 * Falls back to TypeScript implementation if Vim is not available
 *
 * @param denops - Denops instance for Vim integration
 * @param text - Text to calculate width for
 * @returns Promise resolving to display width
 *
 * @example
 * ```typescript
 * const width = await getVimDisplayWidth(denops, "hello\tworld");
 * console.log(width); // Vimのネイティブ計算またはフォールバックを使用
 * ```
 */
export async function getVimDisplayWidth(denops: Denops, text: string): Promise<number> {
  try {
    // Vimのネイティブ関数を使用を試行
    const width = await fn.strdisplaywidth(denops, text);
    return typeof width === "number" ? width : 0;
  } catch (error) {
    // TypeScript実装にフォールバック
    return getDisplayWidth(text);
  }
}

/**
 * 一般的な文字列のグローバルキャッシュ
 * 頻繁に計算される文字列の表示幅をキャッシュ
 */
const globalDisplayWidthCache = createDisplayWidthCache(2000);

/**
 * Cached version of getDisplayWidth for improved performance
 * Use this for repeated calculations of the same strings
 *
 * @param text - Text to calculate width for
 * @param tabWidth - Width of tab character (default: 8)
 * @returns Total display width of the text (cached result if available)
 *
 * @example
 * ```typescript
 * // 最初の呼び出しは計算してキャッシュ
 * const width1 = getDisplayWidthCached("hello\tworld");
 * // 2回目の呼び出しはキャッシュされた結果を返す（大幅に高速）
 * const width2 = getDisplayWidthCached("hello\tworld");
 * ```
 */
export function getDisplayWidthCached(text: string, tabWidth = 8): number {
  if (text == null || text.length === 0) {
    return 0;
  }

  const cacheKey = `${text}_${tabWidth}`;
  const cached = globalDisplayWidthCache.get(cacheKey);

  if (cached !== undefined) {
    return cached;
  }

  const width = getDisplayWidth(text, tabWidth);
  globalDisplayWidthCache.set(cacheKey, width);

  return width;
}

/**
 * Clear the global display width cache
 * Useful for memory management or when cache becomes stale
 *
 * @example
 * ```typescript
 * clearDisplayWidthCache();
 * ```
 */
export function clearDisplayWidthCache(): void {
  globalDisplayWidthCache.clear();
  CHAR_WIDTH_CACHE.clear();

  // ASCII文字キャッシュを再初期化
  for (let i = 0x20; i <= 0x7E; i++) {
    CHAR_WIDTH_CACHE.set(i, 1);
  }
}

/**
 * 性能監視用キャッシュ統計の取得
 *
 * 文字列キャッシュと文字キャッシュの統計情報を提供。
 * キャッシュヒット率やサイズを監視して性能調整に活用。
 *
 * @returns キャッシュヒット/ミス統計を含むオブジェクト
 *
 * @example
 * ```typescript
 * const stats = getDisplayWidthCacheStats();
 * console.log(`ヒット率: ${stats.stringCache.hitRate * 100}%`);
 * console.log(`文字キャッシュサイズ: ${stats.charCacheSize}`);
 * ```
 */
export function getDisplayWidthCacheStats() {
  return {
    stringCache: globalDisplayWidthCache.getStats(),
    charCacheSize: CHAR_WIDTH_CACHE.size,
  };
}

/**
 * テキストに全角文字が含まれているかをチェックするユーティリティ関数
 *
 * コストの高い幅計算の前の高速スクリーニングに有用。
 * ASCII文字のみのテキストを素早く識別し、最適化されたパスを選択可能。
 *
 * hellshake-yano.vimでの性能最適化において、日本語やCJK文字、絵文字が
 * 含まれていない場合の高速処理パスの判定に使用。
 *
 * @param text - チェックするテキスト
 * @returns 幅が1より大きい文字が含まれている場合true
 *
 * @example
 * ```typescript
 * hasWideCharacters("hello")     // false（ASCII文字のみ）
 * hasWideCharacters("こんにちは") // true（日本語文字）
 * hasWideCharacters("hello😀")   // true（絵文字含む）
 * ```
 */
export function hasWideCharacters(text: string): boolean {
  if (!text || text.length === 0) {
    return false;
  }

  for (let i = 0; i < text.length;) {
    const codePoint = text.codePointAt(i);
    if (codePoint === undefined) {
      i++;
      continue;
    }

    if (codePoint >= 0x1100 && (
      isInCJKRange(codePoint) ||
      isInEmojiRange(codePoint) ||
      isInExtendedWideRange(codePoint)
    )) {
      return true;
    }

    i += codePoint > 0xFFFF ? 2 : 1;
  }

  return false;
}