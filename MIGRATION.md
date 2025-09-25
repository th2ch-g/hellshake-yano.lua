# Migration Guide - hellshake-yano.vim v2.x to v3.x

## 概要

hellshake-yano.vim v3.xは大規模なリファクタリングにより、以下の重要な変更が行われています：

1. **UnifiedCache System**: 20個のキャッシュ実装を1つに統合（88%メモリ削減）
2. **UnifiedConfig Interface**: 10個以上の設定インターフェースを1つに統合
3. **Architecture Simplification**: 21,000行から10,500行への50%コード削減

## 📋 Migration Timeline

| Version | Status | Description |
|---------|--------|-------------|
| **v2.5.0** | ⚠️ Deprecation Warnings | 旧インターフェースに警告追加 |
| **v2.8.0** | ⚠️ Strong Warnings | 廃止予定インターフェースの強化警告 |
| **v3.0.0** | 🔥 Breaking Changes | 旧インターフェース完全削除 |

## 🚀 Major Changes

### 1. UnifiedConfig Migration（設定統合）

#### Before（v2.x）
```typescript
// 複数の階層化された設定インターフェース
interface Config {
  core: CoreConfig;
  hint: HintConfig;
  word: WordConfig;
  performance: PerformanceConfig;
  debug: DebugConfig;
}

// snake_case命名規則
const config = {
  core: {
    enabled: true,
  },
  hint: {
    hint_position: "start",
    max_hints: 100
  },
  word: {
    min_word_length: 3,
    use_japanese: true
  }
};
```

#### After（v3.x）
```typescript
// 単一のフラット設定インターフェース
interface UnifiedConfig {
  enabled: boolean;
  hintPosition: "start" | "end" | "same";
  maxHints: number;
  minWordLength: number;
  useJapanese: boolean;
  // ... 32個の統一された設定項目
}

// camelCase命名規則
const config: UnifiedConfig = {
  enabled: true,
  hintPosition: "start",
  maxHints: 100,
  minWordLength: 3,
  useJapanese: true,
  // ... 他の設定項目
};
```

### 2. UnifiedCache Migration（キャッシュ統合）

#### Before（v2.x）
```typescript
// 20個の個別キャッシュ実装
const hintCache = new Map<string, string[]>();
const wordCache = new LRUCache<string, Word[]>(100);
const displayCache = new Map<string, DisplayInfo>();
const contextCache: Map<string, any> = new Map();
const languageRuleCache = new Map();
// ... 15個の他のキャッシュ

// 個別管理が必要
hintCache.clear();
wordCache.clear();
displayCache.clear();
// ... 各キャッシュの個別操作
```

#### After（v3.x）
```typescript
// 統一されたキャッシュシステム
import { UnifiedCache, CacheType } from "./cache.ts";

const cache = UnifiedCache.getInstance();

// 用途別キャッシュタイプ選択
const hintCache = cache.getCache<string, string[]>(CacheType.HINTS);
const wordCache = cache.getCache<string, Word[]>(CacheType.WORDS);
const displayCache = cache.getCache<string, DisplayInfo>(CacheType.DISPLAY);

// 統一された管理
cache.clearAll(); // 全キャッシュクリア
cache.clearByType(CacheType.HINTS); // 特定タイプのみクリア

// 包括的な統計情報
const stats = cache.getAllStats();
console.log(`Hit rate: ${stats.HINTS.hitRate}%`);
```

## 📝 Step-by-Step Migration

### Step 1: Update Dependencies

```bash
# プラグインを最新版に更新
cd ~/.config/nvim/plugged/hellshake-yano.vim
git pull origin main
```

### Step 2: Configuration Migration

#### 2.1. Vim Configuration Files

**Before (vimrc):**
```vim
let g:hellshake_yano = #{
\   core: #{
\     enabled: v:true,
\     motion_count: 3
\   },
\   hint: #{
\     hint_position: 'start',
\     max_hints: 100,
\     use_numbers: v:false
\   },
\   word: #{
\     min_word_length: 3,
\     use_japanese: v:true
\   }
\ }
```

**After (vimrc):**
```vim
let g:hellshake_yano = #{
\   enabled: v:true,
\   motionCount: 3,
\   hintPosition: 'start',
\   maxHints: 100,
\   useNumbers: v:false,
\   minWordLength: 3,
\   useJapanese: v:true,
\   markers: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
\   motionTimeout: 2000,
\   triggerOnHjkl: v:false,
\   countedMotions: ['w', 'b', 'e'],
\   debounceDelay: 50,
\   highlightSelected: v:true,
\   debugCoordinates: v:false,
\   singleCharKeys: [],
\   multiCharKeys: [],
\   useHintGroups: v:false,
\   highlightHintMarker: 'HellshakeYanoHint',
\   highlightHintMarkerCurrent: 'HellshakeYanoHintCurrent',
\   suppressOnKeyRepeat: v:true,
\   keyRepeatThreshold: 100,
\   perKeyMinLength: #{},
\   defaultMinWordLength: 3,
\   wordDetectors: ['regex', 'tinysegmenter', 'hybrid'],
\   cacheSize: 1000,
\   enableHighlight: v:true,
\   highlightTimeout: 3000,
\   useTinySegmenter: v:true,
\   useRegexWordBoundary: v:true,
\   enableDebug: v:false
\ }
```

#### 2.2. TypeScript/JavaScript Configuration

**Before:**
```typescript
import { Config, CoreConfig, HintConfig } from "./config.ts";

const config: Config = {
  core: {
    enabled: true,
    motion_count: 3
  },
  hint: {
    hint_position: "start",
    max_hints: 100
  },
  word: {
    min_word_length: 3,
    use_japanese: true
  }
};
```

**After:**
```typescript
import { UnifiedConfig } from "./config.ts";

const config: UnifiedConfig = {
  enabled: true,
  motionCount: 3,
  hintPosition: "start",
  maxHints: 100,
  minWordLength: 3,
  useJapanese: true,
  // ... 必要に応じて他の設定項目を追加
  // デフォルト値は getDefaultUnifiedConfig() で確認可能
};
```

### Step 3: Code Migration

#### 3.1. Cache Usage Migration

**Before:**
```typescript
// 個別キャッシュの直接使用
import { LRUCache } from "./utils/cache.ts";

const myCache = new LRUCache<string, any>(100);
const hintCache = new Map<string, string>();

// 個別操作
myCache.set("key", "value");
hintCache.set("hint", "marker");

// 個別クリア
myCache.clear();
hintCache.clear();
```

**After:**
```typescript
// UnifiedCacheの使用
import { UnifiedCache, CacheType } from "./cache.ts";

const cache = UnifiedCache.getInstance();
const myCache = cache.getCache<string, any>(CacheType.TEMP);
const hintCache = cache.getCache<string, string>(CacheType.HINTS);

// 統一された操作
myCache.set("key", "value");
hintCache.set("hint", "marker");

// 統一されたクリア
cache.clearAll(); // 全キャッシュクリア
cache.clearByType(CacheType.TEMP); // 特定タイプのみクリア
```

#### 3.2. Configuration Access Migration

**Before:**
```typescript
// 階層アクセス
const enabled = config.core.enabled;
const hintPosition = config.hint.hint_position;
const minLength = config.word.min_word_length;
const useJapanese = config.word.use_japanese;
```

**After:**
```typescript
// フラットアクセス
const enabled = config.enabled;
const hintPosition = config.hintPosition;
const minLength = config.minWordLength;
const useJapanese = config.useJapanese;
```

#### 3.3. Validation Migration

**Before:**
```typescript
// 複数のバリデーション関数
validateCore(config.core);
validateHint(config.hint);
validateWord(config.word);
```

**After:**
```typescript
// 単一のバリデーション関数
import { validateUnifiedConfig } from "./config.ts";

const errors = validateUnifiedConfig(config);
if (errors.length > 0) {
  console.error("Configuration errors:", errors);
}
```

### Step 4: Migration Helper Functions

v2.xからv3.xへの段階的移行をサポートする変換関数を提供しています：

```typescript
import { toUnifiedConfig, fromUnifiedConfig } from "./config.ts";

// 旧設定から新設定への変換
const oldConfig = { /* 旧形式の設定 */ };
const newConfig = toUnifiedConfig(oldConfig);

// 新設定から旧設定への変換（後方互換性のため）
const backwardConfig = fromUnifiedConfig(newConfig);
```

### Step 5: Testing & Validation

#### 5.1. Configuration Testing

```typescript
// 設定の妥当性をテスト
import { validateUnifiedConfig, getDefaultUnifiedConfig } from "./config.ts";

function testConfiguration() {
  const config = getDefaultUnifiedConfig();

  // カスタム設定の適用
  const customConfig: UnifiedConfig = {
    ...config,
    useJapanese: true,
    minWordLength: 2,
    perKeyMinLength: {
      "f": 1,
      "w": 3
    }
  };

  // バリデーション
  const errors = validateUnifiedConfig(customConfig);
  if (errors.length === 0) {
    console.log("✅ Configuration is valid");
    return customConfig;
  } else {
    console.error("❌ Configuration errors:", errors);
    return null;
  }
}
```

#### 5.2. Cache Testing

```typescript
// キャッシュ機能のテスト
import { UnifiedCache, CacheType } from "./cache.ts";

function testCacheSystem() {
  const cache = UnifiedCache.getInstance();

  // 基本操作テスト
  const wordsCache = cache.getCache<string, string[]>(CacheType.WORDS);
  wordsCache.set("test", ["word1", "word2"]);

  const words = wordsCache.get("test");
  console.log("✅ Cache get/set working:", words);

  // 統計情報テスト
  const stats = cache.getAllStats();
  console.log("✅ Cache statistics:", stats.WORDS);

  // クリア機能テスト
  cache.clearByType(CacheType.WORDS);
  console.log("✅ Cache clear working");
}
```

## ⚠️ Breaking Changes

### Removed Interfaces (v3.0.0)

以下のインターフェースはv3.0.0で完全に削除されます：

```typescript
// ❌ 削除予定 - v3.0.0で利用不可
CoreConfig
HintConfig
WordConfig
PerformanceConfig
DebugConfig
HierarchicalConfig
CamelCaseConfig
ModernConfig
```

### Renamed Properties

| v2.x (snake_case) | v3.x (camelCase) | Type |
|------------------|------------------|------|
| `hint_position` | `hintPosition` | `"start" \| "end" \| "same"` |
| `max_hints` | `maxHints` | `number` |
| `motion_count` | `motionCount` | `number` |
| `motion_timeout` | `motionTimeout` | `number` |
| `min_word_length` | `minWordLength` | `number` |
| `use_japanese` | `useJapanese` | `boolean` |
| `use_numbers` | `useNumbers` | `boolean` |
| `trigger_on_hjkl` | `triggerOnHjkl` | `boolean` |
| `counted_motions` | `countedMotions` | `string[]` |
| `debounce_delay` | `debounceDelay` | `number` |
| `highlight_selected` | `highlightSelected` | `boolean` |
| `debug_coordinates` | `debugCoordinates` | `boolean` |
| `single_char_keys` | `singleCharKeys` | `string[]` |
| `multi_char_keys` | `multiCharKeys` | `string[]` |
| `max_single_char_hints` | `maxSingleCharHints` | `number?` |
| `use_hint_groups` | `useHintGroups` | `boolean` |
| `highlight_hint_marker` | `highlightHintMarker` | `string \| HighlightColor` |
| `highlight_hint_marker_current` | `highlightHintMarkerCurrent` | `string \| HighlightColor` |
| `suppress_on_key_repeat` | `suppressOnKeyRepeat` | `boolean` |
| `key_repeat_threshold` | `keyRepeatThreshold` | `number` |
| `per_key_min_length` | `perKeyMinLength` | `Record<string, number>` |
| `default_min_word_length` | `defaultMinWordLength` | `number` |
| `word_detectors` | `wordDetectors` | `string[]` |
| `cache_size` | `cacheSize` | `number` |
| `enable_highlight` | `enableHighlight` | `boolean` |
| `highlight_timeout` | `highlightTimeout` | `number` |
| `use_tinysegmenter` | `useTinySegmenter` | `boolean` |
| `use_regex_word_boundary` | `useRegexWordBoundary` | `boolean` |
| `enable_debug` | `enableDebug` | `boolean` |

## 🔧 Troubleshooting

### Common Migration Issues

#### Issue 1: TypeScript Errors

**Error:**
```
Property 'core' does not exist on type 'UnifiedConfig'
```

**Solution:**
```typescript
// ❌ 旧コード
config.core.enabled

// ✅ 新コード
config.enabled
```

#### Issue 2: snake_case Property Access

**Error:**
```
Property 'hint_position' does not exist on type 'UnifiedConfig'
```

**Solution:**
```typescript
// ❌ 旧コード
config.hint.hint_position

// ✅ 新コード
config.hintPosition
```

#### Issue 3: Cache Import Errors

**Error:**
```
Module '"./utils/cache"' has no exported member 'LRUCache'
```

**Solution:**
```typescript
// ❌ 旧コード
import { LRUCache } from "./utils/cache.ts";
const cache = new LRUCache(100);

// ✅ 新コード
import { UnifiedCache, CacheType } from "./cache.ts";
const cache = UnifiedCache.getInstance();
const myCache = cache.getCache<string, any>(CacheType.TEMP);
```

### Performance Validation

移行後のパフォーマンス改善を確認：

```typescript
// パフォーマンスメトリクスの確認
import { UnifiedCache } from "./cache.ts";

function validatePerformance() {
  const cache = UnifiedCache.getInstance();
  const stats = cache.getAllStats();

  // メモリ使用量の確認
  let totalEntries = 0;
  for (const [type, stat] of Object.entries(stats)) {
    totalEntries += stat.size;
    console.log(`${type}: ${stat.size}/${stat.maxSize} entries, ${stat.hitRate}% hit rate`);
  }

  console.log(`Total cache entries: ${totalEntries}`);
  console.log("Expected: Significant reduction from v2.x");
}
```

## 📚 Additional Resources

- [UnifiedConfig API Reference](docs/unified-config-api.md)
- [UnifiedCache Documentation](docs/unified-cache-api.md)
- [Cache Types Guide](docs/cache-types.md)
- [Performance Metrics](docs/performance-metrics.md)

## 🆘 Need Help?

1. **自動移行ツール**: `toUnifiedConfig()` 関数を活用
2. **段階的移行**: v2.8.xで警告確認後、v3.0.0へ移行
3. **テスト**: 移行後は必ずバリデーション実行
4. **バックアップ**: 移行前に設定ファイルのバックアップを作成

## ✅ Migration Checklist

- [ ] 依存関係の更新
- [ ] Vim設定ファイルの更新（snake_case → camelCase）
- [ ] TypeScript/JavaScriptコードの更新
- [ ] キャッシュ使用箇所の更新
- [ ] バリデーション実行
- [ ] テスト実行
- [ ] パフォーマンス確認
- [ ] 旧設定ファイルのバックアップ作成
- [ ] エラー処理の確認
- [ ] ドキュメントの更新

移行完了後、以下のパフォーマンス改善が期待できます：

- 🎯 **メモリ使用量: 88%削減** (659KB → 78KB)
- 🚀 **設定アクセス: O(1)高速化** (フラット構造)
- 📊 **統合管理: 20→1** (キャッシュ実装数)
- 🔧 **保守性: 大幅向上** (統一されたAPI)