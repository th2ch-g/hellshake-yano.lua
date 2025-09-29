# title: single_char_keys設定の正規化処理修正

## 概要
- `single_char_keys`、`multi_char_keys`、`max_single_char_hints`のsnake_case設定が正しくcamelCaseに変換されるようにし、ユーザーが指定した設定が確実に反映されるようにする

### goal
- ユーザーが`'single_char_keys': split('ASDFGNM', '\zs')`と設定した場合、ヒントとして指定した文字のみが表示され、デフォルトの0〜9が混入しないようにする

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 既存のテストコードとの互換性を保つこと
- ドキュメント（README）のsnake_case形式の例は維持すること

## 開発のゴール
- snake_case形式の設定項目が確実にcamelCase形式に変換され、設定が正しく反映されるようにする
- ユーザーが混乱しないよう、snake_caseとcamelCase両方の形式をサポートする

## 実装仕様

### 問題の詳細
現在の`normalizeBackwardCompatibleFlags`関数には以下のマッピングが欠落している：
- `single_char_keys` → `singleCharKeys`
- `multi_char_keys` → `multiCharKeys`
- `max_single_char_hints` → `maxSingleCharHints`

これにより、ユーザーがsnake_case形式で設定しても無視され、デフォルト値（0〜9を含む）が使用されてしまう。

### 修正内容
`snakeToCamelMap`オブジェクトに上記3つのマッピングを追加する。

## 生成AIの学習用コンテキスト

### 設定ファイル
- denops/hellshake-yano/config.ts
  - DEFAULT_CONFIG定義（デフォルト値の確認）
  - singleCharKeysのデフォルト値に0〜9が含まれている

### メイン処理
- denops/hellshake-yano/main.ts
  - normalizeBackwardCompatibleFlags関数（line 175-233）
  - main関数での設定読み込み処理

### ヒント生成
- denops/hellshake-yano/hint.ts
  - generateHintsWithGroups関数
  - ヒント生成ロジックの理解

### ドキュメント
- README.md, README_ja.md
  - snake_case形式での設定例
- MIGRATION.md
  - snake_case → camelCase対応表

## Process

### process1 normalizeBackwardCompatibleFlags関数の修正
#### sub1 snake_caseからcamelCaseへの変換マッピング追加
@target: denops/hellshake-yano/main.ts
@ref: denops/hellshake-yano/config.ts
- [ ] snake_case形式の設定が正しく変換されることを確認
- [ ] camelCase形式の設定も引き続き動作することを確認
- [ ] `snakeToCamelMap`オブジェクトに以下を追加:
  - `"single_char_keys": "singleCharKeys"`
  - `"multi_char_keys": "multiCharKeys"`
  - `"max_single_char_hints": "maxSingleCharHints"`
- [ ] 既存のマッピングのアルファベット順に適切な位置に挿入
- [ ] deno checkでエラーが出ないことを確認
- [ ] deno testで既存のテストが通ることを確認

### process10 ユニットテスト
- [ ] snake_case形式の設定が正しく変換されることを確認
- [ ] camelCase形式の設定も引き続き動作することを確認
- [ ] 設定が反映されて期待通りのヒントが生成されることを確認

### process50 フォローアップ
- [ ] 実装後、実際にVimで以下の設定が動作することを確認：
  ```vim
  let g:hellshake_yano = {
    \ 'single_char_keys': split('ASDFGNM', '\zs'),
    \ }
  ```
- [ ] 0〜9の数字がヒントに含まれないことを確認

### process100 リファクタリング
- [ ] 将来的には設定の正規化処理を別ファイルに分離することを検討

### process200 ドキュメンテーション
- [ ] 変更履歴（CHANGELOG）への記載が必要な場合は追記
- [ ] README内の設定例は変更不要（snake_case形式を維持）
