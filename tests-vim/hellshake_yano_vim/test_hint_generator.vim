" tests-vim/hellshake_yano_vim/test_hint_generator.vim
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: RED
" Process1: 複数文字ヒント生成のテストケース
"
" このファイルは hint_generator.vim のユニットテストを提供します。
" Phase A-3: 複数文字ヒント機能のテストケースを含みます。

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

" ========================================
" Phase A-2: 単一文字ヒント生成のテスト（既存機能の回帰テスト）
" ========================================

function! s:test_generate_zero_hints() abort
  let l:result = hellshake_yano_vim#hint_generator#generate(0)
  call s:assert_equal([], l:result, 'generate(0) should return empty array')
endfunction

function! s:test_generate_one_hint() abort
  let l:result = hellshake_yano_vim#hint_generator#generate(1)
  call s:assert_equal(['a'], l:result, 'generate(1) should return ["a"]')
endfunction

function! s:test_generate_three_hints() abort
  let l:result = hellshake_yano_vim#hint_generator#generate(3)
  call s:assert_equal(['a', 's', 'd'], l:result, 'generate(3) should return ["a", "s", "d"]')
endfunction

function! s:test_generate_seven_hints() abort
  let l:result = hellshake_yano_vim#hint_generator#generate(7)
  call s:assert_equal(['a', 's', 'd', 'f', 'g', 'n', 'm'], l:result,
    \ 'generate(7) should return all 7 single-character hints')
endfunction

" ========================================
" Phase A-3: 複数文字ヒント生成のテスト（新規実装）
" ========================================

function! s:test_generate_eight_hints() abort
  " 8個の単語: 7単一文字 + 1二文字（'bb'）
  let l:result = hellshake_yano_vim#hint_generator#generate(8)
  let l:expected = ['a', 's', 'd', 'f', 'g', 'n', 'm', 'bb']
  call s:assert_equal(l:expected, l:result,
    \ 'generate(8) should return 7 single-char + 1 multi-char hint')
endfunction

function! s:test_generate_fourteen_hints() abort
  " 14個の単語: 7単一文字 + 7二文字（'bb' - 'bq'）
  let l:result = hellshake_yano_vim#hint_generator#generate(14)
  let l:expected = ['a', 's', 'd', 'f', 'g', 'n', 'm', 'bb', 'bc', 'be', 'bi', 'bo', 'bp', 'bq']
  call s:assert_equal(l:expected, l:result,
    \ 'generate(14) should return 7 single-char + 7 multi-char hints')
endfunction

function! s:test_generate_twenty_hints() abort
  " 20個の単語: 7単一文字 + 13二文字
  let l:result = hellshake_yano_vim#hint_generator#generate(20)
  let l:expected = ['a', 's', 'd', 'f', 'g', 'n', 'm',
    \ 'bb', 'bc', 'be', 'bi', 'bo', 'bp', 'bq',
    \ 'br', 'bt', 'bu', 'bv', 'bw', 'bx']
  call s:assert_equal(l:expected, l:result,
    \ 'generate(20) should return 7 single-char + 13 multi-char hints')
endfunction

function! s:test_generate_fortynine_hints() abort
  " 49個の単語: 7単一文字 + 42二文字（最大値）
  let l:result = hellshake_yano_vim#hint_generator#generate(49)

  " 期待値の構築
  let l:expected = ['a', 's', 'd', 'f', 'g', 'n', 'm']
  let l:multi_char_keys = split('bceiopqrtuvwxyz', '\zs')

  " 42個の二文字ヒントを生成（bb, bc, be, ..., cx）
  for l:i in range(42)
    let l:first_idx = l:i / len(l:multi_char_keys)
    let l:second_idx = l:i % len(l:multi_char_keys)
    let l:hint = l:multi_char_keys[l:first_idx] . l:multi_char_keys[l:second_idx]
    call add(l:expected, l:hint)
  endfor

  call s:assert_equal(l:expected, l:result,
    \ 'generate(49) should return 7 single-char + 42 multi-char hints (max)')
  call s:assert_equal(49, len(l:result),
    \ 'generate(49) should return exactly 49 hints')
endfunction

function! s:test_generate_fifty_hints() abort
  " 50個以上の単語: 49個までに制限
  let l:result = hellshake_yano_vim#hint_generator#generate(50)
  call s:assert_equal(49, len(l:result),
    \ 'generate(50) should be limited to 49 hints')
endfunction

function! s:test_generate_hundred_hints() abort
  " 100個の単語: 49個までに制限
  let l:result = hellshake_yano_vim#hint_generator#generate(100)
  call s:assert_equal(49, len(l:result),
    \ 'generate(100) should be limited to 49 hints')
endfunction

" ========================================
" エッジケースのテスト
" ========================================

function! s:test_generate_negative_count() abort
  " 負の値: 空配列を返す
  let l:result = hellshake_yano_vim#hint_generator#generate(-1)
  call s:assert_equal([], l:result, 'generate(-1) should return empty array')
endfunction

function! s:test_hint_uniqueness() abort
  " 49個のヒントがすべて一意であることを確認
  let l:result = hellshake_yano_vim#hint_generator#generate(49)
  let l:unique_check = {}
  let l:has_duplicate = 0

  for l:hint in l:result
    if has_key(l:unique_check, l:hint)
      let l:has_duplicate = 1
      break
    endif
    let l:unique_check[l:hint] = 1
  endfor

  call s:assert_equal(0, l:has_duplicate,
    \ 'All hints should be unique (no duplicates)')
endfunction

function! s:test_multi_char_hint_format() abort
  " 複数文字ヒントが正しいフォーマット（2文字）であることを確認
  let l:result = hellshake_yano_vim#hint_generator#generate(20)
  let l:multi_char_hints = l:result[7:]  " 8個目以降

  let l:all_two_chars = 1
  for l:hint in l:multi_char_hints
    if len(l:hint) != 2
      let l:all_two_chars = 0
      break
    endif
  endfor

  call s:assert_equal(1, l:all_two_chars,
    \ 'All multi-character hints should be exactly 2 characters')
endfunction

" ========================================
" テストスイート実行
" ========================================

function! s:run_all_tests() abort
  echo '=========================================='
  echo 'hellshake_yano_vim#hint_generator Test Suite'
  echo '=========================================='
  echo ''

  " Phase A-2: 既存機能の回帰テスト
  echo '--- Phase A-2: Single-character hints ---'
  call s:test_generate_zero_hints()
  call s:test_generate_one_hint()
  call s:test_generate_three_hints()
  call s:test_generate_seven_hints()
  echo ''

  " Phase A-3: 複数文字ヒントのテスト
  echo '--- Phase A-3: Multi-character hints ---'
  call s:test_generate_eight_hints()
  call s:test_generate_fourteen_hints()
  call s:test_generate_twenty_hints()
  call s:test_generate_fortynine_hints()
  call s:test_generate_fifty_hints()
  call s:test_generate_hundred_hints()
  echo ''

  " エッジケースのテスト
  echo '--- Edge Cases ---'
  call s:test_generate_negative_count()
  call s:test_hint_uniqueness()
  call s:test_multi_char_hint_format()
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
