/**
 * Word Detection Abstraction Layer for Hellshake-Yano
 *
 * @deprecated This module is being migrated to ../word.ts
 * Import from ../word.ts for new code.
 *
 * This module provides backward compatibility by re-exporting
 * detector functionality from word.ts
 */

// Re-export from word.ts for backward compatibility
export type {
  WordDetector,
  WordDetectionConfig,
  KeyBasedWordCacheStats
} from "../word.ts";

export {
  RegexWordDetector,
  KeyBasedWordCache,
  globalWordCache
} from "../word.ts";

// Re-export types from types.ts for backward compatibility
export type { DetectionContext, WordDetectionResult } from "../types.ts";

// Legacy TinySegmenter and Hybrid detectors remain here temporarily
// These will be migrated in the next phase

import type { Denops } from "@denops/std";
import type { Word, DetectionContext, WordDetectionResult } from "../types.ts";
import { type SegmentationResult, TinySegmenter } from "../segmenter.ts";
import { ContextDetector, type SplittingRules } from "./context.ts";
import type { UnifiedConfig } from "../config.ts";
import { type Config, getMinLengthForKey } from "../main.ts";
import { charIndexToByteIndex } from "../utils/encoding.ts";
import { convertToDisplayColumn } from "../hint-utils.ts";
import { WordDictionaryImpl, createBuiltinDictionary, applyDictionaryCorrection } from "./dictionary.ts";
import { DictionaryLoader, DictionaryMerger, VimConfigBridge, type UserDictionary } from "./dictionary-loader.ts";
import { RegexWordDetector, type WordDetectionConfig, type WordDetector } from "../word.ts";

/**
 * UnifiedConfigかConfigかを判定するヘルパー関数
 * @param config - 判定対象の設定
 * @returns [unifiedConfig, legacyConfig] のタプル
 */
function resolveConfigType(config?: Config | UnifiedConfig): [UnifiedConfig | undefined, Config | undefined] {
  if (config && 'useJapanese' in config) {
    return [config as UnifiedConfig, undefined];
  }
  return [undefined, config as Config];
}

/**
 * Position-aware segment interface for tracking original positions
 */
export interface PositionSegment {
  text: string;
  startIndex: number;
  endIndex: number;
  originalIndex: number; // Position in original text before merging
}

// Temporary stub implementations for backward compatibility
// These will be fully migrated in the next phase

/**
 * TinySegmenter-based Word Detector stub
 * @deprecated Being migrated to ../word.ts
 */
export class TinySegmenterWordDetector implements WordDetector {
  readonly name = "TinySegmenterWordDetector";
  readonly priority = 2;
  readonly supportedLanguages = ["ja"];
  private config: WordDetectionConfig;

  constructor(config: WordDetectionConfig = {}, globalConfig?: Config | UnifiedConfig) {
    // Store config for test compatibility
    this.config = { ...config };
  }

  async detectWords(text: string, startLine: number, context?: DetectionContext, denops?: Denops): Promise<Word[]> {
    // Fallback to RegexWordDetector for now
    const regexDetector = new RegexWordDetector(this.config);
    return regexDetector.detectWords(text, startLine, context, denops);
  }

  canHandle(text: string): boolean {
    return text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) !== null;
  }

  async isAvailable(): Promise<boolean> {
    return true; // Enabled for tests
  }
}

/**
 * Hybrid Word Detector stub
 * @deprecated Being migrated to ../word.ts
 */
export class HybridWordDetector implements WordDetector {
  readonly name = "HybridWordDetector";
  readonly priority = 3;
  readonly supportedLanguages = ["ja", "en", "any"];
  private config: WordDetectionConfig;

  constructor(config: WordDetectionConfig = {}, globalConfig?: Config | UnifiedConfig) {
    // Store config for test compatibility
    this.config = { ...config };
  }

  async detectWords(text: string, startLine: number, context?: DetectionContext, denops?: Denops): Promise<Word[]> {
    // Fallback to RegexWordDetector for now, respecting use_japanese setting
    const regexDetector = new RegexWordDetector(this.config);
    return regexDetector.detectWords(text, startLine, context, denops);
  }

  canHandle(text: string): boolean {
    return true;
  }

  async isAvailable(): Promise<boolean> {
    return true; // Always available as fallback
  }
}