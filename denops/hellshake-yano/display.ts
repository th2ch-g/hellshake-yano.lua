/**
 * Display Utilities - Backward Compatibility Module
 *
 * utils/display.tsが削除された後の後方互換性を提供する。
 * 基本的な表示幅計算はhint.tsから再エクスポート。
 *
 * キャッシュ管理・統計・Vim統合などの高度な機能は、
 * Core.tsのstatic methodsとして直接利用してください：
 * - Core.createDisplayWidthCache()
 * - Core.getDisplayWidthCached()
 * - Core.getVimDisplayWidth()
 * - Core.clearDisplayWidthCache()
 * - Core.getDisplayWidthCacheStats()
 * - Core.hasWideCharacters()
 *
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