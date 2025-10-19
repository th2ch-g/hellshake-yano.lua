" Simple test for sub3 - Highlight configuration

" Load display.vim
source autoload/hellshake_yano_vim/display.vim

function! s:test() abort
  echo '=== Test 1: Default highlight group ==='
  unlet! g:hellshake_yano
  let l:hl = hellshake_yano_vim#display#get_highlight_group('normal')
  echo 'Result: ' . l:hl
  if l:hl ==# 'HintMarker'
    echo 'PASS'
  else
    echo 'FAIL: Expected HintMarker, got ' . l:hl
  endif

  echo ''
  echo '=== Test 2: Custom highlight group name ==='
  let g:hellshake_yano = {'highlightHintMarker': 'DiffAdd'}
  let l:hl = hellshake_yano_vim#display#get_highlight_group('normal')
  echo 'Result: ' . l:hl
  if l:hl ==# 'DiffAdd'
    echo 'PASS'
  else
    echo 'FAIL: Expected DiffAdd, got ' . l:hl
  endif

  echo ''
  echo '=== Test 3: Custom color object ==='
  let g:hellshake_yano = {'highlightHintMarker': {'fg': '#FFFFFF', 'bg': '#000000'}}
  let l:hl = hellshake_yano_vim#display#get_highlight_group('normal')
  echo 'Result: ' . l:hl
  if l:hl ==# 'HellshakeYanoHintMarker'
    echo 'PASS'
  else
    echo 'FAIL: Expected HellshakeYanoHintMarker, got ' . l:hl
  endif

  echo ''
  echo 'All tests completed!'
endfunction

call s:test()
quit
