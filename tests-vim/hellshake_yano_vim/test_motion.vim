" tests-vim/hellshake_yano_vim/test_motion.vim
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: RED
" Process1: モーション連打検出のテストケース
"
" このファイルは motion.vim のユニットテストを提供します。
" Phase A-4: モーション連打検出機能のテストケースを含みます。

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

function! s:assert_true(actual, test_name) abort
  call s:assert_equal(v:true, a:actual, a:test_name)
endfunction

function! s:assert_false(actual, test_name) abort
  call s:assert_equal(v:false, a:actual, a:test_name)
endfunction

" ========================================
" 初期化テスト
" ========================================

function! s:test_motion_init() abort
  " 初期化実行
  call hellshake_yano_vim#motion#init()

  " 状態を取得
  let l:state = hellshake_yano_vim#motion#get_state()

  " 初期値チェック
  call s:assert_equal('', l:state.last_motion,
    \ 'init() should set last_motion to empty string')
  call s:assert_equal(0, l:state.motion_count,
    \ 'init() should set motion_count to 0')
  call s:assert_equal(2, l:state.threshold,
    \ 'init() should set threshold to 2 (default)')
  call s:assert_equal(2000, l:state.timeout_ms,
    \ 'init() should set timeout_ms to 2000 (default)')
endfunction

" ========================================
" 単一モーション実行のテスト
" ========================================

function! s:test_motion_single_press() abort
  " 初期化
  call hellshake_yano_vim#motion#init()

  " テストバッファの準備
  new
  call setline(1, ['word1 word2 word3', 'word4 word5 word6', 'word7 word8 word9'])
  normal! gg0

  " 1回だけモーション実行（ヒント表示はトリガーされない）
  call hellshake_yano_vim#motion#handle('w')

  " 状態を取得
  let l:state = hellshake_yano_vim#motion#get_state()

  " カウントが1、last_motionが'w'であることを確認
  call s:assert_equal('w', l:state.last_motion,
    \ 'single press should set last_motion to "w"')
  call s:assert_equal(1, l:state.motion_count,
    \ 'single press should set motion_count to 1')

  " クリーンアップ
  bdelete!
endfunction

" ========================================
" 連打によるヒント表示トリガーのテスト
" ========================================

function! s:test_motion_double_press_triggers_hint() abort
  " 初期化
  call hellshake_yano_vim#motion#init()
  call hellshake_yano_vim#core#init()

  " テストバッファの準備
  new
  call setline(1, ['word1 word2 word3', 'word4 word5 word6', 'word7 word8 word9'])
  normal! gg0

  " 1回目のモーション実行
  call hellshake_yano_vim#motion#handle('w')

  " 2回目のモーション実行（閾値2に到達）
  " NOTE: この実装では実際にはヒント表示はブロッキングするため、
  " テストでは core#show() が呼ばれることを間接的に確認する
  " （state.hints_visible をチェック）

  " TODO: このテストは実際のヒント表示をモックする必要があるため、
  " 現時点では handle() が正しく呼ばれることだけを確認
  let l:state = hellshake_yano_vim#motion#get_state()
  call s:assert_equal(1, l:state.motion_count,
    \ 'after first press, motion_count should be 1')

  " クリーンアップ
  bdelete!
endfunction

" ========================================
" タイムアウトによるリセットのテスト
" ========================================

function! s:test_motion_timeout_reset() abort
  " 初期化
  call hellshake_yano_vim#motion#init()

  " タイムアウトを短く設定（100ms）
  call hellshake_yano_vim#motion#set_timeout(100)

  " テストバッファの準備
  new
  call setline(1, ['word1 word2 word3', 'word4 word5 word6', 'word7 word8 word9'])
  normal! gg0

  " 1回目のモーション実行
  call hellshake_yano_vim#motion#handle('w')

  " 200ms待機（タイムアウトより長い）
  sleep 200m

  " 2回目のモーション実行
  call hellshake_yano_vim#motion#handle('w')

  " 状態を取得
  let l:state = hellshake_yano_vim#motion#get_state()

  " タイムアウトでリセットされたため、カウントは1であるべき
  call s:assert_equal(1, l:state.motion_count,
    \ 'timeout should reset motion_count to 1')

  " クリーンアップ
  bdelete!
endfunction

" ========================================
" 異なるモーションキーによるリセットのテスト
" ========================================

function! s:test_motion_different_key_reset() abort
  " 初期化
  call hellshake_yano_vim#motion#init()

  " テストバッファの準備
  new
  call setline(1, ['word1 word2 word3', 'word4 word5 word6', 'word7 word8 word9'])
  normal! gg0

  " wキーを実行
  call hellshake_yano_vim#motion#handle('w')

  " bキーを実行（異なるモーション）
  call hellshake_yano_vim#motion#handle('b')

  " 状態を取得
  let l:state = hellshake_yano_vim#motion#get_state()

  " 異なるモーションでリセットされたため、カウントは1、last_motionは'b'であるべき
  call s:assert_equal('b', l:state.last_motion,
    \ 'different key should set last_motion to "b"')
  call s:assert_equal(1, l:state.motion_count,
    \ 'different key should reset motion_count to 1')

  " クリーンアップ
  bdelete!
endfunction

" ========================================
" 閾値設定のテスト
" ========================================

function! s:test_motion_set_threshold() abort
  " 初期化
  call hellshake_yano_vim#motion#init()

  " 閾値を3に設定
  call hellshake_yano_vim#motion#set_threshold(3)

  " 状態を取得
  let l:state = hellshake_yano_vim#motion#get_state()

  " 閾値が3に設定されていることを確認
  call s:assert_equal(3, l:state.threshold,
    \ 'set_threshold(3) should set threshold to 3')
endfunction

" ========================================
" タイムアウト設定のテスト
" ========================================

function! s:test_motion_set_timeout() abort
  " 初期化
  call hellshake_yano_vim#motion#init()

  " タイムアウトを500msに設定
  call hellshake_yano_vim#motion#set_timeout(500)

  " 状態を取得
  let l:state = hellshake_yano_vim#motion#get_state()

  " タイムアウトが500msに設定されていることを確認
  call s:assert_equal(500, l:state.timeout_ms,
    \ 'set_timeout(500) should set timeout_ms to 500')
endfunction

" ========================================
" エッジケースのテスト
" ========================================

function! s:test_motion_count_accumulation() abort
  " 初期化
  call hellshake_yano_vim#motion#init()

  " 閾値を5に設定（ヒント表示を遅らせる）
  call hellshake_yano_vim#motion#set_threshold(5)

  " テストバッファの準備
  new
  call setline(1, ['word1 word2 word3', 'word4 word5 word6', 'word7 word8 word9'])
  normal! gg0

  " 3回連続でモーション実行
  call hellshake_yano_vim#motion#handle('w')
  call hellshake_yano_vim#motion#handle('w')
  call hellshake_yano_vim#motion#handle('w')

  " 状態を取得
  let l:state = hellshake_yano_vim#motion#get_state()

  " カウントが3であることを確認
  call s:assert_equal(3, l:state.motion_count,
    \ 'three consecutive presses should set motion_count to 3')

  " クリーンアップ
  bdelete!
endfunction

" ========================================
" テストスイート実行
" ========================================

function! s:run_all_tests() abort
  echo '=========================================='
  echo 'hellshake_yano_vim#motion Test Suite'
  echo '=========================================='
  echo ''

  " 初期化テスト
  echo '--- Initialization ---'
  call s:test_motion_init()
  echo ''

  " 基本動作テスト
  echo '--- Basic Operations ---'
  call s:test_motion_single_press()
  call s:test_motion_double_press_triggers_hint()
  echo ''

  " タイムアウトと異なるキーのテスト
  echo '--- Timeout and Different Keys ---'
  call s:test_motion_timeout_reset()
  call s:test_motion_different_key_reset()
  echo ''

  " 設定変更のテスト
  echo '--- Configuration ---'
  call s:test_motion_set_threshold()
  call s:test_motion_set_timeout()
  echo ''

  " エッジケース
  echo '--- Edge Cases ---'
  call s:test_motion_count_accumulation()
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
