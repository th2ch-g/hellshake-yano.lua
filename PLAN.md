# title: 表示幅を考慮した隣接判定の実装

## 概要
- 記号・タブ文字・日本語やアルファベットを含むテキストで、実際には重ならない単語が「隣接している」と誤判定され、ヒントが表示されない問題を修正

### goal
- タブ文字後の日本語単語にも正しくヒントが表示される
  - タブ文字がなくても、ヒントが重ならなければ表示する
  - タブ文字の表示幅を考慮して隣接判定を行う
  - 記号と文字の場合は文字を優先する
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

### process1 表示幅計算機能の実装【TDD Red-Green-Refactor】
#### sub1 表示幅計算関数の作成
@target: denops/hellshake-yano/utils/display.ts（新規作成）
@test: denops/hellshake-yano/utils/display.test.ts（新規作成）
@ref: denops/hellshake-yano/utils/cache.ts（キャッシュ機構）
@ref: denops/hellshake-yano/utils/encoding.ts（既存のバイト数計算）

##### 🔴 Red Phase: テストファースト（26テストケース）
- [ ] **基本ASCII文字テスト（5ケース）**
  - [ ] `"hello"` → 5
  - [ ] `"Hello World"` → 11
  - [ ] `"123"` → 3
  - [ ] `"!@#$%"` → 5
  - [ ] 空文字列 `""` → 0
- [ ] **タブ文字テスト（5ケース）**
  - [ ] `"\t"` → 8（デフォルト）
  - [ ] `"hello\tworld"` → 13（5+8）
  - [ ] `"\t\t"` → 16（8+8）
  - [ ] `"a\tb\tc"` → 17（1+8+1+8+1）
  - [ ] カスタムタブ幅4: `"\t"` → 4
- [ ] **日本語・全角文字テスト（5ケース）**
  - [ ] `"あ"` → 2
  - [ ] `"こんにちは"` → 10（2×5）
  - [ ] `"漢字"` → 4（2×2）
  - [ ] `"ａｂｃ"` → 6（全角英数）
  - [ ] `"\t描画"` → 12（8+2+2）
- [ ] **絵文字・特殊文字テスト（5ケース）**
  - [ ] `"😀"` → 2（単純絵文字）
  - [ ] `"👨‍👩‍👧‍👦"` → 2（ZWJ結合）
  - [ ] `"🇯🇵"` → 2（国旗）
  - [ ] `"é"` → 1（結合文字）
  - [ ] `"→←↑↓"` → 8（矢印記号、各2）
- [ ] **エラーハンドリングテスト（6ケース）**
  - [ ] null入力 → 0
  - [ ] undefined入力 → 0
  - [ ] 無効なUTF-8 → fallback処理
  - [ ] 非常に長い文字列（10000文字）
  - [ ] サロゲートペア処理
  - [ ] 制御文字の処理

##### 🟢 Green Phase: 最小限の実装（3段階）
- [ ] **Stage 1: 基本実装**
  - [ ] `getCharDisplayWidth`関数の実装
    - ASCII判定: 0x20-0x7E → 1
    - タブ文字: 0x09 → tabWidth
    - 簡易Unicode判定: codePoint > 0xFF → 2
  - [ ] `getDisplayWidth`関数の実装
    - 文字列をコードポイントで分割
    - 各文字の幅を合計
- [ ] **Stage 2: キャッシュ機構**
  - [ ] `createDisplayWidthCache`関数の実装
    - 既存の`utils/cache.ts`のLRUCache活用
    - キャッシュキー: `${text}_${tabWidth}`
    - デフォルトサイズ: 1000エントリ
- [ ] **Stage 3: Unicode完全対応**
  - [ ] East Asian Width対応
    - Fullwidth (F), Wide (W) → 2
    - Halfwidth (H), Narrow (Na), Neutral (N), Ambiguous (A) → 1
  - [ ] 結合文字・ZWJ対応
  - [ ] 絵文字クラスタ処理

##### 🔵 Refactor Phase: 最適化
- [ ] **パフォーマンス最適化**
  - [ ] 文字単位のキャッシュ追加
  - [ ] 頻出文字の事前計算テーブル
  - [ ] バッチ処理の最適化
- [ ] **コード品質改善**
  - [ ] 関数の責務分離
  - [ ] エラーハンドリングの統一
  - [ ] TypeScript型定義の強化
- [ ] **ドキュメント整備**
  - [ ] JSDocコメントの追加
  - [ ] パフォーマンス特性の文書化

#### sub2 Vimとの連携機能（オプション）
@target: denops/hellshake-yano/utils/display.ts
@ref: denops/hellshake-yano/deps.ts（Denops API）

##### 実装項目
- [ ] `getVimDisplayWidth`関数の追加
  - [ ] Vim/Neovimの`strdisplaywidth()`を呼び出す
  - [ ] Denops APIを使用した実装
  - [ ] フォールバック機能付き（TypeScript実装へ）
- [ ] **テストケース**
  - [ ] Vim環境での動作確認
  - [ ] フォールバック動作の確認
  - [ ] パフォーマンス比較（Vim vs TypeScript）
- [ ] **統合オプション**
  - [ ] 設定による切り替え機能
  - [ ] 自動判定ロジック（Vim利用可能性）

##### マイルストーン
- [ ] **M1**: 基本機能テスト合格（ASCII+タブ）- Stage 1完了
- [ ] **M2**: 日本語対応テスト合格 - Stage 2完了
- [ ] **M3**: 全テストケース合格 - Stage 3完了
- [ ] **M4**: パフォーマンス目標達成（1文字あたり1-10ns、キャッシュヒット率80%以上）

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
