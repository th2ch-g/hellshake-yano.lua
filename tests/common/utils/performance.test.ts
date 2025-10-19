/**
 * tests/common/utils/performance.test.ts
 */

import { assertEquals } from "jsr:@std/assert";
import {
  getPerformanceMetrics,
  recordPerformance,
  resetPerformanceMetrics,
} from "../../../denops/hellshake-yano/common/utils/performance.ts";

Deno.test("recordPerformance: パフォーマンス記録", () => {
  resetPerformanceMetrics();
  recordPerformance("showHints", 10.5);
  const metrics = getPerformanceMetrics();
  assertEquals(metrics.showHints.length, 1);
  assertEquals(metrics.showHints[0], 10.5);
});

Deno.test("resetPerformanceMetrics: メトリクスリセット", () => {
  recordPerformance("showHints", 10);
  resetPerformanceMetrics();
  const metrics = getPerformanceMetrics();
  assertEquals(metrics.showHints.length, 0);
});
