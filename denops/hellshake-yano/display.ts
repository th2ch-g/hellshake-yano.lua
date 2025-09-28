/**
 * @deprecated process4 sub8-2: このファイルは削除予定です
 */

/**
 * Display Utilities - Backward Compatibility Module
 *
 * MOVED: utils/display.ts has been migrated to hint.ts and core.ts
 *
 * Process4 Sub6-3: display.ts分散完了
 *
 * 移行先:
 * - 基本表示幅計算関数 → hint.ts
 *   - getCharDisplayWidth()
 *   - getDisplayWidth()
 *
 * - 高度な表示機能 → core.ts (static methods)
 *   - Core.createDisplayWidthCache()
 *   - Core.getDisplayWidthCached()
 *   - Core.clearDisplayWidthCache()
 *   - Core.getDisplayWidthCacheStats()
 *   - Core.hasWideCharacters()
 *
 * このファイルは削除予定です。
 * 新しいインポートパスを使用してください:
 * - hint.ts から基本表示幅計算関数をインポート
 * - core.ts から高度な表示機能をインポート（Core.methodName() 形式）
 *
 * @deprecated Use functions from hint.ts and core.ts instead
 * @module display
 * @version 2.0.0 - Migrated from utils/display.ts
 */

// 基本的な表示幅計算関数をhint.tsから再エクスポート
export {
  getCharDisplayWidth,
  getDisplayWidth
} from "./hint.ts";

// Coreクラスも再エクスポート（高度な機能用）
export { Core } from "./core.ts";