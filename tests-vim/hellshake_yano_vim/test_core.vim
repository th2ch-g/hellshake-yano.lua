" tests-vim/hellshake_yano_vim/test_core.vim - コア機能のユニットテスト
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: RED → GREEN
" Process2: 固定座標データ構造の実装

" テストランナーをロード
if !exists('*RunTest')
  source <sfile>:h/test_runner.vim
endif

" Test_core_init: 初期化テスト
" 目的: core#init() が状態変数を正しく初期化するか検証
function! Test_core_init() abort
  " 初期化を実行
  call hellshake_yano_vim#core#init()

  " 状態変数が正しく初期化されているか取得
  let l:state = hellshake_yano_vim#core#get_state()

  " 期待値との比較
  call AssertTrue(has_key(l:state, 'enabled'), 'state should have "enabled" key')
  call AssertTrue(has_key(l:state, 'hints_visible'), 'state should have "hints_visible" key')
  call AssertTrue(has_key(l:state, 'words'), 'state should have "words" key')
  call AssertTrue(has_key(l:state, 'hints'), 'state should have "hints" key')
  call AssertTrue(has_key(l:state, 'hint_map'), 'state should have "hint_map" key')
  call AssertTrue(has_key(l:state, 'popup_ids'), 'state should have "popup_ids" key')
  call AssertTrue(has_key(l:state, 'input_timer'), 'state should have "input_timer" key')

  " 初期値の検証
  call AssertTrue(l:state.enabled, 'enabled should be true by default')
  call AssertFalse(l:state.hints_visible, 'hints_visible should be false initially')
  call AssertEqual([], l:state.words, 'words should be empty array')
  call AssertEqual([], l:state.hints, 'hints should be empty array')
  call AssertEqual({}, l:state.hint_map, 'hint_map should be empty dict')
  call AssertEqual([], l:state.popup_ids, 'popup_ids should be empty array')
  call AssertEqual(0, l:state.input_timer, 'input_timer should be 0')
endfunction

" Test_get_fixed_positions: 固定座標取得テスト
" 目的: get_fixed_positions() がカーソル行の前後3行の座標を返すか検証
function! Test_get_fixed_positions() abort
  " テスト用バッファを作成
  new
  " 15行のダミーテキストを挿入
  call setline(1, ['line 1', 'line 2', 'line 3', 'line 4', 'line 5',
                  \ 'line 6', 'line 7', 'line 8', 'line 9', 'line 10',
                  \ 'line 11', 'line 12', 'line 13', 'line 14', 'line 15'])

  " カーソルを 10 行目に移動
  call cursor(10, 1)

  " 固定座標を取得
  let l:positions = hellshake_yano_vim#core#get_fixed_positions()

  " 3つの座標が返されるか検証
  call AssertEqual(3, len(l:positions), 'should return 3 positions')

  " 各座標の検証
  " 1つ目: カーソル行 - 3 (10 - 3 = 7)
  call AssertEqual(7, l:positions[0].lnum, 'first position should be cursor_line - 3')
  call AssertEqual(1, l:positions[0].col, 'first position col should be 1')

  " 2つ目: カーソル行 (10)
  call AssertEqual(10, l:positions[1].lnum, 'second position should be cursor_line')
  call AssertEqual(1, l:positions[1].col, 'second position col should be 1')

  " 3つ目: カーソル行 + 3 (10 + 3 = 13)
  call AssertEqual(13, l:positions[2].lnum, 'third position should be cursor_line + 3')
  call AssertEqual(1, l:positions[2].col, 'third position col should be 1')

  " テストバッファをクリーンアップ
  bwipeout!
endfunction

" Test_get_fixed_positions_edge_case_top: エッジケース - バッファ先頭付近
" 目的: カーソルが先頭付近にある場合の挙動を検証
function! Test_get_fixed_positions_edge_case_top() abort
  " テスト用バッファを作成
  new
  call setline(1, ['line 1', 'line 2', 'line 3', 'line 4', 'line 5'])

  " カーソルを 2 行目に移動（2 - 3 = -1 になる）
  call cursor(2, 1)

  " 固定座標を取得
  let l:positions = hellshake_yano_vim#core#get_fixed_positions()

  " 3つの座標が返されるか検証
  call AssertEqual(3, len(l:positions), 'should return 3 positions even at buffer top')

  " 負の行番号にならないか検証（最小値は1）
  for l:pos in l:positions
    call Assert(l:pos.lnum >= 1, printf('line number should be >= 1, got %d', l:pos.lnum))
  endfor

  " テストバッファをクリーンアップ
  bwipeout!
endfunction

" Test_get_fixed_positions_edge_case_bottom: エッジケース - バッファ末尾付近
" 目的: カーソルが末尾付近にある場合の挙動を検証
function! Test_get_fixed_positions_edge_case_bottom() abort
  " テスト用バッファを作成
  new
  call setline(1, ['line 1', 'line 2', 'line 3', 'line 4', 'line 5'])

  " カーソルを 4 行目に移動（4 + 3 = 7 だがバッファは5行まで）
  call cursor(4, 1)

  " 固定座標を取得
  let l:positions = hellshake_yano_vim#core#get_fixed_positions()

  " 3つの座標が返されるか検証
  call AssertEqual(3, len(l:positions), 'should return 3 positions even at buffer bottom')

  " バッファの最大行数を超えないか検証
  let l:max_line = line('$')
  for l:pos in l:positions
    call Assert(l:pos.lnum <= l:max_line, printf('line number should be <= %d, got %d', l:max_line, l:pos.lnum))
  endfor

  " テストバッファをクリーンアップ
  bwipeout!
endfunction

" このファイルを直接sourceした場合はテストを実行
if expand('<sfile>:p') ==# expand('%:p')
  echo 'Running test_core.vim (RED phase)...'
  echo ''
  call RunAllTests()
endif
