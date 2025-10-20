" Phase D-6: Process3 Sub2 - word_detector.vim統合
" TDD Red Phase: テストケース作成

" runtimepathを設定
let s:plugin_root = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_root

" autoloadファイルを明示的にロード
execute 'source ' . s:plugin_root . '/autoload/hellshake_yano_vim/japanese.vim'
execute 'source ' . s:plugin_root . '/autoload/hellshake_yano_vim/word_detector.vim'

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

function! s:assert_contains(list, item, message) abort
  let found = v:false
  for elem in a:list
    if elem ==# a:item
      let found = v:true
      break
    endif
  endfor
  call s:assert_true(found, a:message . ' - should contain: ' . string(a:item))
endfunction

function! s:assert_list_not_empty(list, message) abort
  call s:assert_true(len(a:list) > 0, a:message)
endfunction

" ヘルパー関数：バッファをクリアして新しいテキストを設定
function! s:setup_buffer(lines) abort
  silent! %delete _
  call setline(1, a:lines)
  normal! gg0
endfunction

" ヘルパー関数：単語データから特定の単語を検索
function! s:find_word(words, text) abort
  for word in a:words
    if word.text ==# a:text
      return word
    endif
  endfor
  return {}
endfunction

" ======================================
" Test 1-5: 純粋な日本語テキスト検出
" ======================================

" Test 1: 基本的な日本語文
function! s:test_japanese_basic() abort
  let s:test_name = 'test_japanese_basic'
  call s:setup_buffer(['これはテストです'])

  let words = hellshake_yano_vim#word_detector#detect_visible()

  " 日本語単語が検出される
  call s:assert_list_not_empty(words, 'should detect japanese words')

  " 各単語に必要なフィールドがある
  for word in words
    call s:assert_true(has_key(word, 'text'), 'word should have text field')
    call s:assert_true(has_key(word, 'lnum'), 'word should have lnum field')
    call s:assert_true(has_key(word, 'col'), 'word should have col field')
    call s:assert_true(has_key(word, 'end_col'), 'word should have end_col field')
  endfor
endfunction

" Test 2: 漢字・ひらがな・カタカナ混在
function! s:test_japanese_mixed_scripts() abort
  let s:test_name = 'test_japanese_mixed_scripts'
  call s:setup_buffer(['漢字とひらがなとカタカナが混在'])

  let words = hellshake_yano_vim#word_detector#detect_visible()

  call s:assert_list_not_empty(words, 'should detect mixed script japanese')
endfunction

" Test 3: 助詞の結合確認（postProcessSegments動作）
function! s:test_japanese_particles() abort
  let s:test_name = 'test_japanese_particles'
  call s:setup_buffer(['私はプログラマーです'])

  let words = hellshake_yano_vim#word_detector#detect_visible()

  call s:assert_list_not_empty(words, 'should detect words with particles')
  " TinySegmenterが助詞を結合するかはDenops側の実装次第
  " ここでは単語が検出されることを確認
endfunction

" Test 4: 数字と単位の結合確認
function! s:test_japanese_numbers_with_units() abort
  let s:test_name = 'test_japanese_numbers_with_units'
  call s:setup_buffer(['100円で買いました'])

  let words = hellshake_yano_vim#word_detector#detect_visible()

  call s:assert_list_not_empty(words, 'should detect numbers with units')
endfunction

" Test 5: 括弧内テキストの結合確認
function! s:test_japanese_parentheses() abort
  let s:test_name = 'test_japanese_parentheses'
  call s:setup_buffer(['これは（注釈）です'])

  let words = hellshake_yano_vim#word_detector#detect_visible()

  call s:assert_list_not_empty(words, 'should detect words with parentheses')
endfunction

" ======================================
" Test 6-10: 英数字と日本語の混在テキスト
" ======================================

" Test 6: 基本的な混在
function! s:test_mixed_basic() abort
  let s:test_name = 'test_mixed_basic'
  call s:setup_buffer(['Hello これは test です'])

  let words = hellshake_yano_vim#word_detector#detect_visible()

  call s:assert_list_not_empty(words, 'should detect mixed text words')

  " 日本語単語が検出される（has_japanese() が v:true になる）
  let has_japanese_word = v:false
  for word in words
    if hellshake_yano_vim#japanese#has_japanese(word.text)
      let has_japanese_word = v:true
      break
    endif
  endfor
  call s:assert_true(has_japanese_word, 'should detect at least one japanese word')
endfunction

" Test 7: 変数名と日本語の混在
function! s:test_mixed_variable_names() abort
  let s:test_name = 'test_mixed_variable_names'
  call s:setup_buffer(['変数名variable_nameの説明'])

  let words = hellshake_yano_vim#word_detector#detect_visible()

  call s:assert_list_not_empty(words, 'should detect words in mixed variable context')
endfunction

" Test 8: プログラミング言語名
function! s:test_mixed_language_name() abort
  let s:test_name = 'test_mixed_language_name'
  call s:setup_buffer(['プログラミング言語Python'])

  let words = hellshake_yano_vim#word_detector#detect_visible()

  call s:assert_list_not_empty(words, 'should detect programming language names')
endfunction

" Test 9: 行頭・行末に日本語/英数字
function! s:test_mixed_line_edges() abort
  let s:test_name = 'test_mixed_line_edges'
  call s:setup_buffer([
    \ '日本語 at start',
    \ 'English 日本語 middle',
    \ 'end with 日本語'
  \ ])

  let words = hellshake_yano_vim#word_detector#detect_visible()

  call s:assert_list_not_empty(words, 'should detect words at line edges')
endfunction

" Test 10: 空白区切りの混在
function! s:test_mixed_whitespace_separated() abort
  let s:test_name = 'test_mixed_whitespace_separated'
  call s:setup_buffer(['単語 word 単語 word'])

  let words = hellshake_yano_vim#word_detector#detect_visible()

  call s:assert_list_not_empty(words, 'should detect whitespace separated mixed words')
endfunction

" ======================================
" Test 11-15: 英数字のみの後方互換性
" ======================================

" Test 11: 基本的な英単語
function! s:test_english_basic() abort
  let s:test_name = 'test_english_basic'
  call s:setup_buffer(['hello world test'])

  let words = hellshake_yano_vim#word_detector#detect_visible()

  call s:assert_list_not_empty(words, 'should detect english words')

  " 既存のmatchstrpos()ロジックで検出される
  let hello = s:find_word(words, 'hello')
  call s:assert_true(!empty(hello), 'should find "hello"')

  let world = s:find_word(words, 'world')
  call s:assert_true(!empty(world), 'should find "world"')
endfunction

" Test 12: アンダースコア付き変数名
function! s:test_english_underscore() abort
  let s:test_name = 'test_english_underscore'
  call s:setup_buffer(['variable_name function_call'])

  let words = hellshake_yano_vim#word_detector#detect_visible()

  call s:assert_list_not_empty(words, 'should detect underscore words')

  let var = s:find_word(words, 'variable_name')
  call s:assert_true(!empty(var), 'should find "variable_name"')
endfunction

" Test 13: 既存のmatchstrpos()ロジックが動作
function! s:test_english_matchstrpos_logic() abort
  let s:test_name = 'test_english_matchstrpos_logic'
  call s:setup_buffer(['test123 abc456'])

  let words = hellshake_yano_vim#word_detector#detect_visible()

  call s:assert_list_not_empty(words, 'should use matchstrpos logic for english')

  " 英数字混在でも検出される
  let test123 = s:find_word(words, 'test123')
  call s:assert_true(!empty(test123), 'should find "test123"')
endfunction

" Test 14: データ構造が既存と同一
function! s:test_english_data_structure() abort
  let s:test_name = 'test_english_data_structure'
  call s:setup_buffer(['hello'])

  let words = hellshake_yano_vim#word_detector#detect_visible()

  call s:assert_equal(1, len(words), 'should have one word')

  let word = words[0]
  call s:assert_equal('hello', word.text, 'text should be "hello"')
  call s:assert_equal(1, word.lnum, 'lnum should be 1')
  call s:assert_equal(1, word.col, 'col should be 1 (1-indexed)')
  call s:assert_equal(6, word.end_col, 'end_col should be 6 (1-indexed)')
endfunction

" Test 15: 複数行の英単語
function! s:test_english_multiline() abort
  let s:test_name = 'test_english_multiline'
  call s:setup_buffer([
    \ 'first line',
    \ 'second line',
    \ 'third line'
  \ ])

  let words = hellshake_yano_vim#word_detector#detect_visible()

  " 6単語が検出される
  call s:assert_equal(6, len(words), 'should detect 6 words')
endfunction

" ======================================
" Test 16-20: エッジケース
" ======================================

" Test 16: 空行・空文字列
function! s:test_edge_empty_lines() abort
  let s:test_name = 'test_edge_empty_lines'
  call s:setup_buffer(['', 'test', ''])

  let words = hellshake_yano_vim#word_detector#detect_visible()

  " 空行はスキップされる
  call s:assert_equal(1, len(words), 'should skip empty lines')
  call s:assert_equal('test', words[0].text, 'should only detect "test"')
endfunction

" Test 17: 空白のみの行
function! s:test_edge_whitespace_only() abort
  let s:test_name = 'test_edge_whitespace_only'
  call s:setup_buffer(['   ', 'test', '  '])

  let words = hellshake_yano_vim#word_detector#detect_visible()

  " 空白のみの行はスキップされる
  call s:assert_equal(1, len(words), 'should skip whitespace-only lines')
endfunction

" Test 18: 1文字単語（ひらがな・カタカナ・漢字）
function! s:test_edge_single_char_japanese() abort
  let s:test_name = 'test_edge_single_char_japanese'
  call s:setup_buffer(['あ ア 漢'])

  let words = hellshake_yano_vim#word_detector#detect_visible()

  call s:assert_list_not_empty(words, 'should detect single char japanese')
endfunction

" Test 19: 特殊文字（記号、絵文字）
function! s:test_edge_special_chars() abort
  let s:test_name = 'test_edge_special_chars'
  call s:setup_buffer(['test!!! テスト！！！'])

  let words = hellshake_yano_vim#word_detector#detect_visible()

  call s:assert_list_not_empty(words, 'should handle special characters')
endfunction

" Test 20: 非常に長い行（1000文字以上）
function! s:test_edge_very_long_line() abort
  let s:test_name = 'test_edge_very_long_line'

  " 1000文字以上の行を作成
  let long_line = repeat('test ', 250) . 'テスト'
  call s:setup_buffer([long_line])

  let words = hellshake_yano_vim#word_detector#detect_visible()

  call s:assert_list_not_empty(words, 'should handle very long lines')
endfunction

" ======================================
" Test 21-25: Per-Key最小単語長との統合
" ======================================

" Test 21: perKeyMinLength適用（日本語単語）
function! s:test_min_length_japanese() abort
  let s:test_name = 'test_min_length_japanese'

  " 設定を一時的に変更
  let old_config = get(g:, 'hellshake_yano', {})
  let g:hellshake_yano = {
    \ 'perKeyMinLength': {'w': 3}
  \ }

  call s:setup_buffer(['テスト プログラミング'])

  let words = hellshake_yano_vim#word_detector#detect_visible()

  " word_filter#apply() で最小単語長フィルタが適用される想定
  " このテストではdetect_visible()が単語を検出することを確認
  call s:assert_list_not_empty(words, 'should detect words before filtering')

  " 設定を元に戻す
  let g:hellshake_yano = old_config
endfunction

" Test 22: defaultMinWordLengthフォールバック
function! s:test_min_length_default_fallback() abort
  let s:test_name = 'test_min_length_default_fallback'

  " defaultMinWordLength設定
  let old_config = get(g:, 'hellshake_yano', {})
  let g:hellshake_yano = {
    \ 'defaultMinWordLength': 2
  \ }

  let min_length = hellshake_yano_vim#word_detector#get_min_length('w')
  call s:assert_equal(2, min_length, 'should use defaultMinWordLength')

  " 設定を元に戻す
  let g:hellshake_yano = old_config
endfunction

" Test 23: word_filter#apply()との連携
function! s:test_min_length_filter_integration() abort
  let s:test_name = 'test_min_length_filter_integration'

  " word_filter.vimが存在するか確認
  try
    call hellshake_yano_vim#word_filter#apply([], 'w', 3)
    call s:assert_true(v:true, 'word_filter#apply() is available')
  catch /E117:/
    echo 'SKIP: word_filter.vim not available'
    return
  endtry
endfunction

" Test 24: original_index保持の確認
function! s:test_min_length_original_index() abort
  let s:test_name = 'test_min_length_original_index'

  call s:setup_buffer(['test hello world'])

  let words = hellshake_yano_vim#word_detector#detect_visible()

  " word_filter#apply()の後でもoriginal_indexが保持されることを想定
  " このテストではdetect_visible()が正しい順序で単語を返すことを確認
  call s:assert_equal(3, len(words), 'should detect 3 words')
  call s:assert_equal('test', words[0].text, 'first word should be "test"')
  call s:assert_equal('hello', words[1].text, 'second word should be "hello"')
  call s:assert_equal('world', words[2].text, 'third word should be "world"')
endfunction

" Test 25: ヒント位置のずれがないことを確認
function! s:test_min_length_hint_position() abort
  let s:test_name = 'test_min_length_hint_position'

  call s:setup_buffer(['hello world'])

  let words = hellshake_yano_vim#word_detector#detect_visible()

  " 各単語の位置が正確か確認
  let hello = words[0]
  call s:assert_equal(1, hello.col, '"hello" should start at col 1')
  call s:assert_equal(6, hello.end_col, '"hello" should end at col 6')

  let world = words[1]
  call s:assert_equal(7, world.col, '"world" should start at col 7')
  call s:assert_equal(12, world.end_col, '"world" should end at col 12')
endfunction

" すべてのテストを実行
function! s:run_all_tests() abort
  echo '=== Process3 Sub2: word_detector.vim統合 テスト開始 ==='
  echo ''

  " Test 1-5: 純粋な日本語テキスト検出
  call s:test_japanese_basic()
  call s:test_japanese_mixed_scripts()
  call s:test_japanese_particles()
  call s:test_japanese_numbers_with_units()
  call s:test_japanese_parentheses()

  " Test 6-10: 英数字と日本語の混在テキスト
  call s:test_mixed_basic()
  call s:test_mixed_variable_names()
  call s:test_mixed_language_name()
  call s:test_mixed_line_edges()
  call s:test_mixed_whitespace_separated()

  " Test 11-15: 英数字のみの後方互換性
  call s:test_english_basic()
  call s:test_english_underscore()
  call s:test_english_matchstrpos_logic()
  call s:test_english_data_structure()
  call s:test_english_multiline()

  " Test 16-20: エッジケース
  call s:test_edge_empty_lines()
  call s:test_edge_whitespace_only()
  call s:test_edge_single_char_japanese()
  call s:test_edge_special_chars()
  call s:test_edge_very_long_line()

  " Test 21-25: Per-Key最小単語長との統合
  call s:test_min_length_japanese()
  call s:test_min_length_default_fallback()
  call s:test_min_length_filter_integration()
  call s:test_min_length_original_index()
  call s:test_min_length_hint_position()

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
