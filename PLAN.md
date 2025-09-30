# title: Deprecatedメソッドの段階的削除とAPIクリーンアップ

## 概要
- コードベース内のdeprecatedメソッドを段階的に新APIへ移行し、技術的負債を削減
- すべてのdeprecatedメソッドは現在も使用されているため、後方互換性を維持しながら段階的に削除

### goal
- 後方互換性を保ちながら、クリーンなAPIに移行する
- 依存関係を解消し、保守性の高いコードベースを実現する
- v3.0.0でのメジャーバージョンアップに向けた準備

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 各Phaseの完了後に必ずテストを実行すること
- 後方互換性を破壊しない（Phase 4除く）

## 開発のゴール
- deprecatedメソッドの完全な削除
- 新APIへの完全移行
- 型定義のクリーンアップ
- ドキュメントの更新

## 実装仕様

### 調査結果サマリー
- **@deprecated関数**: 8個
- **@deprecated型/インターフェース**: 3個以上
- **@deprecatedエイリアス/定数**: 1個
- **完全未使用**: 0個（すべて使用されている）
- **削除可能（依存解消後）**: 全て

### 段階的移行の必要性
すべてのdeprecatedメソッドが何らかの形で使用されているため、即座の削除は不可能。
依存関係を解消しながら段階的に移行する必要がある。

## 生成AIの学習用コンテキスト
### TypeScriptソースファイル
- denops/hellshake-yano/main.ts
  - エンドポイント実装、プラグインのエントリーポイント
- denops/hellshake-yano/core.ts
  - コア機能とフォールバック処理
- denops/hellshake-yano/word.ts
  - 単語検出の中核ロジック
- denops/hellshake-yano/types.ts
  - 型定義
- denops/hellshake-yano/compatibility.ts
  - 後方互換性処理

### テストファイル
- tests/*.test.ts
  - 各機能のユニットテスト

## Process

### process1 Phase 1: 低影響の置き換え
@target: denops/hellshake-yano/main.ts, denops/hellshake-yano/core.ts
@ref: denops/hellshake-yano/types.ts

#### sub1 UnifiedCache → GlobalCache への置き換え
- [ ] main.tsの `UnifiedCache` 使用箇所を `GlobalCache` に置き換え（2箇所）
- [ ] core.tsの `UnifiedCache` 使用箇所を確認
- [ ] 型定義の更新確認

#### sub2 getStatistics() → getStats() への置き換え
- [ ] main.tsの `getStatistics()` 呼び出しを `getStats()` に置き換え（2箇所）
- [ ] 戻り値の型が互換性あることを確認
- [ ] テストケースの更新

### process2 Phase 2: 中程度の影響（extractWords系）
@target: denops/hellshake-yano/word.ts
@ref: denops/hellshake-yano/core.ts

#### sub1 extractWordsFromLineWithConfig の除去
- [ ] `extractWordsFromLineWithConfig` の使用箇所を特定
- [ ] `extractWordsUnified` への移行パスを確認
- [ ] 移行実装

#### sub2 extractWordsFromLineWithEnhancedConfig の除去
- [ ] `extractWordsFromLineWithEnhancedConfig` の使用箇所を特定
- [ ] `extractWordsUnified` への移行
- [ ] パラメータ互換性の確認

### process3 Phase 3: 大きな影響（detectWords系の移行）
@target: denops/hellshake-yano/word.ts, denops/hellshake-yano/core.ts
@ref: denops/hellshake-yano/main.ts

#### sub1 detectWords() → detectWordsWithManager への移行
- [ ] `detectWords()` の全使用箇所を特定
- [ ] 各使用箇所で `detectWordsWithManager` への移行計画を立案
- [ ] 段階的な移行実装
- [ ] 後方互換性の検証

#### sub2 detectWordsWithConfig() → 新API への移行
- [ ] `detectWordsWithConfig()` の使用箇所を特定
- [ ] 新APIの設計確認
- [ ] 移行実装
- [ ] パラメータマッピングの検証

#### sub3 extractWordsFromLine() → extractWordsUnified への移行
- [ ] `extractWordsFromLine()` の全使用箇所を特定
- [ ] `extractWordsUnified` の完全実装を確認
- [ ] 移行実装
- [ ] エッジケースのテスト

### process4 Phase 4: 型定義の削除（v3.0.0）
@target: denops/hellshake-yano/types.ts, denops/hellshake-yano/core.ts
@ref: denops/hellshake-yano/compatibility.ts

#### sub1 CoreConfig型の削除
- [ ] `CoreConfig` の使用箇所を完全に排除
- [ ] 新しい型への完全移行を確認
- [ ] ドキュメントの更新

#### sub2 WordConfig型の削除
- [ ] `WordConfig` の使用箇所を完全に排除
- [ ] 新しい型への完全移行を確認
- [ ] 破壊的変更のドキュメント化

#### sub3 その他のdeprecated型の削除
- [ ] 残りのdeprecated型を特定
- [ ] 影響範囲の調査
- [ ] 削除実装

### process10 ユニットテスト
@target: tests/

#### sub1 Phase 1後のテスト
- [ ] `deno test` を実行し、全テストがパスすることを確認
- [ ] 新しいAPIの動作確認
- [ ] リグレッションテストの実施

#### sub2 Phase 2後のテスト
- [ ] extractWordsUnified の動作確認
- [ ] 既存機能の互換性確認
- [ ] パフォーマンステスト

#### sub3 Phase 3後のテスト
- [ ] detectWordsWithManager の動作確認
- [ ] エンドツーエンドテスト
- [ ] 統合テスト

#### sub4 Phase 4後のテスト（v3.0.0）
- [ ] 全機能の動作確認
- [ ] 破壊的変更の検証
- [ ] マイグレーションガイドのテスト

### process50 フォローアップ
実装後に仕様変更などが発生した場合は、ここにProcessを追加する

### process100 リファクタリング
@target: denops/hellshake-yano/

#### sub1 コードクリーンアップ
- [ ] 不要なコメントの削除
- [ ] 型定義の整理
- [ ] import文の最適化

#### sub2 パフォーマンス最適化
- [ ] 新APIのパフォーマンス測定
- [ ] ボトルネックの特定と改善
- [ ] メモリ使用量の確認

### process200 ドキュメンテーション
@target: README.md, CHANGELOG.md, docs/

#### sub1 CHANGELOG.md の更新
- [ ] Phase 1の変更内容を記録
- [ ] Phase 2の変更内容を記録
- [ ] Phase 3の変更内容を記録
- [ ] Phase 4の破壊的変更を記録（v3.0.0）

#### sub2 マイグレーションガイドの作成
- [ ] v2.x → v3.0.0のマイグレーションガイド作成
- [ ] deprecated API一覧と代替API一覧の作成
- [ ] コード例の追加

#### sub3 API ドキュメントの更新
- [ ] 新APIのドキュメント作成
- [ ] deprecated APIのドキュメント削除
- [ ] 使用例の更新