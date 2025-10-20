" Phase D-6: Process3 Sub1 - 簡易テスト

" runtimepathを設定
let s:plugin_root = expand('<sfile>:p:h:h')
execute 'set runtimepath+=' . s:plugin_root

echo '=== Process3 Sub1 簡易テスト開始 ==='
echo ''

" Test 1: has_japanese()
echo 'Test 1: has_japanese()'
let l:result1 = hellshake_yano_vim#japanese#has_japanese('これはテストです')
echo '  Japanese text: ' . (l:result1 ? 'PASS' : 'FAIL')

let l:result2 = hellshake_yano_vim#japanese#has_japanese('Hello World')
echo '  English text: ' . (!l:result2 ? 'PASS' : 'FAIL')

" Test 2: should_segment()
echo ''
echo 'Test 2: should_segment()'
let l:result3 = hellshake_yano_vim#japanese#should_segment('これはテストです')
echo '  Long Japanese: ' . (l:result3 ? 'PASS' : 'FAIL')

let l:result4 = hellshake_yano_vim#japanese#should_segment('テス')
echo '  Short Japanese: ' . (!l:result4 ? 'PASS' : 'FAIL')

" Test 3: segment() - フォールバック
echo ''
echo 'Test 3: segment() with fallback'
let l:result5 = hellshake_yano_vim#japanese#segment('これはテストです')
echo '  Result type: ' . (type(l:result5) == v:t_dict ? 'PASS (dict)' : 'FAIL')
echo '  Has segments: ' . (has_key(l:result5, 'segments') ? 'PASS' : 'FAIL')
echo '  Segments count: ' . len(l:result5.segments)
echo '  Source: ' . l:result5.source

" Test 4: Empty text
echo ''
echo 'Test 4: Empty text handling'
let l:result6 = hellshake_yano_vim#japanese#segment('')
echo '  Empty segments: ' . (len(l:result6.segments) == 0 ? 'PASS' : 'FAIL')

echo ''
echo '=== テスト完了 ==='

quit
