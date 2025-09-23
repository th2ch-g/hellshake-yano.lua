# title: 非同期レンダリング改善によるキー入力のレスポンス向上

## 概要
- 1文字目入力後の`highlight_hint_marker_current`レンダリングを非同期化し、2文字目のキー入力を即座に受け付けられるようにする

### goal
- ヒントの再描画中でも2文字目のキーを遅延なく入力できる
- 大量のヒント（100個以上）でもUIがフリーズしない
- レンダリング途中でも新しい入力に即座に反応する

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 既存の`displayHintsAsync`パターンに準拠した実装を行う
- 後方互換性を維持し、既存の機能に影響を与えない

## 開発のゴール
- `highlightCandidateHints`関数の非同期化
- AbortControllerによる中断可能なレンダリング
- バッチ処理による段階的な描画でメインスレッドのブロッキングを防止

## 実装仕様

### 問題の詳細
1. **現状の問題**
   - `highlightCandidateHints`関数（main.ts:1753-1926）が全ヒントを同期的に再描画
   - 1文字目の入力後、全てのヒントに対してawaitを使った同期処理を実行
   - NeovimとVim両方でmatchadd/extmarkを順次実行するため、大量のヒントがある場合に顕著な遅延

2. **影響箇所**
   - denops/hellshake-yano/main.ts:2153 - `await highlightCandidateHints`の呼び出し
   - 既存の`displayHintsAsync`パターンは存在するが、`highlightCandidateHints`には適用されていない

3. **技術的アプローチ**
   - 非同期関数への変換（fire-and-forget方式）
   - AbortControllerによる中断制御
   - バッチサイズ10-20個での段階的処理

## 生成AIの学習用コンテキスト

### TypeScriptファイル
- denops/hellshake-yano/main.ts
  - 1753-1926行: `highlightCandidateHints`関数（修正対象）
  - 1249-1292行: `displayHintsAsync`関数（参考実装）
  - 2153行付近: 呼び出し箇所

### 関連ファイル
- denops/hellshake-yano/main.ts
  - グローバル変数: `_renderingAbortController`, `_isRenderingHints`
  - ヘルパー関数: `clearHintDisplay`, `calculateHintPositionWithCoordinateSystem`

## Process

### process1 highlightCandidateHintsAsync関数の実装
#### sub1 非同期関数の作成
@target: denops/hellshake-yano/main.ts
@ref: denops/hellshake-yano/main.ts (displayHintsAsync)
- [ ] `highlightCandidateHintsAsync`関数の新規作成
  - 引数: `denops: Denops`, `inputPrefix: string`, `onComplete?: () => void`
  - 戻り値: `void`（Promiseを返さない）
- [ ] グローバル変数`_highlightAbortController`の追加
- [ ] 既存の`highlightCandidateHints`関数はそのまま保持（後方互換性）

#### sub2 AbortController実装
@target: denops/hellshake-yano/main.ts
- [ ] 前の描画処理のキャンセル機能
- [ ] 新しいAbortControllerの作成
- [ ] signal.abortedのチェック処理

#### sub3 バッチ処理の実装
@target: denops/hellshake-yano/main.ts
- [ ] HIGHLIGHT_BATCH_SIZE定数の定義（デフォルト: 15）
- [ ] matchingHintsとnonMatchingHintsの分離処理
- [ ] バッチループの実装
  - matchingHintsを優先的に処理
  - 各バッチ後にsetTimeout(0)で制御を返す
- [ ] Neovim（extmark）とVim（matchadd）の分岐処理

### process2 呼び出し箇所の変更
#### sub1 main.ts内の呼び出し修正
@target: denops/hellshake-yano/main.ts（2153行付近）
- [ ] `await highlightCandidateHints(denops, inputChar)`を
- [ ] `highlightCandidateHintsAsync(denops, inputChar)`に変更（awaitなし）

### process10 ユニットテスト
#### sub1 非同期処理のテスト
@target: tests/async_highlight_test.ts（新規作成）
- [ ] 基本的な非同期動作のテスト
- [ ] AbortControllerによる中断テスト
- [ ] バッチ処理の動作確認
- [ ] 大量ヒント（100+）でのパフォーマンステスト

#### sub2 互換性テスト
@target: tests/compatibility_test.ts
- [ ] 既存の`highlightCandidateHints`が影響を受けないことを確認
- [ ] NeovimとVim両方での動作確認

### process50 フォローアップ
#### sub1 パフォーマンスチューニング（将来）
- [ ] バッチサイズの最適化
- [ ] 優先度アルゴリズムの改善
- [ ] メモリ使用量の最適化

### process100 リファクタリング
- [ ] 共通処理の抽出
- [ ] エラーハンドリングの強化
- [ ] TypeScript型定義の改善

### process200 ドキュメンテーション
- [ ] 関数のJSDocコメント追加
- [ ] README.mdへの機能説明追加
- [ ] パフォーマンス改善効果の記載
