" tests-vim/hellshake_yano_vim/test_jump.vim - ジャンプ機能のユニットテスト
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: RED → GREEN
" Process5: ジャンプ機能の実装

" テストランナーをロード
if !exists('*RunTest')
  source <sfile>:h/test_runner.vim
endif

" Test_jump_to: ジャンプ機能テスト
" 目的: jump#to(lnum, col) が指定座標にカーソルを移動するか検証
function! Test_jump_to() abort
  " テスト用バッファを作成
  new
  " 10行のダミーテキストを挿入
  call setline(1, ['line 1', 'line 2', 'line 3', 'line 4', 'line 5',
                  \ 'line 6', 'line 7', 'line 8', 'line 9', 'line 10'])

  " 初期位置: 1行1列に移動
  call cursor(1, 1)
  call AssertEqual(1, line('.'), 'cursor should start at line 1')
  call AssertEqual(1, col('.'), 'cursor should start at col 1')

  " ジャンプ実行: 5行3列に移動
  call hellshake_yano_vim#jump#to(5, 3)

  " カーソル位置の検証
  call AssertEqual(5, line('.'), 'cursor should jump to line 5')
  call AssertEqual(3, col('.'), 'cursor should jump to col 3')

  " 別の位置にジャンプ: 10行1列
  call hellshake_yano_vim#jump#to(10, 1)
  call AssertEqual(10, line('.'), 'cursor should jump to line 10')
  call AssertEqual(1, col('.'), 'cursor should jump to col 1')

  " 再度ジャンプ: 2行5列
  call hellshake_yano_vim#jump#to(2, 5)
  call AssertEqual(2, line('.'), 'cursor should jump to line 2')
  call AssertEqual(5, col('.'), 'cursor should jump to col 5')

  " テストバッファをクリーンアップ
  bwipeout!
endfunction

" Test_jump_to_first_line: 1行目へのジャンプテスト
" 目的: バッファの先頭行にジャンプできるか検証
function! Test_jump_to_first_line() abort
  " テスト用バッファを作成
  new
  call setline(1, ['line 1', 'line 2', 'line 3', 'line 4', 'line 5'])

  " カーソルを末尾に移動
  call cursor(5, 1)

  " 1行目にジャンプ
  call hellshake_yano_vim#jump#to(1, 1)
  call AssertEqual(1, line('.'), 'cursor should jump to line 1')
  call AssertEqual(1, col('.'), 'cursor should jump to col 1')

  " テストバッファをクリーンアップ
  bwipeout!
endfunction

" Test_jump_to_last_line: 最終行へのジャンプテスト
" 目的: バッファの最終行にジャンプできるか検証
function! Test_jump_to_last_line() abort
  " テスト用バッファを作成
  new
  call setline(1, ['line 1', 'line 2', 'line 3', 'line 4', 'line 5'])

  " カーソルを先頭に移動
  call cursor(1, 1)

  " 最終行にジャンプ
  let l:last_line = line('$')
  call hellshake_yano_vim#jump#to(l:last_line, 1)
  call AssertEqual(l:last_line, line('.'), 'cursor should jump to last line')

  " テストバッファをクリーンアップ
  bwipeout!
endfunction

" Test_jump_to_invalid_line_too_large: 無効な行番号（範囲外：大きすぎる）のテスト
" 目的: バッファの範囲を超える行番号に対してエラーを返すか検証
function! Test_jump_to_invalid_line_too_large() abort
  " テスト用バッファを作成
  new
  call setline(1, ['line 1', 'line 2', 'line 3', 'line 4', 'line 5'])

  " カーソルの初期位置
  call cursor(1, 1)
  let l:initial_line = line('.')

  " 範囲外の行番号（100行目）にジャンプを試みる
  " エラーが発生し、カーソルが移動しないことを期待
  try
    call hellshake_yano_vim#jump#to(100, 1)
    " エラーが発生しなかった場合はテスト失敗
    call Assert(v:false, 'jump to invalid line should throw error')
  catch
    " エラーが発生したことを確認
    call Assert(v:true, 'jump to line > line($) should throw error')
    " カーソルが移動していないことを確認
    call AssertEqual(l:initial_line, line('.'), 'cursor should not move on error')
  endtry

  " テストバッファをクリーンアップ
  bwipeout!
endfunction

" Test_jump_to_invalid_line_zero: 無効な行番号（0以下）のテスト
" 目的: 0以下の行番号に対してエラーを返すか検証
function! Test_jump_to_invalid_line_zero() abort
  " テスト用バッファを作成
  new
  call setline(1, ['line 1', 'line 2', 'line 3', 'line 4', 'line 5'])

  " カーソルの初期位置
  call cursor(3, 1)
  let l:initial_line = line('.')

  " 無効な行番号（0）にジャンプを試みる
  try
    call hellshake_yano_vim#jump#to(0, 1)
    call Assert(v:false, 'jump to line 0 should throw error')
  catch
    call Assert(v:true, 'jump to line <= 0 should throw error')
    call AssertEqual(l:initial_line, line('.'), 'cursor should not move on error')
  endtry

  " 無効な行番号（負の値）にジャンプを試みる
  try
    call hellshake_yano_vim#jump#to(-5, 1)
    call Assert(v:false, 'jump to negative line should throw error')
  catch
    call Assert(v:true, 'jump to negative line should throw error')
    call AssertEqual(l:initial_line, line('.'), 'cursor should not move on error')
  endtry

  " テストバッファをクリーンアップ
  bwipeout!
endfunction

" Test_jump_to_invalid_col_zero: 無効な列番号（0以下）のテスト
" 目的: 0以下の列番号に対してエラーを返すか検証
function! Test_jump_to_invalid_col_zero() abort
  " テスト用バッファを作成
  new
  call setline(1, ['line 1', 'line 2', 'line 3'])

  " カーソルの初期位置
  call cursor(2, 2)
  let l:initial_line = line('.')
  let l:initial_col = col('.')

  " 無効な列番号（0）にジャンプを試みる
  try
    call hellshake_yano_vim#jump#to(2, 0)
    call Assert(v:false, 'jump to col 0 should throw error')
  catch
    call Assert(v:true, 'jump to col <= 0 should throw error')
    call AssertEqual(l:initial_line, line('.'), 'cursor line should not change on error')
    call AssertEqual(l:initial_col, col('.'), 'cursor col should not change on error')
  endtry

  " テストバッファをクリーンアップ
  bwipeout!
endfunction

" このファイルを直接sourceした場合はテストを実行
if expand('<sfile>:p') ==# expand('%:p')
  echo 'Running test_jump.vim (RED phase)...'
  echo ''
  call RunAllTests()
endif
