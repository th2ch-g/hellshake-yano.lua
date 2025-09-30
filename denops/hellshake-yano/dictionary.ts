/**
 * @fileoverview 辞書システム関連の機能
 */
import type { Denops } from "@denops/std";
import { Core } from "./core.ts";

/**
 * 辞書機能用の Core インスタンスを取得する
 * @param denops - Denops インスタンス
 * @returns Core インスタンス
 */
async function getCoreForDictionary(denops: Denops): Promise<Core> {
  return Core.getInstance();
}

/**
 * 辞書システムを初期化する
 * @param denops - Denops インスタンス
 */
export async function initializeDictionarySystem(denops: Denops): Promise<void> {
  try {
    const core = await getCoreForDictionary(denops);
    await core.initializeDictionarySystem(denops);
  } catch (error) {
    console.error("Failed to initialize dictionary system:", error);
  }
}

/**
 * 辞書を再読み込みする
 * @param denops - Denops インスタンス
 * @throws {Error} 辞書の再読み込みに失敗した場合
 */
export async function reloadDictionary(denops: Denops): Promise<void> {
  try {
    const core = await getCoreForDictionary(denops);
    await core.reloadDictionary(denops);
  } catch (error) {
    await denops.cmd(`echoerr "Failed to reload dictionary: ${error}"`);
  }
}

/**
 * 辞書に単語を追加する
 * @param denops - Denops インスタンス
 * @param word - 追加する単語
 * @param meaning - 単語の意味（オプション）
 * @param type - 単語の種類（オプション）
 * @throws {Error} 辞書への追加に失敗した場合
 */
export async function addToDictionary(
  denops: Denops,
  word: string,
  meaning?: string,
  type?: string,
): Promise<void> {
  try {
    const core = await getCoreForDictionary(denops);
    await core.addToDictionary(denops, word, meaning || "", type || "");
  } catch (error) {
    await denops.cmd(`echoerr "Failed to add to dictionary: ${error}"`);
  }
}

/**
 * 辞書を編集する
 * @param denops - Denops インスタンス
 * @throws {Error} 辞書の編集に失敗した場合
 */
export async function editDictionary(denops: Denops): Promise<void> {
  try {
    const core = await getCoreForDictionary(denops);
    await core.editDictionary(denops);
  } catch (error) {
    await denops.cmd(`echoerr "Failed to edit dictionary: ${error}"`);
  }
}

/**
 * 辞書を表示する
 * @param denops - Denops インスタンス
 * @throws {Error} 辞書の表示に失敗した場合
 */
export async function showDictionary(denops: Denops): Promise<void> {
  try {
    const core = await getCoreForDictionary(denops);
    await core.showDictionary(denops);
  } catch (error) {
    await denops.cmd(`echoerr "Failed to show dictionary: ${error}"`);
  }
}

/**
 * 辞書の妥当性を検証する
 * @param denops - Denops インスタンス
 * @throws {Error} 辞書の検証に失敗した場合
 */
export async function validateDictionary(denops: Denops): Promise<void> {
  try {
    const core = await getCoreForDictionary(denops);
    await core.validateDictionary(denops);
  } catch (error) {
    await denops.cmd(`echoerr "Failed to validate dictionary: ${error}"`);
  }
}