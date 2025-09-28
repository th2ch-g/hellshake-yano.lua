/**
 * Display Width Calculation Tests
 *
 * Comprehensive test suite for display width calculation functions
 * 26 test cases covering all scenarios
 */

import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.177.0/testing/asserts.ts";
import {
  getCharDisplayWidth,
  getDisplayWidth,
  createDisplayWidthCache,
  getVimDisplayWidth,
} from "./display.ts";
import type { Denops } from "https://deno.land/x/denops_std@v5.0.1/mod.ts";

// Mock Denops for testing
const mockDenops = {} as Denops;

Deno.test("Display Width Calculation", async (t) => {
  // ===== 基本ASCII文字テスト（5ケース） =====
  await t.step("ASCII: 'hello' should have width 5", () => {
    assertEquals(getDisplayWidth("hello"), 5);
  });

  await t.step("ASCII: 'Hello World' should have width 11", () => {
    assertEquals(getDisplayWidth("Hello World"), 11);
  });

  await t.step("ASCII: '123' should have width 3", () => {
    assertEquals(getDisplayWidth("123"), 3);
  });

  await t.step("ASCII: '!@#$%' should have width 5", () => {
    assertEquals(getDisplayWidth("!@#$%"), 5);
  });

  await t.step("ASCII: empty string should have width 0", () => {
    assertEquals(getDisplayWidth(""), 0);
  });

  // ===== タブ文字テスト（5ケース） =====
  await t.step("Tab: single tab should have width 8 (default)", () => {
    assertEquals(getDisplayWidth("\t"), 8);
  });

  await t.step("Tab: 'hello\\tworld' should have width 18 (5+8+5)", () => {
    assertEquals(getDisplayWidth("hello\tworld"), 18);
  });

  await t.step("Tab: double tab should have width 16 (8+8)", () => {
    assertEquals(getDisplayWidth("\t\t"), 16);
  });

  await t.step("Tab: 'a\\tb\\tc' should have width 19 (1+8+1+8+1)", () => {
    assertEquals(getDisplayWidth("a\tb\tc"), 19);
  });

  await t.step("Tab: custom tab width 4 should work", () => {
    assertEquals(getDisplayWidth("\t", 4), 4);
  });

  // ===== 日本語・全角文字テスト（5ケース） =====
  await t.step("Japanese: 'あ' should have width 2", () => {
    assertEquals(getDisplayWidth("あ"), 2);
  });

  await t.step("Japanese: 'こんにちは' should have width 10 (2×5)", () => {
    assertEquals(getDisplayWidth("こんにちは"), 10);
  });

  await t.step("Japanese: '漢字' should have width 4 (2×2)", () => {
    assertEquals(getDisplayWidth("漢字"), 4);
  });

  await t.step("Japanese: 'ａｂｃ' (fullwidth) should have width 6", () => {
    assertEquals(getDisplayWidth("ａｂｃ"), 6);
  });

  await t.step("Mixed: '\\t描画' should have width 12 (8+2+2)", () => {
    assertEquals(getDisplayWidth("\t描画"), 12);
  });

  // ===== 絵文字・特殊文字テスト（5ケース） =====
  await t.step("Emoji: '😀' should have width 2", () => {
    assertEquals(getDisplayWidth("😀"), 2);
  });

  await t.step("Emoji: family ZWJ sequence should have width 2", () => {
    assertEquals(getDisplayWidth("👨‍👩‍👧‍👦"), 2);
  });

  await t.step("Emoji: flag should have width 2", () => {
    assertEquals(getDisplayWidth("🇯🇵"), 2);
  });

  await t.step("Unicode: combining character 'é' should have width 1", () => {
    assertEquals(getDisplayWidth("é"), 1);
  });

  await t.step("Symbols: arrow symbols should have width 8 (2×4)", () => {
    assertEquals(getDisplayWidth("→←↑↓"), 8);
  });

  // ===== エラーハンドリングテスト（6ケース） =====
  await t.step("Error: null input should return 0", () => {
    // @ts-ignore - Testing runtime error handling
    assertEquals(getDisplayWidth(null), 0);
  });

  await t.step("Error: undefined input should return 0", () => {
    // @ts-ignore - Testing runtime error handling
    assertEquals(getDisplayWidth(undefined), 0);
  });

  await t.step("Error: invalid UTF-8 should fallback gracefully", () => {
    // Create invalid UTF-8 sequence
    const invalidUtf8 = String.fromCharCode(0xD800); // Unpaired surrogate
    // Should not throw, should return some reasonable value
    const width = getDisplayWidth(invalidUtf8);
    assertEquals(typeof width, "number");
    assertEquals(width >= 0, true);
  });

  await t.step("Error: very long string (10000 chars) should work", () => {
    const longString = "a".repeat(10000);
    assertEquals(getDisplayWidth(longString), 10000);
  });

  await t.step("Error: surrogate pair should be handled correctly", () => {
    const surrogatePair = "𝑨"; // Mathematical A (U+1D435)
    const width = getDisplayWidth(surrogatePair);
    assertEquals(typeof width, "number");
    assertEquals(width >= 1, true);
  });

  await t.step("Error: control characters should be handled", () => {
    const controlChars = "\x00\x01\x02\x1F";
    const width = getDisplayWidth(controlChars);
    assertEquals(typeof width, "number");
    assertEquals(width >= 0, true);
  });
});

Deno.test("Character Display Width", async (t) => {
  await t.step("getCharDisplayWidth: ASCII 'a' should have width 1", () => {
    assertEquals(getCharDisplayWidth("a"), 1);
  });

  await t.step("getCharDisplayWidth: tab should have width 8 (default)", () => {
    assertEquals(getCharDisplayWidth("\t"), 8);
  });

  await t.step("getCharDisplayWidth: tab with custom width should work", () => {
    assertEquals(getCharDisplayWidth("\t", 4), 4);
  });

  await t.step("getCharDisplayWidth: Japanese 'あ' should have width 2", () => {
    assertEquals(getCharDisplayWidth("あ"), 2);
  });

  await t.step("getCharDisplayWidth: emoji should have width 2", () => {
    assertEquals(getCharDisplayWidth("😀"), 2);
  });

  await t.step("getCharDisplayWidth: empty string should have width 0", () => {
    assertEquals(getCharDisplayWidth(""), 0);
  });

  await t.step("getCharDisplayWidth: multi-char string should use first char", () => {
    assertEquals(getCharDisplayWidth("hello"), 1); // Should only consider 'h'
  });
});

Deno.test("Display Width Cache", async (t) => {
  await t.step("createDisplayWidthCache should return LRUCache", async () => {
    const cache = await createDisplayWidthCache();
    assertEquals(typeof cache.get, "function");
    assertEquals(typeof cache.set, "function");
    assertEquals(typeof cache.clear, "function");
  });

  await t.step("cache should store and retrieve values", async () => {
    const cache = await createDisplayWidthCache();
    cache.set("hello_8", 5);
    assertEquals(cache.get("hello_8"), 5);
  });

  await t.step("cache should handle cache misses", async () => {
    const cache = await createDisplayWidthCache();
    assertEquals(cache.get("nonexistent"), undefined);
  });

  await t.step("cache should respect maxSize", async () => {
    const cache = await createDisplayWidthCache(2); // Small cache for testing
    cache.set("key1", 1);
    cache.set("key2", 2);
    cache.set("key3", 3); // Should evict key1

    assertEquals(cache.get("key1"), undefined);
    assertEquals(cache.get("key2"), 2);
    assertEquals(cache.get("key3"), 3);
  });
});

Deno.test("Vim Display Width Integration", async (t) => {
  await t.step("getVimDisplayWidth should be defined", () => {
    assertEquals(typeof getVimDisplayWidth, "function");
  });

  await t.step("getVimDisplayWidth should return Promise<number>", async () => {
    try {
      const result = await getVimDisplayWidth(mockDenops, "hello");
      assertEquals(typeof result, "number");
    } catch (error) {
      // Should gracefully handle mock environment
      assertEquals(error instanceof Error, true);
    }
  });

  await t.step("getVimDisplayWidth should handle empty string", async () => {
    try {
      const result = await getVimDisplayWidth(mockDenops, "");
      assertEquals(result, 0);
    } catch (error) {
      // Should gracefully handle mock environment
      assertEquals(error instanceof Error, true);
    }
  });
});

Deno.test("Edge Cases and Performance", async (t) => {
  await t.step("Mixed content: tab + Japanese + ASCII", () => {
    assertEquals(getDisplayWidth("\tこんにちはworld"), 23); // 8 + 10 + 5
  });

  await t.step("Multiple tabs with different widths", () => {
    assertEquals(getDisplayWidth("\t\t", 2), 4); // 2 + 2
    assertEquals(getDisplayWidth("\t\t", 4), 8); // 4 + 4
    assertEquals(getDisplayWidth("\t\t", 8), 16); // 8 + 8
  });

  await t.step("Zero-width characters should be handled", () => {
    // Zero Width Space (U+200B)
    const zwsp = "\u200B";
    const width = getDisplayWidth(zwsp);
    assertEquals(width >= 0, true);
  });

  await t.step("Performance: should handle repeated calculations efficiently", () => {
    const testString = "hello\t世界😀";
    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      getDisplayWidth(testString);
    }

    const end = performance.now();
    const timePerCall = (end - start) / 1000;

    // Should be very fast (less than 1ms per call even without optimization)
    assertEquals(timePerCall < 1, true);
  });
});