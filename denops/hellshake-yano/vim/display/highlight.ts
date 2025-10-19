/**
 * highlight.ts - Vim ハイライトグループ管理
 *
 * Vim Layer: ハイライト管理コンポーネント
 *
 * ヒント表示用のハイライトグループ（HintMarker）定義と管理機能
 *
 * ## VimScript版との互換性保証
 * - HintMarker グループ定義: VimScript版と同一の色設定
 * - カラースキーム対応: GUI色とTerminal色の両対応
 * - VimScript: :highlight コマンドの動作を再現
 *
 * ## ハイライト設定
 * - 前景色: Yellow/Magenta
 * - 背景色: Black/DarkGray
 * - Terminal対応: ctermfg, ctermbg
 * - GUI対応: guifg, guibg
 */

/**
 * ハイライト設定の型定義
 */
export interface HighlightConfig {
  group: string; // ハイライトグループ名
  ctermfg: string; // Terminal前景色（数値または色名）
  ctermbg: string; // Terminal背景色（数値または色名）
  guifg: string; // GUI前景色
  guibg: string; // GUI背景色
}

/**
 * VimHighlight - ハイライトグループ管理クラス
 *
 * Vim環境でのハイライト設定を管理
 */
export class VimHighlight {
  private hintMarkerConfig: HighlightConfig = {
    group: "HintMarker",
    // Terminal色: 黄色前景、黒背景
    ctermfg: "11", // Yellow
    ctermbg: "0", // Black
    // GUI色: 黄色前景、黒背景
    guifg: "Yellow",
    guibg: "Black",
  };

  /**
   * HintMarker ハイライトグループ設定を取得
   *
   * VimScript版の :highlight HintMarker コマンド相当
   *
   * @returns ハイライト設定
   *
   * @example
   * const highlight = new VimHighlight();
   * const config = highlight.getHintMarkerConfig();
   * // {
   * //   group: "HintMarker",
   * //   ctermfg: "11",
   * //   ctermbg: "0",
   * //   guifg: "Yellow",
   * //   guibg: "Black"
   * // }
   */
  getHintMarkerConfig(): HighlightConfig {
    return { ...this.hintMarkerConfig };
  }

  /**
   * HintMarker ハイライトグループ設定をカスタマイズ
   *
   * @param config カスタム設定
   */
  setHintMarkerConfig(config: Partial<HighlightConfig>): void {
    this.hintMarkerConfig = {
      ...this.hintMarkerConfig,
      ...config,
    };
  }

  /**
   * 全ハイライト設定を取得（VimScript :highlight コマンド用）
   *
   * @returns VimScript設定文字列
   *
   * @example
   * // Returns: "highlight HintMarker ctermfg=11 ctermbg=0 guifg=Yellow guibg=Black"
   */
  getVimHighlightCommand(): string {
    const cfg = this.hintMarkerConfig;
    return `highlight ${cfg.group} ctermfg=${cfg.ctermfg} ctermbg=${cfg.ctermbg} guifg=${cfg.guifg} guibg=${cfg.guibg}`;
  }
}
