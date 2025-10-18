/**
 * denops/hellshake-yano/phase-b1/config-migrator.ts
 *
 * ConfigMigrator - 設定の自動マイグレーション
 *
 * 目的:
 *   - 既存のVimScript設定を自動検出
 *   - 統合設定への移行を支援
 *   - 警告メッセージの表示
 *
 * Process: phase-b1, sub3.2
 */

import type { Denops } from "@denops/std";

/**
 * ConfigMigratorクラス
 *
 * 既存設定の検出とマイグレーション支援
 */
export class ConfigMigrator {
  constructor(private denops: Denops) {}

  /**
   * VimScript設定が存在するか検出
   *
   * @returns VimScript設定が存在する場合true
   */
  async detectVimScriptConfig(): Promise<boolean> {
    const exists = await this.denops.call(
      "exists",
      "g:hellshake_yano_vim_config",
    ) as number;

    return exists === 1;
  }

  /**
   * マイグレーションが必要かチェック
   *
   * @returns マイグレーションが必要な場合true
   */
  async needsMigration(): Promise<boolean> {
    // VimScript設定が存在するか確認
    const hasVimScriptConfig = await this.detectVimScriptConfig();

    // Denops設定が存在するか確認
    const hasDenopsConfig = await this.denops.call(
      "exists",
      "g:hellshake_yano",
    ) as number;

    // VimScript設定のみ存在する場合、マイグレーションが必要
    return hasVimScriptConfig && hasDenopsConfig === 0;
  }

  /**
   * VimScript設定を取得
   *
   * @returns VimScript設定オブジェクト
   */
  async getVimScriptConfig(): Promise<Record<string, unknown>> {
    const exists = await this.detectVimScriptConfig();

    if (!exists) {
      return {};
    }

    const config = await this.denops.eval(
      "g:hellshake_yano_vim_config",
    ) as Record<string, unknown>;

    return config;
  }

  /**
   * マイグレーション警告を表示
   */
  async showMigrationWarning(): Promise<void> {
    await this.denops.cmd("echohl WarningMsg");
    await this.denops.cmd(
      'echo "[hellshake-yano] VimScript設定が検出されました"',
    );
    await this.denops.cmd(
      'echo "  統合設定 (g:hellshake_yano) への移行を推奨します"',
    );
    await this.denops.cmd("echohl None");
  }

  /**
   * マイグレーションガイドを表示
   */
  async showMigrationGuide(): Promise<void> {
    await this.denops.cmd("echohl Title");
    await this.denops.cmd('echo "=== hellshake-yano 設定マイグレーションガイド ==="');
    await this.denops.cmd("echohl None");
    await this.denops.cmd('echo ""');
    await this.denops.cmd('echo "旧設定 (g:hellshake_yano_vim_config) が検出されました。"');
    await this.denops.cmd('echo "以下の手順で新しい統合設定に移行してください："');
    await this.denops.cmd('echo ""');
    await this.denops.cmd('echo "1. g:hellshake_yano_vim_config を削除"');
    await this.denops.cmd('echo "2. g:hellshake_yano を使用して設定"');
    await this.denops.cmd('echo ""');
    await this.denops.cmd('echo "例："');
    await this.denops.cmd('echo "  let g:hellshake_yano = {}"');
    await this.denops.cmd("echo \"  let g:hellshake_yano.markers = ['A', 'S', 'D', 'F']\"");
    await this.denops.cmd('echo ""');
  }
}
