/**
 * Tests for per-key motion count configuration (process1)
 *
 * Feature: Allow different motion_count values for different keys
 * Examples:
 * - 'v', 'w', 'b' with motion_count of 1 (immediate hints)
 * - 'h', 'j', 'k', 'l' with motion_count of 3 (show hints after 3 presses)
 */

import { assertEquals, assertNotEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import type { Config } from "../denops/hellshake-yano/types.ts";
import { getMotionCountForKey } from "../denops/hellshake-yano/main.ts";

// Test helper to create minimal config with required fields
function createTestConfig(partial: Partial<Config>): Config {
  return {
    markers: ["A", "B", "C"],
    motion_count: 3,
    motion_timeout: 2000,
    hint_position: "start",
    trigger_on_hjkl: true,
    counted_motions: ["w", "b"],
    enabled: true,
    maxHints: 100,
    debounceDelay: 100,
    use_numbers: false,
    highlight_selected: false,
    debug_coordinates: false,
    ...partial,
  };
}

Deno.test("per_key_motion_count: basic functionality", () => {
  const config = createTestConfig({
    motion_count: 3,
    per_key_motion_count: {
      "v": 1,
      "w": 1,
      "b": 1,
      "h": 3,
      "j": 3,
      "k": 3,
      "l": 3,
    },
    default_motion_count: 2,
  });

  // Test per-key specific values
  assertEquals(getMotionCountForKey("v", config), 1);
  assertEquals(getMotionCountForKey("w", config), 1);
  assertEquals(getMotionCountForKey("b", config), 1);
  assertEquals(getMotionCountForKey("h", config), 3);
  assertEquals(getMotionCountForKey("j", config), 3);
  assertEquals(getMotionCountForKey("k", config), 3);
  assertEquals(getMotionCountForKey("l", config), 3);
});

Deno.test("per_key_motion_count: fallback to default_motion_count", () => {
  const config = createTestConfig({
    motion_count: 3,
    per_key_motion_count: {
      "v": 1,
    },
    default_motion_count: 2,
  });

  // Test fallback to default_motion_count for undefined keys
  assertEquals(getMotionCountForKey("v", config), 1); // specific value
  assertEquals(getMotionCountForKey("x", config), 2); // default_motion_count
  assertEquals(getMotionCountForKey("z", config), 2); // default_motion_count
});

Deno.test("per_key_motion_count: fallback to motion_count when default_motion_count is undefined", () => {
  const config = createTestConfig({
    motion_count: 3,
    per_key_motion_count: {
      "v": 1,
    },
    // default_motion_count is undefined
  });

  // Test fallback to motion_count for backward compatibility
  assertEquals(getMotionCountForKey("v", config), 1); // specific value
  assertEquals(getMotionCountForKey("x", config), 3); // motion_count (backward compatibility)
});

Deno.test("per_key_motion_count: undefined per_key_motion_count uses default_motion_count", () => {
  const config = createTestConfig({
    motion_count: 3,
    // per_key_motion_count is undefined
    default_motion_count: 2,
  });

  // Test fallback to default_motion_count when per_key_motion_count is undefined
  assertEquals(getMotionCountForKey("v", config), 2);
  assertEquals(getMotionCountForKey("h", config), 2);
});

Deno.test("per_key_motion_count: both undefined uses motion_count", () => {
  const config = createTestConfig({
    motion_count: 3,
    // both per_key_motion_count and default_motion_count are undefined
  });

  // Test fallback to motion_count for complete backward compatibility
  assertEquals(getMotionCountForKey("v", config), 3);
  assertEquals(getMotionCountForKey("h", config), 3);
});

Deno.test("per_key_motion_count: edge cases", () => {
  const config = createTestConfig({
    motion_count: 3,
    per_key_motion_count: {
      "v": 0, // zero value (should fallback as it's invalid)
      "w": -1, // negative value (should fallback)
    },
    default_motion_count: 2,
  });

  // Zero and negative values should fallback to default (only values >= 1 are valid)
  assertEquals(getMotionCountForKey("v", config), 2);
  assertEquals(getMotionCountForKey("w", config), 2);
});

Deno.test("per_key_motion_count: empty string key", () => {
  const config = createTestConfig({
    motion_count: 3,
    per_key_motion_count: {
      "": 1, // empty string key
    },
    default_motion_count: 2,
  });

  // Empty string key should work
  assertEquals(getMotionCountForKey("", config), 1);

  // Other keys should use default
  assertEquals(getMotionCountForKey("v", config), 2);
});

Deno.test("per_key_motion_count: priority test", () => {
  const config = createTestConfig({
    motion_count: 5,
    per_key_motion_count: {
      "v": 1,
    },
    default_motion_count: 2,
  });

  // Priority: per_key_motion_count > default_motion_count > motion_count
  assertEquals(getMotionCountForKey("v", config), 1); // per_key_motion_count
  assertEquals(getMotionCountForKey("x", config), 2); // default_motion_count

  // Test without per_key_motion_count
  const configWithoutPerKey = createTestConfig({
    motion_count: 5,
    default_motion_count: 2,
  });
  assertEquals(getMotionCountForKey("v", configWithoutPerKey), 2); // default_motion_count

  // Test without both
  const configMinimal = createTestConfig({
    motion_count: 5,
  });
  assertEquals(getMotionCountForKey("v", configMinimal), 5); // motion_count
});
