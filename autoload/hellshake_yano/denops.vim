" autoload/hellshake_yano/denops.vim - Denops連携関数
" Author: hellshake-yano
" License: MIT

" 保存と復元
let s:save_cpo = &cpo
set cpo&vim

"=============================================================================
" Denops連携関数群
"=============================================================================

" エラーハンドリング付きでdenops関数を呼び出す
function! hellshake_yano#denops#call_function(function_name, args, context) abort
  if !hellshake_yano#utils#is_denops_ready()
    return v:false
  endif

  try
    call denops#notify('hellshake-yano', a:function_name, a:args)
    return v:true
  catch
    call hellshake_yano#utils#show_error(printf('[hellshake-yano] Error: %s failed: %s',
          \ a:context, v:exception))
    return v:false
  endtry
endfunction

" 保存と復元
let &cpo = s:save_cpo
unlet s:save_cpo