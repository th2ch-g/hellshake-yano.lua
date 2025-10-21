# title: Vim環境での数字プレフィックス+モーション問題の修正

## 概要
- Vim環境で`5j`、`3w`などの数字プレフィックス+モーションが正しく動作しない問題（1回分しか移動しない）を修正
- 原因は`<C-u>`がカウントプレフィックスをクリアしていること
- `<expr>`マッピング方式でv:count1を正しく取得し、モーション実行時に反映することで解決

### goal
- ユーザーがVim環境で`5j`と入力すると5行下に移動できる
- `3w`で3単語前に移動、`2b`で2単語後ろに移動など、すべての数字プレフィックス+モーションが正常動作
- モーション連打検出機能も引き続き正常動作（例: jjj → ヒント表示）

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 動作確認はneovimではなく、vimで行う

## 開発のゴール
- Vim 8.0+環境で数字プレフィックス+モーションを正しく処理できるようにする
- 既存のモーション連打検出機能との互換性を維持
- Neovim環境（Denops版）には影響を与えない
- 後方互換性を維持（既存のテストコードが動作）

## 実装仕様

### 問題の詳細
**症状:**
- Vim環境で`5j`と入力すると、期待される5行移動ではなく1行しか移動しない
- すべての数字プレフィックス+モーション（j/k/h/l/w/b/e）で同様の問題が発生
- Neovim環境では問題なし（Denops版を使用しているため）

**原因:**
1. 現在のマッピング: `nnoremap <silent> j :<C-u>call hellshake_yano_vim#motion#handle('j')<CR>`
2. ユーザーが`5j`を入力すると、Vimは`5`をカウントとして認識
3. `j`キーが押されるとマッピングが発動し、`<C-u>`が**カウント（5）を削除**
4. `motion#handle('j')`が実行され、339行目で`execute 'normal! j'`（カウントなし）が実行
5. 結果: 1行しか移動しない

**コード上の証拠:**
- マッピング定義: plugin/hellshake-yano-vim.vim:312-314
- モーション実行: autoload/hellshake_yano_vim/motion.vim:339
  ```vim
  execute 'normal! ' . a:motion_key  " カウントが失われている
  ```
- v:count未使用: Grepで確認した結果、v:countやv:count1は一切使われていない

**`<C-u>`の役割と問題:**
- 本来はVisualモードからのコマンド実行時に選択範囲（`'<,'>`）を削除するためのもの
- しかし、Normal modeでも同時にカウントプレフィックスを削除してしまう

### 解決方針
`<expr>`マッピング方式を採用し、以下を実現:
1. v:count1を使ってカウントを取得（`<C-u>`の前に）
2. カウント付きモーション実行（`5j` → `normal! 5j`）
3. モーション連打検出機能との統合
4. 既存コードとの後方互換性維持

## 生成AIの学習用コンテキスト

### VimScript実装ファイル
- autoload/hellshake_yano_vim/motion.vim
  - モーション連打検出のメインロジック
  - handle()関数: 現在のモーション処理（269-365行目）
  - Phase D-6のキーリピート検出ロジック（20-103行目）

- plugin/hellshake-yano-vim.vim
  - プラグイン初期化とマッピング定義
  - Normal modeマッピング（309-315行目）
  - Visual modeマッピング（317-324行目）

### 参考実装
- autoload/hellshake_yano_vim/motion.vim:367-388
  - `handle_visual_expr()`関数: Visual mode用の`<expr>`マッピング実装
  - この実装パターンを参考にNormal mode版を作成

### テストファイル
- tests-vim/hellshake_yano_vim/test_motion.vim
  - 既存のモーション検出テスト
  - 新しいテストはtest_motion_count.vimとして分離

## Process

### process1 原因調査と分析
調査完了日: 2025-10-21

#### sub1 マッピング構造の分析
@target: plugin/hellshake-yano-vim.vim:309-324
@ref: autoload/hellshake_yano_vim/motion.vim:269-365

- [x] 現在のマッピング定義を確認
  - Normal mode: `nnoremap <silent> j :<C-u>call hellshake_yano_vim#motion#handle('j')<CR>`
  - `<C-u>`がカウントをクリアしていることを確認
- [x] handle()関数の処理フローを分析
  - 339行目で`execute 'normal! ' . a:motion_key`を実行
  - カウント情報が失われている
- [x] v:count/v:count1の使用状況を調査
  - Grepで確認: 一切使われていない

#### sub2 `<C-u>`の影響調査
@target: plugin/hellshake-yano-vim.vim:312-314

- [x] `<C-u>`の役割を確認
  - Visual modeからのコマンド実行時に選択範囲を削除
  - Normal modeではカウントプレフィックスも削除してしまう
- [x] `<C-u>`を削除した場合の影響を検討
  - Visual mode対応で問題が発生する可能性あり → 非推奨

#### sub3 Neovimとの動作比較
@target: plugin/hellshake-yano-vim.vim:17-20

- [x] Neovimで問題が発生しない理由を確認
  - 17-20行目で`has('nvim')`の場合は`finish`
  - Denops版の実装が使われる
- [x] Vim 8.0+のみが影響を受けることを確認

### process2 `<expr>`マッピング方式への修正
実装対象: autoload/hellshake_yano_vim/motion.vim

#### sub1 `handle_expr()` 関数の追加
@target: autoload/hellshake_yano_vim/motion.vim:230行目付近（handle()の前）
@ref: autoload/hellshake_yano_vim/motion.vim:367-388（handle_visual_expr参考）

- [ ] `handle_expr(motion_key)` 関数の実装
  - 目的: `<expr>`マッピング用のエントリーポイント
  - 処理:
    1. v:count1を取得（ユーザーが入力したカウント、デフォルト1）
    2. handle_with_count()を呼び出すコマンド文字列を生成
    3. `:\<C-u>call ...` 形式で返す（`<C-u>`はここでは安全）
  - 実装例:
    ```vim
    function! hellshake_yano_vim#motion#handle_expr(motion_key) abort
      let l:count = v:count1
      return printf(":\<C-u>call hellshake_yano_vim#motion#handle_with_count(%s, %d)\<CR>",
            \ string(a:motion_key), l:count)
    endfunction
    ```
- [ ] 関数ドキュメントの追加
  - 目的、パラメータ、戻り値を明記
  - 使用例を記述

#### sub2 `handle_with_count()` 関数の実装
@target: autoload/hellshake_yano_vim/motion.vim:269-365（既存のhandle()を改修）

- [ ] 関数シグネチャの変更
  - 変更前: `hellshake_yano_vim#motion#handle(motion_key)`
  - 変更後: `hellshake_yano_vim#motion#handle_with_count(motion_key, count)`
- [ ] モーション実行部分の修正（339行目）
  - 変更前: `execute 'normal! ' . a:motion_key`
  - 変更後: `execute 'normal! ' . a:count . a:motion_key`
- [ ] キーリピート検出との統合（280-293行目）
  - 既存のPhase D-6ロジックを維持
  - カウント情報を保持したまま処理
- [ ] モーション連打検出との統合（295-355行目）
  - 既存のカウント管理ロジックを維持
  - 閾値判定、ヒント表示トリガーは変更なし
- [ ] 関数ドキュメントの更新
  - 第2引数`count`の説明を追加
  - 数字プレフィックス対応を明記

#### sub3 既存`handle()`関数の後方互換維持
@target: autoload/hellshake_yano_vim/motion.vim:230行目付近

- [ ] 後方互換用のラッパー関数を実装
  ```vim
  function! hellshake_yano_vim#motion#handle(motion_key) abort
    " 後方互換のため、カウント1でhandle_with_count()を呼び出す
    call hellshake_yano_vim#motion#handle_with_count(a:motion_key, 1)
  endfunction
  ```
- [ ] 既存のテストコードが動作することを確認

### process3 マッピング定義の変更
実装対象: plugin/hellshake-yano-vim.vim

#### sub1 Normal modeマッピングの`<expr>`化
@target: plugin/hellshake-yano-vim.vim:309-315

- [ ] マッピング定義の変更
  - 変更前:
    ```vim
    for s:key in s:motion_keys
      execute printf('nnoremap <silent> %s :<C-u>call hellshake_yano_vim#motion#handle(%s)<CR>',
            \ s:key, string(s:key))
    endfor
    ```
  - 変更後:
    ```vim
    for s:key in s:motion_keys
      execute printf('nnoremap <silent> <expr> %s hellshake_yano_vim#motion#handle_expr(%s)',
            \ s:key, string(s:key))
    endfor
    ```
- [ ] 対象キーの確認
  - デフォルト: ['w', 'b', 'e', 'h', 'j', 'k', 'l']
  - g:hellshake_yano.countedMotionsで設定可能

#### sub2 Visual modeマッピングのカウント対応
@target: plugin/hellshake-yano-vim.vim:317-324

- [ ] Visual mode用のカウント対応を検討
  - 既存の`handle_visual_expr()`の動作確認
  - 必要に応じて`handle_visual_internal()`を修正
- [ ] Visual modeでのカウント動作の仕様確認
  - `5j` in Visual mode: 選択範囲を5行拡張
  - モーション検出機能との統合

### process10 ユニットテスト

#### sub1 テストファイルの作成
@target: tests-vim/test_motion_count.vim（新規作成）
@ref: tests-vim/hellshake_yano_vim/test_motion.vim

- [ ] テストファイルの作成
  - テストフレームワークの読み込み
  - setup/teardown関数の実装
- [ ] Test 1: 5jで5行移動
  - 期待値: カーソルが5行下に移動
- [ ] Test 2: 3wで3単語移動
  - 期待値: カーソルが3単語前に移動
- [ ] Test 3: 2bで2単語後退
  - 期待値: カーソルが2単語後ろに移動
- [ ] Test 4: カウントなし（j）で1行移動
  - 期待値: カーソルが1行下に移動（デフォルト動作）
- [ ] Test 5: モーション検出機能との併用
  - 3j → 3j → ヒント表示のトリガー確認
  - カウント付きモーションでもモーション検出が動作
- [ ] Test 6: Visual modeでのカウント動作
  - `v5j`で5行選択範囲が拡張
- [ ] Test 7: handle_expr()のv:count1取得
  - 内部的にv:count1が正しく取得されているか確認
- [ ] Test 8: 後方互換性の確認
  - 既存のhandle()関数が動作することを確認

#### sub2 テストの実行
@target: tests-vim/test_motion_count.vim

- [ ] Vim環境でのテスト実行
  ```bash
  vim -u NONE -N -c "source tests-vim/test_motion_count.vim"
  ```
- [ ] すべてのテストがPASSすることを確認
- [ ] 既存テストの回帰確認
  - tests-vim/hellshake_yano_vim/test_motion.vimが動作

### process50 フォローアップ

#### sub1 Vim環境での手動検証
@target: Vim 8.0+環境

- [ ] 基本的な数字プレフィックス+モーションの確認
  - `5j` → 5行下に移動
  - `3w` → 3単語前に移動
  - `2b` → 2単語後ろに移動
  - `10k` → 10行上に移動
- [ ] モーション連打検出機能の確認
  - `jjj` → ヒント表示
  - `5j` → `5j` → ヒント表示（カウント付きでも検出）
- [ ] Visual modeでの動作確認
  - `v5j` → 5行選択範囲が拡張
  - `vwww` → ヒント表示
- [ ] エッジケースの確認
  - `100j` → 100行移動（大きなカウント）
  - `1j` → 1行移動（明示的なカウント1）

#### sub2 パフォーマンスの確認
@target: autoload/hellshake_yano_vim/motion.vim

- [ ] `<expr>`マッピングのオーバーヘッド確認
  - 通常のモーション実行速度に影響がないか
- [ ] 大量のモーション実行時の動作確認
  - `1000j`などの大きなカウント

### process100 リファクタリング

#### sub1 コードの整理
@target: autoload/hellshake_yano_vim/motion.vim

- [ ] 関数の配置順序の最適化
  - handle_expr() → handle_with_count() → handle()の順
- [ ] コメントの充実化
  - Phase D-7 Process50としてマーク
  - 数字プレフィックス対応であることを明記
- [ ] 変数名の統一性確認
  - l:count, a:count の命名規則

#### sub2 エラーハンドリングの強化
@target: autoload/hellshake_yano_vim/motion.vim

- [ ] handle_expr()のエラーハンドリング
  - v:count1取得時のエラー処理
- [ ] handle_with_count()のカウント値検証
  - a:count < 1の場合の処理（デフォルト1に）

### process200 ドキュメンテーション

#### sub1 CLAUDE.mdの更新
@target: /home/takets/.config/nvim/plugged/hellshake-yano.vim/CLAUDE.md

- [ ] Implementation Statusセクションの更新
  - Phase D-7 Process50として記録
  - sub1: 原因調査（完了）
  - sub2: `<expr>`マッピング実装
  - sub3: テストと検証
- [ ] Active Specsセクションの更新
  - 「数字プレフィックス+モーション対応」を追加

#### sub2 関数ドキュメントの充実化
@target: autoload/hellshake_yano_vim/motion.vim

- [ ] handle_expr()の詳細ドキュメント
  - 目的、パラメータ、戻り値
  - 使用例（マッピング定義）
  - Phase D-7 Process50マーク
- [ ] handle_with_count()の詳細ドキュメント
  - 数字プレフィックス対応であることを明記
  - 既存のhandle()との違いを説明
- [ ] 既存のhandle()のドキュメント更新
  - 後方互換のためのラッパーであることを明記

#### sub3 コードコメントの追加
@target: plugin/hellshake-yano-vim.vim:309-324

- [ ] マッピング定義セクションのコメント更新
  - `<expr>`マッピングを使用していることを明記
  - v:count1を取得していることを説明
  - Phase D-7 Process50対応であることをマーク

#### sub4 README/CHANGELOGの更新（オプション）
@target: README.md, CHANGELOG.md

- [ ] バグフィックスとして記録
  - Fixed: Vim環境で数字プレフィックス+モーションが動作しない問題
  - Vim 8.0+ only（Neovimは影響なし）
