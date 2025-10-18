/**
 * Mapping Manager - Phase B-4 TDD Implementation
 * REFACTORフェーズ: マッピング定義の外部化と保守性向上
 *
 * @module mapping-manager
 */

import type { Denops } from "jsr:@denops/std@7.4.0";

/**
 * マッピング設定オプション
 */
export interface MappingSetupOptions {
  /** 既存マッピングを保存・復元するか */
  saveExisting?: boolean;
}

/**
 * マッピング定義
 */
interface MappingDefinition {
  /** マッピングするキー */
  key: string;
  /** マッピングの実装（VimScriptコード） */
  rhs: string;
  /** マッピングオプション（<silent>, <noremap>など） */
  options?: string;
  /** マッピングモード（n, x, vなど） */
  mode?: string;
}

/**
 * マッピングテンプレート定義（REFACTOR: 外部化）
 */
interface MappingTemplate {
  /** denops関数名 */
  function: string;
  /** 引数のテンプレート */
  argsTemplate?: (key: string) => unknown[];
}

/**
 * MappingManager - キーマッピング管理システム
 *
 * モーション検出マッピングとビジュアルモードマッピングを統合管理
 */
export class MappingManager {
  private denops: Denops;
  private activeMappings: Set<string>;
  private savedMappings: Map<string, string>;

  // デフォルトのモーションキー（REFACTOR: 定数として外部化）
  private static readonly DEFAULT_MOTION_KEYS = ["w", "b", "e"];

  // マッピングテンプレート（REFACTOR: 保守性向上）
  private static readonly MAPPING_TEMPLATES = {
    motion: {
      function: "handleMotion",
      argsTemplate: (key: string) => [key],
    },
    visual: {
      function: "showHints",
      argsTemplate: () => [],
    },
  } as const;

  constructor(denops: Denops) {
    this.denops = denops;
    this.activeMappings = new Set<string>();
    this.savedMappings = new Map<string, string>();
  }

  /**
   * モーション検出マッピングを設定
   *
   * @param keys モーションキーのリスト（デフォルト: ['w', 'b', 'e']）
   * @param options マッピング設定オプション
   */
  async setupMotionMappings(
    keys?: string[],
    options: MappingSetupOptions = {},
  ): Promise<void> {
    const motionKeys = keys || MappingManager.DEFAULT_MOTION_KEYS;

    // 既存マッピングを保存
    if (options.saveExisting) {
      for (const key of motionKeys) {
        await this.saveExistingMapping(key, "n");
      }
    }

    // モーションキーごとにマッピングを設定
    for (const key of motionKeys) {
      const mapping: MappingDefinition = {
        key,
        rhs: this.buildMotionMappingRhs(key),
        options: "<silent>",
        mode: "n",
      };

      await this.applyMapping(mapping);
      this.activeMappings.add(key);
    }
  }

  /**
   * ビジュアルモードマッピングを設定
   *
   * @param options マッピング設定オプション
   */
  async setupVisualMappings(
    options: MappingSetupOptions = {},
  ): Promise<void> {
    // ビジュアルモードでのヒント表示マッピング
    const visualKey = "<Leader>h";

    // 既存マッピングを保存
    if (options.saveExisting) {
      await this.saveExistingMapping(visualKey, "x");
    }

    const mapping: MappingDefinition = {
      key: visualKey,
      rhs: this.buildVisualMappingRhs(),
      options: "<silent>",
      mode: "x",
    };

    await this.applyMapping(mapping);
    this.activeMappings.add(visualKey);
  }

  /**
   * アクティブなマッピングのリストを取得
   *
   * @returns アクティブなマッピングキーの配列
   */
  getActiveMappings(): string[] {
    return Array.from(this.activeMappings);
  }

  /**
   * すべてのマッピングをクリーンアップ
   *
   * 保存された元のマッピングを復元
   */
  async cleanup(): Promise<void> {
    // 設定したマッピングを削除
    for (const key of this.activeMappings) {
      const mode = this.detectMode(key);
      await this.denops.cmd(`${mode}unmap ${key}`);
    }

    // 元のマッピングを復元
    for (const [key, originalRhs] of this.savedMappings.entries()) {
      if (originalRhs) {
        const mode = this.detectMode(key);
        await this.denops.cmd(`${mode}noremap ${key} ${originalRhs}`);
      }
    }

    this.activeMappings.clear();
    this.savedMappings.clear();
  }

  /**
   * モーション検出マッピングのRHS（右辺）を構築
   *
   * REFACTOR: テンプレートを使用して共通化
   *
   * @param key モーションキー
   * @returns マッピングの実装コード
   */
  private buildMotionMappingRhs(key: string): string {
    return this.buildMappingRhs(
      MappingManager.MAPPING_TEMPLATES.motion,
      key,
    );
  }

  /**
   * ビジュアルモードマッピングのRHS（右辺）を構築
   *
   * REFACTOR: テンプレートを使用して共通化
   *
   * @returns マッピングの実装コード
   */
  private buildVisualMappingRhs(): string {
    return this.buildMappingRhs(
      MappingManager.MAPPING_TEMPLATES.visual,
      "",
    );
  }

  /**
   * マッピングRHSの共通構築ロジック（REFACTOR: DRY原則）
   *
   * @param template マッピングテンプレート
   * @param key マッピングキー
   * @returns マッピングの実装コード
   */
  private buildMappingRhs(template: MappingTemplate, key: string): string {
    const args = template.argsTemplate ? template.argsTemplate(key) : [];
    const argsStr = JSON.stringify(args);
    return `:<C-u>call denops#notify('hellshake-yano', '${template.function}', ${argsStr})<CR>`;
  }

  /**
   * マッピングを適用
   *
   * @param mapping マッピング定義
   */
  private async applyMapping(mapping: MappingDefinition): Promise<void> {
    const mode = mapping.mode || "n";
    const options = mapping.options || "";
    const cmd = `${mode}noremap ${options} ${mapping.key} ${mapping.rhs}`;
    await this.denops.cmd(cmd);
  }

  /**
   * 既存マッピングを保存
   *
   * @param key マッピングキー
   * @param mode マッピングモード
   */
  private async saveExistingMapping(
    key: string,
    mode: string,
  ): Promise<void> {
    try {
      const existing = (await this.denops.eval(
        `maparg('${key}', '${mode}')`,
      )) as string;
      if (existing) {
        this.savedMappings.set(key, existing);
      }
    } catch (_error) {
      // マッピングが存在しない場合は無視
    }
  }

  /**
   * キーからモードを検出
   *
   * @param key マッピングキー
   * @returns モード（'n' または 'x'）
   */
  private detectMode(key: string): string {
    // <Leader>で始まるキーはビジュアルモード
    if (key.startsWith("<Leader>")) {
      return "x";
    }
    return "n";
  }
}
