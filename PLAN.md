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
- 2文字目の入力を取りこぼさない高速な応答性を実現
- 描画処理と入力処理を並列化してユーザー体験を向上

## 実装仕様
- バッチ処理による効率的な描画（15-20個ずつのextmark操作）
- AbortControllerによる古いハイライト処理のキャンセル機能
- Promise.allによる並列実行でパフォーマンス向上
- 候補ヒントを優先的にハイライト表示

## 生成AIの学習用コンテキスト
### 問題箇所
- denops/hellshake-yano/core.ts:1598
  - `highlightCandidateHintsSync`が同期的に実行される箇所
- denops/hellshake-yano/core.ts:2391-2456
  - 現在の同期的ハイライト処理の実装
- denops/hellshake-yano/main.ts:645-678
  - 既存の`highlightCandidateHintsAsync`実装（参考）

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
- [ ] `highlightCandidateHintsAsync`メソッドを新規作成
- [ ] バッチサイズ定数の定義（HIGHLIGHT_BATCH_SIZE = 15）
- [ ] AbortControllerの実装
- [ ] Promise.allによる並列実行の実装

#### sub2 バッチ処理の最適化
@target: denops/hellshake-yano/core.ts
- [ ] extmark操作を15-20個ずつバッチ化
- [ ] 各バッチ間に`setTimeout(0)`で制御を返す処理
- [ ] 候補ヒントと非候補ヒントの分離処理
- [ ] 候補ヒントの優先描画処理

### process2 入力処理の非同期化
#### sub1 waitForUserInputメソッドの更新
@target: denops/hellshake-yano/core.ts:1598
- [ ] `highlightCandidateHintsSync`の呼び出しを`highlightCandidateHintsAsync`に変更
- [ ] 非同期呼び出し（awaitを使わない）に変更
- [ ] 古いハイライト処理のキャンセル処理を追加

#### sub2 2文字目入力の改善
@target: denops/hellshake-yano/core.ts:1600-1640
- [ ] ハイライト処理中でも入力を受け付ける実装
- [ ] 入力タイミングの競合状態を解決
- [ ] エラーハンドリングの強化

### process3 既存コードのリファクタリング
#### sub1 同期版メソッドの保持
@target: denops/hellshake-yano/core.ts
- [ ] `highlightCandidateHintsSync`はフォールバックとして残す
- [ ] 設定オプションで同期/非同期を切り替え可能に
- [ ] デバッグモードでの切り替え機能

### process10 ユニットテスト
#### sub1 非同期ハイライト処理のテスト
@target: tests/async_highlight_test.ts
- [ ] 基本的な非同期動作のテスト
- [ ] AbortControllerによる中断テスト
- [ ] バッチ処理のテスト
- [ ] 2文字目入力の取りこぼしがないことの確認テスト

#### sub2 パフォーマンステスト
@target: tests/performance_benchmark_test.ts
- [ ] 大量ヒント（100個以上）での性能テスト
- [ ] 同期版との比較ベンチマーク
- [ ] メモリ使用量の測定

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

