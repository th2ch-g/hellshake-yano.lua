" Phase D Process10 Sub1: motion.vim 基本ユニットテスト
" モーション検出機能の基本動作確認
"
" TDD Phase: RED
" Process10: ユニットテスト整備
" 注記: test_process*.vimとの重複を避け、基本的な関数の動作を確認

let s:plugin_root = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_root

echo '=== Motion Module Unit Tests ==='
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

" Test 1: 初期化関数の存在確認
echo 'Test 1: Function exists'
try
  call hellshake_yano_vim#motion#init()
  call s:test('init() exists', v:true)
catch
  call s:test('init() exists', v:false)
endtry
echo ''

" Test 2: 状態取得
echo 'Test 2: State management'
try
  let s:state = hellshake_yano_vim#motion#get_state()
  call s:test('get_state() returns dictionary', type(s:state) == v:t_dict)
catch
  call s:test('get_state() returns dictionary', v:false)
endtry
echo ''

" Test 3: 閾値設定
echo 'Test 3: Threshold configuration'
try
  call hellshake_yano_vim#motion#set_threshold(5)
  call s:test('set_threshold() exists and callable', v:true)
catch
  call s:test('set_threshold() exists and callable', v:false)
endtry
echo ''

" Test 4: タイムアウト設定
echo 'Test 4: Timeout configuration'
try
  call hellshake_yano_vim#motion#set_timeout(2000)
  call s:test('set_timeout() exists and callable', v:true)
catch
  call s:test('set_timeout() exists and callable', v:false)
endtry
echo ''

" Test 5: Per-Key Motion Count
echo 'Test 5: get_motion_count()'
unlet! g:hellshake_yano
let g:hellshake_yano = {'perKeyMotionCount': {'w': 5, 'b': 3}, 'defaultMotionCount': 2}
let s:count_w = hellshake_yano_vim#motion#get_motion_count('w')
call s:test('get_motion_count("w") returns 5', s:count_w == 5)

let s:count_b = hellshake_yano_vim#motion#get_motion_count('b')
call s:test('get_motion_count("b") returns 3', s:count_b == 3)

let s:count_e = hellshake_yano_vim#motion#get_motion_count('e')
call s:test('get_motion_count("e") fallback to default', s:count_e == 2)
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
