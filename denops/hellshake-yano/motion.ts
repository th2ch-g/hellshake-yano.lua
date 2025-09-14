/**
 * 移動カウンター
 * @description ユーザーの移動コマンドをカウントし、指定された闾値に達したらヒント表示をトリガーするクラス
 * @since 1.0.0
 * @example
 * ```typescript
 * const counter = new MotionCounter(3, 2000, () => console.log('Threshold reached'));
 * counter.increment(); // false
 * counter.increment(); // false
 * counter.increment(); // true (闾値に達してコールバックが実行される)
 * ```
 */
export class MotionCounter {
  private count: number = 0;
  private lastMotionTime: number = 0;
  private timeoutMs: number;
  private threshold: number;
  private onThresholdReached?: () => void;

  /**
   * MotionCounterのコンストラクタ
   * @description 移動カウンターを初期化し、闾値、タイムアウト、コールバックを設定
   * @param threshold - ヒント表示をトリガーする移動回数の闾値（デフォルト: 3）
   * @param timeoutMs - カウンターのタイムアウト時間（ミリ秒、デフォルト: 2000）
   * @param onThresholdReached - 闾値に達した時に実行されるコールバック関数
   * @since 1.0.0
   */
  constructor(
    threshold: number = 3,
    timeoutMs: number = 2000,
    onThresholdReached?: () => void,
  ) {
    this.threshold = threshold;
    this.timeoutMs = timeoutMs;
    this.onThresholdReached = onThresholdReached;
  }

  /**
   * 移動カウントをインクリメント
   * @description カウントを1増やし、闾値に達したかどうかをチェック。タイムアウト時間を超えている場合はカウンターをリセット
   * @returns boolean - 闾値に達した場合はtrue、そうでなければfalse
   * @since 1.0.0
   * @example
   * ```typescript
   * const counter = new MotionCounter(3);
   * const reached = counter.increment();
   * if (reached) {
   *   console.log('闾値に達しました！');
   * }
   * ```
   */
  increment(): boolean {
    const now = Date.now();

    // タイムアウトチェック
    if (this.lastMotionTime && (now - this.lastMotionTime) > this.timeoutMs) {
      this.reset();
    }

    this.count++;
    this.lastMotionTime = now;

    // 閾値に達したか
    if (this.count >= this.threshold) {
      if (this.onThresholdReached) {
        this.onThresholdReached();
      }
      this.reset();
      return true;
    }

    return false;
  }

  /**
   * カウンターをリセット
   * @description カウントと最後の移動時間をリセットし、カウンターを初期状態に戻す
   * @returns void
   * @since 1.0.0
   * @example
   * ```typescript
   * const counter = new MotionCounter();
   * counter.increment();
   * counter.reset(); // カウントが0に戻る
   * ```
   */
  reset(): void {
    this.count = 0;
    this.lastMotionTime = 0;
  }

  /**
   * 現在のカウントを取得
   * @description 現在の移動カウントを返す
   * @returns number - 現在のカウント値
   * @since 1.0.0
   * @example
   * ```typescript
   * const counter = new MotionCounter();
   * counter.increment();
   * console.log(counter.getCount()); // 1
   * ```
   */
  getCount(): number {
    return this.count;
  }
}

/**
 * バッファごとのカウンター管理
 * @description 複数のバッファに対して個別のMotionCounterを管理するクラス。バッファ番号をキーとしてカウンターを格納
 * @since 1.0.0
 * @example
 * ```typescript
 * const manager = new MotionManager();
 * const counter1 = manager.getCounter(1, 3, 2000);
 * const counter2 = manager.getCounter(2, 5, 3000);
 * // 各バッファで独立したカウンターが動作
 * ```
 */
export class MotionManager {
  private counters: Map<number, MotionCounter> = new Map();

  /**
   * 指定されたバッファのMotionCounterを取得
   * @description バッファ番号に対応するMotionCounterを取得。存在しない場合は新しく作成
   * @param bufnr - バッファ番号
   * @param threshold - カウンターの闾値（省略時はデフォルト値使用）
   * @param timeout - カウンターのタイムアウト時間（省略時はデフォルト値使用）
   * @returns MotionCounter - バッファに対応するMotionCounterインスタンス
   * @since 1.0.0
   * @example
   * ```typescript
   * const manager = new MotionManager();
   * const counter = manager.getCounter(1, 3, 2000);
   * counter.increment();
   * ```
   */
  getCounter(bufnr: number, threshold?: number, timeout?: number): MotionCounter {
    if (!this.counters.has(bufnr)) {
      this.counters.set(bufnr, new MotionCounter(threshold, timeout));
    }
    return this.counters.get(bufnr)!;
  }

  /**
   * 指定されたバッファのカウンターをリセット
   * @description 特定のバッファのMotionCounterをリセットし、カウントを初期化
   * @param bufnr - リセットするバッファ番号
   * @returns void
   * @since 1.0.0
   * @example
   * ```typescript
   * const manager = new MotionManager();
   * manager.resetCounter(1); // バッファ番号1のカウンターをリセット
   * ```
   */
  resetCounter(bufnr: number): void {
    const counter = this.counters.get(bufnr);
    if (counter) {
      counter.reset();
    }
  }

  /**
   * すべてのバッファのカウンターをクリア
   * @description 管理されているすべてのMotionCounterを削除し、メモリを解放
   * @returns void
   * @since 1.0.0
   * @example
   * ```typescript
   * const manager = new MotionManager();
   * manager.clearAll(); // すべてのカウンターをクリア
   * ```
   */
  clearAll(): void {
    this.counters.clear();
  }
}
