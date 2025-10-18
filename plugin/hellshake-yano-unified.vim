" hellshake-yano-unified.vim - 統合エントリーポイント
" Author: hellshake-yano
" License: MIT
"
" Phase B-4: process4 - キーマッピング統合
" 統合版とVimScript版を環境に応じて自動選択するエントリーポイント

" ロードガード
if exists('g:loaded_hellshake_yano_unified')
  finish
endif
let g:loaded_hellshake_yano_unified = 1

" 保存と復元
let s:save_cpo = &cpo
set cpo&vim

"=============================================================================
" 実装選択ロジック
"=============================================================================

" s:select_implementation() - 実装の自動選択
"
" 環境に応じて最適な実装を選択:
" 1. Denopsが利用可能な場合は統合版を使用
" 2. Denopsが無い場合はPure VimScript版にフォールバック
"
" @return String 選択された実装 ('denops-unified' または 'vimscript-pure')
function! s:select_implementation() abort
  " 1. Denopsが利用可能な場合は統合版を使用
  if exists('g:loaded_denops') && denops#server#status() !=# 'stopped'
    " Vim環境でもDenops実装を使用
    return 'denops-unified'
  endif

  " 2. Denopsが無い場合はPure VimScript版にフォールバック
  if has('nvim')
    " NeovimでDenopsが無い場合は警告
    echohl WarningMsg
    echo '[hellshake-yano] Denops is not available. Some features may be limited.'
    echohl None
  endif

  return 'vimscript-pure'
endfunction

"=============================================================================
" 初期化関数
"=============================================================================

" s:initialize() - プラグインの初期化
"
" 選択された実装に基づいてプラグインを初期化
function! s:initialize() abort
  let l:impl = s:select_implementation()

  if l:impl ==# 'denops-unified'
    " 統合版の初期化
    call s:initialize_unified()
  else
    " Pure VimScript版の初期化
    call hellshake_yano_vim#core#init()
    call s:setup_vimscript_mappings()
  endif

  " 設定マイグレーション
  call s:migrate_config()
endfunction

" s:initialize_unified() - 統合版の初期化
"
" Denopsを使用した統合版の初期化処理
function! s:initialize_unified() abort
  " 設定の統一
  call denops#notify('hellshake-yano', 'unifyConfig', [
    \ get(g:, 'hellshake_yano_vim_config', {}),
    \ get(g:, 'hellshake_yano', {})
  \ ])

  " コマンド定義
  command! -nargs=0 HellshakeYanoShow
    \ call denops#notify('hellshake-yano', 'showHints', [])
  command! -nargs=0 HellshakeYanoHide
    \ call denops#notify('hellshake-yano', 'hideHints', [])
  command! -nargs=0 HellshakeYanoToggle
    \ call denops#notify('hellshake-yano', 'toggle', [])

  " キーマッピング
  call s:setup_unified_mappings()
endfunction

"=============================================================================
" 設定マイグレーション
"=============================================================================

" s:migrate_config() - 設定のマイグレーション
"
" 旧設定（g:hellshake_yano_vim_config）を新設定（g:hellshake_yano）に自動変換
function! s:migrate_config() abort
  " g:hellshake_yano_vim_config が存在し、g:hellshake_yano が存在しない場合
  if exists('g:hellshake_yano_vim_config') && !exists('g:hellshake_yano')
    let g:hellshake_yano = {}

    " 設定の変換
    for [old_key, new_key] in [
      \ ['hint_chars', 'markers'],
      \ ['motion_threshold', 'motionCount'],
      \ ['motion_timeout_ms', 'motionTimeout'],
      \ ['motion_keys', 'countedMotions'],
      \ ['motion_enabled', 'motionCounterEnabled'],
      \ ['visual_mode_enabled', 'visualModeEnabled'],
      \ ['max_hints', 'maxHints'],
      \ ['min_word_length', 'defaultMinWordLength'],
      \ ['use_japanese', 'useJapanese'],
      \ ['debug_mode', 'debugMode'],
    \ ]
      if has_key(g:hellshake_yano_vim_config, old_key)
        let g:hellshake_yano[new_key] = g:hellshake_yano_vim_config[old_key]
      endif
    endfor

    " 廃止予定警告
    echohl WarningMsg
    echo '[hellshake-yano] Note: g:hellshake_yano_vim_config is deprecated.'
    echo 'Your settings have been migrated to g:hellshake_yano.'
    echo 'Please update your configuration to use g:hellshake_yano directly.'
    echohl None
  endif
endfunction

"=============================================================================
" マッピング設定関数
"=============================================================================

" s:setup_unified_mappings() - 統合版のマッピング設定
"
" モーション検出マッピングとビジュアルモードマッピングを設定
function! s:setup_unified_mappings() abort
  " モーション検出マッピング
  if get(g:hellshake_yano, 'motionCounterEnabled', v:true)
    for key in get(g:hellshake_yano, 'countedMotions', ['w', 'b', 'e'])
      execute printf('nnoremap <silent> %s :<C-u>call <SID>handle_motion("%s")<CR>',
        \ key, key)
    endfor
  endif

  " ビジュアルモード対応
  if get(g:hellshake_yano, 'visualModeEnabled', v:true)
    xnoremap <silent> <Leader>h :<C-u>call <SID>show_hints_visual()<CR>
  endif
endfunction

" s:setup_vimscript_mappings() - VimScript版のマッピング設定
"
" Pure VimScript版のマッピング設定（フォールバック）
function! s:setup_vimscript_mappings() abort
  " モーション検出マッピング
  if get(g:hellshake_yano_vim_config, 'motion_enabled', v:true)
    for key in get(g:hellshake_yano_vim_config, 'motion_keys', ['w', 'b', 'e'])
      execute printf('nnoremap <silent> %s :<C-u>call hellshake_yano_vim#motion#handle("%s")<CR>',
        \ key, key)
    endfor
  endif

  " ビジュアルモード対応
  if get(g:hellshake_yano_vim_config, 'visual_mode_enabled', v:true)
    xnoremap <silent> <Leader>h :<C-u>call hellshake_yano_vim#visual#show()<CR>
  endif
endfunction

" s:handle_motion(key) - モーションハンドラー
"
" モーションキーの処理をDenopsに委譲
"
" @param a:key モーションキー（'w', 'b', 'e'など）
function! s:handle_motion(key) abort
  " Denopsに処理を委譲
  call denops#notify('hellshake-yano', 'handleMotion', [a:key])

  " 通常のモーションも実行
  execute 'normal! ' . a:key
endfunction

" s:show_hints_visual() - ビジュアルモード用ヒント表示
"
" ビジュアルモードでヒント表示を呼び出し
function! s:show_hints_visual() abort
  call denops#notify('hellshake-yano', 'showHints', [])
endfunction

"=============================================================================
" 自動ロード設定
"=============================================================================

augroup HellshakeYanoUnified
  autocmd!
  " VimEnter時の自動初期化
  autocmd VimEnter * ++once call s:initialize()
augroup END

" 保存と復元
let &cpo = s:save_cpo
unlet s:save_cpo
