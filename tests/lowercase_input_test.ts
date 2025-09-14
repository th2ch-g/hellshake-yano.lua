import { assertEquals, assertExists } from "https://deno.land/std@0.211.0/assert/mod.ts";
import type { Denops } from "@denops/std";

// モックDenopsクラス
class MockDenops implements Partial<Denops> {
  meta = { host: "nvim" as const, mode: "debug" as const, version: "0.7.0", platform: "linux" as const };
  name = "test";

  private commands: string[] = [];
  private calls: Array<{ name: string; args: any[] }> = [];
  private feedKeysBuffer: string[] = [];

  async cmd(command: string): Promise<void> {
    this.commands.push(command);
  }

  async call(fn: string, ...args: any[]): Promise<any> {
    this.calls.push({ name: fn, args });

    switch (fn) {
      case "bufnr":
        return 1;
      case "bufexists":
        return 1;
      case "getbufvar":
        return "";
      case "line":
        return 10;
      case "col":
        return 1;
      case "getbufline":
        return ["hello world test", "sample text here", "more words here"];
      case "feedkeys":
        this.feedKeysBuffer.push(args[0]);
        return;
      case "nvim_create_namespace":
        return 1;
      case "nvim_buf_set_extmark":
        return;
      case "nvim_buf_clear_namespace":
        return;
      case "cursor":
        return;
      default:
        return;
    }
  }

  async batch(..._calls: unknown[]): Promise<unknown[]> {
    return [];
  }

  async eval(_expr: string): Promise<unknown> {
    return "";
  }

  interrupt(): void {}

  redraw(_force?: boolean): Promise<void> {
    return Promise.resolve();
  }

  // テスト用ヘルパーメソッド
  getCommands(): string[] {
    return this.commands;
  }

  getCalls(): Array<{ name: string; args: any[] }> {
    return this.calls;
  }

  getFeedKeysBuffer(): string[] {
    return this.feedKeysBuffer;
  }

  clearBuffer(): void {
    this.commands = [];
    this.calls = [];
    this.feedKeysBuffer = [];
  }

  dispatcher = {};
}

// 小文字入力のテスト関数（実際のwaitForUserInput関数のロジックを抽出）
async function testLowerCaseInput(denops: MockDenops, charCode: number): Promise<void> {
  const char = charCode;

  // 元の入力が大文字かどうかを記録（A-Z: 65-90）
  const wasUpperCase = char >= 65 && char <= 90;
  // 元の入力が数字かどうかを記録（0-9: 48-57）
  const wasNumber = char >= 48 && char <= 57;
  // 元の入力が小文字かどうかを記録（a-z: 97-122）
  const wasLowerCase = char >= 97 && char <= 122;

  // 小文字の場合は、ヒントをキャンセルして通常のVim動作を実行
  if (wasLowerCase) {
    // hideHints()の代わりに、denops.cmd()でecho
    await denops.cmd("echo 'Hints cleared'");
    // 小文字をそのままVimに渡す
    const originalChar = String.fromCharCode(char);
    await denops.call("feedkeys", originalChar, "n");
    return;
  }

  // 大文字や数字の場合は通常のヒント処理を続行
  await denops.cmd("echo 'Processing hint input'");
}

// テストケース
Deno.test("小文字j入力でヒントがキャンセルされカーソルが下に移動", async () => {
  const denops = new MockDenops();

  // 小文字'j'のcharCode: 106
  await testLowerCaseInput(denops, 106);

  const commands = denops.getCommands();
  const calls = denops.getCalls();
  const feedKeys = denops.getFeedKeysBuffer();

  // ヒントがクリアされることを確認
  assertEquals(commands[0], "echo 'Hints cleared'");

  // feedkeysで'j'が送信されることを確認
  const feedKeysCall = calls.find((call) => call.name === "feedkeys");
  assertExists(feedKeysCall);
  assertEquals(feedKeysCall.args[0], "j");
  assertEquals(feedKeysCall.args[1], "n");

  // feedKeysBufferにも'j'が記録されることを確認
  assertEquals(feedKeys[0], "j");
});

Deno.test("小文字k入力でヒントがキャンセルされカーソルが上に移動", async () => {
  const denops = new MockDenops();

  // 小文字'k'のcharCode: 107
  await testLowerCaseInput(denops, 107);

  const commands = denops.getCommands();
  const calls = denops.getCalls();
  const feedKeys = denops.getFeedKeysBuffer();

  assertEquals(commands[0], "echo 'Hints cleared'");

  const feedKeysCall = calls.find((call) => call.name === "feedkeys");
  assertExists(feedKeysCall);
  assertEquals(feedKeysCall.args[0], "k");

  assertEquals(feedKeys[0], "k");
});

Deno.test("小文字h入力でヒントがキャンセルされカーソルが左に移動", async () => {
  const denops = new MockDenops();

  // 小文字'h'のcharCode: 104
  await testLowerCaseInput(denops, 104);

  const commands = denops.getCommands();
  const feedKeys = denops.getFeedKeysBuffer();

  assertEquals(commands[0], "echo 'Hints cleared'");
  assertEquals(feedKeys[0], "h");
});

Deno.test("小文字l入力でヒントがキャンセルされカーソルが右に移動", async () => {
  const denops = new MockDenops();

  // 小文字'l'のcharCode: 108
  await testLowerCaseInput(denops, 108);

  const commands = denops.getCommands();
  const feedKeys = denops.getFeedKeysBuffer();

  assertEquals(commands[0], "echo 'Hints cleared'");
  assertEquals(feedKeys[0], "l");
});

Deno.test("大文字J入力でヒント処理が続行される", async () => {
  const denops = new MockDenops();

  // 大文字'J'のcharCode: 74
  await testLowerCaseInput(denops, 74);

  const commands = denops.getCommands();
  const feedKeys = denops.getFeedKeysBuffer();

  // ヒント処理が続行されることを確認
  assertEquals(commands[0], "echo 'Processing hint input'");

  // feedkeysは呼ばれないことを確認
  assertEquals(feedKeys.length, 0);
});

Deno.test("大文字K入力でヒント処理が続行される", async () => {
  const denops = new MockDenops();

  // 大文字'K'のcharCode: 75
  await testLowerCaseInput(denops, 75);

  const commands = denops.getCommands();
  const feedKeys = denops.getFeedKeysBuffer();

  assertEquals(commands[0], "echo 'Processing hint input'");
  assertEquals(feedKeys.length, 0);
});

Deno.test("数字1入力でヒント処理が続行される", async () => {
  const denops = new MockDenops();

  // 数字'1'のcharCode: 49
  await testLowerCaseInput(denops, 49);

  const commands = denops.getCommands();
  const feedKeys = denops.getFeedKeysBuffer();

  assertEquals(commands[0], "echo 'Processing hint input'");
  assertEquals(feedKeys.length, 0);
});

Deno.test("小文字と大文字の境界値テスト", async () => {
  const denops = new MockDenops();

  // 小文字'a'のcharCode: 97 (小文字の最初)
  denops.clearBuffer();
  await testLowerCaseInput(denops, 97);
  assertEquals(denops.getCommands()[0], "echo 'Hints cleared'");
  assertEquals(denops.getFeedKeysBuffer()[0], "a");

  // 小文字'z'のcharCode: 122 (小文字の最後)
  denops.clearBuffer();
  await testLowerCaseInput(denops, 122);
  assertEquals(denops.getCommands()[0], "echo 'Hints cleared'");
  assertEquals(denops.getFeedKeysBuffer()[0], "z");

  // 大文字'A'のcharCode: 65 (大文字の最初)
  denops.clearBuffer();
  await testLowerCaseInput(denops, 65);
  assertEquals(denops.getCommands()[0], "echo 'Processing hint input'");
  assertEquals(denops.getFeedKeysBuffer().length, 0);

  // 大文字'Z'のcharCode: 90 (大文字の最後)
  denops.clearBuffer();
  await testLowerCaseInput(denops, 90);
  assertEquals(denops.getCommands()[0], "echo 'Processing hint input'");
  assertEquals(denops.getFeedKeysBuffer().length, 0);
});
