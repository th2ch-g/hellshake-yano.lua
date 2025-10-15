# title: Vim/Neovim両対応ヒント表示・ジャンプ機能

## 概要
- hellshake-yano.vimプラグインにVim/Neovim両対応のヒント表示とジャンプ機能を実装し、Denopsに依存しながらもVim 8.2以降でも動作する互換性の高いプラグインを実現する

### goal
- VimとNeovimの両方でヒント表示が正しく動作する
- マーカーをキーボードで選択してジャンプできる
- 連続ジャンプモードで効率的な移動が可能
- 日本語を含む文書でも正しく動作する

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- git add, git commitの実行は、ユーザに実行の許可を得ること
- 既存のDenops実装を活かしながら改良する（Option A採用）

## 開発のゴール
- vim-searchxのようなVim/Neovim互換性を実現する
- 既存のDenops実装を活かしながら、Vimのprop APIとpopup機能を完全サポート
- パフォーマンスを維持しながら互換性を向上させる

## 実装仕様

### Vim/Neovim互換性の実現方法（vim-searchx調査結果）
- **VimScript条件分岐**: `has('nvim')`でVim/Neovim判定
- **Neovim**: `nvim_buf_set_extmark()`でマーカー表示
- **Vim 8.2+**: `prop_add()`と`popup_create()`でオーバーレイ表示
- **Vim旧版**: `matchadd()`でフォールバック

### 現在のhellshake-yano実装状況
- Denops（TypeScript）ベースの実装
- display.ts内にVim/Neovim分岐ロジック実装済み
- Neovim: extmark対応済み
- Vim: matchadd()フォールバック実装済み（prop API未完全）

## 生成AIの学習用コンテキスト

### 参考実装
- `/tmp/vim-searchx/autoload/searchx/highlight.vim`
  - Vim/Neovim両対応のハイライト実装パターン
  - prop_type_add/popup_createの使用例

### 現在の実装
- `denops/hellshake-yano/display.ts`
  - processExtmarksBatched(): Neovim実装
  - processMatchaddBatched(): Vim実装（改良対象）
- `plugin/hellshake-yano.vim`
  - ハイライトグループ定義と設定管理
- `autoload/hellshake_yano/hint.vim`
  - VimScriptヘルパー関数

## Process

### process1 Vim prop API対応強化
#### sub1 prop_type_add/prop_add実装改善
@target: denops/hellshake-yano/display.ts
@ref: /tmp/vim-searchx/autoload/searchx/highlight.vim
- [ ] processMatchaddBatched()関数でprop_type_add正しく初期化
- [ ] prop_add()でマーカー位置を設定
- [ ] popup_create()でオーバーレイ表示を実装
- [ ] 日本語文字幅の考慮（マルチバイト文字対応）

#### sub2 エラーハンドリング改善
@target: denops/hellshake-yano/display.ts
- [ ] Vim版バージョン確認ロジック追加
- [ ] prop API存在チェック強化
- [ ] フォールバック処理の改善

### process2 VimScriptヘルパー関数追加
#### sub1 互換性レイヤーの作成
@target: autoload/hellshake_yano/compat.vim（新規作成）
- [ ] has_prop_support()関数: prop APIサポート確認
- [ ] create_marker_prop()関数: prop作成ラッパー
- [ ] create_marker_popup()関数: popup作成ラッパー
- [ ] clear_all_props()関数: prop削除ラッパー
- deno checkでの型チェック
- deno testでのユニットテスト

#### sub2 既存関数との統合
@target: autoload/hellshake_yano/hint.vim
@ref: autoload/hellshake_yano/compat.vim
- [ ] compat.vimの関数をhint.vimから呼び出し
- [ ] Denops側との連携強化
- deno checkでの型チェック
- deno testでのユニットテスト

### process3 ジャンプ機能実装
#### sub1 入力待機処理
@target: denops/hellshake-yano/core.ts
@ref: /tmp/vim-searchx/autoload/searchx.vim
- [ ] getchar()を使用した入力待機実装
- [ ] timer_start()での非同期処理
- [ ] マーカー選択ロジック
- deno checkでの型チェック
- deno testでのユニットテスト

#### sub2 カーソル移動とスクロール
@target: denops/hellshake-yano/core.ts
@ref: /tmp/vim-searchx/autoload/searchx/cursor.vim
- [ ] cursor()関数でのジャンプ実装
- [ ] スクロール位置の調整（scrolloff考慮）
- [ ] アニメーション対応（オプション）
- deno checkでの型チェック
- deno testでのユニットテスト

### process4 連続ジャンプモード
#### sub1 連続ヒントモード実装
@target: denops/hellshake-yano/core.ts
@ref: PLAN.mdの連続ヒント機能仕様
- [ ] continuousHintMode設定の実装
- [ ] ジャンプ後の自動ヒント再表示
- [ ] recenterCommand実行（zz等）
- [ ] maxContinuousJumps制限
- deno checkでの型チェック
- deno testでのユニットテスト

### process10 ユニットテスト
#### sub1 Vim/Neovim両環境テスト
@target: tests/vim_neovim_compat_test.ts（新規作成）
- [ ] Vimでのprop API動作確認テスト
- [ ] Neovimでのextmark動作確認テスト
- [ ] フォールバック動作テスト
- deno checkでの型チェック
- deno testでのユニットテスト

#### sub2 ジャンプ機能テスト
@target: tests/jump_functionality_test.ts（新規作成）
- [ ] マーカー選択テスト
- [ ] カーソル移動精度テスト
- [ ] 連続ジャンプモードテスト
- deno checkでの型チェック
- deno testでのユニットテスト

### process50 フォローアップ
（実装後に発生した問題や改善点を記録）

### process100 リファクタリング
- [ ] display.ts内の重複コード削除
- [ ] TypeScript/VimScript間の責務整理
- [ ] パフォーマンス最適化

### process200 ドキュメンテーション
- [ ] README.mdにVim/Neovim互換性の記載追加
- [ ] 必要なVimバージョン（8.2以降）の明記
- [ ] prop APIとmatchadd()の違いの説明
- [ ] 連続ジャンプモードの使用方法追加

