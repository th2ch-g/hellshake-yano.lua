import { assertEquals } from "@std/assert";

Deno.test({
  name: "assignHintsToWords はモードごとにキャッシュを独立させる",
  async fn() {
    const { assignHintsToWords } = await import(
      "../denops/hellshake-yano/hint.ts?mode-cache-separation"
    );

    let baseText = "終点";
    let textAccessCount = 0;
    const baseWord: any = { line: 1, col: 1, byteCol: 1 };
    Object.defineProperty(baseWord, "text", {
      configurable: true,
      get() {
        textAccessCount++;
        return baseText;
      },
    });

    const hints = ["A"];

    // 正常系キャッシュを初期化
    assignHintsToWords([baseWord], hints, 1, 1, "normal", {
      hint_position: "end",
    });

    // Normal mode のキャッシュを上限まで埋める
    for (let i = 0; i < 99; i++) {
      const word = { text: `n${i}`, line: i + 2, col: 1, byteCol: 1 };
      assignHintsToWords([word], hints, 1, 1, "normal", {
        hint_position: "end",
      });
    }

    // Visual mode のキャッシュを大量に追加
    textAccessCount = 0;
    for (let i = 0; i < 100; i++) {
      const word = { text: `v${i}`, line: i + 200, col: 1, byteCol: 1 };
      assignHintsToWords([word], hints, 1, 1, "visual", {
        hint_position: "start",
        visual_hint_position: "end",
      });
    }

    assignHintsToWords([baseWord], ["B"], 1, 1, "normal", {
      hint_position: "end",
    });

    assertEquals(textAccessCount, 0);
  },
});
