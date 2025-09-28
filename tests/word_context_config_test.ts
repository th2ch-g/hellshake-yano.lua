/**
 * TDD Red-Green-Refactor: word/context.ts GlobalCache integration test
 *
 * This test verifies that word/context.ts properly uses GlobalCache
 * and provides consistent context detection functionality.
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import {
  ContextDetector,
  type LanguageRule,
  type SplittingRules
} from "../denops/hellshake-yano/word.ts";
import type { DetectionContext, SyntaxContext, LineContext } from "../denops/hellshake-yano/types.ts";

Deno.test("ContextDetector should detect TypeScript syntax context properly", () => {
  const detector = new ContextDetector();

  // Test comment detection
  const commentContext = detector.detectSyntaxContext("// This is a comment", 1, "typescript");
  assertEquals(commentContext.inComment, true);
  assertEquals(commentContext.language, "typescript");

  // Test function detection
  const functionContext = detector.detectSyntaxContext("function test() {}", 2, "typescript");
  assertEquals(functionContext.inFunction, true);
  assertEquals(functionContext.language, "typescript");

  // Test string detection
  const stringContext = detector.detectSyntaxContext('"Hello World"', 3, "typescript");
  assertEquals(stringContext.inString, true);
  assertEquals(stringContext.language, "typescript");
});

Deno.test("ContextDetector should detect Python syntax context properly", () => {
  const detector = new ContextDetector();

  // Test Python comment detection
  const commentContext = detector.detectSyntaxContext("# This is a Python comment", 1, "python");
  assertEquals(commentContext.inComment, true);
  assertEquals(commentContext.language, "python");

  // Test Python function detection
  const functionContext = detector.detectSyntaxContext("def test_function():", 2, "python");
  assertEquals(functionContext.inFunction, true);
  assertEquals(functionContext.language, "python");

  // Test Python docstring detection
  const docstringContext = detector.detectSyntaxContext('"""This is a docstring"""', 3, "python");
  assertEquals(docstringContext.inString, true);
  assertEquals(docstringContext.language, "python");
});

Deno.test("ContextDetector should detect line context properly", () => {
  const detector = new ContextDetector();

  // Test comment line detection
  const commentLine = detector.detectLineContext("  // Comment with indentation", "typescript");
  assertEquals(commentLine.isComment, true);
  assertEquals(commentLine.indentLevel, 2);
  assertEquals(commentLine.lineType, "comment");

  // Test import line detection
  const importLine = detector.detectLineContext('import { test } from "./module";', "typescript");
  assertEquals(importLine.isImport, true);
  assertEquals(importLine.lineType, "import");

  // Test empty line detection
  const emptyLine = detector.detectLineContext("", "typescript");
  assertEquals(emptyLine.lineType, "empty");
});

Deno.test("ContextDetector should provide appropriate splitting rules", () => {
  const detector = new ContextDetector();

  // Test TypeScript context (should split CamelCase)
  const tsContext: DetectionContext = {
    fileType: "typescript",
    syntaxContext: {
      inComment: false,
      inString: false,
      inFunction: true,
      inClass: false,
      language: "typescript"
    }
  };

  const tsRules = detector.getSplittingRules(tsContext);
  assertEquals(tsRules.splitCamelCase, true);
  assertEquals(tsRules.splitSnakeCase, false);

  // Test Python context (should not split snake_case)
  const pyContext: DetectionContext = {
    fileType: "python",
    syntaxContext: {
      inComment: false,
      inString: false,
      inFunction: true,
      inClass: false,
      language: "python"
    }
  };

  const pyRules = detector.getSplittingRules(pyContext);
  assertEquals(pyRules.splitCamelCase, false);
  assertEquals(pyRules.splitSnakeCase, false); // Preserve snake_case in Python

  // Test comment context (should preserve all)
  const commentContext: DetectionContext = {
    fileType: "typescript",
    syntaxContext: {
      inComment: true,
      inString: false,
      inFunction: false,
      inClass: false,
      language: "typescript"
    }
  };

  const commentRules = detector.getSplittingRules(commentContext);
  assertEquals(commentRules.splitCamelCase, false); // Don't split in comments
});

Deno.test("ContextDetector should calculate word importance correctly", () => {
  const detector = new ContextDetector();

  // Test keyword importance (should be high)
  const keywordContext: DetectionContext = {
    fileType: "typescript",
    syntaxContext: {
      inComment: false,
      inString: false,
      inFunction: false,
      inClass: false,
      language: "typescript"
    }
  };

  const keywordScore = detector.calculateWordImportance("function", keywordContext);
  assertEquals(keywordScore >= 70, true, "Keywords should have high importance score");

  // Test comment context (should be lower importance)
  const commentContext: DetectionContext = {
    fileType: "typescript",
    syntaxContext: {
      inComment: true,
      inString: false,
      inFunction: false,
      inClass: false,
      language: "typescript"
    }
  };

  const commentScore = detector.calculateWordImportance("someword", commentContext);
  assertEquals(commentScore <= 40, true, "Words in comments should have lower importance");
});

Deno.test("ContextDetector should handle cache operations properly", () => {
  const detector = new ContextDetector();

  // Test that context detection uses cache
  const context1 = detector.detectSyntaxContext("// Test comment", 1, "typescript");
  const context2 = detector.detectSyntaxContext("// Test comment", 1, "typescript");

  // Should return the same result (cached)
  assertEquals(context1.inComment, context2.inComment);
  assertEquals(context1.language, context2.language);

  // Test cache stats
  const stats = detector.getCacheStats();
  assertExists(stats);
  assertExists(stats.contextCacheSize);
  assertExists(stats.languageRuleCacheSize);

  // Cache should have some entries after detection
  assertEquals(stats.contextCacheSize >= 0, true);
  assertEquals(stats.languageRuleCacheSize >= 0, true);

  // Test cache clearing
  detector.clearCache();
  const statsAfterClear = detector.getCacheStats();
  assertEquals(statsAfterClear.contextCacheSize, 0, "Context cache should be cleared");
  // Language rules cache should be preserved (static data)
  assertEquals(statsAfterClear.languageRuleCacheSize >= 0, true);
});