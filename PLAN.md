# title: キー別の最小文字数設定機能

## 概要
- 各キーごとに異なる最小文字数（min_word_length）を設定可能にし、キーの特性に応じた柔軟なヒント表示を実現する

### goal
- `v`のような近距離移動キーでは1文字からヒントを表示し、精密な移動を可能にする
- `hjkl`のような頻繁に使うキーでは2文字以上でノイズを削減する
- キー切り替え時は即座にヒントを再計算し、スムーズな操作感を提供する

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 既存の`min_word_length`設定との後方互換性を維持すること
- Vimの「押したキーが即座に反映される」原則を守ること

## 開発のゴール
- キーごとに異なる最小文字数を設定できる柔軟な設定システムの実装
- 異なる閾値のキー間で切り替えた際の即座のヒント再計算
- パフォーマンスを維持しながら、より細かい制御を可能にする

## 実装仕様
- 設定例:
  ```vim
  let g:hellshake_yano = {
    \ 'per_key_min_length': {
    \   'v': 1,   " 近距離精密移動
    \   'V': 1,   " ビジュアルライン選択
    \   'w': 1,   " 次の単語頭
    \   'b': 1,   " 前の単語頭
    \   'h': 2,   " 左移動（ノイズ削減）
    \   'j': 2,   " 下移動
    \   'k': 2,   " 上移動
    \   'l': 2,   " 右移動
    \ },
    \ 'default_min_word_length': 2,
    \ }
  ```

## 生成AIの学習用コンテキスト
### 現在の実装
- denops/hellshake-yano/main.ts
  - Config型の定義（現在はグローバルなmin_word_length設定のみ）
  - showHints関数の実装
- denops/hellshake-yano/word/detector.ts
  - applyFiltersメソッドでの文字数フィルタリング
  - 現在は全キー共通のmin_word_lengthを使用
- autoload/hellshake_yano.vim
  - hellshake_yano#motion関数でのキー処理
  - s:get_motion_keys関数でのキー設定管理

## Process
### process1 設定構造の拡張
#### sub1 Config型の更新
@target: denops/hellshake-yano/main.ts
@ref: denops/hellshake-yano/word/detector.ts
- [ ] Config interfaceに`per_key_min_length?: Record<string, number>`を追加
- [ ] `default_min_word_length?: number`を追加
- [ ] `current_key_context?: string`を内部使用として追加

#### sub2 VimScript側の設定拡張
@target: plugin/hellshake-yano.vim
@ref: autoload/hellshake_yano.vim
- [ ] デフォルト設定に`per_key_min_length`と`default_min_word_length`を追加
- [ ] 設定の検証ロジックを追加

### process2 ヒント管理システムの実装
#### sub1 HintManagerクラスの新規作成
@target: denops/hellshake-yano/hint/manager.ts (新規)
@ref: denops/hellshake-yano/main.ts
- [ ] HintManagerクラスを作成
- [ ] onKeyPressメソッドで既存ヒントのクリアと再生成を実装
- [ ] getMinLengthForKeyメソッドでキー別の闾値取得ロジックを実装
- [ ] clearCurrentHintsメソッドで即座のヒントクリアを実装

### process3 コンテキスト情報の伝播
#### sub1 WordDetectorの拡張
@target: denops/hellshake-yano/word/detector.ts
@ref: denops/hellshake-yano/word/manager.ts
- [ ] DetectionContextインターフェースを追加
- [ ] detectWordsメソッドにcontext引数を追加
- [ ] applyFiltersメソッドをキー別フィルタリングに対応

#### sub2 WordManagerの更新
@target: denops/hellshake-yano/word/manager.ts
- [ ] detectWordsメソッドにキー情報を伝播
- [ ] キー情報をセッションで管理する機能を追加

### process4 モーション処理との統合
#### sub1 VimScript側のキー情報伝達
@target: autoload/hellshake_yano.vim
@ref: denops/hellshake-yano/main.ts
- [ ] hellshake_yano#motion関数でキー情報をDenopsに伝達
- [ ] hellshake_yano#denops#show_hints_with_key関数を新規追加
- [ ] ビジュアルモード用の処理も更新

#### sub2 Denops側のキー情報受信
@target: denops/hellshake-yano/main.ts
- [ ] showHintsWithKeyメソッドを実装
- [ ] dispatcherにshowHintsWithKeyを登録
- [ ] HintManagerとの連携を実装

### process5 キー切り替え時の即座再計算
#### sub1 ヒントクリアロジックの実装
@target: denops/hellshake-yano/main.ts
@ref: denops/hellshake-yano/hint/manager.ts
- [ ] 既存ヒントの即座クリア機能を実装
- [ ] 非同期処理の適切な管理
- [ ] デバウンス処理の見直し

#### sub2 再生成の最適化
@target: denops/hellshake-yano/word/detector.ts
- [ ] キー別の単語キャッシュ機構を実装
- [ ] 不要な再計算を避ける最適化

### process10 ユニットテスト
@target: tests/per_key_min_length_test.ts (新規)
- [ ] キー別設定の動作テスト
- [ ] デフォルト値へのフォールバックテスト
- [ ] キー切り替え時の再計算テスト
- [ ] パフォーマンステスト（大量単語での切り替え）
- [ ] 後方互換性テスト

### process20 統合テスト
@target: tests/integration_test.ts
- [ ] 実際の編集シナリオでの動作確認
- [ ] 異なる闾値間の頻繁な切り替えテスト
- [ ] ビジュアルモードでの動作確認

### process50 フォローアップ
#### sub1 プリセット機能の追加（将来的な拡張）
- [ ] 近距離精密移動プリセット
- [ ] 中距離移動プリセット
- [ ] カスタムプリセットの定義機能

#### sub2 学習機能の検討（将来的な拡張）
- [ ] ユーザーの選択パターンを記録
- [ ] よく選ばれる単語長の自動調整

### process100 リファクタリング
- [ ] 既存のmin_word_length処理を新システムに統一
- [ ] 重複コードの削除
- [ ] パフォーマンスボトルネックの改善

### process200 ドキュメンテーション
- [ ] README.mdにキー別設定の説明を追加
- [ ] README_ja.mdにも同様の説明を追加
- [ ] 設定例とユースケースを追加
- [ ] 移行ガイドの作成（既存設定からの移行方法）
- [ ] パフォーマンスへの影響に関する注意事項を追加
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

#### 詳細調査結果（2025-09-15実施）

##### 重複コード分析
@target: ~/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano.vim

**1. denops#notify('hellshake-yano', 'updateConfig')の重複（4箇所）:**
- 306-308行目: `hellshake_yano#set_count`関数内
- 322-325行目: `hellshake_yano#set_timeout`関数内
- 366-369行目: `hellshake_yano#update_highlight`関数内
- 544-547行目: `hellshake_yano#set_counted_motions`関数内
- 共通パターン: `if exists('g:hellshake_yano_ready') && g:hellshake_yano_ready`チェック後に呼び出し

**2. エラーハンドリングパターンの重複（7箇所）:**
- 235-241行目: `s:trigger_hints`関数内
- 254-260行目: `hellshake_yano#hide`関数内
- 358-375行目: `hellshake_yano#update_highlight`関数内
- 共通パターン: try-catch構造で`s:show_error`呼び出し

**3. denops準備チェックの重複（6箇所）:**
- 229-232行目、250-252行目、306行目、323行目、367行目、545行目
- 2種類のパターン: 早期return型と条件実行型

**4. タイマー管理ロジックの分散:**
- 69-73行目、118-122行目、135-138行目、171-173行目
- 共通処理: timer_stop → unlet の繰り返し

##### 関数責務分析

**hellshake_yano#motion()関数（46-111行、66行）:**
- 現在の責務（6つ混在）:
  1. プラグイン状態チェック
  2. バッファ初期化管理
  3. キーリピート検出制御
  4. タイマー管理
  5. 移動カウント管理
  6. デバッグ・パフォーマンス監視
- サイクロマティック複雑度: 約8
- 認知的複雑度: 高（複数責務の絡み合い）

**s:init_count()関数（33-43行）:**
- 3つの異なる責務混在:
  1. 移動カウント初期化
  2. キーリピート検出初期化
  3. データ存在チェック
- 問題: 関数名と実装の不一致

**s:build_debug_info()関数（426-459行、34行）:**
- 4つの情報カテゴリ混在:
  1. 基本設定情報
  2. 動作設定
  3. バッファ状態
  4. キーリピート・タイミング
- 問題: データ収集と整形処理の混在

##### テスト基盤調査結果

**現状:**
- `tests/refactor_test.ts`: 存在しない（新規作成必要）
- VimScriptテスト: 1ファイルのみ（visual_test.vim）
- TypeScriptテスト: 44ファイル（充実したテスト基盤）
- テストヘルパー: mock.ts、testRunner.ts完備

**テストカバレッジ:**
- テスト済み: 高度な機能（エンコーディング、日本語処理、ヒント生成）
- 未実装: 共通関数群（collectDebugInfo、recordPerformance等）

#### sub1 TDD Red Phase - テストファースト
@target: ~/.config/nvim/plugged/hellshake-yano.vim/tests/refactor_test.ts
- [x] 共通関数のテスト作成（s:notify_denops_config, s:show_error, s:stop_and_clear_timer）
- [x] 責務分離のテスト作成（s:process_motion_count, s:should_trigger_hints）
- [x] エラーハンドリング統一のテスト作成

#### sub2 TDD Green Phase - リファクタリング実装
@target: ~/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano.vim

**共通関数の抽出:**
- [x] s:notify_denops_config() - denops通知の共通化（4箇所→1箇所）
- [x] s:show_error(context, exception) - エラー表示の共通化（7箇所→1箇所）
- [x] s:stop_and_clear_timer(bufnr, dict_name) - タイマー管理の統一
- [x] s:is_denops_ready() - denops準備チェックの共通化（6箇所→1箇所）
- [x] s:call_denops_function() - エラーハンドリング付きdenops呼び出し（追加実装）

**責務の分離:**
- [x] s:process_motion_count(bufnr) - カウント処理のみ
- [x] s:should_trigger_hints(bufnr) - ヒントトリガー判定のみ
- [x] s:set_motion_timeout(bufnr) - タイムアウト設定のみ
- [x] s:handle_debug_display() - デバッグ表示処理（追加実装）
- [x] hellshake_yano#motion() のリファクタリング - 66行→13行に短縮（目標達成）

**初期化関数の再設計:**
- [x] s:init_buffer_state(bufnr) - 包括的初期化（新規）
- [x] s:init_motion_tracking(bufnr) - 移動追跡専用（分離）
- [x] s:init_key_repeat_detection(bufnr) - キーリピート専用（分離）

**デバッグ機能の分離:**
- [ ] s:collect_debug_data() - データ収集専用（今後の課題）
- [ ] s:format_debug_output() - 整形処理専用（今後の課題）

**既存関数の更新:**
- [x] hellshake_yano#set_count() - 共通関数を使用
- [x] hellshake_yano#set_timeout() - 共通関数を使用
- [x] hellshake_yano#update_highlight() - 共通関数を使用（既存実装）
- [x] hellshake_yano#set_counted_motions() - 共通関数を使用

#### sub3 TDD Refactor Phase - 最適化
- [x] 不要な関数呼び出しの削減
- [x] 変数アクセスの最適化
- [x] 条件分岐の簡略化
- [x] 関数の並び順を論理的に整理
- [x] 全テストスイート実行（`deno test -A`） - 259/262テスト成功

#### 実装順序
1. テストファイル作成（refactor_test.ts）
2. RED: 失敗テストの作成
3. GREEN: 最小限の実装で通過
4. REFACTOR: コード改善
5. 既存テスト全体の確認

#### 期待される成果
- コード行数: 約15-20%削減（約100行削減見込み）
- 重複コード: 主要な重複を1箇所に統合
- 関数の責務: 明確に分離（単一責任原則準拠）
- エラーハンドリング: 統一された形式
- 保守性: 大幅に向上
- テストカバレッジ: リファクタリング対象の完全カバー

### process200 ドキュメンテーション

- [x] README.mdに新機能の説明を追加
  - デバッグモードの説明
  - パフォーマンスログ機能の説明
  - キーリピート抑制機能の詳細
- [x] 設定オプションの詳細をドキュメント化
  - 設定オプション表に新機能の項目を追加
  - コマンド一覧の更新（デバッグコマンド追加）
- [x] トラブルシューティングガイドの追加
  - よくある問題と解決方法
  - パフォーマンス問題の対処法
  - デバッグ情報の取得方法
