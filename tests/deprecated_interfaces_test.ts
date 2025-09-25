import { assertEquals, assertMatch } from "@std/assert";
import { readFileSync } from "node:fs";
import { join } from "@std/path";

/**
 * TDD Red Phase: 旧インターフェースの廃止予定テスト
 * Process2 Sub9で実装される@deprecatedマークのテスト
 */

const CONFIG_FILE_PATH = join(Deno.cwd(), "denops/hellshake-yano/config.ts");

Deno.test("旧インターフェースがdeprecatedマークされていることを確認", async () => {
  const configContent = await Deno.readTextFile(CONFIG_FILE_PATH);

  // CoreConfigが@deprecatedマークされている
  assertMatch(
    configContent,
    /@deprecated.*CoreConfig/s,
    "CoreConfig should be marked as @deprecated"
  );

  // HintConfigが@deprecatedマークされている
  assertMatch(
    configContent,
    /@deprecated.*HintConfig/s,
    "HintConfig should be marked as @deprecated"
  );

  // WordConfigが@deprecatedマークされている
  assertMatch(
    configContent,
    /@deprecated.*WordConfig/s,
    "WordConfig should be marked as @deprecated"
  );
});

Deno.test("移行ガイドコメントが存在することを確認", async () => {
  const configContent = await Deno.readTextFile(CONFIG_FILE_PATH);

  // 移行ガイドが含まれている
  assertMatch(
    configContent,
    /UnifiedConfig.*移行/s,
    "Migration guide to UnifiedConfig should be present"
  );

  // 削除予定バージョンが明記されている
  assertMatch(
    configContent,
    /v3\.0\.0.*削除/s,
    "Removal version should be specified as v3.0.0"
  );
});

Deno.test("deprecation警告テストの確認", async () => {
  const configContent = await Deno.readTextFile(CONFIG_FILE_PATH);

  // @deprecated JSDocタグの形式確認
  const deprecatedInterfaces = [
    "CoreConfig",
    "HintConfig",
    "WordConfig"
  ];

  for (const interfaceName of deprecatedInterfaces) {
    // 各インターフェースに適切な@deprecatedタグがある
    const deprecatedPattern = new RegExp(
      `@deprecated.*${interfaceName}.*v3\\.0\\.0`,
      "s"
    );
    assertMatch(
      configContent,
      deprecatedPattern,
      `${interfaceName} should have proper @deprecated tag with version info`
    );
  }
});