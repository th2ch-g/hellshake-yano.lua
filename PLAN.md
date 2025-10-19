# title: Process2 - ユーティリティの統合（Phase C-1）

## 概要
- Phase B-1～B-4で実装されたユーティリティ機能を`common/utils/`に統合
- `validation.ts`と`performance.ts`の機能を完全に統合
- `phase-b3/common-base.ts`と`phase-b4/common-base.ts`の差分を統合
- TDD方式で各サブプロセスごとにテスト→実装→検証のサイクルを実施

### goal
- 開発者が`common/utils/`を参照するだけで、すべてのユーティリティ機能にアクセスできる
- 重複コードが削減され、保守性が向上する
- 既存の`validation.ts`と`performance.ts`への依存が解消され、古いファイルを削除できる

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDDサイクルの厳守**: 各サブプロセスで必ずRED→GREEN→REFACTOR→CHECKを実施
- **既存ファイルを段階的に移行**: 依存関係を更新してから古いファイルを削除
- **各サブプロセス完了後に検証**: `deno test`と`deno check`を必ず実行

## 開発のゴール
- `validation.ts`の全機能を`common/utils/validator.ts`に統合
- `performance.ts`の全機能を`common/utils/performance.ts`に統合
- Phase B-3とPhase B-4の`common-base.ts`を`common/utils/base.ts`に完全統合
- 依存関係を更新し、古いファイル（`validation.ts`, `performance.ts`）を削除
- 全テストパス、型チェック100%パス、カバレッジ90%以上を達成

## 実装仕様

### 現状分析結果

#### 既存ファイルの状態
- ✅ `common/utils/`ディレクトリ作成済み（6ファイル）
- ✅ 基本的なテストファイル作成済み
- ❌ `validation.ts`が依然として存在（126行）
- ❌ `performance.ts`が依然として存在（61行）
- ❌ `phase-b{1,2,3,4}/common-base.ts`が依然として存在
- ❌ これらのファイルへの依存関係が残っている

#### 統合すべきファイル
1. `validation.ts` → `common/utils/validator.ts`（機能拡張統合）
2. `performance.ts` → `common/utils/performance.ts`（機能拡張統合）
3. `phase-b3/common-base.ts` + `phase-b4/common-base.ts` → `common/utils/base.ts`（完全統合）
4. `phase-b1/side-effect-checker.ts` → `common/utils/side-effect.ts`（確認のみ）

#### validation.tsの追加機能
- `validateConfig()`: Config型バリデーション
- `validateHighlightGroupName()`: ハイライトグループ名検証
- `isValidColorName()`: カラー名検証
- `isValidHexColor()`: Hex色検証
- `validateHighlightColor()`: ハイライト色検証
- `normalizeColorName()`: カラー名正規化
- `generateHighlightCommand()`: ハイライトコマンド生成
- `validateHighlightConfig()`: ハイライト設定検証

#### performance.tsの追加機能
- `detectWordsOptimized()`: 最適化された単語検出（キャッシュ付き）
- `generateHintsOptimized()`: 最適化されたヒント生成
- `generateHintsFromConfig()`: Config付きヒント生成
- `collectDebugInfo()`: デバッグ情報収集
- `clearDebugInfo()`: デバッグ情報クリア
- `clearCaches()`: キャッシュクリア
- `getWordsCache()`: 単語キャッシュ取得
- `getHintsCache()`: ヒントキャッシュ取得

#### Phase B-3とB-4のcommon-base.tsの差分
- Phase B-3版: `validateRange()`等がstring | null返却
- Phase B-4版: `ValidationResult`型返却、`withFallback()`関数追加
- 統合方針: Phase B-4版を基準とし、Phase B-3互換関数を`*Compat`として追加

### 目標ディレクトリ構造

```
denops/hellshake-yano/common/utils/
├── error-handler.ts    # ✅ 完成（既存）
├── logger.ts           # ✅ 完成（既存）
├── validator.ts        # 🔧 validation.ts統合（拡張）
├── base.ts             # 🔧 phase-b3/b4統合（拡張）
├── side-effect.ts      # ✅ 完成（既存）
└── performance.ts      # 🔧 既存performance.ts統合（拡張）

tests/common/utils/
├── error-handler.test.ts    # ✅ 完成
├── logger.test.ts           # ✅ 完成
├── validator.test.ts        # 🔧 拡張
├── base.test.ts             # 🔧 拡張
├── side-effect.test.ts      # ✅ 完成
└── performance.test.ts      # 🔧 拡張
```

### 削除予定ファイル
- `denops/hellshake-yano/validation.ts`
- `denops/hellshake-yano/performance.ts`

### 残るファイル（Phase 6で削除予定）
- `phase-b1/side-effect-checker.ts`
- `phase-b3/common-base.ts`
- `phase-b4/common-base.ts`

## 生成AIの学習用コンテキスト

### 参考ドキュメント
- `ARCHITECTURE_C.md`
  - Process2: ユーティリティの統合の詳細仕様
  - 統合方針とマッピング

### 既存実装（統合元）
- `denops/hellshake-yano/validation.ts`
  - ハイライト関連のバリデーション機能
- `denops/hellshake-yano/performance.ts`
  - パフォーマンス計測とキャッシュ機能
- `denops/hellshake-yano/phase-b3/common-base.ts`
  - エラーハンドリング、ログ、バリデーション（Phase B-3版）
- `denops/hellshake-yano/phase-b4/common-base.ts`
  - エラーハンドリング、ログ、バリデーション（Phase B-4版、withFallback追加）
- `denops/hellshake-yano/phase-b1/side-effect-checker.ts`
  - 副作用管理クラス

### 既存実装（統合先）
- `denops/hellshake-yano/common/utils/error-handler.ts`
  - 完成済み
- `denops/hellshake-yano/common/utils/logger.ts`
  - 完成済み
- `denops/hellshake-yano/common/utils/validator.ts`
  - 基本機能のみ実装済み（拡張が必要）
- `denops/hellshake-yano/common/utils/base.ts`
  - Phase B-4版実装済み（Phase B-3互換追加が必要）
- `denops/hellshake-yano/common/utils/side-effect.ts`
  - 完成済み
- `denops/hellshake-yano/common/utils/performance.ts`
  - 基本機能のみ実装済み（拡張が必要）

### 既存テスト
- `tests/phase-b4/common-base.test.ts`
  - ユーティリティ関数のテストケース（12ステップ）
- `tests/common/utils/validator.test.ts`
  - 基本的なバリデーションテスト
- `tests/common/utils/performance.test.ts`
  - 基本的なパフォーマンステスト

## Process

### process1: 既存ファイルの差分分析とテスト準備（20分）

#### sub1: validation.tsとcommon/utils/validator.tsの差分分析
@target: なし（調査のみ）
@ref:
- `denops/hellshake-yano/validation.ts`
- `denops/hellshake-yano/common/utils/validator.ts`

- [x] `validation.ts`の全機能をリストアップ
- [x] `common/utils/validator.ts`の現在の機能をリストアップ
- [x] 不足している機能を特定
- [x] 追加すべきテストケースをリストアップ

#### sub2: performance.tsとcommon/utils/performance.tsの差分分析
@target: なし（調査のみ）
@ref:
- `denops/hellshake-yano/performance.ts`
- `denops/hellshake-yano/common/utils/performance.ts`

- [x] `performance.ts`の全機能をリストアップ
- [x] `common/utils/performance.ts`の現在の機能をリストアップ
- [x] 不足している機能を特定（キャッシュ関連関数）
- [x] 追加すべきテストケースをリストアップ

#### sub3: phase-b3/common-base.tsとphase-b4/common-base.tsの差分分析
@target: なし（調査のみ）
@ref:
- `denops/hellshake-yano/phase-b3/common-base.ts`
- `denops/hellshake-yano/phase-b4/common-base.ts`
- `denops/hellshake-yano/common/utils/base.ts`

- [x] Phase B-3版とPhase B-4版の差分を特定
- [x] `common/utils/base.ts`に不足している機能を特定
- [x] 後方互換性のための`*Compat`関数の必要性を判断
- [x] 追加すべきテストケースをリストアップ

---

### process2: validator.tsの機能拡張（TDD）（30分）

#### sub1: RED - テスト作成（10分）
@target: `tests/common/utils/validator.test.ts`
@ref: `denops/hellshake-yano/validation.ts`

- [x] `validateHighlightGroupName()`のテスト作成
  - [x] 有効なグループ名（"MyGroup"）
  - [x] 数字開始を拒否（"1Invalid"）
  - [x] ハイフン・スペース含有を拒否
  - [x] 空文字列を拒否
- [x] `isValidColorName()`のテスト作成
  - [x] 有効なカラー名（"red", "blue"等）
  - [x] 無効なカラー名を拒否
- [x] `isValidHexColor()`のテスト作成
  - [x] 有効なHex色（"#FF0000", "#f00"）
  - [x] 無効なHex色を拒否（"FF0000", "#XYZ"）
- [x] `validateHighlightColor()`のテスト作成
  - [x] fg/bgの検証
- [x] `normalizeColorName()`のテスト作成
  - [x] 小文字→大文字先頭（"red" → "Red"）
  - [x] "none" → "None"
- [x] `generateHighlightCommand()`のテスト作成
  - [x] fg/bg指定のコマンド生成
  - [x] Hex色とカラー名の両対応
- [x] `validateHighlightConfig()`のテスト作成
  - [x] Config全体の検証
- [x] テスト実行: `deno test tests/common/utils/validator.test.ts`（失敗確認）

#### sub2: GREEN - 最小実装（15分）
@target: `denops/hellshake-yano/common/utils/validator.ts`
@ref: `denops/hellshake-yano/validation.ts`

- [x] `validation.ts`から以下の関数を移植
  - [x] `validateHighlightGroupName()`
  - [x] `isValidColorName()`
  - [x] `isValidHexColor()`
  - [x] `validateHighlightColor()`
  - [x] `normalizeColorName()`
  - [x] `generateHighlightCommand()`
  - [x] `validateHighlightConfig()`
- [x] 必要な型定義をインポート（`HighlightColor`等）
- [x] テスト実行: `deno test tests/common/utils/validator.test.ts`（成功確認）

#### sub3: REFACTOR - リファクタリング（5分）
@target: `denops/hellshake-yano/common/utils/validator.ts`

- [x] JSDocコメント追加
- [x] 関数の並び順整理（基本検証 → ハイライト検証）
- [x] 重複コードの削除
- [x] 型定義の整理

#### sub4: CHECK - 検証
- [x] `deno test tests/common/utils/validator.test.ts`（全テストパス）
- [x] `deno check denops/hellshake-yano/common/utils/validator.ts`（型チェック100%）

---

### process3: performance.tsの機能拡張（TDD）（30分）

#### sub1: RED - テスト作成（10分）
@target: `tests/common/utils/performance.test.ts`
@ref: `denops/hellshake-yano/performance.ts`

- [x] `detectWordsOptimized()`のテスト作成（Denopsモック必要）
  - [x] キャッシュミス時の動作
  - [x] キャッシュヒット時の動作
- [x] `generateHintsOptimized()`のテスト作成
  - [x] キャッシュミス時の動作
  - [x] キャッシュヒット時の動作
- [x] `generateHintsFromConfig()`のテスト作成
  - [x] Config付きヒント生成
- [x] `collectDebugInfo()`のテスト作成
  - [x] デバッグ情報の構造検証
- [x] `clearDebugInfo()`のテスト作成
- [x] `clearCaches()`のテスト作成
- [x] `getWordsCache()`のテスト作成
- [x] `getHintsCache()`のテスト作成
- [x] テスト実行: `deno test tests/common/utils/performance.test.ts`（失敗確認）

#### sub2: GREEN - 最小実装（15分）
@target: `denops/hellshake-yano/common/utils/performance.ts`
@ref: `denops/hellshake-yano/performance.ts`

- [x] `performance.ts`から以下を統合
  - [x] `wordsCache`, `hintsCache`の定義
  - [x] `detectWordsOptimized()`
  - [x] `generateHintsOptimized()`
  - [x] `generateHintsFromConfig()`
  - [x] `collectDebugInfo()`
  - [x] `clearDebugInfo()`
  - [x] `clearCaches()`
  - [x] `getWordsCache()`
  - [x] `getHintsCache()`
- [x] 必要な依存をインポート（`LRUCache`, `Word`, `Config`等）
- [x] テスト実行: `deno test tests/common/utils/performance.test.ts`（成功確認）

#### sub3: REFACTOR - リファクタリング（5分）
@target: `denops/hellshake-yano/common/utils/performance.ts`

- [x] インポートパスの整理
- [x] JSDocコメント追加
- [x] 関数の並び順整理（メトリクス → キャッシュ → デバッグ）

#### sub4: CHECK - 検証
- [x] `deno test tests/common/utils/performance.test.ts`（全テストパス）
- [x] `deno check denops/hellshake-yano/common/utils/performance.ts`（型チェック100%）

---

### process4: base.tsの完全統合（TDD）（30分）

#### sub1: RED - テスト作成（10分）
@target: `tests/common/utils/base.test.ts`
@ref:
- `denops/hellshake-yano/phase-b3/common-base.ts`
- `denops/hellshake-yano/phase-b4/common-base.ts`

- [x] Phase B-3版の`validateRange()`互換テスト
  - [x] エラー時にstring返却（`validateRangeCompat()`）
- [x] Phase B-3版の`validateNonEmpty()`互換テスト
  - [x] エラー時にstring返却（`validateNonEmptyCompat()`）
- [x] Phase B-3版の`validateInList()`互換テスト
  - [x] エラー時にstring返却（`validateInListCompat()`）
- [x] 既存の`withFallback()`テスト（Phase B-4版）
- [x] テスト実行: `deno test tests/common/utils/base.test.ts`（失敗確認）

#### sub2: GREEN - 最小実装（15分）
@target: `denops/hellshake-yano/common/utils/base.ts`
@ref: `denops/hellshake-yano/phase-b3/common-base.ts`

- [x] Phase B-3互換関数を追加
  - [x] `validateRangeCompat()`: string | null返却版
  - [x] `validateNonEmptyCompat()`: string | null返却版
  - [x] `validateInListCompat()`: string | null返却版
- [x] または、`validator.ts`に統合するか判断
- [x] テスト実行: `deno test tests/common/utils/base.test.ts`（成功確認）

#### sub3: REFACTOR - リファクタリング（5分）
@target: `denops/hellshake-yano/common/utils/base.ts`

- [x] 重複コードの削除
- [x] JSDocコメント追加（Deprecation警告）
- [x] Phase B-3互換関数に`@deprecated`アノテーション追加

#### sub4: CHECK - 検証
- [x] `deno test tests/common/utils/base.test.ts`（全テストパス）
- [x] `deno check denops/hellshake-yano/common/utils/base.ts`（型チェック100%）

---

### process5: side-effect.tsの確認（10分）

#### sub1: 既存実装の確認
@target: `denops/hellshake-yano/common/utils/side-effect.ts`
@ref: `denops/hellshake-yano/phase-b1/side-effect-checker.ts`

- [x] 両ファイルの差分確認（ほぼ同一のはず）
- [x] JSDocコメントの充実度確認
- [x] 必要に応じてドキュメント追加

#### sub2: CHECK - 検証
- [x] `deno test tests/common/utils/side-effect.test.ts`（全テストパス）
- [x] `deno check denops/hellshake-yano/common/utils/side-effect.ts`（型チェック100%）

---

### process6: 依存関係の更新と古いファイル削除（20分）

#### sub1: 依存関係の検索（5分）
@target: なし（調査のみ）

- [x] `validation.ts`への依存を検索
  ```bash
  grep -r "from.*validation.ts" denops/hellshake-yano/
  ```
- [x] `performance.ts`への依存を検索
  ```bash
  grep -r "from.*performance.ts" denops/hellshake-yano/
  ```
- [x] `phase-b*/common-base.ts`への依存を検索
  ```bash
  grep -r "from.*phase-b.*/common-base.ts" denops/hellshake-yano/
  ```
- [x] 依存ファイルのリストを作成

#### sub2: 依存関係の更新（10分）
@target: 依存しているすべてのファイル

- [x] すべてのインポートを置き換え
  - [x] `./validation.ts` → `./common/utils/validator.ts`
  - [x] `./performance.ts` → `./common/utils/performance.ts`
  - [x] `../phase-b3/common-base.ts` → `./common/utils/base.ts`
  - [x] `../phase-b4/common-base.ts` → `./common/utils/base.ts`
- [x] 相対パスの調整（ファイル位置に応じて）
- [x] 型チェック: `deno check denops/hellshake-yano/**/*.ts`

#### sub3: バックアップとコミット（2分）
@target: なし（Git操作）

- [x] 変更をコミット
  ```bash
  git add .
  git commit -m "feat(phase-c1): process2 完了前 - 依存関係更新"
  ```

#### sub4: 古いファイルの削除（3分）
@target: なし（ファイル削除）

- [x] `validation.ts`を削除
  ```bash
  rm denops/hellshake-yano/validation.ts
  ```
- [x] `performance.ts`を削除
  ```bash
  rm denops/hellshake-yano/performance.ts
  ```
- [x] ※phase-b*ファイルはPhase 6で削除するため残す

#### sub5: CHECK - 検証
- [x] 型チェック: `deno check denops/hellshake-yano/**/*.ts`（エラー0）
- [x] 全テスト: `deno test`（全テストパス）

---

### process10: ユニットテスト

各サブプロセスのRED（テスト作成）フェーズで実施済み。

#### 完了基準
- [x] すべてのテストがパス: `deno test tests/common/utils/`
- [x] テストカバレッジ90%以上: `deno coverage coverage/`

---

### process100: リファクタリング

各サブプロセスのREFACTORフェーズで実施済み。

#### 追加リファクタリング項目
- [x] インポートパスの最適化（相対パス → 絶対パス検討）
- [x] 型定義の再整理（必要に応じて）
- [x] コードの重複削除（validator.ts内）
- [x] 命名規則の統一

#### CHECK - 検証
- [x] `deno lint denops/hellshake-yano/common/utils/`（警告0個）
- [x] `deno check denops/hellshake-yano/common/utils/**/*.ts`（100%パス）
- [x] `deno test`（既存テスト含めて全テストパス）

---

### process200: ドキュメンテーション

#### sub1: PLAN.mdの更新
@target: `PLAN.md`

- [x] process2の全サブプロセスにチェックマークを付ける
- [x] 完了時刻を記録

#### sub2: ARCHITECTURE_C.mdの更新（オプション）
@target: `ARCHITECTURE_C.md`

- [ ] Process2完了状況を記録
- [ ] 作成・更新したファイル一覧を追加

---

## タイムライン

| Process | 作業内容 | 時間 | 累計 |
|---------|---------|------|------|
| process1 | 差分分析とテスト準備 | 20分 | 20分 |
| process2 | validator.ts拡張（TDD） | 30分 | 50分 |
| process3 | performance.ts統合（TDD） | 30分 | 80分 |
| process4 | base.ts完全統合（TDD） | 30分 | 110分 |
| process5 | side-effect.ts確認 | 10分 | 120分 |
| process6 | 依存更新・削除 | 20分 | 140分 |
| process100 | リファクタリング | - | 140分 |
| process200 | ドキュメンテーション | 10分 | 150分 |
| **合計** | | **150分** | **2.5時間** |

---

## リスク管理

### リスク1: 依存関係の破壊
- **確率**: 高
- **影響度**: 高
- **対策**: process6で段階的に更新し、各ステップで`deno check`を実行

### リスク2: テストカバレッジ不足
- **確率**: 中
- **影響度**: 中
- **対策**: TDDサイクルを厳密に守り、各機能にテストを作成

### リスク3: 後方互換性の喪失
- **確率**: 低
- **影響度**: 中
- **対策**: Phase B-3版の関数を`*Compat`として残す（必要に応じて）

---

## 完了基準

### 定量指標
- [x] `common/utils/validator.ts`が拡張され、validation.tsの全機能を含む（43テスト）
- [x] `common/utils/performance.ts`が拡張され、performance.tsの全機能を含む（11テスト）
- [x] `common/utils/base.ts`がPhase B-3/B-4の差分を統合（13テスト）
- [x] `validation.ts`, `performance.ts`が削除済み
- [x] 全テストパス（76テスト、100%）
- [x] `deno check denops/hellshake-yano/common/utils/`（100%パス）
- [x] `deno lint denops/hellshake-yano/common/utils/`（警告0個）
- [x] 依存関係が更新済み（display.ts, main.ts）

### 定性指標
- [x] すべての依存が`common/utils/`に向いている
- [x] 既存テストが破壊されていない（display.ts, main.tsの型チェック成功）
- [x] JSDocコメントが充実している
- [x] 型安全性が担保されている

## 実装完了日時
- Process1-6: 2025-10-19 実装完了
- コミット: 178eec0
