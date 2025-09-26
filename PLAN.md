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

#### sub2 hint.tsのキャッシュ統合（4個）【完了】
@target: denops/hellshake-yano/hint.ts
@ref: denops/hellshake-yano/cache.ts
@doc: docs/TDD_PLAN_PROCESS2_SUB2.md（TDD実装計画書作成済み）

**TDD Red-Green-Refactorによる実装フェーズ**

##### Phase 1: テスト基盤の準備
- [x] UnifiedCache統合テストファイルの検討
- [x] UnifiedCacheのインポート追加
- [x] `deno check denops/hellshake-yano/hint.ts`で型チェック

##### Phase 2: hintCacheの移行
- [x] `hintCache`をUnifiedCache.HINTS に置き換え
- [x] キャッシュの設定・取得・クリアの動作確認
- [x] `deno test tests/hint.test.ts`で既存テストがパス

##### Phase 3: assignmentCacheNormalの移行
- [x] `assignmentCacheNormal`をUnifiedCache.HINT_ASSIGNMENT_NORMALに置き換え
- [x] ノーマルモード用キャッシュ分離の確認
- [x] `deno check denops/hellshake-yano/hint.ts`で型チェック

##### Phase 4: assignmentCacheVisualの移行
- [x] `assignmentCacheVisual`をUnifiedCache.HINT_ASSIGNMENT_VISUALに置き換え
- [x] ビジュアルモード用キャッシュ分離の確認
- [x] `deno test tests/hint_assignment_cache_separation_test.ts`でモード分離テストがパス

##### Phase 5: assignmentCacheOtherの移行
- [x] `assignmentCacheOther`をUnifiedCache.HINT_ASSIGNMENT_OTHERに置き換え
- [x] その他モード用キャッシュの動作確認
- [x] getAssignmentCacheForMode関数をUnifiedCache利用に更新

##### Phase 6: Map互換メソッドの実装
- [x] clearHintCache関数の更新（clear()メソッド呼び出し確認）
- [x] getHintCacheStats関数の更新（size()メソッド呼び出し確認）
- [x] Map特有のメソッド（size、clear等）の互換性を確保

##### Phase 7: 統合テストと最終検証
- [x] `deno test tests/hint.test.ts`で基本テストがパス（28ステップ）
- [x] `deno test tests/hint_assignment_test.ts`で割り当てテストがパス
- [x] `deno test tests/hint_assignment_cache_separation_test.ts`でキャッシュ分離テストがパス
- [x] `deno test tests/hint*.ts`で全てのhint関連テストがパス
- [x] `deno check denops/hellshake-yano/hint.ts`で型エラーなし

##### 成果
- ✅ 4つのキャッシュがUnifiedCacheに統合完了
- ✅ モード別キャッシュ分離機能の完全維持
- ✅ LRUアルゴリズムによる効率的なメモリ管理
- ✅ 型安全性の保証（deno check通過）
- ✅ 既存の全テストがパス（後方互換性維持）

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
- [x] config変数をUnifiedConfig型へ変更
- [x] getDefaultConfig()の実装をconfig.tsへ委譲
- [x] validateConfig()の実装をconfig.tsへ委譲
- [x] 設定アクセスをcamelCaseに統一（50箇所）
- [x] `deno check denops/hellshake-yano/main.ts`で型チェック
- [x] `deno test tests/main_test.ts`で既存テストがパス（6テスト）
- [x] `deno test tests/integration_test.ts`で統合テストがパス（4テスト）
- [x] any型の完全排除とStrict TypeScript対応
- [x] counted_motions変数の型ガード実装（Map<string, number>）
- [x] LRUCacheの型定義改善（ジェネリクス型の適切な使用）
- [x] DebugInfo型の適切な使用（デバッグ情報の型安全性確保）
- [x] 型エラーの完全解消とコードの型安全性向上

#### sub6 各モジュールの設定参照更新（hint.ts）
@target: denops/hellshake-yano/hint.ts
@ref: denops/hellshake-yano/hint/manager.ts
- [x] Config型インポートをUnifiedConfigへ変更
- [x] 設定アクセスをcamelCaseプロパティへ更新
- [x] hint_position→hintPosition等の変更
- [x] `deno check denops/hellshake-yano/hint.ts`で型チェック
- [x] `deno test tests/hint*.ts`でhint関連テストがパス


#### sub7 各モジュールの設定参照更新（word関連）
@target: denops/hellshake-yano/word/detector.ts
@ref: denops/hellshake-yano/word/manager.ts, denops/hellshake-yano/word/context.ts
- [x] Config型インポートをUnifiedConfigへ変更
- [x] 設定アクセスをcamelCaseプロパティへ更新
- [x] use_japanese→useJapanese等の変更
- [x] `deno check denops/hellshake-yano/word/*.ts`で型チェック
- [x] `deno test tests/word*.ts`でword関連テストがパス

#### sub8 lifecycle.tsとAPI層の更新
@target: denops/hellshake-yano/lifecycle.ts
@ref: denops/hellshake-yano/api.ts, denops/hellshake-yano/commands.ts
- [x] Config型インポートをUnifiedConfigへ変更
- [x] mergeConfig()をUnifiedConfig対応に更新
- [x] APIのconfigプロパティをUnifiedConfigへ
- [x] `deno check denops/hellshake-yano/{lifecycle,api,commands}.ts`で型チェック
- [x] `deno test tests/lifecycle*.ts`でテストがパス
- [x] `deno test tests/api*.ts`でテストがパス

#### sub9 旧インターフェースの削除準備
@target: denops/hellshake-yano/config.ts
@ref: denops/hellshake-yano/types.ts
- [x] CoreConfig, HintConfig, WordConfig等に@deprecatedマーク
- [x] 移行ガイドコメントの追加
- [x] 削除予定バージョンの明記
- [x] `deno check denops/hellshake-yano/`で全体の型チェック
- [x] `deno test tests/`で全75個のテストファイルがパス

#### sub10 ドキュメント更新
@target: docs/, README.md
- [x] UnifiedConfigのAPIドキュメント作成
- [x] 設定項目一覧（32項目）の説明書作成
- [x] snake_case→camelCase移行ガイド作成
- [x] 設定例とベストプラクティスの記載
- [x] MIGRATION.mdに移行手順を追加
- [x] 削除対象となるファイルコードの一覧作成

#### sub11 UnifiedConfig統合エラーの修正
@target: denops/hellshake-yano/config.ts, denops/hellshake-yano/main.ts
@context: テストエラー12個の解消とUnifiedConfig移行の完了
- [x] useJapaneseのデフォルト値をundefinedからfalseに修正
- [x] `deno check denops/hellshake-yano/config.ts`で型チェック
- [x] `deno test tests/config_conversion_test.ts`でuseJapaneseテストがパス
- [x] isValidHighlightGroup()関数の実装（特殊文字、数字開始、長さチェック）
- [x] validateUnifiedConfig()にハイライトグループ名検証を追加
- [x] `deno check denops/hellshake-yano/config.ts`で型チェック
- [x] `deno test tests/highlight_color_test.ts`でハイライトテストがパス
- [x] getMinLengthForKey()のデフォルト値を2から3に修正
- [x] `deno check denops/hellshake-yano/main.ts`で型チェック
- [x] `deno test tests/per_key_min_length_test.ts`でmin_lengthテストがパス
- [x] getMotionCountForKey()のフォールバック処理を明確化
- [x] `deno check denops/hellshake-yano/main.ts`で型チェック
- [x] `deno test tests/per_key_motion_count_test.ts`でmotion_countテストがパス
- [x] `deno test`で全テストがパス（12個のエラー解消確認）

#### 成果物と期待される改善
- 設定インターフェースが10個以上から1つに統合
- 命名規則の統一（すべてcamelCase）
- バリデーション処理の一元化
- デフォルト値管理の単一化
- 約2,500行のコード削減見込み
- 保守性とコード可読性の大幅向上

### process3 main.ts簡素化

#### 現状調査結果
**main.ts分析（合計3,456行）**
- **dispatcherメソッド**: updateConfig、showHints、hideHints、clearCache、debug等
- **ヒント表示系**: showHints、showHintsInternal、showHintsWithKey、hideHints
- **単語検出系**: detectWordsOptimized
- **ヒント生成系**: generateHintsOptimized
- **表示処理系**: displayHints関連（7関数）
- **グローバル状態**: config、currentHints、hintsVisible、キャッシュ等
- **ユーティリティ**: パフォーマンス測定、デバッグ、バリデーション等
- **辞書システム**: initializeDictionarySystem、辞書コマンド等
- **既存テスト**: main_test.ts（9テスト）、integration_test.ts（4テスト）全パス

#### sub1 core.tsへの機能移動（TDD方式）
@target: denops/hellshake-yano/core.ts
@ref: denops/hellshake-yano/main.ts
- [x] **Phase1: 基盤作成**
  - [x] denops/hellshake-yano/core.tsを新規作成
  - [x] tests/core_test.tsを新規作成
  - [x] Coreクラスのスケルトン定義
  - [x] `deno check denops/hellshake-yano/core.ts`で型チェック
  - [x] core_test.tsにCoreクラスの存在確認テストを追加
  - [x] `deno test tests/core_test.ts`でテストパス
- [x] **Phase2: 状態管理の移行**
  - [x] CoreStateインターフェース定義（config、currentHints、hintsVisible等）
  - [x] Coreクラスにstate管理メソッド追加（getState、setState）
  - [x] 状態初期化メソッド（initializeState）実装
  - [x] `deno check denops/hellshake-yano/core.ts`で型チェック
  - [x] core_test.tsに状態管理テスト追加
  - [x] `deno test tests/core_test.ts`でテストパス
- [x] **Phase3: ヒント非表示機能の移行**
  - [x] core_test.tsにhideHintsのテスト作成（RED）
  - [x] CoreクラスにhideHintsメソッド実装
  - [x] main.tsのhideHints関数からCoreクラスのメソッドを呼び出すよう変更
  - [x] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
  - [x] `deno test tests/core_test.ts`でテストパス（GREEN）
  - [x] `deno test tests/main_test.ts`で既存テストが通ることを確認
  - [x] `deno test tests/integration_test.ts`で統合テストパス
- [x] **Phase4: 単語検出機能の移行**
  - [x] core_test.tsにdetectWordsOptimizedのテスト作成（RED）
  - [x] CoreクラスにdetectWordsOptimizedメソッド実装
  - [x] キャッシュアクセスの依存関係解決
  - [x] main.tsから呼び出しを変更
  - [x] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
  - [x] `deno test tests/core_test.ts`でテストパス（GREEN）
  - [x] `deno test tests/main_test.ts`で既存テストパス
  - [x] `deno test tests/integration_test.ts`で統合テストパス
- [x] **Phase5: ヒント生成機能の移行**
  - [x] core_test.tsにgenerateHintsOptimizedのテスト作成（RED）
  - [x] CoreクラスにgenerateHintsOptimizedメソッド実装
  - [x] main.tsから呼び出しを変更
  - [x] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
  - [x] `deno test tests/core_test.ts`でテストパス（GREEN）
  - [x] `deno test tests/main_test.ts`で既存テストパス
- [x] **Phase6: 表示処理系の移行**
  - [x] core_test.tsにdisplayHints系のテスト作成（RED）
  - [x] displayHintsOptimizedメソッド実装
  - [x] displayHintsAsyncメソッド実装
  - [x] displayHintsWithExtmarksBatchメソッド実装
  - [x] displayHintsWithMatchAddBatchメソッド実装
  - [x] main.tsから呼び出しを変更
  - [x] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
  - [x] `deno test tests/core_test.ts`でテストパス（GREEN）
  - [x] `deno test tests/main_test.ts`で既存テストパス
  - [x] `deno test tests/integration_test.ts`で統合テストパス
- [x] **Phase7: showHints系の移行**
  - [x] core_test.tsにshowHints系のテスト作成（RED）
  - [x] CoreクラスにshowHintsメソッド実装
  - [x] showHintsInternalメソッド実装
  - [x] showHintsWithKeyメソッド実装
  - [x] デバウンス処理の移行
  - [x] main.tsのdispatcher.showHintsから呼び出し
  - [x] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
  - [x] `deno test tests/core_test.ts`でテストパス（GREEN）
  - [x] `deno test tests/main_test.ts`で既存テストパス
  - [x] `deno test tests/integration_test.ts`で統合テストパス
- [x] **Phase7.5: Promise pendingエラーの根本的修正**
  - [x] 問題の分析と原因特定
  - [x] Coreクラスの不要なデバウンス処理を削除（main.tsに既存実装あり）
  - [x] showHintsメソッドからデバウンス処理を削除
  - [x] debounceTimeoutIdプロパティを削除
  - [x] cleanupメソッドからタイマークリア処理を削除（または簡素化）
  - [x] displayHintsWithExtmarksBatchのsetTimeout遅延を削除
  - [x] displayHintsWithMatchAddBatchのsetTimeout遅延を削除
  - [x] テストからsanitizeOps/sanitizeResourcesオプションを削除
  - [x] `deno test tests/core_test.ts`でPromise pendingエラーなし確認
  - [x] `deno test tests/main_test.ts`で既存テストパス確認
  - [x] `deno test tests/integration_test.ts`で統合テストパス確認
- [x] **Phase8: ユーティリティ機能の移行**
  - [x] core_test.tsにパフォーマンス測定のテスト作成（RED）
  - [x] recordPerformanceメソッド実装
  - [x] collectDebugInfoメソッド実装
  - [x] clearDebugInfoメソッド実装
  - [x] waitForUserInputメソッド実装
  - [x] main.tsから呼び出しを変更
  - [x] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
  - [x] `deno test tests/core_test.ts`でテストパス（GREEN）
- [x] **Phase9: 辞書システムの移行**
  - [x] core_test.tsに辞書システムのテスト作成（RED）
  - [x] initializeDictionarySystemメソッド実装
  - [x] 辞書コマンドメソッドの実装
  - [x] main.tsから呼び出しを変更
  - [x] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
  - [x] `deno test tests/core_test.ts`でテストパス（GREEN）
- [x] **Phase10: 最終統合とクリーンアップ**
  - [x] Coreクラスのシングルトンインスタンス作成
  - [x] dispatcherをCoreクラスのメソッド呼び出しに変更
  - [x] 不要になったローカル関数を削除
  - [x] importの整理
  - [x] `deno check denops/hellshake-yano/main.ts`で型チェック
  - [x] `deno test tests/*.ts`で全テストパス（75ファイル）
  - [x] 後方互換性の確認（エクスポート関数の再エクスポート）
  - [ ] APIの互換性テスト作成
  - [ ] ドキュメントの更新

#### sub2 main.tsの最終リファクタリング【TDD実装】
@target: denops/hellshake-yano/main.ts, denops/hellshake-yano/core.ts
@context: TDDで段階的に機能をCoreクラスへ移行し、main.tsを500行以内に縮小

**目標:**
- main.tsを3,358行から500行以内に縮小（85%削減）
- エントリーポイントとdispatcher定義のみに特化
- 全75個のテストファイルのパスを維持
- 完全な後方互換性を保証

##### sub2-1 ハイライト関連関数のCoreクラス移行
@target: denops/hellshake-yano/core.ts, denops/hellshake-yano/main.ts
@context: ハイライト検証・生成関数をCoreクラスへ移行

###### sub2-1-1 validateHighlightGroupName機能
- [ ] tests/core_test.tsにvalidateHighlightGroupNameのテスト追加（RED）
  - [ ] 正常なグループ名のテスト（"MyHighlight"等）
  - [ ] 無効なグループ名のテスト（数字開始、特殊文字等）
- [ ] CoreクラスにvalidateHighlightGroupNameメソッド実装（GREEN）
- [ ] main.tsのvalidateHighlightGroupNameから呼び出し変更
- [ ] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
- [ ] `deno test tests/core_test.ts`でテストパス
- [ ] `deno test tests/highlight_color_test.ts`で既存テストパス

###### sub2-1-2 isValidColorName機能
- [ ] tests/core_test.tsにisValidColorNameのテスト追加（RED）
  - [ ] 有効なカラー名のテスト（"red", "blue"等）
  - [ ] 無効なカラー名のテスト
- [ ] CoreクラスにisValidColorNameメソッド実装（GREEN）
- [ ] main.tsのisValidColorNameから呼び出し変更
- [ ] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
- [ ] `deno test tests/core_test.ts`でテストパス

###### sub2-1-3 isValidHexColor機能
- [ ] tests/core_test.tsにisValidHexColorのテスト追加（RED）
  - [ ] 有効な16進数カラーのテスト（"#FF0000"等）
  - [ ] 無効な16進数カラーのテスト
- [ ] CoreクラスにisValidHexColorメソッド実装（GREEN）
- [ ] main.tsのisValidHexColorから呼び出し変更
- [ ] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
- [ ] `deno test tests/core_test.ts`でテストパス

###### sub2-1-4 normalizeColorName機能
- [ ] tests/core_test.tsにnormalizeColorNameのテスト追加（RED）
- [ ] CoreクラスにnormalizeColorNameメソッド実装（GREEN）
- [ ] main.tsのnormalizeColorNameから呼び出し変更
- [ ] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
- [ ] `deno test tests/core_test.ts`でテストパス

###### sub2-1-5 validateHighlightColor機能
- [ ] tests/core_test.tsにvalidateHighlightColorのテスト追加（RED）
- [ ] CoreクラスにvalidateHighlightColorメソッド実装（GREEN）
- [ ] main.tsのvalidateHighlightColorから呼び出し変更
- [ ] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
- [ ] `deno test tests/core_test.ts`でテストパス
- [ ] `deno test tests/highlight_color_test.ts`で既存テストパス

###### sub2-1-6 generateHighlightCommand機能
- [ ] tests/core_test.tsにgenerateHighlightCommandのテスト追加（RED）
- [ ] CoreクラスにgenerateHighlightCommandメソッド実装（GREEN）
- [ ] main.tsのgenerateHighlightCommandから呼び出し変更
- [ ] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
- [ ] `deno test tests/core_test.ts`でテストパス

###### sub2-1-7 validateHighlightConfig機能
- [ ] tests/core_test.tsにvalidateHighlightConfigのテスト追加（RED）
- [ ] CoreクラスにvalidateHighlightConfigメソッド実装（GREEN）
- [ ] main.tsのvalidateHighlightConfigから呼び出し変更
- [ ] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
- [ ] `deno test tests/core_test.ts`でテストパス
- [ ] `deno test tests/highlight_*.ts`で全ハイライトテストパス

##### sub2-2 設定関連関数のCoreクラス移行
@target: denops/hellshake-yano/core.ts, denops/hellshake-yano/main.ts
@context: 設定検証・取得関数をCoreクラスへ移行

###### sub2-2-1 getMinLengthForKey機能
- [ ] tests/core_test.tsにgetMinLengthForKeyのテスト追加（RED）
  - [ ] デフォルト値のテスト
  - [ ] キー別設定値のテスト
- [ ] CoreクラスにgetMinLengthForKeyメソッド実装（GREEN）
- [ ] main.tsのgetMinLengthForKeyから呼び出し変更
- [ ] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
- [ ] `deno test tests/core_test.ts`でテストパス
- [ ] `deno test tests/per_key_min_length_test.ts`で既存テストパス

###### sub2-2-2 getMotionCountForKey機能
- [ ] tests/core_test.tsにgetMotionCountForKeyのテスト追加（RED）
  - [ ] デフォルト値のテスト
  - [ ] キー別設定値のテスト
- [ ] CoreクラスにgetMotionCountForKeyメソッド実装（GREEN）
- [ ] main.tsのgetMotionCountForKeyから呼び出し変更
- [ ] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
- [ ] `deno test tests/core_test.ts`でテストパス
- [ ] `deno test tests/per_key_motion_count_test.ts`で既存テストパス

###### sub2-2-3 validateConfig機能（config.tsに委譲）
- [ ] main.tsのvalidateConfigをconfig.tsの実装へ委譲
- [ ] `deno check denops/hellshake-yano/main.ts`で型チェック
- [ ] `deno test tests/config_*.ts`で設定テストパス

###### sub2-2-4 getDefaultConfig機能（config.tsに委譲）
- [ ] main.tsのgetDefaultConfigをconfig.tsの実装へ委譲
- [ ] `deno check denops/hellshake-yano/main.ts`で型チェック
- [ ] `deno test tests/config_*.ts`で設定テストパス

##### sub2-3 表示関連関数のCoreクラス移行
@target: denops/hellshake-yano/core.ts, denops/hellshake-yano/main.ts
@context: 非同期表示関数をCoreクラスへ移行

###### sub2-3-1 displayHintsAsync機能
- [ ] tests/core_test.tsにdisplayHintsAsyncのテスト追加（RED）
- [ ] CoreクラスのdisplayHintsAsyncメソッド実装確認（既存実装を活用）
- [ ] main.tsのdisplayHintsAsyncから呼び出し変更
- [ ] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
- [ ] `deno test tests/core_test.ts`でテストパス
- [ ] `deno test tests/display_*.ts`で表示テストパス

###### sub2-3-2 isRenderingHints機能
- [ ] tests/core_test.tsにisRenderingHintsのテスト追加（RED）
- [ ] CoreクラスにisRenderingHintsメソッド実装（GREEN）
- [ ] main.tsのisRenderingHintsから呼び出し変更
- [ ] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
- [ ] `deno test tests/core_test.ts`でテストパス

###### sub2-3-3 abortCurrentRendering機能
- [ ] tests/core_test.tsにabortCurrentRenderingのテスト追加（RED）
- [ ] CoreクラスにabortCurrentRenderingメソッド実装（GREEN）
- [ ] main.tsのabortCurrentRenderingから呼び出し変更
- [ ] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
- [ ] `deno test tests/core_test.ts`でテストパス

###### sub2-3-4 highlightCandidateHintsAsync機能
- [ ] tests/core_test.tsにhighlightCandidateHintsAsyncのテスト追加（RED）
- [ ] CoreクラスにhighlightCandidateHintsAsyncメソッド実装（GREEN）
- [ ] main.tsのhighlightCandidateHintsAsyncから呼び出し変更
- [ ] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
- [ ] `deno test tests/core_test.ts`でテストパス

##### sub2-4 辞書関連関数のCoreクラス移行
@target: denops/hellshake-yano/core.ts, denops/hellshake-yano/main.ts
@context: 辞書システム関数をCoreクラスへ移行

###### sub2-4-1 reloadDictionary機能
- [ ] tests/core_test.tsにreloadDictionaryのテスト追加（RED）
- [ ] CoreクラスにreloadDictionaryメソッド実装（GREEN）
- [ ] main.tsのreloadDictionaryから呼び出し変更
- [ ] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
- [ ] `deno test tests/core_test.ts`でテストパス

###### sub2-4-2 editDictionary機能
- [ ] tests/core_test.tsにeditDictionaryのテスト追加（RED）
- [ ] CoreクラスにeditDictionaryメソッド実装（GREEN）
- [ ] main.tsのeditDictionaryから呼び出し変更
- [ ] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
- [ ] `deno test tests/core_test.ts`でテストパス

###### sub2-4-3 showDictionary機能
- [ ] tests/core_test.tsにshowDictionaryのテスト追加（RED）
- [ ] CoreクラスにshowDictionaryメソッド実装（GREEN）
- [ ] main.tsのshowDictionaryから呼び出し変更
- [ ] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
- [ ] `deno test tests/core_test.ts`でテストパス

###### sub2-4-4 validateDictionary機能
- [ ] tests/core_test.tsにvalidateDictionaryのテスト追加（RED）
- [ ] CoreクラスにvalidateDictionaryメソッド実装（GREEN）
- [ ] main.tsのvalidateDictionaryから呼び出し変更
- [ ] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
- [ ] `deno test tests/core_test.ts`でテストパス
- [ ] `deno test tests/*dictionary*.ts`で辞書テストパス

##### sub2-5 dispatcher統合
@target: denops/hellshake-yano/core.ts, denops/hellshake-yano/main.ts
@context: dispatcherメソッドをCoreクラスへ委譲

###### sub2-5-1 updateConfigメソッドの移行
- [ ] tests/core_test.tsにupdateConfigのテスト追加（RED）
- [ ] CoreクラスにupdateConfigメソッド実装（GREEN）
- [ ] main.tsのdispatcher.updateConfigから呼び出し変更
- [ ] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
- [ ] `deno test tests/core_test.ts`でテストパス
- [ ] `deno test tests/config_*.ts`で設定テストパス

###### sub2-5-2 showHintsメソッド群の更新
- [ ] Coreクラスのshow Hintsメソッド実装確認
- [ ] main.tsのdispatcher.showHintsをCore呼び出しに変更
- [ ] main.tsのdispatcher.showHintsInternalをCore呼び出しに変更
- [ ] main.tsのdispatcher.showHintsWithKeyをCore呼び出しに変更
- [ ] `deno check denops/hellshake-yano/main.ts`で型チェック
- [ ] `deno test tests/main_test.ts`で既存テストパス

###### sub2-5-3 hideHintsメソッドの更新
- [ ] main.tsのdispatcher.hideHintsをCore呼び出しに変更（既実装）
- [ ] `deno check denops/hellshake-yano/main.ts`で型チェック
- [ ] `deno test tests/main_test.ts`で既存テストパス

###### sub2-5-4 clearCacheメソッドの移行
- [ ] tests/core_test.tsにclearCacheのテスト追加（RED）
- [ ] CoreクラスにclearCacheメソッド実装（GREEN）
- [ ] main.tsのdispatcher.clearCacheから呼び出し変更
- [ ] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
- [ ] `deno test tests/core_test.ts`でテストパス

###### sub2-5-5 debugメソッドの更新
- [ ] main.tsのdispatcher.debugをCore.collectDebugInfo呼び出しに変更
- [ ] main.tsのdispatcher.getDebugInfoをCore.collectDebugInfo呼び出しに変更
- [ ] `deno check denops/hellshake-yano/main.ts`で型チェック
- [ ] `deno test tests/main_test.ts`で既存テストパス

###### sub2-5-6 clearPerformanceLogメソッドの移行
- [ ] tests/core_test.tsにclearPerformanceLogのテスト追加（RED）
- [ ] CoreクラスにclearPerformanceLogメソッド実装（GREEN）
- [ ] main.tsのdispatcher.clearPerformanceLogから呼び出し変更
- [ ] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
- [ ] `deno test tests/core_test.ts`でテストパス

###### sub2-5-7 テスト関連メソッドの移行（オプション）
- [ ] テストメソッドをCoreクラスに移行するか検討
- [ ] 移行する場合はTDD手順で実装
- [ ] main.tsから呼び出し変更
- [ ] `deno check denops/hellshake-yano/{core,main}.ts`で型チェック
- [ ] `deno test tests/*.ts`で全テストパス

##### sub2-6 main.tsの最小化
@target: denops/hellshake-yano/main.ts
@context: 不要なコードを削除し、エントリーポイントのみに縮小

###### sub2-6-1 内部関数の削除
- [ ] Coreクラスへ移行済みの内部関数を削除
- [ ] 不要なヘルパー関数を削除
- [ ] デッドコードの削除
- [ ] `deno check denops/hellshake-yano/main.ts`で型チェック
- [ ] `deno test tests/main_test.ts`で既存テストパス

###### sub2-6-2 インポートの整理
- [ ] 不要になったインポートを削除
- [ ] Coreクラスのインポートを最適化
- [ ] `deno check denops/hellshake-yano/main.ts`で型チェック

###### sub2-6-3 エクスポートの整理（後方互換性維持）
- [ ] 必要なエクスポートを維持（後方互換性）
- [ ] Coreクラスへの委譲を明確化
- [ ] エクスポート関数をCore呼び出しのラッパーに変更
- [ ] `deno check denops/hellshake-yano/main.ts`で型チェック
- [ ] `deno test tests/*.ts`で全テストパス（75ファイル）

###### sub2-6-4 dispatcher定義の簡素化
- [ ] dispatcherメソッドをすべてCore呼び出しに変更
- [ ] 不要なコメントと空行を削除
- [ ] `deno check denops/hellshake-yano/main.ts`で型チェック
- [ ] `deno test tests/integration_test.ts`で統合テストパス

###### sub2-6-5 最終検証
- [ ] main.tsが500行以内であることを確認
- [ ] `deno check denops/hellshake-yano/`で全体の型チェック
- [ ] `deno test tests/*.ts`で全75個のテストファイルがパス
- [ ] 後方互換性の最終確認

##### sub2-7 ドキュメント更新
@target: docs/, README.md
@context: リファクタリング完了後のドキュメント整備

- [ ] main.tsの新しい構造をドキュメント化
- [ ] Coreクラスの公開APIリファレンス作成
- [ ] 移行ガイドの更新
- [ ] パフォーマンス改善結果の記載

#### 成果物と期待される改善
- main.ts: 3,456行 → 約500行（85%削減）
- core.ts: 約2,000行（新規作成）
- 完全な後方互換性の維持
- 全75個のテストファイルがパス
- 責務の明確な分離による保守性向上
- TDD実装による品質保証

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
- [ ] v2移行のための一時的コードの削除
- [ ] v2移行のための一時的ユニットテストの削除

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
