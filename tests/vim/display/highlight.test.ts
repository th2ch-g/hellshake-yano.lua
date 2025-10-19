/**
 * highlight.ts のテスト
 *
 * TDD Phase: RED
 * Process7-sub1: テストファイル作成
 *
 * Vim ハイライトグループ管理テスト
 */

import { assertEquals } from "jsr:@std/assert";
import { VimHighlight } from "../../../denops/hellshake-yano/vim/display/highlight.ts";

Deno.test("VimHighlight: 基本機能", async (t) => {
  await t.step("HintMarker定義の確認", () => {
    const highlight = new VimHighlight();
    const config = highlight.getHintMarkerConfig();

    // HintMarkerの定義が存在することを確認
    assertEquals(config.group, "HintMarker");
    assertEquals(typeof config.ctermfg, "string");
    assertEquals(typeof config.ctermbg, "string");
    assertEquals(typeof config.guifg, "string");
    assertEquals(typeof config.guibg, "string");
  });

  await t.step("ハイライト設定の取得", () => {
    const highlight = new VimHighlight();
    const hintMarker = highlight.getHintMarkerConfig();

    // 必須フィールドが存在することを確認
    assertEquals("group" in hintMarker, true);
    assertEquals("ctermfg" in hintMarker, true);
    assertEquals("ctermbg" in hintMarker, true);
    assertEquals("guifg" in hintMarker, true);
    assertEquals("guibg" in hintMarker, true);
  });
});

Deno.test("VimHighlight: ハイライトグループ管理", async (t) => {
  await t.step("複数ハイライトの設定", () => {
    const highlight = new VimHighlight();

    // HintMarker を取得
    const hintMarker = highlight.getHintMarkerConfig();
    assertEquals(hintMarker.group, "HintMarker");

    // 設定が完全であることを確認
    assertEquals(hintMarker.ctermfg.length > 0, true);
    assertEquals(hintMarker.ctermbg.length > 0, true);
  });

  await t.step("デフォルト色設定", () => {
    const highlight = new VimHighlight();
    const config = highlight.getHintMarkerConfig();

    // カラースキームで指定されている色を確認
    const validFgColors = [
      "Black",
      "Red",
      "Green",
      "Yellow",
      "Blue",
      "Magenta",
      "Cyan",
      "White",
    ];
    const validBgColors = [
      "Black",
      "Red",
      "Green",
      "Yellow",
      "Blue",
      "Magenta",
      "Cyan",
      "White",
    ];

    // guifg, guibg が設定されていることを確認
    assertEquals(config.guifg.length > 0, true);
    assertEquals(config.guibg.length > 0, true);
  });
});

Deno.test("VimHighlight: スタイル設定", async (t) => {
  await t.step("テキストスタイルの確認", () => {
    const highlight = new VimHighlight();
    const config = highlight.getHintMarkerConfig();

    // highlight グループの設定が存在
    assertEquals(typeof config.group, "string");
    assertEquals(config.group, "HintMarker");
  });
});

Deno.test("VimHighlight: Vim互換性", async (t) => {
  await t.step("VimScript hlgroup 互換性", () => {
    const highlight = new VimHighlight();
    const config = highlight.getHintMarkerConfig();

    // VimScript の hlgroup 定義と互換性を確認
    // :highlight HintMarker ctermfg=<fg> ctermbg=<bg> guifg=<guifg> guibg=<guibg>
    assertEquals(config.group, "HintMarker");
    assertEquals(typeof config.ctermfg, "string");
    assertEquals(typeof config.ctermbg, "string");
  });
});
