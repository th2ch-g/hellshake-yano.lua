# title: highlight_hint_marker_currentの非同期ハイライト処理実装

## 概要
- ヒントの候補ハイライト処理を非同期化し、2文字目のキー入力を取りこぼさないようにする

### goal
- ユーザーが素早く2文字のヒントを入力してもスムーズにジャンプできるようにする
- ハイライト処理の描画中でもキー入力を即座に受け付ける

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること

## 開発のゴール
- 現在の同期的な`highlightCandidateHintsSync`を非同期化
  - 応答性を重視するため、多少非同期が遅延しても問題ない
- 2文字目の入力を取りこぼさない高速な応答性を実現
- 描画処理と入力処理を並列化してユーザー体験を向上

## 実装仕様
- Fire-and-forget方式による完全非同期処理（awaitを使わない）
- バッチ処理による効率的な描画（15-20個ずつのextmark操作）
- AbortControllerによる古いハイライト処理のキャンセル機能
- 候補ヒントを優先的にハイライト表示
- queueMicrotaskやsetTimeoutを活用してメインスレッドをブロックしない

## 生成AIの学習用コンテキスト
### 問題箇所
- denops/hellshake-yano/core.ts:1598
  - `highlightCandidateHintsSync`が同期的に実行される箇所
- denops/hellshake-yano/core.ts:2391-2456
  - 現在の同期的ハイライト処理の実装
- denops/hellshake-yano/main.ts:556
  - `await processExtmarksBatched`でイベントループがブロックされる
- denops/hellshake-yano/main.ts:645-678
  - 既存の`highlightCandidateHintsAsync`実装（参考）

### 既存実装の問題点
- main.ts:556で`await processExtmarksBatched`を使用
  - 各バッチ処理が完了するまでJavaScriptのイベントループがブロック
  - この間、Vimからのキー入力イベントが処理されない
  - `denops.call("getchar")`が入力を受け取れず、キーが失われる

### 関連ファイル
- autoload/hellshake_yano/highlight.vim
  - Vim側のハイライト設定管理
- tests/async_highlight_test.ts
  - 非同期ハイライト処理のテストケース

## Process
### process1 非同期ハイライト関数の実装
#### sub1 highlightCandidateHintsAsyncメソッドの作成
@target: denops/hellshake-yano/core.ts
@ref: denops/hellshake-yano/main.ts:645-678
- [x] `highlightCandidateHintsAsync`メソッドを新規作成
- [x] バッチサイズ定数の定義（HIGHLIGHT_BATCH_SIZE = 15）
- [x] AbortControllerの実装
- [x] **Fire-and-forget方式**：Promiseを返さず、awaitを使わない実装
- [x] deno checkを通過する型安全なコード
- [x] deno testでの動作確認

#### sub2 バッチ処理の最適化
@target: denops/hellshake-yano/core.ts
- [x] extmark操作を15-20個ずつバッチ化
- [x] **非同期バッチ処理**：各バッチを個別のPromiseとして実行（awaitなし）
- [x] 各バッチ間に`queueMicrotask`または`setTimeout(0)`で制御を返す
- [x] 候補ヒントと非候補ヒントの分離処理
- [x] 候補ヒントの優先描画処理
- [x] deno checkを通過する型安全なコード
- [x] deno testでの動作確認

### process2 入力処理の非同期化
#### sub1 waitForUserInputメソッドの更新
@target: denops/hellshake-yano/core.ts:1598
- [x] `highlightCandidateHintsSync`の呼び出しを`highlightCandidateHintsAsync`に変更
- [x] **重要**：awaitを使わずにfire-and-forget方式で呼び出し
- [x] 古いハイライト処理のキャンセル処理を追加
- [x] ハイライト処理開始後、**即座に**2文字目の入力待機に移行
- [x] deno checkを通過する型安全なコード
- [x] deno testでの動作確認

#### sub2 2文字目入力の改善
@target: denops/hellshake-yano/core.ts:1600-1640
- [x] ハイライト処理の完了を待たずに`getchar()`を実行
- [x] 入力タイミングの競合状態を解決
- [x] バックグラウンドのハイライト処理と入力処理の分離
- [x] エラーハンドリングの強化
- [x] deno checkを通過する型安全なコード
- [x] deno testでの動作確認

### process3 既存コードのリファクタリング
#### sub1 同期版メソッドの保持
@target: denops/hellshake-yano/core.ts
- [x] `highlightCandidateHintsSync`はフォールバックとして残す
- [x] 設定オプションで同期/非同期を切り替え可能に
- [x] デバッグモードでの切り替え機能
- [x] deno checkを通過する型安全なコード
- [x] deno testでの動作確認

### process4 1文字目入力時の即時ハイライト表示
#### sub1 ハイブリッドハイライトメソッドの実装
@target: denops/hellshake-yano/core.ts
- [x] `highlightCandidateHintsHybrid`メソッドを新規作成
- [x] 最初の15-20個の候補を同期的に処理
- [x] `denops.cmd("redraw")`で即座にレンダリング
- [x] 残りのヒントを非同期で処理
- [x] AbortControllerによるキャンセル機能維持
- [x] deno checkを通過する型安全なコード
- [x] deno testでの動作確認

#### sub2 waitForUserInputメソッドの更新
@target: denops/hellshake-yano/core.ts:1622-1631
- [x] `highlightCandidateHintsAsync`を`highlightCandidateHintsHybrid`に変更
- [x] 最初のバッチは`await`して確実に表示
- [x] 2文字目入力の応答性を維持
- [x] エラーハンドリングの実装
- [x] deno checkを通過する型安全なコード
- [x] deno testでの動作確認

#### sub3 パフォーマンスの最適化
@target: denops/hellshake-yano/core.ts
- [x] 同期処理するバッチサイズの調整（10-15個）
- [x] 可視領域優先の実装検討
- [x] redrawコマンドのタイミング最適化
- [x] 大量ヒント時のパフォーマンステスト
- [x] deno checkを通過する型安全なコード
- [x] deno testでの動作確認

### process10 ユニットテスト
#### sub1 非同期ハイライト処理のテスト
@target: tests/async_highlight_test.ts
- [ ] Fire-and-forget方式の動作確認テスト
- [ ] AbortControllerによる中断テスト
- [ ] バッチ処理が非同期で実行されることの確認
- [ ] **重要**：2文字目入力の取りこぼしがないことの確認テスト
- [ ] イベントループがブロックされないことの検証
- [ ] deno checkを通過する型安全なコード
- [ ] deno testでの動作確認

#### sub2 パフォーマンステスト
@target: tests/performance_benchmark_test.ts
- [ ] 大量ヒント（100個以上）での性能テスト
- [ ] 同期版との比較ベンチマーク
- [ ] メモリ使用量の測定
- [ ] deno checkを通過する型安全なコード
- [ ] deno testでの動作確認

### process50 フォローアップ
#### sub1 パフォーマンスチューニング
- [ ] バッチサイズの動的調整機能
- [ ] 可視領域のみのハイライト機能（オプション）
- [ ] キャッシュ機能の実装検討

### process100 リファクタリング
- [ ] 重複コードの共通化
- [ ] エラーハンドリングの統一
- [ ] 型定義の整理

### process200 ドキュメンテーション
- [ ] 非同期処理の仕様書作成
- [ ] パフォーマンス改善の説明追加
- [ ] 設定オプションのドキュメント更新

