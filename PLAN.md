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

5. **文頭ヒント位置の二重変換問題（調査により判明）**
   - **現状**: 文頭のヒント位置がずれて表示される
   - **原因**:
     - Word.colは「1ベース、表示列位置」として定義済み
     - convertToDisplayColumn関数でさらに+1している（二重変換）
   - **影響**: 文頭のヒントが正しい位置に表示されない
   - **必要な修正**:
     - convertToDisplayColumn関数の+1処理を削除
     - Word生成時の列位置計算の検証と修正

6. **記号と文字の隣接時のヒント非表示問題（新規スクリーンショットより）**
   - **現状**: 「④sub2」のような記号と文字の組み合わせでヒントが表示されない
   - **原因**:
     - 狭いスペースで2つのヒントを表示する幅がない場合の処理が不適切
     - 記号（特に丸数字）の表示幅計算が正確でない
     - ヒント表示可能スペースの判定ロジックに問題
   - **影響**: 記号を含む文書でヒント機能が正しく動作しない
   - **必要な修正**:
     - 記号の表示幅を正確に計算（全角記号は幅2として扱う）
     - 最小表示スペースの判定ロジック追加
     - 隣接ヒントの優先順位付け（記号より文字を優先）

7. **再描画遅延問題（スクリーンショットより）**
   - **現状**: 1文字入力後、2文字目の入力まで再描画を待つ必要がある
   - **原因**:
     - キャッシュクリアのタイミングが不適切
     - 非同期処理の待機時間が長い
   - **影響**: 入力のレスポンスが悪く、ユーザビリティが低下
   - **必要な修正**:
     - キャッシュ管理の最適化
     - 非同期処理のタイミング調整

8. **Word.colの文字インデックス/表示幅不整合問題（調査により判明）**
   - **現状**: タブ文字なしの行で記号と文字の境界でヒントが表示されない
   - **原因**:
     - detector.tsでWord生成時に`col: match.index + 1`（文字インデックスベース）
     - しかし、ヒント位置計算は表示幅ベースとしてWord.colを扱っている
     - タブ文字や全角文字を含む場合、文字インデックスと表示幅が一致しない
   - **影響**:
     - 「□ 記号vs文字の」のような行でヒントが正しく表示されない
     - タブ文字の有無で挙動が異なる
   - **必要な修正**:
     - Word生成時に列位置を表示幅ベースに変換
     - convertToDisplayColumn関数を使用して正確な表示列を計算

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
- [x] **スクリーンショット問題の再現テスト（5ケース）**
  - [x] `"0○0EtectAdjacentWords0C"` → ヒントが正しい位置に表示
  - [x] `"0○文字数と表示幅の0R同00より0P"` → 日本語混在での位置計算
  - [x] `"0○0Yブ文字0X表示幅4-8）を0W"` → タブと日本語の混在
  - [x] `"P○P0本語文字P1表示幅2）をPE"` → 全角文字の位置計算
  - [x] `"\t描画中の入力処理時間"` → タブ開始行の表示幅計算

- [x] **隣接判定の基本テスト（10ケース）**
  - [x] ASCII文字同士の隣接判定
  - [x] タブ文字を含む隣接判定
  - [x] 日本語文字同士の隣接判定
  - [x] タブ＋日本語の隣接判定
  - [x] 混合文字列での隣接判定
  - [x] 隣接していない場合（表示幅で離れている）
  - [x] 隣接している場合（表示幅で隣り合う）
  - [x] オーバーラップしている場合
  - [x] 行頭・行末での隣接判定
  - [x] 複数タブ文字での隣接判定

- [x] **ヒント位置計算テスト（8ケース）**
  - [x] 行頭からの表示幅計算
  - [x] タブ文字前の位置計算
  - [x] タブ文字後の位置計算
  - [x] 日本語文字の位置計算
  - [x] 混合文字列での各単語の位置
  - [x] 複数行での位置計算
  - [x] インデントされた行の位置計算
  - [x] 記号を含む行の位置計算

##### 🟢 Green Phase: 最小限の実装（4段階）
- [x] **Stage 1: 表示幅計算の統合**
  - [x] `getDisplayWidth`のインポート
  - [x] タブ幅設定の取得（`&tabstop`）
  - [x] デフォルト値の設定（tabWidth = 8）

- [x] **Stage 2: detectAdjacentWords関数の修正**
  - [x] 終了位置計算を表示幅ベースに変更
    ```typescript
    // Before: word.col + word.text.length - 1
    // After: word.col + getDisplayWidth(word.text, tabWidth) - 1
    ```
  - [x] 隣接判定ロジックの更新
  - [x] キャッシュキーに表示幅情報を含める

- [x] **Stage 3: 列位置計算の修正**
  - [x] `calculateColumnPosition`関数の作成
    - 行頭からの累積表示幅を計算
    - 各単語の実際の列位置を決定
  - [x] Word型の`col`フィールド解釈の変更
    - 文字インデックスから表示幅ベースへ

- [x] **Stage 4: ヒント描画位置の修正**
  - [x] `displayHints`関数の更新
  - [x] 仮想テキスト配置の位置計算修正
  - [x] オフセット計算の表示幅対応

##### 🔵 Refactor Phase: 最適化と改善
- [x] **パフォーマンス最適化**
  - [x] 表示幅計算結果のキャッシュ
  - [x] 行単位での表示幅マップ作成
  - [x] 頻繁に使用される文字列のプリキャッシュ

- [x] **コード構造の改善**
  - [x] 表示幅計算ロジックの一元化
  - [x] ユーティリティ関数の抽出
  - [x] テスト可能な小さい関数への分割

- [x] **エラーハンドリング**
  - [x] 不正な列位置の検出と修正
  - [x] 表示幅計算エラーのフォールバック
  - [x] デバッグ用ログの追加
パフォーマンス比較（Vim vs TypeScript）
#### sub2 Word型の拡張とヘルパー関数
@target: denops/hellshake-yano/types.ts
@target: denops/hellshake-yano/hint-utils.ts（新規作成）

##### 実装項目
- [x] **Word型の拡張**
  - [x] `displayWidth?: number`フィールドの追加
  - [x] `displayCol?: number`フィールドの追加（表示幅ベースの列位置）

- [x] **ヘルパー関数の作成**
  - [x] `convertToDisplayColumn(line: string, charIndex: number, tabWidth: number): number`
    - 文字インデックスを表示幅ベースの列位置に変換
  - [x] `getWordDisplayEndCol(word: Word, tabWidth: number): number`
    - 単語の終了位置を表示幅ベースで計算
  - [x] `areWordsAdjacent(word1: Word, word2: Word, tabWidth: number): boolean`
    - 2つの単語が隣接しているか判定

##### テストケース
- [x] 型の後方互換性テスト
- [x] ヘルパー関数の単体テスト
- [x] エッジケースのテスト

##### マイルストーン
- [x] **M1**: スクリーンショット問題の再現テスト作成完了
- [x] **M2**: 基本的な隣接判定が表示幅ベースで動作
- [x] **M3**: ヒント位置が正確に表示される
- [x] **M4**: 全テストケース合格＆パフォーマンス維持

### process2.5 文頭ヒント位置の修正【緊急修正】✅ 完了
#### sub1 convertToDisplayColumn関数の修正
@target: denops/hellshake-yano/hint-utils.ts
@ref: denops/hellshake-yano/types.ts（Word型の定義）

##### 修正内容
- [x] **二重変換の解消**
  ```typescript
  // 修正前
  export function convertToDisplayColumn(line: string, charIndex: number, tabWidth = 8): number {
    if (charIndex <= 0) {
      return 1;
    }
    const substring = line.slice(0, charIndex);
    return getDisplayWidth(substring, tabWidth) + 1;  // ← この+1が問題
  }

  // 修正後
  export function convertToDisplayColumn(line: string, charIndex: number, tabWidth = 8): number {
    if (charIndex <= 0) {
      return 1;
    }
    const substring = line.slice(0, charIndex);
    return getDisplayWidth(substring, tabWidth);  // +1を削除
  }
  ```

- [x] **テストケースの追加**
  - [x] 文頭ヒント位置の正確性テスト
  - [x] 1ベース/0ベースの変換テスト
  - [x] エッジケースのテスト

##### 影響範囲の確認
- [x] Word生成箇所の確認
- [x] 他の列位置計算箇所への影響調査
- [x] 既存テストの修正が必要か確認

### process2.6 Word.col生成時の表示幅変換【緊急修正】
#### sub1 detector.tsのWord生成処理修正
@target: denops/hellshake-yano/word/detector.ts
@ref: denops/hellshake-yano/hint-utils.ts（convertToDisplayColumn関数）

##### 修正内容
- [x] **Word生成時の列位置計算を表示幅ベースに変更**
  ```typescript
  // 修正前（382行目、422行目など）
  col: match.index + 1,  // 文字インデックスベース

  // 修正後
  col: convertToDisplayColumn(line, match.index, tabWidth),
  ```

- [x] **影響箇所の確認**
  - [x] 全てのWord生成箇所を確認（少なくとも2箇所: 382行目、422行目）
  - [x] tabWidth パラメータの追加が必要か確認
  - [x] 既存のWord.col利用箇所への影響調査

##### テストケース
- [x] タブ文字なしでの記号・文字境界テスト
  - [x] 「□ 記号vs文字の」のパターン
  - [x] 全角記号「④」と半角英字「sub」の組み合わせ
- [x] タブ文字ありでの記号・文字境界テスト
  - [x] 「\t□ 記号vs文字の」のパターン
- [x] 全角記号と半角文字の組み合わせテスト
  - [x] 丸数字「①②③④⑤」と英字の隣接
- [x] 複数のタブ文字を含む行のテスト
  - [x] 「\t\t文字」のような複数タブのケース

##### 実装の注意点
- [x] convertToDisplayColumn関数はprocess2.5で+1を削除済み
- [x] Word型の定義では`col`は「1ベース、表示列位置」として定義
- [x] 一貫性を保つため、全てのWord生成箇所で同じ変換を適用

### process3 記号対応とヒント優先順位【TDD Red-Green-Refactor】
#### sub1 記号の表示幅対応と優先順位実装
@target: denops/hellshake-yano/utils/display.ts
@target: denops/hellshake-yano/hint.ts
@test: denops/hellshake-yano/hint.test.ts（既存を拡張）

##### 🔴 Red Phase: テストファースト（記号対応テストケース）
- [x] **記号の表示幅テスト（8ケース）**
  - [x] 丸数字「①②③④⑤」→ 各2幅
  - [x] 括弧付き数字「⑴⑵⑶」→ 各2幅
  - [x] 矢印記号「→←↑↓」→ 各2幅
  - [x] 数学記号「＋－×÷」→ 各2幅
  - [x] 半角記号「+-*/」→
  - [x] 混合「①sub2」→ 2+3+3+3+1 = 12幅
  - [x] スペース制約「④s」→ 隣接判定
  - [x] 優先順位「④sub」→ subのヒント優先

- [x] **狭スペースでのヒント表示判定テスト（6ケース）**
  - [x] 最小幅未満でのヒント非表示
  - [x] 片方のみ表示可能な場合
  - [x] 両方表示可能な場合
  - [x] 記号vs文字の優先順位
  - [x] 記号vs記号の場合
  - [x] 文字vs文字の場合

- [x] **優先順位付きヒント表示テスト（5ケース）**
  - [x] 記号より文字を優先
  - [x] 同じ優先度の場合は左を優先
  - [x] 3つ以上隣接する場合
  - [x] 行頭・行末での優先順位
  - [x] 複数行での優先順位

##### 🟢 Green Phase: 最小限の実装（3段階）
- [x] **Stage 1: 記号の表示幅計算改善**
  - [x] 全角記号判定関数の作成
    ```typescript
    function isFullWidthSymbol(codePoint: number): boolean {
      // 丸数字、括弧付き数字、矢印、数学記号等
      return (
        (codePoint >= 0x2460 && codePoint <= 0x24FF) || // 囲み英数字
        (codePoint >= 0x2500 && codePoint <= 0x257F) || // 罫線素
        (codePoint >= 0x2580 && codePoint <= 0x259F) || // ブロック要素
        // 他の全角記号範囲...
      );
    }
    ```
  - [x] getCharDisplayWidth関数の記号対応強化

- [x] **Stage 2: ヒント表示可能スペース判定**
  - [x] `canDisplayHint`関数の作成
    ```typescript
    function canDisplayHint(
      word: Word,
      adjacentWords: Word[],
      minHintWidth: number = 2
    ): boolean {
      // 利用可能スペースの計算
      // 隣接単語との距離チェック
    }
    ```
  - [x] 最小表示幅の定義（設定可能に）

- [x] **Stage 3: 優先順位付きヒント表示**
  - [x] `prioritizeHints`関数の作成
    ```typescript
    function prioritizeHints(words: Word[]): Word[] {
      // 1. 文字 > 記号
      // 2. 長い単語 > 短い単語
      // 3. 左 > 右
    }
    ```
  - [x] shouldSkipHintForOverlap関数の改善

##### 🔵 Refactor Phase: 最適化と改善
- [ ] **パフォーマンス最適化**
  - [ ] 記号判定のキャッシュ化
  - [ ] 優先順位計算の効率化

- [ ] **設定オプション追加**
  - [ ] 最小ヒント幅の設定
  - [ ] 優先順位ルールのカスタマイズ
  - [ ] 記号ヒント表示の有効/無効

#### sub2 Config型の拡張
@target: denops/hellshake-yano/config.ts
- [ ] `use_display_width`設定の追加
  - デフォルト: true
  - 表示幅計算を有効/無効化
- [ ] `tab_width`設定の追加
  - デフォルト: Vimの設定値を使用
  - 明示的なタブ幅の指定

### process4 TinySegmenter改善【段階的実装】
#### 背景と問題点
@problem: TinySegmenterによる日本語分割が過度に細分化され、意図通りにヒントが表示されない
@impact: 複合語、専門用語、助詞の処理で不自然な分割が発生

##### 現状の問題点
1. **過度な分割**: 複合語や固有名詞が細かく分割されすぎる
2. **助詞・接続詞の処理**: 限定的なパターンマッチングで対応
3. **専門用語の認識不足**: プログラミング用語や業界用語が正しく認識されない
4. **文脈考慮の欠如**: 単純な形態素解析のため、文脈に応じた分割ができない

#### sub1 辞書ベースの補正システム【優先度: 高】
@target: denops/hellshake-yano/word/dictionary.ts（新規作成）
@test: denops/hellshake-yano/word/dictionary.test.ts（新規作成）
@ref: denops/hellshake-yano/word/detector.ts（TinySegmenterWordDetector）

##### 🔴 Red Phase: テストファースト
- [x] **辞書機能の基本テスト（10ケース）**
  - [x] カスタム単語の登録と検索
  - [x] 複合語パターンのマッチング
  - [x] 分割禁止ワードの識別
  - [x] 結合ルールの適用
  - [x] 優先度による競合解決
  - [x] 辞書ファイルの読み込み
  - [x] プロジェクト固有辞書の統合
  - [x] ビルトイン辞書の利用
  - [x] 辞書のキャッシュ機能
  - [x] 動的辞書更新

- [x] **日本語プログラミング用語テスト（8ケース）**
  - [x] 「関数定義」→ そのまま保持
  - [x] 「非同期処理」→ そのまま保持
  - [x] 「配列操作」→ そのまま保持
  - [x] 「オブジェクト指向」→ そのまま保持
  - [x] 「データベース接続」→ そのまま保持
  - [x] 「ユニットテスト」→ そのまま保持
  - [x] 「バージョン管理」→ そのまま保持
  - [x] 「デバッグ実行」→ そのまま保持

##### 🟢 Green Phase: 実装
- [x] **Stage 1: 辞書インターフェース定義**
  ```typescript
  interface WordDictionary {
    customWords: Set<string>;
    compoundPatterns: RegExp[];
    preserveWords: Set<string>;
    mergeRules: Map<string, number>;
  }

  interface DictionaryConfig {
    dictionaryPath?: string;
    projectDictionaryPath?: string;
    useBuiltinDictionary?: boolean;
    enableLearning?: boolean;
  }
  ```

- [x] **Stage 2: ビルトイン辞書の実装**
  - [x] 日本語プログラミング用語辞書
  - [x] 頻出複合語リスト
  - [x] 助詞・接続詞の結合ルール

- [x] **Stage 3: TinySegmenterWordDetectorへの統合**
  - [x] `applyDictionaryCorrection`メソッドの追加
  - [x] `segmentsToWords`前に辞書補正を適用
  - [x] 辞書キャッシュの実装

##### 🔵 Refactor Phase: 最適化
- [ ] 辞書検索の高速化（Trie構造など）
- [ ] メモリ使用量の最適化
- [ ] 辞書の遅延読み込み

#### sub1.5 ユーザー定義辞書機能【優先度: 高】
@target: denops/hellshake-yano/word/dictionary-loader.ts（新規作成）
@test: denops/hellshake-yano/word/dictionary-loader.test.ts（新規作成）
@ref: denops/hellshake-yano/word/dictionary.ts（既存の辞書システム）

##### 🔴 Red Phase: テストファースト
- [x] **辞書ファイル読み込みテスト（12ケース）**
  - [x] JSON形式の辞書ファイル読み込み
  - [x] YAML形式の辞書ファイル読み込み
  - [x] テキスト形式の辞書ファイル読み込み
  - [x] プロジェクト辞書の検索と読み込み
  - [x] グローバル辞書の検索と読み込み
  - [x] 存在しないファイルのハンドリング
  - [x] 不正な形式のファイルのハンドリング
  - [x] 空の辞書ファイルの処理
  - [x] 辞書の優先順位処理
  - [x] 複数辞書のマージ
  - [x] 循環参照の検出
  - [x] 大容量ファイルの処理

- [x] **辞書マージテスト（8ケース）**
  - [x] ビルトイン辞書との統合
  - [x] override戦略でのマージ
  - [x] merge戦略でのマージ
  - [x] 重複単語の処理
  - [x] パターンの競合解決
  - [x] 結合ルールの優先順位
  - [x] カスタム単語の追加
  - [x] 分割禁止ワードの統合

- [x] **Vim連携テスト（6ケース）**
  - [x] 設定値の読み取り
  - [x] 辞書パスの解決
  - [x] 動的再読み込み
  - [x] エラー通知
  - [x] デフォルト値の適用
  - [x] 環境変数の展開

- [x] **ヒントパターンテスト（10ケース）**
  - [x] 正規表現パターンマッチング
  - [x] キャプチャグループの抽出
  - [x] ヒント優先度の設定
  - [x] チェックボックスパターン（`- [ ] テキスト`）
  - [x] 番号付きリストパターン（`1. テキスト`）
  - [x] Markdownヘッダーパターン（`## テキスト`）
  - [x] 日本語括弧パターン（「テキスト」）
  - [x] 複数パターンの競合解決
  - [x] 優先度による並び替え
  - [x] 隣接単語との調整

##### 🟢 Green Phase: 実装
- [x] **Stage 1: 辞書ファイルローダー**
  ```typescript
  class DictionaryLoader {
    private readonly searchPaths = [
      '.hellshake-yano/dictionary.json',
      'hellshake-yano.dict.json',
      '~/.config/hellshake-yano/dictionary.json'
    ];

    async loadUserDictionary(config?: DictionaryConfig): Promise<UserDictionary> {
      // ファイル探索と読み込み
    }

    private async parseJsonDictionary(content: string): Promise<UserDictionary>
    private async parseYamlDictionary(content: string): Promise<UserDictionary>
    private async parseTextDictionary(content: string): Promise<UserDictionary>
  }

  interface UserDictionary {
    customWords: string[];
    preserveWords: string[];
    mergeRules: Map<string, MergeStrategy>;
    compoundPatterns: RegExp[];
    hintPatterns?: HintPattern[];  // 新規追加
    metadata?: {
      version?: string;
      author?: string;
      description?: string;
    };
  }

  interface HintPattern {
    pattern: string | RegExp;  // 正規表現パターン
    hintPosition: HintPositionRule;  // ヒント配置ルール
    priority: number;  // 優先度（高いほど優先）
    description?: string;  // 説明（オプション）
  }

  type HintPositionRule =
    | 'capture:1' | 'capture:2' | 'capture:3'  // キャプチャグループ
    | 'start'  // マッチの開始位置
    | 'end'    // マッチの終了位置
    | { offset: number; from: 'start' | 'end' };  // カスタムオフセット
  ```

- [x] **Stage 2: 辞書マージ機能**
  ```typescript
  class DictionaryMerger {
    merge(
      base: WordDictionary,
      user: UserDictionary,
      strategy: 'override' | 'merge' = 'merge'
    ): WordDictionary {
      // マージロジックの実装
    }

    private mergeCustomWords(base: Set<string>, user: string[]): Set<string>
    private mergePatterns(base: RegExp[], user: RegExp[]): RegExp[]
    private resolvePriority(conflicts: ConflictItem[]): ResolvedItem[]
  }
  ```

- [x] **Stage 3: Vim設定との連携**
  ```typescript
  interface VimDictionaryConfig {
    dictionaryPath?: string;         // g:hellshake_yano_dictionary_path
    useBuiltinDict?: boolean;        // g:hellshake_yano_use_builtin_dict
    mergingStrategy?: 'override' | 'merge'; // g:hellshake_yano_dictionary_merge
    autoReload?: boolean;            // g:hellshake_yano_auto_reload_dict
  }

  class VimConfigBridge {
    async getConfig(denops: Denops): Promise<VimDictionaryConfig>
    async notifyError(denops: Denops, error: string): Promise<void>
    async reloadDictionary(denops: Denops): Promise<void>
  }
  ```

- [x] **Stage 4: ヒントパターン処理エンジン**
  ```typescript
  class HintPatternProcessor {
    applyHintPatterns(words: Word[], text: string, patterns: HintPattern[]): Word[] {
      // パターンマッチングとヒント優先度設定
    }

    private extractHintTarget(
      match: RegExpExecArray,
      rule: HintPositionRule
    ): { text: string; position: number } | null {
      // キャプチャグループや位置ルールの解析
    }

    private findWordAtPosition(words: Word[], position: number): Word | null {
      // 指定位置の単語を検索
    }

    private sortByHintPriority(words: Word[]): Word[] {
      // 優先度による並び替えと隣接調整
    }
  }
  ```

- [x] **Stage 5: 辞書管理コマンド**
  ```typescript
  // Vimコマンドの実装
  export async function registerDictionaryCommands(denops: Denops) {
    await denops.cmd('command! HellshakeYanoReloadDict call denops#request("hellshake-yano", "reloadDictionary", [])')
    await denops.cmd('command! HellshakeYanoEditDict call denops#request("hellshake-yano", "editDictionary", [])')
    await denops.cmd('command! HellshakeYanoShowDict call denops#request("hellshake-yano", "showDictionary", [])')
    await denops.cmd('command! HellshakeYanoValidateDict call denops#request("hellshake-yano", "validateDictionary", [])')
  }
  ```

##### 🔵 Refactor Phase: 最適化
- [ ] **パフォーマンス最適化**
  - [ ] 辞書キャッシュの実装
  - [ ] ファイル変更監視（ホットリロード）
  - [ ] 遅延読み込み戦略

- [ ] **ユーザビリティ向上**
  - [ ] 辞書ファイルテンプレート生成
  - [ ] 辞書検証ツール
  - [ ] マイグレーションヘルパー

- [ ] **エラーハンドリング強化**
  - [ ] 詳細なエラーメッセージ
  - [ ] 辞書ファイルの自動バックアップ
  - [ ] 復旧機能

##### 辞書ファイル形式の仕様
- [x] **JSON形式仕様**
  ```json
  {
    "$schema": "https://example.com/hellshake-yano-dict-schema.json",
    "version": "1.0",
    "customWords": ["機械学習", "深層学習"],
    "preserveWords": ["HelloWorld", "getElementById"],
    "mergeRules": {
      "の": "always",
      "を": "always"
    },
    "compoundPatterns": [".*Controller$", "^I[A-Z].*"],
    "hintPatterns": [
      {
        "pattern": "^-\\s*\\[\\s*\\]\\s*(.)",
        "hintPosition": "capture:1",
        "priority": 100,
        "description": "チェックボックス後の最初の文字"
      },
      {
        "pattern": "^\\d+\\.\\s*(.)",
        "hintPosition": "capture:1",
        "priority": 95,
        "description": "番号付きリストの最初の文字"
      },
      {
        "pattern": "^(#+)\\s*(.)",
        "hintPosition": "capture:2",
        "priority": 90,
        "description": "Markdownヘッダーの最初の文字"
      },
      {
        "pattern": "「([^」])",
        "hintPosition": "capture:1",
        "priority": 80,
        "description": "括弧内の最初の文字"
      }
    ]
  }
  ```

- [x] **YAML形式仕様**
  ```yaml
  version: "1.0"
  customWords:
    - 機械学習
    - 深層学習
  preserveWords:
    - HelloWorld
  mergeRules:
    の: always
    を: always
  hintPatterns:
    - pattern: "^-\\s*\\[\\s*\\]\\s*(.)"
      hintPosition: "capture:1"
      priority: 100
      description: "チェックボックス後の最初の文字"
    - pattern: "^\\d+\\.\\s*(.)"
      hintPosition: "capture:1"
      priority: 95
      description: "番号付きリストの最初の文字"
  ```

- [x] **テキスト形式仕様**
  ```
  # カスタム単語（#でコメント）
  機械学習
  深層学習

  # 分割禁止（!で開始）
  !HelloWorld
  !getElementById

  # 結合ルール（=で定義）
  の=always
  を=always

  # ヒントパターン（@で定義、優先度:パターン:位置）
  @100:^-\s*\[\s*\]\s*(.)：capture:1
  @95:^\d+\.\s*(.)：capture:1
  @90:^#+\s*(.)：capture:1
  @80:「([^」])：capture:1
  ```

##### マイルストーン
- [x] **M1**: 基本的な辞書ファイル読み込み機能
- [x] **M2**: 複数形式のサポート完了
- [x] **M3**: ヒントパターン処理エンジンの実装
- [ ] **M4**: Vim連携機能の実装
- [ ] **M5**: 辞書管理コマンドの完成
- [ ] **M6**: ドキュメントとサンプル辞書の提供

#### sub2 隣接文字解析による補正の強化【優先度: 高】
@target: denops/hellshake-yano/utils/charType.ts（新規作成）
@target: denops/hellshake-yano/utils/charType.test.ts（新規作成）
@target: denops/hellshake-yano/word/detector.ts（mergeShortSegmentsWithPosition拡張）
@test: denops/hellshake-yano/word/detector.test.ts（拡張）

##### 設計概要
現在の`mergeShortSegmentsWithPosition`メソッドの問題点を解決：
- 助詞・接続詞のパターンが限定的（固定的な正規表現）
- 文字種（ひらがな、カタカナ、漢字、英字等）の境界を考慮していない
- 括弧や引用符内のテキストを特別扱いしていない
- CamelCase、snake_case等のプログラミング命名規則に非対応

##### 🔴 Red Phase: テストファースト
- [x] **文字種判定テスト（charType.test.ts - 15ケース）**
  - [x] ひらがな判定: `getCharType('あ') === CharType.Hiragana`
  - [x] カタカナ判定: `getCharType('ア') === CharType.Katakana`
  - [x] 漢字判定: `getCharType('漢') === CharType.Kanji`
  - [x] 英大文字判定: `getCharType('A') === CharType.AlphaUpper`
  - [x] 英小文字判定: `getCharType('a') === CharType.AlphaLower`
  - [x] 数字判定: `getCharType('1') === CharType.Number`
  - [x] 記号判定: `getCharType('!') === CharType.Symbol`
  - [x] 開き括弧判定: `getCharType('(') === CharType.BracketOpen`
  - [x] 閉じ括弧判定: `getCharType(')') === CharType.BracketClose`
  - [x] 引用符判定: `getCharType('"') === CharType.Quote`
  - [x] スペース判定: `getCharType(' ') === CharType.Space`
  - [x] 混合文字列の解析: `analyzeString('漢字とEnglish')`
  - [x] 境界検出: `findBoundaries('漢字English123')`
  - [x] 全角文字判定: `isFullWidth('あ') === true`
  - [x] 半角文字判定: `isHalfWidth('a') === true`

- [x] **結合判定テスト（detector.test.ts拡張 - 12ケース）**
  - [x] 助詞の前単語への結合: `機能を` → `[機能を]`
  - [x] 接続詞の処理: `しかし` → 独立セグメント
  - [x] 文字種境界での分割維持: `日本語English` → `[日本語][English]`
  - [x] 括弧内テキストの保持: `(重要な内容)` → `[(重要な内容)]`
  - [x] 引用符内テキストの保持: `"quoted text"` → `["quoted text"]`
  - [x] カタカナ連続の保持: `システムエラー` → `[システムエラー]`
  - [x] 英数字連続の保持: `test123` → `[test123]`
  - [x] 漢字＋ひらがなパターン: `走る` → `[走る]`
  - [x] 記号による境界認識: `word.method` → `[word][.][method]`
  - [x] CamelCase処理: `getUserName` → `[get][User][Name]`
  - [x] snake_case処理: `user_name` → `[user_name]`
  - [x] kebab-case処理: `user-name` → `[user-name]`

##### 🟢 Green Phase: 実装
- [x] **Stage 1: 文字種判定ユーティリティ (charType.ts)**
  ```typescript
  // 文字種の定義
  export enum CharType {
    Hiragana = 'hiragana',          // ひらがな
    Katakana = 'katakana',          // カタカナ
    Kanji = 'kanji',                // 漢字
    AlphaUpper = 'alpha_upper',     // 英大文字
    AlphaLower = 'alpha_lower',     // 英小文字
    Number = 'number',              // 数字
    Symbol = 'symbol',              // 記号
    BracketOpen = 'bracket_open',   // 開き括弧
    BracketClose = 'bracket_close', // 閉じ括弧
    Quote = 'quote',                // 引用符
    Space = 'space',                // スペース
    Unknown = 'unknown'             // 不明
  }

  // 文字種判定関数
  export function getCharType(char: string): CharType {
    // Unicode範囲で判定
    const code = char.charCodeAt(0);
    // ひらがな: U+3040-U+309F
    // カタカナ: U+30A0-U+30FF
    // 漢字: U+4E00-U+9FAF
    // 実装...
  }

  // 隣接文字解析
  export interface AdjacentAnalysis {
    prevCharType: CharType | null;
    currentCharType: CharType;
    nextCharType: CharType | null;
    shouldMergeWithPrev: boolean;
    shouldMergeWithNext: boolean;
    isInBrackets: boolean;
    isInQuotes: boolean;
  }

  // 文字列全体の解析
  export function analyzeString(text: string): AdjacentAnalysis[] {
    // 各文字の文字種と隣接関係を解析
  }

  // 境界検出
  export function findBoundaries(text: string): number[] {
    // 文字種の変化点を検出
  }
  ```

- [x] **Stage 2: 拡張助詞・接続詞パターン**
  ```typescript
  // 包括的な助詞リスト
  const PARTICLES = {
    格助詞: ['を', 'に', 'で', 'と', 'へ', 'から', 'より', 'まで'],
    副助詞: ['は', 'も', 'だけ', 'ばかり', 'など', 'なり', 'やら'],
    接続助詞: ['て', 'で', 'ば', 'と', 'ても', 'けれど', 'が', 'のに'],
    終助詞: ['か', 'な', 'よ', 'ね', 'わ', 'の', 'さ'],
    準体助詞: ['の', 'こと']
  };

  // 接続詞リスト
  const CONJUNCTIONS = {
    順接: ['だから', 'したがって', 'よって', 'ゆえに'],
    逆接: ['しかし', 'けれども', 'だが', 'ところが'],
    並列: ['また', 'および', 'ならびに'],
    補足: ['つまり', 'すなわち', 'ただし', 'もっとも'],
    転換: ['ところで', 'さて', 'では', 'それでは']
  };

  // 文末表現パターン
  const SENTENCE_ENDINGS = [
    'です', 'ます', 'でした', 'ました',
    'だろう', 'でしょう', 'かもしれない'
  ];
  ```

- [x] **Stage 3: mergeShortSegmentsWithPosition改良**
  ```typescript
  private mergeShortSegmentsWithPosition(
    segments: PositionSegment[]
  ): PositionSegment[] {
    // 1. 文字種解析の実行
    const analyses = segments.map(seg => analyzeString(seg.text));

    // 2. 括弧・引用符のスコープ検出
    const scopes = detectScopes(segments);

    // 3. 結合判定ルールの適用
    const mergedSegments = applyMergeRules(segments, analyses, scopes, {
      // 文字種境界での分割
      respectCharTypeBoundaries: true,
      // 括弧内保持
      preserveBracketContent: true,
      // 引用符内保持
      preserveQuoteContent: true,
      // CamelCase分割
      splitCamelCase: this.config.split_camel_case ?? false,
      // 助詞結合
      mergeParticles: this.config.japanese_merge_particles !== false
    });

    return mergedSegments;
  }
  ```

- [ ] **Stage 4: Config拡張**
  ```typescript
  // types.ts のConfig interfaceに追加
  export interface Config {
    // ... 既存のフィールド ...

    // === 文字種解析設定 ===
    /** CamelCaseを分割するか */
    split_camel_case?: boolean;
    /** snake_caseを保持するか */
    preserve_snake_case?: boolean;
    /** 括弧内テキストを保持するか */
    preserve_bracket_content?: boolean;
    /** 引用符内テキストを保持するか */
    preserve_quote_content?: boolean;
    /** 文字種境界で分割するか */
    respect_char_type_boundaries?: boolean;
    /** カスタム助詞リスト */
    custom_particles?: string[];
    /** カスタム接続詞リスト */
    custom_conjunctions?: string[];
  }
  ```

##### 🔵 Refactor Phase: 最適化
- [x] **パフォーマンス最適化**
  - [x] 文字種判定のキャッシュ（LRU Cache）
  - [x] Unicode範囲チェックの最適化（ビットマスク使用）
  - [x] 正規表現のプリコンパイル

- [x] **メモリ最適化**
  - [x] 文字列の使い回し（string interning）
  - [x] 不要な中間配列の削減

- [x] **設定の外部化**
  - [x] 助詞・接続詞リストのJSON化
  - [x] ユーザー定義ルールのサポート
  - [x] 言語別設定ファイルの分離

##### マイルストーン
- [x] **M1**: 文字種判定ユーティリティの完成
- [x] **M2**: 拡張助詞・接続詞パターンの実装
- [x] **M3**: mergeShortSegmentsWithPosition改良の完成
- [x] **M4**: パフォーマンステストと最適化
- [x] **M5**: ドキュメントとサンプルの作成

#### sub3 コンテキスト認識による分割調整【優先度: 中】
@target: denops/hellshake-yano/types.ts（DetectionContext拡張）
@target: denops/hellshake-yano/word/context.ts（新規作成）
@test: denops/hellshake-yano/word/context.test.ts（新規作成）

##### 🔴 Red Phase: テストファースト
- [ ] **ファイルタイプ別分割テスト（8ケース）**
  - [ ] TypeScriptファイルでの分割
  - [ ] JavaScriptファイルでの分割
  - [ ] Pythonファイルでの分割
  - [ ] Markdownファイルでの分割
  - [ ] JSONファイルでの分割
  - [ ] YAMLファイルでの分割
  - [ ] HTMLファイルでの分割
  - [ ] プレーンテキストでの分割

- [ ] **文脈認識テスト（10ケース）**
  - [ ] コメント内での分割
  - [ ] 文字列リテラル内での分割
  - [ ] 関数名の認識
  - [ ] 変数名の認識
  - [ ] クラス名の認識
  - [ ] import文での分割
  - [ ] CamelCase分割
  - [ ] snake_case分割
  - [ ] kebab-case分割
  - [ ] インデントレベルの考慮

##### 🟢 Green Phase: 実装
- [ ] **Stage 1: DetectionContext拡張**
  ```typescript
  export interface DetectionContext {
    currentKey?: string;
    minWordLength?: number;
    metadata?: Record<string, unknown>;
    // 新規追加
    fileType?: string;
    syntaxContext?: SyntaxContext;
    lineContext?: LineContext;
  }

  interface SyntaxContext {
    inComment: boolean;
    inString: boolean;
    inFunction: boolean;
    inClass: boolean;
    language: string;
  }

  interface LineContext {
    isComment: boolean;
    isDocString: boolean;
    isImport: boolean;
    indentLevel: number;
  }
  ```

- [ ] **Stage 2: ファイルタイプ別ルール**
  - [ ] 言語別キーワードリスト
  - [ ] 命名規則パターン
  - [ ] 分割ルールマップ

- [ ] **Stage 3: コンテキスト検出器**
  - [ ] ファイルタイプ判定
  - [ ] 構文解析（簡易）
  - [ ] 行種別判定

##### 🔵 Refactor Phase: 最適化
- [ ] コンテキスト検出のキャッシュ
- [ ] ルールの動的読み込み
- [ ] 言語サーバーとの連携検討

#### sub4 ハイブリッド検出アプローチの強化【優先度: 中】
@target: denops/hellshake-yano/word/enhanced-hybrid.ts（新規作成）
@test: denops/hellshake-yano/word/enhanced-hybrid.test.ts（新規作成）
@ref: denops/hellshake-yano/word/detector.ts（HybridWordDetector）

##### 🔴 Red Phase: テストファースト
- [ ] **セグメント分析テスト（8ケース）**
  - [ ] 純粋な日本語テキスト
  - [ ] 純粋な英語テキスト
  - [ ] 日英混在テキスト
  - [ ] コード混在テキスト
  - [ ] 記号主体テキスト
  - [ ] 数値混在テキスト
  - [ ] 空白・改行の処理
  - [ ] 特殊文字の処理

- [ ] **検出器選択テスト（6ケース）**
  - [ ] 日本語での検出器選択
  - [ ] 英語での検出器選択
  - [ ] 混在での検出器選択
  - [ ] 信頼度による切り替え
  - [ ] フォールバック動作
  - [ ] エラー時の復旧

##### 🟢 Green Phase: 実装
- [ ] **Stage 1: EnhancedHybridWordDetector基本構造**
  ```typescript
  class EnhancedHybridWordDetector extends HybridWordDetector {
    private preProcessor: TextPreProcessor;
    private postProcessor: TextPostProcessor;
    private segmentAnalyzer: SegmentAnalyzer;

    async detectWords(
      text: string,
      startLine: number,
      context?: DetectionContext
    ): Promise<Word[]> {
      // 前処理 → セグメント分析 → 検出器選択 → 後処理
    }
  }
  ```

- [ ] **Stage 2: セグメント分析器**
  ```typescript
  interface TextSegment {
    text: string;
    type: 'japanese' | 'english' | 'mixed' | 'code' | 'symbol';
    confidence: number;
    startIndex: number;
    endIndex: number;
  }
  ```

- [ ] **Stage 3: 前処理・後処理パイプライン**
  - [ ] 特殊パターン抽出
  - [ ] 結果の統合
  - [ ] 重複除去

##### 🔵 Refactor Phase: 最適化
- [ ] パイプライン処理の並列化
- [ ] メモリ効率の改善
- [ ] 検出器プールの実装

##### マイルストーン
- [ ] **M1**: 辞書システム基本実装完了
- [ ] **M2**: 隣接文字解析強化完了
- [ ] **M3**: コンテキスト認識実装完了
- [ ] **M4**: ハイブリッド検出強化完了
- [ ] **M5**: 統合テスト合格
- [ ] **M6**: パフォーマンス目標達成（現状の110%以内）

### process10 ユニットテスト
#### sub1 表示幅計算のテスト
@target: tests/display_width_test.ts
- [ ] ASCII文字のテスト
- [ ] タブ文字のテスト（様々なタブ幅）
- [ ] 日本語文字のテスト

- [ ] 絵文字・特殊文字のテスト
- [ ] 混合文字列のテスト

#### sub2 隣接判定のテス定ト
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
