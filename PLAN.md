# title: キー別のmotion_count設定機能

## 概要
- 各キーごとに異なるmotion_count（ヒント表示タイミング）を設定可能にし、キーの用途に応じた柔軟なヒント表示タイミングを実現する

### goal
- `v`, `w`, `b`のような精密移動キーでは1回押すだけでヒントを即座に表示
- `h`, `j`, `k`, `l`のような頻繁に使うナビゲーションキーでは3回押してからヒント表示
- キーごとの用途に最適化されたユーザー体験を提供

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 既存の`motion_count`設定との後方互換性を維持すること
- `per_key_min_length`機能と適切に統合すること
- TDD Red-Green-Refactorサイクルに厳密に従うこと

## 開発のゴール
- キーごとに異なるmotion_countを設定できる柔軟なカウントシステムの実装
- 精密操作と高速ナビゲーションの両立
- 既存機能との完全な統合と互換性維持

## 実装仕様
- 設定例:
  ```vim
  let g:hellshake_yano = {
    \ 'per_key_motion_count': {
    \   'v': 1,   " ビジュアルモード - 即座に表示
    \   'V': 1,   " ビジュアル行モード - 即座に表示
    \   'w': 1,   " 単語移動 - 即座に表示
    \   'b': 1,   " 単語後退 - 即座に表示
    \   'h': 3,   " 左移動 - 3回で表示
    \   'j': 3,   " 下移動 - 3回で表示
    \   'k': 3,   " 上移動 - 3回で表示
    \   'l': 3,   " 右移動 - 3回で表示
    \ },
    \ 'default_motion_count': 3,  " デフォルト値
    \ 'per_key_min_length': {
    \   'v': 1,
    \   'w': 1,
    \   'b': 1,
    \ },
    \ 'default_min_word_length': 2,
    \ }
  ```

## 生成AIの学習用コンテキスト
### 現在の実装
- autoload/hellshake_yano.vim
  - s:motion_count辞書でバッファごとのカウントを管理
  - s:should_trigger_hints関数でグローバルmotion_countと比較
  - hellshake_yano#motion関数でカウント処理
- denops/hellshake-yano/main.ts
  - Config型にmotion_count設定（グローバルのみ）
- plugin/hellshake-yano.vim
  - デフォルトのmotion_count設定（グローバル値: 3）

## Process

### process1 設定構造の拡張
#### sub1 Config型の更新
@target: denops/hellshake-yano/main.ts
- [x] Config interfaceに`per_key_motion_count?: Record<string, number>`を追加
- [x] `default_motion_count?: number`を追加
- [x] `getMotionCountForKey`ヘルパー関数を追加

#### sub2 VimScript側の設定拡張
@target: plugin/hellshake-yano.vim
- [x] デフォルト設定に`per_key_motion_count`と`default_motion_count`を追加
- [x] 設定の検証ロジックを追加

### process2 モーションカウント管理の拡張
#### sub1 キー別カウント辞書の実装
@target: autoload/hellshake_yano.vim
- [x] s:motion_count辞書を`{bufnr: {key: count}}`構造に変更
- [x] s:init_key_count(bufnr, key)関数を追加
- [x] s:get_key_count(bufnr, key)関数を追加
- [x] s:increment_key_count(bufnr, key)関数を追加
- [x] s:reset_key_count(bufnr, key)関数を追加

#### sub2 カウント判定ロジックの更新
@target: autoload/hellshake_yano.vim
- [x] s:get_motion_count_for_key(key)関数を追加（設定値取得）
- [x] s:should_trigger_hints_for_key(bufnr, key)関数を追加
- [x] s:process_motion_count_for_key(bufnr, key)関数を追加

### process3 モーション処理の更新
#### sub1 hellshake_yano#motion関数の改修
@target: autoload/hellshake_yano.vim
- [ ] キー別のカウント処理を実装
- [ ] s:process_motion_count(bufnr)をs:process_motion_count_for_key(bufnr, a:key)に変更
- [ ] s:should_trigger_hints(bufnr)をs:should_trigger_hints_for_key(bufnr, a:key)に変更

#### sub2 タイムアウト処理の更新
@target: autoload/hellshake_yano.vim
- [ ] キー別のタイムアウト管理を実装
- [ ] s:timer_idをキー別に管理する辞書に変更
- [ ] タイムアウト時のキー別リセット処理を実装

### process4 設定の伝播
#### sub1 VimScriptからTypeScriptへの設定伝達
@target: autoload/hellshake_yano.vim
- [ ] hellshake_yano#update_config関数でper_key_motion_count設定を伝達
- [ ] denops#notify呼び出し時に新設定を含める

#### sub2 TypeScript側の設定受信
@target: denops/hellshake-yano/main.ts
- [ ] updateConfigメソッドで新設定を処理
- [ ] 設定のバリデーションを実装

### process5 統合と最適化
#### sub1 per_key_min_lengthとの統合
@target: autoload/hellshake_yano.vim
- [ ] 両機能が協調動作することを確認
- [ ] キーマッピングの自動追加ロジックを統合

#### sub2 パフォーマンス最適化
@target: autoload/hellshake_yano.vim
- [ ] キー別辞書アクセスの最適化
- [ ] 不要な計算の削減

### process10 ユニットテスト
@target: tests/per_key_motion_count_test.ts (新規)
- [ ] キー別motion_count設定の動作テスト
- [ ] デフォルト値へのフォールバックテスト
- [ ] per_key_min_lengthとの組み合わせテスト
- [ ] タイムアウト処理のテスト
- [ ] 後方互換性テスト

### process20 統合テスト
@target: tests/integration_per_key_motion_test.ts (新規)
- [ ] 実際の編集シナリオでの動作確認
- [ ] 複数キーの混在使用テスト
- [ ] リセット処理の確認
- [ ] パフォーマンステスト

### process100 リファクタリング
- [ ] カウント管理コードの整理
- [ ] 重複コードの削除
- [ ] 関数の責務を明確化

### process200 ドキュメンテーション
- [ ] README.mdにper_key_motion_count設定の説明を追加
- [ ] README_ja.mdに日本語説明を追加
- [ ] 設定例とユースケースを追加
- [ ] per_key_min_lengthとの併用例を追加
