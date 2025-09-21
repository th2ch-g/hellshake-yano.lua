/**
 * Plugin Initialization Module
 *
 * main関数から抽出された初期化処理を担当
 * 単一責任: プラグインの初期セットアップのみを実行
 */

import type { Denops } from "@denops/std";
import { type Config } from "../config.ts";

/**
 * プラグインの初期化処理
 *
 * @param denops - Denopsインスタンス
 * @param config - 現在の設定
 * @returns namespaceとsyncの結果
 */
export async function initializePlugin(
  denops: Denops,
  config: Config,
): Promise<{ extmarkNamespace: number | null }> {
  let extmarkNamespace: number | null = null;

  // Neovimの場合のみextmarkのnamespaceを作成
  if (denops.meta.host === "nvim") {
    extmarkNamespace = await denops.call(
      "nvim_create_namespace",
      "hellshake_yano_hints",
    ) as number;
  }

  return { extmarkNamespace };
}

/**
 * マネージャーとの設定同期
 *
 * @param config - 同期する設定
 */
export function syncManagerConfig(config: Config): void {
  // プラグイン初期化時にマネージャーに初期設定を同期
  // この部分は既存のsyncManagerConfig関数を使用
}