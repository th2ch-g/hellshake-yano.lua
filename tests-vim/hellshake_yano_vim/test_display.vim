" tests-vim/hellshake_yano_vim/test_display.vim
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: RED
" Process5: 部分マッチハイライト機能のテストケース
"
" このファイルは display.vim のユニットテストを提供します。
" Phase A-3: 部分マッチハイライト機能のテストケースを含みます。

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
" Phase A-3: 部分マッチハイライト機能のテスト
" ========================================

" セットアップ: テスト用バッファを作成
function! s:setup_test_buffer() abort
  " 新しいバッファを作成
  enew
  " テスト用のテキストを挿入
  call setline(1, 'apple banana cherry date elderberry fig grape honeydew')
  " 1行目に移動
  normal! gg
endfunction

" クリーンアップ: テスト用バッファを削除
function! s:cleanup_test_buffer() abort
  " 全てのヒントを非表示
  call hellshake_yano_vim#display#hide_all()
  " バッファを削除
  bwipeout!
endfunction

function! s:test_show_hints_basic() abort
  " テストケース1: 基本的なヒント表示
  " 複数のヒントを表示し、popup_count が正しいことを確認
  call s:setup_test_buffer()

  " 3つのヒントを表示
  call hellshake_yano_vim#display#show_hint(1, 1, 'a')
  call hellshake_yano_vim#display#show_hint(1, 7, 's')
  call hellshake_yano_vim#display#show_hint(1, 14, 'd')

  " ポップアップ数を確認
  let l:count = hellshake_yano_vim#display#get_popup_count()
  call s:assert_equal(3, l:count, 'should show 3 hints')

  call s:cleanup_test_buffer()
endfunction

function! s:test_hide_all_hints() abort
  " テストケース2: 全ヒント非表示
  call s:setup_test_buffer()

  " 3つのヒントを表示
  call hellshake_yano_vim#display#show_hint(1, 1, 'a')
  call hellshake_yano_vim#display#show_hint(1, 7, 's')
  call hellshake_yano_vim#display#show_hint(1, 14, 'd')

  " 全て非表示
  call hellshake_yano_vim#display#hide_all()

  " ポップアップ数を確認（0であるべき）
  let l:count = hellshake_yano_vim#display#get_popup_count()
  call s:assert_equal(0, l:count, 'should hide all hints')

  call s:cleanup_test_buffer()
endfunction

function! s:test_partial_match_highlight() abort
  " テストケース3: 部分マッチハイライト
  " 全ヒント: ['a', 'aa', 'as', 's', 'sa']
  " 部分マッチ: ['a', 'aa', 'as']
  " 期待: 'a', 'aa', 'as' のポップアップが表示され、's', 'sa' は非表示
  call s:setup_test_buffer()

  " 5つのヒントを表示（仮想的なヒントマップ）
  let l:hints = {
    \ 'a': {'lnum': 1, 'col': 1},
    \ 'aa': {'lnum': 1, 'col': 7},
    \ 'as': {'lnum': 1, 'col': 14},
    \ 's': {'lnum': 1, 'col': 20},
    \ 'sa': {'lnum': 1, 'col': 26}
  \ }

  " ヒントを表示
  for [l:hint, l:pos] in items(l:hints)
    call hellshake_yano_vim#display#show_hint(l:pos.lnum, l:pos.col, l:hint)
  endfor

  " 初期状態: 5つのヒント表示
  let l:count_before = hellshake_yano_vim#display#get_popup_count()
  call s:assert_equal(5, l:count_before, 'should show 5 hints initially')

  " 部分マッチハイライトを適用（'a' で始まるヒントのみ）
  let l:partial_matches = ['a', 'aa', 'as']
  call hellshake_yano_vim#display#highlight_partial_matches(l:partial_matches)

  " 部分マッチ後: 3つのヒントのみ表示（'s', 'sa' は非表示）
  let l:count_after = hellshake_yano_vim#display#get_popup_count()
  call s:assert_equal(3, l:count_after,
    \ 'should show only 3 hints after partial match')

  call s:cleanup_test_buffer()
endfunction

function! s:test_partial_match_restore() abort
  " テストケース4: 部分マッチの解除
  " 部分マッチを適用した後、hide_all() で全て非表示にできることを確認
  call s:setup_test_buffer()

  " ヒントを表示
  let l:hints = {
    \ 'a': {'lnum': 1, 'col': 1},
    \ 'aa': {'lnum': 1, 'col': 7},
    \ 'as': {'lnum': 1, 'col': 14}
  \ }

  for [l:hint, l:pos] in items(l:hints)
    call hellshake_yano_vim#display#show_hint(l:pos.lnum, l:pos.col, l:hint)
  endfor

  " 部分マッチハイライトを適用
  call hellshake_yano_vim#display#highlight_partial_matches(['a', 'aa'])

  " 全て非表示
  call hellshake_yano_vim#display#hide_all()

  " ポップアップ数を確認（0であるべき）
  let l:count = hellshake_yano_vim#display#get_popup_count()
  call s:assert_equal(0, l:count, 'should hide all hints after restore')

  call s:cleanup_test_buffer()
endfunction

function! s:test_multi_char_hints() abort
  " テストケース5: 複数文字ヒントの表示
  " 'aa', 'as', 'ad' などの2文字ヒントが正しく表示されることを確認
  call s:setup_test_buffer()

  " 2文字ヒントを表示
  call hellshake_yano_vim#display#show_hint(1, 1, 'aa')
  call hellshake_yano_vim#display#show_hint(1, 7, 'as')
  call hellshake_yano_vim#display#show_hint(1, 14, 'ad')

  " ポップアップ数を確認
  let l:count = hellshake_yano_vim#display#get_popup_count()
  call s:assert_equal(3, l:count, 'should show 3 multi-char hints')

  call s:cleanup_test_buffer()
endfunction

" ========================================
" テストスイート実行
" ========================================

function! s:run_all_tests() abort
  echo '=========================================='
  echo 'hellshake_yano_vim#display Test Suite'
  echo '=========================================='
  echo ''

  " Phase A-3: 部分マッチハイライト機能のテスト
  echo '--- Phase A-3: Partial match highlight ---'
  call s:test_show_hints_basic()
  call s:test_hide_all_hints()
  call s:test_partial_match_highlight()
  call s:test_partial_match_restore()
  call s:test_multi_char_hints()
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
