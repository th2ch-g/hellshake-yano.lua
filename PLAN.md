# title: Phase A-2: 画面内単語検出

## 概要
- 固定座標（カーソル行±3行）から、画面内の全単語を自動検出してヒントを割り当てる機能への移行
- Pure VimScript実装で `\w\+` パターンを使用した単語検出を実現
- Phase A-1（MVP）の固定座標実装から、より実用的な単語ベースのヒント表示へアップグレード

### goal
- ユーザが `:HellshakeYanoVimShow` を実行すると、画面内の単語（最大7個）に自動的にヒント（a, s, d, f, j, k, l）が表示される
- ヒントキーを押すことで、実際の単語位置に正確にジャンプできる
- 固定座標ではなく、実際のコード/テキストの単語に基づいてナビゲーションできる

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- TDD（Red-Green-Refactor）サイクルに従うこと
- 動作確認は Vim（Neovimではない）で行うこと

## 開発のゴール
- 画面内（`line('w0')` ～ `line('w$')`）の単語を自動検出
- 単語位置情報（text, lnum, col, end_col）を正確に取得
- Phase A-1のテストカバレッジ100%を維持しながら機能拡張
- MVP制限（最大7単語）を守りつつ、Phase A-3への拡張可能性を確保

## 実装仕様

### 単語検出アルゴリズム
- 正規表現パターン: `\w\+` （英数字とアンダースコア）
- 検出範囲: `line('w0')` ～ `line('w$')` （画面内のみ）
- 使用関数: `matchstrpos(line, pattern, start_col)`
- データ構造:
  ```vim
  {
    'text': 'hello',      " 単語文字列
    'lnum': 10,           " 行番号（1-indexed）
    'col': 5,             " 開始列（1-indexed）
    'end_col': 10         " 終了列（matchstrposの戻り値）
  }
  ```

### MVP制限
- 最大7個の単語までヒント表示（hint_chars の長さ）
- 単一文字ヒントのみ（a, s, d, f, j, k, l）
- 英数字のみ対応（日本語はPhase A-5で対応）

## 生成AIの学習用コンテキスト

### アーキテクチャドキュメント
- `ARCHITECTURE.md`
  - Phase A-1 MVP実装の完了状況
  - Phase A-2の実装計画詳細
  - 単語検出アルゴリズムの技術仕様

### 既存実装
- `autoload/hellshake_yano_vim/core.vim`
  - `get_fixed_positions()` の実装を参考に単語検出を実装
  - `show()` 関数の統合処理フローを理解
- `autoload/hellshake_yano_vim/hint_generator.vim`
  - ヒント生成ロジック（最大7個の制限）
- `tests-vim/hellshake_yano_vim/test_runner.vim`
  - テストフレームワークの使用方法

### テスト実装
- `tests-vim/hellshake_yano_vim/test_core.vim`
  - テストケースの書き方
  - Assert関数の使用方法

## Process

### process1 単語検出テスト作成（RED）
@target: `tests-vim/hellshake_yano_vim/test_word_detector.vim`
@ref: `tests-vim/hellshake_yano_vim/test_core.vim`, `tests-vim/hellshake_yano_vim/test_runner.vim`

- [ ] `Test_detect_words_basic()` - 基本的な英単語検出
  - 1行に複数の単語が含まれる場合の検出
  - 期待値: `['hello', 'world', 'vim']` のような配列
  - 各単語の座標データ（lnum, col, end_col）の正確性を検証
- [ ] `Test_detect_words_multiline()` - 複数行の単語検出
  - 3～5行のテキストから全単語を検出
  - 行番号が正しく記録されているか検証
- [ ] `Test_detect_words_visible_area()` - 画面内範囲の検出
  - `line('w0')` ～ `line('w$')` の範囲のみ検出
  - 範囲外の単語が含まれていないことを確認
- [ ] `Test_detect_words_empty_line()` - 空行の処理
  - 空行をスキップして次の行を処理
  - エラーを投げずに空配列を返す
- [ ] `Test_detect_words_position_data()` - 座標データの正確性
  - `col` が1-indexedで正しいか
  - `end_col` が `matchstrpos()` の戻り値と一致するか
  - `text` が実際の単語文字列と一致するか

### process2 word_detector.vim実装（GREEN）
@target: `autoload/hellshake_yano_vim/word_detector.vim`
@ref: `autoload/hellshake_yano_vim/core.vim`

- [ ] `hellshake_yano_vim#word_detector#detect_visible()` 関数を実装
  - 画面内範囲（`line('w0')` ～ `line('w$')`）を取得
  - 各行で `matchstrpos()` を使用して単語を検出
  - ループで全単語を配列に追加
  - 単語データ構造（text, lnum, col, end_col）を返す
- [ ] エラーハンドリング
  - 空のバッファでも安全に動作
  - 単語が見つからない場合は空配列を返す
- [ ] コメントの充実
  - 関数の目的、パラメータ、戻り値を記述
  - アルゴリズムの説明を追加

### process3 core.vim統合
@target: `autoload/hellshake_yano_vim/core.vim`
@ref: `autoload/hellshake_yano_vim/word_detector.vim`

- [ ] `show()` 関数を修正
  - `get_fixed_positions()` を `word_detector#detect_visible()` に置き換え
  - 検出された単語が7個を超える場合は最初の7個のみを使用（MVP制限）
  - エラーハンドリング: 単語が検出できない場合の警告表示
- [ ] `get_fixed_positions()` 関数を保持
  - Phase A-1との互換性維持のため残しておく
  - コメントで「Phase A-2で word_detector に置き換え済み」と記述

### process4 統合テスト追加
@target: `tests-vim/hellshake_yano_vim/test_integration.vim`
@ref: `autoload/hellshake_yano_vim/core.vim`

- [ ] `Test_show_with_word_detection()` を追加
  - テストバッファに単語を含む複数行を作成
  - `core#show()` を実行
  - ヒントが単語位置に表示されることを検証
  - `state.words` に正しい単語データが格納されていることを確認
- [ ] `Test_show_with_more_than_7_words()` を追加
  - 10個以上の単語を含むバッファを作成
  - 最大7個のヒントのみが表示されることを検証

### process10 ユニットテスト統合
@target: `plugin/hellshake-yano-vim.vim`
@ref: `tests-vim/hellshake_yano_vim/test_word_detector.vim`

- [ ] `s:run_all_tests()` 関数に `test_word_detector.vim` を追加
  - `l:test_files` 配列に追加
- [ ] 全テストを実行して GREEN を確認
  - `:HellshakeYanoVimTest` で全テスト通過を確認

### process50 フォローアップ

#### sub1 カーソル位置の単語除外機能（オプション）
@target: `autoload/hellshake_yano_vim/word_detector.vim`

- [ ] カーソル位置の単語を検出結果から除外するオプションを検討
  - Phase A-4のモーション連打検出で必要になる可能性
  - 現時点では実装しない（将来の拡張として記録）

### process100 リファクタリング
@target: `autoload/hellshake_yano_vim/word_detector.vim`, `autoload/hellshake_yano_vim/core.vim`

- [ ] コードの重複排除
  - 座標データ構造の生成ロジックを共通化
- [ ] コメントの充実化
  - 各関数の目的、使用例、エラーハンドリングを詳細に記述
- [ ] パフォーマンス最適化の検討
  - `matchstrpos()` の呼び出し回数を最小化
  - 大きなバッファでのベンチマークテスト
- [ ] エラーハンドリングの統一
  - 警告メッセージのフォーマットを統一（`s:show_warning()` 使用）

### process200 ドキュメンテーション
@target: `ARCHITECTURE.md`, `README.md`

- [ ] `ARCHITECTURE.md` の更新
  - Phase A-2の実装状況を「完了」に更新
  - 単語検出アルゴリズムの詳細を追記
  - Phase A-3への移行準備完了を記述
- [ ] `README.md` の更新
  - Current Limitationsセクションを更新
    - ~~"Fixed positions only"~~ → "Word detection within visible area"
  - Phase A-2の機能説明を追加
  - 使用例を更新（単語検出の動作例）
- [ ] コード内コメントの最終確認
  - 全ての公開関数にドキュメントコメントがあることを確認
  - テストコードのコメントも充実させる

