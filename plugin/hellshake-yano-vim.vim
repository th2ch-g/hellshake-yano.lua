" hellshake-yano-vim.vim - Pure VimScript implementation of hit-a-hint plugin
" Phase A-1: MVP implementation with TDD approach
" Author: hellshake-yano
" License: MIT
"
" This plugin provides a minimal viable implementation of hint-based jumping
" using pure VimScript, compatible with Vim 8.0+.
" Unlike the denops version (hellshake-yano), this implementation does not
" require external dependencies and uses the hellshake_yano_vim namespace.
"
" Note: For Neovim, use the denops implementation (hellshake-yano.vim) instead.

"=============================================================================
" Editor Guard - Vim 8.0+ only (Neovim uses denops implementation)
"=============================================================================

if has('nvim')
  " Neovimの場合はdenops実装を使用
  finish
endif

"=============================================================================
" Load Guard
"=============================================================================

if exists('g:loaded_hellshake_yano_vim')
  finish
endif
let g:loaded_hellshake_yano_vim = 1

" Save and restore cpoptions
let s:save_cpo = &cpo
set cpo&vim

"=============================================================================
" Version Check
"=============================================================================

" Require Vim 8.0 or later
if !has('patch-8.0.0') && !has('nvim')
  echohl ErrorMsg
  echomsg 'hellshake-yano-vim requires Vim 8.0 or later, or Neovim'
  echohl None
  finish
endif

"=============================================================================
" Initialization Flag
"=============================================================================

" Track whether core#init() has been called
let s:initialized = 0

"=============================================================================
" Command Definitions
"=============================================================================

" Test command: Run all VimScript tests
command! -nargs=0 HellshakeYanoVimTest call s:run_all_tests()

" Show hints command: Display hints at fixed positions
command! -nargs=0 HellshakeYanoVimShow call s:show_hints()

" Hide hints command: Remove all displayed hints
command! -nargs=0 HellshakeYanoVimHide call s:hide_hints()

"=============================================================================
" Command Implementation Functions
"=============================================================================

" Run all tests
function! s:run_all_tests() abort
  try
    " Source the test runner framework
    let l:plugin_root = expand('<sfile>:p:h:h')
    let l:test_runner_path = l:plugin_root . '/tests-vim/hellshake_yano_vim/test_runner.vim'
    if !filereadable(l:test_runner_path)
      echohl ErrorMsg
      echomsg '[hellshake-yano-vim] Error: Test runner not found at ' . l:test_runner_path
      echohl None
      return
    endif
    execute 'source ' . l:test_runner_path

    " Source all test files
    let l:test_dir = l:plugin_root . '/tests-vim/hellshake_yano_vim'
    let l:test_files = [
          \ 'test_core.vim',
          \ 'test_hint_generator.vim',
          \ 'test_display.vim',
          \ 'test_jump.vim',
          \ 'test_input.vim',
          \ 'test_word_detector.vim',
          \ 'test_integration.vim'
          \ ]

    for l:test_file in l:test_files
      let l:test_path = l:test_dir . '/' . l:test_file
      if filereadable(l:test_path)
        execute 'source ' . l:test_path
      else
        echohl WarningMsg
        echomsg '[hellshake-yano-vim] Warning: Test file not found: ' . l:test_file
        echohl None
      endif
    endfor

    " Run all tests
    call RunAllTests()
  catch
    echohl ErrorMsg
    echomsg '[hellshake-yano-vim] Error running tests: ' . v:exception
    echohl None
  endtry
endfunction

" Show hints at fixed positions
function! s:show_hints() abort
  try
    " Initialize on first call
    if !s:initialized
      call hellshake_yano_vim#core#init()
      let s:initialized = 1
    endif

    " Show hints
    call hellshake_yano_vim#core#show()
  catch
    echohl ErrorMsg
    echomsg '[hellshake-yano-vim] Error showing hints: ' . v:exception
    echohl None
  endtry
endfunction

" Hide all hints
function! s:hide_hints() abort
  try
    call hellshake_yano_vim#core#hide()
  catch
    echohl ErrorMsg
    echomsg '[hellshake-yano-vim] Error hiding hints: ' . v:exception
    echohl None
  endtry
endfunction

"=============================================================================
" Motion Key Mappings (Phase A-4)
"=============================================================================
"
" モーション連打検出機能のキーマッピング
" w/b/e キーを連続で押下（連打）したときにヒント表示を自動的にトリガーします。
"
" カスタマイズ方法:
"   以下の例のように、<Plug>マッピングを使用して独自のキーにマッピングできます。
"
"   例: デフォルトのマッピングを無効化して、独自のキーにマッピング
"     let g:hellshake_yano_vim_config = {'motion_enabled': v:false}
"     nmap <Leader>w <Plug>(hellshake-yano-vim-w)
"     nmap <Leader>b <Plug>(hellshake-yano-vim-b)
"     nmap <Leader>e <Plug>(hellshake-yano-vim-e)
"
"   例: 対象キーを変更（デフォルト: ['w', 'b', 'e']）
"     let g:hellshake_yano_vim_config = {'motion_keys': ['w', 'b']}
"

" <Plug>マッピングの定義（常に定義）
nnoremap <silent> <Plug>(hellshake-yano-vim-w)
      \ :<C-u>call hellshake_yano_vim#motion#handle('w')<CR>
nnoremap <silent> <Plug>(hellshake-yano-vim-b)
      \ :<C-u>call hellshake_yano_vim#motion#handle('b')<CR>
nnoremap <silent> <Plug>(hellshake-yano-vim-e)
      \ :<C-u>call hellshake_yano_vim#motion#handle('e')<CR>

" デフォルトマッピングの設定（motion_enabled が true の場合のみ）
if !exists('g:hellshake_yano_vim_config')
  let g:hellshake_yano_vim_config = {}
endif

" config#get() を使用して motion_enabled と motion_keys を取得
" 初期化前なので、直接グローバル変数またはデフォルト値をチェック
let s:motion_enabled = get(g:hellshake_yano_vim_config, 'motion_enabled', v:true)
let s:motion_keys = get(g:hellshake_yano_vim_config, 'motion_keys', ['w', 'b', 'e'])

if s:motion_enabled
  " 対象キーをループしてマッピング
  for s:key in s:motion_keys
    " execute を使って動的にマッピングを生成
    execute printf('nnoremap <silent> %s :<C-u>call hellshake_yano_vim#motion#handle(%s)<CR>',
          \ s:key, string(s:key))
  endfor
endif

" 一時変数のクリーンアップ
unlet s:motion_enabled
unlet s:motion_keys
if exists('s:key')
  unlet s:key
endif

"=============================================================================
" Restore cpoptions
"=============================================================================

let &cpo = s:save_cpo
unlet s:save_cpo
