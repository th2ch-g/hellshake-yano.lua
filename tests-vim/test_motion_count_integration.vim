" ============================================================================
" Test: Process3 - Motion Count Integration Tests
" Description: 実際のマッピング経由で数値プレフィックス付きモーションが動作することを確認
" Phase: D-7 Process3 (Red Phase)
" ============================================================================

" テスト環境のセットアップ
function! s:setup_test_buffer() abort
  " autoload関数を明示的に読み込む（初回のみ）
  if !exists('*hellshake_yano_vim#motion#handle_expr')
    runtime autoload/hellshake_yano_vim/motion.vim
  endif
  if !exists('*hellshake_yano_vim#motion#handle_visual_expr')
    runtime autoload/hellshake_yano_vim/visual.vim
  endif

  " 新しいバッファを作成
  enew!

  " テスト用のテキストを挿入（100行）
  let l:lines = []
  for l:i in range(1, 100)
    call add(l:lines, printf('Line %d: word1 word2 word3 word4 word5', l:i))
  endfor
  call setline(1, l:lines)

  " カーソルを先頭に移動
  call cursor(1, 1)
endfunction

" テストケース1: Normal mode `5j` で5行移動する
function! Test_normal_mode_5j() abort
  call s:setup_test_buffer()

  " カーソルを1行目に配置
  call cursor(1, 1)
  let l:start_line = line('.')

  " handle_expr()を直接呼び出してカウント付きモーションをテスト
  " v:count1 = 5をシミュレート
  let l:saved_count = v:count1
  " 5j をfeedkeysで実行
  call feedkeys("5j", 'x')

  let l:end_line = line('.')
  let l:expected_line = l:start_line + 5

  if l:end_line == l:expected_line
    echo "Test 1 PASSED: 5j moved from line" l:start_line "to line" l:end_line
  else
    throw printf("Test 1 FAILED: Expected line %d, got line %d", l:expected_line, l:end_line)
  endif
endfunction

" テストケース2: Normal mode `3w` で3単語移動する
function! Test_normal_mode_3w() abort
  call s:setup_test_buffer()

  " カーソルを1行目の先頭に配置
  call cursor(1, 1)
  let l:start_col = col('.')

  " 3w をfeedkeysで実行
  call feedkeys("3w", 'x')

  let l:end_col = col('.')

  " 3単語移動したことを確認（col位置が増加している）
  if l:end_col > l:start_col
    echo "Test 2 PASSED: 3w moved from col" l:start_col "to col" l:end_col
  else
    throw printf("Test 2 FAILED: Expected col > %d, got col %d", l:start_col, l:end_col)
  endif
endfunction

" テストケース3: Normal mode `2b` で2単語後退する
function! Test_normal_mode_2b() abort
  call s:setup_test_buffer()

  " カーソルを1行目の中央付近に配置
  call cursor(1, 20)
  let l:start_col = col('.')

  " 2b をfeedkeysで実行
  call feedkeys("2b", 'x')

  let l:end_col = col('.')

  " 2単語後退したことを確認（col位置が減少している）
  if l:end_col < l:start_col
    echo "Test 3 PASSED: 2b moved from col" l:start_col "to col" l:end_col
  else
    throw printf("Test 3 FAILED: Expected col < %d, got col %d", l:start_col, l:end_col)
  endif
endfunction

" テストケース4: Normal mode カウントなし `j` で1行移動する
function! Test_normal_mode_1j() abort
  call s:setup_test_buffer()

  " カーソルを1行目に配置
  call cursor(1, 1)
  let l:start_line = line('.')

  " j をfeedkeysで実行（カウントなし）
  call feedkeys("j", 'x')

  let l:end_line = line('.')
  let l:expected_line = l:start_line + 1

  if l:end_line == l:expected_line
    echo "Test 4 PASSED: j moved from line" l:start_line "to line" l:end_line
  else
    throw printf("Test 4 FAILED: Expected line %d, got line %d", l:expected_line, l:end_line)
  endif
endfunction

" テストケース5: Visual mode `v5j` で5行選択範囲拡張
function! Test_visual_mode_v5j() abort
  call s:setup_test_buffer()

  " カーソルを1行目に配置
  call cursor(1, 1)

  " v5j をfeedkeysで実行（Visual mode）
  call feedkeys("v5j\<Esc>", 'x')

  " Visual modeを抜けた後に選択範囲を確認
  let l:start_line = line("'<")
  let l:end_line = line("'>")

  let l:expected_lines = 6  " 1行目から6行目まで（5行分拡張 + 開始行）
  let l:actual_lines = l:end_line - l:start_line + 1

  if l:actual_lines == l:expected_lines
    echo "Test 5 PASSED: v5j selected" l:actual_lines "lines"
  else
    throw printf("Test 5 FAILED: Expected %d lines selected, got %d lines", l:expected_lines, l:actual_lines)
  endif
endfunction

" テストケース6: 大きなカウント `100j` で100行移動（またはバッファ末尾）
function! Test_normal_mode_100j() abort
  call s:setup_test_buffer()

  " カーソルを1行目に配置
  call cursor(1, 1)
  let l:start_line = line('.')

  " 100j をfeedkeysで実行
  call feedkeys("100j", 'x')

  let l:end_line = line('.')
  let l:last_line = line('$')

  " 100行移動、またはバッファ末尾に到達
  if l:end_line == l:last_line
    echo "Test 6 PASSED: 100j moved to buffer end (line" l:end_line ")"
  else
    throw printf("Test 6 FAILED: Expected line %d, got line %d", l:last_line, l:end_line)
  endif
endfunction

" テストケース7: マッピングが正しく定義されているか確認
function! Test_mapping_definition() abort
  " 'j' キーのマッピングを確認
  let l:mapping_j = maparg('j', 'n', 0, 1)

  if empty(l:mapping_j)
    throw "Test 7 FAILED: 'j' mapping not found"
  endif

  " <expr> マッピングであることを確認
  if !has_key(l:mapping_j, 'expr') || !l:mapping_j.expr
    throw "Test 7 FAILED: 'j' mapping is not <expr> mapping"
  endif

  " handle_expr() を呼び出していることを確認
  if l:mapping_j.rhs !~# 'handle_expr'
    throw "Test 7 FAILED: 'j' mapping does not call handle_expr()"
  endif

  echo "Test 7 PASSED: Mapping definition is correct (expr=" . l:mapping_j.expr . ", rhs=" . l:mapping_j.rhs . ")"
endfunction

" すべてのテストを実行
function! RunAllTests() abort
  let l:tests = [
        \ 'Test_normal_mode_5j',
        \ 'Test_normal_mode_3w',
        \ 'Test_normal_mode_2b',
        \ 'Test_normal_mode_1j',
        \ 'Test_visual_mode_v5j',
        \ 'Test_normal_mode_100j',
        \ 'Test_mapping_definition',
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
