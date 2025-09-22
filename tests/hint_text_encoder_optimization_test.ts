import { assertEquals } from "@std/assert";

Deno.test({
  name: "assignHintsToWords は TextEncoder を単一インスタンスで再利用する",
  async fn() {
    const OriginalTextEncoder = globalThis.TextEncoder;
    let constructCount = 0;

    class CountingTextEncoder extends OriginalTextEncoder {
      constructor() {
        super();
        constructCount++;
      }
    }

    globalThis.TextEncoder = CountingTextEncoder as typeof TextEncoder;

    try {
      const { assignHintsToWords } = await import(
        "../denops/hellshake-yano/hint.ts?text-encoder-singleton-test"
      );

      const words = [
        { text: "hello", line: 1, col: 1, byteCol: 1 },
        { text: "😀", line: 1, col: 7, byteCol: 7 },
        { text: "終点", line: 2, col: 3, byteCol: 3 },
      ];
      const hints = ["A", "B", "C"];

      const mappings = assignHintsToWords(words, hints, 1, 1, "normal", {
        hint_position: "end",
      });

      assertEquals(mappings.length, words.length);
      assertEquals(constructCount, 1);
    } finally {
      globalThis.TextEncoder = OriginalTextEncoder;
    }
  },
});
