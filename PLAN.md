# title: ヒントキー設定の拡張（記号対応・数字複数文字ヒント追加）

## 概要
- ヒントキーの設定をより柔軟にカスタマイズ可能にする機能拡張
- singleCharKeysにキーボード記号を使用可能にし、アルファベットの複数文字ヒントに加えて数字の複数文字ヒントも追加生成可能にする

### f
- ユーザーが好みのキーボード記号（`;`, `:`, `[`, `]`など）を1文字ヒントに使用できる
- `useNumericMultiCharHints: true`により、アルファベットの2文字ヒント（BB, BC...）に加えて、数字の2文字ヒント（01, 02...99）も追加生成される
- 大量の単語に対してより多くのヒントパターンを提供し、効率的な移動を実現

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 既存の後方互換性を維持すること
- TypeScriptの型安全性を保証すること

## 開発のゴール
- キーボードで入力可能な記号をsingleCharKeysで使えるようにする
- `useNumericMultiCharHints`フラグにより、アルファベットの複数文字ヒントに加えて数字の2文字ヒントも追加生成できるようにする
- 大量の単語がある場合でも十分なヒントパターンを提供し、効率的な移動を実現する

## 実装仕様

### singleCharKeys拡張仕様
- 使用可能な記号: `;`, `:`, `[`, `]`, `'`, `"`, `,`, `.`, `/`, `\`, `-`, `=`, `` ` ``
- 既存のアルファベット・数字に加えて上記記号を設定可能
- バリデーション: 1文字であることの確認（既存）+ 入力可能文字の検証

### useNumericMultiCharHints仕様
- `useNumericMultiCharHints: true`が設定された場合、数字の2文字ヒントを追加生成
- 生成パターン: アルファベット2文字（BB, BC...）の後に数字2文字（`01`, `02`...`99`, `00`）を追加
- アルファベットヒントと数字ヒントの組み合わせで最大100個以上のヒントパターンを提供
- 優先順位: singleCharKeys → multiCharKeys（アルファベット）→ 数字2文字（01-09, 10-99, 00）

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
- [x] `allowSymbolsInSingleChar`オプションフラグの追加（記号使用可否）
- [x] `numericOnlyMultiChar`オプションフラグの追加（数字専用モード）
- [ ] `useNumericMultiCharHints`オプションフラグの追加（数字2文字ヒント追加生成）
- [x] JSDocコメントで新規オプションの説明を追加

### process2 デフォルト設定の更新
#### sub1 DEFAULT_CONFIGの拡張
@target: `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/config.ts`
@ref: `DEFAULT_CONFIG`定数（239行目）
- [x] singleCharKeysのデフォルト値に記号を追加可能にする設定
- [x] コメントで使用可能な記号リストを明記
- [x] deno checkでエラーが出ないことを確認
- [x] deno testでテストが通ることを確認

#### sub2 バリデーション関数の更新
@target: `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/config.ts`
@ref: `validateUnifiedConfig`関数（440行目）
- [x] singleCharKeysの記号文字検証ロジック追加
- [x] 使用可能な記号のホワイトリスト定義
- [x] エラーメッセージの改善
- [x] deno checkでエラーが出ないことを確認
- [x] deno testでテストが通ることを確認

### process3 ヒント生成ロジックの実装
#### sub1 数字専用判定関数の実装
@target: `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/hint.ts`
@ref: `generateMultiCharHintsFromKeys`関数の前（1350行目付近）
- [x] `isNumericOnlyKeys`関数の実装（キー配列が数字のみかチェック）
- [x] ユニットテスト用のexport
- [x] deno checkでエラーが出ないことを確認
- [x] deno testでテストが通ることを確認

#### sub2 数字専用ヒント生成の実装
@target: `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/hint.ts`
@ref: `generateMultiCharHintsFromKeys`関数（1366行目）
- [x] 数字専用モードの判定ロジック追加
- [x] 数字専用の2文字ヒント生成処理（00-99）
- [x] 優先順位に基づく生成順序の実装
- [x] deno checkでエラーが出ないことを確認
- [x] deno testでテストが通ることを確認

#### sub3 generateHintsWithGroups関数の更新
@target: `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/hint.ts`
@ref: `generateHintsWithGroups`関数（1256行目）
- [x] 数字専用モードの自動検出
- [x] 記号を含むsingleCharKeysの処理
- [ ] `useNumericMultiCharHints`フラグのサポート追加
- [x] deno checkでエラーが出ないことを確認
- [x] deno testでテストが通ることを確認

### process4 バリデーション強化
#### sub1 validateHintKeyConfig関数の更新
@target: `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/hint.ts`
@ref: `validateHintKeyConfig`関数（1423行目）
- [x] 記号文字のバリデーション追加
- [x] 数字専用モード時の検証
- [x] エラーメッセージの詳細化
- [x] deno checkでエラーが出ないことを確認
- [x] deno testでテストが通ることを確認

### process5 useNumericMultiCharHints機能の実装
#### sub1 型定義の追加
@target: `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/types.ts`
@ref: `HintKeyConfig`インターフェース
- [x] `useNumericMultiCharHints?: boolean`プロパティの追加
- [x] JSDocコメントで詳細な説明を追加

#### sub2 数字ヒント生成関数の実装
@target: `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/hint.ts`
- [x] `generateNumericHints`関数の実装（01-99, 00の順序で生成）
- [x] generateHintsWithGroups関数にuseNumericMultiCharHintsサポートを追加
- [x] アルファベットヒントの後に数字ヒントを追加する処理

#### sub3 バリデーションの追加
@target: `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/hint.ts`
@ref: `validateHintKeyConfig`関数
- [x] useNumericMultiCharHintsフラグのバリデーション追加

### process10 ユニットテスト
#### sub1 記号対応のテスト
@target: `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/hint.test.ts`
- [ ] 記号を含むsingleCharKeysのヒント生成テスト
- [ ] 記号のバリデーションテスト
- [ ] 記号と英数字の混在テスト

#### sub2 useNumericMultiCharHintsのテスト
@target: `/Users/ttakeda/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/hint.test.ts`
- [ ] useNumericMultiCharHints=trueでアルファベット＋数字ヒントが生成されることを確認
- [ ] 大量のヒント（100個以上）でも正しく動作することを確認
- [ ] 優先順位（single → multi alphabet → multi numeric）の確認

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
