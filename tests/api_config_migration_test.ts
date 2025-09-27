/**
 * api.ts Config型 → UnifiedConfig型移行のためのTDDテスト
 *
 * Red Phase: Config型をUnifiedConfig型に変更した時の失敗テストを作成
 * Green Phase: 最小限の実装でテストを通す
 * Refactor Phase: コードを整理して品質を向上
 */

import { assertEquals, assertThrows, assertExists } from "jsr:@std/assert";
import type { UnifiedConfig } from "../denops/hellshake-yano/config.ts";
import { getDefaultUnifiedConfig } from "../denops/hellshake-yano/config.ts";
import { HellshakeYanoAPIImpl } from "../denops/hellshake-yano/api.ts";

/**
 * TDD Red Phase Test 1: api.tsがUnifiedConfigをインポートしているか
 *
 * 現在はConfig型をインポートしているため、このテストは失敗するはず
 */
Deno.test("RED: api.ts should import UnifiedConfig type", async () => {
  const apiSource = await Deno.readTextFile("./denops/hellshake-yano/api.ts");

  // UnifiedConfigのインポートが存在する
  assertEquals(
    apiSource.includes('import type { UnifiedConfig'),
    true,
    "api.ts should import UnifiedConfig type"
  );

  // 古いConfig型のインポートは残すが、UnifiedConfigも追加されるべき
  assertEquals(
    apiSource.includes('import type { Config, HighlightColor }'),
    false,
    "api.ts should import UnifiedConfig alongside existing types"
  );
});

/**
 * TDD Red Phase Test 2: HellshakeYanoAPIインターフェースがUnifiedConfigを使用するか
 *
 * 現在はConfig型を使用しているため失敗するはず
 */
Deno.test("RED: HellshakeYanoAPI should use UnifiedConfig in methods", async () => {
  const apiSource = await Deno.readTextFile("./denops/hellshake-yano/api.ts");

  // getConfig()メソッドの戻り値型をチェック
  const getConfigMatch = apiSource.match(/getConfig\(\)\s*:\s*(\w+)/);
  assertEquals(
    getConfigMatch?.[1],
    "UnifiedConfig",
    "getConfig() should return UnifiedConfig type"
  );

  // updateConfig()メソッドのパラメータ型をチェック
  const updateConfigMatch = apiSource.match(/updateConfig\(config:\s*Partial<(\w+)>\)/);
  assertEquals(
    updateConfigMatch?.[1],
    "UnifiedConfig",
    "updateConfig() should accept Partial<UnifiedConfig>"
  );
});

/**
 * TDD Green Phase Test 3: HellshakeYanoAPIImplクラスがcore.tsに統合済みでUnifiedConfigを使用するか
 *
 * process4 sub4-1統合後の新しい実装を確認
 */
Deno.test("GREEN: HellshakeYanoAPIImpl should use core delegation with UnifiedConfig", async () => {
  const apiSource = await Deno.readTextFile("./denops/hellshake-yano/api.ts");

  // core.tsを委譲するprivateプロパティをチェック
  const privateCoreMatch = apiSource.match(/private\s+core:\s*(\w+)/);
  assertEquals(
    privateCoreMatch?.[1],
    "HellshakeYanoCore",
    "HellshakeYanoAPIImpl should use HellshakeYanoCore for delegation"
  );

  // constructorのパラメータ型をチェック
  const constructorMatch = apiSource.match(/constructor\(initialConfig:\s*(\w+)/);
  assertEquals(
    constructorMatch?.[1],
    "UnifiedConfig",
    "constructor should accept UnifiedConfig parameter"
  );

  // core.tsへの委譲コメントをチェック
  assertEquals(
    apiSource.includes("core.tsに委譲"),
    true,
    "Should indicate delegation to core.ts"
  );
});

/**
 * TDD Red Phase Test 4: APIインスタンスがUnifiedConfigで動作するか
 *
 * 現在はConfig型を期待しているため失敗するはず
 */
Deno.test("RED: API instance should work with UnifiedConfig", () => {
  const unifiedConfig = getDefaultUnifiedConfig();

  // UnifiedConfigはサポートされている
  const api = new HellshakeYanoAPIImpl(unifiedConfig);
  assertExists(api);
});

/**
 * TDD Red Phase Test 5: API型エクスポートにUnifiedConfigが含まれるか
 *
 * 現在はUnifiedConfig型をエクスポートしていないため失敗するはず
 */
Deno.test("RED: api.ts should export UnifiedConfig type", async () => {
  const apiSource = await Deno.readTextFile("./denops/hellshake-yano/api.ts");

  // 型エクスポート行をチェック
  const typeExportMatch = apiSource.match(
    /export\s+type\s*\{\s*([^}]+)\s*\}\s*from\s*["']\.\/config\.ts["']/
  );

  assertEquals(
    typeExportMatch?.[1].includes('UnifiedConfig'),
    true,
    "api.ts should export UnifiedConfig type from config.ts"
  );
});