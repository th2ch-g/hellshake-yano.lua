/**
 * グローバルキャッシュシステム
 */

/**
 * キャッシュの統計情報インターフェース
 */
export interface CacheStatistics {
  /** ヒット数 - キーが見つかった回数 */
  hits: number;
  /** ミス数 - キーが見つからなかった回数 */
  misses: number;
  /** 現在のサイズ - 現在格納されているエントリの数 */
  size: number;
  /** 最大サイズ - キャッシュが保持できるエントリの最大数 */
  maxSize: number;
  /** ヒット率（0.0-1.0） - hits / (hits + misses) で計算される効率の指標 */
  hitRate: number;
}

/**
 * LRU (Least Recently Used) キャッシュの実装
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;
  private hits = 0;
  private misses = 0;

  /**
 * LRUキャッシュインスタンスを作成
 * @param maxSize
   * @throws {Error} maxSizeが0以下の場合
   */
  constructor(maxSize: number) {
    if (maxSize <= 0) {
      throw new Error("maxSize must be positive");
    }
    this.maxSize = maxSize;
  }

  /**
 * キャッシュから値を取得し、LRUの順序を更新
 * @param key
 * @returns 
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
 * キャッシュに値を設定し、必要に応じて古いエントリを削除
 * @param key
 * @param value
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
 * 指定されたキーのエントリをキャッシュから削除
 * @param key
 * @returns 
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
 * 指定されたキーがキャッシュに存在するかチェック
 * @param key
 * @returns 
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
 * キャッシュを完全にクリアし、統計情報もリセット
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
 * 現在キャッシュに格納されているエントリ数を取得
 * @returns 
   */
  size(): number {
    return this.cache.size;
  }

  /**
 * キャッシュの最大容量を取得
 * @returns 
   */
  get capacity(): number {
    return this.maxSize;
  }

  /**
 * キャッシュのパフォーマンス統計情報を取得
 * @returns 
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
 * キャッシュされている全てのキーのイテレータを取得
 * @returns 
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  /**
 * キャッシュされている全ての値のイテレータを取得
 * @returns 
   */
  values(): IterableIterator<V> {
    return this.cache.values();
  }

  /**
 * キャッシュされている全てのエントリ（キーと値のペア）のイテレータを取得
 * @returns 
   */
  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }

  /**
 * キャッシュの各エントリに対して関数を実行
 * @param callbackfn
   */
  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: unknown): void {
    this.cache.forEach(callbackfn, thisArg);
  }

  /**
 * 統計情報を取得（getStatsのエイリアス）
 * @returns 
   */
  getStatistics(): CacheStatistics {
    return this.getStats();
  }

  /**
 * ヒット・ミス統計をリセット（キャッシュ内容は保持）
   */
  resetStatistics(): void {
    this.hits = 0;
    this.misses = 0;
  }
}

/**
 * キャッシュタイプの列挙型
 */
export enum CacheType {
  /** 単語検出結果のキャッシュ */
  WORDS = "WORDS",
  /** ヒント生成結果のキャッシュ */
  HINTS = "HINTS",
  /** 表示情報のキャッシュ */
  DISPLAY = "DISPLAY",
  /** 解析結果のキャッシュ */
  ANALYSIS = "ANALYSIS",
  /** 一時的なデータのキャッシュ */
  TEMP = "TEMP",
  /** ノーマルモード用ヒント割り当てキャッシュ */
  HINT_ASSIGNMENT_NORMAL = "HINT_ASSIGNMENT_NORMAL",
  /** ビジュアルモード用ヒント割り当てキャッシュ */
  HINT_ASSIGNMENT_VISUAL = "HINT_ASSIGNMENT_VISUAL",
  /** その他モード用ヒント割り当てキャッシュ */
  HINT_ASSIGNMENT_OTHER = "HINT_ASSIGNMENT_OTHER",
  /** 言語ルールのキャッシュ */
  LANGUAGE_RULES = "LANGUAGE_RULES",
  /** シンタックスコンテキストのキャッシュ */
  SYNTAX_CONTEXT = "SYNTAX_CONTEXT",
  /** 辞書データのキャッシュ */
  DICTIONARY = "DICTIONARY",
  /** 文字幅計算のキャッシュ */
  CHAR_WIDTH = "CHAR_WIDTH",
  /** 文字種判定のキャッシュ */
  CHAR_TYPE = "CHAR_TYPE",
  /** バイト長計算のキャッシュ */
  BYTE_LENGTH = "BYTE_LENGTH",
  /** 隣接単語のキャッシュ */
  ADJACENCY = "ADJACENCY",
  /** 単語検出のキャッシュ */
  WORD_DETECTION = "WORD_DETECTION",
}

/**
 * キャッシュ設定インターフェース
 */
interface CacheConfig {
  /** キャッシュの最大サイズ */
  size: number;
  /** キャッシュの説明 */
  description: string;
}

/**
 * グローバルキャッシュクラス（シングルトンパターン）
 */
export class GlobalCache {
  private static instance: GlobalCache;
  // 型安全性を保ちながら、ジェネリック型で具体的な型を指定できるようにする
  private readonly caches: Map<CacheType, LRUCache<unknown, unknown>>;
  private readonly cacheConfigs: Record<CacheType, CacheConfig>;

  /**
 * プライベートコンストラクタ（シングルトンパターン）
   */
  private constructor() {
    this.caches = new Map();
    this.cacheConfigs = {
      // Cache sizes optimized based on usage patterns and test requirements
      [CacheType.WORDS]: { size: 1000, description: "単語検出結果のキャッシュ" },
      [CacheType.HINTS]: { size: 500, description: "ヒント生成結果のキャッシュ" },
      [CacheType.DISPLAY]: { size: 200, description: "表示情報のキャッシュ" },
      [CacheType.ANALYSIS]: { size: 300, description: "解析結果のキャッシュ" },
      [CacheType.TEMP]: { size: 100, description: "一時的なデータのキャッシュ" },
      [CacheType.HINT_ASSIGNMENT_NORMAL]: {
        size: 100,
        description: "ノーマルモード用ヒント割り当てキャッシュ",
      },
      [CacheType.HINT_ASSIGNMENT_VISUAL]: {
        size: 100,
        description: "ビジュアルモード用ヒント割り当てキャッシュ",
      },
      [CacheType.HINT_ASSIGNMENT_OTHER]: {
        size: 100,
        description: "その他モード用ヒント割り当てキャッシュ",
      },
      [CacheType.LANGUAGE_RULES]: { size: 50, description: "言語ルールのキャッシュ" },
      [CacheType.SYNTAX_CONTEXT]: {
        size: 200,
        description: "シンタックスコンテキストのキャッシュ",
      },
      [CacheType.DICTIONARY]: { size: 2000, description: "辞書データのキャッシュ" },
      [CacheType.CHAR_WIDTH]: { size: 500, description: "文字幅計算のキャッシュ" },
      [CacheType.CHAR_TYPE]: { size: 1000, description: "文字種判定のキャッシュ" },
      [CacheType.BYTE_LENGTH]: { size: 300, description: "バイト長計算のキャッシュ" },
      [CacheType.ADJACENCY]: { size: 200, description: "隣接単語のキャッシュ" },
      [CacheType.WORD_DETECTION]: { size: 100, description: "単語検出のキャッシュ" },
    };
    this.initializeCaches();
  }

  /**
 * シングルトンインスタンスを取得
 * @returns 
   */
  public static getInstance(): GlobalCache {
    if (!GlobalCache.instance) {
      GlobalCache.instance = new GlobalCache();
    }
    return GlobalCache.instance;
  }

  /**
 * 各キャッシュタイプに対応するLRUCacheインスタンスを初期化します。
   */
  private initializeCaches(): void {
    Object.entries(this.cacheConfigs).forEach(([cacheType, config]) => {
      this.caches.set(cacheType as CacheType, new LRUCache(config.size));
    });
  }

  /**
 * 指定されたキャッシュタイプのキャッシュインスタンスを取得します。
 * @param type
 * @returns 
   * @throws {Error} 指定されたタイプのキャッシュが存在しない場合
   */
  public getCache<K, V>(type: CacheType): LRUCache<K, V> {
    const cache = this.caches.get(type);
    if (!cache) {
      const availableTypes = Array.from(this.caches.keys()).join(", ");
      throw new Error(
        `Cache for type '${type}' not found. Available types: ${availableTypes}`,
      );
    }
    return cache as LRUCache<K, V>;
  }

  /**
 * 全キャッシュの統計情報を取得します。
 * @returns 
   */
  public getAllStats(): Record<string, CacheStatistics> {
    const stats: Record<string, CacheStatistics> = {};

    for (const [cacheType, cache] of this.caches.entries()) {
      stats[cacheType] = cache.getStats();
    }

    return stats;
  }

  /**
 * 全キャッシュをクリアします。
   */
  public clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  /**
 * 特定タイプのキャッシュをクリアします。
 * @param type
   */
  public clearByType(type: CacheType): void {
    const cache = this.caches.get(type);
    if (cache) {
      cache.clear();
    }
  }

  /**
 * キャッシュ設定情報を取得します。
 * @returns 
   */
  public getCacheConfigs(): Readonly<Record<CacheType, CacheConfig>> {
    return this.cacheConfigs;
  }

  /**
 * 特定キャッシュタイプの設定情報を取得します。
 * @param type
 * @returns 
   * @throws {Error} 指定されたタイプの設定が存在しない場合
   */
  public getCacheConfig(type: CacheType): Readonly<CacheConfig> {
    const config = this.cacheConfigs[type];
    if (!config) {
      throw new Error(`Config for cache type '${type}' not found`);
    }
    return config;
  }
}

/**
 * GlobalCacheのエイリアス
 */
export const UnifiedCache = GlobalCache;
