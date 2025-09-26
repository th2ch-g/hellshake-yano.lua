# main.ts アーキテクチャドキュメント

## 概要

Hellshake-Yano.vim v2.0のメインエントリーポイントである`main.ts`は、大規模なリファクタリングを経て、コア機能を`Core`クラスに委譲する軽量な**Dispatcher Pattern**を実装しています。

## アーキテクチャの変遷

### v1.x (リファクタリング前)
- **単一ファイル**: 3,456行の巨大なファイル
- **全機能内包**: すべてのロジックがmain.tsに集約
- **保守性の課題**: コードの複雑性と可読性の問題

### v2.0 (リファクタリング後)
- **軽量エントリーポイント**: 781行（77%削減）
- **コア機能分離**: 重要なロジックは`Core`クラスに移行
- **明確な責任分離**: エントリーポイントとビジネスロジックの分離

## main.ts の新しい構造

### 1. エントリーポイント機能
```typescript
export async function main(denops: Denops): Promise<void>
```
- Denopsプラグインの初期化
- 設定の読み込みと正規化
- Dispatcherの登録

### 2. Dispatcher パターンの実装

#### 基本コマンド
```typescript
denops.dispatcher = {
  async enable(): Promise<void>,
  async disable(): Promise<void>,
  async toggle(): Promise<void>,
  async setCount(count: unknown): Promise<void>,
  async setTimeout(timeout: unknown): Promise<void>,
  // ... その他のコマンド
}
```

#### ヒント表示関連
- `showHints`: ヒントの表示
- `hideHints`: ヒントの非表示
- `displayHintsAsync`: 非同期ヒント表示

#### 設定・デバッグ関連
- `updateConfig`: 設定の更新
- `getConfig`: 現在の設定取得
- `getDebugInfo`: デバッグ情報取得

#### 辞書システム
- `reloadDictionary`: 辞書の再読み込み
- `addToDictionary`: 辞書への単語追加
- `editDictionary`: 辞書の編集
- `showDictionary`: 辞書の表示

### 3. 後方互換性の維持

#### エクスポートされた公開関数（後方互換性用）
```typescript
// 設定関連
export function getMinLengthForKey(config, key): number
export function getMotionCountForKey(key, config): number
export function validateConfig(cfg): { valid: boolean; errors: string[] }
export function getDefaultConfig(): Config

// ヒント生成・表示関連
export function generateHintsOptimized(wordCount, markers): string[]
export async function detectWordsOptimized(denops, bufnr): Promise<Word[]>
export async function displayHintsOptimized(denops, hints): Promise<void>

// ハイライト関連
export function validateHighlightColor(color): { valid: boolean; errors: string[] }
export function generateHighlightCommand(groupName, color): string
export function normalizeColorName(color): string

// 辞書関連
export async function reloadDictionary(denops): Promise<void>
export async function addToDictionary(denops, word, meaning?, type?): Promise<void>
```

### 4. Core クラスとの連携

main.tsは直接的なビジネスロジックを持たず、重要な処理は`Core`クラスに委譲：

```typescript
import { Core } from "./core.ts";

// 実際の実装例
const core = Core.getInstance(config);
await core.showHints(denops);
```

## 依存関係

### 主要インポート
```typescript
// Denops基盤
import type { Denops } from "@denops/std";

// Core機能
import { Core } from "./core.ts";

// 型定義
import type { Config, HighlightColor, ... } from "./types.ts";

// 設定システム
import { UnifiedConfig, toUnifiedConfig, ... } from "./config.ts";

// コマンドシステム
import { enable, disable, toggle, ... } from "./commands.ts";

// ライフサイクル管理
import { initializePlugin, healthCheck, ... } from "./lifecycle.ts";
```

### 内部状態管理

#### グローバル変数（最小限）
```typescript
let config: UnifiedConfig = getDefaultUnifiedConfig();
let currentHints: HintMapping[] = [];
let hintsVisible = false;
let extmarkNamespace: number | undefined;
let performanceMetrics: PerformanceMetrics = { ... };
```

#### キャッシュシステム
```typescript
const wordsCache = new LRUCache<string, Word[]>(100);
const hintsCache = new LRUCache<string, string[]>(50);
```

## 設計原則

### 1. 単一責任原則
- main.ts: エントリーポイントとDispatcher
- Core: ビジネスロジックとステート管理
- 各モジュール: 専門的な機能

### 2. 開放閉鎖原則
- 新機能はCoreクラスに追加
- main.tsのDispatcherは最小限の変更で拡張可能

### 3. 依存関係逆転原則
- main.tsは抽象化されたCoreに依存
- 具体的な実装はCoreが担当

### 4. インターフェース分離原則
- 公開APIと内部実装の明確な分離
- 必要な機能のみを公開

## パフォーマンスの改善

### コード削減
- **削減率**: 77% (3,456行 → 781行)
- **保守性**: モジュラー構造による改善
- **テスタビリティ**: 単一責任による向上

### メモリ効率
- LRUキャッシュによる最適化
- 不要な状態の削減
- Core クラスでの統一状態管理

## テスト戦略

### 1. エントリーポイントのテスト
- Dispatcher機能の動作確認
- 設定の正規化テスト
- 初期化プロセスの検証

### 2. 後方互換性のテスト
- エクスポートされた関数の動作確認
- 既存のAPIの互換性保証

### 3. 統合テスト
- main.tsとCoreクラスの連携テスト
- 全体的なワークフローの検証

## 今後の拡張性

### 新機能追加の流れ
1. Coreクラスにビジネスロジックを実装
2. main.tsのDispatcherに新しいエンドポイントを追加
3. 必要に応じて公開APIを拡張

### モジュール分離の継続
- さらなるモジュール化の可能性
- 機能別パッケージへの分離検討

## まとめ

main.ts v2.0は、軽量なエントリーポイントとして機能し、Coreクラスとの明確な責任分離を実現しています。これにより、保守性、テスタビリティ、および拡張性が大幅に向上し、TDD（テスト駆動開発）アプローチによる継続的な改善が可能になりました。