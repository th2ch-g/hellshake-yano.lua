" tests-vim/test_sub2_1.vim - Process1 Sub2.1専用テスト
" Phase D-1 Sub2.1: 数字ヒント・設定統合・動的maxTotalのテスト

let s:test_count = 0
let s:test_passed = 0
let s:test_failed = 0

function! s:assert_equal(expected, actual, test_name) abort
  let s:test_count += 1
  if a:expected == a:actual
    let s:test_passed += 1
    echo printf('[PASS] %s', a:test_name)
  else
    let s:test_failed += 1
    echohl ErrorMsg
    echo printf('[FAIL] %s', a:test_name)
    echo printf('  Expected: %s', string(a:expected))
    echo printf('  Actual: %s', string(a:actual))
    echohl None
  endif
endfunction

" 数字ヒントの基本機能テスト
function! s:test_numeric_hints_basic() abort
  let l:saved_config = get(g:, 'hellshake_yano', {})
  let g:hellshake_yano = {'useNumericMultiCharHints': v:true}

  let l:result = hellshake_yano_vim#hint_generator#generate(240)
  let g:hellshake_yano = l:saved_config

  call s:assert_equal(240, len(l:result), 'generate(240) with numeric hints')
  call s:assert_equal('01', l:result[232], 'First numeric hint at index 232')
endfunction

" g:hellshake_yano.singleCharKeys テスト
function! s:test_config_from_g_hellshake_yano() abort
  let l:saved_config = get(g:, 'hellshake_yano', {})
  let g:hellshake_yano = {'singleCharKeys': 'abc'}

  let l:result = hellshake_yano_vim#hint_generator#generate(3)
  let g:hellshake_yano = l:saved_config

  call s:assert_equal(['a', 'b', 'c'], l:result, 'Custom singleCharKeys')
endfunction

" 動的maxTotal計算テスト
function! s:test_dynamic_max_total() abort
  let l:saved_config = get(g:, 'hellshake_yano', {})
  let g:hellshake_yano = {'singleCharKeys': 'abc', 'multiCharKeys': 'xy'}

  let l:result = hellshake_yano_vim#hint_generator#generate(100)
  let g:hellshake_yano = l:saved_config

  " maxTotal = 3 + 2*2 = 7
  call s:assert_equal(7, len(l:result), 'Dynamic maxTotal calculation')
  call s:assert_equal(['a', 'b', 'c', 'xx', 'xy', 'yx', 'yy'], l:result, 'Correct hints')
endfunction

" デフォルト値テスト
function! s:test_default_config() abort
  let l:saved_config = get(g:, 'hellshake_yano', {})

  " g:hellshake_yanoが存在しない場合
  unlet! g:hellshake_yano

  let l:result = hellshake_yano_vim#hint_generator#generate(3)

  " 設定を復元
  if !empty(l:saved_config)
    let g:hellshake_yano = l:saved_config
  endif

  " デフォルト設定('asdfgnm')が使用されることを確認
  call s:assert_equal(['a', 's', 'd'], l:result, 'Use default config')
endfunction

" テスト実行
echo 'Process1 Sub2.1 Tests'
echo '===================='
call s:test_numeric_hints_basic()
call s:test_config_from_g_hellshake_yano()
call s:test_dynamic_max_total()
call s:test_default_config()
echo '===================='
echo printf('Results: %d passed, %d failed, %d total', s:test_passed, s:test_failed, s:test_count)

if s:test_failed > 0
  echohl ErrorMsg
  echo 'TESTS FAILED!'
  echohl None
  cquit 1
else
  echohl MoreMsg
  echo 'ALL TESTS PASSED!'
  echohl None
endif
