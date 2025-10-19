/**
 * Mapping Manager Test - Phase B-4 TDD Implementation
 * REDフェーズ: テストファースト実装
 *
 * テスト要件:
 * - モーション検出マッピングテスト（4ケース）
 * - ビジュアルモードマッピングテスト（3ケース）
 * - マッピング衝突検出テスト（3ケース）
 */
import { assertEquals } from "jsr:@std/assert@1.0.9";
import { describe, it } from "jsr:@std/testing@1.0.7/bdd";
import type { Denops } from "jsr:@denops/std@7.4.0";

// 実装予定のMappingManagerをインポート
import { MappingManager } from "../../denops/hellshake-yano/integration/mapping-manager.ts";

describe("MappingManager", () => {
  describe("setupMotionMappings", () => {
    it("should setup mappings for default motion keys (w, b, e)", async () => {
      const mappings: string[] = [];
      const mockDenops = {
        cmd: (command: string) => {
          mappings.push(command);
          return Promise.resolve();
        },
      } as Denops;

      const manager = new MappingManager(mockDenops);
      await manager.setupMotionMappings();

      // デフォルトのモーションキー（w, b, e）のマッピングが設定されているか確認
      const activeMappings = manager.getActiveMappings();
      assertEquals(activeMappings.includes("w"), true);
      assertEquals(activeMappings.includes("b"), true);
      assertEquals(activeMappings.includes("e"), true);
    });

    it("should setup mappings for custom motion keys", async () => {
      const mappings: string[] = [];
      const mockDenops = {
        cmd: (command: string) => {
          mappings.push(command);
          return Promise.resolve();
        },
      } as Denops;

      const manager = new MappingManager(mockDenops);
      await manager.setupMotionMappings(["h", "j", "k", "l"]);

      // カスタムモーションキーのマッピングが設定されているか確認
      const activeMappings = manager.getActiveMappings();
      assertEquals(activeMappings.includes("h"), true);
      assertEquals(activeMappings.includes("j"), true);
      assertEquals(activeMappings.includes("k"), true);
      assertEquals(activeMappings.includes("l"), true);
    });

    it("should call denops#notify for motion detection", async () => {
      const mappings: string[] = [];
      const mockDenops = {
        cmd: (command: string) => {
          mappings.push(command);
          return Promise.resolve();
        },
      } as Denops;

      const manager = new MappingManager(mockDenops);
      await manager.setupMotionMappings(["w"]);

      // denops#notify呼び出しが含まれているか確認
      const hasNotifyCall = mappings.some((cmd) => cmd.includes("denops#notify"));
      assertEquals(hasNotifyCall, true);
    });

    it("should use silent noremap for motion mappings", async () => {
      const mappings: string[] = [];
      const mockDenops = {
        cmd: (command: string) => {
          mappings.push(command);
          return Promise.resolve();
        },
      } as Denops;

      const manager = new MappingManager(mockDenops);
      await manager.setupMotionMappings(["w"]);

      // <silent> と noremap が使用されているか確認
      const hasSilentNoremap = mappings.some(
        (cmd) => cmd.includes("<silent>") && cmd.includes("nnoremap"),
      );
      assertEquals(hasSilentNoremap, true);
    });
  });

  describe("setupVisualMappings", () => {
    it("should setup visual mode mappings", async () => {
      const mappings: string[] = [];
      const mockDenops = {
        cmd: (command: string) => {
          mappings.push(command);
          return Promise.resolve();
        },
      } as Denops;

      const manager = new MappingManager(mockDenops);
      await manager.setupVisualMappings();

      // ビジュアルモードマッピングが設定されているか確認
      const activeMappings = manager.getActiveMappings();
      assertEquals(activeMappings.length > 0, true);
    });

    it("should use xnoremap for visual mode", async () => {
      const mappings: string[] = [];
      const mockDenops = {
        cmd: (command: string) => {
          mappings.push(command);
          return Promise.resolve();
        },
      } as Denops;

      const manager = new MappingManager(mockDenops);
      await manager.setupVisualMappings();

      // xnoremap が使用されているか確認
      const hasXnoremap = mappings.some((cmd) => cmd.includes("xnoremap"));
      assertEquals(hasXnoremap, true);
    });

    it("should trigger hint display for visual selection", async () => {
      const mappings: string[] = [];
      const mockDenops = {
        cmd: (command: string) => {
          mappings.push(command);
          return Promise.resolve();
        },
      } as Denops;

      const manager = new MappingManager(mockDenops);
      await manager.setupVisualMappings();

      // ヒント表示のトリガーが含まれているか確認
      const hasTrigger = mappings.some(
        (cmd) => cmd.includes("showHints") || cmd.includes("denops#notify"),
      );
      assertEquals(hasTrigger, true);
    });
  });

  describe("mapping conflict detection", () => {
    it("should detect existing mappings before setup", async () => {
      const mockDenops = {
        cmd: (_command: string) => Promise.resolve(),
        eval: (expr: string) => {
          // 既存マッピングがあると仮定
          if (expr.includes("maparg")) {
            return Promise.resolve("existing_mapping");
          }
          return Promise.resolve("");
        },
      } as Denops;

      const manager = new MappingManager(mockDenops);
      await manager.setupMotionMappings(["w"]);

      // 既存マッピングが保存されているか確認
      const activeMappings = manager.getActiveMappings();
      assertEquals(activeMappings.includes("w"), true);
    });

    it("should restore original mappings on cleanup", async () => {
      const commands: string[] = [];
      const mockDenops = {
        cmd: (command: string) => {
          commands.push(command);
          return Promise.resolve();
        },
        eval: (expr: string) => {
          if (expr.includes("maparg")) {
            return Promise.resolve("original_mapping");
          }
          return Promise.resolve("");
        },
      } as Denops;

      const manager = new MappingManager(mockDenops);
      await manager.setupMotionMappings(["w"]);
      await manager.cleanup();

      // クリーンアップ時に元のマッピングが復元されているか確認
      const hasUnmap = commands.some((cmd) => cmd.includes("unmap"));
      assertEquals(hasUnmap, true);
    });

    it("should handle mappings without conflicts gracefully", async () => {
      const mockDenops = {
        cmd: (_command: string) => Promise.resolve(),
        eval: (_expr: string) => {
          // マッピングなし
          return Promise.resolve("");
        },
      } as Denops;

      const manager = new MappingManager(mockDenops);
      // エラーなく設定できるか確認
      await manager.setupMotionMappings(["w", "b", "e"]);

      const activeMappings = manager.getActiveMappings();
      assertEquals(activeMappings.length, 3);
    });
  });

  describe("getActiveMappings", () => {
    it("should return list of all active mappings", async () => {
      const mockDenops = {
        cmd: (_command: string) => Promise.resolve(),
      } as Denops;

      const manager = new MappingManager(mockDenops);
      await manager.setupMotionMappings(["w", "b"]);

      const mappings = manager.getActiveMappings();
      assertEquals(Array.isArray(mappings), true);
      assertEquals(mappings.length, 2);
      assertEquals(mappings.includes("w"), true);
      assertEquals(mappings.includes("b"), true);
    });
  });
});
