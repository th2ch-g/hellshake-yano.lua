" License: MIT

" ハイライト設定を再適用
function! hellshake_yano#highlight#apply_highlights() abort
  " highlight_hint_marker の設定適用（snake_case優先、camelCaseフォールバック）
  let l:marker_config = get(g:hellshake_yano, 'highlight_hint_marker',
        \ get(g:hellshake_yano, 'highlightHintMarker', ''))
  if !empty(l:marker_config)
    call hellshake_yano#highlight#apply_highlight_setting('HellshakeYanoMarker',
          \ l:marker_config)
  endif

  " highlight_hint_marker_current の設定適用（snake_case優先、camelCaseフォールバック）
  let l:current_config = get(g:hellshake_yano, 'highlight_hint_marker_current',
        \ get(g:hellshake_yano, 'highlightHintMarkerCurrent', ''))
  if !empty(l:current_config)
    call hellshake_yano#highlight#apply_highlight_setting('HellshakeYanoMarkerCurrent',
          \ l:current_config)
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
      let l:fg_color = hellshake_yano#validation#normalize_color_name(a:color_config.fg)
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
      let l:bg_color = hellshake_yano#validation#normalize_color_name(a:color_config.bg)
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

  call hellshake_yano#config#notify_denops_config()
  echo printf('[hellshake-yano] Highlight updated: marker=%s, current=%s',
        \ string(a:marker_group), string(a:current_group))
endfunction