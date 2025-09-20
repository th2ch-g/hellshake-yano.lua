# title: Visual Modeでのヒント位置改善

## 概要
Visual modeで単語を選択する際、カーソルは通常単語の末尾に位置することが多いため、ヒントも単語の末尾に表示する方が自然です。この機能を設定で切り替え可能にすることで、柔軟な使用体験を提供します。

## 開発のゴール
- Visual modeでの自然なヒント表示位置の実現
- Normal modeとVisual modeで異なるヒント位置の設定を可能にする
- 既存の動作を維持しつつ、ユーザーの好みに応じた設定が可能

## 実装仕様
- 設定例:
  ```vim
  let g:hellshake_yano = {
    \ 'hint_position': 'start',          " Normal modeでのヒント位置
    \ 'visual_hint_position': 'end',     " Visual modeでのヒント位置
    \ }
  ```

  - `visual_hint_position`の値:
    - `'start'`: 常に単語の先頭にヒントを表示
    - `'end'`: Visual modeでは単語の末尾にヒントを表示（デフォルト）
    - `'same'`: Normal modeと同じ設定（hint_position）に従う

## Process

### process1 設定構造の拡張
#### sub1 Config型の更新
@target: denops/hellshake-yano/main.ts
- [x] Config interfaceに`visual_hint_position?: "start" | "end" | "same"`を追加
- [x] デフォルト値を`'end'`に設定

#### sub2 VimScript側の設定拡張
@target: plugin/hellshake-yano.vim
- [x] デフォルト設定に`visual_hint_position: 'end'`を追加
- [x] 設定値の検証ロジックを追加

### process2 Visual Mode検出の実装
#### sub1 Vim側でのモード検出
@target: autoload/hellshake_yano.vim
- [x] `hellshake_yano#show_hints_with_key()`関数を拡張
- [x] `mode()`関数を使用してvisual mode (v, V, Ctrl-V)を検出
- [x] モード情報をDenops側に渡す引数を追加

#### sub2 Denops側でのモード情報受信
@target: denops/hellshake-yano/main.ts
- [x] `showHintsWithKey()`にmode引数を追加
- [x] `showHintsInternal()`にモード情報を伝播
- [x] モード情報を単語検出・ヒント表示処理に渡す

### process3 ヒント位置計算の修正
#### sub1 calculateHintPosition関数の拡張
@target: denops/hellshake-yano/hint.ts
- [x] `calculateHintPosition()`にisVisualMode引数を追加
- [x] Visual mode用の位置計算ロジックを実装:
  ```typescript
  if (isVisualMode && config.visual_hint_position === 'end') {
    col = word.col + word.text.length - 1;
    display_mode = "after";
  }
  ```

#### sub2 calculateHintPositionWithCoordinateSystem関数の拡張
@target: denops/hellshake-yano/hint.ts
- [x] Visual mode対応の座標計算を追加
- [x] バイト位置計算の調整（日本語対応）
- [x] マルチバイト文字の正確な位置計算

### process4 ヒント表示処理の更新
#### sub1 displayHintsOptimized関数の修正
@target: denops/hellshake-yano/main.ts
- [x] モード情報を受け取り、calculateHintPosition関数に渡す
- [x] Visual modeの場合の特別処理を追加

#### sub2 assignHintsToWords関数の修正
@target: denops/hellshake-yano/hint.ts
- [x] Visual mode情報を受け取り、位置計算に反映

### process5 統合テスト
#### sub1 Visual mode検出テスト
@target: tests/visual_mode_hint_test.vim (新規)
- [x] モード判定が正しく動作することを確認
- [x] 各visual mode (v, V, Ctrl-V)でのテスト

#### sub2 ヒント位置計算テスト
@target: tests/visual_hint_position_test.ts (新規)
- [x] Visual modeでの位置計算が正しいことを確認
- [x] 日本語を含む単語での動作確認
- [x] マルチバイト文字の境界でのテスト

#### sub3 統合動作テスト
@target: tests/integration_visual_mode_test.vim (新規)
- [x] 実際のvisual mode操作でのヒント表示位置確認
- [x] Normal modeとVisual modeの切り替え時の動作確認
- [x] 各設定値での動作確認

### process6 ドキュメンテーション
#### sub1 README.mdの更新
@target: README.md, README_ja.md
- [x] visual_hint_position設定の説明を追加
- [x] 使用例とユースケースを追加
- [x] Visual modeでの操作フローの説明

#### sub2 ヘルプドキュメントの更新
@target: doc/hellshake-yano.txt
- [x] 新しい設定オプションのリファレンスを追加
- [x] Visual modeでの動作説明を追加

## 実装の利点
1. **UX改善**: Visual modeでの自然な操作フロー
2. **柔軟性**: ユーザーの好みに応じて設定可能
3. **後方互換性**: デフォルト動作を維持しつつ新機能を追加

## リスクと対策
- **リスク**: Visual modeの検出タイミングによる不整合
  - **対策**: mode検出を確実にし、フォールバック処理を実装
- **リスク**: マルチバイト文字での位置計算ミス
  - **対策**: バイト位置と表示位置の両方を考慮した計算を実装

## 期待される効果
- Visual modeでの単語選択がより直感的になる
- 語尾から単語全体を選択する一般的な操作パターンに合致
- ユーザーの操作効率が向上
