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
- **ヒントの表示位置が正確に単語の位置に一致すること**
  - 日本語文字の上にヒントが重ならない
  - タブ文字を含む行でも正しい列位置にヒントを表示
  - 表示幅ベースでヒント位置を計算し、視覚的に正確な配置を実現

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

4. **ヒント位置のズレ問題（スクリーンショットより）**
   - **現状**: ヒントが日本語文字の上に重なって表示される
   - **原因**: ヒント位置計算が文字数ベースで行われている
   - **影響**: ユーザーがヒントと対象単語の対応関係を認識できない
   - **必要な修正**:
     - 表示幅を考慮したヒント位置計算の実装
     - `word.col`の値自体を表示幅ベースに変換
     - ヒント描画時の列位置計算を修正

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
- [x] **基本ASCII文字テスト（5ケース）**
  - [x] `"hello"` → 5
  - [x] `"Hello World"` → 11
  - [x] `"123"` → 3
  - [x] `"!@#$%"` → 5
  - [x] 空文字列 `""` → 0
- [x] **タブ文字テスト（5ケース）**
  - [x] `"\t"` → 8（デフォルト）
  - [x] `"hello\tworld"` → 13（5+8）
  - [x] `"\t\t"` → 16（8+8）
  - [x] `"a\tb\tc"` → 17（1+8+1+8+1）
  - [x] カスタムタブ幅4: `"\t"` → 4
- [x] **日本語・全角文字テスト（5ケース）**
  - [x] `"あ"` → 2
  - [x] `"こんにちは"` → 10（2×5）
  - [x] `"漢字"` → 4（2×2）
  - [x] `"ａｂｃ"` → 6（全角英数）
  - [x] `"\t描画"` → 12（8+2+2）
- [x] **絵文字・特殊文字テスト（5ケース）**
  - [x] `"😀"` → 2（単純絵文字）
  - [x] `"👨‍👩‍👧‍👦"` → 2（ZWJ結合）
  - [x] `"🇯🇵"` → 2（国旗）
  - [x] `"é"` → 1（結合文字）
  - [x] `"→←↑↓"` → 8（矢印記号、各2）
- [x] **エラーハンドリングテスト（6ケース）**
  - [x] null入力 → 0
  - [x] undefined入力 → 0
  - [x] 無効なUTF-8 → fallback処理
  - [x] 非常に長い文字列（10000文字）
  - [x] サロゲートペア処理
  - [x] 制御文字の処理

##### 🟢 Green Phase: 最小限の実装（3段階）
- [x] **Stage 1: 基本実装**
  - [x] `getCharDisplayWidth`関数の実装
    - ASCII判定: 0x20-0x7E → 1
    - タブ文字: 0x09 → tabWidth
    - 簡易Unicode判定: codePoint > 0xFF → 2
  - [x] `getDisplayWidth`関数の実装
    - 文字列をコードポイントで分割
    - 各文字の幅を合計
- [x] **Stage 2: キャッシュ機構**
  - [x] `createDisplayWidthCache`関数の実装
    - 既存の`utils/cache.ts`のLRUCache活用
    - キャッシュキー: `${text}_${tabWidth}`
    - デフォルトサイズ: 1000エントリ
- [x] **Stage 3: Unicode完全対応**
  - [x] East Asian Width対応
    - Fullwidth (F), Wide (W) → 2
    - Halfwidth (H), Narrow (Na), Neutral (N), Ambiguous (A) → 1
  - [x] 結合文字・ZWJ対応
  - [x] 絵文字クラスタ処理

##### 🔵 Refactor Phase: 最適化
- [x] **パフォーマンス最適化**
  - [x] 文字単位のキャッシュ追加
  - [x] 頻出文字の事前計算テーブル
  - [x] バッチ処理の最適化
- [x] **コード品質改善**
  - [x] 関数の責務分離
  - [x] エラーハンドリングの統一
  - [x] TypeScript型定義の強化
- [x] **ドキュメント整備**
  - [x] JSDocコメントの追加
  - [x] パフォーマンス特性の文書化

#### sub2 Vimとの連携機能（オプション）
@target: denops/hellshake-yano/utils/display.ts
@ref: denops/hellshake-yano/deps.ts（Denops API）

##### 実装項目
- [x] `getVimDisplayWidth`関数の追加
  - [x] Vim/Neovimの`strdisplaywidth()`を呼び出す
  - [x] Denops APIを使用した実装
  - [x] フォールバック機能付き（TypeScript実装へ）
- [ ] **テストケース**
  - [ ] Vim環境での動作確認
  - [ ] フォールバック動作の確認
  - [ ] パフォーマンス比較（Vim vs TypeScript）
- [ ] **統合オプション**
  - [ ] 設定による切り替え機能
  - [ ] 自動判定ロジック（Vim利用可能性）

##### マイルストーン
- [x] **M1**: 基本機能テスト合格（ASCII+タブ）- Stage 1完了
- [x] **M2**: 日本語対応テスト合格 - Stage 2完了
- [x] **M3**: 全テストケース合格 - Stage 3完了
- [x] **M4**: パフォーマンス目標達成（1文字あたり1-10ns、キャッシュヒット率80%以上）

### process2 隣接判定ロジックの修正【TDD Red-Green-Refactor】
#### sub1 detectAdjacentWords関数の修正
@target: denops/hellshake-yano/hint.ts
@test: denops/hellshake-yano/hint.test.ts（新規作成）
@ref: denops/hellshake-yano/utils/display.ts

##### 🔴 Red Phase: テストファースト（隣接判定テストケース）
- [ ] **スクリーンショット問題の再現テスト（5ケース）**
  - [ ] `"0○0EtectAdjacentWords0C"` → ヒントが正しい位置に表示
  - [ ] `"0○文字数と表示幅の0R同00より0P"` → 日本語混在での位置計算
  - [ ] `"0○0Yブ文字0X表示幅4-8）を0W"` → タブと日本語の混在
  - [ ] `"P○P0本語文字P1表示幅2）をPE"` → 全角文字の位置計算
  - [ ] `"\t描画中の入力処理時間"` → タブ開始行の表示幅計算

- [ ] **隣接判定の基本テスト（10ケース）**
  - [ ] ASCII文字同士の隣接判定
  - [ ] タブ文字を含む隣接判定
  - [ ] 日本語文字同士の隣接判定
  - [ ] タブ＋日本語の隣接判定
  - [ ] 混合文字列での隣接判定
  - [ ] 隣接していない場合（表示幅で離れている）
  - [ ] 隣接している場合（表示幅で隣り合う）
  - [ ] オーバーラップしている場合
  - [ ] 行頭・行末での隣接判定
  - [ ] 複数タブ文字での隣接判定

- [ ] **ヒント位置計算テスト（8ケース）**
  - [ ] 行頭からの表示幅計算
  - [ ] タブ文字前の位置計算
  - [ ] タブ文字後の位置計算
  - [ ] 日本語文字の位置計算
  - [ ] 混合文字列での各単語の位置
  - [ ] 複数行での位置計算
  - [ ] インデントされた行の位置計算
  - [ ] 記号を含む行の位置計算

##### 🟢 Green Phase: 最小限の実装（4段階）
- [ ] **Stage 1: 表示幅計算の統合**
  - [ ] `getDisplayWidth`のインポート
  - [ ] タブ幅設定の取得（`&tabstop`）
  - [ ] デフォルト値の設定（tabWidth = 8）
    - [ ] デフォルト値の設定（tabWidth = 2）
    - [ ] デフォルト値の設定（tabWidth = 4）

- [ ] **Stage 2: detectAdjacentWords関数の修正**
  - [ ] 終了位置計算を表示幅ベースに変更
    ```typescript
    // Before: word.col + word.text.length - 1
    // After: word.col + getDisplayWidth(word.text, tabWidth) - 1
    ```
  - [ ] 隣接判定ロジックの更新
  - [ ] キャッシュキーに表示幅情報を含める

- [ ] **Stage 3: 列位置計算の修正**
  - [ ] `calculateColumnPosition`関数の作成
    - 行頭からの累積表示幅を計算
    - 各単語の実際の列位置を決定
  - [ ] Word型の`col`フィールド解釈の変更
    - 文字インデックスから表示幅ベースへ

- [ ] **Stage 4: ヒント描画位置の修正**
  - [ ] `displayHints`関数の更新
  - [ ] 仮想テキスト配置の位置計算修正
  - [ ] オフセット計算の表示幅対応

##### 🔵 Refactor Phase: 最適化と改善
- [ ] **パフォーマンス最適化**
  - [ ] 表示幅計算結果のキャッシュ
  - [ ] 行単位での表示幅マップ作成
  - [ ] 頻繁に使用される文字列のプリキャッシュ

- [ ] **コード構造の改善**
  - [ ] 表示幅計算ロジックの一元化
  - [ ] ユーティリティ関数の抽出
  - [ ] テスト可能な小さい関数への分割

- [ ] **エラーハンドリング**
  - [ ] 不正な列位置の検出と修正
  - [ ] 表示幅計算エラーのフォールバック
  - [ ] デバッグ用ログの追加

#### sub2 Word型の拡張とヘルパー関数
@target: denops/hellshake-yano/types.ts
@target: denops/hellshake-yano/hint-utils.ts（新規作成）

##### 実装項目
- [ ] **Word型の拡張**
  - [ ] `displayWidth?: number`フィールドの追加
  - [ ] `displayCol?: number`フィールドの追加（表示幅ベースの列位置）

- [ ] **ヘルパー関数の作成**
  - [ ] `convertToDisplayColumn(line: string, charIndex: number, tabWidth: number): number`
    - 文字インデックスを表示幅ベースの列位置に変換
  - [ ] `getWordDisplayEndCol(word: Word, tabWidth: number): number`
    - 単語の終了位置を表示幅ベースで計算
  - [ ] `areWordsAdjacent(word1: Word, word2: Word, tabWidth: number): boolean`
    - 2つの単語が隣接しているか判定

##### テストケース
- [ ] 型の後方互換性テスト
- [ ] ヘルパー関数の単体テスト
- [ ] エッジケースのテスト

##### マイルストーン
- [ ] **M1**: スクリーンショット問題の再現テスト作成完了
- [ ] **M2**: 基本的な隣接判定が表示幅ベースで動作
- [ ] **M3**: ヒント位置が正確に表示される
- [ ] **M4**: 全テストケース合格＆パフォーマンス維持

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
