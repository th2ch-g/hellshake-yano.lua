/**
 * tests/common/utils/side-effect.test.ts
 */

import { assertEquals } from "jsr:@std/assert";

Deno.test("SideEffectChecker: テストプレースホルダー", () => {
  // side-effect-checker.tsはDenopsインスタンスが必要なため
  // 統合テストで検証する
  assertEquals(true, true);
});
