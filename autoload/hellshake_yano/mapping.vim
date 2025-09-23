" autoload/hellshake_yano/mapping.vim - マッピング管理関数
" Author: hellshake-yano
" License: MIT

" 保存と復元
let s:save_cpo = &cpo
set cpo&vim

"=============================================================================
" マッピング管理関数群
"=============================================================================

" モーションキーマッピングを設定
function! hellshake_yano#mapping#setup_motion_mappings() abort
  let keys = hellshake_yano#config#get_motion_keys()
  for key in keys
    " キーが有効かチェック（1文字の英数字記号のみ）
    if match(key, '^[a-zA-Z0-9!@#$%^&*()_+=\[\]{}|;:,.<>?/~`-]$') != -1
      execute 'nnoremap <silent> <expr> ' . key . ' hellshake_yano#motion(' . string(key) . ')'
      " ビジュアルモード用のマッピングを追加（xnoremapでセレクトモードを除外）
      execute 'xnoremap <silent> <expr> ' . key . ' hellshake_yano#visual_motion(' . string(key) . ')'
    else
      call hellshake_yano#utils#show_error('[hellshake-yano] Error: Invalid key in motion keys: ' . string(key))
    endif
  endfor
endfunction

" モーションキーマッピングを解除
function! hellshake_yano#mapping#clear_motion_mappings() abort
  let keys = hellshake_yano#config#get_motion_keys()
  for key in keys
    execute 'silent! nunmap ' . key
    " ビジュアルモードのマッピングも解除
    execute 'silent! xunmap ' . key
  endfor
endfunction

" counted_motions を設定
function! hellshake_yano#mapping#set_counted_motions(keys) abort
  " 引数の検証
  if type(a:keys) != v:t_list
    call hellshake_yano#utils#show_error('[hellshake-yano] Error: counted_motions must be a list')
    return
  endif

  " 各キーの検証
  for key in a:keys
    if type(key) != v:t_string || len(key) != 1
      call hellshake_yano#utils#show_error('[hellshake-yano] Error: Each motion key must be a single character string: ' . string(key))
      return
    endif
    if match(key, '^[a-zA-Z0-9!@#$%^&*()_+=\[\]{}|;:,.<>?/~`-]$') == -1
      call hellshake_yano#utils#show_error('[hellshake-yano] Error: Potentially invalid key: ' . string(key))
    endif
  endfor

  " 現在のマッピングを解除
  if g:hellshake_yano.enabled
    call hellshake_yano#mapping#clear_motion_mappings()
  endif

  " 設定を更新
  let g:hellshake_yano.counted_motions = copy(a:keys)

  " 新しいマッピングを設定
  if g:hellshake_yano.enabled
    call hellshake_yano#mapping#setup_motion_mappings()
  endif

  " denops側に設定を通知
  call hellshake_yano#config#notify_denops_config()

  echo printf('[hellshake-yano] Counted motions set to: %s', string(a:keys))
endfunction

" 保存と復元
let &cpo = s:save_cpo
unlet s:save_cpo