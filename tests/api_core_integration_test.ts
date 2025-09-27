/**
 * process4 sub4-1: api.tsからcore.tsへの統合のためのTDDテスト
 *
 * Red Phase: api.tsの機能がcore.tsに統合されることを確認する失敗テストを作成
 * Green Phase: 最小限の実装でテストを通す
 * Refactor Phase: コードを整理して品質を向上
 */

import { assertEquals, assertExists, assertThrows } from "jsr:@std/assert";
import type { UnifiedConfig } from "../denops/hellshake-yano/config.ts";
import { getDefaultUnifiedConfig } from "../denops/hellshake-yano/config.ts";
import { HellshakeYanoCore } from "../denops/hellshake-yano/core.ts";

/**
 * TDD Red Phase Test 1: HellshakeYanoCoreクラスにAPI機能が統合されているか
 *
 * api.tsの主要機能がcore.tsに統合されるまで失敗するはず
 */
Deno.test("RED: HellshakeYanoCore should have API functionality", () => {
  const config = getDefaultUnifiedConfig();
  const core = new HellshakeYanoCore(config);

  // 基本制御メソッドの存在確認
  assertEquals(typeof core.enable, "function", "HellshakeYanoCore should have enable method");
  assertEquals(typeof core.disable, "function", "HellshakeYanoCore should have disable method");
  assertEquals(typeof core.toggle, "function", "HellshakeYanoCore should have toggle method");
  assertEquals(typeof core.isEnabled, "function", "HellshakeYanoCore should have isEnabled method");
});

/**
 * TDD Red Phase Test 2: 設定管理機能の統合
 *
 * api.tsの設定管理機能がcore.tsに統合されるまで失敗するはず
 */
Deno.test("RED: HellshakeYanoCore should have config management", () => {
  const config = getDefaultUnifiedConfig();
  const core = new HellshakeYanoCore(config);

  // 設定管理メソッドの存在確認
  assertEquals(typeof core.getConfig, "function", "HellshakeYanoCore should have getConfig method");
  assertEquals(typeof core.updateConfig, "function", "HellshakeYanoCore should have updateConfig method");
  assertEquals(typeof core.resetConfig, "function", "HellshakeYanoCore should have resetConfig method");
  assertEquals(typeof core.setCount, "function", "HellshakeYanoCore should have setCount method");
  assertEquals(typeof core.setTimeout, "function", "HellshakeYanoCore should have setTimeout method");
});

/**
 * TDD Red Phase Test 3: ライフサイクル管理機能の統合
 *
 * api.tsのライフサイクル機能がcore.tsに統合されるまで失敗するはず
 */
Deno.test("RED: HellshakeYanoCore should have lifecycle management", () => {
  const config = getDefaultUnifiedConfig();
  const core = new HellshakeYanoCore(config);

  // ライフサイクルメソッドの存在確認
  assertEquals(typeof core.initialize, "function", "HellshakeYanoCore should have initialize method");
  assertEquals(typeof core.cleanup, "function", "HellshakeYanoCore should have cleanup method");
});

/**
 * TDD Red Phase Test 4: デバッグ・統計機能の統合
 *
 * api.tsのデバッグ機能がcore.tsに統合されるまで失敗するはず
 */
Deno.test("RED: HellshakeYanoCore should have debug capabilities", () => {
  const config = getDefaultUnifiedConfig();
  const core = new HellshakeYanoCore(config);

  // デバッグ・統計メソッドの存在確認
  assertEquals(typeof core.getDebugInfo, "function", "HellshakeYanoCore should have getDebugInfo method");
  assertEquals(typeof core.getStatistics, "function", "HellshakeYanoCore should have getStatistics method");
  assertEquals(typeof core.healthCheck, "function", "HellshakeYanoCore should have healthCheck method");
});

/**
 * TDD Red Phase Test 5: ヒント制御機能の統合
 *
 * api.tsのヒント制御機能がcore.tsに統合されるまで失敗するはず
 */
Deno.test("RED: HellshakeYanoCore should have hint control", () => {
  const config = getDefaultUnifiedConfig();
  const core = new HellshakeYanoCore(config);

  // ヒント制御メソッドの存在確認
  assertEquals(typeof core.showHints, "function", "HellshakeYanoCore should have showHints method");
  assertEquals(typeof core.hideHints, "function", "HellshakeYanoCore should have hideHints method");
  assertEquals(typeof core.clearCache, "function", "HellshakeYanoCore should have clearCache method");
});

/**
 * TDD Red Phase Test 6: API互換性の確保
 *
 * 統合後も元のAPIインターフェースと同等の機能が提供されるまで失敗するはず
 */
Deno.test("RED: HellshakeYanoCore should be API compatible", () => {
  const config = getDefaultUnifiedConfig();
  const core = new HellshakeYanoCore(config);

  // API互換性の確認
  const currentConfig = core.getConfig();
  assertEquals(typeof currentConfig, "object", "getConfig should return config object");

  // 基本制御の動作確認
  const enableResult = core.enable();
  assertEquals(core.isEnabled(), true, "enable should make plugin enabled");

  const disableResult = core.disable();
  assertEquals(core.isEnabled(), false, "disable should make plugin disabled");

  const toggleResult = core.toggle();
  assertEquals(typeof toggleResult, "boolean", "toggle should return boolean");
});