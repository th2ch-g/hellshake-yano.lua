# title: v3.0.0 後方互換性の完全削除とコードベースの最新化

## 概要
- feat/v3ブランチを作成し、すべての後方互換性コードを削除してモダンなTypeScriptコードベースに移行
- snake_case設定サポートの廃止、型エイリアスの削除、クリーンなAPI設計の実現

### goal
- 完全にクリーンなTypeScriptコードベースの実現
- camelCaseのみのAPI提供
- 保守性とパフォーマンスの向上

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 各Processの実装前後で必ず `deno check` と `deno test` を実行すること
- TDDのRed-Green-Refactorサイクルに従うこと

## 開発のゴール
- compatibility.tsの完全削除
- Config型のみを使用（型エイリアス廃止）
- snake_case → camelCase変換機能の削除
- すべてのレガシープロパティサポートの削除

## 実装仕様

### 削除対象の後方互換性コード
- **compatibility.ts**: 208行（完全削除対象）
  - BackwardCompatibleConfig型
  - normalizeBackwardCompatibleFlags関数
  - getMinLengthForKey、getMotionCountForKey関数
  - convertConfigForManager、syncManagerConfig関数
- **config.ts**: 型エイリアスとプロパティ
  - UnifiedConfig、CamelCaseConfig、ModernConfig型エイリアス
  - useImprovedDetectionプロパティ
- **main.ts**: 約20箇所の互換性コード
  - normalizeBackwardCompatibleFlags呼び出し（87行目、313行目）
  - 後方互換性エクスポート（418-427行目）
- **core.ts**: 2箇所の互換性参照
- **word.ts**: 後方互換性の再エクスポート

### 破壊的変更
- snake_case設定の完全廃止（single_char_keys → singleCharKeys等）
- 型エイリアスの廃止（UnifiedConfig → Config）
- 互換性関数の削除

## 生成AIの学習用コンテキスト
### 削除対象ファイル
- denops/hellshake-yano/compatibility.ts
  - 完全削除予定（後方互換性処理）

### 修正対象ファイル
- denops/hellshake-yano/main.ts
  - normalizeBackwardCompatibleFlags削除
  - 後方互換性エクスポート削除
- denops/hellshake-yano/config.ts
  - 型エイリアス削除
  - 後方互換性プロパティ削除
- denops/hellshake-yano/core.ts
  - normalizeBackwardCompatibleFlags参照削除
- denops/hellshake-yano/word.ts
  - 後方互換性エクスポート削除

### テストファイル
- tests/config_renaming_test.ts
  - 削除予定（snake_case変換テスト）
- tests/legacy_behavior_test.ts
  - 削除予定（レガシー動作テスト）

## Process

### process5 v3.0.0 準備とブランチ作成
@target: .git/
@ref: PLAN.md

#### sub1 feat/v3ブランチの作成
- [x] 現在のmainブランチの状態を確認
- [x] `git checkout -b feat/v3`でブランチ作成
- [x] 初期状態のテスト実行（ベースライン確立）
  - [x] `deno check`で型チェック
  - [x] `deno test -A`で全テスト実行

#### sub2 v3.0.0移行計画の文書化
- [x] MIGRATION_v3.mdの作成
- [x] 破壊的変更のリスト作成
- [x] 移行ガイドの記述

### process6 main.tsのリファクタリング
@target: denops/hellshake-yano/main.ts
@ref: denops/hellshake-yano/compatibility.ts, denops/hellshake-yano/config.ts

#### sub1 normalizeBackwardCompatibleFlags削除
- [x] 87行目のnormalizeBackwardCompatibleFlags呼び出しを削除
- [x] 313行目のnormalizeBackwardCompatibleFlags呼び出しを削除
- [x] userConfigの直接使用に変更
- [x] `deno check`で型チェック
- [x] `deno test -A`でテスト実行

#### sub2 compatibility.tsインポートの削除
- [ ] 28-32行目のcompatibility.tsからのインポート削除
- [ ] 65行目の関数エクスポート削除
- [ ] syncManagerConfig呼び出し（129行目、317行目）を削除
- [ ] `deno check`で型チェック
- [ ] `deno test -A`でテスト実行

#### sub3 後方互換性エクスポートの削除
- [ ] 418-427行目の後方互換性エクスポート削除
- [ ] 69-70行目の後方互換性コメントとエクスポート削除
- [ ] 11-14行目の後方互換性コメントと再エクスポート削除
- [ ] `deno check`で型チェック
- [ ] `deno test -A`でテスト実行

### process7 compatibility.ts削除とcore.ts修正
@target: denops/hellshake-yano/compatibility.ts, denops/hellshake-yano/core.ts
@ref: denops/hellshake-yano/main.ts

#### sub1 core.tsの互換性コード削除
- [ ] 3209行目のnormalizeBackwardCompatibleFlags呼び出し削除
- [ ] 3412行目のprivateメソッドnormalizeBackwardCompatibleFlags削除
- [ ] 直接configオブジェクトを使用するように変更
- [ ] `deno check`で型チェック
- [ ] `deno test -A`でテスト実行

#### sub2 compatibility.tsファイルの削除
- [ ] `rm denops/hellshake-yano/compatibility.ts`実行
- [ ] インポートエラーが発生しないことを確認
- [ ] `deno check`で型チェック
- [ ] `deno test -A`でテスト実行

### process8 config.tsとword.tsのクリーンアップ
@target: denops/hellshake-yano/config.ts, denops/hellshake-yano/word.ts
@ref: denops/hellshake-yano/types.ts

#### sub1 config.tsの型エイリアス削除
- [ ] 174-176行目の型エイリアス（UnifiedConfig, CamelCaseConfig, ModernConfig）削除
- [ ] 158-159行目のuseImprovedDetectionプロパティ削除
- [ ] 32-33行目のHighlightColor再エクスポート削除
- [ ] `deno check`で型チェック
- [ ] `deno test -A`でテスト実行

#### sub2 word.tsの後方互換性コード削除
- [ ] 6145-6146行目の後方互換性再エクスポート削除
- [ ] 必要に応じて直接インポートに変更
- [ ] `deno check`で型チェック
- [ ] `deno test -A`でテスト実行

### process9 テストファイルの更新
@target: tests/
@ref: denops/hellshake-yano/config.ts

#### sub1 互換性テストの削除
- [ ] tests/config_renaming_test.ts削除
- [ ] tests/legacy_behavior_test.ts削除
- [ ] 関連するテストの依存関係を確認
- [ ] `deno check`で型チェック
- [ ] `deno test -A`でテスト実行

#### sub2 v3.0.0用テストの作成
- [ ] tests/v3_migration_test.tsの作成
- [ ] Config型のみ使用していることの確認テスト
- [ ] camelCaseプロパティのみ受け入れることの確認テスト
- [ ] `deno check`で型チェック
- [ ] `deno test -A`でテスト実行

### process10 ユニットテスト
@target: tests/

#### sub1 全プロセス完了後の総合テスト
- [ ] `deno check`で型チェック（エラーゼロの確認）
- [ ] `deno test -A`で全テスト実行
- [ ] リグレッションテストの実施
- [ ] パフォーマンステスト
- [ ] `deno check`で型チェック
- [ ] `deno test -A`でテスト実行

#### sub2 v3.0.0動作確認
- [ ] snake_case設定でエラーになることを確認
- [ ] camelCase設定で正常動作することを確認
- [ ] Config型のみが使用可能なことを確認
- [ ] `deno check`で型チェック
- [ ] `deno test -A`でテスト実行

### process50 フォローアップ
実装後に仕様変更などが発生した場合は、ここにProcessを追加する

### process100 リファクタリング
@target: denops/hellshake-yano/

#### sub1 コードクリーンアップ
- [ ] 不要なコメントの削除
- [ ] 型定義の整理
- [ ] import文の最適化
- [ ] `deno check`で型チェック
- [ ] `deno test -A`でテスト実行

#### sub2 パフォーマンス最適化
- [ ] 新APIのパフォーマンス測定
- [ ] ボトルネックの特定と改善
- [ ] メモリ使用量の確認
- [ ] `deno check`で型チェック
- [ ] `deno test -A`でテスト実行

### process200 ドキュメンテーション
@target: README.md, CHANGELOG.md, docs/

#### sub1 CHANGELOG.mdの更新
- [ ] v3.0.0の破壊的変更を記録
- [ ] 削除された機能のリスト作成
- [ ] 新しいAPI仕様の記載
- [ ] マイグレーションガイドへのリンク追加

#### sub2 MIGRATION_v3.mdの作成
- [ ] snake_caseからcamelCaseへの移行ガイド
- [ ] 削除された型の代替案
- [ ] 具体的なコード例の提供
- [ ] トラブルシューティングセクション

#### sub3 README.mdの更新
- [ ] v3.0.0の新機能と変更点
- [ ] インストール方法の更新
- [ ] 設定例の更新（camelCaseのみ）
- [ ] 削除された機能の明記
