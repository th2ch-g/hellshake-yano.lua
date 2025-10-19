# title: Phase 6 - クリーンアップとテスト（TDD方式）

## 概要
- phase-b{1,2,3,4}/ディレクトリの完全削除（24ファイル、4,289行）
- tests/phase-b{1,2,3,4}/テストディレクトリの削除（39ファイル）
- テストディレクトリの再編成（機能別に整理）
- 型チェックエラー修正（5個のエラー解消）
- ドキュメント更新（ARCHITECTURE.md, README.md, CHANGELOG.md）
- TDD方式で各processごとにdeno testとdeno checkを実施

### goal
- Phase C統合完全完了
- phase-b*の完全削除による可読性向上
- テストカバレッジ90%以上維持
- 型チェック100%パス（エラー0個）
- 整理されたドキュメント

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **段階的削除**: 検証しながら安全に削除を実施
- **各サブプロセス完了後に検証**: `deno test`と`deno check`を必ず実行
- **カバレッジ維持**: 削除前後でテストカバレッジを比較
- **Git管理**: 各フェーズでコミットとタグ付けを実施

## 開発のゴール
- phase-b{1,2,3,4}/ディレクトリの完全削除（実装・テスト両方）
- 型チェックエラー0個達成（deno check 100%パス）
- テストディレクトリの機能別整理
- ドキュメント完全更新
- Phase C統合完了のGitタグ作成
- 次フェーズ（Phase D: Vim機能完成）への準備完了

## 実装仕様

### 前提条件
- ✅ Phase 1完了: common/レイヤー構築済み（14ファイル）
- ✅ Phase 2完了: vim/レイヤー構築済み（13ファイル）
- ✅ Phase 3完了: neovim/レイヤー構築済み（12ファイル）
- ✅ Phase 4完了: integration/レイヤー構築済み（5ファイル）
- ✅ Phase 5完了: main.ts環境判定型エントリーポイント実装完了

### 削除対象の確認

#### 実装ファイル削除対象（24ファイル、4,289行）
```
denops/hellshake-yano/phase-b1/ (5ファイル)
  - config-migrator.ts
  - config-unifier.ts
  - side-effect-checker.ts
  - unified-display.ts
  - vim-bridge.ts

denops/hellshake-yano/phase-b2/ (5ファイル)
  - unified-hint-generator.ts
  - unified-input.ts
  - unified-jump.ts
  - unified-word-detector.ts
  - vimscript-types.ts

denops/hellshake-yano/phase-b3/ (5ファイル)
  - common-base.ts
  - types.ts
  - unified-japanese-support.ts
  - unified-motion-detector.ts
  - unified-visual-mode.ts

denops/hellshake-yano/phase-b4/ (9ファイル)
  - command-registry.ts
  - common-base.ts
  - config-mapper.ts
  - config-migrator.ts
  - environment-detector.ts
  - implementation-selector.ts
  - initializer.ts
  - mapping-manager.ts
  - types.ts
```

#### テストファイル削除対象（39ファイル）
```
tests/phase-b1/ (11ファイル)
tests/phase-b2/ (6ファイル)
tests/phase-b3/ (5ファイル)
tests/phase-b4/ (12ファイル)
```

#### 移行済み新レイヤー構造
```
denops/hellshake-yano/
  ├── vim/          (13ファイル) - Phase B実装統合済み
  ├── neovim/       (12ファイル) - 既存実装整理済み
  ├── common/       (14ファイル) - 共通処理統合済み
  └── integration/  (5ファイル)  - 環境判定統合済み

tests/
  ├── vim/          - Vimレイヤーテスト
  ├── neovim/       - Neovimレイヤーテスト
  ├── common/       - 共通レイヤーテスト
  └── integration/  - 統合レイヤーテスト
```

### 型チェックエラー（修正対象）

現在5個のエラー（common/utils/error-handler.test.ts）:
- エラー詳細は削除前検証時に確認
- 修正方針: 型定義の明確化、インポート修正

### ドキュメント更新対象

1. **ARCHITECTURE.md**
   - Phase C完了状況の記載
   - 新ディレクトリ構造図の更新
   - phase-b*削除の記録

2. **README.md**
   - インストール手順の確認
   - 使用方法の確認（変更なし想定）

3. **CHANGELOG.md**
   - Phase C統合完了の記録
   - 主要な変更点の記載

## 生成AIの学習用コンテキスト

### 削除対象ディレクトリ
- `denops/hellshake-yano/phase-b1/` - Phase B-1実装（統合基盤構築）
- `denops/hellshake-yano/phase-b2/` - Phase B-2実装（コア機能移植）
- `denops/hellshake-yano/phase-b3/` - Phase B-3実装（高度機能統合）
- `denops/hellshake-yano/phase-b4/` - Phase B-4実装（統合エントリーポイント）
- `tests/phase-b1/` - Phase B-1テスト
- `tests/phase-b2/` - Phase B-2テスト
- `tests/phase-b3/` - Phase B-3テスト
- `tests/phase-b4/` - Phase B-4テスト

### 移行完了レイヤー
- `denops/hellshake-yano/vim/` - Vim専用実装レイヤー（Phase B統合済み）
- `denops/hellshake-yano/neovim/` - Neovim専用実装レイヤー
- `denops/hellshake-yano/common/` - 共通処理レイヤー
- `denops/hellshake-yano/integration/` - 環境判定・統合レイヤー
- `tests/{vim,neovim,common,integration}/` - 新テスト構造

### 参照ドキュメント
- `ARCHITECTURE_C.md` - Phase C統合計画書
- `ai/plan/phase-c1_20251019_114520.md` - Phase C-1完了レポート
- `ai/plan/phase-c2-vim-layer-completion_20251019.md` - Phase C-2完了レポート
- `ai/plan/phase-c3-neovim-layer_20251019.md` - Phase C-3完了レポート
- `ai/plan/phase-c4-integration-layer-completion_20251019.md` - Phase C-4完了レポート
- `ai/plan/phase-c5-main-integration_20251019.md` - Phase C-5完了レポート

## Process

### process1: 削除前検証（1時間）

#### sub1: ファイル差分分析（20分）
@target: なし（調査のみ）
@ref: `denops/hellshake-yano/phase-b*/`, `denops/hellshake-yano/{vim,neovim,common,integration}/`

- [ ] phase-b1/と新レイヤーの差分確認
  ```bash
  for file in vim-bridge config-unifier config-migrator side-effect-checker unified-display; do
    echo "=== $file ==="
    diff -q denops/hellshake-yano/phase-b1/$file.ts 対応する新レイヤーファイル
  done
  ```
- [ ] phase-b2/と新レイヤーの差分確認
- [ ] phase-b3/と新レイヤーの差分確認
- [ ] phase-b4/と新レイヤーの差分確認
- [ ] 差分がある場合は内容を確認し、新レイヤーに反映されているか検証
- [ ] 検証レポート作成: `ai/plan/phase-c6-pre-deletion-report_YYYYMMDD.md`

#### sub2: インポート依存関係確認（15分）
@target: なし（調査のみ）

- [ ] phase-b*への参照が新レイヤーに残っていないか確認
  ```bash
  grep -r "from.*phase-b" denops/hellshake-yano/{vim,neovim,common,integration}/ || echo "OK"
  grep -r "import.*phase-b" denops/hellshake-yano/{vim,neovim,common,integration}/ || echo "OK"
  ```
- [ ] main.tsからのphase-b*参照確認
  ```bash
  grep -r "phase-b" denops/hellshake-yano/main.ts || echo "OK"
  ```
- [ ] 新テストからのphase-b*参照確認
  ```bash
  grep -r "phase-b" tests/{vim,neovim,common,integration}/ || echo "OK"
  ```

#### sub3: 削除前ベースラインテスト（25分）
@target: なし（検証のみ）

- [ ] 全テスト実行とログ保存
  ```bash
  deno test --coverage --no-check > ai/plan/phase6-baseline-test.log 2>&1
  ```
- [ ] カバレッジレポート生成
  ```bash
  deno coverage coverage/ --lcov > ai/plan/phase6-baseline-coverage.lcov
  ```
- [ ] 型チェックログ保存
  ```bash
  deno check denops/**/*.ts > ai/plan/phase6-baseline-typecheck.log 2>&1
  ```
- [ ] テストファイル数カウント
  ```bash
  find tests -name "*.test.ts" | wc -l > ai/plan/phase6-baseline-testcount.txt
  ```

---

### process2: 型チェックエラー修正（1時間）

#### sub1: エラー詳細分析（20分）
@target: なし（調査のみ）

- [ ] 型エラー一覧取得
  ```bash
  deno check denops/**/*.ts 2>&1 | tee ai/plan/phase6-type-errors-detail.log
  ```
- [ ] エラー箇所の特定
  - common/utils/error-handler.test.ts の型エラー（5個）
  - 関連ファイルの確認
- [ ] 修正方針の決定
  - 型定義の明確化
  - インポート文の修正
  - テストコードの型アノテーション追加

#### sub2: エラー修正実装（30分）
@target: `tests/common/utils/error-handler.test.ts`, 関連型定義ファイル

- [ ] error-handler.test.ts の型エラー修正
  - 型アノテーションの追加
  - インポート文の修正
- [ ] 関連する型定義ファイルの修正（必要に応じて）
- [ ] 段階的な型チェック実行
  ```bash
  deno check tests/common/utils/error-handler.test.ts
  ```

#### sub3: 検証（10分）
@target: なし（検証のみ）

- [ ] 全体の型チェック実行
  ```bash
  deno check denops/**/*.ts  # 期待: 0 errors
  ```
- [ ] テスト実行（型エラー修正の影響確認）
  ```bash
  deno test tests/common/utils/error-handler.test.ts
  ```

---

### process3: phase-b*ディレクトリ削除（30分）

#### sub1: 実装ディレクトリ削除（10分）
@target: `denops/hellshake-yano/phase-b{1,2,3,4}/`

- [ ] phase-b1削除
  ```bash
  rm -rf denops/hellshake-yano/phase-b1
  ```
- [ ] phase-b2削除
  ```bash
  rm -rf denops/hellshake-yano/phase-b2
  ```
- [ ] phase-b3削除
  ```bash
  rm -rf denops/hellshake-yano/phase-b3
  ```
- [ ] phase-b4削除
  ```bash
  rm -rf denops/hellshake-yano/phase-b4
  ```

#### sub2: テストディレクトリ削除（5分）
@target: `tests/phase-b{1,2,3,4}/`

- [ ] テストディレクトリ削除
  ```bash
  rm -rf tests/phase-b1 tests/phase-b2 tests/phase-b3 tests/phase-b4
  ```

#### sub3: 削除後検証（15分）
@target: なし（検証のみ）

- [ ] 残骸確認
  ```bash
  find . -name "*phase-b*" | grep -v ai/plan || echo "完全削除OK"
  ```
- [ ] 型チェック実行
  ```bash
  deno check denops/**/*.ts  # 期待: phase-b*関連のエラーなし
  ```
- [ ] テスト実行
  ```bash
  deno test --no-check  # 期待: phase-b*テスト以外は全パス
  ```
- [ ] ファイル数確認
  ```bash
  find denops/hellshake-yano/{vim,neovim,common,integration} -name "*.ts" | wc -l  # 期待: 44ファイル
  ```

---

### process4: テストディレクトリ再編成（2時間）

#### sub1: テストファイル分類計画（30分）
@target: なし（調査と計画）

- [ ] tests/直下のテストファイル一覧取得
  ```bash
  ls tests/*.test.ts > ai/plan/phase6-test-files-list.txt
  ```
- [ ] 各テストファイルの分類決定
  - core_test.ts → tests/neovim/core/
  - config_test.ts → tests/common/
  - display_test.ts → tests/neovim/display/
  - 等々、約120ファイルを分類
- [ ] 分類マッピング表作成: `ai/plan/phase6-test-reorganization-map.md`

#### sub2: テストファイル移動（1時間）
@target: `tests/` 配下のテストファイル

- [ ] 5ファイルずつ移動・検証のサイクル実施
  ```bash
  # 例: coreテスト移動
  mv tests/core_test.ts tests/neovim/core/
  deno test tests/neovim/core/core_test.ts  # 個別検証
  ```
- [ ] カバレッジ維持確認（10ファイル移動ごと）
  ```bash
  deno test --coverage
  deno coverage coverage/ --lcov > /tmp/current-coverage.lcov
  diff ai/plan/phase6-baseline-coverage.lcov /tmp/current-coverage.lcov
  ```
- [ ] 移動進捗記録（PLAN.mdのチェックボックス更新）

#### sub3: 最終検証（30分）
@target: なし（検証のみ）

- [ ] 全テスト実行
  ```bash
  deno test --coverage
  ```
- [ ] カバレッジ比較
  ```bash
  deno coverage coverage/ --lcov > ai/plan/phase6-after-reorganize-coverage.lcov
  diff ai/plan/phase6-baseline-coverage.lcov ai/plan/phase6-after-reorganize-coverage.lcov
  ```
- [ ] カバレッジ90%以上維持確認
- [ ] tests/直下の整理状況確認
  ```bash
  ls tests/*.test.ts | wc -l  # 期待: 大幅減少
  ```

---

### process5: 旧coreディレクトリの検討と削除（30分）

#### sub1: coreディレクトリ内容確認（15分）
@target: `denops/hellshake-yano/core/`

- [ ] coreディレクトリのファイル確認
  ```bash
  ls -la denops/hellshake-yano/core/
  ```
- [ ] 各ファイルの内容確認
  - core-motion.ts: 新レイヤーに統合済みか？
  - core-validation.ts: 新レイヤーに統合済みか？
- [ ] 新レイヤーへの統合状況確認

#### sub2: coreディレクトリ削除（10分）
@target: `denops/hellshake-yano/core/`

- [ ] 統合済みの場合、削除実施
  ```bash
  rm -rf denops/hellshake-yano/core/
  ```
- [ ] 型チェックとテスト実行
  ```bash
  deno check denops/**/*.ts
  deno test
  ```

#### sub3: 検証（5分）
@target: なし（検証のみ）

- [ ] ディレクトリ構造確認
  ```bash
  ls -la denops/hellshake-yano/
  # 期待: vim/, neovim/, common/, integration/, main.tsのみ
  ```

---

### process6: ドキュメント更新（1時間30分）

#### sub1: ARCHITECTURE.md更新（40分）
@target: `ARCHITECTURE.md`

- [ ] Phase C完了状況セクション追加
  ```markdown
  ## Phase C完了状況（2025-10-19）

  Phase C（コードベース統合）の6フェーズすべてが完了しました。

  ### 完了サマリー
  - Phase C-1: 共通レイヤー構築（14ファイル）✅
  - Phase C-2: Vimレイヤー構築（13ファイル）✅
  - Phase C-3: Neovimレイヤー構築（12ファイル）✅
  - Phase C-4: 統合レイヤー構築（5ファイル）✅
  - Phase C-5: メインエントリーポイント統合（環境判定）✅
  - Phase C-6: クリーンアップとテスト（phase-b*削除）✅
  ```
- [ ] 新ディレクトリ構造図の更新
- [ ] phase-b*削除の記録
- [ ] Phase D展望の追記

#### sub2: CHANGELOG.md更新（30分）
@target: `CHANGELOG.md`

- [ ] Phase C統合の記録追加
  ```markdown
  ## [Unreleased] - 2025-10-19

  ### Added
  - 環境別レイヤー構造（vim/, neovim/, common/, integration/）による新アーキテクチャ
  - main.ts環境判定型エントリーポイント実装
  - 統合初期化フロー（Initializer経由）

  ### Changed
  - コードベース再編成: phase-b{1,2,3,4}/を環境別レイヤーに統合
  - テストディレクトリ再編成: 機能別に整理

  ### Removed
  - phase-b{1,2,3,4}/ディレクトリ削除（24ファイル、4,289行）
  - tests/phase-b{1,2,3,4}/テストディレクトリ削除（39ファイル）
  - 旧coreディレクトリ削除（2ファイル）

  ### Fixed
  - 型チェックエラー修正（5個のエラー解消）
  ```

#### sub3: README.md確認と更新（20分）
@target: `README.md`

- [ ] インストール手順の確認（変更なし想定）
- [ ] 使用方法の確認（変更なし想定）
- [ ] 必要に応じて新ディレクトリ構造の説明を追記

---

### process7: 最終検証とGit管理（1時間）

#### sub1: 全品質チェック（30分）
@target: なし（検証のみ）

- [ ] 全テスト実行
  ```bash
  deno test --coverage
  # 期待: 全テストパス（phase-b*テスト除外後）
  ```
- [ ] 型チェック100%確認
  ```bash
  deno check denops/**/*.ts
  # 期待: 0 errors
  ```
- [ ] Lint実行
  ```bash
  deno lint denops/hellshake-yano/
  # 警告の確認と記録
  ```
- [ ] フォーマットチェック
  ```bash
  deno fmt --check
  ```

#### sub2: 定量指標確認（15分）
@target: なし（検証のみ）

- [ ] ファイル数確認
  ```bash
  find denops/hellshake-yano/vim -name "*.ts" | wc -l       # 期待: 13
  find denops/hellshake-yano/neovim -name "*.ts" | wc -l    # 期待: 12
  find denops/hellshake-yano/common -name "*.ts" | wc -l    # 期待: 14
  find denops/hellshake-yano/integration -name "*.ts" | wc -l  # 期待: 5
  ```
- [ ] phase-b*完全削除確認
  ```bash
  find . -name "*phase-b*" | grep -v ai/plan | wc -l  # 期待: 0
  ```
- [ ] テストカバレッジ90%以上確認
- [ ] 定量指標レポート作成: `ai/plan/phase-c6-completion-metrics.md`

#### sub3: Git コミットとタグ付け（15分）
@target: Git repository

- [ ] 変更内容確認
  ```bash
  git status
  git diff --stat
  ```
- [ ] ステージングとコミット
  ```bash
  git add .
  git commit -m "feat(phase-c): Phase C統合完了 - 環境別レイヤー構造に再編成

  - phase-b{1,2,3,4}/ディレクトリ削除（24ファイル、4,289行）
  - tests/phase-b{1,2,3,4}/削除（39ファイル）
  - 型チェックエラー修正（5個解消）
  - テストディレクトリ再編成（機能別整理）
  - ドキュメント更新（ARCHITECTURE.md, CHANGELOG.md, README.md）
  "
  ```
- [ ] タグ作成
  ```bash
  git tag -a phase-c-integration-complete -m "Phase C統合完了: 環境別レイヤー構造"
  ```

---

### process10: ユニットテスト
process2～process5で段階的に実施済み（削除後検証として）

---

### process50: フォローアップ
現時点でフォローアップ事項なし

---

### process100: リファクタリング
Phase C統合により大規模リファクタリング完了

---

### process200: ドキュメンテーション
process6で実施済み

---

### process300: 完了レポート作成（30分）

#### sub1: Phase C-6完了レポート作成（30分）
@target: `ai/plan/phase-c6-cleanup-completion_YYYYMMDD.md`

- [ ] 完了レポート作成
  - phase-b*削除の詳細
  - 型エラー修正内容
  - テスト再編成結果
  - カバレッジ比較
  - Phase Cの総括
  - Phase Dへの引き継ぎ事項
- [ ] Phase C全体の振り返り
  - Phase C-1～C-6の成果
  - 定量的改善指標
  - 技術的知見

---

## 完了基準

### Phase 6完了基準

- [ ] **削除完了**
  - [ ] phase-b{1,2,3,4}/ディレクトリ完全削除
  - [ ] tests/phase-b{1,2,3,4}/ディレクトリ完全削除
  - [ ] denops/hellshake-yano/core/ディレクトリ削除（統合済みの場合）

- [ ] **テスト品質**
  - [ ] 全テストパス（phase-b*テスト除外後）
  - [ ] カバレッジ90%以上維持
  - [ ] テストディレクトリが機能別に整理済み

- [ ] **コード品質**
  - [ ] deno check 100%パス（型エラー0個）
  - [ ] deno lint 警告最小化
  - [ ] 新レイヤー構造のみ残存

- [ ] **ドキュメント**
  - [ ] ARCHITECTURE.md更新完了
  - [ ] README.md確認・更新完了
  - [ ] CHANGELOG.md追加完了

- [ ] **Git管理**
  - [ ] コミット完了
  - [ ] タグ付け完了（phase-c-integration-complete）

### Phase C全体完了基準

- [ ] **Phase C-1～C-6すべて完了**
- [ ] **環境別レイヤー構造確立**
  - vim/: 13ファイル
  - neovim/: 12ファイル
  - common/: 14ファイル
  - integration/: 5ファイル
- [ ] **main.ts環境判定型エントリーポイント動作確認**
- [ ] **全品質指標達成**
  - テストカバレッジ90%以上
  - 型チェック100%パス
  - Lint警告最小化

---

## リスクと対策

### リスク1: phase-b*削除後のテスト失敗
- **確率**: 低（新レイヤーへの移行完了済み）
- **影響度**: 高
- **対策**: process1でベースラインテスト取得、差分で検証

### リスク2: 型エラー修正の影響範囲
- **確率**: 中
- **影響度**: 中
- **対策**: error-handler.test.tsのみの修正想定、段階的検証

### リスク3: テスト再編成時のテスト漏れ
- **確率**: 中
- **影響度**: 中
- **対策**: カバレッジ差分で検出、5ファイルずつ移動して検証

### リスク4: ドキュメント記載漏れ
- **確率**: 低
- **影響度**: 低
- **対策**: ARCHITECTURE_C.mdを参照して網羅的に記載

---

## 推定時間: 8時間（1日）

- process1: 削除前検証（1時間）
- process2: 型チェックエラー修正（1時間）
- process3: phase-b*削除（30分）
- process4: テスト再編成（2時間）
- process5: 旧coreディレクトリ削除（30分）
- process6: ドキュメント更新（1時間30分）
- process7: 最終検証とGit管理（1時間）
- process300: 完了レポート作成（30分）

---

## 次のステップ（Phase D展望）

### Phase D: Vim機能の完成（将来計画）

Phase C完了により、以下の準備が整いました：

1. **Vimレイヤーの完全実装**
   - initializeVimLayer()の完全実装
   - vim/レイヤーの全コンポーネント動作確認
   - 実環境（Vim）での動作確認

2. **Neovim機能のVim移植**
   - TinySegmenter日本語対応のVim実装
   - パフォーマンス最適化技術の適用
   - 高度な表示機能の実装

3. **最終統合（Phase E）への準備**
   - vim/とneovim/の共通処理抽出
   - 完全な環境透過性の実現
