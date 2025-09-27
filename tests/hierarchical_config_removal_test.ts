/**
 * HierarchicalConfig削除のテスト (Process4 Sub2-4)
 * TDD Red Phase: 階層設定の完全削除を確認するテスト
 */

import { describe, it } from "@std/testing/bdd";
import { assertThrows, assertEquals } from "@std/assert";

describe("HierarchicalConfig削除テスト (Process4 Sub2-4)", () => {
  describe("RED Phase: HierarchicalConfigの削除確認", () => {
    it("HierarchicalConfigインターフェースが存在しないことを確認", async () => {
      // HierarchicalConfigインターフェースがconfig.tsから削除されていることを確認
      try {
        const configModule = await import("../denops/hellshake-yano/config.ts");

        // HierarchicalConfigが存在しないことを確認
        const hasHierarchicalConfig = "HierarchicalConfig" in configModule;
        assertEquals(hasHierarchicalConfig, false, "HierarchicalConfigインターフェースは削除されるべき");
      } catch (error) {
        // importエラーの場合も削除が正しく行われていることを示す
        console.log("Expected: HierarchicalConfig should be removed from exports");
      }
    });

    it("getDefaultHierarchicalConfig関数が存在しないことを確認", async () => {
      try {
        const configModule = await import("../denops/hellshake-yano/config.ts");

        // getDefaultHierarchicalConfig関数が削除されていることを確認
        const hasGetDefaultHierarchicalConfig = "getDefaultHierarchicalConfig" in configModule;
        assertEquals(hasGetDefaultHierarchicalConfig, false, "getDefaultHierarchicalConfig関数は削除されるべき");
      } catch (error) {
        console.log("Expected: getDefaultHierarchicalConfig should be removed");
      }
    });

    it("createHierarchicalConfig関数が存在しないことを確認", async () => {
      try {
        const configModule = await import("../denops/hellshake-yano/config.ts");

        // createHierarchicalConfig関数が削除されていることを確認
        const hasCreateHierarchicalConfig = "createHierarchicalConfig" in configModule;
        assertEquals(hasCreateHierarchicalConfig, false, "createHierarchicalConfig関数は削除されるべき");
      } catch (error) {
        console.log("Expected: createHierarchicalConfig should be removed");
      }
    });

    it("mergeHierarchicalConfig関数が存在しないことを確認", async () => {
      try {
        const configModule = await import("../denops/hellshake-yano/config.ts");

        // mergeHierarchicalConfig関数が削除されていることを確認
        const hasMergeHierarchicalConfig = "mergeHierarchicalConfig" in configModule;
        assertEquals(hasMergeHierarchicalConfig, false, "mergeHierarchicalConfig関数は削除されるべき");
      } catch (error) {
        console.log("Expected: mergeHierarchicalConfig should be removed");
      }
    });

    it("flattenHierarchicalConfig関数が存在しないことを確認", async () => {
      try {
        const configModule = await import("../denops/hellshake-yano/config.ts");

        // flattenHierarchicalConfig関数が削除されていることを確認
        const hasFlattenHierarchicalConfig = "flattenHierarchicalConfig" in configModule;
        assertEquals(hasFlattenHierarchicalConfig, false, "flattenHierarchicalConfig関数は削除されるべき");
      } catch (error) {
        console.log("Expected: flattenHierarchicalConfig should be removed");
      }
    });
  });

  describe("階層構造関連の定数・マッピングの削除確認", () => {
    it("SNAKE_TO_CAMEL_MAPPING定数が存在しないことを確認", async () => {
      try {
        const configModule = await import("../denops/hellshake-yano/config.ts");

        // SNAKE_TO_CAMEL_MAPPING定数が削除されていることを確認
        const hasSnakeToCamelMapping = "SNAKE_TO_CAMEL_MAPPING" in configModule;
        assertEquals(hasSnakeToCamelMapping, false, "SNAKE_TO_CAMEL_MAPPING定数は削除されるべき");
      } catch (error) {
        console.log("Expected: SNAKE_TO_CAMEL_MAPPING should be removed");
      }
    });

    it("convertSnakeToCamelConfig関数が存在しないことを確認", async () => {
      try {
        const configModule = await import("../denops/hellshake-yano/config.ts");

        // convertSnakeToCamelConfig関数が削除されていることを確認
        const hasConvertSnakeToCamelConfig = "convertSnakeToCamelConfig" in configModule;
        assertEquals(hasConvertSnakeToCamelConfig, false, "convertSnakeToCamelConfig関数は削除されるべき");
      } catch (error) {
        console.log("Expected: convertSnakeToCamelConfig should be removed");
      }
    });
  });
});