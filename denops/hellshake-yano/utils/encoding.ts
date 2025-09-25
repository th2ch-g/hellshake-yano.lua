/**
 * UTF-8文字とバイトインデックス変換のエンコーディングユーティリティ
 *
 * このモジュールはUTF-8エンコードテキストの文字インデックスとバイトインデックス間の
 * 変換を行うユーティリティを提供します。特に日本語文字（1文字3バイト）を適切に処理します。
 *
 * 統一されたバイト長計算とエンコーディング処理を提供し、
 * 複数のモジュール間での重複実装を排除します。
 *
 * @module utils/encoding
 * @version 1.0.0
 */

/**
 * TextEncoderの共有インスタンス
 * インスタンス生成コストを削減し、メモリ使用量を最小化
 */
const sharedTextEncoder = new TextEncoder();

/**
 * マルチバイト文字のバイト長キャッシュ
 * 頑繁に使用される文字列のバイト長をキャッシュして性能を向上
 */
const byteLengthCache = new Map<string, number>();

/**
 * ASCII文字のみかどうかを高速チェック
 *
 * 文字列内のすべての文字がASCII文字（0x00-0x7F）であるかを判定します。
 * ASCII文字のみの場合はバイト長計算の最適化パスを使用できます。
 *
 * @param text チェック対象の文字列
 * @returns ASCII文字のみの場合true、マルチバイト文字が含まれる場合false
 * @example
 * ```typescript
 * isAscii("hello"); // true
 * isAscii("こんにちは"); // false
 * isAscii("hello world 123"); // true
 * isAscii("hello 世界"); // false
 * ```
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
 * 文字列のUTF-8エンコーディングでのバイト数を計算します。
 * ASCII文字のみの場合は高速処理パスを使用し、
 * マルチバイト文字が含まれる場合はキャッシュで最適化を行います。
 *
 * パフォーマンス最適化:
 * - ASCII文字のみ: O(n)の文字コードチェック
 * - マルチバイト文字: TextEncoderを使用してキャッシュに保存
 *
 * @param text バイト長を計算する文字列
 * @returns UTF-8エンコーディングでのバイト数
 * @throws なし（常に有効な数値を返します）
 * @example
 * ```typescript
 * getByteLength(""); // 0
 * getByteLength("hello"); // 5
 * getByteLength("あいう"); // 9 (3バイト × 3文字)
 * getByteLength("Hello世界"); // 11 (5 + 6バイト)
 * ```
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
 *
 * メモリ使用量の制限や長時間実行時のメモリリーク防止のため、
 * バイト長計算のキャッシュをクリアします。
 * 大量の異なる文字列を処理した後や、メモリ使用量を削減したい場合に使用します。
 *
 * @returns なし
 * @example
 * ```typescript
 * // 大量の文字列処理後にメモリを解放
 * for (const text of largeTextArray) {
 *   const length = getByteLength(text);
 *   // 処理...
 * }
 * clearByteLengthCache(); // キャッシュをリセット
 * ```
 */
export function clearByteLengthCache(): void {
  byteLengthCache.clear();
}

/**
 * 文字インデックスをUTF-8バイトインデックスに変換
 *
 * UTF-8エンコードされたテキスト内での文字位置をバイト位置に変換します。
 * 日本語文字などのマルチバイト文字を適切に処理し、正確なバイト位置を返します。
 *
 * 処理の特徴:
 * - 範囲外の文字インデックスは適切に処理されます
 * - 負数や0以下は0を返します
 * - 文字列長以上のインデックスは全体のバイト長を返します
 *
 * @param text UTF-8エンコードされたテキスト
 * @param charIndex 文字位置（0ベースインデックス）
 * @returns UTF-8バイト位置（0ベースインデックス）
 * @throws なし（範囲外アクセスも安全に処理されます）
 * @since 1.0.0
 * @example
 * ```typescript
 * const text = 'こんにちはworld';
 *
 * charIndexToByteIndex(text, 0);  // 0 ('こ'の開始位置)
 * charIndexToByteIndex(text, 1);  // 3 ('ん'の開始位置)
 * charIndexToByteIndex(text, 5);  // 15 ('w'の開始位置)
 * charIndexToByteIndex(text, -1); // 0 (負数は0に正規化)
 * charIndexToByteIndex(text, 100); // 20 (範囲外は全体のバイト長)
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
 *
 * UTF-8エンコードされたテキスト内でのバイト位置を文字位置に変換します。
 * マルチバイト文字の途中を指している場合は、その文字の開始位置を返します。
 *
 * 処理の特徴:
 * - マルチバイト文字の境界を適切に処理
 * - 文字の途中のバイト位置でも安全に文字境界を返す
 * - 範囲外のバイト位置は適切に正規化される
 *
 * @param text UTF-8エンコードされたテキスト
 * @param byteIndex バイト位置（0ベースインデックス）
 * @returns 対応する文字位置（0ベースインデックス）
 * @throws なし（デコードエラー時は安全な文字境界を返します）
 * @since 1.0.0
 * @example
 * ```typescript
 * const text = 'こんにちはworld';
 *
 * byteIndexToCharIndex(text, 0);  // 0 ('こ'の位置)
 * byteIndexToCharIndex(text, 1);  // 0 ('こ'の途中 -> 'こ'の位置)
 * byteIndexToCharIndex(text, 3);  // 1 ('ん'の開始位置)
 * byteIndexToCharIndex(text, 15); // 5 ('w'の位置)
 * byteIndexToCharIndex(text, -1); // 0 (負数は0に正規化)
 * byteIndexToCharIndex(text, 100); // 11 (範囲外は文字列長)
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
 *
 * 特定の文字位置にある文字がUTF-8エンコーディングで何バイトを占めるかを取得します。
 * ASCII文字は1バイト、日本語文字（ひらがな・カタカナ・漢字）は通常3バイト、
 * 絵文字などは4バイト以上になる場合があります。
 *
 * @param text UTF-8エンコードされたテキスト
 * @param charIndex 文字位置（0ベースインデックス）
 * @returns 指定位置の文字のバイト数（無効な位置の場合は0）
 * @throws なし（範囲外アクセスは0を返します）
 * @since 1.0.0
 * @example
 * ```typescript
 * const text = 'あAい😀';
 *
 * getCharByteLength(text, 0); // 3 ('あ' - ひらがな)
 * getCharByteLength(text, 1); // 1 ('A' - ASCII文字)
 * getCharByteLength(text, 2); // 3 ('い' - ひらがな)
 * getCharByteLength(text, 3); // 4 ('😀' - 絵文字)
 * getCharByteLength(text, -1); // 0 (範囲外)
 * getCharByteLength(text, 10); // 0 (範囲外)
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
 *
 * テキストのUTF-8バイト長と文字長を比較し、マルチバイト文字の存在を判定します。
 * ASCII文字のみの場合はバイト数と文字数が等しくなりますが、
 * 日本語文字や絵文字が含まれる場合はバイト数の方が大きくなります。
 *
 * この情報はパフォーマンス最適化の判断に使用できます。
 *
 * @param text チェックするテキスト
 * @returns マルチバイト文字が含まれている場合true、ASCII文字のみの場合false
 * @throws なし
 * @since 1.0.0
 * @example
 * ```typescript
 * hasMultibyteCharacters('');           // false (空文字列)
 * hasMultibyteCharacters('hello');     // false (ASCII文字のみ)
 * hasMultibyteCharacters('こんにちは'); // true (日本語文字)
 * hasMultibyteCharacters('hello世界'); // true (混在)
 * hasMultibyteCharacters('café');      // true (アクセント文字)
 * hasMultibyteCharacters('😀');        // true (絵文字)
 * ```
 */
export function hasMultibyteCharacters(text: string): boolean {
  return new TextEncoder().encode(text).length > text.length;
}

/**
 * デバッグ用の詳細エンコーディング情報を取得
 *
 * テキストの各文字に対する詳細なUTF-8エンコーディング情報を取得し、
 * デバッグ、分析、テストに使用します。文字ごとのバイト位置とバイト数の
 * マッピングを提供し、エンコーディング処理の検証に役立ちます。
 *
 * 返却される情報:
 * - charLength: 文字数
 * - byteLength: 総バイト数
 * - hasMultibyte: マルチバイト文字の有無
 * - charToByteMap: 各文字の詳細マッピング
 *
 * @param text 分析するテキスト
 * @returns エンコーディングの詳細情報オブジェクト
 * @throws なし
 * @since 1.0.0
 * @example
 * ```typescript
 * const info = getEncodingInfo('あAい😀');
 *
 * console.log(info.charLength);   // 4
 * console.log(info.byteLength);   // 11 (3+1+3+4)
 * console.log(info.hasMultibyte); // true
 *
 * // 各文字の詳細情報
 * console.log(info.charToByteMap[0]);
 * // { char: 'あ', charIndex: 0, byteStart: 0, byteLength: 3 }
 * console.log(info.charToByteMap[1]);
 * // { char: 'A', charIndex: 1, byteStart: 3, byteLength: 1 }
 * console.log(info.charToByteMap[2]);
 * // { char: 'い', charIndex: 2, byteStart: 4, byteLength: 3 }
 * console.log(info.charToByteMap[3]);
 * // { char: '😀', charIndex: 3, byteStart: 7, byteLength: 4 }
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
 *
 * 複数の文字位置を一度にバイト位置に変換します。
 * 内部的にインデックスをソートして一回のテキスト走査で全ての変換を行うため、
 * 個別変換を繰り返すよりも効率的です。元の順序は保持されます。
 *
 * パフォーマンス特性:
 * - 時間計算量: O(n + m log m) (n=テキスト長, m=インデックス数)
 * - 個別変換の場合: O(n * m)
 * - 大量のインデックス変換時に特に有効
 *
 * @param text UTF-8エンコードされたテキスト
 * @param charIndices 変換する文字位置の配列（0ベースインデックス）
 * @returns 対応するバイト位置の配列（元の順序を保持、0ベースインデックス）
 * @throws なし（範囲外インデックスも安全に処理されます）
 * @since 1.0.0
 * @example
 * ```typescript
 * const text = 'あいうABC';
 *
 * // 基本的な使用例
 * const charIndices = [0, 2, 4]; // 'あ', 'う', 'B'の位置
 * const byteIndices = charIndicesToByteIndices(text, charIndices);
 * console.log(byteIndices); // [0, 6, 10]
 *
 * // 順序が保持される例
 * const mixedIndices = [4, 0, 2]; // 順序はそのまま
 * const mixedBytes = charIndicesToByteIndices(text, mixedIndices);
 * console.log(mixedBytes); // [10, 0, 6]
 *
 * // 範囲外も安全に処理
 * const invalidIndices = [-1, 0, 100];
 * const safeBytes = charIndicesToByteIndices(text, invalidIndices);
 * console.log(safeBytes); // [0, 0, 12] (全体のバイト長)
 *
 * // 空配列の場合
 * const emptyResult = charIndicesToByteIndices(text, []);
 * console.log(emptyResult); // []
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
