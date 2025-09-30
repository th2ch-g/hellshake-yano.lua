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

#### sub1 日本語分かち書きヒント生成の粒度最適化
@date: 2025-09-30
@issue: カーソル位置によって日本語の分かち書きによる形態素解析が細かすぎるヒントが生成される

##### 調査結果
- **TinySegmenterの形態素解析の性質**
  - `word.ts:629`で`TinySegmenter`を使用して日本語を分かち書き
  - 助詞レベルまで細かく分割される（例：「私の名前は」→「私」「の」「名前」「は」）

- **最小文字数フィルタの問題**
  - `word.ts:617,642`: `minWordLength`のデフォルトは`1`
  - `TinySegmenterWordDetector`は1文字の助詞も検出対象にしている
  - これにより「の」「は」「が」などの助詞にもヒントが表示される

- **後処理の限定的な統合**
  - `word.ts:3002-3058`: `postProcessSegments`は数字と単位、括弧内容のみを統合
  - 助詞や接続詞の統合処理がないため、形態素単位のまま残る

- **カーソル位置の影響**
  - `main.ts:603-607`: カーソル位置を取得
  - `hint.ts:653`: カーソルからの距離でソート
  - `word.ts:5319-5321`: visible range取得では画面表示範囲(`w0`-`w$`)全体が対象
  - カーソル位置によって可視範囲内の助詞が優先的に表示される

- **設定のデフォルト値**
  - `config.ts:288`: `japaneseMinWordLength: 2`（日本語用の最小文字数は2文字）
  - しかし、`word.ts:617`では`context?.minWordLength || 1`となっており、contextが渡されない場合は1文字も検出される

##### 対策案
- [x] 最小文字数の適切な適用: `japaneseMinWordLength`をTinySegmenterに正しく適用
  - `word.ts:642-644`で`japaneseMinWordLength`を優先的に使用するロジックを追加
  - 実装日: 2025-09-30
- [x] 助詞フィルタの追加: 一般的な助詞を除外するフィルタリング
  - 除外対象: 「の」「は」「が」「を」「に」「へ」「と」「や」「で」「も」など40種以上
  - `word.ts:573-588`に助詞セットを定義、`word.ts:678`でフィルタリング実装
  - 実装日: 2025-09-30
- [x] 形態素の統合強化: 意味のある単位に統合
  - `word.ts:753-786`のpostProcessSegmentsに名詞+助詞、動詞+助詞の統合処理を追加
  - 例: 「私」+「の」→「私の」、「名前」+「は」→「名前は」
  - 実装日: 2025-09-30
- [x] contextに`japaneseMinWordLength`を渡す処理を追加
  - DetectionContextを通じて`japaneseMinWordLength`が伝播されることを確認
  - テストで検証完了
  - 実装日: 2025-09-30

##### 実装詳細
- **TDD Red-Green-Refactorアプローチで実装**
  - RED Phase: 8つの失敗するテストを作成（tests/japanese_word_granularity_test.ts）
  - GREEN Phase: 最小限の実装でテストをパス
  - REFACTOR Phase: 助詞リストの共通化、コメント追加
- **主な変更箇所**
  - `word.ts:573-588`: 助詞セット定義（private readonly particles）
  - `word.ts:642-647`: japaneseMinWordLength優先ロジック、助詞統合フラグ
  - `word.ts:678-681`: 助詞フィルタリング
  - `word.ts:753-786`: postProcessSegments（形態素統合）
- **テスト**
  - tests/japanese_word_granularity_test.ts: 8つのテストケース（全てパス）
  - 既存の日本語関連テストも全てパス
- **結果**
  - 1文字の助詞（「の」「は」など）が単独で表示されなくなった
  - 形態素統合により、より自然な単位でヒントが表示されるようになった（例: 「私の」「名前は」）
  - japaneseMinWordLength設定が正しく適用されるようになった

### process100 リファクタリング
- [ ] 重複コードの削除
- [ ] 関数の責務分離
- [ ] パフォーマンス最適化

### process200 ドキュメンテーション
- [ ] README.mdへの新機能説明追加
- [ ] 設定例の追加（記号使用例、数字専用モード例）
- [ ] CHANGELOG.mdへの変更履歴追加
- [ ] JSDocコメントの充実化
