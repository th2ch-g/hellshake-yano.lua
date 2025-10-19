/**
 * tests/common/utils/base.test.ts
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import {
  getStateCopy,
  getSingletonInstance,
  initializeState,
  withFallback,
} from "../../../denops/hellshake-yano/common/utils/base.ts";

Deno.test("getSingletonInstance: 新規インスタンスを作成", () => {
  const result = getSingletonInstance(undefined, () => ({ value: 42 }));
  assertEquals(result.value, 42);
});

Deno.test("getSingletonInstance: 既存インスタンスを返す", () => {
  const existing = { value: 100 };
  const result = getSingletonInstance(existing, () => ({ value: 42 }));
  assertEquals(result.value, 100);
});

Deno.test("initializeState: ディープコピーを作成", () => {
  const original = { a: 1, b: { c: 2 } };
  const copy = initializeState(original);
  copy.b.c = 999;
  assertEquals(original.b.c, 2); // 元のオブジェクトは変更されない
});

Deno.test("getStateCopy: ディープコピーを返す", () => {
  const original = { x: 1, y: { z: 2 } };
  const copy = getStateCopy(original);
  copy.y.z = 999;
  assertEquals(original.y.z, 2); // 元のオブジェクトは変更されない
});

Deno.test("withFallback: 成功時に結果を返す", async () => {
  const result = await withFallback(async () => "success", "fallback", "TestContext");
  assertEquals(result, "success");
});

Deno.test("withFallback: エラー時にフォールバック値を返す", async () => {
  const result = await withFallback(
    async () => {
      throw new Error("Failed");
    },
    "fallback",
    "TestContext",
  );
  assertEquals(result, "fallback");
});
