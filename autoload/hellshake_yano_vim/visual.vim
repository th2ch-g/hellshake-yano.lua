" autoload/hellshake_yano_vim/visual.vim - ビジュアルモード対応
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: GREEN
" Process1: visual.vim の最小実装
"
" このモジュールはビジュアルモードでの選択範囲内でヒント表示機能を提供します。
" Phase A-5: ビジュアルモード対応（v/V/Ctrl-v）の実装
" Vim 8.0+ と Neovim の両方で動作します。

" スクリプトローカル変数の定義
let s:save_cpo = &cpo
set cpo&vim

" ビジュアルモード状態の初期値定義
" PLAN.md の仕様に基づくデータ構造
let s:initial_visual_state = {
  \ 'active': v:false,
  \ 'mode': '',
  \ 'start_line': 0,
  \ 'start_col': 0,
  \ 'end_line': 0,
  \ 'end_col': 0
\ }

" ビジュアルモード状態変数（スクリプトローカル）
let s:visual_state = copy(s:initial_visual_state)

" hellshake_yano_vim#visual#init() - 状態変数の初期化
"
" 目的:
"   - s:visual_state を初期値にリセット
"   - プラグインの起動時や再初期化時に呼び出される
"
" アルゴリズム:
"   - 初期状態の定義をコピーして状態変数に設定
"   - 重複を避けるため、s:initial_visual_stateを参照
"
" @return なし
"
" 使用例:
"   call hellshake_yano_vim#visual#init()
"   " 状態変数が初期化される
function! hellshake_yano_vim#visual#init() abort
  let s:visual_state = copy(s:initial_visual_state)
endfunction

" hellshake_yano_vim#visual#get_state() - 状態変数の取得（テスト用）
"
" 目的:
"   - スクリプトローカル変数 s:visual_state への読み取り専用アクセスを提供
"   - 主にユニットテストで状態を検証するために使用
"
" @return Dictionary s:visual_state のコピー
function! hellshake_yano_vim#visual#get_state() abort
  return deepcopy(s:visual_state)
endfunction

" hellshake_yano_vim#visual#show() - ビジュアルモードでヒント表示
"
" 目的:
"   - ビジュアルモード選択範囲内の単語にヒントを表示
"   - 文字単位（v）、行単位（V）、ブロック単位（Ctrl-v）に対応
"
" 処理フロー:
"   1. mode() でビジュアルモードタイプを取得
"   2. ビジュアルモード以外で呼ばれた場合はエラー
"   3. getpos("'<") と getpos("'>") で選択範囲を取得
"   4. 選択範囲の妥当性チェック
"   5. 状態変数に選択範囲を保存
"   6. core#show() を呼び出してヒント表示
"
" エラーハンドリング:
"   - ビジュアルモード以外で呼ばれた場合は警告メッセージを表示して中断
"   - 選択範囲が不正な場合（start > end）は警告メッセージを表示して中断
"
" @return なし
"
" 使用例:
"   " ビジュアルモードで選択後、以下を実行
"   :call hellshake_yano_vim#visual#show()
"
" 注意事項:
"   - ビジュアルモード（v/V/Ctrl-v）でのみ正常に動作
"   - Phase A-5 MVP: 現時点では全画面内の単語を表示（範囲フィルタリングは次フェーズ）
function! hellshake_yano_vim#visual#show() abort
  " 1. 現在のモードを取得
  let l:current_mode = mode()

  " 2. ビジュアルモードチェック（Phase A-5 process1 完全実装）
  if l:current_mode !~# '[vV\x16]'
    " \x16 = Ctrl-v (ブロック単位ビジュアルモード)
    call s:show_warning('visual#show() must be called in visual mode (current mode: ' . l:current_mode . ')')
    return
  endif

  " 3. 選択範囲を取得
  let l:start_pos = getpos("'<")
  let l:end_pos = getpos("'>")

  " 4. 選択範囲の妥当性チェック
  if l:start_pos[1] > l:end_pos[1]
    call s:show_warning('invalid visual selection: start_line > end_line')
    return
  endif

  if l:start_pos[1] == 0 || l:end_pos[1] == 0
    call s:show_warning('invalid visual selection: line number is 0')
    return
  endif

  " 5. 選択範囲を状態変数に保存
  let s:visual_state.active = v:true
  let s:visual_state.mode = l:current_mode
  let s:visual_state.start_line = l:start_pos[1]
  let s:visual_state.start_col = l:start_pos[2]
  let s:visual_state.end_line = l:end_pos[1]
  let s:visual_state.end_col = l:end_pos[2]

  " 6. core#show() を呼び出してヒント表示
  " NOTE: Phase A-5 MVP - 全画面内の単語を表示
  "       選択範囲内のみの単語検出は次のフェーズで実装
  call hellshake_yano_vim#core#show()

  " ジャンプ後に状態をクリア
  let s:visual_state.active = v:false
endfunction

" ===========================
" 内部ヘルパー関数
" ===========================

" s:detect_words_in_range(start_line, end_line) - 範囲内の単語を検出
"
" 目的:
"   - 指定された行範囲内の単語を検出
"   - word_detector#detect_visible() を利用し、範囲外の単語を除外
"
" アルゴリズム:
"   1. word_detector#detect_visible() で画面内の全単語を取得
"   2. start_line ～ end_line の範囲内の単語のみをフィルタリング
"   3. フィルタリングされた単語リストを返す
"
" @param start_line Number 開始行番号（1-indexed）
" @param end_line Number 終了行番号（1-indexed）
" @return List<Dictionary> 範囲内の単語リスト
"
" Phase D-2 Sub0.1: フィルタリング層の堅牢性向上
"   - 空配列チェックを追加
"   - word_filter.vim との互換性を確保
"   - Sub2実装時に word_filter#apply() を使用する準備
function! s:detect_words_in_range(start_line, end_line) abort
  " 全画面内の単語を取得
  let l:all_words = hellshake_yano_vim#word_detector#detect_visible()

  " Phase D-2 Sub0.1: 空配列チェック（堅牢性向上）
  if empty(l:all_words)
    return []
  endif

  " 範囲内の単語のみをフィルタリング
  let l:filtered_words = []
  for l:word in l:all_words
    if l:word.lnum >= a:start_line && l:word.lnum <= a:end_line
      call add(l:filtered_words, l:word)
    endif
  endfor

  " Phase D-2 Sub0.1: フィルタリング結果が空でもエラーなし
  return l:filtered_words
endfunction

" s:show_warning(message) - 警告メッセージを表示（統一されたフォーマット）
"
" 目的:
"   - 警告メッセージを統一されたフォーマットで表示
"   - プラグイン名をプレフィックスとして付与
"
" @param message String 警告メッセージ
function! s:show_warning(message) abort
  echohl WarningMsg
  echomsg 'hellshake_yano_vim#visual: ' . a:message
  echohl None
endfunction

let &cpo = s:save_cpo
unlet s:save_cpo
