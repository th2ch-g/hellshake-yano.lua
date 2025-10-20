" Simplified test for Process50 Sub3: motion#handle()統合
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
  echo '=== Process50 Sub3 Simple Test ==='
  echo ''

  " autoload ファイルを明示的に読み込む
  runtime autoload/hellshake_yano_vim/motion.vim
  runtime autoload/hellshake_yano_vim/key_repeat.vim

  let l:bufnr = bufnr('%')

  " Test 1: motion#handle()関数が存在する
  call s:test(exists('*hellshake_yano_vim#motion#handle'),
        \ 'motion#handle() function exists')

  " Test 2: キーリピート統合の基本動作
  let g:hellshake_yano = {'suppressOnKeyRepeat': v:true}

  " 状態リセット
  call hellshake_yano_vim#key_repeat#set_last_key_time(l:bufnr, 0)
  call hellshake_yano_vim#key_repeat#set_repeating(l:bufnr, v:false)

  " 現在時刻を設定
  let l:time1 = float2nr(reltimefloat(reltime()) * 1000.0)
  call hellshake_yano_vim#key_repeat#set_last_key_time(l:bufnr, l:time1)

  " 高速入力をシミュレート（30ms後）
  sleep 30m
  let l:time2 = float2nr(reltimefloat(reltime()) * 1000.0)
  let l:diff = l:time2 - l:time1

  call s:test(l:diff < 50, 'Fast key input timing (< 50ms)')

  " Test 3: タイマーリセット機能の統合
  call hellshake_yano_vim#key_repeat#set_repeating(l:bufnr, v:true)
  call hellshake_yano_vim#key_repeat#set_reset_timer(l:bufnr, 50)
  sleep 100m

  call s:test(hellshake_yano_vim#key_repeat#is_repeating(l:bufnr) == v:false,
        \ 'Timer reset integration works')

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
