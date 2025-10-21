" ============================================================================
" Test: Motion Count Support (Phase D-7 Process2)
" Description: Test for numeric prefix + motion fix (<expr> mapping approach)
" ============================================================================

" Test setup
let s:test_count = 0
let s:pass_count = 0
let s:fail_count = 0

function! s:assert(condition, message) abort
  let s:test_count += 1
  if a:condition
    let s:pass_count += 1
    echo 'PASS [Test ' . s:test_count . ']: ' . a:message
  else
    let s:fail_count += 1
    echo 'FAIL [Test ' . s:test_count . ']: ' . a:message
  endif
endfunction

function! s:run_tests() abort
  echo '========================================='
  echo 'Motion Count Support Tests'
  echo '========================================='

  " Load the motion.vim autoload script
  runtime autoload/hellshake_yano_vim/motion.vim

  " Test 1: handle_expr() function exists
  call s:assert(
        \ exists('*hellshake_yano_vim#motion#handle_expr'),
        \ 'handle_expr() function exists')

  " Test 2: handle_expr() returns correct command string format
  " We cannot directly set v:count1, so we check if the function exists
  " and returns a command-like string
  if exists('*hellshake_yano_vim#motion#handle_expr')
    let l:result = hellshake_yano_vim#motion#handle_expr('j')
    call s:assert(
          \ type(l:result) == v:t_string,
          \ 'handle_expr() returns a string')
    call s:assert(
          \ l:result =~# 'handle_with_count',
          \ 'handle_expr() returns command with handle_with_count')
  else
    let s:test_count += 1
    let s:fail_count += 1
    echo 'FAIL [Test ' . s:test_count . ']: handle_expr() returns a string'
  endif

  " Test 3: handle_with_count() function exists
  call s:assert(
        \ exists('*hellshake_yano_vim#motion#handle_with_count'),
        \ 'handle_with_count() function exists')

  " Test 4: handle_with_count() moves 5 lines with 5j
  " Setup: Create test buffer with 10 lines
  new
  call setline(1, range(1, 10))
  normal! gg
  let l:start_line = line('.')

  " Execute 5j motion
  call hellshake_yano_vim#motion#handle_with_count('j', 5)
  let l:end_line = line('.')

  call s:assert(
        \ l:end_line == l:start_line + 5,
        \ '5j moves 5 lines down (expected line 6, got line ' . l:end_line . ')')

  bdelete!

  " Test 5: handle_with_count() moves 3 words with 3w
  " Setup: Create test buffer with multiple words
  new
  call setline(1, 'one two three four five six seven eight nine ten')
  normal! gg0
  let l:start_col = col('.')

  " Execute 3w motion
  call hellshake_yano_vim#motion#handle_with_count('w', 3)
  let l:current_word = expand('<cword>')

  call s:assert(
        \ l:current_word ==# 'four',
        \ '3w moves 3 words forward (expected "four", got "' . l:current_word . '")')

  bdelete!

  " Test 6: Backward compatible handle() function works
  call s:assert(
        \ exists('*hellshake_yano_vim#motion#handle'),
        \ 'Backward compatible handle() function exists')

  " Setup: Create test buffer
  new
  call setline(1, range(1, 10))
  normal! gg
  let l:start_line = line('.')

  " Execute handle() (should move 1 line)
  call hellshake_yano_vim#motion#handle('j')
  let l:end_line = line('.')

  call s:assert(
        \ l:end_line == l:start_line + 1,
        \ 'handle() moves 1 line (backward compatibility)')

  bdelete!

  " Test 7: Count without prefix (1j) moves 1 line
  new
  call setline(1, range(1, 10))
  normal! gg
  let l:start_line = line('.')

  " Execute 1j motion (count = 1)
  call hellshake_yano_vim#motion#handle_with_count('j', 1)
  let l:end_line = line('.')

  call s:assert(
        \ l:end_line == l:start_line + 1,
        \ '1j moves 1 line down')

  bdelete!

  " Print summary
  echo '========================================='
  echo 'Test Summary:'
  echo 'Total:  ' . s:test_count
  echo 'Passed: ' . s:pass_count
  echo 'Failed: ' . s:fail_count
  echo '========================================='

  " Return test result
  if s:fail_count > 0
    cquit!
  endif
endfunction

" Run tests
call s:run_tests()
quit
