" autoload/hellshake_yano_vim/word_filter.vim - 単語フィルタリング層
" Author: hellshake-yano
" License: MIT
"
" Phase D-2 Sub0.1: Per-Key最小単語長の実装前準備（堅牢性向上）
" Phase D-7 Process4 Sub2: 辞書統合（Refactor Phase）
"
" このモジュールは単語のフィルタリング処理を提供し、
" フィルタリング後もヒント位置の整合性を保証します。
" 元のインデックス情報を保持することで、sub2実装時の副作用を防ぎます。
"
" 【Process4 Sub2: 辞書統合】
" - 辞書単語は最小単語長チェックをスキップ
" - dictionary#is_in_dictionary()でキャッシュ活用（高速）
" - Denops未起動時は通常フィルタリングにフォールバック

" スクリプトローカル変数の定義
let s:save_cpo = &cpo
set cpo&vim

" hellshake_yano_vim#word_filter#apply() - 単語リストのフィルタリング
"
" 目的:
"   - 最小単語長の条件で単語リストをフィルタリング
"   - 辞書単語は最小単語長チェックをスキップ（Process4 Sub2）
"   - 元のインデックス情報を保持（original_index フィールド）
"   - 空配列や不正データに対して堅牢に動作
"
" 処理フロー:
"   1. 入力配列の検証（空配列チェック）
"   2. 各単語に対して:
"      a. データ構造の妥当性チェック
"      b. 辞書単語チェック（is_in_dictionary()、キャッシュ活用）
"      c. 辞書単語 OR 長さ条件を満たす場合のみ追加
"   3. original_index フィールドを追加（元の配列での位置）
"   4. フィルタリング結果を返す
"
" パフォーマンス最適化（Process4 Sub2 Refactor）:
"   - dictionary#is_in_dictionary()はキャッシュ済み（O(1)）
"   - Denops未起動時はチェックをスキップ（高速フォールバック）
"   - 不正データは早期リターンでスキップ
"
" エラーハンドリング:
"   - 空配列が渡された場合は空配列を返す
"   - すべての単語が条件に合わない場合も空配列を返す
"   - 不正なデータ構造の場合はエラーを出さず、スキップ
"   - Denops未起動時も正常動作（辞書チェックなし）
"
" @param words List<Dictionary> 単語リスト
"   各要素は {lnum, col, word, text} の辞書
"   - word: 内部用単語テキスト
"   - text: 表示用単語テキスト（word_detector.vim使用）
" @param min_length Number 最小単語長（辞書単語は無視）
" @return List<Dictionary> フィルタリングされた単語リスト
"   各要素に original_index フィールドが追加される
"
" 使用例:
"   let l:words = [
"     \ {'lnum': 1, 'col': 1, 'word': 'hello', 'text': 'hello'},
"     \ {'lnum': 1, 'col': 7, 'word': 'is', 'text': 'is'},  " 辞書単語（2文字でも通過）
"     \ {'lnum': 1, 'col': 9, 'word': 'x', 'text': 'x'},    " 非辞書単語（除外）
"   \ ]
"   let l:filtered = hellshake_yano_vim#word_filter#apply(l:words, 3)
"   " Denops起動時（辞書に'is'がある場合）:
"   " => [
"   "   {'lnum': 1, 'col': 1, 'word': 'hello', 'text': 'hello', 'original_index': 0},
"   "   {'lnum': 1, 'col': 7, 'word': 'is', 'text': 'is', 'original_index': 1}
"   " ]
"   " Denops未起動時:
"   " => [
"   "   {'lnum': 1, 'col': 1, 'word': 'hello', 'text': 'hello', 'original_index': 0}
"   " ]
"
" 注意事項:
"   - original_index は 0-indexed
"   - フィルタリング後も元の座標情報（lnum, col）は保持される
"   - 単語テキスト（word, text）も保持される
"   - 辞書単語判定は'text'フィールド優先、フォールバックで'word'
function! hellshake_yano_vim#word_filter#apply(words, min_length) abort
  " Phase D-2 Sub0.1: フィルタリング層の堅牢性向上
  " Phase D-7 Process4 Sub2: 辞書統合（Green Phase）

  " 1. 入力検証: 空配列チェック
  if empty(a:words)
    return []
  endif

  " 2. フィルタリング処理
  let l:filtered = []
  let l:idx = 0

  for l:word in a:words
    " 不正なデータ構造をスキップ
    if !has_key(l:word, 'word') || type(l:word.word) != type('')
      let l:idx += 1
      continue
    endif

    " Phase D-7 Process4 Sub2: 辞書単語チェック
    " 辞書単語の場合は最小単語長チェックをスキップ
    let l:is_dict_word = 0
    if has_key(l:word, 'text')
      " word_detector.vimは'text'フィールドを使用
      let l:is_dict_word = hellshake_yano_vim#dictionary#is_in_dictionary(l:word.text)
    elseif has_key(l:word, 'word')
      let l:is_dict_word = hellshake_yano_vim#dictionary#is_in_dictionary(l:word.word)
    endif

    " 最小単語長の条件チェック（辞書単語はスキップ）
    if l:is_dict_word || len(l:word.word) >= a:min_length
      " 元のインデックスを保持しながら追加
      let l:filtered_word = copy(l:word)
      let l:filtered_word.original_index = l:idx
      call add(l:filtered, l:filtered_word)
    endif

    let l:idx += 1
  endfor

  " 3. フィルタリング結果を返す
  return l:filtered
endfunction

let &cpo = s:save_cpo
unlet s:save_cpo
