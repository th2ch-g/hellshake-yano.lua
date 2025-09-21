/**
 * Encoding Utilities for UTF-8 Character and Byte Index Conversion
 *
 * This module provides utilities to convert between character indices and byte indices
 * for UTF-8 encoded text, specifically handling Japanese characters (3 bytes per character).
 *
 * 統一されたバイト長計算とエンコーディング処理を提供し、
 * 複数のモジュール間での重複実装を排除します。
 */

// TextEncoderを共有してインスタンス生成コストを削減
const sharedTextEncoder = new TextEncoder();

// マルチバイト文字のバイト長キャッシュ（性能最適化）
const byteLengthCache = new Map<string, number>();

/**
 * ASCII文字のみかどうかを高速チェック
 *
 * @param text - チェック対象の文字列
 * @returns ASCII文字のみの場合true
 */
export function isAscii(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 0x7f) {
      return false;
    }
  }
  return true;
}

/**
 * 統一されたバイト長計算関数（キャッシュ付き、ASCII最適化）
 *
 * @param text - バイト長を計算する文字列
 * @returns UTF-8でのバイト長
 */
export function getByteLength(text: string): number {
  if (text.length === 0) {
    return 0;
  }

  // ASCII文字のみの場合は高速パス
  if (isAscii(text)) {
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
 * メモリ使用量制限や状況変化時に使用
 */
export function clearByteLengthCache(): void {
  byteLengthCache.clear();
}

/**
 * 文字インデックスをUTF-8バイトインデックスに変換
 * @description UTF-8エンコードテキスト内での文字位置をバイト位置に変換。日本語文字のマルチバイト文字を適切に処理
 * @param text - UTF-8エンコードされたテキスト
 * @param charIndex - 文字位置（0ベース）
 * @returns number - バイト位置（0ベース）
 * @since 1.0.0
 * @example
 * ```typescript
 * const text = 'こんにちはworld';
 * const byteIndex = charIndexToByteIndex(text, 5); // 'w'の位置をバイト単位で取得
 * console.log(byteIndex); // 15 (日本語文字が各々3バイトのため)
 * ```
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
 * @description UTF-8エンコードテキスト内でのバイト位置を文字位置に変換。マルチバイト文字の途中を指している場合は前の有効な文字境界に調整
 * @param text - UTF-8エンコードされたテキスト
 * @param byteIndex - バイト位置（0ベース）
 * @returns number - 文字位置（0ベース）
 * @throws なし（デコードエラー時は前の有効な文字境界を返す）
 * @since 1.0.0
 * @example
 * ```typescript
 * const text = 'こんにちはworld';
 * const charIndex = byteIndexToCharIndex(text, 15); // バイト位置15から文字位置を取得
 * console.log(charIndex); // 5 ('w'の位置)
 * ```
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
 * 指定位置の文字のバイト長を取得
 * @description 特定の文字位置にある文字がUTF-8で何バイトを占めるかを取得
 * @param text - UTF-8エンコードされたテキスト
 * @param charIndex - 文字位置（0ベース）
 * @returns number - 指定位置の文字のバイト数（無効な位置の場合0）
 * @since 1.0.0
 * @example
 * ```typescript
 * const text = 'あAい';
 * console.log(getCharByteLength(text, 0)); // 3 (あ)
 * console.log(getCharByteLength(text, 1)); // 1 (A)
 * console.log(getCharByteLength(text, 2)); // 3 (い)
 * ```
 */
export function getCharByteLength(text: string, charIndex: number): number {
  // 範囲外チェックと空文字列チェック
  if (text.length === 0) return 0;
  if (charIndex < 0 || charIndex >= text.length) return 0;

  const char = text[charIndex];
  return new TextEncoder().encode(char).length;
}

/**
 * テキストにマルチバイト文字（日本語など）が含まれているかチェック
 * @description テキストのバイト長と文字長を比較し、マルチバイト文字の存在を判定
 * @param text - チェックするテキスト
 * @returns boolean - マルチバイト文字が含まれている場合true
 * @since 1.0.0
 * @example
 * ```typescript
 * console.log(hasMultibyteCharacters('hello')); // false
 * console.log(hasMultibyteCharacters('こんにちは')); // true
 * console.log(hasMultibyteCharacters('hello世界')); // true
 * ```
 */
export function hasMultibyteCharacters(text: string): boolean {
  return new TextEncoder().encode(text).length > text.length;
}

/**
 * デバッグ用の詳細エンコーディング情報を取得
 * @description テキストの各文字に対する詳細なエンコーディング情報を取得し、デバッグや分析に使用
 * @param text - 分析するテキスト
 * @returns {{ charLength: number, byteLength: number, hasMultibyte: boolean, charToByteMap: Array<object> }} エンコーディング詳細情報
 * @since 1.0.0
 * @example
 * ```typescript
 * const info = getEncodingInfo('あAい');
 * console.log(info.charLength); // 3
 * console.log(info.byteLength); // 7
 * console.log(info.hasMultibyte); // true
 * console.log(info.charToByteMap[0]); // { char: 'あ', charIndex: 0, byteStart: 0, byteLength: 3 }
 * ```
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

  return {
    charLength: text.length,
    byteLength: encoder.encode(text).length,
    hasMultibyte: hasMultibyteCharacters(text),
    charToByteMap,
  };
}

/**
 * 複数の文字インデックスをバイトインデックスに効率的に変換
 * @description 複数の文字位置を一度にバイト位置に変換。ソートして効率的に処理することでパフォーマンスを向上
 * @param text - UTF-8エンコードされたテキスト
 * @param charIndices - 文字位置の配列
 * @returns number[] - 対応するバイト位置の配列（元の順序を保持）
 * @since 1.0.0
 * @example
 * ```typescript
 * const text = 'あいうABC';
 * const charIndices = [0, 2, 4]; // 'あ', 'う', 'B'
 * const byteIndices = charIndicesToByteIndices(text, charIndices);
 * console.log(byteIndices); // [0, 6, 10]
 * ```
 */
export function charIndicesToByteIndices(text: string, charIndices: number[]): number[] {
  // 空の入力チェック
  if (charIndices.length === 0) return [];
  if (text.length === 0) return charIndices.map(() => 0);

  const encoder = new TextEncoder();
  const result: number[] = [];
  const fullTextByteLength = encoder.encode(text).length;

  // インデックスをソートして効率的に処理
  const sortedIndices = charIndices
    .map((index, originalIndex) => ({ index: Math.max(0, index), originalIndex }))
    .sort((a, b) => a.index - b.index);

  let currentCharIndex = 0;
  let currentByteIndex = 0;
  let processedCount = 0;

  for (let i = 0; i < text.length && processedCount < sortedIndices.length; i++) {
    const char = text[i];
    const charByteLength = encoder.encode(char).length;

    // この文字位置がターゲットインデックスのいずれかと一致するかチェック
    while (
      processedCount < sortedIndices.length &&
      sortedIndices[processedCount].index === currentCharIndex
    ) {
      result[sortedIndices[processedCount].originalIndex] = currentByteIndex;
      processedCount++;
    }

    currentCharIndex++;
    currentByteIndex += charByteLength;
  }

  // 文字列長以上のインデックスを処理
  while (processedCount < sortedIndices.length) {
    const targetIndex = charIndices[sortedIndices[processedCount].originalIndex];
    if (targetIndex >= text.length) {
      result[sortedIndices[processedCount].originalIndex] = fullTextByteLength;
    } else {
      result[sortedIndices[processedCount].originalIndex] = currentByteIndex;
    }
    processedCount++;
  }

  return result;
}
