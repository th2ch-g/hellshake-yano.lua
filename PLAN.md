# title: 日本語分かち書き閾値設定の調整と最適化

## 概要
- hellshake-yano.vimプラグインの日本語分かち書き機能における閾値設定を調整し、より精度の高い単語分割を実現する

### goal
- 日本語テキストのナビゲーション時に、自然な単語単位でのジャンプを可能にする
- 助詞や接続詞の適切な結合により、文脈に応じた単語認識を実現する

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること

## 開発のゴール
- 日本語分かち書きの閾値設定を調整可能にする
- TinySegmenterの使用条件を最適化する
- 助詞マージの挙動を改善する

## 実装仕様
- 設定キーはcamelCase形式（japaneseMergeThreshold等）を使用
- snake_case形式も後方互換性のために維持
- デフォルト値は現在の値を維持（japaneseMergeThreshold: 2, segmenterThreshold: 4）

## 生成AIの学習用コンテキスト
### 設定ファイル
- denops/hellshake-yano/config.ts
  - 閾値設定の型定義とデフォルト値
- denops/hellshake-yano/main.ts
  - snake_case to camelCase変換マッピング
- denops/hellshake-yano/word.ts
  - 日本語単語検出とマージ処理の実装

### テストファイル
- denops/hellshake-yano/word_test.ts
  - 単語検出ロジックのテスト

## Process
### process1 閾値設定の現状確認と文書化
@target: PLAN.md
@ref: denops/hellshake-yano/config.ts
- [x] 現在の閾値設定を調査（japaneseMergeThreshold, segmenterThreshold等）
- [x] 設定名の変更履歴を確認（snake_case → camelCase）
- [x] デフォルト値と用途を文書化

### process2 設定方法の明確化
@target: README.md（必要に応じて）
@ref: plugin/hellshake-yano.vim
- [x] vimrcでの設定例を作成（新旧両形式）
- [x] 各閾値の効果と調整指針を文書化

### process3 閾値調整の検証
@target: tests/threshold-validation/
@implemented: TDD Red-Green-Refactor方式で実装完了
- [x] japaneseMergeThresholdを1〜5で検証（テストケース作成）
- [x] segmenterThresholdを2〜6で検証（テストケース作成）
- [x] 最適な組み合わせを決定（3つの推奨プロファイル定義）
- [x] テストスキーマとJSONテストケース作成
- [x] 3つのVim設定ファイル作成（aggressive, balanced, precise）
- [x] マトリックステスト用スクリプト作成
- [x] 検証結果記録テンプレート作成
- [x] テストサンプルテキスト作成
- [x] 包括的なREADMEとクイックリファレンス作成

**成果物**:
- `tests/threshold-validation/` - 完全なテスト検証スイート
- 推奨設定: Aggressive(5,2), Balanced(2,4), Precise(1,6)

### process10 ユニットテスト
@target: denops/hellshake-yano/word_test.ts
- [ ] deno check実行
- [ ] deno test実行
- [ ] 閾値変更による挙動の確認

### process50 フォローアップ
- [ ] ユーザーの要望に応じた閾値のカスタマイズ

### process100 リファクタリング
- [ ] 不要な設定の削除検討
- [ ] 設定名の一貫性確認

### process200 ドキュメンテーション
- [ ] README.mdに日本語設定セクションを追加
- [ ] 設定例とベストプラクティスを記載

## 推奨設定例（camelCase形式）

### 完全な設定例
```vim
let g:hellshake_yano = {
      \ 'debugMode': v:false,
      \ 'useJapanese': v:true,
      \ 'useHintGroups': v:true,
      \ 'enableTinySegmenter': v:true,
      \ 'singleCharKeys': split('ASDFGNM0123456789', '\zs'),
      \ 'multiCharKeys': split('BCEIOPQRTUVWXYZ', '\zs'),
      \ 'highlightHintMarker': {'bg': 'black', 'fg': '#57FD14'},
      \ 'highlightHintMarkerCurrent': {'bg': 'Red', 'fg': 'White'},
      \ 'highlightSelected': v:true,
      \ 'perKeyMinLength': {
      \   'w': 1,
      \   'b': 1,
      \   'e': 1,
      \ },
      \ 'defaultMinWordLength': 2,
      \ 'perKeyMotionCount': {
      \   'w': 1,
      \   'b': 1,
      \   'e': 1,
      \   'h': 3,
      \   'j': 3,
      \   'k': 3,
      \   'l': 3,
      \ },
      \ 'motionCount': 3,
      \ 'segmenterThreshold': 4,
      \ 'japaneseMergeThreshold': 2,
      \ }
```

### 重要な注意事項

**camelCase形式を使用してください**:
- ❌ `default_min_word_length` (snake_case) - 認識されません
- ✅ `defaultMinWordLength` (camelCase) - 正しく認識されます

設定キーの優先順位:
1. `perKeyMinLength[key]` - キー別の最小文字数（最優先）
2. `defaultMinWordLength` - デフォルトの最小単語長
3. `default_min_length` - 後方互換性（非推奨）
4. デフォルト値: 3

### トラブルシューティング

**問題**: 漢字やひらがなにヒントが表示されない
**原因**: `defaultMinWordLength`が設定されておらず、デフォルト値3が使用されている
**解決**: `'defaultMinWordLength': 1` または `'defaultMinWordLength': 2` を設定
