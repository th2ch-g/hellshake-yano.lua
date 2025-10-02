# title: denopsディレクトリのコード削減（50%目標）

## 概要
- denopsディレクトリ配下のTypeScriptコードを機能を維持したまま50%削減し、保守性とパフォーマンスを向上させる

### goal
- コード量を15,256行から約7,600行まで削減
- 機能の完全維持
- パフォーマンスの向上
- 保守性の改善

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 後方互換性を完全に維持すること
- 既存の機能を損なわないこと
- テストカバレッジを維持・向上させること

## 開発のゴール
- denopsディレクトリを約50%削減（15,256行→約7,600行）
- 重複コードの完全削除によるDRY原則の実現
- モジュール分割による責務の明確化
- TypeScript/Denopsの最新機能を活用した簡潔な実装

## 実装仕様

### 現状分析
| ファイル | 現在の行数 | 削減目標 | 削減率 |
|---------|-----------|----------|--------|
| core.ts | 4,699 | 2,000 | 57% |
| word.ts | 4,923 | 2,000 | 59% |
| hint.ts | 1,926 | 500 | 74% |
| config.ts | 623 | 300 | 52% |
| cache.ts | 488 | 300 | 39% |
| その他 | 2,597 | 2,500 | 4% |
| **合計** | **15,256** | **7,600** | **50%** |

### リファクタリング戦略

#### フェーズ1: Quick Wins（1-2日）
- 過度なJSDocコメントの削減（約1,500行）
- デバッグコード・console.log削除（約150行）
- 非推奨・デッドコード削除（約350行）
- 重複バリデーション統合（約500行）

#### フェーズ2: モジュール分割（3-4日）
- word.ts → 複数モジュールへ分割
- core.ts → 機能別モジュール化
- hint.ts → Strategy パターン適用

#### フェーズ3: アーキテクチャ改善（3-4日）
- デザインパターン適用
- 外部設定ファイル化
- TypeScript最新機能活用

## 生成AIの学習用コンテキスト

### 既存ファイル
- `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/*.ts`
  - 主要5ファイル（core.ts, word.ts, hint.ts, config.ts, cache.ts）の詳細分析

### 設計原則
- 単一責任原則：各モジュールは1つの責務のみを持つ
- DRY原則：重複コードを削除
- SOLID原則：オブジェクト指向設計原則の適用
- 関数型プログラミング：純粋関数とイミュータブルデータ構造の活用

## Process

### process1: Quick Wins実装（即座に削減可能）
#### sub1: コメント最適化
@target: denops/hellshake-yano/*.ts
@ref: 現在のJSDocコメント構造
- [x] 過度に詳細なJSDocを1-2行に簡潔化（370行削減達成、コメント353行削減）
  - @param, @returns, @throws のみ残す
- [x] @exampleセクションを削除（README移動は次フェーズ推奨）
- [x] 不要な@since, @see タグを削除

#### sub2: デバッグコード削除
@target: denops/hellshake-yano/*.ts
- [x] console.log/warn/errorを削除（85箇所、約150行）
- [x] デバッグ専用モジュール（debug.ts）を作成
- [x] 条件付きログ出力に統一

#### sub3: デッドコード削除
@target: denops/hellshake-yano/core.ts
- [x] 非推奨型定義の削除（15行削除、重複関数160行削除含む、計175行削減）
- [x] 未使用のpluginState削除（該当なし、既にクリーン）
- [x] コメントアウトコードの削除（該当なし、既にクリーン）

#### sub4: バリデーション統合
@target: denops/hellshake-yano/validation-utils.ts（新規）
@ref: core.ts, config.ts, hint.ts のバリデーション関数
- [x] 共通バリデーションモジュールを作成（validation-utils.ts、205行）
- [x] 重複するバリデーション関数を統合（121行実質削減達成）
- [x] 汎用的な型ガード関数を実装（9関数追加）

### process2: モジュール分割と最適化
#### sub1: word.ts分割（4,923行 → 2,000行）
@target: denops/hellshake-yano/word/
- [ ] word-char-utils.ts作成（文字種判定、400行）
- [ ] word-segmenter.ts作成（TinySegmenter、600行）
- [ ] word-detector-strategies.ts作成（Detector戦略、500行）
- [ ] word-cache.ts移動（キャッシュ処理、200行）
- [ ] 重複コード削除により約1,900行削減

#### sub2: core.ts分割（4,699行 → 2,000行）
@target: denops/hellshake-yano/core/
- [ ] core-dictionary.ts作成（辞書機能、300行）
- [ ] core-motion.ts作成（モーション処理、250行）
- [ ] core-validation.ts移動（バリデーション、400行）
- [ ] 重複削除により約1,700行削減

#### sub3: hint.ts最適化（1,926行 → 500行）
@target: denops/hellshake-yano/hint/
- [ ] hint-display.ts作成（表示幅計算、200行）
- [ ] hint-generator-strategies.ts作成（生成戦略、300行）
- [ ] hint-overlap.ts作成（オーバーラップ検出、400行）
- [ ] Strategy パターン適用により約700行削減

### process3: アーキテクチャ改善
#### sub1: デザインパターン適用
@target: denops/hellshake-yano/**/*.ts
- [ ] Strategy パターンでヒント生成を簡潔化（400行削減）
- [ ] Template Method パターンで単語検出を統一（300行削減）
- [ ] Factory パターンでオブジェクト生成を集約（200行削減）
- [ ] deno checkで型安全性向上
- [ ] deno testでテスト

#### sub2: 外部設定ファイル化
@target: denops/hellshake-yano/config/
- [ ] japanese-patterns.yml作成（日本語パターン定義）
- [ ] hint-keys.yml作成（ヒントキー設定）
- [ ] ハードコード値の外部化により約500行削減
- [ ] deno checkで型安全性向上
- [ ] deno testでテスト

#### sub3: TypeScript最新機能活用
@target: denops/hellshake-yano/**/*.ts
- [ ] Template Literal Types活用（150行削減）
- [ ] Utility Types（Partial, Required等）活用（100行削減）
- [ ] satisfies演算子で型安全性向上（50行削減）
- [ ] 条件型で複雑な型定義を簡潔化（100行削減）
- [ ] deno checkで型安全性向上
- [ ] deno testでテスト

### process4: テストと検証
@target: denops/hellshake-yano/**/*.test.ts
- [ ] 既存テストが全てパスすることを確認
- [ ] リファクタリング前後でのパフォーマンス比較
- [ ] コードカバレッジの維持・向上を確認
- [ ] 後方互換性テストの実施

### process10: ユニットテスト
- [ ] 新規作成モジュールのユニットテスト作成
- [ ] カバレッジ90%以上を目標

### process50: フォローアップ
- [ ] パフォーマンスボトルネックの特定と最適化
- [ ] 追加の重複コード削除
- [ ] エラーハンドリングの統一化

### process100: リファクタリング
- [ ] 依存関係の整理と循環参照の解消
- [ ] インターフェースの統一と簡潔化
- [ ] 非同期処理の最適化

### process200: ドキュメンテーション
- [ ] README.mdに新モジュール構成を記載
- [ ] APIドキュメントの生成（TypeDoc）
- [ ] 移行ガイドの作成
- [ ] パフォーマンス改善レポートの作成

## 期待される成果

### 定量的成果
- コード行数: 15,256行 → 約7,600行（50%削減）
- ファイル数: 適切に分割され管理しやすい構成
- パフォーマンス: 起動時間とメモリ使用量の改善

### 定性的成果
- 保守性の大幅な向上
- テスタビリティの改善
- 新機能追加の容易化
- コードの可読性向上

## リスクと対策

### リスク
1. 大規模リファクタリングによる不具合の混入
2. 後方互換性の破壊
3. パフォーマンスの劣化

### 対策
1. 段階的な実装とテスト
2. 包括的な互換性テストスイート
3. ベンチマークによる定量的評価

## スケジュール

- **フェーズ1**: 1-2日（即座に実行可能）
- **フェーズ2**: 3-4日（慎重な設計と実装）
- **フェーズ3**: 3-4日（アーキテクチャ改善）
- **テスト・検証**: 2日
- **合計**: 約10-12日

## 備考

このPLAN.mdは、前回完了したVimScriptモジュール分割プロジェクト（73%削減達成）に続く、TypeScript/Denopsコードの最適化プロジェクトです。VimScript側の最適化で得られた知見を活かし、TypeScript側でも同様の成果を目指します。

