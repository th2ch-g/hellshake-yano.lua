/**
 * 汎用LRUキャッシュ実装とキャッシュ管理の統一インターフェース
 */

/**
 * 統一されたキャッシュインターフェース
 * 異なるキャッシュ実装を統一的に扱うためのインターフェース
 */
export interface CacheInterface<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  delete(key: K): boolean;
  clear(): void;
  size(): number;
  getStats(): CacheStatistics;
}

export interface CacheStatistics {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

/**
 * LRU (Least Recently Used) キャッシュの実装
 */
export class LRUCache<K, V> implements CacheInterface<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number) {
    if (maxSize <= 0) {
      throw new Error("maxSize must be positive");
    }
    this.maxSize = maxSize;
  }

  /**
   * キャッシュから値を取得
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // アクセスされたアイテムを最新にするため、削除してから再追加
      this.cache.delete(key);
      this.cache.set(key, value);
      this.hits++;
      return value;
    }
    this.misses++;
    return undefined;
  }

  /**
   * キャッシュに値を設定
   */
  set(key: K, value: V): void {
    // 既存のキーの場合は削除してから再追加（LRU順序を更新）
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 容量を超える場合、最も古いアイテムを削除
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, value);
  }

  /**
   * キャッシュから値を削除
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * キーが存在するかチェック
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * 現在のキャッシュサイズを取得
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 最大キャッシュサイズを取得
   */
  get capacity(): number {
    return this.maxSize;
  }

  /**
   * 統計情報を取得
   */
  getStats(): CacheStatistics {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * 統計情報を取得（getStatsのエイリアス - 後方互換性のため）
   */
  getStatistics(): CacheStatistics {
    return this.getStats();
  }

  /**
   * 統計情報をリセット
   */
  resetStatistics(): void {
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * キャッシュの全キーを取得
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  /**
   * キャッシュの全値を取得
   */
  values(): IterableIterator<V> {
    return this.cache.values();
  }

  /**
   * キャッシュの全エントリを取得
   */
  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }

  /**
   * forEach操作をサポート
   */
  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
    this.cache.forEach(callbackfn, thisArg);
  }
}

/**
 * 特化したキャッシュ戦略の基底クラス
 */
export abstract class CacheStrategy<K, V> {
  protected cache: LRUCache<K, V>;

  constructor(maxSize: number) {
    this.cache = new LRUCache<K, V>(maxSize);
  }

  abstract generateKey(...args: any[]): K;

  get(key: K): V | undefined {
    return this.cache.get(key);
  }

  set(key: K, value: V): void {
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  getStatistics(): CacheStatistics {
    return this.cache.getStatistics();
  }
}

/**
 * 文字列ベースのキャッシュ戦略
 */
export class StringCacheStrategy<V> extends CacheStrategy<string, V> {
  generateKey(...args: any[]): string {
    return args.map((arg) => typeof arg === "object" ? JSON.stringify(arg) : String(arg)).join("|");
  }
}

/**
 * 単語検出用のキャッシュ戦略
 */
export class WordDetectionCacheStrategy extends StringCacheStrategy<any[]> {
  override generateKey(
    bufnr: number,
    topLine: number,
    bottomLine: number,
    content: string,
  ): string {
    return `${bufnr}|${topLine}|${bottomLine}|${content.length}|${this.hashString(content)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return hash.toString(36);
  }
}

/**
 * ヒント生成用のキャッシュ戦略
 */
export class HintGenerationCacheStrategy extends StringCacheStrategy<string[]> {
  override generateKey(wordCount: number, configSnapshot: any): string {
    return `${wordCount}|${JSON.stringify(configSnapshot)}`;
  }
}

/**
 * 統一されたキャッシュマネージャー
 * 複数のキャッシュを統一的に管理し、アプリケーション全体でのキャッシュ戦略を提供
 */
export class CacheManager {
  private caches = new Map<string, CacheInterface<any, any>>();
  private defaultSize = 1000;

  /**
   * 新しいキャッシュを作成または既存のキャッシュを取得
   */
  getCache<K, V>(
    name: string,
    maxSize?: number,
  ): CacheInterface<K, V> {
    if (this.caches.has(name)) {
      return this.caches.get(name)!;
    }

    const size = maxSize ?? this.defaultSize;
    const cache = new LRUCache<K, V>(size);

    this.caches.set(name, cache);
    return cache;
  }

  /**
   * キャッシュを削除
   */
  removeCache(name: string): boolean {
    return this.caches.delete(name);
  }

  /**
   * すべてのキャッシュをクリア
   */
  clearAllCaches(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  /**
   * すべてのキャッシュの統計情報を取得
   */
  getAllStats(): Record<string, CacheStatistics> {
    const stats: Record<string, CacheStatistics> = {};
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.getStats();
    }
    return stats;
  }

  /**
   * 登録されているキャッシュ名の一覧を取得
   */
  getCacheNames(): string[] {
    return Array.from(this.caches.keys());
  }
}

/**
 * グローバルキャッシュマネージャーインスタンス
 */
export const globalCacheManager = new CacheManager();
