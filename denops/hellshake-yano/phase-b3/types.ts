/**
 * denops/hellshake-yano/phase-b3/types.ts
 *
 * Phase B-3 モジュール共通の型定義
 *
 * UnifiedJapaneseSupportImpl, UnifiedMotionDetector, UnifiedVisualMode
 * の各モジュールで使用される型を集約
 *
 * VimScript版のデータ構造との対応:
 * - s:motion_state (MotionState) ↔ VimScript motion.vim
 * - s:visual_state (VisualState) ↔ VimScript visual.vim
 * - Config構造 ↔ VimScript設定オブジェクト
 */

/**
 * MotionState: モーション検出の内部状態
 *
 * VimScript版: hellshake_yano_vim#motion#s:motion_state
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
 * UnifiedJapaneseSupportConfig: 日本語対応の設定
 *
 * VimScript版: hellshake_yano_vim#config#japanese_config
 */
export interface UnifiedJapaneseSupportConfig {
  /** 日本語対応を有効にするか */
  useJapanese?: boolean;

  /** TinySegmenterを使用するか */
  enableTinySegmenter?: boolean;

  /** 日本語単語の最小文字数 */
  japaneseMinWordLength?: number;

  /** 助詞を結合するか（例: 「私は」→「私」「は」ではなく「私は」） */
  japaneseMergeParticles?: boolean;
}

/**
 * HandleMotionResult: モーション処理の結果
 *
 * モーション検出処理の戻り値
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
 * CacheStats: キャッシュ統計情報
 *
 * TinySegmenterのキャッシュ状態を取得
 */
export interface CacheStats {
  /** 現在のキャッシュサイズ */
  size: number;

  /** キャッシュの最大サイズ */
  maxSize: number;

  /** キャッシュヒット率（0.0～1.0） */
  hitRate: number;
}

/**
 * SegmentResult: セグメント化処理の結果
 *
 * TinySegmenterの処理結果
 */
export interface SegmentResult {
  /** 処理が成功したか */
  success: boolean;

  /** セグメント化されたテキスト */
  segments: string[];

  /** エラーメッセージ（失敗時のみ設定） */
  error?: string;
}

/**
 * MotionThreshold: キー別の閾値設定
 *
 * 各モーションキーに対する独立した閾値
 */
export interface MotionThreshold {
  [key: string]: number;
}

/**
 * SystemConfig: システム全体の設定
 *
 * 複数モジュールにまたがる統合設定
 */
export interface SystemConfig {
  // 日本語対応の設定
  japanese: UnifiedJapaneseSupportConfig;

  // モーション検出の設定
  motion: {
    timeoutMs: number;
    threshold: number;
    perKeyThreshold?: MotionThreshold;
  };

  // ビジュアルモードの設定
  visual: {
    enabled: boolean;
  };

  // ログ設定
  logging: {
    enabled: boolean;
    level: "debug" | "info" | "warn" | "error";
  };
}

/**
 * DenopsWord: Denopsプラグインで使用される単語型
 *
 * phase-b2/vimscript-types.ts から継承
 * ヒント表示の対象となる単語を表現
 */
export interface DenopsWord {
  /** 単語のテキスト */
  text: string;

  /** 行番号（1-indexed） */
  line: number;

  /** 列番号（1-indexed） */
  col: number;
}

/**
 * ProcessingResult: 処理結果の統一フォーマット
 *
 * @template T 処理の戻り値型
 */
export interface ProcessingResult<T> {
  /** 処理が成功したか */
  success: boolean;

  /** 処理の結果データ */
  data?: T;

  /** エラーメッセージ */
  error?: string;

  /** 処理時間（ミリ秒） */
  duration?: number;
}

/**
 * DebugInfo: デバッグ情報
 *
 * 各モジュールの内部状態をデバッグ用に出力
 */
export interface DebugInfo {
  /** モジュール名 */
  module: string;

  /** 処理の種類 */
  operation: string;

  /** 現在の状態 */
  state: Record<string, unknown>;

  /** 処理時間（ミリ秒） */
  duration: number;

  /** 処理結果 */
  result: unknown;

  /** エラー情報（発生時） */
  error?: string;
}
