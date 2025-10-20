" autoload/hellshake_yano_vim/word_detector.vim - 画面内の単語検出機能
" Author: hellshake-yano
" License: MIT
"
" TDD Phase: GREEN
" Process2: word_detector.vim実装
"
" このモジュールは画面内（line('w0') ～ line('w$')）の単語を自動検出します。
" Phase A-2: 固定座標から単語ベースのヒント表示への移行を実現します。

" スクリプトローカル変数の定義
let s:save_cpo = &cpo
set cpo&vim

" hellshake_yano_vim#word_detector#detect_visible() - 画面内の単語検出
"
" 目的:
"   - 画面内に表示されている範囲（line('w0') ～ line('w$')）の単語を検出
"   - 正規表現パターン \w\+ を使用して英数字とアンダースコアの単語を抽出
"   - 各単語の位置情報（text, lnum, col, end_col）を返す
"
" アルゴリズム:
"   1. 画面内の表示範囲（line('w0') ～ line('w$')）を取得
"   2. 各行に対して以下を実行:
"      a. getline() で行の内容を取得
"      b. matchstrpos() を使用して単語を順次検出
"      c. 検出した単語の情報（text, lnum, col, end_col）を配列に追加
"      d. 次の検索開始位置を end_col に更新してループ
"   3. 全ての単語データを配列で返す
"
" データ構造:
"   返り値は以下の形式の Dictionary のリスト:
"   {
"     'text': 'hello',      " 単語文字列
"     'lnum': 10,           " 行番号（1-indexed）
"     'col': 5,             " 開始列（1-indexed）
"     'end_col': 10         " 終了列（matchstrposの戻り値、1-indexed）
"   }
"
" エラーハンドリング:
"   - 空のバッファでも安全に動作（line('w0') と line('w$') が同じになる）
"   - 単語が見つからない場合は空配列を返す
"   - 空行は自動的にスキップされる（matchstrpos が空文字列を返す）
"
" @return List<Dictionary> 単語データのリスト
"
" 使用例:
"   let words = hellshake_yano_vim#word_detector#detect_visible()
"   for word in words
"     echo word.text . ' at line ' . word.lnum . ', col ' . word.col
"   endfor
"
" 注意事項:
"   - Phase A-2 MVP版では英数字のみ対応（日本語はPhase A-5で対応予定）
"   - 検出単語数に制限なし（呼び出し側で最大7個に制限）
"   - matchstrpos() の戻り値は [match, start, end] の形式
"     - match: マッチした文字列
"     - start: 開始位置（0-indexed）
"     - end: 終了位置（0-indexed、マッチ文字列の次の位置）
"
" パフォーマンス特性:
"   - 時間計算量: O(L * W) - L: 画面内の行数、W: 行あたりの平均単語数
"   - matchstrpos() は最適化された組み込み関数を使用
"   - 画面内に限定することで大きなバッファでも高速動作
"   - 1000行のバッファでも数ミリ秒で処理完了（画面内は通常20-50行）
"
" 最適化の設計判断:
"   - matchstrpos() を使用（正規表現エンジンのネイティブ実装）
"   - 空行を明示的にスキップ（空行が多い場合の最適化）
"   - 無限ループ防止チェックを実装（安全性とパフォーマンスのバランス）
function! hellshake_yano_vim#word_detector#detect_visible() abort
  " 1. 画面内の表示範囲を取得
  let l:w0 = line('w0')
  let l:wlast = line('w$')

  " 空のバッファチェック
  if l:w0 < 1 || l:wlast < 1
    return []
  endif

  " 単語パターン: 英数字とアンダースコア
  let l:word_pattern = '\w\+'

  " 検出結果を格納する配列
  let l:words = []

  " 2. 各行を走査して単語を検出
  for l:lnum in range(l:w0, l:wlast)
    " 行の内容を取得
    let l:line = getline(l:lnum)

    " 空行スキップ
    if empty(l:line)
      continue
    endif

    " 現在の検索開始位置（0-indexed）
    let l:start_pos = 0

    " 行内の全ての単語を検出
    while 1
      " matchstrpos() で単語を検出
      " 戻り値: [match, start, end]
      "   - match: マッチした文字列
      "   - start: 開始位置（0-indexed）
      "   - end: 終了位置（0-indexed、マッチ文字列の次の位置）
      let l:match_result = matchstrpos(l:line, l:word_pattern, l:start_pos)
      let l:match_text = l:match_result[0]
      let l:match_start = l:match_result[1]
      let l:match_end = l:match_result[2]

      " マッチが見つからない場合はループ終了
      if l:match_start == -1
        break
      endif

      " 単語データを作成（col と end_col は 1-indexed に変換）
      let l:word_data = {
        \ 'text': l:match_text,
        \ 'lnum': l:lnum,
        \ 'col': l:match_start + 1,
        \ 'end_col': l:match_end + 1
      \ }

      " 配列に追加
      call add(l:words, l:word_data)

      " 次の検索開始位置を更新
      let l:start_pos = l:match_end

      " 安全のため、無限ループ防止チェック
      if l:start_pos >= len(l:line)
        break
      endif
    endwhile
  endfor

  " 3. 検出結果を返す
  return l:words
endfunction

" hellshake_yano_vim#word_detector#get_min_length() - キー別最小単語長の取得
"
" Phase D-2 Sub2: Per-Key最小単語長機能
"
" 目的:
"   - perKeyMinLength設定から指定されたキーの最小単語長を取得
"   - perKeyMinLengthに設定がない場合はdefaultMinWordLengthにフォールバック
"   - どちらも未設定の場合はハードコードされたデフォルト値（3）を返す
"
" アルゴリズム:
"   1. g:hellshake_yano.perKeyMinLength[key]をチェック
"   2. 存在しない、または無効な値（0以下）の場合はdefaultMinWordLengthを使用
"   3. defaultMinWordLengthも未設定の場合はデフォルト値3を返す
"
" エラーハンドリング:
"   - perKeyMinLengthが辞書でない場合はdefaultMinWordLengthにフォールバック
"   - 0以下の値はdefaultMinWordLengthにフォールバック
"   - すべて未設定の場合はデフォルト値3を返す
"
" @param key String モーションキー（例: 'w', 'b', 'e', 'h', 'j', 'k', 'l'）
" @return Number 最小単語長
"
" 使用例:
"   let l:min_length = hellshake_yano_vim#word_detector#get_min_length('w')
"   " => 3 (perKeyMinLength.w が 3 の場合)
"
"   let l:min_length = hellshake_yano_vim#word_detector#get_min_length('h')
"   " => 2 (perKeyMinLengthに'h'がなく、defaultMinWordLengthが2の場合)
"
" 注意事項:
"   - PLAN.md Process2 Sub2 の仕様に基づく実装
"   - word_filter.vimと組み合わせて使用することを想定
"   - original_index保持のためword_filter#apply()を使用
function! hellshake_yano_vim#word_detector#get_min_length(key) abort
  " Phase D-2 Sub2: Per-Key最小単語長設定の取得

  " デフォルト値（すべて未設定の場合）
  let l:default_value = 3

  " 設定を取得（存在しない場合は空の辞書）
  let l:config = get(g:, 'hellshake_yano', {})

  " 1. perKeyMinLengthからキー別設定を取得
  let l:per_key_min_length = get(l:config, 'perKeyMinLength', {})

  " perKeyMinLengthが辞書でない場合は使用しない
  if type(l:per_key_min_length) != type({})
    let l:per_key_min_length = {}
  endif

  " キー別設定が存在し、有効な値（1以上）であれば使用
  if has_key(l:per_key_min_length, a:key)
    let l:key_value = l:per_key_min_length[a:key]
    if type(l:key_value) == type(0) && l:key_value > 0
      return l:key_value
    endif
  endif

  " 2. defaultMinWordLengthにフォールバック
  let l:default_min_word_length = get(l:config, 'defaultMinWordLength', l:default_value)

  " defaultMinWordLengthが有効な値であればそれを返す
  if type(l:default_min_word_length) == type(0) && l:default_min_word_length > 0
    return l:default_min_word_length
  endif

  " 3. すべて未設定の場合はデフォルト値を返す
  return l:default_value
endfunction

let &cpo = s:save_cpo
unlet s:save_cpo
