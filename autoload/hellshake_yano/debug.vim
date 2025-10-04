" License: MIT

function! hellshake_yano#debug#get_info() abort
  let bufnr = hellshake_yano#utils#bufnr()
  call hellshake_yano#state#init_buffer_state(bufnr)

  let debug_info = {}
  " 基本設定情報
  let debug_info.enabled = get(g:hellshake_yano, 'enabled', v:false)
  let debug_info.debug_mode = get(g:hellshake_yano, 'debug_mode', v:false)
  let debug_info.performance_log = get(g:hellshake_yano, 'performance_log', v:false)

  " 動作設定
  let debug_info.motion_count = get(g:hellshake_yano, 'motion_count', 0)
  let debug_info.motion_timeout = get(g:hellshake_yano, 'motion_timeout', 0)
  let debug_info.counted_motions = hellshake_yano#config#get_motion_keys()

  " バッファ状態
  let debug_info.current_buffer = bufnr
  " キー別カウント情報を含める
  let debug_info.key_counts = get(g:hellshake_yano_internal.motion_count, bufnr, {})
  let debug_info.hints_visible = hellshake_yano#state#is_hints_visible()
  let debug_info.denops_ready = hellshake_yano#utils#is_denops_ready()

  " キーリピート検出状態
  let debug_info.key_repeat = {
        \ 'enabled': get(g:hellshake_yano, 'suppressOnKeyRepeat', v:true),
        \ 'threshold': get(g:hellshake_yano, 'keyRepeatThreshold', 50),
        \ 'reset_delay': get(g:hellshake_yano, 'keyRepeatResetDelay', 300),
        \ 'is_repeating': hellshake_yano#state#is_key_repeating(bufnr),
        \ 'last_key_time': hellshake_yano#state#get_last_key_time(bufnr),
        \ 'current_time': hellshake_yano#utils#get_elapsed_time()
        \ }

  " 時間計測データ
  let debug_info.timing = {
        \ 'last_motion_time': hellshake_yano#state#get_last_motion_time(bufnr),
        \ 'timer_active': has_key(g:hellshake_yano_internal.timer_id, bufnr),
        \ 'repeat_timer_active': has_key(g:hellshake_yano_internal.repeat_end_timer, bufnr)
        \ }

  " ハイライト設定
  let debug_info.highlight = {
        \ 'hint_marker': get(g:hellshake_yano, 'highlight_hint_marker', 'DiffAdd'),
        \ 'hint_marker_current': get(g:hellshake_yano, 'highlight_hint_marker_current', 'DiffText')
        \ }

  return debug_info
endfunction

function! hellshake_yano#debug#build_info(bufnr) abort
  call hellshake_yano#state#init_buffer_state(a:bufnr)
  let l:lines = []
  call add(l:lines, '=== hellshake-yano Debug Info ===')
  call add(l:lines, 'Enabled: ' . (has_key(g:hellshake_yano, 'enabled') ? g:hellshake_yano.enabled : 'v:false'))
  call add(l:lines, 'Debug mode: ' . (get(g:hellshake_yano, 'debug_mode', v:false) ? 'ON' : 'OFF'))
  call add(l:lines, 'Performance log: ' . (get(g:hellshake_yano, 'performance_log', v:false) ? 'ON' : 'OFF'))
  call add(l:lines, 'Motion count threshold: ' . get(g:hellshake_yano, 'motion_count', 0))
  call add(l:lines, 'Timeout: ' . get(g:hellshake_yano, 'motion_timeout', 0) . 'ms')
  call add(l:lines, 'Current buffer: ' . a:bufnr)
  let key_counts = get(g:hellshake_yano_internal.motion_count, a:bufnr, {})
  if type(key_counts) == v:t_dict && !empty(key_counts)
    call add(l:lines, 'Key counts: ' . string(key_counts))
  else
    call add(l:lines, 'Key counts: (none)')
  endif
  call add(l:lines, 'Hints visible: ' . (hellshake_yano#state#is_hints_visible() ? 'v:true' : 'v:false'))
  call add(l:lines, 'Denops ready: ' . (hellshake_yano#utils#is_denops_ready() ? 'true' : 'false'))
  call add(l:lines, 'Highlight hint marker: ' . get(g:hellshake_yano, 'highlight_hint_marker', 'DiffAdd'))
  call add(l:lines, 'Highlight hint marker current: ' . get(g:hellshake_yano, 'highlight_hint_marker_current', 'DiffText'))
  call add(l:lines, 'Counted motions: ' . string(hellshake_yano#config#get_motion_keys()))
  call add(l:lines, 'Key repeat suppression: ' . (get(g:hellshake_yano, 'suppressOnKeyRepeat', v:true) ? 1 : 0))
  call add(l:lines, 'Key repeat threshold: ' . get(g:hellshake_yano, 'keyRepeatThreshold', 50) . 'ms')
  call add(l:lines, 'Key repeat reset delay: ' . get(g:hellshake_yano, 'keyRepeatResetDelay', 300) . 'ms')
  call add(l:lines, 'Key repeating (current buffer): ' . (hellshake_yano#state#is_key_repeating(a:bufnr) ? 1 : 0))
  if get(g:hellshake_yano, 'debug_mode', v:false)
    call add(l:lines, '--- Debug Mode Details ---')
    call add(l:lines, 'Last key time: ' . hellshake_yano#state#get_last_key_time(a:bufnr))
    call add(l:lines, 'Current time: ' . hellshake_yano#utils#get_elapsed_time())
    call add(l:lines, 'Time since last key: ' . (hellshake_yano#utils#get_elapsed_time() - hellshake_yano#state#get_last_key_time(a:bufnr)) . 'ms')
    call add(l:lines, 'Motion timer active: ' . (has_key(g:hellshake_yano_internal.timer_id, a:bufnr) ? 'YES' : 'NO'))
    call add(l:lines, 'Repeat timer active: ' . (has_key(g:hellshake_yano_internal.repeat_end_timer, a:bufnr) ? 'YES' : 'NO'))
  endif
  return l:lines
endfunction

function! hellshake_yano#debug#show() abort
  if !get(g:hellshake_yano, 'debug_mode', v:false)
    return
  endif
  let debug_info = hellshake_yano#debug#get_info()
  let key_count_summary = !empty(debug_info.key_counts) ? string(debug_info.key_counts) : '(none)'
  let status_msg = printf('[hellshake-yano] KeyCounts:%s Repeat:%s Debug:ON',
        \ key_count_summary, (debug_info.key_repeat.is_repeating ? 'YES' : 'NO'))
  echohl WarningMsg
  echo status_msg
  echohl None
endfunction

function! hellshake_yano#debug#display() abort
  let l:info = hellshake_yano#debug#build_info(hellshake_yano#utils#bufnr())
  for l:line in l:info
    echo l:line
  endfor
endfunction

" テスト用: キー別カウントを取得
function! hellshake_yano#debug#get_key_count(bufnr, key) abort
  return hellshake_yano#count#get_key_count(a:bufnr, a:key)
endfunction

" テスト用: キー別motion_count設定値を取得
function! hellshake_yano#debug#get_motion_count_for_key(key) abort
  return hellshake_yano#config#get_motion_count_for_key(a:key)
endfunction

" テスト用: ヒント表示判定を取得
function! hellshake_yano#debug#should_trigger_hints_for_key(bufnr, key) abort
  return hellshake_yano#hint#should_trigger_hints_for_key(a:bufnr, a:key)
endfunction

" テスト用: キー別のモーションカウントを手動で増加
function! hellshake_yano#debug#increment_key_count(bufnr, key) abort
  call hellshake_yano#count#increment_key_count(a:bufnr, a:key)
endfunction

function! hellshake_yano#debug#reset_key_count(bufnr, key) abort
  call hellshake_yano#count#reset_key_count(a:bufnr, a:key)
endfunction