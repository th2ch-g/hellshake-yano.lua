" Simple test for process2 sub1 - Per-Key motion count

" Load motion.vim
source autoload/hellshake_yano_vim/motion.vim

function! s:test() abort
  echo '=== Test 1: Default motion count (no config) ==='
  unlet! g:hellshake_yano
  call hellshake_yano_vim#motion#init()
  let l:count = hellshake_yano_vim#motion#get_motion_count('w')
  echo 'Result: ' . l:count
  if l:count == 3
    echo 'PASS'
  else
    echo 'FAIL: Expected 3, got ' . l:count
  endif

  echo ''
  echo '=== Test 2: Per-key motion count ==='
  let g:hellshake_yano = {
        \ 'perKeyMotionCount': {'w': 2, 'b': 5},
        \ 'defaultMotionCount': 3,
        \ }
  call hellshake_yano_vim#motion#init()
  let l:count_w = hellshake_yano_vim#motion#get_motion_count('w')
  let l:count_b = hellshake_yano_vim#motion#get_motion_count('b')
  echo 'w count: ' . l:count_w . ', b count: ' . l:count_b
  if l:count_w == 2 && l:count_b == 5
    echo 'PASS'
  else
    echo 'FAIL'
  endif

  echo ''
  echo '=== Test 3: Fallback to defaultMotionCount ==='
  let l:count_j = hellshake_yano_vim#motion#get_motion_count('j')
  echo 'j count (should use default): ' . l:count_j
  if l:count_j == 3
    echo 'PASS'
  else
    echo 'FAIL: Expected 3, got ' . l:count_j
  endif

  echo ''
  echo 'All tests completed!'
endfunction

call s:test()
quit
