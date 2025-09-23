" autoload/hellshake_yano/highlight.vim - ハイライト関数
" Author: hellshake-yano
" License: MIT

" 保存と復元
let s:save_cpo = &cpo
set cpo&vim

"=============================================================================
" ハイライト管理関数群
"=============================================================================

" ハイライト設定を再適用
function! hellshake_yano#highlight#apply_highlights() abort
  " highlight_hint_marker の設定適用
  if has_key(g:hellshake_yano, 'highlight_hint_marker') &&
        \ !empty(g:hellshake_yano.highlight_hint_marker)
    call hellshake_yano#highlight#apply_highlight_setting('HellshakeYanoMarker',
          \ g:hellshake_yano.highlight_hint_marker)
  endif

  " highlight_hint_marker_current の設定適用
  if has_key(g:hellshake_yano, 'highlight_hint_marker_current') &&
        \ !empty(g:hellshake_yano.highlight_hint_marker_current)
    call hellshake_yano#highlight#apply_highlight_setting('HellshakeYanoMarkerCurrent',
          \ g:hellshake_yano.highlight_hint_marker_current)
  endif
endfunction

" ハイライト設定を適用する内部関数
function! hellshake_yano#highlight#apply_highlight_setting(hlgroup_name, color_config) abort
  " 文字列の場合（従来のハイライトグループ名）
  if type(a:color_config) == v:t_string
    try
      " defaultを削除して強制的にリンクを更新
      execute 'highlight link ' . a:hlgroup_name . ' ' . a:color_config
    catch
      call hellshake_yano#utils#show_error('[hellshake-yano] Error: Failed to apply highlight: ' . v:exception)
    endtry
    return
  endif

  " 辞書の場合（fg/bg個別指定）
  if type(a:color_config) == v:t_dict
    let l:cmd_parts = ['highlight', a:hlgroup_name]

    " fg（前景色）の処理
    if has_key(a:color_config, 'fg') && !empty(a:color_config.fg)
      let l:fg_color = hellshake_yano#highlight#normalize_color_name(a:color_config.fg)
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
      let l:bg_color = hellshake_yano#highlight#normalize_color_name(a:color_config.bg)
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
      call hellshake_yano#utils#show_error('[hellshake-yano] Error: Failed to apply highlight: ' . v:exception)
    endtry
  endif
endfunction

" ハイライト色を更新
function! hellshake_yano#highlight#update(marker_group, current_group) abort
  " 設定を更新
  if !empty(a:marker_group)
    let g:hellshake_yano.highlight_hint_marker = a:marker_group
  endif
  if !empty(a:current_group)
    let g:hellshake_yano.highlight_hint_marker_current = a:current_group
  endif

  " ハイライトを再適用
  call hellshake_yano#highlight#apply_highlights()

  " denops側に設定を通知
  call hellshake_yano#config#notify_denops_config()

  echo printf('[hellshake-yano] Highlight updated: marker=%s, current=%s',
        \ string(a:marker_group), string(a:current_group))
endfunction

" ハイライトグループ名の検証
function! hellshake_yano#highlight#validate_group_name(name) abort
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

" 色値の検証
function! hellshake_yano#highlight#validate_color_value(color) abort
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
  let normalized_color = hellshake_yano#highlight#normalize_color_name(a:color)
  if index(valid_colors, normalized_color) == -1
    throw '[hellshake-yano] Error: Invalid color name: ' . a:color
  endif

  return v:true
endfunction

" 色名を正規化
function! hellshake_yano#highlight#normalize_color_name(color) abort
  if empty(a:color) || a:color =~# '^#'
    return a:color
  endif

  " 最初の文字を大文字、残りを小文字にする
  return substitute(a:color, '^\(.\)\(.*\)', '\u\1\L\2', '')
endfunction

" 保存と復元
let &cpo = s:save_cpo
unlet s:save_cpo