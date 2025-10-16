" tests-vim/hellshake_yano_vim/test_input.vim
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: RED
" Process3: 入力処理の部分マッチテストケース
"
" このファイルは input.vim のユニットテストを提供します。
" Phase A-3: 複数文字ヒント入力と部分マッチ機能のテストケースを含みます。

" autoload ファイルの読み込み（テスト用）
runtime! autoload/hellshake_yano_vim/input.vim

" スクリプトローカル変数の定義
let s:save_cpo = &cpo
set cpo&vim

" テスト結果のカウンター
let s:test_count = 0
let s:test_passed = 0
let s:test_failed = 0

" アサーション関数
function! s:assert_equal(expected, actual, test_name) abort
  let s:test_count += 1
  if a:expected == a:actual
    let s:test_passed += 1
    echo printf('[PASS] %s', a:test_name)
  else
    let s:test_failed += 1
    echohl ErrorMsg
    echo printf('[FAIL] %s', a:test_name)
    echo printf('  Expected: %s', string(a:expected))
    echo printf('  Actual: %s', string(a:actual))
    echohl None
  endif
endfunction

function! s:assert_true(condition, test_name) abort
  call s:assert_equal(v:true, a:condition, a:test_name)
endfunction

function! s:assert_contains(haystack, needle, test_name) abort
  let s:test_count += 1
  if index(a:haystack, a:needle) >= 0
    let s:test_passed += 1
    echo printf('[PASS] %s', a:test_name)
  else
    let s:test_failed += 1
    echohl ErrorMsg
    echo printf('[FAIL] %s', a:test_name)
    echo printf('  Expected "%s" to be in: %s', a:needle, string(a:haystack))
    echohl None
  endif
endfunction

" ========================================
" Phase A-3: 複数文字入力と部分マッチのテスト
" ========================================

" テスト用ヘルパー: 部分マッチリストを取得する
" input.vim の公開関数を使用
function! s:get_partial_matches(input_buffer, hint_map) abort
  return hellshake_yano_vim#input#get_partial_matches(a:input_buffer, a:hint_map)
endfunction

function! s:test_partial_match_detection() abort
  " テストケース1: 部分マッチ検出
  " ヒントマップ: {'a': {...}, 'aa': {...}, 'as': {...}}
  " 入力: 'a'
  " 期待: 部分マッチリストに ['a', 'aa', 'as'] が含まれる

  let l:hint_map = {
    \ 'a': {'lnum': 1, 'col': 1},
    \ 'aa': {'lnum': 2, 'col': 1},
    \ 'as': {'lnum': 3, 'col': 1}
  \ }
  let l:input = 'a'

  let l:matches = s:get_partial_matches(l:input, l:hint_map)

  " 部分マッチリストに 'a', 'aa', 'as' がすべて含まれることを確認
  call s:assert_contains(l:matches, 'a',
    \ 'partial_match should contain "a"')
  call s:assert_contains(l:matches, 'aa',
    \ 'partial_match should contain "aa"')
  call s:assert_contains(l:matches, 'as',
    \ 'partial_match should contain "as"')
  call s:assert_equal(3, len(l:matches),
    \ 'partial_match should have 3 elements')
endfunction

function! s:test_exact_match_priority() abort
  " テストケース2: 完全一致優先
  " ヒントマップ: {'a': {lnum: 1, col: 1}, 'aa': {lnum: 2, col: 1}}
  " 入力: 'a'
  " 期待: 完全一致が優先される（この動作は input.vim の s:check_input で検証）

  " このテストは実際の入力処理を模擬する必要があるため、
  " ここでは部分マッチリストに 'a' と 'aa' の両方が含まれることを確認
  let l:hint_map = {
    \ 'a': {'lnum': 1, 'col': 1},
    \ 'aa': {'lnum': 2, 'col': 1}
  \ }
  let l:input = 'a'

  let l:matches = s:get_partial_matches(l:input, l:hint_map)

  call s:assert_contains(l:matches, 'a',
    \ 'partial_match should contain exact match "a"')
  call s:assert_contains(l:matches, 'aa',
    \ 'partial_match should contain partial match "aa"')
endfunction

function! s:test_two_char_input() abort
  " テストケース3: 2文字入力のテストケース
  " ヒントマップ: {'a': {...}, 'aa': {lnum: 2, col: 1}, 'as': {...}}
  " 入力: 'aa'
  " 期待: 'aa' のみが完全一致

  let l:hint_map = {
    \ 'a': {'lnum': 1, 'col': 1},
    \ 'aa': {'lnum': 2, 'col': 1},
    \ 'as': {'lnum': 3, 'col': 1}
  \ }
  let l:input = 'aa'

  let l:matches = s:get_partial_matches(l:input, l:hint_map)

  " 'aa' のみが部分マッチ（実際には完全一致）
  call s:assert_contains(l:matches, 'aa',
    \ 'partial_match should contain "aa"')
  call s:assert_equal(1, len(l:matches),
    \ 'partial_match should have only 1 element for exact match "aa"')
endfunction

function! s:test_no_match() abort
  " テストケース4: マッチなしのテストケース
  " ヒントマップ: {'a': {...}, 'aa': {...}}
  " 入力: 'x'
  " 期待: 空リスト

  let l:hint_map = {
    \ 'a': {'lnum': 1, 'col': 1},
    \ 'aa': {'lnum': 2, 'col': 1}
  \ }
  let l:input = 'x'

  let l:matches = s:get_partial_matches(l:input, l:hint_map)

  call s:assert_equal([], l:matches,
    \ 'partial_match should be empty for no match')
endfunction

function! s:test_partial_match_with_multiple_prefixes() abort
  " テストケース5: 複数のプレフィックスでの部分マッチ
  " ヒントマップに 'a', 'aa', 'as', 's', 'sa', 'ss' が含まれる
  " 入力: 's' → 's', 'sa', 'ss' がマッチ

  let l:hint_map = {
    \ 'a': {'lnum': 1, 'col': 1},
    \ 'aa': {'lnum': 2, 'col': 1},
    \ 'as': {'lnum': 3, 'col': 1},
    \ 's': {'lnum': 4, 'col': 1},
    \ 'sa': {'lnum': 5, 'col': 1},
    \ 'ss': {'lnum': 6, 'col': 1}
  \ }
  let l:input = 's'

  let l:matches = s:get_partial_matches(l:input, l:hint_map)

  call s:assert_contains(l:matches, 's',
    \ 'partial_match should contain "s"')
  call s:assert_contains(l:matches, 'sa',
    \ 'partial_match should contain "sa"')
  call s:assert_contains(l:matches, 'ss',
    \ 'partial_match should contain "ss"')
  call s:assert_equal(3, len(l:matches),
    \ 'partial_match should have 3 elements for "s" prefix')
endfunction

function! s:test_partial_match_second_char() abort
  " テストケース6: 2文字目の入力での部分マッチ
  " ヒントマップ: {'aa', 'as', 'ad', 'sa'}
  " 入力: 'as' → 'as' のみがマッチ

  let l:hint_map = {
    \ 'aa': {'lnum': 1, 'col': 1},
    \ 'as': {'lnum': 2, 'col': 1},
    \ 'ad': {'lnum': 3, 'col': 1},
    \ 'sa': {'lnum': 4, 'col': 1}
  \ }
  let l:input = 'as'

  let l:matches = s:get_partial_matches(l:input, l:hint_map)

  call s:assert_contains(l:matches, 'as',
    \ 'partial_match should contain "as"')
  call s:assert_equal(1, len(l:matches),
    \ 'partial_match should have only 1 element for "as"')
endfunction

" ========================================
" Process50: wait_for_input() 複数文字対応のテスト
" ========================================

" モック用グローバル変数: getchar() の戻り値をシミュレート
let g:test_input_sequence = []
let g:test_input_index = 0

" モック用グローバル変数: ジャンプ先の記録
let g:test_jumped_to = {}

" getchar() のモック（テスト用）
" 注意: 実際のgetchar()を置き換えるのは困難なため、
"       このテストは wait_for_input() の内部ロジックをテストするのではなく、
"       部分マッチロジックが正しく動作することを確認する
function! s:test_wait_for_input_with_multi_char() abort
  " テストケース: 複数文字入力でジャンプする
  " このテストは、wait_for_input() の設計が正しいことを確認する
  " （実際の動作テストは手動テストで行う）

  " 部分マッチロジックのテスト（wait_for_input内で使用される）
  let l:hint_map = {
    \ 'a': {'lnum': 1, 'col': 1},
    \ 'aa': {'lnum': 2, 'col': 1},
    \ 'as': {'lnum': 3, 'col': 1}
  \ }

  " 1文字目 'a' の入力後の部分マッチ
  let l:matches_after_a = s:get_partial_matches('a', l:hint_map)
  call s:assert_equal(3, len(l:matches_after_a),
    \ 'wait_for_input: after typing "a", should have 3 partial matches')

  " 2文字目 'a' の入力後（完全一致 'aa'）
  let l:matches_after_aa = s:get_partial_matches('aa', l:hint_map)
  call s:assert_equal(1, len(l:matches_after_aa),
    \ 'wait_for_input: after typing "aa", should have 1 match')
  call s:assert_contains(l:matches_after_aa, 'aa',
    \ 'wait_for_input: "aa" should be in matches')
endfunction

function! s:test_wait_for_input_loop_logic() abort
  " テストケース: 入力ループロジックのテスト
  " 完全一致優先、部分マッチ継続、マッチなしで終了の流れを確認

  let l:hint_map = {
    \ 's': {'lnum': 1, 'col': 1},
    \ 'sa': {'lnum': 2, 'col': 1},
    \ 'sd': {'lnum': 3, 'col': 1}
  \ }

  " シナリオ1: 's' を入力 → 's', 'sa', 'sd' が部分マッチ
  let l:input = 's'
  let l:matches = s:get_partial_matches(l:input, l:hint_map)
  call s:assert_equal(3, len(l:matches),
    \ 'wait_for_input loop: "s" should have 3 partial matches')

  " シナリオ2: 'sa' を入力 → 'sa' のみ完全一致
  let l:input = 'sa'
  let l:matches = s:get_partial_matches(l:input, l:hint_map)
  call s:assert_equal(1, len(l:matches),
    \ 'wait_for_input loop: "sa" should have 1 match')

  " シナリオ3: 'sx' を入力 → マッチなし
  let l:input = 'sx'
  let l:matches = s:get_partial_matches(l:input, l:hint_map)
  call s:assert_equal(0, len(l:matches),
    \ 'wait_for_input loop: "sx" should have no matches')
endfunction

function! s:test_wait_for_input_exact_match_priority() abort
  " テストケース: 完全一致が優先されることを確認
  " 入力 'a' で 'a' と 'aa' が両方マッチする場合、'a' が完全一致として優先される

  let l:hint_map = {
    \ 'a': {'lnum': 1, 'col': 1},
    \ 'aa': {'lnum': 2, 'col': 1}
  \ }

  " 完全一致チェック: has_key() を使用
  let l:input = 'a'
  call s:assert_true(has_key(l:hint_map, l:input),
    \ 'wait_for_input: "a" should be an exact match')

  " 部分マッチリストには両方含まれる
  let l:matches = s:get_partial_matches(l:input, l:hint_map)
  call s:assert_equal(2, len(l:matches),
    \ 'wait_for_input: "a" should have 2 partial matches (a, aa)')

  " 完全一致が優先されるため、'a' でジャンプする
  " （実際のジャンプは has_key チェックで先に実行される）
endfunction

" ========================================
" テストスイート実行
" ========================================

function! s:run_all_tests() abort
  echo '=========================================='
  echo 'hellshake_yano_vim#input Test Suite'
  echo '=========================================='
  echo ''

  " Phase A-3: 複数文字入力と部分マッチのテスト
  echo '--- Phase A-3: Multi-character input and partial match ---'
  call s:test_partial_match_detection()
  call s:test_exact_match_priority()
  call s:test_two_char_input()
  call s:test_no_match()
  call s:test_partial_match_with_multiple_prefixes()
  call s:test_partial_match_second_char()
  echo ''

  " Process50: wait_for_input() 複数文字対応のテスト
  echo '--- Process50: wait_for_input() multi-char support ---'
  call s:test_wait_for_input_with_multi_char()
  call s:test_wait_for_input_loop_logic()
  call s:test_wait_for_input_exact_match_priority()
  echo ''

  " 結果サマリー
  echo '=========================================='
  echo printf('Test Results: %d passed, %d failed, %d total',
    \ s:test_passed, s:test_failed, s:test_count)
  echo '=========================================='

  if s:test_failed > 0
    echohl ErrorMsg
    echo 'SOME TESTS FAILED!'
    echohl None
  else
    echohl MoreMsg
    echo 'ALL TESTS PASSED!'
    echohl None
  endif
endfunction

" テスト実行
call s:run_all_tests()

let &cpo = s:save_cpo
unlet s:save_cpo
