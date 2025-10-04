" autoload/hellshake_yano.vim - 後方互換性レイヤー
" 後方互換性のための最小限のラッパー関数のみを提供

let s:save_cpo = &cpo
set cpo&vim

" utils.vim
function! hellshake_yano#show_error(...) abort
  return call('hellshake_yano#utils#show_error', a:000)
endfunction

" motion.vim
function! hellshake_yano#motion(key) abort
  return hellshake_yano#motion#process(a:key)
endfunction

function! hellshake_yano#visual_motion(key) abort
  return hellshake_yano#motion#visual(a:key)
endfunction

" hint.vim
function! hellshake_yano#show() abort
  return hellshake_yano#hint#show()
endfunction

function! hellshake_yano#hide() abort
  return hellshake_yano#hint#hide()
endfunction

function! hellshake_yano#show_hints_with_key(key) abort
  return hellshake_yano#hint#show_hints_with_key(a:key)
endfunction

" plugin.vim
function! hellshake_yano#enable() abort
  return hellshake_yano#plugin#enable()
endfunction

function! hellshake_yano#disable() abort
  return hellshake_yano#plugin#disable()
endfunction

function! hellshake_yano#toggle() abort
  return hellshake_yano#plugin#toggle()
endfunction

" debug.vim - テスト用関数（外部から直接アクセス可能にする）
function! hellshake_yano#debug_get_key_count(bufnr, key) abort
  return hellshake_yano#debug#get_key_count(a:bufnr, a:key)
endfunction

function! hellshake_yano#debug_get_motion_count_for_key(key) abort
  return hellshake_yano#debug#get_motion_count_for_key(a:key)
endfunction

function! hellshake_yano#debug_should_trigger_hints_for_key(bufnr, key) abort
  return hellshake_yano#debug#should_trigger_hints_for_key(a:bufnr, a:key)
endfunction

function! hellshake_yano#debug_increment_key_count(bufnr, key) abort
  call hellshake_yano#debug#increment_key_count(a:bufnr, a:key)
endfunction

function! hellshake_yano#debug_reset_key_count(bufnr, key) abort
  call hellshake_yano#debug#reset_key_count(a:bufnr, a:key)
endfunction

" 保存と復元
let &cpo = s:save_cpo
unlet s:save_cpo
