" autoload/hellshake_yano.vim - 自動読み込み関数
" Author: hellshake-yano
" License: MIT

" 保存と復元
let s:save_cpo = &cpo
set cpo&vim

" スクリプトローカル変数
let s:motion_count = {}  " バッファごとの移動カウント
let s:last_motion_time = {}  " バッファごとの最後の移動時刻
let s:timer_id = {}  " バッファごとのタイマーID
let s:hints_visible = v:false  " ヒント表示状態

" バッファ番号を取得
function! s:bufnr() abort
  return bufnr('%')
endfunction

" 移動カウントの初期化
function! s:init_count(bufnr) abort
  if !has_key(s:motion_count, a:bufnr)
    let s:motion_count[a:bufnr] = 0
    let s:last_motion_time[a:bufnr] = 0
  endif
endfunction

" hjkl移動時の処理
function! hellshake_yano#motion(key) abort
  " プラグインが無効な場合は通常の動作
  if !get(g:hellshake_yano, 'enabled', v:true)
    return a:key
  endif

  let bufnr = s:bufnr()
  call s:init_count(bufnr)

  " 既存のタイマーをクリア
  if has_key(s:timer_id, bufnr)
    call timer_stop(s:timer_id[bufnr])
    unlet s:timer_id[bufnr]
  endif

  " カウントを増加
  let s:motion_count[bufnr] += 1
  let s:last_motion_time[bufnr] = reltime()

  " 指定回数に達したらヒント表示
  if s:motion_count[bufnr] >= g:hellshake_yano.motion_count
    call s:reset_count(bufnr)
    call s:trigger_hints()
  else
    " タイムアウト用タイマーを設定
    let s:timer_id[bufnr] = timer_start(
          \ g:hellshake_yano.motion_timeout,
          \ {-> s:reset_count(bufnr)})
  endif

  " 元のキーの動作を返す
  return a:key
endfunction

" カウントのリセット
function! s:reset_count(bufnr) abort
  if has_key(s:motion_count, a:bufnr)
    let s:motion_count[a:bufnr] = 0
  endif
  if has_key(s:timer_id, a:bufnr)
    call timer_stop(s:timer_id[a:bufnr])
    unlet s:timer_id[a:bufnr]
  endif
endfunction

" 全バッファのカウントをリセット
function! hellshake_yano#reset_count() abort
  for bufnr in keys(s:motion_count)
    call s:reset_count(str2nr(bufnr))
  endfor
endfunction

" ヒントをトリガー
function! s:trigger_hints() abort
  " denopsが準備できているか確認
  if !exists('g:hellshake_yano_ready') || !g:hellshake_yano_ready
    return
  endif

  " denops側の関数を呼び出し
  try
    call denops#notify('hellshake-yano', 'showHints', [])
    let s:hints_visible = v:true
  catch
    echohl ErrorMsg
    echomsg '[hellshake-yano] Failed to show hints: ' . v:exception
    echohl None
  endtry
endfunction

" ヒントを表示
function! hellshake_yano#show() abort
  call s:trigger_hints()
endfunction

" ヒントを非表示
function! hellshake_yano#hide() abort
  if !exists('g:hellshake_yano_ready') || !g:hellshake_yano_ready
    return
  endif

  try
    call denops#notify('hellshake-yano', 'hideHints', [])
    let s:hints_visible = v:false
  catch
    echohl ErrorMsg
    echomsg '[hellshake-yano] Failed to hide hints: ' . v:exception
    echohl None
  endtry
endfunction

" プラグインを有効化
function! hellshake_yano#enable() abort
  let g:hellshake_yano.enabled = v:true
  
  " マッピングを再設定
  if g:hellshake_yano.trigger_on_hjkl
    nnoremap <silent> <expr> h hellshake_yano#motion('h')
    nnoremap <silent> <expr> j hellshake_yano#motion('j')
    nnoremap <silent> <expr> k hellshake_yano#motion('k')
    nnoremap <silent> <expr> l hellshake_yano#motion('l')
  endif
  
  echo '[hellshake-yano] Enabled'
endfunction

" プラグインを無効化
function! hellshake_yano#disable() abort
  let g:hellshake_yano.enabled = v:false
  
  " マッピングを解除
  silent! nunmap h
  silent! nunmap j
  silent! nunmap k
  silent! nunmap l
  
  " ヒントを非表示
  if s:hints_visible
    call hellshake_yano#hide()
  endif
  
  " カウントをリセット
  call hellshake_yano#reset_count()
  
  echo '[hellshake-yano] Disabled'
endfunction

" プラグインの有効/無効を切り替え
function! hellshake_yano#toggle() abort
  if g:hellshake_yano.enabled
    call hellshake_yano#disable()
  else
    call hellshake_yano#enable()
  endif
endfunction

" 移動カウント数を設定
function! hellshake_yano#set_count(count) abort
  if a:count > 0
    let g:hellshake_yano.motion_count = a:count
    call hellshake_yano#reset_count()
    
    " denops側に設定を通知
    if exists('g:hellshake_yano_ready') && g:hellshake_yano_ready
      call denops#notify('hellshake-yano', 'updateConfig', [g:hellshake_yano])
    endif
    
    echo printf('[hellshake-yano] Motion count set to %d', a:count)
  else
    echohl ErrorMsg
    echomsg '[hellshake-yano] Count must be greater than 0'
    echohl None
  endif
endfunction

" タイムアウト時間を設定
function! hellshake_yano#set_timeout(timeout) abort
  if a:timeout > 0
    let g:hellshake_yano.motion_timeout = a:timeout
    call hellshake_yano#reset_count()
    
    " denops側に設定を通知
    if exists('g:hellshake_yano_ready') && g:hellshake_yano_ready
      call denops#notify('hellshake-yano', 'updateConfig', [g:hellshake_yano])
    endif
    
    echo printf('[hellshake-yano] Timeout set to %dms', a:timeout)
  else
    echohl ErrorMsg
    echomsg '[hellshake-yano] Timeout must be greater than 0'
    echohl None
  endif
endfunction

" バッファ進入時の処理
function! hellshake_yano#on_buf_enter() abort
  let bufnr = s:bufnr()
  call s:init_count(bufnr)
endfunction

" バッファ離脱時の処理
function! hellshake_yano#on_buf_leave() abort
  " ヒントが表示されていれば非表示にする
  if s:hints_visible
    call hellshake_yano#hide()
  endif
endfunction

" デバッグ情報を表示
function! hellshake_yano#debug() abort
  let bufnr = s:bufnr()
  call s:init_count(bufnr)
  
  echo '=== hellshake-yano Debug Info ==='
  echo 'Enabled: ' . g:hellshake_yano.enabled
  echo 'Motion count threshold: ' . g:hellshake_yano.motion_count
  echo 'Timeout: ' . g:hellshake_yano.motion_timeout . 'ms'
  echo 'Current buffer: ' . bufnr
  echo 'Current count: ' . s:motion_count[bufnr]
  echo 'Hints visible: ' . s:hints_visible
  echo 'Denops ready: ' . (exists('g:hellshake_yano_ready') ? g:hellshake_yano_ready : 'false')
endfunction

" 保存と復元
let &cpo = s:save_cpo
unlet s:save_cpo
