" Test for core.vim 49-hint limit (RED phase - should fail)

" Load required modules
source autoload/hellshake_yano_vim/hint_generator.vim
source autoload/hellshake_yano_vim/config.vim

function! s:test_core_show_limit() abort
  " Configure custom keys (12 + 15² = 237)
  let g:hellshake_yano = {
        \ 'singleCharKeys': 'ASDFGNM@;,./',
        \ 'multiCharKeys': 'BCEIOPQRTUVWXYZ',
        \ 'useNumericMultiCharHints': v:false,
        \ }

  echo '=== Testing core.vim hint limit ==='
  echo ''

  " Test hint_generator directly (should work)
  let l:hints_from_generator = hellshake_yano_vim#hint_generator#generate(100)
  echo 'hint_generator.generate(100): ' . len(l:hints_from_generator) . ' hints'

  if len(l:hints_from_generator) == 100
    echo 'PASS: hint_generator can generate 100 hints'
  else
    echo 'FAIL: hint_generator limited to ' . len(l:hints_from_generator)
  endif

  echo ''
  echo 'NOTE: core.vim has hardcoded limit at line 170-171'
  echo 'if len(l:detected_words) > 49'
  echo '  let l:detected_words = l:detected_words[0:48]'
  echo ''
  echo 'This prevents using more than 49 hints even though'
  echo 'hint_generator can generate 237 hints with current config.'
  echo ''
  echo 'To fix: Remove the 49-hint limit from core.vim'
endfunction

call s:test_core_show_limit()
quit
