" tests-vim/test_process2_sub2.vim - Process2 Sub2テスト
" Phase D-2 Sub2: Per-Key最小単語長機能のテスト
"
" テスト対象:
"   - hellshake_yano_vim#word_detector#get_min_length() 関数
"   - perKeyMinLength辞書のサポート
"   - defaultMinWordLengthフォールバック
"   - word_filter.vimとの統合

" テスト環境設定
set nocompatible
filetype off

" runtimepathにプラグインディレクトリを追加
let s:plugin_dir = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_dir

" 必要なファイルを読み込み
execute 'source ' . s:plugin_dir . '/autoload/hellshake_yano_vim/word_detector.vim'
execute 'source ' . s:plugin_dir . '/autoload/hellshake_yano_vim/word_filter.vim'
execute 'source ' . s:plugin_dir . '/autoload/hellshake_yano_vim/core.vim'
execute 'source ' . s:plugin_dir . '/autoload/hellshake_yano_vim/visual.vim'

" テストカウンター
let s:test_count = 0
let s:pass_count = 0
let s:fail_count = 0

" アサート関数
function! s:assert_equal(expected, actual, message) abort
  let s:test_count += 1
  if a:expected ==# a:actual
    let s:pass_count += 1
    echo '  ✓ ' . a:message
  else
    let s:fail_count += 1
    echo '  ✗ ' . a:message
    echo '    Expected: ' . string(a:expected)
    echo '    Actual:   ' . string(a:actual)
  endif
endfunction

function! s:assert_true(condition, message) abort
  call s:assert_equal(v:true, a:condition, a:message)
endfunction

function! s:assert_false(condition, message) abort
  call s:assert_equal(v:false, a:condition, a:message)
endfunction

" テストヘルパー: 設定のクリア
function! s:clear_config() abort
  unlet! g:hellshake_yano
endfunction

" ========================================
" Test Suite 1: word_detector#get_min_length()の基本機能
" ========================================
function! s:test_get_min_length_basic() abort
  echo ''
  echo 'Test Suite 1: word_detector#get_min_length()の基本機能'

  call s:clear_config()

  " Test 1: perKeyMinLengthでキー別設定を取得
  let g:hellshake_yano = {
    \ 'perKeyMinLength': {
    \   'w': 3,
    \   'b': 2,
    \   'e': 4
    \ },
    \ 'defaultMinWordLength': 2
    \ }

  call s:assert_equal(3, hellshake_yano_vim#word_detector#get_min_length('w'),
    \ 'perKeyMinLength: w=3')
  call s:assert_equal(2, hellshake_yano_vim#word_detector#get_min_length('b'),
    \ 'perKeyMinLength: b=2')
  call s:assert_equal(4, hellshake_yano_vim#word_detector#get_min_length('e'),
    \ 'perKeyMinLength: e=4')

  " Test 2: 未定義キーはdefaultMinWordLengthにフォールバック
  call s:assert_equal(2, hellshake_yano_vim#word_detector#get_min_length('h'),
    \ 'defaultMinWordLengthフォールバック: h=2')
  call s:assert_equal(2, hellshake_yano_vim#word_detector#get_min_length('j'),
    \ 'defaultMinWordLengthフォールバック: j=2')

  " Test 3: perKeyMinLengthが空の場合
  let g:hellshake_yano = {
    \ 'perKeyMinLength': {},
    \ 'defaultMinWordLength': 3
    \ }

  call s:assert_equal(3, hellshake_yano_vim#word_detector#get_min_length('w'),
    \ '空perKeyMinLength: defaultMinWordLengthを使用')

  " Test 4: perKeyMinLengthが未定義の場合
  let g:hellshake_yano = {
    \ 'defaultMinWordLength': 4
    \ }

  call s:assert_equal(4, hellshake_yano_vim#word_detector#get_min_length('w'),
    \ 'perKeyMinLength未定義: defaultMinWordLengthを使用')

  " Test 5: defaultMinWordLengthも未定義の場合（デフォルト値=3）
  let g:hellshake_yano = {}

  call s:assert_equal(3, hellshake_yano_vim#word_detector#get_min_length('w'),
    \ '全未定義: デフォルト値3を使用')

  call s:clear_config()
endfunction

" ========================================
" Test Suite 2: word_filterとの統合テスト
" ========================================
function! s:test_word_filter_integration() abort
  echo ''
  echo 'Test Suite 2: word_filterとの統合テスト'

  call s:clear_config()

  " 設定: wキーは最小3文字、bキーは最小2文字
  let g:hellshake_yano = {
    \ 'perKeyMinLength': {
    \   'w': 3,
    \   'b': 2
    \ },
    \ 'defaultMinWordLength': 2
    \ }

  " サンプル単語リスト
  let l:words = [
    \ {'lnum': 1, 'col': 1, 'word': 'a'},
    \ {'lnum': 1, 'col': 3, 'word': 'ab'},
    \ {'lnum': 1, 'col': 6, 'word': 'abc'},
    \ {'lnum': 1, 'col': 10, 'word': 'abcd'},
    \ {'lnum': 1, 'col': 15, 'word': 'abcde'}
    \ ]

  " Test 1: wキー（最小3文字）でフィルタリング
  let l:min_length_w = hellshake_yano_vim#word_detector#get_min_length('w')
  let l:filtered_w = hellshake_yano_vim#word_filter#apply(l:words, l:min_length_w)

  call s:assert_equal(3, len(l:filtered_w),
    \ 'wキー: 3文字以上の単語のみ（3個）')
  call s:assert_equal('abc', l:filtered_w[0].word,
    \ 'wキー: 1つ目の単語=abc')
  call s:assert_equal('abcd', l:filtered_w[1].word,
    \ 'wキー: 2つ目の単語=abcd')
  call s:assert_equal('abcde', l:filtered_w[2].word,
    \ 'wキー: 3つ目の単語=abcde')

  " Test 2: original_indexが保持されていること
  call s:assert_equal(2, l:filtered_w[0].original_index,
    \ 'wキー: 1つ目のoriginal_index=2')
  call s:assert_equal(3, l:filtered_w[1].original_index,
    \ 'wキー: 2つ目のoriginal_index=3')
  call s:assert_equal(4, l:filtered_w[2].original_index,
    \ 'wキー: 3つ目のoriginal_index=4')

  " Test 3: bキー（最小2文字）でフィルタリング
  let l:min_length_b = hellshake_yano_vim#word_detector#get_min_length('b')
  let l:filtered_b = hellshake_yano_vim#word_filter#apply(l:words, l:min_length_b)

  call s:assert_equal(4, len(l:filtered_b),
    \ 'bキー: 2文字以上の単語のみ（4個）')
  call s:assert_equal('ab', l:filtered_b[0].word,
    \ 'bキー: 1つ目の単語=ab')

  " Test 4: 空配列の安全な処理
  let l:filtered_empty = hellshake_yano_vim#word_filter#apply([], l:min_length_w)
  call s:assert_equal(0, len(l:filtered_empty),
    \ '空配列でもエラーなし')

  call s:clear_config()
endfunction

" ========================================
" Test Suite 3: core.vimでのフィルタリング動作
" ========================================
function! s:test_core_filtering() abort
  echo ''
  echo 'Test Suite 3: core.vimでのフィルタリング動作'

  call s:clear_config()

  " 設定: デフォルト最小単語長=3
  let g:hellshake_yano = {
    \ 'perKeyMinLength': {
    \   'w': 3
    \ },
    \ 'defaultMinWordLength': 2
    \ }

  " テストバッファを準備
  enew
  call setline(1, 'a ab abc abcd abcde')

  " core#init()で初期化
  call hellshake_yano_vim#core#init()

  " Note: core.vimのフィルタリング統合は実装後にテスト
  " ここでは設定が正しく読み込まれることのみ確認

  let l:min_length = hellshake_yano_vim#word_detector#get_min_length('w')
  call s:assert_equal(3, l:min_length,
    \ 'core.vim統合: wキーの最小単語長=3')

  bdelete!
  call s:clear_config()
endfunction

" ========================================
" Test Suite 4: visual.vimでのフィルタリング動作
" ========================================
function! s:test_visual_filtering() abort
  echo ''
  echo 'Test Suite 4: visual.vimでのフィルタリング動作'

  call s:clear_config()

  " 設定
  let g:hellshake_yano = {
    \ 'perKeyMinLength': {
    \   'v': 2
    \ },
    \ 'defaultMinWordLength': 3
    \ }

  " Note: visual.vimのフィルタリング統合は実装後にテスト
  " ここでは設定が正しく読み込まれることのみ確認

  let l:min_length = hellshake_yano_vim#word_detector#get_min_length('v')
  call s:assert_equal(2, l:min_length,
    \ 'visual.vim統合: vキーの最小単語長=2')

  call s:clear_config()
endfunction

" ========================================
" Test Suite 5: エッジケースと例外処理
" ========================================
function! s:test_edge_cases() abort
  echo ''
  echo 'Test Suite 5: エッジケースと例外処理'

  call s:clear_config()

  " Test 1: 不正な値（0以下）はdefaultMinWordLengthにフォールバック
  let g:hellshake_yano = {
    \ 'perKeyMinLength': {
    \   'w': 0,
    \   'b': -1
    \ },
    \ 'defaultMinWordLength': 2
    \ }

  call s:assert_equal(2, hellshake_yano_vim#word_detector#get_min_length('w'),
    \ '0以下の値: defaultにフォールバック (w=0→2)')
  call s:assert_equal(2, hellshake_yano_vim#word_detector#get_min_length('b'),
    \ '0以下の値: defaultにフォールバック (b=-1→2)')

  " Test 2: 非常に大きな値
  let g:hellshake_yano = {
    \ 'perKeyMinLength': {
    \   'w': 100
    \ }
    \ }

  call s:assert_equal(100, hellshake_yano_vim#word_detector#get_min_length('w'),
    \ '大きな値: 正常に動作 (w=100)')

  " Test 3: 特殊文字キー
  let g:hellshake_yano = {
    \ 'perKeyMinLength': {
    \   ' ': 1,
    \   '<CR>': 2
    \ },
    \ 'defaultMinWordLength': 3
    \ }

  call s:assert_equal(1, hellshake_yano_vim#word_detector#get_min_length(' '),
    \ '特殊文字キー: スペース=1')
  call s:assert_equal(2, hellshake_yano_vim#word_detector#get_min_length('<CR>'),
    \ '特殊文字キー: <CR>=2')

  call s:clear_config()
endfunction

" ========================================
" テスト実行
" ========================================
function! s:run_all_tests() abort
  echo '========================================'
  echo 'Process2 Sub2 Test Suite'
  echo 'Phase D-2: Per-Key最小単語長'
  echo '========================================'

  call s:test_get_min_length_basic()
  call s:test_word_filter_integration()
  call s:test_core_filtering()
  call s:test_visual_filtering()
  call s:test_edge_cases()

  echo ''
  echo '========================================'
  echo 'Test Results'
  echo '========================================'
  echo 'Total:  ' . s:test_count
  echo 'Passed: ' . s:pass_count
  echo 'Failed: ' . s:fail_count
  echo '========================================'

  if s:fail_count == 0
    echo 'All tests passed! ✓'
    qall!
  else
    echo 'Some tests failed! ✗'
    cquit!
  endif
endfunction

" テスト実行
call s:run_all_tests()
