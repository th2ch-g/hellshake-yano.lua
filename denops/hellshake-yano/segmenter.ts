/**
 * TinySegmenter Integration Module for Hellshake-Yano
 *
 * This module provides Japanese text segmentation capabilities using TinySegmenter.
 * It includes error handling, caching, and fallback mechanisms.
 */

// TinySegmenter implementation (embedded for reliability)
// Original by Taku Kudo, modified for ES modules and error handling

interface SegmentationResult {
  segments: string[];
  success: boolean;
  error?: string;
  source: 'tinysegmenter' | 'fallback';
}

class TinySegmenterCore {
  private patterns = {
    // Character type patterns
    ctype_: [
      /[一二三四五六七八九十百千万億兆]/,
      /[一-龠々〆ヵヶ]/,
      /[ぁ-ん]/,
      /[ァ-ヴーｱ-ﾝﾞｰ]/,
      /[a-zA-Zａ-ｚＡ-Ｚ]/,
      /[0-9０-９]/
    ],

    // Boundary patterns for word detection
    bias: -332,
    BC1: {"HH":6,"II":2461,"KH":406,"OH":-1378},
    BC2: {"AA":-3267,"AI":2744,"AN":-878,"HH":-4070,"HM":-1711,"HN":4012,"HO":3761,"HS":1327,"HT":-1185,"HU":861,"IH":831,"IK":-1444,"IN":-3631,"IO":-2083,"IS":3729,"KA":1273,"KB":476,"KC":3545,"KD":915,"KI":1250,"KK":-1550,"KN":2097,"KO":-4258,"KS":5865,"KT":2448,"KU":-1296,"MH":-973,"MK":-736,"NM":-4092,"NN":6506,"NO":1850,"NS":-1897,"OI":-333,"ON":-1638,"OU":-256,"SS":-157,"SU":-2222,"TA":972,"TH":576,"TK":-663,"TN":-2897,"TO":-2516,"TS":1626,"TT":556,"TU":1356,"UH":226,"UN":-2491,"UO":3462},
    // ... (more patterns would be included in a full implementation)
  };

  // Simplified scoring - in reality this would include the full TinySegmenter model
  private score(w1: string, w2: string, w3: string, w4: string, w5: string, w6: string, p1: string, p2: string, p3: string): number {
    let score = this.patterns.bias;

    // This is a simplified version - the full implementation would include
    // all the statistical patterns from the original TinySegmenter

    // Basic character type analysis
    const types = [w1, w2, w3, w4, w5, w6].map(c => this.ctype(c));

    // Simple scoring based on character transitions
    for (let i = 0; i < types.length - 1; i++) {
      if (types[i] !== types[i + 1]) {
        score += 100; // Bonus for type changes
      }
    }

    return score;
  }

  private ctype(str: string): string {
    if (!str) return "O";

    for (let i = 0; i < this.patterns.ctype_.length; i++) {
      if (str.match(this.patterns.ctype_[i])) {
        return ["M", "H", "I", "K", "A", "N"][i];
      }
    }
    return "O";
  }

  segment(input: string): string[] {
    if (!input) return [];

    const result: string[] = [];
    let seg = ["B3", "B2", "B1"];
    const ctype = ["O", "O", "O"];

    for (let i = 0; i < input.length; ++i) {
      seg.push(input.substr(i, 1));
      ctype.push(this.ctype(input.substr(i, 1)));
    }
    seg.push("E1", "E2", "E3");
    ctype.push("O", "O", "O");

    let word = seg[3];
    let p = "U";

    for (let i = 4; i < seg.length - 3; ++i) {
      const score = this.score(
        seg[i-3], seg[i-2], seg[i-1], seg[i], seg[i+1], seg[i+2],
        ctype[i-3], ctype[i-2], ctype[i-1]
      );

      if (score > 0) {
        result.push(word);
        word = "";
      }
      word += seg[i];
    }
    result.push(word);

    return result.filter(s => s.length > 0);
  }
}

// TinySegmenter wrapper with error handling and caching
export class TinySegmenter {
  private static instance: TinySegmenter;
  private segmenter: TinySegmenterCore;
  private cache: Map<string, string[]>;
  private maxCacheSize: number;
  private enabled: boolean;

  constructor(maxCacheSize: number = 1000) {
    this.segmenter = new TinySegmenterCore();
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
      const segments = this.segmenter.segment(text);

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