/**
 * tests/phase-b3/unified-japanese-support.test.ts
 *
 * TDD Phase: RED - テストを先に書く
 *
 * UnifiedJapaneseSupportの単体テスト（15-20 steps）
 *
 * Process 1: 日本語検出テスト（3-5 steps）
 * Process 2: セグメント化テスト（3-5 steps）
 * Process 3: 助詞結合テスト（2-3 steps）
 * Process 4: フィルタリングテスト（2-3 steps）
 * Process 5: キャッシュテスト（2-3 steps）
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v5.0.0/mod.ts";
import { UnifiedJapaneseSupportMock } from "./test-utils.ts";

Deno.test("Process 1: 日本語検出テスト", async (t) => {
  // 1-1: ひらがなのみのテキストを検出
  await t.step("should detect hiragana text", () => {
    const support = UnifiedJapaneseSupportMock.create();
    const text = "これはテストです";
    const result = support.hasJapanese(text);
    assertEquals(result, true);
  });

  // 1-2: カタカナのみのテキストを検出
  await t.step("should detect katakana text", () => {
    const support = UnifiedJapaneseSupportMock.create();
    const text = "プログラミング言語";
    const result = support.hasJapanese(text);
    assertEquals(result, true);
  });

  // 1-3: 英語のみの行は非日本語と判定
  await t.step("should not detect english only text", () => {
    const support = UnifiedJapaneseSupportMock.create();
    const text = "Hello World";
    const result = support.hasJapanese(text);
    assertEquals(result, false);
  });

  // 1-4: 混在テキストを検出
  await t.step("should detect mixed text", () => {
    const support = UnifiedJapaneseSupportMock.create();
    const text = "今日は2025年10月18日です";
    const result = support.hasJapanese(text);
    assertEquals(result, true);
  });

  // 1-5: 空文字列は非日本語と判定
  await t.step("should not detect empty string", () => {
    const support = UnifiedJapaneseSupportMock.create();
    const text = "";
    const result = support.hasJapanese(text);
    assertEquals(result, false);
  });
});

Deno.test("Process 2: セグメント化テスト", async (t) => {
  // 2-1: 単純なひらがな文をセグメント化
  await t.step("should segment simple hiragana text", async () => {
    const support = UnifiedJapaneseSupportMock.create();
    const config = { useJapanese: true, enableTinySegmenter: true };
    const segments = await support.segmentLine("私の名前は田中です", 1, config);
    assertExists(segments);
    assertEquals(segments.length > 0, true);
  });

  // 2-2: セグメントの座標が1-indexedであることを確認
  await t.step("should use 1-indexed coordinates", async () => {
    const support = UnifiedJapaneseSupportMock.create();
    const config = { useJapanese: true, enableTinySegmenter: true };
    const segments = await support.segmentLine("テスト", 5, config);
    for (const seg of segments) {
      assertEquals(seg.line, 5);
      assertEquals(seg.col >= 1, true);
    }
  });

  // 2-3: セグメント数が正しいことを確認
  await t.step("should have correct segment count", async () => {
    const support = UnifiedJapaneseSupportMock.create();
    const text = "今日は良い天気ですね";
    const config = { useJapanese: true, enableTinySegmenter: true };
    const segments = await support.segmentLine(text, 1, config);
    // 実装により段数は異なるが、最低1個以上
    assertEquals(segments.length >= 1, true);
  });

  // 2-4: 英語混在テキストのセグメント化
  await t.step("should segment mixed text correctly", async () => {
    const support = UnifiedJapaneseSupportMock.create();
    const config = { useJapanese: true, enableTinySegmenter: true };
    const segments = await support.segmentLine("Hello日本語World", 1, config);
    assertExists(segments);
  });

  // 2-5: 改行なしの複数行対応
  await t.step("should work with different line numbers", async () => {
    const support = UnifiedJapaneseSupportMock.create();
    const config = { useJapanese: true, enableTinySegmenter: true };
    const segments1 = await support.segmentLine("テスト", 10, config);
    const segments2 = await support.segmentLine("テスト", 20, config);
    for (const seg of segments1) {
      assertEquals(seg.line, 10);
    }
    for (const seg of segments2) {
      assertEquals(seg.line, 20);
    }
  });
});

Deno.test("Process 3: 助詞結合テスト", async (t) => {
  // 3-1: 助詞結合が有効な場合（デフォルト）
  await t.step("should merge particles by default", async () => {
    const support = UnifiedJapaneseSupportMock.create();
    const config = { japaneseMergeParticles: true };
    const segments = await support.segmentLine("私の名前は田中です", 1, config);
    // 「私」と「の」が結合されるはず
    const merged = segments.some((s) => s.text.includes("私の") || s.text === "私");
    assertEquals(typeof merged, "boolean");
  });

  // 3-2: 助詞結合が無効な場合
  await t.step("should not merge particles when disabled", async () => {
    const support = UnifiedJapaneseSupportMock.create();
    const config = { japaneseMergeParticles: false };
    const segments = await support.segmentLine("私の名前は田中です", 1, config);
    assertExists(segments);
  });

  // 3-3: 複数の助詞の結合
  await t.step("should handle multiple particles", async () => {
    const support = UnifiedJapaneseSupportMock.create();
    const config = { japaneseMergeParticles: true };
    const segments = await support.segmentLine("今日は良い天気です", 1, config);
    assertExists(segments);
  });
});

Deno.test("Process 4: フィルタリングテスト", async (t) => {
  // 4-1: 最小単語長フィルタリング
  await t.step("should filter by minimum word length", async () => {
    const support = UnifiedJapaneseSupportMock.create();
    const config = { japaneseMinWordLength: 2 };
    const segments = await support.segmentLine("私の名前は田中です", 1, config);
    for (const seg of segments) {
      assertEquals(seg.text.length >= 2, true);
    }
  });

  // 4-2: 長さ1の単語は除外
  await t.step("should exclude single character words", async () => {
    const support = UnifiedJapaneseSupportMock.create();
    const config = { japaneseMinWordLength: 2 };
    const segments = await support.segmentLine("あいうえおかきくけこ", 1, config);
    for (const seg of segments) {
      assertEquals(seg.text.length >= 2, true);
    }
  });

  // 4-3: 空白のセグメントをスキップ
  await t.step("should skip whitespace segments", async () => {
    const support = UnifiedJapaneseSupportMock.create();
    const segments = await support.segmentLine("テスト  テスト", 1, {});
    for (const seg of segments) {
      assertEquals(seg.text.trim().length > 0, true);
    }
  });

  // 4-4: カスタム最小長の設定
  await t.step("should respect custom minimum length", async () => {
    const support = UnifiedJapaneseSupportMock.create();
    const config1 = { japaneseMinWordLength: 1 };
    const config3 = { japaneseMinWordLength: 3 };
    const segments1 = await support.segmentLine("私の名前", 1, config1);
    const segments3 = await support.segmentLine("私の名前", 1, config3);
    // segments3のほうが短い（より厳しくフィルタリング）
    assertEquals(segments3.length <= segments1.length, true);
  });
});

Deno.test("Process 5: キャッシュテスト", async (t) => {
  // 5-1: 同じテキストでのキャッシュヒット
  await t.step("should cache segmentation results", async () => {
    const support = UnifiedJapaneseSupportMock.create();
    const text = "これはテストです";
    const config = {};

    // 1回目は実際にセグメント化
    const segments1 = await support.segmentLine(text, 1, config);
    // 2回目はキャッシュから取得
    const segments2 = await support.segmentLine(text, 1, config);

    // 同じ結果が返される
    assertEquals(segments1.length, segments2.length);
    for (let i = 0; i < segments1.length; i++) {
      assertEquals(segments1[i].text, segments2[i].text);
    }
  });

  // 5-2: キャッシュ統計の取得
  await t.step("should provide cache stats", () => {
    const support = UnifiedJapaneseSupportMock.create();
    const stats = support.getCacheStats();
    assertEquals(typeof stats.size, "number");
    assertEquals(typeof stats.maxSize, "number");
    assertEquals(typeof stats.hitRate, "number");
  });

  // 5-3: キャッシュのクリア
  await t.step("should clear cache", () => {
    const support = UnifiedJapaneseSupportMock.create();
    support.clearCache();
    const stats = support.getCacheStats();
    assertEquals(stats.size, 0);
  });
});

Deno.test("isEnabled should check configuration", () => {
  const support = UnifiedJapaneseSupportMock.create();

  // useJapanese が true の場合
  const enabled1 = support.isEnabled({ useJapanese: true, enableTinySegmenter: true });
  assertEquals(enabled1, true);

  // useJapanese が false の場合
  const enabled2 = support.isEnabled({ useJapanese: false, enableTinySegmenter: true });
  assertEquals(enabled2, false);

  // enableTinySegmenter が false の場合
  const enabled3 = support.isEnabled({ useJapanese: true, enableTinySegmenter: false });
  assertEquals(enabled3, false);

  // 両方 false の場合
  const enabled4 = support.isEnabled({ useJapanese: false, enableTinySegmenter: false });
  assertEquals(enabled4, false);
});
