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
" Restore cpoptions
"=============================================================================

let &cpo = s:save_cpo
unlet s:save_cpo
