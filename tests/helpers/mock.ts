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
 */
export class MockDenops implements Partial<Denops> {
  private callResponses: Map<string, any> = new Map();
  private cmdHandlers: Array<(cmd: string) => void> = [];
  private callHandlers: Map<string, ((...args: any[]) => any)> = new Map();
  private executedCommands: string[] = [];

  meta = {
    host: "nvim" as const,
    mode: "test" as const,
    platform: "linux" as const,
    version: "0.0.0",
  };

  dispatcher: Record<string, (...args: unknown[]) => unknown> = {};

  setCallResponse(method: string, response: any): void {
    this.callResponses.set(method, response);
  }

  onCall(method: string, handler: (...args: any[]) => any): void {
    this.callHandlers.set(method, handler);
  }

  onCmd(handler: (cmd: string) => void): void {
    this.cmdHandlers.push(handler);
  }

  async call(fn: string, ...args: unknown[]): Promise<unknown> {
    // カスタムハンドラーがあれば実行
    if (this.callHandlers.has(fn)) {
      const handler = this.callHandlers.get(fn)!;
      return handler(...args);
    }

    // 事前設定されたレスポンスを返す
    if (this.callResponses.has(fn)) {
      const response = this.callResponses.get(fn);
      return typeof response === "function" ? response() : response;
    }

    // デフォルトのレスポンス
    switch (fn) {
      case "bufnr":
        return 1;
      case "line":
        return args[0] === "." ? 1 : 100;
      case "col":
        return args[0] === "." ? 1 : 80;
      case "getbufvar":
        return "";
      case "cursor":
        if (this.callHandlers.has("cursor")) {
          const handler = this.callHandlers.get("cursor")!;
          return handler(args[0], args[1]);
        }
        return undefined;
      default:
        return undefined;
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

  async eval(expr: string, _context?: unknown): Promise<unknown> {
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
