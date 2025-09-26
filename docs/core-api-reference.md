# Core クラス API リファレンス

## 概要

`Core`クラスは、Hellshake-Yano.vim v2.0の中核となるビジネスロジックを集約したシングルトンクラスです。TDD（テスト駆動開発）アプローチに従って設計され、652個のテストが全てパスする堅牢な実装を提供しています。

## アーキテクチャ

### シングルトンパターン
```typescript
const core = Core.getInstance(config);
```

- **単一インスタンス**: プラグイン全体で一意のインスタンスを保証
- **スレッドセーフ**: 安全なインスタンス管理
- **テスト対応**: `resetForTesting()` によるテスト間の分離

## 静的メソッド（Static Methods）

### インスタンス管理

#### `getInstance(config?: Partial<Config>): Core`
シングルトンインスタンスを取得します。

**パラメータ:**
- `config` (オプション): 初期設定オブジェクト

**戻り値:**
- `Core`: シングルトンインスタンス

**使用例:**
```typescript
const core = Core.getInstance({
  enabled: true,
  use_japanese: true
});
```

#### `resetForTesting(): void`
テスト用のインスタンスリセット機能です。

**使用例:**
```typescript
// テスト前のクリーンアップ
Core.resetForTesting();
```

### 設定関連

#### `getMinLengthForKey(config: UnifiedConfig | Config, key: string): number`
指定されたキーに対する最小単語長を取得します。

**パラメータ:**
- `config`: 設定オブジェクト（UnifiedConfig または Config）
- `key`: キー文字列

**戻り値:**
- `number`: 最小単語長（優先度: per_key_min_length → default_min_word_length → default_min_length → min_length → 3）

#### `getMotionCountForKey(key: string, config: UnifiedConfig | Config): number`
指定されたキーに対するモーション回数を取得します。

**パラメータ:**
- `key`: キー文字列
- `config`: 設定オブジェクト

**戻り値:**
- `number`: モーション回数（デフォルト: 2）

### ハイライト・色関連

#### `validateHighlightGroupName(groupName: string): boolean`
ハイライトグループ名の妥当性を検証します。

#### `isValidColorName(colorName: string): boolean`
色名の妥当性を検証します。

#### `isValidHexColor(hexColor: string): boolean`
16進数色コードの妥当性を検証します。

#### `normalizeColorName(color: string): string`
色名を正規化します。

#### `validateHighlightColor(colorConfig: string | HighlightColor): { valid: boolean; errors: string[] }`
ハイライト色設定の妥当性を検証します。

#### `generateHighlightCommand(hlGroupName: string, colorConfig: string | HighlightColor): string`
Vimのハイライトコマンドを生成します。

#### `validateHighlightConfig(config: object): { valid: boolean; errors: string[] }`
ハイライト設定全体の妥当性を検証します。

## インスタンスメソッド（Instance Methods）

### 基本操作

#### `getConfig(): Config`
現在の設定を取得します。

**戻り値:**
- `Config`: 設定オブジェクトのコピー

#### `updateConfig(newConfig: Partial<Config>): void`
設定を更新します。

**パラメータ:**
- `newConfig`: 更新する設定オブジェクト

#### `isEnabled(): boolean`
プラグインが有効かどうかを確認します。

#### `isHintsVisible(): boolean`
ヒントが表示中かどうかを確認します。

#### `cleanup(): void`
内部状態をクリーンアップします。

### ヒント表示・操作

#### `async showHints(denops: Denops): Promise<void>`
ヒントを表示します。

**パラメータ:**
- `denops`: Denops インスタンス

#### `async showHintsWithKey(denops: Denops, key: string, mode?: string): Promise<void>`
特定のキーでヒントを表示します。

**パラメータ:**
- `denops`: Denops インスタンス
- `key`: 対象キー
- `mode` (オプション): Vimモード

#### `async hideHintsOptimized(denops: Denops): Promise<void>`
最適化されたヒント非表示処理を実行します。

#### `hideHints(): void`
ヒントを非表示にします（同期処理）。

#### `setCurrentHints(hints: HintMapping[]): void`
現在のヒントを設定します。

#### `getCurrentHints(): HintMapping[]`
現在のヒント一覧を取得します。

### 単語検出

#### `detectWords(context?: DetectionContext): WordDetectionResult`
単語検出を実行します（同期処理）。

#### `async detectWordsOptimized(denops: Denops, bufnr: number): Promise<Word[]>`
最適化された単語検出を実行します。

**パラメータ:**
- `denops`: Denops インスタンス
- `bufnr`: バッファ番号

**戻り値:**
- `Promise<Word[]>`: 検出された単語の配列

### ヒント生成

#### `generateHints(words: Word[]): HintMapping[]`
ヒントマッピングを生成します。

#### `generateHintsOptimized(wordCount: number, markers: string[]): string[]`
最適化されたヒント生成を実行します。

**パラメータ:**
- `wordCount`: 単語数
- `markers`: マーカー文字列の配列

**戻り値:**
- `string[]`: 生成されたヒント文字列の配列

### 状態管理

#### `getState(): CoreState`
現在の内部状態を取得します。

#### `setState(state: CoreState): void`
内部状態を設定します。

#### `initializeState(): void`
状態を初期化します。

### ユーザー入力処理

#### `async waitForUserInput(denops: Denops): Promise<void>`
ユーザー入力を待機します。

### キャッシュ管理

#### `clearCache(): void`
内部キャッシュをクリアします。

### デバッグ・メトリクス

#### `collectDebugInfo(): DebugInfo`
デバッグ情報を収集します。

#### `clearDebugInfo(): void`
デバッグ情報をクリアします。

### 辞書システム

#### `async initializeDictionarySystem(denops: Denops): Promise<void>`
辞書システムを初期化します。

#### `hasDictionarySystem(): boolean`
辞書システムが利用可能かどうかを確認します。

#### `async reloadDictionary(denops: Denops): Promise<void>`
辞書を再読み込みします。

#### `async addToDictionary(denops: Denops, word: string, meaning: string, type: string): Promise<void>`
辞書に単語を追加します。

#### `async editDictionary(denops: Denops): Promise<void>`
辞書を編集します。

#### `async showDictionary(denops: Denops): Promise<void>`
辞書の内容を表示します。

#### `async validateDictionary(denops: Denops): Promise<void>`
辞書の妥当性を検証します。

### レンダリング制御

#### `isRenderingHints(): boolean`
ヒントがレンダリング中かどうかを確認します。

#### `abortCurrentRendering(): void`
現在のレンダリングを中断します。

### モーション処理

#### `handleMotion(motion: string, context?: DetectionContext): void`
Vimモーションを処理します。

## 使用例

### 基本的な使用パターン

```typescript
import { Core } from "./core.ts";
import type { Denops } from "@denops/std";

// 1. インスタンスの取得
const core = Core.getInstance({
  enabled: true,
  use_japanese: true,
  hint_keys: ["a", "s", "d", "f"]
});

// 2. ヒントの表示
async function showHints(denops: Denops) {
  if (core.isEnabled()) {
    await core.showHints(denops);
  }
}

// 3. 設定の更新
core.updateConfig({
  min_length: 4,
  hint_keys: ["j", "k", "l", ";"]
});

// 4. 状態の確認
if (core.isHintsVisible()) {
  console.log("Hints are currently visible");
}

// 5. クリーンアップ
core.cleanup();
```

### 辞書システムの使用

```typescript
// 辞書システムの初期化
await core.initializeDictionarySystem(denops);

// 辞書への単語追加
if (core.hasDictionarySystem()) {
  await core.addToDictionary(denops, "example", "例", "noun");
}

// 辞書の表示
await core.showDictionary(denops);
```

### デバッグ情報の取得

```typescript
// デバッグ情報の収集
const debugInfo = core.collectDebugInfo();
console.log("Current config:", debugInfo.config);
console.log("Performance metrics:", debugInfo.metrics);

// デバッグ情報のクリア
core.clearDebugInfo();
```

## 型定義

### 主要インターフェース

```typescript
interface Config {
  enabled: boolean;
  hint_keys: string[];
  min_length: number;
  use_japanese: boolean;
  // ... その他の設定項目
}

interface Word {
  text: string;
  line: number;
  col: number;
  byteCol?: number;
}

interface HintMapping {
  word: Word;
  hint: string;
  target: { line: number; col: number };
}

interface CoreState {
  config: Config;
  isActive: boolean;
  currentHints: HintMapping[];
  performanceMetrics: PerformanceMetrics;
}

interface DebugInfo {
  config: Config;
  hintsVisible: boolean;
  currentHints: HintMapping[];
  metrics: PerformanceMetrics;
  timestamp: number;
}
```

## エラーハンドリング

Core クラスのメソッドは適切なエラーハンドリングを実装しています：

```typescript
try {
  await core.showHints(denops);
} catch (error) {
  console.error("Failed to show hints:", error);
  // 適切なフォールバック処理
}
```

## パフォーマンス考慮事項

### キャッシュ戦略
- LRUキャッシュによる効率的なメモリ使用
- 必要に応じて `clearCache()` でキャッシュをクリア

### 非同期処理
- 重い処理は非同期メソッドとして実装
- `abortCurrentRendering()` でレンダリングの中断が可能

### メモリ管理
- 適切な `cleanup()` 呼び出しでメモリリークを防止

## テスト戦略

Coreクラスは652個のテストでカバーされており、以下のテスト戦略が採用されています：

1. **単体テスト**: 各メソッドの個別テスト
2. **統合テスト**: 複数メソッド間の連携テスト
3. **TDD**: Red-Green-Refactorサイクル
4. **テスト分離**: `resetForTesting()` による完全な分離

## バージョン

- **現在のバージョン**: 2.0.0
- **TDD方法論**: Red-Green-Refactor
- **テストカバレッジ**: 652テストが全てパス
- **後方互換性**: 完全に維持