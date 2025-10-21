" Phase D Process10 Sub1: display.vim 基本ユニットテスト
" ヒント表示機能の基本動作確認
"
" TDD Phase: RED
" Process10: ユニットテスト整備
" 注記: test_process*.vimとの重複を避け、基本的な関数の動作を確認

let s:plugin_root = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_root

echo '=== Display Module Unit Tests ==='
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

" Test 1: get_highlight_group() 関数の存在確認
echo 'Test 1: Function exists'
try
  call hellshake_yano_vim#display#get_highlight_group('normal')
  call s:test('get_highlight_group() exists', v:true)
catch
  call s:test('get_highlight_group() exists', v:false)
endtry
echo ''

" Test 2: デフォルトハイライトグループ
echo 'Test 2: Default highlight groups'
unlet! g:hellshake_yano
let s:hl_normal = hellshake_yano_vim#display#get_highlight_group('normal')
call s:test('Default normal highlight', s:hl_normal ==# 'HintMarker')

let s:hl_current = hellshake_yano_vim#display#get_highlight_group('current')
call s:test('Default current highlight', s:hl_current ==# 'HintMarkerCurrent')
echo ''

" Test 3: カスタムハイライトグループ（文字列）
echo 'Test 3: Custom highlight group (string)'
let g:hellshake_yano = {'highlightHintMarker': 'DiffAdd'}
let s:hl_custom = hellshake_yano_vim#display#get_highlight_group('normal')
call s:test('Custom highlight string', s:hl_custom ==# 'DiffAdd')
echo ''

" Test 4: カスタムハイライトグループ（オブジェクト）
echo 'Test 4: Custom highlight group (object)'
let g:hellshake_yano = {'highlightHintMarker': {'fg': '#FFFFFF', 'bg': '#000000'}}
let s:hl_obj = hellshake_yano_vim#display#get_highlight_group('normal')
call s:test('Custom highlight object', s:hl_obj ==# 'HellshakeYanoHintMarker')
echo ''

" Test 5: 型チェック（不正な型の処理）
echo 'Test 5: Type validation'
let g:hellshake_yano = {'highlightHintMarker': 12345}
let s:hl_invalid = hellshake_yano_vim#display#get_highlight_group('normal')
call s:test('Invalid type fallback to default', s:hl_invalid ==# 'HintMarker')
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
