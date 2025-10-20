# rule
- git add, git commitの実行は、ユーザに実行の許可を得ること

## Active Specs
- continuous-hint-recenter-loop: 連続ヒントモードでジャンプ後にカーソルを再センタリングし、ヒントを自動再表示する機能の設計開始
- 連続ヒント機能追加: PLAN.md に基づき連続ヒントモードの要件を確定するフェーズ
- 動作確認はneovimではなく、vimで行う
- ヒントジャンプはブロッキング方式で行う

## Implementation Status (実装状況)

### Phase D-6: Process3 - TinySegmenter連携実装
- **Sub1: Denops TinySegmenter連携** ✅ 完了（2025-10-20）
  - `autoload/hellshake_yano_vim/japanese.vim` 実装完了
  - Denops経由でTinySegmenterを呼び出し
  - キャッシュ機能活用（LRU、最大1000エントリ）

- **Sub2: word_detector.vim統合** ✅ 完了（2025-10-20）
  - **TDD Step 1: Red（テスト作成）** ✅ 完了
    - `tests-vim/test_process3_sub2.vim`: 25テストケース作成完了
    - `tests-vim/test_process3_sub2_simple.vim`: 簡易テスト10件作成完了
    - テスト分類: 日本語検出、混在テキスト、後方互換性、エッジケース、Per-Key統合
  - **TDD Step 2: Green（実装）** ✅ 完了済み
    - `s:detect_japanese_words()`: 日本語単語検出実装完了
    - `s:detect_english_words()`: 英数字単語検出実装完了
    - `detect_visible()`: 日本語判定ロジック統合完了
    - 座標計算: `stridx()`でUTF-8対応、`screenpos()`で折り返し対応
  - **TDD Step 3: Refactor（リファクタリング）** ✅ 完了（2025-10-20）
    - コードの可読性: 関数分割済み、詳細なコメント、明確な変数名
    - パフォーマンス: キャッシュ活用、ループ効率化、重複処理防止
    - エッジケース: 空白セグメント除外、最小単語長フィルタ、無限ループ防止
    - 回帰テスト: 型チェック成功、既存機能保持確認、パフォーマンス特性確認
  - **型チェック**: ✅ `deno check` 全ファイル成功（2025-10-20）

### Phase D-6: Process50 - Neovimキーリピート抑制機能のVim移植
- **Sub1: Vim専用の状態管理を追加** ✅ 完了（2025-10-20）
  - **TDD Step 1: Red（テスト作成）** ✅ 完了
    - `tests-vim/test_process50_sub1.vim`: 12テストケース作成完了
    - `tests-vim/test_process50_sub1_simple.vim`: 簡易テスト4件作成完了
    - テスト分類: 状態管理、タイマー処理、複数バッファ独立性
  - **TDD Step 2: Green（実装）** ✅ 完了
    - `autoload/hellshake_yano_vim/key_repeat.vim`: 新規作成完了
    - 状態管理: `get_last_key_time()`, `set_last_key_time()`, `is_repeating()`, `set_repeating()`
    - タイマー管理: `set_reset_timer()`, `reset_state()`
    - 内部関数: `s:stop_timer()` 実装（コード重複排除）
    - 全12テスト成功、型チェック成功
  - **TDD Step 3: Refactor（リファクタリング）** ✅ 完了（2025-10-20）
    - コードの可読性: 関数分割済み、詳細なコメント、明確な変数名
    - パフォーマンス: 辞書による高速アクセス、タイマー処理の効率化
    - エラーハンドリング: try-catch実装、安全なタイマー停止
    - 回帰テスト: 全12テスト成功、型チェック成功
  - **型チェック**: ✅ `deno check` 全ファイル成功（2025-10-20）

### 次のステップ
1. Process50 Sub2: キーリピート検出ロジックの追加（motion.vim統合）
2. Process50 Sub3: motion#handle()への統合
3. Process50 Sub4: テストと検証
4. Process4: 辞書システム（Phase D-7）の実装
5. ドキュメンテーションとリリース準備

## Coordinate Systems (座標系の知見)

### Vimの座標系基礎

#### 座標関数の違い
- **`col()`**: バイト位置を返す（1-indexed）
  - UTF-8で日本語は3バイトだが、`col()`では1桁としてカウント
  - 例: `"Hello世界"` で「世」の位置 → `col() = 6`（バイト位置）

- **`virtcol()`**: 仮想桁を返す（表示幅ベース、1-indexed）
  - 全角文字は2桁、半角文字は1桁としてカウント
  - 例: `"Hello世界"` で「世」の位置 → `virtcol() = 7`（"Hello"=5, "世"=2で開始位置7）

- **`screenpos(winid, lnum, col)`**: 論理座標→画面座標変換
  - 戻り値: `{'row': 画面行, 'col': 画面列, ...}`
  - **折り返し表示に対応**: 論理行1が画面行1+2に分かれる場合を正しく処理

#### バイト位置 vs 文字位置 vs 表示幅
```vim
let line = "# title: Phase D - Vim機能の完成"

" 「機能」の位置
let byte_pos = stridx(line, "機能")  " => 22（バイト位置、0-indexed）
let col_value = col('.')              " => 23（バイト位置、1-indexed）
let char_count = strchars(substr)     " => 22（文字数）
let display_width = strdisplaywidth(substr)  " => 22（表示幅）

" UTF-8エンコーディング:
" - 英数字: 1バイト = 1文字 = 1表示幅
" - 日本語: 3バイト = 1文字 = 2表示幅
```

### Neovim vs Vim 実装の違い

#### Neovim実装（`nvim_buf_set_extmark`）

**座標系**: 0-indexed、論理座標

```typescript
// denops/hellshake-yano/neovim/display/extmark-display.ts:201
await denops.call("nvim_buf_set_extmark", 0, extmarkNamespace,
  p.line - 1,  // 論理行番号（0-indexed）
  p.col - 1,   // 論理列番号（0-indexed）
  {
    virt_text: [[h.hint, highlightGroup]],
    virt_text_pos: "overlay",
  }
);
```

**特徴**:
- ✅ **折り返し問題なし**: `nvim_buf_set_extmark()`は論理座標を受け取り、内部で画面座標に変換
- ✅ extmarkの`virt_text_pos: 'overlay'`が自動的に正しい位置に表示
- 座標変換は不要

#### Vim実装（`popup_create`）

**座標系**: 1-indexed、**画面座標を期待**

##### 修正前（問題あり）
```vim
" autoload/hellshake_yano_vim/display.vim（修正前）
let l:popup_id = popup_create(a:hint, {
  \ 'line': a:lnum,  " ❌ 論理行番号を渡している
  \ 'col': a:col,    " ❌ 論理列番号を渡している
  ...
})
```

**問題**:
- ❌ 折り返し表示で位置ずれが発生
- 例: 論理行1が画面行1-2に折り返されている場合、論理行2のヒントが画面行2（実際は3であるべき）に表示される

##### 修正後（Phase D-6 Sub2 Fix）
```vim
" autoload/hellshake_yano_vim/display.vim:177-185（修正後）
" Phase D-6 Sub2 Fix: 論理座標→画面座標に変換（折り返し対応）
let l:screen = screenpos(win_getid(), a:lnum, a:col)

let l:popup_id = popup_create(a:hint, {
  \ 'line': l:screen.row,  " ✅ 画面行番号
  \ 'col': l:screen.col,   " ✅ 画面列番号
  ...
})
```

**修正内容**:
- ✅ `screenpos()`で論理座標→画面座標変換
- ✅ 折り返し表示でも正しい位置に表示

### 日本語ヒント位置ずれ問題の解決

#### 問題1: バイト位置 vs 文字位置の混乱
**原因**: `strchars()`を使った文字数ベースの計算

**解決**: バイト位置（`stridx()` + 1）を直接使用
```vim
" autoload/hellshake_yano_vim/word_detector.vim:124-125
let l:word_data = {
  \ 'col': l:match_start + 1,                    " バイト位置
  \ 'end_col': l:match_start + len(l:segment) + 1
\ }
```

#### 問題2: オフセット管理の不備
**原因**: スキップされたセグメントで累積エラー

**解決**: `l:processed_positions`辞書で重複を避ける
```vim
let l:processed_positions = {}
while 1
  let l:match_start = stridx(a:line, l:segment, l:search_offset)
  if !has_key(l:processed_positions, l:match_start)
    " 処理
    let l:processed_positions[l:match_start] = 1
    break
  endif
  let l:search_offset = l:match_start + 1
endwhile
```

#### 問題3: 折り返し表示での位置ずれ
**原因**: `popup_create()`が画面座標を期待するのに論理座標を渡していた

**解決**: `screenpos()`で変換（上記参照）

### 実装比較表

| 項目 | Neovim (extmark) | Vim (popup) 修正前 | Vim (popup) 修正後 |
|------|------------------|-------------------|-------------------|
| 座標系 | 0-indexed | 1-indexed | 1-indexed |
| 座標種別 | 論理座標 | 論理座標 ❌ | 画面座標 ✅ |
| 折り返し対応 | 自動 ✅ | なし ❌ | `screenpos()` ✅ |
| API | `nvim_buf_set_extmark` | `popup_create` | `popup_create` |
| 実装ファイル | `extmark-display.ts` | `display.vim` | `display.vim` |

### 重要な注意点

#### Denops TypeScript側も同じ問題を抱えている

**未修正の実装**:
```typescript
// denops/hellshake-yano/vim/display/popup-display.ts:57-59
const popupId = await this.denops.call("popup_create", hint, {
  line: lnum,  // ❌ 論理行番号を渡している
  col: col,    // ❌ 論理列番号を渡している
  ...
});
```

**TODO**: 将来的に以下の修正が必要
```typescript
// 修正案
const screen = await this.denops.call("screenpos",
  await this.denops.call("win_getid"),
  lnum,
  col
) as { row: number; col: number };

const popupId = await this.denops.call("popup_create", hint, {
  line: screen.row,  // ✅ 画面行番号
  col: screen.col,   // ✅ 画面列番号
  ...
});
```

### 参考: 座標系変換ロジック（Denops実装）

Denops TypeScript側には座標系変換ロジックが既に存在：

```typescript
// denops/hellshake-yano/neovim/core/hint.ts:333
return opts.coordinateSystem ? {
  line: word.line,
  col,
  display_mode: dm,
  vim_col: col,                        // Vim用（1-indexed）
  nvim_col: Math.max(0, byteCol - 1),  // Neovim用（0-indexed）
  vim_line: word.line,                 // Vim用（1-indexed）
  nvim_line: word.line - 1             // Neovim用（0-indexed）
} : { line: word.line, col, display_mode: dm };
```

ただし、この`coordinateSystem`オプションは現在未使用。将来的に活用することで、Vim/Neovim両方の座標系を統一的に扱える可能性がある。