" Test file for Process50 Sub1: Vim専用キーリピート状態管理
" Phase D-6: キーリピート抑制機能のVim移植
"
" テスト対象: autoload/hellshake_yano_vim/key_repeat.vim

" テスト初期化
let s:test_count = 0
let s:test_passed = 0
let s:test_failed = 0

function! s:assert(condition, message) abort
  let s:test_count += 1
  if a:condition
    let s:test_passed += 1
    echo 'PASS: ' . a:message
  else
    let s:test_failed += 1
    echo 'FAIL: ' . a:message
  endif
endfunction

" Test 1: get_last_key_time() - 初期値0
function! s:test_get_last_key_time_initial() abort
  let l:bufnr = bufnr('%')
  let l:time = hellshake_yano_vim#key_repeat#get_last_key_time(l:bufnr)
  call s:assert(l:time == 0, 'Test 1: get_last_key_time() returns 0 initially')
endfunction

" Test 2: set_last_key_time() - 値の設定
function! s:test_set_last_key_time() abort
  let l:bufnr = bufnr('%')
  let l:test_time = 12345
  call hellshake_yano_vim#key_repeat#set_last_key_time(l:bufnr, l:test_time)
  let l:time = hellshake_yano_vim#key_repeat#get_last_key_time(l:bufnr)
  call s:assert(l:time == l:test_time, 'Test 2: set_last_key_time() sets the time correctly')
endfunction

" Test 3: is_repeating() - 初期値false
function! s:test_is_repeating_initial() abort
  let l:bufnr = bufnr('%')
  let l:repeating = hellshake_yano_vim#key_repeat#is_repeating(l:bufnr)
  call s:assert(l:repeating == v:false, 'Test 3: is_repeating() returns false initially')
endfunction

" Test 4: set_repeating() - 値の設定
function! s:test_set_repeating() abort
  let l:bufnr = bufnr('%')
  call hellshake_yano_vim#key_repeat#set_repeating(l:bufnr, v:true)
  let l:repeating = hellshake_yano_vim#key_repeat#is_repeating(l:bufnr)
  call s:assert(l:repeating == v:true, 'Test 4: set_repeating() sets the state correctly')
endfunction

" Test 5: reset_state() - 状態リセット
function! s:test_reset_state() abort
  let l:bufnr = bufnr('%')
  " 状態を設定
  call hellshake_yano_vim#key_repeat#set_last_key_time(l:bufnr, 12345)
  call hellshake_yano_vim#key_repeat#set_repeating(l:bufnr, v:true)

  " リセット
  call hellshake_yano_vim#key_repeat#reset_state(l:bufnr)

  " 検証
  let l:repeating = hellshake_yano_vim#key_repeat#is_repeating(l:bufnr)
  call s:assert(l:repeating == v:false, 'Test 5: reset_state() resets repeating state to false')
endfunction

" Test 6: set_reset_timer() - タイマー設定
function! s:test_set_reset_timer() abort
  let l:bufnr = bufnr('%')
  call hellshake_yano_vim#key_repeat#set_repeating(l:bufnr, v:true)

  " タイマー設定（50msで状態リセット）
  call hellshake_yano_vim#key_repeat#set_reset_timer(l:bufnr, 50)

  " タイマー実行前は状態が維持される
  let l:repeating_before = hellshake_yano_vim#key_repeat#is_repeating(l:bufnr)
  call s:assert(l:repeating_before == v:true, 'Test 6a: set_reset_timer() - state is true before timer')

  " タイマー実行を待つ（100ms待機）
  sleep 100m

  " タイマー実行後は状態がリセットされる
  let l:repeating_after = hellshake_yano_vim#key_repeat#is_repeating(l:bufnr)
  call s:assert(l:repeating_after == v:false, 'Test 6b: set_reset_timer() - state is reset after timer')
endfunction

" Test 7: 複数バッファでの独立動作
function! s:test_multiple_buffers() abort
  " テスト用に異なるバッファ番号を使用
  " 現在のバッファとは異なる番号を指定
  let l:bufnr1 = 100  " 任意のバッファ番号
  let l:bufnr2 = 200  " 異なるバッファ番号

  " バッファ1に状態を設定
  call hellshake_yano_vim#key_repeat#set_last_key_time(l:bufnr1, 1000)
  call hellshake_yano_vim#key_repeat#set_repeating(l:bufnr1, v:true)

  " バッファ2の初期状態を確認（何も設定していない）
  let l:time2 = hellshake_yano_vim#key_repeat#get_last_key_time(l:bufnr2)
  let l:repeating2 = hellshake_yano_vim#key_repeat#is_repeating(l:bufnr2)
  call s:assert(l:time2 == 0, 'Test 7a: Multiple buffers - buffer 2 has initial time')
  call s:assert(l:repeating2 == v:false, 'Test 7b: Multiple buffers - buffer 2 has initial state')

  " バッファ1の状態が維持されているか確認
  let l:time1 = hellshake_yano_vim#key_repeat#get_last_key_time(l:bufnr1)
  let l:repeating1 = hellshake_yano_vim#key_repeat#is_repeating(l:bufnr1)
  call s:assert(l:time1 == 1000, 'Test 7c: Multiple buffers - buffer 1 maintains time')
  call s:assert(l:repeating1 == v:true, 'Test 7d: Multiple buffers - buffer 1 maintains state')
endfunction

" Test 8: タイマーの停止と再設定
function! s:test_timer_stop_and_reset() abort
  let l:bufnr = bufnr('%')
  call hellshake_yano_vim#key_repeat#set_repeating(l:bufnr, v:true)

  " 最初のタイマー設定（200ms）
  call hellshake_yano_vim#key_repeat#set_reset_timer(l:bufnr, 200)

  " 50ms待機
  sleep 50m

  " 新しいタイマーで上書き（50ms）
  call hellshake_yano_vim#key_repeat#set_reset_timer(l:bufnr, 50)

  " 100ms待機（新しいタイマーが実行される）
  sleep 100m

  " 状態がリセットされる
  let l:repeating = hellshake_yano_vim#key_repeat#is_repeating(l:bufnr)
  call s:assert(l:repeating == v:false, 'Test 8: Timer stop and reset - new timer resets state')
endfunction

" 全テストを実行
function! s:run_all_tests() abort
  echo '=== Process50 Sub1 Test Suite ==='
  echo ''

  call s:test_get_last_key_time_initial()
  call s:test_set_last_key_time()
  call s:test_is_repeating_initial()
  call s:test_set_repeating()
  call s:test_reset_state()
  call s:test_set_reset_timer()
  call s:test_multiple_buffers()
  call s:test_timer_stop_and_reset()

  echo ''
  echo '=== Test Summary ==='
  echo 'Total: ' . s:test_count
  echo 'Passed: ' . s:test_passed
  echo 'Failed: ' . s:test_failed

  if s:test_failed == 0
    echo '=== ALL TESTS PASSED ==='
    return 0
  else
    echo '=== SOME TESTS FAILED ==='
    return 1
  endif
endfunction

" テスト実行
call s:run_all_tests()
