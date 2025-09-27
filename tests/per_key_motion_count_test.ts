/**
 * Tests for per-key motion count configuration (process1)
 *
 * Feature: Allow different motion_count values for different keys
 * Examples:
 * - 'v', 'w', 'b' with motion_count of 1 (immediate hints)
 * - 'h', 'j', 'k', 'l' with motion_count of 3 (show hints after 3 presses)
 */

import { assertEquals, assertNotEquals } from "@std/assert";
import type { Config } from "../denops/hellshake-yano/types.ts";
import { getMotionCountForKey } from "../denops/hellshake-yano/main.ts";

// Test helper to create minimal config with required fields
function createTestConfig(partial: Partial<Config>): Config {
  return {
    markers: ["A", "B", "C"],
    motionCount: 3,
    motionTimeout: 2000,
    hintPosition: "start",
    triggerOnHjkl: true,
    countedMotions: ["w", "b"],
    enabled: true,
    maxHints: 100,
    debounceDelay: 100,
    useNumbers: false,
    highlightSelected: false,
    debugCoordinates: false,
    ...partial,
  };
}

Deno.test("per_key_motionCount: basic functionality", () => {
  const config = createTestConfig({motionCount: 3,
    per_key_motionCount: {
      "v": 1,
      "w": 1,
      "b": 1,
      "h": 3,
      "j": 3,
      "k": 3,
      "l": 3,
    },
    default_motionCount: 2,
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

Deno.test("per_key_motionCount: fallback to default_motion_count", () => {
  const config = createTestConfig({motionCount: 3,
    per_key_motionCount: {
      "v": 1,
    },
    default_motionCount: 2,
  });

  // Test fallback to default_motion_count for undefined keys
  assertEquals(getMotionCountForKey("v", config), 1); // specific value
  assertEquals(getMotionCountForKey("x", config), 2); // default_motion_count
  assertEquals(getMotionCountForKey("z", config), 2); // default_motion_count
});

Deno.test("per_key_motionCount: fallback to motion_count when default_motion_count is undefined", () => {
  const config = createTestConfig({motionCount: 3,
    per_key_motionCount: {
      "v": 1,
    },
    // default_motion_count is undefined
  });

  // Test fallback to motion_count for backward compatibility
  assertEquals(getMotionCountForKey("v", config), 1); // specific value
  assertEquals(getMotionCountForKey("x", config), 3); // motion_count (backward compatibility)
});

Deno.test("per_key_motionCount: undefined per_key_motion_count uses default_motion_count", () => {
  const config = createTestConfig({motionCount: 3,
    // per_key_motion_count is undefined
    default_motionCount: 2,
  });

  // Test fallback to default_motion_count when per_key_motion_count is undefined
  assertEquals(getMotionCountForKey("v", config), 2);
  assertEquals(getMotionCountForKey("h", config), 2);
});

Deno.test("per_key_motionCount: both undefined uses motion_count", () => {
  const config = createTestConfig({motionCount: 3,
    // both per_key_motion_count and default_motion_count are undefined
  });

  // Test fallback to motion_count for complete backward compatibility
  assertEquals(getMotionCountForKey("v", config), 3);
  assertEquals(getMotionCountForKey("h", config), 3);
});

Deno.test("per_key_motionCount: edge cases", () => {
  const config = createTestConfig({motionCount: 3,
    per_key_motionCount: {
      "v": 0, // zero value (should fallback as it's invalid)
      "w": -1, // negative value (should fallback)
    },
    default_motionCount: 2,
  });

  // Zero and negative values should fallback to default (only values >= 1 are valid)
  assertEquals(getMotionCountForKey("v", config), 2);
  assertEquals(getMotionCountForKey("w", config), 2);
});

Deno.test("per_key_motionCount: empty string key", () => {
  const config = createTestConfig({motionCount: 3,
    per_key_motionCount: {
      "": 1, // empty string key
    },
    default_motionCount: 2,
  });

  // Empty string key should work
  assertEquals(getMotionCountForKey("", config), 1);

  // Other keys should use default
  assertEquals(getMotionCountForKey("v", config), 2);
});

Deno.test("per_key_motionCount: priority test", () => {
  const config = createTestConfig({motionCount: 5,
    per_key_motionCount: {
      "v": 1,
    },
    default_motionCount: 2,
  });

  // Priority: per_key_motion_count > default_motion_count > motion_count
  assertEquals(getMotionCountForKey("v", config), 1); // per_key_motion_count
  assertEquals(getMotionCountForKey("x", config), 2); // default_motion_count

  // Test without per_key_motion_count
  const configWithoutPerKey = createTestConfig({motionCount: 5,
    default_motionCount: 2,
  });
  assertEquals(getMotionCountForKey("v", configWithoutPerKey), 2); // default_motion_count

  // Test without both
  const configMinimal = createTestConfig({motionCount: 5,
  });
  assertEquals(getMotionCountForKey("v", configMinimal), 5); // motion_count
});
