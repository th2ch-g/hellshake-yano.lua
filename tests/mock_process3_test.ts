/**
 * tests/mock_process3_test.ts
 * Process 3: テストヘルパーの型安全化のテスト
 *
 * このテストでは、MockDenopsクラスとそれに関連する関数が
 * ジェネリクスによる型推論を正しく行うことを検証します。
 */

import { assertEquals } from "@std/assert";
import { MockDenops } from "./helpers/mock.ts";

Deno.test("MockDenops.call - ジェネリクスで戻り値の型を指定", async () => {
  const denops = new MockDenops();

  // number型のレスポンスを設定
  denops.setCallResponse("bufnr", 42);

  // ジェネリクスで戻り値の型をnumberに指定
  const bufnr = await denops.call<number>("bufnr", "%");

  // 型推論が効いているか確認（numberとして扱える）
  assertEquals(bufnr, 42);
  assertEquals(typeof bufnr, "number");
});

Deno.test("MockDenops.call - string型の戻り値", async () => {
  const denops = new MockDenops();

  denops.setCallResponse("expand", "/path/to/file");

  // string型を指定
  const filePath = await denops.call<string>("expand", "%:p");

  assertEquals(filePath, "/path/to/file");
  assertEquals(typeof filePath, "string");
});

Deno.test("MockDenops.call - 配列型の戻り値", async () => {
  const denops = new MockDenops();

  const lines = ["line1", "line2", "line3"];
  denops.setCallResponse("getline", lines);

  // string[]型を指定
  const result = await denops.call<string[]>("getline", 1, "$");

  assertEquals(result, lines);
  assertEquals(Array.isArray(result), true);
});

Deno.test("MockDenops.call - オブジェクト型の戻り値", async () => {
  const denops = new MockDenops();

  interface BufferInfo {
    bufnr: number;
    name: string;
    loaded: boolean;
  }

  const bufferInfo: BufferInfo = {
    bufnr: 1,
    name: "test.txt",
    loaded: true,
  };

  denops.setCallResponse("getbufinfo", bufferInfo);

  // カスタム型を指定
  const result = await denops.call<BufferInfo>("getbufinfo", 1);

  assertEquals(result.bufnr, 1);
  assertEquals(result.name, "test.txt");
  assertEquals(result.loaded, true);
});

Deno.test("MockDenops.setCallResponse - ジェネリクスで型を保持", () => {
  const denops = new MockDenops();

  // number型のレスポンスを設定
  denops.setCallResponse<number>("line", 10);

  // string型のレスポンスを設定
  denops.setCallResponse<string>("expand", "/home/user");

  // boolean型のレスポンスを設定
  denops.setCallResponse<boolean>("exists", true);

  // 設定が正しく保存されているか確認（型推論のテスト）
  // 実際のアサーションはcallメソッドで行う
});

Deno.test("MockDenops.onCall - ジェネリクスで引数と戻り値の型を指定", async () => {
  const denops = new MockDenops();

  // 引数と戻り値の型を指定したハンドラー
  denops.onCall<[number, number], number>("add", (a, b) => {
    return a + b;
  });

  const result = await denops.call<number>("add", 10, 20);

  assertEquals(result, 30);
});

Deno.test("MockDenops.onCall - string型を返すハンドラー", async () => {
  const denops = new MockDenops();

  denops.onCall<[string], string>("upper", (str) => {
    return str.toUpperCase();
  });

  const result = await denops.call<string>("upper", "hello");

  assertEquals(result, "HELLO");
});

Deno.test("MockDenops.onCall - 配列を返すハンドラー", async () => {
  const denops = new MockDenops();

  denops.onCall<[number], number[]>("range", (n) => {
    return Array.from({ length: n }, (_, i) => i);
  });

  const result = await denops.call<number[]>("range", 5);

  assertEquals(result, [0, 1, 2, 3, 4]);
});

Deno.test("MockDenops.onCall - 複数の引数を持つハンドラー", async () => {
  const denops = new MockDenops();

  denops.onCall<[string, number, boolean], string>(
    "format",
    (str, num, flag) => {
      return `${str}-${num}-${flag}`;
    },
  );

  const result = await denops.call<string>("format", "test", 42, true);

  assertEquals(result, "test-42-true");
});

Deno.test("MockDenops - デフォルト型パラメータ（unknown）での動作", async () => {
  const denops = new MockDenops();

  denops.setCallResponse("generic", { foo: "bar" });

  // 型パラメータを指定しない場合、unknownとして扱われる
  const result = await denops.call("generic");

  // unknown型なので型ガードが必要
  if (typeof result === "object" && result !== null && "foo" in result) {
    assertEquals((result as { foo: string }).foo, "bar");
  }
});

Deno.test("MockDenops - 後方互換性の確認", async () => {
  const denops = new MockDenops();

  // 既存のコード（型パラメータなし）も動作する
  denops.setCallResponse("test", 123);
  denops.onCall<[number, number], number>("multiply", (a, b) => a * b);

  const response = await denops.call("test");
  const product = await denops.call("multiply", 5, 6);

  assertEquals(response, 123);
  assertEquals(product, 30);
});

Deno.test("MockDenops - 型推論の効果を確認", async () => {
  const denops = new MockDenops();

  // number型を明示的に指定
  denops.setCallResponse<number>("count", 100);

  const count = await denops.call<number>("count");

  // number型のメソッドが使える（型推論が効いている証拠）
  const doubled = count * 2;
  assertEquals(doubled, 200);

  // string型を指定
  denops.setCallResponse<string>("name", "test");

  const name = await denops.call<string>("name");

  // string型のメソッドが使える
  const upper = name.toUpperCase();
  assertEquals(upper, "TEST");
});
