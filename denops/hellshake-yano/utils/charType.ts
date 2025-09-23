/**
 * 文字種判定ユーティリティ
 * Unicode範囲に基づく文字種の分類と境界検出を提供
 */

export enum CharType {
  Hiragana = "hiragana",
  Katakana = "katakana",
  Kanji = "kanji",
  Alphanumeric = "alphanumeric",
  Symbol = "symbol",
  Space = "space",
  Other = "other"
}

// パフォーマンス最適化: 文字種判定キャッシュ
const charTypeCache = new Map<string, CharType>();
const CACHE_SIZE_LIMIT = 1000;

export interface AdjacentAnalysis {
  type: CharType;
  start: number;
  end: number;
  text: string;
}

/**
 * 単一文字の種類を判定する（キャッシュ付き）
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

  // キャッシュサイズ制限チェック
  if (charTypeCache.size >= CACHE_SIZE_LIMIT) {
    // LRU的にキャッシュをクリア（古いエントリから削除）
    const firstKey = charTypeCache.keys().next().value;
    if (firstKey) {
      charTypeCache.delete(firstKey);
    }
  }

  const code = char.codePointAt(0);
  if (code === undefined) {
    charTypeCache.set(char, CharType.Other);
    return CharType.Other;
  }

  let result: CharType;

  // スペース文字（半角・全角・タブ）
  if (char === ' ' || char === '　' || char === '\t' || char === '\n' || char === '\r') {
    result = CharType.Space;
  }
  // ひらがな（U+3040-U+309F）
  else if (code >= 0x3040 && code <= 0x309F) {
    result = CharType.Hiragana;
  }
  // カタカナ（U+30A0-U+30FF）
  else if (code >= 0x30A0 && code <= 0x30FF) {
    result = CharType.Katakana;
  }
  // 漢字（CJK統合漢字：U+4E00-U+9FFF）
  else if (code >= 0x4E00 && code <= 0x9FFF) {
    result = CharType.Kanji;
  }
  // 英数字（ASCII英数字）
  else if ((code >= 0x0030 && code <= 0x0039) || // 0-9
      (code >= 0x0041 && code <= 0x005A) || // A-Z
      (code >= 0x0061 && code <= 0x007A)) { // a-z
    result = CharType.Alphanumeric;
  }
  // 記号類（その他ASCII記号、日本語記号等）
  else if ((code >= 0x0020 && code <= 0x002F) || // スペース～/
      (code >= 0x003A && code <= 0x0040) || // :～@
      (code >= 0x005B && code <= 0x0060) || // [～`
      (code >= 0x007B && code <= 0x007E) || // {～~
      (code >= 0x3000 && code <= 0x303F) || // CJK記号
      (code >= 0xFF00 && code <= 0xFFEF)) { // 全角英数・記号
    result = CharType.Symbol;
  }
  else {
    result = CharType.Other;
  }

  // キャッシュに保存
  charTypeCache.set(char, result);
  return result;
}

/**
 * 文字列を文字種別に解析する
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

// パフォーマンス最適化: パターンマッチングのセット
const particleSet = new Set(['の', 'が', 'を', 'に', 'で', 'と', 'は', 'も', 'から', 'まで', 'より']);
const connectorSet = new Set(['そして', 'また', 'しかし', 'だから', 'それで', 'ところで']);
const verbEndingSet = new Set(['する', 'され', 'でき', 'れる', 'られ']);

/**
 * 文字種に基づく結合判定（最適化版）
 */
export function shouldMerge(
  prevSegment: string,
  currentSegment: string,
  nextSegment?: string
): boolean {
  // 助詞パターン（前の語と結合） - セット検索で高速化
  if (particleSet.has(currentSegment)) {
    return true;
  }

  // 接続詞パターン（前の語と結合） - セット検索で高速化
  if (connectorSet.has(currentSegment)) {
    return true;
  }

  // 動詞活用（漢字＋ひらがな）
  const prevType = prevSegment.length > 0 ? getCharType(prevSegment[prevSegment.length - 1]) : null;
  const currentType = currentSegment.length > 0 ? getCharType(currentSegment[0]) : null;

  if (prevType === CharType.Kanji && currentType === CharType.Hiragana) {
    // 「する」「される」等の典型的な活用 - セット検索で高速化
    for (const ending of verbEndingSet) {
      if (currentSegment.startsWith(ending)) {
        return true;
      }
    }
  }

  // 複合語パターン（カタカナ同士）
  if (prevType === CharType.Katakana && currentType === CharType.Katakana) {
    return true;
  }

  return false;
}

/**
 * キャッシュクリア（テスト時やメモリ使用量が気になる場合に使用）
 */
export function clearCharTypeCache(): void {
  charTypeCache.clear();
}