# title: any型の削除と厳密な型指定

## 概要
- コード全体から `any` 型を削除し、厳密な型指定を行うことで、TypeScriptの型システムを最大限に活用し、コンパイル時のエラー検出、IDE補完の改善、保守性の向上を実現する

### goal
- 開発者がコードを編集する際、IDEが正確な型情報を提供し、タイポや型ミスマッチをコンパイル時に検出できる
- リファクタリング時に型システムが変更の影響範囲を明確にし、安全な変更を可能にする
- 新規参画者がコードベースの型定義を読むだけで、各関数・インターフェースの役割を理解できる

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること

## 開発のゴール
- プロダクションコード内の `any` 型 (143箇所) を厳密な型定義に置き換える
- 型安全性を損なわない範囲でテストコードの `any` 型を改善する
- 型推論が効く設計にし、型アノテーションの冗長性を削減する
- 後方互換性を保ちながら段階的に移行する

## 実装仕様

### 調査結果サマリー
- **総検出数**: 375箇所
- **プロダクションコード**: 143箇所 (7ファイル)
  - denops/hellshake-yano/types.ts: 14箇所
  - denops/hellshake-yano/config.ts: 18箇所
  - denops/hellshake-yano/core.ts: 74箇所
  - denops/hellshake-yano/word.ts: 21箇所
  - denops/hellshake-yano/hint.ts: 1箇所
  - denops/hellshake-yano/cache.ts: 2箇所
  - denops/hellshake-yano/validation.ts: 2箇所
- **テストコード**: 232箇所 (31ファイル)

### 優先度分類
- **高 (Critical)**: types.ts の基盤型定義 (config, dependencies)
- **中 (Important)**: config.ts のバリデーション層、mock.ts
- **低 (Optional)**: テストコード内の意図的な any 使用

## 生成AIの学習用コンテキスト
### 型定義ファイル
- denops/hellshake-yano/types.ts
  - 基盤となる型定義が集約されている
  - DetectionContext, DebugInfo, 各種Config関連インターフェース
  - HintOperationsDependencies の新規定義が必要

### 設定管理ファイル
- denops/hellshake-yano/config.ts
  - ValidationRules インターフェース
  - validateConfig, validateConfigValue, validateConfigObject 関数

### テストヘルパー
- tests/helpers/mock.ts
  - MockDenops クラス
  - ジェネリクスによる型安全化が必要

## Process

### process1 基盤型定義の厳密化 (Phase 1)
@target: denops/hellshake-yano/types.ts
@ref: denops/hellshake-yano/config.ts

#### sub1 Config関連インターフェースの修正 ✅ 完了 (2025-10-01)
- [x] DetectionContext.config を `any` から `Partial<Config>` に変更
- [x] WordDetectionConfig.config を `any` から `Partial<Config>` に変更
- [x] DetectWordsParams.config を `any` から `Partial<Config>` に変更
- [x] HintGenerationConfig.config を `any` から `Partial<Config>` に変更
- [x] GenerateHintsParams.config を `any` から `Partial<Config>` に変更
- [x] HintOperationsConfig.config を `any` から `Partial<Config>` に変更
  - `Partial<Config>` を使用することで、既存コードとの互換性を保ちつつ型安全性を向上
  - 部分的な設定オブジェクトを受け入れる柔軟性を維持
  - ✅ TDD Red-Green-Refactorサイクルで実装完了
  - ✅ tests/types_process1_test.ts で11個のテストが全て通過
  - ✅ ドキュメントコメントを追加し、型安全性の改善を明記

#### sub2 DebugInfo型の修正 ✅ 完了 (2025-10-01)
- [x] DebugInfo.config を `Config | any` から `Config` に変更
  - `Config | any` は実質的に `any` と同じため、単に `Config` に変更
  - デバッグ情報は完全な設定オブジェクトを持つべき
  - ✅ TDD Red-Green-Refactorサイクルで実装完了
  - ✅ 型チェックが通り、既存テストも壊れていないことを確認

#### sub3 Dependencies型の新規定義 ✅ 完了 (2025-10-01)
- [x] HintOperationsDependencies インターフェースを新規作成
- [x] detectWordsOptimized の型シグネチャを定義
  - `(denops: Denops, bufnr?: number) => Promise<Word[]>`
- [x] generateHintsOptimized の型シグネチャを定義
  - `(wordCount: number, config?: Partial<Config>) => string[]`
- [x] assignHintsToWords の型シグネチャを定義
  - `(words: Word[], hints: string[]) => HintMapping[]`
- [x] displayHintsAsync の型シグネチャを定義
  - `(denops: Denops, hints: HintMapping[], config?: Partial<Config>) => Promise<void>`
- [x] hideHints の型シグネチャを定義
  - `(denops: Denops) => Promise<void>`
- [x] recordPerformance の型シグネチャを定義
  - `(operation: string, startTime: number, endTime: number) => void`
- [x] clearHintCache の型シグネチャを定義
  - `() => void`
- ✅ 完全なDI型定義を追加し、依存性注入パターンの型安全性を向上
- ✅ 使用例を含む詳細なドキュメントコメントを追加

#### sub4 HintOperationsConfig.dependencies の型適用 ✅ 完了 (2025-10-01)
- [x] dependencies プロパティの型を `any` から `HintOperationsDependencies` に変更
  - 依存性注入パターンにおける型安全性の向上
  - ✅ Sub3で定義した型を正しく適用
  - ✅ IDE補完が効き、型ミスマッチをコンパイル時に検出可能に

### process2 バリデーション層の改善 (Phase 2) ✅ 完了 (2025-10-01)
@target: denops/hellshake-yano/config.ts
@ref: denops/hellshake-yano/types.ts

#### sub1 ValidationRules インターフェースの厳密化 ✅ 完了
- [x] enum プロパティを `readonly any[]` から `readonly (string | number | boolean)[]` に変更
  - バリデーション対象の値は通常プリミティブ型であるため、具体的な型を指定
  - ✅ プリミティブ型のみを受け入れるように厳密化
- [x] custom プロパティを `(value: any) => boolean` から `(value: unknown) => boolean` に変更
  - `unknown` を使用することで、関数内での型チェックを強制
  - ✅ 型ガードの使用を強制し、型安全性を向上

#### sub2 validateConfig 関数の改善 ✅ 完了
- [x] 型アサーション `const c = config as any` を `const c = config as Record<string, unknown>` に変更
  - `Record<string, unknown>` は `any` よりも型安全で、プロパティアクセスが可能
  - ✅ より型安全なアサーションに変更
- [x] 各バリデーションロジックで適切な型ガードを使用
  - `typeof`, `Array.isArray()` などを活用
  - ✅ 型ガードを明示的に使用してプロパティを検証

#### sub3 validateConfigValue 関数の改善 ✅ 完了
- [x] value パラメータの型を `any` から `unknown` に変更
  - ✅ unknown型により型安全性を強制
- [x] 型チェックロジックで型ガードを明示的に使用
  - `unknown` から具体的な型への変換を型ガードで保証
  - ✅ typeof、Array.isArray()による型ガードを追加

#### sub4 validateConfigObject 関数の改善 ✅ 完了
- [x] config パラメータの型を `Record<string, any>` から `Record<string, unknown>` に変更
  - ✅ より型安全なRecord型に変更
- [x] 型安全性を保ちながら柔軟なバリデーションを実現
  - ✅ 既存の機能を維持しつつ型安全性を向上

#### sub5 その他のバリデーション関数 ✅ 完了
- [x] isValidType, isInRange, isValidLength 等の型シグネチャを見直し
  - ✅ isValidType: value を unknown に変更
  - ✅ isValidArrayLength: array を unknown[] に変更
  - ✅ isValidEnum: value を unknown、validValues を readonly (string | number | boolean)[] に変更
- [x] 必要に応じて `any` を `unknown` に変更
  - ✅ 全てのバリデーション関数で型安全性を向上

#### 実装成果
- ✅ TDD Red-Green-Refactorサイクルで実装完了
- ✅ tests/config_process2_test.ts に17個のテストを追加（全て通過）
- ✅ 既存のconfig関連テストも全て通過（35 passed）
- ✅ 型チェックエラーなし
- ✅ any型の削減: ValidationRules, validateConfig, validateConfigValue, validateConfigObject, isValidType, isValidArrayLength, isValidEnum
- ✅ unknown型の導入により型ガードの使用を強制し、実行時の型安全性を向上

### process3 テストヘルパーの型安全化 (Phase 3) ✅ 完了 (2025-10-01)
@target: tests/helpers/mock.ts

#### sub1 MockDenops クラスの改善 ✅ 完了
- [x] call メソッドをジェネリクスで型安全化
  - `call<T = unknown>(method: string, ...args: unknown[]): Promise<T>`
  - 呼び出し側で戻り値の型を指定可能にする
  - ✅ ジェネリクスにより型推論が効くようになった
- [x] setCallResponse メソッドをジェネリクスで型安全化
  - `setCallResponse<T = unknown>(method: string, response: T): void`
  - レスポンスの型を保持
  - ✅ 型パラメータによりレスポンスの型を保持可能に
- [x] onCall メソッドをジェネリクスで型安全化
  - `onCall<TArgs extends unknown[] = unknown[], TReturn = unknown>(method: string, handler: (...args: TArgs) => TReturn): void`
  - ハンドラーの引数と戻り値の型を指定可能にする
  - ✅ 複数の型パラメータで柔軟な型指定が可能に

#### sub2 内部プロパティの型改善 ✅ 完了
- [x] callResponses を `Map<string, unknown>` に変更
  - ✅ any型からunknown型に変更し、型安全性を向上
- [x] callHandlers の型定義を改善
  - ジェネリクスに対応した型定義に変更
  - ✅ `Map<string, (...args: unknown[]) => unknown>` に変更

#### sub3 その他のモック関数 (スキップ)
- [ ] createMockDenops 系関数の戻り値の型を明示
  - 現在、該当する関数が存在しないためスキップ
- [ ] 各モックの型推論が効くように改善
  - MockDenopsクラス自体の改善により達成

#### 実装成果
- ✅ TDD Red-Green-Refactorサイクルで実装完了
- ✅ tests/mock_process3_test.ts に12個のテストを追加（全て通過）
- ✅ 既存のテスト（process1, process2）も全て通過
- ✅ 型チェックエラーなし
- ✅ any型の削減: callResponses (Map<string, any> → Map<string, unknown>)
- ✅ ジェネリクスの導入により、呼び出し側で型を指定可能に
  - `call<T>`: 戻り値の型を指定
  - `setCallResponse<T>`: レスポンスの型を保持
  - `onCall<TArgs, TReturn>`: ハンドラーの引数と戻り値の型を指定
- ✅ デフォルト型パラメータにより後方互換性を保持
- ✅ 詳細なドキュメントコメントを追加し、使用例を記載

### process4 core.ts, word.ts, hint.ts の個別対応
@target: denops/hellshake-yano/core.ts, denops/hellshake-yano/word.ts, denops/hellshake-yano/hint.ts

#### sub1 core.ts の any 型調査と対応 ✅ 一部完了 (2025-10-01)
- [x] 74箇所の any 型使用箇所を個別に調査・分類
- [x] Green Phase 1: 関数パラメータのany型を修正（10箇所削減）
  - initializePlugin, cleanupPlugin, healthCheck の Denops 型適用
  - enable, disable, toggle, setCount, setTimeoutCommand の Config 型適用
  - updatePluginState の Partial<PluginState> 型適用
- [x] Green Phase 2: 戻り値の型を明示（4箇所削減）
  - getPluginStatistics, getPluginState の戻り値型定義
  - InitializeResult, HealthCheckResult, PluginStatistics インターフェース追加
- [x] ローカル変数の型を改善（1箇所削減）
  - pluginState: any → pluginState: PluginState
  - PluginState インターフェースの新規定義
- [x] TDD Red-Green-Refactor サイクルで実装
  - tests/core_process4_sub1_test.ts 作成（14個のテスト、全て通過）
  - 型チェック付きでテスト成功を確認
- ✅ 削減実績: 74箇所 → 67箇所（7箇所削減、約9.5%改善）
- 📝 残タスク: CommandFactory の戻り値型、Core クラス内部の any 型（60箇所）

#### sub2 word.ts の any 型調査と対応 ✅ 完了 (2025-10-01)
- [x] 21箇所の any 型使用箇所を個別に調査・分類
- [x] 単語検出関連の型定義を厳密化
  - DetectionContext, WordDetectionResult, Word 型の活用
  - ✅ TDD Red-Green-Refactorサイクルで実装完了
  - ✅ tests/word_process4_sub2_test.ts に12個のテストを追加（全て通過）
  - ✅ 既存のword関連テストも全て通過
  - ✅ 型チェックエラーなし
- [x] any型の削減実績: 21箇所 → 0箇所（100%削減、実質的なany型は全て削除）
  - parseYamlDictionary: `as any` → `as unknown` に変更
  - convertToUserDictionary: `data: any` → `data: unknown` + 型ガードで安全に変換
  - HintPatternProcessor: `any[]` → `WordWithPriority[]` に変更
    - applyHintPatterns, findWordAtPosition, sortByHintPriority
    - WordWithPriority インターフェースを新規定義
  - Config型アサーション: `(config as any).wordDetectionStrategy` → EnhancedWordConfig型を使用
    - EnhancedWordConfig に wordDetectionStrategy プロパティを追加
    - 6箇所の型アサーション (as any) を削減
- ✅ 型安全性の向上:
  - unknown型 + 型ガードによる実行時型検証の導入
  - Word型の拡張（WordWithPriority）による型安全な優先度管理
  - IDE補完が効き、コンパイル時の型チェックが機能
- ✅ ドキュメントコメントを追加し、Process4 Sub2での改善内容を明記

#### sub3 hint.ts, cache.ts, validation.ts の対応 ✅ 完了 (2025-10-01)
- [x] hint.ts (1箇所), cache.ts (2箇所), validation.ts (2箇所) の any 型を修正
- [x] 各モジュールの責務に応じた適切な型定義を適用
  - ✅ TDD Red-Green-Refactorサイクルで実装完了
  - ✅ tests/process4_sub3_test.ts に7個のテストを追加（全て通過）
  - ✅ any型の削減実績: 5箇所 → 0箇所（100%削減）
  - ✅ 型安全性の向上:
    - hint.ts: `Record<string, any>` → `Record<string, CacheStatistics>` + HintCacheStatistics インターフェース定義
    - cache.ts (2箇所):
      - `LRUCache.forEach` の `thisArg?: any` → `thisArg?: unknown` に変更
      - `Map<CacheType, LRUCache<any, any>>` → `Map<CacheType, LRUCache<unknown, unknown>>` に変更
    - validation.ts (2箇所):
      - `const c = cfg as any` → `const c = cfg as Record<string, unknown>` に変更
      - `validateHighlightConfig(config: { [key: string]: any })` → `validateHighlightConfig(config: Record<string, unknown>)` に変更
  - ✅ unknown型 + 型ガードによる実行時型検証の導入
  - ✅ ジェネリック型の活用により型安全性を保ちながら柔軟性を維持
  - ✅ ドキュメントコメントを追加し、Process4 Sub3での改善内容を明記

### process5 テストコードの段階的改善
@target: tests/**/*.ts

#### sub1 意図的な any 使用の判別
- [ ] テストコード内の any 型使用箇所を分類
  - 意図的な無効値テスト: 保持
  - ランタイム依存API: 保持 (型定義が存在しない)
  - 改善可能な箇所: 修正対象

#### sub2 改善可能な箇所の修正
- [ ] モックオブジェクト作成時の型定義を改善
- [ ] テストヘルパー関数の型定義を厳密化
- [ ] as any の使用を最小限に抑える

#### sub3 テストの型安全性向上
- [ ] テストケースで型推論が効くように改善
- [ ] 型エラーが発生しないことを確認

### process10 ユニットテスト
@target: tests/**/*_test.ts

#### sub1 既存テストの実行
- [ ] `deno test` で全テストが通ることを確認
- [ ] 型変更による影響がないことを検証

#### sub2 型安全性のテスト追加
- [ ] types.ts の新しい型定義に対するテストを追加
- [ ] 型ガード関数のテストを追加
- [ ] バリデーション関数の型安全性を検証

#### sub3 モックの動作確認
- [ ] MockDenops クラスの新しい型シグネチャをテスト
- [ ] ジェネリクスの型推論が正しく動作することを確認

### process50 フォローアップ

#### sub1 型エラーの修正
- [ ] 型変更によって発生したコンパイルエラーを修正
- [ ] 各モジュールの型整合性を確認

#### sub2 型定義のドキュメント更新
- [ ] types.ts のコメントを更新
- [ ] 新しい HintOperationsDependencies インターフェースの説明を追加

#### sub3 マイグレーションガイドの作成
- [ ] any 型から厳密な型への移行パターンをドキュメント化
- [ ] 今後の開発で any 型を避けるためのガイドラインを作成

### process100 リファクタリング

#### sub1 型定義の最適化
- [ ] 重複する型定義を統合
- [ ] 型エイリアスの活用で可読性を向上
- [ ] ジェネリクスの適切な活用

#### sub2 型推論の改善
- [ ] 型アノテーションの冗長性を削減
- [ ] 型推論が効く設計に変更
- [ ] 関数のシグネチャを最適化

#### sub3 パフォーマンスへの影響確認
- [ ] 型チェックのオーバーヘッドを測定
- [ ] 必要に応じて型定義を簡略化

### process200 ドキュメンテーション

#### sub1 README の更新
- [ ] 型安全性の向上について記載
- [ ] 開発者向けの型システム活用ガイドを追加

#### sub2 CHANGELOG の更新
- [ ] any 型削除の変更内容を記載
- [ ] 破壊的変更がないことを明記
- [ ] 開発者への影響を説明

#### sub3 型定義のドキュメント
- [ ] types.ts の各インターフェースの使用例を追加
- [ ] 型ガード関数の使い方を説明
- [ ] ベストプラクティスをドキュメント化
