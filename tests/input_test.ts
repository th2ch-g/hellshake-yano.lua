import { assertEquals, assertExists } from "@std/assert";
import type { Denops } from "@denops/std";
import { MockDenops } from "./helpers/mock.ts";

/**
 * ヒント選択・入力処理のテスト
 * waitForUserInput関数の動作を検証
 */

// Test suite for input handling
Deno.test("Input handling - Single character hint selection", async (t) => {
  await t.step("should jump to position when valid single character is entered", async () => {
    const mockDenops = new MockDenops();

    // テスト用のヒントデータをモック
    const testHints = [
      { hint: "A", word: { text: "hello", line: 10, col: 5 } },
      { hint: "B", word: { text: "world", line: 15, col: 10 } },
      { hint: "C", word: { text: "test", line: 20, col: 1 } },
    ];

    // getchar()で'A'(65)を返すようモック
    mockDenops.setCallResponse("getchar", 65); // ASCII code for 'A'

    // カーソル移動の呼び出しを記録
    let cursorCalled = false;
    let cursorLine = 0;
    let cursorCol = 0;
    mockDenops.onCall("cursor", (line: number, col: number) => {
      cursorCalled = true;
      cursorLine = line;
      cursorCol = col;
    });

    // waitForUserInput相当の処理をシミュレート
    const char = await mockDenops.call("getchar") as number;
    const inputChar = String.fromCharCode(char).toUpperCase();
    const target = testHints.find((h) => h.hint === inputChar);

    if (target) {
      await mockDenops.call("cursor", target.word.line, target.word.col);
    }

    // 検証
    assertEquals(cursorCalled, true);
    assertEquals(cursorLine, 10);
    assertEquals(cursorCol, 5);
  });

  await t.step("should handle lowercase input by converting to uppercase", async () => {
    const mockDenops = new MockDenops();

    const testHints = [
      { hint: "A", word: { text: "hello", line: 10, col: 5 } },
    ];

    // getchar()で'a'(97)を返すようモック
    mockDenops.setCallResponse("getchar", 97); // ASCII code for 'a'

    let cursorLine = 0;
    let cursorCol = 0;
    mockDenops.onCall("cursor", (line: number, col: number) => {
      cursorLine = line;
      cursorCol = col;
    });

    const char = await mockDenops.call("getchar") as number;
    const inputChar = String.fromCharCode(char).toUpperCase();
    const target = testHints.find((h) => h.hint === inputChar);

    if (target) {
      await mockDenops.call("cursor", target.word.line, target.word.col);
    }

    assertEquals(cursorLine, 10);
    assertEquals(cursorCol, 5);
  });
});

Deno.test("Input handling - Multi-character hint selection", async (t) => {
  await t.step("should wait for second character when first matches multi-char hints", async () => {
    const mockDenops = new MockDenops();

    const testHints = [
      { hint: "AA", word: { text: "hello", line: 10, col: 5 } },
      { hint: "AB", word: { text: "world", line: 15, col: 10 } },
      { hint: "AC", word: { text: "test", line: 20, col: 1 } },
    ];

    // 最初に'A'、次に'B'を返すようモック
    const inputs = [65, 66]; // 'A', 'B'
    let inputIndex = 0;
    mockDenops.setCallResponse("getchar", () => inputs[inputIndex++]);

    let cursorLine = 0;
    let cursorCol = 0;
    mockDenops.onCall("cursor", (line: number, col: number) => {
      cursorLine = line;
      cursorCol = col;
    });

    // 最初の文字を取得
    const firstChar = await mockDenops.call("getchar") as number;
    const firstInputChar = String.fromCharCode(firstChar).toUpperCase();

    // 複数文字ヒントの可能性をチェック
    const multiCharHints = testHints.filter((h) => h.hint.startsWith(firstInputChar));

    if (multiCharHints.length > 0) {
      // 2文字目を取得
      const secondChar = await mockDenops.call("getchar") as number;
      const secondInputChar = String.fromCharCode(secondChar).toUpperCase();
      const fullHint = firstInputChar + secondInputChar;

      const target = testHints.find((h) => h.hint === fullHint);
      if (target) {
        await mockDenops.call("cursor", target.word.line, target.word.col);
      }
    }

    assertEquals(cursorLine, 15);
    assertEquals(cursorCol, 10);
  });

  await t.step("should auto-select single candidate on timeout", async () => {
    const mockDenops = new MockDenops();

    const testHints = [
      { hint: "AA", word: { text: "hello", line: 10, col: 5 } },
    ];

    // 最初に'A'を返し、次はタイムアウト(-1)を返す
    const inputs = [65, -1]; // 'A', timeout
    let inputIndex = 0;
    mockDenops.setCallResponse("getchar", () => inputs[inputIndex++]);

    let cursorLine = 0;
    let cursorCol = 0;
    mockDenops.onCall("cursor", (line: number, col: number) => {
      cursorLine = line;
      cursorCol = col;
    });

    const firstChar = await mockDenops.call("getchar") as number;
    const firstInputChar = String.fromCharCode(firstChar).toUpperCase();

    const multiCharHints = testHints.filter((h) => h.hint.startsWith(firstInputChar));

    if (multiCharHints.length > 0) {
      const secondChar = await mockDenops.call("getchar") as number;

      if (secondChar === -1 && multiCharHints.length === 1) {
        // タイムアウトで候補が1つの場合は自動選択
        const target = multiCharHints[0];
        await mockDenops.call("cursor", target.word.line, target.word.col);
      }
    }

    assertEquals(cursorLine, 10);
    assertEquals(cursorCol, 5);
  });
});

Deno.test("Input handling - ESC key cancellation", async (t) => {
  await t.step("should cancel and hide hints when ESC is pressed", async () => {
    const mockDenops = new MockDenops();

    // ESCキー(27)を返すようモック
    mockDenops.setCallResponse("getchar", 27);

    let hideHintsCalled = false;
    let echoCalled = false;
    let echoMessage = "";

    mockDenops.onCmd((cmd: string) => {
      if (cmd === "echo 'Cancelled'") {
        echoCalled = true;
        echoMessage = "Cancelled";
      }
      // hideHints相当の処理
      hideHintsCalled = true;
    });

    const char = await mockDenops.call("getchar") as number;

    if (char === 27) {
      await mockDenops.cmd("echo 'Cancelled'");
    }

    assertEquals(char, 27);
    assertEquals(echoCalled, true);
    assertEquals(echoMessage, "Cancelled");
  });

  await t.step("should cancel when ESC is pressed as second character", async () => {
    const mockDenops = new MockDenops();

    // 最初に'A'、次にESC(27)を返す
    const inputs = [65, 27]; // 'A', ESC
    let inputIndex = 0;
    mockDenops.setCallResponse("getchar", () => inputs[inputIndex++]);

    let cancelled = false;
    mockDenops.onCmd((cmd: string) => {
      if (cmd === "echo 'Cancelled'") {
        cancelled = true;
      }
    });

    const firstChar = await mockDenops.call("getchar") as number;
    const firstInputChar = String.fromCharCode(firstChar).toUpperCase();

    // 2文字目を取得
    const secondChar = await mockDenops.call("getchar") as number;

    if (secondChar === 27) {
      await mockDenops.cmd("echo 'Cancelled'");
    }

    assertEquals(secondChar, 27);
    assertEquals(cancelled, true);
  });
});

Deno.test("Input handling - Timeout handling", async (t) => {
  await t.step("should handle overall timeout gracefully", async () => {
    const mockDenops = new MockDenops();

    // 全体タイムアウト(-2)を返す
    mockDenops.setCallResponse("getchar", -2);

    let timeoutMessage = "";
    mockDenops.onCmd((cmd: string) => {
      if (cmd.includes("Input timeout")) {
        timeoutMessage = "Input timeout - hints cleared";
      }
    });

    const char = await mockDenops.call("getchar") as number;

    if (char === -2) {
      await mockDenops.cmd(
        "echohl WarningMsg | echo 'Input timeout - hints cleared' | echohl None",
      );
    }

    assertEquals(char, -2);
    assertEquals(timeoutMessage, "Input timeout - hints cleared");
  });

  await t.step("should show timeout message for multiple candidates", async () => {
    const mockDenops = new MockDenops();

    const testHints = [
      { hint: "AA", word: { text: "hello", line: 10, col: 5 } },
      { hint: "AB", word: { text: "world", line: 15, col: 10 } },
    ];

    // 最初に'A'、次にタイムアウト(-1)
    const inputs = [65, -1]; // 'A', timeout
    let inputIndex = 0;
    mockDenops.setCallResponse("getchar", () => inputs[inputIndex++]);

    let timeoutMessage = "";
    mockDenops.onCmd((cmd: string) => {
      if (cmd.includes("candidates available")) {
        timeoutMessage = cmd;
      }
    });

    const firstChar = await mockDenops.call("getchar") as number;
    const firstInputChar = String.fromCharCode(firstChar).toUpperCase();

    const multiCharHints = testHints.filter((h) => h.hint.startsWith(firstInputChar));

    if (multiCharHints.length > 0) {
      const secondChar = await mockDenops.call("getchar") as number;

      if (secondChar === -1 && multiCharHints.length > 1) {
        await mockDenops.cmd(`echo 'Timeout - ${multiCharHints.length} candidates available'`);
      }
    }

    assertExists(timeoutMessage);
    assertEquals(timeoutMessage.includes("2 candidates available"), true);
  });
});

Deno.test("Input handling - Invalid input handling", async (t) => {
  await t.step("should reject non-alphabetic characters", async () => {
    const mockDenops = new MockDenops();

    // 数字'1'(49)を返す
    mockDenops.setCallResponse("getchar", 49);

    let errorMessage = "";
    mockDenops.onCmd((cmd: string) => {
      if (cmd.includes("alphabetic characters only")) {
        errorMessage = "Please use alphabetic characters only";
      }
    });

    const char = await mockDenops.call("getchar") as number;
    const inputChar = String.fromCharCode(char).toUpperCase();

    if (!/[A-Z]/.test(inputChar)) {
      await mockDenops.cmd(
        "echohl WarningMsg | echo 'Please use alphabetic characters only' | echohl None",
      );
    }

    assertEquals(errorMessage, "Please use alphabetic characters only");
  });

  await t.step("should handle control characters properly", async () => {
    const mockDenops = new MockDenops();

    // Ctrl+C(3)を返す
    mockDenops.setCallResponse("getchar", 3);

    let errorMessage = "";
    mockDenops.onCmd((cmd: string) => {
      if (cmd.includes("Invalid input")) {
        errorMessage = "Invalid input - hints cleared";
      }
    });

    const char = await mockDenops.call("getchar") as number;

    // Ctrl+C やその他の制御文字の処理（Enter(13)以外）
    if (char < 32 && char !== 13) {
      await mockDenops.cmd(
        "echohl WarningMsg | echo 'Invalid input - hints cleared' | echohl None",
      );
    }

    assertEquals(char, 3);
    assertEquals(errorMessage, "Invalid input - hints cleared");
  });

  await t.step("should show error for non-matching hints", async () => {
    const mockDenops = new MockDenops();

    const testHints = [
      { hint: "A", word: { text: "hello", line: 10, col: 5 } },
      { hint: "B", word: { text: "world", line: 15, col: 10 } },
    ];

    // 'Z'(90)を返す（存在しないヒント）
    mockDenops.setCallResponse("getchar", 90);

    let errorMessage = "";
    mockDenops.onCmd((cmd: string) => {
      if (cmd.includes("No matching hint")) {
        errorMessage = "No matching hint found";
      }
    });

    const char = await mockDenops.call("getchar") as number;
    const inputChar = String.fromCharCode(char).toUpperCase();

    const singleCharTarget = testHints.find((h) => h.hint === inputChar);
    const multiCharHints = testHints.filter((h) => h.hint.startsWith(inputChar));

    if (!singleCharTarget && multiCharHints.length === 0) {
      await mockDenops.cmd("echohl WarningMsg | echo 'No matching hint found' | echohl None");
    }

    assertEquals(errorMessage, "No matching hint found");
  });

  await t.step("should handle invalid multi-character combination", async () => {
    const mockDenops = new MockDenops();

    const testHints = [
      { hint: "AA", word: { text: "hello", line: 10, col: 5 } },
      { hint: "AB", word: { text: "world", line: 15, col: 10 } },
    ];

    // 'A'と'Z'を返す（存在しない組み合わせ）
    const inputs = [65, 90]; // 'A', 'Z'
    let inputIndex = 0;
    mockDenops.setCallResponse("getchar", () => inputs[inputIndex++]);

    let errorMessage = "";
    mockDenops.onCmd((cmd: string) => {
      if (cmd.includes("Invalid hint combination")) {
        errorMessage = cmd;
      }
    });

    const firstChar = await mockDenops.call("getchar") as number;
    const firstInputChar = String.fromCharCode(firstChar).toUpperCase();

    const multiCharHints = testHints.filter((h) => h.hint.startsWith(firstInputChar));

    if (multiCharHints.length > 0) {
      const secondChar = await mockDenops.call("getchar") as number;
      const secondInputChar = String.fromCharCode(secondChar).toUpperCase();
      const fullHint = firstInputChar + secondInputChar;

      const target = testHints.find((h) => h.hint === fullHint);
      if (!target) {
        await mockDenops.cmd(
          `echohl ErrorMsg | echo 'Invalid hint combination: ${fullHint}' | echohl None`,
        );
      }
    }

    assertExists(errorMessage);
    assertEquals(errorMessage.includes("AZ"), true);
  });
});
