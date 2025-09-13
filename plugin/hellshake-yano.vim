" hellshake-yano.vim - denops-based hit-a-hint plugin
" Author: hellshake-yano
" License: MIT

" ロードガード
if exists('g:loaded_hellshake_yano')
  finish
endif
let g:loaded_hellshake_yano = 1

" 保存と復元
let s:save_cpo = &cpo
set cpo&vim

" グローバル設定変数の初期化
if !exists('g:hellshake_yano')
  let g:hellshake_yano = {}
endif

" デフォルト設定
let g:hellshake_yano = extend({
      \ 'markers': split('ABCDEFGHIJKLMNOPQRSTUVWXYZ', '\zs'),
      \ 'motion_count': 3,
      \ 'motion_timeout': 2000,
      \ 'hint_position': 'start',
      \ 'trigger_on_hjkl': v:true,
      \ 'enabled': v:true,
      \ }, g:hellshake_yano, 'keep')

" ハイライトグループの定義
highlight default link HellshakeYanoMarker DiffAdd
highlight default link HellshakeYanoMarkerCurrent DiffText

" denopsの初期化確認
function! s:check_denops() abort
  if !exists('g:loaded_denops')
    echohl WarningMsg
    echomsg '[hellshake-yano] denops.vim is not loaded. Please install denops.vim first.'
    echohl None
    return 0
  endif
  return 1
endfunction

" プラグインの初期化
function! s:initialize() abort
  if !s:check_denops()
    return
  endif

  " denopsプラグインの読み込み
  " denopsは自動的にdenops/*/main.tsを検出するため、
  " 明示的なロードが必要な場合のみdenops#plugin#load()を使用
  try
    let l:script_path = expand('<sfile>:p:h:h') . '/denops/hellshake-yano/main.ts'
    if filereadable(l:script_path)
      call denops#plugin#load('hellshake-yano', l:script_path)
    else
      " ファイルが見つからない場合はdenopsの自動ディスカバリーに任せる
      " 通常、denopsは起動時に自動的にdenops/*/main.tsを検出する
    endif
  catch
    " エラーが発生しても続行（denopsの自動ディスカバリーに任せる）
    " echohl WarningMsg
    " echomsg '[hellshake-yano] Plugin registration failed: ' . v:exception
    " echohl None
  endtry
endfunction

" hjklキーマッピング（初期設定で有効な場合）
if g:hellshake_yano.trigger_on_hjkl && g:hellshake_yano.enabled
  " ノーマルモードでのマッピング
  nnoremap <silent> <expr> h hellshake_yano#motion('h')
  nnoremap <silent> <expr> j hellshake_yano#motion('j')
  nnoremap <silent> <expr> k hellshake_yano#motion('k')
  nnoremap <silent> <expr> l hellshake_yano#motion('l')
endif

" コマンド定義
command! -nargs=0 HellshakeYanoEnable call hellshake_yano#enable()
command! -nargs=0 HellshakeYanoDisable call hellshake_yano#disable()
command! -nargs=0 HellshakeYanoToggle call hellshake_yano#toggle()
command! -nargs=0 HellshakeYanoShow call hellshake_yano#show()
command! -nargs=0 HellshakeYanoHide call hellshake_yano#hide()
command! -nargs=1 HellshakeYanoSetCount call hellshake_yano#set_count(<args>)
command! -nargs=1 HellshakeYanoSetTimeout call hellshake_yano#set_timeout(<args>)

" 自動コマンド
augroup HellshakeYano
  autocmd!
  " モード変更時にカウントをリセット
  autocmd ModeChanged * call hellshake_yano#reset_count()
  " バッファ変更時の処理
  autocmd BufEnter * call hellshake_yano#on_buf_enter()
  autocmd BufLeave * call hellshake_yano#on_buf_leave()
  " denopsプラグインの遅延読み込み
  autocmd User DenopsPluginPost:hellshake-yano call s:on_denops_ready()
augroup END

" denopsプラグインの準備完了時の処理
function! s:on_denops_ready() abort
  " 初期化完了のフラグ
  let g:hellshake_yano_ready = v:true
  
  " 設定をdenops側に送信
  call denops#notify('hellshake-yano', 'updateConfig', [g:hellshake_yano])
endfunction

" プラグインの初期化を遅延実行
" denopsが起動してから初期化する
if exists('g:loaded_denops') && denops#server#status() !=# 'stopped'
  call s:initialize()
else
  " denopsの起動を待ってから初期化
  augroup HellshakeYanoInit
    autocmd!
    autocmd User DenopsPluginPost:* ++once call s:initialize()
    autocmd User DenopsReady ++once call s:initialize()
  augroup END
endif

" 保存と復元
let &cpo = s:save_cpo
unlet s:save_cpo
