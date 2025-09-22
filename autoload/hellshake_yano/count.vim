" autoload/hellshake_yano/count.vim - カウント管理関数
" Author: hellshake-yano
" License: MIT

" 保存と復元
let s:save_cpo = &cpo
set cpo&vim

"=============================================================================
" カウント管理関数群
"=============================================================================

" キー別カウントの初期化（最適化版）
function! hellshake_yano#count#init_key_count(bufnr, key) abort
  if !has_key(g:hellshake_yano_internal.motion_count, a:bufnr)
    let g:hellshake_yano_internal.motion_count[a:bufnr] = {a:key: 0}
  elseif !has_key(g:hellshake_yano_internal.motion_count[a:bufnr], a:key)
    let g:hellshake_yano_internal.motion_count[a:bufnr][a:key] = 0
  endif
endfunction

" キー別カウントを取得
function! hellshake_yano#count#get_key_count(bufnr, key) abort
  if has_key(g:hellshake_yano_internal.motion_count, a:bufnr) &&
        \ has_key(g:hellshake_yano_internal.motion_count[a:bufnr], a:key)
    return g:hellshake_yano_internal.motion_count[a:bufnr][a:key]
  endif
  return 0
endfunction

" キー別カウントを増加
function! hellshake_yano#count#increment_key_count(bufnr, key) abort
  call hellshake_yano#count#init_key_count(a:bufnr, a:key)
  let g:hellshake_yano_internal.motion_count[a:bufnr][a:key] += 1
endfunction

" キー別カウントをリセット
function! hellshake_yano#count#reset_key_count(bufnr, key) abort
  if has_key(g:hellshake_yano_internal.motion_count, a:bufnr) &&
        \ has_key(g:hellshake_yano_internal.motion_count[a:bufnr], a:key)
    let g:hellshake_yano_internal.motion_count[a:bufnr][a:key] = 0
  endif
endfunction

" バッファの全カウントをリセット
function! hellshake_yano#count#reset_all_counts(bufnr) abort
  if has_key(g:hellshake_yano_internal.motion_count, a:bufnr)
    " 新しい辞書構造の場合は全キーをリセット
    if type(g:hellshake_yano_internal.motion_count[a:bufnr]) == v:t_dict
      for key in keys(g:hellshake_yano_internal.motion_count[a:bufnr])
        let g:hellshake_yano_internal.motion_count[a:bufnr][key] = 0
      endfor
    else
      " 古い構造の場合（migration中）
      let g:hellshake_yano_internal.motion_count[a:bufnr] = 0
    endif
  endif
endfunction

" 全バッファのカウントをリセット
function! hellshake_yano#count#reset_all_buffers() abort
  for bufnr in keys(g:hellshake_yano_internal.motion_count)
    call hellshake_yano#count#reset_all_counts(str2nr(bufnr))
  endfor
endfunction

" キー別モーションカウント処理
function! hellshake_yano#count#process_motion_count_for_key(bufnr, key) abort
  " 既存のタイマーをクリア（キー別）
  call hellshake_yano#timer#stop_and_clear_timer_for_key(a:bufnr, a:key)

  " キー別カウントを増加
  call hellshake_yano#count#increment_key_count(a:bufnr, a:key)
  call hellshake_yano#state#set_last_motion_time(a:bufnr, reltime())
endfunction

" 保存と復元
let &cpo = s:save_cpo
unlet s:save_cpo