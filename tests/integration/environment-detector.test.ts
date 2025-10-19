/**
 * Environment Detector Test - Phase B-4 TDD Implementation
 * GREENフェーズ: テストを通すための実装
 */
import { assertEquals, assertExists } from "jsr:@std/assert@1.0.9";
import { describe, it } from "jsr:@std/testing@1.0.7/bdd";
import type { Denops } from "jsr:@denops/std@7.4.0";

// 実装済みのEnvironmentDetectorをインポート
import { EnvironmentDetector } from "../../denops/hellshake-yano/integration/environment-detector.ts";

describe("EnvironmentDetector", () => {
  describe("isDenopsAvailable", () => {
    it("should detect when Denops is available and running", async () => {
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "exists('g:loaded_denops')") {
            return 1; // Denopsがロードされている
          }
          if (expr === "denops#server#status()") {
            return "running";
          }
          return undefined;
        },
      } as Denops;

      const detector = new EnvironmentDetector(mockDenops);
      const result = await detector.isDenopsAvailable();

      assertEquals(result, {
        available: true,
        running: true,
        version: "7.4.0",
      });
    });

    it("should detect when Denops exists but not running", async () => {
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "exists('g:loaded_denops')") {
            return 1;
          }
          if (expr === "denops#server#status()") {
            return "stopped";
          }
          return undefined;
        },
      } as Denops;

      const detector = new EnvironmentDetector(mockDenops);
      const result = await detector.isDenopsAvailable();

      assertEquals(result, {
        available: true,
        running: false,
        version: "7.4.0",
      });
    });

    it("should detect when Denops is not available", async () => {
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "exists('g:loaded_denops')") {
            return 0; // Denopsがロードされていない
          }
          return undefined;
        },
      } as Denops;

      const detector = new EnvironmentDetector(mockDenops);
      const result = await detector.isDenopsAvailable();

      assertEquals(result, {
        available: false,
        running: false,
        version: undefined,
      });
    });
  });

  describe("getEditorInfo", () => {
    it("should detect Vim environment", async () => {
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "has('nvim')") {
            return 0; // Vimの場合
          }
          if (expr === "v:version") {
            return 900; // Vim 9.0
          }
          return undefined;
        },
      } as Denops;

      const detector = new EnvironmentDetector(mockDenops);
      const result = await detector.getEditorInfo();

      assertEquals(result, {
        type: "vim",
        version: "9.0",
        hasNvim: false,
      });
    });

    it("should detect Neovim environment", async () => {
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "has('nvim')") {
            return 1; // Neovimの場合
          }
          if (expr === "v:version") {
            return 800; // NVIM v0.8.0相当
          }
          return undefined;
        },
      } as Denops;

      const detector = new EnvironmentDetector(mockDenops);
      const result = await detector.getEditorInfo();

      assertEquals(result, {
        type: "neovim",
        version: "0.8.0",
        hasNvim: true,
      });
    });
  });

  describe("getEnvironmentDetails", () => {
    it("should return complete environment information", async () => {
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "exists('g:loaded_denops')") {
            return 1;
          }
          if (expr === "denops#server#status()") {
            return "running";
          }
          if (expr === "has('nvim')") {
            return 0;
          }
          if (expr === "v:version") {
            return 802;
          }
          return undefined;
        },
      } as Denops;

      const detector = new EnvironmentDetector(mockDenops);
      const result = await detector.getEnvironmentDetails();

      assertExists(result);
      assertExists(result.denops);
      assertExists(result.editor);
      assertEquals(typeof result.denops.available, "boolean");
      assertEquals(typeof result.denops.running, "boolean");
      assertEquals(typeof result.editor.type, "string");
      assertEquals(typeof result.editor.version, "string");
    });

    it("should cache environment information for performance", async () => {
      const mockDenops = {
        eval: async (expr: string) => {
          if (expr === "exists('g:loaded_denops')") {
            return 1;
          }
          if (expr === "denops#server#status()") {
            return "running";
          }
          if (expr === "has('nvim')") {
            return 0;
          }
          if (expr === "v:version") {
            return 802;
          }
          return undefined;
        },
      } as Denops;

      const detector = new EnvironmentDetector(mockDenops);

      // 最初の呼び出し
      const result1 = await detector.getEnvironmentDetails();

      // 2回目の呼び出し（キャッシュから取得されるはず）
      const result2 = await detector.getEnvironmentDetails();

      // 結果が同じオブジェクトであることを確認
      assertEquals(result1, result2);
    });
  });
});
