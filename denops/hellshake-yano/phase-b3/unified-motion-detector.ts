/**
 * denops/hellshake-yano/phase-b3/unified-motion-detector.ts
 *
 * TDD Phase: GREEN - テストをパスさせる最小限の実装
 *
 * UnifiedMotionDetectorクラス
 * VimScript版motion.vimの連打検出アルゴリズムを完全再現
 *
 * ## VimScript版との互換性
 * - reltime()のミリ秒精度をDate.now()で再現
 * - タイムアウト・カウント・閾値の完全一致
 * - エラーメッセージの完全一致
 */

import type {
  MotionState,
  HandleMotionResult,
} from "./types.ts";
import { handleError, logMessage, validateInList } from "./common-base.ts";

/**
 * UnifiedMotionDetectorクラス
 * モーション連打を検出してヒント表示をトリガー
 */
export class UnifiedMotionDetector {
  private static instance: UnifiedMotionDetector;

  private state: MotionState = {
    lastMotion: "",
    lastMotionTime: 0,
    motionCount: 0,
    timeoutMs: 2000,
    threshold: 2,
  };

  private perKeyMotionCount: Record<string, number> = {};

  private constructor() {
    // private constructor to enforce singleton
  }

  static getInstance(): UnifiedMotionDetector {
    if (!UnifiedMotionDetector.instance) {
      UnifiedMotionDetector.instance = new UnifiedMotionDetector();
    }
    return UnifiedMotionDetector.instance;
  }

  /**
   * 初期化: 状態変数をリセット
   *
   * VimScript版: hellshake_yano_vim#motion#init()
   */
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

  /**
   * モーション処理: 連打検出のメインロジック
   *
   * VimScript版: hellshake_yano_vim#motion#handle(motion_key)
   * アルゴリズム（VimScript版と同一）:
   * 1. パラメータ検証
   * 2. 現在時刻を取得（Date.now()でミリ秒精度）
   * 3. 前回のモーションとの時間差をチェック
   * 4. タイムアウトチェック（timeDiffMs > timeoutMs）
   * 5. 異なるモーションの場合もリセット
   * 6. カウント更新
   * 7. 閾値チェックとトリガー判定
   * 8. 状態を更新
   *
   * @param key モーションキー（'w', 'b', 'e'のみ有効）
   * @returns 処理結果（shouldTrigger, count, error）
   */
  handleMotion(key: string): HandleMotionResult {
    try {
      // 1. パラメータ検証
      const validationError = validateInList(
        key,
        ["w", "b", "e"],
        "motion key",
      );
      if (validationError) {
        logMessage("warn", "UnifiedMotionDetector", validationError);
        return {
          shouldTrigger: false,
          count: 0,
          error: validationError,
        };
      }

      // 2. 現在時刻を取得（ミリ秒精度）
      const currentTime = Date.now();

      // 3. 前回のモーションとの時間差をチェック
      let shouldReset = false;

      if (this.state.lastMotionTime > 0) {
        // VimScript版: let l:time_diff = reltimefloat(reltime(s:motion_state.last_motion_time, l:current_time))
        // ここでは単純に Date.now() の差分を使用
        const timeDiffMs = currentTime - this.state.lastMotionTime;

        // 4. タイムアウトチェック（VimScript版: l:time_diff_ms > s:motion_state.timeout_ms）
        if (timeDiffMs > this.state.timeoutMs) {
          shouldReset = true;
        }
      }

      // 5. 異なるモーションの場合もリセット
      if (
        this.state.lastMotion !== "" && this.state.lastMotion !== key
      ) {
        shouldReset = true;
      }

      // 6. カウント更新
      // VimScript版: if l:should_reset || s:motion_state.motion_count == 0
      if (shouldReset || this.state.motionCount === 0) {
        this.state.motionCount = 1;
      } else {
        this.state.motionCount += 1;
      }

      // 7. 閾値チェック
      const threshold = this.getThreshold(key);
      let shouldTrigger = false;

      // VimScript版: if s:motion_state.motion_count >= s:motion_state.threshold
      if (this.state.motionCount >= threshold) {
        shouldTrigger = true;
        // ヒント表示後はカウントをリセット（連続表示を防ぐ）
        this.state.motionCount = 0;
      }

      // 8. 状態を更新
      this.state.lastMotion = key;
      this.state.lastMotionTime = currentTime;

      return {
        shouldTrigger,
        count: this.state.motionCount,
      };
    } catch (error) {
      // エラーハンドリング（VimScript版: except と同等）
      const errorMessage = handleError("UnifiedMotionDetector", error);
      logMessage("error", "UnifiedMotionDetector", errorMessage);
      return {
        shouldTrigger: false,
        count: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * キー別の閾値を取得
   *
   * VimScript版では perKeyMotionCount で指定可能
   *
   * @param key モーションキー
   * @returns 閾値（デフォルト2）
   */
  getThreshold(key: string): number {
    if (this.perKeyMotionCount[key] !== undefined) {
      return this.perKeyMotionCount[key];
    }
    return this.state.threshold;
  }

  /**
   * 閾値を設定
   *
   * VimScript版: hellshake_yano_vim#motion#set_threshold(count)
   *
   * @param count 閾値（1以上の整数）
   */
  setThreshold(count: number): void {
    this.state.threshold = count;
  }

  /**
   * タイムアウトを設定
   *
   * VimScript版: hellshake_yano_vim#motion#set_timeout(ms)
   *
   * @param ms タイムアウト時間（ミリ秒）
   */
  setTimeout(ms: number): void {
    this.state.timeoutMs = ms;
  }

  /**
   * キー別の閾値を設定
   *
   * @param key モーションキー
   * @param count 閾値
   */
  setKeyThreshold(key: string, count: number): void {
    this.perKeyMotionCount[key] = count;
  }

  /**
   * 現在の状態を取得（テスト用）
   *
   * VimScript版: hellshake_yano_vim#motion#get_state()
   *
   * @returns 状態変数のコピー
   */
  getState(): MotionState {
    // 状態変数のコピーを返す（外部からの変更を防ぐ）
    return JSON.parse(JSON.stringify(this.state));
  }
}

// デフォルトエクスポート
export const unifiedMotionDetector = UnifiedMotionDetector.getInstance();
