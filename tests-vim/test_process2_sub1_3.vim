" tests-vim/test_process2_sub1_3.vim
" Phase D-2 Sub1.3: Neovim統合版 Visual Modeモーション検出のテスト
"
" TDD Red フェーズ: テストケース作成
" 目的: Neovim環境（plugin/hellshake-yano-unified.vim）でのVisual mode w/b/eモーション検出機能をテスト

" テスト用のヘルパー関数
function! s:setup_test_config() abort
  " テスト用の設定
  let g:hellshake_yano = {'perKeyMotionCount': {'w': 2, 'b': 2, 'e': 2}, 'defaultMotionCount': 3, 'motionCounterEnabled': v:true, 'countedMotions': ['w', 'b', 'e']}
endfunction

function! s:teardown_test_config() abort
  if exists('g:hellshake_yano')
    unlet g:hellshake_yano
  endif
endfunction

" Test 1: hellshake_yano#visual_motion() 関数が存在するか
function! s:test_visual_motion_function_exists() abort
  echo "Test 1: hellshake_yano#visual_motion() function exists"

  if exists('*hellshake_yano#visual_motion')
    echo "  OK: hellshake_yano#visual_motion() exists"
  else
    echohl ErrorMsg
    echo "  FAIL: hellshake_yano#visual_motion() not found"
    echohl None
  endif
endfunction

" Test 2: unified版でのxnoremapマッピング存在確認
function! s:test_unified_xnoremap_mappings() abort
  echo "Test 2: Unified version xnoremap mappings"

  call s:setup_test_config()

  try
    " unified版をロード（Neovim環境想定）
    if has('nvim')
      " wキーのxnoremapマッピングをチェック
      redir => mapout
      silent xmap w
      redir END

      if mapout =~# 'hellshake_yano'
        echo "  OK: xnoremap for 'w' exists in unified version"
      else
        echohl ErrorMsg
        echo "  FAIL: xnoremap for 'w' not found in unified version"
        echo "  Current mapping: " . mapout
        echohl None
      endif
    else
      echo "  SKIP: Test requires Neovim environment"
    endif
  finally
    call s:teardown_test_config()
  endtry
endfunction

" Test 3: Visual mode (character-wise) でのwモーション検出
function! s:test_visual_mode_w_motion_unified() abort
  echo "Test 3: Visual mode (v) - w motion detection (unified)"

  call s:setup_test_config()

  try
    " テストバッファを作成
    enew
    call setline(1, 'hello world test vim motion detection')
    normal! gg0

    " Visual modeでwを2回入力してヒント表示をトリガー
    normal! v

    if !exists('*hellshake_yano#visual_motion')
      echohl ErrorMsg
      echo "  FAIL: hellshake_yano#visual_motion() not found"
      echohl None
      return
    endif

    " 手動でvisual_motion()を呼び出してテスト
    " 注: <expr>マッピング経由では自動的に実行される
    let result = hellshake_yano#visual_motion('w')

    " 関数がキーを返すことを確認（<expr>マッピング用）
    if result ==# 'w'
      echo "  OK: hellshake_yano#visual_motion('w') returns 'w'"
    else
      echohl ErrorMsg
      echo "  FAIL: hellshake_yano#visual_motion('w') returns '" . result . "' (expected 'w')"
      echohl None
    endif

    " Visual modeを終了
    execute "normal! \<Esc>"

  finally
    call s:teardown_test_config()
  endtry
endfunction

" Test 4: g:hellshake_yano.motionCounterEnabled の設定が反映されるか
function! s:test_motion_counter_enabled_config() abort
  echo "Test 4: g:hellshake_yano.motionCounterEnabled configuration"

  " motionCounterEnabled = false の場合
  let g:hellshake_yano = {'motionCounterEnabled': v:false}

  " マッピングが設定されていないことを確認する想定
  " （実装後に適切なチェックを追加）
  echo "  OK: motionCounterEnabled configuration test prepared"

  if exists('g:hellshake_yano')
    unlet g:hellshake_yano
  endif
endfunction

" Test 5: g:hellshake_yano.countedMotions の設定が反映されるか
function! s:test_counted_motions_config() abort
  echo "Test 5: g:hellshake_yano.countedMotions configuration"

  " countedMotions = ['w', 'b'] の場合、eはマッピングされない想定
  let g:hellshake_yano = {'motionCounterEnabled': v:true, 'countedMotions': ['w', 'b']}

  " マッピングチェック（実装後に適切なチェックを追加）
  echo "  OK: countedMotions configuration test prepared"

  if exists('g:hellshake_yano')
    unlet g:hellshake_yano
  endif
endfunction

" 全テストを実行
function! s:run_all_tests() abort
  echo "=== Process2 Sub1.3: Neovim Unified Visual Mode Motion Detection Tests ==="
  echo ""

  call s:test_visual_motion_function_exists()
  echo ""

  call s:test_unified_xnoremap_mappings()
  echo ""

  call s:test_visual_mode_w_motion_unified()
  echo ""

  call s:test_motion_counter_enabled_config()
  echo ""

  call s:test_counted_motions_config()
  echo ""

  echo "=== Tests Complete ==="
endfunction

" コマンド定義
command! TestProcess2Sub13 call s:run_all_tests()

" 直接実行された場合はテストを実行
if expand('%:t') ==# 'test_process2_sub1_3.vim'
  call s:run_all_tests()
endif
