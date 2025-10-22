" ============================================================================
" Test: Visual Mode count handling via plugin mapping
" Description: Ensure Visual mode <expr> mapping respects user-supplied counts
" ============================================================================

let s:root = expand('<sfile>:p:h:h')
execute 'set rtp+=' . s:root
execute 'source ' . s:root . '/plugin/hellshake-yano-vim.vim'

function! s:setup_buffer() abort
  enew!
  call setline(1, range(1, 40))
  call cursor(1, 1)
endfunction

function! s:test_visual_count() abort
  call s:setup_buffer()
  call feedkeys('v5j<Esc>', 'xt')
  let l:start = line("'<")
  let l:end = line("'>")
  let l:selected = l:end - l:start + 1
  if l:selected != 6
    throw printf('Expected 6 selected lines, got %d (start=%d end=%d)', l:selected, l:start, l:end)
  endif
endfunction

try
  call s:test_visual_count()
  echom 'Test PASSED: Visual count respected'
  qall!
catch
  echom 'Test FAILED: ' . v:exception
  cquit!
endtry
