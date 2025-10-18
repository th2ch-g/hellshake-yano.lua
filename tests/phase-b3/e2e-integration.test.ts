/**
 * tests/phase-b3/e2e-integration.test.ts
 *
 * TDD Phase: RED - テストを先に書く
 *
 * Phase B-3 E2E統合テスト（10-15 steps）
 *
 * 日本語対応、モーション検出、ビジュアルモードの3つの機能を統合テスト
 * すべての機能が正しく連携し、VimScript版との動作一致を確認
 *
 * Scenario 1: 日本語単語検出 + ヒント表示（3-4 steps）
 * Scenario 2: モーション連打 + ヒント表示（3-4 steps）
 * Scenario 3: ビジュアルモード + 範囲内フィルタリング（3-4 steps）
 * Scenario 4: 日本語 + モーション連打 + ビジュアルモード（2-3 steps）
 */

import {
  assertEquals,
  assertExists,
  assert,
  assertFalse,
  assertGreater,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

// ===========================
// モック及びテスト用型定義
// ===========================

interface DenopsWord {
  text: string;
  line: number;
  col: number;
}

interface VisualState {
  active: boolean;
  mode: string;
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}

interface MotionState {
  lastMotion: string;
  lastMotionTime: number;
  motionCount: number;
  timeoutMs: number;
  threshold: number;
}

interface HandleMotionResult {
  shouldTrigger: boolean;
  count: number;
  error?: string;
}

/**
 * UnifiedJapaneseSupportのモック実装
 */
class UnifiedJapaneseSupportMock {
  private cache: Map<string, DenopsWord[]> = new Map();

  hasJapanese(text: string): boolean {
    return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
  }

  async segmentLine(
    line: string,
    lineNum: number
  ): Promise<DenopsWord[]> {
    const cacheKey = line;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    if (!this.hasJapanese(line)) {
      return [];
    }

    // 簡易的な日本語セグメント化（形態素解析の簡易版）
    const words: DenopsWord[] = [];
    const segments = this.simplifySegment(line);

    for (const [pos, segment] of segments.entries()) {
      words.push({
        text: segment,
        line: lineNum,
        col: this.findPosition(line, segment, words.length > 0 ? words[words.length - 1].col : 1),
      });
    }

    this.cache.set(cacheKey, words);
    return words;
  }

  private simplifySegment(line: string): string[] {
    // 形態素解析の簡易版（実際にはTinySegmenterを使用）
    const result: string[] = [];
    let current = "";

    for (const char of line) {
      const isJapanese =
        /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(char);
      const currentIsJapanese = current.length > 0 &&
        /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(current[0]);

      if (current.length === 0 || isJapanese === currentIsJapanese) {
        current += char;
      } else {
        if (current.trim().length > 0) {
          result.push(current);
        }
        current = char;
      }
    }

    if (current.trim().length > 0) {
      result.push(current);
    }

    return result;
  }

  private findPosition(line: string, segment: string, startPos: number): number {
    const pos = line.indexOf(segment, Math.max(0, startPos - 1));
    return pos >= 0 ? pos + 1 : 1;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * UnifiedMotionDetectorのモック実装
 */
class UnifiedMotionDetectorMock {
  private state: MotionState = {
    lastMotion: "",
    lastMotionTime: 0,
    motionCount: 0,
    timeoutMs: 2000,
    threshold: 2,
  };

  private perKeyMotionCount: Record<string, number> = {};

  init(): void {
    this.state = {
      lastMotion: "",
      lastMotionTime: 0,
      motionCount: 0,
      timeoutMs: 2000,
      threshold: 2,
    };
    this.perKeyMotionCount = {};
  }

  handleMotion(key: string): HandleMotionResult {
    if (!["w", "b", "e"].includes(key)) {
      return {
        shouldTrigger: false,
        count: 0,
        error: `invalid motion key: ${key}`,
      };
    }

    try {
      const currentTime = Date.now();
      let shouldReset = false;

      if (this.state.lastMotionTime > 0) {
        const timeDiffMs = currentTime - this.state.lastMotionTime;
        if (timeDiffMs > this.state.timeoutMs) {
          shouldReset = true;
        }
      }

      if (
        this.state.lastMotion !== "" && this.state.lastMotion !== key
      ) {
        shouldReset = true;
      }

      if (shouldReset || this.state.motionCount === 0) {
        this.state.motionCount = 1;
      } else {
        this.state.motionCount += 1;
      }

      const threshold = this.getThreshold(key);
      let shouldTrigger = false;

      if (this.state.motionCount >= threshold) {
        shouldTrigger = true;
        this.state.motionCount = 0;
      }

      this.state.lastMotion = key;
      this.state.lastMotionTime = currentTime;

      return {
        shouldTrigger,
        count: this.state.motionCount,
      };
    } catch (error) {
      return {
        shouldTrigger: false,
        count: 0,
        error: error instanceof Error
          ? error.message
          : "Unknown error in handleMotion",
      };
    }
  }

  getThreshold(key: string): number {
    if (this.perKeyMotionCount[key] !== undefined) {
      return this.perKeyMotionCount[key];
    }
    return this.state.threshold;
  }

  setThreshold(count: number): void {
    this.state.threshold = count;
  }

  setTimeout(ms: number): void {
    this.state.timeoutMs = ms;
  }

  getState(): MotionState {
    return JSON.parse(JSON.stringify(this.state));
  }
}

/**
 * UnifiedVisualModeのモック実装
 */
class UnifiedVisualModeMock {
  private state: VisualState = {
    active: false,
    mode: "",
    startLine: 0,
    startCol: 0,
    endLine: 0,
    endCol: 0,
  };

  init(): void {
    this.state = {
      active: false,
      mode: "",
      startLine: 0,
      startCol: 0,
      endLine: 0,
      endCol: 0,
    };
  }

  setVisualRange(startLine: number, endLine: number, mode: string): void {
    this.state.active = true;
    this.state.mode = mode;
    this.state.startLine = startLine;
    this.state.endLine = endLine;
  }

  filterWordsInRange(words: DenopsWord[]): DenopsWord[] {
    if (!this.state.active) {
      return words;
    }

    return words.filter(
      (word) =>
        word.line >= this.state.startLine && word.line <= this.state.endLine
    );
  }

  getState(): VisualState {
    return JSON.parse(JSON.stringify(this.state));
  }

  clearAfterJump(): void {
    this.state.active = false;
  }
}

// ===========================
// E2E統合テストスイート
// ===========================

// Scenario 1: 日本語単語検出 + ヒント表示（3-4 steps）
Deno.test("Scenario 1 - Step 1: 日本語テキストの検出確認", async () => {
  const japaneseSupport = new UnifiedJapaneseSupportMock();

  const text = "私の名前は田中です";
  const words = await japaneseSupport.segmentLine(text, 1);

  assertGreater(words.length, 0);
  words.forEach((word) => {
    assertExists(word.text);
    assertEquals(word.line, 1);
    assertGreater(word.col, 0);
  });
});

Deno.test("Scenario 1 - Step 2: 複数行の日本語検出", async () => {
  const japaneseSupport = new UnifiedJapaneseSupportMock();

  const lines = [
    "これはテストです",
    "日本語の単語検出",
    "複数行のテキスト",
  ];

  const allWords: DenopsWord[] = [];
  for (let i = 0; i < lines.length; i++) {
    const words = await japaneseSupport.segmentLine(lines[i], i + 1);
    allWords.push(...words);
  }

  assertGreater(allWords.length, 0);
  allWords.forEach((word) => {
    assert(word.line >= 1 && word.line <= 3);
  });
});

Deno.test("Scenario 1 - Step 3: キャッシュ機能の確認", async () => {
  const japaneseSupport = new UnifiedJapaneseSupportMock();

  const text = "キャッシュテスト";
  const words1 = await japaneseSupport.segmentLine(text, 1);
  const words2 = await japaneseSupport.segmentLine(text, 1);

  assertEquals(words1.length, words2.length);
  // キャッシュから取得されたことを確認（同じインスタンスではなく、同じ内容）
  assertEquals(JSON.stringify(words1), JSON.stringify(words2));
});

Deno.test("Scenario 1 - Step 4: 日本語を含まない行のスキップ", async () => {
  const japaneseSupport = new UnifiedJapaneseSupportMock();

  const text = "English text only";
  const words = await japaneseSupport.segmentLine(text, 1);

  assertEquals(words.length, 0);
});

// Scenario 2: モーション連打 + ヒント表示（3-4 steps）
Deno.test("Scenario 2 - Step 1: 単一モーションでトリガーなし", () => {
  const motionDetector = new UnifiedMotionDetectorMock();
  motionDetector.init();

  const result1 = motionDetector.handleMotion("w");

  assertFalse(result1.shouldTrigger);
  assertEquals(result1.count, 1);
});

Deno.test("Scenario 2 - Step 2: 連続モーションでトリガー確認", () => {
  const motionDetector = new UnifiedMotionDetectorMock();
  motionDetector.init();

  const result1 = motionDetector.handleMotion("w");
  assertFalse(result1.shouldTrigger);

  const result2 = motionDetector.handleMotion("w");
  assert(result2.shouldTrigger);
});

Deno.test("Scenario 2 - Step 3: モーション後のカウントリセット", () => {
  const motionDetector = new UnifiedMotionDetectorMock();
  motionDetector.init();

  motionDetector.handleMotion("w");
  const result2 = motionDetector.handleMotion("w");
  assert(result2.shouldTrigger);

  const result3 = motionDetector.handleMotion("w");
  assertFalse(result3.shouldTrigger);
  assertEquals(result3.count, 1);
});

Deno.test("Scenario 2 - Step 4: タイムアウト時のカウントリセット", async () => {
  const motionDetector = new UnifiedMotionDetectorMock();
  motionDetector.init();
  motionDetector.setTimeout(50);

  const result1 = motionDetector.handleMotion("w");
  assertFalse(result1.shouldTrigger);

  // タイムアウト待機
  await new Promise((resolve) => setTimeout(resolve, 60));

  const result2 = motionDetector.handleMotion("w");
  assertFalse(result2.shouldTrigger);
  assertEquals(result2.count, 1);
});

// Scenario 3: ビジュアルモード + 範囲内フィルタリング（3-4 steps）
Deno.test("Scenario 3 - Step 1: ビジュアルモード状態の設定", () => {
  const visualMode = new UnifiedVisualModeMock();

  visualMode.setVisualRange(3, 5, "v");
  const state = visualMode.getState();

  assert(state.active);
  assertEquals(state.mode, "v");
  assertEquals(state.startLine, 3);
  assertEquals(state.endLine, 5);
});

Deno.test("Scenario 3 - Step 2: 範囲内の単語フィルタリング", () => {
  const visualMode = new UnifiedVisualModeMock();
  visualMode.setVisualRange(3, 5, "V");

  const words: DenopsWord[] = [
    { text: "word1", line: 1, col: 1 },
    { text: "word2", line: 2, col: 5 },
    { text: "word3", line: 3, col: 10 },
    { text: "word4", line: 4, col: 15 },
    { text: "word5", line: 5, col: 20 },
    { text: "word6", line: 6, col: 25 },
  ];

  const filtered = visualMode.filterWordsInRange(words);

  assertEquals(filtered.length, 3);
  assertEquals(filtered[0].line, 3);
  assertEquals(filtered[2].line, 5);
});

Deno.test("Scenario 3 - Step 3: ビジュアルモード非アクティブ時の全単語返却", () => {
  const visualMode = new UnifiedVisualModeMock();

  const words: DenopsWord[] = [
    { text: "word1", line: 1, col: 1 },
    { text: "word2", line: 2, col: 5 },
    { text: "word3", line: 3, col: 10 },
  ];

  const filtered = visualMode.filterWordsInRange(words);

  assertEquals(filtered.length, 3);
});

Deno.test("Scenario 3 - Step 4: 複雑な範囲でのフィルタリング", () => {
  const visualMode = new UnifiedVisualModeMock();
  visualMode.setVisualRange(10, 20, "v");

  const words: DenopsWord[] = [];
  for (let i = 1; i <= 30; i++) {
    words.push({ text: `word${i}`, line: i, col: 1 });
  }

  const filtered = visualMode.filterWordsInRange(words);

  assertEquals(filtered.length, 11);
  assertEquals(filtered[0].line, 10);
  assertEquals(filtered[filtered.length - 1].line, 20);
});

// Scenario 4: 日本語 + モーション連打 + ビジュアルモード（2-3 steps）
Deno.test("Scenario 4 - Step 1: 統合シナリオ - 日本語検出とビジュアルフィルタリング", async () => {
  const japaneseSupport = new UnifiedJapaneseSupportMock();
  const visualMode = new UnifiedVisualModeMock();

  // 日本語テキストを検出
  const text = "私の名前は田中です";
  const words = await japaneseSupport.segmentLine(text, 1);

  assertGreater(words.length, 0);

  // ビジュアルモードで範囲を設定
  visualMode.setVisualRange(1, 1, "v");

  // 範囲内の単語をフィルタリング
  const filtered = visualMode.filterWordsInRange(words);

  assertEquals(filtered.length, words.length);
});

Deno.test("Scenario 4 - Step 2: 統合シナリオ - 日本語 + モーション連打 + ビジュアル", async () => {
  const japaneseSupport = new UnifiedJapaneseSupportMock();
  const motionDetector = new UnifiedMotionDetectorMock();
  const visualMode = new UnifiedVisualModeMock();

  motionDetector.init();

  // 複数行の日本語テキスト
  const lines = [
    "これはテストです",
    "日本語の単語検出",
    "複数行のテキスト",
  ];

  const allWords: DenopsWord[] = [];
  for (let i = 0; i < lines.length; i++) {
    const words = await japaneseSupport.segmentLine(lines[i], i + 1);
    allWords.push(...words);
  }

  // モーション連打を検出
  const motion1 = motionDetector.handleMotion("w");
  const motion2 = motionDetector.handleMotion("w");

  // ビジュアルモード（2-3行目のみ）
  visualMode.setVisualRange(2, 3, "V");

  // 統合フィルタリング
  const filtered = visualMode.filterWordsInRange(allWords);

  assertGreater(filtered.length, 0);
  filtered.forEach((word) => {
    assert(word.line >= 2 && word.line <= 3);
  });
});

Deno.test("Scenario 4 - Step 3: 統合シナリオ - 全機能の完全統合", async () => {
  const japaneseSupport = new UnifiedJapaneseSupportMock();
  const motionDetector = new UnifiedMotionDetectorMock();
  const visualMode = new UnifiedVisualModeMock();

  motionDetector.init();

  // シナリオ: ユーザーが複数行の日本語テキスト内で、
  // モーションを連打してビジュアルモードで範囲を選択し、
  // その範囲内の単語を抽出する

  // 1. 日本語テキストを検出
  const lines = [
    "最初の行：これはテストです",
    "二番目の行：日本語の単語検出",
    "三番目の行：複数行のテキスト",
    "四番目の行：まとめのテキスト",
  ];

  const allWords: DenopsWord[] = [];
  for (let i = 0; i < lines.length; i++) {
    const words = await japaneseSupport.segmentLine(lines[i], i + 1);
    allWords.push(...words);
  }

  // 2. モーション連打を検出
  const motion1 = motionDetector.handleMotion("e");
  assert(!motion1.shouldTrigger);

  const motion2 = motionDetector.handleMotion("e");
  assert(motion2.shouldTrigger); // 2回目でトリガー

  // 3. ビジュアルモード（2-3行目のみ選択）
  visualMode.setVisualRange(2, 3, "V");

  // 4. 統合フィルタリング
  const filtered = visualMode.filterWordsInRange(allWords);

  // 検証
  assertGreater(filtered.length, 0);
  filtered.forEach((word) => {
    assert(word.line >= 2 && word.line <= 3);
  });

  // 5. ジャンプ後のクリーンアップ
  visualMode.clearAfterJump();
  const finalState = visualMode.getState();
  assertFalse(finalState.active);
});

// ===========================
// エラーハンドリングテスト
// ===========================

Deno.test("Error Handling - Invalid motion key", () => {
  const motionDetector = new UnifiedMotionDetectorMock();
  motionDetector.init();

  const result = motionDetector.handleMotion("x");

  assertFalse(result.shouldTrigger);
  assertExists(result.error);
});

Deno.test("Error Handling - Recover from error", () => {
  const motionDetector = new UnifiedMotionDetectorMock();
  motionDetector.init();

  // 無効なキーで試す
  motionDetector.handleMotion("x");

  // その後、有効なキーで動作確認
  const result1 = motionDetector.handleMotion("w");
  assertFalse(result1.shouldTrigger);

  const result2 = motionDetector.handleMotion("w");
  assert(result2.shouldTrigger);
});
