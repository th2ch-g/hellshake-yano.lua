" hellshake-yano.vim - denops-based hit-a-hint plugin
" Author: hellshake-yano
" License: MIT

" ロードガード
if exists('g:loaded_hellshake_yano')
  finish
endif
let g:loaded_hellshake_yano = 1

" 保存と復元
let s:save_cpo = &cpo
set cpo&vim

" グローバル設定変数の初期化
if !exists('g:hellshake_yano')
  let g:hellshake_yano = {}
endif

" デフォルト設定を定義
let s:default_config = {
      \ 'markers': split('ABCDEFGHIJKLMNOPQRSTUVWXYZ', '\zs'),
      \ 'motion_count': 3,
      \ 'motion_timeout': 2000,
      \ 'hint_position': 'start',
      \ 'trigger_on_hjkl': v:true,
      \ 'counted_motions': [],
      \ 'enabled': v:true,
      \ 'single_char_keys': split('ASDFGHJKLNM0123456789', '\zs'),
      \ 'multi_char_keys': split('BCEIOPQRTUVWXYZ', '\zs'),
      \ 'use_hint_groups': v:true,
      \ 'use_numbers': v:true,
      \ 'suppress_on_key_repeat': v:true,
      \ 'key_repeat_threshold': 50,
      \ 'key_repeat_reset_delay': 300,
      \ }

" ユーザー設定でデフォルト設定を上書き（ユーザー設定が優先）
let g:hellshake_yano = extend(copy(s:default_config), g:hellshake_yano, 'force')

" 設定値の検証とサニタイズ
function! s:validate_config() abort
  " キーリピート閾値は正の値でなければならない
  if g:hellshake_yano.key_repeat_threshold <= 0
    echohl WarningMsg
    echom '[hellshake-yano] Warning: key_repeat_threshold must be positive, using default 50ms'
    echohl None
    let g:hellshake_yano.key_repeat_threshold = 50
  endif

  " リピート終了遅延は正の値でなければならない
  if g:hellshake_yano.key_repeat_reset_delay <= 0
    echohl WarningMsg
    echom '[hellshake-yano] Warning: key_repeat_reset_delay must be positive, using default 300ms'
    echohl None
    let g:hellshake_yano.key_repeat_reset_delay = 300
  endif
endfunction

call s:validate_config()

" ハイライトグループの定義（デフォルト値）
highlight default link HellshakeYanoMarker DiffAdd
highlight default link HellshakeYanoMarkerCurrent DiffText

" カスタムハイライト色を適用する関数（fg/bg対応）
function! s:apply_custom_highlights() abort
  " highlight_hint_marker の設定適用
  if has_key(g:hellshake_yano, 'highlight_hint_marker') && !empty(g:hellshake_yano.highlight_hint_marker)
    try
      call s:apply_highlight('HellshakeYanoMarker', g:hellshake_yano.highlight_hint_marker)
    catch
      call s:show_error('[hellshake-yano] Error: Invalid highlight_hint_marker: ' . string(g:hellshake_yano.highlight_hint_marker))
    endtry
  endif

  " highlight_hint_marker_current の設定適用
  if has_key(g:hellshake_yano, 'highlight_hint_marker_current') && !empty(g:hellshake_yano.highlight_hint_marker_current)
    try
      call s:apply_highlight('HellshakeYanoMarkerCurrent', g:hellshake_yano.highlight_hint_marker_current)
    catch
      call s:show_error('[hellshake-yano] Error: Invalid highlight_hint_marker_current: ' . string(g:hellshake_yano.highlight_hint_marker_current))
    endtry
  endif
endfunction

" 個別のハイライト設定を適用する関数
function! s:apply_highlight(hlgroup_name, color_config) abort
  " ハイライトグループ名の検証
  try
    call s:validate_highlight_group_name(a:hlgroup_name)
  catch
    call s:show_error(v:exception)
    return
  endtry

  " 文字列の場合（従来のハイライトグループ名）
  if type(a:color_config) == v:t_string
    try
      call s:validate_highlight_group_name(a:color_config)
      execute 'highlight default link ' . a:hlgroup_name . ' ' . a:color_config
    catch
      call s:show_error(v:exception)
    endtry
    return
  endif

  " 辞書の場合（fg/bg個別指定）
  if type(a:color_config) == v:t_dict
    let l:cmd_parts = ['highlight', a:hlgroup_name]

    " fg（前景色）の処理
    if has_key(a:color_config, 'fg') && !empty(a:color_config.fg)
      try
        call s:validate_color_value(a:color_config.fg)
        let l:fg_color = s:normalize_color_name(a:color_config.fg)
        if a:color_config.fg =~# '^#'
          " 16進数色の場合はguifgのみ
          call add(l:cmd_parts, 'guifg=' . a:color_config.fg)
        else
          " 色名の場合はctermfgとguifgの両方
          call add(l:cmd_parts, 'ctermfg=' . l:fg_color)
          call add(l:cmd_parts, 'guifg=' . l:fg_color)
        endif
      catch
        call s:show_error(v:exception)
        return
      endtry
    endif

    " bg（背景色）の処理
    if has_key(a:color_config, 'bg') && !empty(a:color_config.bg)
      try
        call s:validate_color_value(a:color_config.bg)
        let l:bg_color = s:normalize_color_name(a:color_config.bg)
        if a:color_config.bg =~# '^#'
          " 16進数色の場合はguibgのみ
          call add(l:cmd_parts, 'guibg=' . a:color_config.bg)
        else
          " 色名の場合はctermbgとguibgの両方
          call add(l:cmd_parts, 'ctermbg=' . l:bg_color)
          call add(l:cmd_parts, 'guibg=' . l:bg_color)
        endif
      catch
        call s:show_error(v:exception)
        return
      endtry
    endif

    " ハイライトコマンドを実行
    let l:highlight_cmd = join(l:cmd_parts, ' ')
    execute l:highlight_cmd
    return
  endif

  " その他の型の場合はエラー
  call s:show_error('[hellshake-yano] Error: Invalid color configuration type')
endfunction

" モーションキーのマッピングを設定する関数
function! s:setup_motion_mappings() abort
  " counted_motions が設定されている場合はそれを優先
  if has_key(g:hellshake_yano, 'counted_motions') && !empty(g:hellshake_yano.counted_motions)
    for key in g:hellshake_yano.counted_motions
      " キーが有効かチェック（1文字の英数字記号のみ）
      if match(key, '^[a-zA-Z0-9!@#$%^&*()_+=\[\]{}|;:,.<>?/~`-]$') != -1
        execute 'nnoremap <silent> <expr> ' . key . ' hellshake_yano#motion(' . string(key) . ')'
      else
        call s:show_error('[hellshake-yano] Error: Invalid key in counted_motions: ' . string(key))
      endif
    endfor
  elseif g:hellshake_yano.trigger_on_hjkl
    " 従来のhjklマッピング（下位互換性）
    nnoremap <silent> <expr> h hellshake_yano#motion('h')
    nnoremap <silent> <expr> j hellshake_yano#motion('j')
    nnoremap <silent> <expr> k hellshake_yano#motion('k')
    nnoremap <silent> <expr> l hellshake_yano#motion('l')
  endif
endfunction

" 色名を正規化する関数
function! s:normalize_color_name(color) abort
  if empty(a:color) || a:color =~# '^#'
    return a:color
  endif

  " 最初の文字を大文字、残りを小文字にする
  return substitute(a:color, '^\(.\)\(.*\)', '\u\1\L\2', '')
endfunction

" ハイライトグループ名の検証関数
function! s:validate_highlight_group_name(name) abort
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
function! s:validate_color_value(color) abort
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
  let normalized_color = s:normalize_color_name(a:color)
  if index(valid_colors, normalized_color) == -1
    throw '[hellshake-yano] Error: Invalid color name: ' . a:color
  endif

  return v:true
endfunction

" エラーメッセージを統一形式で表示する関数
function! s:show_error(message) abort
  echohl ErrorMsg
  echomsg a:message
  echohl None
endfunction

" denopsの初期化確認
function! s:check_denops() abort
  if !exists('g:loaded_denops')
    call s:show_error('[hellshake-yano] Error: denops.vim is not loaded. Please install denops.vim first.')
    return 0
  endif
  return 1
endfunction

" プラグインの初期化
function! s:initialize() abort
  if !s:check_denops()
    return
  endif

  " denopsプラグインの読み込み
  " denopsは自動的にdenops/*/main.tsを検出するため、
  " 明示的なロードが必要な場合のみdenops#plugin#load()を使用
  try
    let l:script_path = expand('<sfile>:p:h:h') . '/denops/hellshake-yano/main.ts'
    if filereadable(l:script_path)
      call denops#plugin#load('hellshake-yano', l:script_path)
    else
      " ファイルが見つからない場合はdenopsの自動ディスカバリーに任せる
      " 通常、denopsは起動時に自動的にdenops/*/main.tsを検出する
    endif
  catch
    " エラーが発生しても続行（denopsの自動ディスカバリーに任せる）
    " echohl WarningMsg
    " echomsg '[hellshake-yano] Plugin registration failed: ' . v:exception
    " echohl None
  endtry
endfunction

" モーションキーマッピング（初期設定で有効な場合）
if g:hellshake_yano.enabled
  call s:setup_motion_mappings()
endif

" コマンド定義
command! -nargs=0 HellshakeYanoEnable call hellshake_yano#enable()
command! -nargs=0 HellshakeYanoDisable call hellshake_yano#disable()
command! -nargs=0 HellshakeYanoToggle call hellshake_yano#toggle()
command! -nargs=0 HellshakeYanoShow call hellshake_yano#show()
command! -nargs=0 HellshakeYanoHide call hellshake_yano#hide()
command! -nargs=1 HellshakeYanoSetCount call hellshake_yano#set_count(<args>)
command! -nargs=1 HellshakeYanoSetTimeout call hellshake_yano#set_timeout(<args>)
command! -nargs=+ HellshakeYanoSetHighlight call hellshake_yano#update_highlight(<f-args>)
command! -nargs=+ HellshakeYanoSetCountedMotions call hellshake_yano#set_counted_motions([<f-args>])
command! -nargs=0 HellshakeYanoDebug call hellshake_yano#debug()

" 自動コマンド
augroup HellshakeYano
  autocmd!
  " モード変更時にカウントをリセット
  autocmd ModeChanged * call hellshake_yano#reset_count()
  " バッファ変更時の処理
  autocmd BufEnter * call hellshake_yano#on_buf_enter()
  autocmd BufLeave * call hellshake_yano#on_buf_leave()
  " denopsプラグインの遅延読み込み
  autocmd User DenopsPluginPost:hellshake-yano call s:on_denops_ready()
  " カラースキーム変更時にハイライトを再適用
  autocmd ColorScheme * call s:apply_custom_highlights()
augroup END

" denopsプラグインの準備完了時の処理
function! s:on_denops_ready() abort
  " 初期化完了のフラグ
  let g:hellshake_yano_ready = v:true

  " カスタムハイライト色の適用
  call s:apply_custom_highlights()

  " 設定をdenops側に送信
  " if has_key(g:hellshake_yano, 'use_japanese')
  "   echom '[hellshake-yano] Sending config with use_japanese: ' . string(g:hellshake_yano.use_japanese)
  " else
  "   echom '[hellshake-yano] Sending config without use_japanese setting'
  " endif
  call denops#notify('hellshake-yano', 'updateConfig', [g:hellshake_yano])
endfunction

" プラグインの初期化を遅延実行
" denopsが起動してから初期化する
if exists('g:loaded_denops')
  " denops#server#status()が存在する場合のみチェック
  if exists('*denops#server#status') && denops#server#status() !=# 'stopped'
    call s:initialize()
  else
    " denopsの起動を待ってから初期化
    augroup HellshakeYanoInit
      autocmd!
      autocmd User DenopsPluginPost:* ++once call s:initialize()
      autocmd User DenopsReady ++once call s:initialize()
    augroup END
  endif
else
  " denops自体がまだロードされていない
  augroup HellshakeYanoInit
    autocmd!
    autocmd User DenopsPluginPost:* ++once call s:initialize()
    autocmd User DenopsReady ++once call s:initialize()
  augroup END
endif


" 保存と復元
let &cpo = s:save_cpo
unlet s:save_cpo
