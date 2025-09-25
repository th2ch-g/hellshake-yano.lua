/**
 * 汎用LRUキャッシュ実装とキャッシュ管理の統一インターフェース
 */

/**
 * 統一されたキャッシュインターフェース
 * 異なるキャッシュ実装を統一的に扱うためのインターフェース
 *
 * @template K キーの型
 * @template V 値の型
 */
export interface CacheInterface<K, V> {
  /**
   * キーに対応する値を取得
   * @param key 検索するキー
   * @returns キーに対応する値、存在しない場合はundefined
   */
  get(key: K): V | undefined;

  /**
   * キーと値のペアをキャッシュに設定
   * @param key 設定するキー
   * @param value 設定する値
   */
  set(key: K, value: V): void;

  /**
   * キーが存在するかチェック
   * @param key チェックするキー
   * @returns キーが存在する場合true
   */
  has(key: K): boolean;

  /**
   * キーに対応するエントリを削除
   * @param key 削除するキー
   * @returns 削除に成功した場合true
   */
  delete(key: K): boolean;

  /**
   * キャッシュをすべてクリア
   */
  clear(): void;

  /**
   * 現在のキャッシュサイズを取得
   * @returns 現在格納されているエントリ数
   */
  size(): number;

  /**
   * キャッシュの統計情報を取得
   * @returns ヒット率、ミス率などの統計データ
   */
  getStats(): CacheStatistics;
}

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
export class LRUCache<K, V> implements CacheInterface<K, V> {
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
   * 統計情報を取得（getStatsのエイリアス - 後方互換性のため）
   * @returns キャッシュ統計情報
   * @deprecated getStats()を使用してください
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
}

/**
 * 特化したキャッシュ戦略の基底クラス
 * 特定の用途に特化したキャッシュキー生成ロジックを提供
 *
 * @template K キーの型
 * @template V 値の型
 */
export abstract class CacheStrategy<K, V> {
  protected cache: LRUCache<K, V>;

  /**
   * キャッシュ戦略インスタンスを作成
   * @param maxSize キャッシュの最大サイズ
   */
  constructor(maxSize: number) {
    this.cache = new LRUCache<K, V>(maxSize);
  }

  /**
   * 引数からキャッシュキーを生成する抽象メソッド
   * 具象クラスで実装され、特定のキャッシュ戦略に応じたキー生成ロジックを提供
   * @param {...any[]} args キー生成に使用する可変長引数
   * @returns {K} 生成されたキャッシュキー
   * @example
   * ```typescript
   * // StringCacheStrategyの実装例
   * generateKey('user', 123, {role: 'admin'}); // -> "user|123|{\"role\":\"admin\"}"
   * ```
   */
  abstract generateKey(...args: any[]): K;

  /**
   * キーに対応する値を取得
   * 内部のLRUキャッシュから値を取得し、アクセス順序を更新
   * @param {K} key 検索するキー
   * @returns {V | undefined} キーに対応する値、存在しない場合はundefined
   */
  get(key: K): V | undefined {
    return this.cache.get(key);
  }

  /**
   * キーと値のペアを設定
   * 内部のLRUキャッシュに値を保存し、必要に応じて古いエントリを削除
   * @param {K} key 設定するキー
   * @param {V} value 設定する値
   */
  set(key: K, value: V): void {
    this.cache.set(key, value);
  }

  /**
   * キャッシュをクリア
   * 全てのエントリと統計情報をリセット
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * キャッシュ統計情報を取得
   * ヒット率、ミス率、サイズなどのパフォーマンス指標を取得
   * @returns {CacheStatistics} 統計情報（ヒット数、ミス数、サイズ、ヒット率など）
   */
  getStatistics(): CacheStatistics {
    return this.cache.getStatistics();
  }
}

/**
 * 文字列ベースのキャッシュ戦略
 * 複数の引数を文字列結合してキーを生成する汎用的なキャッシュ戦略
 * オブジェクトはJSONシリアライズされ、プリミティブは文字列化される
 *
 * @template V 値の型
 * @example
 * ```typescript
 * const strategy = new StringCacheStrategy<UserData>(100);
 * const key = strategy.generateKey('user', 123, {active: true});
 * // key: "user|123|{\"active\":true}"
 * strategy.set(key, userData);
 * ```
 */
export class StringCacheStrategy<V> extends CacheStrategy<string, V> {
  /**
   * 引数を文字列結合してキーを生成
   * 各引数を文字列化し、パイプ記号（|）で区切って結合
   * @param {...any[]} args キー生成に使用する引数（オブジェクトはJSON化される）
   * @returns {string} "|"で区切られた文字列キー
   * @example
   * ```typescript
   * generateKey('user', 42, {role: 'admin'});
   * // Returns: "user|42|{\"role\":\"admin\"}"
   * ```
   */
  generateKey(...args: any[]): string {
    return args.map((arg) => typeof arg === "object" ? JSON.stringify(arg) : String(arg)).join("|");
  }
}

/**
 * 単語検出用のキャッシュ戦略
 * バッファ情報とコンテンツハッシュからキーを生成する特化型戦略
 * エディタの単語検出結果をキャッシュするために最適化されている
 *
 * @example
 * ```typescript
 * const strategy = new WordDetectionCacheStrategy(200);
 * const words = strategy.get(
 *   strategy.generateKey(1, 10, 20, 'function example() {}')
 * );
 * ```
 */
export class WordDetectionCacheStrategy extends StringCacheStrategy<any[]> {
  /**
   * 単語検出用のキャッシュキーを生成
   * バッファ情報とコンテンツのハッシュを組み合わせて一意なキーを作成
   * @param {number} bufnr バッファ番号
   * @param {number} topLine 開始行番号
   * @param {number} bottomLine 終了行番号
   * @param {string} content コンテンツ文字列
   * @returns {string} ハッシュ値を含むキャッシュキー（形式: "bufnr|topLine|bottomLine|length|hash"）
   * @example
   * ```typescript
   * const key = generateKey(1, 10, 20, 'function test() {}');
   * // Returns: "1|10|20|18|abc123" (ハッシュ値は実際の計算結果)
   * ```
   */
  override generateKey(
    bufnr: number,
    topLine: number,
    bottomLine: number,
    content: string,
  ): string {
    return `${bufnr}|${topLine}|${bottomLine}|${content.length}|${this.hashString(content)}`;
  }

  /**
   * 文字列のハッシュ値を計算（DJB2アルゴリズムの変形）
   * 高速で衝突の少ないハッシュアルゴリズムを使用してコンテンツを識別
   * @param {string} str ハッシュ化する文字列
   * @returns {string} 36進数のハッシュ文字列（0-9, a-zの文字を使用）
   * @private
   */
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
 * 単語数と設定スナップショットからキーを生成する特化型戦略
 * 同じ単語数と設定の組み合わせで生成されるヒントをキャッシュ
 *
 * @example
 * ```typescript
 * const strategy = new HintGenerationCacheStrategy(100);
 * const hints = strategy.get(
 *   strategy.generateKey(5, {hintChars: 'asdf', caseSensitive: false})
 * );
 * ```
 */
export class HintGenerationCacheStrategy extends StringCacheStrategy<string[]> {
  /**
   * ヒント生成用のキャッシュキーを生成
   * 単語数と設定を組み合わせてヒント生成結果の一意性を保証
   * @param {number} wordCount 対象となる単語の数
   * @param {any} configSnapshot 設定のスナップショット（hintChars、caseSensitiveなど）
   * @returns {string} キャッシュキー（形式: "wordCount|{設定JSON}"）
   * @example
   * ```typescript
   * const key = generateKey(3, {hintChars: 'abc', caseSensitive: true});
   * // Returns: "3|{\"hintChars\":\"abc\",\"caseSensitive\":true}"
   * ```
   */
  override generateKey(wordCount: number, configSnapshot: any): string {
    return `${wordCount}|${JSON.stringify(configSnapshot)}`;
  }
}

/**
 * 統一されたキャッシュマネージャー
 * 複数のキャッシュを統一的に管理し、アプリケーション全体でのキャッシュ戦略を提供
 *
 * @example
 * ```typescript
 * const manager = new CacheManager();
 * const cache = manager.getCache<string, number>('userCache', 500);
 * cache.set('user1', 123);
 * ```
 */
export class CacheManager {
  private caches = new Map<string, CacheInterface<any, any>>();
  private defaultSize = 1000;

  /**
   * 新しいキャッシュを作成または既存のキャッシュを取得
   * @template K キーの型
   * @template V 値の型
   * @param name キャッシュの名前
   * @param maxSize 最大サイズ（省略時はデフォルト値）
   * @returns キャッシュインスタンス
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
   * 指定された名前のキャッシュを削除
   * 管理対象からキャッシュを除去し、メモリを解放
   * @param {string} name 削除するキャッシュの名前
   * @returns {boolean} 削除に成功した場合true、存在しなかった場合false
   */
  removeCache(name: string): boolean {
    return this.caches.delete(name);
  }

  /**
   * 管理されているすべてのキャッシュの内容をクリア
   * 全キャッシュのエントリと統計情報をリセット（キャッシュインスタンス自体は保持）
   */
  clearAllCaches(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  /**
   * 管理されているすべてのキャッシュの統計情報を取得
   * パフォーマンス監視とデバッグに使用
   * @returns {Record<string, CacheStatistics>} キャッシュ名をキーとした統計情報オブジェクト
   * @example
   * ```typescript
   * const stats = manager.getAllStats();
   * console.log(stats.userCache.hitRate); // 0.85
   * console.log(stats.wordCache.size);    // 150
   * ```
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
   * デバッグやキャッシュ管理UIで使用
   * @returns {string[]} キャッシュ名の配列
   * @example
   * ```typescript
   * const names = manager.getCacheNames();
   * // Returns: ['userCache', 'wordCache', 'hintCache']
   * ```
   */
  getCacheNames(): string[] {
    return Array.from(this.caches.keys());
  }
}

/**
 * グローバルキャッシュマネージャーインスタンス
 * アプリケーション全体で共有される統一キャッシュマネージャー
 * シングルトンパターンで実装され、どこからでもアクセス可能
 *
 * @example
 * ```typescript
 * // アプリケーションのどこからでも同じキャッシュにアクセス
 * import { globalCacheManager } from './cache';
 * const userCache = globalCacheManager.getCache<string, User>('users', 200);
 * ```
 */
export const globalCacheManager = new CacheManager();
