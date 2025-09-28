/**
 * @deprecated This file has been integrated into core.ts
 *
 * すべての機能は core.ts に統合されました。
 * 後方互換性のため、core.ts から再エクスポートします。
 */

// Re-export from core.ts for backward compatibility
export {
  createHintOperations,
  analyzeInputCharacter,
  isControlCharacter,
  findMatchingHints,
  findExactMatch,
} from "../core.ts";