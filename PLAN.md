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
#### sub1 統一キャッシュクラスの作成
@target: denops/hellshake-yano/cache.ts
@ref: denops/hellshake-yano/utils/cache.ts, denops/hellshake-yano/hint.ts
- [ ] UnifiedCacheクラスの実装（5種類のキャッシュタイプ）
- [ ] シングルトンパターンの実装
- [ ] LRUキャッシュの統一利用
- [ ] キャッシュ統計機能の追加

#### sub2 既存キャッシュの置き換え
@target: 各ファイルのキャッシュ実装箇所
- [ ] hint.tsの4つのMapキャッシュを置き換え
- [ ] main.tsの2つのLRUCacheを置き換え
- [ ] word/detector.tsのglobalWordCacheを置き換え
- [ ] その他17箇所のキャッシュを統合

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
