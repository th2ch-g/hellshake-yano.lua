# title: ヒント描画の非同期化による入力応答性の改善

## 概要
- ヒント表示直後の素早い入力で2文字目が取りこぼされる問題を非同期描画で解決

### goal
- ヒント表示中でも入力イベントを一切ブロックしない
- 移動時に即座にヒントを非表示にする
- スムーズなユーザー体験の実現

## 必須のルール
- 既存のAPIとの互換性を維持
- エラー処理を適切に行う
- 描画キャンセル時のクリーンアップ

## 開発のゴール
- 入力遅延を0msに
- 描画処理と入力処理の完全な並行実行
- カーソル移動時の即座応答（< 10ms）

## 実装仕様

### 現状の問題分析
1. **同期的な描画処理**
   - `await displayHintsOptimized()` で描画完了を待機
   - 描画中は入力イベントがキューに積まれる
   - 高速入力時に取りこぼしが発生

2. **ブロッキング箇所**
   - main/operations.ts: 247行目 `await displayHintsOptimized`
   - main.ts: 複数箇所で同様の同期呼び出し
   - extmark/matchadd作成時のバッチ処理

3. **影響範囲**
   - 100個以上のヒント表示時に顕著
   - 日本語環境では描画が重い
   - ビジュアルモードでさらに遅延

## 生成AIの学習用コンテキスト

### TypeScriptファイル
- `denops/hellshake-yano/main.ts`
  - 1240行: `displayHintsOptimized`関数
- `denops/hellshake-yano/main/operations.ts`
  - 247行: 同期的な`await`呼び出し
- `denops/hellshake-yano/lifecycle.ts`
  - autocmdの設定箇所

### Vimファイル
- `autoload/hellshake_yano.vim`
  - CursorMoved/CursorMovedIイベント処理

## Process

### process1 非同期描画の実装
#### sub1 非同期描画関数の作成
@target: denops/hellshake-yano/main.ts
- [ ] `displayHintsAsync`関数の作成
  - `displayHintsOptimized`のラッパー
  - Promiseをfire-and-forgetで実行
  - エラーハンドリングを内包
- [ ] 描画状態管理の追加
  - `isRenderingHints`フラグ
  - `renderingAbortController`の実装

#### sub2 非ブロッキング呼び出しへの変更
@target: denops/hellshake-yano/main/operations.ts
@target: denops/hellshake-yano/main.ts
- [ ] `await`を削除して非同期実行
  - `displayHintsAsync(denops, currentHints, config)`
  - エラーは内部でcatch
- [ ] 描画完了コールバックの追加（オプション）

### process2 描画キャンセル機能
#### sub1 AbortControllerの実装
@target: denops/hellshake-yano/main.ts
- [ ] 描画キャンセル機能の追加
  - `AbortSignal`を使った中断
  - 部分的に描画されたヒントのクリーンアップ
- [ ] キャンセル条件の定義
  - 新しいヒント表示要求時
  - カーソル移動時
  - モード変更時

#### sub2 バッチ処理の中断対応
@target: denops/hellshake-yano/main.ts
- [ ] バッチ描画処理に中断チェック追加
  - 各バッチ間で`signal.aborted`確認
  - 中断時は残りをスキップ

### process3 移動時の即座非表示
#### sub1 CursorMovedイベントの最適化
@target: denops/hellshake-yano/lifecycle.ts
- [ ] 高速な移動検出
  - デバウンスなしの即座反応
  - 描画中の場合はキャンセル
- [ ] 条件付き非表示
  - ヒント入力中は維持
  - 通常移動時のみ非表示

#### sub2 Vim側のイベント処理改善
@target: autoload/hellshake_yano.vim
- [ ] CursorMoved/CursorMovedIの高速化
  - 最小限の処理のみ実行
  - denopsへの通知を非同期化

### process4 入力バッファリング対策
#### sub1 入力キューの管理
@target: denops/hellshake-yano/main.ts
- [ ] 入力イベントの優先処理
  - 描画処理より入力を優先
  - キー入力の即座反映
- [ ] タイムスライシング
  - 長い描画を小分けに実行

### process10 ユニットテスト
#### sub1 非同期動作のテスト
@target: tests/async_rendering_test.ts
- [ ] 非ブロッキング動作の確認
- [ ] 連続入力時の取りこぼしテスト
- [ ] キャンセル機能のテスト

#### sub2 パフォーマンステスト
@target: tests/input_responsiveness_test.ts
- [ ] 入力遅延の測定
- [ ] 描画中の入力処理時間
- [ ] 1000ヒント表示時の応答性

### process50 フォローアップ
#### sub1 Web Worker活用（将来）
- [ ] 重い計算処理をWorkerへ移動
- [ ] メインスレッドの解放

#### sub2 インクリメンタルレンダリング
- [ ] 見える範囲から優先描画
- [ ] スクロール時の追加描画

### process100 リファクタリング
- [ ] 非同期処理の共通化
- [ ] エラーハンドリングの統一
- [ ] Promise管理の最適化

### process200 ドキュメンテーション
- [ ] 非同期動作の説明
- [ ] パフォーマンスチューニングガイド
