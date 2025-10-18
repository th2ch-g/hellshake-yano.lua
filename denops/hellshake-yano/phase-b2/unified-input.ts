/**
 * unified-input.ts - VimScript版input.vimの部分マッチロジック移植
 *
 * TDD Phase: GREEN
 * Process5-sub2: 実装
 *
 * VimScript版のアルゴリズムを完全再現し、stridx()による部分マッチ判定を100%一致させます。
 *
 * ## VimScript版との互換性保証
 * - 部分マッチ判定: stridx(hint, input_buffer) == 0
 * - 前方一致チェック: 文字列の先頭からマッチ
 * - 完全一致も部分マッチに含まれる
 *
 * ## アルゴリズム（VimScript版と同一）
 * 1. ヒントマップの全キーをループ
 * 2. stridx(hint, input_buffer) == 0 で前方一致チェック
 * 3. マッチしたヒントをリストに追加
 *
 * ## 注意事項
 * - Phase B-2では部分マッチロジックのみ実装
 * - ブロッキング入力処理（wait_for_input）は後続フェーズで実装
 * - タイマー方式（start/stop）はPhase B-3以降で実装
 */

/**
 * ヒントマップの型定義
 * VimScript版の辞書構造を再現
 *
 * @example
 * {
 *   'a': { line: 10, col: 5 },
 *   'aa': { line: 15, col: 3 },
 *   'as': { line: 20, col: 7 }
 * }
 */
export interface HintMap {
  [hint: string]: {
    line: number;
    col: number;
  };
}

/**
 * UnifiedInput - 入力処理クラス
 *
 * VimScript版のhellshake_yano_vim#input#get_partial_matches()を完全移植
 */
export class UnifiedInput {
  /**
   * 部分マッチするヒントのリストを取得
   *
   * VimScript版のs:get_partial_matches()を完全再現
   *
   * アルゴリズム:
   * - ヒントマップの全キーをループ
   * - stridx(hint, input_buffer) == 0 で前方一致チェック
   * - マッチしたヒントをリストに追加
   *
   * @param inputBuffer - 現在の入力バッファ
   * @param hintMap - ヒントマップ
   * @returns 部分マッチするヒントのリスト
   *
   * @example
   * const input = new UnifiedInput();
   * const hintMap = {
   *   'a': { line: 10, col: 5 },
   *   'aa': { line: 15, col: 3 },
   *   'as': { line: 20, col: 7 }
   * };
   * const matches = input.getPartialMatches('a', hintMap);
   * // ['a', 'aa', 'as']
   */
  getPartialMatches(inputBuffer: string, hintMap: HintMap): string[] {
    const matches: string[] = [];

    // VimScript版: for l:hint in keys(a:hint_map)
    for (const hint of Object.keys(hintMap)) {
      // VimScript版: stridx(l:hint, a:input_buffer) == 0
      // stridx()は文字列内での部分文字列の位置を返す
      // 戻り値が0の場合、先頭から一致（前方一致）
      if (hint.indexOf(inputBuffer) === 0) {
        matches.push(hint);
      }
    }

    return matches;
  }

  /**
   * 完全一致するヒントを取得
   *
   * Phase B-2では未実装、Phase B-3以降で実装予定
   *
   * @param inputBuffer - 現在の入力バッファ
   * @param hintMap - ヒントマップ
   * @returns 完全一致するヒントの座標、マッチしない場合はnull
   */
  getExactMatch(
    inputBuffer: string,
    hintMap: HintMap,
  ): { line: number; col: number } | null {
    // VimScript版: has_key(a:hint_map, l:input_buffer)
    if (inputBuffer in hintMap) {
      return hintMap[inputBuffer];
    }
    return null;
  }
}
