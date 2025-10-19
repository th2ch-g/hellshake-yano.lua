/**
 * tests/common/types/state.test.ts
 *
 * MotionState型、VisualState型、HandleMotionResult型のテスト
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import type {
  HandleMotionResult,
  MotionState,
  VisualState,
} from "../../../denops/hellshake-yano/common/types/state.ts";
import { createDefaultMotionState } from "../../../denops/hellshake-yano/common/types/state.ts";

Deno.test("MotionState型: 基本的な構造検証", () => {
  const motionState: MotionState = {
    lastMotion: "w",
    lastMotionTime: 1000,
    motionCount: 3,
    timeoutMs: 2000,
    threshold: 2,
  };

  assertExists(motionState);
  assertEquals(motionState.lastMotion, "w");
  assertEquals(motionState.lastMotionTime, 1000);
  assertEquals(motionState.motionCount, 3);
  assertEquals(motionState.timeoutMs, 2000);
  assertEquals(motionState.threshold, 2);
});

Deno.test("VisualState型: 基本的な構造検証", () => {
  const visualState: VisualState = {
    active: true,
    mode: "v",
    startLine: 1,
    startCol: 5,
    endLine: 10,
    endCol: 15,
  };

  assertExists(visualState);
  assertEquals(visualState.active, true);
  assertEquals(visualState.mode, "v");
  assertEquals(visualState.startLine, 1);
  assertEquals(visualState.startCol, 5);
  assertEquals(visualState.endLine, 10);
  assertEquals(visualState.endCol, 15);
});

Deno.test("HandleMotionResult型: 正常系の構造検証", () => {
  const result: HandleMotionResult = {
    shouldTrigger: true,
    count: 3,
  };

  assertExists(result);
  assertEquals(result.shouldTrigger, true);
  assertEquals(result.count, 3);
  assertEquals(result.error, undefined);
});

Deno.test("HandleMotionResult型: エラー時の構造検証", () => {
  const result: HandleMotionResult = {
    shouldTrigger: false,
    count: 0,
    error: "Invalid motion key",
  };

  assertExists(result);
  assertEquals(result.shouldTrigger, false);
  assertEquals(result.count, 0);
  assertEquals(result.error, "Invalid motion key");
});

Deno.test("createDefaultMotionState: デフォルト値を返す", () => {
  const defaultState = createDefaultMotionState();

  assertExists(defaultState);
  assertEquals(defaultState.lastMotion, "");
  assertEquals(defaultState.lastMotionTime, 0);
  assertEquals(defaultState.motionCount, 0);
  assertEquals(typeof defaultState.timeoutMs, "number");
  assertEquals(typeof defaultState.threshold, "number");
});
