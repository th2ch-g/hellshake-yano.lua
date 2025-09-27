/**
 * User Input Processing Module
 *
 * waitForUserInput関数から抽出された入力処理を担当
 * 単一責任: ユーザー入力の取得・解析・処理のみを実行
 */

import type { Denops } from "@denops/std";
import { type Config } from "../config.ts";

/**
 * 入力文字の分類情報
 */
export interface InputCharacterInfo {
  char: number;
  wasUpperCase: boolean;
  wasNumber: boolean;
  wasLowerCase: boolean;
  inputString: string;
}

/**
 * タイムアウト付きでユーザー入力を取得
 *
 * @param denops - Denopsインスタンス
 * @param timeout - タイムアウト時間（ミリ秒）
 * @returns 入力文字コード（-2: タイムアウト）
 */
export async function getUserInputWithTimeout(
  denops: Denops,
  timeout: number,
): Promise<number> {
  let timeoutId: number | undefined;

  try {
    const inputPromise = denops.call("getchar") as Promise<number>;
    const timeoutPromise = new Promise<number>((resolve) => {
      timeoutId = setTimeout(() => resolve(-2), timeout) as unknown as number;
    });

    const char = await Promise.race([inputPromise, timeoutPromise]);

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }

    return char;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * 入力文字が制御文字かどうかをチェック
 *
 * @param char - 文字コード
 * @returns 制御文字かどうか
 */
export function isControlCharacter(char: number): boolean {
  // ESCキー
  if (char === 27) return true;

  // Enter(13)以外の制御文字
  if (char < 32 && char !== 13) return true;

  return false;
}

/**
 * 入力文字の分類情報を分析
 *
 * @param char - 文字コード
 * @returns 入力文字の分類情報
 */
export function analyzeInputCharacter(char: number): InputCharacterInfo {
  // 元の入力が大文字かどうかを記録（A-Z: 65-90）
  const wasUpperCase = char >= 65 && char <= 90;
  // 元の入力が数字かどうかを記録（0-9: 48-57）
  const wasNumber = char >= 48 && char <= 57;
  // 元の入力が小文字かどうかを記録（a-z: 97-122）
  const wasLowerCase = char >= 97 && char <= 122;

  // 文字を小文字の文字列に変換（一貫性のため）
  let inputString: string;
  if (wasUpperCase) {
    inputString = String.fromCharCode(char + 32); // 大文字を小文字に変換
  } else {
    inputString = String.fromCharCode(char);
  }

  return {
    char,
    wasUpperCase,
    wasNumber,
    wasLowerCase,
    inputString,
  };
}

/**
 * ヒント候補を検索
 *
 * @param inputString - 入力文字列
 * @param currentHints - 現在のヒント配列
 * @returns マッチしたヒント配列
 */
export function findMatchingHints(
  inputString: string,
  currentHints: any[],
): any[] {
  const candidates = currentHints.filter(hint =>
    hint.marker && hint.marker.toLowerCase().startsWith(inputString.toLowerCase())
  );

  return candidates;
}

/**
 * 単文字マッチのヒントを検索
 *
 * @param inputString - 入力文字列
 * @param currentHints - 現在のヒント配列
 * @returns 完全マッチしたヒント、またはundefined
 */
export function findExactMatch(
  inputString: string,
  currentHints: any[],
): any | undefined {
  return currentHints.find(hint =>
    hint.marker && hint.marker.toLowerCase() === inputString.toLowerCase()
  );
}

/**
 * 数字入力の処理
 *
 * @param inputString - 入力文字列
 * @param currentHints - 現在のヒント配列
 * @returns 数字ヒントの候補配列
 */
export function processNumberInput(
  inputString: string,
  currentHints: any[],
): any[] {
  // 数字ヒントの候補を検索
  const numberCandidates = currentHints.filter(hint =>
    hint.marker && hint.marker.startsWith(inputString)
  );

  return numberCandidates;
}

/**
 * 複数文字入力の蓄積状態管理
 */
export class MultiCharInputManager {
  private inputBuffer = "";
  private isMultiCharMode = false;

  /**
   * 入力文字を蓄積
   *
   * @param inputString - 入力文字列
   */
  appendInput(inputString: string): void {
    this.inputBuffer += inputString;
    this.isMultiCharMode = true;
  }

  /**
   * 蓄積された入力を取得
   *
   * @returns 蓄積された入力文字列
   */
  getAccumulatedInput(): string {
    return this.inputBuffer;
  }

  /**
   * 複数文字モードかどうかを取得
   *
   * @returns 複数文字モードかどうか
   */
  isInMultiCharMode(): boolean {
    return this.isMultiCharMode;
  }

  /**
   * 入力バッファをリセット
   */
  reset(): void {
    this.inputBuffer = "";
    this.isMultiCharMode = false;
  }

  /**
   * 入力が有効かどうかをチェック
   *
   * @param currentHints - 現在のヒント配列
   * @returns 有効な入力かどうか
   */
  isValidInput(currentHints: any[]): boolean {
    if (this.inputBuffer.length === 0) return false;

    return currentHints.some(hint =>
      hint.marker && hint.marker.toLowerCase().startsWith(this.inputBuffer.toLowerCase())
    );
  }
}

/**
 * 入力処理の結果
 */
export interface InputProcessResult {
  action: "continue" | "execute" | "cancel" | "timeout";
  selectedHint?: any;
  message?: string;
}

/**
 * 入力処理の統合関数
 *
 * @param denops - Denopsインスタンス
 * @param config - 設定
 * @param currentHints - 現在のヒント配列
 * @param inputManager - 複数文字入力管理
 * @returns 処理結果
 */
export async function processUserInput(
  denops: Denops,
  config: Config,
  currentHints: any[],
  inputManager: MultiCharInputManager,
): Promise<InputProcessResult> {
  const timeout = config.motionTimeout || 2000;
  const char = await getUserInputWithTimeout(denops, timeout);

  // タイムアウトの場合
  if (char === -2) {
    return { action: "timeout", message: "Input timeout - hints cleared" };
  }

  // 制御文字の場合
  if (isControlCharacter(char)) {
    return { action: "cancel", message: "Input cancelled" };
  }

  // 入力文字を分析
  const inputInfo = analyzeInputCharacter(char);

  // 複数文字モードの場合は蓄積
  if (inputManager.isInMultiCharMode()) {
    inputManager.appendInput(inputInfo.inputString);
  } else {
    inputManager.reset();
    inputManager.appendInput(inputInfo.inputString);
  }

  const accumulatedInput = inputManager.getAccumulatedInput();

  // 完全マッチをチェック
  const exactMatch = findExactMatch(accumulatedInput, currentHints);
  if (exactMatch) {
    return { action: "execute", selectedHint: exactMatch };
  }

  // 部分マッチをチェック
  const candidates = findMatchingHints(accumulatedInput, currentHints);
  if (candidates.length === 0) {
    return { action: "cancel", message: "No matching hints found" };
  }

  if (candidates.length === 1) {
    return { action: "execute", selectedHint: candidates[0] };
  }

  // 複数の候補が残っている場合は継続
  return { action: "continue" };
}