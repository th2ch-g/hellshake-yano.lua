/**
 * test_config.ts - TypeScript側の設定伝播テスト
 * process4のTypeScript側実装を検証
 */

import { assertEquals, assertExists } from "@std/assert";
import { getMotionCountForKey } from "./main.ts";

// テスト用のConfig型
interface TestConfig {
  per_key_motion_count?: Record<string, number>;
  default_motion_count?: number;
  motion_count?: number;
  [key: string]: unknown;
}

// テストケース定義
const testCases = [
  {
    name: "基本的なper_key_motion_count設定",
    config: {
      per_key_motion_count: { h: 2, j: 3, k: 4 },
      default_motion_count: 5,
      motion_count: 6,
    } as TestConfig,
    tests: [
      { key: "h", expected: 2 },
      { key: "j", expected: 3 },
      { key: "k", expected: 4 },
      { key: "l", expected: 5 }, // default_motion_countにフォールバック
    ],
  },
  {
    name: "default_motion_countの優先順位",
    config: {
      default_motion_count: 7,
      motion_count: 10,
    } as TestConfig,
    tests: [
      { key: "a", expected: 7 }, // default_motion_countを使用
      { key: "b", expected: 7 },
    ],
  },
  {
    name: "motion_countへのフォールバック",
    config: {
      motion_count: 8,
    } as TestConfig,
    tests: [
      { key: "x", expected: 8 }, // motion_countのみ設定時
    ],
  },
  {
    name: "無効な値の処理",
    config: {
      per_key_motion_count: {
        a: 0, // 無効（0）
        b: -1, // 無効（負）
        c: 5, // 有効
      },
      default_motion_count: 3,
    } as TestConfig,
    tests: [
      { key: "a", expected: 3 }, // 無効なのでdefaultへ
      { key: "b", expected: 3 }, // 無効なのでdefaultへ
      { key: "c", expected: 5 }, // 有効な値
    ],
  },
  {
    name: "空の設定",
    config: {} as TestConfig,
    tests: [
      { key: "h", expected: 3 }, // ハードコードされたデフォルト値
    ],
  },
];

// テスト実行関数
export function runConfigTests(): void {
  console.log("====================================");
  console.log("TypeScript側 設定伝播テスト");
  console.log("====================================");

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const testCase of testCases) {
    console.log(`\n=== ${testCase.name} ===`);

    for (const test of testCase.tests) {
      totalTests++;
      const result = getMotionCountForKey(test.key, testCase.config as any);

      if (result === test.expected) {
        passedTests++;
        console.log(`  ✓ key '${test.key}': ${result} (期待値: ${test.expected})`);
      } else {
        failedTests++;
        console.log(`  ✗ key '${test.key}': ${result} (期待値: ${test.expected})`);
      }
    }
  }

  // サマリー
  console.log("\n====================================");
  console.log("テスト結果サマリー");
  console.log("====================================");
  console.log(`合格: ${passedTests} / 失敗: ${failedTests} / 合計: ${totalTests}`);

  if (failedTests === 0) {
    console.log("\n✅ すべてのテストが成功しました！");
  } else {
    console.log(`\n⚠️  ${failedTests}個のテストが失敗しました`);
  }
}

// バリデーション関数のテスト
export function testValidation(): void {
  console.log("\n=== バリデーション関数テスト ===");

  const testConfigs = [
    {
      name: "整数値のみ受け入れ",
      input: { h: 1.5, j: 2, k: 2.9 },
      expectedKeys: ["j"], // 整数のjのみが有効
    },
    {
      name: "正の値のみ受け入れ",
      input: { a: -1, b: 0, c: 1 },
      expectedKeys: ["c"], // 1以上のcのみが有効
    },
    {
      name: "数値型のみ受け入れ",
      input: { x: "3", y: 3, z: null },
      expectedKeys: ["y"], // 数値のyのみが有効
    },
  ];

  for (const test of testConfigs) {
    console.log(`  ${test.name}:`);
    const validKeys = Object.entries(test.input)
      .filter(([_, value]) => {
        return typeof value === "number" && value >= 1 && Number.isInteger(value);
      })
      .map(([key]) => key);

    const passed = JSON.stringify(validKeys) === JSON.stringify(test.expectedKeys);
    if (passed) {
      console.log(`    ✓ 有効なキー: ${validKeys.join(", ")}`);
    } else {
      console.log(`    ✗ 期待値: ${test.expectedKeys.join(", ")}, 実際: ${validKeys.join(", ")}`);
    }
  }
}

// メイン実行
if (import.meta.main) {
  runConfigTests();
  testValidation();
}
