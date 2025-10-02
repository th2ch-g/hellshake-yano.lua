" autoload/hellshake_yano.vim - メインファイル（委譲とラッパー関数のみ）
" Author: hellshake-yano
" License: MIT
"
" このファイルは後方互換性のためのラッパー関数のみを提供します。
" 実装は各モジュール（autoload/hellshake_yano/*.vim）に移行済みです。
"
" モジュール構成:
" - motion.vim: モーション処理
" - plugin.vim: プラグイン制御
" - command.vim: コマンド関数
" - validation.vim: 検証関数
" - state.vim: 状態管理
" - count.vim: カウント管理
" - timer.vim: タイマー管理
" - config.vim: 設定管理
" - hint.vim: ヒント表示
" - utils.vim: ユーティリティ
" - debug.vim: デバッグ機能
" - mapping.vim: キーマッピング
" - highlight.vim: ハイライト管理
" - denops.vim: Denops連携

" 保存と復元
let s:save_cpo = &cpo
set cpo&vim

"=============================================================================
" エラー処理・ユーティリティ (utils.vimへ委譲)
"=============================================================================

" Note: エラーメッセージ表示関数はutils.vimに移行しました
" → hellshake_yano#utils#show_error()
" 後方互換性のためのラッパー関数
function! hellshake_yano#show_error(...) abort
  return call('hellshake_yano#utils#show_error', a:000)
endfunction

"=============================================================================
" モーション処理 (motion.vimへ委譲)
"=============================================================================

" hjkl移動時の処理
function! hellshake_yano#motion(key) abort
  return hellshake_yano#motion#process(a:key)
endfunction

" ビジュアルモード用のモーション処理
function! hellshake_yano#visual_motion(key) abort
  return hellshake_yano#motion#visual(a:key)
endfunction

" キー情報付きモーション処理
function! hellshake_yano#motion_with_key_context(key) abort
  return hellshake_yano#motion#with_key_context(a:key)
endfunction

"=============================================================================
" 内部ヘルパー関数（後方互換性のため保持）
"=============================================================================

" カウントのリセット（内部関数、全キーをリセット）
function! s:reset_count(bufnr) abort
  call hellshake_yano#count#reset_all_counts(a:bufnr)
  if has_key(g:hellshake_yano_internal, 'timer_id')
    call hellshake_yano#timer#stop_and_clear_timer(g:hellshake_yano_internal.timer_id, a:bufnr)
  endif
endfunction

"=============================================================================
" カウント・状態管理 (count.vim/state.vimへ委譲)
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

"=============================================================================
" ヒント表示 (hint.vimへ委譲)
"=============================================================================

" ヒントを表示
function! hellshake_yano#show() abort
  return hellshake_yano#hint#show()
endfunction

" ヒントを非表示
function! hellshake_yano#hide() abort
  return hellshake_yano#hint#hide()
endfunction

" キー情報付きヒント表示
function! hellshake_yano#show_hints_with_key(key) abort
  return hellshake_yano#hint#show_hints_with_key(a:key)
endfunction

" 現在のモードを検出
function! hellshake_yano#detect_current_mode() abort
  return hellshake_yano#hint#detect_current_mode()
endfunction

" mode()文字列からモード種別を判定
function! hellshake_yano#detect_current_mode_from_string(mode_string) abort
  return hellshake_yano#hint#detect_current_mode_from_string(a:mode_string)
endfunction

"=============================================================================
" プラグイン制御 (plugin.vimへ委譲)
"=============================================================================

" プラグインを有効化
function! hellshake_yano#enable() abort
  return hellshake_yano#plugin#enable()
endfunction

" プラグインを無効化
function! hellshake_yano#disable() abort
  return hellshake_yano#plugin#disable()
endfunction

" プラグインの有効/無効を切り替え
function! hellshake_yano#toggle() abort
  return hellshake_yano#plugin#toggle()
endfunction

" バッファ進入時の処理
function! hellshake_yano#on_buf_enter() abort
  return hellshake_yano#plugin#on_buf_enter()
endfunction

" バッファ離脱時の処理
function! hellshake_yano#on_buf_leave() abort
  return hellshake_yano#plugin#on_buf_leave()
endfunction

"=============================================================================
" コマンド関数 (command.vimへ委譲)
"=============================================================================

" 移動カウント数を設定
function! hellshake_yano#set_count(count) abort
  return hellshake_yano#command#set_count(a:count)
endfunction

" タイムアウト時間を設定
function! hellshake_yano#set_timeout(timeout) abort
  return hellshake_yano#command#set_timeout(a:timeout)
endfunction

" counted_motions を設定
function! hellshake_yano#set_counted_motions(keys) abort
  return hellshake_yano#command#set_counted_motions(a:keys)
endfunction

" ハイライト色を更新
function! hellshake_yano#update_highlight(marker_group, current_group) abort
  return hellshake_yano#command#update_highlight(a:marker_group, a:current_group)
endfunction

"=============================================================================
" ハイライト管理 (highlight.vimへ委譲)
"=============================================================================

" ハイライト設定を再適用
function! hellshake_yano#apply_highlights() abort
  return hellshake_yano#highlight#apply_highlights()
endfunction

"=============================================================================
" キーマッピング (mapping.vimへ委譲)
"=============================================================================

" モーションキーマッピングを設定
function! hellshake_yano#setup_motion_mappings() abort
  return hellshake_yano#mapping#setup_motion_mappings()
endfunction

"=============================================================================
" 検証関数 (validation.vimへ委譲)
"=============================================================================

" ハイライトグループ名の検証
function! hellshake_yano#validate_highlight_group_name(name) abort
  return hellshake_yano#validation#highlight_group_name(a:name)
endfunction

" 色値の検証
function! hellshake_yano#validate_color_value(color) abort
  return hellshake_yano#validation#color_value(a:color)
endfunction

" 色名を正規化
function! hellshake_yano#normalize_color_name(color) abort
  return hellshake_yano#validation#normalize_color_name(a:color)
endfunction

"=============================================================================
" デバッグ機能 (debug.vimへ委譲)
"=============================================================================

" デバッグ情報を取得
function! hellshake_yano#get_debug_info() abort
  return hellshake_yano#debug#build_info(hellshake_yano#utils#bufnr())
endfunction

" デバッグ表示
function! hellshake_yano#show_debug() abort
  return hellshake_yano#debug#show()
endfunction

" デバッグ表示（エイリアス）
function! hellshake_yano#debug() abort
  return hellshake_yano#debug#display()
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
  return hellshake_yano#motion#should_trigger_hints_for_key(a:bufnr, a:key)
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
