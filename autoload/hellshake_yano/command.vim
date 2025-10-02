" autoload/hellshake_yano/command.vim - コマンド関数
" Author: hellshake-yano
" License: MIT
"
" このモジュールはユーザーコマンド関数を担当します
" - hellshake_yano#command#set_count() - 移動カウント数を設定
" - hellshake_yano#command#set_timeout() - タイムアウト時間を設定
" - hellshake_yano#command#set_counted_motions() - counted_motionsを設定
" - hellshake_yano#command#update_highlight() - ハイライト色を更新

" 保存と復元
let s:save_cpo = &cpo
set cpo&vim

"=============================================================================
" 内部関数
"=============================================================================

" denopsの準備状態を確認
function! s:is_denops_ready() abort
  return exists('g:hellshake_yano_ready') && g:hellshake_yano_ready
endfunction

" denops設定更新を通知（準備状態チェック込み）
function! s:notify_denops_config() abort
  if s:is_denops_ready()
    try
      call denops#notify('hellshake-yano', 'updateConfig', [g:hellshake_yano])
    catch
      if exists('*hellshake_yano#show_error')
        call hellshake_yano#show_error('[hellshake-yano] Error: Failed to update denops config: ' . v:exception)
      endif
    endtry
  endif
endfunction

" モーションカウント設定キャッシュをクリア
" Note: この関数は将来的にconfig.vimに移動する予定
function! s:clear_motion_count_cache() abort
  " Note: キャッシュ変数はautoload/hellshake_yano.vimで定義されているため、
  " ここでは何もしない（将来的に移動時に実装）
endfunction

" マッピング対象キーを取得
" Note: この関数は将来的にmapping.vimに移動する予定
function! s:get_motion_keys() abort
  let keys = []

  " counted_motionsから取得
  if has_key(g:hellshake_yano, 'counted_motions') && !empty(g:hellshake_yano.counted_motions)
    let keys = copy(g:hellshake_yano.counted_motions)
  elseif get(g:hellshake_yano, 'trigger_on_hjkl', v:true)
    let keys = ['h', 'j', 'k', 'l']
  endif

  " per_key_min_lengthで定義されたキーを自動的に追加
  if has_key(g:hellshake_yano, 'per_key_min_length') && type(g:hellshake_yano.per_key_min_length) == v:t_dict
    for key in keys(g:hellshake_yano.per_key_min_length)
      if index(keys, key) == -1
        call add(keys, key)
      endif
    endfor
  endif

  " per_key_motion_countで定義されたキーを自動的に追加
  if has_key(g:hellshake_yano, 'per_key_motion_count') && type(g:hellshake_yano.per_key_motion_count) == v:t_dict
    for key in keys(g:hellshake_yano.per_key_motion_count)
      if index(keys, key) == -1
        call add(keys, key)
      endif
    endfor
  endif

  return keys
endfunction

" モーションキーマッピングを解除
" Note: この関数は将来的にmapping.vimに移動する予定
function! s:clear_motion_mappings() abort
  let keys = s:get_motion_keys()
  for key in keys
    execute 'silent! nunmap ' . key
    " ビジュアルモードのマッピングも解除
    execute 'silent! xunmap ' . key
  endfor
endfunction

"=============================================================================
" 公開関数
"=============================================================================

" 移動カウント数を設定
function! hellshake_yano#command#set_count(count) abort
  if a:count > 0
    let g:hellshake_yano.motion_count = a:count

    if exists('*hellshake_yano#reset_count')
      call hellshake_yano#reset_count()
    endif

    " denops側に設定を通知
    call s:notify_denops_config()

    " キャッシュをクリア
    call s:clear_motion_count_cache()

    echo printf('[hellshake-yano] Motion count set to %d', a:count)
  else
    if exists('*hellshake_yano#show_error')
      call hellshake_yano#show_error('[hellshake-yano] Error: Count must be greater than 0')
    endif
  endif
endfunction

" タイムアウト時間を設定
function! hellshake_yano#command#set_timeout(timeout) abort
  if a:timeout > 0
    let g:hellshake_yano.motion_timeout = a:timeout

    if exists('*hellshake_yano#reset_count')
      call hellshake_yano#reset_count()
    endif

    " denops側に設定を通知
    call s:notify_denops_config()

    echo printf('[hellshake-yano] Timeout set to %dms', a:timeout)
  else
    if exists('*hellshake_yano#show_error')
      call hellshake_yano#show_error('[hellshake-yano] Error: Timeout must be greater than 0')
    endif
  endif
endfunction

" counted_motions を設定
function! hellshake_yano#command#set_counted_motions(keys) abort
  " 引数の検証
  if type(a:keys) != v:t_list
    if exists('*hellshake_yano#show_error')
      call hellshake_yano#show_error('[hellshake-yano] Error: counted_motions must be a list')
    endif
    return
  endif

  " 各キーの検証
  for key in a:keys
    if type(key) != v:t_string || len(key) != 1
      if exists('*hellshake_yano#show_error')
        call hellshake_yano#show_error('[hellshake-yano] Error: Each motion key must be a single character string: ' . string(key))
      endif
      return
    endif
    if match(key, '^[a-zA-Z0-9!@#$%^&*()_+=\[\]{}|;:,.<>?/~`-]$') == -1
      if exists('*hellshake_yano#show_error')
        call hellshake_yano#show_error('[hellshake-yano] Error: Potentially invalid key: ' . string(key))
      endif
    endif
  endfor

  " 現在のマッピングを解除
  if g:hellshake_yano.enabled
    call s:clear_motion_mappings()
  endif

  " 設定を更新
  let g:hellshake_yano.counted_motions = copy(a:keys)

  " 新しいマッピングを設定
  if g:hellshake_yano.enabled && exists('*hellshake_yano#setup_motion_mappings')
    call hellshake_yano#setup_motion_mappings()
  endif

  " denops側に設定を通知
  call s:notify_denops_config()

  echo printf('[hellshake-yano] Counted motions set to: %s', string(a:keys))
endfunction

" ハイライト色を更新
function! hellshake_yano#command#update_highlight(marker_group, current_group) abort
  " 設定を更新
  if !empty(a:marker_group)
    let g:hellshake_yano.highlight_hint_marker = a:marker_group
  endif
  if !empty(a:current_group)
    let g:hellshake_yano.highlight_hint_marker_current = a:current_group
  endif

  " ハイライトを再適用
  if exists('*hellshake_yano#apply_highlights')
    call hellshake_yano#apply_highlights()
  endif

  " denops側に設定を通知
  call s:notify_denops_config()

  echo printf('[hellshake-yano] Highlight updated: marker=%s, current=%s',
        \ string(a:marker_group), string(a:current_group))
endfunction

" 保存と復元
let &cpo = s:save_cpo
unlet s:save_cpo
