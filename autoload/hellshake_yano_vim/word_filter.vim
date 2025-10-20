" autoload/hellshake_yano_vim/word_filter.vim - 単語フィルタリング層
" Author: hellshake-yano
" License: MIT
"
" Phase D-2 Sub0.1: Per-Key最小単語長の実装前準備（堅牢性向上）
"
" このモジュールは単語のフィルタリング処理を提供し、
" フィルタリング後もヒント位置の整合性を保証します。
" 元のインデックス情報を保持することで、sub2実装時の副作用を防ぎます。

" スクリプトローカル変数の定義
let s:save_cpo = &cpo
set cpo&vim

" hellshake_yano_vim#word_filter#apply() - 単語リストのフィルタリング
"
" 目的:
"   - 最小単語長の条件で単語リストをフィルタリング
"   - 元のインデックス情報を保持（original_index フィールド）
"   - 空配列や不正データに対して堅牢に動作
"
" 処理フロー:
"   1. 入力配列の検証（空配列チェック）
"   2. 各単語の長さをチェック
"   3. 条件を満たす単語のみを新しい配列に追加
"   4. original_index フィールドを追加（元の配列での位置）
"   5. フィルタリング結果を返す
"
" エラーハンドリング:
"   - 空配列が渡された場合は空配列を返す
"   - すべての単語が条件に合わない場合も空配列を返す
"   - 不正なデータ構造の場合はエラーを出さず、スキップ
"
" @param words List<Dictionary> 単語リスト
"   各要素は {lnum, col, word} の辞書
" @param min_length Number 最小単語長
" @return List<Dictionary> フィルタリングされた単語リスト
"   各要素に original_index フィールドが追加される
"
" 使用例:
"   let l:words = [
"     \ {'lnum': 1, 'col': 1, 'word': 'hello'},
"     \ {'lnum': 1, 'col': 7, 'word': 'x'},
"     \ {'lnum': 1, 'col': 9, 'word': 'world'},
"   \ ]
"   let l:filtered = hellshake_yano_vim#word_filter#apply(l:words, 2)
"   " => [
"   "   {'lnum': 1, 'col': 1, 'word': 'hello', 'original_index': 0},
"   "   {'lnum': 1, 'col': 9, 'word': 'world', 'original_index': 2}
"   " ]
"
" 注意事項:
"   - original_index は 0-indexed
"   - フィルタリング後も元の座標情報（lnum, col）は保持される
"   - 単語テキスト（word）も保持される
function! hellshake_yano_vim#word_filter#apply(words, min_length) abort
  " Phase D-2 Sub0.1: フィルタリング層の堅牢性向上

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

    " 最小単語長の条件チェック
    if len(l:word.word) >= a:min_length
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
