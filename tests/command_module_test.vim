" tests/command_module_test.vim - command.vimモジュールのテスト
" Author: hellshake-yano
" License: MIT

" テスト環境のセットアップ
let s:save_cpo = &cpo
set cpo&vim

" hellshake_yano#command#set_count() の存在確認
function! s:test_command_set_count_exists() abort
  echo "Test: hellshake_yano#command#set_count() exists"

  if exists('*hellshake_yano#command#set_count')
    echo "  OK: hellshake_yano#command#set_count() exists"
    return v:true
  else
    echoerr "FAIL: hellshake_yano#command#set_count() does not exist"
    return v:false
  endif
endfunction

" hellshake_yano#command#set_timeout() の存在確認
function! s:test_command_set_timeout_exists() abort
  echo "Test: hellshake_yano#command#set_timeout() exists"

  if exists('*hellshake_yano#command#set_timeout')
    echo "  OK: hellshake_yano#command#set_timeout() exists"
    return v:true
  else
    echoerr "FAIL: hellshake_yano#command#set_timeout() does not exist"
    return v:false
  endif
endfunction

" hellshake_yano#command#set_counted_motions() の存在確認
function! s:test_command_set_counted_motions_exists() abort
  echo "Test: hellshake_yano#command#set_counted_motions() exists"

  if exists('*hellshake_yano#command#set_counted_motions')
    echo "  OK: hellshake_yano#command#set_counted_motions() exists"
    return v:true
  else
    echoerr "FAIL: hellshake_yano#command#set_counted_motions() does not exist"
    return v:false
  endif
endfunction

" hellshake_yano#command#update_highlight() の存在確認
function! s:test_command_update_highlight_exists() abort
  echo "Test: hellshake_yano#command#update_highlight() exists"

  if exists('*hellshake_yano#command#update_highlight')
    echo "  OK: hellshake_yano#command#update_highlight() exists"
    return v:true
  else
    echoerr "FAIL: hellshake_yano#command#update_highlight() does not exist"
    return v:false
  endif
endfunction

" 後方互換性: hellshake_yano#set_count() が動作することを確認
function! s:test_backward_compatibility() abort
  echo "Test: Backward compatibility - hellshake_yano#set_* functions still work"

  if exists('*hellshake_yano#set_count')
    echo "  OK: hellshake_yano#set_count() exists (backward compatibility)"
  else
    echoerr "FAIL: hellshake_yano#set_count() does not exist (backward compatibility broken)"
  endif

  if exists('*hellshake_yano#set_timeout')
    echo "  OK: hellshake_yano#set_timeout() exists (backward compatibility)"
  else
    echoerr "FAIL: hellshake_yano#set_timeout() does not exist (backward compatibility broken)"
  endif

  if exists('*hellshake_yano#set_counted_motions')
    echo "  OK: hellshake_yano#set_counted_motions() exists (backward compatibility)"
  else
    echoerr "FAIL: hellshake_yano#set_counted_motions() does not exist (backward compatibility broken)"
  endif

  if exists('*hellshake_yano#update_highlight')
    echo "  OK: hellshake_yano#update_highlight() exists (backward compatibility)"
  else
    echoerr "FAIL: hellshake_yano#update_highlight() does not exist (backward compatibility broken)"
  endif
endfunction

" メインテスト実行関数
function! s:test_command_module() abort
  echo "=== Running Command Module Tests ==="
  echo ""

  " 存在確認テスト
  call s:test_command_set_count_exists()
  echo ""
  call s:test_command_set_timeout_exists()
  echo ""
  call s:test_command_set_counted_motions_exists()
  echo ""
  call s:test_command_update_highlight_exists()
  echo ""

  " 後方互換性テスト
  call s:test_backward_compatibility()
  echo ""

  echo "=== Command Module Tests Complete ==="
endfunction

" テストコマンドの定義
command! -nargs=0 HellshakeYanoTestCommand call s:test_command_module()

" 自動実行（このファイルをsourceした時）
if expand('%:t') == 'command_module_test.vim'
  call s:test_command_module()
endif

let &cpo = s:save_cpo
unlet s:save_cpo
