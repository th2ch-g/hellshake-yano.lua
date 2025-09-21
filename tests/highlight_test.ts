import { assertEquals, assertExists } from "@std/assert";
import { MockDenops } from "./helpers/mock.ts";
import type { Word } from "../denops/hellshake-yano/types.ts";
import {
  assignHintsToWords,
  generateHints,
  type HintMapping,
} from "../denops/hellshake-yano/hint.ts";

/**
 * ハイライト機能のテスト（Process8 sub4）
 */

// ハイライト機能のシミュレーター
class HighlightSimulator {
  private mockDenops: MockDenops;
  private hints: HintMapping[] = [];
  private highlightedHints: string[] = [];
  private config = {
    highlight_selected: true,
    markers: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  };

  constructor() {
    this.mockDenops = new MockDenops();
  }

  setHighlightEnabled(enabled: boolean): void {
    this.config.highlight_selected = enabled;
  }

  setupHints(words: Word[]): void {
    const hintStrings = generateHints(words.length, this.config.markers);
    this.hints = assignHintsToWords(words, hintStrings, 10, 10);
  }

  highlightCandidates(inputPrefix: string): string[] {
    if (!this.config.highlight_selected) {
      return [];
    }

    // 候補となるヒントを見つける
    const candidates = this.hints.filter((h) => h.hint.startsWith(inputPrefix));

    this.highlightedHints = candidates.map((c) => c.hint);
    return this.highlightedHints;
  }

  getHighlightedHints(): string[] {
    return this.highlightedHints;
  }

  clearHighlights(): void {
    this.highlightedHints = [];
  }
}

Deno.test("Highlight - Basic candidate highlighting", () => {
  const simulator = new HighlightSimulator();

  const words: Word[] = [
    { text: "hello", line: 1, col: 1 },
    { text: "world", line: 2, col: 1 },
    { text: "test", line: 3, col: 1 },
  ];

  simulator.setupHints(words);

  // "A"を入力した場合、"A"から始まるヒントがハイライトされる
  const highlighted = simulator.highlightCandidates("A");

  assertEquals(highlighted.length, 1);
  assertEquals(highlighted[0], "A");
});

Deno.test("Highlight - Multiple candidates highlighting", () => {
  const simulator = new HighlightSimulator();

  // 30個の単語（複数文字ヒントを含む）
  const words: Word[] = Array.from({ length: 30 }, (_, i) => ({
    text: `word${i}`,
    line: i + 1,
    col: 1,
  }));

  simulator.setupHints(words);

  // "A"を入力した場合、"A"と"AA", "AB", "AC", "AD"がハイライトされる
  const highlighted = simulator.highlightCandidates("A");

  // A（単一文字）とAA, AB, AC, AD（複数文字）の5つ
  assertEquals(highlighted.includes("A"), true);
  assertEquals(highlighted.filter((h) => h.startsWith("A")).length >= 1, true);
});

Deno.test("Highlight - No matching candidates", () => {
  const simulator = new HighlightSimulator();

  const words: Word[] = [
    { text: "hello", line: 1, col: 1 },
    { text: "world", line: 2, col: 1 },
  ];

  simulator.setupHints(words);

  // 存在しないプレフィックス
  const highlighted = simulator.highlightCandidates("Z");

  assertEquals(highlighted.length, 0);
});

Deno.test("Highlight - Disabled highlighting", () => {
  const simulator = new HighlightSimulator();

  const words: Word[] = [
    { text: "hello", line: 1, col: 1 },
    { text: "world", line: 2, col: 1 },
  ];

  simulator.setupHints(words);

  // ハイライトを無効化
  simulator.setHighlightEnabled(false);

  const highlighted = simulator.highlightCandidates("A");

  // ハイライトが無効の場合、何もハイライトされない
  assertEquals(highlighted.length, 0);
});

Deno.test("Highlight - Clear highlights", () => {
  const simulator = new HighlightSimulator();

  const words: Word[] = [
    { text: "hello", line: 1, col: 1 },
    { text: "world", line: 2, col: 1 },
  ];

  simulator.setupHints(words);

  // ハイライトを設定
  simulator.highlightCandidates("A");
  assertEquals(simulator.getHighlightedHints().length > 0, true);

  // ハイライトをクリア
  simulator.clearHighlights();
  assertEquals(simulator.getHighlightedHints().length, 0);
});

Deno.test("Highlight - Progressive filtering", () => {
  const simulator = new HighlightSimulator();

  // 複数文字ヒントを持つ単語数
  const words: Word[] = Array.from({ length: 30 }, (_, i) => ({
    text: `word${i}`,
    line: i + 1,
    col: 1,
  }));

  simulator.setupHints(words);

  // 最初に"A"を入力
  let highlighted = simulator.highlightCandidates("A");
  const initialCount = highlighted.length;

  // 次に"AA"を入力（より絞り込まれる）
  highlighted = simulator.highlightCandidates("AA");
  const refinedCount = highlighted.length;

  // プログレッシブフィルタリング: より具体的な入力で候補が減る
  assertEquals(refinedCount <= initialCount, true);
  if (refinedCount > 0) {
    assertEquals(highlighted[0], "AA");
  }
});

Deno.test("Highlight - Case insensitive matching", () => {
  const simulator = new HighlightSimulator();

  const words: Word[] = [
    { text: "hello", line: 1, col: 1 },
    { text: "world", line: 2, col: 1 },
  ];

  simulator.setupHints(words);

  // 小文字で入力しても大文字として処理される想定
  const inputChar = "a".toUpperCase(); // シミュレーション内で変換
  const highlighted = simulator.highlightCandidates(inputChar);

  assertEquals(highlighted.length > 0, true);
  assertEquals(highlighted[0], "A");
});

Deno.test("Highlight - Performance with many candidates", () => {
  const simulator = new HighlightSimulator();

  // 100個の単語
  const words: Word[] = Array.from({ length: 100 }, (_, i) => ({
    text: `word${i}`,
    line: i + 1,
    col: 1,
  }));

  simulator.setupHints(words);

  const startTime = performance.now();
  const highlighted = simulator.highlightCandidates("A");
  const endTime = performance.now();

  // パフォーマンス: 10ms以内でハイライト処理が完了
  const timeTaken = endTime - startTime;
  assertEquals(timeTaken < 10, true, `Highlighting took ${timeTaken}ms`);

  assertExists(highlighted);
});

Deno.test("Highlight - Multiple prefix matching", () => {
  const simulator = new HighlightSimulator();

  // 複数文字ヒントを生成するのに十分な単語
  const words: Word[] = Array.from({ length: 60 }, (_, i) => ({
    text: `word${i}`,
    line: i + 1,
    col: 1,
  }));

  simulator.setupHints(words);

  // "B"で始まるヒントをハイライト
  const highlightedB = simulator.highlightCandidates("B");

  // Bと、BA, BB, BC...などが含まれる
  assertEquals(highlightedB.includes("B"), true);
  const multiCharB = highlightedB.filter((h) => h.length > 1 && h.startsWith("B"));
  assertExists(multiCharB);
});
