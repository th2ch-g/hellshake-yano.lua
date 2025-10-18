/**
 * tests/phase-b3/test-utils.ts
 *
 * テスト用のモック・ユーティリティ
 */

export interface TestConfig {
  useJapanese?: boolean;
  enableTinySegmenter?: boolean;
  japaneseMinWordLength?: number;
  japaneseMergeParticles?: boolean;
}

export interface TestSegment {
  text: string;
  line: number;
  col: number;
}

export class UnifiedJapaneseSupportMock {
  private cache: Map<string, TestSegment[]> = new Map();

  static create(): UnifiedJapaneseSupportMock {
    return new UnifiedJapaneseSupportMock();
  }

  hasJapanese(text: string): boolean {
    return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
  }

  async segmentLine(
    line: string,
    lineNum: number,
    config: TestConfig,
  ): Promise<TestSegment[]> {
    if (!this.isEnabled(config)) {
      return [];
    }

    // キャッシュキーを生成（lineNum を含めない：行の内容とconfigのみをキー化）
    const cacheKey = `${line}:${JSON.stringify(config)}`;
    if (this.cache.has(cacheKey)) {
      const cachedSegments = this.cache.get(cacheKey)!;
      // キャッシュから取得した場合も行番号を正しく返す
      return cachedSegments.map((seg) => ({
        ...seg,
        line: lineNum,
      }));
    }

    // セグメント化
    const segments = this.performSegmentation(line, lineNum, config);

    // フィルタリング
    const filtered = this.filterSegments(segments, config);

    // キャッシュに保存（行番号を除外した状態で保存）
    this.cache.set(
      cacheKey,
      filtered.map((seg) => ({
        ...seg,
        line: 0,
      })),
    );

    return filtered;
  }

  private performSegmentation(
    line: string,
    lineNum: number,
    config: TestConfig,
  ): TestSegment[] {
    const segments: TestSegment[] = [];

    if (!this.hasJapanese(line)) {
      // 英語のみの場合は単語単位でセグメント化
      const wordPattern = /\w+/g;
      let match;
      let colOffset = 1;
      const text = line;

      while ((match = wordPattern.exec(text)) !== null) {
        segments.push({
          text: match[0],
          line: lineNum,
          col: colOffset + match.index,
        });
      }

      return segments;
    }

    // 日本語を含む場合は簡易的なセグメント化
    // 実際の実装ではTinySegmenterを使用
    let col = 1;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const type = this.getCharType(char);

      let word = char;
      let j = i + 1;

      // 同じ文字種の連続を集める
      while (j < line.length) {
        const nextType = this.getCharType(line[j]);
        if (nextType === type && this.canContinue(type, line[j])) {
          word += line[j];
          j++;
        } else {
          break;
        }
      }

      if (word.trim().length > 0) {
        segments.push({
          text: word,
          line: lineNum,
          col: col,
        });
      }

      col += word.length;
      i = j;
    }

    return segments;
  }

  private filterSegments(
    segments: TestSegment[],
    config: TestConfig,
  ): TestSegment[] {
    const minLength = config.japaneseMinWordLength ?? 2;

    return segments.filter((seg) => {
      // 空白のセグメントをスキップ
      if (seg.text.trim().length === 0) {
        return false;
      }

      // 最小単語長でフィルタリング
      if (seg.text.length < minLength) {
        return false;
      }

      return true;
    });
  }

  private getCharType(char: string): string {
    if (/[\u4E00-\u9FAF]/.test(char)) return "kanji";
    if (/[\u3040-\u309F]/.test(char)) return "hiragana";
    if (/[\u30A0-\u30FF]/.test(char)) return "katakana";
    if (/[a-zA-Z]/.test(char)) return "latin";
    if (/[0-9]/.test(char)) return "digit";
    if (/\s/.test(char)) return "space";
    return "other";
  }

  private canContinue(type: string, char: string): boolean {
    // スペースは分割
    if (type === "space") return false;
    if (/\s/.test(char)) return false;
    // その他は連続
    return true;
  }

  isEnabled(config: TestConfig): boolean {
    return config.useJapanese === true && config.enableTinySegmenter === true;
  }

  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: 1000,
      hitRate: 0,
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}
