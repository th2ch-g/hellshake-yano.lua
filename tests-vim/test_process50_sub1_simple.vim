" Simplified test for Process50 Sub1: Vim専用キーリピート状態管理
" 基本機能の動作確認

let s:test_count = 0
let s:test_passed = 0

function! s:test(condition, message) abort
  let s:test_count += 1
  if a:condition
    let s:test_passed += 1
    echo '✓ ' . a:message
  else
    echo '✗ ' . a:message
  endif
endfunction

function! s:run_tests() abort
  echo '=== Process50 Sub1 Simple Test ==='
  echo ''

  let l:bufnr = bufnr('%')

  " Test 1: 基本的な状態管理
  call hellshake_yano_vim#key_repeat#set_last_key_time(l:bufnr, 1234)
  call s:test(hellshake_yano_vim#key_repeat#get_last_key_time(l:bufnr) == 1234,
        \ 'Basic state management - time')

  " Test 2: リピート状態の設定
  call hellshake_yano_vim#key_repeat#set_repeating(l:bufnr, v:true)
  call s:test(hellshake_yano_vim#key_repeat#is_repeating(l:bufnr) == v:true,
        \ 'Basic state management - repeating')

  " Test 3: リセット機能
  call hellshake_yano_vim#key_repeat#reset_state(l:bufnr)
  call s:test(hellshake_yano_vim#key_repeat#is_repeating(l:bufnr) == v:false,
        \ 'Reset state works')

  " Test 4: タイマー機能
  call hellshake_yano_vim#key_repeat#set_repeating(l:bufnr, v:true)
  call hellshake_yano_vim#key_repeat#set_reset_timer(l:bufnr, 50)
  sleep 100m
  call s:test(hellshake_yano_vim#key_repeat#is_repeating(l:bufnr) == v:false,
        \ 'Timer reset works')

  echo ''
  echo 'Results: ' . s:test_passed . '/' . s:test_count . ' passed'

  if s:test_passed == s:test_count
    echo '=== ALL TESTS PASSED ==='
  else
    echo '=== SOME TESTS FAILED ==='
  endif
endfunction

" テスト実行
call s:run_tests()
