/**
 * tests/phase-b1/env-helper.ts
 *
 * 環境分離テストヘルパー
 *
 * 目的:
 *   - Vim環境とNeovim環境を明確に分離してテストを実行
 *   - 環境判定ロジックを提供
 *   - モック機能で環境切り替えをテスト
 *
 * Process: phase-b1, sub1.2
 */

import type { Denops } from "@denops/std";

/**
 * Vim/Neovim環境を表す型
 */
export type VimEnvironment = "vim" | "nvim";

/**
 * 環境情報を保持するインターフェース
 */
export interface EnvironmentInfo {
  type: VimEnvironment;
  version: string;
  hasPopup: boolean; // popup_create() が使えるか
  hasFloatingWindow: boolean; // floating window が使えるか
  hasExtmark: boolean; // extmark が使えるか
}

/**
 * 現在の環境を判定
 *
 * @param denops Denopsインスタンス
 * @returns 環境情報
 */
export async function detectEnvironment(denops: Denops): Promise<EnvironmentInfo> {
  const hasNvim = await denops.call("has", "nvim") as number;
  const type: VimEnvironment = hasNvim ? "nvim" : "vim";

  // バージョン情報の取得
  const versionOutput = await denops.call("execute", "version") as string;
  const versionMatch = versionOutput.match(/(?:VIM|NVIM)\s*-\s*Vi\s*IMproved\s*([\d.]+)/i) ||
    versionOutput.match(/NVIM\s*v([\d.]+)/i);
  const version = versionMatch ? versionMatch[1] : "unknown";

  // 機能の有無をチェック
  const hasPopup = (await denops.call("exists", "*popup_create") as number) === 1;
  const hasFloatingWindow = (await denops.call("exists", "*nvim_open_win") as number) === 1;
  const hasExtmark = (await denops.call("exists", "*nvim_buf_set_extmark") as number) === 1;

  return {
    type,
    version,
    hasPopup,
    hasFloatingWindow,
    hasExtmark,
  };
}

/**
 * Vim環境かどうかを判定
 *
 * @param denops Denopsインスタンス
 * @returns Vim環境の場合true
 */
export async function isVimEnvironment(denops: Denops): Promise<boolean> {
  const env = await detectEnvironment(denops);
  return env.type === "vim";
}

/**
 * Neovim環境かどうかを判定
 *
 * @param denops Denopsインスタンス
 * @returns Neovim環境の場合true
 */
export async function isNeovimEnvironment(denops: Denops): Promise<boolean> {
  const env = await detectEnvironment(denops);
  return env.type === "nvim";
}

/**
 * Vim環境専用のテスト実行ヘルパー
 *
 * @param denops Denopsインスタンス
 * @param testName テスト名
 * @param testFn テスト関数
 */
export async function runVimOnlyTest(
  denops: Denops,
  testName: string,
  testFn: (denops: Denops) => Promise<void>,
): Promise<void> {
  const env = await detectEnvironment(denops);

  if (env.type !== "vim") {
    console.log(`[SKIP] ${testName}: Vim専用テスト（現在の環境: ${env.type}）`);
    return;
  }

  console.log(`[RUN] ${testName} on Vim ${env.version}`);
  await testFn(denops);
}

/**
 * Neovim環境専用のテスト実行ヘルパー
 *
 * @param denops Denopsインスタンス
 * @param testName テスト名
 * @param testFn テスト関数
 */
export async function runNeovimOnlyTest(
  denops: Denops,
  testName: string,
  testFn: (denops: Denops) => Promise<void>,
): Promise<void> {
  const env = await detectEnvironment(denops);

  if (env.type !== "nvim") {
    console.log(`[SKIP] ${testName}: Neovim専用テスト（現在の環境: ${env.type}）`);
    return;
  }

  console.log(`[RUN] ${testName} on Neovim ${env.version}`);
  await testFn(denops);
}

/**
 * 環境別の処理を実行
 *
 * @param denops Denopsインスタンス
 * @param vimFn Vim環境での実行関数
 * @param neovimFn Neovim環境での実行関数
 * @returns 実行結果
 */
export async function runByEnvironment<T>(
  denops: Denops,
  vimFn: (denops: Denops) => Promise<T>,
  neovimFn: (denops: Denops) => Promise<T>,
): Promise<T> {
  const isVim = await isVimEnvironment(denops);
  return isVim ? await vimFn(denops) : await neovimFn(denops);
}

/**
 * 環境機能の検証ヘルパー
 *
 * @param denops Denopsインスタンス
 * @returns 検証結果
 */
export async function validateEnvironmentFeatures(denops: Denops): Promise<{
  valid: boolean;
  errors: string[];
}> {
  const env = await detectEnvironment(denops);
  const errors: string[] = [];

  if (env.type === "vim") {
    // Vim環境では popup_create が必須
    if (!env.hasPopup) {
      errors.push("Vim環境でpopup_create()が利用できません（Vim 8.1+が必要）");
    }
  } else {
    // Neovim環境では extmark が必須
    if (!env.hasExtmark) {
      errors.push("Neovim環境でnvim_buf_set_extmark()が利用できません");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * テスト用の環境情報を表示
 *
 * @param denops Denopsインスタンス
 */
export async function printEnvironmentInfo(denops: Denops): Promise<void> {
  const env = await detectEnvironment(denops);

  console.log("=== 環境情報 ===");
  console.log(`タイプ: ${env.type}`);
  console.log(`バージョン: ${env.version}`);
  console.log(`popup_create: ${env.hasPopup ? "✓" : "✗"}`);
  console.log(`floating window: ${env.hasFloatingWindow ? "✓" : "✗"}`);
  console.log(`extmark: ${env.hasExtmark ? "✓" : "✗"}`);
  console.log("================");
}

/**
 * モック環境マネージャー（テスト用）
 */
export class MockEnvironmentManager {
  private originalEnv?: EnvironmentInfo;

  /**
   * 環境をモック（現在は実装なし、将来の拡張用）
   *
   * @param mockEnv モックする環境情報
   */
  mockEnvironment(_mockEnv: Partial<EnvironmentInfo>): void {
    // 注: 実際のVim/Neovimの環境をモックすることは困難
    // このメソッドは将来の拡張用プレースホルダー
    console.warn("mockEnvironment: 環境のモックは現在サポートされていません");
  }

  /**
   * モックを解除して元の環境に戻す
   */
  restoreEnvironment(): void {
    // プレースホルダー
  }
}
