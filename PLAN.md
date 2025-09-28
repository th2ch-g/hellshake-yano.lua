# title: hellshake-yano.vim v2 - 7ファイル体制への統合

## 概要
- 現在37ファイルのコードベースを7ファイルに統合し、保守性とパフォーマンスを向上
- 後方互換性を考慮せずv2として新規実装
- コード量は15,000行程度を許容（現在19,794行から約24%削減）

### goal
- ファイル構成をシンプルな7ファイル体制に統合
- ディレクトリ構造のフラット化による依存関係の簡素化
- re-exportの完全排除による循環参照リスクの解消

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- バージョン2として後方互換性は不要
- テストが壊れないよう慎重に作業を進める（503/563パス維持）
- 各段階で `deno check` を実行し、型エラーを防ぐ

## 開発のゴール
- 7ファイル体制によるシンプルな構造の実現
- re-exportファイルの完全削除
- 明確な責務分離の維持

## 実装仕様

### 現在の問題点
1. **ファイル数の多さ（37ファイル）**
   - 30ファイルが削除対象
   - re-exportのみのファイルが15個
   - 空のindex.tsファイルが5個

2. **ディレクトリ構造の複雑さ**
   - word/, core/, main/, utils/, hint/等のディレクトリ
   - 実質1-2ファイルしかないディレクトリが多数

3. **re-exportによる依存関係の不明瞭さ**
   - 後方互換性のためのre-exportが多数存在
   - 実際の実装場所が分かりにくい

### 新しいアーキテクチャ（7ファイル体制）
```
denops/hellshake-yano/
├── main.ts      (~1,000行)  # エントリーポイント
├── core.ts      (~4,500行)  # コア機能、API、ライフサイクル
├── hint.ts      (~2,200行)  # ヒント生成と表示
├── word.ts      (~5,000行)  # 単語検出、辞書、セグメンター
├── config.ts    (~1,400行)  # 設定管理
├── cache.ts     (~500行)    # キャッシュ管理
└── types.ts     (~1,100行)  # 型定義
```

## 生成AIの学習用コンテキスト

### 削除対象ファイル分析
- **word/ディレクトリ（5ファイル、2,718行）**
  - word.tsに統合予定
  - manager.ts, context.ts, dictionary.ts, dictionary-loader.ts, detector.ts

- **re-exportのみファイル（15ファイル、約200行）**
  - 即座に削除可能
  - core/, main/, hint/配下のファイル
  - 空のindex.tsファイル

- **統合済みファイル（7ファイル、2,955行）**
  - api.ts, commands.ts, lifecycle.ts → core.tsに統合済み
  - motion.ts → core.tsに統合済み
  - segmenter.ts → word.tsに統合予定
  - display.ts, hint-utils.ts → 削除マーク付き

## Process

### process5 7ファイル体制への統合

#### sub1 即座に削除可能なファイルの削除
@target: denops/hellshake-yano/
@context: re-exportのみ、または空ファイルの削除
- [x] 空のindex.tsファイル削除（5ファイル）
  - [x] dictionary/index.ts
  - [x] display/index.ts
  - [x] input/index.ts
  - [x] performance/index.ts
  - [x] validation/index.ts
- [x] re-exportのみファイル削除（10ファイル）
  - [x] core/配下4ファイル
  - [x] main/配下4ファイル
  - [x] hint/manager.ts
  - [x] hint-utils.ts

#### sub2 統合済みファイルの削除とimport修正
@target: denops/hellshake-yano/main.ts, denops/hellshake-yano/core.ts
@ref: 削除対象ファイル
- [x] main.ts, core.tsのimportパス修正
  - [x] api.ts関連のimport削除
  - [x] commands.ts関連のimport削除
  - [x] lifecycle.ts関連のimport削除
  - [x] motion.ts関連のimport削除
- [x] deno checkで型エラー確認
- [x] deno testでテスト実行
- [x] ファイル削除（5ファイル）
  - [x] api.ts
  - [x] commands.ts
  - [x] lifecycle.ts
  - [x] motion.ts
  - [x] display.ts
- [x] deno checkで型エラー確認
- [x] deno testでテスト実行

#### sub3 word/配下とsegmenter.tsの統合
@target: denops/hellshake-yano/word.ts
@ref: word/配下の全ファイル、segmenter.ts
- [ ] word.ts内のre-export文削除
- [ ] 実装コードの統合
  - [ ] word/manager.ts (942行) → word.tsへ
  - [ ] word/context.ts (645行) → word.tsへ
  - [ ] word/dictionary.ts (432行) → word.tsへ
  - [ ] word/dictionary-loader.ts (575行) → word.tsへ
  - [ ] segmenter.ts (422行) → word.tsへ
- [ ] deno checkで型エラー確認
- [ ] deno testでテスト実行
- [ ] importパス修正
  - [ ] main.tsのword/配下import修正
  - [ ] core.tsのword/配下import修正
- [ ] deno checkで型エラー確認
- [ ] deno testでテスト実行
- [ ] ディレクトリとファイル削除
  - [ ] word/ディレクトリ削除
  - [ ] segmenter.ts削除
- [ ] deno checkで型エラー確認
- [ ] deno testでテスト実行

#### sub4 utils/配下の統合と削除
@target: 各統合先ファイル
@ref: utils/配下のファイル
- [ ] utils/display.ts (95行) の統合
  - [ ] 表示関連 → hint.tsへ
  - [ ] 汎用関数 → core.tsへ
- [ ] deno checkで型エラー確認
- [ ] deno testでテスト実行
- [ ] utils/validation.ts (31行) → 削除（config.tsに統合済み）
- [ ] utils/cache.ts (6行) → 削除（cache.tsに統合済み）
- [ ] utils/sort.ts (6行) → 削除
- [ ] utils/ディレクトリ削除
- [ ] deno checkで型エラー確認
- [ ] deno testでテスト実行

#### sub5 最終確認と調整
@target: denops/hellshake-yano/
- [ ] 不要なimport文のクリーンアップ
- [ ] `deno check denops/hellshake-yano/*.ts`で型チェック
- [ ] `deno test tests/*.ts`でテスト実行（503/563パス維持）
- [ ] 7ファイルのみ存在することを確認
  - [ ] `ls -la denops/hellshake-yano/*.ts | wc -l`で確認

### process10 ユニットテスト
#### sub1 テストファイルのimportパス修正
@target: tests/
- [ ] word/配下からのimportをword.tsに修正
- [ ] 削除ファイルからのimportを統合先に修正
- [ ] 全テストの実行確認

### process50 フォローアップ
#### sub1 パフォーマンス測定
- [ ] 統合前後のメモリ使用量比較
- [ ] 起動時間の測定
- [ ] キャッシュヒット率の確認

### process100 リファクタリング
#### sub1 各ファイルの最適化
@target: 7つの統合ファイル
- [ ] 重複コードの削除
- [ ] 未使用関数の削除
- [ ] 型定義の整理

### process200 ドキュメンテーション
- [ ] README.mdに新アーキテクチャの説明追加
- [ ] 移行ガイドの作成（MIGRATION.md更新）
- [ ] APIリファレンスの更新
