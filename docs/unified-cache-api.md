# UnifiedCache API リファレンス

## クラス概要

`UnifiedCache`は、hellshake-yano.vim全体で使用される統一されたキャッシュシステムです。20個の個別キャッシュ実装を1つの効率的なシステムに統合し、LRUアルゴリズムによるメモリ管理と包括的な統計情報を提供します。

### 主な特徴
- **シングルトンパターン**: アプリケーション全体で単一のインスタンスを共有
- **16種類のキャッシュタイプ**: 用途別に最適化された設定
- **LRUアルゴリズム**: 効率的なメモリ管理
- **統計情報**: デバッグとパフォーマンス分析のための詳細な統計

## メソッド

### `getInstance()`

シングルトンインスタンスを取得します。

```typescript
static getInstance(): UnifiedCache
```

**使用例:**
```typescript
import { UnifiedCache } from "../cache.ts";

const cache = UnifiedCache.getInstance();
```

### `getCache<K, V>(type: CacheType)`

指定されたキャッシュタイプのLRUCacheインスタンスを取得します。

```typescript
getCache<K, V>(type: CacheType): LRUCache<K, V>
```

**パラメータ:**
- `type`: CacheType列挙型の値

**戻り値:**
- 指定されたタイプのLRUCacheインスタンス

**使用例:**
```typescript
import { UnifiedCache, CacheType } from "../cache.ts";

const cache = UnifiedCache.getInstance();
const wordsCache = cache.getCache<string, string[]>(CacheType.WORDS);

// キャッシュに値を設定
wordsCache.set("file1.ts", ["word1", "word2", "word3"]);

// キャッシュから値を取得
const words = wordsCache.get("file1.ts");
console.log(words); // ["word1", "word2", "word3"]
```

### `getAllStats()`

すべてのキャッシュタイプの統計情報を取得します。

```typescript
getAllStats(): Record<CacheType, CacheStatistics>
```

**戻り値:**
- 各キャッシュタイプの統計情報を含むオブジェクト

**統計情報に含まれる項目:**
- `hits`: キャッシュヒット数
- `misses`: キャッシュミス数
- `hitRate`: ヒット率（パーセンテージ）
- `size`: 現在のキャッシュサイズ
- `maxSize`: 最大キャッシュサイズ
- `evictions`: 削除されたエントリ数

**使用例:**
```typescript
const stats = cache.getAllStats();

// 特定キャッシュの統計を確認
console.log(`WORDS cache hit rate: ${stats.WORDS.hitRate}%`);
console.log(`WORDS cache size: ${stats.WORDS.size}/${stats.WORDS.maxSize}`);

// 全体の統計サマリーを出力
Object.entries(stats).forEach(([type, stat]) => {
  console.log(`${type}: Hit Rate=${stat.hitRate}%, Size=${stat.size}/${stat.maxSize}`);
});
```

### `clearAll()`

すべてのキャッシュをクリアします。

```typescript
clearAll(): void
```

**使用例:**
```typescript
// デバッグやテスト時に全キャッシュをリセット
cache.clearAll();
console.log("All caches cleared");
```

### `clearByType(type: CacheType)`

指定されたタイプのキャッシュのみをクリアします。

```typescript
clearByType(type: CacheType): void
```

**パラメータ:**
- `type`: クリアするキャッシュのタイプ

**使用例:**
```typescript
// 単語キャッシュのみクリア
cache.clearByType(CacheType.WORDS);

// ヒントキャッシュのみクリア
cache.clearByType(CacheType.HINTS);
```

## 型定義

### `CacheType` 列挙型

```typescript
export enum CacheType {
  WORDS = "WORDS",                                   // 単語検出結果
  HINTS = "HINTS",                                   // ヒント生成結果
  DISPLAY = "DISPLAY",                               // 表示情報
  ANALYSIS = "ANALYSIS",                             // 解析結果
  TEMP = "TEMP",                                     // 一時的なデータ
  HINT_ASSIGNMENT_NORMAL = "HINT_ASSIGNMENT_NORMAL", // ノーマルモードヒント
  HINT_ASSIGNMENT_VISUAL = "HINT_ASSIGNMENT_VISUAL", // ビジュアルモードヒント
  HINT_ASSIGNMENT_OTHER = "HINT_ASSIGNMENT_OTHER",   // その他モードヒント
  LANGUAGE_RULES = "LANGUAGE_RULES",                 // 言語ルール
  SYNTAX_CONTEXT = "SYNTAX_CONTEXT",                 // シンタックスコンテキスト
  DICTIONARY = "DICTIONARY",                         // 辞書データ
  CHAR_WIDTH = "CHAR_WIDTH",                         // 文字幅計算
  CHAR_TYPE = "CHAR_TYPE",                           // 文字種判定
  BYTE_LENGTH = "BYTE_LENGTH",                       // バイト長計算
  ADJACENCY = "ADJACENCY",                           // 隣接単語
  WORD_DETECTION = "WORD_DETECTION"                  // 単語検出
}
```

### `CacheStatistics` インターフェース

```typescript
export interface CacheStatistics {
  hits: number;         // キャッシュヒット数
  misses: number;       // キャッシュミス数
  hitRate: number;      // ヒット率（0-100%）
  size: number;         // 現在のキャッシュサイズ
  maxSize: number;      // 最大キャッシュサイズ
  evictions: number;    // 削除されたエントリ数
}
```

## 使用例

### 基本的な使用方法

```typescript
import { UnifiedCache, CacheType } from "../cache.ts";

// シングルトンインスタンスを取得
const cache = UnifiedCache.getInstance();

// 特定のキャッシュタイプを取得
const hintsCache = cache.getCache<string, string[]>(CacheType.HINTS);

// キャッシュ操作
hintsCache.set("hint-key-1", ["a", "b", "c"]);
const hints = hintsCache.get("hint-key-1");

if (hints) {
  console.log("Cached hints:", hints);
} else {
  console.log("Cache miss - computing hints...");
}
```

### パフォーマンスモニタリング

```typescript
// 統計情報を定期的に確認
function monitorCachePerformance() {
  const stats = cache.getAllStats();

  // ヒット率が低いキャッシュを特定
  const lowPerformingCaches = Object.entries(stats)
    .filter(([_, stat]) => stat.hitRate < 50)
    .map(([type, stat]) => ({
      type,
      hitRate: stat.hitRate,
      size: stat.size,
      maxSize: stat.maxSize
    }));

  if (lowPerformingCaches.length > 0) {
    console.log("Low performing caches:", lowPerformingCaches);
  }
}

// 5分ごとに統計を確認
setInterval(monitorCachePerformance, 5 * 60 * 1000);
```

### デバッグとトラブルシューティング

```typescript
// デバッグ用の詳細統計出力
function debugCacheStats() {
  const stats = cache.getAllStats();

  console.log("=== Cache Statistics Debug ===");
  Object.entries(stats).forEach(([type, stat]) => {
    console.log(`\n${type}:`);
    console.log(`  Hits: ${stat.hits}`);
    console.log(`  Misses: ${stat.misses}`);
    console.log(`  Hit Rate: ${stat.hitRate.toFixed(2)}%`);
    console.log(`  Size: ${stat.size}/${stat.maxSize}`);
    console.log(`  Evictions: ${stat.evictions}`);

    // 警告を出力
    if (stat.hitRate < 30) {
      console.warn(`  ⚠️ Low hit rate!`);
    }
    if (stat.evictions > stat.maxSize * 2) {
      console.warn(`  ⚠️ High eviction rate - consider increasing maxSize`);
    }
  });
}

// 問題のあるキャッシュをクリア
function clearProblematicCaches() {
  const stats = cache.getAllStats();

  Object.entries(stats).forEach(([type, stat]) => {
    // ヒット率が極端に低い場合はクリア
    if (stat.hitRate < 10 && stat.size > 0) {
      cache.clearByType(type as CacheType);
      console.log(`Cleared ${type} cache due to low performance`);
    }
  });
}
```

### 統合例：ファイル処理での活用

```typescript
import { UnifiedCache, CacheType } from "../cache.ts";

class FileProcessor {
  private cache = UnifiedCache.getInstance();
  private wordsCache = this.cache.getCache<string, string[]>(CacheType.WORDS);
  private analysisCache = this.cache.getCache<string, AnalysisResult>(CacheType.ANALYSIS);

  async processFile(filePath: string): Promise<AnalysisResult> {
    // まずキャッシュをチェック
    const cachedAnalysis = this.analysisCache.get(filePath);
    if (cachedAnalysis) {
      console.log(`Cache hit for ${filePath}`);
      return cachedAnalysis;
    }

    // キャッシュミスの場合は処理を実行
    console.log(`Cache miss for ${filePath} - processing...`);

    // 単語検出（これもキャッシュを使用）
    let words = this.wordsCache.get(filePath);
    if (!words) {
      words = await this.detectWords(filePath);
      this.wordsCache.set(filePath, words);
    }

    // 解析実行
    const analysis = await this.analyzeWords(words);

    // 結果をキャッシュ
    this.analysisCache.set(filePath, analysis);

    return analysis;
  }

  private async detectWords(filePath: string): Promise<string[]> {
    // 実際の単語検出処理
    return ["word1", "word2", "word3"];
  }

  private async analyzeWords(words: string[]): Promise<AnalysisResult> {
    // 実際の解析処理
    return { wordCount: words.length, complexity: 0.5 };
  }
}

interface AnalysisResult {
  wordCount: number;
  complexity: number;
}
```

## ベストプラクティス

1. **適切なキャッシュタイプの選択**: 用途に応じて正しいCacheTypeを使用
2. **統計情報の活用**: 定期的に統計を確認してパフォーマンスを最適化
3. **メモリ管理**: 必要に応じてclearByTypeでキャッシュをクリア
4. **エラーハンドリング**: キャッシュミス時の処理を適切に実装

## 注意事項

- UnifiedCacheはシングルトンのため、複数のインスタンスは作成できません
- キャッシュサイズは事前に設定されており、動的な変更はサポートされていません
- LRUアルゴリズムにより、最も古いエントリが自動的に削除されます