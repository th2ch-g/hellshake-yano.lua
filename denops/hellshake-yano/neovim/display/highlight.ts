/**
 * denops/hellshake-yano/neovim/display/highlight.ts
 *
 * Neovim ハイライト管理
 *
 * Neovim 向けハイライトグループ管理と色設定機能を提供します。
 */

import type { Denops } from "@denops/std";
import type { Config } from "../../types.ts";

/**
 * ハイライト定義
 */
export interface HighlightDefinition {
  group: string;
  foreground?: string;
  background?: string;
  attributes?: string[];
}

/**
 * ハイライト管理クラス
 */
export class HighlightManager {
  private denops: Denops;
  private config: Config;

  constructor(denops: Denops, config: Config) {
    this.denops = denops;
    this.config = config;
  }

  /**
   * ハイライトグループを設定
   */
  async setHighlight(definition: HighlightDefinition): Promise<void> {
    const cmd = this.buildHighlightCommand(definition);
    if (cmd) {
      await this.denops.cmd(cmd);
    }
  }

  /**
   * ハイライトコマンドを生成
   */
  private buildHighlightCommand(definition: HighlightDefinition): string {
    const parts = [`highlight ${definition.group}`];

    if (definition.foreground) {
      parts.push(`ctermfg=${definition.foreground}`);
    }

    if (definition.background) {
      parts.push(`ctermbg=${definition.background}`);
    }

    if (definition.attributes && definition.attributes.length > 0) {
      parts.push(`cterm=${definition.attributes.join(",")}`);
    }

    return parts.join(" ");
  }

  /**
   * デフォルトハイライトを初期化
   */
  async initializeDefaultHighlights(): Promise<void> {
    // Hint マーカー用ハイライト
    await this.setHighlight({
      group: "HintMarker",
      foreground: this.config.highlightHintMarker || "Yellow",
      attributes: ["bold"],
    });
  }
}
