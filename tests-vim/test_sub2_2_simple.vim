" Simple test for sub2.2 - 49個制限の確認

" hint_generator.vimをロード
source autoload/hellshake_yano_vim/hint_generator.vim

function! s:run_tests() abort
  " テスト1: カスタムキー設定で237個生成できるか
  let g:hellshake_yano = {
        \ 'singleCharKeys': 'ASDFGNM@;,./',
        \ 'multiCharKeys': 'BCEIOPQRTUVWXYZ',
        \ 'useNumericMultiCharHints': v:false,
        \ }

  let l:hints = hellshake_yano_vim#hint_generator#generate(237)
  echo 'Test 1: Generate 237 hints with custom keys'
  echo 'Expected: 237, Actual: ' . len(l:hints)
  if len(l:hints) == 237
    echo 'PASS: hint_generator can generate 237 hints'
  else
    echo 'FAIL: hint_generator is limited to ' . len(l:hints) . ' hints'
  endif

  " テスト2: 数字ヒント込みで337個生成できるか
  let g:hellshake_yano.useNumericMultiCharHints = v:true
  let l:hints_with_numeric = hellshake_yano_vim#hint_generator#generate(337)
  echo ''
  echo 'Test 2: Generate 337 hints with numeric hints'
  echo 'Expected: 337, Actual: ' . len(l:hints_with_numeric)
  if len(l:hints_with_numeric) == 337
    echo 'PASS: hint_generator can generate 337 hints with numeric'
  else
    echo 'FAIL: hint_generator is limited to ' . len(l:hints_with_numeric) . ' hints'
  endif

  " テスト3: 最後のヒントを確認
  echo ''
  echo 'Test 3: Check last hints'
  echo 'Hint 237 (should be ZZ): ' . l:hints[236]
  echo 'Hint 238 (should be 01): ' . l:hints_with_numeric[237]
  echo 'Hint 337 (should be 00): ' . l:hints_with_numeric[336]
endfunction

call s:run_tests()
quit
