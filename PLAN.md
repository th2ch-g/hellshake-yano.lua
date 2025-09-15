# title: hjklキーリピート時のヒント表示抑制機能

## 概要

- hjklキーをリピート（押しっぱなし）している時は、ヒントの表示を抑制し、スムーズなスクロールを実現する

### goal

- hjklキーを押しっぱなしでスクロールする際に、不要なヒント表示を防ぎ、快適な操作体験を提供する

## 必須のルール

- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 各段階でテストを実行し、回帰がないことを確認すること
- 既存の動作に影響を与えないよう、機能は設定で有効/無効を切り替え可能にすること

## 開発のゴール

- キーリピート（連続入力）を検出する仕組みの実装
- リピート中はヒント表示を抑制する機能の追加
- 通常のhjkl操作には影響を与えない
- パフォーマンスへの影響を最小限に抑える

## 実装仕様

### キーリピート検出の仕組み

- **検出方法:** 連続するキー入力の時間間隔を測定
- **リピート判定基準:** 50ms以下の間隔で連続入力があればリピートと判定
- **状態管理:**
  - `is_key_repeating` フラグでリピート状態を管理
  - リピート終了後、300ms経過でフラグをリセット

### 現在の実装の分析

- **Vimスクリプト側 (autoload/hellshake_yano.vim):**
  - `hellshake_yano#motion()` 関数がhjklキーの押下を検知
  - `motion_count` が指定回数（デフォルト3回）に達したらヒント表示
  - タイマーによるカウントリセット機能あり（デフォルト2000ms）

- **TypeScript側 (denops/hellshake-yano/main.ts):**
  - `showHints()` メソッドでデバウンス処理を実装済み
  - `debounceDelay` による連続呼び出しの制御

## 生成AIの学習用コンテキスト

### Vimスクリプト実装ファイル

- [autoload/hellshake_yano.vim](~/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano.vim)
  - hellshake_yano#motion() 関数の定義（29-61行）
  - s:trigger_hints() 関数の定義（106-131行）

### TypeScript実装ファイル

- [denops/hellshake-yano/main.ts](~/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/main.ts)
  - Config インターフェース定義（28-59行）
  - showHints() メソッド（365-379行）
  - displayHints() 関数（1088-1195行）

### 設定ファイル

- [plugin/hellshake-yano.vim](~/.config/nvim/plugged/hellshake-yano.vim/plugin/hellshake-yano.vim)
  - デフォルト設定の定義（21-33行）
  - モーションキーマッピングの設定（112-133行）

## Process

### process1 キーリピート検出機能の実装

#### sub1 Vimスクリプト側の変数追加

@target: ~/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano.vim

- [x] `s:last_key_time` - 最後のキー入力時刻を記録する辞書を追加
- [x] `s:is_key_repeating` - キーリピート中かどうかのフラグ辞書を追加
- [x] `s:repeat_end_timer` - リピート終了検出用タイマー辞書を追加

#### sub2 hellshake_yano#motion() 関数の改修

@target: ~/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano.vim @ref: lines 29-61

- [x] 現在時刻と前回のキー入力時刻の差を計算するロジックを追加
- [x] 時間差が閾値（50ms）以下ならキーリピートと判定
- [x] リピート中はヒント表示（s:trigger_hints()）をスキップ
- [x] リピート終了検出タイマーの設定（300ms後にフラグリセット）

### process2 設定オプションの追加

#### sub1 デフォルト設定の追加

@target: ~/.config/nvim/plugged/hellshake-yano.vim/plugin/hellshake-yano.vim @ref: lines 21-33

- [x] `suppress_on_key_repeat` (boolean) - キーリピート時の抑制を有効化（デフォルト: v:true）
- [x] `key_repeat_threshold` (number) - リピート判定の閾値（デフォルト: 50）
- [x] `key_repeat_reset_delay` (number) - リピート終了判定の遅延（デフォルト: 300）

#### sub2 設定の伝播

@target: ~/.config/nvim/plugged/hellshake-yano.vim/plugin/hellshake-yano.vim @ref: line 226

- [x] denops側への設定送信時に新しい設定項目も含める

### process3 ヘルパー関数の追加

#### sub1 時間計測用関数の実装

@target: ~/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano.vim

- [x] `s:get_elapsed_time()` - 経過時間をミリ秒で取得する関数を追加
- [x] `s:reset_repeat_state()` - リピート状態をリセットする関数を追加

### process10 ユニットテスト

#### sub1 キーリピート検出のテスト

@target: ~/.config/nvim/plugged/hellshake-yano.vim/tests/key_repeat_test.ts

- [x] 通常のhjkl操作でヒントが表示されることを確認
- [x] 高速連続入力（50ms以下）でヒントが抑制されることを確認
- [x] リピート終了後、通常動作に戻ることを確認

#### sub2 設定オプションのテスト

- [x] suppress_on_key_repeat=false で機能が無効化されることを確認
- [x] 各閾値設定が正しく動作することを確認

### process50 フォローアップ

#### sub1 パフォーマンスの最適化

- [x] 時間計測処理のオーバーヘッドを測定
- [x] 必要に応じて最適化を実施

#### sub2 ユーザビリティの改善

- [x] デフォルト値の調整（ユーザーフィードバックに基づく）
- [x] デバッグモードの追加（キーリピート検出状態の可視化）

#### sub3 段階的対応（推奨）実装計画

- 優先度と対象ドメイン（上から順に対応）
  - Word抽出仕様の整合（denops/hellshake-yano/word.ts、denops/hellshake-yano/word/detector.ts）
    - 分割規則（snake/camel/kebab）、数字接頭辞（例: 0xFF→xFF）、最小長・数字除外、日本語除外の一貫性
  - 文字エンコーディング/位置（denops/hellshake-yano/utils/encoding.ts）
    - マルチバイトのbyte index/col計算の整合
  - ハイライト設定のバリデーション（plugin/hellshake-yano.vim）
    - 無効名拒否、長さ上限、先頭数字・特殊記号の扱い
  - 設定伝播/マネージャ（denops/hellshake-yano/main.ts、denops/hellshake-yano/word/manager.ts）
    - Vim→denops→検出層までの一貫性・後方互換
  - パフォーマンス/バッチ（denops/hellshake-yano/word.ts のバッチ処理・上限・キャッシュ）

- TDD手順（各ドメイン共通）
  - RED: 該当テストのみ実行し失敗を固定化
  - GREEN: 最小修正でパス（ローカル関数/分岐で限定対応）
  - REFACTOR: 重複除去・責務分離（共通化、条件整理）

- 検証サイクル（目安コマンド）
  - Word抽出: `deno test -A tests/word_test.ts tests/single_char_detection_test.ts tests/word_filtering_test.ts tests/japanese_exclusion*_test.ts`
  - エンコーディング: `deno test -A tests/encoding_test.ts`
  - ハイライト: `deno test -A tests/highlight_*_test.ts`
  - 設定/統合: `deno test -A tests/config_propagation_test.ts tests/integration_*_test.ts`
  - 仕上げ: `deno test -A`（閾値微調整と軽微リファクタ）

##### sub3 実装TODO

- [x] Word抽出: 失敗テスト群のRED確認（指定テストのみ実行）
- [x] extractWordsFromLine 改善: snake_case/kebab-case/camelCase 分割規則の整合
- [x] Word抽出: 数値接頭辞（0x/0b）処理の追加（例: `0xFF` → `xFF`）
- [x] Word抽出: 数字のみ/短すぎるトークンの除外ポリシー明確化（テスト基準に合わせる）
- [x] Word抽出: 日本語除外フラグの一貫適用（excludeJapanese / use_japanese）
- [x] Word抽出: 1行あたり上限の統一（100 or 200）とテスト期待の整合
- [x] Word抽出: GREEN確認（word関連テスト再実行）
- [x] エンコーディング: charIndexToByteIndex の境界ケース修正（マルチバイト）
- [x] エンコーディング: GREEN確認（encoding_test 再実行）
- [x] ハイライト: グループ名の検証強化（長さ上限、先頭文字、禁止文字）
- [x] ハイライト: 正規化・エラーメッセージ統一（s:apply_highlight系）
- [x] ハイライト: GREEN確認（highlight_*_test 再実行）
- [x] 設定伝播: updateConfig 受け口・マネージャ連携の整合（後方互換フラグ吸収）
- [x] 設定伝播: GREEN確認（config_propagation_test / integration_* 再実行）
- [x] パフォーマンス: バッチ処理/キャッシュ/閾値の微調整（必要時のみ）
- [x] 最終フルスイート: `deno test -A` でGREEN確認

### process100 リファクタリング

#### 分析結果サマリー
@target: ~/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano.vim

**重複コードの特定:**
- denops#notify('hellshake-yano', 'updateConfig') - 4箇所で重複（行281, 300, 346, 431）
- エラーハンドリングパターン - 7箇所で同じ構造
- denops準備チェック - 複数箇所で重複
- タイマー管理ロジック - 2箇所に分散

**責務が不明確な関数:**
- hellshake_yano#motion() - 40行以上、複数の責務
- s:init_count() - 通常カウントとキーリピート初期化が混在
- s:build_debug_info() - 20行以上のデバッグ情報構築

#### sub1 TDD Red Phase - テストファースト
@target: ~/.config/nvim/plugged/hellshake-yano.vim/tests/refactor_test.ts
- [ ] 共通関数のテスト作成（s:notify_denops_config, s:show_error, s:stop_and_clear_timer）
- [ ] 責務分離のテスト作成（s:process_motion_count, s:should_trigger_hints）
- [ ] エラーハンドリング統一のテスト作成

#### sub2 TDD Green Phase - リファクタリング実装
@target: ~/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano.vim

**共通関数の抽出:**
- [ ] s:notify_denops_config() - denops通知の共通化
- [ ] s:show_error(context, exception) - エラー表示の共通化
- [ ] s:stop_and_clear_timer(bufnr, dict_name) - タイマー管理の共通化
- [ ] s:is_denops_ready() - denops準備チェックの共通化

**責務の分離:**
- [ ] s:process_motion_count(bufnr) - カウント処理のみ
- [ ] s:should_trigger_hints(bufnr) - ヒントトリガー判定のみ
- [ ] s:set_motion_timeout(bufnr) - タイムアウト設定のみ
- [ ] hellshake_yano#motion() のリファクタリング - 10-15行に短縮

**既存関数の更新:**
- [ ] hellshake_yano#set_count() - 共通関数を使用
- [ ] hellshake_yano#set_timeout() - 共通関数を使用
- [ ] hellshake_yano#update_highlight() - 共通関数を使用
- [ ] hellshake_yano#set_counted_motions() - 共通関数を使用

#### sub3 TDD Refactor Phase - 最適化
- [ ] 不要な関数呼び出しの削減
- [ ] 変数アクセスの最適化
- [ ] 条件分岐の簡略化
- [ ] 関数の並び順を論理的に整理
- [ ] コメントの追加・更新

#### 期待される成果
- コード行数: 約15-20%削減
- 重複コード: 4箇所→1箇所に統合
- 関数の責務: 明確に分離
- エラーハンドリング: 統一された形式
- 保守性: 大幅に向上

### process200 ドキュメンテーション

- [ ] README.mdに新機能の説明を追加
- [ ] 設定オプションの詳細をドキュメント化
- [ ] トラブルシューティングガイドの追加
