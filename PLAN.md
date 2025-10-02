# title: hellshake_yano.vim メソッドのモジュール分割

## 概要
- autoload/hellshake_yano.vimの952行のコードを責務ごとに複数のモジュールファイルに分割し、保守性とテスタビリティを向上させる

### goal
- コードの責務が明確化され、各モジュールが独立して管理できる
- 将来の機能追加や修正が容易になる
- テストが書きやすくなる

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 後方互換性を維持すること
- 既存の機能を損なわないこと

## 開発のゴール
- hellshake_yano.vimを100-150行程度の小さなモジュールに分割
- 各モジュールの責務を明確化
- 重複コードを削除し、DRY原則を実現
- 全体の行数を約50%削減（952行→約500行）

## 実装仕様

### モジュール構成
既存のautoload/hellshake_yano/ディレクトリに以下のモジュールを配置：

#### 既存モジュール（11ファイル）
- `state.vim` - 状態管理（バッファ状態、カウント、タイマー）
- `count.vim` - カウント管理（キー別カウント処理）
- `timer.vim` - タイマー管理（タイムアウト、リピート検出）
- `config.vim` - 設定管理（motion_count設定、キャッシュ）
- `denops.vim` - Denops連携（関数呼び出し）
- `highlight.vim` - ハイライト管理（色設定、ハイライト適用）
- `debug.vim` - デバッグ機能（情報表示、パフォーマンスログ）
- `hint.vim` - ヒント表示（表示/非表示制御）
- `mapping.vim` - キーマッピング（マッピング設定/解除）
- `utils.vim` - ユーティリティ（エラー表示、時間計測）
- (未作成のモジュール)

#### 新規作成モジュール（4ファイル）
- `motion.vim` - モーション処理（メイン処理、キーリピート検出）
- `plugin.vim` - プラグイン制御（有効/無効、バッファイベント）
- `command.vim` - コマンド関数（設定変更コマンド）
- `validation.vim` - 検証関数（ハイライト、色値検証）

### 各モジュールの責務と関数配置

#### motion.vim（新規）
```vim
" メインのモーション処理
function! hellshake_yano#motion#process(key)
function! hellshake_yano#motion#visual(key)
function! hellshake_yano#motion#with_key_context(key)
function! s:should_trigger_hints_for_key(bufnr, key)
function! s:handle_key_repeat_detection(bufnr, current_time, config)
```

#### plugin.vim（新規）
```vim
" プラグイン制御
function! hellshake_yano#plugin#enable()
function! hellshake_yano#plugin#disable()
function! hellshake_yano#plugin#toggle()
function! hellshake_yano#plugin#on_buf_enter()
function! hellshake_yano#plugin#on_buf_leave()
```

#### command.vim（新規）
```vim
" コマンド関数
function! hellshake_yano#command#set_count(count)
function! hellshake_yano#command#set_timeout(timeout)
function! hellshake_yano#command#set_counted_motions(keys)
function! hellshake_yano#command#update_highlight(marker_group, current_group)
```

#### validation.vim（新規）
```vim
" 検証関数
function! hellshake_yano#validation#highlight_group_name(name)
function! hellshake_yano#validation#color_value(color)
function! hellshake_yano#validation#normalize_color_name(color)
```

#### 既存モジュールへの追加

**config.vim**
- `hellshake_yano#config#clear_motion_count_cache()`
- `hellshake_yano#config#get_key_repeat_config()`

**hint.vim**
- `hellshake_yano#hint#show()`
- `hellshake_yano#hint#hide()`
- `hellshake_yano#hint#show_with_key(key)`

**utils.vim**
- `hellshake_yano#utils#get_elapsed_time()`
- `hellshake_yano#utils#is_denops_ready()`
- `hellshake_yano#utils#notify_denops_config()`
- `hellshake_yano#utils#show_error(...)`

**debug.vim**
- `hellshake_yano#debug#show()`
- `hellshake_yano#debug#get_info()`
- `hellshake_yano#debug#log_performance(operation, time_ms, ...)`
- テスト用デバッグ関数群

**mapping.vim**
- `hellshake_yano#mapping#setup_motion_mappings()`
- `hellshake_yano#mapping#clear_motion_mappings()`
- `hellshake_yano#mapping#get_motion_keys()`

### hellshake_yano.vim（メインファイル）の役割
- 各モジュールへの委譲処理
- 後方互換性のためのラッパー関数
- グローバル変数の初期化

## 生成AIの学習用コンテキスト

### 既存ファイル
- `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano.vim`
  - 952行のメインファイル、分割対象
- `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/autoload/hellshake_yano/*.vim`
  - 既存の11個のモジュールファイル

### 設計原則
- 単一責任原則：各モジュールは1つの責務のみを持つ
- DRY原則：重複コードを削除
- 高凝集・疎結合：関連する機能をまとめ、依存関係を最小化
- 後方互換性：既存のAPIを維持

## Process

### process1: 新規モジュールファイルの作成 ✅ 完了
#### sub1: motion.vimの作成 ✅
@target: autoload/hellshake_yano/motion.vim (257行)
@ref: autoload/hellshake_yano.vim (149-917行)
- [x] hellshake_yano#motion() を hellshake_yano#motion#process() として移動
- [x] hellshake_yano#visual_motion() を hellshake_yano#motion#visual() として移動
- [x] hellshake_yano#motion_with_key_context() を hellshake_yano#motion#with_key_context() として移動
- [x] s:should_trigger_hints_for_key() を移動
- [x] s:handle_key_repeat_detection() を移動

#### sub2: plugin.vimの作成 ✅
@target: autoload/hellshake_yano/plugin.vim (93行)
@ref: autoload/hellshake_yano.vim (443-536行)
- [x] hellshake_yano#enable() を hellshake_yano#plugin#enable() として移動
- [x] hellshake_yano#disable() を hellshake_yano#plugin#disable() として移動
- [x] hellshake_yano#toggle() を hellshake_yano#plugin#toggle() として移動
- [x] hellshake_yano#on_buf_enter() を hellshake_yano#plugin#on_buf_enter() として移動
- [x] hellshake_yano#on_buf_leave() を hellshake_yano#plugin#on_buf_leave() として移動

#### sub3: command.vimの作成 ✅
@target: autoload/hellshake_yano/command.vim (203行)
@ref: autoload/hellshake_yano.vim (491-556, 711-747行)
- [x] hellshake_yano#set_count() を hellshake_yano#command#set_count() として移動
- [x] hellshake_yano#set_timeout() を hellshake_yano#command#set_timeout() として移動
- [x] hellshake_yano#set_counted_motions() を hellshake_yano#command#set_counted_motions() として移動
- [x] hellshake_yano#update_highlight() を hellshake_yano#command#update_highlight() として移動

#### sub4: validation.vimの作成 ✅
@target: autoload/hellshake_yano/validation.vim (107行)
@ref: autoload/hellshake_yano.vim (749-827行)
- [x] hellshake_yano#validate_highlight_group_name() を hellshake_yano#validation#highlight_group_name() として移動
- [x] hellshake_yano#validate_color_value() を hellshake_yano#validation#color_value() として移動
- [x] hellshake_yano#normalize_color_name() を hellshake_yano#validation#normalize_color_name() として移動

### process2: 既存モジュールの拡張 ✅ 完了
#### sub1: config.vimの拡張 ✅
@target: autoload/hellshake_yano/config.vim (114行)
@ref: autoload/hellshake_yano.vim (67-110, 210-217行)
- [x] s:get_motion_count_for_key() → 既にhellshake_yano#config#get_motion_count_for_key()として存在（重複削除）
- [x] s:clear_motion_count_cache() → 既にhellshake_yano#config#clear_motion_count_cache()として存在（重複削除）
- [x] s:get_key_repeat_config() → 既にhellshake_yano#config#get_key_repeat_config()として存在（重複削除）
- [x] メインファイルから重複する関数を削除し、モジュール参照に置き換え

#### sub2: hint.vimの拡張 ✅
@target: autoload/hellshake_yano/hint.vim (126行)
@ref: autoload/hellshake_yano.vim (434-452行)
- [x] hellshake_yano#show() → 既にhellshake_yano#hint#show()として存在（ラッパー化）
- [x] hellshake_yano#hide() → 既にhellshake_yano#hint#hide()として存在（ラッパー化）
- [x] hellshake_yano#show_hints_with_key() → hellshake_yano#hint#show_hints_with_key()に移行済み（ラッパー化）
- [x] s:trigger_hints() → 既にhellshake_yano#hint#trigger_hints()として存在（重複削除）
- [x] モード検出関数も移行

#### sub3: utils.vimの拡張 ✅
@target: autoload/hellshake_yano/utils.vim (69行)
@ref: autoload/hellshake_yano.vim (17-29, 218-233行)
- [x] hellshake_yano#show_error() → 既存（維持）
- [x] s:get_elapsed_time() → 既にhellshake_yano#utils#get_elapsed_time()として存在（重複削除、参照更新）
- [x] s:is_denops_ready() → 既にhellshake_yano#utils#is_denops_ready()として存在（重複削除、参照更新）
- [x] s:notify_denops_config() → config.vimにhellshake_yano#config#notify_denops_config()として存在
- [x] s:call_denops_function() → denops.vimにhellshake_yano#denops#call_function()として存在

#### sub4: debug.vimの拡張 ✅
@target: autoload/hellshake_yano/debug.vim (164行)
@ref: autoload/hellshake_yano.vim (375-465行)
- [x] hellshake_yano#show_debug() → hellshake_yano#debug#show()へのラッパー作成
- [x] hellshake_yano#debug() → hellshake_yano#debug#display()へのラッパー作成
- [x] hellshake_yano#get_debug_info() → hellshake_yano#debug#build_info()へのラッパー作成
- [x] s:get_debug_info() → 重複削除、debug.vimの関数を使用
- [x] s:build_debug_info() → 重複削除、debug.vimの関数を使用
- [x] s:log_performance() → 削除（debug.vimに既存）
- [x] s:handle_debug_display() → hint.vimのhellshake_yano#hint#handle_debug_display()に移行
- [x] テスト用デバッグ関数群 → 既にdebug.vimに存在

#### sub5: mapping.vimの拡張 ✅
@target: autoload/hellshake_yano/mapping.vim (78行)
@ref: autoload/hellshake_yano.vim (235-289行)
- [x] hellshake_yano#setup_motion_mappings() → 既存（ラッパー化）
- [x] s:get_motion_keys() → config.vimにhellshake_yano#config#get_motion_keys()として移行済み
- [x] s:clear_motion_mappings() → mapping.vimにhellshake_yano#mapping#clear_motion_mappings()として存在

### process3: メインファイルの更新
@target: autoload/hellshake_yano.vim
- [ ] 移動した関数を削除
- [ ] 各モジュールへの委譲関数を作成（後方互換性のため）
- [ ] 残った関数の整理

### process4: 動作確認とテスト
- [ ] Vimでプラグインをロードし、構文エラーがないことを確認
- [ ] 基本的なモーション機能が動作することを確認
- [ ] ヒント表示機能が動作することを確認
- [ ] 設定変更コマンドが動作することを確認

### process10: ユニットテスト
- [ ] 各モジュールの単体テストを作成（将来的に）

### process50: フォローアップ
- [ ] 重複コードの追加削除
- [ ] パフォーマンスの最適化

### process100: リファクタリング
- [ ] 依存関係の整理
- [ ] 関数名の統一（必要に応じて）

### process200: ドキュメンテーション
- [ ] README.mdにモジュール構成を記載
- [ ] 各モジュールの責務をドキュメント化
