/**
 * vim-bridge.ts - VimScript版との統合ブリッジ
 *
 * Vim Layer: 統合ブリッジコンポーネント
 *
 * 目的:
 *   - VimScript版のword_detector#detect_visible()を呼び出し
 *   - TypeScriptのWord型に変換
 *   - VimScript版の動作を100%再現
 */

import type { Denops } from "@denops/std";

/**
 * 単語データの型定義
 *
 * VimScript版のword_detectorと完全互換
 */
export interface Word {
  text: string; // 単語文字列
  lnum: number; // 行番号（1-indexed）
  col: number; // 開始列（1-indexed）
  endCol: number; // 終了列（1-indexed）
}

/**
 * VimScript版のdetect_visible()の戻り値型
 */
interface VimScriptWord {
  text: string;
  lnum: number;
  col: number;
  end_col: number;
}

/**
 * VimBridgeクラス
 *
 * VimScript版のword_detector機能をDenopsから利用するためのブリッジ
 * 環境判定を行い、Vim/Neovim専用のメソッドを呼び分ける
 */
export class VimBridge {
  constructor(private denops: Denops) {}

  /**
   * 画面内の単語を検出
   *
   * 環境を判定し、適切なメソッドを呼び出す
   *
   * @returns 検出された単語のリスト
   */
  async detectWords(): Promise<Word[]> {
    const isVim = await this.isVimEnvironment();

    // 環境ごとに完全に独立したメソッドを呼び出す
    return isVim ? await this.detectWordsForVim() : await this.detectWordsForNeovim();
  }

  /**
   * Vim環境かどうかを判定
   *
   * @returns Vim環境の場合true
   */
  private async isVimEnvironment(): Promise<boolean> {
    const hasNvim = await this.denops.call("has", "nvim") as number;
    return hasNvim === 0;
  }

  /**
   * Vim環境専用の単語検出
   *
   * @returns 検出された単語のリスト
   */
  private async detectWordsForVim(): Promise<Word[]> {
    // VimScript関数が存在するか確認
    const exists = await this.denops.call(
      "exists",
      "*hellshake_yano_vim#word_detector#detect_visible",
    ) as number;

    if (!exists) {
      return [];
    }

    // VimScript版のdetect_visible()を呼び出し
    const vimWords = await this.denops.call(
      "hellshake_yano_vim#word_detector#detect_visible",
    ) as VimScriptWord[];

    // TypeScriptのWord型に変換
    return vimWords.map((w) => ({
      text: w.text,
      lnum: w.lnum,
      col: w.col,
      endCol: w.end_col,
    }));
  }

  /**
   * Neovim環境専用の単語検出
   *
   * @returns 検出された単語のリスト
   */
  private async detectWordsForNeovim(): Promise<Word[]> {
    // VimScript関数が存在するか確認
    const exists = await this.denops.call(
      "exists",
      "*hellshake_yano_vim#word_detector#detect_visible",
    ) as number;

    if (!exists) {
      return [];
    }

    // VimScript版のdetect_visible()を呼び出し
    // （現時点ではVim版と同じ実装）
    const vimWords = await this.denops.call(
      "hellshake_yano_vim#word_detector#detect_visible",
    ) as VimScriptWord[];

    // TypeScriptのWord型に変換
    return vimWords.map((w) => ({
      text: w.text,
      lnum: w.lnum,
      col: w.col,
      endCol: w.end_col,
    }));
  }
}
