" Phase D-6: Process3 Sub2 - 簡易テスト

" runtimepathを設定
let s:plugin_root = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_root

" autoloadファイルを明示的にロード
execute 'source ' . s:plugin_root . '/autoload/hellshake_yano_vim/japanese.vim'
execute 'source ' . s:plugin_root . '/autoload/hellshake_yano_vim/word_detector.vim'

echo '=== Process3 Sub2 簡易テスト開始 ==='
echo ''

" ヘルパー関数：バッファをクリアして新しいテキストを設定
function! s:setup_buffer(lines) abort
  silent! %delete _
  call setline(1, a:lines)
  normal! gg0
endfunction

" ======================================
" Test 1-5: 基本的な日本語検出
" ======================================

" Test 1: 純粋な日本語文の検出
echo 'Test 1: 純粋な日本語文の検出'
call s:setup_buffer(['これはテストです'])
let words_test1 = hellshake_yano_vim#word_detector#detect_visible()
echo '  Words detected: ' . len(words_test1)
echo '  Result: ' . (len(words_test1) > 0 ? 'PASS' : 'FAIL')

" Test 2: 漢字・ひらがな・カタカナ混在
echo ''
echo 'Test 2: 漢字・ひらがな・カタカナ混在'
call s:setup_buffer(['漢字とひらがなとカタカナが混在'])
let words_test2 = hellshake_yano_vim#word_detector#detect_visible()
echo '  Words detected: ' . len(words_test2)
echo '  Result: ' . (len(words_test2) > 0 ? 'PASS' : 'FAIL')

" Test 3: データ構造確認
echo ''
echo 'Test 3: データ構造確認'
call s:setup_buffer(['テスト'])
let words_test3 = hellshake_yano_vim#word_detector#detect_visible()
if len(words_test3) > 0
  let word = words_test3[0]
  echo '  Has text field: ' . (has_key(word, 'text') ? 'PASS' : 'FAIL')
  echo '  Has lnum field: ' . (has_key(word, 'lnum') ? 'PASS' : 'FAIL')
  echo '  Has col field: ' . (has_key(word, 'col') ? 'PASS' : 'FAIL')
  echo '  Has end_col field: ' . (has_key(word, 'end_col') ? 'PASS' : 'FAIL')
else
  echo '  FAIL: No words detected'
endif

" Test 4: 助詞の処理
echo ''
echo 'Test 4: 助詞の処理'
call s:setup_buffer(['私はプログラマーです'])
let words_test4 = hellshake_yano_vim#word_detector#detect_visible()
echo '  Words detected: ' . len(words_test4)
echo '  Result: ' . (len(words_test4) > 0 ? 'PASS' : 'FAIL')

" Test 5: 複数行の日本語
echo ''
echo 'Test 5: 複数行の日本語'
call s:setup_buffer(['これは', 'テストです'])
let words_test5 = hellshake_yano_vim#word_detector#detect_visible()
echo '  Words detected: ' . len(words_test5)
echo '  Result: ' . (len(words_test5) > 0 ? 'PASS' : 'FAIL')

" ======================================
" Test 6-8: 混在テキスト検出
" ======================================

" Test 6: 英語と日本語の混在
echo ''
echo 'Test 6: 英語と日本語の混在'
call s:setup_buffer(['Hello これは test です'])
let words_test6 = hellshake_yano_vim#word_detector#detect_visible()
echo '  Words detected: ' . len(words_test6)
echo '  Result: ' . (len(words_test6) > 0 ? 'PASS' : 'FAIL')

" Test 7: 変数名と日本語
echo ''
echo 'Test 7: 変数名と日本語'
call s:setup_buffer(['変数名variable_nameの説明'])
let words_test7 = hellshake_yano_vim#word_detector#detect_visible()
echo '  Words detected: ' . len(words_test7)
echo '  Result: ' . (len(words_test7) > 0 ? 'PASS' : 'FAIL')

" Test 8: プログラミング言語名
echo ''
echo 'Test 8: プログラミング言語名'
call s:setup_buffer(['プログラミング言語Python'])
let words_test8 = hellshake_yano_vim#word_detector#detect_visible()
echo '  Words detected: ' . len(words_test8)
echo '  Result: ' . (len(words_test8) > 0 ? 'PASS' : 'FAIL')

" ======================================
" Test 9-10: 英数字のみの後方互換
" ======================================

" Test 9: 純粋な英語文
echo ''
echo 'Test 9: 純粋な英語文（後方互換性）'
call s:setup_buffer(['hello world test'])
let words_test9 = hellshake_yano_vim#word_detector#detect_visible()
echo '  Words detected: ' . len(words_test9)
echo '  Expected: 3'
echo '  Result: ' . (len(words_test9) == 3 ? 'PASS' : 'FAIL')

" Test 10: アンダースコア付き変数名
echo ''
echo 'Test 10: アンダースコア付き変数名（後方互換性）'
call s:setup_buffer(['variable_name function_call'])
let words_test10 = hellshake_yano_vim#word_detector#detect_visible()
echo '  Words detected: ' . len(words_test10)
echo '  Expected: 2'
echo '  Result: ' . (len(words_test10) == 2 ? 'PASS' : 'FAIL')

echo ''
echo '=== テスト完了 ==='

quit!
