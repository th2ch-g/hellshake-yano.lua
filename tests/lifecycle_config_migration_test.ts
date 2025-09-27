/**
 * lifecycle.ts Config型 → UnifiedConfig型移行のためのTDDテスト
 *
 * Red Phase: Config型をUnifiedConfig型に変更した時の失敗テストを作成
 * Green Phase: 最小限の実装でテストを通す
 * Refactor Phase: コードを整理して品質を向上
 */

import { assertEquals, assertThrows } from "jsr:@std/assert";
import type { UnifiedConfig } from "../denops/hellshake-yano/config.ts";
import {
  getDefaultUnifiedConfig,
  mergeConfig,
  validateUnifiedConfig} from "../denops/hellshake-yano/config.ts";
import { initializePlugin } from "../denops/hellshake-yano/lifecycle.ts";

/**
 * TDD Red Phase Test 1: lifecycle.tsがUnifiedConfigをインポートしているか
 *
 * 現在はConfig型をインポートしているため、このテストは失敗するはず
 */
Deno.test("RED: lifecycle.ts should import UnifiedConfig type", async () => {
  // lifecycle.tsソースコードを読み取って型インポートをチェック
  const lifecycleSource = await Deno.readTextFile(
    "./denops/hellshake-yano/lifecycle.ts"
  );

  // 現在はConfig型をインポートしているため失敗するはず
  assertEquals(
    lifecycleSource.includes('import type { UnifiedConfig }'),
    true,
    "lifecycle.ts should import UnifiedConfig type, not Config type"
  );

  // Config型のインポートは存在すべきでない
  assertEquals(
    lifecycleSource.includes('import type { Config }'),
    false,
    "lifecycle.ts should not import Config type anymore"
  );
});

/**
 * TDD Red Phase Test 2: mergeConfig関数がUnifiedConfigを受け入れるか
 *
 * 現在のmergeConfigはConfig型用なので失敗するはず
 */
Deno.test("RED: mergeConfig should work with UnifiedConfig", () => {
  const defaultConfig = getDefaultUnifiedConfig();
  const updates: Partial<UnifiedConfig> = {
    motionCount: 5,
    hintPosition: 'end'
  };

  // mergeConfigはConfig型を期待するため、で変換
  const configFormat =(defaultConfig);
  const configUpdates =({ ...defaultConfig, ...updates });
  const result = mergeConfig(configFormat, configUpdates);
  assertEquals(result.motionCount, 5);
  assertEquals(result.hintPosition, 'end');
});

/**
 * TDD Red Phase Test 3: InitializationOptionsがUnifiedConfigを使用するか
 *
 * 現在はConfig型を使用しているため失敗するはず
 */
Deno.test("RED: InitializationOptions should use UnifiedConfig", async () => {
  const lifecycleSource = await Deno.readTextFile(
    "./denops/hellshake-yano/lifecycle.ts"
  );

  // InitializationOptionsインターフェースの定義をチェック
  const initOptionsMatch = lifecycleSource.match(
    /interface InitializationOptions\s*{[\s\S]*?config\?\s*:\s*Partial<(\w+)>/
  );

  assertEquals(
    initOptionsMatch?.[1],
    "UnifiedConfig",
    "InitializationOptions.config should use UnifiedConfig type"
  );
});

/**
 * TDD Red Phase Test 4: mergeConfig関数がUnifiedConfigのプロパティを正しく処理するか
 *
 * trigger、ui、debugなどの新しい構造を処理できるべき
 */
Deno.test("RED: mergeConfig should handle UnifiedConfig structure", () => {
  const baseConfig = getDefaultUnifiedConfig();
  const updates: Partial<UnifiedConfig> = {
    motionCount: 4,
    hintPosition: 'start',
    maxHints: 250,
    debugCoordinates: true
  };

  // mergeConfigはConfig型を期待するため、で変換
  const configFormat =(baseConfig);
  const configUpdates =({ ...baseConfig, ...updates });
  const result = mergeConfig(configFormat, configUpdates);
  assertEquals(result.motionCount, 4);
  assertEquals(result.hintPosition, 'start');
  assertEquals(result.maxHints, 250);
});