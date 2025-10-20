" tests-vim/test_process2_sub0_1.vim
" Phase D-2 Sub0.1: Per-Key最小単語長の実装前準備（堅牢性向上）
"
" TDD Red フェーズ: テストケース作成
" 目的: フィルタリング層の堅牢性をテストし、sub2実装時の副作用を防ぐ

" テスト用のヘルパー関数
function! s:setup_test_config() abort
  " テスト用の設定
  let g:hellshake_yano = {
    \ 'singleCharKeys': ['a', 'b', 'c'],
    \ 'multiCharKeys': ['d', 'e'],
  \ }
endfunction

function! s:teardown_test_config() abort
  if exists('g:hellshake_yano')
    unlet g:hellshake_yano
  endif
endfunction

" Test 1: word_filter#apply() が存在することを確認
function! s:test_word_filter_exists() abort
  echo "Test 1: word_filter#apply() function existence"

  if !exists('*hellshake_yano_vim#word_filter#apply')
    echohl ErrorMsg
    echo "  FAIL: hellshake_yano_vim#word_filter#apply() not found"
    echohl None
    return
  endif

  echo "  OK: word_filter#apply() exists"
endfunction

" Test 2: 元のインデックス保持のテスト
function! s:test_original_index_preservation() abort
  echo "Test 2: Original index preservation after filtering"

  call s:setup_test_config()

  try
    " テストデータ: 5つの単語（フィルタリングで2番目と4番目が除外される想定）
    let l:words = [
      \ {'lnum': 1, 'col': 1, 'word': 'hello'},
      \ {'lnum': 1, 'col': 7, 'word': 'x'},
      \ {'lnum': 1, 'col': 9, 'word': 'world'},
      \ {'lnum': 1, 'col': 15, 'word': 'y'},
      \ {'lnum': 1, 'col': 17, 'word': 'test'},
    \ ]

    " フィルタリング条件: 最小単語長2
    let l:filtered = hellshake_yano_vim#word_filter#apply(l:words, 2)

    " 結果検証: 3つの単語が残る（hello, world, test）
    if len(l:filtered) == 3
      echo "  OK: Filtered count is correct (3)"
    else
      echohl ErrorMsg
      echo "  FAIL: Expected 3 words, got " . len(l:filtered)
      echohl None
      return
    endif

    " 元のインデックスが保持されているか確認
    if !has_key(l:filtered[0], 'original_index')
      echohl ErrorMsg
      echo "  FAIL: original_index field not found"
      echohl None
      return
    endif

    " 最初の単語の original_index が 0 であることを確認
    if l:filtered[0].original_index == 0
      echo "  OK: First word original_index is 0"
    else
      echohl ErrorMsg
      echo "  FAIL: Expected original_index 0, got " . l:filtered[0].original_index
      echohl None
      return
    endif

    " 2番目の単語の original_index が 2 であることを確認（1がスキップされた）
    if l:filtered[1].original_index == 2
      echo "  OK: Second word original_index is 2 (correctly skipped 1)"
    else
      echohl ErrorMsg
      echo "  FAIL: Expected original_index 2, got " . l:filtered[1].original_index
      echohl None
      return
    endif

    " 3番目の単語の original_index が 4 であることを確認
    if l:filtered[2].original_index == 4
      echo "  OK: Third word original_index is 4"
    else
      echohl ErrorMsg
      echo "  FAIL: Expected original_index 4, got " . l:filtered[2].original_index
      echohl None
    endif

  finally
    call s:teardown_test_config()
  endtry
endfunction

" Test 3: 空配列フォールバックのテスト
function! s:test_empty_array_fallback() abort
  echo "Test 3: Empty array fallback handling"

  call s:setup_test_config()

  try
    " 空配列を渡す
    let l:filtered = hellshake_yano_vim#word_filter#apply([], 2)

    " 結果が空配列であることを確認
    if empty(l:filtered)
      echo "  OK: Empty array returns empty array"
    else
      echohl ErrorMsg
      echo "  FAIL: Expected empty array, got " . len(l:filtered) . " words"
      echohl None
      return
    endif

    " すべての単語が条件に合わない場合
    let l:words = [
      \ {'lnum': 1, 'col': 1, 'word': 'a'},
      \ {'lnum': 1, 'col': 3, 'word': 'b'},
    \ ]

    let l:filtered = hellshake_yano_vim#word_filter#apply(l:words, 5)

    if empty(l:filtered)
      echo "  OK: All filtered out returns empty array"
    else
      echohl ErrorMsg
      echo "  FAIL: Expected empty array when all filtered, got " . len(l:filtered) . " words"
      echohl None
    endif

  finally
    call s:teardown_test_config()
  endtry
endfunction

" Test 4: Visual Mode互換性のテスト
function! s:test_visual_mode_compatibility() abort
  echo "Test 4: Visual mode range detection compatibility"

  call s:setup_test_config()

  try
    " テストバッファを作成
    enew
    call setline(1, 'hello world test vim filter')
    normal! gg0

    " visual.vimの選択範囲内単語検出をテスト
    " s:detect_words_in_range() がフィルタリング結果を使用できるか確認

    " visual.vimが存在するか確認
    if !exists('*hellshake_yano_vim#visual#show')
      echohl WarningMsg
      echo "  SKIP: visual#show() not available for integration test"
      echohl None
      return
    endif

    echo "  OK: Visual mode functions available for integration"

  finally
    call s:teardown_test_config()
  endtry
endfunction

" Test 5: フィルタリング後のヒント位置整合性テスト
function! s:test_hint_position_consistency() abort
  echo "Test 5: Hint position consistency after filtering"

  call s:setup_test_config()

  try
    " テストデータ
    let l:words = [
      \ {'lnum': 1, 'col': 1, 'word': 'hello'},
      \ {'lnum': 1, 'col': 7, 'word': 'x'},
      \ {'lnum': 1, 'col': 9, 'word': 'world'},
    \ ]

    let l:filtered = hellshake_yano_vim#word_filter#apply(l:words, 2)

    " フィルタリング後も座標情報が保持されているか確認
    if len(l:filtered) >= 1
      if has_key(l:filtered[0], 'lnum') && has_key(l:filtered[0], 'col')
        echo "  OK: Position fields (lnum, col) preserved"
      else
        echohl ErrorMsg
        echo "  FAIL: Position fields missing after filtering"
        echohl None
        return
      endif
    endif

    " 単語テキストも保持されているか確認
    if len(l:filtered) >= 1
      if has_key(l:filtered[0], 'word')
        echo "  OK: Word text preserved"
      else
        echohl ErrorMsg
        echo "  FAIL: Word text missing after filtering"
        echohl None
      endif
    endif

  finally
    call s:teardown_test_config()
  endtry
endfunction

" 全テストを実行
function! s:run_all_tests() abort
  echo "=== Process2 Sub0.1: Filtering Layer Robustness Tests ==="
  echo ""

  call s:test_word_filter_exists()
  echo ""

  call s:test_original_index_preservation()
  echo ""

  call s:test_empty_array_fallback()
  echo ""

  call s:test_visual_mode_compatibility()
  echo ""

  call s:test_hint_position_consistency()
  echo ""

  echo "=== Tests Complete ==="
endfunction

" グローバル関数としてエクスポート（コマンドラインから呼べるように）
function! TestProcess2Sub01() abort
  call s:run_all_tests()
endfunction

" コマンド定義
command! TestProcess2Sub01 call TestProcess2Sub01()

" 直接実行された場合はテストを実行
if expand('%:t') ==# 'test_process2_sub0_1.vim'
  call s:run_all_tests()
endif
