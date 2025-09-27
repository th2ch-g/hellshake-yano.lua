/**
 * TDD Red-Green-Refactor: word/manager.ts Config→UnifiedConfig migration test
 *
 * This test verifies that word/manager.ts properly uses UnifiedConfig
 * instead of the legacy Config interface for consistent configuration management.
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import type { UnifiedConfig } from "../denops/hellshake-yano/config.ts";
import {
  WordDetectionManager,
  getWordDetectionManager,
  type WordDetectionManagerConfig
} from "../denops/hellshake-yano/word/manager.ts";

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
  performanceLog: false
};

Deno.test("Red Phase: WordDetectionManager should use UnifiedConfig instead of Config", async () => {
  // This test should initially fail because WordDetectionManager still uses Config
  const config: WordDetectionManagerConfig = {
    // These should map to UnifiedConfig properties (currently uses snake_case)
    useJapanese: mockUnifiedConfig.useJapanese,
    defaultStrategy: mockUnifiedConfig.wordDetectionStrategy,
    cacheEnabled: true,
    cacheMaxSize: 500
  };

  const manager = new WordDetectionManager(config, mockUnifiedConfig);
  await manager.initialize();

  // Test that manager can access UnifiedConfig properties
  const result = await manager.detectWords("test word", 1, undefined, {
    currentKey: 'f',
    defaultMinWordLength: mockUnifiedConfig.perKeyMinLength?.['f']
  });

  // Should be able to detect words with proper min length from UnifiedConfig
  assertExists(result);
  assertExists(result.words);

  // This assertion will fail until manager.ts is updated to use UnifiedConfig
  const effectiveMinLength = mockUnifiedConfig.perKeyMinLength?.['f'] || mockUnifiedConfig.defaultMinWordLength;
  const validWords = result.words.filter(word => word.text.length >= effectiveMinLength);
  assertEquals(result.words.length, validWords.length, "All detected words should respect UnifiedConfig min length");
});

Deno.test("Red Phase: getWordDetectionManager should use UnifiedConfig instead of Config", async () => {
  const config: WordDetectionManagerConfig = {useJapanese: mockUnifiedConfig.useJapanese,
    defaultStrategy: mockUnifiedConfig.wordDetectionStrategy,
    enableTinySegmenter: mockUnifiedConfig.enableTinySegmenter
  };

  // This should work with UnifiedConfig
  const manager = getWordDetectionManager(config, mockUnifiedConfig);
  await manager.initialize();

  // Test Japanese text detection with UnifiedConfig settings
  const result = await manager.detectWords("これはテストです", 1, undefined, {
    currentKey: 't',
    defaultMinWordLength: mockUnifiedConfig.perKeyMinLength?.['t']
  });

  assertExists(result);
  assertExists(result.words);

  // This will fail until manager.ts uses UnifiedConfig properly
  const effectiveMinLength = mockUnifiedConfig.perKeyMinLength?.['t'] || mockUnifiedConfig.japaneseMinWordLength;
  const validWords = result.words.filter(word => word.text.length >= effectiveMinLength);
  assertEquals(result.words.length, validWords.length, "Japanese words should respect UnifiedConfig min length");
});

Deno.test("Red Phase: WordDetectionManager should handle hybrid detection with UnifiedConfig", async () => {
  const config: WordDetectionManagerConfig = {useJapanese: mockUnifiedConfig.useJapanese,
    defaultStrategy: 'hybrid', // Force hybrid strategy
    enableTinySegmenter: mockUnifiedConfig.enableTinySegmenter
  };

  const manager = new WordDetectionManager(config, mockUnifiedConfig);
  await manager.initialize();

  // Test hybrid detection with mixed content
  const result = await manager.detectWords("Hello こんにちは world", 1, undefined, {
    currentKey: 'F',
    defaultMinWordLength: mockUnifiedConfig.perKeyMinLength?.['F']
  });

  assertExists(result);
  assertExists(result.words);

  // This will fail until manager.ts uses UnifiedConfig properly
  const effectiveMinLength = mockUnifiedConfig.perKeyMinLength?.['F'] || mockUnifiedConfig.defaultMinWordLength;
  const validWords = result.words.filter(word => word.text.length >= effectiveMinLength);
  assertEquals(result.words.length, validWords.length, "Hybrid detection should respect UnifiedConfig min length");
});