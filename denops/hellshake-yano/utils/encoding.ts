/**
 * Encoding Utilities for UTF-8 Character and Byte Index Conversion
 *
 * This module provides utilities to convert between character indices and byte indices
 * for UTF-8 encoded text, specifically handling Japanese characters (3 bytes per character).
 */

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
  if (charIndex <= 0) return 0;
  if (charIndex >= text.length) return new TextEncoder().encode(text).length;

  // Extract substring from start to character index
  const substring = text.substring(0, charIndex);

  // Convert to UTF-8 bytes and return length
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
  if (byteIndex <= 0) return 0;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const fullBytes = encoder.encode(text);

  if (byteIndex >= fullBytes.length) return text.length;

  // Find character index by decoding byte slice
  try {
    const byteSlice = fullBytes.slice(0, byteIndex);
    const decodedText = decoder.decode(byteSlice, { stream: false });
    return decodedText.length;
  } catch (error) {
    // If decoding fails (e.g., byte index is in middle of multi-byte character),
    // find the previous valid character boundary
    for (let i = byteIndex - 1; i >= 0; i--) {
      try {
        const byteSlice = fullBytes.slice(0, i);
        const decodedText = decoder.decode(byteSlice, { stream: false });
        return decodedText.length;
      } catch {
        continue;
      }
    }
    return 0;
  }
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
  if (charIndices.length === 0) return [];

  const encoder = new TextEncoder();
  const result: number[] = [];

  // Sort indices to process efficiently
  const sortedIndices = charIndices
    .map((index, originalIndex) => ({ index, originalIndex }))
    .sort((a, b) => a.index - b.index);

  let currentCharIndex = 0;
  let currentByteIndex = 0;
  let processedCount = 0;

  for (let i = 0; i < text.length && processedCount < sortedIndices.length; i++) {
    const char = text[i];
    const charByteLength = encoder.encode(char).length;

    // Check if this character position matches any of our target indices
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

  // Handle indices at or beyond text length
  while (processedCount < sortedIndices.length) {
    result[sortedIndices[processedCount].originalIndex] = currentByteIndex;
    processedCount++;
  }

  return result;
}
