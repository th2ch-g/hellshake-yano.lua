" Directional hint filter tests
if !exists('*RunTest')
  source <sfile>:h/test_runner.vim
endif

function! Test_filter_none_returns_original() abort
  let l:words = [
        \ {'lnum': 8, 'col': 5},
        \ {'lnum': 10, 'col': 8},
        \ {'lnum': 10, 'col': 15},
        \ {'lnum': 12, 'col': 3}
        \ ]
  let l:cursor = {'lnum': 10, 'col': 10}
  let l:result = hellshake_yano_vim#filter#by_direction(l:words, l:cursor, 'none')
  call AssertEqual(l:words, l:result, 'direction none should return original list')
  call AssertEqual(4, len(l:result), 'direction none should keep result length')
  call AssertEqual(4, len(l:words), 'direction none should not mutate original list')
endfunction

function! Test_filter_down_selects_below() abort
  let l:words = [
        \ {'lnum': 8, 'col': 5},
        \ {'lnum': 10, 'col': 8},
        \ {'lnum': 10, 'col': 15},
        \ {'lnum': 12, 'col': 3}
        \ ]
  let l:cursor = {'lnum': 10, 'col': 10}
  let l:result = hellshake_yano_vim#filter#by_direction(l:words, l:cursor, 'down')
  call AssertEqual(['10:15', '12:3'], map(copy(l:result), 'string(v:val.lnum) . ":" . string(v:val.col)'), 'down direction should include positions below cursor')
  call AssertEqual(4, len(l:words), 'down direction should not mutate original list')
endfunction

function! Test_filter_up_selects_above() abort
  let l:words = [
        \ {'lnum': 8, 'col': 5},
        \ {'lnum': 10, 'col': 8},
        \ {'lnum': 10, 'col': 15},
        \ {'lnum': 12, 'col': 3}
        \ ]
  let l:cursor = {'lnum': 10, 'col': 10}
  let l:result = hellshake_yano_vim#filter#by_direction(l:words, l:cursor, 'up')
  call AssertEqual(['8:5', '10:8'], map(copy(l:result), 'string(v:val.lnum) . ":" . string(v:val.col)'), 'up direction should include positions above cursor')
  call AssertEqual(4, len(l:words), 'up direction should not mutate original list')
endfunction

if expand('<sfile>:p') ==# expand('%:p')
  call RunAllTests()
endif
