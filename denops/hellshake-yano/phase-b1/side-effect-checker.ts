/**
 * denops/hellshake-yano/phase-b1/side-effect-checker.ts
 *
 * SideEffectChecker - 副作用の保存・復元機能
 *
 * 目的:
 *   - VimScript関数呼び出し時の副作用を管理
 *   - カーソル位置、グローバル変数、バッファ状態を保存・復元
 *   - 既存実装の安全な再利用を可能にする
 *
 * 参照: ARCHITECTURE_B.md#副作用の分類と対処法
 * Process: phase-b1, sub2.2
 */

import type { Denops } from "@denops/std";

/**
 * 保存された状態の型定義
 */
export interface SavedState {
  cursorPosition: number[]; // [bufnum, lnum, col, off]
  registers: Record<string, string>; // レジスタの内容
  globalVars: Record<string, unknown>; // グローバル変数
}

/**
 * SideEffectCheckerクラス
 *
 * VimScript関数呼び出し時の副作用を自動的に保存・復元する
 */
export class SideEffectChecker {
  constructor(private denops: Denops) {}

  /**
   * 現在の状態を保存
   *
   * @returns 保存された状態
   */
  async save(): Promise<SavedState> {
    // カーソル位置を保存
    const cursorPosition = await this.denops.call("getpos", ".") as number[];

    // 必要に応じてレジスタの内容を保存（現時点では空オブジェクト）
    const registers: Record<string, string> = {};

    // 必要に応じてグローバル変数を保存（現時点では空オブジェクト）
    const globalVars: Record<string, unknown> = {};

    return {
      cursorPosition,
      registers,
      globalVars,
    };
  }

  /**
   * 状態を復元
   *
   * @param state 保存された状態
   */
  async restore(state: SavedState): Promise<void> {
    // カーソル位置を復元
    await this.denops.call("setpos", ".", state.cursorPosition);

    // レジスタを復元（実装予定）
    // グローバル変数を復元（実装予定）
  }

  /**
   * 副作用を管理しながら関数を実行
   *
   * @param fn 実行する関数
   * @returns 関数の実行結果
   */
  async withSafeExecution<T>(fn: () => Promise<T>): Promise<T> {
    // 現在の状態を保存
    const savedState = await this.save();

    try {
      // 関数を実行
      const result = await fn();

      // 状態を復元
      await this.restore(savedState);

      return result;
    } catch (error) {
      // エラー時も状態を復元
      await this.restore(savedState);
      throw error;
    }
  }
}
