/**
 * tests/common/types/vimscript.test.ts
 *
 * VimScript互換性型のテスト
 */

import { assertEquals } from "jsr:@std/assert";

Deno.test("VimScript互換性型: テストプレースホルダー", () => {
  // VimScriptWord型はword.tsに統合済み
  // 現時点では追加の互換性型がないためプレースホルダー
  assertEquals(true, true);
});
