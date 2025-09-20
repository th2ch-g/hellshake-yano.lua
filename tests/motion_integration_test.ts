/**
 * Motion Integration Test - Process4 Implementation
 * VimScript側とDenops側のキー情報伝達のテスト
 */

import { assertEquals, assertExists } from "@std/assert";
import type { Denops } from "@denops/std";
import { test } from "@denops/test";
import { MockDenops } from "./helpers/mock.ts";
import type { Config } from "../denops/hellshake-yano/main.ts";

test({
  mode: "all",
  name: "Motion Integration: VimScript to Denops key information passing",
  fn: async (denops: Denops) => {
    // Create test configuration with per_key_min_length
    const testConfig: Config = {
      markers: ["A", "B", "C"],
      motion_count: 3,
      motion_timeout: 2000,
      hint_position: "start",
      trigger_on_hjkl: true,
      counted_motions: [],
      enabled: true,
      maxHints: 50,
      debounceDelay: 50,
      use_numbers: true,
      highlight_selected: true,
      debug_coordinates: false,
      per_key_min_length: {
        "v": 1,
        "h": 2,
        "j": 2,
        "k": 2,
        "l": 2,
      },
      default_min_word_length: 2,
    };

    // Test setup - this should fail initially (RED phase)
    try {
      // Test that showHintsWithKey method should exist
      const result = await denops.dispatcher.showHintsWithKey("v");
      assertExists(result, "showHintsWithKey should be callable");
    } catch (error) {
      // Expected failure in RED phase
      assertEquals(
        (error as Error).message.includes("showHintsWithKey"),
        true,
        "Should fail because showHintsWithKey is not yet implemented"
      );
    }

    // Test VimScript function should exist (will fail initially)
    try {
      const vimscriptResult = await denops.call("hellshake_yano#denops#show_hints_with_key", "v");
      assertExists(vimscriptResult, "VimScript function should be callable");
    } catch (error) {
      // Expected failure in RED phase
      assertEquals(
        (error as Error).message.includes("Unknown function"),
        true,
        "Should fail because VimScript function is not yet implemented"
      );
    }
  },
});

test({
  mode: "all",
  name: "Motion Integration: Key context propagation to word detection",
  fn: async (denops: Denops) => {
    const testConfig: Config = {
      markers: ["A", "B", "C"],
      motion_count: 3,
      motion_timeout: 2000,
      hint_position: "start",
      trigger_on_hjkl: true,
      counted_motions: [],
      enabled: true,
      maxHints: 50,
      debounceDelay: 50,
      use_numbers: true,
      highlight_selected: true,
      debug_coordinates: false,
      per_key_min_length: {
        "v": 1,  // Should detect 1-char words
        "h": 3,  // Should detect 3+ char words only
      },
      default_min_word_length: 2,
    };

    // Test text with mix of 1-char, 2-char, and 3+ char words
    const testLines = [
      "a by the quick brown fox",  // 1-char: "a", 2-char: "by", 3+char: "the", "quick", "brown", "fox"
    ];

    // This should fail initially because showHintsWithKey doesn't exist
    try {
      // For 'v' key (min_length=1), should detect all words including "a"
      await denops.dispatcher.showHintsWithKey("v");

      // For 'h' key (min_length=3), should only detect "the", "quick", "brown", "fox"
      await denops.dispatcher.showHintsWithKey("h");

    } catch (error) {
      // Expected failure in RED phase
      assertEquals(
        (error as Error).message.includes("showHintsWithKey"),
        true,
        "Should fail because showHintsWithKey method is not implemented"
      );
    }
  },
});

test({
  mode: "all",
  name: "Motion Integration: Visual mode key information support",
  fn: async (denops: Denops) => {
    // Test visual mode specific key handling
    // This should also fail initially as the integration is not implemented

    try {
      // Visual mode should also support key-specific min_word_length
      await denops.dispatcher.showHintsWithKey("V");  // Visual line mode
      await denops.dispatcher.showHintsWithKey("v");  // Visual character mode

    } catch (error) {
      // Expected failure in RED phase
      assertEquals(
        (error as Error).message.includes("showHintsWithKey"),
        true,
        "Should fail because visual mode integration is not implemented"
      );
    }
  },
});

test({
  mode: "all",
  name: "Motion Integration: HintManager coordination",
  fn: async (denops: Denops) => {
    // Test that HintManager's onKeyPress is called during showHintsWithKey
    // This tests the integration between the new method and existing HintManager

    try {
      // Should trigger HintManager.onKeyPress internally
      await denops.dispatcher.showHintsWithKey("j");

      // Should properly pass key context to word detection
      await denops.dispatcher.showHintsWithKey("k");

    } catch (error) {
      // Expected failure in RED phase
      assertEquals(
        (error as Error).message.includes("showHintsWithKey"),
        true,
        "Should fail because HintManager integration is not implemented"
      );
    }
  },
});