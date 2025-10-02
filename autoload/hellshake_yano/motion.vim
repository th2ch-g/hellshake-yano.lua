" autoload/hellshake_yano/motion.vim - モーション処理
" Author: hellshake-yano
" License: MIT
"
" このモジュールはメインのモーション処理を担当します
" - hellshake_yano#motion#process() - 通常のモーション処理
" - hellshake_yano#motion#visual() - ビジュアルモード用のモーション処理
" - hellshake_yano#motion#with_key_context() - キーコンテキスト付きモーション処理

" 保存と復元
let s:save_cpo = &cpo
set cpo&vim

"=============================================================================
" 内部関数
"=============================================================================

" バッファ番号を取得
function! s:bufnr() abort
  return bufnr('%')
endfunction

" 経過時間をミリ秒で取得（高精度）
function! s:get_elapsed_time() abort
  let time_str = reltimestr(reltime())
  return float2nr(str2float(time_str) * 1000.0)
endfunction

" キーリピート設定を取得
function! s:get_key_repeat_config() abort
  return {
        \ 'enabled': get(g:hellshake_yano, 'suppress_on_key_repeat', v:true),
        \ 'threshold': get(g:hellshake_yano, 'key_repeat_threshold', 50),
        \ 'reset_delay': get(g:hellshake_yano, 'key_repeat_reset_delay', 300)
        \ }
endfunction

" キー別のmotion_count設定値を取得（最適化版）
" Note: この関数は将来的にconfig.vimに移動する予定
let s:motion_count_cache = {}
function! s:get_motion_count_for_key(key) abort
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

" キー別ヒント表示の必要性を判定
" @param bufnr バッファ番号
" @param key キー文字
" @return v:true = ヒント表示, v:false = 表示しない
function! s:should_trigger_hints_for_key(bufnr, key) abort
  if hellshake_yano#state#is_key_repeating(a:bufnr)
    return v:false
  endif

  let key_count = hellshake_yano#count#get_key_count(a:bufnr, a:key)
  let threshold = s:get_motion_count_for_key(a:key)
  return key_count >= threshold
endfunction

" キーリピート検出処理
" @param bufnr バッファ番号
" @param current_time 現在時刻（ミリ秒）
" @param config キーリピート設定辞書
" @return v:true = リピート中でヒント表示をスキップ, v:false = 通常処理を継続
function! s:handle_key_repeat_detection(bufnr, current_time, config) abort
  " 機能が無効の場合は通常処理
  if !a:config.enabled
    call hellshake_yano#state#set_last_key_time(a:bufnr, a:current_time)
    return v:false
  endif

  " 前回のキー入力時刻との差を計算
  let last_key_time = hellshake_yano#state#get_last_key_time(a:bufnr)
  let time_diff = a:current_time - last_key_time

  " キーリピート判定（初回キー入力は除外、2回目以降で判定）
  if time_diff < a:config.threshold && last_key_time > 0
    " リピート状態に設定
    call hellshake_yano#state#set_key_repeating(a:bufnr, v:true)

    " 既存のリピート終了タイマーをクリアして新しく設定
    call hellshake_yano#timer#set_repeat_end_timer(a:bufnr, a:config.reset_delay)

    " キー時刻更新してヒント表示をスキップ
    call hellshake_yano#state#set_last_key_time(a:bufnr, a:current_time)
    return v:true
  endif

  " 通常処理: キー時刻を更新
  call hellshake_yano#state#set_last_key_time(a:bufnr, a:current_time)
  return v:false
endfunction

" デバッグ表示を処理
function! s:handle_debug_display() abort
  if get(g:hellshake_yano, 'debug_mode', v:false)
    if exists('*hellshake_yano#show_debug')
      call hellshake_yano#show_debug()
    endif
  endif
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

  " ログ出力
  echomsg log_entry
endfunction

"=============================================================================
" 公開関数
"=============================================================================

" hjkl移動時の処理（リファクタリング済み）
" @param key キー文字
" @return キー文字
function! hellshake_yano#motion#process(key) abort
  let start_time = s:get_elapsed_time()

  " プラグインが無効な場合は通常の動作
  if !get(g:hellshake_yano, 'enabled', v:true)
    return a:key
  endif

  let bufnr = s:bufnr()
  call hellshake_yano#state#init_buffer_state(bufnr)

  " キーリピート検出処理
  let current_time = s:get_elapsed_time()
  let config = s:get_key_repeat_config()

  if s:handle_key_repeat_detection(bufnr, current_time, config)
    call s:handle_debug_display()
    return a:key
  endif

  " キー別モーションカウントを処理
  call hellshake_yano#count#process_motion_count_for_key(bufnr, a:key)

  " キー別ヒント表示かタイムアウト設定を判定・実行
  if s:should_trigger_hints_for_key(bufnr, a:key)
    call hellshake_yano#count#reset_key_count(bufnr, a:key)

    " show_hints_with_key関数が存在するかチェック
    if exists('*hellshake_yano#show_hints_with_key')
      call hellshake_yano#show_hints_with_key(a:key)
    endif

    call s:log_performance('motion_with_hints', s:get_elapsed_time() - start_time, {
          \ 'key': a:key, 'count': s:get_motion_count_for_key(a:key) })
  else
    call hellshake_yano#timer#set_motion_timeout(bufnr, a:key)
    call s:log_performance('motion_normal', s:get_elapsed_time() - start_time, {
          \ 'key': a:key, 'count': hellshake_yano#count#get_key_count(bufnr, a:key) })
  endif

  call s:handle_debug_display()
  return a:key
endfunction

" ビジュアルモード用のモーション処理
" @param key キー文字
" @return キー文字
function! hellshake_yano#motion#visual(key) abort
  " 通常のモーション処理を実行
  " ビジュアルモードでは選択範囲を自然に拡張/縮小させるため、gvは不要
  return hellshake_yano#motion#process(a:key)
endfunction

" キーコンテキスト付きモーション処理
" @param key キー文字
" @return キー文字
function! hellshake_yano#motion#with_key_context(key) abort
  let start_time = s:get_elapsed_time()

  " プラグインが無効な場合は通常の動作
  if !get(g:hellshake_yano, 'enabled', v:true)
    return a:key
  endif

  let bufnr = s:bufnr()
  call hellshake_yano#state#init_buffer_state(bufnr)

  " キーリピート検出処理
  let current_time = s:get_elapsed_time()
  let config = s:get_key_repeat_config()

  if s:handle_key_repeat_detection(bufnr, current_time, config)
    call s:handle_debug_display()
    return a:key
  endif

  " キー別モーションカウントを処理
  call hellshake_yano#count#process_motion_count_for_key(bufnr, a:key)

  " キー別ヒント表示かタイムアウト設定を判定・実行
  if s:should_trigger_hints_for_key(bufnr, a:key)
    call hellshake_yano#count#reset_key_count(bufnr, a:key)

    " キー情報付きでヒント表示を呼び出し
    if exists('*hellshake_yano#show_hints_with_key')
      call hellshake_yano#show_hints_with_key(a:key)
    endif

    call s:log_performance('motion_with_hints_and_key', s:get_elapsed_time() - start_time, {
          \ 'key': a:key, 'count': s:get_motion_count_for_key(a:key) })
  else
    call hellshake_yano#timer#set_motion_timeout(bufnr, a:key)
    call s:log_performance('motion_normal_with_key', s:get_elapsed_time() - start_time, {
          \ 'key': a:key, 'count': hellshake_yano#count#get_key_count(bufnr, a:key) })
  endif

  call s:handle_debug_display()
  return a:key
endfunction

"=============================================================================
" テスト用公開関数
"=============================================================================

" テスト用: ヒント表示判定を取得
function! hellshake_yano#motion#should_trigger_hints_for_key(bufnr, key) abort
  return s:should_trigger_hints_for_key(a:bufnr, a:key)
endfunction

" 保存と復元
let &cpo = s:save_cpo
unlet s:save_cpo
