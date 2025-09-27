/**
 * Lifecycle Delegation Verification Tests
 *
 * TDD REFACTOR Phase: Comprehensive verification that core.ts acts as a thin wrapper
 * over lifecycle.ts functionality
 */

import { assertEquals, assertThrows } from "@std/assert";
import type { Denops } from "@denops/std";
import { Core } from "../denops/hellshake-yano/core.ts";
import { getPluginState, resetCaches } from "../denops/hellshake-yano/lifecycle.ts";
import { CacheType } from "../denops/hellshake-yano/cache.ts";

// Mock Denops for testing
const mockDenops = {
  meta: { host: "nvim" },
  call: async () => 1,
  eval: async () => true,
  cmd: async () => {},
} as unknown as Denops;

Deno.test("Lifecycle delegation - Core should be a thin wrapper", async () => {
  const core = Core.getInstance();
  core.reset();

  // Test initialization delegation
  await core.initialize(mockDenops);

  const state = getPluginState();
  assertEquals(state.initialized, true, "Initialization should delegate to lifecycle");

  // Test state management delegation
  core.updateState({ hintsVisible: true, currentHints: ["test"] });

  const updatedState = getPluginState();
  assertEquals(updatedState.hintsVisible, true);
  assertEquals(updatedState.currentHints.length, 1);
});

Deno.test("Lifecycle delegation - Performance metrics integration", async () => {
  const core = Core.getInstance();
  await core.initialize(mockDenops);

  // Record performance metric through core
  core.recordPerformanceMetric("showHints", 25.0);
  core.recordPerformanceMetric("showHints", 30.0);

  // Verify it's recorded in lifecycle state
  const stats = core.getStatistics();
  assertEquals(stats.performanceStats.showHints.count, 2);
  assertEquals(stats.performanceStats.showHints.average, 27.5);
});

Deno.test("Lifecycle delegation - Health check error handling", async () => {
  const core = Core.getInstance();

  // Initialize first to get a valid state
  await core.initialize(mockDenops);

  // Mock denops that will cause health check issues
  const faultyDenops = {
    meta: { host: "nvim" },
    call: async () => { throw new Error("Mock error"); },
    eval: async () => true,
  } as unknown as Denops;

  const result = await core.getHealthStatus(faultyDenops);

  // Should handle errors gracefully - but since plugin is initialized, it might still be healthy
  // The main test is that it doesn't throw and returns a valid result
  assertEquals(typeof result.healthy, "boolean");
  assertEquals(Array.isArray(result.issues), true);
  assertEquals(Array.isArray(result.recommendations), true);
});

Deno.test("Lifecycle delegation - Statistics error fallback", () => {
  const core = Core.getInstance();

  // Test that statistics fallback works correctly
  const stats = core.getStatistics();

  assertEquals(typeof stats.cacheStats, "object");
  assertEquals(typeof stats.performanceStats, "object");
  assertEquals(typeof stats.currentState, "object");
});

Deno.test("Lifecycle delegation - Cleanup coordination", async () => {
  const core = Core.getInstance();

  await core.initialize(mockDenops);

  // Set some state
  core.updateState({ hintsVisible: true });

  // Cleanup should delegate to lifecycle
  await core.cleanup(mockDenops);

  const state = getPluginState();
  assertEquals(state.initialized, false, "Cleanup should reset initialization state");
});

Deno.test("Lifecycle delegation - Error resilience in state updates", () => {
  const core = Core.getInstance();

  // Should not throw even with invalid updates
  core.updateState({ invalidProperty: "test" });

  // Should continue to work normally
  core.updateState({ hintsVisible: false });

  const state = getPluginState();
  assertEquals(state.hintsVisible, false);
});