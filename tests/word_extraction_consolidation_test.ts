/**
 * @title Word Extraction Function Consolidation Tests
 * @description TDD Test Suite for consolidating duplicate word extraction functions
 *
 * This test suite defines the expected behavior of the unified word extraction function
 * that will replace:
 * - extractWordsFromLine()
 * - extractWordsFromLineWithConfig()
 * - extractWordsFromLineWithEnhancedConfig()
 * - extractWordsFromLineLegacy()
 *
 * The goal is to create a single function with clear interfaces that handles all cases.
 */

import { assertEquals, assertExists } from "@std/assert";
import type { Word, WordConfig, EnhancedWordConfig } from "../denops/hellshake-yano/word.ts";

// Import the unified function for testing
import {
  extractWordsUnified,
  type UnifiedWordExtractionConfig,
} from "../denops/hellshake-yano/word.ts";

// Import existing functions for behavior verification
import {
  extractWordsFromLine,
  extractWordsFromLineWithConfig,
  extractWordsFromLineWithEnhancedConfig,
  extractWordsFromLineLegacy,
} from "../denops/hellshake-yano/word.ts";

Deno.test("TDD Red Phase: Unified Function Interface Definition", async (t) => {
  await t.step("Should handle legacy extractWordsFromLine behavior", () => {
    const testText = "hello world test";
    const lineNumber = 1;

    // Current behavior: extractWordsFromLine(lineText, lineNumber, useImprovedDetection=false, excludeJapanese=false)
    const expected = extractWordsFromLine(testText, lineNumber, false, false);

    // Test unified function: default config should match legacy behavior
    const result = extractWordsUnified(testText, lineNumber);
    assertEquals(result.length, expected.length);
    assertEquals(result.map(w => w.text), expected.map(w => w.text));

    // Verify the behavior is correct
    assertEquals(result.length, 3);
    assertEquals(result.map(w => w.text), ["hello", "world", "test"]);
  });

  await t.step("Should handle legacy extractWordsFromLine with improved detection", () => {
    const testText = "hello-world snake_case こんにちは";
    const lineNumber = 1;

    // Current behavior: extractWordsFromLine(lineText, lineNumber, useImprovedDetection=true, excludeJapanese=false)
    const expected = extractWordsFromLine(testText, lineNumber, true, false);

    // Test unified behavior: config.useImprovedDetection = true
    const result = extractWordsUnified(testText, lineNumber, { useImprovedDetection: true });
    assertEquals(result.length, expected.length);

    // Verify improved detection works
    assertExists(result.find(w => w.text === "hello"));
    assertExists(result.find(w => w.text === "world"));
    assertExists(result.find(w => w.text === "snake"));
    assertExists(result.find(w => w.text === "case"));
  });

  await t.step("Should handle extractWordsFromLineWithConfig behavior", () => {
    const testText = "hello こんにちは world";
    const lineNumber = 1;

    // Current behavior: Partial UnifiedConfig
    const config = { useJapanese: true };
    const expected = extractWordsFromLineWithConfig(testText, lineNumber, config);

    // Test unified behavior: backward compatibility for WordConfig
    const result = extractWordsUnified(testText, lineNumber, {useJapanese: true });
    assertEquals(result.length, expected.length);

    // Verify behavior
    assertExists(result.find(w => w.text === "hello"));
    assertExists(result.find(w => w.text === "world"));
  });

  await t.step("Should handle extractWordsFromLineWithEnhancedConfig behavior", () => {
    const testText = "hello こんにちは world";
    const lineNumber = 1;

    // Current behavior: EnhancedWordConfig interface
    const config: EnhancedWordConfig = {useJapanese: true,
      strategy: "regex",
      defaultMinWordLength: 2
    };
    const expected = extractWordsFromLineWithEnhancedConfig(testText, lineNumber, config);

    // Test unified behavior: support for EnhancedWordConfig
    const result = extractWordsUnified(testText, lineNumber, config);
    assertEquals(result.length, expected.length);

    // Verify behavior
    assertExists(result.find(w => w.text === "hello"));
    assertExists(result.find(w => w.text === "world"));
  });

  await t.step("Should handle extractWordsFromLineLegacy behavior", () => {
    const testText = "hello-world foo_bar 123 ab";
    const lineNumber = 1;

    // Current behavior: Legacy with specific filtering rules
    const expected = extractWordsFromLineLegacy(testText, lineNumber, false);

    // Test unified behavior: legacy compatibility mode
    const result = extractWordsUnified(testText, lineNumber, {
      legacyMode: true
    });

    // Legacy behavior: 2+ chars, no numbers-only, kebab-case is split by hyphen
    assertEquals(result.length, 4); // "hello", "world", "foo_bar", "ab" (123 filtered out)
    assertExists(result.find(w => w.text === "hello"));  // kebab-case split
    assertExists(result.find(w => w.text === "world"));  // kebab-case split
    assertExists(result.find(w => w.text === "foo_bar")); // snake_case preserved
    assertExists(result.find(w => w.text === "ab"));      // 2 chars included

    // Verify it matches legacy function
    assertEquals(result.length, expected.length);
    assertEquals(result.map(w => w.text).sort(), expected.map(w => w.text).sort());
  });
});

Deno.test("TDD Red Phase: Configuration Unification", async (t) => {
  await t.step("Should normalize different config formats to unified format", () => {
    // Test that different config formats can be unified

    // WordConfig format
    const wordConfig: WordConfig = {useJapanese: true };

    // EnhancedWordConfig format
    const enhancedConfig: EnhancedWordConfig = {useJapanese: true,
      strategy: "hybrid",
      defaultMinWordLength: 3
    };

    // Direct parameters format (like extractWordsFromLine)
    const directParams = {
      useImprovedDetection: true,
      excludeJapanese: false
    };

    // The unified function should handle all these formats
    // Future implementation will normalize these to a single internal format

    // For now, just verify the configs are valid
    assertEquals(wordConfig.useJapanese, true);
    assertEquals(enhancedConfig.strategy, "hybrid");
    assertEquals(directParams.useImprovedDetection, true);
  });

  await t.step("Should provide clear migration path for existing functions", () => {
    const testText = "test migration path";
    const lineNumber = 1;

    // All current functions should produce comparable results for basic text
    const legacyResult = extractWordsFromLineLegacy(testText, lineNumber);
    const basicResult = extractWordsFromLine(testText, lineNumber, false, false);
    const configResult = extractWordsFromLineWithConfig(testText, lineNumber, {});
    const enhancedResult = extractWordsFromLineWithEnhancedConfig(testText, lineNumber, {});

    // Basic sanity check - all should detect the same words for simple text
    const expectedWords = ["test", "migration", "path"];

    assertEquals(legacyResult.map(w => w.text), expectedWords);
    assertEquals(basicResult.map(w => w.text), expectedWords);
    assertEquals(configResult.map(w => w.text), expectedWords);
    assertEquals(enhancedResult.map(w => w.text), expectedWords);
  });
});

Deno.test("TDD Red Phase: Performance and Edge Cases", async (t) => {
  await t.step("Should handle empty and edge case inputs", () => {
    const testCases = [
      { text: "", expected: 0 },
      { text: "   ", expected: 0 },
      { text: "a", expected: 0 }, // Single char filtered in legacy
      { text: "ab", expected: 1 }, // Min 2 chars in legacy
      { text: "123", expected: 0 }, // Numbers-only filtered in legacy
      { text: "abc123", expected: 1 }, // Mixed alphanumeric allowed
    ];

    for (const testCase of testCases) {
      const result = extractWordsFromLineLegacy(testCase.text, 1);
      assertEquals(
        result.length,
        testCase.expected,
        `Failed for input: "${testCase.text}"`
      );
    }
  });

  await t.step("Should maintain position accuracy across all variants", () => {
    const testText = "hello world test";
    const lineNumber = 1;

    // All variants should report the same positions for basic text
    const variants = [
      extractWordsFromLineLegacy(testText, lineNumber),
      extractWordsFromLine(testText, lineNumber, false, false),
      extractWordsFromLineWithConfig(testText, lineNumber, {}),
      extractWordsFromLineWithEnhancedConfig(testText, lineNumber, {}),
    ];

    for (const result of variants) {
      assertEquals(result.length, 3);
      assertEquals(result[0].text, "hello");
      assertEquals(result[0].col, 1);
      assertEquals(result[1].text, "world");
      assertEquals(result[1].col, 7);
      assertEquals(result[2].text, "test");
      assertEquals(result[2].col, 13);
    }
  });
});

// Define the expected interface for the unified function
export interface UnifiedWordExtractionFunction {
  (lineText: string, lineNumber: number, config?: UnifiedWordExtractionConfig): Word[];
}

// Export the test configuration for the implementation phase
export const EXPECTED_UNIFIED_BEHAVIOR = {
  // Default behavior should match extractWordsFromLineLegacy for backward compatibility
  defaultMode: "legacy",

  // Configuration options
  supportedConfigs: {
    // Legacy boolean parameters
    useImprovedDetection: "boolean",
    excludeJapanese: "boolean",

    // WordConfig compatibility
    useJapanese: "boolean",

    // EnhancedWordConfig compatibility
    strategy: ["regex", "tinysegmenter", "hybrid"],
    defaultMinWordLength: "number",
    enableTinySegmenter: "boolean",
  },

  // Migration strategy
  deprecationPlan: {
    phase1: "Implement unified function",
    phase2: "Replace all usages",
    phase3: "Mark old functions as deprecated",
    phase4: "Remove old functions in next major version"
  }
} as const;