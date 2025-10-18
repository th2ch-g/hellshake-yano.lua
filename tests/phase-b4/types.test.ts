/**
 * Types Tests - Phase B-4 Process100
 * RED フェーズ: 型定義テスト (6 steps)
 */

import { assertEquals } from "jsr:@std/assert";
import type {
  ImplementationChoice,
  CommandInfo,
  MappingConfig,
  RefactoringContext,
  ValidationResult,
} from "../../denops/hellshake-yano/phase-b4/types.ts";

Deno.test("Types - Implementation Selection", async (t) => {
  await t.step("ImplementationChoice should support denops-unified", () => {
    const choice: ImplementationChoice = "denops-unified";
    assertEquals(choice, "denops-unified");
  });

  await t.step("ImplementationChoice should support vimscript-pure", () => {
    const choice: ImplementationChoice = "vimscript-pure";
    assertEquals(choice, "vimscript-pure");
  });
});

Deno.test("Types - Command Information", async (t) => {
  await t.step("CommandInfo should have required fields", () => {
    const cmd: CommandInfo = {
      name: "TestCommand",
      description: "Test command",
      implementation: "denops-unified",
    };
    assertEquals(cmd.name, "TestCommand");
    assertEquals(cmd.description, "Test command");
    assertEquals(cmd.implementation, "denops-unified");
  });
});

Deno.test("Types - Mapping Configuration", async (t) => {
  await t.step("MappingConfig should support motion mappings", () => {
    const config: MappingConfig = {
      type: "motion",
      keys: ["w", "b", "e"],
      enabled: true,
    };
    assertEquals(config.type, "motion");
    assertEquals(config.keys.length, 3);
  });

  await t.step("MappingConfig should support visual mappings", () => {
    const config: MappingConfig = {
      type: "visual",
      keys: ["h"],
      enabled: true,
    };
    assertEquals(config.type, "visual");
  });
});

Deno.test("Types - Refactoring Context", async (t) => {
  await t.step("RefactoringContext should hold module state", () => {
    const context: RefactoringContext = {
      module: "test-module",
      version: "1.0.0",
      timestamp: Date.now(),
      metrics: {
        commonProcessCount: 0,
        duplicateCount: 0,
      },
    };
    assertEquals(context.module, "test-module");
    assertEquals(context.version, "1.0.0");
  });
});

Deno.test("Types - Validation Result", async (t) => {
  await t.step("ValidationResult should indicate success", () => {
    const result: ValidationResult = {
      valid: true,
      error: undefined,
    };
    assertEquals(result.valid, true);
    assertEquals(result.error, undefined);
  });

  await t.step("ValidationResult should hold error message on failure", () => {
    const result: ValidationResult = {
      valid: false,
      error: "Validation failed",
    };
    assertEquals(result.valid, false);
    assertEquals(result.error, "Validation failed");
  });
});
