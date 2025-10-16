" autoload/hellshake_yano_vim/hint_generator.vim - ヒント生成モジュール
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: GREEN
" Process3: ヒント生成の実装
"
" このモジュールはヒント文字の生成を担当します。
" MVP版では単一文字（1文字）のヒントのみを生成します。
" Phase A-3 で複数文字ヒント（aa, as, ad...）に拡張予定です。

" スクリプトローカル変数の定義
let s:save_cpo = &cpo
set cpo&vim

" デフォルトヒント文字の定義（Phase A-3: キー分離）
" 単一文字ヒント用のキー（7文字、ホームポジション優先）
" 複数文字ヒントとの競合を避けるため、別のキーセットを使用
let s:single_char_keys = split('asdfgnm', '\zs')

" 複数文字ヒント用のキー（15文字）
" 単一文字キーとの競合を避けるため、別のキーセットを使用
let s:multi_char_keys = split('bceiopqrtuvwxyz', '\zs')

" グローバル変数でのカスタマイズをサポート
if exists('g:hellshake_yano_vim_single_char_keys')
  let s:single_char_keys = split(g:hellshake_yano_vim_single_char_keys, '\zs')
endif

if exists('g:hellshake_yano_vim_multi_char_keys')
  let s:multi_char_keys = split(g:hellshake_yano_vim_multi_char_keys, '\zs')
endif

" s:generate_multi_char_hints(count) - 複数文字ヒントの生成
"
" 目的:
"   - 2文字のヒント文字列を生成する（Phase A-3）
"   - bb, bc, be, bi, bo, bp, bq, ... の順序で生成
"   - s:multi_char_keys を使用（単一文字キーとの競合回避）
"   - 最大225個（15x15）の2文字ヒントを生成可能
"
" アルゴリズム:
"   1. multi_char_keys の組み合わせで2文字ヒントを生成
"   2. インデックス i に基づいて first_char と second_char を決定
"   3. first_idx = i / len(multi_char_keys), second_idx = i % len(multi_char_keys)
"   4. 例（multi_char_keys='bce...'の場合）: i=0 → 'bb', i=1 → 'bc', i=15 → 'cb'
"
" @param count Number 生成する2文字ヒントの数
" @return List<String> 2文字ヒントの配列
"
" 使用例:
"   let hints = s:generate_multi_char_hints(8)
"   " => ['bb', 'bc', 'be', 'bi', 'bo', 'bp', 'bq', 'br']
"
" 注意事項:
"   - 最大 len(multi_char_keys) x len(multi_char_keys) 個まで生成可能
"   - Phase A-3では42個までに制限（7単一文字 + 42複数文字 = 49）
function! s:generate_multi_char_hints(count) abort
  let l:hints = []
  let l:base_chars = s:multi_char_keys
  let l:max_hints = len(l:base_chars) * len(l:base_chars)

  " 最大49個までに制限
  let l:actual_count = a:count > l:max_hints ? l:max_hints : a:count

  for l:i in range(l:actual_count)
    let l:first_idx = l:i / len(l:base_chars)
    let l:second_idx = l:i % len(l:base_chars)
    let l:hint = l:base_chars[l:first_idx] . l:base_chars[l:second_idx]
    call add(l:hints, l:hint)
  endfor

  return l:hints
endfunction

" hellshake_yano_vim#hint_generator#generate(count) - ヒント文字列の生成
"
" 目的:
"   - 指定された count 個のヒント文字を生成
"   - Phase A-3: 単一文字（1文字）+ 複数文字（2文字）のヒントを生成
"   - 単一文字と複数文字で異なるキーセットを使用（競合回避）
"
" アルゴリズム:
"   1. count が 0 以下の場合、空の配列を返す（エラーハンドリング）
"   2. count <= len(single_char_keys): 単一文字ヒントのみ
"   3. count > len(single_char_keys): 単一文字ヒント + 複数文字ヒント
"   4. Phase A-3 の制限: 最大49個まで（7単一文字 + 42二文字）
"
" @param count Number 生成するヒント文字の数（1以上の整数を想定）
" @return List<String> ヒント文字の配列（例: ['a', 's', 'd', 'bb', 'bc']）
"
" 使用例:
"   let hints = hellshake_yano_vim#hint_generator#generate(3)
"   " => ['a', 's', 'd']
"
"   let hints = hellshake_yano_vim#hint_generator#generate(7)
"   " => ['a', 's', 'd', 'f', 'g', 'n', 'm']
"
"   let hints = hellshake_yano_vim#hint_generator#generate(8)
"   " => ['a', 's', 'd', 'f', 'g', 'n', 'm', 'bb']
"
"   let hints = hellshake_yano_vim#hint_generator#generate(14)
"   " => ['a', 's', 'd', 'f', 'g', 'n', 'm', 'bb', 'bc', 'be', 'bi', 'bo', 'bp', 'bq']
"
" エラーハンドリング:
"   - count <= 0: 空配列を返す（エラーではなく正常な動作）
"   - count > 49: 49個までに制限（Phase A-3の仕様）
"
" 注意事項:
"   - Phase A-3: 最大49個のヒントまで（7単一文字 + 42二文字）
"   - 単一文字キーと複数文字キーは別セット（競合なし）
"   - count が 49 を超える場合は 49 個まで返す
"
" カスタマイズ:
"   - g:hellshake_yano_vim_single_char_keys で単一文字キーを変更可能
"   - g:hellshake_yano_vim_multi_char_keys で複数文字キーを変更可能
function! hellshake_yano_vim#hint_generator#generate(count) abort
  " 引数チェック: count が 0 以下の場合は空配列を返す
  if a:count <= 0
    return []
  endif

  " Phase A-3: 最大49個まで（7単一文字 + 42二文字）
  let l:max_total = 49
  let l:actual_count = a:count > l:max_total ? l:max_total : a:count

  " 単一文字ヒント（最大 len(single_char_keys) 個）
  let l:single_char_count = min([l:actual_count, len(s:single_char_keys)])
  let l:hints = s:single_char_keys[0 : l:single_char_count - 1]

  " 複数文字ヒント（len(single_char_keys) + 1 個目以降）
  if l:actual_count > len(s:single_char_keys)
    let l:multi_char_count = l:actual_count - len(s:single_char_keys)
    let l:multi_char_hints = s:generate_multi_char_hints(l:multi_char_count)
    call extend(l:hints, l:multi_char_hints)
  endif

  return l:hints
endfunction

let &cpo = s:save_cpo
unlet s:save_cpo
