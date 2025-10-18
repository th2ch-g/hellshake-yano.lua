/**
 * tests/phase-b1/env-helper.test.ts
 *
 * 環境分離テストヘルパーのテスト
 *
 * Process: phase-b1, sub1.2
 */

import { test } from "../testRunner.ts";
import { assertEquals, assertExists } from "@std/assert";
import {
  detectEnvironment,
  isNeovimEnvironment,
  isVimEnvironment,
  printEnvironmentInfo,
  runByEnvironment,
  runNeovimOnlyTest,
  runVimOnlyTest,
  validateEnvironmentFeatures,
} from "./env-helper.ts";

test("環境ヘルパー: 環境を正しく判定できる", async (denops) => {
  const env = await detectEnvironment(denops);

  // 環境情報が正しく取得できることを確認
  assertExists(env, "環境情報が存在すること");
  assertExists(env.type, "環境タイプが存在すること");
  assertExists(env.version, "バージョン情報が存在すること");

  // type は "vim" または "nvim" のいずれか
  assertEquals(
    env.type === "vim" || env.type === "nvim",
    true,
    `環境タイプが vim または nvim であること（実際: ${env.type}）`,
  );

  // 環境情報を表示
  await printEnvironmentInfo(denops);
});

test("環境ヘルパー: Vim環境判定", async (denops) => {
  const isVim = await isVimEnvironment(denops);
  const isNvim = await isNeovimEnvironment(denops);

  // VimとNeovimは排他的
  assertEquals(
    isVim !== isNvim,
    true,
    "VimとNeovimの判定が排他的であること",
  );
});

test("環境ヘルパー: 機能検証", async (denops) => {
  const validation = await validateEnvironmentFeatures(denops);

  assertExists(validation, "検証結果が存在すること");
  assertExists(validation.valid, "valid フィールドが存在すること");
  assertExists(validation.errors, "errors フィールドが存在すること");

  // エラーがある場合は表示
  if (!validation.valid) {
    console.log("環境検証エラー:", validation.errors);
  }
});

test("環境ヘルパー: 環境別処理の実行", async (denops) => {
  let vimExecuted = false;
  let neovimExecuted = false;

  await runByEnvironment(
    denops,
    (_d) => {
      vimExecuted = true;
      return Promise.resolve("vim");
    },
    (_d) => {
      neovimExecuted = true;
      return Promise.resolve("nvim");
    },
  );

  // どちらか一方だけが実行されることを確認
  assertEquals(
    vimExecuted !== neovimExecuted,
    true,
    "VimとNeovimの処理が排他的に実行されること",
  );
});

test("環境ヘルパー: Vim専用テスト実行", async (denops) => {
  let executed = false;

  await runVimOnlyTest(denops, "Vim専用テスト", (_d) => {
    executed = true;
    return Promise.resolve();
  });

  const isVim = await isVimEnvironment(denops);

  // Vim環境の場合のみ実行されることを確認
  assertEquals(
    executed,
    isVim,
    `Vim環境${isVim ? "で" : "以外では"}実行${isVim ? "される" : "されない"}こと`,
  );
});

test("環境ヘルパー: Neovim専用テスト実行", async (denops) => {
  let executed = false;

  await runNeovimOnlyTest(denops, "Neovim専用テスト", (_d) => {
    executed = true;
    return Promise.resolve();
  });

  const isNvim = await isNeovimEnvironment(denops);

  // Neovim環境の場合のみ実行されることを確認
  assertEquals(
    executed,
    isNvim,
    `Neovim環境${isNvim ? "で" : "以外では"}実行${isNvim ? "される" : "されない"}こと`,
  );
});
