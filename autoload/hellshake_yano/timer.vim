" License: MIT

function! hellshake_yano#timer#stop_and_clear_timer(timer_dict, bufnr) abort
  if has_key(a:timer_dict, a:bufnr)
    if type(a:timer_dict[a:bufnr]) == v:t_dict
      for key in keys(a:timer_dict[a:bufnr])
        call timer_stop(a:timer_dict[a:bufnr][key])
      endfor
    else
      call timer_stop(a:timer_dict[a:bufnr])
    endif
    unlet a:timer_dict[a:bufnr]
  endif
endfunction
function! hellshake_yano#timer#stop_and_clear_timer_for_key(bufnr, key) abort
  if has_key(g:hellshake_yano_internal.timer_id, a:bufnr) &&
        \ type(g:hellshake_yano_internal.timer_id[a:bufnr]) == v:t_dict
    if has_key(g:hellshake_yano_internal.timer_id[a:bufnr], a:key)
      call timer_stop(g:hellshake_yano_internal.timer_id[a:bufnr][a:key])
      unlet g:hellshake_yano_internal.timer_id[a:bufnr][a:key]
    endif
  endif
endfunction

" モーションタイムアウトタイマーを設定
function! hellshake_yano#timer#set_motion_timeout(bufnr, key) abort
  if !has_key(g:hellshake_yano_internal.timer_id, a:bufnr)
    let g:hellshake_yano_internal.timer_id[a:bufnr] = {}
  endif

  " 既存のタイマーがあれば停止
  if has_key(g:hellshake_yano_internal.timer_id[a:bufnr], a:key)
    call timer_stop(g:hellshake_yano_internal.timer_id[a:bufnr][a:key])
  endif

  " 新しいタイマーを設定
  let g:hellshake_yano_internal.timer_id[a:bufnr][a:key] = timer_start(
        \ get(g:hellshake_yano, 'motion_timeout', 2000),
        \ {-> hellshake_yano#timer#reset_count_for_key(a:bufnr, a:key)})
endfunction

" キー別にカウントをリセット
function! hellshake_yano#timer#reset_count_for_key(bufnr, key) abort
  call hellshake_yano#count#reset_key_count(a:bufnr, a:key)
  call hellshake_yano#timer#stop_and_clear_timer_for_key(a:bufnr, a:key)
endfunction

function! hellshake_yano#timer#set_repeat_end_timer(bufnr, delay) abort
  call hellshake_yano#timer#stop_and_clear_timer(g:hellshake_yano_internal.repeat_end_timer, a:bufnr)
  let g:hellshake_yano_internal.repeat_end_timer[a:bufnr] = timer_start(
        \ a:delay,
        \ {-> hellshake_yano#state#reset_repeat_state(a:bufnr)})
endfunction