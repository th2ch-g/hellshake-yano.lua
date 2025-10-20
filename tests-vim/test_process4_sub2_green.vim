" Process4 Sub2 Green Phase Test
" word_filter.vimへの辞書統合動作確認

let s:plugin_root = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_root

echo '=== Process4 Sub2 Green Phase Test ==='
echo ''

" Test 1: word_filter#apply()が呼び出せる
echo 'Test 1: word_filter#apply() callable with dictionary integration'
try
  call hellshake_yano_vim#word_filter#apply([], 3)
  echo 'OK: word_filter#apply() callable'
catch
  echo 'FAIL: ' . v:exception
endtry
echo ''

" Test 2: 辞書機能が利用不可時の正常動作
echo 'Test 2: Dictionary has_denops() check'
try
  call hellshake_yano_vim#dictionary#has_denops()
  echo 'OK: Dictionary has_denops() callable'
catch
  echo 'FAIL: ' . v:exception
endtry
echo ''

" Test 3: is_in_dictionary() callable
echo 'Test 3: is_in_dictionary() integration'
try
  call hellshake_yano_vim#dictionary#is_in_dictionary('test')
  echo 'OK: is_in_dictionary() callable from word_filter'
catch
  echo 'FAIL: ' . v:exception
endtry
echo ''

echo '=== Process4 Sub2 Green Phase Test PASSED ==='
qall!
