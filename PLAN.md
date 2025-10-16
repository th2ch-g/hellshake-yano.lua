# title: Phase A-4: モーション連打検出機能の実装

**ステータス**: ✅ **完了** (2025-10-16)

## 概要
- w/b/eキーを連続で押下（連打）したときにヒント表示を自動的にトリガーする機能を実装
- ユーザーは明示的なコマンド呼び出しなしに、自然なモーション操作の延長でヒントジャンプ機能を利用可能になる

### goal
- ユーザーが `w` キーを2回連続で押すと、自動的に画面内の単語にヒント（A, S, D, F...）が表示され、ヒント文字を入力することで目的の単語にジャンプできる
- 同様に `b`（後方移動）、`e`（単語末尾移動）でも同じ動作を実現
- タイムアウト（デフォルト2秒）内に連打しないとカウントがリセットされる

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 動作確認はneovimではなく、vimで行う
- ヒントジャンプはブロッキング方式で行う（Phase A-3で確立した方式を継承）
- git add, git commitの実行は、ユーザに実行の許可を得ること

## 開発のゴール
- モーション連打検出機能を実装し、hellshake-yano-vimを実用的なプラグインとして完成させる
- Phase A-1～A-3で構築した基盤（単語検出、ヒント生成、入力処理）を活用
- 設定可能なパラメータ（連打回数の閾値、タイムアウト時間、対象キー）を提供
- vim-searchxの実装パターンを参考にしつつ、hellshake-yano独自の設計を維持

## 実装仕様

### データ構造

#### モーション状態管理
```vim
let s:motion_state = {
  \ 'last_motion': '',           " 最後に実行されたモーション（'w', 'b', 'e'）
  \ 'last_motion_time': 0,       " 最後のモーション実行時刻（reltime()）
  \ 'motion_count': 0,           " 連続実行カウント
  \ 'timeout_ms': 2000,          " タイムアウト時間（デフォルト2秒）
  \ 'threshold': 2               " ヒント表示トリガーの閾値（デフォルト2回）
\ }
```

#### 設定データ構造
```vim
let s:default_config = {
  \ 'enabled': v:true,
  \ 'hint_chars': 'ASDFJKL',
  \ 'motion_enabled': v:true,
  \ 'motion_threshold': 2,
  \ 'motion_timeout_ms': 2000,
  \ 'motion_keys': ['w', 'b', 'e']
\ }
```

### アルゴリズム

#### モーション連打検出フロー
```
1. モーションキー（w/b/e）がマッピングされた関数を呼び出す
2. 前回のモーションとの時間差をチェック
   - タイムアウト内 && 同じモーション → カウント++
   - タイムアウト外 || 異なるモーション → カウント=1にリセット
3. カウントが閾値以上 → ヒント表示トリガー
4. ヒント表示後はカウントリセット（連続表示を防ぐ）
5. 通常モーション実行（ヒント表示しない場合）
6. 現在時刻と現在モーションを記録
```

### ファイル構造
```
autoload/hellshake_yano_vim/
├── motion.vim                 # 新規作成: モーション連打検出
├── config.vim                 # 新規作成: 設定管理
├── core.vim                   # 既存: motion統合のための軽微な変更
├── word_detector.vim          # 既存: Phase A-2で実装済み
├── hint_generator.vim         # 既存: Phase A-3で実装済み
├── display.vim                # 既存: Phase A-1で実装済み
├── input.vim                  # 既存: Phase A-3で実装済み
└── jump.vim                   # 既存: Phase A-1で実装済み

plugin/hellshake-yano-vim.vim  # 既存: キーマッピング追加

tests-vim/hellshake_yano_vim/
└── test_motion.vim            # 新規作成: モーション検出のテスト
```

### キーマッピング仕様

#### デフォルトマッピング
```vim
" motion_enabled が true の場合、自動的にマッピング
nnoremap <silent> w :<C-u>call hellshake_yano_vim#motion#handle('w')<CR>
nnoremap <silent> b :<C-u>call hellshake_yano_vim#motion#handle('b')<CR>
nnoremap <silent> e :<C-u>call hellshake_yano_vim#motion#handle('e')<CR>
```

#### カスタマイズ可能な<Plug>マッピング
```vim
" ユーザーが独自のキーにマッピングできる
nnoremap <silent> <Plug>(hellshake-yano-vim-w)
      \ :<C-u>call hellshake_yano_vim#motion#handle('w')<CR>
nnoremap <silent> <Plug>(hellshake-yano-vim-b)
      \ :<C-u>call hellshake_yano_vim#motion#handle('b')<CR>
nnoremap <silent> <Plug>(hellshake-yano-vim-e)
      \ :<C-u>call hellshake_yano_vim#motion#handle('e')<CR>
```

### パフォーマンス特性
- 時間計算: `reltime()` と `reltimefloat()` を使用（ミリ秒精度）
- 状態管理: スクリプトローカル変数で効率的に管理
- モーション実行: `execute 'normal! ' . a:motion_key` で通常のVimモーションを実行

## 生成AIの学習用コンテキスト

### 既存実装ファイル
- /home/takets/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano_vim/core.vim
  - Phase A-3までの実装が完了している
  - show()関数でヒント表示の統合処理を提供
  - 状態管理のパターンを参考にする

- /home/takets/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano_vim/input.vim
  - ブロッキング入力方式の実装を参考にする
  - wait_for_input()関数のパターンを理解する

- /home/takets/.config/nvim/plugged/hellshake-yano.vim/plugin/hellshake-yano-vim.vim
  - エントリーポイントの構造を理解
  - キーマッピングの追加箇所を把握

### アーキテクチャドキュメント
- /home/takets/.config/nvim/plugged/hellshake-yano.vim/ARCHITECTURE.md
  - Phase A-1～A-3の実装状況
  - Phase A-4の位置づけと目標
  - 技術仕様とデータ構造

### 参考実装
- vim-searchx
  - タイマーベースの入力処理
  - v:count1を活用したカウント検出
  - reltime()による時間管理

## Process

### process1 motion.vim の実装
@target: /home/takets/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano_vim/motion.vim
@ref: /home/takets/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano_vim/core.vim

- [x] スクリプトローカル変数 s:motion_state の定義
  - last_motion, last_motion_time, motion_count, timeout_ms, threshold
- [x] hellshake_yano_vim#motion#init() 関数の実装
  - 状態変数の初期化処理
- [x] hellshake_yano_vim#motion#handle(motion_key) 関数の実装
  - 時間差チェック（reltime()使用）
  - カウント更新ロジック（タイムアウトチェック、同一モーションチェック）
  - 閾値チェックとヒント表示トリガー
  - 通常モーション実行（execute 'normal!'）
  - 状態記録（last_motion, last_motion_time更新）
- [x] hellshake_yano_vim#motion#set_threshold(count) 関数の実装
  - 閾値設定のセッター
- [x] hellshake_yano_vim#motion#set_timeout(ms) 関数の実装
  - タイムアウト設定のセッター
- [x] hellshake_yano_vim#motion#get_state() 関数の実装
  - テスト用の状態取得関数（deepcopy()で返す）
- [x] エラーハンドリングの追加
  - 不正なmotion_keyの処理
  - reltime()のエラー処理

### process2 config.vim の実装
@target: /home/takets/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano_vim/config.vim

- [x] デフォルト設定 s:default_config の定義
  - enabled, hint_chars, motion_enabled, motion_threshold, motion_timeout_ms, motion_keys
- [x] グローバル変数 g:hellshake_yano_vim_config のマージ処理
  - extend()でユーザー設定とデフォルト設定をマージ
- [x] hellshake_yano_vim#config#get(key) 関数の実装
  - 設定値取得のゲッター
  - グローバル変数を優先、デフォルト値をフォールバック
- [x] hellshake_yano_vim#config#set(key, value) 関数の実装
  - 設定値変更のセッター
  - グローバル変数を動的に更新
- [x] ドキュメントコメントの追加
  - 各設定項目の説明
  - 使用例の記載

### process3 キーマッピングの追加
@target: /home/takets/.config/nvim/plugged/hellshake-yano.vim/plugin/hellshake-yano-vim.vim
@ref: /home/takets/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano_vim/config.vim

- [x] モーション連打検出セクションの追加
  - "Motion Key Mappings (Phase A-4)" コメント
- [x] motion_enabled チェックの実装
  - config#get('motion_enabled')で有効化判定
- [x] 対象キーのループマッピング
  - config#get('motion_keys')からキーリスト取得
  - execute でnnoremap を動的に生成
- [x] <Plug>マッピングの提供
  - <Plug>(hellshake-yano-vim-w)
  - <Plug>(hellshake-yano-vim-b)
  - <Plug>(hellshake-yano-vim-e)
- [x] ドキュメントコメントの追加
  - マッピングのカスタマイズ方法を記載

### process4 core.vim の統合
@target: /home/takets/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano_vim/core.vim
@ref: /home/takets/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano_vim/motion.vim

- [x] hellshake_yano_vim#core#init() の更新
  - motion#init()の呼び出しを追加
  - config#get()で設定値を取得
  - motion#set_threshold()とmotion#set_timeout()の呼び出し
- [x] コメントの更新
  - Phase A-4対応を明記

### process10 ユニットテスト

#### sub10.1 test_motion.vim の実装
@target: /home/takets/.config/nvim/plugged/hellshake-yano.vim/tests-vim/hellshake_yano_vim/test_motion.vim
@ref: /home/takets/.config/nvim/plugged/hellshake-yano.vim/tests-vim/hellshake_yano_vim/test_core.vim

- [x] Test_motion_init() の実装
  - 初期化後の状態確認
  - last_motion='', motion_count=0, threshold=2
- [x] Test_motion_single_press() の実装
  - 1回だけモーションを実行
  - カウント=1、last_motion='w'を確認
- [x] Test_motion_double_press_triggers_hint() の実装
  - 2回連続でモーション実行
  - ヒント表示のトリガー確認
  - core#get_state().hints_visible == v:true
- [x] Test_motion_timeout_reset() の実装
  - タイムアウト設定を短く（100ms）
  - 1回実行→200ms待機→2回目実行
  - カウントがリセットされることを確認
- [x] Test_motion_different_key_reset() の実装
  - wキー実行→bキー実行
  - カウントがリセットされることを確認
  - last_motion='b', motion_count=1
- [x] Test_motion_set_threshold() の実装
  - 閾値を3に設定
  - 2回連打では表示されず、3回で表示されることを確認
- [x] Test_motion_set_timeout() の実装
  - タイムアウトを500msに設定
  - 動作確認

#### sub10.2 test_config.vim の実装
@target: /home/takets/.config/nvim/plugged/hellshake-yano.vim/tests-vim/hellshake_yano_vim/test_config.vim

- [x] Test_config_get_default() の実装
  - デフォルト設定値の取得確認
- [x] Test_config_set_and_get() の実装
  - 設定値の変更と取得を確認
- [x] Test_config_user_override() の実装
  - グローバル変数でのオーバーライドを確認

#### sub10.3 統合テストの追加
@target: /home/takets/.config/nvim/plugged/hellshake-yano.vim/tests-vim/hellshake_yano_vim/test_integration.vim

- [x] Test_integration_motion_to_hint_to_jump() の実装
  - モーション連打→ヒント表示→入力→ジャンプの全フロー確認
  - テストバッファ準備
  - 2回w連打→ヒント表示確認
  - ヒント入力（モック）→ジャンプ確認

#### sub10.4 テストランナーの更新
@target: /home/takets/.config/nvim/plugged/hellshake-yano.vim/plugin/hellshake-yano-vim.vim

- [x] s:run_all_tests() にtest_motion.vimを追加
- [x] s:run_all_tests() にtest_config.vimを追加

### process50 フォローアップ

#### sub50.1 vim での動作確認
- [x] Vimで実際にモーション連打を試す
  - wキー2回連打→ヒント表示確認
  - bキー2回連打→ヒント表示確認
  - eキー2回連打→ヒント表示確認
- [x] タイムアウト動作の確認
  - ゆっくり押すとリセットされることを確認
- [x] 異なるモーションでのリセット確認

#### sub50.2 設定のカスタマイズテスト
- [x] .vimrcで設定を変更して動作確認
  - motion_threshold: 3 に変更
  - motion_timeout_ms: 1500 に変更
  - motion_keys: ['w', 'b'] のみに変更

#### sub50.3 エッジケースの確認
- [x] 空バッファでの動作確認
- [x] 1行だけのバッファでの動作確認
- [x] 画面外への移動時の動作確認

### process100 リファクタリング

- [x] コードの重複排除
  - 共通処理の関数化
- [x] 関数の責務明確化
  - 各モジュールの役割を明確に
- [x] スクリプトローカル変数の適切な管理
  - 不要なグローバル変数の削除
- [x] コメントの整備
  - 目的、使用例、エラーハンドリングを記述
- [x] パフォーマンス最適化
  - 不要な処理の削減
  - 時間計算の効率化

### process200 ドキュメンテーション

- [x] ARCHITECTURE.md の更新
  - Phase A-4 セクションの追加
  - 実装状況を「完了」に更新
  - 技術的な実装詳細を記録
  - モーション連打検出アルゴリズムの説明
  - データ構造の詳細
  - パフォーマンス特性の記載
- [x] README.md の更新
  - Phase A-4 の機能説明を追加
  - 使用例の追加（モーション連打の例）
  - 設定方法の説明
  - カスタマイズ例の追加
- [x] コード内コメントの充実
  - 各関数の目的、パラメータ、戻り値を詳細に記述
  - アルゴリズムの説明を追加
  - エッジケースの処理説明
- [x] CHANGELOG.md の作成
  - Phase A-4 の変更内容を記録
  - 新機能の説明
  - 破壊的変更の有無
