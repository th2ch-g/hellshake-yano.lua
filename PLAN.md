# title: Phase B-1: 統合基盤構築（TDD実装）

## 概要
- VimScript版とDenops版を統合する基盤を構築し、Vim環境でもDenopsを通じて高機能なhit-a-hint機能を提供する
- TDD（テスト駆動開発）により、VimScript版との100%の互換性を保証しながら実装

### goal
- Vim/Neovim両環境で統一された設定（`g:hellshake_yano`）を使用してhit-a-hint機能を利用できる
- VimScript版の動作を完全に再現しつつ、Denopsの高速処理を活用

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 必ず `ARCHITECTURE_B.md` の実装基本ルールを厳守すること
  - VimScript版の動作が絶対的な基準
  - ヒント表示位置とジャンプ機能はピクセル単位で完全一致
  - 環境別処理の完全分離
  - 既存実装の副作用チェック

## 開発のゴール
- VimScript版（`autoload/hellshake_yano_vim/`）の動作を100%再現
- Vim/Neovim環境の処理を完全に分離
- TDDにより各機能の動作保証
- 型安全性とテストカバレッジ90%以上を達成

## 実装仕様

### テスト駆動開発のサイクル
1. RED: テストを先に書く（失敗する）
2. GREEN: 最小限の実装でテストを通す
3. REFACTOR: コードを改善（テストは通ったまま）

### 型チェックとテスト実行
- 各プロセスの実装前後で必ず実行:
  - `deno check`: TypeScript型チェック
  - `deno test`: 自動テスト実行
  - `deno fmt`: コードフォーマット
  - `deno lint`: リンターチェック

## 生成AIの学習用コンテキスト

### VimScript実装
- `autoload/hellshake_yano_vim/core.vim`
  - 状態管理と統合処理の基準実装
- `autoload/hellshake_yano_vim/config.vim`
  - 設定管理の基準実装
- `autoload/hellshake_yano_vim/display.vim`
  - 表示制御の基準実装（popup_create/extmark）
- `autoload/hellshake_yano_vim/input.vim`
  - 入力処理の基準実装（ブロッキング処理）
- `autoload/hellshake_yano_vim/jump.vim`
  - ジャンプ機能の基準実装

### 既存Denops実装
- `denops/hellshake-yano/main.ts`
  - 既存のエントリーポイント（副作用チェック必要）
- `denops/hellshake-yano/config.ts`
  - Config型定義と既存設定構造
- `denops/hellshake-yano/word/word-segmenter.ts`
  - TinySegmenter実装（日本語対応で活用）

### テストインフラ
- `tests/testRunner.ts`
  - 既存のテストランナー（Vim/Neovim両対応）
- `deno.jsonc`
  - TypeScript設定（strict: true）

## Process

### process1 テストインフラ構築
#### sub1.1 VimScript互換性テスト基盤
@target: `tests/phase-b1/vimscript-compat.test.ts`
@ref: `tests/testRunner.ts`, `autoload/hellshake_yano_vim/core.vim`
- [ ] VimScript版の動作を検証するテストヘルパー作成
- [ ] 座標・位置の完全一致を確認するアサーション追加
- [ ] 型チェック: `deno check tests/phase-b1/vimscript-compat.test.ts`
- [ ] テスト実行: `deno test tests/phase-b1/vimscript-compat.test.ts` (RED)

#### sub1.2 環境分離テストヘルパー
@target: `tests/phase-b1/env-helper.ts`
- [ ] Vim環境専用のテスト実行ヘルパー
- [ ] Neovim環境専用のテスト実行ヘルパー
- [ ] 環境切り替えのモック機能
- [ ] 型チェック: `deno check tests/phase-b1/env-helper.ts`

### process2 Denopsブリッジレイヤー実装
#### sub2.1 VimBridge基本構造（TDD）
@target: `denops/hellshake-yano/phase-b1/vim-bridge.ts`
@ref: `autoload/hellshake_yano_vim/core.vim`, `autoload/hellshake_yano_vim/word_detector.vim`

**TDD Step 1: RED**
- [ ] テスト作成: `tests/phase-b1/vim-bridge.test.ts`
- [ ] 単語検出の一致テスト記述
- [ ] `deno test tests/phase-b1/vim-bridge.test.ts` (FAIL)

**TDD Step 2: GREEN**
- [ ] VimBridgeクラスの最小実装
- [ ] detectWords()メソッド実装
- [ ] 型チェック: `deno check denops/hellshake-yano/phase-b1/vim-bridge.ts`
- [ ] `deno test tests/phase-b1/vim-bridge.test.ts` (PASS)

**TDD Step 3: REFACTOR**
- [ ] detectWordsForVim()とdetectWordsForNeovim()に分離
- [ ] 環境判定ロジックの追加
- [ ] `deno fmt denops/hellshake-yano/phase-b1/`
- [ ] `deno lint denops/hellshake-yano/phase-b1/`

#### sub2.2 副作用チェック機構
@target: `denops/hellshake-yano/phase-b1/side-effect-checker.ts`
@ref: `ARCHITECTURE_B.md#副作用の分類と対処法`
- [ ] SideEffectCheckerクラス作成
- [ ] カーソル位置の保存・復元テスト
- [ ] グローバル変数の保存・復元テスト
- [ ] バッファ状態の保存・復元テスト
- [ ] 型チェック: `deno check denops/hellshake-yano/phase-b1/side-effect-checker.ts`
- [ ] テスト: `deno test tests/phase-b1/side-effect-checker.test.ts`

### process3 設定統合システム
#### sub3.1 ConfigUnifier実装（TDD）
@target: `denops/hellshake-yano/phase-b1/config-unifier.ts`
@ref: `autoload/hellshake_yano_vim/config.vim`, `denops/hellshake-yano/config.ts`

**TDD実装**
- [ ] テスト作成: `tests/phase-b1/config-unifier.test.ts`
- [ ] VimScript設定からTypeScript設定への変換テスト
- [ ] ConfigUnifierクラス実装
- [ ] CONFIG_MAPの定義（hint_chars → markers等）
- [ ] 型チェック: `deno check denops/hellshake-yano/phase-b1/config-unifier.ts`
- [ ] テスト: `deno test tests/phase-b1/config-unifier.test.ts`

#### sub3.2 自動マイグレーション機能
@target: `denops/hellshake-yano/phase-b1/config-migrator.ts`
- [ ] ConfigMigratorクラス作成
- [ ] 既存設定の検出ロジック
- [ ] 自動変換と警告表示
- [ ] マイグレーションテスト作成
- [ ] 型チェック: `deno check denops/hellshake-yano/phase-b1/config-migrator.ts`

### process4 統合表示システム（環境別分離）
#### sub4.1 UnifiedDisplay実装
@target: `denops/hellshake-yano/phase-b1/unified-display.ts`
@ref: `autoload/hellshake_yano_vim/display.vim`

**Vim環境専用処理**
- [ ] showHintsForVim()メソッド実装
- [ ] hideHintsForVim()メソッド実装
- [ ] popup_create()の完全再現

**Neovim環境専用処理**
- [ ] showHintsForNeovim()メソッド実装
- [ ] hideHintsForNeovim()メソッド実装
- [ ] nvim_buf_set_extmark()の完全再現

**テストと検証**
- [ ] 座標計算の一致テスト
- [ ] オプション値の一致テスト
- [ ] 型チェック: `deno check denops/hellshake-yano/phase-b1/unified-display.ts`
- [ ] テスト: `deno test tests/phase-b1/unified-display.test.ts`

### process5 統合エントリーポイント
@target: `plugin/hellshake-yano-unified.vim`
- [ ] 実装選択ロジック（Denops有無判定）
- [ ] 統合版の初期化処理
- [ ] Pure VimScript版へのフォールバック
- [ ] 設定マイグレーション呼び出し

### process10 ユニットテスト

#### sub10.1 互換性テストスイート
@target: `tests/phase-b1/compatibility-suite.test.ts`
- [ ] VimScript版との完全互換テスト
- [ ] 全機能の動作一致確認
- [ ] エッジケースの検証
- [ ] `deno test tests/phase-b1/compatibility-suite.test.ts`

#### sub10.2 パフォーマンステスト
@target: `tests/phase-b1/performance.test.ts`
- [ ] 1000単語の処理時間測定
- [ ] VimScript版との速度比較
- [ ] メモリ使用量の測定
- [ ] `deno test tests/phase-b1/performance.test.ts`

#### sub10.3 E2Eテスト
@target: `tests/phase-b1/e2e.test.ts`
- [ ] ヒント表示からジャンプまでの全フロー
- [ ] Vim環境での完全動作確認
- [ ] Neovim環境での完全動作確認
- [ ] `deno test tests/phase-b1/e2e.test.ts`

### process50 フォローアップ

#### sub50.1 型定義の完全性チェック
- [ ] 全ファイルの型チェック: `deno check denops/hellshake-yano/phase-b1/**/*.ts`
- [ ] strictモードでの検証
- [ ] 型エラーの修正

#### sub50.2 テストカバレッジ確認
- [ ] カバレッジ測定: `deno test --coverage=coverage tests/phase-b1/`
- [ ] カバレッジレポート生成: `deno coverage coverage/`
- [ ] 90%以上のカバレッジ達成確認
- [ ] 未カバー部分のテスト追加

### process100 リファクタリング

#### sub100.1 コード品質向上
- [ ] 重複コードの削除
- [ ] 関数の責務明確化
- [ ] エラーハンドリングの統一
- [ ] `deno fmt --check denops/hellshake-yano/phase-b1/`

#### sub100.2 パフォーマンス最適化
- [ ] キャッシュ戦略の見直し
- [ ] バッチ処理の活用
- [ ] 非同期処理の最適化

### process200 ドキュメンテーション

- [ ] ARCHITECTURE_B.mdのPhase B-1セクション更新
- [ ] README.mdへのPhase B-1機能説明追加
- [ ] 設定マイグレーションガイドの作成
- [ ] TypeDocコメントの追加
- [ ] CHANGELOG.mdへの変更記録

## CI/CD設定

### GitHub Actions
@target: `.github/workflows/phase-b1-test.yml`
- [ ] 自動型チェック
- [ ] 自動テスト実行
- [ ] カバレッジレポート
- [ ] リンターチェック

## 成功基準

1. **型安全性**: すべてのファイルが`deno check`をパス
2. **テスト合格率**: 100%のテストがパス
3. **VimScript互換**: VimScript版と100%同じ動作
4. **カバレッジ**: 90%以上のコードカバレッジ
5. **パフォーマンス**: VimScript版と同等以上の速度
6. **環境分離**: Vim/Neovim処理が完全に独立
7. **副作用管理**: 既存コードの副作用が適切に制御される

