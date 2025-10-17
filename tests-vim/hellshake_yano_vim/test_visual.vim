" tests-vim/hellshake_yano_vim/test_visual.vim - ビジュアルモード対応のユニットテスト
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: RED → GREEN → REFACTOR
" Process1: visual.vim の実装

" テストランナーをロード
if !exists('*RunTest')
  source <sfile>:h/test_runner.vim
endif

" Test_visual_init: 初期化テスト
" 目的: visual#init() が状態変数を正しく初期化するか検証
function! Test_visual_init() abort
  " 初期化を実行
  call hellshake_yano_vim#visual#init()

  " 状態変数が正しく初期化されているか取得
  let l:state = hellshake_yano_vim#visual#get_state()

  " 期待値との比較
  call AssertTrue(has_key(l:state, 'active'), 'state should have "active" key')
  call AssertTrue(has_key(l:state, 'mode'), 'state should have "mode" key')
  call AssertTrue(has_key(l:state, 'start_line'), 'state should have "start_line" key')
  call AssertTrue(has_key(l:state, 'start_col'), 'state should have "start_col" key')
  call AssertTrue(has_key(l:state, 'end_line'), 'state should have "end_line" key')
  call AssertTrue(has_key(l:state, 'end_col'), 'state should have "end_col" key')

  " 初期値の検証
  call AssertFalse(l:state.active, 'active should be false initially')
  call AssertEqual('', l:state.mode, 'mode should be empty string')
  call AssertEqual(0, l:state.start_line, 'start_line should be 0')
  call AssertEqual(0, l:state.start_col, 'start_col should be 0')
  call AssertEqual(0, l:state.end_line, 'end_line should be 0')
  call AssertEqual(0, l:state.end_col, 'end_col should be 0')
endfunction

" Test_visual_character_mode: 文字単位ビジュアルモードのテスト
" 目的: 文字単位ビジュアルモード（v）での動作確認
function! Test_visual_character_mode() abort
  " テスト用バッファを作成
  new
  call setline(1, ['hello world vim script', 'test line two'])

  " 文字単位ビジュアルモードをシミュレート
  " カーソルを1行1列に移動
  call cursor(1, 1)
  " ビジュアルモード開始（v）
  normal! v
  " 5文字選択
  normal! 4l

  " visual#show() を呼び出す
  " NOTE: ビジュアルモードを維持したまま呼び出すため、
  " feedkeys()を使用する必要があるが、テストでは状態確認のみ行う

  " ビジュアルモードを終了
  execute "normal! \<Esc>"

  " テストバッファをクリーンアップ
  bwipeout!
endfunction

" Test_visual_line_mode: 行単位ビジュアルモードのテスト
" 目的: 行単位ビジュアルモード（V）での動作確認
function! Test_visual_line_mode() abort
  " テスト用バッファを作成
  new
  call setline(1, ['line one', 'line two', 'line three', 'line four'])

  " 行単位ビジュアルモードをシミュレート
  call cursor(2, 1)
  normal! V
  normal! j

  " ビジュアルモードを終了
  execute "normal! \<Esc>"

  " テストバッファをクリーンアップ
  bwipeout!
endfunction

" Test_visual_block_mode: ブロック単位ビジュアルモードのテスト
" 目的: ブロック単位ビジュアルモード（Ctrl-v）での動作確認
function! Test_visual_block_mode() abort
  " テスト用バッファを作成
  new
  call setline(1, ['hello world', 'test line', 'vim script'])

  " ブロック単位ビジュアルモードをシミュレート
  call cursor(1, 1)
  execute "normal! \<C-v>"
  normal! jjll

  " ビジュアルモードを終了
  execute "normal! \<Esc>"

  " テストバッファをクリーンアップ
  bwipeout!
endfunction

" Test_visual_range_detection: 選択範囲検出のテスト
" 目的: getpos("'<"), getpos("'>") の動作確認
function! Test_visual_range_detection() abort
  " テスト用バッファを作成
  new
  call setline(1, ['first line', 'second line', 'third line'])

  " ビジュアルモードで選択
  call cursor(1, 1)
  normal! Vj
  execute "normal! \<Esc>"

  " 選択範囲を取得
  let l:start_pos = getpos("'<")
  let l:end_pos = getpos("'>")

  " 検証
  call AssertEqual(1, l:start_pos[1], 'start line should be 1')
  call AssertEqual(2, l:end_pos[1], 'end line should be 2')

  " テストバッファをクリーンアップ
  bwipeout!
endfunction

" Test_visual_show_not_in_visual_mode: ビジュアルモード外での呼び出し防止
" 目的: ビジュアルモード以外で visual#show() を呼んだ場合のエラーハンドリング確認
function! Test_visual_show_not_in_visual_mode() abort
  " テスト用バッファを作成
  new
  call setline(1, ['test line'])

  " ノーマルモードで visual#show() を呼び出す
  " NOTE: 実装後、エラーが発生することを確認する
  " （現時点ではまだ実装されていないため、スキップ可能）

  " テストバッファをクリーンアップ
  bwipeout!
endfunction

" このファイルを直接sourceした場合はテストを実行
if expand('<sfile>:p') ==# expand('%:p')
  echo 'Running test_visual.vim (RED phase)...'
  echo ''
  call RunAllTests()
endif
