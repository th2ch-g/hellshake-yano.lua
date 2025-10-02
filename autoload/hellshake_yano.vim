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
" 状態管理関数群（state.vimへ移行済み）
" バッファ状態、カウント管理、タイマー管理を担当
"=============================================================================
" Note: 状態管理変数はautoload/hellshake_yano/state.vimに移行しました
" - g:hellshake_yano_internal.motion_count
" - g:hellshake_yano_internal.last_motion_time
" - g:hellshake_yano_internal.timer_id
" - g:hellshake_yano_internal.hints_visible
" - g:hellshake_yano_internal.last_key_time
" - g:hellshake_yano_internal.is_key_repeating
" - g:hellshake_yano_internal.repeat_end_timer

" バッファ番号を取得
function! s:bufnr() abort
  return bufnr('%')
endfunction

" Note: バッファ状態初期化関数は state.vim に移行済み
" → hellshake_yano#state#init_buffer_state()
" → hellshake_yano#state#init_motion_tracking()
" → hellshake_yano#state#init_key_repeat_detection()

" ============================================================================
" カウント管理関数群（count.vimへ移行済み）
" ============================================================================
" Note: カウント管理関数はautoload/hellshake_yano/count.vimに移行しました
" - hellshake_yano#count#init_key_count()
" - hellshake_yano#count#get_key_count()
" - hellshake_yano#count#increment_key_count()
" - hellshake_yano#count#reset_key_count()

" ============================================================================
" 設定管理関数群
" ============================================================================

" Note: s:get_motion_count_for_key は config.vim に移行済み
" → hellshake_yano#config#get_motion_count_for_key()

" Note: s:clear_motion_count_cache は config.vim に移行済み
" → hellshake_yano#config#clear_motion_count_cache()

" ============================================================================
" ヒント表示制御関数群
" ============================================================================

" Note: s:should_trigger_hints_for_key は motion.vim に移行済み
" 後方互換性のため、この関数は削除せず、motion.vimの内部実装に依存します

" Note: s:process_motion_count_for_key は count.vim に移行済み
" → hellshake_yano#count#process_motion_count_for_key()

" ============================================================================
" タイマー管理関数群（timer.vimへ移行済み）
" ============================================================================
" Note: タイマー管理関数はautoload/hellshake_yano/timer.vimに移行しました
" - hellshake_yano#timer#set_motion_timeout()
" - hellshake_yano#timer#reset_count_for_key()
" - hellshake_yano#timer#stop_and_clear_timer()
" - hellshake_yano#timer#stop_and_clear_timer_for_key()

" デバッグ表示を処理
" Note: s:handle_debug_display は hint.vim に移行済み
" → hellshake_yano#hint#handle_debug_display()

" hjkl移動時の処理（リファクタリング済み）
" Note: この関数はmotion.vimに移行しました
" → hellshake_yano#motion#process()
" 後方互換性のためのラッパー関数
function! hellshake_yano#motion(key) abort
  return hellshake_yano#motion#process(a:key)
endfunction

" カウントのリセット（後方互換性のため保持、全キーをリセット）
function! s:reset_count(bufnr) abort
  call hellshake_yano#count#reset_all_counts(a:bufnr)
  if has_key(g:hellshake_yano_internal, 'timer_id')
    call hellshake_yano#timer#stop_and_clear_timer(g:hellshake_yano_internal.timer_id, a:bufnr)
  endif
endfunction

" 経過時間をミリ秒で取得（高精度）
" Note: s:get_elapsed_time は utils.vim に移行済み
" → hellshake_yano#utils#get_elapsed_time()

" Note: s:reset_repeat_state は state.vim に移行済み
" → hellshake_yano#state#reset_repeat_state()

" Note: タイマー管理関数は timer.vim に移行済み
" → hellshake_yano#timer#stop_and_clear_timer()
" → hellshake_yano#timer#stop_and_clear_timer_for_key()

" キーリピート設定を取得
" Note: s:get_key_repeat_config は config.vim に移行済み
" → hellshake_yano#config#get_key_repeat_config()

" Note: s:is_denops_ready は utils.vim に移行済み
" → hellshake_yano#utils#is_denops_ready()

" Note: s:notify_denops_config は config.vim に移行済み
" → hellshake_yano#config#notify_denops_config()

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

" Note: s:call_denops_function は denops.vim に移行済み
" → hellshake_yano#denops#call_function()

" Note: s:handle_key_repeat_detection は motion.vim に移行済み
" 後方互換性のため、この関数は削除せず、motion.vimの内部実装に依存します

"=============================================================================
" UI関数群
" ハイライト、表示、ヒント表示を担当
"=============================================================================

" 全バッファのカウントをリセット
function! hellshake_yano#reset_count() abort
  " g:hellshake_yano_internalが初期化されていない場合は何もしない
  " （Vim起動直後のModeChangedイベントなど、autoload読み込み前の呼び出しに対応）
  if !exists('g:hellshake_yano_internal') || !has_key(g:hellshake_yano_internal, 'motion_count')
    return
  endif

  for bufnr in keys(g:hellshake_yano_internal.motion_count)
    call s:reset_count(str2nr(bufnr))
  endfor
endfunction

" ビジュアルモード用のモーション処理
" Note: この関数はmotion.vimに移行しました
" → hellshake_yano#motion#visual()
" 後方互換性のためのラッパー関数
function! hellshake_yano#visual_motion(key) abort
  return hellshake_yano#motion#visual(a:key)
endfunction

"=============================================================================
" 設定関数群
" 初期化、更新、設定変更を担当
"=============================================================================

" マッピング対象キーを取得
" Note: s:get_motion_keys は config.vim に移行済み
" → hellshake_yano#config#get_motion_keys()

" Note: モーションキーマッピングを設定 - mapping.vimに移行済み
" → hellshake_yano#mapping#setup_motion_mappings()
function! hellshake_yano#setup_motion_mappings() abort
  return hellshake_yano#mapping#setup_motion_mappings()
endfunction

" Note: s:clear_motion_mappings は mapping.vim に移行済み
" → hellshake_yano#mapping#clear_motion_mappings()

" ヒントをトリガー
" Note: s:trigger_hints は hint.vim に移行済み
" → hellshake_yano#hint#trigger_hints()

" Note: ヒントを表示 - hint.vimに移行済み
" → hellshake_yano#hint#show()
function! hellshake_yano#show() abort
  return hellshake_yano#hint#show()
endfunction

" Note: ヒントを非表示 - hint.vimに移行済み
" → hellshake_yano#hint#hide()
function! hellshake_yano#hide() abort
  return hellshake_yano#hint#hide()
endfunction

" プラグインを有効化
" Note: この関数はplugin.vimに移行しました
" → hellshake_yano#plugin#enable()
" 後方互換性のためのラッパー関数
function! hellshake_yano#enable() abort
  return hellshake_yano#plugin#enable()
endfunction

" プラグインを無効化
" Note: この関数はplugin.vimに移行しました
" → hellshake_yano#plugin#disable()
" 後方互換性のためのラッパー関数
function! hellshake_yano#disable() abort
  return hellshake_yano#plugin#disable()
endfunction

" プラグインの有効/無効を切り替え
" Note: この関数はplugin.vimに移行しました
" → hellshake_yano#plugin#toggle()
" 後方互換性のためのラッパー関数
function! hellshake_yano#toggle() abort
  return hellshake_yano#plugin#toggle()
endfunction

" 移動カウント数を設定
" Note: この関数はcommand.vimに移行しました
" → hellshake_yano#command#set_count()
" 後方互換性のためのラッパー関数
function! hellshake_yano#set_count(count) abort
  return hellshake_yano#command#set_count(a:count)
endfunction

" タイムアウト時間を設定
" Note: この関数はcommand.vimに移行しました
" → hellshake_yano#command#set_timeout()
" 後方互換性のためのラッパー関数
function! hellshake_yano#set_timeout(timeout) abort
  return hellshake_yano#command#set_timeout(a:timeout)
endfunction

" バッファ進入時の処理
" Note: この関数はplugin.vimに移行しました
" → hellshake_yano#plugin#on_buf_enter()
" 後方互換性のためのラッパー関数
function! hellshake_yano#on_buf_enter() abort
  return hellshake_yano#plugin#on_buf_enter()
endfunction

" バッファ離脱時の処理
" Note: この関数はplugin.vimに移行しました
" → hellshake_yano#plugin#on_buf_leave()
" 後方互換性のためのラッパー関数
function! hellshake_yano#on_buf_leave() abort
  return hellshake_yano#plugin#on_buf_leave()
endfunction

" ハイライト色を更新
" Note: この関数はcommand.vimに移行しました
" → hellshake_yano#command#update_highlight()
" 後方互換性のためのラッパー関数
function! hellshake_yano#update_highlight(marker_group, current_group) abort
  return hellshake_yano#command#update_highlight(a:marker_group, a:current_group)
endfunction

"=============================================================================
" テスト・デバッグ関数群
" デバッグ表示、パフォーマンス計測を担当
"=============================================================================

" Note: s:get_debug_info は debug.vim に移行済み
" → hellshake_yano#debug#get_info()

" Note: s:build_debug_info は debug.vim に移行済み
" → hellshake_yano#debug#build_info()

" Note: デバッグ情報を取得 - debug.vimに移行済み
" → hellshake_yano#debug#get_info()
function! hellshake_yano#get_debug_info() abort
  return hellshake_yano#debug#build_info(hellshake_yano#utils#bufnr())
endfunction

" Note: デバッグ表示関数 - debug.vimに移行済み
" → hellshake_yano#debug#show()
function! hellshake_yano#show_debug() abort
  return hellshake_yano#debug#show()
endfunction

" Note: s:log_performance は debug.vimに移行済み
" → hellshake_yano#debug#log_performance()
" Note: デバッグ表示 - debug.vimに移行済み
" → hellshake_yano#debug#display()
function! hellshake_yano#debug() abort
  return hellshake_yano#debug#display()
endfunction

" counted_motions を設定
" Note: この関数はcommand.vimに移行しました
" → hellshake_yano#command#set_counted_motions()
" 後方互換性のためのラッパー関数
function! hellshake_yano#set_counted_motions(keys) abort
  return hellshake_yano#command#set_counted_motions(a:keys)
endfunction

" ハイライトグループ名の検証関数
" Note: この関数はvalidation.vimに移行しました
" → hellshake_yano#validation#highlight_group_name()
" 後方互換性のためのラッパー関数
function! hellshake_yano#validate_highlight_group_name(name) abort
  return hellshake_yano#validation#highlight_group_name(a:name)
endfunction

" 色値の検証関数
" Note: この関数はvalidation.vimに移行しました
" → hellshake_yano#validation#color_value()
" 後方互換性のためのラッパー関数
function! hellshake_yano#validate_color_value(color) abort
  return hellshake_yano#validation#color_value(a:color)
endfunction

" 色名を正規化する関数
" Note: この関数はvalidation.vimに移行しました
" → hellshake_yano#validation#normalize_color_name()
" 後方互換性のためのラッパー関数
function! hellshake_yano#normalize_color_name(color) abort
  return hellshake_yano#validation#normalize_color_name(a:color)
endfunction

"=============================================================================
" Process4: Denops連携関数群
" キー情報をDenopsに伝達する関数群
"=============================================================================

" Note: キー情報付きヒント表示 - hint.vimに移行済み
" → hellshake_yano#hint#show_hints_with_key()
function! hellshake_yano#show_hints_with_key(key) abort
  return hellshake_yano#hint#show_hints_with_key(a:key)
endfunction

" Note: 現在のモードを検出 - hint.vimに移行済み
" → hellshake_yano#hint#detect_current_mode()
function! hellshake_yano#detect_current_mode() abort
  return hellshake_yano#hint#detect_current_mode()
endfunction

" Note: mode()文字列からモード種別を判定 - hint.vimに移行済み
" → hellshake_yano#hint#detect_current_mode_from_string()
function! hellshake_yano#detect_current_mode_from_string(mode_string) abort
  return hellshake_yano#hint#detect_current_mode_from_string(a:mode_string)
endfunction

" hellshake_yano#motion関数を更新してキー情報を伝達（Process4 sub1拡張）
" Note: この関数はmotion.vimに移行しました
" → hellshake_yano#motion#with_key_context()
" 後方互換性のためのラッパー関数
function! hellshake_yano#motion_with_key_context(key) abort
  return hellshake_yano#motion#with_key_context(a:key)
endfunction

"=============================================================================
" テスト用デバッグ関数群
"=============================================================================

" テスト用: キー別カウントを取得（外部からアクセス可能）
function! hellshake_yano#debug_get_key_count(bufnr, key) abort
  return hellshake_yano#count#get_key_count(a:bufnr, a:key)
endfunction

" テスト用: キー別motion_count設定値を取得
function! hellshake_yano#debug_get_motion_count_for_key(key) abort
  return hellshake_yano#config#get_motion_count_for_key(a:key)
endfunction

" テスト用: ヒント表示判定を取得
function! hellshake_yano#debug_should_trigger_hints_for_key(bufnr, key) abort
  return s:should_trigger_hints_for_key(a:bufnr, a:key)
endfunction

" テスト用: キー別のモーションカウントを手動で増加
function! hellshake_yano#debug_increment_key_count(bufnr, key) abort
  call hellshake_yano#count#increment_key_count(a:bufnr, a:key)
endfunction

" テスト用: キー別のモーションカウントをリセット
function! hellshake_yano#debug_reset_key_count(bufnr, key) abort
  call hellshake_yano#count#reset_key_count(a:bufnr, a:key)
endfunction

" 保存と復元
let &cpo = s:save_cpo
unlet s:save_cpo
