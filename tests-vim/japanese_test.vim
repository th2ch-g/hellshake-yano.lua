" Phase D Process10 Sub1: japanese.vim 基本ユニットテスト
" 日本語セグメント化機能の基本動作確認
"
" TDD Phase: RED
" Process10: ユニットテスト整備
" 注記: test_process*.vimとの重複を避け、基本的な関数の動作を確認

let s:plugin_root = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_root

echo '=== Japanese Module Unit Tests ==='
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

" Test 1: 日本語判定関数
echo 'Test 1: Japanese detection'
let s:has_jp = hellshake_yano_vim#japanese#has_japanese('こんにちは')
call s:test('Detects hiragana', s:has_jp ==# v:true)

let s:has_jp = hellshake_yano_vim#japanese#has_japanese('カタカナ')
call s:test('Detects katakana', s:has_jp ==# v:true)

let s:has_jp = hellshake_yano_vim#japanese#has_japanese('漢字')
call s:test('Detects kanji', s:has_jp ==# v:true)

let s:has_jp = hellshake_yano_vim#japanese#has_japanese('hello world')
call s:test('No Japanese in English text', s:has_jp ==# v:false)
echo ''

" Test 2: セグメント化判定
echo 'Test 2: Segmentation decision'
let s:should_seg = hellshake_yano_vim#japanese#should_segment('こんにちは世界')
call s:test('Should segment Japanese text', s:should_seg ==# v:true)

let s:should_seg = hellshake_yano_vim#japanese#should_segment('hello')
call s:test('Should not segment English text', s:should_seg ==# v:false)

let s:should_seg = hellshake_yano_vim#japanese#should_segment('こ')
call s:test('Should not segment short Japanese text', s:should_seg ==# v:false)
echo ''

" Test 3: セグメント化関数の呼び出し可能性確認
echo 'Test 3: segment() function existence'
" segment()関数が定義されているかを確認
" 注記: Denops未起動環境では、segment()はDenops呼び出し失敗時のフォールバックとして
" 簡易セグメント化を行うか、空配列を返すかは実装に依存する
try
  let s:segments = hellshake_yano_vim#japanese#segment('test')
  call s:test('segment() exists and callable', v:true)
catch /^Vim\%((\a\+)\)\=:E117/
  call s:test('segment() exists and callable', v:false)
catch
  " その他のエラー（Denops未起動等）は許容
  call s:test('segment() exists and callable', v:true)
endtry
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
