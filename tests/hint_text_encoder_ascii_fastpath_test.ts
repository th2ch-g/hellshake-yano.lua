import { assertEquals } from "@std/assert";

Deno.test({
  name: "assignHintsToWords は ASCII 単語では TextEncoder.encode を呼び出さない",
  async fn() {
    const OriginalTextEncoder = globalThis.TextEncoder;
    let encodeCount = 0;

    class CountingTextEncoder extends OriginalTextEncoder {
      override encode(input?: string): Uint8Array {
        encodeCount++;
        return super.encode(input);
      }
    }

    globalThis.TextEncoder = CountingTextEncoder as typeof TextEncoder;

    try {
      const { assignHintsToWords } = await import(
        "../denops/hellshake-yano/hint.ts?ascii-fastpath"
      );

      const words = [
        { text: "hello", line: 1, col: 1, byteCol: 1 },
      ];
      const hints = ["A"];

      const mappings = assignHintsToWords(words, hints, 1, 1, "normal", {
        hint_position: "end",
      });

      assertEquals(mappings.length, 1);
      assertEquals(encodeCount, 0);
    } finally {
      globalThis.TextEncoder = OriginalTextEncoder;
    }
  },
});

Deno.test({
  name: "assignHintsToWords は同じ非ASCII単語で TextEncoder.encode を共有する",
  async fn() {
    const OriginalTextEncoder = globalThis.TextEncoder;
    let encodeCount = 0;

    class CountingTextEncoder extends OriginalTextEncoder {
      override encode(input?: string): Uint8Array {
        encodeCount++;
        return super.encode(input);
      }
    }

    globalThis.TextEncoder = CountingTextEncoder as typeof TextEncoder;

    try {
      const { assignHintsToWords } = await import(
        "../denops/hellshake-yano/hint.ts?multibyte-cache"
      );

      const words = [
        { text: "終点", line: 1, col: 1, byteCol: 1 },
        { text: "終点", line: 2, col: 3, byteCol: 3 },
      ];
      const hints = ["A", "B"];

      const mappings = assignHintsToWords(words, hints, 1, 1, "normal", {
        hint_position: "end",
      });

      assertEquals(mappings.length, 2);

      const firstByteCol = mappings[0].hintByteCol;
      const secondByteCol = mappings[1].hintByteCol;

      assertEquals(firstByteCol, 6);
      assertEquals(secondByteCol, 8);
      assertEquals(encodeCount, 0);
    } finally {
      globalThis.TextEncoder = OriginalTextEncoder;
    }
  },
});
