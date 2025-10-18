# title: Phase B-2: コア機能の移植（TDD）

## 概要
- VimScript版の4つのコアモジュール（word_detector.vim、jump.vim、input.vim、hint_generator.vim）をDenops版TypeScriptに移植
- VimScript版の動作を**完全再現**し、座標計算・エラーメッセージ・動作タイミングを100%一致させる
- TDDアプローチで各モジュールの品質を保証し、VimScript互換性テストで動作検証

### goal
- Vim環境でもDenopsの高速TypeScript処理を利用可能にする
- VimScript版との100%動作互換性を実現し、既存ユーザーに影響を与えない
- Phase B-1で構築した統合基盤を活用し、環境別処理を完全分離

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **ARCHITECTURE_B.md の基本ルールを厳守**:
  - VimScript実装が正規実装（改善よりも一致性優先）
  - 環境別処理の完全分離（Vim/Neovim）
  - 既存実装の副作用チェック

## 開発のゴール
- VimScript版の4モジュールをTypeScriptで完全再現（1行単位の正確な移植）
- TDDサイクル（RED → GREEN → REFACTOR → VimScript互換性テスト）の徹底
- 全60個以上のテストケースで品質保証
- テストカバレッジ90%以上、VimScript互換テスト100%パス

## 実装仕様

### 移植対象モジュール

1. **word_detector.vim → unified-word-detector.ts**
   - 画面内（line('w0')～line('w$')）の単語検出
   - matchstrpos()の動作を正規表現で再現
   - 0-indexed → 1-indexed変換の正確な実装

2. **jump.vim → unified-jump.ts**
   - cursor(lnum, col)のDenops API再現
   - 範囲チェック（1 <= lnum <= line('$'), 1 <= col）の完全移植
   - エラーメッセージの完全一致

3. **hint_generator.vim → unified-hint-generator.ts**
   - 単一文字ヒント（7個: asdfgnm）
   - 複数文字ヒント（42個: bb, bc, be, ...）
   - 最大49個の制限

4. **input.vim → unified-input.ts**
   - ブロッキング入力処理（getchar()の再現）
   - 部分マッチ判定（stridx()ロジックの移植）
   - 完全一致時のジャンプ実行

### VimScript互換性の保証方法

- **座標計算**: VimScript版のpopup_create()/extmark座標と完全一致
- **エラーメッセージ**: printf()フォーマットを含めて完全再現
- **動作タイミング**: ブロッキング処理のタイミングを一致
- **テストによる検証**: 各モジュールでVimScript版と結果比較テストを実施

## 生成AIの学習用コンテキスト

### VimScript実装（移植元）
- `autoload/hellshake_yano_vim/word_detector.vim`
  - detect_visible()関数: 画面内単語検出のアルゴリズム
  - matchstrpos()の使用方法
- `autoload/hellshake_yano_vim/jump.vim`
  - to()関数: カーソル移動と範囲チェック
- `autoload/hellshake_yano_vim/input.vim`
  - wait_for_input()関数: ブロッキング入力処理
  - get_partial_matches()関数: 部分マッチ判定
- `autoload/hellshake_yano_vim/hint_generator.vim`
  - generate()関数: ヒント文字列生成

### Denops既存実装（参考）
- `denops/hellshake-yano/types.ts`
  - Word型定義（line, col, text）
- `denops/hellshake-yano/word.ts`
  - 既存の単語検出実装（TinySegmenter含む）
- `denops/hellshake-yano/hint.ts`
  - 既存のヒント生成実装

### Phase B-1実装（基盤）
- `denops/hellshake-yano/phase-b1/vim-bridge.ts`
  - 環境判定ロジック（isVimEnvironment）
- `denops/hellshake-yano/phase-b1/config-unifier.ts`
  - 設定統合メカニズム
- `denops/hellshake-yano/phase-b1/side-effect-checker.ts`
  - 副作用管理機構

### アーキテクチャドキュメント
- `ARCHITECTURE_B.md`
  - Phase B-2実装計画（522-741行）
  - 実装の基本ルール（14-177行）

## Process

### process1: 型定義の統一（0.5日）
@target: `denops/hellshake-yano/phase-b2/vimscript-types.ts`
@ref: `autoload/hellshake_yano_vim/word_detector.vim`, `denops/hellshake-yano/types.ts`

- [ ] VimScriptWord型の定義（text, lnum, col, end_col）
  - lnum, col, end_colは全て1-indexed
- [ ] DenopsWord型への変換関数（toDecodeopsWord）
  - lnum → line, col → col
- [ ] VimScript型への逆変換関数（toVimScriptWord）
  - line → lnum, col → col
- [ ] 型変換テストの作成
  - 変換の正確性テスト
  - 逆変換後の一致性テスト

### process2: unified-word-detector.ts（1.5日）
@target: `denops/hellshake-yano/phase-b2/unified-word-detector.ts`
@ref: `autoload/hellshake_yano_vim/word_detector.vim`

#### sub1: テストファイル作成（RED）
@target: `tests/phase-b2/unified-word-detector.test.ts`

- [ ] 基本機能テスト（4件）
  - 空のバッファで空配列を返す
  - 単一行の単語を正しく検出
  - 複数行の単語を検出
  - 空行を正しくスキップ
- [ ] VimScript完全互換テスト（3件）
  - VimScript版と同一の単語リストを返す
  - matchstrpos()と同じ位置情報
  - line('w0')とline('w$')の範囲制限
- [ ] エッジケーステスト（3件）
  - 日本語を含む行（Phase B-3で対応）
  - 特殊文字のみの行
  - 最大単語数の制限

#### sub2: 実装（GREEN）
- [ ] UnifiedWordDetectorクラスの作成
- [ ] detectVisible()メソッド
  - getVisibleRange(): line('w0'), line('w$')取得
  - getLines(): 範囲内の行取得
  - detectByRegex(): 正規表現ベース単語検出
  - filterWords(): config基づくフィルタリング
- [ ] matchstrpos()の再現
  - 正規表現 /\w+/g で単語検出
  - 0-indexed → 1-indexed変換
- [ ] VimScript版のアルゴリズム完全移植
  - 空バッファチェック（l:w0 < 1 || l:wlast < 1）
  - 空行スキップ（empty(l:line)）
  - 無限ループ防止チェック

#### sub3: リファクタリング（REFACTOR）
- [ ] コードの可読性向上
- [ ] 型安全性の確認
- [ ] パフォーマンス最適化

### process3: unified-jump.ts（0.5日）
@target: `denops/hellshake-yano/phase-b2/unified-jump.ts`
@ref: `autoload/hellshake_yano_vim/jump.vim`

#### sub1: テストファイル作成（RED）
@target: `tests/phase-b2/unified-jump.test.ts`

- [ ] 基本機能テスト（3件）
  - 有効な座標にジャンプ
  - バッファ先頭にジャンプ（1, 1）
  - バッファ末尾にジャンプ（line('$'), 1）
- [ ] 範囲チェックテスト（3件）
  - 行番号が1未満でエラー
  - 行番号が最終行超過でエラー
  - 列番号が1未満でエラー
- [ ] VimScript互換性テスト（3件）
  - VimScript版と同じエラーメッセージ
  - cursor()関数と同じ動作
  - 型チェック（lnum, colが数値）

#### sub2: 実装（GREEN）
- [ ] UnifiedJumpクラスの作成
- [ ] jumpTo(lnum, col)メソッド
  - 型チェック（type(a:lnum) != v:t_number）の再現
  - 範囲チェック（1 <= lnum <= line('$'), 1 <= col）
  - cursor()関数のDenops API再現
- [ ] エラーメッセージの完全一致
  - 'lnum and col must be numbers'
  - 'invalid line number %d (must be >= 1)'
  - 'invalid line number %d (must be <= %d)'
  - 'invalid column number %d (must be >= 1)'
  - 'failed to move cursor to (%d, %d)'

### process4: unified-hint-generator.ts（1日）
@target: `denops/hellshake-yano/phase-b2/unified-hint-generator.ts`
@ref: `autoload/hellshake_yano_vim/hint_generator.vim`

#### sub1: テストファイル作成（RED）
@target: `tests/phase-b2/unified-hint-generator.test.ts`

- [ ] 単一文字ヒントテスト（2件）
  - 7個以下で単一文字のみ（['a', 's', 'd', ...]）
  - カスタムキー設定に対応
- [ ] 複数文字ヒントテスト（3件）
  - 8個以上で複数文字を含む（['a', ..., 'm', 'bb']）
  - 2文字ヒントの生成順序（'bb', 'bc', 'be', ...）
  - 最大49個の制限
- [ ] VimScript互換性テスト（3件）
  - VimScript版と同じヒント順序
  - 単一文字キーと複数文字キーの分離
  - グローバル変数カスタマイズ対応

#### sub2: 実装（GREEN）
- [ ] UnifiedHintGeneratorクラスの作成
- [ ] generate(count)メソッド
  - count <= 0で空配列
  - count <= 7で単一文字ヒント
  - count > 7で単一+複数文字ヒント
  - 最大49個の制限
- [ ] generateMultiCharHints(count)メソッド
  - 2文字ヒント生成（bb, bc, be, ...）
  - インデックス計算（first_idx = i / len, second_idx = i % len）
- [ ] キーセット管理
  - singleCharKeys: 'asdfgnm'
  - multiCharKeys: 'bceiopqrtuvwxyz'

### process5: unified-input.ts（1.5日）
@target: `denops/hellshake-yano/phase-b2/unified-input.ts`
@ref: `autoload/hellshake_yano_vim/input.vim`

#### sub1: テストファイル作成（RED）
@target: `tests/phase-b2/unified-input.test.ts`

- [ ] ブロッキング入力テスト（3件）
  - 単一文字入力でジャンプ
  - 複数文字入力でジャンプ
  - ESCでキャンセル
- [ ] 部分マッチテスト（2件）
  - 部分マッチ時にハイライト更新
  - マッチなしで終了
- [ ] VimScript互換性テスト（4件）
  - getPartialMatches()と同じ結果
  - wait_for_input()と同じタイミング
  - stridx()ロジックの完全移植
  - エラー時のクリーンアップ

#### sub2: 実装（GREEN）
- [ ] UnifiedInputクラスの作成
- [ ] waitForInput(hintMap)メソッド
  - getchar()のブロッキング処理再現
  - 入力ループ（while 1）
  - 完全一致チェック（has_key(a:hint_map, l:input_buffer)）
  - 部分マッチチェック
- [ ] getPartialMatches()メソッド
  - stridx(hint, input_buffer) == 0の再現
  - 前方一致判定
- [ ] エラーハンドリング
  - try-catch-finally構造
  - ヒント非表示のクリーンアップ

### process6: 統合テスト（0.5日）
@target: `tests/phase-b2/phase-b2-e2e.test.ts`

- [ ] End-to-Endテストシナリオ
  - 単語検出 → ヒント生成 → ヒント表示 → 入力処理 → ジャンプ実行
- [ ] VimScript版との完全動作比較
  - 全モジュールの統合で動作一致確認
  - 座標・エラーメッセージ・タイミングの完全一致
- [ ] パフォーマンステスト
  - 処理時間がVimScript版と同等以下
  - メモリ使用量の確認

### process10: ユニットテスト
各processで実装したテストの総合確認

- [ ] 全テストケース数: 60個以上
- [ ] テストカバレッジ: 90%以上
- [ ] VimScript互換テスト: 100%パス
- [ ] 型チェック: deno check 100%パス
- [ ] リンター: deno lint パス
- [ ] フォーマット: deno fmt 準拠

### process50: フォローアップ
実装後の仕様変更・追加要件

- [ ] Phase B-3への準備
  - TinySegmenter統合のインターフェース確認
  - 日本語単語検出の拡張ポイント特定
- [ ] パフォーマンス最適化の検討
  - キャッシュ戦略の詳細設計
  - バッチ処理の活用ポイント

### process100: リファクタリング
コード品質向上

- [ ] 共通処理の抽出
- [ ] 型定義の最適化
- [ ] エラーハンドリングの統一
- [ ] コメント・ドキュメントの充実

### process200: ドキュメンテーション

- [ ] ARCHITECTURE_B.md の更新
  - Phase B-2完了レポートの追加
  - 実装進捗状況テーブルの更新
- [ ] README.md の更新（必要に応じて）
- [ ] テストドキュメントの作成
  - テストケース一覧
  - VimScript互換性検証結果

---

## 成功基準

### 定量指標
- 全テストケース: **60個以上**
- テストカバレッジ: **90%以上**
- VimScript互換テスト: **100%パス**
- 型チェック: **deno check 100%**

### 定性指標
- VimScript版と**座標完全一致**
- エラーメッセージ**完全一致**
- 動作タイミング**一致**
- ブロッキング処理の**同一動作**

## スケジュール

| Process | ステップ | 所要時間 | 累計 |
|---------|---------|---------|------|
| process1 | 型定義の統一 | 0.5日 | 0.5日 |
| process2 | unified-word-detector | 1.5日 | 2.0日 |
| process3 | unified-jump | 0.5日 | 2.5日 |
| process4 | unified-hint-generator | 1.0日 | 3.5日 |
| process5 | unified-input | 1.5日 | 5.0日 |
| process6 | 統合テスト | 0.5日 | 5.5日 |

**合計**: 5.5日

## 次フェーズへの引き継ぎ

Phase B-2完了後、Phase B-3（高度な機能の統合）で以下を実装：
- TinySegmenterの統合（日本語対応）
- モーション検出の統合
- キャッシュ機構の統合
