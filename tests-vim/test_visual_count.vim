" ============================================================================
" Test: Process3 Sub2 - Visual Mode Count Tests
" Description: Visual modeでの数値プレフィックス付きモーションが動作することを確認
" Phase: D-7 Process3 Sub2
" ============================================================================

" autoload関数を読み込み
let s:script_dir = expand('<sfile>:p:h:h')
execute 'source' s:script_dir . '/autoload/hellshake_yano_vim/config.vim'
execute 'source' s:script_dir . '/autoload/hellshake_yano_vim/motion.vim'

" テスト1: handle_visual_expr()関数が存在するか
function! Test_handle_visual_expr_exists() abort
  if exists('*hellshake_yano_vim#motion#handle_visual_expr')
    echo "Test 1 PASSED: handle_visual_expr() exists"
  else
    throw "Test 1 FAILED: handle_visual_expr() does not exist"
  endif
endfunction

" テスト2: handle_visual_expr()がカウント1でモーションキーのみを返す
function! Test_handle_visual_expr_count1() abort
  " v:count1をシミュレートできないため、直接関数を呼び出してテスト
  let l:result = hellshake_yano_vim#motion#handle_visual_expr('j')

  " 結果が文字列であることを確認
  if type(l:result) == v:t_string
    echo "Test 2 PASSED: handle_visual_expr() returns string:" l:result
  else
    throw printf("Test 2 FAILED: handle_visual_expr() returned non-string: %s", string(l:result))
  endif
endfunction

" すべてのテストを実行
function! RunAllTests() abort
  let l:tests = [
        \ 'Test_handle_visual_expr_exists',
        \ 'Test_handle_visual_expr_count1',
        \ ]

  let l:passed = 0
  let l:failed = 0

  for l:test in l:tests
    try
      execute 'call ' . l:test . '()'
      let l:passed += 1
    catch
      echo "ERROR in" l:test ":" v:exception
      let l:failed += 1
    endtry
  endfor

  echo "========================================"
  echo "Test Results: " . l:passed . " passed, " . l:failed . " failed"
  echo "========================================"

  if l:failed > 0
    cquit!
  else
    qall!
  endif
endfunction

" テスト実行
call RunAllTests()
