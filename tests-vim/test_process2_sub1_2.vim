" tests-vim/test_process2_sub1_2.vim
" Phase D-2 Sub1.2: Visual Mode モーション検出のテスト
"
" TDD Red フェーズ: テストケース作成
" 目的: Visual mode (v/V/Ctrl-v) でのモーション検出機能をテスト

" テスト用のヘルパー関数
function! s:setup_test_config() abort
  " テスト用の設定
  let g:hellshake_yano = {
    \ 'perKeyMotionCount': {
    \   'w': 2,
    \   'b': 2,
    \   'e': 2,
    \   'h': 2,
    \   'j': 2,
    \   'k': 2,
    \   'l': 2,
    \ },
    \ 'defaultMotionCount': 3
  \ }
endfunction

function! s:teardown_test_config() abort
  if exists('g:hellshake_yano')
    unlet g:hellshake_yano
  endif
endfunction

" Test 1: Visual mode (character-wise) でのwモーション検出
function! s:test_visual_mode_w_motion() abort
  echo "Test 1: Visual mode (v) - w motion detection"

  call s:setup_test_config()

  try
    " テストバッファを作成
    enew
    call setline(1, 'hello world test vim motion detection')
    normal! gg0

    " Visual modeでwを2回入力してヒント表示をトリガー
    " (実装後はヒント表示が動作するはず)
    normal! v

    " handle_visual関数が存在するかチェック
    if !exists('*hellshake_yano_vim#motion#handle_visual')
      echohl ErrorMsg
      echo "  FAIL: hellshake_yano_vim#motion#handle_visual() not found"
      echohl None
      return
    endif

    " 手動でhandle_visual()を呼び出してテスト
    call hellshake_yano_vim#motion#handle_visual('w')
    call hellshake_yano_vim#motion#handle_visual('w')

    " Visual modeが維持されているか確認
    let l:mode = mode()
    if l:mode ==# 'v' || l:mode ==# 'V' || l:mode ==# "\<C-v>"
      echo "  OK: Visual mode maintained after motion"
    else
      echohl ErrorMsg
      echo "  FAIL: Visual mode not maintained (current mode: " . l:mode . ")"
      echohl None
    endif

    " Visual modeを終了
    execute "normal! \<Esc>"

  finally
    call s:teardown_test_config()
  endtry
endfunction

" Test 2: Line-wise visual mode (V) でのモーション検出
function! s:test_visual_line_mode() abort
  echo "Test 2: Line-wise visual mode (V) - motion detection"

  call s:setup_test_config()

  try
    " テストバッファを作成
    enew
    call setline(1, ['line one', 'line two', 'line three', 'line four'])
    normal! gg0

    " Line-wise visual modeでjを2回入力
    normal! V

    if !exists('*hellshake_yano_vim#motion#handle_visual')
      echohl ErrorMsg
      echo "  FAIL: hellshake_yano_vim#motion#handle_visual() not found"
      echohl None
      return
    endif

    call hellshake_yano_vim#motion#handle_visual('j')
    call hellshake_yano_vim#motion#handle_visual('j')

    " Visual modeが維持されているか確認
    let l:mode = mode()
    if l:mode ==# 'V'
      echo "  OK: Line-wise visual mode maintained"
    else
      echohl ErrorMsg
      echo "  FAIL: Line-wise visual mode not maintained (current mode: " . l:mode . ")"
      echohl None
    endif

    execute "normal! \<Esc>"

  finally
    call s:teardown_test_config()
  endtry
endfunction

" Test 3: Block-wise visual mode (Ctrl-v) でのモーション検出
function! s:test_visual_block_mode() abort
  echo "Test 3: Block-wise visual mode (Ctrl-v) - motion detection"

  call s:setup_test_config()

  try
    " テストバッファを作成
    enew
    call setline(1, ['abcdef', 'ghijkl', 'mnopqr', 'stuvwx'])
    normal! gg0

    " Block-wise visual modeでlを2回入力
    execute "normal! \<C-v>"

    if !exists('*hellshake_yano_vim#motion#handle_visual')
      echohl ErrorMsg
      echo "  FAIL: hellshake_yano_vim#motion#handle_visual() not found"
      echohl None
      return
    endif

    call hellshake_yano_vim#motion#handle_visual('l')
    call hellshake_yano_vim#motion#handle_visual('l')

    " Visual modeが維持されているか確認
    let l:mode = mode()
    if l:mode ==# "\<C-v>" || l:mode ==# 'CTRL-V' || visualmode() ==# "\<C-v>"
      echo "  OK: Block-wise visual mode maintained"
    else
      echohl ErrorMsg
      echo "  FAIL: Block-wise visual mode not maintained (current mode: " . l:mode . ")"
      echohl None
    endif

    execute "normal! \<Esc>"

  finally
    call s:teardown_test_config()
  endtry
endfunction

" Test 4: perKeyMotionCount が適用されることを確認
function! s:test_per_key_motion_count() abort
  echo "Test 4: perKeyMotionCount application in visual mode"

  call s:setup_test_config()

  try
    " get_motion_count() が正しく動作することを確認
    let l:count = hellshake_yano_vim#motion#get_motion_count('w')

    if l:count == 2
      echo "  OK: get_motion_count('w') returns 2"
    else
      echohl ErrorMsg
      echo "  FAIL: get_motion_count('w') returns " . l:count . " (expected 2)"
      echohl None
    endif

  finally
    call s:teardown_test_config()
  endtry
endfunction

" Test 5: xnoremap マッピングが存在することを確認
function! s:test_xnoremap_mappings() abort
  echo "Test 5: xnoremap mappings existence"

  " wキーのxnoremapマッピングをチェック
  let l:mapout = execute('xmap w')

  if l:mapout =~# 'hellshake_yano_vim#motion#handle_visual'
    echo "  OK: xnoremap for 'w' exists"
  else
    echohl ErrorMsg
    echo "  FAIL: xnoremap for 'w' not found"
    echohl None
  endif
endfunction

" 全テストを実行
function! s:run_all_tests() abort
  echo "=== Process2 Sub1.2: Visual Mode Motion Detection Tests ==="
  echo ""

  call s:test_per_key_motion_count()
  echo ""

  call s:test_xnoremap_mappings()
  echo ""

  call s:test_visual_mode_w_motion()
  echo ""

  call s:test_visual_line_mode()
  echo ""

  call s:test_visual_block_mode()
  echo ""

  echo "=== Tests Complete ==="
endfunction

" コマンド定義
command! TestProcess2Sub12 call s:run_all_tests()

" 直接実行された場合はテストを実行
if expand('%:t') ==# 'test_process2_sub1_2.vim'
  call s:run_all_tests()
endif
