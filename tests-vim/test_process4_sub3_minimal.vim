" Minimal test for Process4 Sub3
let s:plugin_root = expand('<sfile>:p:h:h')
execute 'source ' . s:plugin_root . '/plugin/hellshake-yano-vim.vim'

echo 'Test 1: HYVimDictReload exists'
echo (exists(':HYVimDictReload') == 2 ? 'PASS' : 'FAIL')

echo 'Test 2: HYVimDictAdd exists'
echo (exists(':HYVimDictAdd') == 2 ? 'PASS' : 'FAIL')

echo 'Test 3: HYVimDictEdit exists'
echo (exists(':HYVimDictEdit') == 2 ? 'PASS' : 'FAIL')

echo 'Test 4: HYVimDictShow exists'
echo (exists(':HYVimDictShow') == 2 ? 'PASS' : 'FAIL')

echo 'Test 5: HYVimDictValidate exists'
echo (exists(':HYVimDictValidate') == 2 ? 'PASS' : 'FAIL')

echo 'Test 6: s:dict_reload exists'
echo (exists('*s:dict_reload') ? 'PASS' : 'FAIL')

echo 'Test 7: s:dict_add exists'
echo (exists('*s:dict_add') ? 'PASS' : 'FAIL')

echo 'Test 8: s:dict_show exists'
echo (exists('*s:dict_show') ? 'PASS' : 'FAIL')

echo 'Test 9: s:dict_validate exists'
echo (exists('*s:dict_validate') ? 'PASS' : 'FAIL')

echo 'Test 10: dictionary#reload exists'
echo (exists('*hellshake_yano_vim#dictionary#reload') ? 'PASS' : 'FAIL')

echo 'Done'
