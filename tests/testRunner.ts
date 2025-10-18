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
  await denops.cmd(`let g:hellshake_yano.motionCount = 3`);
  await denops.cmd(`let g:hellshake_yano.motionTimeout = 2000`);
  await denops.cmd(`let g:hellshake_yano.hintPosition = 'start'`);
  await denops.cmd(`let g:hellshake_yano.markers = split('ABCDEFGHIJKLMNOPQRSTUVWXYZ', '\\.\\zs')`);

  // VimScript版の初期設定
  await denops.cmd(`let g:hellshake_yano_vim_config = {}`);
  await denops.cmd(`let g:hellshake_yano_vim_config.hint_chars = 'ASDFJKL'`);
  await denops.cmd(`let g:hellshake_yano_vim_config.motion_enabled = v:true`);
  await denops.cmd(`let g:hellshake_yano_vim_config.motion_threshold = 3`);
  await denops.cmd(`let g:hellshake_yano_vim_config.motion_timeout_ms = 2000`);

  // VimScriptモック関数をセットアップ
  await setupMockVimFunctions(denops);

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

/**
 * ユーティリティ：VimScriptモック関数を設定
 * テスト環境で VimScript関数が利用できない場合のフォールバック
 */
export async function setupMockVimFunctions(denops: Denops) {
  // モック: hellshake_yano_vim#word_detector#detect_visible
  await denops.cmd(`
    if !exists('*hellshake_yano_vim#word_detector#detect_visible')
      function! hellshake_yano_vim#word_detector#detect_visible() abort
        let l:lines = getline(line('w0'), line('w$'))
        let l:words = []
        let l:start_line = line('w0')

        for l:i in range(len(l:lines))
          let l:line = l:lines[l:i]
          let l:lnum = l:start_line + l:i

          let l:matches = matchlist(l:line, '\\\\w\\\\+', 0, 1)
          while !empty(l:matches)
            let l:col = match(l:line, '\\\\w\\\\+', l:matches[0][0]) + 1
            let l:end_col = l:col + len(l:matches[0][0]) - 1
            call add(l:words, {
              \   'text': l:matches[0][0],
              \   'lnum': l:lnum,
              \   'col': l:col,
              \   'end_col': l:end_col
              \ })
            let l:matches = matchlist(l:line, '\\\\w\\\\+', l:col, 1)
          endwhile
        endfor

        return l:words
      endfunction
    endif
  `);
}
