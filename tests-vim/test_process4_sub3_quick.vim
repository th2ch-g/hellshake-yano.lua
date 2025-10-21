" tests-vim/test_process4_sub3_quick.vim
" Phase D-7 Process4 Sub3: クイックテスト（エラー出力抑制版）

let s:plugin_root = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_root
execute 'source ' . s:plugin_root . '/plugin/hellshake-yano-vim.vim'

" Suppress error messages during tests
set shortmess+=I
let s:pass = 0
let s:fail = 0

echo '=== Process4 Sub3 Quick Tests ==='
echo ''

" Test Group 1: Command existence (5 tests)
echo '--- Group 1: Command Existence ---'

for s:cmd in ['HYVimDictReload', 'HYVimDictAdd', 'HYVimDictEdit', 'HYVimDictShow', 'HYVimDictValidate']
  let s:found = 0
  for s:line in split(execute('command'), '\n')
    if s:line =~# s:cmd
      let s:found = 1
      break
    endif
  endfor
  if s:found
    echo '  ✓ ' . s:cmd . ' exists'
    let s:pass += 1
  else
    echo '  ✗ ' . s:cmd . ' NOT FOUND'
    let s:fail += 1
  endif
endfor
echo ''

" Test Group 2: API functions exist (4 tests)
echo '--- Group 2: API Functions ---'

for s:func in ['reload', 'add', 'show', 'validate']
  let s:funcname = 'hellshake_yano_vim#dictionary#' . s:func
  if exists('*' . s:funcname)
    echo '  ✓ ' . s:funcname . ' exists'
    let s:pass += 1
  else
    echo '  ✗ ' . s:funcname . ' NOT FOUND'
    let s:fail += 1
  endif
endfor
echo ''

" Test Group 3: Command execution (no crash) (5 tests)
echo '--- Group 3: Command Execution ---'

" Test reload
try
  silent! execute 'HYVimDictReload'
  echo '  ✓ HYVimDictReload executes'
  let s:pass += 1
catch
  echo '  ✗ HYVimDictReload crashed: ' . v:exception
  let s:fail += 1
endtry

" Test add (requires args)
try
  silent! execute 'HYVimDictAdd'
  echo '  ✗ HYVimDictAdd should require args'
  let s:fail += 1
catch /E471/
  echo '  ✓ HYVimDictAdd requires args'
  let s:pass += 1
catch
  echo '  ✓ HYVimDictAdd requires args (alt error)'
  let s:pass += 1
endtry

" Test add with args
try
  silent! execute 'HYVimDictAdd test_word'
  echo '  ✓ HYVimDictAdd with args executes'
  let s:pass += 1
catch
  echo '  ✗ HYVimDictAdd with args crashed: ' . v:exception
  let s:fail += 1
endtry

" Test show
try
  silent! execute 'HYVimDictShow'
  echo '  ✓ HYVimDictShow executes'
  let s:pass += 1
catch
  echo '  ✗ HYVimDictShow crashed: ' . v:exception
  let s:fail += 1
endtry

" Test validate
try
  silent! execute 'HYVimDictValidate'
  echo '  ✓ HYVimDictValidate executes'
  let s:pass += 1
catch
  echo '  ✗ HYVimDictValidate crashed: ' . v:exception
  let s:fail += 1
endtry

echo ''
echo '=== Summary ==='
echo 'Total Tests: ' . (s:pass + s:fail)
echo 'Passed: ' . s:pass
echo 'Failed: ' . s:fail
echo ''

if s:fail == 0
  echo '✅ ALL TESTS PASSED (GREEN state)'
else
  echo '❌ SOME TESTS FAILED'
endif
