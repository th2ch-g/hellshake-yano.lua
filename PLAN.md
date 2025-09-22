# title: ヒント重複対策の実装

## 概要
- 複数文字ヒントが隣接する単語と重なる問題を解決する選択的表示パターンの実装

### goal
- 「- **保守性**」のようなマークダウン記法で、記号と日本語の間でヒントが重ならないようにする

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 既存の設定との互換性を維持すること

## 開発のゴール
- 記号と単語が隣接する場合、単語側のみにヒントを表示
- 設定でパターンを選択可能にする
- パフォーマンスへの影響を最小限にする

## 実装仕様

### ヒント重複検出の仕様
1. **重複判定条件**
   - 隣接する単語間の距離が2文字以内
   - 前の単語が記号（`-`, `*`, `+`, `#`, `>`など）
   - 後の単語が日本語または英語

2. **優先順位ルール**
   - 記号より単語を優先
   - 短い単語より長い単語を優先
   - 同じ長さなら後方の単語を優先

3. **設定オプション**
   - `hint_overlap_strategy`: 重複対策の戦略選択
     - `"selective"`: 選択的表示（デフォルト）
     - `"offset"`: 位置調整
     - `"none"`: 対策なし

## 生成AIの学習用コンテキスト

### TypeScriptファイル
- `denops/hellshake-yano/hint.ts`
  - `assignHintsToWords`関数: ヒント割り当てロジック
  - `calculateHintPosition`関数: ヒント位置計算
- `denops/hellshake-yano/word.ts`
  - Word型定義と単語検出ロジック
- `denops/hellshake-yano/config.ts`
  - 設定管理

### Vimファイル
- `autoload/hellshake_yano.vim`
  - ヒント表示トリガー関数

## Process

### process1 重複検出ロジックの実装
#### sub1 隣接単語の検出関数作成
@target: denops/hellshake-yano/hint.ts
@ref: denops/hellshake-yano/types.ts
- [ ] `detectAdjacentWords`関数の作成
  - 同一行の隣接単語を検出
  - 単語間の距離を計算
- [ ] `isSymbolWord`関数の作成
  - マークダウン記号の判定
  - 特殊文字の判定

#### sub2 重複判定関数の実装
@target: denops/hellshake-yano/hint.ts
- [ ] `shouldSkipHintForOverlap`関数の作成
  - 重複判定ロジック
  - 優先順位の適用
- [ ] キャッシュ機能の追加
  - 判定結果のキャッシュ

### process2 選択的ヒント表示の実装
#### sub1 assignHintsToWords関数の修正
@target: denops/hellshake-yano/hint.ts
- [ ] 重複検出の組み込み
  - 隣接単語のペアを検査
  - スキップ対象の記録
- [ ] ヒント割り当てロジックの修正
  - スキップ対象を除外
  - 残りの単語にヒントを割り当て

#### sub2 パフォーマンス最適化
@target: denops/hellshake-yano/hint.ts
- [ ] バッチ処理の最適化
  - 大量単語での処理速度維持
- [ ] メモリ使用量の最適化

### process3 設定オプションの追加
#### sub1 Config型の拡張
@target: denops/hellshake-yano/config.ts
- [ ] `hint_overlap_strategy`設定の追加
  - 型定義の追加
  - デフォルト値の設定
- [ ] バリデーションの追加

#### sub2 Vim側の設定伝達
@target: autoload/hellshake_yano.vim
- [ ] 設定値の読み込み
- [ ] denopsへの設定伝達

### process4 位置調整パターンの実装（オプション）
#### sub1 オフセット計算の実装
@target: denops/hellshake-yano/hint.ts
- [ ] `calculateOffsetPosition`関数の作成
  - 重複時の位置調整量計算
  - 最適な配置位置の決定
- [ ] ヒント位置の動的調整

### process10 ユニットテスト
#### sub1 重複検出のテスト
@target: tests/hint_overlap_test.ts
- [ ] 隣接単語検出のテスト
- [ ] 記号判定のテスト
- [ ] 優先順位ルールのテスト

#### sub2 統合テスト
@target: tests/integration_overlap_test.ts
- [ ] マークダウンテキストでのテスト
- [ ] 日本語・英語混在テキストのテスト
- [ ] パフォーマンステスト

### process50 フォローアップ
#### sub1 視覚的分離パターンの追加（将来拡張）
@target: denops/hellshake-yano/hint.ts
- [ ] 背景色による区別オプション
- [ ] アンダーラインによる区別オプション

#### sub2 コンテキスト認識の強化
@target: denops/hellshake-yano/word.ts
- [ ] コード vs テキストの判定
- [ ] 言語別の最適化ルール

### process100 リファクタリング
- [ ] 関数の分割と整理
- [ ] 重複コードの削除
- [ ] 型定義の最適化

### process200 ドキュメンテーション
- [ ] README.mdへの機能説明追加
- [ ] 設定オプションのドキュメント化
- [ ] トラブルシューティングガイドの作成
