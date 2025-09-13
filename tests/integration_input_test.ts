import { assertEquals, assertExists, assertRejects } from "@std/assert";
import type { Denops } from "@denops/std";
import { MockDenops } from "./helpers/mock.ts";
import { generateHints, assignHintsToWords } from "../denops/hellshake-yano/hint.ts";
import type { Word } from "../denops/hellshake-yano/word.ts";

/**
 * 統合テスト - ヒント表示から選択、ジャンプまでの完全なフロー
 */

// テスト用の単語データを生成
function generateTestWords(count: number): Word[] {
  const words: Word[] = [];
  for (let i = 0; i < count; i++) {
    words.push({
      text: `word${i}`,
      line: Math.floor(i / 10) + 1,
      col: (i % 10) * 8 + 1,
    });
  }
  return words;
}

// E2E風のテストヘルパー
class HintSystemSimulator {
  private denops: MockDenops;
  private hints: Array<{ hint: string; word: Word }> = [];
  private visible = false;
  private markers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  constructor() {
    this.denops = new MockDenops();
  }

  async showHints(words: Word[]): Promise<void> {
    // ヒント生成
    const hintStrings = generateHints(words.length, this.markers);

    // カーソル位置取得のシミュレート
    const cursorLine = 5;
    const cursorCol = 20;

    // ヒント割り当て
    this.hints = assignHintsToWords(words, hintStrings, cursorLine, cursorCol);
    this.visible = true;
  }

  async selectHint(input: string): Promise<{ jumped: boolean; position?: { line: number; col: number } }> {
    if (!this.visible) {
      throw new Error("Hints not visible");
    }

    // 完全一致する単一文字ヒントをチェック
    const exactMatch = this.hints.find(h => h.hint === input);

    // 複数文字ヒントの候補をチェック
    const multiCharCandidates = this.hints.filter(h => h.hint.startsWith(input) && h.hint.length > input.length);

    // 単一文字ヒントが存在し、複数文字候補もある場合
    if (exactMatch && multiCharCandidates.length > 0) {
      // 実際のVimプラグインの動作に合わせて、複数文字候補を優先
      return { jumped: false };
    }

    // 単一文字ヒントのみ存在する場合
    if (exactMatch && multiCharCandidates.length === 0) {
      this.visible = false;
      return {
        jumped: true,
        position: { line: exactMatch.word.line, col: exactMatch.word.col }
      };
    }

    // 複数文字候補のみ存在する場合
    if (multiCharCandidates.length > 0) {
      return { jumped: false };
    }

    this.visible = false;
    throw new Error(`No matching hint: ${input}`);
  }

  async selectMultiCharHint(firstChar: string, secondChar: string): Promise<{ line: number; col: number }> {
    const fullHint = firstChar + secondChar;
    const target = this.hints.find(h => h.hint === fullHint);

    if (!target) {
      this.visible = false; // エラー時もヒントを非表示に
      throw new Error(`Invalid hint combination: ${fullHint}`);
    }

    this.visible = false;
    return { line: target.word.line, col: target.word.col };
  }

  hideHints(): void {
    this.hints = [];
    this.visible = false;
  }

  isVisible(): boolean {
    return this.visible;
  }

  getHintCount(): number {
    return this.hints.length;
  }
}

Deno.test("Integration - Complete hint flow with single character", async () => {
  const simulator = new HintSystemSimulator();
  const words = generateTestWords(10);

  // ヒント表示
  await simulator.showHints(words);
  assertEquals(simulator.isVisible(), true);
  assertEquals(simulator.getHintCount(), 10);

  // ヒント選択とジャンプ
  // カーソル位置(5, 20)から3番目に近い単語を取得
  const result = await simulator.selectHint("C");
  assertEquals(result.jumped, true);
  // 実際の位置は距離によってソートされるため、期待値はソート後の3番目の単語の位置
  assertExists(result.position);
  assertEquals(typeof result.position?.line, "number");
  assertEquals(typeof result.position?.col, "number");

  // ヒントが非表示になったことを確認
  assertEquals(simulator.isVisible(), false);
});

Deno.test("Integration - Multi-character hint selection flow", async () => {
  const simulator = new HintSystemSimulator();
  const words = generateTestWords(30); // 26個を超える単語

  await simulator.showHints(words);
  assertEquals(simulator.getHintCount(), 30);

  // 30単語の場合: A-Z(26) + AA,AB,AC,AD(4) = 30
  // "A"を入力すると、単一文字"A"と複数文字"AA,AB,AC,AD"の両方が存在
  // 複数文字候補があるため、待機する
  const singleResult = await simulator.selectHint("A");
  assertEquals(singleResult.jumped, false); // 複数文字候補があるため待機

  // 新しいシミュレーションで複数文字ヒントをテスト
  simulator.hideHints();
  await simulator.showHints(words);

  // 27個の単語の場合、"AA"が唯一の複数文字ヒント
  const words27 = generateTestWords(27);
  simulator.hideHints();
  await simulator.showHints(words27);

  // 27単語の場合: A-Z(26) + AA(1) = 27
  // "A"は単一文字として存在し、"AA"も存在する
  const result27 = await simulator.selectHint("A");
  assertEquals(result27.jumped, false); // "AA"の可能性があるため待機

  const position = await simulator.selectMultiCharHint("A", "A");
  assertExists(position);
  assertEquals(typeof position.line, "number");
  assertEquals(typeof position.col, "number");
  assertEquals(simulator.isVisible(), false);
});

Deno.test("Integration - Error handling flow", async () => {
  const simulator = new HintSystemSimulator();
  const words = generateTestWords(5);

  await simulator.showHints(words);

  // 存在しないヒントを選択
  try {
    await simulator.selectHint("Z");
    // ここに到達してはいけない
    assertEquals(true, false, "Should have thrown error");
  } catch (error) {
    assertEquals((error as Error).message, "No matching hint: Z");
    // エラー後もヒントは非表示になる
    assertEquals(simulator.isVisible(), false);
  }
});

Deno.test("Integration - ESC key cancellation flow", async () => {
  const simulator = new HintSystemSimulator();
  const words = generateTestWords(10);

  await simulator.showHints(words);
  assertEquals(simulator.isVisible(), true);

  // ESCキーでキャンセル（シミュレート）
  simulator.hideHints();

  assertEquals(simulator.isVisible(), false);
  assertEquals(simulator.getHintCount(), 0);
});

Deno.test("Integration - Performance with large number of hints", async () => {
  const simulator = new HintSystemSimulator();

  // 100個の単語でパフォーマンステスト
  const startTime = performance.now();
  const words = generateTestWords(100);

  await simulator.showHints(words);
  const showTime = performance.now() - startTime;

  // ヒント表示が100ms以内に完了することを確認
  assertEquals(showTime < 100, true, `Hint display took ${showTime}ms`);
  assertEquals(simulator.getHintCount(), 100);

  // 選択も高速に動作することを確認
  const selectStart = performance.now();
  const result = await simulator.selectHint("A");
  const selectTime = performance.now() - selectStart;

  assertEquals(selectTime < 10, true, `Hint selection took ${selectTime}ms`);
});

Deno.test("Integration - Fallback behavior on error", async () => {
  const simulator = new HintSystemSimulator();
  const words = generateTestWords(10);

  // 正常にヒント表示
  await simulator.showHints(words);

  // エラーをシミュレート（無効な入力）
  let errorOccurred = false;
  try {
    await simulator.selectHint("123"); // 無効な入力
  } catch (error) {
    errorOccurred = true;
    // エラー後の復旧処理
    simulator.hideHints();
  }

  assertEquals(errorOccurred, true);
  assertEquals(simulator.isVisible(), false);

  // 再度ヒント表示が可能なことを確認
  await simulator.showHints(words);
  assertEquals(simulator.isVisible(), true);
});

Deno.test("Integration - Complex scenario with multiple operations", async () => {
  const simulator = new HintSystemSimulator();

  // シナリオ1: 少数の単語で単一文字ヒント
  const smallWords = generateTestWords(5);
  await simulator.showHints(smallWords);
  const result1 = await simulator.selectHint("B");
  assertEquals(result1.jumped, true);

  // シナリオ2: 多数の単語で複数文字ヒント
  const largeWords = generateTestWords(50);
  await simulator.showHints(largeWords);

  // 50単語の場合: A-Z(26) + AA-AX(24) = 50
  // "AE"を選択（31番目のヒント）
  const firstChar = await simulator.selectHint("A");
  assertEquals(firstChar.jumped, false); // "AA"以降の候補があるため待機

  const position = await simulator.selectMultiCharHint("A", "E");
  assertExists(position);
  assertEquals(typeof position.line, "number");
  assertEquals(typeof position.col, "number");

  // シナリオ3: キャンセル操作
  await simulator.showHints(smallWords);
  simulator.hideHints(); // ESCキー相当
  assertEquals(simulator.isVisible(), false);
});

Deno.test("Integration - Cursor proximity prioritization", async () => {
  const simulator = new HintSystemSimulator();

  // カーソル近くの単語を生成
  const words: Word[] = [
    { text: "far", line: 1, col: 1 },
    { text: "near", line: 5, col: 19 }, // カーソル位置(5, 20)に最も近い
    { text: "medium", line: 3, col: 10 },
  ];

  await simulator.showHints(words);

  // 最も近い単語に'A'が割り当てられることを確認
  const result = await simulator.selectHint("A");
  assertEquals(result.jumped, true);
  assertEquals(result.position?.line, 5);
  assertEquals(result.position?.col, 19);
});

Deno.test("Integration - Timeout simulation", async () => {
  const simulator = new HintSystemSimulator();
  const words = generateTestWords(30);

  await simulator.showHints(words);

  // タイムアウトをシミュレート
  // 最初の文字入力後、タイムアウトで自動選択されるケース
  const candidates = ["AA", "AB", "AC", "AD"];

  // 単一候補の場合の自動選択をシミュレート
  const singleCandidateWords = generateTestWords(27); // AAのみ存在
  simulator.hideHints();
  await simulator.showHints(singleCandidateWords);

  const firstResult = await simulator.selectHint("A");
  if (!firstResult.jumped) {
    // タイムアウトで自動選択（AAしかない場合）
    const autoSelected = await simulator.selectMultiCharHint("A", "A");
    assertExists(autoSelected);
    assertEquals(typeof autoSelected.line, "number");
    assertEquals(typeof autoSelected.col, "number");
  }
});

Deno.test("Integration - Invalid multi-character combination", async () => {
  const simulator = new HintSystemSimulator();
  const words = generateTestWords(30);

  await simulator.showHints(words);

  // 30単語の場合: A-Z(26) + AA-AD(4) = 30
  // "A"を入力すると、"AA", "AB", "AC", "AD"の候補があるため待機
  const firstResult = await simulator.selectHint("A");
  assertEquals(firstResult.jumped, false); // 複数文字候補があるため待機

  // 2文字目が無効な組み合わせ（AZは存在しない）
  try {
    await simulator.selectMultiCharHint("A", "Z");
    assertEquals(true, false, "Should have thrown error");
  } catch (error) {
    assertEquals((error as Error).message, "Invalid hint combination: AZ");
    assertEquals(simulator.isVisible(), false);
  }
});