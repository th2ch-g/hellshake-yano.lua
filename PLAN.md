# title: extractWordsFromLineOriginal() の安全な段階的除去

## 概要
- 非推奨となっている `extractWordsFromLineOriginal()` 関数を、TDD（テスト駆動開発）アプローチで安全に除去し、コードベースを簡潔化する

### goal
- レガシーコードの除去により、保守性の向上とコードの簡潔化を実現
- 既存の動作を保持しながら、段階的に新実装へ移行

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 各段階でテストを実行し、回帰がないことを確認すること
- ロールバック可能な小さなステップで進めること
- 人間がコードレビューを行ってからコミットするため、git add,  git commitするようように人間に通知する

## 開発のゴール
- `extractWordsFromLineOriginal()` 関数を完全に除去
- 後方互換性を維持しながら、新実装への移行を完了
- テストカバレッジを維持または向上

## 実装仕様

### 現状の分析結果
- **extractWordsFromLineOriginal（旧実装）の特徴:**
  - 最小文字数が2文字
  - 数字のみの単語をスキップ
  - kebab-case や snake_case の分割なし
  - シンプルな正規表現マッチング

- **新実装（useImprovedDetection=true）の特徴:**
  - 最小文字数が1文字
  - 数字のみの単語も許可
  - kebab-case と snake_case の分割
  - 日本語の文字種別による分割
  - 1文字の英単語・数字の検出

### 依存関係
- **直接呼び出し:** `extractWordsFromLine()` 内で `useImprovedDetection=false` の場合
- **間接的な使用:**
  - `detectWordsStandard()` - line 195
  - `detectWordsOptimizedForLargeFiles()` - line 230
  - `detectWordsInRange()` - line 589
- **テストファイル:**
  - `tests/single_char_detection_test.ts` - line 21
  - `tests/japanese_filtering_test.ts` - lines 152, 163

## 生成AIの学習用コンテキスト
### 実装ファイル
- [word.ts](~/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/word.ts)
  - extractWordsFromLineOriginal 関数の定義
  - extractWordsFromLine 関数の定義
  - 各種 detectWords 関数

### テストファイル
- [single_char_detection_test.ts](~/.config/nvim/plugged/hellshake-yano.vim/tests/single_char_detection_test.ts)
  - 旧実装の動作を検証しているテストケース
- [japanese_filtering_test.ts](~/.config/nvim/plugged/hellshake-yano.vim/tests/japanese_filtering_test.ts)
  - 日本語フィルタリングのテストケース

## Process
### process1 現状の把握とテストの整備
#### sub1 既存テストの実行と記録
@target: テスト実行結果の記録
- [x] 全テストを実行し、現在の状態を記録
- [x] 失敗しているテストを特定（現在1つ失敗中）

**調査結果:**
- **テスト状態:** integration_test.ts にシンタックスエラーが存在（43-47行目）
  - `console.log` 文またはステートメントが不完全でテストが実行できない状態
- **extractWordsFromLineOriginal 使用箇所の詳細:**
  - word.ts内：
    - detectWordsStandard() - line 195
    - detectWordsOptimizedForLargeFiles() - line 230
    - detectWordsInRange() - line 589
  - テストファイル内：
    - single_char_detection_test.ts - line 21
    - japanese_filtering_test.ts - lines 152, 163
- **関数詳細:** extractWordsFromLineOriginal は word.ts の 325-365行に定義
- **現在の制御:** useImprovedDetection=false 時に使用（389-391行）

#### sub2 回帰テストスイートの作成
@target: - [legacy_behavior_test.ts](~/.config/nvim/plugged/hellshake-yano.vim/tests/legacy_behavior_test.ts)
- [x] extractWordsFromLineOriginal の現在の動作を完全にカバーするテストケースを作成
- [x] 最小2文字の単語のみ検出することを検証
- [x] 数字のみの単語をスキップすることを検証
- [x] kebab-case/snake_caseを分割しないことを検証

### process2 移行用アダプター関数の作成
#### sub1 extractWordsFromLineLegacy 関数の実装
@target: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/word.ts`
- [ ] extractWordsFromLineLegacy 関数を新規作成
  - 新実装を呼び出し、旧動作に合わせてフィルタリング
  - 2文字未満の単語を除外
  - 数字のみの単語を除外

**実装仕様（調査結果に基づく）:**
- 現在の extractWordsFromLineOriginal の動作を完全に再現
- 最小文字数制限：2文字以上
- 数値のみの単語をスキップ
- kebab-case や snake_case の分割なし
- シンプルな正規表現マッチング方式を踏襲

#### sub2 アダプター関数のテスト
@target: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/tests/legacy_behavior_test.ts`
- [ ] extractWordsFromLineOriginal と extractWordsFromLineLegacy の出力を比較
- [ ] 100%一致することを確認

### process3 段階的な置き換え
#### sub1 detectWordsStandard の更新
@target: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/word.ts`
@ref: line 195
- [ ] `extractWordsFromLine(lineText, line, false)` → `extractWordsFromLineLegacy(lineText, line)`
- [ ] テスト実行して回帰がないことを確認

#### sub2 detectWordsOptimizedForLargeFiles の更新
@target: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/word.ts`
@ref: line 230
- [ ] `extractWordsFromLine(lineText, actualLine, false)` → `extractWordsFromLineLegacy(lineText, actualLine)`
- [ ] テスト実行して回帰がないことを確認

#### sub3 detectWordsInRange の更新
@target: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/word.ts`
@ref: line 589
- [ ] `extractWordsFromLine(lineText, line, false)` → `extractWordsFromLineLegacy(lineText, line)`
- [ ] テスト実行して回帰がないことを確認

#### sub4 extractWordsFromLine の簡略化
@target: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/word.ts`
@ref: lines 388-391
- [ ] useImprovedDetection パラメータのチェックを削除
- [ ] `false` の場合は `extractWordsFromLineLegacy()` を呼び出すよう変更

### process4 テストファイルの移行
#### sub1 旧動作に依存するテストの更新
@target: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/tests/single_char_detection_test.ts`
@ref: line 21
- [ ] テストが本当に旧動作を検証する必要があるか確認
- [ ] 必要なら `extractWordsFromLineLegacy()` を使用
- [ ] 不要なら新実装に移行

@target: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/tests/japanese_filtering_test.ts`
@ref: lines 152, 163
- [ ] 同様の評価と更新を実施

### process5 extractWordsFromLineOriginal の削除
#### sub1 最終確認と削除
@target: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/word.ts`
- [ ] extractWordsFromLineOriginal への参照が0件であることを確認
- [ ] 全テストが通ることを確認
- [ ] extractWordsFromLineOriginal 関数定義を削除
- [ ] @deprecated コメントも削除

### process10 ユニットテスト
- [ ] 全テストスイートが通ることを確認
- [ ] パフォーマンステストの結果が大きく変わらないことを確認
- [ ] カバレッジレポートの確認

### process50 フォローアップ
#### sub1 extractWordsFromLineLegacy の最適化
- [ ] 使用箇所が少なければ、段階的に新実装に移行
- [ ] 必要に応じて設定オプションとして残す

### process100 リファクタリング
- [ ] 不要になったパラメータの削除
- [ ] 関数シグネチャの簡略化
- [ ] コメントの更新

### process200 ドキュメンテーション
- [ ] JSDocコメントの更新
- [ ] 移行に関する変更履歴の記録
- [ ] README.mdの更新（必要に応じて）
