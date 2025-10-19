/**
 * visual.ts - ビジュアルモード対応
 *
 * Vim Layer Implementation
 * TDD Phase: GREEN
 * Process10-sub2: 実装
 *
 * Vimビジュアルモード (v, V, Ctrl-v) のサポート
 */

import type { Denops } from "@denops/std";

/**
 * ビジュアルモード タイプ
 */
export enum VisualMode {
  Characterwise = "char", // v - 文字単位
  Linewise = "line", // V - 行単位
  Blockwise = "block", // Ctrl-v - ブロック単位
  None = "none", // ビジュアルモードなし
}

/**
 * ビジュアル選択範囲
 */
export interface VisualRange {
  mode: VisualMode;
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}

/**
 * VimVisual - ビジュアルモード管理クラス
 */
export class VimVisual {
  private denops: Denops;
  private currentMode: VisualMode = VisualMode.None;

  constructor(denops: Denops) {
    this.denops = denops;
  }

  /**
   * 現在のビジュアルモードを取得
   *
   * @returns ビジュアルモード
   */
  async getVisualMode(): Promise<VisualMode> {
    const mode = (await this.denops.eval("mode()")) as string;

    switch (mode) {
      case "v":
        return VisualMode.Characterwise;
      case "V":
        return VisualMode.Linewise;
      case "":
        return VisualMode.Blockwise;
      default:
        return VisualMode.None;
    }
  }

  /**
   * ビジュアル選択範囲を取得
   *
   * @returns ビジュアル選択範囲
   */
  async getVisualRange(): Promise<VisualRange> {
    const mode = await this.getVisualMode();

    if (mode === VisualMode.None) {
      return {
        mode,
        startLine: 0,
        startCol: 0,
        endLine: 0,
        endCol: 0,
      };
    }

    // VimScript: getpos("'<") でビジュアル開始位置
    // VimScript: getpos("'>") でビジュアル終了位置
    const startLine = (await this.denops.eval('line("\'<")')) as number;
    const startCol = (await this.denops.eval('col("\'<")')) as number;
    const endLine = (await this.denops.eval('line("\'>")')) as number;
    const endCol = (await this.denops.eval('col("\'>")')) as number;

    return {
      mode,
      startLine,
      startCol,
      endLine,
      endCol,
    };
  }

  /**
   * ビジュアルモードを終了
   */
  async exitVisualMode(): Promise<void> {
    await this.denops.call("feedkeys", "\\<Esc>", "n");
    this.currentMode = VisualMode.None;
  }

  /**
   * ビジュアルモード中かチェック
   *
   * @returns ビジュアルモード中の場合true
   */
  isInVisualMode(): boolean {
    return this.currentMode !== VisualMode.None;
  }
}
