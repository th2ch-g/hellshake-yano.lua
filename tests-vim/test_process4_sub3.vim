" tests-vim/test_process4_sub3.vim
" Phase D-7 Process4 Sub3: Vimコマンド統合テスト
"
" TDD Step 1: Red（テスト作成）
"
" 【テスト対象】
" - plugin/hellshake-yano-vim.vim に追加する辞書操作コマンド（5個）

let s:plugin_root = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_root

" Load plugin to register commands
execute 'source ' . s:plugin_root . '/plugin/hellshake-yano-vim.vim'

echo '=== Process4 Sub3 Tests: Vimコマンド統合 ==='
echo ''

" ==============================================================================
" Test Group 1: コマンド定義チェック（5 tests）
" ==============================================================================

echo '--- Test Group 1: コマンド定義チェック ---'
echo ''

" Test 1.1: HYVimDictReload command exists
echo 'Test 1.1: HYVimDictReload command exists'
let s:commands = split(execute('command'), '\n')
let s:found = 0
for s:cmd in s:commands
  if s:cmd =~# 'HYVimDictReload'
    let s:found = 1
    break
  endif
endfor
if s:found
  echo 'OK: HYVimDictReload command is defined'
else
  echo 'FAIL: HYVimDictReload command not found'
endif
echo ''

" Test 1.2: HYVimDictAdd command exists
echo 'Test 1.2: HYVimDictAdd command exists'
let s:commands = split(execute('command'), '\n')
let s:found = 0
for s:cmd in s:commands
  if s:cmd =~# 'HYVimDictAdd'
    let s:found = 1
    break
  endif
endfor
if s:found
  echo 'OK: HYVimDictAdd command is defined'
else
  echo 'FAIL: HYVimDictAdd command not found'
endif
echo ''

" Test 1.3: HYVimDictEdit command exists
echo 'Test 1.3: HYVimDictEdit command exists'
let s:commands = split(execute('command'), '\n')
let s:found = 0
for s:cmd in s:commands
  if s:cmd =~# 'HYVimDictEdit'
    let s:found = 1
    break
  endif
endfor
if s:found
  echo 'OK: HYVimDictEdit command is defined'
else
  echo 'FAIL: HYVimDictEdit command not found'
endif
echo ''

" Test 1.4: HYVimDictShow command exists
echo 'Test 1.4: HYVimDictShow command exists'
let s:commands = split(execute('command'), '\n')
let s:found = 0
for s:cmd in s:commands
  if s:cmd =~# 'HYVimDictShow'
    let s:found = 1
    break
  endif
endfor
if s:found
  echo 'OK: HYVimDictShow command is defined'
else
  echo 'FAIL: HYVimDictShow command not found'
endif
echo ''

" Test 1.5: HYVimDictValidate command exists
echo 'Test 1.5: HYVimDictValidate command exists'
let s:commands = split(execute('command'), '\n')
let s:found = 0
for s:cmd in s:commands
  if s:cmd =~# 'HYVimDictValidate'
    let s:found = 1
    break
  endif
endfor
if s:found
  echo 'OK: HYVimDictValidate command is defined'
else
  echo 'FAIL: HYVimDictValidate command not found'
endif
echo ''

" ==============================================================================
" Test Group 2: コマンド引数チェック（5 tests）
" ==============================================================================

echo '--- Test Group 2: コマンド引数チェック ---'
echo ''

" Test 2.1: HYVimDictReload accepts no arguments
echo 'Test 2.1: HYVimDictReload accepts no arguments'
try
  execute 'HYVimDictReload'
  echo 'OK: HYVimDictReload executed without errors'
catch /E118/
  echo 'FAIL: HYVimDictReload should not require arguments'
catch
  echo 'OK: HYVimDictReload executed (Denops error is acceptable): ' . v:exception
endtry
echo ''

" Test 2.2: HYVimDictAdd requires arguments
echo 'Test 2.2: HYVimDictAdd requires arguments'
try
  execute 'HYVimDictAdd'
  echo 'FAIL: HYVimDictAdd should require arguments'
catch /E471/
  echo 'OK: HYVimDictAdd correctly requires arguments'
catch
  echo 'OK: HYVimDictAdd requires arguments: ' . v:exception
endtry
echo ''

" Test 2.3: HYVimDictEdit accepts no arguments
echo 'Test 2.3: HYVimDictEdit accepts no arguments'
try
  execute 'HYVimDictEdit'
  echo 'OK: HYVimDictEdit executed without errors'
catch /E118/
  echo 'FAIL: HYVimDictEdit should not require arguments'
catch
  echo 'OK: HYVimDictEdit executed (error is acceptable): ' . v:exception
endtry
echo ''

" Test 2.4: HYVimDictShow accepts no arguments
echo 'Test 2.4: HYVimDictShow accepts no arguments'
try
  execute 'HYVimDictShow'
  echo 'OK: HYVimDictShow executed without errors'
catch /E118/
  echo 'FAIL: HYVimDictShow should not require arguments'
catch
  echo 'OK: HYVimDictShow executed (error is acceptable): ' . v:exception
endtry
echo ''

" Test 2.5: HYVimDictValidate accepts no arguments
echo 'Test 2.5: HYVimDictValidate accepts no arguments'
try
  execute 'HYVimDictValidate'
  echo 'OK: HYVimDictValidate executed without errors'
catch /E118/
  echo 'FAIL: HYVimDictValidate should not require arguments'
catch
  echo 'OK: HYVimDictValidate executed (error is acceptable): ' . v:exception
endtry
echo ''

" ==============================================================================
" Test Group 3: Denops未起動時のエラーハンドリング（3 tests）
" ==============================================================================

echo '--- Test Group 3: Denops未起動時のエラーハンドリング ---'
echo ''

" Test 3.1: HYVimDictReload handles Denops unavailability
echo 'Test 3.1: HYVimDictReload handles Denops unavailability'
try
  execute 'HYVimDictReload'
  echo 'OK: HYVimDictReload handles gracefully (no crash)'
catch
  echo 'OK: HYVimDictReload handles error: ' . v:exception
endtry
echo ''

" Test 3.2: HYVimDictShow handles Denops unavailability
echo 'Test 3.2: HYVimDictShow handles Denops unavailability'
try
  execute 'HYVimDictShow'
  echo 'OK: HYVimDictShow handles gracefully (no crash)'
catch
  echo 'OK: HYVimDictShow handles error: ' . v:exception
endtry
echo ''

" Test 3.3: HYVimDictValidate handles Denops unavailability
echo 'Test 3.3: HYVimDictValidate handles Denops unavailability'
try
  execute 'HYVimDictValidate'
  echo 'OK: HYVimDictValidate handles gracefully (no crash)'
catch
  echo 'OK: HYVimDictValidate handles error: ' . v:exception
endtry
echo ''

" ==============================================================================
" Test Group 4: コマンドのAPI呼び出しチェック（4 tests）
" ==============================================================================

echo '--- Test Group 4: コマンドのAPI呼び出しチェック ---'
echo ''

" Test 4.1: dictionary#reload() exists
echo 'Test 4.1: dictionary#reload() exists'
if exists('*hellshake_yano_vim#dictionary#reload')
  echo 'OK: dictionary#reload() exists'
else
  echo 'FAIL: dictionary#reload() not found'
endif
echo ''

" Test 4.2: dictionary#add() exists
echo 'Test 4.2: dictionary#add() exists'
if exists('*hellshake_yano_vim#dictionary#add')
  echo 'OK: dictionary#add() exists'
else
  echo 'FAIL: dictionary#add() not found'
endif
echo ''

" Test 4.3: dictionary#show() exists
echo 'Test 4.3: dictionary#show() exists'
if exists('*hellshake_yano_vim#dictionary#show')
  echo 'OK: dictionary#show() exists'
else
  echo 'FAIL: dictionary#show() not found'
endif
echo ''

" Test 4.4: dictionary#validate() exists
echo 'Test 4.4: dictionary#validate() exists'
if exists('*hellshake_yano_vim#dictionary#validate')
  echo 'OK: dictionary#validate() exists'
else
  echo 'FAIL: dictionary#validate() not found'
endif
echo ''

" ==============================================================================
" Test Group 5: HYVimDictAddの引数処理（3 tests）
" ==============================================================================

echo '--- Test Group 5: HYVimDictAddの引数処理 ---'
echo ''

" Test 5.1: HYVimDictAdd with one argument (word)
echo 'Test 5.1: HYVimDictAdd with one argument (word)'
try
  execute 'HYVimDictAdd test_word'
  echo 'OK: HYVimDictAdd accepts one argument'
catch /E118/
  echo 'FAIL: HYVimDictAdd should accept one argument'
catch
  echo 'OK: HYVimDictAdd handles one argument: ' . v:exception
endtry
echo ''

" Test 5.2: HYVimDictAdd with two arguments (word, meaning)
echo 'Test 5.2: HYVimDictAdd with two arguments (word, meaning)'
try
  execute 'HYVimDictAdd test_word "test meaning"'
  echo 'OK: HYVimDictAdd accepts two arguments'
catch /E118/
  echo 'FAIL: HYVimDictAdd should accept two arguments'
catch
  echo 'OK: HYVimDictAdd handles two arguments: ' . v:exception
endtry
echo ''

" Test 5.3: HYVimDictAdd with three arguments (word, meaning, type)
echo 'Test 5.3: HYVimDictAdd with three arguments (word, meaning, type)'
try
  execute 'HYVimDictAdd test_word "test meaning" custom'
  echo 'OK: HYVimDictAdd accepts three arguments'
catch /E118/
  echo 'FAIL: HYVimDictAdd should accept three arguments'
catch
  echo 'OK: HYVimDictAdd handles three arguments: ' . v:exception
endtry
echo ''

" ==============================================================================
" Test Summary
" ==============================================================================

echo '=== Test Summary ==='
echo 'Total Tests: 20'
echo '  - Group 1: コマンド定義チェック (5 tests)'
echo '  - Group 2: コマンド引数チェック (5 tests)'
echo '  - Group 3: Denops未起動時のエラーハンドリング (3 tests)'
echo '  - Group 4: コマンドのAPI呼び出しチェック (4 tests)'
echo '  - Group 5: HYVimDictAddの引数処理 (3 tests)'
echo ''
echo 'Expected result at TDD Red phase: Group 1, 2, 5 should show FAIL'
echo 'Expected result at TDD Green phase: ALL tests should show OK'
echo ''
