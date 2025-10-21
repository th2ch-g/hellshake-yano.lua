" ============================================================================
" Test: Process3 - Simple Motion Count Tests
" Description: handle_expr()を直接呼び出して数値プレフィックス動作を確認
" Phase: D-7 Process3
" ============================================================================

" plugin/autoload関数を読み込み
let s:script_dir = expand('<sfile>:p:h:h')
" execute 'source' s:script_dir . '/plugin/hellshake-yano-vim.vim'  " グローバル変数初期化のみ必要
execute 'source' s:script_dir . '/autoload/hellshake_yano_vim/config.vim'
execute 'source' s:script_dir . '/autoload/hellshake_yano_vim/core.vim'
execute 'source' s:script_dir . '/autoload/hellshake_yano_vim/word_detector.vim'
execute 'source' s:script_dir . '/autoload/hellshake_yano_vim/display.vim'
execute 'source' s:script_dir . '/autoload/hellshake_yano_vim/input.vim'
execute 'source' s:script_dir . '/autoload/hellshake_yano_vim/hint_generator.vim'
execute 'source' s:script_dir . '/autoload/hellshake_yano_vim/key_repeat.vim'
execute 'source' s:script_dir . '/autoload/hellshake_yano_vim/motion.vim'

" テスト1: handle_expr()関数が存在するか
function! Test_handle_expr_exists() abort
  if exists('*hellshake_yano_vim#motion#handle_expr')
    echo "Test 1 PASSED: handle_expr() exists"
  else
    throw "Test 1 FAILED: handle_expr() does not exist"
  endif
endfunction

" テスト2: handle_expr()がv:count1を適切に処理するか（テキストベース検証）
function! Test_handle_expr_returns_string() abort
  " カウント1の場合（デフォルト）
  let l:result = hellshake_yano_vim#motion#handle_expr('j')

  " 結果が文字列であることを確認
  if type(l:result) == v:t_string
    echo "Test 2 PASSED: handle_expr() returns string: " . l:result
  else
    throw printf("Test 2 FAILED: handle_expr() returned non-string: %s", string(l:result))
  endif
endfunction

" テスト3: モーション実行の動作確認（シミュレーション）
function! Test_motion_with_count() abort
  " テストバッファ作成
  enew!
  call setline(1, range(1, 100))
  call cursor(1, 1)

  " handle_with_count()を直接呼び出してテスト
  " カウント5で'j'モーション
  let l:start_line = line('.')
  try
    call hellshake_yano_vim#motion#handle_with_count('j', 5)
  catch
    echo "Test 3 EXCEPTION:" v:exception "at" v:throwpoint
    throw "Test 3 FAILED: Exception during handle_with_count(): " . v:exception
  endtry
  let l:end_line = line('.')

  " 5行移動したことを確認
  if l:end_line == l:start_line + 5
    echo "Test 3 PASSED: Moved 5 lines (from" l:start_line "to" l:end_line ")"
  else
    throw printf("Test 3 FAILED: Expected line %d, got line %d", l:start_line + 5, l:end_line)
  endif
endfunction

" テスト4: カウント1（デフォルト）での動作確認
function! Test_motion_default_count() abort
  " テストバッファ作成
  enew!
  call setline(1, range(1, 100))
  call cursor(1, 1)

  " カウント1で'j'モーション
  let l:start_line = line('.')
  call hellshake_yano_vim#motion#handle_with_count('j', 1)
  let l:end_line = line('.')

  " 1行移動したことを確認
  if l:end_line == l:start_line + 1
    echo "Test 4 PASSED: Moved 1 line (from" l:start_line "to" l:end_line ")"
  else
    throw printf("Test 4 FAILED: Expected line %d, got line %d", l:start_line + 1, l:end_line)
  endif
endfunction

" テスト5: 大きなカウント値での動作確認
function! Test_motion_large_count() abort
  " テストバッファ作成
  enew!
  call setline(1, range(1, 100))
  call cursor(1, 1)

  " カウント100で'j'モーション（バッファ末尾に到達）
  let l:start_line = line('.')
  call hellshake_yano_vim#motion#handle_with_count('j', 100)
  let l:end_line = line('.')
  let l:last_line = line('$')

  " バッファ末尾に到達したことを確認
  if l:end_line == l:last_line
    echo "Test 5 PASSED: Moved to buffer end (line" l:end_line ")"
  else
    throw printf("Test 5 FAILED: Expected line %d, got line %d", l:last_line, l:end_line)
  endif
endfunction

" すべてのテストを実行
function! RunAllTests() abort
  let l:tests = [
        \ 'Test_handle_expr_exists',
        \ 'Test_handle_expr_returns_string',
        \ 'Test_motion_with_count',
        \ 'Test_motion_default_count',
        \ 'Test_motion_large_count',
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
