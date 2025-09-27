/**
 * MOVED: utils/validation.ts has been migrated to config.ts and core.ts
 *
 * Process4 Sub6-2: validation.ts分散完了
 *
 * 移行先:
 * - 設定検証関数 → config.ts
 *   - validateConfigValue()
 *   - validateConfigObject()
 *   - ValidationRules interface
 *   - ValidationResult interface
 *   - isValidType(), isInRange(), isValidLength(), isValidArrayLength(), isValidEnum()
 *
 * - 汎用検証関数 → core.ts
 *   - validateHighlightGroupName()
 *   - isValidColorName()
 *   - isValidHexColor()
 *   - validateHighlightColor()
 *   - HighlightColor interface (already in types.ts)
 *
 * このファイルは削除予定です。
 * 新しいインポートパスを使用してください:
 * - config.ts から設定検証関数をインポート
 * - core.ts から汎用検証関数をインポート
 */

// This file is deprecated and will be removed
// Use the migrated functions from config.ts and core.ts instead