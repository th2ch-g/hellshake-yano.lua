# ARCHITECTURE_B.md - Phase B: Denops移植版の実装計画

## 目次
1. [実装の基本ルール](#実装の基本ルール)
2. [現状分析](#現状分析)
3. [技術調査結果](#技術調査結果)
4. [実装計画](#実装計画)
5. [技術詳細](#技術詳細)
6. [移行戦略](#移行戦略)
7. [リスク管理](#リスク管理)

---

## 実装の基本ルール

### 🔴 最重要：VimScript実装を正規実装として扱う

Phase B（Denops移植版）の実装において、以下のルールを厳守すること：

1. **VimScript実装が基準**
   - Pure VimScript版（`autoload/hellshake_yano_vim/`）は意図通りに動作する正規実装である
   - Denops版は、VimScript版の動作を**完全に再現**することを目的とする
   - 機能の「改善」や「最適化」よりも、動作の**一致性**を優先する

2. **ヒント表示位置の実装**
   - VimScript版の`display.vim`で実装されている表示位置計算ロジックを正確に移植
   - popup_create()で指定される座標系（line, col）の解釈を厳密に維持
   - オフセットや調整値がある場合、その値も含めて完全に一致させる

3. **ジャンプ機能の実装**
   - VimScript版の`jump.vim`で実装されているカーソル移動ロジックを忠実に再現
   - 範囲チェック、エラーハンドリングも含めて同一の動作を保証
   - ジャンプ後のカーソル位置、スクロール位置も一致させる

4. **テストによる動作保証**
   ```typescript
   // Denops版のテストでは、VimScript版との動作比較を必須とする
   describe("VimScript Compatibility", () => {
     it("should display hints at exact same positions as VimScript version", async () => {
       const vimResult = await getVimScriptHintPositions();
       const denopsResult = await getDenopsHintPositions();
       expect(denopsResult).toEqual(vimResult);
     });

     it("should jump to exact same position as VimScript version", async () => {
       const vimJumpPos = await getVimScriptJumpPosition("a");
       const denopsJumpPos = await getDenopsJumpPosition("a");
       expect(denopsJumpPos).toEqual(vimJumpPos);
     });
   });
   ```

5. **互換性の優先順位**
   - 第1優先：VimScript版との動作一致
   - 第2優先：パフォーマンス最適化
   - 第3優先：コードの簡潔性

### 実装時の注意事項

- VimScript版のコードにコメントで記載されている意図や仕様は、すべてDenops版にも引き継ぐ
- バグのように見える動作でも、それが意図的な実装である可能性があるため、まずVimScript版の動作を基準とする
- 不明な点がある場合は、VimScript版の実際の動作を確認し、それを再現する

### 🔴 最重要事項の再確認

Phase B実装全体を通じて、以下の原則を厳守すること：

#### 1. VimScript版の完全再現
- **VimScript版（`autoload/hellshake_yano_vim/`）の動作が絶対的な基準**
- **特にヒント表示位置とジャンプ機能は、ピクセル単位で完全一致させる**
- **「改良」や「最適化」よりも「完全な再現性」を最優先とする**
- **不明な点は必ずVimScript版の実際の動作を確認し、それを忠実に移植する**

#### 2. 環境別処理の完全分離
- **Vim環境とNeovim環境の処理は可能な限り分離して実装**
- **共通処理を作る場合も、環境固有の部分は必ず独立したメソッドに分割**
- **環境判定は最上位レベルで1度だけ行い、以降は環境専用のコードパスを実行**

#### 3. 既存実装の安全な再利用
- **既存Denops実装を使用する前に必ず副作用をチェック**
- **副作用がある場合は、状態を保存・復元するか、別メソッドとして再実装**
- **読み取り専用・純粋関数のみ直接呼び出し可能**

この計画に従って実装を進めることで、hellshake-yano.vimは真にクロスプラットフォームな、高機能hit-a-hintプラグインへと進化します。その際、**VimScript版で確立された動作を完全に維持**しながら、**環境別の処理を明確に分離**し、**既存コードの副作用を適切に管理**することで、Denopsの利点（TypeScript、TinySegmenter、高速化）を最大限に活用することが成功の鍵となります。

### 環境別処理の分離原則

1. **Vim/Neovim処理の明確な分離**
   ```typescript
   // 推奨：環境ごとに別メソッドとして実装
   export class UnifiedDisplay {
     async showHints(words: Word[], hints: string[]): Promise<number[]> {
       const isVim = await this.isVimEnvironment();

       // 環境ごとに完全に独立したメソッドを呼び出す
       return isVim
         ? await this.showHintsForVim(words, hints)
         : await this.showHintsForNeovim(words, hints);
     }

     // Vim専用の処理（Neovim固有のコードは一切含まない）
     private async showHintsForVim(words: Word[], hints: string[]): Promise<number[]> {
       // Vim環境専用の実装
     }

     // Neovim専用の処理（Vim固有のコードは一切含まない）
     private async showHintsForNeovim(words: Word[], hints: string[]): Promise<number[]> {
       // Neovim環境専用の実装
     }
   }
   ```

2. **既存Denops実装の副作用チェック**
   ```typescript
   // 既存実装を使用する前に必ず副作用を確認
   export class VimBridge {
     async useExistingFunction(param: any): Promise<any> {
       // ステップ1: 既存実装の副作用を分析
       // - グローバル変数の変更はないか？
       // - バッファの状態変更はないか？
       // - カーソル位置の変更はないか？
       // - ハイライトグループの変更はないか？

       // ステップ2: 副作用がない場合のみ直接呼び出し
       if (this.hasNoSideEffects('existingFunction')) {
         return await this.denops.call('existingFunction', param);
       }

       // ステップ3: 副作用がある場合は別メソッドを作成
       return await this.safeExistingFunction(param);
     }

     // 副作用を制御した安全なラッパーメソッド
     private async safeExistingFunction(param: any): Promise<any> {
       // 現在の状態を保存
       const savedState = await this.saveCurrentState();

       try {
         // 既存実装を呼び出し
         const result = await this.denops.call('existingFunction', param);

         // 必要に応じて状態を復元
         await this.restoreState(savedState);

         return result;
       } catch (error) {
         // エラー時も状態を復元
         await this.restoreState(savedState);
         throw error;
       }
     }
   }
   ```

3. **副作用の分類と対処法**

   | 副作用の種類 | 対処方法 | 実装例 |
   |------------|----------|--------|
   | グローバル変数の変更 | 変更前の値を保存・復元 | `let saved = g:var; try { ... } finally { g:var = saved }` |
   | カーソル位置の変更 | getpos()/setpos()で保存・復元 | `let pos = getpos('.'); try { ... } finally { setpos('.', pos) }` |
   | バッファ内容の変更 | 別バッファで処理 or undoで戻す | `new \| try { ... } finally { bdelete! }` |
   | ハイライトの変更 | 一時的なnamespace使用 | `let ns = nvim_create_namespace('temp')` |
   | レジスタの変更 | 事前に保存・復元 | `let reg = getreg('a'); try { ... } finally { setreg('a', reg) }` |

4. **既存実装の安全な再利用パターン**
   ```typescript
   // パターン1: 読み取り専用の関数は安全に使用可能
   const config = await this.denops.call('hellshake_yano#config#get', 'key');

   // パターン2: 純粋関数は安全に使用可能
   const hints = await this.denops.call('hellshake_yano#hint#generate', count);

   // パターン3: 副作用がある関数は分離して実装
   // NG: await this.denops.call('hellshake_yano#core#show');
   // OK: await this.showHintsWithIsolation();
   ```

---

## 現状分析

### 既存実装の二重構造

現在、hellshake-yano.vimには2つの並行実装が存在しています：

#### 1. Pure VimScript実装（Phase A完了）
- **場所**: `autoload/hellshake_yano_vim/`
- **対象**: Vim 8.0+
- **設定**: `g:hellshake_yano_vim_config`
- **完了機能**:
  - Phase A-1: MVP（固定ヒント表示・基本ジャンプ） ✅
  - Phase A-2: 画面内単語検出 ✅
  - Phase A-3: 複数文字ヒント（最大49個） ✅
  - Phase A-4: モーション連打検出 ✅
  - Phase A-5: 高度な機能（70%完了）

```vim
" VimScript実装の構造
autoload/hellshake_yano_vim/
├── core.vim              # 状態管理・統合処理
├── config.vim            # 設定管理
├── word_detector.vim     # 単語検出
├── hint_generator.vim    # ヒント生成
├── display.vim           # 表示制御（popup/extmark）
├── input.vim             # 入力処理
├── jump.vim              # ジャンプ機能
├── motion.vim            # モーション検出
└── visual.vim            # ビジュアルモード対応
```

#### 2. Neovim + Denops実装（既存）
- **場所**: `denops/hellshake-yano/`
- **対象**: Neovim + Denops
- **設定**: `g:hellshake_yano`
- **高度な機能**:
  - TinySegmenterによる日本語単語検出
  - 高度なキャッシュ機構
  - TypeScriptによる高速処理

```typescript
// Denops実装の構造
denops/hellshake-yano/
├── main.ts                          // エントリーポイント
├── config.ts                        // 設定管理（Config型定義）
├── core.ts                          // コア機能
├── display.ts                       // 表示制御
├── word.ts                          // 単語検出
├── hint.ts                          // ヒント生成
├── word/
│   ├── word-segmenter.ts           // TinySegmenter実装
│   ├── word-detector-strategies.ts // 検出戦略
│   └── word-cache.ts               // キャッシュ
└── hint/
    └── hint-generator-strategies.ts // ヒント生成戦略
```

### 設定システムの差異

#### VimScript側設定（`g:hellshake_yano_vim_config`）
```vim
let s:default_config = {
  \ 'enabled': v:true,
  \ 'hint_chars': 'ASDFJKL',
  \ 'motion_enabled': v:true,
  \ 'motion_threshold': 2,
  \ 'motion_timeout_ms': 2000,
  \ 'motion_keys': ['w', 'b', 'e'],
  \ 'use_japanese': v:false,
  \ 'min_word_length': 1,
  \ 'visual_mode_enabled': v:true,
  \ 'max_hints': 49,
  \ 'exclude_numbers': v:false,
  \ 'debug_mode': v:false
\ }
```

#### Neovim側設定（`g:hellshake_yano`）
```typescript
export const DEFAULT_CONFIG: Config = {
  enabled: true,
  markers: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  motionCount: 3,
  motionTimeout: 2000,
  hintPosition: "start",
  triggerOnHjkl: true,
  countedMotions: [],
  maxHints: 336,
  debounceDelay: 50,
  useNumbers: false,
  highlightSelected: false,
  debugCoordinates: false,
  singleCharKeys: ["A","S","D","F","G","H","J","K","L","N","M","0","1","2","3","4","5","6","7","8","9"],
  multiCharKeys: ["B","C","E","I","O","P","Q","R","T","U","V","W","X","Y","Z"],
  maxSingleCharHints: 21,
  useHintGroups: true,
  continuousHintMode: false,
  recenterCommand: "normal! zz",
  maxContinuousJumps: 50,
  highlightHintMarker: "DiffAdd",
  highlightHintMarkerCurrent: "DiffText",
  suppressOnKeyRepeat: true,
  keyRepeatThreshold: 50,
  useJapanese: false,
  wordDetectionStrategy: "hybrid",
  enableTinySegmenter: true,
  segmenterThreshold: 4,
  japaneseMinWordLength: 2,
  japaneseMergeParticles: true,
  japaneseMergeThreshold: 2,
  perKeyMinLength: {},
  defaultMinWordLength: 3,
  perKeyMotionCount: {},
  defaultMotionCount: 3,
  motionCounterEnabled: true,
  motionCounterThreshold: 3,
  motionCounterTimeout: 2000,
  showHintOnMotionThreshold: true,
  debugMode: false,
  performanceLog: false,
  debug: false,
  useNumericMultiCharHints: false,
  bothMinWordLength: 5,
}
```

### 問題点と課題

1. **設定の分裂**: 2つの異なる設定変数（`g:hellshake_yano` vs `g:hellshake_yano_vim_config`）
2. **実装の重複**: 同じ機能が2箇所で別々に実装
3. **メンテナンス負荷**: 機能追加時に両方の実装を更新する必要
4. **日本語対応の欠如**: VimScript版には日本語単語検出がない
5. **パフォーマンス差**: TypeScriptの高速処理がVim環境で活用できない

---

## 技術調査結果

### Denops統合の可能性

#### 既存のDenops連携
```vim
" autoload/hellshake_yano/denops.vim
function! hellshake_yano#denops#call_function(function_name, args, context) abort
  if !hellshake_yano#utils#is_denops_ready()
    return v:false
  endif

  try
    call denops#notify('hellshake-yano', a:function_name, a:args)
    return v:true
  catch
    call hellshake_yano#utils#show_error(printf('[hellshake-yano] Error: %s failed: %s',
          \ a:context, v:exception))
    return v:false
  endtry
endfunction
```

#### Denops API呼び出しパターン
```vim
" 設定更新
call denops#notify('hellshake-yano', 'updateConfig', [g:hellshake_yano])

" ヒント表示（キー指定）
call denops#notify('hellshake-yano', 'showHintsWithKey', [a:key, current_mode])

" デバッグ情報取得
call denops#notify('hellshake-yano', 'debug', [])
```

### TinySegmenterの構造

#### 既存実装（TypeScript）
```typescript
export class TinySegmenter {
  private static instance: TinySegmenter | null = null;
  private segmenter: any | null = null;
  private globalCache: Map<string, string[]> = new Map();
  private enabled: boolean = false;

  static getInstance(): TinySegmenter {
    if (!TinySegmenter.instance) {
      TinySegmenter.instance = new TinySegmenter();
    }
    return TinySegmenter.instance;
  }

  async segment(text: string, config: Config): Promise<SegmentationResult> {
    // キャッシュチェック
    if (this.globalCache.has(text)) {
      return { words: this.globalCache.get(text)!, cached: true };
    }

    // 日本語が含まれない場合はfallback
    if (!this.hasJapanese(text)) {
      return this.fallbackSegmentation(text);
    }

    // TinySegmenterで分割
    const segments = this.segmenter.segment(text);
    const processed = this.postProcessSegments(segments, config);

    // キャッシュに保存
    this.globalCache.set(text, processed);
    return { words: processed, cached: false };
  }
}
```

### 表示メソッドの統合可能性

#### VimScript側（popup_create）
```vim
" autoload/hellshake_yano_vim/display.vim
function! s:show_hint_vim(hint, pos) abort
  let l:popup_id = popup_create(a:hint, {
    \ 'line': a:pos.lnum,
    \ 'col': a:pos.col,
    \ 'minwidth': len(a:hint),
    \ 'maxwidth': len(a:hint),
    \ 'highlight': 'HintMarker',
    \ 'zindex': 1000,
    \ 'wrap': 0
  \ })
  return l:popup_id
endfunction
```

#### Neovim側（extmark）
```vim
function! s:show_hint_neovim(hint, pos) abort
  let s:ns = nvim_create_namespace('hellshake_yano_vim_hint')
  call nvim_buf_set_extmark(0, s:ns, a:pos.lnum - 1, a:pos.col - 1, {
    \ 'virt_text': [[a:hint, 'HintMarker']],
    \ 'virt_text_pos': 'overlay',
    \ 'priority': 1000
  \ })
  return s:ns
endfunction
```

---

## 実装計画

### Phase B-1: 統合基盤構築（2-3日）

#### 1.1 Denopsブリッジレイヤー

**ファイル**: `denops/hellshake-yano/vim-bridge.ts`

```typescript
// VimScript実装をDenopsから呼び出すためのブリッジ
export class VimBridge {
  constructor(private denops: Denops) {}

  async detectWords(): Promise<Word[]> {
    // Vim環境でもTypeScript側の単語検出を使用
    const detector = new VimWordDetector(this.denops);
    return await detector.detectVisible();
  }

  async showHints(words: Word[]): Promise<void> {
    // Vim/Neovimで共通の表示ロジック
    const display = new UnifiedDisplay(this.denops);
    await display.showHints(words);
  }

  async handleInput(hints: Hint[]): Promise<string | null> {
    // ブロッキング入力処理の統合
    const input = new UnifiedInput(this.denops);
    return await input.waitForInput(hints);
  }
}
```

#### 1.2 設定統合システム

**ファイル**: `denops/hellshake-yano/config-unifier.ts`

```typescript
export class ConfigUnifier {
  // 設定変換マップ
  private static readonly CONFIG_MAP = {
    // VimScript側 -> TypeScript側
    'hint_chars': 'markers',
    'motion_threshold': 'motionCount',
    'motion_timeout_ms': 'motionTimeout',
    'motion_keys': 'countedMotions',
    'motion_enabled': 'motionCounterEnabled',
    'visual_mode_enabled': 'visualModeEnabled',
    'max_hints': 'maxHints',
    'min_word_length': 'defaultMinWordLength',
    'exclude_numbers': 'excludeNumbers',
    'debug_mode': 'debugMode',
    'use_japanese': 'useJapanese',
  };

  static unifyConfig(vimConfig: any, denopsConfig: any): Config {
    // 両設定をマージして統一設定を生成
    const unified: Config = { ...DEFAULT_CONFIG };

    // g:hellshake_yano_vim_config からの変換
    if (vimConfig) {
      for (const [vimKey, tsKey] of Object.entries(this.CONFIG_MAP)) {
        if (vimKey in vimConfig) {
          (unified as any)[tsKey] = vimConfig[vimKey];
        }
      }
    }

    // g:hellshake_yano からの適用（優先）
    if (denopsConfig) {
      Object.assign(unified, denopsConfig);
    }

    return unified;
  }

  static async migrateConfig(denops: Denops): Promise<void> {
    // 既存設定の自動マイグレーション
    const hasOldConfig = await denops.eval("exists('g:hellshake_yano_vim_config')");
    const hasNewConfig = await denops.eval("exists('g:hellshake_yano')");

    if (hasOldConfig && !hasNewConfig) {
      const oldConfig = await denops.eval("g:hellshake_yano_vim_config");
      const newConfig = this.convertOldToNew(oldConfig);
      await denops.cmd("let g:hellshake_yano = " + JSON.stringify(newConfig));

      // 廃止予定警告
      await denops.cmd(`
        echohl WarningMsg |
        echo '[hellshake-yano] g:hellshake_yano_vim_config is deprecated. ' |
        echo 'Your settings have been migrated to g:hellshake_yano.' |
        echohl None
      `);
    }
  }
}
```

### Phase B-2: コア機能の移植（3-4日）

#### 🔴 重要：VimScript版の動作を完全再現する

このフェーズでは、VimScript版の実装を**1行単位で正確に移植**することが最重要です。
特に以下のモジュールは、VimScript版の動作を完全に再現する必要があります：

1. **display.vim → unified-display.ts**
   - `s:show_hint_vim()`と`s:show_hint_neovim()`の座標計算を完全一致
   - popup_create()のオプション（line, col, minwidth, maxwidth, highlight, zindex, wrap）を同一値で実装
   - エラー時の戻り値も含めて完全互換

2. **jump.vim → unified-jump.ts**
   - `hellshake_yano_vim#jump#jump_to_word()`のロジックを忠実に再現
   - 範囲チェック（1 <= lnum <= line('$'), 1 <= col <= col('$')）を同一実装
   - カーソル移動コマンド（cursor()）の動作を完全再現

3. **input.vim → unified-input.ts**
   - `s:wait_for_input()`のブロッキング処理を同一タイミングで実装
   - 部分マッチ判定（`s:get_partial_matches()`）のロジックを完全一致
   - ESCキーやCtrl-Cでのキャンセル処理も同一動作

#### 2.1 統合単語検出器

**ファイル**: `denops/hellshake-yano/unified-word-detector.ts`

```typescript
export class UnifiedWordDetector {
  private tinySegmenter: TinySegmenter;
  private cache: WordCache;

  constructor(private denops: Denops, private config: Config) {
    this.tinySegmenter = TinySegmenter.getInstance();
    this.cache = new WordCache();
  }

  async detectVisible(): Promise<Word[]> {
    const [startLine, endLine] = await this.getVisibleRange();
    const lines = await this.getLines(startLine, endLine);

    const words: Word[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = startLine + i;

      // 日本語対応
      if (this.config.useJapanese && this.tinySegmenter.hasJapanese(line)) {
        const segments = await this.tinySegmenter.segment(line, this.config);
        words.push(...this.convertSegmentsToWords(segments.words, lineNum));
      } else {
        // 通常の正規表現ベース検出
        words.push(...this.detectByRegex(line, lineNum));
      }
    }

    return this.filterWords(words);
  }

  private async getVisibleRange(): Promise<[number, number]> {
    const start = await this.denops.eval("line('w0')") as number;
    const end = await this.denops.eval("line('w$')") as number;
    return [start, end];
  }

  private detectByRegex(line: string, lineNum: number): Word[] {
    const words: Word[] = [];
    const regex = /\w+/g;
    let match;

    while ((match = regex.exec(line)) !== null) {
      words.push({
        text: match[0],
        lnum: lineNum,
        col: match.index + 1,
        end_col: match.index + match[0].length,
      });
    }

    return words;
  }

  private filterWords(words: Word[]): Word[] {
    // 設定に基づくフィルタリング
    return words
      .filter(w => w.text.length >= this.config.defaultMinWordLength)
      .filter(w => !this.config.excludeNumbers || !/^\d+$/.test(w.text))
      .slice(0, this.config.maxHints);
  }
}
```

#### 2.2 統合表示システム

**ファイル**: `denops/hellshake-yano/unified-display.ts`

```typescript
/**
 * 重要：このクラスはVimScript版のdisplay.vimの動作を完全に再現する
 * 特に座標計算とオプション値は1つも変更してはいけない
 * さらに、Vim/Neovim環境の処理は完全に分離して実装する
 */
export class UnifiedDisplay {
  constructor(private denops: Denops) {}

  /**
   * VimScript版の hellshake_yano_vim#display#show_hints() を完全再現
   * 環境判定後、それぞれ独立したメソッドに処理を委譲
   */
  async showHints(words: Word[], hints: string[]): Promise<number[]> {
    const isVim = await this.denops.eval("!has('nvim')") as boolean;

    // 重要：環境ごとに完全に独立したメソッドを呼び出す
    // 共通処理は一切含まない
    return isVim
      ? await this.showHintsForVim(words, hints)
      : await this.showHintsForNeovim(words, hints);
  }

  /**
   * Vim環境専用のヒント表示実装
   * popup_create()を使用した処理のみを含む
   */
  private async showHintsForVim(words: Word[], hints: string[]): Promise<number[]> {
    const ids: number[] = [];

    for (let i = 0; i < words.length && i < hints.length; i++) {
      const id = await this.showHintVim(hints[i], words[i]);
      ids.push(id);
    }

    return ids;
  }

  /**
   * Neovim環境専用のヒント表示実装
   * nvim_buf_set_extmark()を使用した処理のみを含む
   */
  private async showHintsForNeovim(words: Word[], hints: string[]): Promise<number[]> {
    const ids: number[] = [];
    const ns = await this.denops.eval("nvim_create_namespace('hellshake_yano_hint')") as number;

    for (let i = 0; i < words.length && i < hints.length; i++) {
      await this.showHintNeovim(hints[i], words[i], ns);
      ids.push(ns);
    }

    return ids;
  }

  /**
   * VimScript版の s:show_hint_vim() を完全再現
   * popup_create()のすべてのオプションを同一値で実装
   */
  private async showHintVim(hint: string, word: Word): Promise<number> {
    // 重要：以下のオプション値はVimScript版から1つも変更しないこと
    const cmd = `popup_create("${hint}", {
      \ 'line': ${word.lnum},
      \ 'col': ${word.col},
      \ 'minwidth': ${hint.length},
      \ 'maxwidth': ${hint.length},
      \ 'highlight': 'HintMarker',
      \ 'zindex': 1000,
      \ 'wrap': 0
    })`;

    return await this.denops.eval(cmd) as number;
  }

  /**
   * VimScript版の s:show_hint_neovim() を完全再現
   * nvim_buf_set_extmark()のすべてのオプションを同一値で実装
   * 注：namespaceは呼び出し元で管理し、引数として受け取る
   */
  private async showHintNeovim(hint: string, word: Word, namespace: number): Promise<void> {
    // 重要：以下のオプション値はVimScript版から1つも変更しないこと
    await this.denops.call("nvim_buf_set_extmark", 0, namespace, word.lnum - 1, word.col - 1, {
      virt_text: [[hint, "HintMarker"]],
      virt_text_pos: "overlay",
      priority: 1000,
    });
  }

  /**
   * ヒント非表示処理も環境ごとに完全分離
   */
  async hideHints(ids: number[]): Promise<void> {
    const isVim = await this.denops.eval("!has('nvim')") as boolean;

    return isVim
      ? await this.hideHintsForVim(ids)
      : await this.hideHintsForNeovim(ids);
  }

  /**
   * Vim環境専用のヒント非表示処理
   * popup_close()のみを使用
   */
  private async hideHintsForVim(ids: number[]): Promise<void> {
    for (const id of ids) {
      await this.denops.call("popup_close", id);
    }
  }

  /**
   * Neovim環境専用のヒント非表示処理
   * nvim_buf_clear_namespace()のみを使用
   */
  private async hideHintsForNeovim(ids: number[]): Promise<void> {
    if (ids.length > 0) {
      const ns = ids[0]; // Neovimでは namespace を使用
      await this.denops.call("nvim_buf_clear_namespace", 0, ns, 0, -1);
    }
  }
}
```

### Phase B-3: 高度な機能の統合（2-3日）

#### 3.1 日本語対応の統合

**ファイル**: `denops/hellshake-yano/japanese-support.ts`

```typescript
export class JapaneseSupport {
  private segmenter: TinySegmenter;

  constructor() {
    this.segmenter = TinySegmenter.getInstance();
  }

  async enableForVim(denops: Denops): Promise<void> {
    // Vim環境でもTinySegmenterを有効化
    this.segmenter.setEnabled(true);

    // VimScript側に日本語対応フラグを設定
    await denops.cmd("let g:hellshake_yano.useJapanese = v:true");
    await denops.cmd("let g:hellshake_yano.enableTinySegmenter = v:true");
  }

  async processText(text: string, config: Config): Promise<string[]> {
    if (!this.segmenter.hasJapanese(text)) {
      return [text];
    }

    const result = await this.segmenter.segment(text, config);
    return result.words;
  }
}
```

#### 3.2 統合モーション検出

**ファイル**: `denops/hellshake-yano/unified-motion.ts`

```typescript
export class UnifiedMotionDetector {
  private motionCounts: Map<string, number> = new Map();
  private lastMotionTime: Map<string, number> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(private denops: Denops, private config: Config) {}

  async handleMotion(key: string): Promise<boolean> {
    const now = Date.now();
    const lastTime = this.lastMotionTime.get(key) || 0;
    const elapsed = now - lastTime;

    // タイムアウトチェック
    if (elapsed > this.config.motionTimeout) {
      this.motionCounts.set(key, 1);
    } else {
      const count = (this.motionCounts.get(key) || 0) + 1;
      this.motionCounts.set(key, count);

      // 閾値に達した場合
      if (count >= this.getThreshold(key)) {
        this.resetCount(key);
        return true; // ヒント表示をトリガー
      }
    }

    this.lastMotionTime.set(key, now);
    this.setResetTimer(key);
    return false;
  }

  private getThreshold(key: string): number {
    if (this.config.perKeyMotionCount && key in this.config.perKeyMotionCount) {
      return this.config.perKeyMotionCount[key];
    }
    return this.config.defaultMotionCount;
  }

  private setResetTimer(key: string): void {
    // 既存のタイマーをクリア
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
    }

    // 新しいタイマーを設定
    const timer = setTimeout(() => {
      this.resetCount(key);
    }, this.config.motionTimeout);

    this.timers.set(key, timer);
  }

  private resetCount(key: string): void {
    this.motionCounts.set(key, 0);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
      this.timers.delete(key);
    }
  }
}
```

### Phase B-4: 統合エントリーポイント（1-2日）

#### 4.1 統合プラグインファイル

**ファイル**: `plugin/hellshake-yano-unified.vim`

```vim
" hellshake-yano-unified.vim - 統合エントリーポイント
" Author: hellshake-yano
" License: MIT

" 実装選択ロジック
function! s:select_implementation() abort
  " 1. Denopsが利用可能な場合は統合版を使用
  if exists('g:loaded_denops') && denops#server#status() !=# 'stopped'
    " Vim環境でもDenops実装を使用
    return 'denops-unified'
  endif

  " 2. Denopsが無い場合はPure VimScript版にフォールバック
  if has('nvim')
    " NeovimでDenopsが無い場合は警告
    echohl WarningMsg
    echo '[hellshake-yano] Denops is not available. Some features may be limited.'
    echohl None
  endif

  return 'vimscript-pure'
endfunction

" 実装の初期化
function! s:initialize() abort
  let l:impl = s:select_implementation()

  if l:impl ==# 'denops-unified'
    " 統合版の初期化
    call s:initialize_unified()
  else
    " Pure VimScript版の初期化
    call hellshake_yano_vim#core#init()
    call s:setup_vimscript_mappings()
  endif

  " 設定マイグレーション
  call s:migrate_config()
endfunction

" 統合版の初期化
function! s:initialize_unified() abort
  " 設定の統一
  call denops#notify('hellshake-yano', 'unifyConfig', [
    \ get(g:, 'hellshake_yano_vim_config', {}),
    \ get(g:, 'hellshake_yano', {})
  \ ])

  " コマンド定義
  command! -nargs=0 HellshakeYanoShow
    \ call denops#notify('hellshake-yano', 'showHints', [])
  command! -nargs=0 HellshakeYanoHide
    \ call denops#notify('hellshake-yano', 'hideHints', [])
  command! -nargs=0 HellshakeYanoToggle
    \ call denops#notify('hellshake-yano', 'toggle', [])

  " キーマッピング
  call s:setup_unified_mappings()
endfunction

" 設定のマイグレーション
function! s:migrate_config() abort
  " g:hellshake_yano_vim_config が存在し、g:hellshake_yano が存在しない場合
  if exists('g:hellshake_yano_vim_config') && !exists('g:hellshake_yano')
    let g:hellshake_yano = {}

    " 設定の変換
    for [old_key, new_key] in [
      \ ['hint_chars', 'markers'],
      \ ['motion_threshold', 'motionCount'],
      \ ['motion_timeout_ms', 'motionTimeout'],
      \ ['motion_keys', 'countedMotions'],
      \ ['motion_enabled', 'motionCounterEnabled'],
      \ ['visual_mode_enabled', 'visualModeEnabled'],
      \ ['max_hints', 'maxHints'],
      \ ['min_word_length', 'defaultMinWordLength'],
      \ ['use_japanese', 'useJapanese'],
      \ ['debug_mode', 'debugMode'],
    \ ]
      if has_key(g:hellshake_yano_vim_config, old_key)
        let g:hellshake_yano[new_key] = g:hellshake_yano_vim_config[old_key]
      endif
    endfor

    " 廃止予定警告
    echohl WarningMsg
    echo '[hellshake-yano] Note: g:hellshake_yano_vim_config is deprecated.'
    echo 'Your settings have been migrated to g:hellshake_yano.'
    echo 'Please update your configuration to use g:hellshake_yano directly.'
    echohl None
  endif
endfunction

" 統合版のマッピング設定
function! s:setup_unified_mappings() abort
  " モーション検出マッピング
  if get(g:hellshake_yano, 'motionCounterEnabled', v:true)
    for key in get(g:hellshake_yano, 'countedMotions', ['w', 'b', 'e'])
      execute printf('nnoremap <silent> %s :<C-u>call <SID>handle_motion("%s")<CR>',
        \ key, key)
    endfor
  endif

  " ビジュアルモード対応
  if get(g:hellshake_yano, 'visualModeEnabled', v:true)
    xnoremap <silent> <Leader>h :<C-u>call <SID>show_hints_visual()<CR>
  endif
endfunction

" モーションハンドラー
function! s:handle_motion(key) abort
  " Denopsに処理を委譲
  call denops#notify('hellshake-yano', 'handleMotion', [a:key])

  " 通常のモーションも実行
  execute 'normal!' a:key
endfunction
```

---

## 技術詳細

### Denops APIの活用

#### 非同期処理の最適化
```typescript
// バッチ処理による高速化
export async function detectAndShowHints(denops: Denops): Promise<void> {
  const batch = denops.batch();

  // 複数の操作をバッチ化
  batch.eval("line('w0')");
  batch.eval("line('w$')");
  batch.eval("getline(line('w0'), line('w$'))");

  const [startLine, endLine, lines] = await batch.execute();

  // 並列処理
  const [words, hints] = await Promise.all([
    detectWords(lines as string[]),
    generateHints(lines.length),
  ]);

  await showHints(denops, words, hints);
}
```

#### エラーハンドリング
```typescript
export function withFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  context: string,
): Promise<T> {
  return fn().catch(error => {
    console.error(`[hellshake-yano] ${context}:`, error);
    return fallback;
  });
}
```

### パフォーマンス最適化

#### キャッシュ戦略
```typescript
export class UnifiedCache {
  private wordCache: Map<string, Word[]> = new Map();
  private hintCache: Map<number, string[]> = new Map();
  private segmentCache: Map<string, string[]> = new Map();

  // LRU実装
  private maxSize = 1000;
  private accessOrder: string[] = [];

  get(key: string): any {
    if (this.wordCache.has(key)) {
      this.updateAccessOrder(key);
      return this.wordCache.get(key);
    }
    return null;
  }

  set(key: string, value: any): void {
    if (this.accessOrder.length >= this.maxSize) {
      const oldest = this.accessOrder.shift()!;
      this.wordCache.delete(oldest);
    }

    this.wordCache.set(key, value);
    this.updateAccessOrder(key);
  }

  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }
}
```

### 互換性レイヤー

#### VimScript互換API
```typescript
// VimScript関数の互換実装
export class VimScriptCompat {
  static async callVimFunction(
    denops: Denops,
    name: string,
    args: unknown[],
  ): Promise<unknown> {
    // VimScript側の関数を呼び出し
    try {
      return await denops.call(name, ...args);
    } catch (error) {
      // Pure VimScript版へのフォールバック
      const fallbackName = name.replace('#', '_vim#');
      return await denops.call(fallbackName, ...args);
    }
  }
}
```

---

## 移行戦略

### 段階的移行計画

#### Phase 1: 並行稼働（1-2週間）
- 両実装を共存させ、ユーザーが選択可能
- `g:hellshake_yano_use_unified = v:true` で統合版を有効化
- デフォルトは既存実装を使用

#### Phase 2: ベータテスト（2-3週間）
- 統合版をデフォルトに変更
- `g:hellshake_yano_use_legacy = v:true` で旧実装に切り替え可能
- フィードバック収集と不具合修正

#### Phase 3: 完全移行（1ヶ月後）
- 統合版のみをサポート
- 旧実装は廃止予定として警告表示
- ドキュメント更新

### 設定移行ガイド

#### 移行前（VimScript版）
```vim
" .vimrc
let g:hellshake_yano_vim_config = {
  \ 'motion_threshold': 3,
  \ 'motion_timeout_ms': 2000,
  \ 'hint_chars': 'ASDFJKL',
  \ 'use_japanese': v:false,
  \ 'max_hints': 49
\ }
```

#### 移行後（統合版）
```vim
" .vimrc
let g:hellshake_yano = {
  \ 'motionCount': 3,
  \ 'motionTimeout': 2000,
  \ 'markers': 'ASDFJKL',
  \ 'useJapanese': v:false,
  \ 'maxHints': 49
\ }
```

### 自動移行スクリプト
```vim
" 設定自動変換スクリプト
function! HellshakeYanoMigrateConfig() abort
  if !exists('g:hellshake_yano_vim_config')
    echo "No old configuration found."
    return
  endif

  let l:new_config = {}

  " マッピングテーブル
  let l:mapping = {
    \ 'hint_chars': 'markers',
    \ 'motion_threshold': 'motionCount',
    \ 'motion_timeout_ms': 'motionTimeout',
    \ 'motion_keys': 'countedMotions',
    \ 'motion_enabled': 'motionCounterEnabled',
    \ 'visual_mode_enabled': 'visualModeEnabled',
    \ 'max_hints': 'maxHints',
    \ 'min_word_length': 'defaultMinWordLength',
    \ 'use_japanese': 'useJapanese',
    \ 'debug_mode': 'debugMode'
  \ }

  for [old, new] in items(l:mapping)
    if has_key(g:hellshake_yano_vim_config, old)
      let l:new_config[new] = g:hellshake_yano_vim_config[old]
    endif
  endfor

  " 新しい設定を表示
  echo "Migrated configuration:"
  echo "let g:hellshake_yano = " . string(l:new_config)

  " クリップボードにコピー
  let @+ = "let g:hellshake_yano = " . string(l:new_config)
  echo ""
  echo "Configuration copied to clipboard!"
endfunction

command! HellshakeYanoMigrate call HellshakeYanoMigrateConfig()
```

---

## リスク管理

### 技術的リスク

#### リスク1: Denops依存の増加
- **影響**: Denopsが必須となり、インストール難易度が上がる
- **対策**:
  - Pure VimScript版のfallback機能を維持
  - Denops自動インストールスクリプトの提供
  - 詳細なインストールガイドの作成

#### リスク2: パフォーマンス劣化
- **影響**: TypeScript処理のオーバーヘッドで遅延発生
- **対策**:
  - バッチ処理とキャッシュの積極活用
  - クリティカルパスの最適化
  - パフォーマンスベンチマークの定期実行

#### リスク3: 後方互換性の破壊
- **影響**: 既存ユーザーの設定が動作しなくなる
- **対策**:
  - 自動マイグレーション機能の実装
  - 廃止予定期間の設定（最低3ヶ月）
  - 詳細な移行ガイドの提供

### 運用リスク

#### リスク1: メンテナンス負荷
- **影響**: 統合版のバグ対応で開発速度が低下
- **対策**:
  - 包括的なテストスイートの整備
  - CI/CDパイプラインの強化
  - モジュール分離によるテスト容易性向上

#### リスク2: ドキュメント更新
- **影響**: ドキュメントの不整合でユーザー混乱
- **対策**:
  - バージョン別ドキュメントの維持
  - 自動ドキュメント生成ツールの導入
  - ユーザーフィードバックの積極的収集

### 成功指標

1. **機能完全性**: VimScript版の全機能がDenops版で動作
2. **パフォーマンス**: 起動時間が既存版の±20%以内
3. **互換性**: 既存設定の90%以上が自動移行可能
4. **採用率**: 3ヶ月後に70%以上のユーザーが統合版を使用
5. **品質**: バグ報告数が既存版と同等以下

---

## まとめ

Phase B実装により、以下を実現します：

1. **統一された実装**: Vim/Neovim両環境でDenopsベースの高機能版を提供
2. **設定の一元化**: `g:hellshake_yano` への統一で設定管理を簡素化
3. **日本語対応**: TinySegmenterによる高精度な日本語単語検出
4. **パフォーマンス向上**: TypeScriptとキャッシュによる高速化
5. **保守性向上**: 単一コードベースでメンテナンス効率化

