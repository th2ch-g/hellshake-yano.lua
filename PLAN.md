# title: コード量50%削減リファクタリング - 21,000行から10,500行へ

## 概要
- 現在21,000行のコードベースを10,500行に削減し、保守性とパフォーマンスを大幅に向上
- 20個のキャッシュ実装を1つに、23個の設定インターフェースを1つに統合
- 検出精度を完全に維持しながら重複と不要な抽象化を排除

### goal
- コード量を50%削減しながら全機能を維持
- シンプルで理解しやすいアーキテクチャの実現
- パフォーマンスの向上（処理時間75%削減、メモリ使用量75%削減）

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 後方互換性を完全に維持する
- 既存のエクスポートされた関数はすべて維持する
- テストが壊れないよう慎重に作業を進める
- 検出精度（Regex、TinySegmenter、Hybrid）は現状維持
- processの実装ごとに deno check を実行し、型エラーを防ぐ
- 各process完了後にユニットテストを実行し、すべてのテストが通ることを確認する

## 開発のゴール
- 7ファイル体制によるシンプルな構造の実現
- 統一されたキャッシュとフラット設定による複雑性の排除
- main.tsを軽量なエントリーポイントに変換

## 実装仕様

### 現在の問題点
1. **キャッシュの重複（20個）**
   - 17個のMap実装と3個のLRUCache実装が混在
   - 同じ用途で複数のキャッシュが存在（単語検出、ヒント生成など）
   - サイズ制限なしのMapによるメモリリークリスク

2. **設定インターフェースの乱立（23個）**
   - Config、CoreConfig、HintConfig、WordConfig等が重複
   - 最大5階層の深いネスト構造
   - snake_caseとcamelCaseの混在

3. **main.tsの肥大化（3,582行）**
   - すべての機能が一つのファイルに集約
   - 責務の分離ができていない
   - 循環依存の発生

4. **不要なディレクトリとファイル**
   - dictionary/, display/, input/, performance/, validation/（各1ファイル）
   - 実質的に使用されていない機能

### 新しいアーキテクチャ（7ファイル体制）
```
denops/hellshake-yano/
├── main.ts          (500行)   # エントリーポイントのみ
├── core.ts          (2,000行) # コア機能統合
├── hint.ts          (1,500行) # ヒント生成と表示
├── word.ts          (1,500行) # 単語検出（3方式維持）
├── config.ts        (500行)   # 単一設定ファイル
├── cache.ts         (300行)   # 統一キャッシュシステム
└── types.ts         (200行)   # 型定義のみ
```

## 生成AIの学習用コンテキスト

### 削減対象の分析結果
- **キャッシュ関連**: 20ファイルで重複実装（約3,000行）
- **設定関連**: 23個のインターフェース定義（約2,500行）
- **main.ts**: 3,582行のモノリシックファイル
- **未使用機能**: テストで確認されない機能（約1,500行）

### 統合設計
```typescript
// 統一キャッシュ（cache.ts）
export class UnifiedCache {
  private caches: Map<CacheType, LRUCache<string, any>>;
  enum CacheType {
    WORDS = 'words',
    HINTS = 'hints',
    DISPLAY = 'display',
    ANALYSIS = 'analysis',
    TEMP = 'temp'
  }
}

// 統一設定（config.ts）
export interface UnifiedConfig {
  // 32個の厳選された設定項目（フラット構造）
  enabled: boolean;
  markers: string[];
  motionCount: number;
  // ...
}
```

## Process

### process1 キャッシュシステム統合

#### 現状調査結果
**キャッシュ実装の詳細分析（合計20個）**
- **LRUCache実装（3個）**
  - `lifecycle.ts`: wordsキャッシュ、hintsキャッシュ（各100/50サイズ）
  - `word/dictionary.ts`: 辞書キャッシュ
- **Map実装（17個）**
  - `hint.ts`: hintCache、assignmentCacheNormal/Visual/Other（4個）
  - `word/context.ts`: languageRuleCache、contextCache（2個）
  - `word/detector.ts`: globalWordCache（KeyBasedWordCache内部）
  - その他散在するMapキャッシュ
- **既存基盤**: `utils/cache.ts`に完全な統一キャッシュ基盤が実装済み
- **テスト環境**: 75個のテストファイル、キャッシュ分離テスト等が存在

#### sub1 統一キャッシュクラスの作成と基盤整備
@target: denops/hellshake-yano/cache.ts
@ref: denops/hellshake-yano/utils/cache.ts
- [x] CacheType列挙型を定義（11種類：WORDS、HINTS、DISPLAY、ANALYSIS、TEMP、HINT_ASSIGNMENT_NORMAL/VISUAL/OTHER、LANGUAGE_RULES、SYNTAX_CONTEXT、DICTIONARY）
- [x] UnifiedCacheクラスのスケルトンを作成
- [x] シングルトンパターンを実装
- [x] 各CacheTypeに対応するLRUCacheインスタンスを初期化（適切なサイズ設定）
- [x] `getCache(type: CacheType)`メソッドを実装
- [x] 型安全なジェネリックインターフェースを定義
- [x] `getAllStats()`メソッドを実装（全キャッシュの統計情報取得）
- [x] `clearAll()`メソッドを実装（全キャッシュのクリア）
- [x] `clearByType(type: CacheType)`メソッドを実装（特定タイプのクリア）
- [x] `deno check denops/hellshake-yano/cache.ts`でコンパイルエラーなし
- [x] `tests/unified_cache_test.ts`を作成
- [x] 各キャッシュタイプの独立性をテスト
- [x] シングルトン動作のテスト
- [x] 統計機能のテスト
- [x] `deno test tests/unified_cache_test.ts`でテストが全てパス

#### sub2 hint.tsのキャッシュ統合（4個）
@target: denops/hellshake-yano/hint.ts
@ref: denops/hellshake-yano/cache.ts
- [x] UnifiedCacheをインポート
- [x] `hintCache`をUnifiedCache.HINTS に置き換え
- [x] `assignmentCacheNormal`をUnifiedCache.HINT_ASSIGNMENT_NORMALに置き換え
- [x] `assignmentCacheVisual`をUnifiedCache.HINT_ASSIGNMENT_VISUALに置き換え
- [x] `assignmentCacheOther`をUnifiedCache.HINT_ASSIGNMENT_OTHERに置き換え
- [x] getAssignmentCacheForMode関数をUnifiedCache利用に更新
- [x] Map特有のメソッド（size、clear等）の互換性を確保
- [x] `deno check denops/hellshake-yano/hint.ts`でコンパイルエラーなし
- [x] `deno test tests/hint.test.ts`で既存テストがパス
- [x] `deno test tests/hint_assignment_cache_separation_test.ts`でモード分離テストがパス
- [x] `deno test tests/hint_assignment_test.ts`で全テストがパス
- [x] `deno test tests/hint*.ts`で全てのhint関連テストがパス

#### sub3 lifecycle.tsのキャッシュ統合（2個）
@target: denops/hellshake-yano/lifecycle.ts
@ref: denops/hellshake-yano/cache.ts
- [x] UnifiedCacheをインポート
- [x] state.caches.wordsをUnifiedCache.WORDSに置き換え
- [x] state.caches.hintsをUnifiedCache.HINTSに置き換え
- [x] initializeState関数の更新（キャッシュサイズオプションの処理）
- [x] resetCaches関数の更新（UnifiedCacheのclearByTypeを使用）
- [x] `deno check denops/hellshake-yano/lifecycle.ts`でコンパイルエラーなし
- [x] `deno test tests/lifecycle*.ts`で関連テストがパス
- [x] `deno test tests/integration_test.ts`で統合テストがパス

#### sub4 word/context.tsのキャッシュ統合（2個）
@target: denops/hellshake-yano/word/context.ts
@ref: denops/hellshake-yano/cache.ts
- [x] UnifiedCacheをインポート
- [x] `languageRuleCache`をUnifiedCache.LANGUAGE_RULESに置き換え
- [x] `contextCache`をUnifiedCache.SYNTAX_CONTEXTに置き換え
- [x] getLanguageRule関数のキャッシュアクセス更新
- [x] detectContext関数のキャッシュアクセス更新
- [x] clearメソッドの実装（UnifiedCacheのclearByTypeを使用）
- [x] `deno check denops/hellshake-yano/word/context.ts`でコンパイルエラーなし
- [x] `deno test tests/context*.ts`で関連テストがパス
- [x] `deno test tests/word*.ts`でword関連テストがパス

#### sub5 word/detector.tsのキャッシュ統合（1個）
@target: denops/hellshake-yano/word/detector.ts
@ref: denops/hellshake-yano/cache.ts
- [x] UnifiedCacheをインポート
- [x] KeyBasedWordCacheクラスをUnifiedCache利用に更新
- [x] `globalWordCache`をUnifiedCache.WORDSベースに変更
- [x] set/getメソッドをUnifiedCacheのインターフェースに合わせる
- [x] clearメソッドの実装
- [x] getStats関数の実装（UnifiedCacheの統計機能を活用）
- [x] `deno check denops/hellshake-yano/word/detector.ts`でコンパイルエラーなし
- [x] `deno test tests/word_detector_test.ts`でテストがパス

#### sub6 word/dictionary.tsのキャッシュ統合（1個）
@target: denops/hellshake-yano/word/dictionary.ts
@ref: denops/hellshake-yano/cache.ts
- [ ] UnifiedCacheをインポート
- [ ] dictionary内のLRUCacheをUnifiedCache.DICTIONARYに置き換え
- [ ] checkWord関数のキャッシュアクセス更新
- [ ] キャッシュ統計の取得メソッド更新
- [ ] `deno check denops/hellshake-yano/word/dictionary.ts`でコンパイルエラーなし
- [ ] `deno test tests/*dictionary*.ts`で辞書関連テストがパス

#### sub7 その他のMapキャッシュの統合（残り約9個）
@target: denops/hellshake-yano/
- [ ] `grep -r "new Map<" denops/`で残りのMapキャッシュを特定
- [ ] 特定された各ファイルをリスト化
- [ ] 各Mapキャッシュに対してUnifiedCacheの適切なタイプを決定
- [ ] 必要に応じて新しいCacheTypeを追加
- [ ] 各ファイルのキャッシュを順次UnifiedCacheに移行
- [ ] 各ファイルで`deno check`実行
- [ ] 各ファイルの関連テスト実行
- [ ] `deno test tests/`で全体の回帰テスト実行

#### sub8 統合テストと最適化
@target: denops/hellshake-yano/, tests/
- [ ] `deno test tests/`で全75個のテストファイルがパス
- [ ] `deno check denops/hellshake-yano/`で型エラーなし
- [ ] パフォーマンステスト用のベンチマークスクリプト作成
- [ ] 各CacheTypeの適切なmaxSizeを決定（ヒット率の測定）
- [ ] メモリ使用量の測定と調整
- [ ] キャッシュヒット率レポートの生成
- [ ] 不要になった古いキャッシュ実装コードの削除
- [ ] importの整理とunused importの削除
- [ ] `deno check`で全体のコンパイル最終確認
- [ ] `deno test`で全テストが通ることを最終確認

#### sub9 ドキュメント更新
@target: docs/, README.md
- [ ] UnifiedCacheのAPIドキュメント作成
- [ ] キャッシュタイプ一覧と用途の説明書作成
- [ ] 移行ガイドの作成（旧実装から新実装への移行手順）
- [ ] パフォーマンス改善の数値をドキュメント化
- [ ] キャッシュ統計の取得方法と活用例の記載
- [ ] README.mdに新キャッシュシステムの概要を追加

#### 成果物と期待される改善
- キャッシュ実装が20個から1つに統合
- メモリリークリスクの排除（全てLRUCache化）
- 統一された統計情報取得とデバッグの容易化
- キャッシュヒット率の向上とメモリ使用量の最適化
- 保守性の大幅な向上

### process2 設定インターフェース統合
#### sub1 統一設定インターフェースの作成
@target: denops/hellshake-yano/config.ts
@ref: denops/hellshake-yano/types.ts
- [ ] UnifiedConfig インターフェースの定義（32項目）
- [ ] DEFAULT_CONFIG 定数の定義
- [ ] すべての設定をcamelCaseに統一
- [ ] 階層構造を完全にフラット化

#### sub2 既存設定の移行
@target: 各ファイルの設定参照箇所
- [ ] Config、CoreConfig、HintConfig等をUnifiedConfigに置き換え
- [ ] 設定アクセスパスの更新
- [ ] バリデーション関数の統合

### process3 main.ts簡素化
#### sub1 core.tsへの機能移動
@target: denops/hellshake-yano/core.ts
@ref: denops/hellshake-yano/main.ts
- [ ] Coreクラスの作成
- [ ] showHints、hideHints等のコア機能を移動
- [ ] グローバル状態管理の移行
- [ ] 初期化ロジックの移動

#### sub2 main.tsのリファクタリング
@target: denops/hellshake-yano/main.ts
- [ ] エントリーポイントのみに縮小（500行以内）
- [ ] denops.dispatcherの定義
- [ ] 必要最小限のインポート
- [ ] 後方互換性のための再エクスポート

### process4 不要ファイル削除
#### sub1 使用頻度の低いディレクトリ削除
@target: denops/hellshake-yano/
- [ ] dictionary/ディレクトリの削除（1ファイルのみ）
- [ ] display/ディレクトリの削除（1ファイルのみ）
- [ ] input/ディレクトリの削除（1ファイルのみ）
- [ ] performance/ディレクトリの削除（1ファイルのみ）
- [ ] validation/ディレクトリの削除（1ファイルのみ）

#### sub2 デッドコード削除
@target: 各ファイル
- [ ] @deprecatedマークされた関数の削除
- [ ] テストで使用されていない関数の削除
- [ ] 後方互換性のための古いコードの削除

### process10 ユニットテスト
#### sub1 既存テストの動作確認
@target: tests/
- [ ] 全テストスイートの実行
- [ ] 失敗テストの修正
- [ ] パフォーマンステストの更新

#### sub2 新規テストの追加
@target: tests/
- [ ] UnifiedCacheのテスト作成
- [ ] UnifiedConfigのテスト作成
- [ ] リファクタリング後のcoreモジュールのテスト

### process50 フォローアップ

### process100 リファクタリング
#### sub1 TypeScript最適化
@target: 全ファイル
- [ ] 型定義の厳密化
- [ ] any型の排除
- [ ] 未使用のインポート削除

#### sub2 パフォーマンス最適化
@target: core.ts, cache.ts
- [ ] 不要な非同期処理を同期処理に変更
- [ ] キャッシュヒット率の改善
- [ ] メモリ使用量の最適化

### process200 ドキュメンテーション
- [ ] README.mdに新アーキテクチャの説明追加
- [ ] 移行ガイドの作成
- [ ] パフォーマンス改善結果のドキュメント化
- [ ] APIリファレンスの更新
