/**
 * Environment Detector - Phase B-4
 * 環境判定モジュール: Denopsの利用可能性とエディタ情報を検出
 * GREENフェーズ: テストを通すための最小実装
 */
import type { Denops } from "jsr:@denops/std@7.4.0";

/** Denopsの利用可能性情報 */
export interface DenopsAvailability {
  available: boolean;
  running: boolean;
  version?: string;
}

/** エディタ情報 */
export interface EditorInfo {
  type: "vim" | "neovim";
  version: string;
  hasNvim: boolean;
}

/** 環境詳細情報 */
export interface EnvironmentDetails {
  denops: DenopsAvailability;
  editor: EditorInfo;
}

/**
 * 環境判定クラス
 * Denopsの状態とエディタの種類を判定
 */
export class EnvironmentDetector {
  private denops: Denops;
  private cachedDetails?: EnvironmentDetails;

  constructor(denops: Denops) {
    this.denops = denops;
  }

  /**
   * Denopsの利用可能性をチェック
   * @returns Denopsの状態情報
   */
  async isDenopsAvailable(): Promise<DenopsAvailability> {
    try {
      // g:loaded_denopsの存在確認
      const loaded = await this.denops.eval("exists('g:loaded_denops')") as number;

      if (loaded === 0) {
        return {
          available: false,
          running: false,
          version: undefined,
        };
      }

      // Denopsサーバーのステータス確認
      let running = false;
      try {
        const status = await this.denops.eval("denops#server#status()") as string;
        running = status === "running";
      } catch {
        // denops#server#status()が存在しない場合は実行中とみなす
        running = true;
      }

      // バージョン取得（実際のDenopsバージョン）
      let version: string | undefined;
      try {
        // Denopsプラグインのバージョンを取得
        const denopsVersion = await this.denops.eval("get(g:, 'denops_version', '')") as string;
        version = denopsVersion || "7.4.0"; // デフォルト値
      } catch {
        version = "7.4.0"; // フォールバック
      }

      return {
        available: true,
        running,
        version,
      };
    } catch (error) {
      // エラーが発生した場合は利用不可と判定
      console.error("[EnvironmentDetector] Failed to check Denops availability:", error);
      return {
        available: false,
        running: false,
        version: undefined,
      };
    }
  }

  /**
   * エディタ情報を取得
   * @returns エディタの種類とバージョン
   */
  async getEditorInfo(): Promise<EditorInfo> {
    try {
      // Neovimかどうかを判定
      const hasNvim = await this.denops.eval("has('nvim')") as number;
      const isNeovim = hasNvim === 1;

      // バージョン番号を取得
      const versionNum = await this.denops.eval("v:version") as number;

      // バージョン文字列を生成
      let version: string;
      if (isNeovim) {
        // Neovimの場合、nvim_versionからより正確なバージョンを取得
        try {
          const nvimVersion = await this.denops.eval("nvim_get_current_buf") as any; // 存在チェック
          const versionInfo = await this.denops.eval("api_info().version") as any;
          
          if (versionInfo && versionInfo.major !== undefined) {
            version = `${versionInfo.major}.${versionInfo.minor}.${versionInfo.patch || 0}`;
          } else {
            // フォールバック: v:versionから推定
            const major = Math.floor(versionNum / 10000);
            const minor = Math.floor((versionNum % 10000) / 100);
            const patch = versionNum % 100;
            version = `${major}.${minor}.${patch}`;
          }
        } catch {
          // エラー時のフォールバック
          version = "0.8.0";
        }
      } else {
        // Vimの場合
        const major = Math.floor(versionNum / 100);
        const minor = versionNum % 100;
        version = `${major}.${minor}`;
      }

      return {
        type: isNeovim ? "neovim" : "vim",
        version,
        hasNvim: isNeovim,
      };
    } catch (error) {
      // エラー時のデフォルト値
      console.error("[EnvironmentDetector] Failed to get editor info:", error);
      return {
        type: "vim",
        version: "8.0",
        hasNvim: false,
      };
    }
  }

  /**
   * 環境の詳細情報を取得（キャッシュ機能付き）
   * @returns 環境の完全な情報
   */
  async getEnvironmentDetails(): Promise<EnvironmentDetails> {
    // キャッシュが存在する場合はそれを返す
    if (this.cachedDetails) {
      return this.cachedDetails;
    }

    // 新しく情報を取得（並列実行で高速化）
    const [denops, editor] = await Promise.all([
      this.isDenopsAvailable(),
      this.getEditorInfo(),
    ]);

    // キャッシュに保存
    this.cachedDetails = {
      denops,
      editor,
    };

    return this.cachedDetails;
  }

  /**
   * キャッシュをクリア
   * 環境が変更された可能性がある場合に使用
   */
  clearCache(): void {
    this.cachedDetails = undefined;
  }

  /**
   * 実装選択のための判定ヘルパー
   * @returns Denops実装を使用すべきかどうか
   */
  async shouldUseDenopsImplementation(): Promise<boolean> {
    const details = await this.getEnvironmentDetails();
    return details.denops.available && details.denops.running;
  }
}