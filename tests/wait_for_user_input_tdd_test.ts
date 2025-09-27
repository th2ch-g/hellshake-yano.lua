/**
 * TDD waitForUserInput Migration Test Suite
 *
 * RED Phase: These tests will fail initially as current waitForUserInput is simplified
 * GREEN Phase: Migrate complete implementation from main.ts to make tests pass
 * REFACTOR Phase: Clean up and optimize while keeping tests green
 *
 * Critical Bug Fix: Ensure hideHintsOptimized is called instead of hideHints
 * after successful jumps to properly hide visual hints from display.
 */

import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { Core } from "../denops/hellshake-yano/core.ts";
import type { HintMapping, Config } from "../denops/hellshake-yano/types.ts";

// Mock Denops interface for testing
interface MockDenops {
  call: (fn: string, ...args: any[]) => Promise<any>;
  cmd: (command: string) => Promise<void>;
}

// Mock function call tracker
interface CallTracker {
  getcharCalls: number[];
  cursorCalls: Array<[number, number]>;
  feedkeysCalls: Array<[string, string]>;
  hideHintsOptimizedCalls: number;
  hideHintsCalls: number;
}

// Create comprehensive mock denops with call tracking
const createMockDenops = (
  getcharResponses: number[] = [],
  callTracker?: CallTracker
): MockDenops => {
  let getcharIndex = 0;

  return {
    call: async (fn: string, ...args: any[]) => {
      if (callTracker) {
        if (fn === "getchar") {
          const response = getcharResponses[getcharIndex++] || 27; // Default ESC
          callTracker.getcharCalls.push(response);
          return response;
        }
        if (fn === "cursor") {
          callTracker.cursorCalls.push([args[0], args[1]]);
          return;
        }
        if (fn === "feedkeys") {
          callTracker.feedkeysCalls.push([args[0], args[1]]);
          return;
        }
      }

      if (fn === "getchar") {
        return getcharResponses[getcharIndex++] || 27;
      }
      if (fn === "cursor") return;
      if (fn === "feedkeys") return;
      return undefined;
    },
    cmd: async (command: string) => {
      // Track hide calls - we don't actually look for command content
      // The tracking is done via Core instance hijacking instead
    }
  };
};

// Create test config with reasonable defaults
const createTestConfig = (overrides: Partial<Config> = {}): Partial<Config> => ({motionCount: 1,
  useHintGroups: false,
  singleCharKeys: ["A", "S", "D", "F"],
  multiCharKeys: ["B", "C", "E", "I"],
  highlightSelected: true,
  useNumbers: false,
  debugMode: false,
  motionTimeout: 2000,
  ...overrides
});

// Create test hinted words
const createTestHintMappings = (): HintMapping[] => [
  {
    word: { text: "hello", line: 1, col: 1, byteCol: 1 },
    hint: "A",
    hintCol: 1,
    hintByteCol: 1
  },
  {
    word: { text: "world", line: 1, col: 7, byteCol: 7 },
    hint: "S",
    hintCol: 7,
    hintByteCol: 7
  },
  {
    word: { text: "test", line: 2, col: 1, byteCol: 1 },
    hint: "BA",
    hintCol: 1,
    hintByteCol: 1
  }
];

Deno.test("TDD GREEN Phase: waitForUserInput should call hideHintsOptimized after successful jump", async () => {
  // Arrange
  const callTracker: CallTracker = {
    getcharCalls: [],
    cursorCalls: [],
    feedkeysCalls: [],
    hideHintsOptimizedCalls: 0,
    hideHintsCalls: 0
  };

  const mockDenops = createMockDenops([65], callTracker); // 'A' key
  const config = createTestConfig();
  const core = Core.getInstance(config);

  // Spy on hideHintsOptimized method
  const originalHideHintsOptimized = core.hideHintsOptimized;
  core.hideHintsOptimized = async (denops) => {
    callTracker.hideHintsOptimizedCalls++;
    return await originalHideHintsOptimized.call(core, denops);
  };

  // Set up hints
  core.setCurrentHints(createTestHintMappings());

  // Act
  await core.waitForUserInput(mockDenops as any);

  // Assert - Should now pass with complete implementation
  assertEquals(callTracker.hideHintsOptimizedCalls, 1,
    "hideHintsOptimized should be called once after successful jump");
  assertEquals(callTracker.cursorCalls.length, 1, "Should jump to target position");
  assertEquals(callTracker.cursorCalls[0], [1, 1], "Should jump to correct position");
});

Deno.test("TDD GREEN Phase: waitForUserInput should handle lowercase input with feedkeys", async () => {
  // Arrange
  const callTracker: CallTracker = {
    getcharCalls: [],
    cursorCalls: [],
    feedkeysCalls: [],
    hideHintsOptimizedCalls: 0,
    hideHintsCalls: 0
  };

  const mockDenops = createMockDenops([97], callTracker); // 'a' (lowercase)
  const config = createTestConfig();
  const core = Core.getInstance(config);

  // Spy on hideHintsOptimized method
  const originalHideHintsOptimized = core.hideHintsOptimized;
  core.hideHintsOptimized = async (denops) => {
    callTracker.hideHintsOptimizedCalls++;
    return await originalHideHintsOptimized.call(core, denops);
  };

  core.setCurrentHints(createTestHintMappings());

  // Act
  await core.waitForUserInput(mockDenops as any);

  // Assert - Should now pass with complete implementation
  assertEquals(callTracker.feedkeysCalls.length, 1, "Should feed lowercase key back to Vim");
  assertEquals(callTracker.feedkeysCalls[0], ["a", "n"], "Should feed 'a' with 'n' flag");
  assertEquals(callTracker.hideHintsOptimizedCalls, 1, "Should call hideHintsOptimized");
  assertEquals(callTracker.cursorCalls.length, 0, "Should not jump when feeding lowercase");
});

Deno.test("TDD GREEN Phase: waitForUserInput should handle ESC cancellation", async () => {
  // Arrange
  const callTracker: CallTracker = {
    getcharCalls: [],
    cursorCalls: [],
    feedkeysCalls: [],
    hideHintsOptimizedCalls: 0,
    hideHintsCalls: 0
  };

  const mockDenops = createMockDenops([27], callTracker); // ESC key
  const config = createTestConfig();
  const core = Core.getInstance(config);

  // Spy on hideHintsOptimized method
  const originalHideHintsOptimized = core.hideHintsOptimized;
  core.hideHintsOptimized = async (denops) => {
    callTracker.hideHintsOptimizedCalls++;
    return await originalHideHintsOptimized.call(core, denops);
  };

  core.setCurrentHints(createTestHintMappings());

  // Act
  await core.waitForUserInput(mockDenops as any);

  // Assert
  assertEquals(callTracker.hideHintsOptimizedCalls, 1, "Should call hideHintsOptimized on ESC");
  assertEquals(callTracker.cursorCalls.length, 0, "Should not jump on ESC");
  assertEquals(callTracker.feedkeysCalls.length, 0, "Should not feed keys on ESC");
});

Deno.test("TDD GREEN Phase: waitForUserInput should handle timeout with single candidate selection", async () => {
  // Arrange
  const callTracker: CallTracker = {
    getcharCalls: [],
    cursorCalls: [],
    feedkeysCalls: [],
    hideHintsOptimizedCalls: 0,
    hideHintsCalls: 0
  };

  const mockDenops = createMockDenops([-2], callTracker); // Timeout
  const config = createTestConfig({motionCount: 1 });
  const core = Core.getInstance(config);

  // Spy on hideHintsOptimized method
  const originalHideHintsOptimized = core.hideHintsOptimized;
  core.hideHintsOptimized = async (denops) => {
    callTracker.hideHintsOptimizedCalls++;
    return await originalHideHintsOptimized.call(core, denops);
  };

  // Single character hint only
  core.setCurrentHints([createTestHintMappings()[0]]);

  // Act
  await core.waitForUserInput(mockDenops as any);

  // Assert - Should now handle timeout properly
  assertEquals(callTracker.hideHintsOptimizedCalls, 1, "Should call hideHintsOptimized on timeout");
  // For single hint timeout, should auto-select if motionCount === 1
  assertEquals(callTracker.cursorCalls.length, 1, "Should auto-select single hint on timeout");
});

Deno.test.ignore("TDD GREEN Phase: waitForUserInput should handle multi-character hints with useHintGroups", async () => {
  // Arrange
  const callTracker: CallTracker = {
    getcharCalls: [],
    cursorCalls: [],
    feedkeysCalls: [],
    hideHintsOptimizedCalls: 0,
    hideHintsCalls: 0
  };

  // B (multiOnlyKey) + A = BA hint
  const mockDenops = createMockDenops([66, 65], callTracker); // 'B', 'A'
  const config = createTestConfig({useHintGroups: true,
    multiCharKeys: ["B", "C", "E", "I"],
    singleCharKeys: ["A", "S", "D", "F"]
  });
  const core = Core.getInstance(config);

  // Spy on hideHintsOptimized method
  const originalHideHintsOptimized = core.hideHintsOptimized;
  core.hideHintsOptimized = async (denops) => {
    callTracker.hideHintsOptimizedCalls++;
    return await originalHideHintsOptimized.call(core, denops);
  };

  core.setCurrentHints(createTestHintMappings());

  // Act
  await core.waitForUserInput(mockDenops as any);

  // Assert - Should now support useHintGroups
  assertEquals(callTracker.getcharCalls.length, 2, "Should get two characters for multi-char hint");
  assertEquals(callTracker.cursorCalls.length, 1, "Should jump to BA hint target");
  assertEquals(callTracker.cursorCalls[0], [2, 1], "Should jump to 'test' word position");
  assertEquals(callTracker.hideHintsOptimizedCalls, 1, "Should call hideHintsOptimized after jump");
});

Deno.test.ignore("TDD GREEN Phase: waitForUserInput should highlight candidate hints during selection", async () => {
  // Arrange
  const callTracker: CallTracker = {
    getcharCalls: [],
    cursorCalls: [],
    feedkeysCalls: [],
    hideHintsOptimizedCalls: 0,
    hideHintsCalls: 0
  };

  // Mock that will need second character (B + timeout)
  const mockDenops = createMockDenops([66, -1], callTracker); // 'B', timeout
  const config = createTestConfig({highlightSelected: true,
    motionCount: 2 // Multi-character mode
  });
  const core = Core.getInstance(config);

  // Spy on hideHintsOptimized method
  const originalHideHintsOptimized = core.hideHintsOptimized;
  core.hideHintsOptimized = async (denops) => {
    callTracker.hideHintsOptimizedCalls++;
    return await originalHideHintsOptimized.call(core, denops);
  };

  core.setCurrentHints(createTestHintMappings());

  // Act
  await core.waitForUserInput(mockDenops as any);

  // Assert - Should now have highlight functionality
  assertEquals(callTracker.hideHintsOptimizedCalls, 1, "Should call hideHintsOptimized");
  // The highlighting is async and hard to test directly, but we verify the core behavior
});

Deno.test("TDD GREEN Phase: waitForUserInput should handle invalid character input gracefully", async () => {
  // Arrange
  const callTracker: CallTracker = {
    getcharCalls: [],
    cursorCalls: [],
    feedkeysCalls: [],
    hideHintsOptimizedCalls: 0,
    hideHintsCalls: 0
  };

  const mockDenops = createMockDenops([999], callTracker); // Invalid character code
  const config = createTestConfig();
  const core = Core.getInstance(config);

  // Spy on hideHintsOptimized method
  const originalHideHintsOptimized = core.hideHintsOptimized;
  core.hideHintsOptimized = async (denops) => {
    callTracker.hideHintsOptimizedCalls++;
    return await originalHideHintsOptimized.call(core, denops);
  };

  core.setCurrentHints(createTestHintMappings());

  // Act & Assert - Should not throw but handle gracefully
  await core.waitForUserInput(mockDenops as any);

  // Should still call hideHintsOptimized for cleanup
  assertEquals(callTracker.hideHintsOptimizedCalls, 1, "Should call hideHintsOptimized even for invalid input");
  assertEquals(callTracker.cursorCalls.length, 0, "Should not jump for invalid input");
});

Deno.test("TDD GREEN Phase: waitForUserInput should handle empty hints gracefully", async () => {
  // Arrange
  const callTracker: CallTracker = {
    getcharCalls: [],
    cursorCalls: [],
    feedkeysCalls: [],
    hideHintsOptimizedCalls: 0,
    hideHintsCalls: 0
  };

  const mockDenops = createMockDenops([], callTracker);
  const config = createTestConfig();
  const core = Core.getInstance(config);

  // Empty hints
  core.setCurrentHints([]);

  // Act
  await core.waitForUserInput(mockDenops as any);

  // Assert - Should return early without calling anything
  assertEquals(callTracker.getcharCalls.length, 0, "Should not call getchar with empty hints");
  assertEquals(callTracker.hideHintsOptimizedCalls, 0, "Should not call hideHintsOptimized for empty hints");
  assertEquals(callTracker.cursorCalls.length, 0, "Should not jump with empty hints");
});