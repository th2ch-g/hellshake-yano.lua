" Process4 Sub1: Dictionary Wrapper Tests
" Phase D-7: 辞書システム - Denops連携ラッパー
" TDD Red Phase: テストファースト

" Setup runtimepath to load autoload functions
let s:plugin_root = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_root

" Test counter
let s:test_count = 0
let s:pass_count = 0
let s:fail_count = 0

function! s:assert(condition, message) abort
  let s:test_count += 1
  if a:condition
    let s:pass_count += 1
    echo 'OK: ' . a:message
  else
    let s:fail_count += 1
    echomsg 'FAIL: ' . a:message
  endif
endfunction

function! s:run_tests() abort
  echo '=== Process4 Sub1: Dictionary Wrapper Tests ==='
  echo ''

  " Test 1: has_denops() function exists
  echo 'Test 1: has_denops() function exists'
  try
    let l:result = hellshake_yano_vim#dictionary#has_denops()
    call s:assert(v:true, 'has_denops() function callable')
  catch
    call s:assert(v:false, 'has_denops() function exists - ERROR: ' . v:exception)
  endtry
  echo ''

  " Test 2: has_denops() returns boolean
  echo 'Test 2: has_denops() returns boolean type'
  try
    let l:result = hellshake_yano_vim#dictionary#has_denops()
    call s:assert(type(l:result) == v:t_bool, 'has_denops() returns boolean (type=' . type(l:result) . ')')
  catch
    call s:assert(v:false, 'has_denops() returns boolean - ERROR: ' . v:exception)
  endtry
  echo ''

  " Test 3: reload() function exists
  echo 'Test 3: reload() function exists'
  try
    let l:result = hellshake_yano_vim#dictionary#reload()
    call s:assert(v:true, 'reload() function callable')
  catch /E117/
    call s:assert(v:false, 'reload() function exists - ERROR: ' . v:exception)
  catch
    " Other errors are OK for now (e.g., Denops not available)
    call s:assert(v:true, 'reload() function exists but failed as expected: ' . v:exception)
  endtry
  echo ''

  " Test 4: add() function exists
  echo 'Test 4: add() function exists'
  try
    let l:result = hellshake_yano_vim#dictionary#add('test', 'meaning', 'n')
    call s:assert(v:true, 'add() function callable')
  catch /E117/
    call s:assert(v:false, 'add() function exists - ERROR: ' . v:exception)
  catch
    " Other errors are OK for now
    call s:assert(v:true, 'add() function exists but failed as expected: ' . v:exception)
  endtry
  echo ''

  " Test 5: show() function exists
  echo 'Test 5: show() function exists'
  try
    call hellshake_yano_vim#dictionary#show()
    call s:assert(v:true, 'show() function callable')
  catch /E117/
    call s:assert(v:false, 'show() function exists - ERROR: ' . v:exception)
  catch
    " Other errors are OK for now
    call s:assert(v:true, 'show() function exists but failed as expected: ' . v:exception)
  endtry
  echo ''

  " Test 6: validate() function exists
  echo 'Test 6: validate() function exists'
  try
    let l:result = hellshake_yano_vim#dictionary#validate()
    call s:assert(v:true, 'validate() function callable')
  catch /E117/
    call s:assert(v:false, 'validate() function exists - ERROR: ' . v:exception)
  catch
    " Other errors are OK for now
    call s:assert(v:true, 'validate() function exists but failed as expected: ' . v:exception)
  endtry
  echo ''

  " Test 7: is_in_dictionary() function exists
  echo 'Test 7: is_in_dictionary() function exists'
  try
    let l:result = hellshake_yano_vim#dictionary#is_in_dictionary('test')
    call s:assert(type(l:result) == v:t_bool, 'is_in_dictionary() returns boolean (type=' . type(l:result) . ')')
  catch
    call s:assert(v:false, 'is_in_dictionary() function exists - ERROR: ' . v:exception)
  endtry
  echo ''

  " Test 8: Error handling when Denops unavailable
  echo 'Test 8: Functions handle Denops unavailability gracefully'
  " This test checks that functions don't crash when Denops is unavailable
  " We expect them to return v:false (echoerr is expected, we catch it)
  try
    let l:has_denops = hellshake_yano_vim#dictionary#has_denops()
    if !l:has_denops
      " reload() will echoerr, so we need to catch that
      let l:reload_result = v:null
      try
        let l:reload_result = hellshake_yano_vim#dictionary#reload()
      catch /Denops not available/
        let l:reload_result = v:false
      endtry
      call s:assert(type(l:reload_result) == v:t_bool && !l:reload_result,
        \ 'reload() returns false when Denops unavailable')
    else
      call s:assert(v:true, 'Denops is available, skipping unavailability test')
    endif
  catch
    call s:assert(v:false, 'Error handling test - ERROR: ' . v:exception)
  endtry
  echo ''

  " Summary
  echo '=== Test Summary ==='
  echo 'Total tests: ' . s:test_count
  echo 'Passed: ' . s:pass_count
  echo 'Failed: ' . s:fail_count
  echo ''

  if s:fail_count > 0
    echomsg '❌ Tests FAILED: ' . s:fail_count . ' failures'
    cquit!
  else
    echomsg '✅ All tests PASSED (' . s:pass_count . ' tests)'
    qall!
  endif
endfunction

" Run tests with silent echoerr to avoid "Press ENTER" prompts
set cmdheight=2
set shortmess+=A
call s:run_tests()
