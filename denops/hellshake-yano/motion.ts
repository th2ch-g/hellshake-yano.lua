/**
 * キーリピート検出機能を提供する移動カウンター
 *
 * @description
 * ユーザーの移動コマンドを追跡し、指定された閾値に達したときにコールバックを実行するクラス。
 * 高度なタイミング制御機能により、連続したキー入力の検出と適切なリセット処理を提供します。
 *
 * **キーリピート検出アルゴリズム:**
 * 1. 各移動コマンドのタイムスタンプを記録
 * 2. 前回の移動から指定時間が経過した場合、カウンターを自動リセット
 * 3. 設定された閾値に達した時点でコールバックを実行し、カウンターをリセット
 *
 * **タイミング処理:**
 * - lastMotionTimeによる精密なタイムスタンプ管理
 * - timeoutMsによる柔軟なタイムアウト制御
 * - Date.now()を使用した高精度時間測定
 *
 * **リセット条件:**
 * - タイムアウト時間経過時の自動リセット
 * - 閾値到達時の手動リセット
 * - reset()メソッドによる明示的リセット
 *
 * @since 1.0.0
 * @version 1.0.0
 *
 * @example 基本的な使用パターン
 * ```typescript
 * // 3回の移動で2秒のタイムアウト、コールバック付き
 * const counter = new MotionCounter(3, 2000, () => {
 *   console.log('閾値に達しました！ヒントを表示します。');
 * });
 *
 * counter.increment(); // false - カウント: 1
 * counter.increment(); // false - カウント: 2
 * counter.increment(); // true - 閾値到達、コールバック実行
 * ```
 *
 * @example タイムアウト設定例
 * ```typescript
 * // 5回の移動で5秒のタイムアウト
 * const longTimeoutCounter = new MotionCounter(5, 5000);
 *
 * longTimeoutCounter.increment(); // カウント: 1
 * // 5秒経過後...
 * longTimeoutCounter.increment(); // カウントリセット後に1
 * ```
 *
 * @example コールバック処理例
 * ```typescript
 * const counter = new MotionCounter(2, 1000, () => {
 *   // ヒント表示ロジック
 *   showHint('j/k キーでの移動をマスターしましょう！');
 *   // 統計情報の更新
 *   updateStatistics('motion_hint_triggered');
 * });
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
   *
   * @description
   * 移動カウンターを初期化し、キーリピート検出のパラメータを設定します。
   * 各パラメータは用途に応じて柔軟に調整可能で、デフォルト値は一般的な使用ケースに最適化されています。
   *
   * @param threshold - ヒント表示をトリガーする移動回数の閾値（デフォルト: 3）
   *                   値の範囲: 1以上の整数を推奨
   * @param timeoutMs - カウンターのタイムアウト時間（ミリ秒、デフォルト: 2000）
   *                   値の範囲: 500-10000ms を推奨、ユーザビリティを考慮
   * @param onThresholdReached - 閾値に達した時に実行されるコールバック関数
   *                            undefined の場合、コールバックは実行されません
   *
   * @throws {Error} threshold が 0 以下の場合
   * @throws {Error} timeoutMs が 0 以下の場合
   *
   * @since 1.0.0
   *
   * @example 標準的な設定
   * ```typescript
   * const counter = new MotionCounter(3, 2000, () => console.log('ヒント表示'));
   * ```
   *
   * @example 高感度設定（素早いヒント表示）
   * ```typescript
   * const sensitiveCounter = new MotionCounter(2, 1000, showQuickHint);
   * ```
   *
   * @example 低感度設定（じっくり使用者向け）
   * ```typescript
   * const patientCounter = new MotionCounter(5, 5000, showDetailedHint);
   * ```
   */
  constructor(
    threshold: number = 3,
    timeoutMs: number = 2000,
    onThresholdReached?: () => void,
  ) {
    if (threshold <= 0) {
      throw new Error("threshold must be greater than 0");
    }
    if (timeoutMs <= 0) {
      throw new Error("timeoutMs must be greater than 0");
    }

    this.threshold = threshold;
    this.timeoutMs = timeoutMs;
    this.onThresholdReached = onThresholdReached;
  }

  /**
   * 移動カウントをインクリメント
   *
   * @description
   * カウントを1増加させ、閾値到達判定とタイムアウト処理を実行します。
   * このメソッドは移動コマンドが実行される度に呼び出され、適切なタイミング制御を行います。
   *
   * **処理フロー:**
   * 1. 現在時刻を取得（Date.now()）
   * 2. 前回の移動時刻からの経過時間をチェック
   * 3. タイムアウト時間を超過している場合、自動リセット実行
   * 4. カウンターをインクリメント
   * 5. 現在時刻を記録
   * 6. 閾値到達判定とコールバック実行
   * 7. 閾値到達時は自動リセット
   *
   * **状態管理:**
   * - count: 現在のカウント値を管理
   * - lastMotionTime: 最後の移動時刻を記録
   * - タイムアウト判定による適切なリセット制御
   *
   * @returns {boolean} 閾値に達した場合はtrue、継続中の場合はfalse
   *
   * @throws このメソッドは例外をスローしません（安全性重視）
   *
   * @since 1.0.0
   *
   * @example 基本的なインクリメント処理
   * ```typescript
   * const counter = new MotionCounter(3);
   * const reached = counter.increment();
   * if (reached) {
   *   console.log('閾値に達しました！');
   * }
   * ```
   *
   * @example ループ処理での使用
   * ```typescript
   * const counter = new MotionCounter(5, 3000);
   *
   * // 複数回の移動コマンド処理
   * for (let i = 0; i < 10; i++) {
   *   const shouldShowHint = counter.increment();
   *   if (shouldShowHint) {
   *     displayHint(`ヒント ${i + 1}`);
   *   }
   * }
   * ```
   *
   * @example タイムアウト動作の確認
   * ```typescript
   * const counter = new MotionCounter(3, 1000);
   * counter.increment(); // カウント: 1
   *
   * // 1秒以上待機
   * setTimeout(() => {
   *   counter.increment(); // タイムアウトによりカウントリセット後 1
   * }, 1500);
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
   *
   * @description
   * カウンターの状態を初期値にリセットし、新しいキーリピート検出サイクルを開始します。
   * このメソッドは閾値到達時、タイムアウト時、または明示的な呼び出し時に実行されます。
   *
   * **リセット処理内容:**
   * - count を 0 に初期化
   * - lastMotionTime を 0 に初期化（タイムスタンプクリア）
   * - 内部状態の完全クリア
   *
   * **呼び出しタイミング:**
   * - increment() メソッド内での自動リセット
   * - タイムアウト検出時の自動リセット
   * - 外部からの明示的なリセット要求
   *
   * **タイマー管理:**
   * lastMotionTime のクリアにより、次回の increment() 呼び出し時に
   * タイムアウト判定が正しく動作するよう保証します。
   *
   * @returns {void} 戻り値なし
   *
   * @throws このメソッドは例外をスローしません（安全性重視）
   *
   * @since 1.0.0
   *
   * @example 手動リセット
   * ```typescript
   * const counter = new MotionCounter();
   * counter.increment(); // カウント: 1
   * counter.increment(); // カウント: 2
   * counter.reset();     // カウント: 0
   * console.log(counter.getCount()); // 0
   * ```
   *
   * @example 条件付きリセット
   * ```typescript
   * const counter = new MotionCounter(5);
   *
   * // 特定の条件でリセット
   * if (shouldResetCounter()) {
   *   counter.reset();
   *   console.log('カウンターをリセットしました');
   * }
   * ```
   *
   * @example バッファ切り替え時のリセット
   * ```typescript
   * const counter = new MotionCounter();
   *
   * // バッファが変更された際の処理
   * function onBufferChange() {
   *   counter.reset(); // 新しいバッファでは新しいカウント開始
   * }
   * ```
   */
  reset(): void {
    this.count = 0;
    this.lastMotionTime = 0;
  }

  /**
   * 現在のカウントを取得
   *
   * @description
   * 現在の移動カウント値を取得します。このメソッドは読み取り専用で、
   * カウンターの状態を変更することなく現在の値を確認できます。
   *
   * **状態管理:**
   * - 内部の count フィールドの値を直接返却
   * - カウンターの状態に影響を与えない安全な操作
   * - リアルタイムでの状態監視に適用可能
   *
   * **使用場面:**
   * - デバッグ時の状態確認
   * - UI表示での現在値表示
   * - 条件分岐での判定
   * - ログ出力での情報収集
   *
   * @returns {number} 現在のカウント値（0以上の整数）
   *
   * @throws このメソッドは例外をスローしません（安全性重視）
   *
   * @since 1.0.0
   *
   * @example 基本的な状態確認
   * ```typescript
   * const counter = new MotionCounter();
   * counter.increment();
   * console.log(counter.getCount()); // 1
   * counter.increment();
   * console.log(counter.getCount()); // 2
   * ```
   *
   * @example 条件分岐での使用
   * ```typescript
   * const counter = new MotionCounter(5);
   *
   * function checkProgress() {
   *   const current = counter.getCount();
   *   if (current >= 3) {
   *     console.log('もうすぐ閾値に達します');
   *   }
   * }
   * ```
   *
   * @example デバッグ用ログ出力
   * ```typescript
   * const counter = new MotionCounter(3, 2000);
   *
   * function debugMotion() {
   *   console.log(`現在のカウント: ${counter.getCount()}/3`);
   * }
   *
   * counter.increment();
   * debugMotion(); // 現在のカウント: 1/3
   * ```
   *
   * @example UIでの進捗表示
   * ```typescript
   * const counter = new MotionCounter(5);
   *
   * function updateProgressBar() {
   *   const progress = (counter.getCount() / 5) * 100;
   *   document.getElementById('progress').style.width = `${progress}%`;
   * }
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
    if (bufnr <= 0) {
      throw new Error("bufnr must be greater than 0");
    }

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

/**
 * 使用例とベストプラクティス
 *
 * @example シングルトンパターンでの全体管理
 * ```typescript
 * // グローバルなモーションマネージャーのインスタンス
 * const globalMotionManager = new MotionManager();
 *
 * // エディタのモーション処理
 * function handleEditorMotion(bufferNumber: number) {
 *   const counter = globalMotionManager.getCounter(
 *     bufferNumber,
 *     3,    // 3回の移動でヒント表示
 *     2000, // 2秒のタイムアウト
 *     () => showNavigationHint(bufferNumber)
 *   );
 *
 *   const shouldShowHint = counter.increment();
 *   if (shouldShowHint) {
 *     console.log(`Buffer ${bufferNumber}: ヒントが表示されました`);
 *   }
 * }
 * ```
 *
 * @example 設定可能なキーリピート検出システム
 * ```typescript
 * interface MotionConfig {
 *   threshold: number;
 *   timeout: number;
 *   sensitivity: 'low' | 'medium' | 'high';
 * }
 *
 * function createConfiguredCounter(config: MotionConfig): MotionCounter {
 *   const settings = {
 *     low: { threshold: 5, timeout: 5000 },
 *     medium: { threshold: 3, timeout: 2000 },
 *     high: { threshold: 2, timeout: 1000 }
 *   };
 *
 *   const { threshold, timeout } = settings[config.sensitivity];
 *   return new MotionCounter(threshold, timeout, () => {
 *     console.log(`${config.sensitivity} sensitivity hint triggered`);
 *   });
 * }
 * ```
 *
 * @example エラーハンドリングとデバッグ
 * ```typescript
 * const manager = new MotionManager();
 *
 * function safeMotionHandling(bufnr: number) {
 *   try {
 *     const counter = manager.getCounter(bufnr);
 *     const result = counter.increment();
 *
 *     // デバッグ情報の出力
 *     if (process.env.DEBUG) {
 *       console.log(`Buffer ${bufnr}: count=${counter.getCount()}, triggered=${result}`);
 *     }
 *
 *     return result;
 *   } catch (error) {
 *     console.error(`Motion handling error for buffer ${bufnr}:`, error);
 *     return false;
 *   }
 * }
 * ```
 *
 * @example 非同期処理との統合
 * ```typescript
 * const manager = new MotionManager();
 *
 * async function asyncMotionHandler(bufnr: number) {
 *   const counter = manager.getCounter(bufnr, 3, 2000, async () => {
 *     // 非同期でヒント表示
 *     try {
 *       await showAsyncHint(bufnr);
 *       await logMotionEvent(bufnr);
 *     } catch (error) {
 *       console.error('Async hint error:', error);
 *     }
 *   });
 *
 *   return counter.increment();
 * }
 * ```
 *
 * @example パフォーマンス最適化
 * ```typescript
 * const manager = new MotionManager();
 *
 * // メモリ使用量監視
 * function monitorMemoryUsage() {
 *   const bufferCount = manager.counters.size;
 *   if (bufferCount > 100) {
 *     console.warn(`大量のバッファが管理されています: ${bufferCount}`);
 *   }
 * }
 *
 * // 定期的なクリーンアップ
 * setInterval(() => {
 *   monitorMemoryUsage();
 *   // 必要に応じてmanager.clearAll();
 * }, 300000); // 5分毎
 * ```
 */
