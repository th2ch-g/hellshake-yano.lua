" tests/visual_mode_test.vim - ビジュアルモードのテスト
" Author: hellshake-yano
" License: MIT

" テスト環境のセットアップ
let s:save_cpo = &cpo
set cpo&vim

" テスト用のバッファを作成
function! s:setup_test_buffer() abort
  new
  setlocal buftype=nofile
  setlocal noswapfile
  call setline(1, [
        \ 'This is a test file for visual mode.',
        \ 'Line 2 with some text.',
        \ 'Line 3 with more content.',
        \ 'Line 4 here.',
        \ 'Final line 5.'
        \ ])
  normal! gg
endfunction

" テスト用のクリーンアップ
function! s:cleanup_test_buffer() abort
  bwipeout!
endfunction

" ビジュアルモードマッピングの存在確認
function! s:test_visual_mappings_exist() abort
  echo "Test: Visual mode mappings exist"

  " テストバッファを作成
  call s:setup_test_buffer()

  " マッピングの存在を確認
  let mappings = ['h', 'j', 'k', 'l']
  for key in mappings
    " xnoremapの存在を確認
    let mapping = maparg(key, 'x')
    if empty(mapping)
      echoerr "FAIL: Visual mapping for '" . key . "' not found"
    else
      echo "  OK: Visual mapping for '" . key . "' exists: " . mapping
    endif
  endfor

  " クリーンアップ
  call s:cleanup_test_buffer()
endfunction

" ビジュアル選択の保持テスト
function! s:test_visual_selection_preserved() abort
  echo "Test: Visual selection is preserved after motion"

  " テストバッファを作成
  call s:setup_test_buffer()

  " Character-wise visual modeのテスト
  normal! gg0
  normal! v3l
  " 選択範囲の開始と終了位置を記録
  let start_pos = getpos("'<")
  let end_pos = getpos("'>")

  " hjklキーを押す（マッピングが動作することを確認）
  normal! j

  " まだビジュアルモードであることを確認
  if mode() =~# '[vV]'
    echo "  OK: Still in visual mode after 'j'"
  else
    echoerr "FAIL: Not in visual mode after 'j'"
  endif

  " Escapeでビジュアルモードを終了
  execute "normal! \<Esc>"

  " Line-wise visual modeのテスト
  normal! gg
  normal! V2j

  " hjklキーを押す
  normal! k

  " まだビジュアルモードであることを確認
  if mode() =~# '[vV]'
    echo "  OK: Still in visual mode after 'k'"
  else
    echoerr "FAIL: Not in visual mode after 'k'"
  endif

  " Escapeでビジュアルモードを終了
  execute "normal! \<Esc>"

  " クリーンアップ
  call s:cleanup_test_buffer()
endfunction

" ノーマルモードへの影響がないことを確認
function! s:test_normal_mode_unaffected() abort
  echo "Test: Normal mode behavior is unaffected"

  " テストバッファを作成
  call s:setup_test_buffer()

  " ノーマルモードでの動作を確認
  normal! gg
  let initial_line = line('.')
  normal! j
  let new_line = line('.')

  if new_line == initial_line + 1
    echo "  OK: Normal mode 'j' works correctly"
  else
    echoerr "FAIL: Normal mode 'j' behavior changed"
  endif

  normal! k
  let final_line = line('.')

  if final_line == initial_line
    echo "  OK: Normal mode 'k' works correctly"
  else
    echoerr "FAIL: Normal mode 'k' behavior changed"
  endif

  " クリーンアップ
  call s:cleanup_test_buffer()
endfunction

" Block-wise visual modeのテスト
function! s:test_block_visual_mode() abort
  echo "Test: Block-wise visual mode support"

  " テストバッファを作成
  call s:setup_test_buffer()

  " Block-wise visual modeに入る
  normal! gg0
  execute "normal! \<C-v>2j2l"

  " hjklキーを押す
  normal! l

  " まだビジュアルモードであることを確認
  if mode() == "\<C-v>"
    echo "  OK: Still in block-wise visual mode after 'l'"
  else
    echoerr "FAIL: Not in block-wise visual mode after 'l'"
  endif

  " Escapeでビジュアルモードを終了
  execute "normal! \<Esc>"

  " クリーンアップ
  call s:cleanup_test_buffer()
endfunction

" メインテスト実行関数
function! s:test_visual_mode() abort
  echo "=== Running Visual Mode Tests ==="
  echo ""

  " 各テストを実行
  call s:test_visual_mappings_exist()
  echo ""
  call s:test_visual_selection_preserved()
  echo ""
  call s:test_normal_mode_unaffected()
  echo ""
  call s:test_block_visual_mode()
  echo ""

  echo "=== Visual Mode Tests Complete ==="
endfunction

" テストコマンドの定義
command! -nargs=0 HellshakeYanoTestVisual call s:test_visual_mode()

" 自動実行（このファイルをsourceした時）
if expand('%:t') == 'visual_mode_test.vim'
  call s:test_visual_mode()
endif

let &cpo = s:save_cpo
unlet s:save_cpo