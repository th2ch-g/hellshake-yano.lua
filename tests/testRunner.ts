import { test as denopsTest } from "@denops/test";
import { fromFileUrl } from "@std/path";
import type { Denops } from "@denops/std";

/**
 * セットアップ関数：テスト環境を初期化
 */
async function setup(denops: Denops) {
  // プラグインのパスを設定
  const runtimepath = fromFileUrl(import.meta.resolve("../"));
  await denops.cmd(`set runtimepath^=${runtimepath}`);

  // hellshake-yano.vimの初期設定
  await denops.cmd(`let g:hellshake_yano = {}`);
  await denops.cmd(`let g:hellshake_yano.motion_count = 3`);
  await denops.cmd(`let g:hellshake_yano.motion_timeout = 2000`);
  await denops.cmd(`let g:hellshake_yano.hint_position = 'start'`);
  await denops.cmd(`let g:hellshake_yano.markers = split('ABCDEFGHIJKLMNOPQRSTUVWXYZ', '\\.\\zs')`);

  // テスト用バッファを作成
  await denops.cmd("enew!");
  await sleep(10);
}

/**
 * テスト実行関数
 * @param name テスト名
 * @param fn テスト関数
 */
export function test(
  name: string,
  fn: (denops: Denops) => Promise<void>,
) {
  // Neovimでテストを実行
  denopsTest("nvim", name, async (denops) => {
    await setup(denops);
    await fn(denops);
  });

  // Vimでもテストを実行（オプション）
  denopsTest("vim", name, async (denops) => {
    await setup(denops);
    await fn(denops);
  });
}

/**
 * ユーティリティ：指定時間待機
 */
export const sleep = (msec: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, msec));

/**
 * ユーティリティ：テストデータ生成
 */
export function generateTestBuffer(denops: Denops, lines: string[]) {
  return denops.call("setline", 1, lines);
}

/**
 * ユーティリティ：カーソル位置を設定
 */
export function setCursor(denops: Denops, line: number, col: number) {
  return denops.call("cursor", line, col);
}

/**
 * ユーティリティ：現在のバッファ内容を取得
 */
export async function getBufferLines(denops: Denops): Promise<string[]> {
  const lineCount = await denops.call("line", "$") as number;
  return await denops.call("getline", 1, lineCount) as string[];
}

/**
 * ユーティリティ：ウィンドウ情報を取得
 */
export async function getWindowInfo(denops: Denops) {
  return {
    topLine: await denops.call("line", "w0") as number,
    bottomLine: await denops.call("line", "w$") as number,
    cursorLine: await denops.call("line", ".") as number,
    cursorCol: await denops.call("col", ".") as number,
  };
}
