/**
 * Context Propagation Test Suite for process3
 *
 * This test suite validates the implementation of context information propagation
 * from HintManager through WordManager to WordDetector classes.
 *
 * Test Coverage:
 * 1. DetectionContext interface definition and usage
 * 2. Context propagation through detector chain
 * 3. Per-key min word length filtering
 * 4. Backward compatibility (no context provided)
 * 5. Context override behavior
 * 6. Session management
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import type { DetectionContext } from "../denops/hellshake-yano/word/detector.ts";
import {
  HybridWordDetector,
  RegexWordDetector,
  TinySegmenterWordDetector,
} from "../denops/hellshake-yano/word/detector.ts";
import { WordDetectionManager } from "../denops/hellshake-yano/word/manager.ts";
import type { Word } from "../denops/hellshake-yano/word.ts";

Deno.test("DetectionContext interface should be defined", () => {
  // Test that the DetectionContext interface exists and has expected structure
  const context: DetectionContext = {
    currentKey: "f",
    minWordLength: 3,
  };

  assertExists(context);
  assertEquals(context.currentKey, "f");
  assertEquals(context.minWordLength, 3);
});

Deno.test("RegexWordDetector should accept optional context parameter", async () => {
  const detector = new RegexWordDetector({ use_japanese: false });
  const text = "hello world test";
  const startLine = 1;

  // Test without context (backward compatibility)
  const wordsWithoutContext = await detector.detectWords(text, startLine);
  assertExists(wordsWithoutContext);

  // Test with context
  const context: DetectionContext = {
    currentKey: "f",
    minWordLength: 5,
  };

  const wordsWithContext = await detector.detectWords(text, startLine, context);
  assertExists(wordsWithContext);

  // Words with context should be filtered by minWordLength
  const longWords = wordsWithContext.filter((w) => w.text.length >= 5);
  assertEquals(wordsWithContext.length, longWords.length);
});

Deno.test("TinySegmenterWordDetector should accept optional context parameter", async () => {
  const detector = new TinySegmenterWordDetector({ use_japanese: true });
  const text = "これは日本語のテストです";
  const startLine = 1;

  // Test without context (backward compatibility)
  const wordsWithoutContext = await detector.detectWords(text, startLine);
  assertExists(wordsWithoutContext);

  // Test with context
  const context: DetectionContext = {
    currentKey: "g",
    minWordLength: 3,
  };

  const wordsWithContext = await detector.detectWords(text, startLine, context);
  assertExists(wordsWithContext);

  // Verify context-based filtering
  const filteredWords = wordsWithContext.filter((w) => w.text.length >= 3);
  assertEquals(wordsWithContext.length, filteredWords.length);
});

Deno.test("HybridWordDetector should accept optional context parameter", async () => {
  const detector = new HybridWordDetector({ use_japanese: true });
  const text = "hello こんにちは world 世界";
  const startLine = 1;

  // Test without context
  const wordsWithoutContext = await detector.detectWords(text, startLine);
  assertExists(wordsWithoutContext);

  // Test with context
  const context: DetectionContext = {
    currentKey: "t",
    minWordLength: 4,
  };

  const wordsWithContext = await detector.detectWords(text, startLine, context);
  assertExists(wordsWithContext);

  // Verify filtering by context minWordLength
  for (const word of wordsWithContext) {
    assertEquals(word.text.length >= 4, true);
  }
});

Deno.test("WordDetectionManager should propagate context to detectors", async () => {
  const manager = new WordDetectionManager({
    use_japanese: true,
    default_strategy: "hybrid",
  });

  await manager.initialize();

  const text = "test hello world example";
  const startLine = 1;

  // Test context propagation through manager
  const context: DetectionContext = {
    currentKey: "w",
    minWordLength: 5,
  };

  const result = await manager.detectWords(text, startLine, undefined, context);
  assertExists(result);

  // All words should be at least 5 characters long
  for (const word of result.words) {
    assertEquals(word.text.length >= 5, true);
  }
});

Deno.test("Context should override config min_word_length", async () => {
  const detector = new RegexWordDetector({
    use_japanese: false,
    min_word_length: 2, // Config default
  });

  const text = "a bb ccc dddd eeeee";
  const startLine = 1;

  // Without context - should use config min_word_length (2)
  const wordsWithoutContext = await detector.detectWords(text, startLine);
  assertEquals(wordsWithoutContext.length, 4); // bb, ccc, dddd, eeeee

  // With context - should override to use context minWordLength (4)
  const context: DetectionContext = {
    currentKey: "f",
    minWordLength: 4,
  };

  const wordsWithContext = await detector.detectWords(text, startLine, context);
  assertEquals(wordsWithContext.length, 2); // dddd, eeeee
});

Deno.test("Session context should be managed by WordManager", async () => {
  const manager = new WordDetectionManager();
  await manager.initialize();

  // Test session context storage and retrieval
  const sessionContext: DetectionContext = {
    currentKey: "f",
    minWordLength: 3,
  };

  // Manager should store and reuse session context
  manager.setSessionContext(sessionContext);
  const retrievedContext = manager.getSessionContext();

  assertEquals(retrievedContext?.currentKey, "f");
  assertEquals(retrievedContext?.minWordLength, 3);
});

Deno.test("Per-key minimum word length should work correctly", async () => {
  const detector = new RegexWordDetector({ use_japanese: false });
  const text = "a bb ccc dddd eeeeee";

  // Test different keys with different minimum lengths
  const contextF: DetectionContext = {
    currentKey: "f",
    minWordLength: 2,
  };

  const contextT: DetectionContext = {
    currentKey: "t",
    minWordLength: 4,
  };

  const wordsF = await detector.detectWords(text, 1, contextF);
  const wordsT = await detector.detectWords(text, 1, contextT);

  // f key should find words >= 2 chars: bb, ccc, dddd, eeeeee
  assertEquals(wordsF.length, 4);

  // t key should find words >= 4 chars: dddd, eeeeee
  assertEquals(wordsT.length, 2);
});

Deno.test("Context propagation should maintain backward compatibility", async () => {
  const detector = new RegexWordDetector({
    use_japanese: false,
    min_word_length: 2,
  });

  const text = "hello world test";
  const startLine = 1;

  // Old behavior - no context parameter
  const wordsOld = await detector.detectWords(text, startLine);

  // New behavior - with undefined context (should behave the same)
  const wordsNew = await detector.detectWords(text, startLine, undefined);

  assertEquals(wordsOld.length, wordsNew.length);

  for (let i = 0; i < wordsOld.length; i++) {
    assertEquals(wordsOld[i].text, wordsNew[i].text);
    assertEquals(wordsOld[i].line, wordsNew[i].line);
    assertEquals(wordsOld[i].col, wordsNew[i].col);
  }
});
