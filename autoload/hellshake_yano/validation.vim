" autoload/hellshake_yano/validation.vim - 検証関数
" Author: hellshake-yano
" License: MIT
"
" このモジュールは入力値の検証を担当します
" - hellshake_yano#validation#highlight_group_name() - ハイライトグループ名の検証
" - hellshake_yano#validation#color_value() - 色値の検証
" - hellshake_yano#validation#normalize_color_name() - 色名の正規化

" 保存と復元
let s:save_cpo = &cpo
set cpo&vim

"=============================================================================
" 公開関数
"=============================================================================

" ハイライトグループ名の検証関数
" @param name ハイライトグループ名
" @return v:true（検証成功）
" @throws エラーメッセージ（検証失敗時）
function! hellshake_yano#validation#highlight_group_name(name) abort
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

" 色値の検証関数
" @param color 色値（文字列）
" @return v:true（検証成功）
" @throws エラーメッセージ（検証失敗時）
function! hellshake_yano#validation#color_value(color) abort
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
  let normalized_color = hellshake_yano#validation#normalize_color_name(a:color)
  if index(valid_colors, normalized_color) == -1
    throw '[hellshake-yano] Error: Invalid color name: ' . a:color
  endif

  return v:true
endfunction

" 色名を正規化する関数
" @param color 色名（文字列）
" @return 正規化された色名（最初の文字を大文字、残りを小文字にする）
function! hellshake_yano#validation#normalize_color_name(color) abort
  if empty(a:color) || a:color =~# '^#'
    return a:color
  endif

  " 最初の文字を大文字、残りを小文字にする
  return substitute(a:color, '^\(.\)\(.*\)', '\u\1\L\2', '')
endfunction

" 保存と復元
let &cpo = s:save_cpo
unlet s:save_cpo
