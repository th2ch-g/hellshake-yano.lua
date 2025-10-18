/**
 * Types - Phase B-4 Process100
 * 型定義の最適化（モジュール共通の型定義を集約）
 * GREENフェーズ: 最小実装
 */

/**
 * 実装の選択肢
 */
export type ImplementationChoice = "denops-unified" | "vimscript-pure";

/**
 * コマンド情報
 */
export interface CommandInfo {
  name: string;
  description: string;
  implementation: ImplementationChoice;
  category?: string;
  options?: Record<string, unknown>;
}

/**
 * マッピング設定
 */
export interface MappingConfig {
  type: "motion" | "visual" | "command";
  keys: string[];
  enabled: boolean;
  handler?: string;
}

/**
 * リファクタリング用コンテキスト
 */
export interface RefactoringContext {
  module: string;
  version: string;
  timestamp: number;
  metrics?: {
    commonProcessCount: number;
    duplicateCount: number;
  };
}

/**
 * バリデーション結果（common-base.tsからエクスポート）
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Denopsの状態情報
 */
export interface DenopsStatus {
  available: boolean;
  running: boolean;
  version?: string;
}

/**
 * 設定マッピング情報
 */
export interface ConfigMappingInfo {
  oldKey: string;
  newKey: string;
  transform?: (value: unknown) => unknown;
  description?: string;
}

/**
 * 初期化結果
 */
export interface InitializationResult {
  success: boolean;
  implementation: ImplementationChoice;
  warnings: string[];
  errors: string[];
}
