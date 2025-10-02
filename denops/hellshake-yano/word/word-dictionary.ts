/**
 * Dictionary-based Word Correction and Management System
 *
 * This module provides comprehensive dictionary functionality including:
 * - Custom word dictionaries with caching
 * - Compound pattern matching
 * - Merge rules for word segmentation
 * - Dictionary loading from various formats (JSON, YAML, text)
 * - Hint pattern processing
 */

import type { Denops } from "@denops/std";
import { exists } from "https://deno.land/std@0.212.0/fs/exists.ts";
import { resolve } from "https://deno.land/std@0.212.0/path/resolve.ts";
import { parse as parseYaml } from "https://deno.land/std@0.212.0/yaml/parse.ts";
import { CacheType, GlobalCache } from "../cache.ts";

/**
 * Dictionary configuration options
 */
export interface DictionaryConfig {
  dictionaryPath?: string;
  projectDictionaryPath?: string;
  useBuiltinDictionary?: boolean;
  enableLearning?: boolean;
  enableCache?: boolean;
  cacheSize?: number;
}

/**
 * Compound word pattern match result
 */
export interface CompoundMatch {
  match: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
}

/**
 * Word dictionary interface
 */
export interface WordDictionary {
  customWords: Set<string>;
  compoundPatterns: RegExp[];
  preserveWords: Set<string>;
  mergeRules: Map<string, number>;

  addCustomWord(word: string): void;
  hasCustomWord(word: string): boolean;
  removeCustomWord(word: string): void;

  addCompoundPattern(pattern: RegExp): void;
  matchCompoundPatterns(text: string): CompoundMatch[];

  addPreserveWord(word: string): void;
  shouldPreserveWord(word: string): boolean;

  addMergeRule(word1: string, word2: string, priority: number): void;
  addTripleMergeRule(word1: string, word2: string, word3: string, priority: number): void;
  applyMergeRules(segments: string[]): string[];

  loadFromFile(): Promise<void>;
  getCacheStats(): CacheStats | null;
}

/**
 * Word dictionary implementation class
 */
export class WordDictionaryImpl implements WordDictionary {
  public customWords: Set<string> = new Set();
  public compoundPatterns: RegExp[] = [];
  public preserveWords: Set<string> = new Set();
  public mergeRules: Map<string, number> = new Map();

  private config: DictionaryConfig;
  private globalCache?: GlobalCache;
  private cacheStats?: CacheStats;

  constructor(config: DictionaryConfig = {}) {
    this.config = {
      useBuiltinDictionary: true,
      enableLearning: false,
      enableCache: false,
      cacheSize: 1000,
      ...config,
    };

    if (this.config.enableCache) {
      this.initializeCache();
    }
  }

  private initializeCache(): void {
    this.globalCache = GlobalCache.getInstance();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
    };
  }

  private updateCacheStats(hit: boolean): void {
    if (!this.cacheStats) return;

    if (hit) {
      this.cacheStats.hits++;
    } else {
      this.cacheStats.misses++;
    }

    const total = this.cacheStats.hits + this.cacheStats.misses;
    this.cacheStats.hitRate = total > 0 ? this.cacheStats.hits / total : 0;
  }

  addCustomWord(word: string): void {
    this.customWords.add(word);
    if (this.globalCache) {
      this.globalCache.clearByType(CacheType.DICTIONARY);
    }
  }

  hasCustomWord(word: string): boolean {
    if (this.globalCache) {
      const dictionaryCache = this.globalCache.getCache<string, boolean>(CacheType.DICTIONARY);

      if (dictionaryCache.has(word)) {
        this.updateCacheStats(true);
        return dictionaryCache.get(word)!;
      }

      const result = this.customWords.has(word);
      this.updateCacheStats(false);
      dictionaryCache.set(word, result);
      return result;
    }

    return this.customWords.has(word);
  }

  removeCustomWord(word: string): void {
    this.customWords.delete(word);
    if (this.globalCache) {
      const dictionaryCache = this.globalCache.getCache<string, boolean>(CacheType.DICTIONARY);
      dictionaryCache.delete(word);
    }
  }

  addCompoundPattern(pattern: RegExp): void {
    this.compoundPatterns.push(pattern);
  }

  matchCompoundPatterns(text: string): CompoundMatch[] {
    const matches: CompoundMatch[] = [];

    for (const pattern of this.compoundPatterns) {
      const regexMatches = text.matchAll(pattern);
      for (const match of regexMatches) {
        if (match.index !== undefined) {
          matches.push({
            match: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
          });
        }
      }
    }

    return matches;
  }

  addPreserveWord(word: string): void {
    this.preserveWords.add(word);
  }

  shouldPreserveWord(word: string): boolean {
    return this.preserveWords.has(word);
  }

  addMergeRule(word1: string, word2: string, priority: number): void {
    const key = `${word1}+${word2}`;
    this.mergeRules.set(key, priority);
  }

  addTripleMergeRule(word1: string, word2: string, word3: string, priority: number): void {
    const key = `${word1}+${word2}+${word3}`;
    this.mergeRules.set(key, priority);
  }

  applyMergeRules(segments: string[]): string[] {
    const result: string[] = [];
    let i = 0;

    while (i < segments.length) {
      let merged = false;

      // Try 3-segment merge
      if (i + 2 < segments.length) {
        const key3 = `${segments[i]}+${segments[i + 1]}+${segments[i + 2]}`;
        if (this.mergeRules.has(key3)) {
          result.push(segments[i] + segments[i + 1] + segments[i + 2]);
          i += 3;
          merged = true;
        }
      }

      // Try 2-segment merge
      if (!merged && i + 1 < segments.length) {
        const key2 = `${segments[i]}+${segments[i + 1]}`;
        if (this.mergeRules.has(key2)) {
          result.push(segments[i] + segments[i + 1]);
          i += 2;
          merged = true;
        }
      }

      if (!merged) {
        result.push(segments[i]);
        i++;
      }
    }

    return result;
  }

  async loadFromFile(): Promise<void> {
    if (!this.config.dictionaryPath) return;

    try {
      const content = await Deno.readTextFile(this.config.dictionaryPath);
      const data = JSON.parse(content);

      if (data.customWords) {
        for (const word of data.customWords) {
          this.addCustomWord(word);
        }
      }

      if (data.preserveWords) {
        for (const word of data.preserveWords) {
          this.addPreserveWord(word);
        }
      }

      if (data.compoundPatterns) {
        for (const pattern of data.compoundPatterns) {
          this.addCompoundPattern(new RegExp(pattern, "g"));
        }
      }
    } catch {
      // Ignore dictionary load failures
    }
  }

  getCacheStats(): CacheStats | null {
    if (!this.cacheStats) return null;

    if (this.globalCache) {
      const unifiedStats = this.globalCache.getAllStats();
      const dictionaryStats = unifiedStats.DICTIONARY;

      return {
        hits: Math.max(this.cacheStats.hits, dictionaryStats.hits),
        misses: Math.max(this.cacheStats.misses, dictionaryStats.misses),
        hitRate: dictionaryStats.hitRate || this.cacheStats.hitRate,
      };
    }

    return { ...this.cacheStats };
  }

  static merge(dict1: WordDictionaryImpl, dict2: WordDictionaryImpl): WordDictionaryImpl {
    const merged = new WordDictionaryImpl();

    for (const word of dict1.customWords) {
      merged.addCustomWord(word);
    }
    for (const word of dict2.customWords) {
      merged.addCustomWord(word);
    }

    for (const word of dict1.preserveWords) {
      merged.addPreserveWord(word);
    }
    for (const word of dict2.preserveWords) {
      merged.addPreserveWord(word);
    }

    for (const pattern of dict1.compoundPatterns) {
      merged.addCompoundPattern(pattern);
    }
    for (const pattern of dict2.compoundPatterns) {
      merged.addCompoundPattern(pattern);
    }

    for (const [key, priority] of dict1.mergeRules) {
      merged.mergeRules.set(key, priority);
    }
    for (const [key, priority] of dict2.mergeRules) {
      merged.mergeRules.set(key, priority);
    }

    return merged;
  }
}

/**
 * Create builtin dictionary with Japanese programming terms
 */
export function createBuiltinDictionary(): WordDictionaryImpl {
  const dictionary = new WordDictionaryImpl();

  const programmingTerms = [
    "関数定義", "非同期処理", "配列操作", "オブジェクト指向", "データベース接続",
    "ユニットテスト", "バージョン管理", "デバッグ実行", "メモリ管理", "例外処理",
    "ファイルシステム", "ネットワーク通信", "暗号化処理", "スレッド処理", "並行処理",
    "継承関係", "インターフェース定義", "デザインパターン", "コード生成", "自動テスト",
  ];

  for (const term of programmingTerms) {
    dictionary.addPreserveWord(term);
  }

  // Add compound patterns
  dictionary.addCompoundPattern(/関数定義/g);
  dictionary.addCompoundPattern(/非同期処理/g);
  dictionary.addCompoundPattern(/配列操作/g);
  dictionary.addCompoundPattern(/オブジェクト指向/g);
  dictionary.addCompoundPattern(/データベース接続/g);

  // Add 2-word merge rules
  dictionary.addMergeRule("関数", "定義", 10);
  dictionary.addMergeRule("非同期", "処理", 10);
  dictionary.addMergeRule("配列", "操作", 10);
  dictionary.addMergeRule("データ", "ベース", 8);
  dictionary.addMergeRule("メモリ", "管理", 8);

  // Add 3-word merge rules
  dictionary.addTripleMergeRule("非", "同期", "処理", 12);
  dictionary.addTripleMergeRule("データ", "ベース", "接続", 12);

  return dictionary;
}

/**
 * Apply dictionary correction to segments
 */
export function applyDictionaryCorrection(
  segments: string[],
  dictionary?: WordDictionaryImpl,
): string[] {
  const dict = dictionary || createBuiltinDictionary();
  return dict.applyMergeRules(segments);
}

// User Dictionary Types
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

export interface HintPattern {
  pattern: string | RegExp;
  hintPosition: HintPositionRule;
  priority: number;
  description?: string;
}

export type HintPositionRule =
  | 'capture:1' | 'capture:2' | 'capture:3'
  | 'start' | 'end'
  | { offset: number; from: 'start' | 'end' };

export type MergeStrategy = 'always' | 'never' | 'context';

export interface DictionaryLoaderConfig {
  dictionaryPath?: string;
  projectDictionaryPath?: string;
  useBuiltinDict?: boolean;
  mergingStrategy?: 'override' | 'merge';
  autoReload?: boolean;
}

/**
 * Dictionary file loader class
 */
export class DictionaryLoader {
  private readonly searchPaths = [
    '.hellshake-yano/dictionary.json',
    'hellshake-yano.dict.json',
    '~/.config/hellshake-yano/dictionary.json'
  ];

  constructor(private config: DictionaryLoaderConfig = {}) {}

  async loadUserDictionary(config?: DictionaryLoaderConfig): Promise<UserDictionary> {
    const resolvedConfig = { ...this.config, ...config };

    for (const searchPath of this.searchPaths) {
      try {
        const resolvedPath = this.resolvePath(searchPath);
        if (await exists(resolvedPath)) {
          const content = await Deno.readTextFile(resolvedPath);
          return await this.parseDictionaryContent(content, resolvedPath);
        }
      } catch {
        // Ignore load failures
      }
    }

    if (resolvedConfig.dictionaryPath) {
      try {
        const content = await Deno.readTextFile(resolvedConfig.dictionaryPath);
        return await this.parseDictionaryContent(content, resolvedConfig.dictionaryPath);
      } catch {
        // Ignore load failures
      }
    }

    return this.createEmptyDictionary();
  }

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
        try {
          return this.parseJsonDictionary(content);
        } catch {
          return this.parseTextDictionary(content);
        }
    }
  }

  private parseJsonDictionary(content: string): UserDictionary {
    const data = JSON.parse(content);
    return this.convertToUserDictionary(data);
  }

  private parseYamlDictionary(content: string): UserDictionary {
    const data = parseYaml(content) as unknown;
    return this.convertToUserDictionary(data);
  }

  private parseTextDictionary(content: string): UserDictionary {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
    const dictionary = this.createEmptyDictionary();

    for (const line of lines) {
      if (line.startsWith('!')) {
        dictionary.preserveWords.push(line.slice(1));
      } else if (line.includes('=')) {
        const [key, value] = line.split('=', 2);
        dictionary.mergeRules.set(key.trim(), value.trim() as MergeStrategy);
      } else if (line.startsWith('@')) {
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
        dictionary.customWords.push(line);
      }
    }

    return dictionary;
  }

  private convertToUserDictionary(data: unknown): UserDictionary {
    const dictionary = this.createEmptyDictionary();

    if (typeof data !== 'object' || data === null) {
      return dictionary;
    }

    const dataObj = data as Record<string, unknown>;

    if (dataObj.customWords && Array.isArray(dataObj.customWords)) {
      dictionary.customWords = dataObj.customWords.filter((item): item is string => typeof item === 'string');
    }

    if (dataObj.preserveWords && Array.isArray(dataObj.preserveWords)) {
      dictionary.preserveWords = dataObj.preserveWords.filter((item): item is string => typeof item === 'string');
    }

    if (dataObj.mergeRules && typeof dataObj.mergeRules === 'object' && dataObj.mergeRules !== null) {
      dictionary.mergeRules = new Map(Object.entries(dataObj.mergeRules));
    }

    if (dataObj.compoundPatterns && Array.isArray(dataObj.compoundPatterns)) {
      dictionary.compoundPatterns = dataObj.compoundPatterns
        .filter((item): item is string => typeof item === 'string')
        .map((pattern: string) => new RegExp(pattern, 'g'));
    }

    if (dataObj.hintPatterns && Array.isArray(dataObj.hintPatterns)) {
      dictionary.hintPatterns = dataObj.hintPatterns
        .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
        .map((pattern: Record<string, unknown>) => ({
          pattern: typeof pattern.pattern === 'string' ? new RegExp(pattern.pattern) : pattern.pattern as RegExp,
          hintPosition: pattern.hintPosition as HintPositionRule,
          priority: typeof pattern.priority === 'number' ? pattern.priority : 0,
          description: typeof pattern.description === 'string' ? pattern.description : undefined,
        }));
    }

    if (dataObj.metadata && typeof dataObj.metadata === 'object' && dataObj.metadata !== null) {
      dictionary.metadata = dataObj.metadata as UserDictionary['metadata'];
    }

    return dictionary;
  }

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

  private resolvePath(path: string): string {
    if (path.startsWith('~')) {
      const home = Deno.env.get('HOME') || Deno.env.get('USERPROFILE') || '/tmp';
      return resolve(home, path.slice(2));
    }
    return resolve(path);
  }

  private getFileExtension(filepath: string): string {
    return filepath.toLowerCase().split('.').pop() || '';
  }
}

/**
 * Dictionary merger class
 */
export class DictionaryMerger {
  merge(
    base: WordDictionaryImpl,
    user: UserDictionary,
    strategy: 'override' | 'merge' = 'merge'
  ): WordDictionaryImpl {
    const merged = new WordDictionaryImpl();

    if (strategy === 'override') {
      this.mergeWithOverride(merged, base, user);
    } else {
      this.mergeWithMerge(merged, base, user);
    }

    return merged;
  }

  private mergeWithOverride(target: WordDictionaryImpl, base: WordDictionaryImpl, user: UserDictionary): void {
    for (const word of user.customWords) {
      target.addCustomWord(word);
    }
    for (const word of user.preserveWords) {
      target.addPreserveWord(word);
    }
    for (const pattern of user.compoundPatterns) {
      target.addCompoundPattern(pattern);
    }

    for (const word of base.customWords) {
      if (!target.hasCustomWord(word)) {
        target.addCustomWord(word);
      }
    }
  }

  private mergeWithMerge(target: WordDictionaryImpl, base: WordDictionaryImpl, user: UserDictionary): void {
    for (const word of base.customWords) {
      target.addCustomWord(word);
    }
    for (const word of user.customWords) {
      target.addCustomWord(word);
    }

    for (const word of base.preserveWords) {
      target.addPreserveWord(word);
    }
    for (const word of user.preserveWords) {
      target.addPreserveWord(word);
    }

    for (const pattern of base.compoundPatterns) {
      target.addCompoundPattern(pattern);
    }
    for (const pattern of user.compoundPatterns) {
      target.addCompoundPattern(pattern);
    }
  }
}

/**
 * Vim config bridge for dictionary commands
 */
export class VimConfigBridge {
  constructor(private denops: Denops) {}

  async getDictionaryPath(): Promise<string | undefined> {
    try {
      return await this.denops.call("g:hellshake_yano_dictionary_path") as string;
    } catch {
      return undefined;
    }
  }

  async getProjectDictionaryPath(): Promise<string | undefined> {
    try {
      return await this.denops.call("g:hellshake_yano_project_dictionary_path") as string;
    } catch {
      return undefined;
    }
  }
}

/**
 * Register dictionary commands with Vim
 */
export async function registerDictionaryCommands(denops: Denops) {
  await denops.cmd(
    `command! -nargs=1 HellshakeYanoAddWord call denops#request('${denops.name}', 'addWord', [<q-args>])`
  );
}

/**
 * Dictionary manager for integrated dictionary operations
 */
export class DictionaryManager {
  private dictionary: WordDictionaryImpl;
  private loader: DictionaryLoader;
  private merger: DictionaryMerger;

  constructor(
    private denops: Denops,
    config: DictionaryLoaderConfig = {}
  ) {
    this.dictionary = createBuiltinDictionary();
    this.loader = new DictionaryLoader(config);
    this.merger = new DictionaryMerger();
  }

  async loadDictionaries(): Promise<void> {
    const userDict = await this.loader.loadUserDictionary();
    this.dictionary = this.merger.merge(this.dictionary, userDict, 'merge');
  }

  getDictionary(): WordDictionaryImpl {
    return this.dictionary;
  }

  async addWord(word: string): Promise<void> {
    this.dictionary.addCustomWord(word);
  }
}

/**
 * Hint pattern processor
 */
export class HintPatternProcessor {
  processPatterns(
    text: string,
    patterns: HintPattern[]
  ): Array<{ text: string; position: number; priority: number }> {
    const results: Array<{ text: string; position: number; priority: number }> = [];

    for (const pattern of patterns) {
      const regex = typeof pattern.pattern === 'string'
        ? new RegExp(pattern.pattern, 'g')
        : pattern.pattern;

      const matches = text.matchAll(regex);
      for (const match of matches) {
        if (match.index !== undefined) {
          const position = this.calculatePosition(match, pattern.hintPosition);
          results.push({
            text: match[0],
            position,
            priority: pattern.priority,
          });
        }
      }
    }

    return results.sort((a, b) => b.priority - a.priority);
  }

  private calculatePosition(match: RegExpMatchArray, rule: HintPositionRule): number {
    if (match.index === undefined) return 0;

    if (typeof rule === 'string') {
      if (rule === 'start') return match.index;
      if (rule === 'end') return match.index + match[0].length;
      if (rule.startsWith('capture:')) {
        const captureIndex = parseInt(rule.split(':')[1]);
        return match.index + (match[captureIndex]?.length || 0);
      }
    } else if (typeof rule === 'object' && 'offset' in rule) {
      if (rule.from === 'start') {
        return match.index + rule.offset;
      } else {
        return match.index + match[0].length + rule.offset;
      }
    }

    return match.index;
  }
}
