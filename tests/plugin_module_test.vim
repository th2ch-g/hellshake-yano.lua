" tests/plugin_module_test.vim - plugin.vimモジュールのテスト
" Author: hellshake-yano
" License: MIT

" テスト環境のセットアップ
let s:save_cpo = &cpo
set cpo&vim

" hellshake_yano#plugin#enable() の存在確認
function! s:test_plugin_enable_exists() abort
  echo "Test: hellshake_yano#plugin#enable() exists"

  if exists('*hellshake_yano#plugin#enable')
    echo "  OK: hellshake_yano#plugin#enable() exists"
    return v:true
  else
    echoerr "FAIL: hellshake_yano#plugin#enable() does not exist"
    return v:false
  endif
endfunction

" hellshake_yano#plugin#disable() の存在確認
function! s:test_plugin_disable_exists() abort
  echo "Test: hellshake_yano#plugin#disable() exists"

  if exists('*hellshake_yano#plugin#disable')
    echo "  OK: hellshake_yano#plugin#disable() exists"
    return v:true
  else
    echoerr "FAIL: hellshake_yano#plugin#disable() does not exist"
    return v:false
  endif
endfunction

" hellshake_yano#plugin#toggle() の存在確認
function! s:test_plugin_toggle_exists() abort
  echo "Test: hellshake_yano#plugin#toggle() exists"

  if exists('*hellshake_yano#plugin#toggle')
    echo "  OK: hellshake_yano#plugin#toggle() exists"
    return v:true
  else
    echoerr "FAIL: hellshake_yano#plugin#toggle() does not exist"
    return v:false
  endif
endfunction

" hellshake_yano#plugin#on_buf_enter() の存在確認
function! s:test_plugin_on_buf_enter_exists() abort
  echo "Test: hellshake_yano#plugin#on_buf_enter() exists"

  if exists('*hellshake_yano#plugin#on_buf_enter')
    echo "  OK: hellshake_yano#plugin#on_buf_enter() exists"
    return v:true
  else
    echoerr "FAIL: hellshake_yano#plugin#on_buf_enter() does not exist"
    return v:false
  endif
endfunction

" hellshake_yano#plugin#on_buf_leave() の存在確認
function! s:test_plugin_on_buf_leave_exists() abort
  echo "Test: hellshake_yano#plugin#on_buf_leave() exists"

  if exists('*hellshake_yano#plugin#on_buf_leave')
    echo "  OK: hellshake_yano#plugin#on_buf_leave() exists"
    return v:true
  else
    echoerr "FAIL: hellshake_yano#plugin#on_buf_leave() does not exist"
    return v:false
  endif
endfunction

" 後方互換性: hellshake_yano#enable() が動作することを確認
function! s:test_backward_compatibility() abort
  echo "Test: Backward compatibility - hellshake_yano#enable/disable/toggle still work"

  if exists('*hellshake_yano#enable')
    echo "  OK: hellshake_yano#enable() exists (backward compatibility)"
  else
    echoerr "FAIL: hellshake_yano#enable() does not exist (backward compatibility broken)"
  endif

  if exists('*hellshake_yano#disable')
    echo "  OK: hellshake_yano#disable() exists (backward compatibility)"
  else
    echoerr "FAIL: hellshake_yano#disable() does not exist (backward compatibility broken)"
  endif

  if exists('*hellshake_yano#toggle')
    echo "  OK: hellshake_yano#toggle() exists (backward compatibility)"
  else
    echoerr "FAIL: hellshake_yano#toggle() does not exist (backward compatibility broken)"
  endif
endfunction

" メインテスト実行関数
function! s:test_plugin_module() abort
  echo "=== Running Plugin Module Tests ==="
  echo ""

  " 存在確認テスト
  call s:test_plugin_enable_exists()
  echo ""
  call s:test_plugin_disable_exists()
  echo ""
  call s:test_plugin_toggle_exists()
  echo ""
  call s:test_plugin_on_buf_enter_exists()
  echo ""
  call s:test_plugin_on_buf_leave_exists()
  echo ""

  " 後方互換性テスト
  call s:test_backward_compatibility()
  echo ""

  echo "=== Plugin Module Tests Complete ==="
endfunction

" テストコマンドの定義
command! -nargs=0 HellshakeYanoTestPlugin call s:test_plugin_module()

" 自動実行（このファイルをsourceした時）
if expand('%:t') == 'plugin_module_test.vim'
  call s:test_plugin_module()
endif

let &cpo = s:save_cpo
unlet s:save_cpo
