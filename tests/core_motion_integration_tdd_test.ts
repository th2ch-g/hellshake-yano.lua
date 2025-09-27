/**
 * TDD Red Phase: Core Motion Integration Tests
 *
 * Tests for integrating motion.ts functionality into core.ts
 * Following strict TDD methodology - these tests should FAIL initially
 */

import { assertEquals, assertExists, assertThrows } from "@std/assert";
import { Core } from "../denops/hellshake-yano/core.ts";
import type { UnifiedConfig } from "../denops/hellshake-yano/config.ts";

// Mock Denops for testing
const mockDenops = {
  name: "hellshake-yano",
  meta: {},
} as any;

Deno.test("Motion Integration TDD - Core should have motion counter methods", async () => {
  const core = Core.getInstance();

  // These methods should exist after integration
  assertExists(core.incrementMotionCounter);
  assertExists(core.getMotionCount);
  assertExists(core.resetMotionCounter);
  assertExists(core.setMotionThreshold);
});

Deno.test("Motion Integration TDD - Should track motion count per buffer", async () => {
  const core = Core.getInstance();
  // 前のテストの状態をクリア
  await core.resetMotionCounter(1);
  await core.resetMotionCounter(2);

  // Test motion counting for buffer 1
  const result1 = await core.incrementMotionCounter(mockDenops, 1);
  assertEquals(result1.triggered, false);
  assertEquals(result1.count, 1);

  const result2 = await core.incrementMotionCounter(mockDenops, 1);
  assertEquals(result2.triggered, false);
  assertEquals(result2.count, 2);

  // Test different buffer has separate counter
  const result3 = await core.incrementMotionCounter(mockDenops, 2);
  assertEquals(result3.triggered, false);
  assertEquals(result3.count, 1);
});

Deno.test("Motion Integration TDD - Should trigger callback at threshold", async () => {
  const core = Core.getInstance();
  // 前のテストの状態をクリア
  await core.resetMotionCounter(1);

  // Configure motion settings
  const config: Partial<UnifiedConfig> = {
    motionCounterEnabled: true,
    motionCounterThreshold: 3,
    motionCounterTimeout: 2000,
    showHintOnMotionThreshold: true
  };

  await core.updateConfig(config);

  // Increment to threshold
  await core.incrementMotionCounter(mockDenops, 1);
  await core.incrementMotionCounter(mockDenops, 1);
  const result = await core.incrementMotionCounter(mockDenops, 1);

  assertEquals(result.triggered, true);
  assertEquals(result.count, 0); // Should reset after trigger
});

Deno.test("Motion Integration TDD - Should respect timeout and reset", async () => {
  const core = Core.getInstance();
  // 前のテストの状態をクリア - 別のバッファ番号を使用
  const testBufnr = 10;
  await core.resetMotionCounter(testBufnr);

  const config: Partial<UnifiedConfig> = {
    motionCounterEnabled: true,
    motionCounterThreshold: 5,
    motionCounterTimeout: 100, // Very short timeout for testing
    showHintOnMotionThreshold: false
  };

  await core.updateConfig(config);

  // First increment
  const result1 = await core.incrementMotionCounter(mockDenops, testBufnr);
  assertEquals(result1.count, 1);

  // Wait for timeout
  await new Promise(resolve => setTimeout(resolve, 150));

  // Should reset due to timeout
  const result2 = await core.incrementMotionCounter(mockDenops, testBufnr);
  assertEquals(result2.count, 1); // Reset, so count is 1 again
});

Deno.test("Motion Integration TDD - Should handle motion config validation", async () => {
  const core = Core.getInstance();
  // 前のテストの状態をクリア
  await core.resetMotionCounter(1);

  // Invalid threshold should throw
  assertThrows(
    () => {
      core.updateConfig({
        motionCounterEnabled: true,
        motionCounterThreshold: 0, // Invalid
        motionCounterTimeout: 2000,
        showHintOnMotionThreshold: true
      });
    },
    Error,
    "threshold must be greater than 0"
  );
});

Deno.test("Motion Integration TDD - Should integrate with hint display", async () => {
  const core = Core.getInstance();
  // 前のテストの状態をクリア - 別のバッファ番号を使用
  const testBufnr = 20;
  await core.resetMotionCounter(testBufnr);

  const config: Partial<UnifiedConfig> = {
    motionCounterEnabled: true,
    motionCounterThreshold: 2,
    motionCounterTimeout: 2000,
    showHintOnMotionThreshold: true
  };

  await core.updateConfig(config);

  // Setup buffer content for hint generation
  await core.incrementMotionCounter(mockDenops, testBufnr);
  const result = await core.incrementMotionCounter(mockDenops, testBufnr);

  // Should trigger and potentially show hints
  assertEquals(result.triggered, true);

  // Check if hints were shown (core should track this)
  const hintState = await core.getCurrentHints();
  assertExists(hintState);
});

Deno.test("Motion Integration TDD - Should handle buffer cleanup", async () => {
  const core = Core.getInstance();
  // 前のテストの状態をクリア
  await core.resetMotionCounter(1);
  await core.resetMotionCounter(2);
  await core.resetMotionCounter(3);

  // Add motion counters for multiple buffers
  await core.incrementMotionCounter(mockDenops, 1);
  await core.incrementMotionCounter(mockDenops, 2);
  await core.incrementMotionCounter(mockDenops, 3);

  // Clear specific buffer
  await core.clearMotionCounter(1);
  const count1 = await core.getMotionCount(1);
  assertEquals(count1, 0);

  // Other buffers should remain
  const count2 = await core.getMotionCount(2);
  assertEquals(count2, 1);
});

Deno.test("Motion Integration TDD - Should handle disabled motion tracking", async () => {
  const core = Core.getInstance();
  // 前のテストの状態をクリア
  await core.resetMotionCounter(1);

  const config: Partial<UnifiedConfig> = {
    motionCounterEnabled: false,
    motionCounterThreshold: 3,
    motionCounterTimeout: 2000,
    showHintOnMotionThreshold: true
  };

  await core.updateConfig(config);

  // Motion increment should be no-op when disabled
  const result = await core.incrementMotionCounter(mockDenops, 1);
  assertEquals(result.triggered, false);
  assertEquals(result.count, 0);
});

Deno.test("Motion Integration TDD - Should persist motion settings in config", async () => {
  const core = Core.getInstance();
  // 前のテストの状態をクリア
  await core.resetMotionCounter(1);

  const config: Partial<UnifiedConfig> = {
    motionCounterEnabled: true,
    motionCounterThreshold: 5,
    motionCounterTimeout: 3000,
    showHintOnMotionThreshold: false
  };

  await core.updateConfig(config);

  const currentConfig = await core.getConfig();
  assertEquals(currentConfig.motionCounterEnabled, true);
  assertEquals(currentConfig.motionCounterThreshold, 5);
  assertEquals(currentConfig.motionCounterTimeout, 3000);
  assertEquals(currentConfig.showHintOnMotionThreshold, false);
});