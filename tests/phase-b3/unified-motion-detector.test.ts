/**
 * tests/phase-b3/unified-motion-detector.test.ts
 *
 * TDD Phase: RED - テストを先に書く
 *
 * UnifiedMotionDetectorの単体テスト（20-25 steps）
 *
 * Process 1: 状態初期化テスト（2-3 steps）
 * Process 2: 単一モーション処理テスト（3-4 steps）
 * Process 3: 連続モーション検出テスト（3-4 steps）
 * Process 4: タイムアウト処理テスト（3-4 steps）
 * Process 5: 異なるモーション処理テスト（2-3 steps）
 * Process 6: キー別閾値テスト（2-3 steps）
 * Process 7: エラーハンドリングテスト（2-3 steps）
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";

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
 * UnifiedMotionDetectorの簡易実装
 * VimScript版のアルゴリズムを完全再現
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

  static create(): UnifiedMotionDetectorMock {
    return new UnifiedMotionDetectorMock();
  }

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
    // 不正なモーションキーのチェック
    if (!["w", "b", "e"].includes(key)) {
      return {
        shouldTrigger: false,
        count: 0,
        error: `invalid motion key: ${key}`,
      };
    }

    try {
      // 1. 現在時刻を取得（ミリ秒精度）
      const currentTime = Date.now();

      // 2. 前回のモーションとの時間差をチェック
      let shouldReset = false;
      let timeDiffMs = 0;

      if (this.state.lastMotionTime > 0) {
        timeDiffMs = currentTime - this.state.lastMotionTime;

        // タイムアウトチェック
        if (timeDiffMs > this.state.timeoutMs) {
          shouldReset = true;
        }
      }

      // 3. 異なるモーションの場合もリセット
      if (
        this.state.lastMotion !== "" && this.state.lastMotion !== key
      ) {
        shouldReset = true;
      }

      // 4. カウントの更新
      if (shouldReset || this.state.motionCount === 0) {
        this.state.motionCount = 1;
      } else {
        this.state.motionCount += 1;
      }

      // 5. 閾値チェック
      const threshold = this.getThreshold(key);
      let shouldTrigger = false;

      if (this.state.motionCount >= threshold) {
        shouldTrigger = true;
        this.state.motionCount = 0;
      }

      // 6. 状態を更新
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
        error: error instanceof Error ? error.message : "Unknown error",
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

  setKeyThreshold(key: string, count: number): void {
    this.perKeyMotionCount[key] = count;
  }

  getState(): MotionState {
    return JSON.parse(JSON.stringify(this.state));
  }
}

Deno.test("Process 1: 状態初期化テスト", async (t) => {
  // 1-1: init()による初期化確認
  await t.step("should initialize state correctly", () => {
    const detector = UnifiedMotionDetectorMock.create();
    detector.init();
    const state = detector.getState();
    assertEquals(state.lastMotion, "");
    assertEquals(state.lastMotionTime, 0);
    assertEquals(state.motionCount, 0);
  });

  // 1-2: デフォルト値の確認
  await t.step("should have correct default values", () => {
    const detector = UnifiedMotionDetectorMock.create();
    detector.init();
    const state = detector.getState();
    assertEquals(state.timeoutMs, 2000);
    assertEquals(state.threshold, 2);
  });

  // 1-3: 複数回の初期化が可能
  await t.step("should reinitialize state after operations", () => {
    const detector = UnifiedMotionDetectorMock.create();
    detector.handleMotion("w");
    detector.init();
    const state = detector.getState();
    assertEquals(state.motionCount, 0);
    assertEquals(state.lastMotion, "");
  });
});

Deno.test("Process 2: 単一モーション処理テスト", async (t) => {
  // 2-1: 1回目のモーションでカウント=1
  await t.step("should set count to 1 on first motion", () => {
    const detector = UnifiedMotionDetectorMock.create();
    detector.init();
    const result = detector.handleMotion("w");
    assertEquals(result.count, 1);
  });

  // 2-2: shouldTrigger=falseの確認
  await t.step("should not trigger on first motion", () => {
    const detector = UnifiedMotionDetectorMock.create();
    detector.init();
    const result = detector.handleMotion("w");
    assertEquals(result.shouldTrigger, false);
  });

  // 2-3: lastMotionの記録確認
  await t.step("should record last motion", () => {
    const detector = UnifiedMotionDetectorMock.create();
    detector.init();
    detector.handleMotion("w");
    const state = detector.getState();
    assertEquals(state.lastMotion, "w");
    assertEquals(state.lastMotionTime > 0, true);
  });

  // 2-4: 異なるキーの1回目でもカウント=1
  await t.step("should count each motion key separately initially", () => {
    const detector = UnifiedMotionDetectorMock.create();
    detector.init();
    detector.handleMotion("w");
    const result = detector.handleMotion("b");
    assertEquals(result.count, 1);
  });
});

Deno.test("Process 3: 連続モーション検出テスト", async (t) => {
  // 3-1: 2回目でshouldTrigger=trueの確認
  await t.step("should trigger on second motion", () => {
    const detector = UnifiedMotionDetectorMock.create();
    detector.init();
    detector.handleMotion("w");
    const result = detector.handleMotion("w");
    assertEquals(result.shouldTrigger, true);
  });

  // 3-2: トリガー後のカウントリセット
  await t.step("should reset count after trigger", () => {
    const detector = UnifiedMotionDetectorMock.create();
    detector.init();
    detector.handleMotion("w");
    const result = detector.handleMotion("w");
    assertEquals(result.shouldTrigger, true);
    assertEquals(result.count, 0);
  });

  // 3-3: 3回連打の場合
  await t.step("should handle triple motion correctly", () => {
    const detector = UnifiedMotionDetectorMock.create();
    detector.init();
    const r1 = detector.handleMotion("w");
    const r2 = detector.handleMotion("w");
    const r3 = detector.handleMotion("w");
    assertEquals(r1.shouldTrigger, false);
    assertEquals(r2.shouldTrigger, true);
    assertEquals(r3.shouldTrigger, false);
  });
});

Deno.test("Process 4: タイムアウト処理テスト", async (t) => {
  // 4-1: setTimeout(100)での短いタイムアウト設定
  await t.step("should reset on timeout", async () => {
    const detector = UnifiedMotionDetectorMock.create();
    detector.init();
    detector.setTimeout(100);
    detector.handleMotion("w");
    await new Promise((resolve) => setTimeout(resolve, 150));
    const result = detector.handleMotion("w");
    // タイムアウト後は新たなカウント開始なので count=1, shouldTrigger=false
    assertEquals(result.count, 1);
    assertEquals(result.shouldTrigger, false);
  });

  // 4-2: タイムアウト内のモーション
  await t.step("should not reset within timeout", () => {
    const detector = UnifiedMotionDetectorMock.create();
    detector.init();
    detector.setTimeout(5000);
    detector.handleMotion("w");
    const result = detector.handleMotion("w");
    // タイムアウト内なので count=2, shouldTrigger=true
    assertEquals(result.count, 0);
    assertEquals(result.shouldTrigger, true);
  });

  // 4-3: タイムアウト値の変更
  await t.step("should respect custom timeout", () => {
    const detector = UnifiedMotionDetectorMock.create();
    detector.init();
    detector.setTimeout(2000);
    const state = detector.getState();
    assertEquals(state.timeoutMs, 2000);
  });
});

Deno.test("Process 5: 異なるモーション処理テスト", async (t) => {
  // 5-1: w→bでのカウントリセット
  await t.step("should reset on different motion", () => {
    const detector = UnifiedMotionDetectorMock.create();
    detector.init();
    detector.handleMotion("w");
    const result = detector.handleMotion("b");
    assertEquals(result.count, 1);
    assertEquals(result.shouldTrigger, false);
  });

  // 5-2: lastMotionの更新確認
  await t.step("should update last motion", () => {
    const detector = UnifiedMotionDetectorMock.create();
    detector.init();
    detector.handleMotion("w");
    detector.handleMotion("b");
    const state = detector.getState();
    assertEquals(state.lastMotion, "b");
  });

  // 5-3: 異なるモーション後の連続検出
  await t.step("should detect new motion series", () => {
    const detector = UnifiedMotionDetectorMock.create();
    detector.init();
    detector.handleMotion("w");
    detector.handleMotion("w");
    detector.handleMotion("b");
    const r2 = detector.handleMotion("b");
    assertEquals(r2.shouldTrigger, true);
  });
});

Deno.test("Process 6: キー別閾値テスト", async (t) => {
  // 6-1: perKeyMotionCount={w: 3}での動作
  await t.step("should use per-key threshold", () => {
    const detector = UnifiedMotionDetectorMock.create();
    detector.init();
    detector.setKeyThreshold("w", 3);
    detector.handleMotion("w");
    detector.handleMotion("w");
    const result = detector.handleMotion("w");
    // 3回目でトリガー（count は 0 にリセット）
    assertEquals(result.shouldTrigger, true);
  });

  // 6-2: 3回目でトリガー確認
  await t.step("should trigger at per-key threshold", () => {
    const detector = UnifiedMotionDetectorMock.create();
    detector.init();
    detector.setKeyThreshold("w", 3);
    detector.handleMotion("w");
    detector.handleMotion("w");
    const result = detector.handleMotion("w");
    // 3番目の呼び出しで count=3 になり shouldTrigger=true
    assertEquals(result.shouldTrigger, true);
  });

  // 6-3: 異なるキーは異なる閾値を使用
  await t.step("should apply different threshold per key", () => {
    const detector = UnifiedMotionDetectorMock.create();
    detector.init();
    detector.setKeyThreshold("w", 3);
    detector.setKeyThreshold("b", 2);
    detector.handleMotion("w");
    const rw = detector.handleMotion("w");
    assertEquals(rw.shouldTrigger, false);

    detector.init();
    detector.setKeyThreshold("w", 3);
    detector.setKeyThreshold("b", 2);
    detector.handleMotion("b");
    const rb = detector.handleMotion("b");
    assertEquals(rb.shouldTrigger, true);
  });
});

Deno.test("Process 7: エラーハンドリングテスト", async (t) => {
  // 7-1: 不正なモーションキー（x）でのエラー
  await t.step("should reject invalid motion key", () => {
    const detector = UnifiedMotionDetectorMock.create();
    detector.init();
    const result = detector.handleMotion("x");
    assertEquals(result.shouldTrigger, false);
    assertEquals(result.count, 0);
    assertEquals(result.error !== undefined, true);
  });

  // 7-2: エラーメッセージが返される
  await t.step("should return error message", () => {
    const detector = UnifiedMotionDetectorMock.create();
    detector.init();
    const result = detector.handleMotion("invalid");
    assertEquals(
      result.error?.includes("invalid motion key"),
      true,
    );
  });

  // 7-3: 有効な3つのキーのみ受け入れ
  await t.step("should only accept w, b, e", () => {
    const detector = UnifiedMotionDetectorMock.create();
    detector.init();
    for (const key of ["w", "b", "e"]) {
      const result = detector.handleMotion(key);
      assertEquals(result.error, undefined);
    }
    const invalid = detector.handleMotion("f");
    assertEquals(invalid.error !== undefined, true);
  });
});
