" tests-vim/hellshake_yano_vim/test_hint_generator.vim
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: RED
" Process1: 複数文字ヒント生成のテストケース
"
" このファイルは hint_generator.vim のユニットテストを提供します。
" Phase A-3: 複数文字ヒント機能のテストケースを含みます。

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

" ========================================
" Phase A-2: 単一文字ヒント生成のテスト（既存機能の回帰テスト）
" ========================================

function! s:test_generate_zero_hints() abort
  let l:result = hellshake_yano_vim#hint_generator#generate(0)
  call s:assert_equal([], l:result, 'generate(0) should return empty array')
endfunction

function! s:test_generate_one_hint() abort
  let l:result = hellshake_yano_vim#hint_generator#generate(1)
  call s:assert_equal(['a'], l:result, 'generate(1) should return ["a"]')
endfunction

function! s:test_generate_three_hints() abort
  let l:result = hellshake_yano_vim#hint_generator#generate(3)
  call s:assert_equal(['a', 's', 'd'], l:result, 'generate(3) should return ["a", "s", "d"]')
endfunction

function! s:test_generate_seven_hints() abort
  let l:result = hellshake_yano_vim#hint_generator#generate(7)
  call s:assert_equal(['a', 's', 'd', 'f', 'g', 'n', 'm'], l:result,
    \ 'generate(7) should return all 7 single-character hints')
endfunction

" ========================================
" Phase A-3: 複数文字ヒント生成のテスト（新規実装）
" ========================================

function! s:test_generate_eight_hints() abort
  " 8個の単語: 7単一文字 + 1二文字（'bb'）
  let l:result = hellshake_yano_vim#hint_generator#generate(8)
  let l:expected = ['a', 's', 'd', 'f', 'g', 'n', 'm', 'bb']
  call s:assert_equal(l:expected, l:result,
    \ 'generate(8) should return 7 single-char + 1 multi-char hint')
endfunction

function! s:test_generate_fourteen_hints() abort
  " 14個の単語: 7単一文字 + 7二文字（'bb' - 'bq'）
  let l:result = hellshake_yano_vim#hint_generator#generate(14)
  let l:expected = ['a', 's', 'd', 'f', 'g', 'n', 'm', 'bb', 'bc', 'be', 'bi', 'bo', 'bp', 'bq']
  call s:assert_equal(l:expected, l:result,
    \ 'generate(14) should return 7 single-char + 7 multi-char hints')
endfunction

function! s:test_generate_twenty_hints() abort
  " 20個の単語: 7単一文字 + 13二文字
  let l:result = hellshake_yano_vim#hint_generator#generate(20)
  let l:expected = ['a', 's', 'd', 'f', 'g', 'n', 'm',
    \ 'bb', 'bc', 'be', 'bi', 'bo', 'bp', 'bq',
    \ 'br', 'bt', 'bu', 'bv', 'bw', 'bx']
  call s:assert_equal(l:expected, l:result,
    \ 'generate(20) should return 7 single-char + 13 multi-char hints')
endfunction

function! s:test_generate_fortynine_hints() abort
  " 49個の単語: 7単一文字 + 42二文字（最大値）
  let l:result = hellshake_yano_vim#hint_generator#generate(49)

  " 期待値の構築
  let l:expected = ['a', 's', 'd', 'f', 'g', 'n', 'm']
  let l:multi_char_keys = split('bceiopqrtuvwxyz', '\zs')

  " 42個の二文字ヒントを生成（bb, bc, be, ..., cx）
  for l:i in range(42)
    let l:first_idx = l:i / len(l:multi_char_keys)
    let l:second_idx = l:i % len(l:multi_char_keys)
    let l:hint = l:multi_char_keys[l:first_idx] . l:multi_char_keys[l:second_idx]
    call add(l:expected, l:hint)
  endfor

  call s:assert_equal(l:expected, l:result,
    \ 'generate(49) should return 7 single-char + 42 multi-char hints (max)')
  call s:assert_equal(49, len(l:result),
    \ 'generate(49) should return exactly 49 hints')
endfunction

function! s:test_generate_fifty_hints() abort
  " 50個以上の単語: デフォルト設定では49個までに制限
  " Phase D-1: 動的maxTotal対応により、デフォルトは7 + 15*15 = 232個
  " ただし、数字ヒントなしの場合は49個に制限される（後方互換性）
  let l:result = hellshake_yano_vim#hint_generator#generate(50)
  " Phase D-1: 動的maxTotal = 7 + 225 = 232、50個要求なら50個返す
  call s:assert_equal(50, len(l:result),
    \ 'generate(50) should return 50 hints (dynamic maxTotal)')
endfunction

function! s:test_generate_hundred_hints() abort
  " 100個の単語: Phase D-1では動的maxTotalまで生成可能
  let l:result = hellshake_yano_vim#hint_generator#generate(100)
  " Phase D-1: 動的maxTotal = 7 + 225 = 232、100個要求なら100個返す
  call s:assert_equal(100, len(l:result),
    \ 'generate(100) should return 100 hints (dynamic maxTotal)')
endfunction

" ========================================
" エッジケースのテスト
" ========================================

function! s:test_generate_negative_count() abort
  " 負の値: 空配列を返す
  let l:result = hellshake_yano_vim#hint_generator#generate(-1)
  call s:assert_equal([], l:result, 'generate(-1) should return empty array')
endfunction

function! s:test_hint_uniqueness() abort
  " 49個のヒントがすべて一意であることを確認
  let l:result = hellshake_yano_vim#hint_generator#generate(49)
  let l:unique_check = {}
  let l:has_duplicate = 0

  for l:hint in l:result
    if has_key(l:unique_check, l:hint)
      let l:has_duplicate = 1
      break
    endif
    let l:unique_check[l:hint] = 1
  endfor

  call s:assert_equal(0, l:has_duplicate,
    \ 'All hints should be unique (no duplicates)')
endfunction

function! s:test_multi_char_hint_format() abort
  " 複数文字ヒントが正しいフォーマット（2文字）であることを確認
  let l:result = hellshake_yano_vim#hint_generator#generate(20)
  let l:multi_char_hints = l:result[7:]  " 8個目以降

  let l:all_two_chars = 1
  for l:hint in l:multi_char_hints
    if len(l:hint) != 2
      let l:all_two_chars = 0
      break
    endif
  endfor

  call s:assert_equal(1, l:all_two_chars,
    \ 'All multi-character hints should be exactly 2 characters')
endfunction

" ========================================
" Phase D-1 Process1 Sub2.1: 数字ヒント・設定統合・動的maxTotalのテスト
" ========================================

function! s:test_numeric_hints_basic() abort
  " 数字ヒントの基本機能テスト
  " g:hellshake_yano.useNumericMultiCharHints を一時的に設定
  " Phase D-1: 動的maxTotal = 7 + 15*15 = 232
  " 数字ヒントは233個目（インデックス232）から開始
  let l:saved_config = get(g:, 'hellshake_yano', {})
  let g:hellshake_yano = {'useNumericMultiCharHints': v:true}

  " 240個要求: 232通常ヒント + 8数字ヒント（01-08）
  let l:result = hellshake_yano_vim#hint_generator#generate(240)

  " 設定を復元
  let g:hellshake_yano = l:saved_config

  " 240個のヒントが生成されることを確認
  call s:assert_equal(240, len(l:result),
    \ 'generate(240) with useNumericMultiCharHints should return 240 hints')

  " 233個目（インデックス232）が '01' であることを確認（01から始まる）
  call s:assert_equal('01', l:result[232],
    \ 'The 233rd hint should be "01" (first numeric hint)')
endfunction

function! s:test_numeric_hints_order() abort
  " 数字ヒントの順序テスト: 01-09, 10-99, 00
  " Phase D-1: 動的maxTotal = 7 + 15*15 = 232
  let l:saved_config = get(g:, 'hellshake_yano', {})
  let g:hellshake_yano = {'useNumericMultiCharHints': v:true}

  " 332個要求: 232通常 + 100数字（01-99, 00）
  let l:result = hellshake_yano_vim#hint_generator#generate(332)

  " 設定を復元
  let g:hellshake_yano = l:saved_config

  " 332個のヒントが生成されることを確認
  call s:assert_equal(332, len(l:result),
    \ 'generate(332) with useNumericMultiCharHints should return 332 hints')

  " 数字ヒント部分（233個目以降、インデックス232-331）を抽出
  let l:numeric_hints = l:result[232:]

  " 最初の数字が '01' であることを確認
  call s:assert_equal('01', l:numeric_hints[0],
    \ 'First numeric hint should be "01"')

  " 9個目の数字が '09' であることを確認
  call s:assert_equal('09', l:numeric_hints[8],
    \ '9th numeric hint should be "09"')

  " 10個目の数字が '10' であることを確認
  call s:assert_equal('10', l:numeric_hints[9],
    \ '10th numeric hint should be "10"')

  " 最後の数字が '00' であることを確認
  call s:assert_equal('00', l:numeric_hints[99],
    \ 'Last numeric hint should be "00"')
endfunction

function! s:test_config_from_g_hellshake_yano() abort
  " g:hellshake_yano.singleCharKeys からの設定読み込みテスト
  let l:saved_config = get(g:, 'hellshake_yano', {})
  let g:hellshake_yano = {'singleCharKeys': 'abc'}

  " カスタム設定でヒント生成
  let l:result = hellshake_yano_vim#hint_generator#generate(3)

  " 設定を復元
  let g:hellshake_yano = l:saved_config

  " カスタムキーが使用されていることを確認
  call s:assert_equal(['a', 'b', 'c'], l:result,
    \ 'generate() should use g:hellshake_yano.singleCharKeys')
endfunction

function! s:test_config_multichar_keys() abort
  " g:hellshake_yano.multiCharKeys からの設定読み込みテスト
  let l:saved_config = get(g:, 'hellshake_yano', {})
  let g:hellshake_yano = {
    \ 'singleCharKeys': 'a',
    \ 'multiCharKeys': 'xyz'
    \ }

  " カスタム設定でヒント生成（2個目から複数文字ヒント）
  let l:result = hellshake_yano_vim#hint_generator#generate(4)

  " 設定を復元
  let g:hellshake_yano = l:saved_config

  " カスタムキーが使用されていることを確認
  " 期待値: ['a', 'xx', 'xy', 'xz']
  call s:assert_equal(['a', 'xx', 'xy', 'xz'], l:result,
    \ 'generate() should use g:hellshake_yano.multiCharKeys')
endfunction

function! s:test_config_fallback() abort
  " フォールバックテスト: g:hellshake_yano_vim_* -> g:hellshake_yano.* -> デフォルト
  let l:saved_config = get(g:, 'hellshake_yano', {})
  let l:saved_old_config = get(g:, 'hellshake_yano_vim_single_char_keys', '')

  " 古い設定のみ存在する場合
  unlet! g:hellshake_yano
  let g:hellshake_yano_vim_single_char_keys = 'xyz'

  let l:result = hellshake_yano_vim#hint_generator#generate(2)

  " 設定を復元
  let g:hellshake_yano = l:saved_config
  if l:saved_old_config != ''
    let g:hellshake_yano_vim_single_char_keys = l:saved_old_config
  else
    unlet! g:hellshake_yano_vim_single_char_keys
  endif

  " 古い設定が使用されることを確認
  call s:assert_equal(['x', 'y'], l:result,
    \ 'generate() should fallback to g:hellshake_yano_vim_single_char_keys')
endfunction

function! s:test_dynamic_max_total() abort
  " 動的maxTotal計算のテスト
  let l:saved_config = get(g:, 'hellshake_yano', {})
  let g:hellshake_yano = {
    \ 'singleCharKeys': 'abc',
    \ 'multiCharKeys': 'xy'
    \ }

  " maxTotal = 3単一文字 + 2x2複数文字 = 3 + 4 = 7
  let l:result = hellshake_yano_vim#hint_generator#generate(100)

  " 設定を復元
  let g:hellshake_yano = l:saved_config

  " 動的に計算されたmaxTotal（7個）が適用されることを確認
  call s:assert_equal(7, len(l:result),
    \ 'generate() should dynamically calculate maxTotal')

  " 期待値: ['a', 'b', 'c', 'xx', 'xy', 'yx', 'yy']
  call s:assert_equal(['a', 'b', 'c', 'xx', 'xy', 'yx', 'yy'], l:result,
    \ 'generate() should generate hints based on dynamic maxTotal')
endfunction

function! s:test_dynamic_max_total_with_numeric() abort
  " 動的maxTotal + 数字ヒントのテスト
  let l:saved_config = get(g:, 'hellshake_yano', {})
  let g:hellshake_yano = {
    \ 'singleCharKeys': 'ab',
    \ 'multiCharKeys': 'xy',
    \ 'useNumericMultiCharHints': v:true
    \ }

  " maxTotal = 2単一文字 + 2x2複数文字 = 2 + 4 = 6
  " 数字ヒント100個を追加 -> 最大106個
  let l:result = hellshake_yano_vim#hint_generator#generate(10)

  " 設定を復元
  let g:hellshake_yano = l:saved_config

  " 10個のヒント生成
  call s:assert_equal(10, len(l:result),
    \ 'generate(10) should return 10 hints')

  " 7個目以降が数字ヒントであることを確認
  call s:assert_equal('01', l:result[6],
    \ '7th hint should be "01" (first numeric hint)')
  call s:assert_equal('02', l:result[7],
    \ '8th hint should be "02"')
endfunction

" ========================================
" テストスイート実行
" ========================================

function! s:run_all_tests() abort
  echo '=========================================='
  echo 'hellshake_yano_vim#hint_generator Test Suite'
  echo '=========================================='
  echo ''

  " Phase A-2: 既存機能の回帰テスト
  echo '--- Phase A-2: Single-character hints ---'
  call s:test_generate_zero_hints()
  call s:test_generate_one_hint()
  call s:test_generate_three_hints()
  call s:test_generate_seven_hints()
  echo ''

  " Phase A-3: 複数文字ヒントのテスト
  echo '--- Phase A-3: Multi-character hints ---'
  call s:test_generate_eight_hints()
  call s:test_generate_fourteen_hints()
  call s:test_generate_twenty_hints()
  call s:test_generate_fortynine_hints()
  call s:test_generate_fifty_hints()
  call s:test_generate_hundred_hints()
  echo ''

  " エッジケースのテスト
  echo '--- Edge Cases ---'
  call s:test_generate_negative_count()
  call s:test_hint_uniqueness()
  call s:test_multi_char_hint_format()
  echo ''

  " Phase D-1 Process1 Sub2.1: 数字ヒント・設定統合・動的maxTotalのテスト
  echo '--- Phase D-1 Sub2.1: Numeric Hints & Config Integration ---'
  call s:test_numeric_hints_basic()
  call s:test_numeric_hints_order()
  call s:test_config_from_g_hellshake_yano()
  call s:test_config_multichar_keys()
  call s:test_config_fallback()
  call s:test_dynamic_max_total()
  call s:test_dynamic_max_total_with_numeric()
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
