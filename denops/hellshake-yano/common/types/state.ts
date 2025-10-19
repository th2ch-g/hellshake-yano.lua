/**
 * denops/hellshake-yano/common/types/state.ts
 *
 * モーション検出とビジュアルモードの状態型定義
 *
 * VimScript版のデータ構造との対応:
 * - s:motion_state (MotionState) ↔ VimScript motion.vim
 * - s:visual_state (VisualState) ↔ VimScript visual.vim
 */

/**
 * MotionState: モーション検出の内部状態
 *
 * VimScript版: hellshake_yano_vim#motion#s:motion_state
 *
 * @property lastMotion - 前回のモーションキー（'w', 'b', 'e'）
 * @property lastMotionTime - 前回のモーション時刻（ミリ秒）
 * @property motionCount - 現在のモーションカウント
 * @property timeoutMs - モーション検出のタイムアウト（ミリ秒）
 * @property threshold - モーション検出の閾値（デフォルト: 2）
 */
export interface MotionState {
  /** 前回のモーションキー（'w', 'b', 'e'） */
  lastMotion: string;

  /** 前回のモーション時刻（ミリ秒） */
  lastMotionTime: number;

  /** 現在のモーションカウント */
  motionCount: number;

  /** モーション検出のタイムアウト（ミリ秒） */
  timeoutMs: number;

  /** モーション検出の閾値（デフォルト: 2） */
  threshold: number;
}

/**
 * VisualState: ビジュアルモードの内部状態
 *
 * VimScript版: hellshake_yano_vim#visual#s:visual_state
 *
 * @property active - ビジュアルモードがアクティブか
 * @property mode - ビジュアルモードの種類（'v'=通常, 'V'=ライン, '\x16'=ブロック）
 * @property startLine - 選択範囲の開始行（1-indexed）
 * @property startCol - 選択範囲の開始列（1-indexed）
 * @property endLine - 選択範囲の終了行（1-indexed）
 * @property endCol - 選択範囲の終了列（1-indexed）
 */
export interface VisualState {
  /** ビジュアルモードがアクティブか */
  active: boolean;

  /** ビジュアルモードの種類（'v'=通常, 'V'=ライン, '\x16'=ブロック） */
  mode: string;

  /** 選択範囲の開始行（1-indexed） */
  startLine: number;

  /** 選択範囲の開始列（1-indexed） */
  startCol: number;

  /** 選択範囲の終了行（1-indexed） */
  endLine: number;

  /** 選択範囲の終了列（1-indexed） */
  endCol: number;
}

/**
 * HandleMotionResult: モーション処理の結果
 *
 * モーション検出処理の戻り値
 *
 * @property shouldTrigger - ヒント表示をトリガーするか
 * @property count - 現在のモーションカウント
 * @property error - エラーメッセージ（エラー時のみ設定）
 */
export interface HandleMotionResult {
  /** ヒント表示をトリガーするか */
  shouldTrigger: boolean;

  /** 現在のモーションカウント */
  count: number;

  /** エラーメッセージ（エラー時のみ設定） */
  error?: string;
}

/**
 * createDefaultMotionState: デフォルトのMotionStateを作成
 *
 * @returns デフォルト値で初期化されたMotionState
 */
export function createDefaultMotionState(): MotionState {
  return {
    lastMotion: "",
    lastMotionTime: 0,
    motionCount: 0,
    timeoutMs: 2000,
    threshold: 2,
  };
}
