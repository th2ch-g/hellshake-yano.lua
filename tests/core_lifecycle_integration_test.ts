/**
 * Core Lifecycle Integration Tests
 *
 * TDD RED Phase: Failing tests for lifecycle.ts integration into core.ts
 * Tests the delegation pattern where core.ts becomes a thin wrapper over lifecycle.ts
 */

import { assertEquals, assertThrows } from "@std/assert";
import type { Denops } from "@denops/std";
import { Core, getPluginState, updatePluginState } from "../denops/hellshake-yano/core.ts";
// Lifecycle functions have been integrated into Core class

// Mock Denops for testing
const mockDenops = {
  meta: { host: "nvim" },
  call: async () => 1,
  eval: async () => true,
} as unknown as Denops;

Deno.test("Core lifecycle integration - initialize should delegate to lifecycle", async () => {
  const core = Core.getInstance();

  // Reset state before test
  core.reset();

  // Should delegate to lifecycle.initializePlugin
  await core.initialize(mockDenops);

  const state = getPluginState();
  assertEquals(state.initialized, true);
});

Deno.test("Core lifecycle integration - cleanup should delegate to lifecycle", async () => {
  const core = Core.getInstance();

  // Initialize first
  await core.initialize(mockDenops);

  // Should delegate to lifecycle.cleanupPlugin
  await core.cleanup(mockDenops);

  const state = getPluginState();
  assertEquals(state.initialized, false);
});

Deno.test("Core lifecycle integration - health check delegation", async () => {
  const core = Core.getInstance();

  await core.initialize(mockDenops);

  // Should delegate to lifecycle.healthCheck
  const result = await core.getHealthStatus(mockDenops);

  assertEquals(typeof result.healthy, "boolean");
  assertEquals(Array.isArray(result.issues), true);
  assertEquals(Array.isArray(result.recommendations), true);
});

Deno.test("Core lifecycle integration - statistics delegation", async () => {
  const core = Core.getInstance();

  await core.initialize(mockDenops);

  // Should delegate to lifecycle.getPluginStatistics
  const stats = core.getStatistics();

  assertEquals(typeof stats.cacheStats, "object");
  assertEquals(typeof stats.performanceStats, "object");
  assertEquals(typeof stats.currentState, "object");
});

Deno.test("Core lifecycle integration - state management delegation", async () => {
  const core = Core.getInstance();

  await core.initialize(mockDenops);

  // Should delegate to lifecycle state management
  core.updateState({ hintsVisible: true });

  const state = getPluginState();
  assertEquals(state.hintsVisible, true);
});

Deno.test("Core lifecycle integration - performance metrics delegation", async () => {
  const core = Core.getInstance();

  await core.initialize(mockDenops);

  // Should delegate performance tracking to lifecycle
  core.recordPerformanceMetric("showHints", 25.5);

  const stats = core.getStatistics();
  assertEquals(stats.performanceStats.showHints.count > 0, true);
});