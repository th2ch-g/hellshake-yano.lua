# title: Phase 3 - Neovimレイヤーの構築

## 概要
- 既存のメインコードベース（Neovim専用実装）を`neovim/`レイヤーに移動
- `common/`レイヤーへの依存を更新
- TDD方式で各サブプロセスごとにテスト→実装→検証のサイクルを実施

### goal
- 既存のNeovim実装が`neovim/`レイヤーに整理される
- `common/`レイヤーの型定義とユーティリティを活用する
- 既存テストが破壊されず、すべてパスする
- 型チェック100%パス、リンター警告0個を達成

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDDサイクルの厳守**: 各サブプロセスで必ずRED→GREEN→REFACTOR→CHECKを実施
- **既存実装を段階的に移行**: テストを維持しながら移動
- **各サブプロセス完了後に検証**: `deno test`と`deno check`を必ず実行

## 開発のゴール
- `neovim/core/core.ts`, `word.ts`, `hint.ts`を作成（既存実装を移動）
- `neovim/display/extmark-display.ts`, `highlight.ts`を作成
- `neovim/dictionary.ts`を作成
- 依存関係を`common/`レイヤーに更新
- 既存ファイル（`core.ts`, `word.ts`, `hint.ts`, `display.ts`, `dictionary.ts`）を削除
- 全テストパス、型チェック100%パス、カバレッジ90%以上を達成

## 実装仕様

### 前提条件
- Phase 1完了: `common/`レイヤーが構築済み
- Phase 2完了: `vim/`レイヤーが構築済み
- Process2（Phase C-1）完了: `validation.ts`, `performance.ts`削除済み、`common/utils/`に統合済み

### 移動対象ファイル

#### コア機能 (neovim/core/へ移動)
- `denops/hellshake-yano/core.ts` → `neovim/core/core.ts`
- `denops/hellshake-yano/word.ts` → `neovim/core/word.ts`
- `denops/hellshake-yano/hint.ts` → `neovim/core/hint.ts`

#### 表示システム (neovim/display/へ移動)
- `denops/hellshake-yano/display.ts` → `neovim/display/extmark-display.ts`

#### 辞書管理 (neovim/へ移動)
- `denops/hellshake-yano/dictionary.ts` → `neovim/dictionary.ts`

### 目標ディレクトリ構造

```
denops/hellshake-yano/
├── neovim/                       # Neovim専用実装レイヤー
│   ├── core/                     # コア機能
│   │   ├── core.ts               # 🔧 既存core.ts移動
│   │   ├── word.ts               # 🔧 既存word.ts移動
│   │   └── hint.ts               # 🔧 既存hint.ts移動
│   ├── display/                  # 表示システム
│   │   ├── extmark-display.ts   # 🔧 既存display.ts移動
│   │   └── highlight.ts          # 🔧 新規作成（表示関連機能の抽出）
│   └── dictionary.ts             # 🔧 既存dictionary.ts移動
│
└── main.ts                       # Phase 5で書き換え予定（Phase 3では移動しない）
```

### 依存関係の更新方針

移動時に以下のインポートパスを更新：

```typescript
// 変更前
import type { Config } from "./config.ts";
import type { Word } from "./types.ts";
import { UnifiedCache } from "./cache.ts";

// 変更後
import type { Config } from "../../common/config.ts";
import type { Word } from "../../common/types/word.ts";
import { UnifiedCache } from "../../common/cache/unified-cache.ts";
```

## 生成AIの学習用コンテキスト

### 既存実装（移動元）
- `denops/hellshake-yano/core.ts`
  - Neovim専用のコア機能
- `denops/hellshake-yano/word.ts`
  - TinySegmenterによる日本語対応の単語検出
- `denops/hellshake-yano/hint.ts`
  - ヒント生成ロジック
- `denops/hellshake-yano/display.ts`
  - extmarkベースの表示システム
- `denops/hellshake-yano/dictionary.ts`
  - 辞書管理機能

### 参考ドキュメント
- `ARCHITECTURE_C.md`
  - Phase 3: Neovimレイヤーの構築の詳細仕様
  - 依存関係の更新方針

### Phase 1で構築済み（想定）
- `common/types/` - 型定義の一元管理
- `common/utils/` - ユーティリティ関数
- `common/cache/` - キャッシュシステム
- `common/config.ts` - 設定管理

## Process

### process1: 既存ファイルの分析とテスト準備（30分）

#### sub1: 既存ファイルとテストの確認
@target: なし（調査のみ）
@ref:
- `denops/hellshake-yano/core.ts`
- `denops/hellshake-yano/word.ts`
- `denops/hellshake-yano/hint.ts`
- `denops/hellshake-yano/display.ts`
- `denops/hellshake-yano/dictionary.ts`

- [ ] 各ファイルのサイズと行数を確認
  ```bash
  wc -l denops/hellshake-yano/{core,word,hint,display,dictionary}.ts
  ```
- [ ] 既存テストファイルの場所を確認
  ```bash
  find tests -name "*core*.test.ts" -o -name "*word*.test.ts" -o -name "*hint*.test.ts" -o -name "*display*.test.ts" -o -name "*dictionary*.test.ts"
  ```
- [ ] 各ファイルの主要なexportを確認
- [ ] 依存関係を分析（どのファイルが何をインポートしているか）

#### sub2: 依存関係の詳細分析
@target: なし（調査のみ）

- [ ] `core.ts`の依存を確認
  ```bash
  grep -E "^import.*from" denops/hellshake-yano/core.ts | head -20
  ```
- [ ] `word.ts`の依存を確認
- [ ] `hint.ts`の依存を確認
- [ ] `display.ts`の依存を確認
- [ ] `dictionary.ts`の依存を確認
- [ ] 依存マップを作成（どのファイルがcommon/への更新が必要か）

#### sub3: テスト戦略の確認
@target: なし（調査のみ）

- [ ] 既存テストの実行状態を確認
  ```bash
  deno test --filter "core|word|hint|display|dictionary"
  ```
- [ ] テストカバレッジを確認
  ```bash
  deno test --coverage=coverage
  deno coverage coverage/
  ```
- [ ] 移動後のテストパス更新が必要な箇所をリストアップ

---

### process2: neovim/core/の構築（TDD）（2時間）

#### sub1: RED - テスト準備とディレクトリ作成（15分）
@target:
- `denops/hellshake-yano/neovim/core/`
- `tests/neovim/core/`

- [ ] ディレクトリ作成
  ```bash
  mkdir -p denops/hellshake-yano/neovim/core
  mkdir -p tests/neovim/core
  ```
- [ ] 既存テストを新しい場所にコピー（移動ではなくコピー）
- [ ] テストのインポートパスを更新（neovim/core/を参照するように）
- [ ] テスト実行（失敗確認）
  ```bash
  deno test tests/neovim/core/
  ```

#### sub2: GREEN - core.tsの移動と最小実装（30分）
@target: `denops/hellshake-yano/neovim/core/core.ts`
@ref: `denops/hellshake-yano/core.ts`

- [ ] `core.ts`を`neovim/core/core.ts`にコピー
  ```bash
  cp denops/hellshake-yano/core.ts denops/hellshake-yano/neovim/core/core.ts
  ```
- [ ] インポートパスを更新
  - [ ] `./config.ts` → `../../common/config.ts`
  - [ ] `./types.ts` → `../../common/types/*.ts`
  - [ ] `./cache.ts` → `../../common/cache/unified-cache.ts`
  - [ ] `./word.ts` → `./word.ts`（同じディレクトリ）
  - [ ] `./hint.ts` → `./hint.ts`（同じディレクトリ）
  - [ ] `./display.ts` → `../display/extmark-display.ts`
  - [ ] `./validation.ts` → `../../common/utils/validator.ts`
  - [ ] `./performance.ts` → `../../common/utils/performance.ts`
- [ ] 型チェック: `deno check denops/hellshake-yano/neovim/core/core.ts`

#### sub3: GREEN - word.tsの移動（30分）
@target: `denops/hellshake-yano/neovim/core/word.ts`
@ref: `denops/hellshake-yano/word.ts`

- [ ] `word.ts`を`neovim/core/word.ts`にコピー
  ```bash
  cp denops/hellshake-yano/word.ts denops/hellshake-yano/neovim/core/word.ts
  ```
- [ ] インポートパスを更新
  - [ ] `./types.ts` → `../../common/types/word.ts`
  - [ ] `./config.ts` → `../../common/config.ts`
  - [ ] その他の依存を確認して更新
- [ ] 型チェック: `deno check denops/hellshake-yano/neovim/core/word.ts`

#### sub4: GREEN - hint.tsの移動（30分）
@target: `denops/hellshake-yano/neovim/core/hint.ts`
@ref: `denops/hellshake-yano/hint.ts`

- [ ] `hint.ts`を`neovim/core/hint.ts`にコピー
  ```bash
  cp denops/hellshake-yano/hint.ts denops/hellshake-yano/neovim/core/hint.ts
  ```
- [ ] インポートパスを更新
  - [ ] `./types.ts` → `../../common/types/hint.ts`
  - [ ] `./word.ts` → `./word.ts`
  - [ ] その他の依存を確認して更新
- [ ] 型チェック: `deno check denops/hellshake-yano/neovim/core/hint.ts`

#### sub5: REFACTOR - リファクタリング（15分）
@target: `denops/hellshake-yano/neovim/core/*.ts`

- [ ] 不要なインポートを削除
- [ ] JSDocコメントの確認と更新（ファイルパスの説明を更新）
- [ ] コードフォーマット
  ```bash
  deno fmt denops/hellshake-yano/neovim/core/
  ```
- [ ] リンター実行
  ```bash
  deno lint denops/hellshake-yano/neovim/core/
  ```

#### sub6: CHECK - 検証（10分）
- [ ] `deno test tests/neovim/core/`（全テストパス）
- [ ] `deno check denops/hellshake-yano/neovim/core/*.ts`（型チェック100%）
- [ ] `deno lint denops/hellshake-yano/neovim/core/`（警告0個）

---

### process3: neovim/display/の構築（TDD）（1時間）

#### sub1: RED - テスト準備とディレクトリ作成（10分）
@target:
- `denops/hellshake-yano/neovim/display/`
- `tests/neovim/display/`

- [ ] ディレクトリ作成
  ```bash
  mkdir -p denops/hellshake-yano/neovim/display
  mkdir -p tests/neovim/display
  ```
- [ ] 既存のdisplay.tsのテストをコピー
- [ ] テストのインポートパスを更新
- [ ] テスト実行（失敗確認）
  ```bash
  deno test tests/neovim/display/
  ```

#### sub2: GREEN - extmark-display.tsの移動（30分）
@target: `denops/hellshake-yano/neovim/display/extmark-display.ts`
@ref: `denops/hellshake-yano/display.ts`

- [ ] `display.ts`を`neovim/display/extmark-display.ts`にコピー
  ```bash
  cp denops/hellshake-yano/display.ts denops/hellshake-yano/neovim/display/extmark-display.ts
  ```
- [ ] インポートパスを更新
  - [ ] `./types.ts` → `../../common/types/*.ts`
  - [ ] `./config.ts` → `../../common/config.ts`
  - [ ] その他の依存を確認して更新
- [ ] 型チェック: `deno check denops/hellshake-yano/neovim/display/extmark-display.ts`

#### sub3: GREEN - highlight.tsの作成（10分）
@target: `denops/hellshake-yano/neovim/display/highlight.ts`

- [ ] ハイライト管理機能を抽出（extmark-display.tsから分離するか、新規作成）
- [ ] 必要な型定義をインポート
- [ ] JSDocコメント追加
- [ ] 型チェック: `deno check denops/hellshake-yano/neovim/display/highlight.ts`

#### sub4: REFACTOR - リファクタリング（5分）
@target: `denops/hellshake-yano/neovim/display/*.ts`

- [ ] コードフォーマット
  ```bash
  deno fmt denops/hellshake-yano/neovim/display/
  ```
- [ ] リンター実行
  ```bash
  deno lint denops/hellshake-yano/neovim/display/
  ```

#### sub5: CHECK - 検証（5分）
- [ ] `deno test tests/neovim/display/`（全テストパス）
- [ ] `deno check denops/hellshake-yano/neovim/display/*.ts`（型チェック100%）
- [ ] `deno lint denops/hellshake-yano/neovim/display/`（警告0個）

---

### process4: neovim/dictionary.tsの移動（TDD）（30分）

#### sub1: RED - テスト準備（5分）
@target: `tests/neovim/dictionary.test.ts`

- [ ] 既存のdictionary.tsのテストをコピー
- [ ] テストのインポートパスを更新
- [ ] テスト実行（失敗確認）
  ```bash
  deno test tests/neovim/dictionary.test.ts
  ```

#### sub2: GREEN - dictionary.tsの移動（15分）
@target: `denops/hellshake-yano/neovim/dictionary.ts`
@ref: `denops/hellshake-yano/dictionary.ts`

- [ ] `dictionary.ts`を`neovim/dictionary.ts`にコピー
  ```bash
  cp denops/hellshake-yano/dictionary.ts denops/hellshake-yano/neovim/dictionary.ts
  ```
- [ ] インポートパスを更新
  - [ ] 相対パスを確認して更新
- [ ] 型チェック: `deno check denops/hellshake-yano/neovim/dictionary.ts`

#### sub3: REFACTOR - リファクタリング（5分）
@target: `denops/hellshake-yano/neovim/dictionary.ts`

- [ ] コードフォーマット
  ```bash
  deno fmt denops/hellshake-yano/neovim/dictionary.ts
  ```
- [ ] リンター実行
  ```bash
  deno lint denops/hellshake-yano/neovim/dictionary.ts
  ```

#### sub4: CHECK - 検証（5分）
- [ ] `deno test tests/neovim/dictionary.test.ts`（全テストパス）
- [ ] `deno check denops/hellshake-yano/neovim/dictionary.ts`（型チェック100%）

---

### process5: 依存関係の更新（30分）

#### sub1: main.tsの依存更新（15分）
@target: `denops/hellshake-yano/main.ts`

- [ ] main.tsのインポートパスを更新
  - [ ] `./core.ts` → `./neovim/core/core.ts`
  - [ ] `./display.ts` → `./neovim/display/extmark-display.ts`
  - [ ] `./word.ts` → `./neovim/core/word.ts`
  - [ ] `./hint.ts` → `./neovim/core/hint.ts`
  - [ ] `./dictionary.ts` → `./neovim/dictionary.ts`
- [ ] 型チェック: `deno check denops/hellshake-yano/main.ts`

#### sub2: 他のファイルの依存更新（15分）
@target: すべての既存ファイル

- [ ] neovim/core/以外で旧パスを参照しているファイルを検索
  ```bash
  grep -r "from.*\./core\.ts" denops/hellshake-yano/ --exclude-dir=neovim
  grep -r "from.*\./word\.ts" denops/hellshake-yano/ --exclude-dir=neovim
  grep -r "from.*\./hint\.ts" denops/hellshake-yano/ --exclude-dir=neovim
  grep -r "from.*\./display\.ts" denops/hellshake-yano/ --exclude-dir=neovim
  grep -r "from.*\./dictionary\.ts" denops/hellshake-yano/ --exclude-dir=neovim
  ```
- [ ] 見つかったファイルのインポートパスを更新
- [ ] 全体の型チェック: `deno check denops/hellshake-yano/**/*.ts`

---

### process6: 既存ファイルの削除と最終検証（30分）

#### sub1: バックアップとコミット（5分）
@target: なし（Git操作）

- [ ] 変更をコミット
  ```bash
  git add .
  git commit -m "feat(phase-c3): neovim/レイヤー構築完了前 - ファイル移動とテスト更新"
  ```

#### sub2: 既存ファイルの削除（10分）
@target: なし（ファイル削除）

- [ ] 移動元ファイルを削除
  ```bash
  rm denops/hellshake-yano/core.ts
  rm denops/hellshake-yano/word.ts
  rm denops/hellshake-yano/hint.ts
  rm denops/hellshake-yano/display.ts
  rm denops/hellshake-yano/dictionary.ts
  ```
- [ ] 古いテストファイルを削除（neovim/に移動したもの）

#### sub3: CHECK - 最終検証（15分）
- [ ] 全テスト実行: `deno test`（全テストパス）
- [ ] 型チェック: `deno check denops/hellshake-yano/**/*.ts`（エラー0）
- [ ] リンター: `deno lint denops/hellshake-yano/`（警告0個）
- [ ] カバレッジ確認: `deno test --coverage=coverage && deno coverage coverage/`（90%以上）
- [ ] ディレクトリ構造確認
  ```bash
  tree denops/hellshake-yano/neovim/
  tree tests/neovim/
  ```

---

### process10: ユニットテスト

各サブプロセスのRED（テスト作成）フェーズで実施済み。

#### 完了基準
- [ ] すべてのテストがパス: `deno test tests/neovim/`
- [ ] テストカバレッジ90%以上: `deno coverage coverage/`

---

### process100: リファクタリング（30分）

#### sub1: コード最適化
@target: `denops/hellshake-yano/neovim/**/*.ts`

- [ ] 不要なコメントの削除
- [ ] 命名規則の統一確認
- [ ] 重複コードの確認（common/に移動できるものがないか）

#### sub2: CHECK - 検証
- [ ] `deno lint denops/hellshake-yano/neovim/`（警告0個）
- [ ] `deno check denops/hellshake-yano/neovim/**/*.ts`（100%パス）
- [ ] `deno test tests/neovim/`（全テストパス）

---

### process200: ドキュメンテーション（15分）

#### sub1: PLAN.mdの更新
@target: `PLAN.md`

- [ ] 全サブプロセスにチェックマークを付ける
- [ ] 完了時刻を記録

#### sub2: ARCHITECTURE_C.mdの更新
@target: `ARCHITECTURE_C.md`

- [ ] Phase 3完了状況を記録
- [ ] 作成・更新したファイル一覧を追加
- [ ] Phase 3完了基準の達成状況を記録
  ```markdown
  ### Phase 3 完了基準

  - [ ] neovim/core/ 配下に3ファイル作成完了
  - [ ] neovim/display/ 配下に2ファイル作成完了
  - [ ] neovim/dictionary.ts 作成完了
  - [ ] 全テストパス
  - [ ] deno check 100%パス
  ```
