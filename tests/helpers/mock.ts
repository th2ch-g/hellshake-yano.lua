import type { Denops } from "@denops/std";

/**
 * テスト用のバッファを作成
 */
export async function mockBuffer(denops: Denops, content: string[]): Promise<number> {
  await denops.cmd("enew!");
  await denops.call("setline", 1, content);
  return await denops.call("bufnr", "%") as number;
}

/**
 * テスト用のウィンドウを作成
 */
export async function mockWindow(
  denops: Denops,
  layout: "split" | "vsplit" | "tab" = "split",
): Promise<number> {
  switch (layout) {
    case "split":
      await denops.cmd("split");
      break;
    case "vsplit":
      await denops.cmd("vsplit");
      break;
    case "tab":
      await denops.cmd("tabnew");
      break;
  }
  return await denops.call("winnr") as number;
}

/**
 * カーソル位置のモック
 */
export async function mockCursor(denops: Denops, line: number, col: number): Promise<void> {
  await denops.call("cursor", line, col);
}

/**
 * ユーザー入力のモック（getchar）
 */
export class MockGetchar {
  private inputs: string[];
  private currentIndex: number;

  constructor(inputs: string[]) {
    this.inputs = inputs;
    this.currentIndex = 0;
  }

  async getNextChar(): Promise<string | null> {
    if (this.currentIndex >= this.inputs.length) {
      return null;
    }
    return this.inputs[this.currentIndex++];
  }

  reset(): void {
    this.currentIndex = 0;
  }
}

/**
 * 画面表示範囲のモック
 */
export async function mockVisibleRange(
  denops: Denops,
  topLine: number,
  bottomLine: number,
): Promise<void> {
  // ウィンドウの高さを設定
  const height = bottomLine - topLine + 1;
  await denops.cmd(`resize ${height}`);

  // トップラインまでスクロール
  await denops.call("cursor", topLine, 1);
  await denops.cmd("normal! zt");
}

/**
 * ExtMark（仮想テキスト）のモック
 */
export interface MockExtMark {
  bufnr: number;
  line: number;
  col: number;
  text: string;
  hlGroup: string;
}

export class ExtMarkManager {
  private marks: MockExtMark[] = [];

  addMark(mark: MockExtMark): void {
    this.marks.push(mark);
  }

  getMarks(): MockExtMark[] {
    return [...this.marks];
  }

  clearMarks(bufnr?: number): void {
    if (bufnr !== undefined) {
      this.marks = this.marks.filter((m) => m.bufnr !== bufnr);
    } else {
      this.marks = [];
    }
  }

  getMarkAt(line: number, col: number): MockExtMark | undefined {
    return this.marks.find((m) => m.line === line && m.col === col);
  }
}

/**
 * タイマーのモック
 */
export class MockTimer {
  private timers: Map<number, number> = new Map();
  private nextId = 1;

  setTimeout(callback: () => void, delay: number): number {
    const id = this.nextId++;
    const timeout = setTimeout(() => {
      callback();
      this.timers.delete(id);
    }, delay);
    this.timers.set(id, timeout);
    return id;
  }

  clearTimeout(id: number): void {
    const timeout = this.timers.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timers.delete(id);
    }
  }

  /**
   * すべてのタイマーをクリアする（テスト終了時用）
   */
  cleanup(): void {
    for (const [id, timeout] of this.timers) {
      clearTimeout(timeout);
    }
    this.timers.clear();
  }

  clearAll(): void {
    for (const timeout of this.timers.values()) {
      clearTimeout(timeout);
    }
    this.timers.clear();
  }
}

/**
 * MockDenops - Denopsインターフェースのモック実装
 *
 * ジェネリクスにより型安全な呼び出しが可能になりました。
 *
 * @example
 * ```typescript
 * const denops = new MockDenops();
 *
 * // 戻り値の型を指定
 * denops.setCallResponse<number>("bufnr", 1);
 * const bufnr = await denops.call<number>("bufnr", "%"); // number型
 *
 * // ハンドラーの引数と戻り値の型を指定
 * denops.onCall<[string], string>("upper", (s) => s.toUpperCase());
 * const result = await denops.call<string>("upper", "hello"); // "HELLO"
 * ```
 */
export class MockDenops implements Denops {
  private callResponses: Map<string, unknown> = new Map();
  private cmdHandlers: Array<(cmd: string) => void> = [];
  private callHandlers: Map<string, (...args: unknown[]) => unknown> = new Map();
  private executedCommands: string[] = [];
  private callLog: Array<{ fn: string; args: unknown[] }> = [];
  private evalResponses: Map<string, unknown> = new Map();

  name = "hellshake-yano:test";

  meta: { host: "nvim" | "vim"; mode: "test"; platform: "linux"; version: string } = {
    host: "nvim" as const,
    mode: "test" as const,
    platform: "linux" as const,
    version: "0.0.0",
  };

  context: Record<string, unknown> = {};

  dispatcher: Record<string, (...args: unknown[]) => unknown> = {};

  redraw(_force?: boolean): Promise<void> {
    return Promise.resolve();
  }

  /**
   * モックレスポンスを設定
   * @template T レスポンスの型（デフォルト: unknown）
   * @param method メソッド名
   * @param response レスポンスの値
   */
  setCallResponse<T = unknown>(method: string, response: T): void {
    this.callResponses.set(method, response);
  }

  /**
   * evalモックレスポンスを設定
   * @template T レスポンスの型（デフォルト: unknown）
   * @param expr 評価式
   * @param response レスポンスの値
   */
  setEvalResponse<T = unknown>(expr: string, response: T): void {
    this.evalResponses.set(expr, response);
  }

  /**
   * カスタムハンドラーを設定
   * @template TArgs ハンドラーの引数の型（デフォルト: unknown[]）
   * @template TReturn ハンドラーの戻り値の型（デフォルト: unknown）
   * @param method メソッド名
   * @param handler ハンドラー関数
   */
  onCall<TArgs extends unknown[] = unknown[], TReturn = unknown>(
    method: string,
    handler: (...args: TArgs) => TReturn,
  ): void {
    this.callHandlers.set(method, handler as (...args: unknown[]) => unknown);
  }

  onCmd(handler: (cmd: string) => void): void {
    this.cmdHandlers.push(handler);
  }

  /**
   * Vim/Neovim関数を呼び出す
   * @template T 戻り値の型（デフォルト: unknown）
   * @param fn 関数名
   * @param args 引数
   * @returns 戻り値
   *
   * @example
   * ```typescript
   * // number型として取得
   * const bufnr = await denops.call<number>("bufnr", "%");
   *
   * // string型として取得
   * const name = await denops.call<string>("expand", "%:t");
   *
   * // 配列型として取得
   * const lines = await denops.call<string[]>("getline", 1, "$");
   * ```
   */
  async call<T = unknown>(fn: string, ...args: unknown[]): Promise<T> {
    // Record the call
    this.callLog.push({ fn, args });

    // カスタムハンドラーがあれば実行
    if (this.callHandlers.has(fn)) {
      const handler = this.callHandlers.get(fn)!;
      return handler(...args) as T;
    }

    // 事前設定されたレスポンスを返す
    if (this.callResponses.has(fn)) {
      const response = this.callResponses.get(fn);
      return (typeof response === "function" ? response(...args) : response) as T;
    }

    // デフォルトのレスポンス
    switch (fn) {
      case "bufnr":
        return 1 as T;
      case "line":
        return (args[0] === "." ? 1 : 100) as T;
      case "col":
        return (args[0] === "." ? 1 : 80) as T;
      case "getbufvar":
        return "" as T;
      case "cursor":
        if (this.callHandlers.has("cursor")) {
          const handler = this.callHandlers.get("cursor")!;
          return handler(args[0], args[1]) as T;
        }
        return undefined as T;
      case "nvim_create_namespace":
        return 1 as T;
      case "nvim_buf_clear_namespace":
        return true as T;
      case "nvim_buf_set_extmark":
        return 1 as T;
      case "getmatches":
        return [] as T;
      case "matchadd":
        return 1 as T;
      case "matchdelete":
        return true as T;
      case "getchar":
        return 27 as T; // ESC key by default
      case "bufexists":
        return 1 as T;
      case "foldclosed":
        return -1 as T; // fold されていない行は -1 を返す
      case "foldclosedend":
        return -1 as T; // fold されていない行は -1 を返す
      default:
        return undefined as T;
    }
  }

  async batch(..._args: unknown[]): Promise<unknown[]> {
    return [];
  }

  async cmd(command: string, _context?: unknown): Promise<void> {
    // コマンドを記録
    this.executedCommands.push(command);

    // コマンドハンドラーを実行
    for (const handler of this.cmdHandlers) {
      handler(command);
    }
  }

  getExecutedCommands(): string[] {
    return [...this.executedCommands];
  }

  clearExecutedCommands(): void {
    this.executedCommands = [];
  }

  /**
   * Get all recorded function calls for testing
   */
  getCalls(): Array<{ fn: string; args: unknown[] }> {
    return [...this.callLog];
  }

  /**
   * Clear call log for clean testing
   */
  clearCallLog(): void {
    this.callLog = [];
    this.executedCommands = [];
  }

  async eval(expr: string, _context?: unknown): Promise<unknown> {
    // 事前設定されたレスポンスを返す
    if (this.evalResponses.has(expr)) {
      return this.evalResponses.get(expr);
    }
    return undefined;
  }

  async dispatch(_name: string, ..._args: unknown[]): Promise<unknown> {
    return undefined;
  }
}

/**
 * テスト用のサンプルテキスト生成
 */
export function generateSampleText(): string[] {
  return [
    "The quick brown fox jumps over the lazy dog.",
    "Hello world from TypeScript and Deno.",
    "This is a test buffer for hellshake-yano plugin.",
    "",
    "日本語のテキストも含まれています。",
    "const example = { foo: 'bar', baz: 42 };",
    "function testFunction(param1: string, param2: number) {",
    "  return `${param1}: ${param2}`;",
    "}",
    "",
    "Special characters: !@#$%^&*()_+-=[]{}|;':\",./<>?",
  ];
}

/**
 * 単語位置の情報
 */
export interface WordPosition {
  word: string;
  line: number;
  startCol: number;
  endCol: number;
}

/**
 * テスト用の単語位置リストを生成
 */
export function generateWordPositions(lines: string[]): WordPosition[] {
  const positions: WordPosition[] = [];

  lines.forEach((line, lineIndex) => {
    const wordRegex = /\b\w+\b/g;
    let match;

    while ((match = wordRegex.exec(line)) !== null) {
      positions.push({
        word: match[0],
        line: lineIndex + 1, // Vimの行番号は1から始まる
        startCol: match.index + 1, // Vimの列番号は1から始まる
        endCol: match.index + match[0].length,
      });
    }
  });

  return positions;
}
