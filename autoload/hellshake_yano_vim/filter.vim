" autoload/hellshake_yano_vim/filter.vim - Directional hint filtering helpers
" Author: hellshake-yano
" License: MIT

function! hellshake_yano_vim#filter#by_direction(words, cursor, direction) abort
  let l:dir = tolower(a:direction)
  if l:dir ==# 'none'
    return a:words
  endif

  let l:cursor_line = get(a:cursor, 'lnum', 0)
  let l:cursor_col = get(a:cursor, 'col', 0)
  let l:result = []

  for l:word in a:words
    let l:line = get(l:word, 'lnum', 0)
    let l:col = get(l:word, 'col', 0)
    if l:dir ==# 'down'
      if l:line > l:cursor_line || (l:line == l:cursor_line && l:col > l:cursor_col)
        call add(l:result, l:word)
      endif
    else
      if l:line < l:cursor_line || (l:line == l:cursor_line && l:col < l:cursor_col)
        call add(l:result, l:word)
      endif
    endif
  endfor

  return l:result
endfunction
