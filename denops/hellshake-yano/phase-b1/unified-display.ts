/**
 * denops/hellshake-yano/phase-b1/unified-display.ts
 *
 * UnifiedDisplay - Vim/Neovim統合表示システム
 *
 * 目的:
 *   - Vim環境では popup_create() を使用してヒントを表示
 *   - Neovim環境では nvim_buf_set_extmark() を使用してヒントを表示
 *   - VimScript版display.vimとの100%互換性を保証
 *
 * 参照: autoload/hellshake_yano_vim/display.vim
 * Process: phase-b1, sub4.1
 */

import type { Denops } from "@denops/std";

/**
 * ヒント情報の型定義
 */
export interface HintInfo {
  id: number; // popup ID (Vim) または extmark ID (Neovim)
  hint: string; // ヒント文字列（例: 'a', 'aa', 'as'）
}

/**
 * UnifiedDisplayクラス
 *
 * Vim/Neovim両環境でヒント表示を統合的に管理
 */
export class UnifiedDisplay {
  private popupIds: HintInfo[] = [];
  private nsId: number = -1; // Neovim namespace ID

  constructor(private denops: Denops) {}

  /**
   * ヒントを表示
   *
   * @param lnum 行番号（1-indexed）
   * @param col 列番号（1-indexed）
   * @param hint 表示するヒント文字列
   * @returns popup ID (Vim) または extmark ID (Neovim)
   */
  async showHint(lnum: number, col: number, hint: string): Promise<number> {
    const isVim = await this.isVimEnvironment();

    if (isVim) {
      return await this.showHintForVim(lnum, col, hint);
    } else {
      return await this.showHintForNeovim(lnum, col, hint);
    }
  }

  /**
   * Vim環境でpopup_create()を使用してヒントを表示
   *
   * @param lnum 行番号（1-indexed）
   * @param col 列番号（1-indexed）
   * @param hint 表示するヒント文字列
   * @returns popup ID
   */
  private async showHintForVim(
    lnum: number,
    col: number,
    hint: string,
  ): Promise<number> {
    // popup_create() が利用可能かチェック
    const hasPopup = await this.denops.call(
      "exists",
      "*popup_create",
    ) as number;

    if (hasPopup === 0) {
      throw new Error("popup_create() is not available");
    }

    // popup を作成
    const popupId = await this.denops.call("popup_create", hint, {
      line: lnum,
      col: col,
      width: hint.length,
      height: 1,
      highlight: "HintMarker",
      zindex: 1000,
      wrap: 0,
    }) as number;

    // popup ID とヒント文字を保存
    this.popupIds.push({ id: popupId, hint });

    return popupId;
  }

  /**
   * Neovim環境でnvim_buf_set_extmark()を使用してヒントを表示
   *
   * @param lnum 行番号（1-indexed）
   * @param col 列番号（1-indexed）
   * @param hint 表示するヒント文字列
   * @returns extmark ID
   */
  private async showHintForNeovim(
    lnum: number,
    col: number,
    hint: string,
  ): Promise<number> {
    // namespace が未初期化の場合は作成
    if (this.nsId === -1) {
      this.nsId = await this.denops.call(
        "nvim_create_namespace",
        "hellshake_yano_vim_hint",
      ) as number;
    }

    // extmark を作成（行・列は 0-indexed に変換）
    const extmarkId = await this.denops.call(
      "nvim_buf_set_extmark",
      0,
      this.nsId,
      lnum - 1,
      col - 1,
      {
        virt_text: [[hint, "HintMarker"]],
        virt_text_pos: "overlay",
        priority: 1000,
      },
    ) as number;

    // extmark ID とヒント文字を保存
    this.popupIds.push({ id: extmarkId, hint });

    return extmarkId;
  }

  /**
   * 全てのヒントを非表示
   */
  async hideAll(): Promise<void> {
    const isVim = await this.isVimEnvironment();

    if (isVim) {
      // Vim: 各 popup を個別に閉じる
      for (const popupInfo of this.popupIds) {
        const hasPopupClose = await this.denops.call(
          "exists",
          "*popup_close",
        ) as number;

        if (hasPopupClose === 1) {
          try {
            await this.denops.call("popup_close", popupInfo.id);
          } catch {
            // popup が既に閉じられている場合はスキップ
          }
        }
      }
    } else {
      // Neovim: namespace 全体をクリア
      if (this.nsId !== -1) {
        await this.denops.call("nvim_buf_clear_namespace", 0, this.nsId, 0, -1);
      }
    }

    // popup_ids 配列をクリア
    this.popupIds = [];
  }

  /**
   * 部分マッチしたヒントのみ表示
   *
   * @param matches 表示するヒントのリスト
   */
  async highlightPartialMatches(matches: string[]): Promise<void> {
    const isVim = await this.isVimEnvironment();
    const newPopupIds: HintInfo[] = [];

    for (const popupInfo of this.popupIds) {
      if (matches.includes(popupInfo.hint)) {
        // 部分マッチ: ポップアップを維持
        newPopupIds.push(popupInfo);
      } else {
        // マッチしない: ポップアップを非表示
        if (isVim) {
          // Vim: popup を閉じる
          const hasPopupClose = await this.denops.call(
            "exists",
            "*popup_close",
          ) as number;

          if (hasPopupClose === 1) {
            try {
              await this.denops.call("popup_close", popupInfo.id);
            } catch {
              // popup が既に閉じられている場合はスキップ
            }
          }
        } else {
          // Neovim: extmark を削除
          if (this.nsId !== -1) {
            try {
              await this.denops.call(
                "nvim_buf_del_extmark",
                0,
                this.nsId,
                popupInfo.id,
              );
            } catch {
              // extmark が既に削除されている場合はスキップ
            }
          }
        }
      }
    }

    // popup_ids を更新（マッチしたヒントのみ）
    this.popupIds = newPopupIds;
  }

  /**
   * 表示中のヒント数を取得（テスト用）
   *
   * @returns 表示中のヒント数
   */
  getPopupCount(): number {
    return this.popupIds.length;
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
}
