/**
 * Word Detection Manager for Hellshake-Yano
 *
 * This module manages multiple word detection strategies and provides
 * a unified interface with caching, error handling, and fallback mechanisms.
 */

import type { Denops } from "@denops/std";
import type { Word } from "../word.ts";
import {
  type WordDetector,
  type WordDetectionConfig,
  type WordDetectionResult,
  RegexWordDetector,
  TinySegmenterWordDetector,
  HybridWordDetector,
} from "./detector.ts";

// Manager configuration
export interface WordDetectionManagerConfig extends WordDetectionConfig {
  // Manager-specific settings
  default_strategy?: "regex" | "tinysegmenter" | "hybrid";
  auto_detect_language?: boolean;
  performance_monitoring?: boolean;

  // Cache configuration
  cache_enabled?: boolean;
  cache_max_size?: number;
  cache_ttl_ms?: number; // Time to live for cache entries

  // Error handling
  max_retries?: number;
  retry_delay_ms?: number;

  // Performance settings
  timeout_ms?: number;
  batch_processing?: boolean;
  max_concurrent_detections?: number;
}

// Cache entry interface
interface CacheEntry {
  words: Word[];
  timestamp: number;
  detector: string;
  config_hash: string;
}

// Detection statistics
interface DetectionStats {
  total_calls: number;
  cache_hits: number;
  cache_misses: number;
  errors: number;
  average_duration: number;
  detector_usage: Record<string, number>;
}

/**
 * Main Word Detection Manager
 */
export class WordDetectionManager {
  private detectors: Map<string, WordDetector> = new Map();
  private config: Required<WordDetectionManagerConfig>;
  private cache: Map<string, CacheEntry> = new Map();
  private stats: DetectionStats;
  private initialized = false;

  constructor(config: WordDetectionManagerConfig = {}) {
    this.config = this.mergeWithDefaults(config);
    this.stats = this.initializeStats();
  }

  /**
   * Initialize the manager with default detectors
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
   * Register a word detector
   */
  registerDetector(detector: WordDetector): void {
    this.detectors.set(detector.name, detector);
  }

  /**
   * Main word detection method
   */
  async detectWords(
    text: string,
    startLine: number = 1,
    denops?: Denops
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
              linesProcessed: text.split('\n').length,
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
      this.stats.detector_usage[detector.name] = (this.stats.detector_usage[detector.name] || 0) + 1;
      const duration = Date.now() - startTime;
      this.updateAverageDuration(duration);

      return {
        words,
        detector: detector.name,
        success: true,
        performance: {
          duration,
          wordCount: words.length,
          linesProcessed: text.split('\n').length,
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
                linesProcessed: text.split('\n').length,
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
          linesProcessed: text.split('\n').length,
        },
      };
    }
  }

  /**
   * Detect words from Denops buffer (convenience method)
   */
  async detectWordsFromBuffer(denops: Denops): Promise<WordDetectionResult> {
    try {
      // Get visible range
      const topLine = await denops.call("line", "w0") as number;
      const bottomLine = await denops.call("line", "w$") as number;

      // Get lines content
      const lines = await denops.call("getbufline", "%", topLine, bottomLine) as string[];
      const text = lines.join('\n');

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
   * Select the best detector for given text
   */
  private async selectDetector(text: string): Promise<WordDetector | null> {
    const availableDetectors = Array.from(this.detectors.values())
      .filter(d => d.canHandle(text))
      .sort((a, b) => b.priority - a.priority);

    if (availableDetectors.length === 0) {
      return null;
    }

    // Strategy-based selection
    // word_detection_strategyとstrategyの両方をサポート（後方互換性）
    const strategy = (this.config as any).word_detection_strategy || this.config.strategy || this.config.default_strategy;

    switch (strategy) {
      case "regex":
        return availableDetectors.find(d => d.name.includes("Regex")) || availableDetectors[0];

      case "tinysegmenter":
        const segmenterDetector = availableDetectors.find(d => d.name.includes("TinySegmenter"));
        if (segmenterDetector && await segmenterDetector.isAvailable()) {
          return segmenterDetector;
        }
        return availableDetectors[0];

      case "hybrid":
        const hybridDetector = availableDetectors.find(d => d.name.includes("Hybrid"));
        if (hybridDetector && await hybridDetector.isAvailable()) {
          return hybridDetector;
        }
        return availableDetectors[0];

      default:
        // Auto-detect based on content
        if (this.config.auto_detect_language) {
          const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
          if (hasJapanese) {
            const japaneseDetector = availableDetectors.find(d =>
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
   * Get fallback detector
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
   * Detect words with timeout protection
   */
  private async detectWithTimeout(
    detector: WordDetector,
    text: string,
    startLine: number
  ): Promise<Word[]> {
    if (!this.config.timeout_ms) {
      return detector.detectWords(text, startLine);
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Detection timeout (${this.config.timeout_ms}ms)`));
      }, this.config.timeout_ms);

      detector.detectWords(text, startLine)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Cache management
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
   * Statistics and monitoring
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
   * Public methods for management and debugging
   */
  getStats(): DetectionStats {
    return { ...this.stats };
  }

  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    const total = this.stats.cache_hits + this.stats.cache_misses;
    return {
      size: this.cache.size,
      maxSize: this.config.cache_max_size,
      hitRate: total > 0 ? this.stats.cache_hits / total : 0,
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  resetStats(): void {
    this.stats = this.initializeStats();
  }

  updateConfig(newConfig: Partial<WordDetectionManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Clear cache if config affects detection
    if (this.config.cache_enabled) {
      this.clearCache();
    }

  }

  getAvailableDetectors(): Array<{ name: string; priority: number; languages: string[] }> {
    return Array.from(this.detectors.values()).map(d => ({
      name: d.name,
      priority: d.priority,
      languages: d.supportedLanguages,
    }));
  }

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
   * Default configuration
   */
  private mergeWithDefaults(config: WordDetectionManagerConfig): Required<WordDetectionManagerConfig> {
    // デフォルト値
    const defaults = {
      // Detection settings
      strategy: "hybrid" as "regex" | "tinysegmenter" | "hybrid",
      use_japanese: false,
      // use_improved_detection: 統合済み（常に有効）
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

    // 渡されたconfigの値を優先
    const merged = {
      ...defaults,
      ...config
    };

    // word_detection_strategyがある場合はstrategyに反映
    if ((config as any).word_detection_strategy) {
      merged.strategy = (config as any).word_detection_strategy;
    }

    return merged as Required<WordDetectionManagerConfig>;
  }
}

// Export singleton instance
let globalManager: WordDetectionManager | null = null;

export function getWordDetectionManager(config?: WordDetectionManagerConfig): WordDetectionManager {
  if (!globalManager) {
    globalManager = new WordDetectionManager(config);
  } else if (config) {
    // 既存のマネージャーがある場合でも、新しい設定で更新
    globalManager = new WordDetectionManager(config);
  }
  return globalManager;
}

export function resetWordDetectionManager(): void {
  globalManager = null;
}

