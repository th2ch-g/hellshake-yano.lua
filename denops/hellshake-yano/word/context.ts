/**
 * @fileoverview コンテキスト認識による分割調整機能 with UnifiedCache統合
 * ファイルタイプと構文コンテキストに基づいて適切な分割ルールを適用
 *
 * TDD Red-Green-Refactor サイクルで実装されたUnifiedCacheシステム統合により、
 * パフォーマンスとメモリ効率の最適化を実現しています。
 */

import type { Denops } from "https://deno.land/x/denops_std@v6.0.1/mod.ts";
import type { DetectionContext, SyntaxContext, LineContext } from "../types.ts";
import { UnifiedCache, CacheType } from "../cache.ts";

/** 言語別パターン定義 */
export interface LanguageRule {
  /** コメントパターン */
  commentPatterns: RegExp[];
  /** 文字列パターン */
  stringPatterns: RegExp[];
  /** 関数定義パターン */
  functionPatterns: RegExp[];
  /** クラス定義パターン */
  classPatterns: RegExp[];
  /** import文パターン */
  importPatterns: RegExp[];

  /** 予約語リスト */
  keywords: string[];
  /** 命名規則 */
  namingConventions: {
    function: 'camelCase' | 'snake_case' | 'PascalCase';
    variable: 'camelCase' | 'snake_case' | 'UPPER_CASE';
    class: 'PascalCase' | 'snake_case';
  };
}

/** 分割ルール */
export interface SplittingRules {
  /** CamelCase分割を行うか */
  splitCamelCase: boolean;
  /** snake_case分割を行うか */
  splitSnakeCase: boolean;
  /** すべてを保持するか */
  preserveAll: boolean;
  /** 最小単語長 */
  minWordLength: number;
  /** 特殊文字の扱い */
  preserveSpecialChars: boolean;
}

/**
 * コンテキスト検出器 - UnifiedCache統合版
 *
 * 言語別パターンとシンタックスコンテキストの検出を行い、
 * UnifiedCacheシステムで効率的なキャッシュ管理を実現します。
 *
 * ## 主な機能:
 * - 言語別パターンのキャッシュ管理 (CacheType.LANGUAGE_RULES)
 * - シンタックスコンテキストのキャッシュ管理 (CacheType.SYNTAX_CONTEXT)
 * - 複数インスタンス間でのキャッシュ共有
 * - 効率的なLRUベースのメモリ管理
 *
 * @example
 * ```typescript
 * const detector = new ContextDetector();
 * const context = detector.detectSyntaxContext("function test() {}", 1, "typescript");
 * console.log(context.inFunction); // true
 * ```
 */
export class ContextDetector {
  private readonly defaultRules: SplittingRules;
  /** UnifiedCacheシステムのインスタンス（シングルトン） */
  private readonly unifiedCache: UnifiedCache;

  /**
   * ContextDetectorのコンストラクタ
   *
   * デフォルトの分割ルールを設定し、UnifiedCacheシステムのインスタンスを取得します。
   * 複数のContextDetectorインスタンスが作成されても、キャッシュは共有されます。
   */
  constructor() {
    this.defaultRules = {
      splitCamelCase: true,
      splitSnakeCase: false,
      preserveAll: false,
      minWordLength: 2,
      preserveSpecialChars: false,
    };
    // シングルトンパターンによりアプリケーション全体で同一インスタンスを共有
    this.unifiedCache = UnifiedCache.getInstance();
  }

  /**
   * ファイルタイプの取得
   * @param denops Denopsインスタンス
   * @returns ファイルタイプ文字列
   */
  async detectFileType(denops: Denops): Promise<string> {
    try {
      const filetype = await denops.eval('&filetype') as string;
      return filetype || 'text';
    } catch (_error) {
      return 'text';
    }
  }

  /**
   * 構文コンテキストの検出（UnifiedCache統合）
   *
   * テキスト、行番号、ファイルタイプを元にシンタックスコンテキストを検出し、
   * 結果をUnifiedCache.SYNTAX_CONTEXTにキャッシュします。
   *
   * @param text 対象テキスト
   * @param line 行番号
   * @param fileType ファイルタイプ
   * @returns 構文コンテキスト（キャッシュからの取得も含む）
   *
   * @example
   * ```typescript
   * const context = detector.detectSyntaxContext("// コメント", 1, "javascript");
   * console.log(context.inComment); // true
   * ```
   */
  detectSyntaxContext(
    text: string,
    line: number,
    fileType: string
  ): SyntaxContext {
    // キャッシュキーを生成
    const cacheKey = `${fileType}:${line}:${text}`;

    // UnifiedCacheから取得を試行
    const syntaxContextCache = this.unifiedCache.getCache<string, SyntaxContext>(CacheType.SYNTAX_CONTEXT);
    const cachedContext = syntaxContextCache.get(cacheKey);
    if (cachedContext !== undefined) {
      return cachedContext;
    }

    const language = this.mapFileTypeToLanguage(fileType);
    const patterns = this.getLanguagePatterns(language);

    const context: SyntaxContext = {
      inComment: this.isInComment(text, patterns.commentPatterns),
      inString: this.isInString(text, patterns.stringPatterns),
      inFunction: this.isInFunction(text, patterns.functionPatterns),
      inClass: this.isInClass(text, patterns.classPatterns),
      language
    };

    // UnifiedCacheに保存（LRU制限は自動で管理される）
    syntaxContextCache.set(cacheKey, context);

    return context;
  }

  /**
   * 行コンテキストの検出
   * @param line 行テキスト
   * @param fileType ファイルタイプ
   * @returns 行コンテキスト
   */
  detectLineContext(
    line: string,
    fileType: string
  ): LineContext {
    const indentMatch = line.match(/^(\s*)/);
    const indentLevel = indentMatch ? indentMatch[1].length : 0;

    return {
      isComment: this.isCommentLine(line, fileType),
      isDocString: this.isDocStringLine(line, fileType),
      isImport: this.isImportLine(line, fileType),
      indentLevel,
      lineType: this.detectLineType(line, fileType)
    };
  }

  /**
   * コンテキストに基づく分割ルールの取得
   * @param context 検出コンテキスト
   * @returns 分割ルール
   */
  getSplittingRules(context: DetectionContext): SplittingRules {
    const fileType = context.fileType || 'text';
    const rules = this.getLanguageRules(fileType);

    // コンテキストに応じてルールを調整
    if (context.syntaxContext?.inComment) {
      return { ...rules, splitCamelCase: false };
    }
    if (context.syntaxContext?.inString) {
      return { ...rules, preserveAll: true };
    }

    return rules;
  }

  /**
   * ファイルタイプから言語名へのマッピング
   * @param fileType Vimファイルタイプ
   * @returns 標準化された言語名
   */
  private mapFileTypeToLanguage(fileType: string): string {
    const languageMap: Record<string, string> = {
      'typescript': 'typescript',
      'javascript': 'javascript',
      'python': 'python',
      'markdown': 'markdown',
      'json': 'json',
      'yaml': 'yaml',
      'html': 'html',
      'css': 'css',
      'vim': 'vim',
      'sh': 'shell',
      'bash': 'shell',
      'zsh': 'shell',
    };

    return languageMap[fileType] || 'text';
  }

  /**
   * 言語別パターンの取得（UnifiedCache統合）
   *
   * 指定された言語のパターンをUnifiedCache.LANGUAGE_RULESから取得し、
   * キャッシュにない場合は新規作成してキャッシュします。
   *
   * @param language 言語名 (例: 'typescript', 'python', 'markdown')
   * @returns 言語パターン（コメント、文字列、関数などのパターンを含む）
   *
   * @example
   * ```typescript
   * const patterns = detector.getLanguagePatterns('typescript');
   * console.log(patterns.commentPatterns); // [/\/\/.*$/, /\/\*[\s\S]*?\*\//]
   * ```
   */
  private getLanguagePatterns(language: string): LanguageRule {
    const languageRulesCache = this.unifiedCache.getCache<string, LanguageRule>(CacheType.LANGUAGE_RULES);
    const cachedRule = languageRulesCache.get(language);
    if (cachedRule !== undefined) {
      return cachedRule;
    }

    const patterns = this.createLanguagePatterns(language);
    languageRulesCache.set(language, patterns);
    return patterns;
  }

  /**
   * 言語別パターンの生成
   * @param language 言語名
   * @returns 言語パターン
   */
  private createLanguagePatterns(language: string): LanguageRule {
    switch (language) {
      case 'typescript':
      case 'javascript':
        return {
          commentPatterns: [/\/\/.*$/, /\/\*[\s\S]*?\*\//],
          stringPatterns: [/"[^"]*"/, /'[^']*'/, /`[^`]*`/],
          functionPatterns: [/function\s+\w+/, /\w+\s*=\s*\(.*?\)\s*=>/, /\w+\s*:\s*\(.*?\)\s*=>/],
          classPatterns: [/class\s+\w+/, /interface\s+\w+/, /type\s+\w+/],
          importPatterns: [/import\s+.*from/, /import\s*\{.*\}/, /require\s*\(/],
          keywords: ['function', 'class', 'interface', 'type', 'const', 'let', 'var'],
          namingConventions: {
            function: 'camelCase',
            variable: 'camelCase',
            class: 'PascalCase'
          }
        };

      case 'python':
        return {
          commentPatterns: [/#.*$/],
          stringPatterns: [/"[^"]*"/, /'[^']*'/, /"""[\s\S]*?"""/, /'''[\s\S]*?'''/],
          functionPatterns: [/def\s+\w+/, /async\s+def\s+\w+/],
          classPatterns: [/class\s+\w+/],
          importPatterns: [/import\s+/, /from\s+.*import/],
          keywords: ['def', 'class', 'import', 'from', 'async'],
          namingConventions: {
            function: 'snake_case',
            variable: 'snake_case',
            class: 'PascalCase'
          }
        };

      case 'markdown':
        return {
          commentPatterns: [/<!--[\s\S]*?-->/],
          stringPatterns: [/`[^`]*`/, /```[\s\S]*?```/],
          functionPatterns: [],
          classPatterns: [],
          importPatterns: [],
          keywords: [],
          namingConventions: {
            function: 'camelCase',
            variable: 'camelCase',
            class: 'PascalCase'
          }
        };

      case 'json':
        return {
          commentPatterns: [],
          stringPatterns: [/"[^"]*"/],
          functionPatterns: [],
          classPatterns: [],
          importPatterns: [],
          keywords: [],
          namingConventions: {
            function: 'camelCase',
            variable: 'camelCase',
            class: 'PascalCase'
          }
        };

      case 'yaml':
        return {
          commentPatterns: [/#.*$/],
          stringPatterns: [/"[^"]*"/, /'[^']*'/],
          functionPatterns: [],
          classPatterns: [],
          importPatterns: [],
          keywords: [],
          namingConventions: {
            function: 'snake_case',
            variable: 'snake_case',
            class: 'PascalCase'
          }
        };

      case 'html':
        return {
          commentPatterns: [/<!--[\s\S]*?-->/],
          stringPatterns: [/"[^"]*"/, /'[^']*'/],
          functionPatterns: [],
          classPatterns: [],
          importPatterns: [],
          keywords: [],
          namingConventions: {
            function: 'camelCase',
            variable: 'camelCase',
            class: 'PascalCase'
          }
        };

      case 'css':
        return {
          commentPatterns: [/\/\*[\s\S]*?\*\//],
          stringPatterns: [/"[^"]*"/, /'[^']*'/],
          functionPatterns: [],
          classPatterns: [/\.[a-zA-Z][\w-]*/],
          importPatterns: [/@import/],
          keywords: [],
          namingConventions: {
            function: 'camelCase',
            variable: 'camelCase',
            class: 'PascalCase'
          }
        };

      default:
        return {
          commentPatterns: [],
          stringPatterns: [/"[^"]*"/, /'[^']*'/],
          functionPatterns: [],
          classPatterns: [],
          importPatterns: [],
          keywords: [],
          namingConventions: {
            function: 'camelCase',
            variable: 'camelCase',
            class: 'PascalCase'
          }
        };
    }
  }

  /**
   * コメント内判定
   * @param text テキスト
   * @param patterns コメントパターン
   * @returns コメント内かどうか
   */
  private isInComment(text: string, patterns: RegExp[]): boolean {
    // コメント内というのは、テキスト全体がコメントかを判定
    // 部分的にコメントを含むケース（例: "key: value # comment"）では false
    const trimmed = text.trim();

    // 行がコメントで始まっているかをチェック
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('<!--')) {
      return true;
    }

    // 完全にコメントで囲まれているパターンをチェック
    return patterns.some(pattern => {
      const match = pattern.exec(text);
      return match && match[0] === text.trim();
    });
  }

  /**
   * 文字列内判定
   * @param text テキスト
   * @param patterns 文字列パターン
   * @returns 文字列内かどうか
   */
  private isInString(text: string, patterns: RegExp[]): boolean {
    // 実際にテキストが文字列リテラル内にあるかをより精密に判定
    // この実装では、文字列パターンのマッチがあることを確認
    if (patterns.length === 0) return false;

    // シンプルな文字列検出: クォート文字で囲まれているか
    const hasQuotes = /^["'`].*["'`]$/.test(text.trim());
    return hasQuotes && patterns.some(pattern => pattern.test(text));
  }

  /**
   * 関数内判定
   * @param text テキスト
   * @param patterns 関数パターン
   * @returns 関数内かどうか
   */
  private isInFunction(text: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(text));
  }

  /**
   * クラス内判定
   * @param text テキスト
   * @param patterns クラスパターン
   * @returns クラス内かどうか
   */
  private isInClass(text: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(text));
  }

  /**
   * コメント行判定
   * @param line 行テキスト
   * @param fileType ファイルタイプ
   * @returns コメント行かどうか
   */
  private isCommentLine(line: string, fileType: string): boolean {
    const trimmed = line.trim();
    const language = this.mapFileTypeToLanguage(fileType);

    switch (language) {
      case 'typescript':
      case 'javascript':
        return trimmed.startsWith('//') || trimmed.startsWith('/*');
      case 'python':
      case 'yaml':
        return trimmed.startsWith('#');
      case 'html':
      case 'markdown':
        return trimmed.startsWith('<!--');
      case 'css':
        return trimmed.startsWith('/*');
      default:
        return false;
    }
  }

  /**
   * ドキュメント文字列判定
   * @param line 行テキスト
   * @param fileType ファイルタイプ
   * @returns ドキュメント文字列かどうか
   */
  private isDocStringLine(line: string, fileType: string): boolean {
    const trimmed = line.trim();
    const language = this.mapFileTypeToLanguage(fileType);

    switch (language) {
      case 'python':
        return trimmed.startsWith('"""') || trimmed.startsWith("'''");
      case 'typescript':
      case 'javascript':
        return trimmed.startsWith('/**');
      default:
        return false;
    }
  }

  /**
   * import行判定
   * @param line 行テキスト
   * @param fileType ファイルタイプ
   * @returns import行かどうか
   */
  private isImportLine(line: string, fileType: string): boolean {
    const trimmed = line.trim();
    const language = this.mapFileTypeToLanguage(fileType);

    switch (language) {
      case 'typescript':
      case 'javascript':
        return /^import\s+/.test(trimmed) || /require\s*\(/.test(trimmed);
      case 'python':
        return /^import\s+/.test(trimmed) || /^from\s+/.test(trimmed);
      case 'css':
        return /^@import/.test(trimmed);
      default:
        return false;
    }
  }

  /**
   * 行タイプの検出
   * @param line 行テキスト
   * @param fileType ファイルタイプ
   * @returns 行タイプ
   */
  private detectLineType(line: string, fileType: string): string {
    if (this.isCommentLine(line, fileType)) return 'comment';
    if (this.isDocStringLine(line, fileType)) return 'docstring';
    if (this.isImportLine(line, fileType)) return 'import';

    const trimmed = line.trim();
    if (trimmed.startsWith('#') && fileType === 'markdown') return 'heading';
    if (trimmed === '') return 'empty';

    return 'code';
  }

  /**
   * 言語別分割ルールの取得
   * @param fileType ファイルタイプ
   * @returns 分割ルール
   */
  private getLanguageRules(fileType: string): SplittingRules {
    const language = this.mapFileTypeToLanguage(fileType);

    switch (language) {
      case 'python':
        return {
          ...this.defaultRules,
          splitCamelCase: false,
          splitSnakeCase: false, // snake_caseを保持
        };
      case 'css':
        return {
          ...this.defaultRules,
          splitCamelCase: false, // kebab-caseを保持
          preserveSpecialChars: true,
        };
      case 'json':
        return {
          ...this.defaultRules,
          splitCamelCase: false, // プロパティ名を保持
        };
      case 'markdown':
        return {
          ...this.defaultRules,
          preserveSpecialChars: true,
        };
      default:
        return this.defaultRules;
    }
  }

  /**
   * キャッシュクリア（メモリ最適化用）
   *
   * UnifiedCacheシステムでSYNTAX_CONTEXTキャッシュをクリアします。
   * 言語ルールキャッシュは静的データのため保持されます。
   *
   * @example
   * ```typescript
   * detector.clearCache(); // シンタックスコンテキストキャッシュをクリア
   * ```
   */
  clearCache(): void {
    this.unifiedCache.clearByType(CacheType.SYNTAX_CONTEXT);
    // 言語ルールキャッシュは保持（静的データのため）
  }

  /**
   * キャッシュ統計の取得（デバッグ用）
   *
   * UnifiedCacheシステムからSYNTAX_CONTEXTとLANGUAGE_RULESの
   * キャッシュ統計情報を取得し、従来のインターフェースと互換性を保ちます。
   *
   * @returns キャッシュ統計情報（従来のインターフェースと互換）
   *
   * @example
   * ```typescript
   * const stats = detector.getCacheStats();
   * console.log(`Context cache: ${stats.contextCacheSize}, Language rules: ${stats.languageRuleCacheSize}`);
   * ```
   */
  getCacheStats(): { contextCacheSize: number; languageRuleCacheSize: number } {
    const syntaxContextStats = this.unifiedCache.getCache(CacheType.SYNTAX_CONTEXT).getStats();
    const languageRulesStats = this.unifiedCache.getCache(CacheType.LANGUAGE_RULES).getStats();

    return {
      contextCacheSize: syntaxContextStats.size,
      languageRuleCacheSize: languageRulesStats.size,
    };
  }

  /**
   * 文脈に基づく単語の重要度判定（将来拡張用）
   * @param word 対象単語
   * @param context コンテキスト
   * @returns 重要度スコア (0-100)
   */
  calculateWordImportance(word: string, context: DetectionContext): number {
    let score = 50; // ベーススコア

    // ファイルタイプ固有の重要度調整
    if (context.fileType) {
      const language = this.mapFileTypeToLanguage(context.fileType);
      const patterns = this.getLanguagePatterns(language);

      // キーワードは重要度高
      if (patterns.keywords.includes(word.toLowerCase())) {
        score += 30;
      }

      // 関数名・クラス名パターンも重要度高
      if (patterns.functionPatterns.some(p => p.test(word)) ||
          patterns.classPatterns.some(p => p.test(word))) {
        score += 20;
      }
    }

    // インデントレベルによる調整
    if (context.lineContext?.indentLevel !== undefined) {
      // インデントが深いほど重要度低下
      score -= Math.min(context.lineContext.indentLevel * 2, 20);
    }

    // コメント内は重要度低下
    if (context.syntaxContext?.inComment) {
      score -= 20;
    }

    // 文字列内は中程度の重要度
    if (context.syntaxContext?.inString) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }
}