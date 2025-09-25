/**
 * 統一キャッシュシステム
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
 * const cache = UnifiedCache.getInstance();
 * const wordsCache = cache.getCache<string, string[]>(CacheType.WORDS);
 * wordsCache.set("buffer1", ["word1", "word2"]);
 * const words = wordsCache.get("buffer1");
 * ```
 */

import { LRUCache, CacheStatistics } from "./utils/cache.ts";

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
  WORD_DETECTION = "WORD_DETECTION"
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
 * 統一キャッシュクラス（シングルトンパターン）
 *
 * 各CacheTypeに対応するLRUCacheインスタンスを統一管理し、
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
 * const cache = UnifiedCache.getInstance();
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
export class UnifiedCache {
  private static instance: UnifiedCache;
  private readonly caches: Map<CacheType, LRUCache<any, any>>;
  private readonly cacheConfigs: Record<CacheType, CacheConfig>;

  /**
   * プライベートコンストラクタ（シングルトンパターン）
   * 各キャッシュの設定を初期化します。
   */
  private constructor() {
    this.caches = new Map();
    this.cacheConfigs = {
      [CacheType.WORDS]: { size: 1000, description: "単語検出結果のキャッシュ" },
      [CacheType.HINTS]: { size: 500, description: "ヒント生成結果のキャッシュ" },
      [CacheType.DISPLAY]: { size: 200, description: "表示情報のキャッシュ" },
      [CacheType.ANALYSIS]: { size: 300, description: "解析結果のキャッシュ" },
      [CacheType.TEMP]: { size: 100, description: "一時的なデータのキャッシュ" },
      [CacheType.HINT_ASSIGNMENT_NORMAL]: { size: 100, description: "ノーマルモード用ヒント割り当てキャッシュ" },
      [CacheType.HINT_ASSIGNMENT_VISUAL]: { size: 100, description: "ビジュアルモード用ヒント割り当てキャッシュ" },
      [CacheType.HINT_ASSIGNMENT_OTHER]: { size: 100, description: "その他モード用ヒント割り当てキャッシュ" },
      [CacheType.LANGUAGE_RULES]: { size: 50, description: "言語ルールのキャッシュ" },
      [CacheType.SYNTAX_CONTEXT]: { size: 200, description: "シンタックスコンテキストのキャッシュ" },
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
   * @returns UnifiedCacheのインスタンス
   */
  public static getInstance(): UnifiedCache {
    if (!UnifiedCache.instance) {
      UnifiedCache.instance = new UnifiedCache();
    }
    return UnifiedCache.instance;
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
   * const cache = UnifiedCache.getInstance();
   * const wordsCache = cache.getCache<string, string[]>(CacheType.WORDS);
   * wordsCache.set("file1", ["word1", "word2"]);
   * ```
   */
  public getCache<K, V>(type: CacheType): LRUCache<K, V> {
    const cache = this.caches.get(type);
    if (!cache) {
      const availableTypes = Array.from(this.caches.keys()).join(", ");
      throw new Error(
        `Cache for type '${type}' not found. Available types: ${availableTypes}`
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
   * const cache = UnifiedCache.getInstance();
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
   * const cache = UnifiedCache.getInstance();
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
   * const cache = UnifiedCache.getInstance();
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