" tests-vim/test_sub3_highlight.vim - process1 sub3: カスタムハイライト設定テスト
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: RED
" このテストは、highlightHintMarker と highlightHintMarkerCurrent の
" カスタマイズ可能性を確認します。

" Load required modules
source autoload/hellshake_yano_vim/display.vim

" テストフレームワークの初期化
let s:assert_count = 0
let s:pass_count = 0
let s:fail_count = 0

function! s:assert_equal(expected, actual, message) abort
  let s:assert_count += 1
  if a:expected ==# a:actual
    let s:pass_count += 1
    echom 'PASS: ' . a:message
  else
    let s:fail_count += 1
    echom 'FAIL: ' . a:message
    echom '  Expected: ' . string(a:expected)
    echom '  Actual:   ' . string(a:actual)
  endif
endfunction

function! s:assert_true(condition, message) abort
  let s:assert_count += 1
  if a:condition
    let s:pass_count += 1
    echom 'PASS: ' . a:message
  else
    let s:fail_count += 1
    echom 'FAIL: ' . a:message
  endif
endfunction

function! s:assert_match(pattern, actual, message) abort
  let s:assert_count += 1
  if a:actual =~# a:pattern
    let s:pass_count += 1
    echom 'PASS: ' . a:message
  else
    let s:fail_count += 1
    echom 'FAIL: ' . a:message
    echom '  Pattern:  ' . a:pattern
    echom '  Actual:   ' . a:actual
  endif
endfunction

function! s:test_default_highlight_group() abort
  echom '=== Test: Default highlight group (HintMarker) ==='

  " デフォルト設定（highlightHintMarkerが未設定）
  unlet! g:hellshake_yano

  " ハイライトグループ名を取得する関数が必要
  " （この時点では未実装なので失敗する - RED phase）
  let l:hl_group = hellshake_yano_vim#display#get_highlight_group('normal')

  call s:assert_equal('HintMarker', l:hl_group,
        \ 'Default highlight group should be HintMarker')
endfunction

function! s:test_custom_highlight_group_name() abort
  echom '=== Test: Custom highlight group name ==='

  " カスタムハイライトグループ名を設定
  let g:hellshake_yano = {
        \ 'highlightHintMarker': 'DiffAdd',
        \ 'highlightHintMarkerCurrent': 'DiffText',
        \ }

  " 通常ヒントのハイライトグループ
  let l:hl_normal = hellshake_yano_vim#display#get_highlight_group('normal')
  call s:assert_equal('DiffAdd', l:hl_normal,
        \ 'Custom highlight group should be DiffAdd')

  " 現在ヒントのハイライトグループ
  let l:hl_current = hellshake_yano_vim#display#get_highlight_group('current')
  call s:assert_equal('DiffText', l:hl_current,
        \ 'Current highlight group should be DiffText')
endfunction

function! s:test_custom_highlight_color_object() abort
  echom '=== Test: Custom highlight color object (fg/bg) ==='

  " カスタムカラーオブジェクトを設定
  let g:hellshake_yano = {
        \ 'highlightHintMarker': {'fg': '#FFFFFF', 'bg': '#000000'},
        \ 'highlightHintMarkerCurrent': {'fg': '#FF0000', 'bg': '#FFFF00'},
        \ }

  " カラーオブジェクトの場合、動的にハイライトグループを作成する必要がある
  " 動的ハイライトグループ名は HellshakeYanoHintMarker / HellshakeYanoHintMarkerCurrent
  let l:hl_normal = hellshake_yano_vim#display#get_highlight_group('normal')
  call s:assert_equal('HellshakeYanoHintMarker', l:hl_normal,
        \ 'Dynamic highlight group should be HellshakeYanoHintMarker')

  let l:hl_current = hellshake_yano_vim#display#get_highlight_group('current')
  call s:assert_equal('HellshakeYanoHintMarkerCurrent', l:hl_current,
        \ 'Dynamic highlight group should be HellshakeYanoHintMarkerCurrent')

  " ハイライトグループが実際に定義されているか確認
  redir => l:hl_output
  silent highlight HellshakeYanoHintMarker
  redir END

  " guifg や guibg が設定されているか確認
  call s:assert_match('#FFFFFF', l:hl_output,
        \ 'Foreground color should be #FFFFFF')
  call s:assert_match('#000000', l:hl_output,
        \ 'Background color should be #000000')
endfunction

function! s:test_highlight_with_hex_color() abort
  echom '=== Test: Hex color support (#RRGGBB) ==='

  " ヘックスカラー形式の設定
  let g:hellshake_yano = {
        \ 'highlightHintMarker': {'fg': '#57FD14', 'bg': 'black'},
        \ 'highlightHintMarkerCurrent': {'fg': 'White', 'bg': 'Red'},
        \ }

  let l:hl_normal = hellshake_yano_vim#display#get_highlight_group('normal')
  let l:hl_current = hellshake_yano_vim#display#get_highlight_group('current')

  call s:assert_equal('HellshakeYanoHintMarker', l:hl_normal,
        \ 'Should create dynamic highlight group')
  call s:assert_equal('HellshakeYanoHintMarkerCurrent', l:hl_current,
        \ 'Should create dynamic highlight group for current')

  " ハイライト定義を確認
  redir => l:hl_normal_output
  silent highlight HellshakeYanoHintMarker
  redir END

  redir => l:hl_current_output
  silent highlight HellshakeYanoHintMarkerCurrent
  redir END

  call s:assert_match('#57FD14', l:hl_normal_output,
        \ 'Normal marker should have #57FD14 foreground')
  call s:assert_match('Red', l:hl_current_output,
        \ 'Current marker should have Red background')
endfunction

function! s:test_backward_compatibility() abort
  echom '=== Test: Backward compatibility (no config) ==='

  " 設定なし（後方互換性テスト）
  unlet! g:hellshake_yano

  let l:hl_normal = hellshake_yano_vim#display#get_highlight_group('normal')
  call s:assert_equal('HintMarker', l:hl_normal,
        \ 'Should fallback to HintMarker when no config')
endfunction

" テスト実行
function! s:run_all_tests() abort
  let s:assert_count = 0
  let s:pass_count = 0
  let s:fail_count = 0

  echom '========================================'
  echom 'Running tests for process1 sub3'
  echom '========================================'

  call s:test_default_highlight_group()
  call s:test_custom_highlight_group_name()
  call s:test_custom_highlight_color_object()
  call s:test_highlight_with_hex_color()
  call s:test_backward_compatibility()

  echom '========================================'
  echom 'Test Results:'
  echom 'Total:  ' . s:assert_count
  echom 'Pass:   ' . s:pass_count
  echom 'Fail:   ' . s:fail_count
  echom '========================================'

  if s:fail_count > 0
    echom 'FAILED: Some tests failed (RED phase - expected)'
    return 1
  else
    echom 'SUCCESS: All tests passed!'
    return 0
  endif
endfunction

" テスト実行
call s:run_all_tests()
quit
