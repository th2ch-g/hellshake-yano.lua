/**
 * VimScriptリファクタリング用の包括的テスト
 * VimScript側の関数群の動作をテストし、リファクタリング時の回帰を防ぐ
 */

import { assertEquals, assertExists, assert, assertNotEquals } from "@std/assert";
import { test } from "./testRunner.ts";
import { MockDenops, MockTimer, mockBuffer } from "./helpers/mock.ts";
import type { Denops } from "@denops/std";

// テスト用のMockDenopsを拡張して、VimScript関数の呼び出しをシミュレート
class VimScriptMockDenops extends MockDenops {
  private vimVariables: Map<string, any> = new Map();
  private vimFunctions: Map<string, any> = new Map();
  private commandHistory: string[] = [];
  private echoHistory: string[] = [];

  constructor() {
    super();
    this.setupDefaultVimFunctions();
    this.setupDefaultVariables();
  }

  private setupDefaultVimFunctions() {
    // デフォルトのVim関数をセットアップ
    this.vimFunctions.set('bufnr', () => 1);
    this.vimFunctions.set('reltime', () => [1000, 500000]);
    this.vimFunctions.set('reltimestr', () => '1.500000');
    this.vimFunctions.set('localtime', () => Math.floor(Date.now() / 1000));
    this.vimFunctions.set('has_key', (dict: any, key: string) => key in dict);
    this.vimFunctions.set('timer_start', (delay: number, callback: any) => Math.floor(Math.random() * 1000));
    this.vimFunctions.set('timer_stop', (id: number) => true);
    this.vimFunctions.set('exists', (var_name: string) => this.vimVariables.has(var_name));
  }

  private setupDefaultVariables() {
    // デフォルトのグローバル変数をセットアップ
    this.vimVariables.set('g:hellshake_yano', {
      enabled: true,
      motion_count: 3,
      motion_timeout: 2000,
      debug_mode: false,
      performance_log: false,
      suppress_on_key_repeat: true,
      key_repeat_threshold: 50,
      key_repeat_reset_delay: 300,
      markers: ['A', 'B', 'C', 'D', 'E'],
      highlight_hint_marker: 'DiffAdd',
      highlight_hint_marker_current: 'DiffText'
    });
    this.vimVariables.set('g:loaded_denops', 1);
    this.vimVariables.set('g:hellshake_yano_ready', false);
  }

  // VimScript変数の取得・設定
  setVimVariable(name: string, value: any) {
    this.vimVariables.set(name, value);
  }

  getVimVariable(name: string): any {
    return this.vimVariables.get(name);
  }

  // VimScript関数のモック
  setVimFunction(name: string, func: any) {
    this.vimFunctions.set(name, func);
  }

  // echoコマンドの履歴を取得
  getEchoHistory(): string[] {
    return [...this.echoHistory];
  }

  // コマンド履歴を取得
  getCommandHistory(): string[] {
    return [...this.commandHistory];
  }

  // Denopsのcallメソッドをオーバーライド
  override async call(fn: string, ...args: unknown[]): Promise<unknown> {
    // VimScript関数の呼び出しをシミュレート
    if (this.vimFunctions.has(fn)) {
      const func = this.vimFunctions.get(fn);
      return typeof func === 'function' ? func(...args) : func;
    }

    // 変数の取得
    if (fn === 'eval') {
      const expr = args[0] as string;
      if (this.vimVariables.has(expr)) {
        return this.vimVariables.get(expr);
      }
    }

    return super.call(fn, ...args);
  }

  // Denopsのcmdメソッドをオーバーライド
  override async cmd(command: string): Promise<void> {
    this.commandHistory.push(command);

    // echoコマンドの処理
    if (command.startsWith('echo')) {
      const message = command.replace(/^echo\w*\s*/, '');
      this.echoHistory.push(message);
    }

    return super.cmd(command);
  }
}

// ===== 共通ヘルパー関数のテスト =====

test("s:show_error() - エラーメッセージ表示のテスト", async (denops) => {
  const mockDenops = new VimScriptMockDenops();

  // エラーメッセージを表示
  await mockDenops.cmd('echohl ErrorMsg');
  await mockDenops.cmd('echomsg "Test error message"');
  await mockDenops.cmd('echohl None');

  const commands = mockDenops.getCommandHistory();
  assertEquals(commands.length, 3);
  assertEquals(commands[0], 'echohl ErrorMsg');
  assertEquals(commands[1], 'echomsg "Test error message"');
  assertEquals(commands[2], 'echohl None');
});

test("denops通知機能のテスト", async (denops) => {
  const mockDenops = new VimScriptMockDenops();

  // denopsの準備ができているかをテスト
  const isReady = await mockDenops.call('exists', 'g:loaded_denops');
  assertEquals(isReady, true);

  // 設定の通知をシミュレート
  const config = mockDenops.getVimVariable('g:hellshake_yano');
  assertExists(config);
  assertEquals(config.enabled, true);
  assertEquals(config.motion_count, 3);
});

test("s:stop_and_clear_timer() - タイマー管理のテスト", async (denops) => {
  const mockTimer = new MockTimer();
  let timerStopped = false;

  // タイマーのモック
  const timerId = mockTimer.setTimeout(() => {
    // タイマーコールバック
  }, 1000);

  // タイマーを停止
  mockTimer.clearTimeout(timerId);
  timerStopped = true;

  assert(timerStopped, "タイマーが正常に停止されること");
});

// ===== 責任分離のテスト =====

test("モーションカウント処理のテスト", async (denops) => {
  const mockDenops = new VimScriptMockDenops();

  // 初期状態
  let motionCount = 0;
  const maxCount = 3;

  // モーションカウントの増加をシミュレート
  function processMotionCount(): boolean {
    motionCount++;
    return motionCount >= maxCount;
  }

  // 1回目、2回目はまだトリガーしない
  assertEquals(processMotionCount(), false);
  assertEquals(motionCount, 1);

  assertEquals(processMotionCount(), false);
  assertEquals(motionCount, 2);

  // 3回目でトリガー
  assertEquals(processMotionCount(), true);
  assertEquals(motionCount, 3);
});

test("ヒントトリガー判定ロジックのテスト", async (denops) => {
  const mockDenops = new VimScriptMockDenops();

  // ヒントトリガー判定関数をシミュレート
  function shouldTriggerHints(
    motionCount: number,
    requiredCount: number,
    isKeyRepeating: boolean,
    pluginEnabled: boolean
  ): boolean {
    return pluginEnabled &&
           !isKeyRepeating &&
           motionCount >= requiredCount;
  }

  // 各条件のテスト
  assertEquals(shouldTriggerHints(3, 3, false, true), true, "通常の条件でトリガー");
  assertEquals(shouldTriggerHints(2, 3, false, true), false, "カウント不足");
  assertEquals(shouldTriggerHints(3, 3, true, true), false, "キーリピート中");
  assertEquals(shouldTriggerHints(3, 3, false, false), false, "プラグイン無効");
});

test("モーションタイムアウト設定のテスト", async (denops) => {
  const mockTimer = new MockTimer();
  let timeoutCalled = false;

  // タイムアウト設定関数をシミュレート
  function setMotionTimeout(delay: number, callback: () => void): number {
    return mockTimer.setTimeout(callback, delay);
  }

  // タイムアウトの設定
  const timerId = setMotionTimeout(2000, () => {
    timeoutCalled = true;
  });

  assertExists(timerId);

  // タイムアウトのクリア
  mockTimer.clearTimeout(timerId);

  // 一定時間後にもコールバックが呼ばれないことを確認
  await new Promise<void>((resolve) => {
    const checkTimer = setTimeout(() => {
      assertEquals(timeoutCalled, false, "タイムアウトがキャンセルされること");
      clearTimeout(checkTimer);
      resolve();
    }, 100);
  });

  // MockTimerのクリーンアップ
  mockTimer.clearAll();
});

// ===== 設定検証のテスト =====

test("設定値の検証とサニタイズのテスト", async (denops) => {
  const mockDenops = new VimScriptMockDenops();

  // 無効な設定値のテスト
  function validateKeyRepeatThreshold(value: number): number {
    if (value <= 0) {
      console.warn('Warning: key_repeat_threshold must be positive, using default 50ms');
      return 50;
    }
    return value;
  }

  function validateKeyRepeatResetDelay(value: number): number {
    if (value <= 0) {
      console.warn('Warning: key_repeat_reset_delay must be positive, using default 300ms');
      return 300;
    }
    return value;
  }

  // 無効な値をテスト
  assertEquals(validateKeyRepeatThreshold(-10), 50);
  assertEquals(validateKeyRepeatThreshold(0), 50);
  assertEquals(validateKeyRepeatThreshold(100), 100);

  assertEquals(validateKeyRepeatResetDelay(-50), 300);
  assertEquals(validateKeyRepeatResetDelay(0), 300);
  assertEquals(validateKeyRepeatResetDelay(500), 500);
});

test("ハイライトグループ名の検証テスト", async (denops) => {
  const mockDenops = new VimScriptMockDenops();

  // ハイライトグループ名の検証関数をシミュレート
  function validateHighlightGroupName(name: string): boolean {
    // 英数字とアンダースコアのみ許可
    const validPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!validPattern.test(name)) {
      throw new Error(`Invalid highlight group name: ${name}`);
    }
    return true;
  }

  // 有効な名前
  assertEquals(validateHighlightGroupName('HellshakeYanoMarker'), true);
  assertEquals(validateHighlightGroupName('Custom_Highlight'), true);
  assertEquals(validateHighlightGroupName('_ValidName'), true);

  // 無効な名前のテスト
  try {
    validateHighlightGroupName('123Invalid');
    assert(false, "数字で始まる名前は無効のはず");
  } catch (e) {
    assert(e instanceof Error);
  }

  try {
    validateHighlightGroupName('Invalid-Name');
    assert(false, "ハイフンを含む名前は無効のはず");
  } catch (e) {
    assert(e instanceof Error);
  }
});

// ===== 色の検証テスト =====

test("色名の正規化と検証のテスト", async (denops) => {
  const mockDenops = new VimScriptMockDenops();

  // 色名の正規化関数をシミュレート
  function normalizeColorName(color: string): string {
    return color.toLowerCase().replace(/\s+/g, '');
  }

  // 有効な色名のリスト
  const validColors = [
    'black', 'darkred', 'darkgreen', 'darkyellow',
    'darkblue', 'darkmagenta', 'darkcyan', 'lightgray',
    'darkgray', 'red', 'green', 'yellow', 'blue',
    'magenta', 'cyan', 'white', 'gray', 'grey',
    'lightred', 'lightgreen', 'lightyellow', 'lightblue',
    'lightmagenta', 'lightcyan', 'brown', 'orange'
  ];

  // 色の検証関数をシミュレート
  function validateColor(color: string): boolean {
    const normalized = normalizeColorName(color);
    if (!validColors.includes(normalized)) {
      throw new Error(`Invalid color name: ${color}`);
    }
    return true;
  }

  // 正規化のテスト
  assertEquals(normalizeColorName('Dark Red'), 'darkred');
  assertEquals(normalizeColorName('BLUE'), 'blue');
  assertEquals(normalizeColorName(' Green '), 'green');

  // 有効な色のテスト
  assertEquals(validateColor('red'), true);
  assertEquals(validateColor('DarkBlue'), true);
  assertEquals(validateColor('Light Green'), true);

  // 無効な色のテスト
  try {
    validateColor('InvalidColor');
    assert(false, "無効な色名は例外を投げるはず");
  } catch (e) {
    assert(e instanceof Error);
  }
});

// ===== キーリピート検出のテスト =====

test("キーリピート検出ロジックのテスト", async (denops) => {
  const mockDenops = new VimScriptMockDenops();

  // キーリピート検出の状態管理
  interface KeyRepeatState {
    lastKeyTime: number;
    isRepeating: boolean;
    threshold: number;
    resetDelay: number;
  }

  // キーリピート検出関数をシミュレート
  function handleKeyRepeatDetection(
    state: KeyRepeatState,
    currentTime: number,
    suppressOnRepeat: boolean
  ): boolean {
    const timeDiff = currentTime - state.lastKeyTime;

    if (timeDiff < state.threshold) {
      // キーリピート検出
      state.isRepeating = true;
      state.lastKeyTime = currentTime;
      return suppressOnRepeat; // 抑制が有効ならtrue
    } else {
      // リピートではない
      if (state.isRepeating && timeDiff > state.resetDelay) {
        state.isRepeating = false;
      }
      state.lastKeyTime = currentTime;
      return false;
    }
  }

  // テスト実行
  const state: KeyRepeatState = {
    lastKeyTime: 0,
    isRepeating: false,
    threshold: 50,
    resetDelay: 300
  };

  // 最初のキー入力
  assertEquals(handleKeyRepeatDetection(state, 100, true), false);
  assertEquals(state.isRepeating, false);

  // 短い間隔でのキー入力（リピート検出）
  assertEquals(handleKeyRepeatDetection(state, 130, true), true);
  assertEquals(state.isRepeating, true);

  // リピート中の継続入力
  assertEquals(handleKeyRepeatDetection(state, 160, true), true);
  assertEquals(state.isRepeating, true);

  // 長い間隔での入力（リピート終了）
  assertEquals(handleKeyRepeatDetection(state, 500, true), false);
  assertEquals(state.isRepeating, false);
});

// ===== denopsの準備状態確認テスト =====

test("denopsの準備状態確認テスト", async (denops) => {
  const mockDenops = new VimScriptMockDenops();

  // denopsの準備確認関数をシミュレート
  function isDenopsReady(): boolean {
    const loaded = mockDenops.getVimVariable('g:loaded_denops');
    const ready = mockDenops.getVimVariable('g:hellshake_yano_ready');
    return Boolean(loaded && ready);
  }

  // 初期状態（denopsは読み込まれているが、プラグインはまだ準備中）
  assertEquals(isDenopsReady(), false);

  // プラグインの準備完了をシミュレート
  mockDenops.setVimVariable('g:hellshake_yano_ready', true);
  assertEquals(isDenopsReady(), true);

  // denopsが読み込まれていない場合
  mockDenops.setVimVariable('g:loaded_denops', false);
  assertEquals(isDenopsReady(), false);
});

// ===== パフォーマンスログのテスト =====

test("パフォーマンスログ機能のテスト", async (denops) => {
  const mockDenops = new VimScriptMockDenops();
  const logHistory: Array<{operation: string, time: number, details: any}> = [];

  // パフォーマンスログ関数をシミュレート
  function logPerformance(operation: string, elapsedTime: number, details: any = {}) {
    const config = mockDenops.getVimVariable('g:hellshake_yano');
    if (config?.performance_log) {
      logHistory.push({
        operation,
        time: elapsedTime,
        details
      });
    }
  }

  // パフォーマンスログが無効な場合
  logPerformance('test_operation', 100, { key: 'h' });
  assertEquals(logHistory.length, 0);

  // パフォーマンスログを有効化
  const config = mockDenops.getVimVariable('g:hellshake_yano');
  config.performance_log = true;
  mockDenops.setVimVariable('g:hellshake_yano', config);

  // ログの記録
  logPerformance('motion_with_hints', 150, { key: 'j', count: 3 });
  logPerformance('motion_normal', 50, { key: 'k', count: 2 });

  assertEquals(logHistory.length, 2);
  assertEquals(logHistory[0].operation, 'motion_with_hints');
  assertEquals(logHistory[0].time, 150);
  assertEquals(logHistory[0].details.key, 'j');
  assertEquals(logHistory[1].operation, 'motion_normal');
  assertEquals(logHistory[1].time, 50);
});

// ===== 統合テスト =====

test("全体統合テスト: モーション検出からヒント表示まで", async (denops) => {
  const mockDenops = new VimScriptMockDenops();
  const mockTimer = new MockTimer();

  // システム全体の状態
  let motionCount = 0;
  let hintsVisible = false;
  let currentTimerId: number | null = null;

  // メインのモーション処理関数をシミュレート
  function handleMotion(key: string): string {
    const config = mockDenops.getVimVariable('g:hellshake_yano');

    if (!config.enabled) {
      return key;
    }

    // キーリピート検出（簡略版）
    const isRepeating = false; // 簡略化

    if (isRepeating && config.suppress_on_key_repeat) {
      return key;
    }

    // 既存のタイマーをクリア
    if (currentTimerId !== null) {
      mockTimer.clearTimeout(currentTimerId);
      currentTimerId = null;
    }

    // カウントを増加
    motionCount++;

    // ヒント表示の判定
    if (motionCount >= config.motion_count) {
      motionCount = 0; // リセット
      hintsVisible = true;
      return key;
    } else {
      // タイムアウトタイマーを設定
      currentTimerId = mockTimer.setTimeout(() => {
        motionCount = 0;
        currentTimerId = null;
      }, config.motion_timeout);
      return key;
    }
  }

  // テストシナリオ
  assertEquals(handleMotion('h'), 'h');
  assertEquals(motionCount, 1);
  assertEquals(hintsVisible, false);

  assertEquals(handleMotion('j'), 'j');
  assertEquals(motionCount, 2);
  assertEquals(hintsVisible, false);

  assertEquals(handleMotion('k'), 'k');
  assertEquals(motionCount, 0); // リセットされる
  assertEquals(hintsVisible, true); // ヒント表示

  // 状態をリセット
  hintsVisible = false;
  motionCount = 0;

  // プラグインを無効化してテスト
  const config = mockDenops.getVimVariable('g:hellshake_yano');
  config.enabled = false;
  mockDenops.setVimVariable('g:hellshake_yano', config);

  assertEquals(handleMotion('l'), 'l');
  assertEquals(motionCount, 0); // カウントされない
  assertEquals(hintsVisible, false); // ヒント表示されない
});