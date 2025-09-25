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
- [x] UnifiedCacheをインポート
- [x] dictionary内のLRUCacheをUnifiedCache.DICTIONARYに置き換え
- [x] checkWord関数のキャッシュアクセス更新
- [x] キャッシュ統計の取得メソッド更新
- [x] `deno check denops/hellshake-yano/word/dictionary.ts`でコンパイルエラーなし
- [x] `deno test tests/*dictionary*.ts`で辞書関連テストがパス

#### sub7 その他のMapキャッシュの統合（残り約9個）
@target: denops/hellshake-yano/
- [x] `grep -r "new Map<" denops/`で残りのMapキャッシュを特定
- [x] 特定された各ファイルをリスト化
- [x] 各Mapキャッシュに対してUnifiedCacheの適切なタイプを決定
- [x] 必要に応じて新しいCacheTypeを追加
- [x] 各ファイルのキャッシュを順次UnifiedCacheに移行
- [x] 各ファイルで`deno check`実行
- [x] 各ファイルの関連テスト実行
- [x] `deno test tests/`で全体の回帰テスト実行

#### sub8 統合テストと最適化
@target: denops/hellshake-yano/, tests/
- [x] `deno test tests/`で全75個のテストファイルがパス
- [x] `deno check denops/hellshake-yano/`で型エラーなし
- [x] パフォーマンステスト用のベンチマークスクリプト作成
- [x] 各CacheTypeの適切なmaxSizeを決定（ヒット率の測定）
- [x] メモリ使用量の測定と調整
- [x] キャッシュヒット率レポートの生成
- [x] 不要になった古いキャッシュ実装コードの削除
- [x] importの整理とunused importの削除
- [x] `deno check`で全体のコンパイル最終確認
- [x] `deno test`で全テストが通ることを最終確認
- [x] mainブランチと比較して、削減されたコード行数の確認

#### sub9 ドキュメント更新
@target: docs/, README.md
- [x] UnifiedCacheのAPIドキュメント作成
- [x] キャッシュタイプ一覧と用途の説明書作成
- [x] 移行ガイドの作成（旧実装から新実装への移行手順）
- [x] パフォーマンス改善の数値をドキュメント化
- [x] キャッシュ統計の取得方法と活用例の記載
- [x] README.mdに新キャッシュシステムの概要を追加

#### 成果物と期待される改善
- キャッシュ実装が20個から1つに統合
- メモリリークリスクの排除（全てLRUCache化）
- 統一された統計情報取得とデバッグの容易化
- キャッシュヒット率の向上とメモリ使用量の最適化
- 保守性の大幅な向上

### process2 設定インターフェース統合

#### 現状調査結果
**設定インターフェースの詳細分析（合計10個以上）**
- **主要インターフェース（10個）**
  - `Config` (types.ts 121行目) - メイン設定
  - `CoreConfig` (config.ts 29行目) - 基本設定
  - `HintConfig` (config.ts 58行目) - ヒント関連
  - `WordConfig` (config.ts 103行目) - 単語検出
  - `PerformanceConfig` (config.ts 145行目) - パフォーマンス
  - `DebugConfig` (config.ts 185行目) - デバッグ
  - `HierarchicalConfig` (config.ts 211行目) - 階層化設定
  - `CamelCaseConfig` (config.ts 241行目) - camelCase統一設定
  - `ModernConfig` (config.ts 318行目) - モダン設定
  - `HintKeyConfig` (types.ts 339行目) - ヒントキー設定
- **命名規則の混在**: snake_case/camelCase（31個のマッピング定義）
- **デフォルト値管理**: 複数箇所に分散（getDefaultConfig等）
- **バリデーション**: main.tsとconfig.tsに重複実装
- **既存テスト**: config_test.tsに33個のテストケース

#### sub1 統一設定インターフェース(UnifiedConfig)の作成と基盤整備
@target: denops/hellshake-yano/config.ts
@ref: denops/hellshake-yano/types.ts
- [x] UnifiedConfigインターフェースの定義（すべてcamelCase、32項目）
- [x] DEFAULT_UNIFIED_CONFIG定数の定義（型安全な初期値）
- [x] 階層構造を完全にフラット化（ネストなし）
- [x] `deno check denops/hellshake-yano/config.ts`で型チェック
- [x] 既存のconfig_test.tsが通ることを確認（後方互換性の検証）
- [x] unified_config_test.tsを新規作成
- [x] UnifiedConfigの型テストを追加（型ガード、必須項目等）
- [x] `deno test tests/unified_config_test.ts`でテストがパス

#### sub2 設定変換レイヤーの実装
@target: denops/hellshake-yano/config.ts
- [x] toUnifiedConfig()関数：旧設定→UnifiedConfigへの変換
- [x] fromUnifiedConfig()関数：UnifiedConfig→旧設定への変換
- [x] snake_case/camelCase双方向マッピングの完全実装
- [x] 各階層設定（CoreConfig等）からの変換サポート
- [x] `deno check denops/hellshake-yano/config.ts`で型チェック
- [x] config_conversion_test.tsを作成
- [x] 全32個のプロパティマッピングをテスト
- [x] `deno test tests/config_conversion_test.ts`でテストがパス
- [x] `deno test tests/config_test.ts`で既存テストがパス

#### sub3 バリデーション統合
@target: denops/hellshake-yano/config.ts
- [x] validateUnifiedConfig()関数の実装（単一バリデーション）
- [x] 既存のvalidateConfig()をvalidateUnifiedConfig()へリダイレクト
- [x] main.tsの重複validateConfig()を削除マーク（@deprecated）
- [x] エラーメッセージを統一（camelCase形式）
- [x] `deno check denops/hellshake-yano/config.ts`で型チェック
- [x] config_validation_test.tsを作成
- [x] 各項目の境界値テスト（正常系/異常系）
- [x] `deno test tests/config_validation_test.ts`でテストがパス
- [x] `deno test tests/config_test.ts`で既存バリデーションテストがパス

#### sub4 デフォルト値管理の統一
@target: denops/hellshake-yano/config.ts
- [x] getDefaultUnifiedConfig()関数の実装
- [x] 既存のgetDefaultConfig()をgetDefaultUnifiedConfig()へリダイレクト
- [x] getDefaultHierarchicalConfig()を@deprecatedマーク
- [x] createMinimalConfig()をUnifiedConfigベースに更新
- [x] `deno check denops/hellshake-yano/config.ts`で型チェック
- [x] config_defaults_test.tsを作成
- [x] デフォルト値の一致性テスト
- [x] `deno test tests/config_defaults_test.ts`でテストがパス
- [x] `deno test tests/config_test.ts`でデフォルト値テストがパス

#### sub5 main.tsの設定処理移行
@target: denops/hellshake-yano/main.ts
- [ ] config変数をUnifiedConfig型へ変更
- [ ] getDefaultConfig()の実装をconfig.tsへ委譲
- [ ] validateConfig()の実装をconfig.tsへ委譲
- [ ] 設定アクセスをcamelCaseに統一
- [ ] `deno check denops/hellshake-yano/main.ts`で型チェック
- [ ] `deno test tests/main_test.ts`で既存テストがパス
- [ ] `deno test tests/integration_test.ts`で統合テストがパス

#### sub6 各モジュールの設定参照更新（hint.ts）
@target: denops/hellshake-yano/hint.ts
@ref: denops/hellshake-yano/hint/manager.ts
- [ ] Config型インポートをUnifiedConfigへ変更
- [ ] 設定アクセスをcamelCaseプロパティへ更新
- [ ] hint_position→hintPosition等の変更
- [ ] `deno check denops/hellshake-yano/hint.ts`で型チェック
- [ ] `deno test tests/hint*.ts`でhint関連テストがパス

#### sub7 各モジュールの設定参照更新（word関連）
@target: denops/hellshake-yano/word/detector.ts
@ref: denops/hellshake-yano/word/manager.ts, denops/hellshake-yano/word/context.ts
- [ ] Config型インポートをUnifiedConfigへ変更
- [ ] 設定アクセスをcamelCaseプロパティへ更新
- [ ] use_japanese→useJapanese等の変更
- [ ] `deno check denops/hellshake-yano/word/*.ts`で型チェック
- [ ] `deno test tests/word*.ts`でword関連テストがパス

#### sub8 lifecycle.tsとAPI層の更新
@target: denops/hellshake-yano/lifecycle.ts
@ref: denops/hellshake-yano/api.ts, denops/hellshake-yano/commands.ts
- [ ] Config型インポートをUnifiedConfigへ変更
- [ ] mergeConfig()をUnifiedConfig対応に更新
- [ ] APIのconfigプロパティをUnifiedConfigへ
- [ ] `deno check denops/hellshake-yano/{lifecycle,api,commands}.ts`で型チェック
- [ ] `deno test tests/lifecycle*.ts`でテストがパス
- [ ] `deno test tests/api*.ts`でテストがパス

#### sub9 旧インターフェースの削除準備
@target: denops/hellshake-yano/config.ts
@ref: denops/hellshake-yano/types.ts
- [ ] CoreConfig, HintConfig, WordConfig等に@deprecatedマーク
- [ ] 移行ガイドコメントの追加
- [ ] 削除予定バージョンの明記
- [ ] `deno check denops/hellshake-yano/`で全体の型チェック
- [ ] `deno test tests/`で全75個のテストファイルがパス

#### sub10 ドキュメント更新
@target: docs/, README.md
- [ ] UnifiedConfigのAPIドキュメント作成
- [ ] 設定項目一覧（32項目）の説明書作成
- [ ] snake_case→camelCase移行ガイド作成
- [ ] 設定例とベストプラクティスの記載
- [ ] MIGRATION.mdに移行手順を追加

#### 成果物と期待される改善
- 設定インターフェースが10個以上から1つに統合
- 命名規則の統一（すべてcamelCase）
- バリデーション処理の一元化
- デフォルト値管理の単一化
- 約2,500行のコード削減見込み
- 保守性とコード可読性の大幅向上

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
