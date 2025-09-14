" autoload/hellshake_yano.vim - 自動読み込み関数
" Author: hellshake-yano
" License: MIT

" 保存と復元
let s:save_cpo = &cpo
set cpo&vim

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

" 移動カウントの初期化
function! s:init_count(bufnr) abort
  if !has_key(s:motion_count, a:bufnr)
    let s:motion_count[a:bufnr] = 0
    let s:last_motion_time[a:bufnr] = 0
  endif
  " キーリピート検出の初期化
  if !has_key(s:last_key_time, a:bufnr)
    let s:last_key_time[a:bufnr] = 0
    let s:is_key_repeating[a:bufnr] = v:false
  endif
endfunction

" hjkl移動時の処理
function! hellshake_yano#motion(key) abort
  " プラグインが無効な場合は通常の動作
  if !get(g:hellshake_yano, 'enabled', v:true)
    return a:key
  endif

  let bufnr = s:bufnr()
  call s:init_count(bufnr)

  " キーリピート検出処理
  let current_time = s:get_elapsed_time()
  let config = s:get_key_repeat_config()

  if s:handle_key_repeat_detection(bufnr, current_time, config)
    return a:key
  endif

  " 既存のタイマーをクリア
  if has_key(s:timer_id, bufnr)
    call timer_stop(s:timer_id[bufnr])
    unlet s:timer_id[bufnr]
  endif

  " カウントを増加
  let s:motion_count[bufnr] += 1
  let s:last_motion_time[bufnr] = reltime()

  " リピート中でなく、指定回数に達したらヒント表示
  if !get(s:is_key_repeating, bufnr, v:false) && s:motion_count[bufnr] >= g:hellshake_yano.motion_count
    call s:reset_count(bufnr)
    call s:trigger_hints()
  else
    " タイムアウト用タイマーを設定
    let s:timer_id[bufnr] = timer_start(
          \ g:hellshake_yano.motion_timeout,
          \ {-> s:reset_count(bufnr)})
  endif

  " 元のキーの動作を返す
  return a:key
endfunction

" カウントのリセット
function! s:reset_count(bufnr) abort
  if has_key(s:motion_count, a:bufnr)
    let s:motion_count[a:bufnr] = 0
  endif
  if has_key(s:timer_id, a:bufnr)
    call timer_stop(s:timer_id[a:bufnr])
    unlet s:timer_id[a:bufnr]
  endif
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
  if has_key(s:repeat_end_timer, a:bufnr)
    call timer_stop(s:repeat_end_timer[a:bufnr])
    unlet s:repeat_end_timer[a:bufnr]
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
    if has_key(s:repeat_end_timer, a:bufnr)
      call timer_stop(s:repeat_end_timer[a:bufnr])
    endif
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

" 全バッファのカウントをリセット
function! hellshake_yano#reset_count() abort
  for bufnr in keys(s:motion_count)
    call s:reset_count(str2nr(bufnr))
  endfor
endfunction

" マッピング対象キーを取得
function! s:get_motion_keys() abort
  if has_key(g:hellshake_yano, 'counted_motions') && !empty(g:hellshake_yano.counted_motions)
    return g:hellshake_yano.counted_motions
  elseif g:hellshake_yano.trigger_on_hjkl
    return ['h', 'j', 'k', 'l']
  else
    return []
  endif
endfunction

" モーションキーマッピングを設定
function! s:setup_motion_mappings() abort
  let keys = s:get_motion_keys()
  for key in keys
    " キーが有効かチェック（1文字の英数字記号のみ）
    if match(key, '^[a-zA-Z0-9!@#$%^&*()_+=\[\]{}|;:,.<>?/~`-]$') != -1
      execute 'nnoremap <silent> <expr> ' . key . ' hellshake_yano#motion(' . string(key) . ')'
    else
      echohl WarningMsg
      echomsg '[hellshake-yano] Invalid key in motion keys: ' . string(key)
      echohl None
    endif
  endfor
endfunction

" モーションキーマッピングを解除
function! s:clear_motion_mappings() abort
  let keys = s:get_motion_keys()
  for key in keys
    execute 'silent! nunmap ' . key
  endfor
endfunction

" ヒントをトリガー
function! s:trigger_hints() abort
  " denopsが準備できているか確認
  if !exists('g:hellshake_yano_ready') || !g:hellshake_yano_ready
    return
  endif

  " denops側の関数を呼び出し
  try
    call denops#notify('hellshake-yano', 'showHints', [])
    let s:hints_visible = v:true
  catch
    echohl ErrorMsg
    echomsg '[hellshake-yano] Failed to show hints: ' . v:exception
    echohl None
  endtry
endfunction

" ヒントを表示
function! hellshake_yano#show() abort
  call s:trigger_hints()
endfunction

" ヒントを非表示
function! hellshake_yano#hide() abort
  if !exists('g:hellshake_yano_ready') || !g:hellshake_yano_ready
    return
  endif

  try
    call denops#notify('hellshake-yano', 'hideHints', [])
    let s:hints_visible = v:false
  catch
    echohl ErrorMsg
    echomsg '[hellshake-yano] Failed to hide hints: ' . v:exception
    echohl None
  endtry
endfunction

" プラグインを有効化
function! hellshake_yano#enable() abort
  let g:hellshake_yano.enabled = v:true

  " マッピングを再設定
  call s:setup_motion_mappings()

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
    if exists('g:hellshake_yano_ready') && g:hellshake_yano_ready
      call denops#notify('hellshake-yano', 'updateConfig', [g:hellshake_yano])
    endif
    
    echo printf('[hellshake-yano] Motion count set to %d', a:count)
  else
    echohl ErrorMsg
    echomsg '[hellshake-yano] Count must be greater than 0'
    echohl None
  endif
endfunction

" タイムアウト時間を設定
function! hellshake_yano#set_timeout(timeout) abort
  if a:timeout > 0
    let g:hellshake_yano.motion_timeout = a:timeout
    call hellshake_yano#reset_count()
    
    " denops側に設定を通知
    if exists('g:hellshake_yano_ready') && g:hellshake_yano_ready
      call denops#notify('hellshake-yano', 'updateConfig', [g:hellshake_yano])
    endif
    
    echo printf('[hellshake-yano] Timeout set to %dms', a:timeout)
  else
    echohl ErrorMsg
    echomsg '[hellshake-yano] Timeout must be greater than 0'
    echohl None
  endif
endfunction

" バッファ進入時の処理
function! hellshake_yano#on_buf_enter() abort
  let bufnr = s:bufnr()
  call s:init_count(bufnr)
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
    if exists('g:hellshake_yano_ready') && g:hellshake_yano_ready
      call denops#notify('hellshake-yano', 'updateConfig', [g:hellshake_yano])
    endif

    echo printf('[hellshake-yano] Highlight updated: marker=%s, current=%s', a:marker_group, a:current_group)
  catch
    echohl ErrorMsg
    echomsg '[hellshake-yano] Failed to update highlight: ' . v:exception
    echohl None
  endtry
endfunction

" デバッグ情報を表示
function! hellshake_yano#debug() abort
  let bufnr = s:bufnr()
  call s:init_count(bufnr)

  echo '=== hellshake-yano Debug Info ==='
  echo 'Enabled: ' . g:hellshake_yano.enabled
  echo 'Motion count threshold: ' . g:hellshake_yano.motion_count
  echo 'Timeout: ' . g:hellshake_yano.motion_timeout . 'ms'
  echo 'Current buffer: ' . bufnr
  echo 'Current count: ' . s:motion_count[bufnr]
  echo 'Hints visible: ' . s:hints_visible
  echo 'Denops ready: ' . (exists('g:hellshake_yano_ready') ? g:hellshake_yano_ready : 'false')
  echo 'Highlight hint marker: ' . get(g:hellshake_yano, 'highlight_hint_marker', 'DiffAdd')
  echo 'Highlight hint marker current: ' . get(g:hellshake_yano, 'highlight_hint_marker_current', 'DiffText')
  echo 'Counted motions: ' . string(s:get_motion_keys())
endfunction

" counted_motions を設定
function! hellshake_yano#set_counted_motions(keys) abort
  " 引数の検証
  if type(a:keys) != v:t_list
    echohl ErrorMsg
    echomsg '[hellshake-yano] counted_motions must be a list'
    echohl None
    return
  endif

  " 各キーの検証
  for key in a:keys
    if type(key) != v:t_string || len(key) != 1
      echohl ErrorMsg
      echomsg '[hellshake-yano] Each motion key must be a single character string: ' . string(key)
      echohl None
      return
    endif
    if match(key, '^[a-zA-Z0-9!@#$%^&*()_+=\[\]{}|;:,.<>?/~`-]$') == -1
      echohl WarningMsg
      echomsg '[hellshake-yano] Potentially invalid key: ' . string(key)
      echohl None
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
    call s:setup_motion_mappings()
  endif

  " denops側に設定を通知
  if exists('g:hellshake_yano_ready') && g:hellshake_yano_ready
    call denops#notify('hellshake-yano', 'updateConfig', [g:hellshake_yano])
  endif

  echo printf('[hellshake-yano] Counted motions set to: %s', string(a:keys))
endfunction

" 保存と復元
let &cpo = s:save_cpo
unlet s:save_cpo
