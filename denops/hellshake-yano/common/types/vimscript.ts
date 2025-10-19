/**
 * denops/hellshake-yano/common/types/vimscript.ts
 *
 * VimScript互換性型の定義
 *
 * VimScript版との互換性のための型定義
 * ※ VimScriptWord型はword.tsに統合済み
 */

// Re-export VimScriptWord from word.ts for convenience
export type { VimScriptWord } from "./word.ts";

/**
 * Denops版のWord型（phase-b2互換）
 *
 * @property text - 単語文字列
 * @property line - 行番号（1-indexed）
 * @property col - 開始列（1-indexed）
 * @property byteCol - バイト列（オプショナル）
 */
export interface DenopsWord {
  text: string;
  line: number;
  col: number;
  byteCol?: number;
}
