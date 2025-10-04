" License: MIT

function! hellshake_yano#validation#highlight_group_name(name) abort
  if empty(a:name)
    throw '[hellshake-yano] Error: Highlight group name cannot be empty'
  endif
  if type(a:name) != v:t_string
    throw '[hellshake-yano] Error: Highlight group name must be a string'
  endif
  if len(a:name) > 100
    throw '[hellshake-yano] Error: Highlight group name must be 100 characters or less'
  endif
  if a:name !~# '^[a-zA-Z_]'
    throw '[hellshake-yano] Error: Highlight group name must start with a letter or underscore'
  endif
  if a:name !~# '^[a-zA-Z0-9_]\+$'
    throw '[hellshake-yano] Error: Highlight group name must contain only alphanumeric characters and underscores'
  endif
  return v:true
endfunction

function! hellshake_yano#validation#color_value(color) abort
  if empty(a:color)
    return v:true
  endif
  if type(a:color) != v:t_string
    throw '[hellshake-yano] Error: Color value must be a string'
  endif
  if a:color =~# '^#'
    if a:color !~# '^#\([0-9a-fA-F]\{3\}\|[0-9a-fA-F]\{6\}\)$'
      throw '[hellshake-yano] Error: Invalid hex color format. Use #fff or #ffffff'
    endif
    return v:true
  endif
  let valid_colors = [
        \ 'Red', 'Green', 'Blue', 'Yellow', 'Cyan', 'Magenta',
        \ 'White', 'Black', 'Gray', 'NONE', 'None',
        \ 'DarkRed', 'DarkGreen', 'DarkBlue', 'DarkYellow', 'DarkCyan', 'DarkMagenta',
        \ 'LightRed', 'LightGreen', 'LightBlue', 'LightYellow', 'LightCyan', 'LightMagenta',
        \ 'DarkGray', 'LightGray', 'Brown', 'Orange'
        \ ]
  let normalized_color = hellshake_yano#validation#normalize_color_name(a:color)
  if index(valid_colors, normalized_color) == -1
    throw '[hellshake-yano] Error: Invalid color name: ' . a:color
  endif
  return v:true
endfunction

function! hellshake_yano#validation#normalize_color_name(color) abort
  if empty(a:color) || a:color =~# '^#'
    return a:color
  endif
  return substitute(a:color, '^\(.\)\(.*\)', '\u\1\L\2', '')
endfunction