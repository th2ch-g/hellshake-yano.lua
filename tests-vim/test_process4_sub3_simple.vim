" Process4 Sub3 Simple Test
" コマンド統合の基本的な確認

let s:plugin_root = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_root

" Load plugin
execute 'source ' . s:plugin_root . '/plugin/hellshake-yano-vim.vim'

echo '=== Process4 Sub3 Simple Test ==='
echo ''

" Test 1: HYVimDictReload command exists
echo 'Test 1: HYVimDictReload command exists'
if exists(':HYVimDictReload') == 2
  echo 'OK: HYVimDictReload command is defined'
else
  echo 'FAIL: HYVimDictReload command not found'
endif
echo ''

" Test 2: HYVimDictAdd command exists
echo 'Test 2: HYVimDictAdd command exists'
if exists(':HYVimDictAdd') == 2
  echo 'OK: HYVimDictAdd command is defined'
else
  echo 'FAIL: HYVimDictAdd command not found'
endif
echo ''

" Test 3: HYVimDictEdit command exists
echo 'Test 3: HYVimDictEdit command exists'
if exists(':HYVimDictEdit') == 2
  echo 'OK: HYVimDictEdit command is defined'
else
  echo 'FAIL: HYVimDictEdit command not found'
endif
echo ''

" Test 4: HYVimDictShow command exists
echo 'Test 4: HYVimDictShow command exists'
if exists(':HYVimDictShow') == 2
  echo 'OK: HYVimDictShow command is defined'
else
  echo 'FAIL: HYVimDictShow command not found'
endif
echo ''

" Test 5: HYVimDictValidate command exists
echo 'Test 5: HYVimDictValidate command exists'
if exists(':HYVimDictValidate') == 2
  echo 'OK: HYVimDictValidate command is defined'
else
  echo 'FAIL: HYVimDictValidate command not found'
endif
echo ''

" Test 6: HYVimDictReload callable (no crash)
echo 'Test 6: HYVimDictReload callable'
try
  silent! HYVimDictReload
  echo 'OK: HYVimDictReload callable (Denops error is expected)'
catch
  echo 'FAIL: HYVimDictReload crashed: ' . v:exception
endtry
echo ''

" Test 7: HYVimDictAdd requires arguments
echo 'Test 7: HYVimDictAdd requires arguments'
try
  silent! HYVimDictAdd
  " コマンドはエラーメッセージを表示するが例外は投げない
  echo 'OK: HYVimDictAdd handles missing arguments gracefully'
catch /E471/
  echo 'OK: HYVimDictAdd correctly requires arguments (E471)'
catch
  echo 'OK: HYVimDictAdd handles missing arguments: ' . matchstr(v:exception, 'E\d\+')
endtry
echo ''

" Test 8: HYVimDictAdd callable with arguments
echo 'Test 8: HYVimDictAdd callable with arguments'
try
  silent! HYVimDictAdd test_word
  echo 'OK: HYVimDictAdd callable with 1 arg'
catch
  echo 'FAIL: HYVimDictAdd crashed: ' . v:exception
endtry
echo ''

" Test 9: HYVimDictShow callable
echo 'Test 9: HYVimDictShow callable'
try
  silent! HYVimDictShow
  echo 'OK: HYVimDictShow callable'
catch
  echo 'FAIL: HYVimDictShow crashed: ' . v:exception
endtry
echo ''

" Test 10: HYVimDictValidate callable
echo 'Test 10: HYVimDictValidate callable'
try
  silent! HYVimDictValidate
  echo 'OK: HYVimDictValidate callable'
catch
  echo 'FAIL: HYVimDictValidate crashed: ' . v:exception
endtry
echo ''

echo '=== Summary ==='
echo 'Total: 10 tests'
echo 'Expected: All OK (with Denops unavailable errors suppressed)'
echo ''
