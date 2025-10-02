/**
 * word-cache.ts
 * 単語検出結果のキャッシュ管理
 *
 * 単語検出処理は計算コストが高いため、結果をキャッシュして再利用します。
 * GlobalCacheシステムと統合され、自動的にLRUアルゴリズムで管理されます。
 */

import type { Word } from "../types.ts";
import { CacheType, GlobalCache } from "../cache.ts";

/**
 * KeyBasedWordCacheの統計情報インターフェース
 */
export interface KeyBasedWordCacheStats {
  /** 現在のキャッシュサイズ（レガシー互換） */
  size: number;
  /** キー一覧（レガシー互換、GlobalCacheでは空配列） */
  keys: string[];
  /** キャッシュヒット数 */
  hits: number;
  /** キャッシュミス数 */
  misses: number;
  /** ヒット率（0.0-1.0） */
  hitRate: number;
  /** 最大キャッシュサイズ */
  maxSize: number;
  /** 使用しているキャッシュタイプ */
  cacheType: CacheType;
  /** キャッシュの説明 */
  description: string;
  /** GlobalCache統合済みフラグ */
  unified: boolean;
}

/**
 * キーベースの単語キャッシュクラス
 *
 * 単語検出結果をキーに基づいてキャッシュします。
 * GlobalCacheシステムと統合されており、以下の機能を提供します：
 * - LRUアルゴリズムによる自動的なサイズ管理
 * - 統計情報の収集（ヒット率、ミス数など）
 * - スレッドセーフな操作
 *
 * @example
 * ```ts
 * const cache = new KeyBasedWordCache();
 *
 * // 単語リストをキャッシュに保存
 * const words = [
 *   { text: "hello", startLine: 1, endLine: 1, startCol: 0, endCol: 5 }
 * ];
 * cache.set("buffer:1", words);
 *
 * // キャッシュから取得
 * const cached = cache.get("buffer:1");
 * if (cached) {
 *   console.log("Cache hit!", cached);
 * }
 *
 * // 統計情報を取得
 * const stats = cache.getStats();
 * console.log(`Hit rate: ${stats.hitRate}`);
 * ```
 */
export class KeyBasedWordCache {
  private globalCache: GlobalCache;
  private wordsCache: ReturnType<GlobalCache["getCache"]>;

  /**
   * KeyBasedWordCacheのコンストラクタ
   *
   * GlobalCacheシステムと接続し、WORDSキャッシュを初期化します。
   *
   * @throws {Error} GlobalCacheの初期化に失敗した場合
   */
  constructor() {
    try {
      this.globalCache = GlobalCache.getInstance();
      this.wordsCache = this.globalCache.getCache<string, Word[]>(CacheType.WORDS);
    } catch (error) {
      throw new Error(
        `KeyBasedWordCache initialization failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * キーに基づいて単語リストをキャッシュに保存
   *
   * @param key - キャッシュキー（例: "buffer:1", "file:/path/to/file"）
   * @param words - 保存する単語リスト
   *
   * @example
   * ```ts
   * cache.set("buffer:1", [
   *   { text: "hello", startLine: 1, endLine: 1, startCol: 0, endCol: 5 }
   * ]);
   * ```
   */
  set(key: string, words: Word[]): void {
    // GlobalCache のWORDSキャッシュに保存（浅いコピーで参照汚染防止）
    this.wordsCache.set(key, [...words]);
  }

  /**
   * キーに基づいてキャッシュから単語リストを取得
   *
   * @param key - キャッシュキー
   * @returns キャッシュされた単語リスト。存在しない場合はundefined
   *
   * @example
   * ```ts
   * const words = cache.get("buffer:1");
   * if (words) {
   *   console.log(`Found ${words.length} cached words`);
   * } else {
   *   console.log("Cache miss - need to detect words");
   * }
   * ```
   */
  get(key: string): Word[] | undefined {
    const cached = this.wordsCache.get(key) as Word[] | undefined;
    if (cached && Array.isArray(cached)) {
      // キャッシュヒット: 新しい配列として返す（参照汚染防止）
      return [...cached];
    }
    return undefined;
  }

  /**
   * キャッシュが特定のキーを含んでいるかチェック
   *
   * @param key - チェックするキー
   * @returns キーが存在する場合はtrue
   *
   * @example
   * ```ts
   * if (cache.has("buffer:1")) {
   *   const words = cache.get("buffer:1");
   *   // ... use cached words
   * } else {
   *   // ... detect words and cache them
   * }
   * ```
   */
  has(key: string): boolean {
    return this.wordsCache.has(key);
  }

  /**
   * 特定のキーのキャッシュをクリア
   *
   * キーを指定しない場合は、すべてのWORDSキャッシュをクリアします。
   *
   * @param key - クリアするキー（省略時は全クリア）
   *
   * @example
   * ```ts
   * // 特定のキーをクリア
   * cache.clear("buffer:1");
   *
   * // すべてのキャッシュをクリア
   * cache.clear();
   * ```
   */
  clear(key?: string): void {
    if (key) {
      this.wordsCache.delete(key);
    } else {
      this.globalCache.clearByType(CacheType.WORDS);
    }
  }

  /**
   * キャッシュ統計情報を取得（GlobalCache統合版）
   *
   * 以下の情報を含む統計オブジェクトを返します：
   * - サイズ: 現在キャッシュされているエントリ数
   * - ヒット数/ミス数: キャッシュのアクセス統計
   * - ヒット率: キャッシュの効率性を示す指標（0.0-1.0）
   * - 最大サイズ: キャッシュの容量上限
   *
   * @returns キャッシュ統計情報
   *
   * @example
   * ```ts
   * const stats = cache.getStats();
   * console.log(`Cache efficiency: ${(stats.hitRate * 100).toFixed(1)}%`);
   * console.log(`Usage: ${stats.size}/${stats.maxSize}`);
   * console.log(`Hits: ${stats.hits}, Misses: ${stats.misses}`);
   * ```
   */
  getStats(): KeyBasedWordCacheStats {
    try {
      const unifiedStats = this.globalCache.getAllStats();
      const wordStats = unifiedStats.WORDS;
      if (!wordStats) {
        throw new Error("WORDS cache statistics not found");
      }
      const config = this.globalCache.getCacheConfig(CacheType.WORDS);
      return {
        // レガシー互換フィールド
        size: wordStats.size,
        keys: [], // GlobalCacheではキー一覧の取得は提供していないため空配列
        // GlobalCache統計情報
        hits: wordStats.hits,
        misses: wordStats.misses,
        hitRate: wordStats.hitRate,
        maxSize: wordStats.maxSize,
        // メタデータ
        cacheType: CacheType.WORDS,
        description: config.description,
        unified: true, // GlobalCache統合済みであることを示すフラグ
      };
    } catch {
      // フォールバック統計情報
      return {
        size: 0,
        keys: [],
        hits: 0,
        misses: 0,
        hitRate: 0,
        maxSize: 1000, // デフォルトサイズ
        cacheType: CacheType.WORDS,
        description: "単語検出結果のキャッシュ（統計取得エラー）",
        unified: true, // 統合されているが統計取得に失敗
      };
    }
  }

  /**
   * キャッシュのサイズを取得
   *
   * @returns 現在キャッシュされているエントリ数
   *
   * @example
   * ```ts
   * const size = cache.size();
   * console.log(`Current cache size: ${size}`);
   * ```
   */
  size(): number {
    return this.getStats().size;
  }

  /**
   * キャッシュが空かどうかをチェック
   *
   * @returns キャッシュが空の場合はtrue
   *
   * @example
   * ```ts
   * if (cache.isEmpty()) {
   *   console.log("Cache is empty - warming up...");
   * }
   * ```
   */
  isEmpty(): boolean {
    return this.size() === 0;
  }
}

/**
 * グローバル単語キャッシュインスタンス
 *
 * アプリケーション全体で共有される単語キャッシュです。
 * 複数の場所から同じキャッシュにアクセスする必要がある場合に使用します。
 *
 * @example
 * ```ts
 * import { globalWordCache } from "./word-cache.ts";
 *
 * // どこからでもアクセス可能
 * globalWordCache.set("shared-key", words);
 * const cached = globalWordCache.get("shared-key");
 * ```
 */
export const globalWordCache = new KeyBasedWordCache();
