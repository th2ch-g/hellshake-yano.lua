" Test for E945 fix in japanese.vim
" Vim 8.x compatibility test

let s:plugin_root = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_root

echo '=== Testing E945 Fix ==='
echo ''

" Test 1: japanese_pattern does not cause E945
echo 'Test 1: has_japanese() with hiragana'
try
  let result = hellshake_yano_vim#japanese#has_japanese('これはテストです')
  echo 'OK: has_japanese() works with hiragana (result=' . result . ')'
catch
  echo 'FAIL: ' . v:exception
endtry
echo ''

" Test 2: has_japanese() with katakana
echo 'Test 2: has_japanese() with katakana'
try
  let result = hellshake_yano_vim#japanese#has_japanese('テストデータ')
  echo 'OK: has_japanese() works with katakana (result=' . result . ')'
catch
  echo 'FAIL: ' . v:exception
endtry
echo ''

" Test 3: has_japanese() with kanji
echo 'Test 3: has_japanese() with kanji'
try
  let result = hellshake_yano_vim#japanese#has_japanese('日本語')
  echo 'OK: has_japanese() works with kanji (result=' . result . ')'
catch
  echo 'FAIL: ' . v:exception
endtry
echo ''

" Test 4: has_japanese() with mixed
echo 'Test 4: has_japanese() with mixed text'
try
  let result = hellshake_yano_vim#japanese#has_japanese('Hello 世界')
  echo 'OK: has_japanese() works with mixed text (result=' . result . ')'
catch
  echo 'FAIL: ' . v:exception
endtry
echo ''

" Test 5: has_japanese() with English only (should be false)
echo 'Test 5: has_japanese() with English only'
try
  let result = hellshake_yano_vim#japanese#has_japanese('Hello World')
  if !result
    echo 'OK: has_japanese() correctly returns false for English (result=' . result . ')'
  else
    echo 'FAIL: Expected false but got true'
  endif
catch
  echo 'FAIL: ' . v:exception
endtry
echo ''

" Test 6: segment() function does not cause E945
echo 'Test 6: segment() with Japanese text'
try
  let result = hellshake_yano_vim#japanese#segment('これはテストです')
  echo 'OK: segment() works (segments=' . len(result.segments) . ')'
catch
  echo 'FAIL: ' . v:exception
endtry
echo ''

echo '=== All E945 fix tests completed ==='
qall!
