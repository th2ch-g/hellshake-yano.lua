# title: Phase A-3 - 複数文字ヒント機能の実装

## 概要
- 7個を超える単語に対応するため、複数文字ヒント (AA, AS, AD, AF...) を実装する
- 単一文字ヒント (A, S, D, F, J, K, L) で7個まで表示し、8個目以降は2文字ヒント (AA, AS, AD...) で表示
- 部分マッチハイライト機能を追加し、複数文字入力時の視覚的フィードバックを提供
- Pure VimScript実装として、Vim 8.0+とNeovimの両方で動作

### goal
- ユーザーが画面内の8個以上の単語に対して、2文字のヒント入力でジャンプできるようにする
- 入力途中でも部分マッチする候補が視覚的にわかるようにする
- 既存の単一文字ヒント機能（Phase A-2）との互換性を保つ

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- git add, git commitの実行は、ユーザに実行の許可を得ること
- 動作確認はneovimではなく、vimで行う

## 開発のゴール
- 最大49個の単語にヒントを表示できるようにする（7単一文字 + 42二文字: 7 × 6 = 42）
- 複数文字入力時の入力体験を向上させる（部分マッチハイライト）
- テストカバレッジ100%を維持する（TDD手法）
- Phase A-2の実装を壊さない（回帰テスト）

## 実装仕様

### アルゴリズム設計

#### ヒント生成アルゴリズム
```vim
" 入力: count (単語数)
" 出力: ヒント文字列の配列

" Phase 1: 単一文字ヒント (1-7個)
" ['A', 'S', 'D', 'F', 'J', 'K', 'L']

" Phase 2: 2文字ヒント (8個目以降)
" ['AA', 'AS', 'AD', 'AF', 'AJ', 'AK', 'AL',  " Aで始まる組み合わせ (7個)
"  'SA', 'SS', 'SD', 'SF', 'SJ', 'SK', 'SL',  " Sで始まる組み合わせ (7個)
"  ...                                         " 以降同様
" ]

" 最大: 7 + (7 × 6) = 49個のヒント
" ※同じ文字の組み合わせ（'AA', 'SS'等）も使用して7×7=49個に拡張可能
```

#### 部分マッチハイライトアルゴリズム
```vim
" 入力例: ユーザーが 'A' を入力
" 動作:
"   1. 'A' で始まる全てのヒント候補をハイライト
"      例: 'A', 'AA', 'AS', 'AD', 'AF', 'AJ', 'AK', 'AL'
"   2. 完全一致した場合（'A'）は即座にジャンプ
"   3. 部分一致のみの場合は次の入力を待つ
"   4. 2文字目入力で完全一致（'AA'）すればジャンプ

" 視覚的フィードバック:
"   - 完全一致: 元のハイライト
"   - 部分一致: ハイライトを暗くするか、別の色で表示
"   - マッチなし: ヒント非表示
```

### データ構造

#### ヒント生成戦略
```vim
" s:hint_chars - 基本文字セット
let s:hint_chars = ['A', 'S', 'D', 'F', 'J', 'K', 'L']

" 生成ロジック:
" count <= 7:  s:hint_chars[0:count-1]
" count > 7:   s:hint_chars[0:6] + generate_multi_char_hints(count - 7)
```

#### 部分マッチ追跡
```vim
" input.vim の拡張
let s:input_buffer = ''          " 現在の入力バッファ
let s:partial_matches = []       " 部分マッチしているヒントのリスト
let s:exact_match_found = v:false " 完全一致フラグ
```

## 生成AIの学習用コンテキスト

### VimScript実装ファイル
- `autoload/hellshake_yano_vim/hint_generator.vim`
  - 現在: 単一文字ヒントのみ生成（最大7個）
  - 拡張: 複数文字ヒント生成機能を追加
- `autoload/hellshake_yano_vim/input.vim`
  - 現在: 入力バッファと部分マッチロジックの基礎は実装済み
  - 拡張: 部分マッチハイライトを追加
- `autoload/hellshake_yano_vim/display.vim`
  - 拡張: 部分マッチ時のハイライト変更機能を追加

### テストファイル
- `tests-vim/hellshake_yano_vim/test_hint_generator.vim`
  - 拡張: 複数文字ヒント生成のテストケースを追加
- `tests-vim/hellshake_yano_vim/test_input.vim`
  - 拡張: 複数文字入力とマッチングのテストケースを追加
- `tests-vim/hellshake_yano_vim/test_integration.vim`
  - 拡張: エンドツーエンドのテストケースを追加

### ドキュメント
- `README.md`
  - Phase A-3の機能説明を追加
- `ARCHITECTURE.md`
  - Phase A-3の実装状況を更新

## Process

### process1 ヒント生成ロジックの拡張（TDD: RED）
#### sub1.1 複数文字ヒント生成のテストケース作成
@target: `tests-vim/hellshake_yano_vim/test_hint_generator.vim`
@ref: `autoload/hellshake_yano_vim/hint_generator.vim`
- [ ] 8個の単語に対するテストケースを追加
  - 期待結果: `['A', 'S', 'D', 'F', 'J', 'K', 'L', 'AA']`
- [ ] 14個の単語に対するテストケースを追加
  - 期待結果: `['A', 'S', 'D', 'F', 'J', 'K', 'L', 'AA', 'AS', 'AD', 'AF', 'AJ', 'AK', 'AL']`
- [ ] 49個の単語に対するテストケースを追加（最大値）
  - 期待結果: 7単一文字 + 42二文字ヒント
- [ ] 50個以上の単語に対するテストケースを追加
  - 期待結果: 49個までに制限（MVP Phase A-3の制限）
- [ ] エッジケースのテストケースを追加
  - count = 0: `[]`
  - count = 1: `['A']`
  - count = 7: `['A', 'S', 'D', 'F', 'J', 'K', 'L']`

#### sub1.2 テスト実行と失敗確認（RED）
@target: Terminal
- [ ] `:source tests-vim/hellshake_yano_vim/test_hint_generator.vim` を実行
- [ ] 新しいテストケースが失敗することを確認
- [ ] エラーメッセージを記録

### process2 ヒント生成ロジックの実装（TDD: GREEN）
#### sub2.1 複数文字ヒント生成関数の実装
@target: `autoload/hellshake_yano_vim/hint_generator.vim`
@ref: `tests-vim/hellshake_yano_vim/test_hint_generator.vim`
- [ ] `s:generate_multi_char_hints(count)` 関数を新規作成
  - 引数: count (生成する2文字ヒントの数)
  - 戻り値: 2文字ヒントの配列
  - アルゴリズム:
    ```vim
    " 例: count = 8 の場合
    " 'AA', 'AS', 'AD', 'AF', 'AJ', 'AK', 'AL', 'SA' を生成
    let l:hints = []
    let l:base_chars = s:hint_chars  " ['A', 'S', 'D', 'F', 'J', 'K', 'L']
    let l:max_hints = len(l:base_chars) * len(l:base_chars)  " 49

    for l:i in range(min([a:count, l:max_hints]))
      let l:first_idx = l:i / len(l:base_chars)
      let l:second_idx = l:i % len(l:base_chars)
      let l:hint = l:base_chars[l:first_idx] . l:base_chars[l:second_idx]
      call add(l:hints, l:hint)
    endfor

    return l:hints
    ```

#### sub2.2 メイン生成関数の拡張
@target: `autoload/hellshake_yano_vim/hint_generator.vim`
- [ ] `hellshake_yano_vim#hint_generator#generate(count)` を拡張
  - count <= 7: 既存ロジック（単一文字ヒント）
  - count > 7: 単一文字ヒント + 複数文字ヒント
  - count > 49: 49個までに制限
  ```vim
  function! hellshake_yano_vim#hint_generator#generate(count) abort
    if a:count <= 0
      return []
    endif

    " Phase A-3: 最大49個まで（7単一文字 + 42二文字）
    let l:max_total = 49
    let l:actual_count = a:count > l:max_total ? l:max_total : a:count

    " 単一文字ヒント（最大7個）
    let l:single_char_count = min([l:actual_count, len(s:hint_chars)])
    let l:hints = s:hint_chars[0 : l:single_char_count - 1]

    " 複数文字ヒント（8個目以降）
    if l:actual_count > len(s:hint_chars)
      let l:multi_char_count = l:actual_count - len(s:hint_chars)
      let l:multi_char_hints = s:generate_multi_char_hints(l:multi_char_count)
      call extend(l:hints, l:multi_char_hints)
    endif

    return l:hints
  endfunction
  ```

#### sub2.3 テスト実行と成功確認（GREEN）
@target: Terminal
- [ ] `:source tests-vim/hellshake_yano_vim/test_hint_generator.vim` を実行
- [ ] 全てのテストケースが成功することを確認
- [ ] テスト結果を記録

### process3 入力処理の部分マッチ対応（TDD: RED）
#### sub3.1 部分マッチテストケースの作成
@target: `tests-vim/hellshake_yano_vim/test_input.vim`
@ref: `autoload/hellshake_yano_vim/input.vim`
- [ ] 部分マッチ検出のテストケース
  - ヒントマップ: `{'A': {...}, 'AA': {...}, 'AS': {...}}`
  - 入力: 'A'
  - 期待: 部分マッチリストに ['A', 'AA', 'AS'] が含まれる
- [ ] 完全一致優先のテストケース
  - ヒントマップ: `{'A': {lnum: 1, col: 1}, 'AA': {lnum: 2, col: 1}}`
  - 入力: 'A'
  - 期待: lnum=1にジャンプ（完全一致優先）
- [ ] 2文字入力のテストケース
  - ヒントマップ: `{'A': {...}, 'AA': {lnum: 2, col: 1}, 'AS': {...}}`
  - 入力: 'AA'
  - 期待: lnum=2にジャンプ
- [ ] マッチなしのテストケース
  - ヒントマップ: `{'A': {...}, 'AA': {...}}`
  - 入力: 'X'
  - 期待: ヒント非表示、入力処理停止

#### sub3.2 テスト実行と失敗確認（RED）
@target: Terminal
- [ ] テストを実行
- [ ] 失敗を確認

### process4 入力処理の実装（TDD: GREEN）
#### sub4.1 部分マッチロジックの実装
@target: `autoload/hellshake_yano_vim/input.vim`
@ref: `tests-vim/hellshake_yano_vim/test_input.vim`
- [ ] `s:get_partial_matches(input_buffer, hint_map)` 関数を実装
  ```vim
  " 部分マッチするヒントのリストを取得
  function! s:get_partial_matches(input_buffer, hint_map) abort
    let l:matches = []

    for l:hint in keys(a:hint_map)
      " 前方一致チェック
      if stridx(l:hint, a:input_buffer) == 0
        call add(l:matches, l:hint)
      endif
    endfor

    return l:matches
  endfunction
  ```

#### sub4.2 入力チェックロジックの拡張
@target: `autoload/hellshake_yano_vim/input.vim`
- [ ] `s:check_input(timer)` 関数を拡張
  ```vim
  function! s:check_input(timer) abort
    let l:char_code = getchar(1)
    if l:char_code == 0
      return
    endif

    let l:input_char = nr2char(l:char_code)
    let s:input_buffer .= l:input_char

    " 完全一致チェック（優先）
    if has_key(s:hint_map, s:input_buffer)
      " ジャンプ実行
      let l:target = s:hint_map[s:input_buffer]
      call hellshake_yano_vim#jump#to(l:target.lnum, l:target.col)
      call hellshake_yano_vim#display#hide_all()
      call hellshake_yano_vim#input#stop()
      return
    endif

    " 部分マッチチェック
    let l:partial_matches = s:get_partial_matches(s:input_buffer, s:hint_map)

    if len(l:partial_matches) > 0
      " 部分マッチあり: ハイライト更新
      call hellshake_yano_vim#display#highlight_partial_matches(l:partial_matches)
    else
      " マッチなし: クリーンアップ
      call hellshake_yano_vim#display#hide_all()
      call hellshake_yano_vim#input#stop()
    endif
  endfunction
  ```

#### sub4.3 テスト実行と成功確認（GREEN）
@target: Terminal
- [ ] テストを実行
- [ ] 全てのテストケースが成功することを確認

### process5 部分マッチハイライト機能の実装（TDD: RED）
#### sub5.1 ハイライト機能のテストケース作成
@target: `tests-vim/hellshake_yano_vim/test_display.vim`
@ref: `autoload/hellshake_yano_vim/display.vim`
- [ ] 部分マッチハイライトのテストケース
  - 全ヒント: ['A', 'AA', 'AS', 'S', 'SA']
  - 部分マッチ: ['A', 'AA', 'AS']
  - 期待: 'A', 'AA', 'AS' のポップアップが異なるハイライトで表示
- [ ] ハイライト解除のテストケース
  - 部分マッチ解除時に元のハイライトに戻る

#### sub5.2 テスト実行と失敗確認（RED）
@target: Terminal
- [ ] テストを実行
- [ ] 失敗を確認

### process6 部分マッチハイライト機能の実装（TDD: GREEN）
#### sub6.1 ハイライト関数の実装
@target: `autoload/hellshake_yano_vim/display.vim`
@ref: `tests-vim/hellshake_yano_vim/test_display.vim`
- [ ] `hellshake_yano_vim#display#highlight_partial_matches(matches)` 関数を実装
  ```vim
  " 部分マッチしたヒントのハイライトを更新
  function! hellshake_yano_vim#display#highlight_partial_matches(matches) abort
    " スクリプトローカル変数 s:popup_ids に格納されたポップアップIDを参照
    " matches に含まれないヒントのポップアップを暗くする

    for l:popup_info in s:popup_ids
      let l:hint = l:popup_info.hint
      let l:popup_id = l:popup_info.id

      if index(a:matches, l:hint) >= 0
        " 部分マッチ: 元のハイライトを維持
        " (何もしない)
      else
        " マッチしない: ハイライトを暗くする
        if has('nvim')
          " Neovim: extmark のハイライトを変更
          " (実装省略: 簡易版ではポップアップを非表示にする)
          call nvim_buf_del_extmark(0, s:namespace_id, l:popup_id)
        else
          " Vim: ポップアップを非表示
          call popup_close(l:popup_id)
        endif
      endif
    endfor
  endfunction
  ```

#### sub6.2 ポップアップ管理の拡張
@target: `autoload/hellshake_yano_vim/display.vim`
- [ ] `s:popup_ids` の構造を拡張
  ```vim
  " 既存: [popup_id1, popup_id2, ...]
  " 拡張: [{'id': popup_id1, 'hint': 'A'}, {'id': popup_id2, 'hint': 'AA'}, ...]
  ```
- [ ] `hellshake_yano_vim#display#show_hints()` を拡張
  - ポップアップ作成時にヒント文字も保存

#### sub6.3 テスト実行と成功確認（GREEN）
@target: Terminal
- [ ] テストを実行
- [ ] 全てのテストケースが成功することを確認

### process7 統合テストとエンドツーエンドテスト（TDD: RED → GREEN）
#### sub7.1 統合テストケースの作成
@target: `tests-vim/hellshake_yano_vim/test_integration.vim`
- [ ] 8個以上の単語がある画面での統合テスト
  - 単語: ['apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew']
  - ヒント: ['A', 'S', 'D', 'F', 'J', 'K', 'L', 'AA']
  - 入力: 'AA'
  - 期待: 'honeydew' にジャンプ
- [ ] 部分マッチの統合テスト
  - 単語: 同上
  - 入力: 'A' → 部分マッチハイライト表示 → 'A' → 'apple' にジャンプ
- [ ] 最大49個の単語の統合テスト
  - 49個の単語を配置
  - 最後のヒント（'LL'）を入力してジャンプ

#### sub7.2 統合テスト実行
@target: Terminal
- [ ] 統合テストを実行
- [ ] 全てのシナリオが成功することを確認

#### sub7.3 実際のVimでの手動テスト
@target: Vim
- [ ] 実際のVimで `:HellshakeYanoVimShow` を実行
- [ ] 8個以上の単語がある画面で複数文字ヒントが表示されることを確認
- [ ] 複数文字入力でジャンプできることを確認
- [ ] 部分マッチハイライトが動作することを確認

### process8 回帰テストの実行
#### sub8.1 Phase A-1, A-2のテスト実行
@target: Terminal
- [ ] 全ての既存テストを実行
  - `:HellshakeYanoVimTest`
- [ ] 既存機能が壊れていないことを確認
  - Phase A-1: 固定座標ヒント
  - Phase A-2: 画面内単語検出（7個まで）

#### sub8.2 エッジケースの確認
@target: Terminal
- [ ] 単語が7個以下の場合、Phase A-2と同じ動作をすることを確認
- [ ] 単語が0個の場合、エラーが発生しないことを確認
- [ ] 空バッファでのテスト

### process10 ユニットテスト
#### sub10.1 テストカバレッジの確認
@target: Terminal
- [ ] 全てのテストケースを実行
- [ ] カバレッジレポートを確認（手動）
  - hint_generator.vim: 100%
  - input.vim: 部分マッチロジック 100%
  - display.vim: ハイライトロジック 100%

#### sub10.2 テストドキュメントの更新
@target: `tests-vim/README.md`（存在しない場合は作成）
- [ ] Phase A-3のテスト項目を記載
- [ ] テスト実行方法を記載

### process100 リファクタリング
#### sub100.1 コードの重複排除
@target: `autoload/hellshake_yano_vim/hint_generator.vim`
- [ ] 複数文字ヒント生成ロジックの最適化
- [ ] 不要なコメントの削除
- [ ] 関数の責務を明確化

#### sub100.2 パフォーマンスの最適化
@target: `autoload/hellshake_yano_vim/input.vim`
- [ ] 部分マッチ検索の最適化
  - 辞書のキーを配列に変換するコストを削減
  - キャッシュの活用

#### sub100.3 エラーハンドリングの統一
@target: 全モジュール
- [ ] エラーメッセージの統一
- [ ] try-catch の適切な配置

### process200 ドキュメンテーション
#### sub200.1 README.mdの更新
@target: `README.md`
- [ ] Phase A-3の機能説明を追加
  - 複数文字ヒント（AA, AS, AD...）の説明
  - 最大49個の単語に対応
  - 部分マッチハイライトの説明
- [ ] 使用例を追加
  ```markdown
  **Phase A-3 (Multi-character hints)** ✅:
  1. Open a file with 10+ words visible
  2. Execute `:HellshakeYanoVimShow`
  3. Hints appear: 'A', 'S', 'D', 'F', 'J', 'K', 'L', 'AA', 'AS', 'AD'
  4. Type 'AA' to jump to the 8th word
  5. Type 'A' then 'S' to jump to the 9th word (partial match highlight)
  ```
- [ ] Current Limitations を更新
  - ~~Single-character hints only (maximum 7 hints)~~ → **Multi-character hints (maximum 49 hints)** ✅

#### sub200.2 ARCHITECTURE.mdの更新
@target: `ARCHITECTURE.md`
- [ ] Phase A-3の実装状況を更新
  ```markdown
  #### Phase A-3: 複数文字ヒント ✅ **完了**

  **実装状況**: Phase A-3 (複数文字ヒント) の実装は完了しました。

  **達成した機能**:
  - ✅ 複数文字ヒント生成（AA, AS, AD, AF...）
  - ✅ 最大49個の単語に対応（7単一文字 + 42二文字）
  - ✅ 部分マッチハイライト機能
  - ✅ TDD による包括的なテストカバレッジ
  - ✅ Phase A-1, A-2との後方互換性維持
  ```
- [ ] 技術仕様セクションに複数文字ヒントのアルゴリズムを追加

#### sub200.3 コード内コメントの充実
@target: 全モジュール
- [ ] 各関数の目的、パラメータ、戻り値を詳細に記述
- [ ] アルゴリズムの説明を追加
- [ ] 使用例を追加

#### sub200.4 PLAN.mdの更新
@target: `PLAN.md`（このファイル）
- [ ] 実装完了後、全チェックボックスを確認
- [ ] 完了日時を記録
- [ ] 次のフェーズ（Phase A-4）への移行準備を記載

