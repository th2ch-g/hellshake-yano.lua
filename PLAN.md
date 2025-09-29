# title: カーソル位置基準のヒント生成システム

## 概要
- カーソル位置を基準として、近い単語にはsingle_char_keys（1文字）、遠い単語にはmulti_char_keys（2文字）を割り当てる2ゾーン構成のヒント生成システムを実装する

### goal
- カーソル周辺の単語により素早くジャンプできる直感的なナビゲーション
- 近い場所は押しやすい1文字キー、遠い場所は2文字キーという認知負荷に配慮した設計

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること

## 開発のゴール
- カーソル位置からの距離に基づいた効率的なヒント割り当て
- Immediate Zone（カーソル近傍）にsingle_char_keysを優先的に割り当て
- それ以外の領域にmulti_char_keysを使用した2文字ヒントを割り当て
- 既存のハイライトシステムは変更せず、ロジックのみを改善

## 実装仕様

### 現在の実装の問題点
1. **カーソル位置の未活用**: `displayHintsOptimized()`でハードコードされた値（1,1）を使用
2. **固定的な割り当て**: 単語の位置に関係なく、生成順にヒントを割り当て
3. **非効率な検出**: 画面全体の単語を検出してからソート

### 改善案：2ゾーン構成
```
カーソル位置
     ↓
[Immediate Zone: カーソル近傍]
- single_char_keys (A,S,D,F,G,H,J,K,L,0-9など)
- カーソルに最も近い単語から順に割り当て
- 最大21個程度（設定による）

[その他すべて]
- multi_char_keys (BB, BC, BE, BI...)
- Immediate Zone以外のすべての単語
- 2文字の組み合わせ
```

## 生成AIの学習用コンテキスト

### コアファイル
- `denops/hellshake-yano/core.ts`
  - `showHintsInternal()`: ヒント表示のメインエントリポイント
  - `detectWordsOptimized()`: 単語検出ロジック

- `denops/hellshake-yano/main.ts`
  - `displayHintsOptimized()`: ヒント表示処理（カーソル位置のハードコード問題）

- `denops/hellshake-yano/hint.ts`
  - `assignHintsToWords()`: ヒント割り当てロジック
  - `generateHintsWithGroups()`: ヒント生成ロジック
  - `sortWordsByDistanceOptimized()`: 距離ベースのソート

### 設定ファイル
- `denops/hellshake-yano/config.ts`
  - `singleCharKeys`: 1文字ヒント用のキー定義
  - `multiCharKeys`: 2文字ヒント用のキー定義
  - `maxSingleCharHints`: 1文字ヒントの最大数

## Process

### process1 カーソル位置の正しい取得と伝達
#### sub1 displayHintsOptimizedのカーソル位置取得修正
@target: `denops/hellshake-yano/main.ts`
@ref: `denops/hellshake-yano/core.ts`
- [ ] `displayHintsOptimized()`でハードコードされた値(1,1)を実際のカーソル位置に修正
  - 現在: `const cursorLine = 1; const cursorCol = 1;`
  - 修正: `const [cursorLine, cursorCol] = await fn.getpos(denops, ".");`
- [ ] deno checkを通過すること
- [ ] deno testを通過すること

#### sub2 showHintsInternalでカーソル位置の伝達
@target: `denops/hellshake-yano/core.ts`
- [ ] `showHintsInternal()`でカーソル位置を取得
- [ ] 取得したカーソル位置を`displayHintsOptimized()`に渡す
- [ ] deno checkを通過すること
- [ ] deno testを通過すること

### process2 ヒント割り当てロジックの改善
#### sub1 距離ベースのシンプルな割り当て実装
@target: `denops/hellshake-yano/hint.ts`
@ref: `denops/hellshake-yano/config.ts`, `denops/hellshake-yano/types.ts`
- [ ] `assignHintsToWords()`を修正してカーソル距離優先の割り当てを実装
  - カーソルからの距離でソート（既存のsortWordsByDistanceOptimized活用）
  - 最初のN個（singleCharKeysの数）に1文字ヒント
  - 残りに2文字ヒント（multiCharKeys）
- [ ] deno checkを通過すること
- [ ] deno testを通過すること

#### sub2 ヒント生成の動的調整
@target: `denops/hellshake-yano/hint.ts`
- [ ] `generateHintsWithGroups()`を修正
  - カーソル近傍の単語数に基づいて1文字/2文字ヒントの比率を動的調整
  - maxSingleCharHints設定の考慮
- [ ] deno checkを通過すること
- [ ] deno testを通過すること

### process3 既存機能の維持と互換性確保
#### sub1 ハイライトシステムの維持
- [ ] 既存のハイライト処理には変更を加えない
- [ ] `displayHintsBatched()`の処理フローは維持
- [ ] deno checkを通過すること
- [ ] deno testを通過すること

#### sub2 設定の後方互換性
@target: `denops/hellshake-yano/config.ts`
- [ ] 既存の設定項目はすべて維持
- [ ] 新しい設定項目は任意（オプション）として追加
- [ ] deno checkを通過すること
- [ ] deno testを通過すること

### process10 ユニットテスト
- [ ] カーソル位置取得のテスト
- [ ] 距離ベースのソートのテスト
- [ ] 2ゾーン割り当てロジックのテスト
- [ ] エッジケース（単語が少ない/多い場合）のテスト

### process50 フォローアップ
#### sub1 パフォーマンス最適化（将来的な改善）
- [ ] カーソル移動時のキャッシュ機能
- [ ] 段階的検出の実装（immediate → far）

### process100 リファクタリング
- [ ] 重複コードの整理
- [ ] 関数の責務の明確化
- [ ] 型定義の整理

### process200 ドキュメンテーション
- [ ] README.mdにカーソル位置基準モードの説明を追加
- [ ] 設定オプションのドキュメント更新
- [ ] 変更履歴（CHANGELOG）の更新
