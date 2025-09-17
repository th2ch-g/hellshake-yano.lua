" autoload/hellshake_yano.vim - 自動読み込み関数
" Author: hellshake-yano
" License: MIT

" 保存と復元
let s:save_cpo = &cpo
set cpo&vim

"=============================================================================
" ユーティリティ関数群
" エラー処理、検証、共通処理を担当
"=============================================================================

" エラーメッセージを統一形式で表示する関数
" @param message エラーメッセージ (string)
" または context, exception (2つの引数の場合は自動でフォーマット)
function! hellshake_yano#show_error(...) abort
  if a:0 == 1
    let message = a:1
  elseif a:0 == 2
    let message = printf('[hellshake-yano] Error: %s: %s', a:1, a:2)
  else
    let message = '[hellshake-yano] Error: Invalid error arguments'
  endif

  echohl ErrorMsg
  echomsg message
  echohl None
endfunction

"=============================================================================
" 状態管理関数群
" バッファ状態、カウント管理、タイマー管理を担当
"=============================================================================

" スクリプトローカル変数
let s:motion_count = {}  " バッファごとの移動カウント
let s:last_motion_time = {}  " バッファごとの最後の移動時刻
let s:timer_id = {}  " バッファごとのタイマーID
let s:hints_visible = v:false  " ヒント表示状態

" キーリピート検出用変数
let s:last_key_time = {}  " バッファごとの最後のキー入力時刻
let s:is_key_repeating = {}  " バッファごとのキーリピート状態フラグ
let s:repeat_end_timer = {}  " バッファごとのリピート終了検出タイマー

" バッファ番号を取得
function! s:bufnr() abort
  return bufnr('%')
endfunction

" バッファ状態を包括的に初期化
function! s:init_buffer_state(bufnr) abort
  call s:init_motion_tracking(a:bufnr)
  call s:init_key_repeat_detection(a:bufnr)
endfunction

" モーション追跡の初期化
function! s:init_motion_tracking(bufnr) abort
  if !has_key(s:motion_count, a:bufnr)
    let s:motion_count[a:bufnr] = 0
    let s:last_motion_time[a:bufnr] = 0
  endif
endfunction

" キーリピート検出の初期化
function! s:init_key_repeat_detection(bufnr) abort
  if !has_key(s:last_key_time, a:bufnr)
    let s:last_key_time[a:bufnr] = 0
    let s:is_key_repeating[a:bufnr] = v:false
  endif
endfunction

" モーションカウントを処理
function! s:process_motion_count(bufnr) abort
  " 既存のタイマーをクリア
  call s:stop_and_clear_timer(s:timer_id, a:bufnr)

  " カウントを増加
  let s:motion_count[a:bufnr] += 1
  let s:last_motion_time[a:bufnr] = reltime()
endfunction

" ヒント表示の必要性を判定
function! s:should_trigger_hints(bufnr) abort
  return !get(s:is_key_repeating, a:bufnr, v:false) && s:motion_count[a:bufnr] >= get(g:hellshake_yano, 'motion_count', 3)
endfunction

" モーションタイムアウトタイマーを設定
function! s:set_motion_timeout(bufnr) abort
  let s:timer_id[a:bufnr] = timer_start(
        \ get(g:hellshake_yano, 'motion_timeout', 2000),
        \ {-> s:reset_count(a:bufnr)})
endfunction

" デバッグ表示を処理
function! s:handle_debug_display() abort
  if get(g:hellshake_yano, 'debug_mode', v:false)
    call hellshake_yano#show_debug()
  endif
endfunction

" hjkl移動時の処理（リファクタリング済み）
function! hellshake_yano#motion(key) abort
  let start_time = s:get_elapsed_time()

  " プラグインが無効な場合は通常の動作
  if !get(g:hellshake_yano, 'enabled', v:true)
    return a:key
  endif

  let bufnr = s:bufnr()
  call s:init_buffer_state(bufnr)

  " キーリピート検出処理
  let current_time = s:get_elapsed_time()
  let config = s:get_key_repeat_config()

  if s:handle_key_repeat_detection(bufnr, current_time, config)
    call s:handle_debug_display()
    return a:key
  endif

  " モーションカウントを処理
  call s:process_motion_count(bufnr)

  " ヒント表示かタイムアウト設定を判定・実行
  if s:should_trigger_hints(bufnr)
    call s:reset_count(bufnr)
    call s:trigger_hints()
    call s:log_performance('motion_with_hints', s:get_elapsed_time() - start_time, {
          \ 'key': a:key, 'count': get(g:hellshake_yano, 'motion_count', 3) })
  else
    call s:set_motion_timeout(bufnr)
    call s:log_performance('motion_normal', s:get_elapsed_time() - start_time, {
          \ 'key': a:key, 'count': s:motion_count[bufnr] })
  endif

  call s:handle_debug_display()
  return a:key
endfunction

" カウントのリセット
function! s:reset_count(bufnr) abort
  if has_key(s:motion_count, a:bufnr)
    let s:motion_count[a:bufnr] = 0
  endif
  call s:stop_and_clear_timer(s:timer_id, a:bufnr)
endfunction

" 経過時間をミリ秒で取得（高精度）
function! s:get_elapsed_time() abort
  let time_str = reltimestr(reltime())
  return float2nr(str2float(time_str) * 1000.0)
endfunction

" リピート状態をリセット
function! s:reset_repeat_state(bufnr) abort
  if has_key(s:is_key_repeating, a:bufnr)
    let s:is_key_repeating[a:bufnr] = v:false
  endif
  call s:stop_and_clear_timer(s:repeat_end_timer, a:bufnr)
endfunction

" タイマー管理の共通関数
" @param timer_dict タイマー辞書（s:timer_id または s:repeat_end_timer）
" @param bufnr バッファ番号
function! s:stop_and_clear_timer(timer_dict, bufnr) abort
  if has_key(a:timer_dict, a:bufnr)
    call timer_stop(a:timer_dict[a:bufnr])
    unlet a:timer_dict[a:bufnr]
  endif
endfunction

" キーリピート設定を取得
function! s:get_key_repeat_config() abort
  return {
        \ 'enabled': get(g:hellshake_yano, 'suppress_on_key_repeat', v:true),
        \ 'threshold': get(g:hellshake_yano, 'key_repeat_threshold', 50),
        \ 'reset_delay': get(g:hellshake_yano, 'key_repeat_reset_delay', 300)
        \ }
endfunction

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
      call hellshake_yano#show_error('[hellshake-yano] Error: Failed to update denops config: ' . v:exception)
    endtry
  endif
endfunction

" エラーハンドリング付きでdenops関数を呼び出す
function! s:call_denops_function(function_name, args, context) abort
  if !s:is_denops_ready()
    return v:false
  endif

  try
    call denops#notify('hellshake-yano', a:function_name, a:args)
    return v:true
  catch
    call hellshake_yano#show_error(printf('[hellshake-yano] Error: %s failed: %s', a:context, v:exception))
    return v:false
  endtry
endfunction

" キーリピート検出処理
" @param bufnr バッファ番号
" @param current_time 現在時刻（ミリ秒）
" @param config キーリピート設定辞書
" @return v:true = リピート中でヒント表示をスキップ, v:false = 通常処理を継続
function! s:handle_key_repeat_detection(bufnr, current_time, config) abort
  " 機能が無効の場合は通常処理
  if !a:config.enabled
    let s:last_key_time[a:bufnr] = a:current_time
    return v:false
  endif

  " 前回のキー入力時刻との差を計算
  let time_diff = a:current_time - s:last_key_time[a:bufnr]

  " キーリピート判定
  if time_diff < a:config.threshold && s:last_key_time[a:bufnr] > 0
    " リピート状態に設定
    let s:is_key_repeating[a:bufnr] = v:true

    " 既存のリピート終了タイマーをクリアして新しく設定
    call s:stop_and_clear_timer(s:repeat_end_timer, a:bufnr)
    let s:repeat_end_timer[a:bufnr] = timer_start(
          \ a:config.reset_delay,
          \ {-> s:reset_repeat_state(a:bufnr)})

    " キー時刻更新してヒント表示をスキップ
    let s:last_key_time[a:bufnr] = a:current_time
    return v:true
  endif

  " 通常処理: キー時刻を更新
  let s:last_key_time[a:bufnr] = a:current_time
  return v:false
endfunction

"=============================================================================
" UI関数群
" ハイライト、表示、ヒント表示を担当
"=============================================================================

" 全バッファのカウントをリセット
function! hellshake_yano#reset_count() abort
  for bufnr in keys(s:motion_count)
    call s:reset_count(str2nr(bufnr))
  endfor
endfunction

" ビジュアルモード用のモーション処理
function! hellshake_yano#visual_motion(key) abort
  " 通常のモーション処理を実行
  " ビジュアルモードでは選択範囲を自然に拡張/縮小させるため、gvは不要
  return hellshake_yano#motion(a:key)
endfunction

"=============================================================================
" 設定関数群
" 初期化、更新、設定変更を担当
"=============================================================================

" マッピング対象キーを取得
function! s:get_motion_keys() abort
  if has_key(g:hellshake_yano, 'counted_motions') && !empty(g:hellshake_yano.counted_motions)
    return g:hellshake_yano.counted_motions
  elseif get(g:hellshake_yano, 'trigger_on_hjkl', v:true)
    return ['h', 'j', 'k', 'l']
  else
    return []
  endif
endfunction

" モーションキーマッピングを設定
function! hellshake_yano#setup_motion_mappings() abort
  let keys = s:get_motion_keys()
  for key in keys
    " キーが有効かチェック（1文字の英数字記号のみ）
    if match(key, '^[a-zA-Z0-9!@#$%^&*()_+=\[\]{}|;:,.<>?/~`-]$') != -1
      execute 'nnoremap <silent> <expr> ' . key . ' hellshake_yano#motion(' . string(key) . ')'
      " ビジュアルモード用のマッピングを追加（xnoremapでセレクトモードを除外）
      execute 'xnoremap <silent> <expr> ' . key . ' hellshake_yano#visual_motion(' . string(key) . ')'
    else
      call hellshake_yano#show_error('[hellshake-yano] Error: Invalid key in motion keys: ' . string(key))
    endif
  endfor
endfunction

" モーションキーマッピングを解除
function! s:clear_motion_mappings() abort
  let keys = s:get_motion_keys()
  for key in keys
    execute 'silent! nunmap ' . key
    " ビジュアルモードのマッピングも解除
    execute 'silent! xunmap ' . key
  endfor
endfunction

" ヒントをトリガー
function! s:trigger_hints() abort
  if s:call_denops_function('showHints', [], 'show hints')
    let s:hints_visible = v:true
  endif
endfunction

" ヒントを表示
function! hellshake_yano#show() abort
  call s:trigger_hints()
endfunction

" ヒントを非表示
function! hellshake_yano#hide() abort
  if s:call_denops_function('hideHints', [], 'hide hints')
    let s:hints_visible = v:false
  endif
endfunction

" プラグインを有効化
function! hellshake_yano#enable() abort
  let g:hellshake_yano.enabled = v:true

  " マッピングを再設定
  call hellshake_yano#setup_motion_mappings()

  echo '[hellshake-yano] Enabled'
endfunction

" プラグインを無効化
function! hellshake_yano#disable() abort
  let g:hellshake_yano.enabled = v:false

  " マッピングを解除
  call s:clear_motion_mappings()

  " ヒントを非表示
  if s:hints_visible
    call hellshake_yano#hide()
  endif

  " カウントをリセット
  call hellshake_yano#reset_count()

  echo '[hellshake-yano] Disabled'
endfunction

" プラグインの有効/無効を切り替え
function! hellshake_yano#toggle() abort
  if g:hellshake_yano.enabled
    call hellshake_yano#disable()
  else
    call hellshake_yano#enable()
  endif
endfunction

" 移動カウント数を設定
function! hellshake_yano#set_count(count) abort
  if a:count > 0
    let g:hellshake_yano.motion_count = a:count
    call hellshake_yano#reset_count()

    " denops側に設定を通知
    call s:notify_denops_config()

    echo printf('[hellshake-yano] Motion count set to %d', a:count)
  else
    call hellshake_yano#show_error('[hellshake-yano] Error: Count must be greater than 0')
  endif
endfunction

" タイムアウト時間を設定
function! hellshake_yano#set_timeout(timeout) abort
  if a:timeout > 0
    let g:hellshake_yano.motion_timeout = a:timeout
    call hellshake_yano#reset_count()

    " denops側に設定を通知
    call s:notify_denops_config()

    echo printf('[hellshake-yano] Timeout set to %dms', a:timeout)
  else
    call hellshake_yano#show_error('[hellshake-yano] Error: Timeout must be greater than 0')
  endif
endfunction

" バッファ進入時の処理
function! hellshake_yano#on_buf_enter() abort
  let bufnr = s:bufnr()
  call s:init_buffer_state(bufnr)
endfunction

" バッファ離脱時の処理
function! hellshake_yano#on_buf_leave() abort
  " ヒントが表示されていれば非表示にする
  if s:hints_visible
    call hellshake_yano#hide()
  endif
endfunction

" ハイライト色を更新
function! hellshake_yano#update_highlight(marker_group, current_group) abort
  " 設定を更新
  if !empty(a:marker_group)
    let g:hellshake_yano.highlight_hint_marker = a:marker_group
  endif
  if !empty(a:current_group)
    let g:hellshake_yano.highlight_hint_marker_current = a:current_group
  endif

  " ハイライトを再適用
  try
    if !empty(a:marker_group)
      execute 'highlight default link HellshakeYanoMarker ' . a:marker_group
    endif
    if !empty(a:current_group)
      execute 'highlight default link HellshakeYanoMarkerCurrent ' . a:current_group
    endif

    " denops側に設定を通知
    call s:notify_denops_config()

    echo printf('[hellshake-yano] Highlight updated: marker=%s, current=%s', a:marker_group, a:current_group)
  catch
    call hellshake_yano#show_error('[hellshake-yano] Error: Failed to update highlight: ' . v:exception)
  endtry
endfunction

"=============================================================================
" テスト・デバッグ関数群
" デバッグ表示、パフォーマンス計測を担当
"=============================================================================

" デバッグ情報を取得（詳細版）
function! s:get_debug_info() abort
  let bufnr = s:bufnr()
  call s:init_buffer_state(bufnr)

  let debug_info = {}
  " 基本設定情報
  let debug_info.enabled = get(g:hellshake_yano, 'enabled', v:false)
  let debug_info.debug_mode = get(g:hellshake_yano, 'debug_mode', v:false)
  let debug_info.performance_log = get(g:hellshake_yano, 'performance_log', v:false)

  " 動作設定
  let debug_info.motion_count = get(g:hellshake_yano, 'motion_count', 0)
  let debug_info.motion_timeout = get(g:hellshake_yano, 'motion_timeout', 0)
  let debug_info.counted_motions = s:get_motion_keys()

  " バッファ状態
  let debug_info.current_buffer = bufnr
  let debug_info.current_count = get(s:motion_count, bufnr, 0)
  let debug_info.hints_visible = s:hints_visible
  let debug_info.denops_ready = s:is_denops_ready()

  " キーリピート検出状態
  let debug_info.key_repeat = {
        \ 'enabled': get(g:hellshake_yano, 'suppress_on_key_repeat', v:true),
        \ 'threshold': get(g:hellshake_yano, 'key_repeat_threshold', 50),
        \ 'reset_delay': get(g:hellshake_yano, 'key_repeat_reset_delay', 300),
        \ 'is_repeating': get(s:is_key_repeating, bufnr, v:false),
        \ 'last_key_time': get(s:last_key_time, bufnr, 0),
        \ 'current_time': s:get_elapsed_time()
        \ }

  " 時間計測データ
  let debug_info.timing = {
        \ 'last_motion_time': get(s:last_motion_time, bufnr, 0),
        \ 'timer_active': has_key(s:timer_id, bufnr),
        \ 'repeat_timer_active': has_key(s:repeat_end_timer, bufnr)
        \ }

  " ハイライト設定
  let debug_info.highlight = {
        \ 'hint_marker': get(g:hellshake_yano, 'highlight_hint_marker', 'DiffAdd'),
        \ 'hint_marker_current': get(g:hellshake_yano, 'highlight_hint_marker_current', 'DiffText')
        \ }

  return debug_info
endfunction

" デバッグ情報を表示形式に整形
function! s:build_debug_info(bufnr) abort
  call s:init_buffer_state(a:bufnr)
  let l:lines = []
  call add(l:lines, '=== hellshake-yano Debug Info ===')
  call add(l:lines, 'Enabled: ' . (has_key(g:hellshake_yano, 'enabled') ? g:hellshake_yano.enabled : 'v:false'))
  call add(l:lines, 'Debug mode: ' . (get(g:hellshake_yano, 'debug_mode', v:false) ? 'ON' : 'OFF'))
  call add(l:lines, 'Performance log: ' . (get(g:hellshake_yano, 'performance_log', v:false) ? 'ON' : 'OFF'))
  call add(l:lines, 'Motion count threshold: ' . get(g:hellshake_yano, 'motion_count', 0))
  call add(l:lines, 'Timeout: ' . get(g:hellshake_yano, 'motion_timeout', 0) . 'ms')
  call add(l:lines, 'Current buffer: ' . a:bufnr)
  call add(l:lines, 'Current count: ' . get(s:motion_count, a:bufnr, 0))
  call add(l:lines, 'Hints visible: ' . (s:hints_visible ? 'v:true' : 'v:false'))
  call add(l:lines, 'Denops ready: ' . (s:is_denops_ready() ? 'true' : 'false'))
  call add(l:lines, 'Highlight hint marker: ' . get(g:hellshake_yano, 'highlight_hint_marker', 'DiffAdd'))
  call add(l:lines, 'Highlight hint marker current: ' . get(g:hellshake_yano, 'highlight_hint_marker_current', 'DiffText'))
  call add(l:lines, 'Counted motions: ' . string(s:get_motion_keys()))
  " Key repeat detection debug
  call add(l:lines, 'Key repeat suppression: ' . (get(g:hellshake_yano, 'suppress_on_key_repeat', v:true) ? 1 : 0))
  call add(l:lines, 'Key repeat threshold: ' . get(g:hellshake_yano, 'key_repeat_threshold', 50) . 'ms')
  call add(l:lines, 'Key repeat reset delay: ' . get(g:hellshake_yano, 'key_repeat_reset_delay', 300) . 'ms')
  call add(l:lines, 'Key repeating (current buffer): ' . (get(s:is_key_repeating, a:bufnr, v:false) ? 1 : 0))

  " デバッグモード専用情報
  if get(g:hellshake_yano, 'debug_mode', v:false)
    call add(l:lines, '--- Debug Mode Details ---')
    call add(l:lines, 'Last key time: ' . get(s:last_key_time, a:bufnr, 0))
    call add(l:lines, 'Current time: ' . s:get_elapsed_time())
    call add(l:lines, 'Time since last key: ' . (s:get_elapsed_time() - get(s:last_key_time, a:bufnr, 0)) . 'ms')
    call add(l:lines, 'Motion timer active: ' . (has_key(s:timer_id, a:bufnr) ? 'YES' : 'NO'))
    call add(l:lines, 'Repeat timer active: ' . (has_key(s:repeat_end_timer, a:bufnr) ? 'YES' : 'NO'))
  endif

  return l:lines
endfunction

function! hellshake_yano#get_debug_info() abort
  return s:build_debug_info(s:bufnr())
endfunction

" デバッグ表示関数（debug_mode がtrueの時のみ動作）
function! hellshake_yano#show_debug() abort
  if !get(g:hellshake_yano, 'debug_mode', v:false)
    return
  endif

  let debug_info = s:get_debug_info()

  " ステータスライン用の簡潔な形式
  let status_msg = printf('[hellshake-yano] Count:%d Repeat:%s Debug:ON',
        \ debug_info.current_count,
        \ (debug_info.key_repeat.is_repeating ? 'YES' : 'NO'))

  " エコーエリアに表示
  echohl WarningMsg
  echo status_msg
  echohl None
endfunction

" パフォーマンスログ関数（performance_log がtrueの時のみ動作）
function! s:log_performance(operation, time_ms, ...) abort
  if !get(g:hellshake_yano, 'performance_log', v:false)
    return
  endif

  let bufnr = s:bufnr()
  let extra_info = a:0 > 0 ? a:1 : {}

  let log_entry = printf('[hellshake-yano:PERF] %s buf:%d time:%dms',
        \ a:operation, bufnr, a:time_ms)

  " 追加情報があれば付加
  if !empty(extra_info) && type(extra_info) == v:t_dict
    let log_entry .= ' ' . string(extra_info)
  endif

  " ログ出力（echomsg を使用してメッセージ履歴に保存）
  echomsg log_entry
endfunction

function! hellshake_yano#debug() abort
  let l:info = s:build_debug_info(s:bufnr())
  for l:line in l:info
    echo l:line
  endfor
endfunction

" counted_motions を設定
function! hellshake_yano#set_counted_motions(keys) abort
  " 引数の検証
  if type(a:keys) != v:t_list
    call hellshake_yano#show_error('[hellshake-yano] Error: counted_motions must be a list')
    return
  endif

  " 各キーの検証
  for key in a:keys
    if type(key) != v:t_string || len(key) != 1
      call hellshake_yano#show_error('[hellshake-yano] Error: Each motion key must be a single character string: ' . string(key))
      return
    endif
    if match(key, '^[a-zA-Z0-9!@#$%^&*()_+=\[\]{}|;:,.<>?/~`-]$') == -1
      call hellshake_yano#show_error('[hellshake-yano] Error: Potentially invalid key: ' . string(key))
    endif
  endfor

  " 現在のマッピングを解除
  if g:hellshake_yano.enabled
    call s:clear_motion_mappings()
  endif

  " 設定を更新
  let g:hellshake_yano.counted_motions = copy(a:keys)

  " 新しいマッピングを設定
  if g:hellshake_yano.enabled
    call hellshake_yano#setup_motion_mappings()
  endif

  " denops側に設定を通知
  call s:notify_denops_config()

  echo printf('[hellshake-yano] Counted motions set to: %s', string(a:keys))
endfunction

" ハイライトグループ名の検証関数（公開関数）
function! hellshake_yano#validate_highlight_group_name(name) abort
  " plugin/hellshake-yano.vimの関数を直接呼び出せないので、ここで再実装
  " 空チェック
  if empty(a:name)
    throw '[hellshake-yano] Error: Highlight group name cannot be empty'
  endif

  " 文字列型チェック
  if type(a:name) != v:t_string
    throw '[hellshake-yano] Error: Highlight group name must be a string'
  endif

  " 長さチェック（100文字以下）
  if len(a:name) > 100
    throw '[hellshake-yano] Error: Highlight group name must be 100 characters or less'
  endif

  " 先頭文字チェック（英字またはアンダースコア）
  if a:name !~# '^[a-zA-Z_]'
    throw '[hellshake-yano] Error: Highlight group name must start with a letter or underscore'
  endif

  " 使用可能文字チェック（英数字とアンダースコアのみ）
  if a:name !~# '^[a-zA-Z0-9_]\+$'
    throw '[hellshake-yano] Error: Highlight group name must contain only alphanumeric characters and underscores'
  endif

  return v:true
endfunction

" 色値の検証関数（公開関数）
function! hellshake_yano#validate_color_value(color) abort
  " 空またはundefinedの場合は有効（オプション値）
  if empty(a:color)
    return v:true
  endif

  " 文字列型チェック
  if type(a:color) != v:t_string
    throw '[hellshake-yano] Error: Color value must be a string'
  endif

  " 16進数色の場合
  if a:color =~# '^#'
    " 16進数形式チェック（#fff または #ffffff）
    if a:color !~# '^#\([0-9a-fA-F]\{3\}\|[0-9a-fA-F]\{6\}\)$'
      throw '[hellshake-yano] Error: Invalid hex color format. Use #fff or #ffffff'
    endif
    return v:true
  endif

  " 標準色名チェック
  let valid_colors = [
        \ 'Red', 'Green', 'Blue', 'Yellow', 'Cyan', 'Magenta',
        \ 'White', 'Black', 'Gray', 'NONE', 'None',
        \ 'DarkRed', 'DarkGreen', 'DarkBlue', 'DarkYellow', 'DarkCyan', 'DarkMagenta',
        \ 'LightRed', 'LightGreen', 'LightBlue', 'LightYellow', 'LightCyan', 'LightMagenta',
        \ 'DarkGray', 'LightGray', 'Brown', 'Orange'
        \ ]

  " 大文字小文字を無視して正規化した色名でチェック
  let normalized_color = hellshake_yano#normalize_color_name(a:color)
  if index(valid_colors, normalized_color) == -1
    throw '[hellshake-yano] Error: Invalid color name: ' . a:color
  endif

  return v:true
endfunction

" 色名を正規化する関数（公開関数）
function! hellshake_yano#normalize_color_name(color) abort
  if empty(a:color) || a:color =~# '^#'
    return a:color
  endif

  " 最初の文字を大文字、残りを小文字にする
  return substitute(a:color, '^\(.\)\(.*\)', '\u\1\L\2', '')
endfunction

" 保存と復元
let &cpo = s:save_cpo
unlet s:save_cpo
