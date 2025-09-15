/**
 * Word Detection Manager for Hellshake-Yano
 *
 * This module manages multiple word detection strategies and provides
 * a unified interface with caching, error handling, and fallback mechanisms.
 */

import type { Denops } from "@denops/std";
import type { Word } from "../word.ts";
import {
  HybridWordDetector,
  RegexWordDetector,
  TinySegmenterWordDetector,
  type WordDetectionConfig,
  type WordDetectionResult,
  type WordDetector,
} from "./detector.ts";

/**
 * 単語検出マネージャー設定インターフェース
 * @description 単語検出マネージャーの包括的な設定オプションを定義するインターフェース
 * @since 1.0.0
 */
export interface WordDetectionManagerConfig extends WordDetectionConfig {
  /** デフォルトの単語検出ストラテジー */
  default_strategy?: "regex" | "tinysegmenter" | "hybrid";
  /** 言語の自動検出を有効にするか */
  auto_detect_language?: boolean;
  /** パフォーマンスモニタリングを有効にするか */
  performance_monitoring?: boolean;

  /** キャッシュ機能を有効にするか */
  cache_enabled?: boolean;
  /** キャッシュの最大サイズ */
  cache_max_size?: number;
  /** キャッシュエントリの有効期限（ミリ秒） */
  cache_ttl_ms?: number;

  /** 最大リトライ回数 */
  max_retries?: number;
  /** リトライ間の遅延時間（ミリ秒） */
  retry_delay_ms?: number;

  /** 処理タイムアウト時間（ミリ秒） */
  timeout_ms?: number;
  /** バッチ処理を有効にするか */
  batch_processing?: boolean;
  /** 同時実行可能な検出数の上限 */
  max_concurrent_detections?: number;
}

/**
 * キャッシュエントリインターフェース
 * @description キャッシュに格納される単語検出結果の構造
 * @since 1.0.0
 */
interface CacheEntry {
  /** 検出された単語の配列 */
  words: Word[];
  /** キャッシュ作成時刻 */
  timestamp: number;
  /** 使用されたディテクター名 */
  detector: string;
  /** 設定のハッシュ値 */
  config_hash: string;
}

/**
 * 検出統計情報インターフェース
 * @description 単語検出マネージャーのパフォーマンス統計情報
 * @since 1.0.0
 */
interface DetectionStats {
  /** 総呼び出し回数 */
  total_calls: number;
  /** キャッシュヒット回数 */
  cache_hits: number;
  /** キャッシュミス回数 */
  cache_misses: number;
  /** エラー発生回数 */
  errors: number;
  /** 平均処理時間（ミリ秒） */
  average_duration: number;
  /** ディテクター別使用回数 */
  detector_usage: Record<string, number>;
}

/**
 * メイン単語検出マネージャー
 * @description 複数の単語検出戦略を管理し、キャッシュ、エラーハンドリング、フォールバック機能を提供する統合インターフェース
 * @since 1.0.0
 * @example
 * ```typescript
 * const manager = new WordDetectionManager({
 *   default_strategy: 'hybrid',
 *   cache_enabled: true,
 *   use_japanese: true
 * });
 * await manager.initialize();
 * const result = await manager.detectWords('テストテキスト');
 * ```
 */
export class WordDetectionManager {
  private detectors: Map<string, WordDetector> = new Map();
  private config: Required<WordDetectionManagerConfig>;
  private cache: Map<string, CacheEntry> = new Map();
  private stats: DetectionStats;
  private initialized = false;

  /**
   * WordDetectionManagerのコンストラクタ
   * @description マネージャーを初期化し、設定と統計情報をセットアップ
   * @param config - マネージャー設定（省略時はデフォルト設定）
   * @since 1.0.0
   */
  constructor(config: WordDetectionManagerConfig = {}) {
    this.config = this.mergeWithDefaults(config);
    this.stats = this.initializeStats();
  }

  /**
   * デフォルトディテクターでマネージャーを初期化
   * @description 標準の単語検出ディテクター（Regex、TinySegmenter、Hybrid）を登録し、利用可能性をテスト
   * @returns Promise<void> - 初期化完了を示すPromise
   * @throws {Error} ディテクターの初期化に失敗した場合
   * @since 1.0.0
   * @example
   * ```typescript
   * const manager = new WordDetectionManager();
   * await manager.initialize();
   * // マネージャーが使用可能になる
   * ```
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Register default detectors
    const regexDetector = new RegexWordDetector(this.config);
    const segmenterDetector = new TinySegmenterWordDetector(this.config);
    const hybridDetector = new HybridWordDetector(this.config);

    this.registerDetector(regexDetector);
    this.registerDetector(segmenterDetector);
    this.registerDetector(hybridDetector);

    // Test detector availability
    for (const [name, detector] of this.detectors) {
      const available = await detector.isAvailable();
    }

    this.initialized = true;
  }

  /**
   * 単語ディテクターを登録
   * @description カスタム単語ディテクターをマネージャーに登録し、利用可能にする
   * @param detector - 登録する単語ディテクター
   * @returns void
   * @since 1.0.0
   * @example
   * ```typescript
   * const customDetector = new CustomWordDetector();
   * manager.registerDetector(customDetector);
   * ```
   */
  registerDetector(detector: WordDetector): void {
    this.detectors.set(detector.name, detector);
  }

  /**
   * メイン単語検出メソッド
   * @description テキストから単語を検出し、キャッシュ、エラーハンドリング、フォールバック機能を活用して結果を返す
   * @param text - 解析するテキスト
   * @param startLine - 開始行番号（デフォルト: 1）
   * @param denops - Denopsインスタンス（オプション）
   * @returns Promise<WordDetectionResult> - 単語検出結果
   * @throws {Error} 全てのディテクターが失敗した場合（空の結果を返す）
   * @since 1.0.0
   * @example
   * ```typescript
   * const result = await manager.detectWords('こんにちは世界', 1);
   * if (result.success) {
   *   console.log('Words found:', result.words.length);
   * }
   * ```
   */
  async detectWords(
    text: string,
    startLine: number = 1,
    denops?: Denops,
  ): Promise<WordDetectionResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    this.stats.total_calls++;

    try {
      // Check cache first
      if (this.config.cache_enabled) {
        const cached = this.getCachedResult(text, startLine);
        if (cached) {
          this.stats.cache_hits++;
          return {
            words: cached.words,
            detector: cached.detector,
            success: true,
            performance: {
              duration: Date.now() - startTime,
              wordCount: cached.words.length,
              linesProcessed: text.split("\n").length,
            },
          };
        }
        this.stats.cache_misses++;
      }

      // Select appropriate detector
      const detector = await this.selectDetector(text);
      if (!detector) {
        throw new Error("No suitable detector available");
      }

      // Perform detection with timeout
      const words = await this.detectWithTimeout(detector, text, startLine);

      // Cache the result
      if (this.config.cache_enabled) {
        this.cacheResult(text, startLine, words, detector.name);
      }

      // Update statistics
      this.stats.detector_usage[detector.name] = (this.stats.detector_usage[detector.name] || 0) +
        1;
      const duration = Date.now() - startTime;
      this.updateAverageDuration(duration);

      return {
        words,
        detector: detector.name,
        success: true,
        performance: {
          duration,
          wordCount: words.length,
          linesProcessed: text.split("\n").length,
        },
      };
    } catch (error) {
      this.stats.errors++;
      // console.error("[WordDetectionManager] Detection failed:", error);

      // Try fallback detector if enabled
      if (this.config.enable_fallback) {
        try {
          const fallbackDetector = this.getFallbackDetector();
          if (fallbackDetector) {
            const words = await fallbackDetector.detectWords(text, startLine);
            return {
              words,
              detector: `${fallbackDetector.name} (fallback)`,
              success: true,
              error: `Primary detection failed: ${error}`,
              performance: {
                duration: Date.now() - startTime,
                wordCount: words.length,
                linesProcessed: text.split("\n").length,
              },
            };
          }
        } catch (fallbackError) {
          // console.error("[WordDetectionManager] Fallback detection also failed:", fallbackError);
        }
      }

      return {
        words: [],
        detector: "none",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        performance: {
          duration: Date.now() - startTime,
          wordCount: 0,
          linesProcessed: text.split("\n").length,
        },
      };
    }
  }

  /**
   * Denopsバッファから単語を検出（便利メソッド）
   * @description 現在表示中のバッファから直接単語を検出する便利メソッド
   * @param denops - Denopsインスタンス
   * @returns Promise<WordDetectionResult> - 単語検出結果
   * @throws {Error} バッファアクセスに失敗した場合（エラー情報を含む結果を返す）
   * @since 1.0.0
   * @example
   * ```typescript
   * const result = await manager.detectWordsFromBuffer(denops);
   * console.log(`Found ${result.words.length} words in current buffer`);
   * ```
   */
  async detectWordsFromBuffer(denops: Denops): Promise<WordDetectionResult> {
    try {
      // Get visible range
      const topLine = await denops.call("line", "w0") as number;
      const bottomLine = await denops.call("line", "w$") as number;

      // Get lines content
      const lines = await denops.call("getbufline", "%", topLine, bottomLine) as string[];
      const text = lines.join("\n");

      return this.detectWords(text, topLine, denops);
    } catch (error) {
      // console.error("[WordDetectionManager] Failed to detect words from buffer:", error);
      return {
        words: [],
        detector: "none",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        performance: {
          duration: 0,
          wordCount: 0,
          linesProcessed: 0,
        },
      };
    }
  }

  /**
   * 指定されたテキストに最適なディテクターを選択
   * @description テキストの内容、設定、優先度に基づいて最適な単語ディテクターを選択
   * @param text - 解析対象のテキスト
   * @returns Promise<WordDetector | null> - 選択されたディテクター（利用可能なものがない場合はnull）
   * @since 1.0.0
   */
  private async selectDetector(text: string): Promise<WordDetector | null> {
    const availableDetectors = Array.from(this.detectors.values())
      .filter((d) => d.canHandle(text))
      .sort((a, b) => b.priority - a.priority);

    if (availableDetectors.length === 0) {
      return null;
    }

    // Strategy-based selection
    // word_detection_strategyとstrategyの両方をサポート（後方互換性）
    const strategy = (this.config as any).word_detection_strategy || this.config.strategy ||
      this.config.default_strategy;

    switch (strategy) {
      case "regex":
        return availableDetectors.find((d) => d.name.includes("Regex")) || availableDetectors[0];

      case "tinysegmenter":
        const segmenterDetector = availableDetectors.find((d) => d.name.includes("TinySegmenter"));
        if (segmenterDetector && await segmenterDetector.isAvailable()) {
          return segmenterDetector;
        }
        return availableDetectors[0];

      case "hybrid":
        const hybridDetector = availableDetectors.find((d) => d.name.includes("Hybrid"));
        if (hybridDetector && await hybridDetector.isAvailable()) {
          return hybridDetector;
        }
        return availableDetectors[0];

      default:
        // Auto-detect based on content
        if (this.config.auto_detect_language) {
          const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
          if (hasJapanese) {
            const japaneseDetector = availableDetectors.find((d) =>
              d.supportedLanguages.includes("ja") && d.priority > 1
            );
            if (japaneseDetector && await japaneseDetector.isAvailable()) {
              return japaneseDetector;
            }
          }
        }
        return availableDetectors[0];
    }
  }

  /**
   * フォールバックディテクターを取得
   * @description メインのディテクターが失敗した場合に使用するフォールバックディテクターを取得
   * @returns WordDetector | null - フォールバックディテクター（利用可能なものがない場合はnull）
   * @since 1.0.0
   */
  private getFallbackDetector(): WordDetector | null {
    if (this.config.fallback_to_regex) {
      return this.detectors.get("RegexWordDetector") || null;
    }

    // Return the detector with lowest priority (most basic)
    const detectors = Array.from(this.detectors.values())
      .sort((a, b) => a.priority - b.priority);

    return detectors[0] || null;
  }

  /**
   * タイムアウト保護付き単語検出
   * @description 指定されたタイムアウト時間内で単語検出を実行し、超過した場合はエラーをスロー
   * @param detector - 使用するディテクター
   * @param text - 解析するテキスト
   * @param startLine - 開始行番号
   * @returns Promise<Word[]> - 検出された単語の配列
   * @throws {Error} タイムアウトまたは検出処理に失敗した場合
   * @since 1.0.0
   */
  private async detectWithTimeout(
    detector: WordDetector,
    text: string,
    startLine: number,
  ): Promise<Word[]> {
    if (!this.config.timeout_ms) {
      return detector.detectWords(text, startLine);
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Detection timeout (${this.config.timeout_ms}ms)`));
      }, this.config.timeout_ms);

      detector.detectWords(text, startLine)
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * キャッシュキーを生成
   * @description テキスト、行番号、設定のハッシュ値から一意なキャッシュキーを生成
   * @param text - キャッシュ対象のテキスト
   * @param startLine - 開始行番号
   * @returns string - 生成されたキャッシュキー
   * @since 1.0.0
   */
  private generateCacheKey(text: string, startLine: number): string {
    const configHash = this.generateConfigHash();
    const textHash = this.simpleHash(text);
    return `${textHash}:${startLine}:${configHash}`;
  }

  private generateConfigHash(): string {
    const relevantConfig = {
      strategy: (this.config as any).word_detection_strategy || this.config.strategy,
      use_japanese: this.config.use_japanese,
      // use_improved_detection: 統合済み（常に有効）
      min_word_length: this.config.min_word_length,
      max_word_length: this.config.max_word_length,
    };
    return this.simpleHash(JSON.stringify(relevantConfig));
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private getCachedResult(text: string, startLine: number): CacheEntry | null {
    const key = this.generateCacheKey(text, startLine);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.config.cache_ttl_ms) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  private cacheResult(text: string, startLine: number, words: Word[], detector: string): void {
    const key = this.generateCacheKey(text, startLine);

    // Manage cache size
    if (this.cache.size >= this.config.cache_max_size) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = entries.slice(0, Math.floor(this.config.cache_max_size * 0.1));
      for (const [key] of toRemove) {
        this.cache.delete(key);
      }
    }

    this.cache.set(key, {
      words,
      timestamp: Date.now(),
      detector,
      config_hash: this.generateConfigHash(),
    });
  }

  /**
   * 統計情報を初期化
   * @description パフォーマンス統計情報を初期値で初期化
   * @returns DetectionStats - 初期化された統計情報オブジェクト
   * @since 1.0.0
   */
  private initializeStats(): DetectionStats {
    return {
      total_calls: 0,
      cache_hits: 0,
      cache_misses: 0,
      errors: 0,
      average_duration: 0,
      detector_usage: {},
    };
  }

  private updateAverageDuration(duration: number): void {
    const totalDuration = this.stats.average_duration * (this.stats.total_calls - 1) + duration;
    this.stats.average_duration = totalDuration / this.stats.total_calls;
  }

  /**
   * 統計情報を取得
   * @description 現在のパフォーマンス統計情報のコピーを返す
   * @returns DetectionStats - 統計情報のコピー
   * @since 1.0.0
   * @example
   * ```typescript
   * const stats = manager.getStats();
   * console.log(`Total calls: ${stats.total_calls}, Cache hit rate: ${stats.cache_hits / (stats.cache_hits + stats.cache_misses)}`);
   * ```
   */
  getStats(): DetectionStats {
    return { ...this.stats };
  }

  /**
   * キャッシュ統計情報を取得
   * @description キャッシュの使用状況とヒット率を返す
   * @returns {{ size: number, maxSize: number, hitRate: number }} キャッシュ統計情報
   * @since 1.0.0
   * @example
   * ```typescript
   * const cacheStats = manager.getCacheStats();
   * console.log(`Cache usage: ${cacheStats.size}/${cacheStats.maxSize} (${(cacheStats.hitRate * 100).toFixed(2)}% hit rate)`);
   * ```
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    const total = this.stats.cache_hits + this.stats.cache_misses;
    return {
      size: this.cache.size,
      maxSize: this.config.cache_max_size,
      hitRate: total > 0 ? this.stats.cache_hits / total : 0,
    };
  }

  /**
   * キャッシュをクリア
   * @description 格納されているすべてのキャッシュエントリを削除
   * @returns void
   * @since 1.0.0
   * @example
   * ```typescript
   * manager.clearCache(); // キャッシュをリセット
   * ```
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 統計情報をリセット
   * @description すべてのパフォーマンス統計情報を初期値にリセット
   * @returns void
   * @since 1.0.0
   * @example
   * ```typescript
   * manager.resetStats(); // 統計情報をリセット
   * ```
   */
  resetStats(): void {
    this.stats = this.initializeStats();
  }

  /**
   * 設定を更新
   * @description 部分的な設定更新を行い、必要に応じてキャッシュをクリア
   * @param newConfig - 更新する設定の部分オブジェクト
   * @returns void
   * @since 1.0.0
   * @example
   * ```typescript
   * manager.updateConfig({ cache_enabled: false, timeout_ms: 3000 });
   * ```
   */
  updateConfig(newConfig: Partial<WordDetectionManagerConfig>): void {
    // 設定をマージ
    this.config = { ...this.config, ...newConfig };

    // word_detection_strategyがある場合はstrategyに反映（後方互換性）
    if ((newConfig as any).word_detection_strategy) {
      this.config.strategy = (newConfig as any).word_detection_strategy;
      this.config.default_strategy = (newConfig as any).word_detection_strategy;
    }

    // 設定変更に影響するキャッシュをクリア
    if (this.affectsDetection(newConfig)) {
      this.clearCache();
    }

    // 検出戦略が変更された場合はディテクターを再初期化
    if (this.shouldReinitializeDetectors(newConfig)) {
      this.reinitializeDetectors();
    }
  }

  /**
   * 設定変更が検出結果に影響するかチェック
   * @param newConfig - 新しい設定
   * @returns 影響する場合はtrue
   */
  private affectsDetection(newConfig: Partial<WordDetectionManagerConfig>): boolean {
    const affectingKeys = [
      'strategy',
      'word_detection_strategy',
      'use_japanese',
      'enable_tinysegmenter',
      'segmenter_threshold',
      'min_word_length',
      'max_word_length'
    ];

    return affectingKeys.some(key => key in newConfig);
  }

  /**
   * ディテクターの再初期化が必要かチェック
   * @param newConfig - 新しい設定
   * @returns 再初期化が必要な場合はtrue
   */
  private shouldReinitializeDetectors(newConfig: Partial<WordDetectionManagerConfig>): boolean {
    const reinitKeys = [
      'strategy',
      'word_detection_strategy',
      'enable_tinysegmenter',
      'use_japanese'
    ];

    return reinitKeys.some(key => key in newConfig);
  }

  /**
   * ディテクターを再初期化
   */
  private reinitializeDetectors(): void {
    try {
      // 既存のディテクターをクリア
      this.detectors.clear();

      // 新しい設定でディテクターを再作成
      const regexDetector = new RegexWordDetector(this.config);
      const segmenterDetector = new TinySegmenterWordDetector(this.config);
      const hybridDetector = new HybridWordDetector(this.config);

      this.registerDetector(regexDetector);
      this.registerDetector(segmenterDetector);
      this.registerDetector(hybridDetector);
    } catch (error) {
      // console.error("[WordDetectionManager] Failed to reinitialize detectors:", error);
    }
  }

  /**
   * 利用可能なディテクター一覧を取得
   * @description 登録されているすべてのディテクターの情報を返す
   * @returns Array<{{ name: string, priority: number, languages: string[] }}> ディテクター情報の配列
   * @since 1.0.0
   * @example
   * ```typescript
   * const detectors = manager.getAvailableDetectors();
   * detectors.forEach(d => console.log(`${d.name} (priority: ${d.priority}, languages: ${d.languages.join(', ')})`));
   * ```
   */
  getAvailableDetectors(): Array<{ name: string; priority: number; languages: string[] }> {
    return Array.from(this.detectors.values()).map((d) => ({
      name: d.name,
      priority: d.priority,
      languages: d.supportedLanguages,
    }));
  }

  /**
   * すべてのディテクターをテスト
   * @description 登録されているすべてのディテクターの利用可能性をテスト
   * @returns Promise<Record<string, boolean>> ディテクター名と利用可能性のマッピング
   * @since 1.0.0
   * @example
   * ```typescript
   * const testResults = await manager.testDetectors();
   * for (const [name, available] of Object.entries(testResults)) {
   *   console.log(`${name}: ${available ? 'Available' : 'Not available'}`);
   * }
   * ```
   */
  async testDetectors(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, detector] of this.detectors) {
      try {
        results[name] = await detector.isAvailable();
      } catch {
        results[name] = false;
      }
    }

    return results;
  }

  /**
   * デフォルト設定とマージ
   * @description 渡された設定とデフォルト設定をマージし、必要なすべてのフィールドを持つ設定オブジェクトを作成
   * @param config - ユーザー設定
   * @returns Required<WordDetectionManagerConfig> - デフォルト値で補完された設定
   * @since 1.0.0
   */
  private mergeWithDefaults(
    config: WordDetectionManagerConfig,
  ): Required<WordDetectionManagerConfig> {
    // デフォルト値
    const defaults = {
      // Detection settings
      strategy: "hybrid" as "regex" | "tinysegmenter" | "hybrid",
      use_japanese: false, // デフォルトはfalse、但し明示的な設定を優先
      enable_tinysegmenter: true,
      segmenter_threshold: 4,
      segmenter_cache_size: 1000,

      // Manager settings
      default_strategy: "hybrid" as "regex" | "tinysegmenter" | "hybrid",
      auto_detect_language: true,
      performance_monitoring: true,

      // Cache settings
      cache_enabled: true,
      cache_max_size: 500,
      cache_ttl_ms: 300000, // 5 minutes

      // Error handling
      enable_fallback: true,
      fallback_to_regex: true,
      max_retries: 2,
      retry_delay_ms: 100,

      // Performance settings
      timeout_ms: 5000, // 5 second timeout
      batch_processing: false,
      max_concurrent_detections: 3,

      // Filter settings
      min_word_length: 1,
      max_word_length: 50,
      exclude_numbers: false,
      exclude_single_chars: false,
      batch_size: 100,
    };

    // 渡されたconfigの値を優先（use_japaneseが明示的に設定されている場合はそれを使用）
    const merged = {
      ...defaults,
      ...config,
    };

    // use_japaneseが明示的に設定されている場合、その値を確実に適用
    if (config.use_japanese !== undefined) {
      merged.use_japanese = config.use_japanese;
    }

    // word_detection_strategyがある場合はstrategyに反映
    if ((config as any).word_detection_strategy) {
      merged.strategy = (config as any).word_detection_strategy;
    }

    return merged as Required<WordDetectionManagerConfig>;
  }
}

/**
 * グローバルマネージャーインスタンス管理
 * @description アプリケーション全体で共有するシングルトンマネージャーインスタンス
 * @since 1.0.0
 */
let globalManager: WordDetectionManager | null = null;

/**
 * 単語検出マネージャーのシングルトンインスタンスを取得
 * @description グローバルマネージャーインスタンスを取得または作成。新しい設定が渡された場合は新しいインスタンスで置き換え
 * @param config - マネージャー設定（省略時はデフォルト設定）
 * @returns WordDetectionManager - マネージャーインスタンス
 * @since 1.0.0
 * @example
 * ```typescript
 * const manager = getWordDetectionManager({ use_japanese: true });
 * await manager.initialize();
 * ```
 */
export function getWordDetectionManager(config?: WordDetectionManagerConfig): WordDetectionManager {
  if (!globalManager) {
    globalManager = new WordDetectionManager(config);
  } else if (config) {
    // 既存のマネージャーがある場合でも、新しい設定で更新
    globalManager = new WordDetectionManager(config);
  }
  return globalManager;
}

/**
 * 単語検出マネージャーをリセット
 * @description グローバルマネージャーインスタンスをクリアし、次回呼び出し時に新しいインスタンスを作成させる
 * @returns void
 * @since 1.0.0
 * @example
 * ```typescript
 * resetWordDetectionManager(); // マネージャーをリセット
 * ```
 */
export function resetWordDetectionManager(): void {
  globalManager = null;
}
