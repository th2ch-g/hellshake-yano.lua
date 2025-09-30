/**
 * グローバルキャッシュシステム
 * 複数のキャッシュ実装を1つに統合し、型安全なアクセスを提供します。
 *
 * TDD (Test-Driven Development) により開発され、Red-Green-Refactor サイクルに従って
 * 実装されています。
 *
 * ## 特徴
 * - シングルトンパターンによる統一管理
 * - 16種類のキャッシュタイプをサポート
 * - 型安全なジェネリックインターフェース
 * - LRUアルゴリズムによる効率的なメモリ管理
 * - 統計情報とパフォーマンス監視機能
 *
 * @example
 * ```typescript
 * const cache = GlobalCache.getInstance();
 * const wordsCache = cache.getCache<string, string[]>(CacheType.WORDS);
 * wordsCache.set("buffer1", ["word1", "word2"]);
 * const words = wordsCache.get("buffer1");
 * ```
 */

/**
 * キャッシュの統計情報インターフェース
 * キャッシュのパフォーマンスと使用状況を追跡するための統計データ
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
 * 最も最近使用されていないエントリから削除される方式のキャッシュ
 *
 * @template K キーの型
 * @template V 値の型
 * @example
 * ```typescript
 * const cache = new LRUCache<string, number>(100);
 * cache.set('key1', 42);
 * const value = cache.get('key1'); // 42
 * ```
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;
  private hits = 0;
  private misses = 0;

  /**
   * LRUキャッシュインスタンスを作成
   * @param maxSize キャッシュの最大サイズ（正の整数である必要がある）
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
   * @param key 取得するキー
   * @returns キーに対応する値、存在しない場合はundefined
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
   * @param key 設定するキー
   * @param value 設定する値
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
   * @param key 削除するキー
   * @returns 削除に成功した場合true、キーが存在しなかった場合false
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * 指定されたキーがキャッシュに存在するかチェック
   * @param key チェックするキー
   * @returns キーが存在する場合true
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
   * @returns 現在のエントリ数
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * キャッシュの最大容量を取得
   * @returns 最大エントリ数
   */
  get capacity(): number {
    return this.maxSize;
  }

  /**
   * キャッシュのパフォーマンス統計情報を取得
   * @returns ヒット数、ミス数、ヒット率などの統計データ
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
   * @returns キーのイテレータ
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  /**
   * キャッシュされている全ての値のイテレータを取得
   * @returns 値のイテレータ
   */
  values(): IterableIterator<V> {
    return this.cache.values();
  }

  /**
   * キャッシュされている全てのエントリ（キーと値のペア）のイテレータを取得
   * @returns [キー, 値]ペアのイテレータ
   */
  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }

  /**
   * キャッシュの各エントリに対して関数を実行
   * @param callbackfn 各エントリに対して実行する関数
   * @param thisArg コールバック関数内でthisとして使用する値
   */
  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
    this.cache.forEach(callbackfn, thisArg);
  }

  /**
   * 統計情報を取得（getStatsのエイリアス - 後方互換性のため）
   * @returns キャッシュ統計情報
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
 * 16種類のキャッシュタイプを定義し、それぞれの用途を明確に区別します。
 *
 * @enum {string}
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
 * 各キャッシュタイプの設定を定義
 */
interface CacheConfig {
  /** キャッシュの最大サイズ */
  size: number;
  /** キャッシュの説明 */
  description: string;
}

/**
 * グローバルキャッシュクラス（シングルトンパターン）
 *
 * 各CacheTypeに対応するLRUCacheインスタンスをグローバルに管理し、
 * 型安全で効率的なキャッシュシステムを提供します。
 *
 * ## 設計原則
 * - シングルトンパターンでアプリケーション全体で一意のインスタンス
 * - 各キャッシュタイプごとに最適化されたサイズ設定
 * - 型安全なジェネリックアクセス
 * - 統計情報による監視とデバッグ支援
 *
 * @example
 * ```typescript
 * const cache = GlobalCache.getInstance();
 *
 * // 型安全な操作
 * const wordsCache = cache.getCache<string, string[]>(CacheType.WORDS);
 * wordsCache.set("file1", ["hello", "world"]);
 *
 * // 統計情報の取得
 * const stats = cache.getAllStats();
 * console.log(`Words cache hit rate: ${stats.WORDS.hitRate}`);
 * ```
 */
export class GlobalCache {
  private static instance: GlobalCache;
  private readonly caches: Map<CacheType, LRUCache<any, any>>;
  private readonly cacheConfigs: Record<CacheType, CacheConfig>;

  /**
   * プライベートコンストラクタ（シングルトンパターン）
   * 各キャッシュの設定を初期化します。
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
   * @returns GlobalCacheのインスタンス
   */
  public static getInstance(): GlobalCache {
    if (!GlobalCache.instance) {
      GlobalCache.instance = new GlobalCache();
    }
    return GlobalCache.instance;
  }

  /**
   * 各キャッシュタイプに対応するLRUCacheインスタンスを初期化します。
   * 設定に基づいて各キャッシュに適切なサイズを割り当てます。
   *
   * @private
   */
  private initializeCaches(): void {
    Object.entries(this.cacheConfigs).forEach(([cacheType, config]) => {
      this.caches.set(cacheType as CacheType, new LRUCache(config.size));
    });
  }

  /**
   * 指定されたキャッシュタイプのキャッシュインスタンスを取得します。
   *
   * 型安全なジェネリックインターフェースを提供し、キャッシュの型を
   * コンパイル時にチェックできます。
   *
   * @template K キーの型
   * @template V 値の型
   * @param type 取得するキャッシュのタイプ
   * @returns 指定されたタイプのLRUCacheインスタンス
   * @throws {Error} 指定されたタイプのキャッシュが存在しない場合
   *
   * @example
   * ```typescript
   * const cache = GlobalCache.getInstance();
   * const wordsCache = cache.getCache<string, string[]>(CacheType.WORDS);
   * wordsCache.set("file1", ["word1", "word2"]);
   * ```
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
   *
   * パフォーマンス監視とデバッグに使用でき、各キャッシュの
   * ヒット率、サイズ、使用状況を把握できます。
   *
   * @returns キャッシュタイプをキーとした統計情報オブジェクト
   *
   * @example
   * ```typescript
   * const cache = GlobalCache.getInstance();
   * const stats = cache.getAllStats();
   * console.log(`Words cache hit rate: ${stats.WORDS.hitRate}`);
   * console.log(`Total caches: ${Object.keys(stats).length}`);
   * ```
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
   *
   * すべてのキャッシュのエントリと統計情報をリセットし、
   * メモリ使用量を初期状態に戻します。
   *
   * @example
   * ```typescript
   * const cache = GlobalCache.getInstance();
   * cache.clearAll(); // 全キャッシュをリセット
   * ```
   */
  public clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  /**
   * 特定タイプのキャッシュをクリアします。
   *
   * 指定されたキャッシュタイプのみをクリアし、他のキャッシュは
   * そのまま保持されます。
   *
   * @param type クリアするキャッシュのタイプ
   *
   * @example
   * ```typescript
   * const cache = GlobalCache.getInstance();
   * cache.clearByType(CacheType.TEMP); // 一時キャッシュのみクリア
   * ```
   */
  public clearByType(type: CacheType): void {
    const cache = this.caches.get(type);
    if (cache) {
      cache.clear();
    }
  }

  /**
   * キャッシュ設定情報を取得します。
   *
   * 各キャッシュタイプの設定（サイズ、説明）を取得できます。
   *
   * @returns キャッシュタイプをキーとした設定情報オブジェクト
   */
  public getCacheConfigs(): Readonly<Record<CacheType, CacheConfig>> {
    return this.cacheConfigs;
  }

  /**
   * 特定キャッシュタイプの設定情報を取得します。
   *
   * @param type 設定を取得するキャッシュタイプ
   * @returns 指定されたタイプの設定情報
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
 * 後方互換性のためのエイリアス
 */
export const UnifiedCache = GlobalCache;
