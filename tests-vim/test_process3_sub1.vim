" Phase D-6: Process3 Sub1 - Denops TinySegmenter連携
" TDD Red Phase: テストケース作成

" runtimepathを設定
let s:plugin_root = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_root

" テスト結果カウンタ
let s:passed = 0
let s:failed = 0
let s:test_name = ''

" テストアサーション関数
function! s:assert_equal(expected, actual, message) abort
  if a:expected ==# a:actual
    let s:passed += 1
    echo 'PASS: ' . s:test_name . ' - ' . a:message
  else
    let s:failed += 1
    echo 'FAIL: ' . s:test_name . ' - ' . a:message
    echo '  Expected: ' . string(a:expected)
    echo '  Actual: ' . string(a:actual)
  endif
endfunction

function! s:assert_true(condition, message) abort
  call s:assert_equal(v:true, a:condition, a:message)
endfunction

function! s:assert_false(condition, message) abort
  call s:assert_equal(v:false, a:condition, a:message)
endfunction

" Test 1: japanese.vim が存在するか
function! s:test_japanese_file_exists() abort
  let s:test_name = 'test_japanese_file_exists'
  try
    call hellshake_yano_vim#japanese#segment('テスト')
    call s:assert_true(v:true, 'japanese.vim is loaded')
  catch /E117:/
    call s:assert_true(v:false, 'japanese.vim should be loadable')
  endtry
endfunction

" Test 2: segment() 関数の基本動作
function! s:test_segment_basic() abort
  let s:test_name = 'test_segment_basic'
  let l:result = hellshake_yano_vim#japanese#segment('これはテストです')

  " 結果が辞書型か確認
  call s:assert_true(type(l:result) == v:t_dict, 'result should be dictionary')

  " 必須キーが存在するか確認
  call s:assert_true(has_key(l:result, 'segments'), 'result should have segments key')
  call s:assert_true(has_key(l:result, 'success'), 'result should have success key')
  call s:assert_true(has_key(l:result, 'source'), 'result should have source key')

  " segments が配列か確認
  call s:assert_true(type(l:result.segments) == v:t_list, 'segments should be list')

  " segments が空でないか確認
  call s:assert_true(len(l:result.segments) > 0, 'segments should not be empty')
endfunction

" Test 3: Denops連携テスト（has('nvim')の場合）
function! s:test_segment_with_denops() abort
  let s:test_name = 'test_segment_with_denops'

  " Denops利用可能かチェック
  if !exists('*denops#plugin#is_loaded')
    echo 'SKIP: Denops not available'
    return
  endif

  if !denops#plugin#is_loaded('hellshake-yano')
    echo 'SKIP: hellshake-yano plugin not loaded'
    return
  endif

  let l:result = hellshake_yano_vim#japanese#segment('プログラミング言語')

  " Denopsから返されたか確認
  call s:assert_true(l:result.success, 'should succeed with denops')
  call s:assert_equal('tinysegmenter', l:result.source, 'should use tinysegmenter source')
  call s:assert_true(len(l:result.segments) > 0, 'segments should not be empty')
endfunction

" Test 4: フォールバック処理
function! s:test_segment_fallback() abort
  let s:test_name = 'test_segment_fallback'

  " Denopsが利用できない環境をシミュレート（空文字列で簡易テスト）
  let l:result = hellshake_yano_vim#japanese#segment('')

  " 空文字列の場合は空配列が返る
  call s:assert_true(type(l:result.segments) == v:t_list, 'segments should be list')
  call s:assert_equal(0, len(l:result.segments), 'empty text should return empty segments')
endfunction

" Test 5: 日本語判定テスト
function! s:test_has_japanese() abort
  let s:test_name = 'test_has_japanese'

  " 日本語を含むテキスト
  call s:assert_true(
    \ hellshake_yano_vim#japanese#has_japanese('これはテストです'),
    \ 'should detect hiragana'
    \ )

  call s:assert_true(
    \ hellshake_yano_vim#japanese#has_japanese('テスト'),
    \ 'should detect katakana'
    \ )

  call s:assert_true(
    \ hellshake_yano_vim#japanese#has_japanese('漢字'),
    \ 'should detect kanji'
    \ )

  call s:assert_true(
    \ hellshake_yano_vim#japanese#has_japanese('Hello世界'),
    \ 'should detect mixed text'
    \ )

  " 日本語を含まないテキスト
  call s:assert_false(
    \ hellshake_yano_vim#japanese#has_japanese('Hello World'),
    \ 'should not detect pure english'
    \ )

  call s:assert_false(
    \ hellshake_yano_vim#japanese#has_japanese('12345'),
    \ 'should not detect numbers'
    \ )
endfunction

" Test 6: セグメント化が必要か判定
function! s:test_should_segment() abort
  let s:test_name = 'test_should_segment'

  " 日本語で閾値以上の長さ
  call s:assert_true(
    \ hellshake_yano_vim#japanese#should_segment('これはテストです'),
    \ 'should segment long japanese text (threshold: 4)'
    \ )

  " 日本語だが閾値未満
  call s:assert_false(
    \ hellshake_yano_vim#japanese#should_segment('テス'),
    \ 'should not segment short japanese text'
    \ )

  " 日本語を含まない
  call s:assert_false(
    \ hellshake_yano_vim#japanese#should_segment('Hello World'),
    \ 'should not segment non-japanese text'
    \ )

  " カスタム閾値テスト
  call s:assert_true(
    \ hellshake_yano_vim#japanese#should_segment('テスト', 3),
    \ 'should segment with custom threshold (3)'
    \ )

  call s:assert_false(
    \ hellshake_yano_vim#japanese#should_segment('テスト', 5),
    \ 'should not segment when below custom threshold (5)'
    \ )
endfunction

" Test 7: 日本語と英語の混在テキスト
function! s:test_segment_mixed_text() abort
  let s:test_name = 'test_segment_mixed_text'
  let l:result = hellshake_yano_vim#japanese#segment('Hello世界Programming言語')

  call s:assert_true(type(l:result.segments) == v:t_list, 'segments should be list')
  call s:assert_true(len(l:result.segments) > 0, 'mixed text should be segmented')

  " 日本語部分が分割されているか確認（少なくとも2つ以上のセグメント）
  call s:assert_true(len(l:result.segments) >= 2, 'should split into multiple segments')
endfunction

" Test 8: エラーハンドリング
function! s:test_segment_error_handling() abort
  let s:test_name = 'test_segment_error_handling'

  " 不正な引数型（数値）
  try
    let l:result = hellshake_yano_vim#japanese#segment(123)
    " エラーが発生しない場合は、型変換されて処理される
    call s:assert_true(type(l:result) == v:t_dict, 'should handle number input')
  catch
    " エラーが発生した場合も許容
    call s:assert_true(v:true, 'error is acceptable for invalid input')
  endtry

  " v:null
  try
    let l:result = hellshake_yano_vim#japanese#segment(v:null)
    call s:assert_true(type(l:result) == v:t_dict, 'should handle null input')
  catch
    call s:assert_true(v:true, 'error is acceptable for null input')
  endtry
endfunction

" すべてのテストを実行
function! s:run_all_tests() abort
  echo '=== Process3 Sub1: Denops TinySegmenter連携 テスト開始 ==='
  echo ''

  call s:test_japanese_file_exists()
  call s:test_segment_basic()
  call s:test_segment_with_denops()
  call s:test_segment_fallback()
  call s:test_has_japanese()
  call s:test_should_segment()
  call s:test_segment_mixed_text()
  call s:test_segment_error_handling()

  echo ''
  echo '=== テスト結果 ==='
  echo 'PASSED: ' . s:passed
  echo 'FAILED: ' . s:failed
  echo 'TOTAL: ' . (s:passed + s:failed)

  if s:failed > 0
    echo ''
    echo '❌ テスト失敗'
    cquit 1
  else
    echo ''
    echo '✅ すべてのテストが成功しました'
  endif
endfunction

" テストを実行
call s:run_all_tests()
