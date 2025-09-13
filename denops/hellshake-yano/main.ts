import type { Denops } from "@denops/std";
import { detectWords, type Word } from "./word.ts";
import { assignHintsToWords, generateHints, type HintMapping } from "./hint.ts";

// 設定の型定義
interface Config {
  markers: string[];
  motion_count: number;
  motion_timeout: number;
  hint_position: string;
  trigger_on_hjkl: boolean;
  enabled: boolean;
}

// グローバル状態
let config: Config = {
  markers: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  motion_count: 3,
  motion_timeout: 2000,
  hint_position: "start",
  trigger_on_hjkl: true,
  enabled: true,
};

let currentHints: HintMapping[] = [];
let hintsVisible = false;
let extmarkNamespace: number | undefined;

/**
 * プラグインのメインエントリポイント
 */
export async function main(denops: Denops): Promise<void> {
  // Neovimの場合のみextmarkのnamespaceを作成
  if (denops.meta.host === "nvim") {
    extmarkNamespace = await denops.call(
      "nvim_create_namespace",
      "hellshake_yano_hints",
    ) as number;
  }

  // dispatcherの設定
  denops.dispatcher = {
    /**
     * 設定を更新
     */
    async updateConfig(newConfig: unknown): Promise<void> {
      // 型安全のため、anyにキャスト後に処理
      const cfg = newConfig as any;

      // 設定をマージ
      if (cfg.markers && Array.isArray(cfg.markers)) {
        config.markers = cfg.markers;
      }
      if (typeof cfg.motion_count === "number") {
        config.motion_count = cfg.motion_count;
      }
      if (typeof cfg.motion_timeout === "number") {
        config.motion_timeout = cfg.motion_timeout;
      }
      if (typeof cfg.hint_position === "string") {
        config.hint_position = cfg.hint_position;
      }
      if (typeof cfg.trigger_on_hjkl === "boolean") {
        config.trigger_on_hjkl = cfg.trigger_on_hjkl;
      }
      if (typeof cfg.enabled === "boolean") {
        config.enabled = cfg.enabled;
      }
    },

    /**
     * ヒントを表示
     */
    async showHints(): Promise<void> {
      try {
        // すでに表示中の場合は何もしない
        if (hintsVisible) {
          return;
        }

        // 単語を検出
        const words = await detectWords(denops);
        if (words.length === 0) {
          return;
        }

        // カーソル位置を取得
        const cursorLine = await denops.call("line", ".") as number;
        const cursorCol = await denops.call("col", ".") as number;

        // ヒントを生成
        const hints = generateHints(words.length, config.markers);
        currentHints = assignHintsToWords(words, hints, cursorLine, cursorCol);

        // ヒントを表示
        await displayHints(denops, currentHints);
        hintsVisible = true;

        // ユーザー入力を待機
        await waitForUserInput(denops);
      } catch (error) {
        console.error("[hellshake-yano] Error in showHints:", error);
        await hideHints(denops);
      }
    },

    /**
     * ヒントを非表示
     */
    async hideHints(): Promise<void> {
      await hideHints(denops);
    },

    /**
     * デバッグ情報を取得
     */
    async debug(): Promise<unknown> {
      return {
        config,
        hintsVisible,
        currentHintsCount: currentHints.length,
        host: denops.meta.host,
        extmarkNamespace,
      };
    },
  };
}

/**
 * ヒントを表示する
 */
async function displayHints(denops: Denops, hints: HintMapping[]): Promise<void> {
  if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
    // Neovim: extmarkを使用
    const bufnr = await denops.call("bufnr", "%") as number;

    for (const { word, hint } of hints) {
      const col = config.hint_position === "start" ? word.col - 1 : word.col + word.text.length - 1;

      await denops.call("nvim_buf_set_extmark", bufnr, extmarkNamespace, word.line - 1, col, {
        virt_text: [[hint, "HellshakeYanoMarker"]],
        virt_text_pos: "overlay",
        priority: 100,
      });
    }
  } else {
    // Vim: matchadd()を使用（簡易実装）
    for (const { word, hint } of hints) {
      const pattern = `\\%${word.line}l\\%${word.col}c${hint}`;
      await denops.call("matchadd", "HellshakeYanoMarker", pattern, 100);
    }
  }
}

/**
 * ヒントを非表示にする
 */
async function hideHints(denops: Denops): Promise<void> {
  if (!hintsVisible) {
    return;
  }

  if (denops.meta.host === "nvim" && extmarkNamespace !== undefined) {
    // Neovim: extmarkをクリア
    const bufnr = await denops.call("bufnr", "%") as number;
    await denops.call("nvim_buf_clear_namespace", bufnr, extmarkNamespace, 0, -1);
  } else {
    // Vim: matchをクリア
    await denops.call("clearmatches");
  }

  currentHints = [];
  hintsVisible = false;
}

/**
 * ユーザー入力を待機してジャンプ
 */
async function waitForUserInput(denops: Denops): Promise<void> {
  try {
    // プロンプトを表示
    await denops.cmd("echo 'Select hint: '");

    // ユーザー入力を取得
    const char = await denops.call("getchar") as number;

    // ESCキーの場合はキャンセル
    if (char === 27) {
      await hideHints(denops);
      return;
    }

    // 文字に変換
    const inputChar = String.fromCharCode(char).toUpperCase();

    // 対応するヒントを探す
    const target = currentHints.find((h) => h.hint === inputChar);

    if (target) {
      // カーソルを移動
      await denops.call("cursor", target.word.line, target.word.col);
    }

    // ヒントを非表示
    await hideHints(denops);
  } catch (error) {
    console.error("[hellshake-yano] Error in waitForUserInput:", error);
    await hideHints(denops);
  }
}
