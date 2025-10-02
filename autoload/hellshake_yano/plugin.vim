" autoload/hellshake_yano/plugin.vim - プラグイン制御
" Author: hellshake-yano
" License: MIT
"
" このモジュールはプラグインの有効化/無効化を担当します
" - hellshake_yano#plugin#enable() - プラグインを有効化
" - hellshake_yano#plugin#disable() - プラグインを無効化
" - hellshake_yano#plugin#toggle() - プラグインの有効/無効を切り替え
" - hellshake_yano#plugin#on_buf_enter() - バッファ進入時の処理
" - hellshake_yano#plugin#on_buf_leave() - バッファ離脱時の処理

" 保存と復元
let s:save_cpo = &cpo
set cpo&vim

"=============================================================================
" 内部関数
"=============================================================================

" バッファ番号を取得
function! s:bufnr() abort
  return bufnr('%')
endfunction

"=============================================================================
" 公開関数
"=============================================================================

" プラグインを有効化
function! hellshake_yano#plugin#enable() abort
  let g:hellshake_yano.enabled = v:true

  " マッピングを再設定
  if exists('*hellshake_yano#setup_motion_mappings')
    call hellshake_yano#setup_motion_mappings()
  endif

  echo '[hellshake-yano] Enabled'
endfunction

" プラグインを無効化
function! hellshake_yano#plugin#disable() abort
  let g:hellshake_yano.enabled = v:false

  " マッピングを解除（内部関数を直接呼べないため、公開関数経由で呼ぶ）
  " Note: clear_motion_mappingsは内部関数のため、後で対応が必要
  " 一時的に、グローバル設定を無効化することで対応

  " ヒントを非表示
  if exists('*hellshake_yano#state#is_hints_visible') && hellshake_yano#state#is_hints_visible()
    if exists('*hellshake_yano#hide')
      call hellshake_yano#hide()
    endif
  endif

  " カウントをリセット
  if exists('*hellshake_yano#reset_count')
    call hellshake_yano#reset_count()
  endif

  echo '[hellshake-yano] Disabled'
endfunction

" プラグインの有効/無効を切り替え
function! hellshake_yano#plugin#toggle() abort
  if g:hellshake_yano.enabled
    call hellshake_yano#plugin#disable()
  else
    call hellshake_yano#plugin#enable()
  endif
endfunction

" バッファ進入時の処理
function! hellshake_yano#plugin#on_buf_enter() abort
  let bufnr = s:bufnr()
  if exists('*hellshake_yano#state#init_buffer_state')
    call hellshake_yano#state#init_buffer_state(bufnr)
  endif
endfunction

" バッファ離脱時の処理
function! hellshake_yano#plugin#on_buf_leave() abort
  " ヒントが表示されていれば非表示にする
  if exists('*hellshake_yano#state#is_hints_visible') && hellshake_yano#state#is_hints_visible()
    if exists('*hellshake_yano#hide')
      call hellshake_yano#hide()
    endif
  endif
endfunction

" 保存と復元
let &cpo = s:save_cpo
unlet s:save_cpo
