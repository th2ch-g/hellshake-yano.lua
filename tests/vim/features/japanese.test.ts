/**
 * japanese.ts のテスト
 *
 * TDD Phase: RED
 * Process8-sub1: テストファイル作成
 */

import { assertEquals } from "jsr:@std/assert";
import { VimJapaneseSupport } from "../../../denops/hellshake-yano/vim/features/japanese.ts";

Deno.test("VimJapaneseSupport: 基本機能", async (t) => {
  await t.step("有効/無効切り替え", () => {
    const support = new VimJapaneseSupport({ enabled: false });

    assertEquals(support.isEnabled(), false);
    support.enable();
    assertEquals(support.isEnabled(), true);
    support.disable();
    assertEquals(support.isEnabled(), false);
  });

  await t.step("日本語テキストセグメント化", () => {
    const support = new VimJapaneseSupport({ enabled: true });

    const text = "こんにちは、世界";
    const segments = support.segmentJapaneseText(text);

    assertEquals(Array.isArray(segments), true);
    assertEquals(segments.length > 0, true);
  });

  await t.step("キャッシュ統計", () => {
    const support = new VimJapaneseSupport();
    const stats = support.getCacheStats();

    assertEquals("hits" in stats, true);
    assertEquals("misses" in stats, true);
  });
});
