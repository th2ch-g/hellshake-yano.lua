# title: Phase A-5: 高度な機能の実装

**ステータス**: 📝 **計画中** (2025-10-16)

## 概要
- ビジュアルモード対応により、ビジュアル選択範囲内でヒント表示機能を実現
- 日本語単語検出により、日本語混在テキストでの基本的な単語境界認識を実現
- 設定システム拡張により、より柔軟なカスタマイズを実現
- パフォーマンス最適化により、キャッシュなしでも快適な動作を実現

### goal
- ユーザーがビジュアルモード（v/V/Ctrl-v）でテキストを選択中に、選択範囲内の単語にヒントが表示され、ヒント文字を入力することで目的の単語にジャンプできる
- 日本語混在テキスト（例: 「このファイルを開く」や「ファイル操作API」）で、文字種の切り替わりを境界として単語が検出され、ヒント表示できる
- 設定により最小単語長（min_word_length）や最大ヒント数（max_hints）を調整し、表示をカスタマイズできる

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 動作確認はneovimではなく、vimで行う
- ヒントジャンプはブロッキング方式で行う（Phase A-3で確立した方式を継承）
- git add, git commitの実行は、ユーザに実行の許可を得ること
- キャッシュシステムは実装しない（Denops版で実装予定）

## 開発のゴール
- Pure VimScriptでビジュアルモード対応を実装し、実用性を向上させる
- 日本語単語の基本的な境界検出を実装し、日本語環境での使用を可能にする
- 設定システムを拡張し、ユーザーが細かくカスタマイズできるようにする
- キャッシュなしでもパフォーマンスを最適化し、快適な動作を実現する
- Phase A-1～A-4で構築した基盤を維持しつつ、機能を拡張する

## 実装仕様

### データ構造

#### ビジュアルモード状態
```vim
" visual.vim 内部状態
let s:visual_state = {
  \ 'active': v:false,           " ビジュアルモードが有効か
  \ 'mode': '',                  " ビジュアルモードタイプ（v, V, Ctrl-v）
  \ 'start_line': 0,             " 選択開始行
  \ 'start_col': 0,              " 選択開始列
  \ 'end_line': 0,               " 選択終了行
  \ 'end_col': 0                 " 選択終了列
\ }
```

#### 日本語文字種
```vim
" 文字種の定義
" - 'hiragana': ひらがな（U+3040-U+309F）
" - 'katakana': カタカナ（U+30A0-U+30FF）
" - 'kanji': 漢字（U+4E00-U+9FAF）
" - 'alphanumeric': 英数字（\w）
" - 'other': その他
```

#### 拡張設定データ構造
```vim
let s:default_config = {
  \ " Phase A-1～A-4 の既存設定
  \ 'enabled': v:true,
  \ 'hint_chars': 'ASDFJKL',
  \ 'motion_enabled': v:true,
  \ 'motion_threshold': 2,
  \ 'motion_timeout_ms': 2000,
  \ 'motion_keys': ['w', 'b', 'e'],
  \
  \ " Phase A-5 新規追加
  \ 'use_japanese': v:false,         " 日本語検出有効化（デフォルト無効）
  \ 'min_word_length': 1,            " 最小単語長（文字数）
  \ 'visual_mode_enabled': v:true,   " ビジュアルモード対応
  \ 'max_hints': 49,                 " 最大ヒント数
  \ 'exclude_numbers': v:false,      " 数字のみの単語を除外
  \ 'debug_mode': v:false            " デバッグモード
\ }
```

### アルゴリズム

#### ビジュアルモード検出フロー
```
1. ビジュアルモードでユーザーがトリガーキーを押す
2. mode() 関数で現在のモードを取得（v, V, Ctrl-v）
3. getpos("'<") と getpos("'>") で選択範囲を取得
4. 選択範囲内の行を走査し、単語を検出
5. 検出した単語にヒントを生成
6. ヒント表示（既存のdisplay#show を利用）
7. 入力処理（既存のinput#wait_for_input を利用）
8. ジャンプ実行後、ビジュアル選択を解除
```

#### 日本語単語境界検出フロー
```
1. 行テキストを1文字ずつ走査
2. 各文字の文字種を判定（s:get_char_type）
   - char2nr() でUnicodeコードポイント取得
   - コードポイント範囲で文字種判定
3. 文字種が切り替わったら境界と判定
4. 境界ごとに単語データを作成
   - text: 単語文字列
   - lnum: 行番号
   - col: 開始列
   - end_col: 終了列
5. 最小単語長フィルタリング適用
6. 単語リストを返す
```

#### パフォーマンス最適化フロー
```
1. 設定から min_word_length, max_hints を取得
2. 画面内の行を走査開始
3. 各行で以下をチェック:
   - 早期リターン: 空行はスキップ
   - 早期リターン: max_hints に達したらループ終了
4. 単語検出後、フィルタリング:
   - 最小単語長チェック（strchars() < min_length）
   - 数字のみ除外（exclude_numbers が true の場合）
5. フィルタリング通過した単語のみ追加
6. 最終的な単語リストを返す
```

### ファイル構造
```
autoload/hellshake_yano_vim/
├── visual.vim                 # 新規作成: ビジュアルモード対応
├── word_detector.vim          # 既存: 日本語検出機能追加
├── config.vim                 # 既存: 新規設定項目追加
├── core.vim                   # 既存: visual統合のための軽微な変更
├── hint_generator.vim         # 既存: Phase A-3で実装済み
├── display.vim                # 既存: Phase A-1で実装済み
├── input.vim                  # 既存: Phase A-3で実装済み
├── jump.vim                   # 既存: Phase A-1で実装済み
└── motion.vim                 # 既存: Phase A-4で実装済み

plugin/hellshake-yano-vim.vim  # 既存: ビジュアルモードマッピング追加

tests-vim/hellshake_yano_vim/
├── test_visual.vim            # 新規作成: ビジュアルモードのテスト
├── test_word_detector.vim     # 既存: 日本語検出テスト追加
└── test_config.vim            # 既存: 新規設定のテスト追加
```

### パフォーマンス特性
- 時間計算量: O(L * C) - L: 画面内の行数、C: 行あたりの平均文字数
- 日本語検出は文字ごとの走査が必要（英数字検出より低速）
- 早期リターンとフィルタリングにより不要な処理を削減
- キャッシュなしでも1000行ファイルで200ms以内を目標

### ビジュアルモード仕様

#### デフォルトマッピング
```vim
" visual_mode_enabled が true の場合、自動的にマッピング
xnoremap <silent> <Leader>h :<C-u>call hellshake_yano_vim#visual#show()<CR>
```

#### カスタマイズ可能な<Plug>マッピング
```vim
" ユーザーが独自のキーにマッピングできる
xnoremap <silent> <Plug>(hellshake-yano-vim-visual)
      \ :<C-u>call hellshake_yano_vim#visual#show()<CR>
```

### 日本語検出仕様

#### 文字種判定
- **ひらがな**: U+3040-U+309F (12352-12447)
- **カタカナ**: U+30A0-U+30FF (12448-12543)
- **漢字**: U+4E00-U+9FAF (19968-40879)
- **英数字**: `\w` パターン

#### 境界検出ルール
1. 文字種が切り替わった時点を境界とする
2. 記号・空白は単語に含めない
3. 最小単語長未満の単語は除外

#### 制約
- TinySegmenter（形態素解析）は使用しない
- 助詞の結合などの高度な処理は Phase B（Denops版）で実装
- 精度より実装の簡潔さを優先

## 生成AIの学習用コンテキスト

### 既存実装ファイル
- /home/takets/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano_vim/core.vim
  - Phase A-1～A-4の実装が完了している
  - show()関数でヒント表示の統合処理を提供
  - visual.vim から呼び出すパターンを参考にする

- /home/takets/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano_vim/word_detector.vim
  - Phase A-2で実装済み
  - detect_visible()関数で画面内単語検出を提供
  - 日本語検出機能を追加する

- /home/takets/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano_vim/config.vim
  - Phase A-4で実装済み
  - get/set 関数で設定管理を提供
  - 新規設定項目を追加する

- /home/takets/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano_vim/input.vim
  - ブロッキング入力方式の実装を参考にする
  - wait_for_input()関数のパターンを理解する

### アーキテクチャドキュメント
- /home/takets/.config/nvim/plugged/hellshake-yano.vim/ARCHITECTURE.md
  - Phase A-1～A-4の実装状況
  - Phase A-5の位置づけと目標
  - 技術仕様とデータ構造

### Denops版参考実装
- /home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/word.ts
  - 日本語検出のアルゴリズムを参考にする（VimScriptに移植）
  - extractWords関数の実装パターン

## Process

### process1 visual.vim の実装
@target: /home/takets/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano_vim/visual.vim
@ref: /home/takets/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano_vim/core.vim

- [ ] スクリプトローカル変数 s:visual_state の定義
  - active, mode, start_line, start_col, end_line, end_col
- [ ] hellshake_yano_vim#visual#show() 関数の実装
  - mode() でビジュアルモードタイプ取得
  - getpos("'<") と getpos("'>") で選択範囲取得
  - 選択範囲内の単語検出
  - core#show() を呼び出してヒント表示
- [ ] hellshake_yano_vim#visual#init() 関数の実装
  - 状態変数の初期化処理
- [ ] hellshake_yano_vim#visual#get_state() 関数の実装
  - テスト用の状態取得関数（deepcopy()で返す）
- [ ] s:detect_words_in_range(start_line, end_line) 内部関数の実装
  - 範囲内の行を走査
  - word_detector#detect_visible() を利用
  - 選択範囲外の単語を除外
- [ ] エラーハンドリングの追加
  - 不正な選択範囲の処理
  - ビジュアルモード以外での呼び出し防止

### process2 word_detector.vim 日本語検出追加
@target: /home/takets/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano_vim/word_detector.vim
@ref: /home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/word.ts

- [ ] s:get_char_type(char) 関数の実装
  - char2nr() でUnicodeコードポイント取得
  - ひらがな判定（U+3040-U+309F）
  - カタカナ判定（U+30A0-U+30FF）
  - 漢字判定（U+4E00-U+9FAF）
  - 英数字判定（\w パターン）
  - その他の判定
- [ ] s:detect_japanese_words(line, lnum) 関数の実装
  - 行を1文字ずつ走査
  - 文字種の切り替わりで境界判定
  - 単語データの作成（text, lnum, col, end_col）
  - 最小単語長フィルタリング
- [ ] s:detect_alphanumeric_words(line, lnum) 関数の実装
  - 既存の英数字検出ロジックを関数化
  - matchstrpos() を使用
- [ ] hellshake_yano_vim#word_detector#detect_visible() の更新
  - use_japanese 設定チェック
  - 日本語検出 or 英数字検出の分岐
  - min_word_length フィルタリング追加
  - exclude_numbers フィルタリング追加
  - max_hints 制限の適用
- [ ] エラーハンドリングの追加
  - 不正な文字列の処理
  - Unicode範囲外の文字対応

### process3 config.vim 設定システム拡張
@target: /home/takets/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano_vim/config.vim

- [ ] デフォルト設定 s:default_config の更新
  - use_japanese, min_word_length, visual_mode_enabled, max_hints, exclude_numbers, debug_mode の追加
- [ ] hellshake_yano_vim#config#validate(config) 関数の実装
  - min_word_length のバリデーション（>= 1）
  - max_hints のバリデーション（1～100）
  - 型チェック（Boolean, Number）
- [ ] hellshake_yano_vim#config#get(key) の動作確認
  - 新規設定項目の取得テスト
- [ ] hellshake_yano_vim#config#set(key, value) の動作確認
  - バリデーション統合
  - 不正な値の拒否
- [ ] ドキュメントコメントの追加
  - 各設定項目の説明
  - 使用例の記載

### process4 パフォーマンス最適化
@target: /home/takets/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano_vim/word_detector.vim

- [ ] 早期リターン最適化
  - 空バッファチェック
  - 空行スキップ
  - max_hints 到達時のループ終了
- [ ] フィルタリング最適化
  - min_word_length で早期除外
  - strchars() による文字数計算
  - exclude_numbers による数字除外
- [ ] 単語検出の効率化
  - 不要な再計算を削減
  - ループの最適化
- [ ] ベンチマーク測定
  - 1000行ファイルでの処理時間測定
  - 日本語テキストでの性能確認
  - 目標: 200ms以内

### process5 キーマッピングの追加
@target: /home/takets/.config/nvim/plugged/hellshake-yano.vim/plugin/hellshake-yano-vim.vim
@ref: /home/takets/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano_vim/config.vim

- [ ] ビジュアルモードマッピングセクションの追加
  - "Visual Mode Mappings (Phase A-5)" コメント
- [ ] visual_mode_enabled チェックの実装
  - config#get('visual_mode_enabled')で有効化判定
- [ ] デフォルトマッピングの追加
  - xnoremap <Leader>h でヒント表示
- [ ] <Plug>マッピングの提供
  - <Plug>(hellshake-yano-vim-visual)
- [ ] ドキュメントコメントの追加
  - マッピングのカスタマイズ方法を記載

### process6 core.vim の統合
@target: /home/takets/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano_vim/core.vim
@ref: /home/takets/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano_vim/visual.vim

- [ ] hellshake_yano_vim#core#init() の更新
  - visual#init()の呼び出しを追加
  - 新規設定値の初期化確認
- [ ] hellshake_yano_vim#core#show() の更新確認
  - visual.vim から呼び出せることを確認
  - 既存機能との互換性維持
- [ ] コメントの更新
  - Phase A-5対応を明記

### process10 ユニットテスト

#### sub10.1 test_visual.vim の実装
@target: /home/takets/.config/nvim/plugged/hellshake-yano.vim/tests-vim/hellshake_yano_vim/test_visual.vim
@ref: /home/takets/.config/nvim/plugged/hellshake-yano.vim/tests-vim/hellshake_yano_vim/test_core.vim

- [ ] Test_visual_init() の実装
  - 初期化後の状態確認
  - active=v:false, mode='', start_line=0
- [ ] Test_visual_character_mode() の実装
  - 文字単位ビジュアルモード（v）での動作確認
  - 選択範囲内の単語検出確認
- [ ] Test_visual_line_mode() の実装
  - 行単位ビジュアルモード（V）での動作確認
  - 複数行選択時の単語検出確認
- [ ] Test_visual_block_mode() の実装
  - ブロック単位ビジュアルモード（Ctrl-v）での動作確認
- [ ] Test_visual_range_detection() の実装
  - getpos("'<"), getpos("'>") の動作確認
  - 範囲外の単語が除外されることを確認

#### sub10.2 test_word_detector.vim 日本語検出テスト追加
@target: /home/takets/.config/nvim/plugged/hellshake-yano.vim/tests-vim/hellshake_yano_vim/test_word_detector.vim

- [ ] Test_japanese_char_type_hiragana() の実装
  - ひらがな文字種判定のテスト
- [ ] Test_japanese_char_type_katakana() の実装
  - カタカナ文字種判定のテスト
- [ ] Test_japanese_char_type_kanji() の実装
  - 漢字文字種判定のテスト
- [ ] Test_japanese_word_boundary() の実装
  - 日本語単語境界検出のテスト
  - 例: 「このファイル」→「この」「ファイル」
- [ ] Test_mixed_text_detection() の実装
  - 日本語・英語混在テキストのテスト
  - 例: 「ファイル操作API」→「ファイル」「操作」「API」
- [ ] Test_min_word_length_filter() の実装
  - 最小単語長フィルタリングのテスト
- [ ] Test_exclude_numbers_filter() の実装
  - 数字除外フィルタリングのテスト

#### sub10.3 test_config.vim 新規設定テスト追加
@target: /home/takets/.config/nvim/plugged/hellshake-yano.vim/tests-vim/hellshake_yano_vim/test_config.vim

- [ ] Test_config_use_japanese() の実装
  - use_japanese 設定の取得・変更確認
- [ ] Test_config_min_word_length() の実装
  - min_word_length 設定の取得・変更確認
- [ ] Test_config_visual_mode_enabled() の実装
  - visual_mode_enabled 設定の取得・変更確認
- [ ] Test_config_max_hints() の実装
  - max_hints 設定の取得・変更確認
- [ ] Test_config_validation() の実装
  - バリデーション関数のテスト
  - 不正な値の拒否確認

#### sub10.4 テストランナーの更新
@target: /home/takets/.config/nvim/plugged/hellshake-yano.vim/plugin/hellshake-yano-vim.vim

- [ ] s:run_all_tests() にtest_visual.vimを追加
- [ ] 日本語テストの実行確認

### process50 フォローアップ

#### sub50.1 vim での動作確認
- [ ] Vimでビジュアルモードテスト
  - vモードでヒント表示確認
  - Vモードでヒント表示確認
  - Ctrl-vモードでヒント表示確認
- [ ] 日本語テキストでの動作確認
  - 日本語混在テキストで単語検出確認
  - 文字種境界の検出確認
- [ ] 新規設定のカスタマイズテスト
  - min_word_length を変更して動作確認
  - use_japanese を有効化して動作確認
  - max_hints を変更して動作確認

#### sub50.2 パフォーマンス確認
- [ ] 1000行ファイルでのベンチマーク
  - 英数字テキスト: 処理時間測定
  - 日本語テキスト: 処理時間測定
  - 目標: 200ms以内

#### sub50.3 エッジケースの確認
- [ ] 空のビジュアル選択での動作確認
- [ ] 全角記号を含む日本語テキストでの動作確認
- [ ] 非常に長い単語（50文字以上）での動作確認

### process100 リファクタリング

- [ ] コードの重複排除
  - 共通処理の関数化
  - 日本語・英数字検出ロジックの統合
- [ ] 関数の責務明確化
  - 各モジュールの役割を明確に
  - visual.vim のインターフェース整理
- [ ] スクリプトローカル変数の適切な管理
  - 不要なグローバル変数の削除
- [ ] コメントの整備
  - 目的、使用例、エラーハンドリングを記述
  - 日本語検出ロジックの詳細説明
- [ ] パフォーマンス最適化の確認
  - 不要な処理の削減
  - 早期リターンの活用

### process200 ドキュメンテーション

- [ ] ARCHITECTURE.md の更新
  - Phase A-5 セクションの追加
  - 実装状況を「完了」に更新
  - 技術的な実装詳細を記録
  - ビジュアルモード対応の説明
  - 日本語検出アルゴリズムの説明
  - データ構造の詳細
  - パフォーマンス特性の記載
- [ ] README.md の更新
  - Phase A-5 の機能説明を追加
  - 使用例の追加（ビジュアルモード、日本語テキスト）
  - 設定方法の説明
  - カスタマイズ例の追加
- [ ] コード内コメントの充実
  - 各関数の目的、パラメータ、戻り値を詳細に記述
  - アルゴリズムの説明を追加
  - エッジケースの処理説明
- [ ] CHANGELOG.md の更新
  - Phase A-5 の変更内容を記録
  - 新機能の説明
  - 破壊的変更の有無

