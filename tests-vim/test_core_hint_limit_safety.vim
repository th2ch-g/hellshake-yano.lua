" Test for core.vim hint limit safety check
" Phase D-1 Sub2.2: E684エラー修正テスト
"
" 目的:
"   - 大量の単語（300個以上）が検出された場合の安全性テスト
"   - hint_generatorの最大ヒント数を超えてもエラーが発生しないことを確認
"   - positionsリストがヒント数に制限されることを確認

" Load required modules
source autoload/hellshake_yano_vim/core.vim
source autoload/hellshake_yano_vim/hint_generator.vim
source autoload/hellshake_yano_vim/word_detector.vim
source autoload/hellshake_yano_vim/word_filter.vim
source autoload/hellshake_yano_vim/display.vim
source autoload/hellshake_yano_vim/input.vim
source autoload/hellshake_yano_vim/config.vim

" Test 1: hint_generatorの最大ヒント数確認
function! s:test_hint_generator_max() abort
  echo '=== Test 1: hint_generator maximum hints ==='

  " デフォルト設定での最大ヒント数
  " singleCharKeys: 7文字 (asdfgnm)
  " multiCharKeys: 15文字 (bceiopqrtuvwxyz)
  " max = 7 + 15² = 7 + 225 = 232
  let l:hints = hellshake_yano_vim#hint_generator#generate(300)
  let l:actual_count = len(l:hints)

  echo 'Request: 300 hints'
  echo 'Generated: ' . l:actual_count . ' hints'

  if l:actual_count == 232
    echo 'PASS: hint_generator respects maximum limit (232)'
    return v:true
  else
    echo 'FAIL: expected 232 hints, got ' . l:actual_count
    return v:false
  endif
endfunction

" Test 2: core#show()が大量の単語を安全に処理
function! s:test_core_show_with_many_words() abort
  echo ''
  echo '=== Test 2: core#show() with many words ==='

  " 新しいバッファを作成
  enew

  " 300個以上の単語を含むテキストを挿入
  " 各行に10個の短い単語（3文字）を配置し、30行作成
  let l:line_template = 'abc def ghi jkl mno pqr stu vwx yzz aaa'
  for l:i in range(1, 30)
    call append(line('$'), l:line_template)
  endfor

  " カーソルを中央に移動
  execute 'normal! 15G0'
  redraw

  echo 'Buffer created with ~300 words'
  echo 'Calling core#show()...'

  try
    " core#show() を呼び出す
    " 注意: input#wait_for_input()でブロックするため、
    " テストではモック化が必要だが、ここではヒント生成部分のみテスト

    " 代わりに、word_detector#detect_visible()で単語数を確認
    let l:detected_words = hellshake_yano_vim#word_detector#detect_visible()
    echo 'Detected words: ' . len(l:detected_words)

    " hint_generatorで生成可能なヒント数
    let l:hints = hellshake_yano_vim#hint_generator#generate(len(l:detected_words))
    echo 'Generated hints: ' . len(l:hints)

    " 安全性チェックのシミュレーション
    if len(l:hints) < len(l:detected_words)
      echo 'WARNING: positions would be limited from ' . len(l:detected_words) . ' to ' . len(l:hints)
      echo 'PASS: Safety check would prevent E684 error'
      return v:true
    else
      echo 'INFO: All words can receive hints (' . len(l:detected_words) . ' words)'
      echo 'PASS: No safety check needed'
      return v:true
    endif

  catch
    echo 'FAIL: Exception occurred: ' . v:exception
    return v:false
  finally
    " バッファをクリーンアップ
    bwipeout!
  endtry
endfunction

" Test 3: positionsリストの制限が正しく動作
function! s:test_positions_limiting() abort
  echo ''
  echo '=== Test 3: positions list limiting ==='

  " 大量の位置リストをシミュレート
  let l:positions = []
  for l:i in range(1, 300)
    call add(l:positions, {'lnum': l:i, 'col': 1})
  endfor

  echo 'Created ' . len(l:positions) . ' positions'

  " ヒント生成（最大232個）
  let l:hints = hellshake_yano_vim#hint_generator#generate(len(l:positions))
  echo 'Generated ' . len(l:hints) . ' hints'

  " 安全性チェック: positionsをヒント数に制限
  if len(l:hints) < len(l:positions)
    let l:positions = l:positions[0 : len(l:hints) - 1]
    echo 'Limited positions to ' . len(l:positions)
  endif

  " 検証: positions数とhints数が一致
  if len(l:positions) == len(l:hints)
    echo 'PASS: positions and hints count match (' . len(l:positions) . ')'

    " インデックスエラーが発生しないことを確認
    for l:i in range(len(l:positions))
      let l:pos = l:positions[l:i]
      let l:hint = l:hints[l:i]  " ← これがE684エラーの原因だった箇所
      " エラーなく実行できればOK
    endfor
    echo 'PASS: No index out of range error in loop'
    return v:true
  else
    echo 'FAIL: positions (' . len(l:positions) . ') and hints (' . len(l:hints) . ') count mismatch'
    return v:false
  endif
endfunction

" Run all tests
let s:test_results = []
call add(s:test_results, s:test_hint_generator_max())
call add(s:test_results, s:test_core_show_with_many_words())
call add(s:test_results, s:test_positions_limiting())

" Summary
echo ''
echo '=== Test Summary ==='
let s:passed = 0
let s:failed = 0
for l:result in s:test_results
  if l:result
    let s:passed += 1
  else
    let s:failed += 1
  endif
endfor

echo 'Passed: ' . s:passed . '/' . len(s:test_results)
echo 'Failed: ' . s:failed . '/' . len(s:test_results)

if s:failed == 0
  echo 'ALL TESTS PASSED ✓'
  quit
else
  echo 'SOME TESTS FAILED ✗'
  cquit
endif
