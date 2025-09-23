/**
 * Dictionary Loader Implementation
 * TDD Green Phase Stage 1: User-defined dictionary functionality
 * Following PLAN.md process4 sub1.5
 */

import { join, dirname, resolve } from "https://deno.land/std@0.212.0/path/mod.ts";
import { exists } from "https://deno.land/std@0.212.0/fs/mod.ts";
import { parse as parseYaml } from "https://deno.land/std@0.212.0/yaml/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.0.1/mod.ts";
import { WordDictionaryImpl, type DictionaryConfig } from "./dictionary.ts";

/**
 * ユーザー定義辞書のインターフェース
 */
export interface UserDictionary {
  customWords: string[];
  preserveWords: string[];
  mergeRules: Map<string, MergeStrategy>;
  compoundPatterns: RegExp[];
  hintPatterns?: HintPattern[];
  metadata?: {
    version?: string;
    author?: string;
    description?: string;
  };
}

/**
 * ヒントパターンの定義
 */
export interface HintPattern {
  pattern: string | RegExp;
  hintPosition: HintPositionRule;
  priority: number;
  description?: string;
}

/**
 * ヒント位置ルール
 */
export type HintPositionRule =
  | 'capture:1' | 'capture:2' | 'capture:3'
  | 'start' | 'end'
  | { offset: number; from: 'start' | 'end' };

/**
 * マージ戦略
 */
export type MergeStrategy = 'always' | 'never' | 'context';

/**
 * 辞書設定インターフェース
 */
export interface DictionaryLoaderConfig {
  dictionaryPath?: string;
  projectDictionaryPath?: string;
  useBuiltinDict?: boolean;
  mergingStrategy?: 'override' | 'merge';
  autoReload?: boolean;
}

/**
 * 辞書ファイルローダークラス
 */
export class DictionaryLoader {
  private readonly searchPaths = [
    '.hellshake-yano/dictionary.json',
    'hellshake-yano.dict.json',
    '~/.config/hellshake-yano/dictionary.json'
  ];

  constructor(private config: DictionaryLoaderConfig = {}) {}

  /**
   * ユーザー定義辞書を読み込む
   */
  async loadUserDictionary(config?: DictionaryLoaderConfig): Promise<UserDictionary> {
    const resolvedConfig = { ...this.config, ...config };

    // 辞書ファイルの探索と読み込み
    for (const searchPath of this.searchPaths) {
      try {
        const resolvedPath = this.resolvePath(searchPath);
        if (await exists(resolvedPath)) {
          const content = await Deno.readTextFile(resolvedPath);
          return await this.parseDictionaryContent(content, resolvedPath);
        }
      } catch (error) {
        console.warn(`Failed to load dictionary from ${searchPath}:`, error);
      }
    }

    // 設定で指定されたパスを試行
    if (resolvedConfig.dictionaryPath) {
      try {
        const content = await Deno.readTextFile(resolvedConfig.dictionaryPath);
        return await this.parseDictionaryContent(content, resolvedConfig.dictionaryPath);
      } catch (error) {
        console.warn(`Failed to load dictionary from ${resolvedConfig.dictionaryPath}:`, error);
      }
    }

    // デフォルト辞書を返す
    return this.createEmptyDictionary();
  }

  /**
   * 辞書コンテンツをパース
   */
  private async parseDictionaryContent(content: string, filepath: string): Promise<UserDictionary> {
    const ext = this.getFileExtension(filepath);

    switch (ext) {
      case '.json':
        return this.parseJsonDictionary(content);
      case '.yaml':
      case '.yml':
        return this.parseYamlDictionary(content);
      case '.txt':
        return this.parseTextDictionary(content);
      default:
        // JSON形式として試行
        try {
          return this.parseJsonDictionary(content);
        } catch {
          return this.parseTextDictionary(content);
        }
    }
  }

  /**
   * JSON形式の辞書をパース
   */
  private parseJsonDictionary(content: string): UserDictionary {
    const data = JSON.parse(content);
    return this.convertToUserDictionary(data);
  }

  /**
   * YAML形式の辞書をパース
   */
  private parseYamlDictionary(content: string): UserDictionary {
    const data = parseYaml(content) as any;
    return this.convertToUserDictionary(data);
  }

  /**
   * テキスト形式の辞書をパース
   */
  private parseTextDictionary(content: string): UserDictionary {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
    const dictionary = this.createEmptyDictionary();

    for (const line of lines) {
      if (line.startsWith('!')) {
        // 分割禁止ワード
        dictionary.preserveWords.push(line.slice(1));
      } else if (line.includes('=')) {
        // 結合ルール
        const [key, value] = line.split('=', 2);
        dictionary.mergeRules.set(key.trim(), value.trim() as MergeStrategy);
      } else if (line.startsWith('@')) {
        // ヒントパターン
        const [priority, pattern, position] = line.slice(1).split(':', 3);
        if (priority && pattern && position) {
          dictionary.hintPatterns = dictionary.hintPatterns || [];
          dictionary.hintPatterns.push({
            pattern: new RegExp(pattern),
            hintPosition: position as HintPositionRule,
            priority: parseInt(priority, 10) || 0,
          });
        }
      } else {
        // カスタム単語
        dictionary.customWords.push(line);
      }
    }

    return dictionary;
  }

  /**
   * データオブジェクトをUserDictionaryに変換
   */
  private convertToUserDictionary(data: any): UserDictionary {
    const dictionary = this.createEmptyDictionary();

    if (data.customWords && Array.isArray(data.customWords)) {
      dictionary.customWords = data.customWords;
    }

    if (data.preserveWords && Array.isArray(data.preserveWords)) {
      dictionary.preserveWords = data.preserveWords;
    }

    if (data.mergeRules && typeof data.mergeRules === 'object') {
      dictionary.mergeRules = new Map(Object.entries(data.mergeRules));
    }

    if (data.compoundPatterns && Array.isArray(data.compoundPatterns)) {
      dictionary.compoundPatterns = data.compoundPatterns.map((pattern: string) => new RegExp(pattern, 'g'));
    }

    if (data.hintPatterns && Array.isArray(data.hintPatterns)) {
      dictionary.hintPatterns = data.hintPatterns.map((pattern: any) => ({
        pattern: typeof pattern.pattern === 'string' ? new RegExp(pattern.pattern) : pattern.pattern,
        hintPosition: pattern.hintPosition,
        priority: pattern.priority || 0,
        description: pattern.description,
      }));
    }

    if (data.metadata) {
      dictionary.metadata = data.metadata;
    }

    return dictionary;
  }

  /**
   * 空の辞書を作成
   */
  private createEmptyDictionary(): UserDictionary {
    return {
      customWords: [],
      preserveWords: [],
      mergeRules: new Map(),
      compoundPatterns: [],
      hintPatterns: [],
      metadata: {},
    };
  }

  /**
   * パスを解決
   */
  private resolvePath(path: string): string {
    if (path.startsWith('~')) {
      const home = Deno.env.get('HOME') || Deno.env.get('USERPROFILE') || '/tmp';
      return resolve(home, path.slice(2));
    }
    return resolve(path);
  }

  /**
   * ファイル拡張子を取得
   */
  private getFileExtension(filepath: string): string {
    return filepath.toLowerCase().split('.').pop() || '';
  }
}

/**
 * 辞書マージャークラス
 */
export class DictionaryMerger {
  /**
   * 辞書をマージ
   */
  merge(
    base: WordDictionaryImpl,
    user: UserDictionary,
    strategy: 'override' | 'merge' = 'merge'
  ): WordDictionaryImpl {
    const merged = new WordDictionaryImpl();

    if (strategy === 'override') {
      // ユーザー辞書で上書き
      this.mergeWithOverride(merged, base, user);
    } else {
      // マージ戦略
      this.mergeWithMerge(merged, base, user);
    }

    return merged;
  }

  /**
   * 上書き戦略でマージ
   */
  private mergeWithOverride(target: WordDictionaryImpl, base: WordDictionaryImpl, user: UserDictionary): void {
    // ユーザー定義を優先
    for (const word of user.customWords) {
      target.addCustomWord(word);
    }
    for (const word of user.preserveWords) {
      target.addPreserveWord(word);
    }
    for (const pattern of user.compoundPatterns) {
      target.addCompoundPattern(pattern);
    }

    // ベースで補完
    for (const word of base.customWords) {
      if (!target.hasCustomWord(word)) {
        target.addCustomWord(word);
      }
    }
  }

  /**
   * マージ戦略でマージ
   */
  private mergeWithMerge(target: WordDictionaryImpl, base: WordDictionaryImpl, user: UserDictionary): void {
    // ベースをコピー
    for (const word of base.customWords) {
      target.addCustomWord(word);
    }
    for (const word of base.preserveWords) {
      target.addPreserveWord(word);
    }
    for (const pattern of base.compoundPatterns) {
      target.addCompoundPattern(pattern);
    }

    // ユーザー定義を追加
    for (const word of user.customWords) {
      target.addCustomWord(word);
    }
    for (const word of user.preserveWords) {
      target.addPreserveWord(word);
    }
    for (const pattern of user.compoundPatterns) {
      target.addCompoundPattern(pattern);
    }
  }
}

/**
 * Vim設定ブリッジクラス
 */
export class VimConfigBridge {
  /**
   * Vim設定を取得
   */
  async getConfig(denops: Denops): Promise<DictionaryLoaderConfig> {
    try {
      const config: DictionaryLoaderConfig = {};

      // 各設定値を取得
      config.dictionaryPath = await denops.eval('get(g:, "hellshake_yano_dictionary_path", "")') as string || undefined;
      config.useBuiltinDict = await denops.eval('get(g:, "hellshake_yano_use_builtin_dict", 1)') as boolean;
      config.mergingStrategy = await denops.eval('get(g:, "hellshake_yano_dictionary_merge", "merge")') as 'override' | 'merge';
      config.autoReload = await denops.eval('get(g:, "hellshake_yano_auto_reload_dict", 0)') as boolean;

      return config;
    } catch (error) {
      console.warn('Failed to get Vim config:', error);
      return {};
    }
  }

  /**
   * エラーを通知
   */
  async notifyError(denops: Denops, error: string): Promise<void> {
    try {
      await denops.cmd(`echohl ErrorMsg | echo '${error}' | echohl None`);
    } catch (e) {
      console.error('Failed to notify error:', e);
    }
  }

  /**
   * 辞書を再読み込み
   */
  async reloadDictionary(denops: Denops): Promise<void> {
    try {
      await denops.call('hellshake_yano#reload_dictionary');
    } catch (error) {
      console.warn('Failed to reload dictionary:', error);
    }
  }
}

/**
 * 辞書管理コマンド
 */
export async function registerDictionaryCommands(denops: Denops) {
  await denops.cmd('command! HellshakeYanoReloadDict call denops#request("hellshake-yano", "reloadDictionary", [])');
  await denops.cmd('command! HellshakeYanoEditDict call denops#request("hellshake-yano", "editDictionary", [])');
  await denops.cmd('command! HellshakeYanoShowDict call denops#request("hellshake-yano", "showDictionary", [])');
  await denops.cmd('command! HellshakeYanoValidateDict call denops#request("hellshake-yano", "validateDictionary", [])');
}

/**
 * 辞書管理機能
 */
export class DictionaryManager {
  private loader: DictionaryLoader;
  private merger: DictionaryMerger;
  private bridge: VimConfigBridge;

  constructor() {
    this.loader = new DictionaryLoader();
    this.merger = new DictionaryMerger();
    this.bridge = new VimConfigBridge();
  }

  /**
   * 辞書を再読み込み
   */
  async reloadDictionary(denops: Denops): Promise<void> {
    try {
      const config = await this.bridge.getConfig(denops);
      const userDict = await this.loader.loadUserDictionary(config);

      await denops.cmd('echo "Dictionary reloaded successfully"');
    } catch (error) {
      await this.bridge.notifyError(denops, `Failed to reload dictionary: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 辞書ファイルを編集
   */
  async editDictionary(denops: Denops): Promise<void> {
    try {
      const config = await this.bridge.getConfig(denops);
      const dictPath = config.dictionaryPath || '~/.config/hellshake-yano/dictionary.json';

      await denops.cmd(`edit ${dictPath}`);
    } catch (error) {
      await this.bridge.notifyError(denops, `Failed to open dictionary: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 辞書の内容を表示
   */
  async showDictionary(denops: Denops): Promise<void> {
    try {
      const config = await this.bridge.getConfig(denops);
      const userDict = await this.loader.loadUserDictionary(config);

      const info = [
        'Dictionary Information:',
        `Custom Words: ${userDict.customWords.length}`,
        `Preserve Words: ${userDict.preserveWords.length}`,
        `Merge Rules: ${userDict.mergeRules.size}`,
        `Compound Patterns: ${userDict.compoundPatterns.length}`,
        `Hint Patterns: ${userDict.hintPatterns?.length || 0}`,
      ];

      for (const line of info) {
        await denops.cmd(`echo "${line}"`);
      }
    } catch (error) {
      await this.bridge.notifyError(denops, `Failed to show dictionary: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 辞書を検証
   */
  async validateDictionary(denops: Denops): Promise<void> {
    try {
      const config = await this.bridge.getConfig(denops);
      const userDict = await this.loader.loadUserDictionary(config);

      const errors: string[] = [];

      // 基本的な検証
      if (userDict.customWords.some(word => word.trim() === '')) {
        errors.push('Empty custom words found');
      }

      if (userDict.hintPatterns) {
        for (const pattern of userDict.hintPatterns) {
          try {
            new RegExp(pattern.pattern as string);
          } catch {
            errors.push(`Invalid regex pattern: ${pattern.pattern}`);
          }
        }
      }

      if (errors.length === 0) {
        await denops.cmd('echo "Dictionary validation passed"');
      } else {
        await this.bridge.notifyError(denops, `Validation errors: ${errors.join(', ')}`);
      }
    } catch (error) {
      await this.bridge.notifyError(denops, `Failed to validate dictionary: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * ヒントパターンプロセッサークラス
 */
export class HintPatternProcessor {
  /**
   * ヒントパターンを適用
   */
  applyHintPatterns(words: any[], text: string, patterns: HintPattern[]): any[] {
    if (!patterns || patterns.length === 0) {
      return words;
    }

    const enhancedWords = [...words];

    // 優先度でソート
    const sortedPatterns = patterns.sort((a, b) => b.priority - a.priority);

    for (const pattern of sortedPatterns) {
      const regex = typeof pattern.pattern === 'string' ? new RegExp(pattern.pattern, 'g') : pattern.pattern;
      let match;

      while ((match = regex.exec(text)) !== null) {
        const hintTarget = this.extractHintTarget(match, pattern.hintPosition);
        if (hintTarget) {
          const targetWord = this.findWordAtPosition(enhancedWords, hintTarget.position);
          if (targetWord) {
            // ヒント優先度を設定
            (targetWord as any).hintPriority = pattern.priority;
          }
        }
      }
    }

    return this.sortByHintPriority(enhancedWords);
  }

  /**
   * ヒントターゲットを抽出
   */
  private extractHintTarget(
    match: RegExpExecArray,
    rule: HintPositionRule
  ): { text: string; position: number } | null {
    if (typeof rule === 'string') {
      if (rule.startsWith('capture:')) {
        const captureIndex = parseInt(rule.split(':')[1], 10);
        if (match[captureIndex]) {
          return {
            text: match[captureIndex],
            position: match.index! + match[0].indexOf(match[captureIndex]),
          };
        }
      } else if (rule === 'start') {
        return { text: match[0], position: match.index! };
      } else if (rule === 'end') {
        return { text: match[0], position: match.index! + match[0].length - 1 };
      }
    } else if (typeof rule === 'object' && 'offset' in rule) {
      const basePosition = rule.from === 'start' ? match.index! : match.index! + match[0].length;
      return { text: match[0], position: basePosition + rule.offset };
    }

    return null;
  }

  /**
   * 指定位置の単語を検索
   */
  private findWordAtPosition(words: any[], position: number): any | null {
    return words.find(word =>
      word.col && word.text &&
      position >= word.col &&
      position < word.col + word.text.length
    );
  }

  /**
   * ヒント優先度で並び替え
   */
  private sortByHintPriority(words: any[]): any[] {
    return words.sort((a, b) => {
      const priorityA = (a as any).hintPriority || 0;
      const priorityB = (b as any).hintPriority || 0;
      return priorityB - priorityA;
    });
  }
}