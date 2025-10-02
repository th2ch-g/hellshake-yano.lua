" tests/motion_module_test.vim - motion.vimモジュールのテスト
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
        \ 'Test line 1',
        \ 'Test line 2',
        \ 'Test line 3',
        \ 'Test line 4',
        \ 'Test line 5'
        \ ])
  normal! gg
endfunction

" テスト用のクリーンアップ
function! s:cleanup_test_buffer() abort
  bwipeout!
endfunction

" hellshake_yano#motion#process() の存在確認
function! s:test_motion_process_exists() abort
  echo "Test: hellshake_yano#motion#process() exists"

  if exists('*hellshake_yano#motion#process')
    echo "  OK: hellshake_yano#motion#process() exists"
    return v:true
  else
    echoerr "FAIL: hellshake_yano#motion#process() does not exist"
    return v:false
  endif
endfunction

" hellshake_yano#motion#visual() の存在確認
function! s:test_motion_visual_exists() abort
  echo "Test: hellshake_yano#motion#visual() exists"

  if exists('*hellshake_yano#motion#visual')
    echo "  OK: hellshake_yano#motion#visual() exists"
    return v:true
  else
    echoerr "FAIL: hellshake_yano#motion#visual() does not exist"
    return v:false
  endif
endfunction

" hellshake_yano#motion#with_key_context() の存在確認
function! s:test_motion_with_key_context_exists() abort
  echo "Test: hellshake_yano#motion#with_key_context() exists"

  if exists('*hellshake_yano#motion#with_key_context')
    echo "  OK: hellshake_yano#motion#with_key_context() exists"
    return v:true
  else
    echoerr "FAIL: hellshake_yano#motion#with_key_context() does not exist"
    return v:false
  endif
endfunction

" hellshake_yano#motion#process() の基本動作確認
function! s:test_motion_process_basic() abort
  echo "Test: hellshake_yano#motion#process() basic behavior"

  call s:setup_test_buffer()

  " プラグインを有効化
  let g:hellshake_yano.enabled = v:true

  " 'j' キーでの動作確認
  let result = hellshake_yano#motion#process('j')

  if result == 'j'
    echo "  OK: hellshake_yano#motion#process('j') returns 'j'"
  else
    echoerr "FAIL: hellshake_yano#motion#process('j') returned: " . string(result)
  endif

  call s:cleanup_test_buffer()
endfunction

" 後方互換性: hellshake_yano#motion() が動作することを確認
function! s:test_backward_compatibility() abort
  echo "Test: Backward compatibility - hellshake_yano#motion() still works"

  call s:setup_test_buffer()

  " プラグインを有効化
  let g:hellshake_yano.enabled = v:true

  if exists('*hellshake_yano#motion')
    let result = hellshake_yano#motion('k')
    if result == 'k'
      echo "  OK: hellshake_yano#motion('k') still works (backward compatibility)"
    else
      echoerr "FAIL: hellshake_yano#motion('k') returned unexpected value: " . string(result)
    endif
  else
    echoerr "FAIL: hellshake_yano#motion() does not exist (backward compatibility broken)"
  endif

  call s:cleanup_test_buffer()
endfunction

" メインテスト実行関数
function! s:test_motion_module() abort
  echo "=== Running Motion Module Tests ==="
  echo ""

  " 存在確認テスト
  call s:test_motion_process_exists()
  echo ""
  call s:test_motion_visual_exists()
  echo ""
  call s:test_motion_with_key_context_exists()
  echo ""

  " 基本動作テスト
  call s:test_motion_process_basic()
  echo ""

  " 後方互換性テスト
  call s:test_backward_compatibility()
  echo ""

  echo "=== Motion Module Tests Complete ==="
endfunction

" テストコマンドの定義
command! -nargs=0 HellshakeYanoTestMotion call s:test_motion_module()

" 自動実行（このファイルをsourceした時）
if expand('%:t') == 'motion_module_test.vim'
  call s:test_motion_module()
endif

let &cpo = s:save_cpo
unlet s:save_cpo
