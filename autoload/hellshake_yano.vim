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
let s:timer_id = {}  " バッファごとのキー別タイマーID {bufnr: {key: timer_id}}
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
    let s:motion_count[a:bufnr] = {}  " キー別カウント辞書
    let s:last_motion_time[a:bufnr] = 0
  endif
  if !has_key(s:timer_id, a:bufnr)
    let s:timer_id[a:bufnr] = {}  " キー別タイマー辞書
  endif
endfunction

" ============================================================================
" カウント管理関数群
" ============================================================================

" キー別カウントの初期化（最適化版）
" 責務: 指定されたバッファとキーのカウント構造を初期化
" @param bufnr バッファ番号
" @param key キー文字
function! s:init_key_count(bufnr, key) abort
  " 一度の条件チェックで両方を初期化
  if !has_key(s:motion_count, a:bufnr)
    let s:motion_count[a:bufnr] = {a:key: 0}
  elseif !has_key(s:motion_count[a:bufnr], a:key)
    let s:motion_count[a:bufnr][a:key] = 0
  endif
endfunction

" キー別カウントを取得（初期化不要版）
" 責務: 現在のカウント値を取得（未初期化の場合0を返す）
" @param bufnr バッファ番号
" @param key キー文字
" @return カウント値
function! s:get_key_count(bufnr, key) abort
  if has_key(s:motion_count, a:bufnr) && has_key(s:motion_count[a:bufnr], a:key)
    return s:motion_count[a:bufnr][a:key]
  endif
  return 0
endfunction

" キー別カウントを増加
" 責務: カウントをインクリメント（必要に応じて初期化）
" @param bufnr バッファ番号
" @param key キー文字
function! s:increment_key_count(bufnr, key) abort
  call s:init_key_count(a:bufnr, a:key)
  let s:motion_count[a:bufnr][a:key] += 1
endfunction

" キー別カウントをリセット
" 責務: カウントを0にリセット（構造が存在する場合のみ）
" @param bufnr バッファ番号
" @param key キー文字
function! s:reset_key_count(bufnr, key) abort
  if has_key(s:motion_count, a:bufnr) && has_key(s:motion_count[a:bufnr], a:key)
    let s:motion_count[a:bufnr][a:key] = 0
  endif
endfunction

" ============================================================================
" 設定管理関数群
" ============================================================================

" キー別のmotion_count設定値を取得（最適化版）
" 責務: キーに対応するmotion_count設定値を取得（キャッシュ機能付き）
" @param key キー文字
" @return motion_count値（優先順: per_key > default > legacy > 3）
let s:motion_count_cache = {}  " 設定値のキャッシュ
let s:cache_version = 0  " キャッシュのバージョン

function! s:get_motion_count_for_key(key) abort
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
  let default_val = get(g:hellshake_yano, 'default_motion_count', get(g:hellshake_yano, 'motion_count', 3))
  if type(default_val) == v:t_number && default_val >= 1
    let result = default_val
  endif

  " キャッシュに保存
  let s:motion_count_cache[a:key] = result
  return result
endfunction

" モーションカウント設定キャッシュをクリア
" 責務: 設定変更時にキャッシュを破棄
function! s:clear_motion_count_cache() abort
  let s:motion_count_cache = {}
  let s:cache_version += 1
endfunction

" ============================================================================
" ヒント表示制御関数群
" ============================================================================

" キー別ヒント表示の必要性を判定
" 責務: 現在のカウントと設定値を比較してヒント表示の要否を判定
" @param bufnr バッファ番号
" @param key キー文字
" @return v:true = ヒント表示, v:false = 表示しない
function! s:should_trigger_hints_for_key(bufnr, key) abort
  if get(s:is_key_repeating, a:bufnr, v:false)
    return v:false
  endif

  let key_count = s:get_key_count(a:bufnr, a:key)
  let threshold = s:get_motion_count_for_key(a:key)
  return key_count >= threshold
endfunction

" キー別モーションカウント処理
" 責務: キー入力を処理し、カウントを更新し、タイマーをリセット
" @param bufnr バッファ番号
" @param key キー文字
function! s:process_motion_count_for_key(bufnr, key) abort
  " 既存のタイマーをクリア（キー別）
  call s:stop_and_clear_timer_for_key(a:bufnr, a:key)

  " キー別カウントを増加
  call s:increment_key_count(a:bufnr, a:key)
  let s:last_motion_time[a:bufnr] = reltime()
endfunction

" キーリピート検出の初期化
function! s:init_key_repeat_detection(bufnr) abort
  if !has_key(s:last_key_time, a:bufnr)
    let s:last_key_time[a:bufnr] = s:get_elapsed_time()
    let s:is_key_repeating[a:bufnr] = v:false
  endif
endfunction

" ============================================================================
" タイマー管理関数群
" ============================================================================

" モーションタイムアウトタイマーを設定
" 責務: 指定されたキーのタイマーを設定し、タイムアウト時にカウントをリセット
" @param bufnr バッファ番号
" @param key キー文字
function! s:set_motion_timeout(bufnr, key) abort
  if !has_key(s:timer_id, a:bufnr)
    let s:timer_id[a:bufnr] = {}
  endif

  " 既存のタイマーがあれば停止
  if has_key(s:timer_id[a:bufnr], a:key)
    call timer_stop(s:timer_id[a:bufnr][a:key])
  endif

  " 新しいタイマーを設定
  let s:timer_id[a:bufnr][a:key] = timer_start(
        \ get(g:hellshake_yano, 'motion_timeout', 2000),
        \ {-> s:reset_count_for_key(a:bufnr, a:key)})
endfunction

" キー別にカウントをリセット
" 責務: カウントとタイマーを両方リセット（タイムアウト時に使用）
" @param bufnr バッファ番号
" @param key キー文字
function! s:reset_count_for_key(bufnr, key) abort
  call s:reset_key_count(a:bufnr, a:key)
  call s:stop_and_clear_timer_for_key(a:bufnr, a:key)
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

  " キー別モーションカウントを処理
  call s:process_motion_count_for_key(bufnr, a:key)

  " キー別ヒント表示かタイムアウト設定を判定・実行
  if s:should_trigger_hints_for_key(bufnr, a:key)
    call s:reset_key_count(bufnr, a:key)
    call hellshake_yano#show_hints_with_key(a:key)
    call s:log_performance('motion_with_hints', s:get_elapsed_time() - start_time, {
          \ 'key': a:key, 'count': s:get_motion_count_for_key(a:key) })
  else
    call s:set_motion_timeout(bufnr, a:key)
    call s:log_performance('motion_normal', s:get_elapsed_time() - start_time, {
          \ 'key': a:key, 'count': s:get_key_count(bufnr, a:key) })
  endif

  call s:handle_debug_display()
  return a:key
endfunction

" カウントのリセット（後方互換性のため保持、全キーをリセット）
function! s:reset_count(bufnr) abort
  if has_key(s:motion_count, a:bufnr)
    " 新しい辞書構造の場合は全キーをリセット
    if type(s:motion_count[a:bufnr]) == v:t_dict
      for key in keys(s:motion_count[a:bufnr])
        let s:motion_count[a:bufnr][key] = 0
      endfor
    else
      " 古い構造の場合（migration中）
      let s:motion_count[a:bufnr] = 0
    endif
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
    " 新しいキー別構造の場合
    if type(a:timer_dict[a:bufnr]) == v:t_dict
      " 全キーのタイマーを停止
      for key in keys(a:timer_dict[a:bufnr])
        call timer_stop(a:timer_dict[a:bufnr][key])
      endfor
    else
      " 古い構造の場合（互換性保持）
      call timer_stop(a:timer_dict[a:bufnr])
    endif
    unlet a:timer_dict[a:bufnr]
  endif
endfunction

" キー別タイマー管理関数
" @param bufnr バッファ番号
" @param key キー文字
function! s:stop_and_clear_timer_for_key(bufnr, key) abort
  if has_key(s:timer_id, a:bufnr) && type(s:timer_id[a:bufnr]) == v:t_dict
    if has_key(s:timer_id[a:bufnr], a:key)
      call timer_stop(s:timer_id[a:bufnr][a:key])
      unlet s:timer_id[a:bufnr][a:key]
    endif
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

" ハイライト設定を再適用（公開関数）
function! hellshake_yano#apply_highlights() abort
  " highlight_hint_marker の設定適用（snake_case優先、camelCaseフォールバック）
  let l:marker_config = get(g:hellshake_yano, 'highlight_hint_marker',
        \ get(g:hellshake_yano, 'highlightHintMarker', ''))
  if !empty(l:marker_config)
    call s:apply_highlight_setting('HellshakeYanoMarker', l:marker_config)
  endif

  " highlight_hint_marker_current の設定適用（snake_case優先、camelCaseフォールバック）
  let l:current_config = get(g:hellshake_yano, 'highlight_hint_marker_current',
        \ get(g:hellshake_yano, 'highlightHintMarkerCurrent', ''))
  if !empty(l:current_config)
    call s:apply_highlight_setting('HellshakeYanoMarkerCurrent', l:current_config)
  endif
endfunction

" ハイライト設定を適用する内部関数
function! s:apply_highlight_setting(hlgroup_name, color_config) abort
  " 文字列の場合（従来のハイライトグループ名）
  if type(a:color_config) == v:t_string
    try
      " defaultを削除して強制的にリンクを更新
      execute 'highlight link ' . a:hlgroup_name . ' ' . a:color_config
    catch
      call hellshake_yano#show_error('[hellshake-yano] Error: Failed to apply highlight: ' . v:exception)
    endtry
    return
  endif

  " 辞書の場合（fg/bg個別指定）
  if type(a:color_config) == v:t_dict
    let l:cmd_parts = ['highlight', a:hlgroup_name]

    " fg（前景色）の処理
    if has_key(a:color_config, 'fg') && !empty(a:color_config.fg)
      let l:fg_color = hellshake_yano#normalize_color_name(a:color_config.fg)
      if a:color_config.fg =~# '^#'
        " 16進数色の場合はguifgのみ
        call add(l:cmd_parts, 'guifg=' . a:color_config.fg)
      else
        " 色名の場合はctermfgとguifgの両方
        call add(l:cmd_parts, 'ctermfg=' . l:fg_color)
        call add(l:cmd_parts, 'guifg=' . l:fg_color)
      endif
    endif

    " bg（背景色）の処理
    if has_key(a:color_config, 'bg') && !empty(a:color_config.bg)
      let l:bg_color = hellshake_yano#normalize_color_name(a:color_config.bg)
      if a:color_config.bg =~# '^#'
        " 16進数色の場合はguibgのみ
        call add(l:cmd_parts, 'guibg=' . a:color_config.bg)
      else
        " 色名の場合はctermbgとguibgの両方
        call add(l:cmd_parts, 'ctermbg=' . l:bg_color)
        call add(l:cmd_parts, 'guibg=' . l:bg_color)
      endif
    endif

    " ハイライトコマンドを実行
    try
      let l:highlight_cmd = join(l:cmd_parts, ' ')
      execute l:highlight_cmd
    catch
      call hellshake_yano#show_error('[hellshake-yano] Error: Failed to apply highlight: ' . v:exception)
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

  " キーリピート判定（初回キー入力は除外、2回目以降で判定）
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

  " per_key_motion_countで定義されたキーを自動的に追加（process5 sub1）
  if has_key(g:hellshake_yano, 'per_key_motion_count') && type(g:hellshake_yano.per_key_motion_count) == v:t_dict
    for key in keys(g:hellshake_yano.per_key_motion_count)
      if index(keys, key) == -1
        call add(keys, key)
      endif
    endfor
  endif

  return keys
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

    " キャッシュをクリア（process5 sub2）
    call s:clear_motion_count_cache()

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

  " ハイライトを再適用（plugin/hellshake-yano.vimのs:apply_custom_highlightsを実行）
  call hellshake_yano#apply_highlights()

  " denops側に設定を通知
  call s:notify_denops_config()

  echo printf('[hellshake-yano] Highlight updated: marker=%s, current=%s',
        \ string(a:marker_group), string(a:current_group))
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
  " キー別カウント情報を含める
  let debug_info.key_counts = get(s:motion_count, bufnr, {})
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
  " キー別カウント情報を表示
  let key_counts = get(s:motion_count, a:bufnr, {})
  if type(key_counts) == v:t_dict && !empty(key_counts)
    call add(l:lines, 'Key counts: ' . string(key_counts))
  else
    call add(l:lines, 'Key counts: (none)')
  endif
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

  " ステータスライン用の簡潔な形式（キー別カウント対応）
  let key_count_summary = ''
  if !empty(debug_info.key_counts)
    let key_count_summary = string(debug_info.key_counts)
  else
    let key_count_summary = '(none)'
  endif
  let status_msg = printf('[hellshake-yano] KeyCounts:%s Repeat:%s Debug:ON',
        \ key_count_summary,
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

"=============================================================================
" Process4: Denops連携関数群
" キー情報をDenopsに伝達する関数群
"=============================================================================

" キー情報付きヒント表示関数（Process4 sub1）
" @param key - 押下されたキー文字
function! hellshake_yano#show_hints_with_key(key) abort
  try
    if !s:is_denops_ready()
      return
    endif

    " 現在のモードを検出
    let current_mode = hellshake_yano#detect_current_mode()
    " Denops側のshowHintsWithKeyメソッドを呼び出し（モード情報付き）
    call denops#notify('hellshake-yano', 'showHintsWithKey', [a:key, current_mode])
  catch
    call hellshake_yano#show_error('show_hints_with_key', v:exception)
  endtry
endfunction

" 現在のモードを検出する関数（process2 追加）
function! hellshake_yano#detect_current_mode() abort
  let vim_mode = mode()
  return hellshake_yano#detect_current_mode_from_string(vim_mode)
endfunction

" mode()文字列からモード種別を判定する関数（process2 追加）
function! hellshake_yano#detect_current_mode_from_string(mode_string) abort
  " Visual modes: v (character-wise), V (line-wise), ^V (block-wise)
  if a:mode_string =~# '^[vV\<C-V>]'
    return 'visual'
  endif
  " Insert modes
  if a:mode_string =~# '^[iI]'
    return 'insert'
  endif
  " Command-line modes
  if a:mode_string =~# '^[c:]'
    return 'command'
  endif
  " Replace modes
  if a:mode_string =~# '^[rR]'
    return 'replace'
  endif
  " Default: normal mode
  return 'normal'
endfunction

" hellshake_yano#motion関数を更新してキー情報を伝達（Process4 sub1拡張）
function! hellshake_yano#motion_with_key_context(key) abort
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

  " キー別モーションカウントを処理
  call s:process_motion_count_for_key(bufnr, a:key)

  " キー別ヒント表示かタイムアウト設定を判定・実行
  if s:should_trigger_hints_for_key(bufnr, a:key)
    call s:reset_key_count(bufnr, a:key)
    " キー情報付きでヒント表示を呼び出し
    call hellshake_yano#show_hints_with_key(a:key)
    call s:log_performance('motion_with_hints_and_key', s:get_elapsed_time() - start_time, {
          \ 'key': a:key, 'count': s:get_motion_count_for_key(a:key) })
  else
    call s:set_motion_timeout(bufnr, a:key)
    call s:log_performance('motion_normal_with_key', s:get_elapsed_time() - start_time, {
          \ 'key': a:key, 'count': s:get_key_count(bufnr, a:key) })
  endif

  call s:handle_debug_display()
  return a:key
endfunction

"=============================================================================
" テスト用デバッグ関数群
"=============================================================================

" テスト用: キー別カウントを取得（外部からアクセス可能）
function! hellshake_yano#debug_get_key_count(bufnr, key) abort
  return s:get_key_count(a:bufnr, a:key)
endfunction

" テスト用: キー別motion_count設定値を取得
function! hellshake_yano#debug_get_motion_count_for_key(key) abort
  return s:get_motion_count_for_key(a:key)
endfunction

" テスト用: ヒント表示判定を取得
function! hellshake_yano#debug_should_trigger_hints_for_key(bufnr, key) abort
  return s:should_trigger_hints_for_key(a:bufnr, a:key)
endfunction

" テスト用: キー別のモーションカウントを手動で増加
function! hellshake_yano#debug_increment_key_count(bufnr, key) abort
  call s:increment_key_count(a:bufnr, a:key)
endfunction

" テスト用: キー別のモーションカウントをリセット
function! hellshake_yano#debug_reset_key_count(bufnr, key) abort
  call s:reset_key_count(a:bufnr, a:key)
endfunction

" 保存と復元
let &cpo = s:save_cpo
unlet s:save_cpo
