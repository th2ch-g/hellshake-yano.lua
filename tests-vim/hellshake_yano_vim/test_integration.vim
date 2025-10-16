" tests-vim/hellshake_yano_vim/test_integration.vim
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: RED → GREEN
" Process7: 統合テストとエンドツーエンドテスト
"
" このファイルは hellshake-yano.vim の統合テストを提供します。
" Phase A-3: 複数文字ヒント機能の統合テストを含みます。

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

function! s:assert_greater_than(expected, actual, test_name) abort
  let s:test_count += 1
  if a:actual > a:expected
    let s:test_passed += 1
    echo printf('[PASS] %s', a:test_name)
  else
    let s:test_failed += 1
    echohl ErrorMsg
    echo printf('[FAIL] %s', a:test_name)
    echo printf('  Expected %s to be greater than %s', string(a:actual), string(a:expected))
    echohl None
  endif
endfunction

" ========================================
" テスト用ヘルパー関数
" ========================================

" セットアップ: テスト用バッファを作成
function! s:setup_test_buffer_with_words(words) abort
  " 新しいバッファを作成
  enew
  " 単語を空白で区切って1行に配置
  call setline(1, join(a:words, ' '))
  " 1行目に移動
  normal! gg
endfunction

" クリーンアップ: テスト用バッファを削除
function! s:cleanup_test_buffer() abort
  " 全てのヒントを非表示
  call hellshake_yano_vim#core#hide()
  " バッファを削除
  bwipeout!
endfunction

" ========================================
" Phase A-3: 統合テスト - 8個以上の単語
" ========================================

function! s:test_integration_eight_words() abort
  " テストケース1: 8個の単語がある画面での統合テスト
  " 単語: ['apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew']
  " ヒント: ['a', 's', 'd', 'f', 'j', 'k', 'l', 'aa']
  " 検証: 8個のヒントが生成され、正しく表示されること

  let l:words = ['apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew']
  call s:setup_test_buffer_with_words(l:words)

  " 画面内の単語を検出
  let l:detected_words = hellshake_yano_vim#word_detector#detect_visible()

  " 8個の単語が検出されることを確認
  call s:assert_equal(8, len(l:detected_words),
    \ 'should detect 8 words')

  " ヒント生成
  let l:hints = hellshake_yano_vim#hint_generator#generate(8)
  let l:expected_hints = ['a', 's', 'd', 'f', 'j', 'k', 'l', 'aa']

  call s:assert_equal(l:expected_hints, l:hints,
    \ 'should generate correct hints for 8 words')

  call s:cleanup_test_buffer()
endfunction

function! s:test_integration_fourteen_words() abort
  " テストケース2: 14個の単語がある画面での統合テスト
  " ヒント: ['a', 's', 'd', 'f', 'j', 'k', 'l', 'aa', 'as', 'ad', 'af', 'aj', 'ak', 'al']

  let l:words = ['word1', 'word2', 'word3', 'word4', 'word5', 'word6', 'word7',
    \ 'word8', 'word9', 'word10', 'word11', 'word12', 'word13', 'word14']
  call s:setup_test_buffer_with_words(l:words)

  " 画面内の単語を検出
  let l:detected_words = hellshake_yano_vim#word_detector#detect_visible()

  " 14個の単語が検出されることを確認
  call s:assert_equal(14, len(l:detected_words),
    \ 'should detect 14 words')

  " ヒント生成
  let l:hints = hellshake_yano_vim#hint_generator#generate(14)
  let l:expected_hints = ['a', 's', 'd', 'f', 'j', 'k', 'l', 'aa', 'as', 'ad', 'af', 'aj', 'ak', 'al']

  call s:assert_equal(l:expected_hints, l:hints,
    \ 'should generate correct hints for 14 words')

  call s:cleanup_test_buffer()
endfunction

function! s:test_integration_fortynine_words() abort
  " テストケース3: 49個の単語がある画面での統合テスト（最大値）
  " ヒント: 7単一文字 + 42二文字（aa, as, ad, ..., ll）

  " 49個の単語を生成
  let l:words = []
  for l:i in range(49)
    call add(l:words, 'word' . l:i)
  endfor
  call s:setup_test_buffer_with_words(l:words)

  " 画面内の単語を検出
  let l:detected_words = hellshake_yano_vim#word_detector#detect_visible()

  " 49個以上の単語が検出されること（実際には画面に収まる分だけ）
  call s:assert_true(len(l:detected_words) >= 49,
    \ 'should detect at least 49 words')

  " ヒント生成
  let l:hints = hellshake_yano_vim#hint_generator#generate(49)

  " 49個のヒントが生成されることを確認
  call s:assert_equal(49, len(l:hints),
    \ 'should generate exactly 49 hints')

  " 最後のヒントが 'll' であることを確認
  call s:assert_equal('ll', l:hints[-1],
    \ 'last hint should be "ll"')

  call s:cleanup_test_buffer()
endfunction

" ========================================
" Phase A-3: 部分マッチの統合テスト
" ========================================

function! s:test_integration_partial_match() abort
  " テストケース4: 部分マッチの統合テスト
  " ヒントマップ: {'a': {...}, 'aa': {...}, 'as': {...}}
  " 入力: 'a' → 部分マッチリスト ['a', 'aa', 'as'] を取得

  let l:words = ['apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew']
  call s:setup_test_buffer_with_words(l:words)

  " ヒントマップを作成（仮想的）
  let l:hint_map = {
    \ 'a': {'lnum': 1, 'col': 1},
    \ 's': {'lnum': 1, 'col': 7},
    \ 'd': {'lnum': 1, 'col': 14},
    \ 'f': {'lnum': 1, 'col': 20},
    \ 'j': {'lnum': 1, 'col': 26},
    \ 'k': {'lnum': 1, 'col': 32},
    \ 'l': {'lnum': 1, 'col': 38},
    \ 'aa': {'lnum': 1, 'col': 44}
  \ }

  " 部分マッチテスト: 'a' で始まるヒント
  let l:partial_matches = hellshake_yano_vim#input#get_partial_matches('a', l:hint_map)

  " 'a' と 'aa' がマッチすることを確認
  call s:assert_true(index(l:partial_matches, 'a') >= 0,
    \ 'partial matches should contain "a"')
  call s:assert_true(index(l:partial_matches, 'aa') >= 0,
    \ 'partial matches should contain "aa"')
  call s:assert_equal(2, len(l:partial_matches),
    \ 'partial matches should have 2 elements')

  call s:cleanup_test_buffer()
endfunction

" ========================================
" Phase A-2との互換性テスト（回帰テスト）
" ========================================

function! s:test_integration_seven_words() abort
  " テストケース5: 7個以下の単語（Phase A-2と同じ動作）
  " ヒント: ['a', 's', 'd', 'f', 'j', 'k', 'l']

  let l:words = ['apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape']
  call s:setup_test_buffer_with_words(l:words)

  " 画面内の単語を検出
  let l:detected_words = hellshake_yano_vim#word_detector#detect_visible()

  " 7個の単語が検出されることを確認
  call s:assert_equal(7, len(l:detected_words),
    \ 'should detect 7 words')

  " ヒント生成
  let l:hints = hellshake_yano_vim#hint_generator#generate(7)
  let l:expected_hints = ['a', 's', 'd', 'f', 'j', 'k', 'l']

  call s:assert_equal(l:expected_hints, l:hints,
    \ 'should generate single-char hints for 7 words (Phase A-2 compatibility)')

  call s:cleanup_test_buffer()
endfunction

function! s:test_integration_three_words() abort
  " テストケース6: 3個の単語（Phase A-2と同じ動作）
  " ヒント: ['a', 's', 'd']

  let l:words = ['apple', 'banana', 'cherry']
  call s:setup_test_buffer_with_words(l:words)

  " 画面内の単語を検出
  let l:detected_words = hellshake_yano_vim#word_detector#detect_visible()

  " 3個の単語が検出されることを確認
  call s:assert_equal(3, len(l:detected_words),
    \ 'should detect 3 words')

  " ヒント生成
  let l:hints = hellshake_yano_vim#hint_generator#generate(3)
  let l:expected_hints = ['a', 's', 'd']

  call s:assert_equal(l:expected_hints, l:hints,
    \ 'should generate single-char hints for 3 words (Phase A-2 compatibility)')

  call s:cleanup_test_buffer()
endfunction

" ========================================
" Phase A-4: モーション連打統合テスト
" ========================================

function! s:test_integration_core_init_with_motion() abort
  " テストケース: core#init() がmotion#init()を呼び出すことを確認
  " 期待: motion状態が初期化されること

  " core#init() を呼び出し
  call hellshake_yano_vim#core#init()

  " motion状態が初期化されていることを確認
  let l:motion_state = hellshake_yano_vim#motion#get_state()

  call s:assert_equal('', l:motion_state.last_motion,
    \ 'motion state should be initialized (last_motion)')
  call s:assert_equal(0, l:motion_state.motion_count,
    \ 'motion state should be initialized (motion_count)')
  call s:assert_equal(2, l:motion_state.threshold,
    \ 'motion state should have default threshold')
  call s:assert_equal(2000, l:motion_state.timeout_ms,
    \ 'motion state should have default timeout')
endfunction

function! s:test_integration_config_motion_settings() abort
  " テストケース: config経由でmotion設定を取得できることを確認
  " 期待: デフォルト設定が取得できること

  let l:motion_enabled = hellshake_yano_vim#config#get('motion_enabled')
  let l:motion_threshold = hellshake_yano_vim#config#get('motion_threshold')
  let l:motion_timeout = hellshake_yano_vim#config#get('motion_timeout_ms')
  let l:motion_keys = hellshake_yano_vim#config#get('motion_keys')

  call s:assert_equal(v:true, l:motion_enabled,
    \ 'motion_enabled should be true by default')
  call s:assert_equal(2, l:motion_threshold,
    \ 'motion_threshold should be 2 by default')
  call s:assert_equal(2000, l:motion_timeout,
    \ 'motion_timeout_ms should be 2000 by default')
  call s:assert_equal(['w', 'b', 'e'], l:motion_keys,
    \ 'motion_keys should be [w, b, e] by default')
endfunction

" ========================================
" エッジケースのテスト
" ========================================

function! s:test_integration_empty_buffer() abort
  " テストケース7: 空バッファ
  " 期待: エラーが発生せず、0個のヒントが生成される

  " 空のバッファを作成
  enew

  " 画面内の単語を検出
  let l:detected_words = hellshake_yano_vim#word_detector#detect_visible()

  " 0個の単語が検出されることを確認
  call s:assert_equal(0, len(l:detected_words),
    \ 'should detect 0 words in empty buffer')

  " ヒント生成
  let l:hints = hellshake_yano_vim#hint_generator#generate(0)

  call s:assert_equal([], l:hints,
    \ 'should generate empty hints for 0 words')

  call s:cleanup_test_buffer()
endfunction

function! s:test_integration_no_words() abort
  " テストケース8: 単語がない行
  " 期待: 0個のヒントが生成される

  call s:setup_test_buffer_with_words([''])

  " 画面内の単語を検出
  let l:detected_words = hellshake_yano_vim#word_detector#detect_visible()

  " 0個の単語が検出されることを確認
  call s:assert_equal(0, len(l:detected_words),
    \ 'should detect 0 words when no words present')

  call s:cleanup_test_buffer()
endfunction

" ========================================
" テストスイート実行
" ========================================

function! s:run_all_tests() abort
  echo '=========================================='
  echo 'hellshake_yano_vim Integration Test Suite'
  echo '=========================================='
  echo ''

  " Phase A-3: 複数文字ヒント統合テスト
  echo '--- Phase A-3: Multi-character hints integration ---'
  call s:test_integration_eight_words()
  call s:test_integration_fourteen_words()
  call s:test_integration_fortynine_words()
  echo ''

  " Phase A-3: 部分マッチ統合テスト
  echo '--- Phase A-3: Partial match integration ---'
  call s:test_integration_partial_match()
  echo ''

  " Phase A-2との互換性テスト
  echo '--- Phase A-2 compatibility (regression) ---'
  call s:test_integration_seven_words()
  call s:test_integration_three_words()
  echo ''

  " Phase A-4: モーション連打統合テスト
  echo '--- Phase A-4: Motion detection integration ---'
  call s:test_integration_core_init_with_motion()
  call s:test_integration_config_motion_settings()
  echo ''

  " エッジケースのテスト
  echo '--- Edge Cases ---'
  call s:test_integration_empty_buffer()
  call s:test_integration_no_words()
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
