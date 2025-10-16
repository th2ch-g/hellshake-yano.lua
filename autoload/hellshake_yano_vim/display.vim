" autoload/hellshake_yano_vim/display.vim - Popup/Extmark 表示モジュール
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: GREEN
" Process4: Popup表示の実装
"
" このモジュールはヒントの画面表示を担当します。
" Vim 8.0+ では popup_create() を使用し、Neovim では nvim_buf_set_extmark() を使用します。

" スクリプトローカル変数の定義
let s:save_cpo = &cpo
set cpo&vim

" popup/extmark ID の配列（クリーンアップ用）
let s:popup_ids = []

" Neovim の namespace ID（Neovim の場合のみ使用）
let s:ns_id = -1

" hellshake_yano_vim#display#show_hint(lnum, col, hint) - ヒント表示
"
" 目的:
"   - 指定された位置にヒント文字を表示
"   - Vim では popup_create() を使用
"   - Neovim では nvim_buf_set_extmark() を使用
"
" アルゴリズム:
"   1. Vim/Neovim の判定
"   2. 該当するAPIを使用してヒントを表示
"   3. popup/extmark ID を s:popup_ids に保存
"   4. ID を返す
"
" @param lnum Number 行番号（1-indexed）
" @param col Number 列番号（1-indexed）
" @param hint String 表示するヒント文字（例: 'a', 's', 'd'）
" @return Number popup ID (Vim) または extmark ID (Neovim)
"
" 使用例:
"   let popup_id = hellshake_yano_vim#display#show_hint(10, 5, 'a')
"
" 注意事項:
"   - Vim では popup_create() が必要（Vim 8.2+）
"   - Neovim では nvim_buf_set_extmark() が必要（Neovim 0.5+）
function! hellshake_yano_vim#display#show_hint(lnum, col, hint) abort
  if has('nvim')
    " Neovim の場合: nvim_buf_set_extmark() を使用
    return s:show_hint_neovim(a:lnum, a:col, a:hint)
  else
    " Vim の場合: popup_create() を使用
    return s:show_hint_vim(a:lnum, a:col, a:hint)
  endif
endfunction

" s:show_hint_vim(lnum, col, hint) - Vim での popup 表示（内部関数）
"
" 目的:
"   - Vim 8.2+ の popup_create() を使用してヒントを表示
"   - popup ID を s:popup_ids に保存して後でクリーンアップできるようにする
"
" @param lnum Number 行番号（1-indexed）
" @param col Number 列番号（1-indexed）
" @param hint String 表示するヒント文字
" @return Number popup ID（失敗時は -1）
"
" エラーハンドリング:
"   - popup_create() が存在しない場合（Vim 8.1以前）は警告を表示して -1 を返す
function! s:show_hint_vim(lnum, col, hint) abort
  " popup_create() が利用可能かチェック
  if !exists('*popup_create')
    call s:show_error('popup_create() is not available. Please use Vim 8.2 or later.')
    return -1
  endif

  " popup を作成
  let l:popup_id = popup_create(a:hint, {
    \ 'line': a:lnum,
    \ 'col': a:col,
    \ 'width': strlen(a:hint),
    \ 'height': 1,
    \ 'highlight': 'HintMarker',
    \ 'zindex': 1000,
    \ 'wrap': 0
  \ })

  " popup ID を保存（クリーンアップ用）
  call add(s:popup_ids, l:popup_id)

  return l:popup_id
endfunction

" s:show_hint_neovim(lnum, col, hint) - Neovim での extmark 表示（内部関数）
"
" 目的:
"   - Neovim の nvim_buf_set_extmark() を使用してヒントを表示
"   - Virtual text を overlay モードで表示し、既存テキストに重ねる
"   - extmark ID を s:popup_ids に保存して後でクリーンアップできるようにする
"
" @param lnum Number 行番号（1-indexed）
" @param col Number 列番号（1-indexed）
" @param hint String 表示するヒント文字
" @return Number extmark ID
"
" 注意事項:
"   - Neovim の API は 0-indexed なので、lnum と col から 1 を引く必要がある
"   - namespace は初回呼び出し時に作成され、以降は再利用される
function! s:show_hint_neovim(lnum, col, hint) abort
  " namespace が未初期化の場合は作成
  if s:ns_id == -1
    let s:ns_id = nvim_create_namespace('hellshake_yano_vim_hint')
  endif

  " extmark を作成（行・列は 0-indexed に変換）
  let l:extmark_id = nvim_buf_set_extmark(0, s:ns_id, a:lnum - 1, a:col - 1, {
    \ 'virt_text': [[a:hint, 'HintMarker']],
    \ 'virt_text_pos': 'overlay',
    \ 'priority': 1000
  \ })

  " extmark ID を保存（クリーンアップ用）
  call add(s:popup_ids, l:extmark_id)

  return l:extmark_id
endfunction

" hellshake_yano_vim#display#hide_all() - 全 popup/extmark を削除
"
" 目的:
"   - 表示中の全ての popup/extmark を削除
"   - s:popup_ids 配列をクリア
"
" アルゴリズム:
"   1. Vim/Neovim の判定
"   2. 該当するAPIを使用して全 popup/extmark を削除
"   3. s:popup_ids をクリア
"
" 使用例:
"   call hellshake_yano_vim#display#hide_all()
"
" 注意事項:
"   - Vim では popup_close() を使用
"   - Neovim では nvim_buf_clear_namespace() を使用
function! hellshake_yano_vim#display#hide_all() abort
  if has('nvim')
    " Neovim の場合: namespace 全体をクリア
    if s:ns_id != -1
      call nvim_buf_clear_namespace(0, s:ns_id, 0, -1)
    endif
  else
    " Vim の場合: 各 popup を個別に閉じる
    for l:popup_id in s:popup_ids
      if exists('*popup_close')
        call popup_close(l:popup_id)
      endif
    endfor
  endif

  " popup_ids 配列をクリア
  let s:popup_ids = []
endfunction

" hellshake_yano_vim#display#get_popup_count() - 表示中の popup/extmark 数を取得（テスト用）
"
" 目的:
"   - ユニットテストで表示中のヒント数を検証するために使用
"   - 本番環境では使用しない
"
" @return Number 表示中の popup/extmark 数
function! hellshake_yano_vim#display#get_popup_count() abort
  return len(s:popup_ids)
endfunction

" ===========================
" 内部ヘルパー関数
" ===========================

" s:show_error(message) - エラーメッセージを表示（統一されたフォーマット）
"
" 目的:
"   - エラーメッセージを統一されたフォーマットで表示
"   - プラグイン名をプレフィックスとして付与
"
" @param message String エラーメッセージ
function! s:show_error(message) abort
  echohl ErrorMsg
  echomsg 'hellshake_yano_vim#display: ' . a:message
  echohl None
endfunction

" ===========================
" ハイライトグループの定義
" ===========================

" HintMarker ハイライトグループが未定義の場合は定義
" 白文字・赤背景・太字でヒントを目立たせる
if !hlexists('HintMarker')
  highlight default HintMarker ctermfg=White guifg=White ctermbg=Red guibg=Red cterm=bold gui=bold
endif

let &cpo = s:save_cpo
unlet s:save_cpo
