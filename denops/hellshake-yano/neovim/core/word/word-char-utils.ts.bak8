/**
 * word-char-utils.ts
 * 文字種判定ユーティリティ
 *
 * Unicode範囲に基づいた文字種別の判定と解析を提供します。
 * キャッシュを使用してパフォーマンスを最適化しています。
 */

import { CacheType, GlobalCache } from "../cache.ts";

/**
 * 文字種別を表すenum
 */
export enum CharType {
  /** ひらがな文字 (U+3040-U+309F) */
  Hiragana = "hiragana",
  /** カタカナ文字 (U+30A0-U+30FF) */
  Katakana = "katakana",
  /** 漢字 (CJK統合漢字：U+4E00-U+9FFF) */
  Kanji = "kanji",
  /** 英数字 (ASCII 0-9, A-Z, a-z) */
  Alphanumeric = "alphanumeric",
  /** 記号類 (各種記号文字) */
  Symbol = "symbol",
  /** 空白文字 (半角・全角スペース、タブ等) */
  Space = "space",
  /** その他の文字 */
  Other = "other"
}

/**
 * 隣接文字解析結果を表すインターフェース
 */
export interface AdjacentAnalysis {
  /** この範囲の文字種 */
  type: CharType;
  /** 範囲の開始位置（0ベース） */
  start: number;
  /** 範囲の終了位置（exclusive、0ベース） */
  end: number;
  /** 範囲内の実際のテキスト */
  text: string;
}

/**
 * パフォーマンス最適化: 文字種判定キャッシュ
 */
const charTypeCache = GlobalCache.getInstance().getCache<string, CharType>(CacheType.CHAR_TYPE);

/**
 * 単一文字の種類を判定する（キャッシュ付き）
 *
 * Unicode範囲に基づいて文字種を判定します。
 * 頻繁に使用される文字はキャッシュされ、高速な判定が可能です。
 *
 * @param char - 判定する文字（1文字）
 * @returns 判定された文字種
 *
 * @example
 * ```ts
 * getCharType("あ") // CharType.Hiragana
 * getCharType("ア") // CharType.Katakana
 * getCharType("漢") // CharType.Kanji
 * getCharType("a")  // CharType.Alphanumeric
 * ```
 */
export function getCharType(char: string): CharType {
  if (!char || char.length === 0) {
    return CharType.Other;
  }

  // キャッシュから取得を試行
  const cached = charTypeCache.get(char);
  if (cached !== undefined) {
    return cached;
  }

  // 統一キャッシュシステムが自動的にLRUアルゴリズムでサイズ制限を管理

  const code = char.codePointAt(0);
  if (code === undefined) {
    charTypeCache.set(char, CharType.Other);
    return CharType.Other;
  }

  let result: CharType;

  // Unicode範囲による文字種判定
  // スペース文字（半角・全角スペース、タブ、改行文字）
  if (char === ' ' || char === '　' || char === '\t' || char === '\n' || char === '\r') {
    result = CharType.Space;
  }
  // ひらがな文字（あいうえお等、U+3040-U+309F）
  else if (code >= 0x3040 && code <= 0x309F) {
    result = CharType.Hiragana;
  }
  // カタカナ文字（アイウエオ等、U+30A0-U+30FF）
  else if (code >= 0x30A0 && code <= 0x30FF) {
    result = CharType.Katakana;
  }
  // CJK統合漢字（日中韓の漢字、U+4E00-U+9FFF）
  else if (code >= 0x4E00 && code <= 0x9FFF) {
    result = CharType.Kanji;
  }
  // ASCII英数字（半角の0-9、A-Z、a-z）
  else if ((code >= 0x0030 && code <= 0x0039) || // 数字0-9
      (code >= 0x0041 && code <= 0x005A) || // 大文字A-Z
      (code >= 0x0061 && code <= 0x007A)) { // 小文字a-z
    result = CharType.Alphanumeric;
  }
  // 記号文字（句読点、算術記号、CJK記号、全角記号等）
  else if ((code >= 0x0020 && code <= 0x002F) || // ASCII記号 !"#$%&'()*+,-./
      (code >= 0x003A && code <= 0x0040) || // ASCII記号 :;<=>?@
      (code >= 0x005B && code <= 0x0060) || // ASCII記号 [\]^_`
      (code >= 0x007B && code <= 0x007E) || // ASCII記号 {|}~
      (code >= 0x3000 && code <= 0x303F) || // CJK記号及び句読点
      (code >= 0xFF00 && code <= 0xFFEF)) { // 全角英数字・記号
    result = CharType.Symbol;
  }
  // 上記以外の文字（特殊文字、絵文字等）
  else {
    result = CharType.Other;
  }

  // キャッシュに保存
  charTypeCache.set(char, result);
  return result;
}

/**
 * 文字列を文字種別に解析する
 *
 * 連続する同じ文字種の範囲をグループ化して返します。
 *
 * @param text - 解析する文字列
 * @returns 文字種別ごとにグループ化された範囲の配列
 *
 * @example
 * ```ts
 * analyzeString("Hello世界")
 * // [
 * //   { type: CharType.Alphanumeric, start: 0, end: 5, text: "Hello" },
 * //   { type: CharType.Kanji, start: 5, end: 7, text: "世界" }
 * // ]
 * ```
 */
export function analyzeString(text: string): AdjacentAnalysis[] {
  if (!text || text.length === 0) {
    return [];
  }

  const result: AdjacentAnalysis[] = [];
  let currentType = getCharType(text[0]);
  let start = 0;

  for (let i = 1; i <= text.length; i++) {
    const charType = i < text.length ? getCharType(text[i]) : null;

    if (charType !== currentType || i === text.length) {
      result.push({
        type: currentType,
        start: start,
        end: i,
        text: text.slice(start, i)
      });

      if (charType !== null) {
        currentType = charType;
        start = i;
      }
    }
  }

  return result;
}

/**
 * 文字種境界とCamelCase境界を検出する
 *
 * テキストを単語に分割するための境界位置を検出します。
 * 文字種の変化、CamelCaseパターン、記号の前後を境界として認識します。
 *
 * @param text - 解析する文字列
 * @returns 境界位置のインデックス配列（昇順、重複なし）
 *
 * @example
 * ```ts
 * findBoundaries("camelCaseWord")
 * // [0, 5, 9, 13] - "camel", "Case", "Word"
 *
 * findBoundaries("hello-world")
 * // [0, 5, 6, 11] - "hello", "-", "world"
 * ```
 */
export function findBoundaries(text: string): number[] {
  if (!text || text.length === 0) {
    return [0];
  }

  const boundaries = new Set<number>();
  boundaries.add(0); // 開始位置

  for (let i = 1; i < text.length; i++) {
    const prevChar = text[i - 1];
    const currentChar = text[i];
    const prevType = getCharType(prevChar);
    const currentType = getCharType(currentChar);

    // 文字種境界
    if (prevType !== currentType) {
      boundaries.add(i);
    }

    // CamelCase境界（小文字→大文字）
    if (prevType === CharType.Alphanumeric &&
        currentType === CharType.Alphanumeric &&
        prevChar >= 'a' && prevChar <= 'z' &&
        currentChar >= 'A' && currentChar <= 'Z') {
      boundaries.add(i);
    }

    // 記号境界（記号の前後で区切る）
    if (currentType === CharType.Symbol && prevType !== CharType.Symbol) {
      boundaries.add(i);
    }
    if (prevType === CharType.Symbol && currentType !== CharType.Symbol) {
      boundaries.add(i);
    }
  }

  boundaries.add(text.length); // 終了位置
  return Array.from(boundaries).sort((a, b) => a - b);
}

/**
 * パフォーマンス最適化: 日本語助詞の高速検索セット
 */
const particleSet = new Set(['の', 'が', 'を', 'に', 'で', 'と', 'は', 'も', 'から', 'まで', 'より']);

/**
 * パフォーマンス最適化: 接続詞の高速検索セット
 */
const connectorSet = new Set(['そして', 'また', 'しかし', 'だから', 'それで', 'ところで']);

/**
 * パフォーマンス最適化: 動詞語尾の高速検索セット
 */
const verbEndingSet = new Set(['する', 'され', 'でき', 'れる', 'られ']);

/**
 * 文字種に基づく結合判定（最適化版）
 *
 * 2つのセグメントを結合すべきかどうかを判定します。
 * 日本語の助詞、接続詞、動詞活用、複合語パターンを考慮します。
 *
 * @param prevSegment - 前のセグメント
 * @param currentSegment - 現在のセグメント
 * @param nextSegment - 次のセグメント（オプション）
 * @returns 結合すべき場合はtrue
 *
 * @example
 * ```ts
 * shouldMerge("勉強", "する")     // true - 動詞活用
 * shouldMerge("本", "を")         // true - 助詞
 * shouldMerge("コンピュータ", "システム") // true - カタカナ複合語
 * shouldMerge("hello", "world")  // false - 別々の単語
 * ```
 */
export function shouldMerge(
  prevSegment: string,
  currentSegment: string,
  nextSegment?: string
): boolean {
  // 日本語の助詞（は、が、を等）は前の単語と結合する
  if (particleSet.has(currentSegment)) {
    return true;
  }

  // 接続詞（そして、また等）は前の文と結合する
  if (connectorSet.has(currentSegment)) {
    return true;
  }

  // 文字種を取得して動詞活用と複合語を判定
  const prevType = prevSegment.length > 0 ? getCharType(prevSegment[prevSegment.length - 1]) : null;
  const currentType = currentSegment.length > 0 ? getCharType(currentSegment[0]) : null;

  // 動詞活用パターン（漢字の語幹＋ひらがなの活用語尾）
  if (prevType === CharType.Kanji && currentType === CharType.Hiragana) {
    // 「勉強する」「作成される」等の動詞活用を検出
    for (const ending of verbEndingSet) {
      if (currentSegment.startsWith(ending)) {
        return true;
      }
    }
  }

  // 複合語パターン（カタカナ同士の連結）
  // 例：「コンピュータ + システム」→「コンピュータシステム」
  if (prevType === CharType.Katakana && currentType === CharType.Katakana) {
    return true;
  }

  return false;
}

/**
 * キャッシュクリア（テスト時やメモリ使用量が気になる場合に使用）
 *
 * 文字種判定キャッシュをクリアします。
 * 通常は自動的にLRUで管理されるため、明示的な呼び出しは不要です。
 */
export function clearCharTypeCache(): void {
  charTypeCache.clear();
}

/**
 * 文字が特定の種類かどうかを判定するヘルパー関数
 */

/**
 * 文字がひらがなかどうかを判定
 */
export function isHiragana(char: string): boolean {
  return getCharType(char) === CharType.Hiragana;
}

/**
 * 文字がカタカナかどうかを判定
 */
export function isKatakana(char: string): boolean {
  return getCharType(char) === CharType.Katakana;
}

/**
 * 文字が漢字かどうかを判定
 */
export function isKanji(char: string): boolean {
  return getCharType(char) === CharType.Kanji;
}

/**
 * 文字が英数字かどうかを判定
 */
export function isAlphanumeric(char: string): boolean {
  return getCharType(char) === CharType.Alphanumeric;
}

/**
 * 文字が記号かどうかを判定
 */
export function isSymbol(char: string): boolean {
  return getCharType(char) === CharType.Symbol;
}

/**
 * 文字が空白かどうかを判定
 */
export function isSpace(char: string): boolean {
  return getCharType(char) === CharType.Space;
}

/**
 * 文字列が日本語を含むかどうかを判定
 */
export function containsJapanese(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const type = getCharType(text[i]);
    if (type === CharType.Hiragana || type === CharType.Katakana || type === CharType.Kanji) {
      return true;
    }
  }
  return false;
}

/**
 * 文字列がすべて日本語かどうかを判定
 */
export function isAllJapanese(text: string): boolean {
  if (!text || text.length === 0) {
    return false;
  }

  for (let i = 0; i < text.length; i++) {
    const type = getCharType(text[i]);
    if (type !== CharType.Hiragana &&
        type !== CharType.Katakana &&
        type !== CharType.Kanji &&
        type !== CharType.Space) {
      return false;
    }
  }
  return true;
}
