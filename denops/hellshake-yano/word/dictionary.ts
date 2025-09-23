/**
 * Dictionary-based Word Correction System
 *
 * TDD Green Phase Stage 1: Interface definitions and basic implementation
 * Following PLAN.md process4 sub1 - Dictionary-based correction system
 */

/**
 * 辞書の設定オプション
 */
export interface DictionaryConfig {
  /** 辞書ファイルのパス */
  dictionaryPath?: string;
  /** プロジェクト固有辞書のパス */
  projectDictionaryPath?: string;
  /** ビルトイン辞書を使用するか */
  useBuiltinDictionary?: boolean;
  /** 学習機能を有効にするか */
  enableLearning?: boolean;
  /** キャッシュを有効にするか */
  enableCache?: boolean;
  /** キャッシュサイズ */
  cacheSize?: number;
}

/**
 * 複合語パターンマッチの結果
 */
export interface CompoundMatch {
  /** マッチした文字列 */
  match: string;
  /** 開始位置 */
  startIndex: number;
  /** 終了位置 */
  endIndex: number;
}

/**
 * キャッシュ統計情報
 */
export interface CacheStats {
  /** ヒット数 */
  hits: number;
  /** ミス数 */
  misses: number;
  /** ヒット率 */
  hitRate: number;
}

/**
 * 単語辞書のインターフェース
 */
export interface WordDictionary {
  /** カスタム単語のセット */
  customWords: Set<string>;
  /** 複合語パターンの配列 */
  compoundPatterns: RegExp[];
  /** 保持する単語のセット */
  preserveWords: Set<string>;
  /** 結合ルールのマップ（単語 → 優先度） */
  mergeRules: Map<string, number>;

  /** カスタム単語を追加 */
  addCustomWord(word: string): void;
  /** カスタム単語を持っているかチェック */
  hasCustomWord(word: string): boolean;
  /** カスタム単語を削除 */
  removeCustomWord(word: string): void;

  /** 複合語パターンを追加 */
  addCompoundPattern(pattern: RegExp): void;
  /** 複合語パターンにマッチするかチェック */
  matchCompoundPatterns(text: string): CompoundMatch[];

  /** 保持単語を追加 */
  addPreserveWord(word: string): void;
  /** 単語を保持すべきかチェック */
  shouldPreserveWord(word: string): boolean;

  /** 結合ルールを追加 */
  addMergeRule(word1: string, word2: string, priority: number): void;
  /** 3単語結合ルールを追加 */
  addTripleMergeRule(word1: string, word2: string, word3: string, priority: number): void;
  /** 結合ルールを適用 */
  applyMergeRules(segments: string[]): string[];

  /** ファイルから辞書を読み込み */
  loadFromFile(): Promise<void>;
  /** キャッシュ統計を取得 */
  getCacheStats(): CacheStats | null;
}

/**
 * 単語辞書の実装クラス
 */
export class WordDictionaryImpl implements WordDictionary {
  public customWords: Set<string> = new Set();
  public compoundPatterns: RegExp[] = [];
  public preserveWords: Set<string> = new Set();
  public mergeRules: Map<string, number> = new Map();

  private config: DictionaryConfig;
  private cache?: Map<string, boolean>;
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
    this.cache = new Map();
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
    // キャッシュをクリア
    if (this.cache) {
      this.cache.clear();
    }
  }

  hasCustomWord(word: string): boolean {
    if (this.cache && this.cache.has(word)) {
      this.updateCacheStats(true);
      return this.cache.get(word)!;
    }

    const result = this.customWords.has(word);

    if (this.cache) {
      this.updateCacheStats(false);
      // キャッシュサイズ制限
      if (this.cache.size >= (this.config.cacheSize || 1000)) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey !== undefined) {
          this.cache.delete(firstKey);
        }
      }
      this.cache.set(word, result);
    }

    return result;
  }

  removeCustomWord(word: string): void {
    this.customWords.delete(word);
    // キャッシュからも削除
    if (this.cache) {
      this.cache.delete(word);
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

      // 3つのセグメントの結合を試行（例：データ+ベース+接続）
      if (i + 2 < segments.length) {
        const key3 = `${segments[i]}+${segments[i + 1]}+${segments[i + 2]}`;
        if (this.mergeRules.has(key3)) {
          result.push(segments[i] + segments[i + 1] + segments[i + 2]);
          i += 3;
          merged = true;
        }
      }

      // 2つのセグメントの結合を試行
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
          this.addCompoundPattern(new RegExp(pattern, 'g'));
        }
      }
    } catch (error) {
      console.warn(`Failed to load dictionary from ${this.config.dictionaryPath}:`, error);
    }
  }

  getCacheStats(): CacheStats | null {
    return this.cacheStats ? { ...this.cacheStats } : null;
  }

  /**
   * 複数の辞書をマージする静的メソッド
   */
  static merge(dict1: WordDictionaryImpl, dict2: WordDictionaryImpl): WordDictionaryImpl {
    const merged = new WordDictionaryImpl();

    // カスタム単語をマージ
    for (const word of dict1.customWords) {
      merged.addCustomWord(word);
    }
    for (const word of dict2.customWords) {
      merged.addCustomWord(word);
    }

    // 保持単語をマージ
    for (const word of dict1.preserveWords) {
      merged.addPreserveWord(word);
    }
    for (const word of dict2.preserveWords) {
      merged.addPreserveWord(word);
    }

    // 複合語パターンをマージ
    for (const pattern of dict1.compoundPatterns) {
      merged.addCompoundPattern(pattern);
    }
    for (const pattern of dict2.compoundPatterns) {
      merged.addCompoundPattern(pattern);
    }

    // 結合ルールをマージ（dict2の方が優先）
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
 * ビルトイン辞書を作成
 */
export function createBuiltinDictionary(): WordDictionaryImpl {
  const dictionary = new WordDictionaryImpl();

  // 日本語プログラミング用語を追加
  const programmingTerms = [
    "関数定義",
    "非同期処理",
    "配列操作",
    "オブジェクト指向",
    "データベース接続",
    "ユニットテスト",
    "バージョン管理",
    "デバッグ実行",
    "メモリ管理",
    "例外処理",
    "ファイルシステム",
    "ネットワーク通信",
    "暗号化処理",
    "スレッド処理",
    "並行処理",
    "継承関係",
    "インターフェース定義",
    "デザインパターン",
    "コード生成",
    "自動テスト",
  ];

  for (const term of programmingTerms) {
    dictionary.addPreserveWord(term);
  }

  // 複合語パターンを追加
  dictionary.addCompoundPattern(/関数定義/g);
  dictionary.addCompoundPattern(/非同期処理/g);
  dictionary.addCompoundPattern(/配列操作/g);
  dictionary.addCompoundPattern(/オブジェクト指向/g);
  dictionary.addCompoundPattern(/データベース接続/g);
  dictionary.addCompoundPattern(/ユニットテスト/g);
  dictionary.addCompoundPattern(/バージョン管理/g);
  dictionary.addCompoundPattern(/デバッグ実行/g);

  // 2単語結合ルールを追加
  dictionary.addMergeRule("関数", "定義", 10);
  dictionary.addMergeRule("非同期", "処理", 10);
  dictionary.addMergeRule("配列", "操作", 10);
  dictionary.addMergeRule("オブジェクト", "指向", 10);
  dictionary.addMergeRule("ユニット", "テスト", 10);
  dictionary.addMergeRule("バージョン", "管理", 10);
  dictionary.addMergeRule("デバッグ", "実行", 10);

  // より複雑な結合ルール
  dictionary.addMergeRule("データ", "ベース", 8);
  dictionary.addMergeRule("データ", "構造", 8);
  dictionary.addMergeRule("メモリ", "管理", 8);
  dictionary.addMergeRule("例外", "処理", 8);
  dictionary.addMergeRule("ファイル", "システム", 8);

  // 3単語結合ルールを追加
  dictionary.addTripleMergeRule("非", "同期", "処理", 12);
  dictionary.addTripleMergeRule("データ", "ベース", "接続", 12);

  return dictionary;
}

/**
 * セグメントに辞書補正を適用
 */
export function applyDictionaryCorrection(segments: string[], dictionary?: WordDictionaryImpl): string[] {
  const dict = dictionary || createBuiltinDictionary();
  return dict.applyMergeRules(segments);
}