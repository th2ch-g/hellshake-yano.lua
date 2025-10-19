/**
 * denops/hellshake-yano/common/utils/side-effect.ts
 *
 * 副作用管理
 */

import type { Denops } from "jsr:@denops/std@^7.4.0";

/**
 * 保存された状態
 */
export interface SavedState {
  cursorPosition: number[];
  registers: Record<string, string>;
  globalVars: Record<string, unknown>;
}

/**
 * SideEffectChecker: 副作用の保存・復元
 */
export class SideEffectChecker {
  constructor(private denops: Denops) {}

  async save(): Promise<SavedState> {
    const cursorPosition = (await this.denops.call("getpos", ".")) as number[];
    return {
      cursorPosition,
      registers: {},
      globalVars: {},
    };
  }

  async restore(state: SavedState): Promise<void> {
    await this.denops.call("setpos", ".", state.cursorPosition);
  }

  async withSafeExecution<T>(fn: () => Promise<T>): Promise<T> {
    const savedState = await this.save();
    try {
      const result = await fn();
      await this.restore(savedState);
      return result;
    } catch (error) {
      await this.restore(savedState);
      throw error;
    }
  }
}
