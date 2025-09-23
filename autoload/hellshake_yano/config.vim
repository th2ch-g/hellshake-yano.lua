" autoload/hellshake_yano/config.vim - 設定管理関数
" Author: hellshake-yano
" License: MIT

" 保存と復元
let s:save_cpo = &cpo
set cpo&vim

"=============================================================================
" 設定管理用キャッシュ
"=============================================================================

let s:motion_count_cache = {}  " 設定値のキャッシュ
let s:cache_version = 0  " キャッシュのバージョン

"=============================================================================
" 設定管理関数群
"=============================================================================

" キー別のmotion_count設定値を取得（最適化版）
function! hellshake_yano#config#get_motion_count_for_key(key) abort
  " キャッシュが有効か確認
  if has_key(s:motion_count_cache, a:key)
    return s:motion_count_cache[a:key]
  endif

  let result = 3  " デフォルト値

  " per_key_motion_countに設定があるかチェック
  if has_key(g:hellshake_yano, 'per_key_motion_count')
        \ && type(g:hellshake_yano.per_key_motion_count) == v:t_dict
    let per_key = get(g:hellshake_yano.per_key_motion_count, a:key, 0)
    if type(per_key) == v:t_number && per_key >= 1
      let result = per_key
      let s:motion_count_cache[a:key] = result
      return result
    endif
  endif

  " default_motion_countを使用
  let default_val = get(g:hellshake_yano, 'default_motion_count',
        \ get(g:hellshake_yano, 'motion_count', 3))
  if type(default_val) == v:t_number && default_val >= 1
    let result = default_val
  endif

  " キャッシュに保存
  let s:motion_count_cache[a:key] = result
  return result
endfunction

" モーションカウント設定キャッシュをクリア
function! hellshake_yano#config#clear_motion_count_cache() abort
  let s:motion_count_cache = {}
  let s:cache_version += 1
endfunction

" キーリピート設定を取得
function! hellshake_yano#config#get_key_repeat_config() abort
  return {
        \ 'enabled': get(g:hellshake_yano, 'suppress_on_key_repeat', v:true),
        \ 'threshold': get(g:hellshake_yano, 'key_repeat_threshold', 50),
        \ 'reset_delay': get(g:hellshake_yano, 'key_repeat_reset_delay', 300)
        \ }
endfunction

" マッピング対象キーを取得
function! hellshake_yano#config#get_motion_keys() abort
  let keys = []

  " counted_motionsから取得
  if has_key(g:hellshake_yano, 'counted_motions') && !empty(g:hellshake_yano.counted_motions)
    let keys = copy(g:hellshake_yano.counted_motions)
  elseif get(g:hellshake_yano, 'trigger_on_hjkl', v:true)
    let keys = ['h', 'j', 'k', 'l']
  endif

  " per_key_min_lengthで定義されたキーを自動的に追加
  if has_key(g:hellshake_yano, 'per_key_min_length') &&
        \ type(g:hellshake_yano.per_key_min_length) == v:t_dict
    for key in keys(g:hellshake_yano.per_key_min_length)
      if index(keys, key) == -1
        call add(keys, key)
      endif
    endfor
  endif

  " per_key_motion_countで定義されたキーを自動的に追加
  if has_key(g:hellshake_yano, 'per_key_motion_count') &&
        \ type(g:hellshake_yano.per_key_motion_count) == v:t_dict
    for key in keys(g:hellshake_yano.per_key_motion_count)
      if index(keys, key) == -1
        call add(keys, key)
      endif
    endfor
  endif

  return keys
endfunction

" denops設定更新を通知
function! hellshake_yano#config#notify_denops_config() abort
  if hellshake_yano#utils#is_denops_ready()
    try
      call denops#notify('hellshake-yano', 'updateConfig', [g:hellshake_yano])
    catch
      call hellshake_yano#utils#show_error('[hellshake-yano] Error: Failed to update denops config: ' . v:exception)
    endtry
  endif
endfunction

" 保存と復元
let &cpo = s:save_cpo
unlet s:save_cpo