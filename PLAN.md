# title: Unified単語の削除とシンプルな命名への移行

## 概要
- v2となった現在、統合を意味する「Unified」という単語が不要となったため、システム全体から削除してシンプルな命名に移行する

### goal
- コードベース全体がより簡潔で明確な命名規則に統一される
- 「UnifiedConfig」→「Config」、「UnifiedCache」→「GlobalCache」のようにシンプルな名前になる

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 後方互換性を維持しながら段階的に移行する
- すべてのテストが通ることを確認する

## 開発のゴール
- 「Unified」という不要な単語をコードベース全体から削除
- より意味が明確でシンプルな命名に変更
- v2として適切な命名規則の確立

## 実装仕様

### 現状の問題
1. **UnifiedConfigの使用箇所**
   - 31個のファイルで使用
   - config.ts、types.ts、main.tsなどコア実装
   - 16個のテストファイル
   - ドキュメント類

2. **UnifiedCacheの使用箇所**
   - cache.ts、word.ts、hint.tsで使用
   - シングルトンパターンのキャッシュシステム

### 解決方針
1. 型エイリアスを活用した段階的移行
2. UnifiedConfig → Config への置き換え
3. UnifiedCache → GlobalCache への名称変更
4. 関連する関数名の更新

## 生成AIの学習用コンテキスト

### Core実装ファイル
- `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/config.ts`
  - UnifiedConfig インターフェースの定義
  - getDefaultUnifiedConfig、validateUnifiedConfig 関数

- `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/cache.ts`
  - UnifiedCache クラスの定義
  - getInstance メソッド

- `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/main.ts`
  - UnifiedConfig の使用箇所多数
  - normalizeBackwardCompatibleFlagsUnified 関数

- `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/types.ts`
  - UnifiedConfig のインポートと型参照

- `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/word.ts`
  - UnifiedCache の使用

- `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/hint.ts`
  - UnifiedCache の使用

## Process

### process1 型名・インターフェース名の変更
#### sub1 UnifiedConfig → Config への置き換え
@target: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/config.ts`
@ref: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/types.ts`
- [x] UnifiedConfig インターフェース名を Config に変更
- [x] 既存の type Config = UnifiedConfig エイリアスを削除
- [x] type UnifiedConfig = Config として後方互換性エイリアスを追加（一時的）

#### sub2 関数名の更新
@target: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/config.ts`
- [x] getDefaultUnifiedConfig() → getDefaultConfig() に変更
- [x] validateUnifiedConfig() → validateConfig() に変更
- [x] エクスポートの更新

#### sub3 main.tsの更新
@target: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/main.ts`
- [ ] UnifiedConfig の型参照を Config に変更
- [ ] normalizeBackwardCompatibleFlagsUnified() → normalizeBackwardCompatibleFlags() に変更
- [ ] 関数呼び出しの更新（getDefaultUnifiedConfig → getDefaultConfig など）
- [ ] コメント内の Unified 削除

### process2 UnifiedCache → GlobalCache への変更
#### sub1 cache.tsのクラス名変更
@target: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/cache.ts`
- [x] UnifiedCache クラス名を GlobalCache に変更
- [x] static instance の型を GlobalCache に更新
- [x] getInstance() メソッドの更新
- [x] JSDoc コメントの更新

#### sub2 使用箇所の更新
@target: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/word.ts`
@ref: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/hint.ts`
- [x] word.ts の UnifiedCache インポートと使用箇所を GlobalCache に変更
- [x] hint.ts の UnifiedCache インポートと使用箇所を GlobalCache に変更
- [x] unifiedCache 変数名を globalCache に変更

### process3 types.tsの更新
@target: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/types.ts`
- [ ] UnifiedConfig のインポートを Config に変更
- [ ] 型参照の更新
- [ ] コメント内の Unified 削除

### process4 テストファイルの更新
@target: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/tests/`
- [ ] 全テストファイルの UnifiedConfig インポートを Config に変更
- [ ] 全テストファイルの UnifiedCache インポートを GlobalCache に変更
- [ ] 型参照と関数呼び出しの更新
- [ ] deno test で全テストが通ることを確認

### process10 ユニットテスト
- [ ] deno check で型チェック実行
- [ ] deno test で全テスト実行
- [ ] 既存の統合テストが通ることを確認
- [ ] 後方互換性の動作確認

### process50 フォローアップ
#### sub1 後方互換性エイリアスの削除（将来的に）
@target: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/config.ts`
- [ ] type UnifiedConfig = Config エイリアスの削除（v3.0.0で）
- [ ] 移行ガイドの更新

### process100 リファクタリング
- [ ] 不要なコメントの削除
- [ ] 型定義の整理
- [ ] import文の最適化

### process200 ドキュメンテーション
- [ ] MIGRATION.md の更新（UnifiedConfig → Config への移行方法）
- [ ] README.md の更新
- [ ] README_ja.md の更新
- [ ] JSDoc コメント内の Unified 削除
- [ ] 変更履歴の記録

