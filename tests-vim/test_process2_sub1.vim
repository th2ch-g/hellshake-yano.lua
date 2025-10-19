" tests-vim/test_process2_sub1.vim - process2 sub1: Per-Keyモーションカウントテスト
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: RED
" このテストは、perKeyMotionCount と defaultMotionCount の
" 動作を確認します。

" Load required modules
source autoload/hellshake_yano_vim/motion.vim

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

function! s:test_default_motion_count() abort
  echom '=== Test: Default motion count (no perKeyMotionCount) ==='

  " デフォルト設定（perKeyMotionCountが未設定）
  unlet! g:hellshake_yano

  " 初期化
  call hellshake_yano_vim#motion#init()

  " デフォルトのモーションカウントを取得（この関数は未実装 - RED phase）
  let l:count_w = hellshake_yano_vim#motion#get_motion_count('w')
  let l:count_b = hellshake_yano_vim#motion#get_motion_count('b')

  " デフォルトは3（設定がない場合）
  call s:assert_equal(3, l:count_w, 'Default motion count for w should be 3')
  call s:assert_equal(3, l:count_b, 'Default motion count for b should be 3')
endfunction

function! s:test_per_key_motion_count() abort
  echom '=== Test: Per-key motion count ==='

  " perKeyMotionCount設定
  let g:hellshake_yano = {
        \ 'perKeyMotionCount': {'w': 2, 'b': 5, 'e': 1},
        \ 'defaultMotionCount': 3,
        \ }

  " 初期化
  call hellshake_yano_vim#motion#init()

  " キー別のモーションカウントを取得
  let l:count_w = hellshake_yano_vim#motion#get_motion_count('w')
  let l:count_b = hellshake_yano_vim#motion#get_motion_count('b')
  let l:count_e = hellshake_yano_vim#motion#get_motion_count('e')

  call s:assert_equal(2, l:count_w, 'Motion count for w should be 2')
  call s:assert_equal(5, l:count_b, 'Motion count for b should be 5')
  call s:assert_equal(1, l:count_e, 'Motion count for e should be 1')
endfunction

function! s:test_fallback_to_default() abort
  echom '=== Test: Fallback to defaultMotionCount ==='

  " perKeyMotionCountに存在しないキーはdefaultMotionCountにフォールバック
  let g:hellshake_yano = {
        \ 'perKeyMotionCount': {'w': 2},
        \ 'defaultMotionCount': 4,
        \ }

  call hellshake_yano_vim#motion#init()

  let l:count_w = hellshake_yano_vim#motion#get_motion_count('w')
  let l:count_j = hellshake_yano_vim#motion#get_motion_count('j')
  let l:count_k = hellshake_yano_vim#motion#get_motion_count('k')

  call s:assert_equal(2, l:count_w, 'w should use perKeyMotionCount')
  call s:assert_equal(4, l:count_j, 'j should fallback to defaultMotionCount')
  call s:assert_equal(4, l:count_k, 'k should fallback to defaultMotionCount')
endfunction

function! s:test_motion_threshold_integration() abort
  echom '=== Test: Integration with existing threshold system ==='

  " perKeyMotionCountを使用して、キー別にthresholdを設定
  let g:hellshake_yano = {
        \ 'perKeyMotionCount': {'w': 1, 'b': 3},
        \ 'defaultMotionCount': 2,
        \ }

  call hellshake_yano_vim#motion#init()

  " wキーは1回でヒント表示
  let l:count_w = hellshake_yano_vim#motion#get_motion_count('w')
  call s:assert_equal(1, l:count_w, 'w should trigger hint after 1 motion')

  " bキーは3回でヒント表示
  let l:count_b = hellshake_yano_vim#motion#get_motion_count('b')
  call s:assert_equal(3, l:count_b, 'b should trigger hint after 3 motions')
endfunction

function! s:test_backward_compatibility() abort
  echom '=== Test: Backward compatibility (no config) ==='

  " 設定なし（後方互換性テスト）
  unlet! g:hellshake_yano

  call hellshake_yano_vim#motion#init()

  " デフォルトは3
  let l:count = hellshake_yano_vim#motion#get_motion_count('w')
  call s:assert_equal(3, l:count, 'Should fallback to 3 when no config')
endfunction

" テスト実行
function! s:run_all_tests() abort
  let s:assert_count = 0
  let s:pass_count = 0
  let s:fail_count = 0

  echom '========================================'
  echom 'Running tests for process2 sub1'
  echom '========================================'

  call s:test_default_motion_count()
  call s:test_per_key_motion_count()
  call s:test_fallback_to_default()
  call s:test_motion_threshold_integration()
  call s:test_backward_compatibility()

  echom '========================================'
  echom 'Test Results:'
  echom 'Total:  ' . s:assert_count
  echom 'Pass:   ' . s:pass_count
  echom 'Fail:   ' . s:fail_count
  echom '========================================'

  if s:fail_count > 0
    echom 'FAILED: Some tests failed (RED phase - expected)'
    return 1
  else
    echom 'SUCCESS: All tests passed!'
    return 0
  endif
endfunction

" テスト実行
call s:run_all_tests()
quit
