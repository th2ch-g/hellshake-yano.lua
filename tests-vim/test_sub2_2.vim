" tests-vim/test_sub2_2.vim - process1 sub2.2: 動的maxTotal制限の完全適用テスト
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: RED
" このテストは、core.vimの49個固定制限を削除し、
" 動的maxTotal計算が完全に機能することを確認します。

" テストフレームワークの初期化
let s:assert_count = 0
let s:pass_count = 0
let s:fail_count = 0

function! s:assert_equal(expected, actual, message) abort
  let s:assert_count += 1
  if a:expected ==# a:actual
    let s:pass_count += 1
    echom 'PASS: ' . a:message
  else
    let s:fail_count += 1
    echom 'FAIL: ' . a:message
    echom '  Expected: ' . string(a:expected)
    echom '  Actual:   ' . string(a:actual)
  endif
endfunction

function! s:assert_true(condition, message) abort
  let s:assert_count += 1
  if a:condition
    let s:pass_count += 1
    echom 'PASS: ' . a:message
  else
    let s:fail_count += 1
    echom 'FAIL: ' . a:message
  endif
endfunction

function! s:test_dynamic_max_total_with_custom_keys() abort
  echom '=== Test: Dynamic maxTotal with custom keys (237 hints) ==='

  " カスタムキー設定（12 + 15² = 237個）
  let g:hellshake_yano = {
        \ 'singleCharKeys': 'ASDFGNM@;,./',
        \ 'multiCharKeys': 'BCEIOPQRTUVWXYZ',
        \ 'useNumericMultiCharHints': v:false,
        \ }

  " 237個のヒント生成をテスト
  let l:hints = hellshake_yano_vim#hint_generator#generate(237)

  call s:assert_equal(237, len(l:hints),
        \ '237 hints should be generated with custom keys')

  " 単一文字ヒントの確認（最初の12個）
  call s:assert_equal('A', l:hints[0], 'First hint should be A')
  call s:assert_equal('/', l:hints[11], '12th hint should be /')

  " 複数文字ヒントの確認（13個目以降）
  call s:assert_equal('BB', l:hints[12], '13th hint should be BB')
  call s:assert_equal('BC', l:hints[13], '14th hint should be BC')

  " IOPQRTUVWXYZが使われていることを確認
  let l:hint_string = join(l:hints, ',')
  call s:assert_true(l:hint_string =~# 'II', 'II should be included')
  call s:assert_true(l:hint_string =~# 'OO', 'OO should be included')
  call s:assert_true(l:hint_string =~# 'PP', 'PP should be included')
  call s:assert_true(l:hint_string =~# 'ZZ', 'ZZ should be included')

  " 最後のヒントを確認（237個目）
  call s:assert_equal('ZZ', l:hints[236], 'Last hint should be ZZ (15x15=225 + 12 = 237)')
endfunction

function! s:test_dynamic_max_total_with_numeric_hints() abort
  echom '=== Test: Dynamic maxTotal with numeric hints (337 hints) ==='

  " カスタムキー設定 + 数字ヒント（237 + 100 = 337個）
  let g:hellshake_yano = {
        \ 'singleCharKeys': 'ASDFGNM@;,./',
        \ 'multiCharKeys': 'BCEIOPQRTUVWXYZ',
        \ 'useNumericMultiCharHints': v:true,
        \ }

  " 337個のヒント生成をテスト
  let l:hints = hellshake_yano_vim#hint_generator#generate(337)

  call s:assert_equal(337, len(l:hints),
        \ '337 hints should be generated (237 normal + 100 numeric)')

  " 通常ヒント（1-237個目）
  call s:assert_equal('A', l:hints[0], 'First hint should be A')
  call s:assert_equal('ZZ', l:hints[236], '237th hint should be ZZ')

  " 数字ヒント（238-337個目）
  call s:assert_equal('01', l:hints[237], '238th hint should be 01')
  call s:assert_equal('02', l:hints[238], '239th hint should be 02')
  call s:assert_equal('99', l:hints[335], '336th hint should be 99')
  call s:assert_equal('00', l:hints[336], '337th hint should be 00')
endfunction

function! s:test_core_vim_no_49_limit() abort
  echom '=== Test: core.vim should not limit to 49 hints ==='

  " カスタムキー設定
  let g:hellshake_yano = {
        \ 'singleCharKeys': 'ASDFGNM@;,./',
        \ 'multiCharKeys': 'BCEIOPQRTUVWXYZ',
        \ 'useNumericMultiCharHints': v:false,
        \ }

  " 100個の単語を準備（テストバッファに書き込み）
  new
  for l:i in range(100)
    call append(line('$'), 'word' . l:i . ' test data for hint generation')
  endfor

  " word_detector で検出される単語数を確認
  let l:detected_words = hellshake_yano_vim#word_detector#detect_visible()

  " 49個以上の単語が検出されることを確認
  call s:assert_true(len(l:detected_words) >= 49,
        \ 'More than 49 words should be detected')

  " core.vimが49個で制限していないかを確認
  " （このテストは現在失敗するはず - RED phase）
  call s:assert_true(len(l:detected_words) > 49,
        \ 'core.vim should NOT limit to 49 words (currently FAILS - RED phase)')

  bdelete!
endfunction

function! s:test_backward_compatibility_default_keys() abort
  echom '=== Test: Backward compatibility with default keys ==='

  " デフォルト設定（7 + 15² = 232個）
  unlet! g:hellshake_yano

  " 49個のヒント生成（既存の動作を保証）
  let l:hints = hellshake_yano_vim#hint_generator#generate(49)

  call s:assert_equal(49, len(l:hints),
        \ 'Default config should still support 49 hints')

  " デフォルトキーの確認
  call s:assert_equal('a', l:hints[0], 'First hint should be a (lowercase)')
  call s:assert_equal('m', l:hints[6], '7th hint should be m')
  call s:assert_equal('bb', l:hints[7], '8th hint should be bb')
endfunction

" テスト実行
function! s:run_all_tests() abort
  let s:assert_count = 0
  let s:pass_count = 0
  let s:fail_count = 0

  echom '========================================'
  echom 'Running tests for process1 sub2.2'
  echom '========================================'

  call s:test_dynamic_max_total_with_custom_keys()
  call s:test_dynamic_max_total_with_numeric_hints()
  call s:test_core_vim_no_49_limit()
  call s:test_backward_compatibility_default_keys()

  echom '========================================'
  echom 'Test Results:'
  echom 'Total:  ' . s:assert_count
  echom 'Pass:   ' . s:pass_count
  echom 'Fail:   ' . s:fail_count
  echom '========================================'

  if s:fail_count > 0
    echom 'FAILED: Some tests failed!'
    return 1
  else
    echom 'SUCCESS: All tests passed!'
    return 0
  endif
endfunction

" テスト実行
call s:run_all_tests()
