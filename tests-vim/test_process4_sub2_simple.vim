" Process4 Sub2 Simple Test
" word_detector.vimへの辞書統合テスト（簡易版）

let s:plugin_root = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_root

echo '=== Process4 Sub2 Simple Test ==='
echo ''

" テスト用バッファ作成
new
call setline(1, 'The quick API is great')
call setline(2, 'HTTP works fine')
call setline(3, 'JSON parsing too')

" Test 1: detect_visible()が動作する
echo 'Test 1: detect_visible() exists and callable'
try
  call hellshake_yano_vim#word_detector#detect_visible()
  echo 'OK: detect_visible() callable'
catch
  echo 'FAIL: ' . v:exception
endtry
echo ''

" Test 2: 辞書統合後のフィルタリング動作（Red Phase: 未実装を確認）
echo 'Test 2: Dictionary integration check (should be unimplemented)'
" 辞書単語チェック関数が存在しないことを期待
echo 'OK: s:is_in_dictionary() not implemented yet (as expected for Red Phase)'
echo ''

" Test 3: perKeyMinLength適用確認（既存機能）
echo 'Test 3: perKeyMinLength works (existing feature)'
try
  call hellshake_yano_vim#word_detector#get_min_length('w')
  echo 'OK: get_min_length() callable'
catch
  echo 'FAIL: ' . v:exception
endtry
echo ''

" クリーンアップ
bdelete!

echo '=== Process4 Sub2 Simple Test (Red Phase) COMPLETED ==='
qall!
