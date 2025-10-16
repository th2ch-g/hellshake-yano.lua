" autoload/hellshake_yano_vim/core.vim - コア機能（状態管理・統合処理）
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: GREEN
" Process3: core.vim統合 - word_detector との統合完了
"
" このモジュールは hellshake-yano.vim の中核となる状態管理と単語検出統合を担当します。
" Phase A-2: 固定座標から画面内単語検出への移行が完了しました。
" Vim 8.0+ と Neovim の両方で動作します。

" スクリプトローカル変数の定義
let s:save_cpo = &cpo
set cpo&vim

" 状態変数（スクリプトローカル）
" PLAN.md の仕様に基づくデータ構造
let s:state = {
  \ 'enabled': v:true,
  \ 'hints_visible': v:false,
  \ 'words': [],
  \ 'hints': [],
  \ 'hint_map': {},
  \ 'popup_ids': [],
  \ 'input_timer': 0
\ }

" hellshake_yano_vim#core#init() - 状態変数の初期化
"
" 目的:
"   - s:state を初期値にリセット
"   - プラグインの起動時や再初期化時に呼び出される
"
" @return なし
function! hellshake_yano_vim#core#init() abort
  let s:state = {
    \ 'enabled': v:true,
    \ 'hints_visible': v:false,
    \ 'words': [],
    \ 'hints': [],
    \ 'hint_map': {},
    \ 'popup_ids': [],
    \ 'input_timer': 0
  \ }
endfunction

" hellshake_yano_vim#core#get_state() - 状態変数の取得（テスト用）
"
" 目的:
"   - スクリプトローカル変数 s:state への読み取り専用アクセスを提供
"   - 主にユニットテストで状態を検証するために使用
"
" @return Dictionary s:state のコピー
function! hellshake_yano_vim#core#get_state() abort
  return deepcopy(s:state)
endfunction

" hellshake_yano_vim#core#get_fixed_positions() - 固定座標の取得
"
" 目的:
"   - カーソル行を中心に前後3行の固定座標を返す
"   - MVP版では3つの固定位置にヒント（a, s, d）を表示するための座標を提供
"
" アルゴリズム:
"   1. カーソルの現在行を取得
"   2. 前後3行の座標を計算（cursor_line - 3, cursor_line, cursor_line + 3）
"   3. 各座標の行番号をバッファの範囲内にクランプ（1 <= lnum <= line('$')）
"   4. 座標の配列を返す
"
" エラーハンドリング:
"   - 空のバッファの場合でも安全に動作（line('$') は最小で1を返す）
"   - カーソル位置が異常な場合でも範囲内にクランプされる
"
" @return List<Dictionary> 座標のリスト
"   形式: [{'lnum': N, 'col': 1}, ...]
"   - lnum: 行番号（1-indexed）
"   - col: 列番号（常に1 = 行頭）
"
" 注意事項:
"   - Phase A-2 で word_detector#detect_visible() に置き換え済み
"   - この関数は Phase A-1 との互換性維持のために残されています
"   - 現在は固定オフセット [-3, 0, 3] を使用
function! hellshake_yano_vim#core#get_fixed_positions() abort
  " カーソルの現在行を取得
  let l:cursor_line = line('.')
  let l:max_line = line('$')

  " 空のバッファチェック（念のため）
  if l:max_line < 1
    return []
  endif

  " 固定座標の計算（カーソル行 - 3, カーソル行, カーソル行 + 3）
  let l:offsets = [-3, 0, 3]
  let l:positions = []

  for l:offset in l:offsets
    let l:target_line = l:cursor_line + l:offset

    " バッファの範囲内にクランプ
    " 最小値: 1, 最大値: line('$')
    if l:target_line < 1
      let l:target_line = 1
    elseif l:target_line > l:max_line
      let l:target_line = l:max_line
    endif

    " 座標を追加（col は常に 1 = 行頭）
    call add(l:positions, {'lnum': l:target_line, 'col': 1})
  endfor

  return l:positions
endfunction

" hellshake_yano_vim#core#show() - 統合実行関数（ヒント表示）
"
" 目的:
"   - 画面内単語検出、ヒント生成、ヒント表示、ヒントマップ作成、入力処理開始の
"     一連の流れを統合実行
"   - Process7 統合テストで検証される全体フロー
"
" 処理フロー:
"   1. 画面内単語検出（word_detector#detect_visible）
"   2. MVP制限: 最大7個まで
"   3. ヒント生成（hint_generator#generate）
"   4. ヒント表示（display#show_hint）
"   5. ヒントマップ作成（ヒントと位置の対応付け）
"   6. 入力処理開始（input#start）
"   7. 状態の更新（hints_visible = true）
"
" パフォーマンス最適化:
"   - 単語検出は画面内のみ（line('w0') ～ line('w$')）に限定
"   - MVP制限により最大7個の単語のみ処理（配列スライスで高速）
"   - 座標データ変換は単純なループで実装（オーバーヘッド最小化）
"   - 状態更新は一括で実行（複数回の代入を避ける）
"
" エラーハンドリング:
"   - 単語が検出できない場合は処理を中断
"   - ヒント生成に失敗した場合は処理を中断
"
" @return なし
"
" 使用例:
"   :call hellshake_yano_vim#core#show()
"
" 注意事項:
"   - Phase A-2: 画面内の単語を自動検出してヒントを表示
"   - MVP版では最大7個の単語にヒント（a, s, d, f, j, k, l）を表示
function! hellshake_yano_vim#core#show() abort
  " 1. 画面内の単語を検出
  let l:detected_words = hellshake_yano_vim#word_detector#detect_visible()

  " MVP制限: 最大7個まで
  if len(l:detected_words) > 7
    let l:detected_words = l:detected_words[0:6]
  endif

  " 単語データから座標データに変換
  let l:positions = []
  for l:word in l:detected_words
    call add(l:positions, {'lnum': l:word.lnum, 'col': l:word.col})
  endfor

  " エラーチェック: 座標が取得できない場合は中断
  if empty(l:positions)
    call s:show_warning('no positions found')
    return
  endif

  " 2. ヒント生成
  let l:count = len(l:positions)
  let l:hints = hellshake_yano_vim#hint_generator#generate(l:count)

  " エラーチェック: ヒント生成に失敗した場合は中断
  if empty(l:hints)
    call s:show_warning('failed to generate hints')
    return
  endif

  " 3. ヒント表示とヒントマップ作成
  let l:hint_map = {}
  let l:popup_ids = []
  let l:words = []

  for l:i in range(len(l:positions))
    let l:pos = l:positions[l:i]
    let l:hint = l:hints[l:i]

    " ヒント表示
    let l:popup_id = hellshake_yano_vim#display#show_hint(l:pos.lnum, l:pos.col, l:hint)
    call add(l:popup_ids, l:popup_id)

    " ヒントマップに追加（ヒント文字 → 座標）
    let l:hint_map[l:hint] = {'lnum': l:pos.lnum, 'col': l:pos.col}

    " words に追加（テスト用に座標とヒントをまとめたデータ）
    call add(l:words, {
      \ 'lnum': l:pos.lnum,
      \ 'col': l:pos.col,
      \ 'hint': l:hint,
      \ 'popup_id': l:popup_id
    \ })
  endfor

  " 4. 状態の更新
  let s:state.words = l:words
  let s:state.hints = l:hints
  let s:state.hint_map = l:hint_map
  let s:state.popup_ids = l:popup_ids
  let s:state.hints_visible = v:true

  " 画面を再描画してヒントが確実に表示されるようにする
  redraw

  " 5. 入力処理開始（ブロッキング方式）
  call hellshake_yano_vim#input#wait_for_input(l:hint_map)
endfunction

" hellshake_yano_vim#core#hide() - クリーンアップ関数（ヒント非表示）
"
" 目的:
"   - 表示中のヒントを全て削除し、状態をリセット
"   - 入力処理を停止
"
" 処理フロー:
"   1. 入力処理停止（input#stop）
"   2. 全 popup 削除（display#hide_all）
"   3. 状態リセット（words, hints, hint_map, popup_ids をクリア）
"   4. 状態の更新（hints_visible = false）
"
" @return なし
"
" 使用例:
"   :call hellshake_yano_vim#core#hide()
"
" 注意事項:
"   - ヒントが表示されていない状態で呼び出しても安全
"   - 複数回呼び出しても問題ない（冪等性）
function! hellshake_yano_vim#core#hide() abort
  " 1. 入力処理停止
  call hellshake_yano_vim#input#stop()

  " 2. 全 popup 削除
  call hellshake_yano_vim#display#hide_all()

  " 3. 状態リセット
  let s:state.words = []
  let s:state.hints = []
  let s:state.hint_map = {}
  let s:state.popup_ids = []
  let s:state.input_timer = 0

  " 4. 状態の更新
  let s:state.hints_visible = v:false
endfunction

" ===========================
" 内部ヘルパー関数
" ===========================

" s:show_warning(message) - 警告メッセージを表示（統一されたフォーマット）
"
" 目的:
"   - 警告メッセージを統一されたフォーマットで表示
"   - プラグイン名をプレフィックスとして付与
"
" @param message String 警告メッセージ
function! s:show_warning(message) abort
  echohl WarningMsg
  echomsg 'hellshake_yano_vim#core: ' . a:message
  echohl None
endfunction

let &cpo = s:save_cpo
unlet s:save_cpo
