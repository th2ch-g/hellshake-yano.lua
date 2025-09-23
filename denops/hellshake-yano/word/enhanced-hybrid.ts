import { Word, DetectionContext } from "../types.ts";
import { HybridWordDetector, WordDetector, RegexWordDetector, TinySegmenterWordDetector } from "./detector.ts";
import { Denops } from "https://deno.land/x/denops_std@v6.0.1/mod.ts";

/**
 * テキストセグメントの型定義
 */
export interface TextSegment {
  text: string;
  type: "japanese" | "english" | "mixed" | "code" | "symbol";
  confidence: number;
  startIndex: number;
  endIndex: number;
}

/**
 * 処理済みテキストの型定義
 */
export interface ProcessedText {
  original: string;
  normalized: string;
  segments?: TextSegment[];
}

/**
 * セグメント分析器
 * テキストを解析して、言語タイプごとのセグメントに分割
 */
export class SegmentAnalyzer {
  private readonly japanesePattern = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\u3400-\u4dbf]/;
  private readonly englishPattern = /[a-zA-Z]/;
  private readonly codePattern = /\b(function|class|const|let|var|if|for|while|return|import|export|def|elif)\b/;
  private readonly symbolPattern = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/;
  private readonly numericPattern = /\d/;

  /**
   * テキストを分析してセグメントに分割
   */
  analyze(text: string): TextSegment[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const segments: TextSegment[] = [];
    let currentSegment = "";
    let currentType: TextSegment["type"] | null = null;
    let startIndex = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charType = this.getCharType(char, text, i);

      // 空白文字はスキップ
      if (/\s/.test(char) && currentSegment.trim().length === 0) {
        startIndex = i + 1;
        continue;
      }

      if (currentType === null) {
        currentType = charType;
        currentSegment = char;
        startIndex = i;
      } else if (currentType === charType || /\s/.test(char)) {
        currentSegment += char;
      } else {
        // タイプが変わったら、現在のセグメントを保存
        if (currentSegment.trim().length > 0) {
          segments.push({
            text: currentSegment.trim(),
            type: this.determineSegmentType(currentSegment, currentType),
            confidence: this.calculateConfidence(currentSegment, currentType),
            startIndex,
            endIndex: i
          });
        }
        currentType = charType;
        currentSegment = char;
        startIndex = i;
      }
    }

    // 最後のセグメントを追加
    if (currentSegment.trim().length > 0 && currentType) {
      segments.push({
        text: currentSegment.trim(),
        type: this.determineSegmentType(currentSegment, currentType),
        confidence: this.calculateConfidence(currentSegment, currentType),
        startIndex,
        endIndex: text.length
      });
    }

    return this.mergeAndRefineSegments(segments);
  }

  /**
   * 文字のタイプを判定
   */
  private getCharType(char: string, fullText: string, index: number): TextSegment["type"] {
    // コードパターンをチェック（前後の文脈を含めて）
    const contextStart = Math.max(0, index - 10);
    const contextEnd = Math.min(fullText.length, index + 10);
    const context = fullText.slice(contextStart, contextEnd);

    if (this.codePattern.test(context)) {
      return "code";
    }

    if (this.japanesePattern.test(char)) {
      return "japanese";
    }
    if (this.englishPattern.test(char)) {
      return "english";
    }
    if (this.numericPattern.test(char)) {
      return "english"; // 数字は英語として扱う
    }

    // ピリオドとカンマは前後の文脈で判定
    if (char === '.' || char === ',') {
      // 前の文字が英数字なら英語の一部として扱う
      if (index > 0) {
        const prevChar = fullText[index - 1];
        if (/[a-zA-Z0-9]/.test(prevChar)) {
          return "english";
        }
      }
    }

    if (this.symbolPattern.test(char)) {
      return "symbol";
    }

    return "symbol"; // デフォルト
  }

  /**
   * セグメント全体のタイプを決定
   */
  private determineSegmentType(text: string, baseType: TextSegment["type"]): TextSegment["type"] {
    const japaneseMatches = text.match(new RegExp(this.japanesePattern, 'g')) || [];
    const englishMatches = text.match(new RegExp(this.englishPattern, 'g')) || [];
    const symbolMatches = text.match(new RegExp(this.symbolPattern, 'g')) || [];

    const japaneseCount = japaneseMatches.length;
    const englishCount = englishMatches.length;
    const symbolCount = symbolMatches.length;

    const totalChars = text.replace(/\s/g, "").length;

    if (this.codePattern.test(text)) {
      return "code";
    }

    if (symbolCount / totalChars > 0.7) {
      return "symbol";
    }

    if (japaneseCount > 0 && englishCount > 0) {
      return "mixed";
    }

    if (japaneseCount / totalChars > 0.5) {
      return "japanese";
    }

    if (englishCount / totalChars > 0.5) {
      return "english";
    }

    return baseType;
  }

  /**
   * 信頼度を計算
   */
  private calculateConfidence(text: string, type: TextSegment["type"]): number {
    const totalChars = text.replace(/\s/g, "").length;
    if (totalChars === 0) return 0;

    switch (type) {
      case "japanese": {
        const japaneseMatches = text.match(new RegExp(this.japanesePattern, 'g')) || [];
        const japaneseCount = japaneseMatches.length;
        return Math.min(japaneseCount / totalChars, 1.0);
      }
      case "english": {
        const englishMatches = text.match(new RegExp(this.englishPattern, 'g')) || [];
        const englishCount = englishMatches.length;
        return Math.min(englishCount / totalChars, 1.0);
      }
      case "code": {
        return this.codePattern.test(text) ? 0.9 : 0.3;
      }
      case "symbol": {
        const symbolMatches = text.match(new RegExp(this.symbolPattern, 'g')) || [];
        const symbolCount = symbolMatches.length;
        return Math.min(symbolCount / totalChars, 1.0);
      }
      case "mixed": {
        return 0.7; // 混在テキストは中程度の信頼度
      }
      default:
        return 0.5;
    }
  }

  /**
   * セグメントをマージして精製
   */
  private mergeAndRefineSegments(segments: TextSegment[]): TextSegment[] {
    if (segments.length <= 1) return segments;

    const refined: TextSegment[] = [];
    let current = segments[0];

    for (let i = 1; i < segments.length; i++) {
      const next = segments[i];

      // 同じタイプの隣接セグメントはマージ
      if (current.type === next.type && current.endIndex === next.startIndex) {
        current = {
          text: current.text + " " + next.text,
          type: current.type,
          confidence: (current.confidence + next.confidence) / 2,
          startIndex: current.startIndex,
          endIndex: next.endIndex
        };
      } else {
        refined.push(current);
        current = next;
      }
    }

    refined.push(current);
    return refined;
  }
}

/**
 * テキスト前処理器
 */
export class TextPreProcessor {
  /**
   * テキストを前処理
   */
  process(text: string): ProcessedText {
    // 全角スペースを半角に正規化
    const normalized = text
      .replace(/　/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      original: text,
      normalized: normalized
    };
  }

  /**
   * 特殊文字のエスケープ
   */
  escapeSpecialChars(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

/**
 * テキスト後処理器
 */
export class TextPostProcessor {
  /**
   * 検出された単語を後処理
   */
  process(words: Word[]): Word[] {
    // 重複を除去
    const uniqueWords = this.removeDuplicates(words);

    // ソート
    return this.sortWords(uniqueWords);
  }

  /**
   * 重複単語を除去
   */
  private removeDuplicates(words: Word[]): Word[] {
    const seen = new Set<string>();
    const unique: Word[] = [];

    for (const word of words) {
      const key = `${word.line}:${word.col}:${word.text}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(word);
      }
    }

    return unique;
  }

  /**
   * 単語をソート（行、列順）
   */
  private sortWords(words: Word[]): Word[] {
    return words.sort((a, b) => {
      if (a.line !== b.line) {
        return a.line - b.line;
      }
      return a.col - b.col;
    });
  }
}

/**
 * 拡張ハイブリッド単語検出器
 */
export class EnhancedHybridWordDetector extends HybridWordDetector {
  private segmentAnalyzer: SegmentAnalyzer;
  private preProcessor: TextPreProcessor;
  private postProcessor: TextPostProcessor;
  private detectorCache: Map<string, WordDetector>;

  constructor() {
    super({ use_japanese: true });  // HybridWordDetectorはconfigを受け取る
    this.segmentAnalyzer = new SegmentAnalyzer();
    this.preProcessor = new TextPreProcessor();
    this.postProcessor = new TextPostProcessor();
    this.detectorCache = new Map();
  }

  /**
   * 単語を検出（オーバーライド）
   */
  override async detectWords(
    text: string,
    startLine: number,
    context?: DetectionContext,
    denops?: Denops
  ): Promise<Word[]> {
    try {
      // 前処理
      const processed = this.preProcessor.process(text);

      // セグメント分析
      const segments = this.segmentAnalyzer.analyze(processed.normalized);

      // 適切な検出器を選択
      const detector = this.selectDetector(segments);

      // 単語検出
      const words = await detector.detectWords(
        processed.normalized,
        startLine,
        context,
        denops
      );

      // 後処理
      return this.postProcessor.process(words);
    } catch (error) {
      console.error("[EnhancedHybridWordDetector] Error:", error);
      // エラー時は空の配列を返す
      return [];
    }
  }

  /**
   * セグメント情報に基づいて適切な検出器を選択
   */
  selectDetector(segments: TextSegment[]): WordDetector {
    if (segments.length === 0) {
      return this.getOrCreateDetector("regexp");
    }

    // セグメントタイプの統計を計算
    const typeStats = this.calculateTypeStatistics(segments);

    // 日本語と英語の両方が存在する場合は混在として扱う
    const hasJapanese = typeStats.has("japanese") && (typeStats.get("japanese") || 0) > 0;
    const hasEnglish = typeStats.has("english") && (typeStats.get("english") || 0) > 0;

    if (hasJapanese && hasEnglish) {
      // 混在テキストの場合はHybridを使用
      return this.getOrCreateDetector("hybrid");
    }

    // 最も多いタイプに基づいて検出器を選択
    const dominantType = this.getDominantType(typeStats);

    switch (dominantType) {
      case "japanese":
        return this.getOrCreateDetector("tinysegmenter");
      case "english":
      case "symbol":
        return this.getOrCreateDetector("regexp");
      case "code":
        return this.getOrCreateDetector("regexp"); // コードはRegExpで処理
      case "mixed":
      default:
        return this.getOrCreateDetector("hybrid");
    }
  }

  /**
   * 検出器を取得または作成
   */
  private getOrCreateDetector(type: string): WordDetector {
    if (!this.detectorCache.has(type)) {
      let detector: WordDetector;

      switch (type) {
        case "tinysegmenter":
          detector = new TinySegmenterWordDetector({ enable_tinysegmenter: true });
          break;
        case "regexp":
          detector = new RegexWordDetector({ use_japanese: false });
          break;
        case "hybrid":
        default:
          detector = new HybridWordDetector({ use_japanese: true })
          break;
      }

      this.detectorCache.set(type, detector);
    }

    return this.detectorCache.get(type)!;
  }

  /**
   * セグメントタイプの統計を計算
   */
  private calculateTypeStatistics(segments: TextSegment[]): Map<string, number> {
    const stats = new Map<string, number>();

    for (const segment of segments) {
      const current = stats.get(segment.type) || 0;
      const weight = segment.text.length * segment.confidence;
      stats.set(segment.type, current + weight);
    }

    return stats;
  }

  /**
   * 最も優勢なタイプを取得
   */
  private getDominantType(stats: Map<string, number>): TextSegment["type"] {
    let maxWeight = 0;
    let dominantType: TextSegment["type"] = "mixed";

    for (const [type, weight] of stats) {
      if (weight > maxWeight) {
        maxWeight = weight;
        dominantType = type as TextSegment["type"];
      }
    }

    return dominantType;
  }
}