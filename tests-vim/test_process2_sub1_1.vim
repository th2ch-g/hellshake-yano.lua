" Test for process2 sub1.1 - h/j/k/l motion support
" TDD Red Phase: Test creation for h/j/k/l motion keys

" Load motion.vim
source autoload/hellshake_yano_vim/motion.vim

function! s:test() abort
  echo '=== Test 1: h motion with perKeyMotionCount (get_motion_count) ==='
  let g:hellshake_yano = {
        \ 'perKeyMotionCount': {'w': 1, 'b': 1, 'e': 1, 'h': 2, 'j': 2, 'k': 2, 'l': 2},
        \ }
  call hellshake_yano_vim#motion#init()
  let l:count_h = hellshake_yano_vim#motion#get_motion_count('h')
  echo 'h count: ' . l:count_h
  if l:count_h == 2
    echo 'PASS'
  else
    echo 'FAIL: Expected 2, got ' . l:count_h
  endif

  echo ''
  echo '=== Test 2: h motion handle - Should NOT error (Red Phase Expectation) ==='
  try
    " Note: We cannot actually press a key in a script, so we call handle() directly
    " This will fail with "invalid motion key: h" in Red phase
    echo 'Attempting to call handle with h key...'
    call hellshake_yano_vim#motion#handle('h')
    echo 'handle() call succeeded (or no visible error)'
    echo 'PASS'
  catch
    echo 'ERROR caught: ' . v:exception
    echo 'FAIL: handle() does not support h key yet'
  endtry

  echo ''
  echo '=== Test 3: j motion handle - Should NOT error (Red Phase Expectation) ==='
  try
    call hellshake_yano_vim#motion#handle('j')
    echo 'handle() call succeeded'
    echo 'PASS'
  catch
    echo 'ERROR caught: ' . v:exception
    echo 'FAIL: handle() does not support j key yet'
  endtry

  echo ''
  echo '=== Test 4: k motion handle - Should NOT error (Red Phase Expectation) ==='
  try
    call hellshake_yano_vim#motion#handle('k')
    echo 'handle() call succeeded'
    echo 'PASS'
  catch
    echo 'ERROR caught: ' . v:exception
    echo 'FAIL: handle() does not support k key yet'
  endtry

  echo ''
  echo '=== Test 5: l motion handle - Should NOT error (Red Phase Expectation) ==='
  try
    call hellshake_yano_vim#motion#handle('l')
    echo 'handle() call succeeded'
    echo 'PASS'
  catch
    echo 'ERROR caught: ' . v:exception
    echo 'FAIL: handle() does not support l key yet'
  endtry

  echo ''
  echo '=== Test 6: Existing w/b/e motions still work ==='
  let l:count_w = hellshake_yano_vim#motion#get_motion_count('w')
  let l:count_b = hellshake_yano_vim#motion#get_motion_count('b')
  let l:count_e = hellshake_yano_vim#motion#get_motion_count('e')
  echo 'w count: ' . l:count_w . ', b count: ' . l:count_b . ', e count: ' . l:count_e
  if l:count_w == 1 && l:count_b == 1 && l:count_e == 1
    echo 'PASS'
  else
    echo 'FAIL'
  endif

  echo ''
  echo 'All tests completed!'
endfunction

call s:test()
quit
