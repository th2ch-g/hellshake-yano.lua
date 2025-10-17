" tests-vim/hellshake_yano_vim/test_example.vim - 使用例とサンプルテスト
" Author: hellshake-yano
" License: MIT
"
" このファイルは test_runner.vim の使い方を示すサンプルです

" テストランナーをロード
source tests-vim/hellshake_yano_vim/test_runner.vim

" サンプルテスト1: 基本的な等価性チェック
function! Test_basic_equality() abort
  call AssertEqual(1, 1, '1 equals 1')
  call AssertEqual('hello', 'hello', 'strings are equal')
  call AssertEqual([1, 2, 3], [1, 2, 3], 'lists are equal')
endfunction

" サンプルテスト2: 真偽値チェック
function! Test_boolean_values() abort
  call AssertTrue(v:true, 'v:true is true')
  call AssertTrue(1 == 1, 'comparison result is true')
  call AssertFalse(v:false, 'v:false is false')
  call AssertFalse(1 == 2, 'comparison result is false')
endfunction

" サンプルテスト3: VimScript の機能テスト
function! Test_vim_functions() abort
  call AssertEqual(3, len('abc'), 'string length is 3')
  call AssertEqual(3, len([1, 2, 3]), 'list length is 3')
  call AssertTrue(has('vim9script') || has('nvim'), 'running on Vim or Neovim')
endfunction

" テスト実行
echo '=== Running Example Tests ==='
echo 'This demonstrates the test_runner.vim framework'
echo ''
call RunAllTests()
