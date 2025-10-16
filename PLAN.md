# title: Phase A-1: Pure VimScript MVP実装（TDD）

## 概要
- 3つの固定位置にヒント（a, s, d）を表示し、キー入力でジャンプする最小限の機能を Pure VimScript で実装
- Vim 8.0+ と Neovim の両方で動作する popup/extmark による表示
- TDD（Test-Driven Development）サイクルに従った段階的な実装

### goal
- ユーザーが `:HellshakeYanoVimShow` コマンドを実行すると、カーソル行の前後3箇所にヒント（a, s, d）が表示される
- 'a', 's', 'd' のいずれかのキーを入力すると、対応する位置にカーソルがジャンプする
- ヒントは自動的に消える

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 既存の denops 実装（hellshake-yano）とは名前空間を分離（hellshake_yano_vim）
- deno test との競合を避けるため、VimScript テストは `tests-vim/` ディレクトリに配置

## 開発のゴール
- ARCHITECTURE.md の Phase A-1 に基づく最小実装を完成させる
- Vim 8.0+ で動作する Pure VimScript 実装の基礎を確立
- 単体テストと統合テストによる品質保証
- Phase A-2（単語検出）への拡張可能な設計

## 実装仕様

### データ構造

#### Word（単語）- MVP版は固定座標
```vim
let l:word = {
  \ 'id': 1,
  \ 'lnum': 10,
  \ 'col': 5,
  \ 'hint': 'a',
  \ 'popup_id': 1234
\ }
```

#### State（状態管理）
```vim
let s:state = {
  \ 'enabled': v:true,
  \ 'hints_visible': v:false,
  \ 'words': [],
  \ 'hints': [],
  \ 'hint_map': {},
  \ 'popup_ids': [],
  \ 'input_timer': 0
\ }
```

### API設計

#### Public Functions
```vim
" ヒント表示
hellshake_yano_vim#core#show()
hellshake_yano_vim#core#hide()

" 個別モジュール（テスト用にも公開）
hellshake_yano_vim#core#get_fixed_positions()
hellshake_yano_vim#hint_generator#generate(count)
hellshake_yano_vim#display#show_hint(lnum, col, hint)
hellshake_yano_vim#display#hide_all()
hellshake_yano_vim#jump#to(lnum, col)
hellshake_yano_vim#input#start(hint_map)
hellshake_yano_vim#input#stop()
```

## 生成AIの学習用コンテキスト

### アーキテクチャドキュメント
- `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/ARCHITECTURE.md`
  - Phase A-1 の詳細仕様
  - 技術調査結果（popup/extmark の使い方）
  - データ構造定義

### 既存実装（参考用）
- `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/plugin/hellshake-yano.vim`
  - プラグイン初期化パターン
  - 設定検証パターン
- `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano/utils.vim`
  - ユーティリティ関数の参考

## Process

### process1 テスト環境セットアップ ✓
@target: `tests-vim/hellshake_yano_vim/test_runner.vim`
- [x] VimScript テスト用ディレクトリ `tests-vim/hellshake_yano_vim/` を作成
- [x] テスト実行フレームワーク `test_runner.vim` を作成
  - `Assert(condition, message)` アサーション関数
  - `AssertEqual(expected, actual, message)` 等価性チェック
  - `AssertTrue(value, message)` / `AssertFalse(value, message)` 真偽値チェック
  - `RunTest(funcname)` 個別テスト実行
  - `RunAllTests()` 全テスト実行
- [x] テスト結果のカラー出力（成功: 緑、失敗: 赤）

### process2 固定座標データ構造の実装（TDD: RED → GREEN → REFACTOR）✓
#### sub1 テスト作成（RED）✓
@target: `tests-vim/hellshake_yano_vim/test_core.vim`
- [x] `Test_core_init()` - 初期化テスト
  - 状態変数が正しく初期化される
- [x] `Test_get_fixed_positions()` - 固定座標取得テスト
  - カーソル行が 10 行目の場合、7, 10, 13 行目の座標を返す
  - 3つの座標が返される
- [x] エッジケーステスト追加
  - `Test_get_fixed_positions_edge_case_top()` - バッファ先頭付近
  - `Test_get_fixed_positions_edge_case_bottom()` - バッファ末尾付近

#### sub2 実装作成（GREEN）✓
@target: `autoload/hellshake_yano_vim/core.vim`
- [x] スクリプトローカル変数 `s:state` の定義
- [x] `hellshake_yano_vim#core#init()` 初期化関数
  - s:state の初期化
  - enabled, hints_visible フラグの設定
- [x] `hellshake_yano_vim#core#get_state()` 状態取得関数（テスト用）
- [x] `hellshake_yano_vim#core#get_fixed_positions()` 固定座標取得関数
  - カーソル行の前後3行ずつの固定座標を返す
  - 配列形式: [{'lnum': N, 'col': 1}, ...]
  - バッファ範囲内にクランプ処理

#### sub3 リファクタリング（REFACTOR）✓
- [x] エラーハンドリング追加（空バッファチェック）
- [x] 詳細なコメント追加
- [x] Phase A-2 への拡張性を考慮したドキュメント

### process3 ヒント生成の実装（TDD: RED → GREEN）✓
#### sub1 テスト作成（RED）✓
@target: `tests-vim/hellshake_yano_vim/test_hint_generator.vim`
- [x] `Test_generate_hints_single()` - 単一文字ヒントテスト
  - count=3 の場合、['a', 's', 'd'] を返す
  - count=7 の場合、['a', 's', 'd', 'f', 'j', 'k', 'l'] を返す
  - count=1 の場合、['a'] を返す
- [x] `Test_generate_hints_edge_cases()` - エッジケーステスト
  - count=0 の場合、[] を返す
  - count が hint_chars の長さを超える場合、最大7個まで返す
  - 負の count の場合、[] を返す

#### sub2 実装作成（GREEN）✓
@target: `autoload/hellshake_yano_vim/hint_generator.vim`
- [x] デフォルトヒント文字定義: `s:hint_chars = ['a', 's', 'd', 'f', 'j', 'k', 'l']`
- [x] `hellshake_yano_vim#hint_generator#generate(count)` 関数
  - count 個のヒント文字を生成（MVP では単一文字のみ）
  - hint_chars から順に取得
  - エラーハンドリング（count <= 0 の場合、空配列を返す）
  - MVP 制限（最大7個まで）

### process4 Popup表示の実装（TDD: RED → GREEN）✓
#### sub1 テスト作成（RED）✓
@target: `tests-vim/hellshake_yano_vim/test_display.vim`
- [x] `Test_show_hint_vim()` - Vim での popup 表示テスト
  - popup ID が返される
  - popup_list() に ID が含まれる
- [x] `Test_show_hint_neovim()` - Neovim での extmark 表示テスト（has('nvim') の場合）
  - extmark ID が返される
- [x] `Test_hide_all()` - 全 popup 削除テスト
  - popup_list() が空になる
- [x] `Test_multiple_hints()` - 複数ヒント表示テスト（追加）

#### sub2 実装作成（GREEN）✓
@target: `autoload/hellshake_yano_vim/display.vim`
- [x] Vim/Neovim 判定処理
- [x] `hellshake_yano_vim#display#show_hint(lnum, col, hint)` 関数
  - Vim: `popup_create()` による表示
  - Neovim: `nvim_buf_set_extmark()` による表示
  - popup/extmark ID を返す
- [x] `hellshake_yano_vim#display#hide_all()` 関数
  - 全 popup/extmark を削除
  - s:popup_ids 配列をクリア
- [x] HintMarker ハイライトグループの定義

### process5 ジャンプ機能の実装（TDD: RED → GREEN）✓
#### sub1 テスト作成（RED）✓
@target: `tests-vim/hellshake_yano_vim/test_jump.vim`
- [x] `Test_jump_to()` - ジャンプ機能テスト
  - カーソルが指定座標に移動する
  - line('.') と col('.') が期待値と一致
- [x] `Test_jump_to_invalid()` - 無効座標のテスト
  - 範囲外の行番号はエラーを返す
- [x] 追加のエッジケーステスト
  - `Test_jump_to_first_line()` - 1行目へのジャンプ
  - `Test_jump_to_last_line()` - 最終行へのジャンプ
  - `Test_jump_to_invalid_line_too_large()` - 範囲外（大きすぎる）
  - `Test_jump_to_invalid_line_zero()` - 無効な行番号（0以下）
  - `Test_jump_to_invalid_col_zero()` - 無効な列番号（0以下）

#### sub2 実装作成（GREEN）✓
@target: `autoload/hellshake_yano_vim/jump.vim`
- [x] `hellshake_yano_vim#jump#to(lnum, col)` 関数
  - カーソル移動: `cursor(a:lnum, a:col)`
  - 範囲チェック: `1 <= lnum <= line('$')`
  - エラーハンドリング
  - 型チェック（lnum, col が数値型であることを確認）
  - 詳細なエラーメッセージ

### process6 入力処理の実装（TDD: RED → GREEN）✓
#### sub1 テスト作成（RED）✓
@target: `tests-vim/hellshake_yano_vim/test_input.vim`
- [x] `Test_input_buffer_init()` - 入力バッファ初期化テスト
  - 空文字列で初期化される
- [x] `Test_hint_map_match()` - ヒントマップマッチングテスト
  - hint_map = {'a': word1, 's': word2} の場合
  - 入力 'a' で word1 がマッチする

#### sub2 実装作成（GREEN）✓
@target: `autoload/hellshake_yano_vim/input.vim`
- [x] スクリプトローカル変数 `s:input_buffer = ''`
- [x] スクリプトローカル変数 `s:hint_map = {}`
- [x] スクリプトローカル変数 `s:timer_id = 0`
- [x] `hellshake_yano_vim#input#start(hint_map)` 関数
  - hint_map を保存
  - timer_start(10, ..., {'repeat': -1}) で入力チェック開始
- [x] `s:check_input(timer)` タイマーコールバック関数（クロージャー）
  - getchar(1) で非ブロッキング入力チェック
  - 完全一致時: ジャンプ実行 + タイマー停止
  - マッチなし: タイマー停止 + ヒント非表示
- [x] `hellshake_yano_vim#input#stop()` 関数
  - タイマー停止
  - 入力バッファクリア

### process7 統合テストの実装（TDD: RED → GREEN）✓
#### sub1 テスト作成（RED）✓
@target: `tests-vim/hellshake_yano_vim/test_integration.vim`
- [x] `Test_full_flow()` - 全体フローテスト
  - 初期化
  - ヒント表示（3つの popup が表示される）
  - ヒントマップが正しく生成される
  - クリーンアップ（popup が消える）
- [x] `Test_show_multiple_times()` - 複数回の show/hide テスト
- [x] `Test_hint_map_coordinates()` - ヒントマップの座標検証テスト

#### sub2 実装作成（GREEN）✓
@target: `autoload/hellshake_yano_vim/core.vim` 拡張
- [x] `hellshake_yano_vim#core#show()` 統合実行関数
  1. 固定座標取得
  2. ヒント生成
  3. ヒント表示
  4. ヒントマップ作成
  5. 入力処理開始
- [x] `hellshake_yano_vim#core#hide()` クリーンアップ関数
  1. 入力処理停止
  2. 全 popup 削除
  3. 状態リセット

### process8 エントリーポイント作成 ✓
@target: `plugin/hellshake-yano-vim.vim`
- [x] ロードガード `g:loaded_hellshake_yano_vim`
- [x] `:HellshakeYanoVimTest` テストコマンド定義
  - `tests-vim/hellshake_yano_vim/test_runner.vim` を source
  - `RunAllTests()` を実行
- [x] `:HellshakeYanoVimShow` コマンド定義
  - `hellshake_yano_vim#core#show()` を呼び出し
- [x] `:HellshakeYanoVimHide` コマンド定義
  - `hellshake_yano_vim#core#hide()` を呼び出し

### process10 ユニットテスト ✓
@target: `tests-vim/hellshake_yano_vim/`
- [x] 全テストファイルの動作確認
- [x] `:HellshakeYanoVimTest` コマンドでテスト実行
- [x] エッジケースの追加テスト
  - バッファが空の場合
  - 1行しかない場合
  - 画面外の座標の場合

### process50 フォローアップ
（実装後に仕様変更が発生した場合、ここに Process を追加）

### process100 リファクタリング ✓
@target: `autoload/hellshake_yano_vim/*.vim`
- [x] コードの重複を排除
  - エラーハンドリング関数の統一（s:show_error, s:show_warning）
  - display.vim, core.vim, input.vim で統一されたエラーメッセージフォーマット
- [x] 関数の責務を明確化
  - 各モジュールの役割を詳細なコメントで記述
  - Public/Private 関数の明確な分離
- [x] エラーハンドリングの統一
  - 全モジュールで統一されたエラーメッセージプレフィックス
  - 詳細なエラー情報の提供
- [x] スクリプトローカル変数の適切な管理
  - s:popup_ids, s:hint_map, s:state の適切な管理
  - 初期化とクリーンアップの明確化
- [x] コメントの整備
  - 各関数の目的、機能、パラメータ、戻り値を詳細に記述
  - 使用例とエラーハンドリングの説明を追加
  - 将来の拡張計画（Phase A-2, A-3）の明記

### process200 ドキュメンテーション ✓
@target: `ARCHITECTURE.md`, `README.md`
- [x] ARCHITECTURE.md の Phase A-1 実装状況を更新
  - 完了マーク（✅）の追加
  - 達成した機能の一覧化
  - 技術的な特徴の記述
  - リファクタリング成果の記録
- [x] README.md に MVP の使い方を追記
  - Pure VimScript MVP セクションの追加
  - 機能、要件、コマンド、使用例の記述
  - アーキテクチャ図とテスト方法の追加
  - 現在の制限事項とロードマップの明記
- [x] コード内コメントの充実
  - 各モジュールの役割を詳細に記述
  - 主要な関数の目的、アルゴリズム、エラーハンドリングを説明
  - 将来の拡張性を考慮したコメント

## 成果物

### ファイル構成
```
plugin/
└── hellshake-yano-vim.vim          # エントリーポイント（新規作成）

autoload/hellshake_yano_vim/        # 新しい名前空間（既存の hellshake_yano とは分離）
├── core.vim                         # 状態管理・統合処理
├── hint_generator.vim               # ヒント生成
├── display.vim                      # Popup/Extmark 表示
├── input.vim                        # 入力処理
└── jump.vim                         # ジャンプ実行

tests-vim/hellshake_yano_vim/       # VimScript テスト用（deno test と分離）
├── test_runner.vim                  # テスト実行フレームワーク
├── test_core.vim                    # コア機能テスト
├── test_hint_generator.vim          # ヒント生成テスト
├── test_display.vim                 # 表示テスト
├── test_jump.vim                    # ジャンプテスト
├── test_input.vim                   # 入力処理テスト
└── test_integration.vim             # 統合テスト
```

## テスト実行方法
```vim
" Vim/Neovim で実行
:source plugin/hellshake-yano-vim.vim
:HellshakeYanoVimTest

" または直接テストランナーを実行
:source tests-vim/hellshake_yano_vim/test_runner.vim
:call RunAllTests()
```

## 手動テスト手順
1. Vim/Neovim で任意のファイルを開く（10行以上推奨）
2. カーソルを 10 行目に移動
3. `:HellshakeYanoVimShow` を実行
4. 7, 10, 13 行目にヒント（a, s, d）が表示される
5. 'a' を入力 → 7 行目にジャンプ
6. ヒントが自動的に消える

## 技術的なポイント
- **両エディタ対応**: Vim 8.0+ の `popup_create()` と Neovim の `nvim_buf_set_extmark()` の両対応
- **非同期入力**: `timer_start()` による非ブロッキング処理
- **入力チェック**: `getchar(1)` による非ブロッキング入力チェック（10ms 間隔）
- **状態管理**: スクリプトローカル変数 `s:state` への集約
- **名前空間分離**: 既存の `hellshake_yano` (denops) と新しい `hellshake_yano_vim` (pure VimScript) を分離
- **テスト分離**: deno test と VimScript test を別ディレクトリで管理（`tests/` vs `tests-vim/`）

## 次のステップ（Phase A-2 への準備）
- 固定座標 → 単語検出への拡張
- `word_detector.vim` モジュールの追加
- `matchstrpos()` による効率的な単語検出
- 画面内限定（`line('w0')` ～ `line('w$')`）

