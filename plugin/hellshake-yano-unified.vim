" hellshake-yano-unified.vim - Unified entry point for hellshake-yano plugin
" Phase B-1: 統合基盤構築
" Author: hellshake-yano
" License: MIT
"
" このファイルは、Denops版とPure VimScript版を統合するエントリーポイントです。
" 環境に応じて最適な実装を自動選択します。
"
" 実装選択ロジック:
" 1. Neovim + Denops利用可能 → Denops版 (hellshake-yano.vim)
" 2. Vim + Denops利用可能 → Phase B-1統合版 (Denops経由でVimScript版を活用)
" 3. Denops利用不可 → Pure VimScript版 (hellshake-yano-vim.vim)

"=============================================================================
" Load Guard
"=============================================================================

if exists('g:loaded_hellshake_yano_unified')
  finish
endif
let g:loaded_hellshake_yano_unified = 1

" Save and restore cpoptions
let s:save_cpo = &cpo
set cpo&vim

"=============================================================================
" Version Check
"=============================================================================

" Require Vim 8.0+ or Neovim
if !has('patch-8.0.0') && !has('nvim')
  echohl ErrorMsg
  echomsg 'hellshake-yano requires Vim 8.0 or later, or Neovim'
  echohl None
  finish
endif

"=============================================================================
" Implementation Selection Logic
"=============================================================================

" ステップ1: Denopsの利用可能性を判定
function! s:IsDenopsAvailable() abort
  " Denopsがロード済みか確認
  if !exists('*denops#server#status')
    return v:false
  endif

  " Denopsサーバーが起動しているか確認
  try
    let l:status = denops#server#status()
    return l:status ==# 'running'
  catch
    return v:false
  endtry
endfunction

" ステップ2: 設定マイグレーションの確認と警告
function! s:CheckConfigMigration() abort
  " 旧VimScript設定 (g:hellshake_yano_vim_config) が存在するか確認
  if exists('g:hellshake_yano_vim_config')
    " 新統合設定 (g:hellshake_yano) が未設定の場合のみ警告
    if !exists('g:hellshake_yano') || empty(g:hellshake_yano)
      echohl WarningMsg
      echo '[hellshake-yano] VimScript設定が検出されました'
      echo '  統合設定 (g:hellshake_yano) への移行を推奨します'
      echohl None

      " ConfigMigratorが利用可能な場合は、マイグレーションガイドを表示
      if s:IsDenopsAvailable() && exists('*denops#request')
        " TODO: ConfigMigratorのshowMigrationGuide()を呼び出し
      endif
    endif
  endif
endfunction

" ステップ3: 実装選択と初期化
function! s:SelectAndInitialize() abort
  let l:denops_available = s:IsDenopsAvailable()

  if has('nvim')
    " Neovim環境
    if l:denops_available
      " Denops版を使用
      runtime plugin/hellshake-yano.vim
      let g:hellshake_yano_implementation = 'denops'
    else
      " Denopsが利用不可の場合はエラー
      echohl ErrorMsg
      echomsg '[hellshake-yano] Neovim requires denops.vim plugin'
      echomsg '  Please install: https://github.com/vim-denops/denops.vim'
      echohl None
      let g:hellshake_yano_implementation = 'none'
    endif
  else
    " Vim環境
    if l:denops_available
      " Phase B-1統合版を使用（Denops経由）
      " TODO: Phase B-1統合版の初期化処理を実装
      runtime plugin/hellshake-yano.vim
      let g:hellshake_yano_implementation = 'denops-unified'
    else
      " Pure VimScript版にフォールバック
      runtime plugin/hellshake-yano-vim.vim
      let g:hellshake_yano_implementation = 'vimscript'

      " VimScript版使用時の通知
      if get(g:, 'hellshake_yano_show_fallback_notice', 1)
        echohl WarningMsg
        echo '[hellshake-yano] Using Pure VimScript implementation'
        echo '  For better performance, install denops.vim'
        echohl None
      endif
    endif
  endif
endfunction

"=============================================================================
" Initialization
"=============================================================================

" グローバル設定変数の早期初期化
if !exists('g:hellshake_yano')
  let g:hellshake_yano = {}
endif

" 設定マイグレーション確認
call s:CheckConfigMigration()

" 実装選択と初期化
call s:SelectAndInitialize()

" 選択された実装を記録
if exists('g:hellshake_yano_implementation')
  if get(g:, 'hellshake_yano_debug', 0)
    echomsg '[hellshake-yano] Using implementation: ' . g:hellshake_yano_implementation
  endif
endif

"=============================================================================
" Cleanup
"=============================================================================

let &cpo = s:save_cpo
unlet s:save_cpo

" vim:set et sw=2 ts=2:
