# title: 表示幅を考慮した隣接判定の実装

## 概要
- タブ文字や日本語を含むテキストで、実際には重ならない単語が「隣接している」と誤判定され、ヒントが表示されない問題を修正

### goal
- タブ文字後の日本語単語にも正しくヒントが表示される
- 実際の表示位置に基づいた正確な隣接判定を実現
- マークダウンやインデントされたコードでの使用性向上

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- UTF-8エンコーディングを前提とする
- 既存のAPIとの後方互換性を維持する

## 開発のゴール
- タブ文字と日本語文字の表示幅を正確に計算
- 隣接判定の精度を100%に改善
- パフォーマンスへの影響を最小限に抑える（キャッシュの活用）

## 実装仕様

### 問題の詳細
1. **現状の問題**
   - `detectAdjacentWords`関数で終了位置を`word.col + word.text.length - 1`で計算
   - 文字数と表示幅の混同により位置計算が不正確
   - タブ文字（表示幅4-8）を1文字として扱っている
   - 日本語文字（表示幅2）を1文字として扱っている

2. **具体例**
   ```
   \t- [ ] 描画中の入力処理時間
   ```
   - `\t`のtext.length=1だが、表示幅=8
   - `描画`が隣接していると誤判定される

3. **修正方針**
   - 表示幅計算関数の新規作成
   - 隣接判定ロジックを表示幅ベースに変更
   - Word型への表示幅情報の追加（オプション）

## 生成AIの学習用コンテキスト

### TypeScriptファイル
- `denops/hellshake-yano/hint.ts`
  - 1137-1204行: `detectAdjacentWords`関数
  - 1231-1268行: `shouldSkipHintForOverlap`関数
- `denops/hellshake-yano/types.ts`
  - 35-44行: `Word`インターフェース定義
- `denops/hellshake-yano/utils/encoding.ts`
  - 既存のバイト数計算関数

## Process

### process1 表示幅計算機能の実装
#### sub1 表示幅計算関数の作成
@target: denops/hellshake-yano/utils/display.ts（新規作成）
- [ ] `getDisplayWidth`関数の実装
  - 文字列全体の表示幅を計算
  - タブ文字: tabWidth（デフォルト8）
  - 日本語（全角）: 2
  - 半角英数字: 1
- [ ] `getCharDisplayWidth`関数の実装
  - 1文字の表示幅を返す
  - Unicode幅プロパティを考慮
- [ ] キャッシュ機構の実装
  - 計算済み文字列の表示幅をキャッシュ

#### sub2 Vimとの連携機能（オプション）
@target: denops/hellshake-yano/utils/display.ts
- [ ] `getVimDisplayWidth`関数の追加
  - Vim/Neovimの`strdisplaywidth()`を呼び出す
  - フォールバック機能付き

### process2 隣接判定ロジックの修正
#### sub1 detectAdjacentWords関数の修正
@target: denops/hellshake-yano/hint.ts
@ref: denops/hellshake-yano/utils/display.ts
- [ ] 終了位置計算を表示幅ベースに変更
  - `word.col + getDisplayWidth(word.text, tabWidth) - 1`
- [ ] タブ幅設定の取得
  - Vimの`&tabstop`値を使用
- [ ] キャッシュキーに表示幅情報を含める

#### sub2 Word型の拡張（オプション）
@target: denops/hellshake-yano/types.ts
- [ ] `displayWidth`フィールドの追加
  - 計算済み表示幅のキャッシュ用
  - オプショナルフィールドとして追加

### process3 設定とオプション
#### sub1 Config型の拡張
@target: denops/hellshake-yano/config.ts
- [ ] `use_display_width`設定の追加
  - デフォルト: true
  - 表示幅計算を有効/無効化
- [ ] `tab_width`設定の追加
  - デフォルト: Vimの設定値を使用
  - 明示的なタブ幅の指定

### process10 ユニットテスト
#### sub1 表示幅計算のテスト
@target: tests/display_width_test.ts
- [ ] ASCII文字のテスト
- [ ] タブ文字のテスト（様々なタブ幅）
- [ ] 日本語文字のテスト
- [ ] 絵文字・特殊文字のテスト
- [ ] 混合文字列のテスト

#### sub2 隣接判定のテスト
@target: tests/adjacency_with_display_test.ts
- [ ] タブ文字を含む隣接判定
- [ ] 日本語を含む隣接判定
- [ ] タブ＋日本語の組み合わせ
- [ ] 境界値テスト
- [ ] パフォーマンステスト

### process50 フォローアップ
#### sub1 追加の最適化（将来）
- [ ] Vimのconceal機能への対応
- [ ] 可変幅フォントへの対応
- [ ] 言語別の表示幅ルール

### process100 リファクタリング
- [ ] 表示幅計算のパフォーマンス最適化
- [ ] キャッシュ戦略の改善
- [ ] テストカバレッジの向上

### process200 ドキュメンテーション
- [ ] 表示幅計算の仕様書作成
- [ ] 設定オプションのドキュメント化
- [ ] トラブルシューティングガイドの作成
