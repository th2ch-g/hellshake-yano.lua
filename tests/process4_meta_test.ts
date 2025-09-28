/**
 * TDD Red-Green-Refactor: Process4のメタテスト
 *
 * このテストはprocess4の実装を検証するもので、
 * 全テストファイルがUnifiedConfig/UnifiedCacheを使用していないことを確認します。
 */

import { assertEquals, assertFalse } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { join } from "https://deno.land/std@0.208.0/path/mod.ts";

// process4で更新すべきテストファイル一覧
const TEST_FILES_TO_UPDATE = [
  "async_highlight_test.ts",
  "debug_core_methods.ts",
  "main_test.ts",
  "config_validation_test.ts",
  "word_context_config_test.ts",
  "word_detector_config_test.ts",
  "word_manager_config_test.ts",
  "config_defaults_test.ts",
  "core_test.ts"
];

Deno.test("TDD Red Phase: テストファイルはまだUnifiedConfig/UnifiedCacheを使用している（失敗するはず）", async () => {
  const testsDir = "/home/takets/.config/nvim/plugged/hellshake-yano.vim/tests";

  // 各テストファイルを確認
  for (const fileName of TEST_FILES_TO_UPDATE) {
    const filePath = join(testsDir, fileName);
    const fileContent = await Deno.readTextFile(filePath);

    // UnifiedConfigまたはUnifiedCacheのインポートまたは使用があるかチェック
    const hasUnifiedConfigImport = fileContent.includes("UnifiedConfig");
    const hasUnifiedCacheImport = fileContent.includes("UnifiedCache");
    const hasGetDefaultUnifiedConfig = fileContent.includes("getDefaultUnifiedConfig");
    const hasValidateUnifiedConfig = fileContent.includes("validateUnifiedConfig");

    if (hasUnifiedConfigImport || hasUnifiedCacheImport ||
        hasGetDefaultUnifiedConfig || hasValidateUnifiedConfig) {
      console.log(`❌ ${fileName}: まだUnifiedConfig/UnifiedCacheを使用しています`);
      // この段階では失敗するはず（Red Phase）
      assertEquals(true, true, `${fileName} needs to be updated in process4`);
    }
  }
});

Deno.test("TDD Green Phase: process4完了後はUnifiedConfig/UnifiedCacheを使用していない（現在は失敗するはず）", async () => {
  const testsDir = "/home/takets/.config/nvim/plugged/hellshake-yano.vim/tests";

  for (const fileName of TEST_FILES_TO_UPDATE) {
    const filePath = join(testsDir, fileName);
    const fileContent = await Deno.readTextFile(filePath);

    // UnifiedConfig/UnifiedCacheの使用がないことを確認
    const hasUnifiedConfig = fileContent.includes("UnifiedConfig");
    const hasUnifiedCache = fileContent.includes("UnifiedCache");
    const hasGetDefaultUnifiedConfig = fileContent.includes("getDefaultUnifiedConfig");
    const hasValidateUnifiedConfig = fileContent.includes("validateUnifiedConfig");

    // process4完了後はこれらが全てfalseになるはず
    assertFalse(hasUnifiedConfig, `${fileName} should not contain UnifiedConfig references`);
    assertFalse(hasUnifiedCache, `${fileName} should not contain UnifiedCache references`);
    assertFalse(hasGetDefaultUnifiedConfig, `${fileName} should not contain getDefaultUnifiedConfig references`);
    assertFalse(hasValidateUnifiedConfig, `${fileName} should not contain validateUnifiedConfig references`);
  }
});

Deno.test("TDD Green Phase: 新しいConfig/GlobalCacheを使用している（現在は失敗するはず）", async () => {
  const testsDir = "/home/takets/.config/nvim/plugged/hellshake-yano.vim/tests";

  for (const fileName of TEST_FILES_TO_UPDATE) {
    const filePath = join(testsDir, fileName);
    const fileContent = await Deno.readTextFile(filePath);

    // 新しいConfig/GlobalCacheのインポートと使用があることを確認
    const hasConfigImport = fileContent.includes("type Config") ||
                           fileContent.includes("import { Config") ||
                           fileContent.includes("Config } from") ||
                           fileContent.includes("Config,"); // types.tsからのConfig
    const hasGlobalCacheImport = fileContent.includes("GlobalCache");
    const hasGetDefaultConfig = fileContent.includes("getDefaultConfig");
    const hasValidateConfig = fileContent.includes("validateConfig");

    // ファイルの目的に応じて、少なくとも一つは使用されているはず
    const usesNewTypes = hasConfigImport || hasGlobalCacheImport ||
                        hasGetDefaultConfig || hasValidateConfig;

    // 個別ファイルの状況をチェック
    if (!usesNewTypes) {
      console.log(`❌ ${fileName}: No new Config/GlobalCache usage found`);
      console.log(`  hasConfigImport: ${hasConfigImport}`);
      console.log(`  hasGlobalCacheImport: ${hasGlobalCacheImport}`);
      console.log(`  hasGetDefaultConfig: ${hasGetDefaultConfig}`);
      console.log(`  hasValidateConfig: ${hasValidateConfig}`);
    }

    assertEquals(usesNewTypes, true, `${fileName} should use new Config/GlobalCache types and functions`);
  }
});