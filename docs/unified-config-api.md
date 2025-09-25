# UnifiedConfig API リファレンス

## 概要

`UnifiedConfig`は、hellshake-yano.vimの全設定を単一のフラット構造で管理する統一設定インターフェースです。従来の階層化された複数のインターフェース（CoreConfig、HintConfig、WordConfigなど）を1つに統合し、camelCase命名規則に統一しています。

### 設計思想
- **フラット構造**: ネストなしの単一レベル設定
- **camelCase統一**: 全プロパティでcamelCaseを使用
- **型安全**: TypeScriptによる厳密な型定義
- **後方互換**: 旧設定インターフェースとの変換をサポート

## インターフェース定義

```typescript
export interface UnifiedConfig {
  // Core settings (6 properties)
  enabled: boolean;
  markers: string[];
  motionCount: number;
  motionTimeout: number;
  hintPosition: "start" | "end" | "same";
  visualHintPosition?: "start" | "end" | "same" | "both";

  // Hint settings (8 properties)
  triggerOnHjkl: boolean;
  countedMotions: string[];
  maxHints: number;
  debounceDelay: number;
  useNumbers: boolean;
  highlightSelected: boolean;
  debugCoordinates: boolean;
  singleCharKeys: string[];

  // Extended hint settings (4 properties)
  multiCharKeys: string[];
  maxSingleCharHints?: number;
  useHintGroups: boolean;
  highlightHintMarker: string | HighlightColor;

  // Word detection settings (7 properties)
  highlightHintMarkerCurrent: string | HighlightColor;
  suppressOnKeyRepeat: boolean;
  keyRepeatThreshold: number;
  useJapanese: boolean;
  minWordLength: number;
  perKeyMinLength: Record<string, number>;
  defaultMinWordLength: number;

  // Performance & Display settings (7 properties)
  wordDetectors: string[];
  cacheSize: number;
  enableHighlight: boolean;
  highlightTimeout: number;
  useTinySegmenter: boolean;
  useRegexWordBoundary: boolean;
  enableDebug: boolean;
}
```

## 設定項目詳細（32項目）

### Core Settings（基本設定）

#### `enabled: boolean`
- **説明**: プラグインの有効/無効状態
- **デフォルト**: `true`
- **例**: `enabled: true`

#### `markers: string[]`
- **説明**: ヒント表示に使用するマーカー文字の配列
- **デフォルト**: `["A", "S", "D", "F", "G", "H", "J", "K", "L"]`
- **例**: `markers: ["a", "b", "c", "d"]`

#### `motionCount: number`
- **説明**: 必要なモーション回数
- **デフォルト**: `3`
- **例**: `motionCount: 2`

#### `motionTimeout: number`
- **説明**: モーションのタイムアウト時間（ミリ秒）
- **デフォルト**: `2000`
- **例**: `motionTimeout: 1500`

#### `hintPosition: "start" | "end" | "same"`
- **説明**: 通常モードでのヒント表示位置
- **デフォルト**: `"start"`
- **例**: `hintPosition: "end"`

#### `visualHintPosition?: "start" | "end" | "same" | "both"`
- **説明**: Visualモードでのヒント表示位置（オプション）
- **デフォルト**: `undefined`
- **例**: `visualHintPosition: "both"`

### Hint Settings（ヒント設定）

#### `triggerOnHjkl: boolean`
- **説明**: hjklキーでのトリガーを有効にするか
- **デフォルト**: `false`
- **例**: `triggerOnHjkl: true`

#### `countedMotions: string[]`
- **説明**: カウント対象のモーション文字列配列
- **デフォルト**: `["w", "b", "e"]`
- **例**: `countedMotions: ["w", "b", "e", "f", "t"]`

#### `maxHints: number`
- **説明**: パフォーマンス最適化のための最大ヒント表示数
- **デフォルト**: `100`
- **例**: `maxHints: 50`

#### `debounceDelay: number`
- **説明**: ヒント表示のデバウンス遅延時間（ミリ秒）
- **デフォルト**: `50`
- **例**: `debounceDelay: 100`

#### `useNumbers: boolean`
- **説明**: 数字(0-9)をヒント文字として使用するか
- **デフォルト**: `false`
- **例**: `useNumbers: true`

#### `highlightSelected: boolean`
- **説明**: 選択中のヒントをハイライト表示するか
- **デフォルト**: `true`
- **例**: `highlightSelected: false`

#### `debugCoordinates: boolean`
- **説明**: 座標系デバッグログの出力有効/無効
- **デフォルト**: `false`
- **例**: `debugCoordinates: true`

#### `singleCharKeys: string[]`
- **説明**: 1文字ヒント専用のキー配列
- **デフォルト**: `[]`
- **例**: `singleCharKeys: ["f", "j"]`

### Extended Hint Settings（拡張ヒント設定）

#### `multiCharKeys: string[]`
- **説明**: 2文字以上のヒント専用のキー配列
- **デフォルト**: `[]`
- **例**: `multiCharKeys: ["w", "e", "r"]`

#### `maxSingleCharHints?: number`
- **説明**: 1文字ヒントの最大表示数（オプション）
- **デフォルト**: `undefined`
- **例**: `maxSingleCharHints: 10`

#### `useHintGroups: boolean`
- **説明**: ヒントグループ機能を使用するか
- **デフォルト**: `false`
- **例**: `useHintGroups: true`

#### `highlightHintMarker: string | HighlightColor`
- **説明**: ヒントマーカーのハイライト色設定
- **デフォルト**: `"HellshakeYanoHint"`
- **例**: `highlightHintMarker: { fg: "#FF0000", bg: "#000000" }`

### Word Detection Settings（単語検出設定）

#### `highlightHintMarkerCurrent: string | HighlightColor`
- **説明**: 選択中ヒントマーカーのハイライト色設定
- **デフォルト**: `"HellshakeYanoHintCurrent"`
- **例**: `highlightHintMarkerCurrent: "Visual"`

#### `suppressOnKeyRepeat: boolean`
- **説明**: キーリピート時のヒント表示を抑制するか
- **デフォルト**: `true`
- **例**: `suppressOnKeyRepeat: false`

#### `keyRepeatThreshold: number`
- **説明**: キーリピートと判定する時間の閾値（ミリ秒）
- **デフォルト**: `100`
- **例**: `keyRepeatThreshold: 150`

#### `useJapanese: boolean`
- **説明**: 日本語を含む単語検出を行うか
- **デフォルト**: `false`
- **例**: `useJapanese: true`

#### `minWordLength: number`
- **説明**: 検出する単語の最小文字数
- **デフォルト**: `3`
- **例**: `minWordLength: 2`

#### `perKeyMinLength: Record<string, number>`
- **説明**: キー別の最小単語文字数設定
- **デフォルト**: `{}`
- **例**: `perKeyMinLength: { "f": 1, "w": 3, "v": 1 }`

#### `defaultMinWordLength: number`
- **説明**: perKeyMinLengthで指定されていないキーのデフォルト最小文字数
- **デフォルト**: `3`
- **例**: `defaultMinWordLength: 2`

### Performance & Display Settings（パフォーマンス・表示設定）

#### `wordDetectors: string[]`
- **説明**: 使用する単語検出器のリスト
- **デフォルト**: `["regex", "tinysegmenter", "hybrid"]`
- **例**: `wordDetectors: ["regex", "hybrid"]`

#### `cacheSize: number`
- **説明**: キャッシュサイズ（エントリ数）
- **デフォルト**: `1000`
- **例**: `cacheSize: 2000`

#### `enableHighlight: boolean`
- **説明**: ハイライト表示を有効にするか
- **デフォルト**: `true`
- **例**: `enableHighlight: false`

#### `highlightTimeout: number`
- **説明**: ハイライト表示のタイムアウト時間（ミリ秒）
- **デフォルト**: `3000`
- **例**: `highlightTimeout: 5000`

#### `useTinySegmenter: boolean`
- **説明**: TinySegmenterを使用するか
- **デフォルト**: `true`
- **例**: `useTinySegmenter: false`

#### `useRegexWordBoundary: boolean`
- **説明**: 正規表現による単語境界検出を使用するか
- **デフォルト**: `true`
- **例**: `useRegexWordBoundary: false`

#### `enableDebug: boolean`
- **説明**: デバッグモードを有効にするか
- **デフォルト**: `false`
- **例**: `enableDebug: true`

## API関数

### `getDefaultUnifiedConfig()`

```typescript
export function getDefaultUnifiedConfig(): UnifiedConfig
```

デフォルト値を持つUnifiedConfigオブジェクトを返します。

**使用例:**
```typescript
import { getDefaultUnifiedConfig } from "./config.ts";

const defaultConfig = getDefaultUnifiedConfig();
console.log(defaultConfig.enabled); // true
```

### `validateUnifiedConfig(config: UnifiedConfig)`

```typescript
export function validateUnifiedConfig(config: UnifiedConfig): string[]
```

UnifiedConfigオブジェクトの妥当性を検証し、エラーメッセージの配列を返します。

**パラメータ:**
- `config: UnifiedConfig` - 検証対象の設定オブジェクト

**戻り値:**
- `string[]` - エラーメッセージの配列（空配列の場合は妥当）

**使用例:**
```typescript
import { validateUnifiedConfig } from "./config.ts";

const config: UnifiedConfig = { /* 設定値 */ };
const errors = validateUnifiedConfig(config);

if (errors.length > 0) {
  console.error("Configuration errors:", errors);
} else {
  console.log("Configuration is valid");
}
```

### `toUnifiedConfig(oldConfig: any)`

```typescript
export function toUnifiedConfig(oldConfig: any): UnifiedConfig
```

旧設定フォーマット（階層構造、snake_case）をUnifiedConfigに変換します。

**パラメータ:**
- `oldConfig: any` - 旧形式の設定オブジェクト

**戻り値:**
- `UnifiedConfig` - 変換されたUnifiedConfig

**使用例:**
```typescript
import { toUnifiedConfig } from "./config.ts";

const oldConfig = {
  core: { enabled: true },
  hint: { hint_position: "start" },
  word: { min_word_length: 3 }
};

const newConfig = toUnifiedConfig(oldConfig);
console.log(newConfig.enabled); // true
console.log(newConfig.hintPosition); // "start"
console.log(newConfig.minWordLength); // 3
```

### `fromUnifiedConfig(config: UnifiedConfig)`

```typescript
export function fromUnifiedConfig(config: UnifiedConfig): any
```

UnifiedConfigを旧設定フォーマットに変換します（後方互換性のため）。

**パラメータ:**
- `config: UnifiedConfig` - UnifiedConfig設定オブジェクト

**戻り値:**
- `any` - 旧形式の設定オブジェクト

**使用例:**
```typescript
import { fromUnifiedConfig } from "./config.ts";

const unifiedConfig: UnifiedConfig = { /* 設定値 */ };
const oldConfig = fromUnifiedConfig(unifiedConfig);

console.log(oldConfig.hint.hint_position); // snake_case
```

## 使用例

### 基本的な設定

```typescript
import type { UnifiedConfig } from "./config.ts";
import { getDefaultUnifiedConfig } from "./config.ts";

// デフォルト設定をベースにカスタマイズ
const config: UnifiedConfig = {
  ...getDefaultUnifiedConfig(),
  enabled: true,
  markers: ["a", "s", "d", "f"],
  motionCount: 2,
  useJapanese: true,
  minWordLength: 2,
  perKeyMinLength: {
    "f": 1,  // find文字は1文字から
    "w": 3,  // word移動は3文字から
    "v": 1   // visual選択は1文字から
  }
};
```

### Vim設定での例

```vim
let g:hellshake_yano = #{
\   enabled: v:true,
\   markers: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
\   motionCount: 3,
\   motionTimeout: 2000,
\   hintPosition: 'start',
\   triggerOnHjkl: v:false,
\   countedMotions: ['w', 'b', 'e'],
\   maxHints: 100,
\   useJapanese: v:true,
\   minWordLength: 3,
\   perKeyMinLength: #{
\     'f': 1,
\     'v': 1,
\     'w': 3
\   },
\   defaultMinWordLength: 3,
\   enableHighlight: v:true,
\   useTinySegmenter: v:true
\ }
```

### 高度な設定例

```typescript
const advancedConfig: UnifiedConfig = {
  ...getDefaultUnifiedConfig(),

  // パフォーマンス最適化
  maxHints: 50,
  cacheSize: 2000,
  debounceDelay: 30,

  // ヒント表示カスタマイズ
  singleCharKeys: ["f", "j"],
  multiCharKeys: ["w", "e", "r"],
  useHintGroups: true,
  highlightHintMarker: {
    fg: "#FFFFFF",
    bg: "#FF6B6B"
  },

  // 日本語最適化
  useJapanese: true,
  useTinySegmenter: true,
  perKeyMinLength: {
    "f": 1,    // 文字検索は1文字
    "t": 1,    // until検索は1文字
    "w": 2,    // 単語移動は2文字
    "e": 2,    // 単語末尾は2文字
    "b": 2,    // 単語先頭は2文字
    "v": 1     // visual選択は1文字
  },

  // デバッグとモニタリング
  enableDebug: false,
  debugCoordinates: false,
  suppressOnKeyRepeat: true,
  keyRepeatThreshold: 80
};
```

## 型安全性

UnifiedConfigは厳密な型定義により、設定ミスを防ぎます：

```typescript
// ✅ 正しい使用法
const config: UnifiedConfig = {
  enabled: true,                    // boolean
  hintPosition: "start",           // "start" | "end" | "same"
  markers: ["a", "s", "d"],       // string[]
  motionCount: 3                   // number
};

// ❌ TypeScriptエラーが発生
const badConfig: UnifiedConfig = {
  enabled: "yes",                  // Error: string is not assignable to boolean
  hintPosition: "middle",          // Error: "middle" is not assignable to union
  markers: "asd",                  // Error: string is not assignable to string[]
  motionCount: "three"             // Error: string is not assignable to number
};
```

## 移行ガイド

### 旧設定からの移行

1. **階層構造の平坦化**
   ```typescript
   // Before
   const oldConfig = {
     core: { enabled: true },
     hint: { hint_position: "start" }
   };

   // After
   const newConfig: UnifiedConfig = {
     enabled: true,
     hintPosition: "start"
   };
   ```

2. **snake_caseからcamelCaseへ**
   ```typescript
   // Before
   hint_position: "start"
   min_word_length: 3
   motion_count: 2

   // After
   hintPosition: "start"
   minWordLength: 3
   motionCount: 2
   ```

3. **自動変換の活用**
   ```typescript
   import { toUnifiedConfig } from "./config.ts";

   const convertedConfig = toUnifiedConfig(existingOldConfig);
   ```

### パフォーマンス最適化

UnifiedConfigを使用することで以下のパフォーマンス改善が得られます：

- **設定アクセスの高速化**: フラット構造により`O(1)`アクセス
- **メモリ使用量削減**: 階層オブジェクトの削減
- **型チェックの最適化**: 単一インターフェースによるコンパイル時間短縮
- **バリデーション効率**: 統一されたバリデーション処理

## ベストプラクティス

1. **型安全性の活用**
   ```typescript
   // const assertionを使用して型安全性を保証
   const config = {
     enabled: true,
     hintPosition: "start" as const
   } satisfies UnifiedConfig;
   ```

2. **部分的な更新**
   ```typescript
   // 既存設定の部分更新
   const updatedConfig: UnifiedConfig = {
     ...existingConfig,
     useJapanese: true,
     minWordLength: 2
   };
   ```

3. **バリデーション実装**
   ```typescript
   // 設定変更時のバリデーション
   function updateConfig(newConfig: UnifiedConfig): boolean {
     const errors = validateUnifiedConfig(newConfig);
     if (errors.length > 0) {
       console.error("Invalid configuration:", errors);
       return false;
     }
     // 設定を適用
     return true;
   }
   ```

## 注意事項

1. **後方互換性**: 旧インターフェースは段階的に廃止予定
2. **必須プロパティ**: オプション（`?`）以外のプロパティは必ず設定が必要
3. **型変換**: 自動変換関数を使用する際は結果のバリデーションを推奨
4. **パフォーマンス**: 設定オブジェクトの頻繁な再作成は避ける