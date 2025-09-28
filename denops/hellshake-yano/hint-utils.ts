/**
 * @deprecated process4 sub8-2: このファイルは削除予定です
 */

/**
 * ヒントユーティリティ関数 - 後方互換性維持のための再エクスポート
 *
 * @deprecated このファイルの関数は hint.ts に統合されました。
 * このファイルは後方互換性のためにのみ保持されています。
 * 新しいコードでは hint.ts から直接インポートしてください。
 */

// Re-export all hint utility functions from hint.ts for backward compatibility
export {
  convertToDisplayColumn,
  getWordDisplayEndCol,
  areWordsAdjacent,
  getWordDisplayStartCol,
  calculateHintDisplayPosition,
  isPositionWithinWord,
  calculateWordGap,
} from "./hint.ts";

// Re-export getByteLength from word.ts
export { getByteLength } from "./word.ts";
