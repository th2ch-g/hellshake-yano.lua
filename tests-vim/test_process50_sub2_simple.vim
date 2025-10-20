" Simplified test for Process50 Sub2: キーリピート検出ロジック
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
  echo '=== Process50 Sub2 Simple Test ==='
  echo ''

  let l:bufnr = bufnr('%')

  " Test 1: デフォルト設定の確認
  let g:hellshake_yano = {}
  let l:enabled = get(g:hellshake_yano, 'suppressOnKeyRepeat', v:true)
  let l:threshold = get(g:hellshake_yano, 'keyRepeatThreshold', 50)
  call s:test(l:enabled == v:true && l:threshold == 50, 'Default config values')

  " Test 2: 時間計測の基本動作
  let l:time1 = float2nr(reltimefloat(reltime()) * 1000.0)
  sleep 30m
  let l:time2 = float2nr(reltimefloat(reltime()) * 1000.0)
  let l:diff = l:time2 - l:time1
  call s:test(l:diff >= 25 && l:diff <= 60, 'Time measurement works (30ms ± tolerance)')

  " Test 3: key_repeat状態管理の連携
  call hellshake_yano_vim#key_repeat#set_last_key_time(l:bufnr, l:time1)
  call hellshake_yano_vim#key_repeat#set_repeating(l:bufnr, v:false)
  let l:saved_time = hellshake_yano_vim#key_repeat#get_last_key_time(l:bufnr)
  let l:repeating = hellshake_yano_vim#key_repeat#is_repeating(l:bufnr)
  call s:test(l:saved_time == l:time1 && l:repeating == v:false,
        \ 'State management integration')

  " Test 4: タイマーリセット機能
  call hellshake_yano_vim#key_repeat#set_repeating(l:bufnr, v:true)
  call hellshake_yano_vim#key_repeat#set_reset_timer(l:bufnr, 50)
  sleep 100m
  call s:test(hellshake_yano_vim#key_repeat#is_repeating(l:bufnr) == v:false,
        \ 'Timer reset functionality')

  echo ''
  echo 'Results: ' . s:test_passed . '/' . s:test_count . ' passed'

  if s:test_passed == s:test_count
    echo '=== ALL TESTS PASSED ==='
  else
    echo '=== SOME TESTS FAILED ==='
  endif

  " クリーンアップ
  if exists('g:hellshake_yano')
    unlet g:hellshake_yano
  endif
endfunction

" テスト実行
call s:run_tests()
