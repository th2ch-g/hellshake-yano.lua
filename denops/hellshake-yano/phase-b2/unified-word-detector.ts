/**
 * unified-word-detector.ts - VimScript版word_detector.vimの完全移植
 *
 * TDD Phase: GREEN
 * Process2-sub2: 実装
 *
 * VimScript版のアルゴリズムを完全再現し、座標計算・エラーメッセージ・動作タイミングを100%一致させます。
 *
 * ## VimScript版との互換性保証
 * - 座標計算: matchstrpos()の0-indexed → 1-indexed変換を正確に実装
 * - エラーハンドリング: 空のバッファチェック（l:w0 < 1 || l:wlast < 1）
 * - 空行スキップ: empty(l:line) の完全再現
 * - 無限ループ防止: l:start_pos >= len(l:line) チェック
 *
 * ## アルゴリズム（VimScript版と同一）
 * 1. 画面内の表示範囲（line('w0') ～ line('w$')）を取得
 * 2. 各行に対して以下を実行:
 *    a. getline() で行の内容を取得
 *    b. 正規表現 /\w+/g で単語を順次検出
 *    c. 検出した単語の情報（text, line, col）を配列に追加
 *    d. 次の検索開始位置を更新してループ
 * 3. 全ての単語データを配列で返す
 */

import type { Denops } from "@denops/std";
import type { DenopsWord } from "./vimscript-types.ts";
import type { UnifiedJapaneseSupportConfig } from "../phase-b3/unified-japanese-support.ts";
import { unifiedJapaneseSupport } from "../phase-b3/unified-japanese-support.ts";

/**
 * UnifiedWordDetector - 画面内の単語検出クラス
 *
 * VimScript版のhellshake_yano_vim#word_detector#detect_visible()を完全移植
 * Phase B-3: 日本語対応統合版
 */
export class UnifiedWordDetector {
  private denops: Denops;
  // 注意: gフラグは使わない（matchメソッドで毎回新しいマッチを取得するため）
  private wordPattern = /\w+/;
  private japaneseSupport = unifiedJapaneseSupport;

  constructor(denops: Denops) {
    this.denops = denops;
    this.japaneseSupport.setDenops(denops);
  }

  /**
   * 画面内の単語を検出
   *
   * VimScript版のdetect_visible()関数を完全再現
   *
   * @returns 検出した単語のリスト
   */
  async detectVisible(): Promise<DenopsWord[]> {
    // 1. 画面内の表示範囲を取得
    const visibleRange = await this.getVisibleRange();

    // 空のバッファチェック（VimScript版: l:w0 < 1 || l:wlast < 1）
    if (visibleRange.w0 < 1 || visibleRange.wlast < 1) {
      return [];
    }

    // 2. 範囲内の行を取得して単語検出
    const words: DenopsWord[] = [];

    for (let lnum = visibleRange.w0; lnum <= visibleRange.wlast; lnum++) {
      const line = await this.getLine(lnum);

      // 空行スキップ（VimScript版: empty(l:line)）
      if (line === "") {
        continue;
      }

      // 行内の全ての単語を検出
      const lineWords = this.detectWordsInLine(line, lnum);
      words.push(...lineWords);
    }

    return words;
  }

  /**
   * 画面内の表示範囲を取得
   *
   * VimScript版:
   * let l:w0 = line('w0')
   * let l:wlast = line('w$')
   *
   * @returns { w0: number, wlast: number }
   */
  private async getVisibleRange(): Promise<{ w0: number; wlast: number }> {
    const w0 = await this.denops.eval("line('w0')") as number;
    const wlast = await this.denops.eval("line('w$')") as number;

    return { w0, wlast };
  }

  /**
   * 指定行の内容を取得
   *
   * VimScript版: let l:line = getline(l:lnum)
   *
   * @param lnum - 行番号（1-indexed）
   * @returns 行の内容
   */
  private async getLine(lnum: number): Promise<string> {
    return await this.denops.call("getline", lnum) as string;
  }

  /**
   * 行内の全ての単語を検出
   *
   * VimScript版のmatchstrpos()ループを完全再現:
   * while 1
   *   let l:match_result = matchstrpos(l:line, l:word_pattern, l:start_pos)
   *   let l:match_text = l:match_result[0]
   *   let l:match_start = l:match_result[1]
   *   let l:match_end = l:match_result[2]
   *
   *   if l:match_start == -1
   *     break
   *   endif
   *
   *   let l:word_data = {
   *     \ 'text': l:match_text,
   *     \ 'lnum': l:lnum,
   *     \ 'col': l:match_start + 1,
   *     \ 'end_col': l:match_end + 1
   *   \ }
   *
   *   call add(l:words, l:word_data)
   *   let l:start_pos = l:match_end
   *
   *   if l:start_pos >= len(l:line)
   *     break
   *   endif
   * endwhile
   *
   * @param line - 行の内容
   * @param lnum - 行番号（1-indexed）
   * @returns 検出した単語のリスト
   */
  private detectWordsInLine(line: string, lnum: number): DenopsWord[] {
    const words: DenopsWord[] = [];

    // 現在の検索開始位置（0-indexed、VimScript版と同じ）
    let startPos = 0;

    while (true) {
      // matchstrpos() の再現
      // 戻り値: [match, start, end]
      //   - match: マッチした文字列
      //   - start: 開始位置（0-indexed）
      //   - end: 終了位置（0-indexed、マッチ文字列の次の位置）
      const matchResult = this.matchStrPos(line, this.wordPattern, startPos);

      // マッチが見つからない場合はループ終了（VimScript版: l:match_start == -1）
      if (matchResult.start === -1) {
        break;
      }

      // 単語データを作成（col は 1-indexed に変換）
      const wordData: DenopsWord = {
        text: matchResult.match,
        line: lnum,
        col: matchResult.start + 1, // 0-indexed → 1-indexed
      };

      words.push(wordData);

      // 次の検索開始位置を更新（VimScript版: let l:start_pos = l:match_end）
      startPos = matchResult.end;

      // 安全のため、無限ループ防止チェック（VimScript版: l:start_pos >= len(l:line)）
      if (startPos >= line.length) {
        break;
      }
    }

    return words;
  }

  /**
   * matchstrpos() の再現
   *
   * VimScript版のmatchstrpos(str, pat, start)を再現:
   * - str: 対象文字列
   * - pat: 正規表現パターン
   * - start: 開始位置（0-indexed）
   * - 戻り値: [match, start, end]
   *   - match: マッチした文字列
   *   - start: 開始位置（0-indexed、マッチしない場合は-1）
   *   - end: 終了位置（0-indexed、マッチ文字列の次の位置）
   *
   * @param str - 対象文字列
   * @param pattern - 正規表現パターン
   * @param startPos - 開始位置（0-indexed）
   * @returns { match: string, start: number, end: number }
   */
  private matchStrPos(
    str: string,
    pattern: RegExp,
    startPos: number,
  ): { match: string; start: number; end: number } {
    // startPos以降の部分文字列を取得
    const substr = str.slice(startPos);

    // 正規表現でマッチング
    const match = substr.match(pattern);

    if (match === null || match.index === undefined) {
      // マッチしない場合（VimScript版: return ['', -1, -1]）
      return { match: "", start: -1, end: -1 };
    }

    // マッチした場合
    const matchText = match[0];
    const matchStart = startPos + match.index; // 元の文字列での開始位置
    const matchEnd = matchStart + matchText.length; // 終了位置（次の文字の位置）

    return { match: matchText, start: matchStart, end: matchEnd };
  }

  /**
   * 単語検出を実行（configベースのフィルタリング付き）
   *
   * Phase B-2: 基本実装
   * Phase B-3: 日本語対応統合
   *
   * @param config - 検出設定（minWordLength、日本語対応フラグなど）
   * @returns 検出した単語のリスト
   */
  async detectVisibleWithConfig(config?: {
    minWordLength?: number;
    useJapanese?: boolean;
    enableTinySegmenter?: boolean;
    japaneseMinWordLength?: number;
    japaneseMergeParticles?: boolean;
  }): Promise<DenopsWord[]> {
    const words = await this.detectVisible();

    // 日本語対応が有効な場合は日本語単語を追加
    if (
      config?.useJapanese === true &&
      config?.enableTinySegmenter === true
    ) {
      // 画面内の行範囲を取得
      const visibleRange = await this.getVisibleRange();

      if (visibleRange.w0 >= 1 && visibleRange.wlast >= 1) {
        // 各行をセグメント化
        for (let lnum = visibleRange.w0; lnum <= visibleRange.wlast; lnum++) {
          const line = await this.getLine(lnum);

          if (line.trim().length === 0) {
            continue;
          }

          // 日本語セグメント化を実行
          const japaneseWords = await this.japaneseSupport.segmentLine(
            line,
            lnum,
            config as UnifiedJapaneseSupportConfig,
          );

          // 既存の単語と重複しないかチェック
          for (const jword of japaneseWords) {
            // 同じ位置に既に単語がある場合はスキップ
            const exists = words.some(
              (w) =>
                w.line === jword.line && w.col === jword.col &&
                w.text === jword.text,
            );
            if (!exists) {
              words.push(jword);
            }
          }
        }
      }
    }

    // configが指定されている場合はフィルタリング
    if (config?.minWordLength !== undefined) {
      return words.filter((word) => word.text.length >= config.minWordLength!);
    }

    return words;
  }
}
