import { assertEquals } from "@std/assert";

Deno.test({
  name: "assignHintsToWords はヒントアクセスまでバイト長を計算しない",
  async fn() {
    const OriginalTextEncoder = globalThis.TextEncoder;
    let encodeCount = 0;

    class CountingTextEncoder extends OriginalTextEncoder {
      override encode(input?: string): Uint8Array<ArrayBuffer> {
        encodeCount++;
        return super.encode(input);
      }
    }

    globalThis.TextEncoder = CountingTextEncoder as typeof TextEncoder;

    try {
      const { assignHintsToWords } = await import(
        "../denops/hellshake-yano/hint.ts?lazy-eval-test"
      );

      const words = [
        { text: "終点", line: 1, col: 1, byteCol: 1 },
      ];
      const hints = ["A"];

      const mappings = assignHintsToWords(words, hints, 1, 1, "normal", {hintPosition: "end",
      });

      assertEquals(encodeCount, 0, "計算前にencodeが呼ばれていないこと");

      const hint = mappings[0];
      assertEquals(hint.hint, "A");
      assertEquals(hint.word.text, "終点");

      const byteCol = hint.hintByteCol;
      assertEquals(byteCol, 6);
      assertEquals(encodeCount, 1, "初回アクセス時にのみencodeが呼ばれる");
    } finally {
      globalThis.TextEncoder = OriginalTextEncoder;
    }
  },
});
