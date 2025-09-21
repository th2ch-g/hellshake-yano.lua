import { assertEquals } from "https://deno.land/std@0.204.0/testing/asserts.ts";
import { BATCH_BATCH_SIZE, BATCH_PROCESS_THRESHOLD } from "../denops/hellshake-yano/hint.ts";

Deno.test("sortWordsByDistanceOptimized uses 500 threshold", () => {
  assertEquals(BATCH_PROCESS_THRESHOLD, 500);
});

Deno.test("sortWordsInBatches uses 250 batch size", () => {
  assertEquals(BATCH_BATCH_SIZE, 250);
});
