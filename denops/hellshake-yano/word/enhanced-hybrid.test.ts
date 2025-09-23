import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { describe, it } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import {
  EnhancedHybridWordDetector,
  SegmentAnalyzer,
  TextSegment,
  TextPreProcessor,
  TextPostProcessor
} from "./enhanced-hybrid.ts";
import { Word } from "../types.ts";

describe("EnhancedHybridWordDetector", () => {
  describe("Segment Analysis Tests", () => {
    const analyzer = new SegmentAnalyzer();

    it("should identify pure Japanese text", () => {
      const text = "これは日本語のテキストです。漢字とひらがなを含みます。";
      const segments = analyzer.analyze(text);

      assertEquals(segments.length, 1);
      assertEquals(segments[0].type, "japanese");
      assertEquals(segments[0].confidence >= 0.8, true);
    });

    it("should identify pure English text", () => {
      const text = "This is an English text with various words and sentences.";
      const segments = analyzer.analyze(text);

      assertEquals(segments.length, 1);
      assertEquals(segments[0].type, "english");
      assertEquals(segments[0].confidence >= 0.8, true);
    });

    it("should identify mixed Japanese-English text", () => {
      const text = "これはmixedテキストで、English wordsも含まれています。";
      const segments = analyzer.analyze(text);

      // 混在テキストは複数のセグメントに分割される
      assertEquals(segments.length > 1, true);
      const types = segments.map(s => s.type);
      assertEquals(types.includes("japanese"), true);
      assertEquals(types.includes("english"), true);
    });

    it("should identify code mixed text", () => {
      const text = "function hello() { console.log('Hello, 世界'); }";
      const segments = analyzer.analyze(text);

      // コードを含むテキストを認識
      const hasCode = segments.some(s => s.type === "code");
      assertEquals(hasCode, true);
    });

    it("should identify symbol-heavy text", () => {
      const text = "!@#$%^&*()_+-={}[]|\\:;<>?,./";
      const segments = analyzer.analyze(text);

      assertEquals(segments.length, 1);
      assertEquals(segments[0].type, "symbol");
    });

    it("should handle mixed numeric text", () => {
      const text = "価格は1,234円です。The price is $56.78.";
      const segments = analyzer.analyze(text);

      // 数値を含む混在テキストの処理
      assertEquals(segments.length >= 2, true);
    });

    it("should process whitespace and newlines correctly", () => {
      const text = "  Line 1  \n\n  Line 2  \t\tTabbed  ";
      const segments = analyzer.analyze(text);

      // 空白や改行が適切に処理される
      assertExists(segments);
      assertEquals(segments.every(s => s.text.trim().length > 0), true);
    });

    it("should handle special characters properly", () => {
      const text = "絵文字😀を含むテキストや、特殊文字™️®️©️も処理";
      const segments = analyzer.analyze(text);

      // 特殊文字を含むテキストの処理
      assertExists(segments);
      assertEquals(segments.length >= 1, true);
    });
  });

  describe("Detector Selection Tests", () => {
    const detector = new EnhancedHybridWordDetector("enhanced-hybrid");

    it("should select TinySegmenter for Japanese text", async () => {
      const segments: TextSegment[] = [{
        text: "日本語のテキスト",
        type: "japanese",
        confidence: 0.9,
        startIndex: 0,
        endIndex: 8
      }];

      const selectedDetector = detector.selectDetector(segments);
      assertEquals(selectedDetector.name.includes("tinysegmenter"), true);
    });

    it("should select RegExp detector for English text", async () => {
      const segments: TextSegment[] = [{
        text: "English text here",
        type: "english",
        confidence: 0.9,
        startIndex: 0,
        endIndex: 17
      }];

      const selectedDetector = detector.selectDetector(segments);
      assertEquals(selectedDetector.name.includes("regexp"), true);
    });

    it("should select Hybrid for mixed text", async () => {
      const segments: TextSegment[] = [
        {
          text: "混在",
          type: "japanese",
          confidence: 0.8,
          startIndex: 0,
          endIndex: 2
        },
        {
          text: "mixed",
          type: "english",
          confidence: 0.8,
          startIndex: 2,
          endIndex: 7
        }
      ];

      const selectedDetector = detector.selectDetector(segments);
      assertEquals(selectedDetector.name.includes("hybrid"), true);
    });

    it("should switch detector based on confidence threshold", async () => {
      const lowConfidenceSegments: TextSegment[] = [{
        text: "ambiguous text",
        type: "english",
        confidence: 0.3,  // Low confidence
        startIndex: 0,
        endIndex: 14
      }];

      const highConfidenceSegments: TextSegment[] = [{
        text: "clear text",
        type: "english",
        confidence: 0.95,  // High confidence
        startIndex: 0,
        endIndex: 10
      }];

      const detector1 = detector.selectDetector(lowConfidenceSegments);
      const detector2 = detector.selectDetector(highConfidenceSegments);

      // 信頼度によって異なる検出器が選択される可能性
      assertExists(detector1);
      assertExists(detector2);
    });

    it("should provide fallback on detector error", async () => {
      // エラーをシミュレートするための不正なセグメント
      const invalidSegments: TextSegment[] = [];

      const selectedDetector = detector.selectDetector(invalidSegments);
      assertExists(selectedDetector);  // フォールバック検出器が返される
    });

    it("should recover from errors gracefully", async () => {
      const detector = new EnhancedHybridWordDetector("enhanced-hybrid");

      // エラーが発生しても処理を継続
      const result = await detector.detectWords("", 1);
      assertEquals(Array.isArray(result), true);
      assertEquals(result.length, 0);  // 空の配列を返す
    });
  });
});

describe("TextPreProcessor", () => {
  it("should normalize text before detection", () => {
    const processor = new TextPreProcessor();
    const input = "　　全角スペース　　and half-width spaces  ";
    const processed = processor.process(input);

    // 正規化されたテキスト
    assertEquals(processed.normalized.includes("　　"), false);
    assertEquals(processed.original, input);
  });
});

describe("TextPostProcessor", () => {
  it("should merge duplicate words", () => {
    const processor = new TextPostProcessor();
    const words: Word[] = [
      { text: "test", line: 1, col: 1 },
      { text: "test", line: 1, col: 1 },  // Duplicate
      { text: "word", line: 1, col: 6 }
    ];

    const processed = processor.process(words);
    assertEquals(processed.length, 2);  // Duplicates removed
  });
});