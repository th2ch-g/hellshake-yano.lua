# キャッシュタイプ一覧と用途

## 概要

UnifiedCacheシステムは16種類のキャッシュタイプを提供し、それぞれが特定の用途に最適化されています。各キャッシュタイプには適切な最大サイズが設定されており、LRUアルゴリズムによって効率的にメモリが管理されます。

## キャッシュタイプ詳細

### WORDS (最大サイズ: 1000)
**用途**: 単語検出結果のキャッシュ

ファイルごとの単語検出結果を保存します。大量のファイルを扱うため、最も大きなキャッシュサイズが割り当てられています。

```typescript
const wordsCache = cache.getCache<string, string[]>(CacheType.WORDS);
wordsCache.set("file.ts", ["const", "function", "return"]);
```

### HINTS (最大サイズ: 500)
**用途**: ヒント生成結果のキャッシュ

生成されたヒント文字列を保存します。頻繁にアクセスされるため、中程度のキャッシュサイズが設定されています。

```typescript
const hintsCache = cache.getCache<string, string[]>(CacheType.HINTS);
hintsCache.set("hint-key", ["a", "b", "c", "d"]);
```

### DISPLAY (最大サイズ: 200)
**用途**: 表示情報のキャッシュ

画面表示に関連する計算結果（座標、幅、高さなど）を保存します。

```typescript
const displayCache = cache.getCache<string, DisplayInfo>(CacheType.DISPLAY);
displayCache.set("window-1", { width: 80, height: 24 });
```

### ANALYSIS (最大サイズ: 300)
**用途**: 解析結果のキャッシュ

コード解析、構文解析、その他の複雑な計算結果を保存します。

```typescript
const analysisCache = cache.getCache<string, AnalysisResult>(CacheType.ANALYSIS);
analysisCache.set("analysis-1", { complexity: 5, issues: [] });
```

### TEMP (最大サイズ: 100)
**用途**: 一時的なデータのキャッシュ

短期間だけ保持する必要がある一時データを保存します。小さめのサイズで頻繁に更新されます。

```typescript
const tempCache = cache.getCache<string, any>(CacheType.TEMP);
tempCache.set("temp-calculation", { value: 42 });
```

### HINT_ASSIGNMENT_NORMAL (最大サイズ: 100)
**用途**: ノーマルモード用ヒント割り当てキャッシュ

Vimのノーマルモード時のヒント割り当て情報を保存します。

```typescript
const normalCache = cache.getCache<string, Word[]>(CacheType.HINT_ASSIGNMENT_NORMAL);
normalCache.set("normal-hints", wordsWithHints);
```

### HINT_ASSIGNMENT_VISUAL (最大サイズ: 100)
**用途**: ビジュアルモード用ヒント割り当てキャッシュ

Vimのビジュアルモード時のヒント割り当て情報を保存します。

```typescript
const visualCache = cache.getCache<string, Word[]>(CacheType.HINT_ASSIGNMENT_VISUAL);
visualCache.set("visual-hints", visualWordsWithHints);
```

### HINT_ASSIGNMENT_OTHER (最大サイズ: 100)
**用途**: その他モード用ヒント割り当てキャッシュ

その他のVimモード（挿入モード、コマンドモードなど）用のヒント割り当て情報を保存します。

```typescript
const otherCache = cache.getCache<string, Word[]>(CacheType.HINT_ASSIGNMENT_OTHER);
otherCache.set("other-hints", otherWordsWithHints);
```

### LANGUAGE_RULES (最大サイズ: 50)
**用途**: 言語ルールのキャッシュ

プログラミング言語ごとの構文ルール、キーワード、パターンを保存します。頻繁に変更されないため、小さめのサイズです。

```typescript
const rulesCache = cache.getCache<string, LanguageRule>(CacheType.LANGUAGE_RULES);
rulesCache.set("typescript", { keywords: ["const", "let", "var"] });
```

### SYNTAX_CONTEXT (最大サイズ: 200)
**用途**: シンタックスコンテキストのキャッシュ

現在のカーソル位置の構文コンテキスト（関数内、コメント内、文字列内など）を保存します。

```typescript
const contextCache = cache.getCache<string, SyntaxContext>(CacheType.SYNTAX_CONTEXT);
contextCache.set("cursor-context", { inFunction: true, inComment: false });
```

### DICTIONARY (最大サイズ: 2000)
**用途**: 辞書データのキャッシュ

カスタム辞書、スペルチェック結果、単語の正規化形式などを保存します。最も大きなキャッシュサイズの一つです。

```typescript
const dictCache = cache.getCache<string, boolean>(CacheType.DICTIONARY);
dictCache.set("customWord", true);
```

### CHAR_WIDTH (最大サイズ: 500)
**用途**: 文字幅計算のキャッシュ

Unicode文字の表示幅計算結果を保存します。日本語、絵文字、特殊文字の幅計算に使用されます。

```typescript
const charWidthCache = cache.getCache<number, number>(CacheType.CHAR_WIDTH);
charWidthCache.set(0x3042, 2); // 'あ' の幅は2
```

### CHAR_TYPE (最大サイズ: 1000)
**用途**: 文字種判定のキャッシュ

文字の種類（英数字、ひらがな、カタカナ、漢字など）の判定結果を保存します。

```typescript
const charTypeCache = cache.getCache<string, CharType>(CacheType.CHAR_TYPE);
charTypeCache.set("あ", CharType.HIRAGANA);
```

### BYTE_LENGTH (最大サイズ: 300)
**用途**: バイト長計算のキャッシュ

文字列のバイト長計算結果を保存します。エンコーディング変換時に使用されます。

```typescript
const byteLengthCache = cache.getCache<string, number>(CacheType.BYTE_LENGTH);
byteLengthCache.set("こんにちは", 15); // UTF-8で15バイト
```

### ADJACENCY (最大サイズ: 200)
**用途**: 隣接単語のキャッシュ

単語の隣接関係、近接性の計算結果を保存します。ヒント生成の最適化に使用されます。

```typescript
const adjacencyCache = cache.getCache<string, AdjacentWords>(CacheType.ADJACENCY);
adjacencyCache.set("word1", { before: "word0", after: "word2" });
```

### WORD_DETECTION (最大サイズ: 100)
**用途**: 単語検出のキャッシュ

単語境界検出、トークナイズ結果などを保存します。パフォーマンスクリティカルな処理で使用されます。

```typescript
const detectionCache = cache.getCache<string, DetectionResult>(CacheType.WORD_DETECTION);
detectionCache.set("line-1", { words: ["hello", "world"], boundaries: [0, 5, 6, 11] });
```

## キャッシュサイズの設計思想

キャッシュサイズは以下の要因を考慮して決定されています：

### 大容量キャッシュ（1000-2000）
- **WORDS**: ファイル数が多い環境でも対応
- **DICTIONARY**: 大量の単語を扱う
- **CHAR_TYPE**: Unicode文字の多様性に対応

### 中容量キャッシュ（200-500）
- **HINTS**: 頻繁にアクセスされる
- **DISPLAY**: ウィンドウごとの情報
- **ANALYSIS**: 複雑な計算結果
- **SYNTAX_CONTEXT**: カーソル移動ごとに更新
- **CHAR_WIDTH**: よく使われる文字を優先
- **BYTE_LENGTH**: 一般的な文字列長に対応
- **ADJACENCY**: 画面内の単語関係

### 小容量キャッシュ（50-100）
- **TEMP**: 短期間のみ保持
- **HINT_ASSIGNMENT_***: モードごとに分離
- **LANGUAGE_RULES**: 言語数は限定的
- **WORD_DETECTION**: 行単位の処理

## 使用ガイドライン

### 適切なキャッシュタイプの選択

1. **データの性質を考慮**
   - 頻繁に変更される → TEMP
   - ファイルごとに保存 → WORDS, ANALYSIS
   - グローバルに共有 → DICTIONARY, LANGUAGE_RULES

2. **アクセスパターンを考慮**
   - 高頻度アクセス → HINTS, DISPLAY
   - 低頻度アクセス → LANGUAGE_RULES
   - バースト的アクセス → TEMP

3. **メモリ効率を考慮**
   - 大きなデータ → 小さいキャッシュタイプを選択
   - 小さなデータ → 適切なサイズのキャッシュを選択

### パフォーマンスチューニング

```typescript
// キャッシュタイプごとの統計を確認
const stats = cache.getAllStats();

// ヒット率が低いキャッシュを特定
Object.entries(stats).forEach(([type, stat]) => {
  if (stat.hitRate < 50) {
    console.log(`${type}: Low hit rate (${stat.hitRate}%)`);
    // 必要に応じてキャッシュ戦略を見直す
  }
});

// エビクション率が高いキャッシュを特定
Object.entries(stats).forEach(([type, stat]) => {
  const evictionRate = stat.evictions / (stat.hits + stat.misses);
  if (evictionRate > 0.3) {
    console.log(`${type}: High eviction rate (${(evictionRate * 100).toFixed(1)}%)`);
    // キャッシュサイズの増加を検討
  }
});
```

## まとめ

UnifiedCacheシステムの16種類のキャッシュタイプは、それぞれ特定の用途に最適化されています。適切なキャッシュタイプを選択し、統計情報を活用することで、アプリケーションのパフォーマンスを最大化できます。