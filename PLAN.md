# title: ヒントキー設定の拡張（記号対応・数字専用モード）

## 概要
- ヒントキーの設定をより柔軟にカスタマイズ可能にする機能拡張
- singleCharKeysにキーボード記号を使用可能にし、multiCharKeysで数字専用の2文字ヒント生成を実現

### goal
- ユーザーが好みのキーボード記号（`;`, `:`, `[`, `]`など）を1文字ヒントに使用できる
- 数字キー(0-9)を使用した場合、`01`, `02`のような数字のみの2文字ヒントが生成される
- 数字とアルファベット/記号の混在（`0A`, `1B`など）を防止し、認知負荷を軽減

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 既存の後方互換性を維持すること
- TypeScriptの型安全性を保証すること

## 開発のゴール
- キーボードで入力可能な記号をsingleCharKeysで使えるようにする
- multiCharKeysで数字のみを使用した場合、数字だけの2文字ヒントを生成する
- ユーザーの認知負荷を減らし、より直感的なヒント入力を実現する

## 実装仕様

### singleCharKeys拡張仕様
- 使用可能な記号: `;`, `:`, `[`, `]`, `'`, `"`, `,`, `.`, `/`, `\`, `-`, `=`, `` ` ``
- 既存のアルファベット・数字に加えて上記記号を設定可能
- バリデーション: 1文字であることの確認（既存）+ 入力可能文字の検証

### multiCharKeys数字専用モード仕様
- 数字のみ（0-9）が設定された場合、自動的に数字専用モードを有効化
- 生成パターン: `00`, `01`, `02`...`99`（最大100個）
- アルファベット/記号が混在している場合は従来の生成方式を使用
- 優先順位: `01-09`, `10-99`, `00`の順で生成

## 生成AIの学習用コンテキスト

### 設定ファイル
- `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/config.ts`
  - DEFAULT_CONFIG定数のsingleCharKeys, multiCharKeys設定
  - validateUnifiedConfig関数のバリデーションロジック

### 型定義ファイル
- `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/types.ts`
  - HintKeyConfigインターフェース（273行目）

### ヒント生成ロジック
- `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/hint.ts`
  - generateHintsWithGroups関数（1256行目）: メインのヒント生成関数
  - generateMultiCharHintsFromKeys関数（1366行目）: 複数文字ヒント生成
  - validateHintKeyConfig関数（1423行目）: 設定検証

## Process

### process1 型定義の拡張
#### sub1 HintKeyConfigインターフェースの拡張
@target: `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/types.ts`
@ref: `HintKeyConfig`インターフェース（273行目）
- [ ] `allowSymbolsInSingleChar`オプションフラグの追加（記号使用可否）
- [ ] `numericOnlyMultiChar`オプションフラグの追加（数字専用モード）
- [ ] JSDocコメントで新規オプションの説明を追加

### process2 デフォルト設定の更新
#### sub1 DEFAULT_CONFIGの拡張
@target: `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/config.ts`
@ref: `DEFAULT_CONFIG`定数（239行目）
- [ ] singleCharKeysのデフォルト値に記号を追加可能にする設定
- [ ] コメントで使用可能な記号リストを明記

#### sub2 バリデーション関数の更新
@target: `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/config.ts`
@ref: `validateUnifiedConfig`関数（440行目）
- [ ] singleCharKeysの記号文字検証ロジック追加
- [ ] 使用可能な記号のホワイトリスト定義
- [ ] エラーメッセージの改善

### process3 ヒント生成ロジックの実装
#### sub1 数字専用判定関数の実装
@target: `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/hint.ts`
@ref: `generateMultiCharHintsFromKeys`関数の前（1350行目付近）
- [ ] `isNumericOnlyKeys`関数の実装（キー配列が数字のみかチェック）
- [ ] ユニットテスト用のexport

#### sub2 数字専用ヒント生成の実装
@target: `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/hint.ts`
@ref: `generateMultiCharHintsFromKeys`関数（1366行目）
- [ ] 数字専用モードの判定ロジック追加
- [ ] 数字専用の2文字ヒント生成処理（00-99）
- [ ] 優先順位に基づく生成順序の実装

#### sub3 generateHintsWithGroups関数の更新
@target: `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/hint.ts`
@ref: `generateHintsWithGroups`関数（1256行目）
- [ ] 数字専用モードの自動検出
- [ ] 記号を含むsingleCharKeysの処理

### process4 バリデーション強化
#### sub1 validateHintKeyConfig関数の更新
@target: `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/hint.ts`
@ref: `validateHintKeyConfig`関数（1423行目）
- [ ] 記号文字のバリデーション追加
- [ ] 数字専用モード時の検証
- [ ] エラーメッセージの詳細化

### process10 ユニットテスト
#### sub1 記号対応のテスト
@target: `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/hint.test.ts`
- [ ] 記号を含むsingleCharKeysのヒント生成テスト
- [ ] 記号のバリデーションテスト
- [ ] 記号と英数字の混在テスト

#### sub2 数字専用モードのテスト
@target: `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/hint.test.ts`
- [ ] 数字のみのmultiCharKeysテスト
- [ ] 00-99の生成順序テスト
- [ ] 数字とアルファベット混在時の通常モードテスト

#### sub3 統合テスト
@target: `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/tests/`に新規ファイル作成
- [ ] 記号と数字専用モードの組み合わせテスト
- [ ] パフォーマンステスト（大量ヒント生成時）
- [ ] エッジケーステスト

### process50 フォローアップ

### process100 リファクタリング
- [ ] 重複コードの削除
- [ ] 関数の責務分離
- [ ] パフォーマンス最適化

### process200 ドキュメンテーション
- [ ] README.mdへの新機能説明追加
- [ ] 設定例の追加（記号使用例、数字専用モード例）
- [ ] CHANGELOG.mdへの変更履歴追加
- [ ] JSDocコメントの充実化
