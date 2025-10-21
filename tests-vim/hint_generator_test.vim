" Phase D Process10 Sub1: hint_generator.vim 基本ユニットテスト
" ヒント生成機能の基本動作確認
"
" TDD Phase: RED
" Process10: ユニットテスト整備
" 注記: test_process*.vimとの重複を避け、基本的な関数の動作を確認

let s:plugin_root = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_root

echo '=== Hint Generator Unit Tests ==='
echo ''

" テスト成功カウント
let s:pass = 0
let s:total = 0

function! s:test(name, condition) abort
  let s:total += 1
  if a:condition
    let s:pass += 1
    echo 'PASS: ' . a:name
  else
    echo 'FAIL: ' . a:name
  endif
endfunction

" Test 1: 関数の存在確認
echo 'Test 1: Function exists'
try
  call hellshake_yano_vim#hint_generator#generate(1)
  call s:test('generate() exists', v:true)
catch
  call s:test('generate() exists', v:false)
endtry
echo ''

" Test 2: デフォルト設定での基本動作
echo 'Test 2: Default hints generation'
unlet! g:hellshake_yano
let s:hints = hellshake_yano_vim#hint_generator#generate(3)
call s:test('Generate 3 hints', len(s:hints) == 3)
call s:test('First hint is "a"', s:hints[0] ==# 'a')
echo ''

" Test 3: 空配列のエッジケース
echo 'Test 3: Edge cases'
let s:hints = hellshake_yano_vim#hint_generator#generate(0)
call s:test('Generate 0 hints returns empty list', len(s:hints) == 0)
echo ''

" Test 4: カスタム設定
echo 'Test 4: Custom configuration'
let g:hellshake_yano = {'singleCharKeys': 'xyz'}
let s:hints = hellshake_yano_vim#hint_generator#generate(2)
call s:test('Custom singleCharKeys works', s:hints == ['x', 'y'])
echo ''

" Test 5: 数字ヒント
echo 'Test 5: Numeric hints'
let g:hellshake_yano = {'useNumericMultiCharHints': v:true}
let s:hints = hellshake_yano_vim#hint_generator#generate(233)
call s:test('Numeric hints enabled', s:hints[232] ==# '01')
echo ''

" 結果サマリー
echo '=== Summary ==='
echo 'Passed: ' . s:pass . '/' . s:total
echo ''

if s:pass == s:total
  echo 'RESULT: SUCCESS'
  qall!
else
  echo 'RESULT: FAILURE'
  cquit!
endif
