/**
 * Config Migrator - Phase B-4
 * 設定マイグレーター: 旧設定から新設定への自動移行
 * GREENフェーズ: テストを通すための最小実装
 */
import type { Denops } from "jsr:@denops/std@7.4.0";
import { ConfigMapper, type VimScriptConfig, type MappedConfig } from "./config-mapper.ts";

/** マイグレーション状態 */
export type MigrationStatus =
  | "migrated"      // 旧設定から新設定へマイグレーション成功
  | "both_exist"    // 両方の設定が存在（新設定を優先）
  | "new_only"      // 新設定のみ存在（マイグレーション不要）
  | "none"          // 設定なし
  | "error";        // エラー発生

/** マイグレーション結果 */
export interface MigrationResult {
  status: MigrationStatus;
  oldConfigExists: boolean;
  newConfigExists: boolean;
  migratedConfig?: MappedConfig;
  warnings: string[];
  error?: string;
}

/**
 * 設定マイグレータークラス
 * 旧設定を検出し、新設定に自動移行する
 */
export class ConfigMigrator {
  private denops: Denops;
  private mapper: ConfigMapper;

  private static readonly OLD_CONFIG_VAR = "g:hellshake_yano_vim_config";
  private static readonly NEW_CONFIG_VAR = "g:hellshake_yano";
  private static readonly BACKUP_CONFIG_VAR = "g:hellshake_yano_vim_config_backup";

  constructor(denops: Denops) {
    this.denops = denops;
    this.mapper = new ConfigMapper();
  }

  /**
   * 設定のマイグレーションを実行
   * @returns マイグレーション結果
   */
  async migrate(): Promise<MigrationResult> {
    const warnings: string[] = [];

    try {
      // 設定の存在確認
      const [oldExists, newExists] = await Promise.all([
        this.checkOldConfigExists(),
        this.checkNewConfigExists(),
      ]);

      // マイグレーション戦略を決定
      const strategy = this.determineStrategy(oldExists, newExists);

      switch (strategy) {
        case "both_exist":
          warnings.push("Both old and new configurations exist. Using new configuration.");
          return this.createResult("both_exist", oldExists, newExists, warnings);

        case "new_only":
          return this.createResult("new_only", oldExists, newExists, warnings);

        case "none":
          return this.createResult("none", oldExists, newExists, warnings);

        case "migrate": {
          // 旧設定のバックアップ作成
          await this.backupOldConfig();

          // マイグレーション実行
          const oldConfig = await this.readOldConfig();
          const migratedConfig = this.mapper.mapFromVimScript(oldConfig);

          // 新設定として設定
          await this.setNewConfig(migratedConfig);

          warnings.push(
            `Configuration migrated successfully from ${ConfigMigrator.OLD_CONFIG_VAR} to ${ConfigMigrator.NEW_CONFIG_VAR}`
          );

          // マイグレーション統計をログ出力
          this.logMigrationStats(oldConfig, migratedConfig);

          return this.createResult("migrated", oldExists, newExists, warnings, migratedConfig);
        }

        default:
          throw new Error(`Unknown migration strategy: ${strategy}`);
      }
    } catch (error) {
      console.error("[ConfigMigrator] Migration failed:", error);
      return this.createResult(
        "error",
        false,
        false,
        warnings,
        undefined,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * 旧設定の存在確認
   * @returns 旧設定が存在する場合true
   */
  async checkOldConfigExists(): Promise<boolean> {
    try {
      const exists = await this.denops.eval(`exists('${ConfigMigrator.OLD_CONFIG_VAR}')`) as number;
      return exists === 1;
    } catch {
      return false;
    }
  }

  /**
   * 新設定の存在確認
   * @returns 新設定が存在する場合true
   */
  async checkNewConfigExists(): Promise<boolean> {
    try {
      const exists = await this.denops.eval(`exists('${ConfigMigrator.NEW_CONFIG_VAR}')`) as number;
      return exists === 1;
    } catch {
      return false;
    }
  }

  /**
   * 旧設定を読み込む
   * @returns 旧設定オブジェクト
   */
  private async readOldConfig(): Promise<VimScriptConfig> {
    const config = await this.denops.eval(ConfigMigrator.OLD_CONFIG_VAR) as VimScriptConfig;
    return config;
  }

  /**
   * 新設定を設定する
   * @param config 設定オブジェクト
   */
  private async setNewConfig(config: MappedConfig): Promise<void> {
    // Vimの辞書形式に変換して設定
    const vimDict = this.toVimDict(config);
    await this.denops.cmd(`let ${ConfigMigrator.NEW_CONFIG_VAR} = ${vimDict}`);
  }

  /**
   * JavaScriptオブジェクトをVim辞書形式の文字列に変換
   * @param obj 変換するオブジェクト
   * @returns Vim辞書形式の文字列
   */
  private toVimDict(obj: MappedConfig): string {
    const entries: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const vimValue = this.toVimValue(value);
      entries.push(`'${key}': ${vimValue}`);
    }

    return `{${entries.join(", ")}}`;
  }

  /**
   * 値をVim形式に変換
   * @param value 変換する値
   * @returns Vim形式の文字列
   */
  private toVimValue(value: any): string {
    if (Array.isArray(value)) {
      const items = value.map(v => this.toVimValue(v));
      return `[${items.join(", ")}]`;
    }
    
    if (typeof value === "string") {
      // シングルクォートのエスケープ
      const escaped = value.replace(/'/g, "''");
      return `'${escaped}'`;
    }
    
    if (typeof value === "boolean") {
      return value ? "1" : "0";
    }
    
    if (value === null || value === undefined) {
      return "v:null";
    }
    
    // 数値など
    return String(value);
  }

  /**
   * 旧設定のバックアップを作成
   */
  async backupOldConfig(): Promise<void> {
    try {
      const oldConfig = await this.readOldConfig();
      const backupVimDict = this.toVimDict(oldConfig as unknown as MappedConfig);
      await this.denops.cmd(`let ${ConfigMigrator.BACKUP_CONFIG_VAR} = ${backupVimDict}`);
      console.log("[ConfigMigrator] Old configuration backed up successfully");
    } catch (error) {
      // バックアップ失敗はログのみ（マイグレーションは継続）
      console.error("[ConfigMigrator] Failed to backup old config:", error);
    }
  }

  /**
   * マイグレーション戦略を決定
   * @param oldExists 旧設定の存在
   * @param newExists 新設定の存在
   * @returns 実行すべき戦略
   */
  private determineStrategy(oldExists: boolean, newExists: boolean): string {
    if (oldExists && newExists) return "both_exist";
    if (!oldExists && newExists) return "new_only";
    if (!oldExists && !newExists) return "none";
    return "migrate"; // oldExists && !newExists
  }

  /**
   * マイグレーション結果を作成
   */
  private createResult(
    status: MigrationStatus,
    oldConfigExists: boolean,
    newConfigExists: boolean,
    warnings: string[],
    migratedConfig?: MappedConfig,
    error?: string
  ): MigrationResult {
    return {
      status,
      oldConfigExists,
      newConfigExists,
      warnings,
      migratedConfig,
      error,
    };
  }

  /**
   * マイグレーション統計をログ出力
   */
  private logMigrationStats(oldConfig: VimScriptConfig, migratedConfig: MappedConfig): void {
    const stats = this.mapper.getMappingStatistics(oldConfig);
    console.log("[ConfigMigrator] Migration Statistics:");
    console.log(`  - Total keys: ${stats.totalKeys}`);
    console.log(`  - Mapped keys: ${stats.mappedKeys}`);
    if (stats.ignoredKeys.length > 0) {
      console.log(`  - Ignored keys: ${stats.ignoredKeys.join(", ")}`);
    }
  }
}