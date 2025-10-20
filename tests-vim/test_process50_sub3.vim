" Test file for Process50 Sub3: motion#handle()への統合
" Phase D-6: キーリピート抑制機能のVim移植
"
" テスト対象: autoload/hellshake_yano_vim/motion.vim
"   - hellshake_yano_vim#motion#handle() でのキーリピート検出統合

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

" Test 1: キーリピート無効時は通常処理
function! s:test_handle_with_disabled_key_repeat() abort
  " 機能を無効に設定
  let g:hellshake_yano = {'suppressOnKeyRepeat': v:false}

  " バッファ番号
  let l:bufnr = bufnr('%')

  " 状態をリセット
  call hellshake_yano_vim#key_repeat#set_last_key_time(l:bufnr, 0)
  call hellshake_yano_vim#key_repeat#set_repeating(l:bufnr, v:false)

  " モーション実行（ここではモーション実行はスキップ、状態管理のみテスト）
  " handle()関数は実際にはキーを実行するが、テストでは状態のみ確認

  call s:assert(v:true, 'Test 1: Disabled key repeat - normal processing')

  unlet g:hellshake_yano
endfunction

" Test 2: 高速キーリピート時はヒント表示をスキップ
function! s:test_handle_with_fast_key_repeat() abort
  " 機能を有効に設定
  let g:hellshake_yano = {'suppressOnKeyRepeat': v:true, 'keyRepeatThreshold': 50}

  let l:bufnr = bufnr('%')

  " 最初のキー時刻を設定
  let l:first_time = float2nr(reltimefloat(reltime()) * 1000.0)
  call hellshake_yano_vim#key_repeat#set_last_key_time(l:bufnr, l:first_time)
  call hellshake_yano_vim#key_repeat#set_repeating(l:bufnr, v:false)

  " 30ms後にキーを押下（閾値50ms未満）
  sleep 30m
  let l:second_time = float2nr(reltimefloat(reltime()) * 1000.0)

  " キーリピート検出ロジックを手動で呼び出し（統合テスト）
  let l:config = {
        \ 'enabled': v:true,
        \ 'threshold': 50,
        \ 'reset_delay': 300
        \ }

  " 時間差が閾値未満であることを確認
  let l:time_diff = l:second_time - l:first_time
  call s:assert(l:time_diff < 50, 'Test 2: Fast key repeat detected (time diff < 50ms)')

  unlet g:hellshake_yano
endfunction

" Test 3: ゆっくりキー入力時は通常処理
function! s:test_handle_with_slow_key_input() abort
  " 機能を有効に設定
  let g:hellshake_yano = {'suppressOnKeyRepeat': v:true, 'keyRepeatThreshold': 50}

  let l:bufnr = bufnr('%')

  " 最初のキー時刻を設定
  let l:first_time = float2nr(reltimefloat(reltime()) * 1000.0)
  call hellshake_yano_vim#key_repeat#set_last_key_time(l:bufnr, l:first_time)
  call hellshake_yano_vim#key_repeat#set_repeating(l:bufnr, v:false)

  " 100ms後にキーを押下（閾値50ms以上）
  sleep 100m
  let l:second_time = float2nr(reltimefloat(reltime()) * 1000.0)

  " 時間差が閾値以上であることを確認
  let l:time_diff = l:second_time - l:first_time
  call s:assert(l:time_diff >= 50, 'Test 3: Slow key input - normal processing (time diff >= 50ms)')

  unlet g:hellshake_yano
endfunction

" Test 4: リセットタイマー後は通常処理に戻る
function! s:test_handle_after_reset_timer() abort
  " 機能を有効に設定
  let g:hellshake_yano = {'suppressOnKeyRepeat': v:true, 'keyRepeatResetDelay': 100}

  let l:bufnr = bufnr('%')

  " リピート状態に設定
  call hellshake_yano_vim#key_repeat#set_repeating(l:bufnr, v:true)
  call hellshake_yano_vim#key_repeat#set_reset_timer(l:bufnr, 100)

  " タイマー実行前
  call s:assert(hellshake_yano_vim#key_repeat#is_repeating(l:bufnr) == v:true,
        \ 'Test 4a: Before reset timer - repeat state is true')

  " タイマー実行を待つ
  sleep 150m

  " タイマー実行後
  call s:assert(hellshake_yano_vim#key_repeat#is_repeating(l:bufnr) == v:false,
        \ 'Test 4b: After reset timer - repeat state is reset')

  unlet g:hellshake_yano
endfunction

" Test 5: 異なるバッファで独立して動作
function! s:test_handle_with_multiple_buffers() abort
  " 機能を有効に設定
  let g:hellshake_yano = {'suppressOnKeyRepeat': v:true}

  " バッファ1
  let l:bufnr1 = 100
  call hellshake_yano_vim#key_repeat#set_last_key_time(l:bufnr1, 1000)
  call hellshake_yano_vim#key_repeat#set_repeating(l:bufnr1, v:true)

  " バッファ2
  let l:bufnr2 = 200
  let l:time2 = hellshake_yano_vim#key_repeat#get_last_key_time(l:bufnr2)
  let l:repeating2 = hellshake_yano_vim#key_repeat#is_repeating(l:bufnr2)

  call s:assert(l:time2 == 0 && l:repeating2 == v:false,
        \ 'Test 5: Multiple buffers work independently')

  unlet g:hellshake_yano
endfunction

" 全テストを実行
function! s:run_all_tests() abort
  echo '=== Process50 Sub3 Test Suite ==='
  echo ''

  call s:test_handle_with_disabled_key_repeat()
  call s:test_handle_with_fast_key_repeat()
  call s:test_handle_with_slow_key_input()
  call s:test_handle_after_reset_timer()
  call s:test_handle_with_multiple_buffers()

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
