" tests/validation_module_test.vim - validation.vimモジュールのテスト
" Author: hellshake-yano
" License: MIT

" テスト環境のセットアップ
let s:save_cpo = &cpo
set cpo&vim

" hellshake_yano#validation#highlight_group_name() の存在確認
function! s:test_validation_highlight_group_name_exists() abort
  echo "Test: hellshake_yano#validation#highlight_group_name() exists"

  if exists('*hellshake_yano#validation#highlight_group_name')
    echo "  OK: hellshake_yano#validation#highlight_group_name() exists"
    return v:true
  else
    echoerr "FAIL: hellshake_yano#validation#highlight_group_name() does not exist"
    return v:false
  endif
endfunction

" hellshake_yano#validation#color_value() の存在確認
function! s:test_validation_color_value_exists() abort
  echo "Test: hellshake_yano#validation#color_value() exists"

  if exists('*hellshake_yano#validation#color_value')
    echo "  OK: hellshake_yano#validation#color_value() exists"
    return v:true
  else
    echoerr "FAIL: hellshake_yano#validation#color_value() does not exist"
    return v:false
  endif
endfunction

" hellshake_yano#validation#normalize_color_name() の存在確認
function! s:test_validation_normalize_color_name_exists() abort
  echo "Test: hellshake_yano#validation#normalize_color_name() exists"

  if exists('*hellshake_yano#validation#normalize_color_name')
    echo "  OK: hellshake_yano#validation#normalize_color_name() exists"
    return v:true
  else
    echoerr "FAIL: hellshake_yano#validation#normalize_color_name() does not exist"
    return v:false
  endif
endfunction

" 後方互換性: hellshake_yano#validate_* 関数が動作することを確認
function! s:test_backward_compatibility() abort
  echo "Test: Backward compatibility - hellshake_yano#validate_* functions still work"

  if exists('*hellshake_yano#validate_highlight_group_name')
    echo "  OK: hellshake_yano#validate_highlight_group_name() exists (backward compatibility)"
  else
    echoerr "FAIL: hellshake_yano#validate_highlight_group_name() does not exist (backward compatibility broken)"
  endif

  if exists('*hellshake_yano#validate_color_value')
    echo "  OK: hellshake_yano#validate_color_value() exists (backward compatibility)"
  else
    echoerr "FAIL: hellshake_yano#validate_color_value() does not exist (backward compatibility broken)"
  endif

  if exists('*hellshake_yano#normalize_color_name')
    echo "  OK: hellshake_yano#normalize_color_name() exists (backward compatibility)"
  else
    echoerr "FAIL: hellshake_yano#normalize_color_name() does not exist (backward compatibility broken)"
  endif
endfunction

" メインテスト実行関数
function! s:test_validation_module() abort
  echo "=== Running Validation Module Tests ==="
  echo ""

  " 存在確認テスト
  call s:test_validation_highlight_group_name_exists()
  echo ""
  call s:test_validation_color_value_exists()
  echo ""
  call s:test_validation_normalize_color_name_exists()
  echo ""

  " 後方互換性テスト
  call s:test_backward_compatibility()
  echo ""

  echo "=== Validation Module Tests Complete ==="
endfunction

" テストコマンドの定義
command! -nargs=0 HellshakeYanoTestValidation call s:test_validation_module()

" 自動実行（このファイルをsourceした時）
if expand('%:t') == 'validation_module_test.vim'
  call s:test_validation_module()
endif

let &cpo = s:save_cpo
unlet s:save_cpo
