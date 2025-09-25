# 移行ガイド：旧キャッシュ実装から UnifiedCache への移行

## 概要

このガイドでは、hellshake-yano.vimの旧キャッシュ実装（20個の個別Map/LRUCache）から、新しいUnifiedCacheシステムへの移行手順を説明します。

## 移行のメリット

- **メモリ使用量88%削減**: 659KB → 78KB
- **統一された管理**: 20個の個別実装 → 1つの統一システム
- **包括的な統計情報**: デバッグとパフォーマンス分析が容易
- **メモリリーク防止**: LRUアルゴリズムによる自動管理

## 移行前後の比較

### Before（旧実装）

```typescript
// 20個の個別キャッシュ実装が散在
const hintCache = new Map<string, string[]>();
const wordCache = new Map<string, Word[]>();
const displayCache = new Map<string, DisplayInfo>();
const contextCache: Map<string, any> = new Map();
const languageRuleCache = new Map();

// メモリ管理なし - 無制限に成長
hintCache.set(key, value); // サイズ制限なし

// 統計情報なし
// キャッシュヒット率やメモリ使用量が不明

// 個別のクリア処理
hintCache.clear();
wordCache.clear();
// ... 各キャッシュごとに実装
```

### After（新実装）

```typescript
import { UnifiedCache, CacheType } from "../cache.ts";

// 統一されたキャッシュシステム
const cache = UnifiedCache.getInstance();

// 用途別にキャッシュタイプを選択
const hintCache = cache.getCache<string, string[]>(CacheType.HINTS);
const wordCache = cache.getCache<string, Word[]>(CacheType.WORDS);
const displayCache = cache.getCache<string, DisplayInfo>(CacheType.DISPLAY);

// LRUによる自動メモリ管理
hintCache.set(key, value); // 自動的にサイズ制限

// 包括的な統計情報
const stats = cache.getAllStats();
console.log(`Hit rate: ${stats.HINTS.hitRate}%`);

// 統一されたクリア処理
cache.clearAll(); // 全キャッシュをクリア
cache.clearByType(CacheType.HINTS); // 特定タイプのみクリア
```

## 段階的移行手順

### Step 1: UnifiedCacheのインポート

```typescript
// 旧コード
import { LRUCache } from "./utils/cache.ts";

// 新コード
import { UnifiedCache, CacheType } from "./cache.ts";
```

### Step 2: キャッシュインスタンスの取得

```typescript
// 旧コード
const myCache = new Map<string, any>();
const myLRUCache = new LRUCache<string, any>(100);

// 新コード
const cache = UnifiedCache.getInstance();
const myCache = cache.getCache<string, any>(CacheType.TEMP);
```

### Step 3: 適切なCacheTypeの選択

用途に応じて適切なCacheTypeを選択します：

| 旧実装 | 新CacheType | 用途 |
|--------|------------|------|
| `wordsCache` | `CacheType.WORDS` | 単語検出結果 |
| `hintCache` | `CacheType.HINTS` | ヒント生成 |
| `assignmentCacheNormal` | `CacheType.HINT_ASSIGNMENT_NORMAL` | ノーマルモード |
| `assignmentCacheVisual` | `CacheType.HINT_ASSIGNMENT_VISUAL` | ビジュアルモード |
| `languageRuleCache` | `CacheType.LANGUAGE_RULES` | 言語ルール |
| `contextCache` | `CacheType.SYNTAX_CONTEXT` | 構文コンテキスト |
| `dictionaryCache` | `CacheType.DICTIONARY` | 辞書データ |
| その他のMap | `CacheType.TEMP` または適切なタイプ | 各種用途 |

### Step 4: コードの置き換え

#### 基本的な操作

```typescript
// 旧コード
const cache = new Map<string, string[]>();

// 値の設定
cache.set("key", ["value1", "value2"]);

// 値の取得
const value = cache.get("key");

// 存在確認
if (cache.has("key")) {
  // ...
}

// サイズ確認
const size = cache.size;

// クリア
cache.clear();
```

```typescript
// 新コード
const cache = UnifiedCache.getInstance();
const myCache = cache.getCache<string, string[]>(CacheType.HINTS);

// 値の設定（同じ）
myCache.set("key", ["value1", "value2"]);

// 値の取得（同じ）
const value = myCache.get("key");

// 存在確認（同じ）
if (myCache.has("key")) {
  // ...
}

// サイズ確認（メソッド呼び出しに変更）
const size = myCache.size();

// クリア（同じ）
myCache.clear();
```

#### 高度な操作

```typescript
// 旧コード - 手動でサイズ制限
if (cache.size > MAX_SIZE) {
  const firstKey = cache.keys().next().value;
  cache.delete(firstKey);
}
cache.set(key, value);

// 新コード - 自動でLRU管理
myCache.set(key, value); // サイズ制限は自動
```

### Step 5: 統計情報の活用

```typescript
// 旧コード - 統計情報なし
// キャッシュのパフォーマンスが不明

// 新コード - 詳細な統計情報
const stats = cache.getAllStats();

// 特定キャッシュの統計
console.log(`HINTS cache:
  Hit rate: ${stats.HINTS.hitRate}%
  Size: ${stats.HINTS.size}/${stats.HINTS.maxSize}
  Evictions: ${stats.HINTS.evictions}`);

// パフォーマンスの低いキャッシュを特定
Object.entries(stats).forEach(([type, stat]) => {
  if (stat.hitRate < 30) {
    console.warn(`Low performance: ${type} (${stat.hitRate}%)`);
  }
});
```

## 実装例：具体的な移行パターン

### パターン1: hint.tsの移行

```typescript
// === 旧実装 ===
// hint.ts（Before）
const hintCache = new Map<string, string[]>();
const assignmentCacheNormal = new Map<string, Word[]>();
const assignmentCacheVisual = new Map<string, Word[]>();
const assignmentCacheOther = new Map<string, Word[]>();

function getAssignmentCacheForMode(mode: string) {
  if (mode === "visual") return assignmentCacheVisual;
  if (mode === "normal") return assignmentCacheNormal;
  return assignmentCacheOther;
}

export function clearHintCache() {
  hintCache.clear();
  assignmentCacheNormal.clear();
  assignmentCacheVisual.clear();
  assignmentCacheOther.clear();
}
```

```typescript
// === 新実装 ===
// hint.ts（After）
import { UnifiedCache, CacheType } from "../cache.ts";

const cache = UnifiedCache.getInstance();
const hintCache = cache.getCache<string, string[]>(CacheType.HINTS);
const assignmentCacheNormal = cache.getCache<string, Word[]>(CacheType.HINT_ASSIGNMENT_NORMAL);
const assignmentCacheVisual = cache.getCache<string, Word[]>(CacheType.HINT_ASSIGNMENT_VISUAL);
const assignmentCacheOther = cache.getCache<string, Word[]>(CacheType.HINT_ASSIGNMENT_OTHER);

function getAssignmentCacheForMode(mode: string) {
  if (mode === "visual") return assignmentCacheVisual;
  if (mode === "normal") return assignmentCacheNormal;
  return assignmentCacheOther;
}

export function clearHintCache() {
  cache.clearByType(CacheType.HINTS);
  cache.clearByType(CacheType.HINT_ASSIGNMENT_NORMAL);
  cache.clearByType(CacheType.HINT_ASSIGNMENT_VISUAL);
  cache.clearByType(CacheType.HINT_ASSIGNMENT_OTHER);
}
```

### パターン2: word/context.tsの移行

```typescript
// === 旧実装 ===
// word/context.ts（Before）
class ContextDetector {
  private languageRuleCache = new Map<string, LanguageRule>();
  private contextCache = new Map<string, SyntaxContext>();

  getLanguageRule(lang: string): LanguageRule {
    if (this.languageRuleCache.has(lang)) {
      return this.languageRuleCache.get(lang)!;
    }
    const rule = this.detectLanguageRule(lang);
    this.languageRuleCache.set(lang, rule);
    return rule;
  }

  clearCache() {
    this.languageRuleCache.clear();
    this.contextCache.clear();
  }
}
```

```typescript
// === 新実装 ===
// word/context.ts（After）
import { UnifiedCache, CacheType } from "../cache.ts";

class ContextDetector {
  private cache = UnifiedCache.getInstance();
  private languageRuleCache = this.cache.getCache<string, LanguageRule>(
    CacheType.LANGUAGE_RULES
  );
  private contextCache = this.cache.getCache<string, SyntaxContext>(
    CacheType.SYNTAX_CONTEXT
  );

  getLanguageRule(lang: string): LanguageRule {
    const cached = this.languageRuleCache.get(lang);
    if (cached) {
      return cached;
    }
    const rule = this.detectLanguageRule(lang);
    this.languageRuleCache.set(lang, rule);
    return rule;
  }

  clearCache() {
    this.cache.clearByType(CacheType.LANGUAGE_RULES);
    this.cache.clearByType(CacheType.SYNTAX_CONTEXT);
  }
}
```

### パターン3: グローバルキャッシュの移行

```typescript
// === 旧実装 ===
// main.ts（Before）
const globalCache = new Map<string, any>();

export function getCachedValue(key: string): any {
  return globalCache.get(key);
}

export function setCachedValue(key: string, value: any): void {
  // 手動でサイズ制限
  if (globalCache.size > 1000) {
    const firstKey = globalCache.keys().next().value;
    globalCache.delete(firstKey);
  }
  globalCache.set(key, value);
}
```

```typescript
// === 新実装 ===
// main.ts（After）
import { UnifiedCache, CacheType } from "./cache.ts";

const cache = UnifiedCache.getInstance();
const globalCache = cache.getCache<string, any>(CacheType.TEMP);

export function getCachedValue(key: string): any {
  return globalCache.get(key);
}

export function setCachedValue(key: string, value: any): void {
  // LRUが自動的にサイズ管理
  globalCache.set(key, value);
}
```

## トラブルシューティング

### 問題1: キャッシュサイズの不足

**症状**: エビクション率が高い、ヒット率が低い

**解決策**:
```typescript
// 統計を確認
const stats = cache.getAllStats();
const problematicCache = Object.entries(stats)
  .filter(([_, stat]) => stat.evictions > stat.maxSize * 2)
  .map(([type, _]) => type);

console.log("High eviction caches:", problematicCache);

// cache.tsの設定を調整
// CacheConfigのサイズを増やす
```

### 問題2: メモリ使用量が増加

**症状**: メモリ使用量が期待より多い

**解決策**:
```typescript
// 不要なキャッシュをクリア
cache.clearByType(CacheType.TEMP);

// 定期的なクリーンアップ
setInterval(() => {
  const stats = cache.getAllStats();
  Object.entries(stats).forEach(([type, stat]) => {
    if (stat.hitRate < 10 && stat.size > 0) {
      cache.clearByType(type as CacheType);
    }
  });
}, 60 * 60 * 1000); // 1時間ごと
```

### 問題3: 型エラー

**症状**: TypeScriptの型エラー

**解決策**:
```typescript
// 正しい型パラメータを指定
const cache = UnifiedCache.getInstance();

// 誤り
const myCache = cache.getCache(CacheType.WORDS);

// 正しい
const myCache = cache.getCache<string, string[]>(CacheType.WORDS);
```

## ベストプラクティス

1. **適切なCacheTypeを選択**: 用途に最も合ったタイプを使用
2. **統計情報を定期的に確認**: パフォーマンスの監視
3. **不要なキャッシュは削除**: メモリ効率の維持
4. **型安全性を保つ**: ジェネリック型パラメータを明示

## まとめ

UnifiedCacheへの移行により、以下の改善が実現します：

- ✅ メモリ使用量の大幅削減（88%削減）
- ✅ 統一された管理インターフェース
- ✅ 包括的な統計情報とデバッグ機能
- ✅ LRUによる自動メモリ管理
- ✅ メモリリークの防止

段階的に移行を進めることで、既存の機能を維持しながら、パフォーマンスとメモリ効率を大幅に改善できます。