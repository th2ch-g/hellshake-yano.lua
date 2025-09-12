import { assertEquals, assertNotEquals } from "@std/assert";
import { test, sleep } from "./testRunner.ts";
import { MockTimer } from "./helpers/mock.ts";

// 移動カウント管理機能をインポート（実装前なのでコメントアウト）
// import { MotionCounter, MotionManager } from "../denops/hellshake-yano/motion.ts";

// TODO: 実装後に上記のインポートを有効化
// 現在はテストがREDになることを確認するため、クラスが存在しない状態にする

// 型定義のみ（実装はまだ存在しない）
declare class MotionCounter {
  constructor(
    threshold?: number,
    timeoutMs?: number,
    onThresholdReached?: () => void,
  );
  increment(): boolean;
  reset(): void;
  getCount(): number;
}

declare class MotionManager {
  getCounter(bufnr: number, threshold?: number, timeout?: number): MotionCounter;
  resetCounter(bufnr: number): void;
  clearAll(): void;
}

test("hjkl各キーのカウント増加", async (denops) => {
  const counter = new MotionCounter(3, 2000);
  
  // 初期状態
  assertEquals(counter.getCount(), 0);
  
  // h キーでカウント増加
  counter.increment();
  assertEquals(counter.getCount(), 1);
  
  // j キーでカウント増加
  counter.increment();
  assertEquals(counter.getCount(), 2);
  
  // k キーでカウント増加
  counter.increment();
  assertEquals(counter.getCount(), 0); // 閾値に達してリセット
});

test("指定回数到達時のトリガー", async (denops) => {
  let triggered = false;
  const counter = new MotionCounter(3, 2000, () => {
    triggered = true;
  });
  
  // 1回目、2回目ではトリガーされない
  assertEquals(counter.increment(), false);
  assertEquals(triggered, false);
  
  assertEquals(counter.increment(), false);
  assertEquals(triggered, false);
  
  // 3回目でトリガー
  assertEquals(counter.increment(), true);
  assertEquals(triggered, true);
  
  // カウントはリセットされる
  assertEquals(counter.getCount(), 0);
});

test("異なる閾値でのトリガー", async (denops) => {
  // 閾値5でテスト
  const counter = new MotionCounter(5, 2000);
  
  for (let i = 1; i < 5; i++) {
    assertEquals(counter.increment(), false);
    assertEquals(counter.getCount(), i);
  }
  
  // 5回目でトリガー
  assertEquals(counter.increment(), true);
  assertEquals(counter.getCount(), 0);
});

test("タイムアウトによるリセット", async (denops) => {
  const counter = new MotionCounter(3, 100); // 100msでタイムアウト
  
  // 2回カウント
  counter.increment();
  counter.increment();
  assertEquals(counter.getCount(), 2);
  
  // タイムアウト待機
  await sleep(150);
  
  // タイムアウト後の increment でリセットされる
  counter.increment();
  assertEquals(counter.getCount(), 1); // リセット後の1回目
});

test("タイムアウト前の連続入力", async (denops) => {
  const counter = new MotionCounter(3, 200);
  
  // 高速に連続入力
  counter.increment();
  await sleep(50); // タイムアウト未満
  counter.increment();
  await sleep(50); // タイムアウト未満
  
  assertEquals(counter.getCount(), 2); // リセットされない
  
  counter.increment();
  assertEquals(counter.getCount(), 0); // 閾値に達してリセット
});

test("バッファごとの独立カウント", async (denops) => {
  const manager = new MotionManager();
  
  // バッファ1のカウンター
  const counter1 = manager.getCounter(1, 3, 2000);
  counter1.increment();
  counter1.increment();
  assertEquals(counter1.getCount(), 2);
  
  // バッファ2のカウンター（独立）
  const counter2 = manager.getCounter(2, 3, 2000);
  counter2.increment();
  assertEquals(counter2.getCount(), 1);
  
  // バッファ1は影響を受けない
  assertEquals(counter1.getCount(), 2);
  
  // 同じバッファ番号で取得すると同じインスタンス
  const counter1Again = manager.getCounter(1);
  assertEquals(counter1Again.getCount(), 2);
});

test("バッファカウンターのリセット", async (denops) => {
  const manager = new MotionManager();
  
  const counter = manager.getCounter(1, 3, 2000);
  counter.increment();
  counter.increment();
  assertEquals(counter.getCount(), 2);
  
  // リセット
  manager.resetCounter(1);
  assertEquals(counter.getCount(), 0);
});

test("モード変更時のリセット", async (denops) => {
  const counter = new MotionCounter(3, 2000);
  
  // ノーマルモードでカウント
  counter.increment();
  counter.increment();
  assertEquals(counter.getCount(), 2);
  
  // モード変更をシミュレート（リセットを呼ぶ）
  counter.reset();
  assertEquals(counter.getCount(), 0);
});

test("複数バッファの管理", async (denops) => {
  const manager = new MotionManager();
  
  // 複数のバッファでカウンターを作成
  for (let i = 1; i <= 5; i++) {
    const counter = manager.getCounter(i, 3, 2000);
    for (let j = 0; j < i; j++) {
      counter.increment();
    }
  }
  
  // 各バッファのカウントを確認
  assertEquals(manager.getCounter(1).getCount(), 1);
  assertEquals(manager.getCounter(2).getCount(), 2);
  assertEquals(manager.getCounter(3).getCount(), 0); // 3回でリセット
  assertEquals(manager.getCounter(4).getCount(), 1); // 3回でリセット後1回
  assertEquals(manager.getCounter(5).getCount(), 2); // 3回でリセット後2回
});

test("全カウンターのクリア", async (denops) => {
  const manager = new MotionManager();
  
  // 複数のカウンターを作成
  manager.getCounter(1).increment();
  manager.getCounter(2).increment();
  manager.getCounter(3).increment();
  
  // 全てクリア
  manager.clearAll();
  
  // 新しいカウンターとして作成される
  assertEquals(manager.getCounter(1).getCount(), 0);
  assertEquals(manager.getCounter(2).getCount(), 0);
  assertEquals(manager.getCounter(3).getCount(), 0);
});

test("カスタム閾値とタイムアウト", async (denops) => {
  const manager = new MotionManager();
  
  // バッファ1: 閾値2、タイムアウト100ms
  const counter1 = manager.getCounter(1, 2, 100);
  
  // バッファ2: 閾値5、タイムアウト500ms
  const counter2 = manager.getCounter(2, 5, 500);
  
  // バッファ1は2回でトリガー
  counter1.increment();
  assertEquals(counter1.increment(), true);
  
  // バッファ2は5回でトリガー
  for (let i = 0; i < 4; i++) {
    assertEquals(counter2.increment(), false);
  }
  assertEquals(counter2.increment(), true);
});

test("連続リセットの処理", async (denops) => {
  const counter = new MotionCounter(3, 2000);
  
  // 複数回リセットしても問題ない
  counter.reset();
  counter.reset();
  assertEquals(counter.getCount(), 0);
  
  // リセット後も正常に動作
  counter.increment();
  assertEquals(counter.getCount(), 1);
});

test("コールバック関数の実行", async (denops) => {
  let callbackCount = 0;
  const counter = new MotionCounter(2, 2000, () => {
    callbackCount++;
  });
  
  // 1回目のトリガー
  counter.increment();
  counter.increment();
  assertEquals(callbackCount, 1);
  
  // 2回目のトリガー
  counter.increment();
  counter.increment();
  assertEquals(callbackCount, 2);
});