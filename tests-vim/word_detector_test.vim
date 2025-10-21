" Phase D Process10 Sub1: word_detector.vim 基本ユニットテスト
" 単語検出機能の基本動作確認
"
" TDD Phase: RED
" Process10: ユニットテスト整備
" 注記: test_process*.vimとの重複を避け、基本的な関数の動作を確認

let s:plugin_root = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_root

echo '=== Word Detector Module Unit Tests ==='
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

" テスト用バッファ作成
new
setlocal buftype=nofile

" Test 1: 基本的な単語検出
echo 'Test 1: Basic word detection'
call setline(1, 'hello world test')
let s:words = hellshake_yano_vim#word_detector#detect_visible()
call s:test('detect_visible() returns list', type(s:words) == v:t_list)
call s:test('Detects words in buffer', len(s:words) > 0)
echo ''

" Test 2: 空バッファ
echo 'Test 2: Empty buffer handling'
%delete_
let s:words = hellshake_yano_vim#word_detector#detect_visible()
call s:test('Empty buffer returns empty list', len(s:words) == 0)
echo ''

" Test 3: Per-Key最小単語長設定
echo 'Test 3: Per-key minimum word length'
unlet! g:hellshake_yano
let g:hellshake_yano = {'perKeyMinLength': {'w': 5, 'b': 3}, 'defaultMinWordLength': 4}
let s:min_w = hellshake_yano_vim#word_detector#get_min_length('w')
call s:test('get_min_length("w") returns 5', s:min_w == 5)

let s:min_b = hellshake_yano_vim#word_detector#get_min_length('b')
call s:test('get_min_length("b") returns 3', s:min_b == 3)

let s:min_e = hellshake_yano_vim#word_detector#get_min_length('e')
call s:test('get_min_length("e") fallback to default', s:min_e == 4)
echo ''

" Test 4: 単語データ構造
echo 'Test 4: Word data structure'
call setline(1, 'function test')
let s:words = hellshake_yano_vim#word_detector#detect_visible()
if len(s:words) > 0
  let s:word = s:words[0]
  call s:test('Word has "text" key', has_key(s:word, 'text'))
  call s:test('Word has "lnum" key', has_key(s:word, 'lnum'))
  call s:test('Word has "col" key', has_key(s:word, 'col'))
else
  call s:test('Word has "text" key', v:false)
  call s:test('Word has "lnum" key', v:false)
  call s:test('Word has "col" key', v:false)
endif
echo ''

" クリーンアップ
bdelete!

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
