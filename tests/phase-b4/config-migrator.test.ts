/**
 * Config Migrator Test - Phase B-4 TDD Implementation
 * REDフェーズ: 失敗するテストから開始
 */
import { assertEquals, assertExists } from "jsr:@std/assert@1.0.9";
import { describe, it } from "jsr:@std/testing@1.0.7/bdd";
import type { Denops } from "jsr:@denops/std@7.4.0";

// これから実装するConfigMigratorをインポート
import {
  ConfigMigrator,
  MigrationResult,
  MigrationStatus,
} from "../../denops/hellshake-yano/phase-b4/config-migrator.ts";

describe("ConfigMigrator", () => {
  describe("migrate", () => {
    it("should migrate old config when only old config exists", async () => {
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "exists('g:hellshake_yano_vim_config')") {
            return 1; // Old config exists
          }
          if (expr === "exists('g:hellshake_yano')") {
            return 0; // New config does not exist
          }
          if (expr === "g:hellshake_yano_vim_config") {
            return {
              hint_chars: "asd",
              motion_threshold: 3,
              motion_enabled: true,
            };
          }
          return undefined;
        },
        cmd: async (command: string) => {
          // Mock for setting new config
        },
      } as unknown as Denops;

      const migrator = new ConfigMigrator(mockDenops);
      const result = await migrator.migrate();

      assertEquals(result.status, "migrated");
      assertEquals(result.oldConfigExists, true);
      assertEquals(result.newConfigExists, false);
      assertExists(result.migratedConfig);
      assertEquals(result.migratedConfig?.markers, ["a", "s", "d"]);
      assertEquals(result.migratedConfig?.motionCount, 3);
      assertEquals(result.migratedConfig?.motionCounterEnabled, true);
    });

    it("should skip migration when both configs exist", async () => {
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "exists('g:hellshake_yano_vim_config')") {
            return 1; // Old config exists
          }
          if (expr === "exists('g:hellshake_yano')") {
            return 1; // New config also exists
          }
          return undefined;
        },
      } as unknown as Denops;

      const migrator = new ConfigMigrator(mockDenops);
      const result = await migrator.migrate();

      assertEquals(result.status, "both_exist");
      assertEquals(result.oldConfigExists, true);
      assertEquals(result.newConfigExists, true);
      assertEquals(result.warnings.length, 1);
      assertEquals(
        result.warnings[0],
        "Both old and new configurations exist. Using new configuration.",
      );
    });

    it("should skip migration when only new config exists", async () => {
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "exists('g:hellshake_yano_vim_config')") {
            return 0; // Old config does not exist
          }
          if (expr === "exists('g:hellshake_yano')") {
            return 1; // New config exists
          }
          return undefined;
        },
      } as unknown as Denops;

      const migrator = new ConfigMigrator(mockDenops);
      const result = await migrator.migrate();

      assertEquals(result.status, "new_only");
      assertEquals(result.oldConfigExists, false);
      assertEquals(result.newConfigExists, true);
      assertEquals(result.migratedConfig, undefined);
    });

    it("should skip migration when no config exists", async () => {
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "exists('g:hellshake_yano_vim_config')") {
            return 0; // Old config does not exist
          }
          if (expr === "exists('g:hellshake_yano')") {
            return 0; // New config does not exist
          }
          return undefined;
        },
      } as unknown as Denops;

      const migrator = new ConfigMigrator(mockDenops);
      const result = await migrator.migrate();

      assertEquals(result.status, "none");
      assertEquals(result.oldConfigExists, false);
      assertEquals(result.newConfigExists, false);
      assertEquals(result.migratedConfig, undefined);
    });

    it("should handle errors gracefully", async () => {
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "exists('g:hellshake_yano_vim_config')") {
            return 1;
          }
          if (expr === "exists('g:hellshake_yano')") {
            return 0;
          }
          if (expr === "g:hellshake_yano_vim_config") {
            throw new Error("Failed to read config");
          }
          return undefined;
        },
      } as unknown as Denops;

      const migrator = new ConfigMigrator(mockDenops);
      const result = await migrator.migrate();

      assertEquals(result.status, "error");
      assertExists(result.error);
      assertEquals(result.error, "Failed to read config");
    });

    it("should show warning message when migration is performed", async () => {
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "exists('g:hellshake_yano_vim_config')") {
            return 1;
          }
          if (expr === "exists('g:hellshake_yano')") {
            return 0;
          }
          if (expr === "g:hellshake_yano_vim_config") {
            return { hint_chars: "abc" };
          }
          return undefined;
        },
        cmd: async (command: string) => {
          // Mock for commands
        },
      } as unknown as Denops;

      const migrator = new ConfigMigrator(mockDenops);
      const result = await migrator.migrate();

      assertEquals(result.status, "migrated");
      assertEquals(result.warnings.length > 0, true);
      // Should have a migration success warning
    });
  });

  describe("checkConfigExists", () => {
    it("should correctly detect old config existence", async () => {
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "exists('g:hellshake_yano_vim_config')") {
            return 1;
          }
          return 0;
        },
      } as unknown as Denops;

      const migrator = new ConfigMigrator(mockDenops);
      const exists = await migrator.checkOldConfigExists();

      assertEquals(exists, true);
    });

    it("should correctly detect new config existence", async () => {
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "exists('g:hellshake_yano')") {
            return 1;
          }
          return 0;
        },
      } as unknown as Denops;

      const migrator = new ConfigMigrator(mockDenops);
      const exists = await migrator.checkNewConfigExists();

      assertEquals(exists, true);
    });
  });

  describe("backupOldConfig", () => {
    it("should create backup of old config before migration", async () => {
      let backupCreated = false;
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "g:hellshake_yano_vim_config") {
            return { hint_chars: "xyz" };
          }
          return undefined;
        },
        cmd: async (command: string) => {
          if (command.includes("hellshake_yano_vim_config_backup")) {
            backupCreated = true;
          }
        },
      } as unknown as Denops;

      const migrator = new ConfigMigrator(mockDenops);
      await migrator.backupOldConfig();

      assertEquals(backupCreated, true);
    });
  });
});
