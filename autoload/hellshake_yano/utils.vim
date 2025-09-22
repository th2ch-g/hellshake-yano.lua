" autoload/hellshake_yano/utils.vim - 共通ユーティリティ関数
" Author: hellshake-yano
" License: MIT

" 保存と復元
let s:save_cpo = &cpo
set cpo&vim

"=============================================================================
" エラー処理・共通ユーティリティ
"=============================================================================

" エラーメッセージを統一形式で表示する関数
" @param message エラーメッセージ (string)
" または context, exception (2つの引数の場合は自動でフォーマット)
function! hellshake_yano#utils#show_error(...) abort
  if a:0 == 1
    let message = a:1
  elseif a:0 == 2
    let message = printf('[hellshake-yano] Error: %s: %s', a:1, a:2)
  else
    let message = '[hellshake-yano] Error: Invalid error arguments'
  endif

  echohl ErrorMsg
  echomsg message
  echohl None
endfunction

" バッファ番号を取得
function! hellshake_yano#utils#bufnr() abort
  return bufnr('%')
endfunction

" 経過時間をミリ秒で取得（高精度）
function! hellshake_yano#utils#get_elapsed_time() abort
  let time_str = reltimestr(reltime())
  return float2nr(str2float(time_str) * 1000.0)
endfunction

" パフォーマンスログ関数（performance_log がtrueの時のみ動作）
function! hellshake_yano#utils#log_performance(operation, time_ms, ...) abort
  if !get(g:hellshake_yano, 'performance_log', v:false)
    return
  endif

  let bufnr = hellshake_yano#utils#bufnr()
  let extra_info = a:0 > 0 ? a:1 : {}

  let log_entry = printf('[hellshake-yano:PERF] %s buf:%d time:%dms',
        \ a:operation, bufnr, a:time_ms)

  " 追加情報があれば付加
  if !empty(extra_info) && type(extra_info) == v:t_dict
    let log_entry .= ' ' . string(extra_info)
  endif

  " ログ出力（echomsg を使用してメッセージ履歴に保存）
  echomsg log_entry
endfunction

" denopsの準備状態を確認
function! hellshake_yano#utils#is_denops_ready() abort
  return exists('g:hellshake_yano_ready') && g:hellshake_yano_ready
endfunction

" 保存と復元
let &cpo = s:save_cpo
unlet s:save_cpo