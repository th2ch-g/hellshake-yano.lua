# title: Phase 4 - 統合レイヤーの構築（TDD方式）

## 概要
- Phase B-4の統合機能（環境判定、実装選択、コマンド/マッピング管理、初期化）を`integration/`レイヤーに移動
- `common/`レイヤーへの依存を更新
- TDD方式で各サブプロセスごとにRED→GREEN→REFACTOR→CHECKのサイクルを実施

### goal
- Phase B-4実装が`integration/`レイヤーに整理される
- `common/`レイヤーの型定義とユーティリティを活用する
- 既存テストが破壊されず、すべてパスする
- 型チェック100%パス、リンター警告0個、テストカバレッジ85%以上を達成

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDDサイクルの厳守**: 各サブプロセスで必ずRED→GREEN→REFACTOR→CHECKを実施
- **phase-b4実装を段階的に移行**: テストを維持しながら移動
- **各サブプロセス完了後に検証**: `deno test`と`deno check`を必ず実行

## 開発のゴール
- `integration/environment-detector.ts`を作成（phase-b4から移動）
- `integration/implementation-selector.ts`を作成（phase-b4から移動）
- `integration/command-registry.ts`を作成（phase-b4から移動）
- `integration/mapping-manager.ts`を作成（phase-b4から移動）
- `integration/initializer.ts`を作成（phase-b4から移動）
- 依存関係を`common/`レイヤーに更新
- phase-b4/から移動したファイルは削除せず維持（Phase 6で一括削除）
- 全テストパス、型チェック100%パス、カバレッジ85%以上を達成

## 実装仕様

### 前提条件
- Phase 1完了: `common/`レイヤーが構築済み
- Phase 3完了: `neovim/`レイヤーが構築済み
- Phase 2未完了: `vim/`レイヤーは未完了だが、Phase 4は独立して実施可能

### 移動対象ファイル

#### 環境判定・実装選択 (integration/へ移動)
- `denops/hellshake-yano/phase-b4/environment-detector.ts` → `integration/environment-detector.ts`
- `denops/hellshake-yano/phase-b4/implementation-selector.ts` → `integration/implementation-selector.ts`

#### コマンド・マッピング管理 (integration/へ移動)
- `denops/hellshake-yano/phase-b4/command-registry.ts` → `integration/command-registry.ts`
- `denops/hellshake-yano/phase-b4/mapping-manager.ts` → `integration/mapping-manager.ts`

#### 初期化システム (integration/へ移動)
- `denops/hellshake-yano/phase-b4/initializer.ts` → `integration/initializer.ts`

#### 移動しないファイル
- `phase-b4/config-migrator.ts` → Phase 2でvim/config/に移動予定（Phase 4では移動しない）
- `phase-b4/config-mapper.ts` → Phase 2でvim/config/に移動予定（Phase 4では移動しない）
- `phase-b4/common-base.ts` → Phase 1でcommon/utils/に統合済み（削除対象）
- `phase-b4/types.ts` → Phase 1でcommon/types/に統合済み（削除対象）

### 目標ディレクトリ構造

```
denops/hellshake-yano/
├── integration/                  # 統合レイヤー
│   ├── environment-detector.ts   # 🔧 phase-b4から移動
│   ├── implementation-selector.ts # 🔧 phase-b4から移動
│   ├── command-registry.ts       # 🔧 phase-b4から移動
│   ├── mapping-manager.ts        # 🔧 phase-b4から移動
│   └── initializer.ts            # 🔧 phase-b4から移動
│
└── tests/integration/            # 統合レイヤーのテスト
    ├── environment-detector.test.ts
    ├── implementation-selector.test.ts
    ├── command-registry.test.ts
    ├── mapping-manager.test.ts
    ├── initializer.test.ts
    ├── e2e.test.ts
    └── integration.test.ts
```

### 依存関係の更新方針

移動時に以下のインポートパスを更新：

```typescript
// 変更前（phase-b4）
import { handleError, logMessage, withFallback } from "./common-base.ts";
import type { EnvironmentDetails } from "./environment-detector.ts";

// 変更後（integration）
import { handleError } from "../common/utils/error-handler.ts";
import { logMessage } from "../common/utils/logger.ts";
import { withFallback } from "../common/utils/base.ts";
import type { EnvironmentDetails } from "./environment-detector.ts";
```

## 生成AIの学習用コンテキスト

### 移動元ファイル（phase-b4）
- `denops/hellshake-yano/phase-b4/environment-detector.ts`
  - Denops利用可能性とエディタ種別の判定
  - キャッシュ機能付き環境情報取得
- `denops/hellshake-yano/phase-b4/implementation-selector.ts`
  - 環境とユーザー設定に基づく実装選択ロジック
  - denops-unified vs vimscript-pure の選択
- `denops/hellshake-yano/phase-b4/command-registry.ts`
  - 統合版とVimScript版のコマンド登録
- `denops/hellshake-yano/phase-b4/mapping-manager.ts`
  - モーション検出とビジュアルモードのマッピング管理
- `denops/hellshake-yano/phase-b4/initializer.ts`
  - 環境判定→設定移行→実装選択→コマンド登録の初期化フロー

### 参考ドキュメント
- `ARCHITECTURE_C.md`
  - Phase 4: 統合レイヤーの構築の詳細仕様
  - 依存関係の更新方針
  - モジュール詳細設計

### Phase 1で構築済み
- `common/types/` - 型定義の一元管理
- `common/utils/error-handler.ts` - エラーハンドリング
- `common/utils/logger.ts` - ログ出力
- `common/utils/base.ts` - 共通ユーティリティ（withFallback等）
- `common/utils/validator.ts` - バリデーション

## Process

### process1: 事前調査とテスト準備（30分）

#### sub1: phase-b4ファイルの確認
@target: なし（調査のみ）
@ref:
- `denops/hellshake-yano/phase-b4/environment-detector.ts`
- `denops/hellshake-yano/phase-b4/implementation-selector.ts`
- `denops/hellshake-yano/phase-b4/command-registry.ts`
- `denops/hellshake-yano/phase-b4/mapping-manager.ts`
- `denops/hellshake-yano/phase-b4/initializer.ts`

- [x] 各ファイルのサイズと行数を確認
  ```bash
  wc -l denops/hellshake-yano/phase-b4/*.ts
  ```
- [x] 既存テストファイルの確認
  ```bash
  ls -la tests/phase-b4/*.test.ts
  ```
- [x] 各ファイルの主要なexportを確認
- [x] 依存関係を分析（どのファイルが何をインポートしているか）

#### sub2: 依存関係の詳細分析
@target: なし（調査のみ）

- [x] `environment-detector.ts`の依存を確認
  ```bash
  grep -E "^import.*from" denops/hellshake-yano/phase-b4/environment-detector.ts
  ```
- [x] `implementation-selector.ts`の依存を確認
- [x] `command-registry.ts`の依存を確認
- [x] `mapping-manager.ts`の依存を確認
- [x] `initializer.ts`の依存を確認
- [x] 依存マップを作成（どのファイルがcommon/への更新が必要か）

#### sub3: テスト戦略の確認
@target: なし（調査のみ）

- [x] 既存テストの実行状態を確認
  ```bash
  deno test tests/phase-b4/
  ```
- [x] テストカバレッジを確認
  ```bash
  deno test --coverage tests/phase-b4/
  deno coverage coverage/
  ```
- [x] 移動後のテストパス更新が必要な箇所をリストアップ

---

### process2: 環境判定モジュールの移動（TDD）（1時間）

#### sub1: RED - テスト移動とディレクトリ作成（15分）
@target:
- `denops/hellshake-yano/integration/`
- `tests/integration/`

- [x] ディレクトリ作成
  ```bash
  mkdir -p denops/hellshake-yano/integration
  mkdir -p tests/integration
  ```
- [x] テストファイルを移動
  ```bash
  mv tests/phase-b4/environment-detector.test.ts tests/integration/
  ```
- [x] テストのインポートパスを更新
  - `../../denops/hellshake-yano/phase-b4/` → `../../denops/hellshake-yano/integration/`
- [x] テスト実行（失敗確認）
  ```bash
  deno test tests/integration/environment-detector.test.ts
  ```

#### sub2: GREEN - environment-detector.tsの移動（30分）
@target: `denops/hellshake-yano/integration/environment-detector.ts`
@ref: `denops/hellshake-yano/phase-b4/environment-detector.ts`

- [x] `environment-detector.ts`を`integration/`にコピー
  ```bash
  cp denops/hellshake-yano/phase-b4/environment-detector.ts denops/hellshake-yano/integration/
  ```
- [x] インポートパスを更新
  - `./common-base.ts`の各関数を個別にインポート:
    - `handleError` → `../common/utils/error-handler.ts`
    - `logMessage` → `../common/utils/logger.ts`
    - `withFallback` → `../common/utils/base.ts`
- [x] 型チェック
  ```bash
  deno check denops/hellshake-yano/integration/environment-detector.ts
  ```
- [x] テスト実行
  ```bash
  deno test tests/integration/environment-detector.test.ts
  ```

#### sub3: REFACTOR - リファクタリング（10分）
@target: `denops/hellshake-yano/integration/environment-detector.ts`

- [x] 不要なコメントを削除（"Phase B-4" → "Integration Layer"に更新）
- [x] インポート文を整理（アルファベット順）
- [x] コードフォーマット
  ```bash
  deno fmt denops/hellshake-yano/integration/environment-detector.ts
  ```
- [x] リンター実行
  ```bash
  deno lint denops/hellshake-yano/integration/environment-detector.ts
  ```

#### sub4: CHECK - 検証（5分）
- [x] テスト実行
  ```bash
  deno test tests/integration/environment-detector.test.ts
  ```
- [x] 型チェック
  ```bash
  deno check denops/hellshake-yano/integration/environment-detector.ts
  ```
- [x] リンター
  ```bash
  deno lint denops/hellshake-yano/integration/environment-detector.ts
  ```

---

### process3: 実装選択モジュールの移動（TDD）（1時間）

#### sub1: RED - テスト移動（10分）
@target: `tests/integration/implementation-selector.test.ts`

- [x] テストファイルを移動
  ```bash
  mv tests/phase-b4/implementation-selector.test.ts tests/integration/
  ```
- [x] テストのインポートパスを更新
  - `phase-b4` → `integration`
  - `EnvironmentDetector`のパスも更新
- [x] テスト実行（失敗確認）
  ```bash
  deno test tests/integration/implementation-selector.test.ts
  ```

#### sub2: GREEN - implementation-selector.tsの移動（30分）
@target: `denops/hellshake-yano/integration/implementation-selector.ts`
@ref: `denops/hellshake-yano/phase-b4/implementation-selector.ts`

- [x] `implementation-selector.ts`を`integration/`にコピー
  ```bash
  cp denops/hellshake-yano/phase-b4/implementation-selector.ts denops/hellshake-yano/integration/
  ```
- [x] インポートパスを更新
  - `./environment-detector.ts` → `./environment-detector.ts`（同じディレクトリ、OK）
  - `./common-base.ts`の関数を個別にインポート:
    - `logMessage` → `../common/utils/logger.ts`
    - `validateInList` → `../common/utils/validator.ts`
- [x] 型チェック
  ```bash
  deno check denops/hellshake-yano/integration/implementation-selector.ts
  ```
- [x] テスト実行
  ```bash
  deno test tests/integration/implementation-selector.test.ts
  ```

#### sub3: REFACTOR - リファクタリング（15分）
@target: `denops/hellshake-yano/integration/implementation-selector.ts`

- [x] コメント更新
- [x] インポート整理
- [x] コードフォーマット
  ```bash
  deno fmt denops/hellshake-yano/integration/implementation-selector.ts
  ```
- [x] リンター実行
  ```bash
  deno lint denops/hellshake-yano/integration/implementation-selector.ts
  ```

#### sub4: CHECK - 検証（5分）
- [x] テスト実行
  ```bash
  deno test tests/integration/
  ```
- [x] 型チェック
  ```bash
  deno check denops/hellshake-yano/integration/**/*.ts
  ```

---

### process4: コマンド登録の移動（TDD）（45分）

#### sub1: RED - テスト移動（10分）
@target: `tests/integration/command-registry.test.ts`

- [x] テストファイルを移動
  ```bash
  mv tests/phase-b4/command-registry.test.ts tests/integration/
  ```
- [x] インポートパス更新
- [x] テスト実行（失敗確認）
  ```bash
  deno test tests/integration/command-registry.test.ts
  ```

#### sub2: GREEN - command-registry.tsの移動（20分）
@target: `denops/hellshake-yano/integration/command-registry.ts`
@ref: `denops/hellshake-yano/phase-b4/command-registry.ts`

- [x] `command-registry.ts`を`integration/`にコピー
  ```bash
  cp denops/hellshake-yano/phase-b4/command-registry.ts denops/hellshake-yano/integration/
  ```
- [x] 依存関係確認（Denops以外の依存が少ない可能性が高い）
- [x] 型チェック
  ```bash
  deno check denops/hellshake-yano/integration/command-registry.ts
  ```
- [x] テスト実行
  ```bash
  deno test tests/integration/command-registry.test.ts
  ```

#### sub3: REFACTOR & CHECK（15分）
- [x] コードフォーマット
  ```bash
  deno fmt denops/hellshake-yano/integration/command-registry.ts
  ```
- [x] リンター実行
  ```bash
  deno lint denops/hellshake-yano/integration/command-registry.ts
  ```
- [x] テスト・型チェック実行
  ```bash
  deno test tests/integration/
  deno check denops/hellshake-yano/integration/**/*.ts
  ```

---

### process5: マッピング管理の移動（TDD）（45分）

#### sub1: RED - テスト移動（10分）
@target: `tests/integration/mapping-manager.test.ts`

- [x] テストファイルを移動
  ```bash
  mv tests/phase-b4/mapping-manager.test.ts tests/integration/
  ```
- [x] インポートパス更新
- [x] テスト実行（失敗確認）
  ```bash
  deno test tests/integration/mapping-manager.test.ts
  ```

#### sub2: GREEN - mapping-manager.tsの移動（20分）
@target: `denops/hellshake-yano/integration/mapping-manager.ts`
@ref: `denops/hellshake-yano/phase-b4/mapping-manager.ts`

- [x] `mapping-manager.ts`を`integration/`にコピー
  ```bash
  cp denops/hellshake-yano/phase-b4/mapping-manager.ts denops/hellshake-yano/integration/
  ```
- [x] 型チェック
  ```bash
  deno check denops/hellshake-yano/integration/mapping-manager.ts
  ```
- [x] テスト実行
  ```bash
  deno test tests/integration/mapping-manager.test.ts
  ```

#### sub3: REFACTOR & CHECK（15分）
- [x] コードフォーマット・リンター実行
  ```bash
  deno fmt denops/hellshake-yano/integration/mapping-manager.ts
  deno lint denops/hellshake-yano/integration/mapping-manager.ts
  ```
- [x] テスト・型チェック実行
  ```bash
  deno test tests/integration/
  deno check denops/hellshake-yano/integration/**/*.ts
  ```

---

### process6: 初期化システムの移動（TDD）（1.5時間）

#### sub1: RED - テスト移動（10分）
@target: `tests/integration/initializer.test.ts`

- [x] テストファイルを移動
  ```bash
  mv tests/phase-b4/initializer.test.ts tests/integration/
  ```
- [x] インポートパス更新
  - 依存モジュール（EnvironmentDetector, ImplementationSelector, CommandRegistry等）のパスを更新
- [x] テスト実行（失敗確認）
  ```bash
  deno test tests/integration/initializer.test.ts
  ```

#### sub2: GREEN - initializer.tsの移動（40分）
@target: `denops/hellshake-yano/integration/initializer.ts`
@ref: `denops/hellshake-yano/phase-b4/initializer.ts`

- [x] `initializer.ts`を`integration/`にコピー
  ```bash
  cp denops/hellshake-yano/phase-b4/initializer.ts denops/hellshake-yano/integration/
  ```
- [x] インポートパスを更新
  - `./environment-detector.ts` → `./environment-detector.ts`（OK）
  - `./implementation-selector.ts` → `./implementation-selector.ts`（OK）
  - `./command-registry.ts` → `./command-registry.ts`（OK）
  - `./config-migrator.ts` → `../phase-b4/config-migrator.ts`（一時的な参照）
    - ⚠️ config-migrator.tsはPhase 2でvim/config/に移動予定
    - Phase 4では暫定的にphase-b4から参照
- [x] 型チェック
  ```bash
  deno check denops/hellshake-yano/integration/initializer.ts
  ```
- [x] テスト実行
  ```bash
  deno test tests/integration/initializer.test.ts
  ```

#### sub3: E2Eテストと統合テストの移動（20分）
@target:
- `tests/integration/e2e.test.ts`
- `tests/integration/integration.test.ts`

- [x] E2Eテストを移動
  ```bash
  mv tests/phase-b4/e2e.test.ts tests/integration/
  ```
- [x] 統合テストを移動
  ```bash
  mv tests/phase-b4/integration.test.ts tests/integration/
  ```
- [x] インポートパス更新
- [x] テスト実行
  ```bash
  deno test tests/integration/e2e.test.ts
  deno test tests/integration/integration.test.ts
  ```

#### sub4: REFACTOR & CHECK（20分）
- [x] コードフォーマット・リンター実行
  ```bash
  deno fmt denops/hellshake-yano/integration/
  deno lint denops/hellshake-yano/integration/
  ```
- [x] 全テスト実行
  ```bash
  deno test tests/integration/
  ```
- [x] 型チェック
  ```bash
  deno check denops/hellshake-yano/integration/**/*.ts
  ```

---

### process7: 最終検証とクリーンアップ（1時間）

#### sub1: 全体テスト実行（20分）
- [x] 全integrationテスト実行
  ```bash
  deno test tests/integration/
  ```
- [x] カバレッジ確認
  ```bash
  deno test --coverage tests/integration/
  deno coverage coverage/ --lcov > coverage-integration.lcov
  ```
- [x] カバレッジ85%以上を確認

#### sub2: 型チェックと静的解析（20分）
- [x] integration/配下の全ファイルの型チェック
  ```bash
  deno check denops/hellshake-yano/integration/**/*.ts
  ```
- [x] リンター実行
  ```bash
  deno lint denops/hellshake-yano/integration/
  ```
- [x] フォーマット確認
  ```bash
  deno fmt --check denops/hellshake-yano/integration/
  ```

#### sub3: 依存関係検証（20分）
- [x] integration/が依存しているモジュールをリストアップ
  ```bash
  grep -r "^import" denops/hellshake-yano/integration/ | grep -v "jsr:" | grep -v "@denops"
  ```
- [x] 循環依存がないことを確認
- [x] phase-b4への依存を確認（config-migrator.ts以外はないこと）
- [x] common/のみに依存していることを確認

---

### process10: ユニットテスト

各プロセスのREDフェーズとCHECKフェーズで実施済み。

#### 完了基準
- [x] すべてのテストがパス: `deno test tests/integration/`
- [x] テストカバレッジ85%以上: `deno coverage coverage/`

---

### process100: リファクタリング（30分）

#### sub1: コード最適化
@target: `denops/hellshake-yano/integration/**/*.ts`

- [x] 不要なコメントの削除
- [x] 命名規則の統一確認
- [x] 重複コードの確認（さらにcommon/に移動できるものがないか）
- [x] JSDocコメントの確認と更新

#### sub2: CHECK - 検証
- [x] リンター実行
  ```bash
  deno lint denops/hellshake-yano/integration/
  ```
- [x] 型チェック
  ```bash
  deno check denops/hellshake-yano/integration/**/*.ts
  ```
- [x] テスト実行
  ```bash
  deno test tests/integration/
  ```

---

### process200: ドキュメンテーション（30分）

#### sub1: PLAN.mdの更新
@target: `PLAN.md`

- [x] 全サブプロセスにチェックマークを付ける
- [x] 完了時刻を記録

#### sub2: ARCHITECTURE_C.mdの更新
@target: `ARCHITECTURE_C.md`

- [x] Phase 4完了状況を記録
- [x] 作成・更新したファイル一覧を追加
- [x] Phase 4完了基準の達成状況を記録
  ```markdown
  ### Phase 4 完了基準

  - [x] integration/ 配下に5ファイル作成完了
  - [x] tests/integration/ 配下に7テストファイル移動完了
  - [x] 全テストパス
  - [x] deno check 100%パス
  - [x] テストカバレッジ85%以上
  - [x] リンター警告0個
  ```

#### sub3: 完了レポート作成
@target: `ai/plan/phase-c4-integration-layer-completion_20251019.md`

- [x] Phase 4完了レポートを作成
  - 移動したファイル一覧
  - テスト結果
  - 既知の課題（config-migrator.tsの暫定的な参照）
  - Phase 5への引き継ぎ事項

---

## Phase 4 完了基準

### ファイル構成
- [x] `integration/environment-detector.ts` 作成完了
- [x] `integration/implementation-selector.ts` 作成完了
- [x] `integration/command-registry.ts` 作成完了
- [x] `integration/mapping-manager.ts` 作成完了
- [x] `integration/initializer.ts` 作成完了

### テスト
- [x] `tests/integration/environment-detector.test.ts` 移動・パス更新完了
- [x] `tests/integration/implementation-selector.test.ts` 移動・パス更新完了
- [x] `tests/integration/command-registry.test.ts` 移動・パス更新完了
- [x] `tests/integration/mapping-manager.test.ts` 移動・パス更新完了
- [x] `tests/integration/initializer.test.ts` 移動・パス更新完了
- [x] `tests/integration/e2e.test.ts` 移動・パス更新完了
- [x] `tests/integration/integration.test.ts` 移動・パス更新完了
- [x] 全テストパス（`deno test tests/integration/`）

### 品質指標
- [x] 型チェック100%パス（`deno check denops/hellshake-yano/integration/**/*.ts`）
- [x] リンター警告0個（`deno lint denops/hellshake-yano/integration/`）
- [x] テストカバレッジ85%以上（`deno coverage coverage/`）

### 依存関係
- [x] common/への依存のみ（config-migrator.ts以外のphase-b4への依存なし）
- [x] 循環依存なし

---

## 既知の課題と次フェーズへの引き継ぎ

### 課題1: config-migrator.tsの暫定的な参照
**問題**: initializer.ts が config-migrator.ts に依存しているが、config-migrator.ts はvim/config/に配置予定

**現状の対応**: Phase 4では `../phase-b4/config-migrator.ts` から一時的にインポート

**Phase 5での対応**:
- Phase 2完了後、config-migrator.tsがvim/config/に移動されたら、initializer.tsの参照を更新
- または、config-migrator.tsをcommon/config/に配置（両環境共通とする）

### Phase 5への引き継ぎ事項
- vim/レイヤーが完成したら、initializer.tsのvim初期化処理を実装
- main.tsでintegration/initializer.tsを呼び出すように更新
- config-migrator.tsの参照パスを正式なものに更新
