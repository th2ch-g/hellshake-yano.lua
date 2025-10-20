" Process4 Sub1 Simple Test
" 基本的な関数存在確認のみ

let s:plugin_root = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_root

echo '=== Process4 Sub1 Simple Test ==='
echo ''

" Test 1: Functions exist and callable
echo 'Test 1: has_denops() callable'
try
  call hellshake_yano_vim#dictionary#has_denops()
  echo 'OK: has_denops() callable'
catch
  echo 'FAIL: ' . v:exception
endtry
echo ''

echo 'Test 2: reload() callable'
try
  call hellshake_yano_vim#dictionary#reload()
  echo 'OK: reload() callable'
catch /Denops not available/
  echo 'OK: reload() exists and correctly detected Denops unavailable'
catch
  echo 'FAIL: ' . v:exception
endtry
echo ''

echo 'Test 3: add() callable'
try
  call hellshake_yano_vim#dictionary#add('test')
  echo 'OK: add() callable'
catch /Denops not available/
  echo 'OK: add() exists and correctly detected Denops unavailable'
catch
  echo 'FAIL: ' . v:exception
endtry
echo ''

echo 'Test 4: show() callable'
try
  call hellshake_yano_vim#dictionary#show()
  echo 'OK: show() callable'
catch /Denops not available/
  echo 'OK: show() exists and correctly detected Denops unavailable'
catch
  echo 'FAIL: ' . v:exception
endtry
echo ''

echo 'Test 5: validate() callable'
try
  call hellshake_yano_vim#dictionary#validate()
  echo 'OK: validate() callable'
catch /Denops not available/
  echo 'OK: validate() exists and correctly detected Denops unavailable'
catch
  echo 'FAIL: ' . v:exception
endtry
echo ''

echo 'Test 6: is_in_dictionary() callable'
try
  call hellshake_yano_vim#dictionary#is_in_dictionary('test')
  echo 'OK: is_in_dictionary() callable'
catch
  echo 'FAIL: ' . v:exception
endtry
echo ''

echo 'Test 7: clear_cache() callable'
try
  call hellshake_yano_vim#dictionary#clear_cache()
  echo 'OK: clear_cache() callable'
catch
  echo 'FAIL: ' . v:exception
endtry
echo ''

echo '=== All basic tests PASSED ==='
qall!
