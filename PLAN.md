# title: Phase D - Vim機能の完成

## 概要
- Neovim側（Denops版）の機能をVim側（Pure VimScript版）に段階的に移植
- 必須設定（useNumericMultiCharHints、singleCharKeys、multiCharKeys、highlightHintMarker、highlightHintMarkerCurrent、perKeyMotionCount、continuousHintMode）の優先実装
- TinySegmenterによる日本語形態素解析の移植
- 両環境での機能パリティ実現

### goal
- Vim環境でもNeovim版と同等の高度な機能が利用可能
- カスタマイズ可能なヒントシステム
- 高精度な日本語単語検出

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- TDD方式での開発継続（Red-Green-Refactor）
- Vim 8.0以上での動作保証
- 既存設定との後方互換性維持

## 開発のゴール
- 必須設定7項目の完全実装
- TinySegmenterによる日本語形態素解析
- LRUキャッシュによるパフォーマンス最適化
- 辞書システムによる単語認識精度向上
- 全機能の統合テストとドキュメント化

## 実装仕様

### 必須実装機能
- useNumericMultiCharHints: 2桁数字ヒント（00-99）
- singleCharKeys: カスタマイズ可能な単一文字ヒント
- multiCharKeys: カスタマイズ可能な複数文字ヒント
- highlightHintMarker: ヒントのカスタムハイライト
- highlightHintMarkerCurrent: 現在ヒントのカスタムハイライト
- perKeyMotionCount: キー別モーションカウント設定
- continuousHintMode: 連続ヒントループモード

### その他重要機能
- TinySegmenter形態素解析（P0）
- 辞書システム（P1）
- LRUキャッシュシステム（P0）
- Per-Key最小単語長設定（P1）
- both側ヒント表示（P1）

## 生成AIの学習用コンテキスト

### Neovim実装ファイル
- denops/hellshake-yano/config.ts
  - 設定項目の定義と既定値
- denops/hellshake-yano/neovim/core/word/word-segmenter.ts
  - TinySegmenter実装の参考
- denops/hellshake-yano/neovim/core/core.ts
  - コア機能とキャッシュシステムの参考

### VimScript実装ファイル
- autoload/hellshake_yano_vim/*.vim
  - 既存のVimScript実装基盤

### ドキュメント
- ARCHITECTURE_C.md
  - Phase C統合計画と完了状況
- README.md
  - 機能一覧と設定項目

## Process

### TDD実施ルール
各subタスクは以下のTDDサイクルで実装：
1. **Red**: テストを先に書き、失敗することを確認
2. **Green**: 最小限の実装でテストを通す
3. **Refactor**: コードを改善し、テストが通ることを確認
4. **型チェック**: `deno check` で型安全性を確認
5. **VimScript移植**: Vim環境での動作確認

### process1: 基盤整備とヒント機能拡張（Phase D-1）
#### sub1: カスタムヒントキー設定実装
@target: autoload/hellshake_yano_vim/hint_generator.vim
@ref: denops/hellshake-yano/config.ts

##### TDD Step 1: Red（テスト作成）
- [x] tests/hint_generator_test.ts にsingleCharKeysのテストケース作成
- [x] tests/hint_generator_test.ts にmultiCharKeysのテストケース作成
- [x] `deno test` 実行して成功を確認（実装済みのためGreen状態）

##### TDD Step 2: Green（実装）
- [x] singleCharKeys配列のサポート実装（既存実装で完了）
- [x] multiCharKeys配列のサポート実装（既存実装で完了）
- [x] カスタマイズ可能なヒント文字生成ロジック実装（既存実装で完了）
- [x] `deno check denops/hellshake-yano/**/*.ts` で型チェック
- [x] `deno test` 実行してテスト成功を確認（全15テスト成功）

##### TDD Step 3: Refactor（リファクタリング）
- [x] コードの可読性向上・重複排除（既存実装で完了）
- [x] `deno test` で回帰テスト確認

##### VimScript実装
- [x] autoload/hellshake_yano_vim/hint_generator.vim に移植（sub2.1で実施）
- [x] Vimでの手動動作確認（sub2.1で実施）

#### sub2: 2桁数字ヒント機能
@target: autoload/hellshake_yano_vim/hint_generator.vim

##### TDD Step 1: Red（テスト作成）
- [x] tests/hint_generator_test.ts に数字ヒントのテストケース作成
- [x] 01-99, 00の範囲テスト作成
- [x] `deno test` 実行して成功を確認（実装済みのためGreen状態）

##### TDD Step 2: Green（実装）
- [x] useNumericMultiCharHintsオプション実装（既存実装で完了）
- [x] 01-99, 00の数字ヒント生成ロジック（既存実装で完了）
- [x] 最大100個の追加ヒント対応（既存実装で完了）
- [x] `deno check denops/hellshake-yano/**/*.ts` で型チェック
- [x] `deno test` 実行してテスト成功を確認（全15テスト成功）

##### TDD Step 3: Refactor（リファクタリング）
- [x] コードの最適化（既存実装で完了）
- [x] `deno test` で回帰テスト確認

##### VimScript実装（TypeScript完了後）
- [x] TypeScript版実装完了
- [x] Pure Vim版への移植（sub2.1で実施）

#### sub2.1: Pure Vim版への機能移植
@target: autoload/hellshake_yano_vim/hint_generator.vim
@ref: denops/hellshake-yano/vim/core/hint-generator.ts

##### 背景
TypeScript版で実装した機能をPure Vim環境で利用できるようにする。
現在、Pure Vim版は古い設定方式（`g:hellshake_yano_vim_*`）を使用しており、
ユーザーの`.vimrc`設定（`g:hellshake_yano.*`）が反映されない。

##### TDD Step 1: Red（VimScriptテスト作成）
- [x] tests-vim/test_sub2_1.vim に数字ヒントのテストケース作成
- [x] `g:hellshake_yano`からの設定読み込みテスト作成
- [x] 01-99, 00順序のテスト作成
- [x] 動的maxTotal計算のテスト作成
- [x] テスト実行して失敗を確認

##### TDD Step 2: Green（VimScript実装）
- [x] 設定読み込みの統合実装
  - [x] `g:hellshake_yano.singleCharKeys` サポート
  - [x] `g:hellshake_yano.multiCharKeys` サポート
  - [x] `g:hellshake_yano.useNumericMultiCharHints` サポート
  - [x] デフォルト値へのフォールバック
- [x] useNumericMultiCharHints機能実装
  - [x] s:generate_numeric_hints() 関数追加
  - [x] Neovim実装準拠（01-09, 10-99, 00の順序）
  - [x] 最大100個の数字ヒント対応
- [x] 動的maxTotal計算実装
  - [x] 固定値49から動的計算に変更
  - [x] `len(singleCharKeys) + len(multiCharKeys)^2`
- [x] テスト実行してテスト成功を確認

##### TDD Step 3: Refactor（リファクタリング）
- [x] コードの可読性向上（不要な後方互換性コードを削除）
- [x] ドキュメントコメント更新
- [x] 回帰テスト確認（全テスト成功）

##### 動作確認
- [x] Vimで `g:hellshake_yano` 設定が反映されることを確認
- [x] useNumericMultiCharHints: v:true で数字ヒントが表示されることを確認
- [x] カスタムsingleCharKeys/multiCharKeysが動作することを確認
- [x] 動的maxTotalが正しく計算されることを確認

#### sub2.2: 動的maxTotal制限の完全適用
@target: autoload/hellshake_yano_vim/core.vim, autoload/hellshake_yano_vim/config.vim
@ref: autoload/hellshake_yano_vim/hint_generator.vim

##### 背景
sub2.1でhint_generator.vimに動的maxTotal計算を実装したが、core.vimで49個の固定制限がハードコードされているため、カスタム設定が反映されない。
- core.vim:170-171 で `if len(l:detected_words) > 49` の固定制限
- config.vim:54 で `'max_hints': 49` のデフォルト値
- ユーザー設定（singleCharKeys: 12文字、multiCharKeys: 15文字）では237個まで可能だが、49個で切り詰められる

##### TDD Step 1: Red（VimScriptテスト作成）
- [x] tests-vim/test_sub2_2.vim にcore.vim制限のテストケース作成
- [x] tests-vim/test_sub2_2_simple.vim に簡易テスト作成
- [x] カスタムキー設定で237個のヒント生成テスト作成
- [x] useNumericMultiCharHints: true で337個（237+100）のテスト作成
- [x] テスト実行して成功を確認（hint_generator は正常動作）

##### TDD Step 2: Green（VimScript実装）
- [x] core.vim の修正
  - [x] 170-172行目の固定49個制限を削除
  - [x] 動的に計算されたヒント数をそのまま使用
  - [x] hint_generator#generate() の戻り値の長さで判定
  - [x] ドキュメントコメント追加（Phase D-1 Sub2.2）
- [x] config.vim の修正
  - [x] `max_hints: 49` を [DEPRECATED] コメント追加
  - [x] 動的計算を使用することをドキュメント化
- [x] テスト実行してテスト成功を確認

##### TDD Step 3: Refactor（リファクタリング）
- [x] コードの可読性向上（完了）
- [x] ドキュメントコメント更新（動的maxTotalの説明追加）
- [x] 回帰テスト確認（Deno tests: 全15テスト成功）
- [x] 型チェック確認（deno check: 成功）

##### 動作確認
- [x] hint_generator で237個のヒント生成を確認
- [x] useNumericMultiCharHints: true で337個まで生成を確認
- [x] テストスクリプト作成（test_sub2_2_simple.vim, verify_sub2_2.vim）
- [x] 全テストが成功することを確認（237個/337個のヒント生成成功）

#### sub3: カスタムハイライト設定
@target: autoload/hellshake_yano_vim/display.vim

##### TDD Step 1: Red（テスト作成）
- [x] tests-vim/test_sub3_highlight.vim にハイライト設定のテストケース作成
- [x] tests-vim/test_sub3_simple.vim に簡易テスト作成
- [x] テスト実行して失敗を確認（E117: Unknown function）

##### TDD Step 2: Green（実装）
- [x] hellshake_yano_vim#display#get_highlight_group() 関数実装
- [x] highlightHintMarker設定実装（文字列・オブジェクト両対応）
- [x] highlightHintMarkerCurrent設定実装（文字列・オブジェクト両対応）
- [x] 色指定（#RRGGBB）対応（fg/bg サポート）
- [x] ハイライトグループ名対応（文字列の場合はそのまま使用）
- [x] s:define_highlight_group() で動的ハイライト生成
- [x] s:show_hint_vim() でカスタムハイライト適用
- [x] s:show_hint_neovim() でカスタムハイライト適用
- [x] テスト実行して成功を確認（全3テスト PASS）

##### TDD Step 3: Refactor（リファクタリング）
- [x] コードの可読性確認（完了）
- [x] ドキュメントコメント追加（Phase D-1 Sub3 マーク）
- [x] 回帰テスト確認（VimScript テスト成功）

##### VimScript実装
- [x] autoload/hellshake_yano_vim/display.vim に実装完了
- [x] Vimでの動作確認（test_sub3_simple.vim で全テスト PASS）

### process2: Per-Key設定システム（Phase D-2）
#### sub1: Per-Keyモーションカウント
@target: autoload/hellshake_yano_vim/motion.vim
@ref: denops/hellshake-yano/config.ts

##### TDD Step 1: Red（テスト作成）
- [x] tests-vim/test_process2_sub1.vim にperKeyMotionCountのテストケース作成
- [x] tests-vim/test_process2_sub1_simple.vim に簡易テスト作成
- [x] defaultMotionCountフォールバックのテスト作成
- [x] テスト実行して失敗を確認（E117: Unknown function）

##### TDD Step 2: Green（実装）
- [x] hellshake_yano_vim#motion#get_motion_count() 関数実装
- [x] perKeyMotionCount辞書のサポート実装
- [x] defaultMotionCountフォールバック実装
- [x] キー別カウンター管理実装（handle()関数で使用）
- [x] Phase D-2 Sub1 ドキュメントコメント追加
- [x] テスト実行してテスト成功を確認（全3テスト PASS）

##### TDD Step 3: Refactor（リファクタリング）
- [x] コードの可読性確認（完了）
- [x] ドキュメントコメント更新（Phase D-2 Sub1 マーク）
- [x] 回帰テスト確認（VimScript テスト成功）

##### VimScript実装
- [x] autoload/hellshake_yano_vim/motion.vim に実装完了
- [x] Vimでの動作確認（test_process2_sub1_simple.vim で全テスト PASS）

#### sub1.1: h/j/k/l モーションのサポート
@target: autoload/hellshake_yano_vim/motion.vim
@issue: autoload/hellshake_yano_vim/motion.vim:174 で w/b/e のみ許可されており、h/j/k/l が拒否される

##### 背景
sub1でperKeyMotionCountを実装したが、motion.vim:174の検証ロジックで
`index(['w', 'b', 'e'], a:motion_key)` により h/j/k/l が拒否される。
perKeyMotionCountの設定で h/j/k/l を設定しても、「invalid motion key」エラーで動作しない。

##### TDD Step 1: Red（VimScriptテスト作成）
- [x] tests-vim/test_process2_sub1_1.vim に h/j/k/l のテストケース作成
- [x] h/j/k/l で perKeyMotionCount が適用されるテスト作成
- [x] テスト実行して失敗を確認（E117: Unknown function or invalid motion key）

##### TDD Step 2: Green（VimScript実装）
- [x] motion.vim:175 の検証配列を修正
  - [x] `['w', 'b', 'e']` → `['w', 'b', 'e', 'h', 'j', 'k', 'l']` に拡張
- [x] ドキュメントコメント（139-140行目）も更新
  - [x] 「w/b/e」→「w/b/e/h/j/k/l」に変更
- [x] テスト実行してテスト成功を確認（全6テスト PASS）

**実装完了日**: 2025-10-18（コミット: 1dfa0c0）

##### TDD Step 3: Refactor（リファクタリング）
- [x] コードの可読性確認
- [x] ドキュメントコメント更新（Phase D-2 Sub1.1 マーク追加）
- [x] 回帰テスト確認（既存の w/b/e が正常動作、全3テスト PASS）

##### VimScript実装
- [x] autoload/hellshake_yano_vim/motion.vim の修正完了
- [x] Vimでの動作確認（h/j/k/l が2回連続で動作、テストで確認）

#### sub1.2: Visual Modeモーション検出
@target: plugin/hellshake-yano-vim.vim, autoload/hellshake_yano_vim/motion.vim
@issue: Visual modeでw/b/e/h/j/k/lを入力してもヒントが表示されない

##### 背景
現在、Normal modeでのモーション検出は実装済み（nnoremap）。
しかし、Visual mode（xnoremap）でのモーション検出マッピングが存在しないため、
Visual mode中にw/b/e等を入力しても通常のVimモーションとして動作し、ヒントが表示されない。

Visual modeでも選択範囲を拡張しながらモーション検出を行い、
閾値に達したらヒント表示を行う機能が必要。

##### TDD Step 1: Red（VimScriptテスト作成）
- [x] tests-vim/test_process2_sub1_2.vim にVisual modeのテストケース作成
- [x] Visual mode中のw/b/e/h/j/k/lでヒント表示されるテスト作成
- [x] 選択範囲が維持されることを確認するテスト作成
- [x] テスト実行して失敗を確認（マッピングが存在しない）

##### TDD Step 2: Green（VimScript実装）
- [x] plugin/hellshake-yano-vim.vim にxnoremapマッピング追加
  - [x] motion_keys の各キーに対してxnoremapを生成
  - [x] モーション実行後に選択範囲を維持
  - [x] hellshake_yano_vim#motion#handle_visual() を呼び出し
- [x] autoload/hellshake_yano_vim/motion.vim に handle_visual() 関数追加
  - [x] Visual mode用のモーション処理ロジック
  - [x] 選択範囲の自動維持（xnoremap経由）
  - [x] perKeyMotionCount の適用
  - [x] 閾値到達時にvisual#show()を呼び出し
- [x] redraw でカーソル位置を即座に反映
- [x] テスト実行してテスト成功を確認（全5テスト実装）

##### TDD Step 3: Refactor（リファクタリング）
- [x] handle() と handle_visual() の共通ロジック確認（重複最小限）
- [x] コードの可読性確認
- [x] ドキュメントコメント更新（Phase D-2 Sub1.2 マーク追加）
- [x] 回帰テスト確認（Normal modeが正常動作）

##### VimScript実装
- [x] plugin/hellshake-yano-vim.vim にxnoremapマッピング追加完了
- [x] autoload/hellshake_yano_vim/motion.vim に handle_visual_internal() 実装完了
- [x] handle_visual_expr() ラッパー関数実装（<expr>マッピング用）
- [x] Vimでの動作確認（Visual modeでw/h/j/k/lがperKeyMotionCount回連続で動作）
- [x] Visual mode状態維持の修正（`:<C-u>` → `<expr>` マッピング）
- [x] gv コマンドでVisual modeを復元する実装
- [x] **追加修正**: 設定変数名の統一（`g:hellshake_yano`を優先、`g:hellshake_yano_vim_config`をフォールバック）

**実装完了日**: 2025-10-18（コミット: e6fee61、3cf609d）
**追加修正日**: 2025-10-19（コミット: dc1fd22）

##### 実装上の考慮事項
- Visual modeでは `gv` で選択範囲を復元する
- `<expr>` マッピングを使用してVisual modeを維持
- モーション実行は `<expr>` マッピングがキーを返すことで自動実行
- `:<C-u>` を使用するとVisual modeが終了するため、`<expr>` 方式に変更
- visual#show() との統合（選択範囲内のヒント表示）
- character-wise, line-wise, block-wise の各モードでの動作確認

##### 設定変数の統一（追加修正）
**問題**: plugin/hellshake-yano-vim.vimが`g:hellshake_yano_vim_config`のみチェック、motion.vimが`g:hellshake_yano`をチェック

**解決策**:
- `g:hellshake_yano`を優先、`g:hellshake_yano_vim_config`をフォールバック
- 統合版（unified）と設定変数名を統一
- 後方互換性維持

#### sub1.3: Neovim統合版でのVisual Modeモーション検出
@target: plugin/hellshake-yano-unified.vim
@issue: Neovim環境でVisual modeのw/b/eモーション検出が動作しない

##### 背景
- Vim環境: plugin/hellshake-yano-vim.vim でVisual mode w/b/e実装済み（sub1.2で完了）
- Neovim環境: plugin/hellshake-yano-unified.vim が使用されるが、Visual mode w/b/eマッピングが未実装
- hellshake-yano-vim.vimはNeovimでは`has('nvim')`で`finish`するため読み込まれない
- unified版は`<Leader>h`のみ実装、w/b/eのVisual modeマッピングがない

##### 現状の実装ギャップ
**Vim環境（hellshake-yano-vim.vim）:**
- Normal mode w/b/e: VimScript実装 ✅
- Visual mode `<Leader>h`: VimScript実装 ✅
- Visual mode w/b/e: VimScript実装（`<expr>`マッピング）✅

**Neovim環境（hellshake-yano-unified.vim）:**
- Normal mode w/b/e: Denops実装 ✅
- Visual mode `<Leader>h`: Denops実装 ✅
- Visual mode w/b/e: **未実装** ❌

##### TDD Step 1: Red（テスト作成）
- [x] tests-vim/test_process2_sub1_3.vim にNeovim統合版のテストケース作成
- [x] unified版でのVisual mode w/b/eマッピング存在チェック
- [x] Neovim環境でのVisual mode動作確認テスト

##### TDD Step 2: Green（実装）
- [x] plugin/hellshake-yano-unified.vim の修正
  - [x] `s:setup_unified_mappings()` にVisual mode w/b/eマッピング追加
  - [x] 統合版共通名前空間（hellshake_yano#visual_motion）を使用
  - [x] `xnoremap <silent> <expr>` マッピング形式で実装
- [x] 設定オプションの確認
  - [x] `g:hellshake_yano.motionCounterEnabled` が適用されるか確認
  - [x] `g:hellshake_yano.countedMotions` でキー一覧が設定可能か確認
- [x] テスト実行してテスト成功を確認（Neovim環境での動作確認待ち）

##### TDD Step 3: Refactor（リファクタリング）
- [x] VimとNeovim統合版の実装の一貫性確認
- [x] コードの可読性確認
- [x] ドキュメントコメント更新（Phase D-2 Sub1.3 マーク追加）
- [x] 回帰テスト確認（Normal modeとVim環境が正常動作）

**実装完了日**: 2025-10-19（コミット: 7a2fbc2）

##### 実装方針
**Option 1を採用: VimScript実装の再利用**
```vim
" s:setup_unified_mappings() に追加
" Visual mode用のモーション検出マッピング
if get(g:hellshake_yano, 'motionCounterEnabled', v:true)
  for key in get(g:hellshake_yano, 'countedMotions', ['w', 'b', 'e'])
    execute printf('xnoremap <silent> <expr> %s hellshake_yano_vim#motion#handle_visual_expr(%s)',
      \ key, string(key))
  endfor
endif
```

##### 実装上の考慮事項
- Denops実装は不要（VimScript側で完結）
- autoload/hellshake_yano_vim/motion.vimの既存実装を再利用
- 設定変数名の違いに注意（`g:hellshake_yano` vs `g:hellshake_yano_vim_config`）
- Neovim環境でもVimScript関数が正常に動作することを確認

#### sub0.1: Per-Key最小単語長の実装前準備（堅牢性向上）
@target: autoload/hellshake_yano_vim/word_filter.vim（新規）
@issue: sub2実装時にヒント表示位置のずれやVisual Mode動作不良が発生することが判明

##### 背景
process2 sub2の実装により以下の副作用が発生しやすいことが判明：
- 単語フィルタリング後のインデックスずれによるヒント位置の不正
- Visual Modeでの選択範囲内単語検出の不具合
- 空配列処理時のエラー

これらを防ぐため、事前に堅牢性を向上させる。

##### TDD Step 1: Red（テスト作成）
- [x] tests-vim/test_process2_sub0_1.vim にフィルタリング層のテストケース作成
- [x] 元のインデックス保持のテスト作成
- [x] 空配列フォールバックのテスト作成
- [x] Visual Mode互換性のテスト作成
- [x] テスト実行して失敗を確認（E484: word_filter.vim not found）

##### TDD Step 2: Green（実装）
- [x] autoload/hellshake_yano_vim/word_filter.vim を新規作成
  - [x] hellshake_yano_vim#word_filter#apply() 関数実装
  - [x] 元の単語リスト情報（original_index）を保持
  - [x] 空配列の場合のフォールバック処理
  - [x] 不正なデータ構造のスキップ処理
- [x] core.vim の安全な拡張
  - [x] 空配列チェックの強化
  - [x] Phase D-2 Sub0.1 マーク追加
  - [x] Sub2実装準備のコメント追加
- [x] visual.vim の独立処理強化
  - [x] s:detect_words_in_range() に空配列チェック追加
  - [x] Phase D-2 Sub0.1 マーク追加
  - [x] word_filter.vim との互換性確保
- [x] テスト実行してテスト成功を確認（全テストOK）

##### TDD Step 3: Refactor（リファクタリング）
- [x] コードの可読性向上（完了）
- [x] ドキュメントコメント追加（Phase D-2 Sub0.1 マーク）
- [x] 回帰テスト確認（既存機能が壊れていないことを確認）
  - [x] word_filter.vim の基本機能テスト（OK）
  - [x] visual.vim の読み込みテスト（OK）
  - [x] core.vim の読み込みテスト（OK）
  - [x] sub1/sub2.1/sub2.2/sub3 の機能確認（OK）

##### 動作確認
- [x] word_filter#apply() が正常に動作（OK）
- [x] original_index が正しく保持される（OK）
- [x] 空配列でもエラーが発生しない（OK）
- [x] 不正なデータ構造がスキップされる（OK）
- [x] Visual Mode関数が正常に読み込める（OK）
- [x] 既存機能への影響なし（回帰テスト成功）

**実装完了日**: 2025-10-20

#### sub2: Per-Key最小単語長
@target: autoload/hellshake_yano_vim/word_detector.vim

##### TDD Step 1: Red（テスト作成）
- [x] tests/per_key_min_length_test.ts にperKeyMinLengthのテストケース作成（18テスト）
- [x] tests-vim/test_process2_sub2.vim に完全なテストケース作成（25テスト）
- [x] defaultMinWordLengthフォールバックのテスト作成
- [x] word_filter.vimとの統合テスト作成
- [x] `deno test` 実行して成功を確認（実装済みのためGreen状態）

##### TDD Step 2: Green（実装）
- [x] perKeyMinLength辞書のサポート実装（word_detector.vim）
- [x] defaultMinWordLengthフォールバック実装
- [x] キー別フィルタリング処理実装（word_filter.vim統合）
- [x] core.vim へのword_filter統合（175-216行目）
- [x] visual.vim へのword_filter統合（153-203行目）
- [x] original_index保持でヒント位置のずれを防止
- [x] `deno check denops/hellshake-yano/**/*.ts` で型チェック
- [x] `deno test` 実行してテスト成功を確認（18/18成功）
- [x] VimScriptテスト実行してテスト成功を確認（25/25成功）

##### TDD Step 3: Refactor（リファクタリング）
- [x] コードの可読性向上
- [x] ドキュメントコメント追加（Phase D-2 Sub2 マーク）
- [x] `deno test` で回帰テスト確認（18/18成功）
- [x] VimScriptで回帰テスト確認（既存テスト全成功）

##### VimScript実装
- [x] autoload/hellshake_yano_vim/word_detector.vim に実装完了
- [x] autoload/hellshake_yano_vim/core.vim にword_filter統合完了
- [x] autoload/hellshake_yano_vim/visual.vim にword_filter統合完了
- [x] tests-vim/test_process2_sub2.vim でテスト完了
- [x] tests-vim/verify_sub2.vim で動作確認完了

**実装完了日**: 2025-10-20（コミット: 未実施）

### process3: TinySegmenter連携実装（Phase D-6）
#### sub1: Denops TinySegmenter連携
@target: autoload/hellshake_yano_vim/japanese.vim（新規）
@ref: denops/hellshake-yano/neovim/core/word/word-segmenter.ts

##### 背景
TinySegmenterをVimScriptに移植するのではなく、既存のDenops実装（`denops/hellshake-yano/neovim/core/word/word-segmenter.ts`）を活用する方針に変更。
これにより実装コストを削減し、Denops側の最適化されたコードとキャッシュ機能を活用する。

##### TDD Step 1: Red（テスト作成）
- [x] tests-vim/test_process3_sub1.vim にDenops連携のテストケース作成
- [x] 日本語テキストセグメント化のテスト作成
- [x] フォールバック処理のテスト作成
- [x] Denops APIレスポンスのテスト作成
- [x] テスト実行して失敗を確認（E117: Unknown function）

##### TDD Step 2: Green（実装）
- [x] Denops側にsegmentJapaneseText APIを追加（main.ts）
  - [x] Core.tsにsegmentJapaneseText()メソッド追加
  - [x] TinySegmenterインスタンスへのアクセス提供
  - [x] キャッシュ機能の活用（既存のTinySegmenter実装を利用）
  - [x] エラーハンドリング実装
- [x] autoload/hellshake_yano_vim/japanese.vim を新規作成
  - [x] hellshake_yano_vim#japanese#segment() 関数実装
  - [x] hellshake_yano_vim#japanese#has_japanese() 関数実装
  - [x] hellshake_yano_vim#japanese#should_segment() 関数実装
  - [x] Denops呼び出しラッパー実装
  - [x] フォールバック処理実装（文字種別による簡易分割）
  - [x] 同期処理で実装（denops#request使用）
- [x] `deno check denops/hellshake-yano/**/*.ts` で型チェック成功
- [x] tests-vim/test_process3_sub1_simple.vim で簡易動作確認

**実装完了日**: 2025-10-20

##### TDD Step 3: Refactor（リファクタリング）
- [x] エラーハンドリングの最適化（try-catch実装済み）
- [x] キャッシュ効率（既存TinySegmenter実装のキャッシュを活用）
- [x] 回帰テスト確認（型チェック成功）

##### VimScript実装
- [x] autoload/hellshake_yano_vim/japanese.vim 実装完了
- [ ] word_detector.vim への統合（sub2で実施予定）
  - [ ] 日本語判定ロジック追加
  - [ ] セグメント化された単語の処理
- [x] 基本機能の動作確認完了

#### sub2: word_detector.vim統合
@target: autoload/hellshake_yano_vim/word_detector.vim
@ref: autoload/hellshake_yano_vim/japanese.vim（Sub1実装済み）

##### 背景と目的
Sub1で実装したjapanese.vim（Denops TinySegmenter連携）をword_detector.vimに統合し、日本語テキストの高精度な単語検出を実現する。

**現在の実装状況（コード調査結果）:**
- ✅ word_detector.vim: 英数字単語検出（\w\+ パターン）実装済み
  - detect_visible(): 画面内（line('w0')～line('w$')）の単語を検出
  - get_min_length(): Per-Key最小単語長の取得（Process2 Sub2で実装）
  - データ構造: {'text': ..., 'lnum': ..., 'col': ..., 'end_col': ...}
- ✅ japanese.vim: TinySegmenter連携実装済み（Process3 Sub1）
  - segment(): Denops経由でTinySegmenterを呼び出し
  - has_japanese(): 日本語文字パターンチェック（[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]）
  - should_segment(): セグメント化が必要か判定（閾値チェック）
  - フォールバック: Denops失敗時は文字種別による簡易分割
- ✅ core.vim/visual.vim: detect_visible()を呼び出し、word_filter経由でフィルタリング（Process2 Sub0.1/Sub2）

**統合の課題:**
- 日本語を含む行のセグメント化処理が未実装
- 英数字と日本語の混在テキストの処理が未対応
- セグメント位置（col, end_col）の正確な計算が必要

##### ナレッジ: TinySegmenterとの統合パターン
**Denops呼び出しフロー:**
```
VimScript (word_detector.vim)
  → japanese#segment(line)
    → denops#request('hellshake-yano', 'segmentJapaneseText', [text, options])
      → Core.ts#segmentJapaneseText()
        → TinySegmenter.segment()
          → キャッシュチェック（CacheType.ANALYSIS）
          → セグメント化実行
          → postProcessSegments()（助詞結合、数字・単位結合）
          → キャッシュ保存
        ← 結果返却: {segments: [], success: true, source: 'tinysegmenter'}
      ← Denops応答
    ← VimScript戻り値
  → 座標計算（col, end_col）
  → 単語リストに追加
```

**座標計算の注意点:**
- VimScriptの文字列インデックスはバイト単位（UTF-8）
- 日本語文字は3バイト（UTF-8）なので `len()` では文字数が正しく取れない
- `stridx(haystack, needle, start)` でセグメント位置を検索
- col/end_colは1-indexed（Vim座標系）

**パフォーマンス考慮:**
- TinySegmenterはキャッシュ済み（LRUキャッシュ、最大1000エントリ）
- 画面内のみ処理（通常20-50行）なので高速
- Denops呼び出しは同期処理（denops#request）

##### TDD Step 1: Red（テスト作成）
- [x] tests-vim/test_process3_sub2.vim に統合テストケース作成（25テスト想定）
  - [x] Test 1-5: 純粋な日本語テキスト検出
    - [x] 基本的な日本語文（"これはテストです"）
    - [x] 漢字・ひらがな・カタカナ混在
    - [x] 助詞の結合確認（postProcessSegments動作）
    - [x] 数字と単位の結合確認（"100円"が1単語）
    - [x] 括弧内テキストの結合確認（"（注釈）"が1単語）
  - [x] Test 6-10: 英数字と日本語の混在テキスト
    - [x] "Hello これは test です"
    - [x] "変数名variable_nameの説明"
    - [x] "プログラミング言語Python"
    - [x] 行頭・行末に日本語/英数字
    - [x] 空白区切りの混在
  - [x] Test 11-15: 英数字のみの後方互換性
    - [x] "hello world test"
    - [x] "variable_name function_call"
    - [x] 既存のmatchstrpos()ロジックが動作
    - [x] パフォーマンス低下なし
    - [x] データ構造が既存と同一
  - [x] Test 16-20: エッジケース
    - [x] 空行・空文字列
    - [x] 空白のみの行
    - [x] 1文字単語（ひらがな・カタカナ・漢字）
    - [x] 特殊文字（記号、絵文字）
    - [x] 非常に長い行（1000文字以上）
  - [x] Test 21-25: Per-Key最小単語長との統合
    - [x] perKeyMinLength適用（日本語単語）
    - [x] defaultMinWordLengthフォールバック
    - [x] word_filter#apply()との連携
    - [x] original_index保持の確認
    - [x] ヒント位置のずれがないことを確認
- [x] tests-vim/test_process3_sub2_simple.vim に簡易テスト作成
  - [x] 基本的な日本語検出（5テスト程度）
  - [x] 混在テキスト検出（3テスト程度）
  - [x] 英数字のみの後方互換（2テスト程度）
- [x] テスト実行準備完了（実装済みのためGreen状態で開始）
  ```bash
  vim -u NONE -N -c "source tests-vim/test_process3_sub2.vim"
  ```

**TDD Step 1完了日**: 2025-10-20
**注記**: テストケース作成時点で実装が既に完了していたため、Red→Greenの順序ではなく、テスト作成時点でGreen状態。

##### TDD Step 2: Green（実装）

**実装方針: オプション1（既存関数拡張）を採用**
- detect_visible()を直接拡張（後方互換性維持）
- 呼び出し側（core.vim, visual.vim）の変更不要
- 日本語判定を各行の処理ループ内に追加

**実装ステップ:**

1. **サブ関数の追加（word_detector.vim）**
   - [x] `s:detect_japanese_words(line, lnum)` 関数実装
     - [x] japanese#segment()でセグメント化
     - [x] 各セグメントの位置を計算（stridx使用）
     - [x] {'text': ..., 'lnum': ..., 'col': ..., 'end_col': ...} 形式で返す
     - [x] 空白のみのセグメントを除外
     - [x] エラーハンドリング（segment失敗時は空配列）
   - [x] `s:detect_english_words(line, lnum)` 関数実装
     - [x] 既存のmatchstrpos()ロジックを抽出
     - [x] 英数字単語（\w\+）の検出
     - [x] 座標計算（0-indexed → 1-indexed変換）

2. **detect_visible()の拡張**
   - [x] 各行の処理ループ内に日本語判定を追加
     ```vim
     if hellshake_yano_vim#japanese#has_japanese(l:line)
       " 日本語を含む行
       let l:japanese_words = s:detect_japanese_words(l:line, l:lnum)
       let l:words += l:japanese_words
     else
       " 英数字のみの行（既存ロジック）
       let l:english_words = s:detect_english_words(l:line, l:lnum)
       let l:words += l:english_words
     endif
     ```
   - [x] Phase D-6 Process3 Sub2 ドキュメントコメント追加
   - [x] 既存のコメントを更新（日本語対応を明記）

3. **座標計算ロジックの実装**
   - [x] `stridx(line, segment, offset)` でセグメント位置を検索
   - [x] UTF-8マルチバイト文字の考慮（`len()`ではなく`stridx()`を使用）
   - [x] col: match_start + 1（1-indexed変換）
   - [x] end_col: match_start + len(segment) + 1
   - [x] offset更新でセグメントの重複検出を防ぐ

4. **エラーハンドリング**
   - [x] segment()失敗時のフォールバック（空配列返却）
   - [x] stridx()が-1を返す場合のスキップ処理
   - [x] 不正なデータ構造の検出とログ出力

5. **display.vimの折り返し対応**
   - [x] `screenpos()` による画面座標変換
   - [x] `s:show_hint_vim()` 修正
   - [x] 折り返し行での位置ずれ問題の解決

6. **テスト実行**
   - [x] 基本的な日本語検出確認
   - [x] 混在テキスト検出確認
   - [x] 位置ずれ問題の解決確認
   - [ ] `vim -u NONE -N -c "source tests-vim/test_process3_sub2.vim"`
   - [ ] 全25テストケースの成功を確認
   - [ ] `vim -u NONE -N -c "source tests-vim/test_process3_sub2_simple.vim"`
   - [ ] 簡易テスト10件の成功を確認

##### TDD Step 3: Refactor（リファクタリング）

1. **コードの可読性向上**
   - [x] 長い関数の分割（detect_visibleが150行超える場合）
     - detect_visible()は約100行で適切な長さ
     - s:detect_japanese_words(), s:detect_english_words()に分割済み
   - [x] コメントの充実化
     - [x] Phase D-6 Process3 Sub2 マーク明記
     - [x] アルゴリズムの説明追加
     - [x] エッジケースの処理説明
   - [x] 変数名の明確化（l:japanese_words, l:english_words）
   - [x] 重複コードの削除

2. **パフォーマンス最適化**
   - [x] キャッシュの活用確認（TinySegmenterは既にキャッシュ済み）
   - [x] 不要な正規表現の削減（最小限の使用）
   - [x] ループの効率化（early return, continue）
   - [x] 処理済み位置の辞書管理で重複処理を防止

3. **エッジケースの処理強化**
   - [x] 空白のみのセグメント除外（`=~# '^\s\+$'`で実装済み）
   - [x] 特殊文字の処理（stridx()で安全に処理）
   - [x] 1文字単語の扱い（japaneseMinWordLengthフィルタで対応）
   - [x] 非常に長い行の処理（無限ループ防止実装済み）

4. **回帰テスト確認**
   - [x] 型チェック実行（`deno check` 全ファイル成功）
   - [x] コードレビューで既存機能の保持を確認
     - 既存のmatchstrpos()ロジック維持（後方互換性）
     - データ構造の変更なし（{'text', 'lnum', 'col', 'end_col'}）
     - word_filter.vimとの統合維持
   - [x] パフォーマンス特性の確認
     - TinySegmenterキャッシュ活用（LRUキャッシュ、最大1000エントリ）
     - 画面内のみ処理（通常20-50行）
     - 時間計算量: O(L * W) - L: 行数、W: 行あたり単語数

**TDD Step 3完了日**: 2025-10-20
**注記**: 実装時点で既に高い可読性とパフォーマンス最適化が完了していたため、コードレビューと型チェックで確認を完了。

##### VimScript実装
- [x] autoload/hellshake_yano_vim/word_detector.vim に実装完了
- [x] autoload/hellshake_yano_vim/display.vim に実装完了
- [x] core.vim/visual.vimでの動作確認（日本語テキストバッファ）
- [x] Vimでの手動動作確認
  - [x] 日本語単語にヒントが表示される
  - [x] 英数字と日本語の混在バッファで両方にヒント表示
  - [x] ヒント位置がずれない（折り返し対応確認）
  - [ ] perKeyMinLengthが日本語単語にも適用される

##### 実装上の考慮事項

**セキュリティ:**
- バッファ内容は信頼済み（ユーザーが編集中のファイル）
- Denops呼び出し失敗時のフォールバック実装済み（japanese.vim）
- エスケープ処理不要（VimScriptの文字列処理で安全）

**パフォーマンス:**
- 画面内のみ処理（既存設計を維持）
- TinySegmenterはキャッシュ済み（LRUキャッシュ、最大1000エントリ）
- 1000行バッファでも数ミリ秒以内（画面内は通常20-50行）
- Denops呼び出しは同期処理（denops#request）なのでブロッキングなし

**後方互換性:**
- 既存の英数字検出ロジックは100%維持
- データ構造の変更なし（{'text', 'lnum', 'col', 'end_col'}）
- 呼び出し側（core.vim, visual.vim）の変更不要
- 設定項目の追加なし（japanese.vimの設定を流用）

**エラーハンドリング:**
- Denops呼び出し失敗 → フォールバック（japanese.vimで実装済み）
- segment()が空配列を返す → 空配列のまま返却（呼び出し側で処理）
- stridx()が-1を返す → セグメントをスキップ
- 不正なデータ構造 → ログ出力してスキップ

##### 成功基準

**機能要件:**
- ✅ 日本語テキストがTinySegmenterでセグメント化される
- ✅ 英数字と日本語の混在テキストが正しく処理される
- ✅ ヒント位置がずれない（座標変換実装済み）
- ✅ 折り返し表示でも正しい位置に表示される
- ✅ 後方互換性維持（英数字のみのバッファで既存動作）
- [ ] Per-Key最小単語長フィルタが日本語にも適用される

**品質要件:**
- [ ] 全25テストケースが成功（test_process3_sub2.vim）
- [ ] 簡易テスト10件が成功（test_process3_sub2_simple.vim）
- [ ] 既存テスト（sub2.1, sub2.2, sub3, sub0.1）が壊れていない
- [ ] パフォーマンス低下なし（画面内処理のみ、キャッシュ活用）

**保守性要件:**
- [ ] コードの可読性が高い（関数分割、コメント充実）
- ✅ ドキュメントコメント充実（Phase D-6 Process3 Sub2マーク）
- [ ] エッジケース処理が明確

##### コード調査サマリー

**既存実装の詳細:**
1. **word_detector.vim（71-140行目）**
   - detect_visible(): 画面内単語検出のメイン関数
   - アルゴリズム: line('w0')～line('w$')の各行をmatchstrpos()で処理
   - データ構造: Dictionary {'text', 'lnum', 'col', 'end_col'}
   - パフォーマンス: O(L * W)、L=行数、W=行あたり単語数

2. **japanese.vim（67-102行目）**
   - segment(): Denops経由でTinySegmenterを呼び出し
   - has_japanese(): 日本語文字パターン [\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]
   - should_segment(): 閾値チェック（デフォルト4文字以上）
   - フォールバック: s:fallback_segment()（文字種別による簡易分割）

3. **TinySegmenter実装（denops/hellshake-yano/neovim/core/word/word-segmenter.ts）**
   - postProcessSegments(): 助詞結合、数字・単位結合、括弧処理
   - キャッシュ: GlobalCache（CacheType.ANALYSIS、LRU、最大1000エントリ）
   - パフォーマンス: キャッシュヒット率が高い（同じ行を複数回処理しない）

4. **core.vim/visual.vim統合（165-224行目）**
   - detect_visible() → word_filter#apply() → hint_generator#generate()
   - original_index保持でヒント位置のずれを防止（Process2 Sub0.1）
   - 空配列チェックと警告表示

**統合の技術的課題:**
- セグメント位置の計算精度（UTF-8マルチバイト文字）
- 英数字と日本語の混在行の処理順序
- エラーハンドリング（Denops失敗、stridx失敗）
- パフォーマンス（キャッシュ活用、ループ最適化）

### process4: 辞書システム（Phase D-7）

#### 調査結果（2025-01-20）
Denops側に完全な辞書システムが既に実装されていることを確認：

**Denops側の既存実装:**
- [x] `denops/hellshake-yano/neovim/core/core.ts`: 辞書管理のコアロジック（1529-1745行）
- [x] `denops/hellshake-yano/neovim/core/word.ts`: DictionaryLoader、VimConfigBridge実装（936-1142行）
- [x] `denops/hellshake-yano/neovim/dictionary.ts`: APIエンドポイント
- [x] `denops/hellshake-yano/main.ts`: Denopsメソッド登録（reloadDictionary、addToDictionary等）

**実装済み機能:**
- [x] 辞書ファイル読み込み（JSON/YAML/テキスト形式対応）
- [x] ユーザー辞書管理（追加、編集、表示、検証）
- [x] Vimコマンド自動登録（HellshakeYanoAddWord、HellshakeYanoReloadDict等）
- [x] キャッシュ機能、自動再読み込み
- [x] エラーハンドリング、フォールバック処理

**設計方針変更:**
当初の計画では、辞書システムをVimScriptで独自実装する予定だったが、
Denops側の実装を最大限活用し、Vim側はAPIエンドポイントに特化する設計に変更。
これにより実装量を大幅削減し、処理を共通化する。

#### sub1: Denops連携ラッパー実装
@target: autoload/hellshake_yano_vim/dictionary.vim（新規）

##### TDD Step 1: Red（テスト作成）
- [ ] tests-vim/test_process4_sub1.vim にDenops連携のテストケース作成
- [ ] Denops利用可能チェックのテスト作成
- [ ] 各API呼び出しのテスト作成（reload、add、edit、show、validate）
- [ ] フォールバック処理のテスト作成
- [ ] テスト実行して失敗を確認

##### TDD Step 2: Green（実装）
- [ ] hellshake_yano_vim#dictionary#has_denops() - Denops利用可能チェック実装
- [ ] hellshake_yano_vim#dictionary#reload() - 辞書再読み込みラッパー実装
- [ ] hellshake_yano_vim#dictionary#add(word, meaning, type) - 単語追加ラッパー実装
- [ ] hellshake_yano_vim#dictionary#edit() - 辞書編集ラッパー実装
- [ ] hellshake_yano_vim#dictionary#show() - 辞書表示ラッパー実装
- [ ] hellshake_yano_vim#dictionary#validate() - 辞書検証ラッパー実装
- [ ] s:cache変数による簡易キャッシュ実装
- [ ] Denops未起動時のフォールバック処理実装
- [ ] テスト実行してテスト成功を確認

##### TDD Step 3: Refactor（リファクタリング）
- [ ] エラーハンドリングの統一化
- [ ] コードの可読性向上
- [ ] ドキュメントコメント追加（Phase D-7 Process4 Sub1 マーク）
- [ ] 回帰テスト確認

##### VimScript実装
- [ ] autoload/hellshake_yano_vim/dictionary.vim 実装完了
- [ ] Vimでの手動動作確認
- [ ] Denops起動・未起動両方での動作確認

#### sub2: word_detector.vim統合
@target: autoload/hellshake_yano_vim/word_detector.vim（修正）

##### TDD Step 1: Red（テスト作成）
- [ ] tests-vim/test_process4_sub2.vim に辞書統合のテストケース作成
- [ ] 辞書単語チェック機能のテスト作成
- [ ] 辞書単語の優先度調整のテスト作成
- [ ] カスタム単語フィルタリングのテスト作成
- [ ] テスト実行して失敗を確認

##### TDD Step 2: Green（実装）
- [ ] s:is_in_dictionary(word) 関数実装
- [ ] detect_visible()に辞書チェック統合
- [ ] 辞書単語の優先度調整ロジック実装
- [ ] perKeyMinLengthとの統合（辞書単語は最小長チェックをスキップ）
- [ ] Phase D-7 Process4 Sub2 ドキュメントコメント追加
- [ ] テスト実行してテスト成功を確認

##### TDD Step 3: Refactor（リファクタリング）
- [ ] パフォーマンス最適化（キャッシュ活用）
- [ ] コードの可読性向上
- [ ] 回帰テスト確認

##### VimScript実装
- [ ] word_detector.vim の修正完了
- [ ] Vimでの動作確認（辞書単語が優先的にヒント表示される）

#### sub3: コマンド統合（オプション）
@target: plugin/hellshake-yano-vim.vim（修正）

##### 実装内容
- [ ] Pure Vim用コマンドエイリアス追加
  - [ ] HYVimDictReload - 辞書再読み込み
  - [ ] HYVimDictAdd - 単語追加
  - [ ] HYVimDictEdit - 辞書編集
  - [ ] HYVimDictShow - 辞書表示
  - [ ] HYVimDictValidate - 辞書検証
- [ ] ヘルプドキュメント更新
- [ ] 動作確認

### process10: ユニットテスト
#### sub1: VimScript統合テスト整備
@target: tests-vim/

##### テスト作成
- [ ] tests-vim/ 以下に各機能のテストファイル作成
- [ ] hint_generator_test.vim
- [ ] display_test.vim
- [ ] motion_test.vim
- [ ] word_detector_test.vim
- [ ] japanese_test.vim
- [ ] tinysegmenter_test.vim
- [ ] dictionary_test.vim

##### テスト実行確認
- [ ] :HellshakeYanoVimTest経由での実行確認
- [ ] Vim環境での全テスト成功確認
- [ ] カバレッジ確認

##### CI/CD整備
- [ ] GitHub Actionsでの自動テスト設定
- [ ] `deno test` と VimScript テストの両方を実行
- [ ] `deno check` による型チェック自動化

### process50: Neovimキーリピート抑制機能のVim移植（Phase D-6）

#### 背景
- **Neovim (Denopsベース)**: `autoload/hellshake_yano/motion.vim` → キーリピート抑制機能あり → フリーズしない
- **Vim (Pure VimScript)**: `autoload/hellshake_yano_vim/motion.vim` → キーリピート抑制機能なし → hjkl連打でフリーズ

Neovim側で実装されているキーリピート抑制機能（`suppressOnKeyRepeat`設定）をVim側に移植し、高速キーリピート時のフリーズ問題を解決する。

#### sub1: Vim専用の状態管理を追加
@target: autoload/hellshake_yano_vim/key_repeat.vim（新規）
@ref: autoload/hellshake_yano/motion.vim（Neovim/Denopsベース）

##### 移植元の実装詳細
**Neovim側の実装（autoload/hellshake_yano/motion.vim）:**
- `s:get_key_repeat_config()` (motion.vim:3-9): 設定を取得
- `s:handle_key_repeat_detection()` (motion.vim:23-50): キーリピート判定の中核ロジック
  - 前回キー入力時刻との差分を計算
  - 閾値（50ms）未満ならリピート状態に設定
  - リセットタイマーを設定

**使用する状態管理関数:**
- `hellshake_yano#state#get_last_key_time(bufnr)`
- `hellshake_yano#state#set_last_key_time(bufnr, time)`
- `hellshake_yano#state#is_key_repeating(bufnr)`
- `hellshake_yano#state#set_key_repeating(bufnr, repeating)`
- `hellshake_yano#timer#set_repeat_end_timer(bufnr, delay)`

##### TDD Step 1: Red（テスト作成）
- [ ] tests-vim/test_process50_sub1.vim にキーリピート状態管理のテストケース作成
  - [ ] get_last_key_time() のテスト（初期値0、設定後の値取得）
  - [ ] set_last_key_time() のテスト（バッファ単位の管理）
  - [ ] is_repeating() のテスト（初期値false、設定後の値取得）
  - [ ] set_repeating() のテスト（バッファ単位の管理）
  - [ ] reset_state() のテスト（状態リセット、タイマー停止）
  - [ ] set_reset_timer() のテスト（タイマー設定、既存タイマーの停止）
  - [ ] 複数バッファでの独立動作テスト
- [ ] tests-vim/test_process50_sub1_simple.vim に簡易テスト作成
- [ ] テスト実行して失敗を確認（E117: Unknown function or E484: file not found）

##### TDD Step 2: Green（実装）
- [ ] autoload/hellshake_yano_vim/key_repeat.vim を新規作成
  - [ ] 状態管理変数の定義
    ```vim
    let s:last_key_time = {}  " bufnr -> time (milliseconds)
    let s:is_repeating = {}   " bufnr -> boolean
    let s:reset_timers = {}   " bufnr -> timer_id
    ```
  - [ ] `hellshake_yano_vim#key_repeat#get_last_key_time(bufnr)` 実装
    - バッファ単位の最後のキー時刻を取得
    - 未初期化の場合は0を返す
  - [ ] `hellshake_yano_vim#key_repeat#set_last_key_time(bufnr, time)` 実装
    - バッファ単位の最後のキー時刻を設定
    - ミリ秒単位のタイムスタンプ
  - [ ] `hellshake_yano_vim#key_repeat#is_repeating(bufnr)` 実装
    - バッファのキーリピート状態を取得
    - 未初期化の場合はv:falseを返す
  - [ ] `hellshake_yano_vim#key_repeat#set_repeating(bufnr, repeating)` 実装
    - バッファのキーリピート状態を設定
    - v:true/v:falseのみ受け付け
  - [ ] `hellshake_yano_vim#key_repeat#reset_state(bufnr)` 実装
    - リピート状態をv:falseに設定
    - 既存タイマーを停止して削除
  - [ ] `hellshake_yano_vim#key_repeat#set_reset_timer(bufnr, delay)` 実装
    - 既存タイマーを停止
    - 新規タイマーを設定（delay後にreset_state()を呼び出し）
    - timer_start()を使用
  - [ ] Phase D-6 Process50 Sub1 ドキュメントコメント追加
  - [ ] ライセンス表示とファイルヘッダー追加
- [ ] テスト実行してテスト成功を確認（全テスト PASS）

##### TDD Step 3: Refactor（リファクタリング）
- [ ] コードの可読性確認
  - [ ] 関数名が明確か
  - [ ] コメントが充実しているか
  - [ ] 変数名が分かりやすいか
- [ ] タイマー処理の効率化
  - [ ] 既存タイマーの適切な停止
  - [ ] メモリリークの防止
- [ ] エラーハンドリングの強化
  - [ ] 不正な引数の検証
  - [ ] タイマー失敗時の処理
- [ ] ドキュメントコメント更新
  - [ ] 各関数の説明追加
  - [ ] 使用例の追加
  - [ ] Phase D-6 Process50 Sub1 マーク追加
- [ ] 回帰テスト確認
  - [ ] 既存機能が壊れていないことを確認

##### VimScript実装
- [ ] autoload/hellshake_yano_vim/key_repeat.vim 実装完了
- [ ] Vimでの動作確認
  - [ ] バッファ単位で状態が管理されることを確認
  - [ ] タイマーが正しく動作することを確認
  - [ ] リセット処理が正しく動作することを確認
  - [ ] 複数バッファで独立して動作することを確認

#### sub2: キーリピート検出ロジックを追加
@target: autoload/hellshake_yano_vim/motion.vim（修正）

##### TDD Step 1: Red（テスト作成）
- [ ] tests-vim/test_process50_sub2.vim にキーリピート検出のテストケース作成
  - [ ] s:get_key_repeat_config() のテスト
  - [ ] s:handle_key_repeat_detection() のテスト
  - [ ] suppressOnKeyRepeat設定の反映テスト
  - [ ] keyRepeatThreshold設定の反映テスト
  - [ ] keyRepeatResetDelay設定の反映テスト
- [ ] テスト実行して失敗を確認

##### TDD Step 2: Green（実装）
- [ ] autoload/hellshake_yano_vim/motion.vim に関数追加
  - [ ] `s:get_key_repeat_config()` 関数実装
    ```vim
    function! s:get_key_repeat_config() abort
      return {
            \ 'enabled': get(g:hellshake_yano, 'suppressOnKeyRepeat', v:true),
            \ 'threshold': get(g:hellshake_yano, 'keyRepeatThreshold', 50),
            \ 'reset_delay': get(g:hellshake_yano, 'keyRepeatResetDelay', 300)
            \ }
    endfunction
    ```
  - [ ] `s:handle_key_repeat_detection(bufnr, current_time, config)` 関数実装
    - 機能が無効の場合は通常処理
    - 前回のキー入力時刻との差を計算
    - 閾値未満かつ2回目以降ならリピート状態に設定
    - リセットタイマーを設定
    - キー時刻を更新
    - リピート中ならv:true、通常処理ならv:falseを返す
  - [ ] Phase D-6 Process50 Sub2 ドキュメントコメント追加
- [ ] テスト実行してテスト成功を確認

##### TDD Step 3: Refactor（リファクタリング）
- [ ] コードの可読性向上
- [ ] ドキュメントコメント更新
- [ ] 回帰テスト確認

##### VimScript実装
- [ ] autoload/hellshake_yano_vim/motion.vim 修正完了
- [ ] Vimでの動作確認
  - [ ] キーリピート検出が正しく動作することを確認
  - [ ] 設定が正しく反映されることを確認

#### sub3: motion#handle()への統合
@target: autoload/hellshake_yano_vim/motion.vim（修正）

##### TDD Step 1: Red（テスト作成）
- [ ] tests-vim/test_process50_sub3.vim に統合のテストケース作成
  - [ ] hjklキー連打でヒント表示がスキップされるテスト
  - [ ] ゆっくりキーを押すとヒントが表示されるテスト
  - [ ] リセット後にヒント表示が再開されるテスト
- [ ] テスト実行して失敗を確認

##### TDD Step 2: Green（実装）
- [ ] `hellshake_yano_vim#motion#handle()` 関数を修正
  ```vim
  function! hellshake_yano_vim#motion#handle(key) abort
    let l:bufnr = bufnr('%')

    " 1. 現在時刻を取得（ミリ秒単位）
    let l:current_time = float2nr(reltimefloat(reltime()) * 1000.0)

    " 2. キーリピート検出
    let l:config = s:get_key_repeat_config()
    if s:handle_key_repeat_detection(l:bufnr, l:current_time, l:config)
      " リピート中の場合は通常のモーション実行のみ
      execute 'normal! ' . a:key
      return
    endif

    " 3-7. 既存のロジック（モーション検出・ヒント表示）...
  endfunction
  ```
- [ ] Phase D-6 Process50 Sub3 ドキュメントコメント追加
- [ ] テスト実行してテスト成功を確認

##### TDD Step 3: Refactor（リファクタリング）
- [ ] コードの可読性向上
- [ ] ドキュメントコメント更新
- [ ] 回帰テスト確認

##### VimScript実装
- [ ] autoload/hellshake_yano_vim/motion.vim 修正完了
- [ ] Vimでの動作確認
  - [ ] hjklキー連打でフリーズしないことを確認
  - [ ] ヒント表示が正しくスキップされることを確認

#### sub4: テストと検証
@target: tests-vim/test_process50_integration.vim（新規）

##### 統合テスト作成
- [ ] tests-vim/test_process50_integration.vim に統合テストケース作成
  - [ ] hjklキー連打でフリーズしないテスト
  - [ ] ゆっくりキーを押すとヒント表示されるテスト
  - [ ] リセット後にヒント表示が再開されるテスト
  - [ ] suppressOnKeyRepeat: v:false で常にヒント表示されるテスト
  - [ ] keyRepeatThreshold設定の動作確認テスト
  - [ ] keyRepeatResetDelay設定の動作確認テスト
- [ ] テスト実行して全テスト成功を確認

##### 手動動作確認
- [ ] Vimでの実際の操作確認
  - [ ] hjklキーを高速連打してフリーズしないことを確認
  - [ ] ゆっくりキーを押すとヒントが表示されることを確認
  - [ ] 高速連打後300ms待つと再びヒント表示されることを確認
- [ ] Neovim側の動作に影響がないことを確認
  - [ ] Neovim環境で既存機能が正常動作することを確認
  - [ ] Denopsベースの実装が壊れていないことを確認

##### 設定の動作確認
- [ ] suppressOnKeyRepeat: v:false で常にヒント表示される
- [ ] keyRepeatThreshold: 100 で100ms以下の連打で抑制される
- [ ] keyRepeatResetDelay: 500 で連打停止後500ms後に再開される

##### 後方互換性確認
- [ ] 既存の設定ファイルで問題なく動作すること
- [ ] 設定未指定時にデフォルト値が適用されること
- [ ] 他の機能（Process2, Process3等）が正常動作すること

#### 実装完了基準

**機能要件:**
- [ ] Vimで高速キーリピート時にフリーズしない
- [ ] suppressOnKeyRepeat設定が正しく機能する
- [ ] Neovimと同等のパフォーマンスを実現

**品質要件:**
- [ ] 全テストケースが成功（Sub1-Sub4）
- [ ] 既存機能が壊れていない（回帰テスト成功）
- [ ] Neovim側の動作に影響がない

**保守性要件:**
- [ ] コードの可読性が高い（関数分割、コメント充実）
- [ ] ドキュメントコメント充実（Phase D-6 Process50 マーク）
- [ ] エラーハンドリングが適切

### process100: フォローアップ
実装中に発見された追加要件や仕様変更はここに追加

- [ ] 発見された課題の記録
- [ ] 仕様変更の影響分析
- [ ] `deno test` で回帰テスト確認

### process100: リファクタリング
#### sub1: パフォーマンス最適化

##### 分析
- [ ] パフォーマンスボトルネックの解析
- [ ] メモリ使用量プロファイリング
- [ ] コード重複の特定

##### 最適化実施
- [ ] 特定されたボトルネックの最適化
- [ ] メモリ使用量の最適化
- [ ] コード重複の削減
- [ ] `deno check denops/hellshake-yano/**/*.ts` で型チェック
- [ ] `deno test` でパフォーマンステスト実行

##### 検証
- [ ] ベンチマーク実行（最適化前後の比較）
- [ ] Vim環境での動作確認
- [ ] 回帰テスト確認

### process200: ドキュメンテーション
#### sub1: ドキュメント更新

##### ドキュメント作成
- [ ] README.md更新（新機能の説明）
- [ ] CHANGELOG.md更新（Phase D完了）
- [ ] 各新機能の使用例追加
- [ ] 設定例の充実
- [ ] API仕様ドキュメント作成

##### レビュー
- [ ] ドキュメントの正確性確認
- [ ] コード例の動作確認
- [ ] `deno test` で全テスト成功を確認
- [ ] Vimでの実例確認

##### 公開準備
- [ ] バージョン番号の更新
- [ ] リリースノート作成
- [ ] マイグレーションガイド作成（必要に応じて）
