/**
 * TDD Red-Green-Refactor: word/detector.ts Config→UnifiedConfig migration test
 *
 * This test verifies that word/detector.ts properly uses UnifiedConfig
 * instead of the legacy Config interface for consistent configuration management.
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import type { UnifiedConfig } from "../denops/hellshake-yano/config.ts";
import {
  RegexWordDetector,
  TinySegmenterWordDetector,
  HybridWordDetector,
  type WordDetectionConfig
} from "../denops/hellshake-yano/word/detector.ts";

// Mock UnifiedConfig for testing (flat structure as per actual UnifiedConfig interface)
const mockUnifiedConfig: UnifiedConfig = {
  // Core settings
  enabled: true,
  markers: ['A', 'S', 'D', 'F'],
  motionCount: 3,
  motionTimeout: 2000,
  hintPosition: "start",
  visualHintPosition: "end",

  // Hint settings
  triggerOnHjkl: true,
  countedMotions: ['j', 'k'],
  maxHints: 100,
  debounceDelay: 50,
  useNumbers: false,
  highlightSelected: true,
  debugCoordinates: false,
  singleCharKeys: ['A', 'S'],

  // Extended hint settings
  multiCharKeys: ['D', 'F'],
  useHintGroups: false,
  highlightHintMarker: { fg: '#FF0000', bg: '#FFFFFF' },

  // Word detection settings
  highlightHintMarkerCurrent: { fg: '#FFFF00', bg: '#FF0000' },
  suppressOnKeyRepeat: true,
  keyRepeatThreshold: 50,
  useJapanese: true,
  wordDetectionStrategy: 'hybrid',
  enableTinySegmenter: true,
  segmenterThreshold: 4,

  // Japanese word settings
  japaneseMinWordLength: 2,
  japaneseMergeParticles: true,
  japaneseMergeThreshold: 2,
  perKeyMinLength: {
    'f': 2,
    't': 1,
    'F': 3
  },
  defaultMinWordLength: 3,
  defaultMotionCount: 3,

  // Debug settings
  debugMode: false,
  performanceLog: false,

  // Motion counter settings
  motionCounterEnabled: true,
  motionCounterThreshold: 3,
  motionCounterTimeout: 2000,
  showHintOnMotionThreshold: true
};

Deno.test("Red Phase: RegexWordDetector should use UnifiedConfig instead of Config", async () => {
  // This test should initially fail because RegexWordDetector still uses Config
  const config: WordDetectionConfig = {
    // These should map to UnifiedConfig properties (currently uses snake_case)
    useJapanese: mockUnifiedConfig.useJapanese,
    defaultMinWordLength: mockUnifiedConfig.defaultMinWordLength
  };

  const detector = new RegexWordDetector(config, mockUnifiedConfig);

  // Test that detector can access UnifiedConfig properties
  const words = await detector.detectWords("test word", 1, {
    currentKey: 'f',
  });

  // Should be able to detect words with proper min length from UnifiedConfig
  assertExists(words);

  // This assertion will fail until detector.ts is updated to use UnifiedConfig
  const effectiveMinLength = mockUnifiedConfig.perKeyMinLength?.['f'] || mockUnifiedConfig.defaultMinWordLength;
  const validWords = words.filter(word => word.text.length >= effectiveMinLength);
  assertEquals(words.length, validWords.length, "All detected words should respect UnifiedConfig min length");
});

Deno.test("Red Phase: TinySegmenterWordDetector should use UnifiedConfig instead of Config", async () => {
  const config: WordDetectionConfig = {useJapanese: mockUnifiedConfig.useJapanese,
    enableTinySegmenter: mockUnifiedConfig.enableTinySegmenter,
    segmenterThreshold: mockUnifiedConfig.segmenterThreshold
  };

  const detector = new TinySegmenterWordDetector(config, mockUnifiedConfig);

  // Test Japanese text detection with UnifiedConfig settings
  const words = await detector.detectWords("これはテストです", 1, {
    currentKey: 't',
    minWordLength: mockUnifiedConfig.perKeyMinLength?.['t']
  });

  assertExists(words);

  // This will fail until TinySegmenterWordDetector uses UnifiedConfig properly
  const effectiveMinLength = mockUnifiedConfig.perKeyMinLength?.['t'] || mockUnifiedConfig.japaneseMinWordLength;
  const validWords = words.filter(word => word.text.length >= effectiveMinLength);
  assertEquals(words.length, validWords.length, "Japanese words should respect UnifiedConfig min length");
});

Deno.test("Red Phase: HybridWordDetector should use UnifiedConfig instead of Config", async () => {
  const config: WordDetectionConfig = {useJapanese: mockUnifiedConfig.useJapanese,
    strategy: mockUnifiedConfig.wordDetectionStrategy
  };

  const detector = new HybridWordDetector(config, mockUnifiedConfig);

  // Test hybrid detection with mixed content
  const words = await detector.detectWords("Hello こんにちは world", 1, {
    currentKey: 'F',
    minWordLength: mockUnifiedConfig.perKeyMinLength?.['F']
  });

  assertExists(words);

  // This will fail until HybridWordDetector uses UnifiedConfig properly
  const effectiveMinLength = mockUnifiedConfig.perKeyMinLength?.['F'] || mockUnifiedConfig.defaultMinWordLength;
  const validWords = words.filter(word => word.text.length >= effectiveMinLength);
  assertEquals(words.length, validWords.length, "Hybrid detection should respect UnifiedConfig min length");
});