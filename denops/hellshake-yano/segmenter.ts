/**
 * TinySegmenter Integration Module for Hellshake-Yano
 *
 * This module provides Japanese text segmentation capabilities using TinySegmenter.
 * Uses the npm @birchill/tiny-segmenter package for accurate segmentation.
 */

import { TinySegmenter as NpmTinySegmenter } from "npm:@birchill/tiny-segmenter@1.0.0";

interface SegmentationResult {
  segments: string[];
  success: boolean;
  error?: string;
  source: 'tinysegmenter' | 'fallback';
}

// TinySegmenter wrapper with error handling and caching
export class TinySegmenter {
  private static instance: TinySegmenter;
  private segmenter: NpmTinySegmenter;
  private cache: Map<string, string[]>;
  private maxCacheSize: number;
  private enabled: boolean;

  constructor(maxCacheSize: number = 1000) {
    this.segmenter = new NpmTinySegmenter();
    this.cache = new Map();
    this.maxCacheSize = maxCacheSize;
    this.enabled = true;
  }

  static getInstance(): TinySegmenter {
    if (!TinySegmenter.instance) {
      TinySegmenter.instance = new TinySegmenter();
    }
    return TinySegmenter.instance;
  }

  /**
   * Post-process segments to combine consecutive numbers and units
   */
  private postProcessSegments(segments: string[]): string[] {
    const processed: string[] = [];
    let i = 0;

    while (i < segments.length) {
      const current = segments[i];

      // 連続する数字をまとめる
      if (current && /^\d+$/.test(current)) {
        let number = current;
        let j = i + 1;

        // 後続の数字を結合
        while (j < segments.length && /^\d+$/.test(segments[j])) {
          number += segments[j];
          j++;
        }

        // 単位があれば結合
        if (j < segments.length) {
          const unit = segments[j];
          if (unit === '%' || unit === '％' || /^(年|月|日|時|分|秒)$/.test(unit)) {
            number += unit;
            j++;
          }
        }

        processed.push(number);
        i = j;
        continue;
      }

      // 括弧内の内容を一つのセグメントにする
      if (current === '（' || current === '(') {
        let j = i + 1;
        let content = current;
        while (j < segments.length && segments[j] !== '）' && segments[j] !== ')') {
          content += segments[j];
          j++;
        }
        if (j < segments.length) {
          content += segments[j];
          processed.push(content);
          i = j + 1;
          continue;
        }
      }

      // 通常のセグメント
      if (current && current.trim().length > 0) {
        processed.push(current);
      }
      i++;
    }

    return processed;
  }

  /**
   * Segment Japanese text into words/tokens
   */
  async segment(text: string): Promise<SegmentationResult> {
    if (!this.enabled) {
      return {
        segments: await this.fallbackSegmentation(text),
        success: false,
        error: "TinySegmenter disabled",
        source: 'fallback'
      };
    }

    if (!text || text.trim().length === 0) {
      return {
        segments: [],
        success: true,
        source: 'tinysegmenter'
      };
    }

    // Check cache first
    if (this.cache.has(text)) {
      return {
        segments: this.cache.get(text)!,
        success: true,
        source: 'tinysegmenter'
      };
    }

    try {
      // npm版TinySegmenterを使用
      const rawSegments = this.segmenter.segment(text);

      // 後処理を適用
      const segments = this.postProcessSegments(rawSegments);

      // Cache the result (with size limit)
      if (this.cache.size >= this.maxCacheSize) {
        // Remove oldest entry
        const firstKey = this.cache.keys().next().value;
        if (firstKey !== undefined) {
          this.cache.delete(firstKey);
        }
      }
      this.cache.set(text, segments);

      return {
        segments,
        success: true,
        source: 'tinysegmenter'
      };
    } catch (error) {
      console.warn("[TinySegmenter] Segmentation failed:", error);

      return {
        segments: await this.fallbackSegmentation(text),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'fallback'
      };
    }
  }

  /**
   * Fallback segmentation using simple regex patterns
   */
  private async fallbackSegmentation(text: string): Promise<string[]> {
    const segments: string[] = [];

    // Simple character-based segmentation for Japanese
    const chars = Array.from(text);
    let currentSegment = "";
    let lastType = "";

    for (const char of chars) {
      const charType = this.getCharacterType(char);

      if (charType !== lastType && currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = char;
      } else {
        currentSegment += char;
      }

      lastType = charType;
    }

    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    return segments.filter(s => s.trim().length > 0);
  }

  private getCharacterType(char: string): string {
    if (/[\u4E00-\u9FAF]/.test(char)) return 'kanji';
    if (/[\u3040-\u309F]/.test(char)) return 'hiragana';
    if (/[\u30A0-\u30FF]/.test(char)) return 'katakana';
    if (/[a-zA-Z]/.test(char)) return 'latin';
    if (/[0-9]/.test(char)) return 'digit';
    if (/\s/.test(char)) return 'space';
    return 'other';
  }

  /**
   * Check if text contains Japanese characters
   */
  hasJapanese(text: string): boolean {
    return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
  }

  /**
   * Check if segmentation would be beneficial for the text
   */
  shouldSegment(text: string, threshold: number = 4): boolean {
    return this.hasJapanese(text) && text.length >= threshold;
  }

  /**
   * Clear the segmentation cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: 0 // Would need to track hits/misses for accurate rate
    };
  }

  /**
   * Enable or disable the segmenter
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if segmenter is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Test the segmenter with sample text
   */
  async test(): Promise<{ success: boolean; results: SegmentationResult[] }> {
    const testCases = [
      "これはテストです",
      "私の名前は田中です",
      "今日は良い天気ですね",
      "Hello World", // Mixed content
      "プログラミング言語",
      "" // Empty string
    ];

    const results: SegmentationResult[] = [];
    let successCount = 0;

    for (const testCase of testCases) {
      const result = await this.segment(testCase);
      results.push(result);
      if (result.success) successCount++;
    }

    return {
      success: successCount === testCases.length,
      results
    };
  }
}

// Export singleton instance and types
export const tinysegmenter = TinySegmenter.getInstance();
export type { SegmentationResult };

console.log("✓ TinySegmenter module loaded successfully");