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

- [ ] 時間計測処理のオーバーヘッドを測定
- [ ] 必要に応じて最適化を実施

#### sub2 ユーザビリティの改善

- [ ] デフォルト値の調整（ユーザーフィードバックに基づく）
- [ ] デバッグモードの追加（キーリピート検出状態の可視化）

### process100 リファクタリング

- [ ] 重複コードの削除
- [ ] 関数の責務を明確化
- [ ] エラーハンドリングの改善

### process200 ドキュメンテーション

- [ ] README.mdに新機能の説明を追加
- [ ] 設定オプションの詳細をドキュメント化
- [ ] トラブルシューティングガイドの追加
