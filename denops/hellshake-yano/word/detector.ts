/**
 * Word Detection Abstraction Layer for Hellshake-Yano
 *
 * This module provides a flexible word detection system that supports
 * multiple detection strategies including regex-based and TinySegmenter-based
 * Japanese word segmentation.
 */

import type { Denops } from "@denops/std";
import type { Word } from "../word.ts";
import { TinySegmenter, type SegmentationResult } from "../segmenter.ts";
import { charIndexToByteIndex } from "../utils/encoding.ts";

// Position-aware segment interface for tracking original positions
export interface PositionSegment {
  text: string;
  startIndex: number;
  endIndex: number;
  originalIndex: number; // Position in original text before merging
}

// Configuration interfaces
export interface WordDetectionConfig {
  strategy?: "regex" | "tinysegmenter" | "hybrid";
  use_japanese?: boolean;

  // TinySegmenter specific options
  enable_tinysegmenter?: boolean;
  segmenter_threshold?: number; // minimum characters for segmentation
  segmenter_cache_size?: number;

  // Fallback and error handling
  enable_fallback?: boolean;
  fallback_to_regex?: boolean;
  max_retries?: number;

  // Performance settings
  cache_enabled?: boolean;
  cache_max_size?: number;
  batch_size?: number;

  // Filtering options
  min_word_length?: number;
  max_word_length?: number;
  exclude_numbers?: boolean;
  exclude_single_chars?: boolean;

  // Japanese-specific options
  japanese_merge_particles?: boolean;
  japanese_merge_threshold?: number;
  japanese_min_word_length?: number;
}

// Base interface for all word detectors
export interface WordDetector {
  readonly name: string;
  readonly priority: number; // Higher priority = preferred detector
  readonly supportedLanguages: string[]; // e.g., ['ja', 'en', 'any']

  detectWords(text: string, startLine: number): Promise<Word[]>;
  canHandle(text: string): boolean;
  isAvailable(): Promise<boolean>;
}

// Detection result with metadata
export interface WordDetectionResult {
  words: Word[];
  detector: string;
  success: boolean;
  error?: string;
  performance: {
    duration: number;
    wordCount: number;
    linesProcessed: number;
  };
}

/**
 * Regex-based Word Detector
 * Extracts current word detection logic from word.ts
 */
export class RegexWordDetector implements WordDetector {
  readonly name = "RegexWordDetector";
  readonly priority = 1;
  readonly supportedLanguages = ["en", "ja", "any"];

  private config: WordDetectionConfig;

  /**
   * RegexWordDetectorのコンストラクタ
   * @description 正規表現ベースの単語ディテクターを初期化
   * @param config - ディテクター設定（省略時はデフォルト設定）
   * @since 1.0.0
   */
  constructor(config: WordDetectionConfig = {}) {
    this.config = this.mergeWithDefaults(config);
  }

  async detectWords(text: string, startLine: number): Promise<Word[]> {
    const words: Word[] = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const lineNumber = startLine + i;

      // 常に改善版検出を使用（統合済み）
      const lineWords = this.extractWordsImproved(lineText, lineNumber);

      words.push(...lineWords);
    }

    return this.applyFilters(words);
  }

  canHandle(text: string): boolean {
    return true; // Regex detector can handle any text
  }

  async isAvailable(): Promise<boolean> {
    return true; // Always available
  }

  /**
   * Improved word extraction (from word.ts extractWordsFromLine)
   */
  private extractWordsImproved(lineText: string, lineNumber: number): Word[] {
    const words: Word[] = [];

    if (!lineText || lineText.trim().length < 1) {
      return words;
    }

    // 1. Basic word detection
    const basicWordRegex = this.config.use_japanese
      ? /[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]+/g
      : /[a-zA-Z0-9]+/g;

    let match: RegExpExecArray | null;
    const allMatches: { text: string; index: number }[] = [];

    while ((match = basicWordRegex.exec(lineText)) !== null) {
      if (match[0].length >= (this.config.min_word_length || 1)) {
        allMatches.push({ text: match[0], index: match.index });
      }
    }

    // 2. Split compound words (kebab-case, snake_case)
    const splitMatches: { text: string; index: number }[] = [];

    for (const originalMatch of allMatches) {
      const text = originalMatch.text;
      const baseIndex = originalMatch.index;

      // kebab-case splitting
      if (text.includes('-') && /^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)+$/.test(text)) {
        const parts = text.split('-');
        let currentIndex = baseIndex;

        for (const part of parts) {
          if (part.length >= 1) {
            splitMatches.push({ text: part, index: currentIndex });
          }
          currentIndex += part.length + 1;
        }
      }
      // snake_case splitting
      else if (text.includes('_') && /^[a-zA-Z0-9]+(_[a-zA-Z0-9]+)+$/.test(text)) {
        const parts = text.split('_');
        let currentIndex = baseIndex;

        for (const part of parts) {
          if (part.length >= 1) {
            splitMatches.push({ text: part, index: currentIndex });
          }
          currentIndex += part.length + 1;
        }
      }
      // Japanese word boundary splitting (only if Japanese is enabled)
      else if (this.config.use_japanese && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text) && text.length > 4) {
        const japaneseWordRegex = /[\u4E00-\u9FAF\u3400-\u4DBF]+|[\u3040-\u309F]+|[\u30A0-\u30FF]+|[a-zA-Z0-9]+/g;
        let jpMatch;
        japaneseWordRegex.lastIndex = 0;

        while ((jpMatch = japaneseWordRegex.exec(text)) !== null) {
          if (jpMatch[0].length >= 1) {
            splitMatches.push({
              text: jpMatch[0],
              index: baseIndex + jpMatch.index
            });
          }
        }
      }
      // Regular words
      else {
        splitMatches.push(originalMatch);
      }
    }

    // 3. Additional single character detection
    if (!this.config.exclude_single_chars) {
      // Single digit detection
      const numberRegex = /\b\d\b/g;
      let numberMatch: RegExpExecArray | null;
      while ((numberMatch = numberRegex.exec(lineText)) !== null) {
        const isAlreadyMatched = splitMatches.some(existing =>
          existing.index <= numberMatch!.index &&
          existing.index + existing.text.length >= numberMatch!.index + numberMatch![0].length
        );

        if (!isAlreadyMatched) {
          splitMatches.push({ text: numberMatch[0], index: numberMatch.index });
        }
      }

      // Single character words
      const singleCharRegex = /\b[a-zA-Z]\b/g;
      let charMatch: RegExpExecArray | null;
      while ((charMatch = singleCharRegex.exec(lineText)) !== null) {
        const isAlreadyMatched = splitMatches.some(existing =>
          existing.index <= charMatch!.index &&
          existing.index + existing.text.length >= charMatch!.index + charMatch![0].length
        );

        if (!isAlreadyMatched) {
          splitMatches.push({ text: charMatch[0], index: charMatch.index });
        }
      }
    }

    // 4. Sort, deduplicate, and convert to Word objects
    const uniqueMatches = splitMatches
      .sort((a, b) => a.index - b.index)
      .filter((match, index, array) => {
        if (index === 0) return true;
        const prev = array[index - 1];
        return !(prev.index === match.index && prev.text === match.text);
      });

    // 5. Performance protection
    const finalMatches = uniqueMatches.slice(0, 200);

    for (const match of finalMatches) {
      // Calculate byte position for UTF-8 compatibility
      const byteIndex = charIndexToByteIndex(lineText, match.index);

      words.push({
        text: match.text,
        line: lineNumber,
        col: match.index + 1, // Vim column numbers start at 1
        byteCol: byteIndex + 1, // Vim byte column numbers start at 1
      });
    }

    return words;
  }

  /**
   * Standard word extraction (compatible with original)
   */
  private extractWordsStandard(lineText: string, lineNumber: number): Word[] {
    const words: Word[] = [];

    if (!lineText || lineText.trim().length < 2) {
      return words;
    }

    const wordRegex = this.config.use_japanese
      ? /[\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]+/g
      : /\b[a-zA-Z0-9]+\b/g;

    let match;
    const matches: { text: string; index: number }[] = [];

    while ((match = wordRegex.exec(lineText)) !== null) {
      if (match[0].length >= 2 && (!this.config.exclude_numbers || !/^\d+$/.test(match[0]))) {
        matches.push({ text: match[0], index: match.index });
      }

      if (matches.length >= 100) break; // Performance protection
    }

    for (const match of matches) {
      // Calculate byte position for UTF-8 compatibility
      const byteIndex = charIndexToByteIndex(lineText, match.index);

      words.push({
        text: match.text,
        line: lineNumber,
        col: match.index + 1,
        byteCol: byteIndex + 1, // Vim byte column numbers start at 1
      });
    }

    return words;
  }

  private applyFilters(words: Word[]): Word[] {
    let filtered = words;

    // Length filters
    if (this.config.min_word_length !== undefined) {
      filtered = filtered.filter(w => w.text.length >= this.config.min_word_length!);
    }
    if (this.config.max_word_length !== undefined) {
      filtered = filtered.filter(w => w.text.length <= this.config.max_word_length!);
    }

    // Japanese filter
    if (!this.config.use_japanese) {
      filtered = filtered.filter(w =>
        !/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(w.text)
      );
    }

    // Number filter
    if (this.config.exclude_numbers) {
      filtered = filtered.filter(w => !/^\d+$/.test(w.text));
    }

    return filtered;
  }

  private mergeWithDefaults(config: WordDetectionConfig): WordDetectionConfig {
    // デフォルト値（configで上書き可能）
    const defaults = {
      min_word_length: 1,
      max_word_length: 50,
      exclude_numbers: false,
      exclude_single_chars: false,
    };

    // 渡されたconfigの値を優先（use_japaneseは渡された値をそのまま使用）
    return {
      ...defaults,
      ...config
    };
  }
}

/**
 * TinySegmenter-based Word Detector for Japanese
 */
export class TinySegmenterWordDetector implements WordDetector {
  readonly name = "TinySegmenterWordDetector";
  readonly priority = 2;
  readonly supportedLanguages = ["ja"];

  private segmenter: TinySegmenter;
  private config: WordDetectionConfig;

  /**
   * TinySegmenterWordDetectorのコンストラクタ
   * @description TinySegmenterベースの日本語単語ディテクターを初期化
   * @param config - ディテクター設定（省略時はデフォルト設定）
   * @since 1.0.0
   */
  constructor(config: WordDetectionConfig = {}) {
    this.config = this.mergeWithDefaults(config);
    this.segmenter = TinySegmenter.getInstance();
  }

  async detectWords(text: string, startLine: number): Promise<Word[]> {
    const words: Word[] = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const lineNumber = startLine + i;

      if (!this.shouldSegmentLine(lineText)) {
        // Fall back to basic regex for non-Japanese content
        const fallbackWords = await this.fallbackDetection(lineText, lineNumber);
        words.push(...fallbackWords);
        continue;
      }

      try {
        const result = await this.segmenter.segment(lineText);
        if (result.success) {
          const lineWords = this.segmentsToWords(result.segments, lineText, lineNumber);
          words.push(...lineWords);
        } else {
          // Fallback on segmentation failure
          const fallbackWords = await this.fallbackDetection(lineText, lineNumber);
          words.push(...fallbackWords);
        }
      } catch (error) {
// console.warn(`TinySegmenter failed for line ${lineNumber}:`, error);
        const fallbackWords = await this.fallbackDetection(lineText, lineNumber);
        words.push(...fallbackWords);
      }
    }

    return this.applyFilters(words);
  }

  canHandle(text: string): boolean {
    return this.segmenter.hasJapanese(text);
  }

  async isAvailable(): Promise<boolean> {
    if (!this.config.enable_tinysegmenter) return false;

    try {
      const testResult = await this.segmenter.segment("テスト");
      return testResult.success;
    } catch {
      return false;
    }
  }

  private shouldSegmentLine(lineText: string): boolean {
    const threshold = this.config.segmenter_threshold || 4;
    return this.segmenter.shouldSegment(lineText, threshold);
  }

  private segmentsToWords(segments: string[], originalText: string, lineNumber: number): Word[] {
    // まず位置情報付きセグメントを作成
    const positionSegments = this.createPositionSegments(segments, originalText);

    // 日本語分割精度設定を適用（位置情報を保持）
    const mergedSegments = this.mergeShortSegmentsWithPosition(positionSegments);
    const words: Word[] = [];

    for (const segment of mergedSegments) {
      if (segment.text.trim().length > 0) {
        // 単語の長さフィルタリング
        if (segment.text.length >= (this.config.min_word_length || 1) &&
            segment.text.length <= (this.config.max_word_length || 50)) {

          // 数字除外オプション
          if (this.config.exclude_numbers && /^\d+$/.test(segment.text)) {
            continue;
          }

          // 単一文字除外オプション
          if (this.config.exclude_single_chars && segment.text.length === 1) {
            continue;
          }

          // Calculate byte position for UTF-8 compatibility
          const byteIndex = charIndexToByteIndex(originalText, segment.startIndex);

          words.push({
            text: segment.text,
            line: lineNumber,
            col: segment.startIndex + 1, // Vim column numbers start at 1
            byteCol: byteIndex + 1, // Vim byte column numbers start at 1
          });
        }
      }
    }

    return words;
  }

  private async fallbackDetection(lineText: string, lineNumber: number): Promise<Word[]> {
    // Use simplified regex detection as fallback
    const regexDetector = new RegexWordDetector(this.config);
    return regexDetector.detectWords(lineText, lineNumber);
  }

  /**
   * 位置情報付きセグメントを作成
   */
  private createPositionSegments(segments: string[], originalText: string): PositionSegment[] {
    const positionSegments: PositionSegment[] = [];
    let currentIndex = 0;

    for (const segment of segments) {
      const segmentIndex = originalText.indexOf(segment, currentIndex);

      if (segmentIndex !== -1) {
        positionSegments.push({
          text: segment,
          startIndex: segmentIndex,
          endIndex: segmentIndex + segment.length,
          originalIndex: segmentIndex
        });
        currentIndex = segmentIndex + segment.length;
      }
    }

    return positionSegments;
  }

  /**
   * 短いセグメントを結合して分割精度を調整（位置情報保持版）
   */
  private mergeShortSegmentsWithPosition(segments: PositionSegment[]): PositionSegment[] {
    const mergeParticles = this.config.japanese_merge_particles !== false;
    const mergeThreshold = this.config.japanese_merge_threshold || 2;
    const minLength = this.config.japanese_min_word_length || 2;

    if (!mergeParticles && minLength <= 1) {
      return segments; // 結合処理不要
    }

    const result: PositionSegment[] = [];
    let buffer: PositionSegment | null = null;

    // 日本語の助詞・接続詞パターン
    const particlePattern = /^[をでにへとからよりのがはもやねよなど]+$/;
    const conjunctionPattern = /^[そしてしかしだからけれどけどものでならないし]+$/;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const nextSegment = segments[i + 1];

      // 短いセグメントの処理
      if (segment.text.length <= mergeThreshold) {
        // 助詞・接続詞の場合は前の単語と結合
        if (mergeParticles && (particlePattern.test(segment.text) || conjunctionPattern.test(segment.text))) {
          if (buffer) {
            buffer = {
              text: buffer.text + segment.text,
              startIndex: buffer.startIndex,
              endIndex: segment.endIndex,
              originalIndex: buffer.originalIndex
            };
          } else if (result.length > 0) {
            // 前の結果と結合
            const lastResult = result[result.length - 1];
            result[result.length - 1] = {
              text: lastResult.text + segment.text,
              startIndex: lastResult.startIndex,
              endIndex: segment.endIndex,
              originalIndex: lastResult.originalIndex
            };
          } else {
            buffer = segment;
          }
        } else if (nextSegment && nextSegment.text.length <= mergeThreshold) {
          // 次も短い場合はバッファに追加
          if (buffer) {
            buffer = {
              text: buffer.text + segment.text,
              startIndex: buffer.startIndex,
              endIndex: segment.endIndex,
              originalIndex: buffer.originalIndex
            };
          } else {
            buffer = segment;
          }
        } else {
          // 単独で最小長を満たすか、バッファと結合
          if (buffer) {
            const merged = {
              text: buffer.text + segment.text,
              startIndex: buffer.startIndex,
              endIndex: segment.endIndex,
              originalIndex: buffer.originalIndex
            };
            if (merged.text.length >= minLength) {
              result.push(merged);
            }
            buffer = null;
          } else if (segment.text.length >= minLength) {
            result.push(segment);
          } else if (result.length > 0) {
            // 最小長に満たない場合は前の結果と結合
            const lastResult = result[result.length - 1];
            result[result.length - 1] = {
              text: lastResult.text + segment.text,
              startIndex: lastResult.startIndex,
              endIndex: segment.endIndex,
              originalIndex: lastResult.originalIndex
            };
          } else {
            buffer = segment;
          }
        }
      } else {
        // 長いセグメント
        if (buffer) {
          if (buffer.text.length >= minLength) {
            result.push(buffer);
          } else if (result.length > 0) {
            const lastResult = result[result.length - 1];
            result[result.length - 1] = {
              text: lastResult.text + buffer.text,
              startIndex: lastResult.startIndex,
              endIndex: buffer.endIndex,
              originalIndex: lastResult.originalIndex
            };
          }
          buffer = null;
        }
        result.push(segment);
      }
    }

    // 残ったバッファを処理
    if (buffer) {
      if (buffer.text.length >= minLength) {
        result.push(buffer);
      } else if (result.length > 0) {
        const lastResult = result[result.length - 1];
        result[result.length - 1] = {
          text: lastResult.text + buffer.text,
          startIndex: lastResult.startIndex,
          endIndex: buffer.endIndex,
          originalIndex: lastResult.originalIndex
        };
      }
    }

    return result;
  }

  /**
   * 短いセグメントを結合して分割精度を調整（レガシー版）
   */
  private mergeShortSegments(segments: string[]): string[] {
    const mergeParticles = this.config.japanese_merge_particles !== false;
    const mergeThreshold = this.config.japanese_merge_threshold || 2;
    const minLength = this.config.japanese_min_word_length || 2;

    if (!mergeParticles && minLength <= 1) {
      return segments; // 結合処理不要
    }

    const result: string[] = [];
    let buffer = "";

    // 日本語の助詞・接続詞パターン
    const particlePattern = /^[をでにへとからよりのがはもやねよなど]+$/;
    const conjunctionPattern = /^[そしてしかしだからけれどけどものでならないし]+$/;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const nextSegment = segments[i + 1];

      // 短いセグメントをバッファに追加
      if (segment.length <= mergeThreshold) {
        // 助詞・接続詞の場合は前の単語と結合
        if (mergeParticles && (particlePattern.test(segment) || conjunctionPattern.test(segment))) {
          if (buffer) {
            buffer += segment;
          } else if (result.length > 0) {
            // 前の結果と結合
            result[result.length - 1] += segment;
          } else {
            buffer = segment;
          }
        } else if (nextSegment && nextSegment.length <= mergeThreshold) {
          // 次も短い場合はバッファに追加
          buffer += segment;
        } else {
          // 単独で最小長を満たすか、バッファと結合
          if (buffer) {
            buffer += segment;
            if (buffer.length >= minLength) {
              result.push(buffer);
            }
            buffer = "";
          } else if (segment.length >= minLength) {
            result.push(segment);
          } else if (result.length > 0) {
            // 最小長に満たない場合は前の結果と結合
            result[result.length - 1] += segment;
          } else {
            buffer = segment;
          }
        }
      } else {
        // 長いセグメント
        if (buffer) {
          if (buffer.length >= minLength) {
            result.push(buffer);
          } else if (result.length > 0) {
            result[result.length - 1] += buffer;
          }
          buffer = "";
        }
        result.push(segment);
      }
    }

    // 残ったバッファを処理
    if (buffer) {
      if (buffer.length >= minLength) {
        result.push(buffer);
      } else if (result.length > 0) {
        result[result.length - 1] += buffer;
      }
    }

    return result;
  }

  private applyFilters(words: Word[]): Word[] {
    let filtered = words;

    // Length filters
    if (this.config.min_word_length !== undefined) {
      filtered = filtered.filter(w => w.text.length >= this.config.min_word_length!);
    }
    if (this.config.max_word_length !== undefined) {
      filtered = filtered.filter(w => w.text.length <= this.config.max_word_length!);
    }

    return filtered;
  }

  private mergeWithDefaults(config: WordDetectionConfig): WordDetectionConfig {
    return {
      enable_tinysegmenter: true,
      segmenter_threshold: 4,
      segmenter_cache_size: 1000,
      enable_fallback: true,
      fallback_to_regex: true,
      min_word_length: 1,
      max_word_length: 50,
      ...config
    };
  }
}

/**
 * Hybrid Word Detector that combines multiple strategies
 */
export class HybridWordDetector implements WordDetector {
  readonly name = "HybridWordDetector";
  readonly priority = 3;
  readonly supportedLanguages = ["ja", "en", "any"];

  private regexDetector: RegexWordDetector;
  private segmenterDetector: TinySegmenterWordDetector;
  private config: WordDetectionConfig;

  constructor(config: WordDetectionConfig = {}) {
    this.config = this.mergeWithDefaults(config);
    // 子Detectorにも同じマージされた設定を渡す
    this.regexDetector = new RegexWordDetector(this.config);
    this.segmenterDetector = new TinySegmenterWordDetector(this.config);
  }

  async detectWords(text: string, startLine: number): Promise<Word[]> {
    const lines = text.split('\n');
    const allWords: Word[] = [];

    // デバッグログ：設定の確認

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const lineNumber = startLine + i;

      if (!lineText || lineText.trim().length === 0) {
        continue;
      }

      // use_japanese 設定に基づいて処理を決定
      if (this.config.use_japanese === true) {

        // 日本語モード：TinySegmenterが利用可能で日本語を含む場合は使用
        const isSegmenterAvailable = await this.segmenterDetector.isAvailable();
        const hasJapanese = this.segmenterDetector.canHandle(lineText);


        if (this.config.enable_tinysegmenter && isSegmenterAvailable && hasJapanese) {
          const segmenterWords = await this.segmenterDetector.detectWords(lineText, lineNumber);
          // 英数字も検出するためRegexDetectorも併用
          const regexWords = await this.regexDetector.detectWords(lineText, lineNumber);
          const mergedWords = this.mergeWordResults(segmenterWords, regexWords);
          allWords.push(...mergedWords);
        } else {
          // TinySegmenter無効または日本語なし：extractWordsFromLineWithConfigを使用
          const { extractWordsFromLineWithConfig } = await import("../word.ts");
          const words = extractWordsFromLineWithConfig(lineText, lineNumber, this.config);
          allWords.push(...words);
        }
      } else {
        // 日本語除外モード：RegexDetectorを使用（日本語は除外される）
        const regexWords = await this.regexDetector.detectWords(lineText, lineNumber);
        allWords.push(...regexWords);
      }
    }

    const finalWords = this.deduplicateWords(allWords);
    return finalWords;
  }

  canHandle(text: string): boolean {
    return true; // Hybrid can handle any text
  }

  async isAvailable(): Promise<boolean> {
    const regexAvailable = await this.regexDetector.isAvailable();
    const segmenterAvailable = await this.segmenterDetector.isAvailable();
    return regexAvailable; // At minimum, regex should be available
  }

  private mergeWordResults(segmenterWords: Word[], regexWords: Word[]): Word[] {
    const merged = [...segmenterWords];
    const segmenterPositions = new Set(
      segmenterWords.map(w => `${w.line}:${w.col}:${w.text}`)
    );

    // Add regex words that don't overlap with segmenter results
    for (const regexWord of regexWords) {
      const position = `${regexWord.line}:${regexWord.col}:${regexWord.text}`;
      if (!segmenterPositions.has(position)) {
        // Check for overlap by position range
        const overlaps = segmenterWords.some(sw =>
          sw.line === regexWord.line &&
          sw.col <= regexWord.col &&
          sw.col + sw.text.length >= regexWord.col + regexWord.text.length
        );

        if (!overlaps) {
          merged.push(regexWord);
        }
      }
    }

    return merged;
  }

  private deduplicateWords(words: Word[]): Word[] {
    const seen = new Set<string>();
    return words.filter(word => {
      const key = `${word.text}:${word.line}:${word.col}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private mergeWithDefaults(config: WordDetectionConfig): WordDetectionConfig {
    // デフォルト値を設定し、渡されたconfigで上書きする
    const defaults = {
      enable_tinysegmenter: true,
      enable_fallback: true,
      fallback_to_regex: true,
      min_word_length: 1,
      max_word_length: 50,
      exclude_numbers: false,
      exclude_single_chars: false,
    };

    // 渡されたconfigの値を優先（特にuse_japaneseは重要）
    return {
      ...defaults,
      ...config
    };
  }
}

