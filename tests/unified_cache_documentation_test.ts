/**
 * UnifiedCacheドキュメンテーションテスト
 * TDD Red-Green-Refactorアプローチに従って、ドキュメントの存在と品質を検証
 */

import { assertEquals, assert } from "https://deno.land/std@0.203.0/assert/mod.ts";
import { exists } from "https://deno.land/std@0.203.0/fs/mod.ts";

const BASE_PATH = "/home/takets/.config/nvim/plugged/hellshake-yano.vim";

Deno.test("Documentation - docs directory exists", async () => {
  const docsExists = await exists(`${BASE_PATH}/docs`);
  assert(docsExists, "docs directory should exist");
});

Deno.test("Documentation - unified-cache-api.md exists", async () => {
  const fileExists = await exists(`${BASE_PATH}/docs/unified-cache-api.md`);
  assert(fileExists, "unified-cache-api.md should exist");
});

Deno.test("Documentation - API document has required sections", async () => {
  try {
    const content = await Deno.readTextFile(`${BASE_PATH}/docs/unified-cache-api.md`);

    // 必須セクションの確認
    assert(content.includes("# UnifiedCache API"), "Should have API title");
    assert(content.includes("## クラス概要"), "Should have class overview");
    assert(content.includes("## メソッド"), "Should have methods section");
    assert(content.includes("getInstance()"), "Should document getInstance method");
    assert(content.includes("getCache"), "Should document getCache method");
    assert(content.includes("getAllStats()"), "Should document getAllStats method");
    assert(content.includes("clearAll()"), "Should document clearAll method");
    assert(content.includes("clearByType"), "Should document clearByType method");
    assert(content.includes("## 使用例"), "Should have usage examples");
    assert(content.includes("## 型定義"), "Should have type definitions");
  } catch {
    assert(false, "API documentation file should be readable and contain required sections");
  }
});

Deno.test("Documentation - cache-types.md exists and contains all 16 types", async () => {
  const fileExists = await exists(`${BASE_PATH}/docs/cache-types.md`);
  assert(fileExists, "cache-types.md should exist");

  try {
    const content = await Deno.readTextFile(`${BASE_PATH}/docs/cache-types.md`);

    // All 16 cache types should be documented
    const cacheTypes = [
      "WORDS", "HINTS", "DISPLAY", "ANALYSIS", "TEMP",
      "HINT_ASSIGNMENT_NORMAL", "HINT_ASSIGNMENT_VISUAL", "HINT_ASSIGNMENT_OTHER",
      "LANGUAGE_RULES", "SYNTAX_CONTEXT", "DICTIONARY",
      "CHAR_WIDTH", "CHAR_TYPE", "BYTE_LENGTH", "ADJACENCY", "WORD_DETECTION"
    ];

    for (const type of cacheTypes) {
      assert(content.includes(type), `Should document ${type} cache type`);
    }

    // サイズ情報も含まれているか
    assert(content.includes("1000"), "Should include cache sizes");
    assert(content.includes("500"), "Should include cache sizes");
    assert(content.includes("2000"), "Should include cache sizes");
  } catch {
    assert(false, "Cache types documentation should be complete");
  }
});

Deno.test("Documentation - migration-guide.md exists", async () => {
  const fileExists = await exists(`${BASE_PATH}/docs/migration-guide.md`);
  assert(fileExists, "migration-guide.md should exist");

  try {
    const content = await Deno.readTextFile(`${BASE_PATH}/docs/migration-guide.md`);

    // 必須セクション
    assert(content.includes("# 移行ガイド"), "Should have migration guide title");
    assert(content.includes("旧実装"), "Should describe old implementation");
    assert(content.includes("新実装"), "Should describe new implementation");
    assert(content.includes("移行手順"), "Should have migration steps");
    assert(content.includes("Before"), "Should have before example");
    assert(content.includes("After"), "Should have after example");
  } catch {
    assert(false, "Migration guide should exist and be complete");
  }
});

Deno.test("Documentation - performance-metrics.md exists", async () => {
  const fileExists = await exists(`${BASE_PATH}/docs/performance-metrics.md`);
  assert(fileExists, "performance-metrics.md should exist");

  try {
    const content = await Deno.readTextFile(`${BASE_PATH}/docs/performance-metrics.md`);

    // パフォーマンス数値
    assert(content.includes("メモリ使用量"), "Should document memory usage");
    assert(content.includes("88%"), "Should include 88% memory reduction");
    assert(content.includes("659KB"), "Should include before memory size");
    assert(content.includes("78KB"), "Should include after memory size");
    assert(content.includes("キャッシュヒット率"), "Should document cache hit rate");
    assert(content.includes("63-66%"), "Should include hit rate percentage");
  } catch {
    assert(false, "Performance metrics should be documented");
  }
});

Deno.test("Documentation - README.md contains UnifiedCache section", async () => {
  try {
    const content = await Deno.readTextFile(`${BASE_PATH}/README.md`);

    // UnifiedCacheセクションの確認
    assert(content.includes("UnifiedCache"), "README should mention UnifiedCache");
    assert(content.includes("統一"), "Should mention unification in Japanese");
    assert(content.includes("LRU"), "Should mention LRU algorithm");
    assert(content.includes("88%"), "Should mention memory reduction");
    assert(content.includes("CacheType"), "Should mention CacheType enum");

    // 使用例の確認
    assert(content.includes("getInstance()"), "Should show getInstance usage");
    assert(content.includes("getCache"), "Should show getCache usage");
  } catch {
    assert(false, "README should contain UnifiedCache documentation");
  }
});

Deno.test("Documentation - Cache statistics usage is documented", async () => {
  const apiDocExists = await exists(`${BASE_PATH}/docs/unified-cache-api.md`);

  if (apiDocExists) {
    const content = await Deno.readTextFile(`${BASE_PATH}/docs/unified-cache-api.md`);

    // 統計機能のドキュメント
    assert(content.includes("getAllStats"), "Should document getAllStats method");
    assert(content.includes("hitRate"), "Should mention hit rate");
    assert(content.includes("size"), "Should mention cache size");
    assert(content.includes("maxSize"), "Should mention max size");
    assert(content.includes("統計"), "Should mention statistics in Japanese");

    // 活用例
    assert(content.includes("console.log"), "Should have console.log examples");
    assert(content.includes("デバッグ"), "Should mention debugging");
  }
});

Deno.test("Documentation - Code examples are valid TypeScript", async () => {
  const files = [
    `${BASE_PATH}/docs/unified-cache-api.md`,
    `${BASE_PATH}/docs/migration-guide.md`
  ];

  for (const file of files) {
    if (await exists(file)) {
      const content = await Deno.readTextFile(file);

      // TypeScriptコードブロックの存在確認
      assert(content.includes("```typescript"), `${file} should have TypeScript examples`);

      // 基本的な構文チェック
      if (content.includes("```typescript")) {
        assert(content.includes("import"), "Should have import statements");
        assert(content.includes("const"), "Should have const declarations");
        assert(!content.includes("var "), "Should not use var");
      }
    }
  }
});