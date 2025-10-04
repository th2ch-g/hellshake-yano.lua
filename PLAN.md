# title: autoload配下のコード量50%削減

## 概要
- 機能を完全に保持しながら、autoload/hellshake_yano配下のVimScriptコードを現在の1921行から約960行（50%削減）に最適化する
- 重複コード、後方互換性ラッパー層、ボイラープレート、冗長なコメントを削減し、コードの保守性と可読性を向上させる

### goal
- 開発者がコードを理解しやすくなり、メンテナンスコストが半減する
- 機能は一切損なわず、既存のテストがすべて通過する
- ファイル数を15から10程度に統合し、関数の重複を排除する

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 機能を一切変更せず、既存の動作を完全に保持すること
- プラグインの公開APIは維持すること（後方互換性は内部実装のみ削除）

## 開発のゴール
- 1921行から960行への削減（約961行削除）
- 重複コードの統合による保守性向上
- ファイル構成の最適化によるコードナビゲーション改善

## 実装仕様

### 現状分析
**合計行数**: 1921行
**目標行数**: ~960行
**削減必要**: 約961行（50%削減）

#### ファイル別行数
```
hellshake_yano.vim      256行  ★ラッパー層のみ
motion.vim              243行  ★重複コード多数
command.vim             204行  ★機能分散
highlight.vim           185行  ★validation重複
debug.vim               163行
hint.vim                125行  ★motion.vimと重複
config.vim              113行
validation.vim          107行
state.vim               106行
plugin.vim               93行
count.vim                78行
mapping.vim              77行
timer.vim                73行
utils.vim                68行
denops.vim               30行
```

### 削減可能箇所の特定

#### 1. ラッパー層の完全削除 (~200行)
- `hellshake_yano.vim` はほぼ全体が後方互換性のためのラッパー関数
- 各モジュールへの単純な委譲のみで実装なし
- テスト用デバッグ関数（228-252行）も含む

#### 2. 重複コードの統合 (~280行)
- **motion.vim**: `process()` と `with_key_context()` が95%同一（~80行重複）
- **command.vim**: `s:get_motion_keys()` が config.vim と重複（~30行）
- **highlight.vim**: validation関数が validation.vim と完全重複（~70行）
- **hint.vim**: キーリピート検出が motion.vim と重複（~30行）
- 各ファイルの `s:bufnr()` などヘルパー関数重複（~70行）

#### 3. 定型文・ボイラープレートの削除 (~200行)
- 各ファイルの冒頭コメントブロック（10行×15 = 150行）
- 保存と復元のcpo処理（4行×15 = 60行）

#### 4. コメント・空行の最適化 (~150行)
- セクション区切りコメント（~50行）
- 詳細説明コメントの簡潔化（~100行）

#### 5. インライン化・簡素化 (~130行)
- 1-2行の単純関数のインライン化
- デバッグ関数の条件付き分離

**合計削減可能**: 約960行

## 生成AIの学習用コンテキスト

### 削減対象ファイル
- autoload/hellshake_yano.vim (256行)
  - 後方互換性ラッパー関数を全削除
- autoload/hellshake_yano/motion.vim (243行)
  - 重複する2つの関数を統合
- autoload/hellshake_yano/command.vim (204行)
  - 機能を config.vim/mapping.vim に移動して削除
- autoload/hellshake_yano/highlight.vim (185行)
  - validation関数を削除
- autoload/hellshake_yano/hint.vim (125行)
  - キーリピート検出を削除

### 参照ファイル
- autoload/hellshake_yano/utils.vim
  - 共通ユーティリティ関数を集約
- autoload/hellshake_yano/config.vim
  - 設定管理を統合
- autoload/hellshake_yano/validation.vim
  - validation関数を統一利用

## Process

### process1 ラッパー層削除
#### sub1 hellshake_yano.vim のラッパー関数を削除
@target: autoload/hellshake_yano.vim
@ref: plugin/hellshake-yano.vim, test/**/*.vim
- [x] plugin/hellshake-yano.vim で直接モジュール関数を呼ぶよう変更
- [x] テストファイルで直接モジュール関数を呼ぶよう変更
- [x] hellshake_yano.vim のラッパー関数を全削除（35-252行）
- [x] 必要最小限の初期化コードのみ残す

#### sub2 テスト用デバッグ関数の移動
@target: autoload/hellshake_yano/debug.vim
@ref: autoload/hellshake_yano.vim
- [x] テスト用デバッグ関数（228-252行）を debug.vim に移動
- [x] 関数名を `hellshake_yano#debug#*` に変更

### process2 重複コード統合
#### sub1 motion.vim の関数統合
@target: autoload/hellshake_yano/motion.vim
- [x] `process()` と `with_key_context()` を単一の関数に統合
- [x] キーコンテキストをオプション引数として受け取る設計に変更
- [x] 重複するキーリピート検出処理を1つに統合
- [x] 重複するヘルパー関数（s:bufnr, s:get_elapsed_time）を削除し utils.vim を使用

#### sub2 command.vim の機能移動と削除
@target: autoload/hellshake_yano/command.vim
@ref: autoload/hellshake_yano/config.vim, autoload/hellshake_yano/mapping.vim
- [x] `s:get_motion_keys()` を削除し config.vim の関数を使用
- [x] `s:clear_motion_mappings()` を mapping.vim に移動
- [x] コマンド関数を適切なモジュールに再配置
  - `set_count()`, `set_timeout()` → config.vim
  - `set_counted_motions()` → mapping.vim
  - `update_highlight()` → highlight.vim
- [x] command.vim ファイルを削除

#### sub3 highlight.vim の validation関数削除
@target: autoload/hellshake_yano/highlight.vim
@ref: autoload/hellshake_yano/validation.vim
- [x] `validate_group_name()` 関数を削除し validation.vim の関数を使用
- [x] `validate_color_value()` 関数を削除し validation.vim の関数を使用
- [x] `normalize_color_name()` 関数を削除し validation.vim の関数を使用
- [x] 重複する3つの関数を削除（106-183行）

#### sub4 hint.vim のキーリピート検出削除
@target: autoload/hellshake_yano/hint.vim
- [x] `handle_key_repeat_detection()` 関数を削除
- [x] motion.vim の関数を直接使用するよう変更
- [x] 重複コード削除（94-122行）

#### sub5 全ファイルのヘルパー関数統合
@target: autoload/hellshake_yano/*.vim
@ref: autoload/hellshake_yano/utils.vim
- [x] 各ファイルの `s:bufnr()` を削除し utils.vim の関数を使用
- [x] 各ファイルの `s:get_elapsed_time()` を削除し utils.vim の関数を使用
- [x] その他の重複ヘルパー関数を utils.vim に統合

### process3 定型文削減
#### sub1 冒頭コメントブロックの簡略化
@target: autoload/hellshake_yano/*.vim
- [x] 各ファイルの詳細な説明コメント（1-10行）を1-2行に簡略化
- [x] ライセンス情報は残す
- [x] モジュール構成説明は削除

#### sub2 cpoボイラープレート削除
@target: autoload/hellshake_yano/*.vim
- [x] 各ファイルの `let s:save_cpo = &cpo` を削除
- [x] 各ファイルの `set cpo&vim` を削除
- [x] 各ファイルの `let &cpo = s:save_cpo` を削除
- [x] 各ファイルの `unlet s:save_cpo` を削除

### process4 コメント最適化
#### sub1 セクション区切りコメント削除
@target: autoload/hellshake_yano/*.vim
- [x] `=============` で囲まれたセクション区切りを削除
- [x] 必要に応じて簡潔な1行コメントに置き換え

#### sub2 関数説明コメントの簡潔化
@target: autoload/hellshake_yano/*.vim
- [x] 複数行の関数説明コメントを1行に簡潔化
- [x] パラメータ・戻り値の詳細説明は削除
- [x] 重要な注意事項のみ残す

### process5 関数インライン化
#### sub1 単純関数のインライン展開
@target: autoload/hellshake_yano/*.vim
- [x] 1-2行の単純なラッパー関数を特定
- [x] 呼び出し元に直接コードを展開
- [x] 不要になった関数定義を削除

#### sub2 デバッグ関数の整理
@target: autoload/hellshake_yano/debug.vim
- [x] 冗長なデバッグ情報収集を簡略化
- [x] 重複する情報表示を統合

### process10 ユニットテスト
@target: test/**/*.vim
- [x] 既存のテストがすべて通過することを確認
- [x] 削除した内部関数の直接呼び出しを修正
- [x] 公開APIが変更されていないことを確認
- [ ] パフォーマンステスト（コード量削減の確認）

### process50 フォローアップ
- フィードバックに基づく追加の最適化

### process100 リファクタリング
- [ ] 削減後のコードレビュー
- [ ] さらなる最適化の余地を検討
- [ ] コード品質の最終確認

### process200 ドキュメンテーション
- [ ] README.md の更新（コード量削減について）
- [ ] CHANGELOG.md への記載
- [ ] コミットメッセージの作成（"refactor: reduce autoload code by 50% without feature changes"）

