/**
 * 移動カウンター
 */
export class MotionCounter {
  private count: number = 0;
  private lastMotionTime: number = 0;
  private timeoutMs: number;
  private threshold: number;
  private onThresholdReached?: () => void;

  constructor(
    threshold: number = 3,
    timeoutMs: number = 2000,
    onThresholdReached?: () => void,
  ) {
    this.threshold = threshold;
    this.timeoutMs = timeoutMs;
    this.onThresholdReached = onThresholdReached;
  }

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

  reset(): void {
    this.count = 0;
    this.lastMotionTime = 0;
  }

  getCount(): number {
    return this.count;
  }
}

/**
 * バッファごとのカウンター管理
 */
export class MotionManager {
  private counters: Map<number, MotionCounter> = new Map();
  
  getCounter(bufnr: number, threshold?: number, timeout?: number): MotionCounter {
    if (!this.counters.has(bufnr)) {
      this.counters.set(bufnr, new MotionCounter(threshold, timeout));
    }
    return this.counters.get(bufnr)!;
  }
  
  resetCounter(bufnr: number): void {
    const counter = this.counters.get(bufnr);
    if (counter) {
      counter.reset();
    }
  }
  
  clearAll(): void {
    this.counters.clear();
  }
}