# title: Phase 2 - Vimレイヤーの構築（TDD方式）

## 概要
- Phase B-1～B-4のVim専用実装（13ファイル）を`vim/`レイヤーに統合
- TDD（Test-Driven Development）方式で段階的に移行
- 各processでRED→GREEN→REFACTOR→CHECKのサイクルを厳守

### goal
- vim/レイヤーが完成し、Vim環境で動作する完全な実装が整理される
- phase-b*への依存が0件になり、コードベースが明確化される
- 全テストパス、型チェック100%、カバレッジ90%以上を達成

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDDサイクルの厳守**: 各サブプロセスで必ずRED→GREEN→REFACTOR→CHECKを実施
- **各サブプロセス完了後に検証**: `deno test`と`deno check`を必ず実行
- **段階的な移行**: テストを維持しながら1ファイルずつ移動

## 開発のゴール
- `vim/core/`配下に4ファイル作成（word-detector, hint-generator, jump, input）
- `vim/display/`配下に2ファイル作成（popup-display, highlight）
- `vim/features/`配下に3ファイル作成（japanese, motion, visual）
- `vim/config/`配下に3ファイル作成（config-unifier, config-migrator, config-mapper）
- `vim/bridge/`配下に1ファイル作成（vim-bridge）
- phase-b*から移動したファイルは削除せず維持（Phase 6で一括削除）
- 全テストパス、型チェック100%パス、カバレッジ90%以上を達成

## 実装仕様

### 前提条件
- Phase 1完了: `common/`レイヤーが構築済み
- Phase 3完了: `neovim/`レイヤーが構築済み
- Phase 4完了: `integration/`レイヤーが構築済み

### 移動対象ファイル

#### コア機能（vim/core/へ移動）
- `denops/hellshake-yano/phase-b2/unified-word-detector.ts` → `vim/core/word-detector.ts`
- `denops/hellshake-yano/phase-b2/unified-hint-generator.ts` → `vim/core/hint-generator.ts`
- `denops/hellshake-yano/phase-b2/unified-jump.ts` → `vim/core/jump.ts`
- `denops/hellshake-yano/phase-b2/unified-input.ts` → `vim/core/input.ts`

#### 表示システム（vim/display/へ移動・作成）
- `denops/hellshake-yano/phase-b1/unified-display.ts` → `vim/display/popup-display.ts`（Vim部分のみ抽出）
- `vim/display/highlight.ts`（新規作成）

#### 高度機能（vim/features/へ移動）
- `denops/hellshake-yano/phase-b3/unified-japanese-support.ts` → `vim/features/japanese.ts`
- `denops/hellshake-yano/phase-b3/unified-motion-detector.ts` → `vim/features/motion.ts`
- `denops/hellshake-yano/phase-b3/unified-visual-mode.ts` → `vim/features/visual.ts`

#### 設定管理（vim/config/へ移動・統合）
- `denops/hellshake-yano/phase-b1/config-unifier.ts` → `vim/config/config-unifier.ts`
- `denops/hellshake-yano/phase-b1/config-migrator.ts` + `phase-b4/config-migrator.ts` → `vim/config/config-migrator.ts`（統合）
- `denops/hellshake-yano/phase-b4/config-mapper.ts` → `vim/config/config-mapper.ts`

#### VimScriptブリッジ（vim/bridge/へ移動）
- `denops/hellshake-yano/phase-b1/vim-bridge.ts` → `vim/bridge/vim-bridge.ts`

#### 移動しないファイル
- `phase-b2/vimscript-types.ts` → Phase 1でcommon/types/vimscript.tsに統合済み
- `phase-b3/common-base.ts` → Phase 1でcommon/utils/base.tsに統合済み
- `phase-b3/types.ts` → Phase 1でcommon/types/に統合済み
- `phase-b4/environment-detector.ts等` → Phase 4でintegration/に移動済み

### 目標ディレクトリ構造

```
denops/hellshake-yano/
├── vim/                          # Vimレイヤー
│   ├── core/                     # コア機能
│   │   ├── word-detector.ts      # 🔧 phase-b2から移動
│   │   ├── hint-generator.ts     # 🔧 phase-b2から移動
│   │   ├── jump.ts               # 🔧 phase-b2から移動
│   │   └── input.ts              # 🔧 phase-b2から移動
│   ├── display/                  # 表示システム
│   │   ├── popup-display.ts      # 🔧 phase-b1から移動（Vim部分のみ）
│   │   └── highlight.ts          # ✨ 新規作成
│   ├── features/                 # 高度機能
│   │   ├── japanese.ts           # 🔧 phase-b3から移動
│   │   ├── motion.ts             # 🔧 phase-b3から移動
│   │   └── visual.ts             # 🔧 phase-b3から移動
│   ├── config/                   # 設定管理
│   │   ├── config-unifier.ts     # 🔧 phase-b1から移動
│   │   ├── config-migrator.ts    # 🔧 phase-b1 + phase-b4統合
│   │   └── config-mapper.ts      # 🔧 phase-b4から移動
│   └── bridge/                   # VimScriptブリッジ
│       └── vim-bridge.ts         # 🔧 phase-b1から移動
│
└── tests/vim/                    # Vimレイヤーのテスト
    ├── core/
    │   ├── word-detector.test.ts
    │   ├── hint-generator.test.ts
    │   ├── jump.test.ts
    │   └── input.test.ts
    ├── display/
    │   ├── popup-display.test.ts
    │   └── highlight.test.ts
    ├── features/
    │   ├── japanese.test.ts
    │   ├── motion.test.ts
    │   └── visual.test.ts
    ├── config/
    │   ├── config-unifier.test.ts
    │   ├── config-migrator.test.ts
    │   └── config-mapper.test.ts
    └── bridge/
        └── vim-bridge.test.ts
```

### 依存関係の更新方針

移動時に以下のインポートパスを更新：

```typescript
// 変更前（phase-b2）
import type { DenopsWord } from "./vimscript-types.ts";
import { unifiedJapaneseSupport } from "../phase-b3/unified-japanese-support.ts";

// 変更後（vim/core/）
import type { DenopsWord } from "../../common/types/vimscript.ts";
import { unifiedJapaneseSupport } from "../features/japanese.ts";
```

## 生成AIの学習用コンテキスト

### 移動元ファイル（phase-b1）
- `denops/hellshake-yano/phase-b1/vim-bridge.ts`
  - VimScript版のword_detector機能をDenopsから利用するブリッジ
  - 環境判定を行い、Vim/Neovim専用のメソッドを呼び分け
- `denops/hellshake-yano/phase-b1/unified-display.ts`
  - popup_create()（Vim）とextmark（Neovim）の両対応
  - Vim部分のみを抽出してvim/display/popup-display.tsへ
- `denops/hellshake-yano/phase-b1/config-unifier.ts`
  - VimScript版とDenops版の設定統合
- `denops/hellshake-yano/phase-b1/config-migrator.ts`
  - 設定マイグレーション（phase-b4版と統合必要）

### 移動元ファイル（phase-b2）
- `denops/hellshake-yano/phase-b2/unified-word-detector.ts`
  - VimScript版word_detector.vimの完全移植
  - matchstrpos()の0-indexed → 1-indexed変換を正確に実装
- `denops/hellshake-yano/phase-b2/unified-hint-generator.ts`
  - ヒント生成アルゴリズムの実装
- `denops/hellshake-yano/phase-b2/unified-jump.ts`
  - cursor()関数の完全再現
- `denops/hellshake-yano/phase-b2/unified-input.ts`
  - ブロッキング入力処理の実装

### 移動元ファイル（phase-b3）
- `denops/hellshake-yano/phase-b3/unified-japanese-support.ts`
  - TinySegmenterを統合した日本語対応単語検出
  - キャッシュ機能付き
- `denops/hellshake-yano/phase-b3/unified-motion-detector.ts`
  - モーション検出ロジック
- `denops/hellshake-yano/phase-b3/unified-visual-mode.ts`
  - ビジュアルモード対応

### 移動元ファイル（phase-b4）
- `denops/hellshake-yano/phase-b4/config-mapper.ts`
  - 設定変換機能
- `denops/hellshake-yano/phase-b4/config-migrator.ts`
  - 設定マイグレーション（phase-b1版と統合必要）

### 参考ドキュメント
- `ARCHITECTURE_C.md`
  - Phase 2: Vimレイヤーの構築の詳細仕様
  - 依存関係の更新方針
  - モジュール詳細設計

### Phase 1で構築済み
- `common/types/vimscript.ts` - VimScript型定義
- `common/types/word.ts` - Word型定義
- `common/types/hint.ts` - Hint型定義
- `common/utils/error-handler.ts` - エラーハンドリング
- `common/utils/logger.ts` - ログ出力
- `common/utils/base.ts` - 共通ユーティリティ
- `common/cache/unified-cache.ts` - キャッシュシステム

## Process

### process1: 準備作業（30分）

#### sub1: ディレクトリ構造の作成
@target:
- `denops/hellshake-yano/vim/`
- `tests/vim/`

- [ ] vimレイヤーのディレクトリ作成
  ```bash
  mkdir -p denops/hellshake-yano/vim/{core,display,features,config,bridge}
  ```
- [ ] テストディレクトリの作成
  ```bash
  mkdir -p tests/vim/{core,display,features,config,bridge}
  ```
- [ ] ディレクトリ構造の確認
  ```bash
  ls -R denops/hellshake-yano/vim/
  ls -R tests/vim/
  ```

#### sub2: 移動対象ファイルの最終確認
@target: なし（調査のみ）

- [ ] phase-b1ファイルのリスト確認
  ```bash
  ls -la denops/hellshake-yano/phase-b1/*.ts
  ```
- [ ] phase-b2ファイルのリスト確認
  ```bash
  ls -la denops/hellshake-yano/phase-b2/*.ts
  ```
- [ ] phase-b3ファイルのリスト確認
  ```bash
  ls -la denops/hellshake-yano/phase-b3/*.ts
  ```
- [ ] phase-b4のvim関連ファイル確認
  ```bash
  ls -la denops/hellshake-yano/phase-b4/config-*.ts
  ```
- [ ] 既存テストファイルの確認
  ```bash
  find tests/phase-b* -name "*.test.ts" | grep -E "(vim|word|hint|jump|input|japanese|motion|visual|config)" | sort
  ```

---

### process2: コア機能の統合 - word-detector.ts（TDD）（2時間）

#### sub1: RED - テストファイル作成（30分）
@target: `tests/vim/core/word-detector.test.ts`
@ref: `tests/phase-b2/unified-word-detector.test.ts`（存在する場合）

- [ ] テストファイルを作成
  - 基本的な単語検出テスト
  - 空のバッファテスト
  - VimScript版との完全一致テスト
  - 日本語を含む行のテスト
  - 特殊文字を含む行のテスト
- [ ] インポートパスを仮設定（まだ実装ファイルが存在しない）
  ```typescript
  import { VimWordDetector } from "../../../denops/hellshake-yano/vim/core/word-detector.ts";
  ```
- [ ] テスト実行（失敗確認）
  ```bash
  deno test tests/vim/core/word-detector.test.ts
  # Expected: エラー（実装ファイルが存在しない）
  ```

#### sub2: GREEN - word-detector.tsの移動と実装（1時間）
@target: `denops/hellshake-yano/vim/core/word-detector.ts`
@ref: `denops/hellshake-yano/phase-b2/unified-word-detector.ts`

- [ ] word-detector.tsをvim/core/にコピー
  ```bash
  cp denops/hellshake-yano/phase-b2/unified-word-detector.ts denops/hellshake-yano/vim/core/word-detector.ts
  ```
- [ ] インポートパスを更新
  - `./vimscript-types.ts` → `../../common/types/vimscript.ts`
  - `../phase-b3/unified-japanese-support.ts` → `../features/japanese.ts`（後で実装）
- [ ] クラス名を更新（必要に応じて）
  - `UnifiedWordDetector` → `VimWordDetector`
- [ ] 型チェック
  ```bash
  deno check denops/hellshake-yano/vim/core/word-detector.ts
  ```
- [ ] テスト実行（パス確認）
  ```bash
  deno test tests/vim/core/word-detector.test.ts
  ```

#### sub3: REFACTOR - リファクタリング（20分）
@target: `denops/hellshake-yano/vim/core/word-detector.ts`

- [ ] コメントを更新（"Phase B-2" → "Vim Layer"）
- [ ] 不要なコメントを削除
- [ ] インポート文を整理（アルファベット順）
- [ ] コードフォーマット
  ```bash
  deno fmt denops/hellshake-yano/vim/core/word-detector.ts
  ```
- [ ] リンター実行
  ```bash
  deno lint denops/hellshake-yano/vim/core/word-detector.ts
  ```

#### sub4: CHECK - 検証（10分）
- [ ] テスト実行
  ```bash
  deno test tests/vim/core/word-detector.test.ts
  ```
- [ ] 型チェック
  ```bash
  deno check denops/hellshake-yano/vim/core/word-detector.ts
  ```
- [ ] リンター
  ```bash
  deno lint denops/hellshake-yano/vim/core/word-detector.ts
  ```

---

### process3: コア機能の統合 - hint-generator.ts（TDD）（1.5時間）

#### sub1: RED - テストファイル作成（20分）
@target: `tests/vim/core/hint-generator.test.ts`
@ref: `tests/phase-b2/unified-hint-generator.test.ts`（存在する場合）

- [ ] テストファイルを作成
  - ヒント生成の基本動作
  - markers配列の処理
  - 重複なしのヒント生成
  - マルチ文字ヒントの生成
- [ ] テスト実行（失敗確認）
  ```bash
  deno test tests/vim/core/hint-generator.test.ts
  ```

#### sub2: GREEN - hint-generator.tsの移動と実装（50分）
@target: `denops/hellshake-yano/vim/core/hint-generator.ts`
@ref: `denops/hellshake-yano/phase-b2/unified-hint-generator.ts`

- [ ] hint-generator.tsをvim/core/にコピー
  ```bash
  cp denops/hellshake-yano/phase-b2/unified-hint-generator.ts denops/hellshake-yano/vim/core/hint-generator.ts
  ```
- [ ] インポートパスを更新
  - common/types/への依存を更新
- [ ] クラス名を更新（必要に応じて）
  - `UnifiedHintGenerator` → `VimHintGenerator`
- [ ] 型チェック
  ```bash
  deno check denops/hellshake-yano/vim/core/hint-generator.ts
  ```
- [ ] テスト実行
  ```bash
  deno test tests/vim/core/hint-generator.test.ts
  ```

#### sub3: REFACTOR & CHECK（20分）
- [ ] コードフォーマット・リンター実行
  ```bash
  deno fmt denops/hellshake-yano/vim/core/hint-generator.ts
  deno lint denops/hellshake-yano/vim/core/hint-generator.ts
  ```
- [ ] テスト・型チェック実行
  ```bash
  deno test tests/vim/core/hint-generator.test.ts
  deno check denops/hellshake-yano/vim/core/hint-generator.ts
  ```

---

### process4: コア機能の統合 - jump.ts（TDD）（1時間）

#### sub1: RED - テストファイル作成（15分）
@target: `tests/vim/core/jump.test.ts`

- [ ] テストファイルを作成
  - cursor()関数の動作
  - 座標変換の正確性
- [ ] テスト実行（失敗確認）
  ```bash
  deno test tests/vim/core/jump.test.ts
  ```

#### sub2: GREEN - jump.tsの移動と実装（30分）
@target: `denops/hellshake-yano/vim/core/jump.ts`
@ref: `denops/hellshake-yano/phase-b2/unified-jump.ts`

- [ ] jump.tsをvim/core/にコピー
  ```bash
  cp denops/hellshake-yano/phase-b2/unified-jump.ts denops/hellshake-yano/vim/core/jump.ts
  ```
- [ ] インポートパスを更新
- [ ] 型チェック
  ```bash
  deno check denops/hellshake-yano/vim/core/jump.ts
  ```
- [ ] テスト実行
  ```bash
  deno test tests/vim/core/jump.test.ts
  ```

#### sub3: REFACTOR & CHECK（15分）
- [ ] コードフォーマット・リンター・テスト実行
  ```bash
  deno fmt denops/hellshake-yano/vim/core/jump.ts
  deno lint denops/hellshake-yano/vim/core/jump.ts
  deno test tests/vim/core/jump.test.ts
  deno check denops/hellshake-yano/vim/core/jump.ts
  ```

---

### process5: コア機能の統合 - input.ts（TDD）（1時間）

#### sub1: RED - テストファイル作成（15分）
@target: `tests/vim/core/input.test.ts`

- [ ] テストファイルを作成
  - ブロッキング入力処理のテスト
- [ ] テスト実行（失敗確認）
  ```bash
  deno test tests/vim/core/input.test.ts
  ```

#### sub2: GREEN - input.tsの移動と実装（30分）
@target: `denops/hellshake-yano/vim/core/input.ts`
@ref: `denops/hellshake-yano/phase-b2/unified-input.ts`

- [ ] input.tsをvim/core/にコピー
  ```bash
  cp denops/hellshake-yano/phase-b2/unified-input.ts denops/hellshake-yano/vim/core/input.ts
  ```
- [ ] インポートパスを更新
- [ ] 型チェック・テスト実行
  ```bash
  deno check denops/hellshake-yano/vim/core/input.ts
  deno test tests/vim/core/input.test.ts
  ```

#### sub3: REFACTOR & CHECK（15分）
- [ ] コードフォーマット・リンター・テスト実行
  ```bash
  deno fmt denops/hellshake-yano/vim/core/input.ts
  deno lint denops/hellshake-yano/vim/core/input.ts
  deno test tests/vim/core/
  deno check denops/hellshake-yano/vim/core/*.ts
  ```

---

### process6: 表示システムの統合 - popup-display.ts（TDD）（2時間）

#### sub1: RED - テストファイル作成（30分）
@target: `tests/vim/display/popup-display.test.ts`

- [ ] テストファイルを作成
  - popup_create()の呼び出しテスト
  - ハイライト設定テスト
  - Vim専用の表示機能テスト
- [ ] テスト実行（失敗確認）
  ```bash
  deno test tests/vim/display/popup-display.test.ts
  ```

#### sub2: GREEN - popup-display.tsの移動と実装（1時間）
@target: `denops/hellshake-yano/vim/display/popup-display.ts`
@ref: `denops/hellshake-yano/phase-b1/unified-display.ts`

- [ ] unified-display.tsを読み取り、Vim部分のみを抽出
  ```bash
  # 新規ファイルとして作成（コピーではなく抽出）
  ```
- [ ] Neovim（extmark）部分を削除
- [ ] Vim（popup_create）部分のみを実装
- [ ] インポートパスを更新
- [ ] 型チェック・テスト実行
  ```bash
  deno check denops/hellshake-yano/vim/display/popup-display.ts
  deno test tests/vim/display/popup-display.test.ts
  ```

#### sub3: REFACTOR & CHECK（30分）
- [ ] コードフォーマット・リンター実行
  ```bash
  deno fmt denops/hellshake-yano/vim/display/popup-display.ts
  deno lint denops/hellshake-yano/vim/display/popup-display.ts
  ```
- [ ] テスト・型チェック実行
  ```bash
  deno test tests/vim/display/popup-display.test.ts
  deno check denops/hellshake-yano/vim/display/popup-display.ts
  ```

---

### process7: 表示システムの統合 - highlight.ts（TDD）（1時間）

#### sub1: RED - テストファイル作成（20分）
@target: `tests/vim/display/highlight.test.ts`

- [ ] テストファイルを作成
  - ハイライトグループ管理のテスト
- [ ] テスト実行（失敗確認）
  ```bash
  deno test tests/vim/display/highlight.test.ts
  ```

#### sub2: GREEN - highlight.tsの作成（30分）
@target: `denops/hellshake-yano/vim/display/highlight.ts`

- [ ] highlight.tsを新規作成
  - ハイライトグループ管理機能
  - HintMarkerの定義
- [ ] 型チェック・テスト実行
  ```bash
  deno check denops/hellshake-yano/vim/display/highlight.ts
  deno test tests/vim/display/highlight.test.ts
  ```

#### sub3: REFACTOR & CHECK（10分）
- [ ] コードフォーマット・リンター・テスト実行
  ```bash
  deno fmt denops/hellshake-yano/vim/display/
  deno lint denops/hellshake-yano/vim/display/
  deno test tests/vim/display/
  deno check denops/hellshake-yano/vim/display/*.ts
  ```

---

### process8: 高度機能の統合 - japanese.ts（TDD）（1.5時間）

#### sub1: RED - テストファイル作成（20分）
@target: `tests/vim/features/japanese.test.ts`

- [ ] テストファイルを作成
  - TinySegmenter統合のテスト
  - 日本語単語検出のテスト
- [ ] テスト実行（失敗確認）
  ```bash
  deno test tests/vim/features/japanese.test.ts
  ```

#### sub2: GREEN - japanese.tsの移動と実装（1時間）
@target: `denops/hellshake-yano/vim/features/japanese.ts`
@ref: `denops/hellshake-yano/phase-b3/unified-japanese-support.ts`

- [ ] japanese.tsをvim/features/にコピー
  ```bash
  cp denops/hellshake-yano/phase-b3/unified-japanese-support.ts denops/hellshake-yano/vim/features/japanese.ts
  ```
- [ ] インポートパスを更新
  - `../neovim/core/word/word-segmenter.ts` → `../../neovim/core/word/word-segmenter.ts`
  - `../phase-b2/vimscript-types.ts` → `../../common/types/vimscript.ts`
  - `../common/cache/unified-cache.ts` → `../../common/cache/unified-cache.ts`
  - `./common-base.ts` → `../../common/utils/`（個別にインポート）
- [ ] 型チェック・テスト実行
  ```bash
  deno check denops/hellshake-yano/vim/features/japanese.ts
  deno test tests/vim/features/japanese.test.ts
  ```

#### sub3: REFACTOR & CHECK（10分）
- [ ] コードフォーマット・リンター・テスト実行
  ```bash
  deno fmt denops/hellshake-yano/vim/features/japanese.ts
  deno lint denops/hellshake-yano/vim/features/japanese.ts
  deno test tests/vim/features/japanese.test.ts
  deno check denops/hellshake-yano/vim/features/japanese.ts
  ```

---

### process9: 高度機能の統合 - motion.ts（TDD）（1時間）

#### sub1: RED - テストファイル作成（15分）
@target: `tests/vim/features/motion.test.ts`

- [ ] テストファイルを作成
  - モーション検出ロジックのテスト
- [ ] テスト実行（失敗確認）
  ```bash
  deno test tests/vim/features/motion.test.ts
  ```

#### sub2: GREEN - motion.tsの移動と実装（30分）
@target: `denops/hellshake-yano/vim/features/motion.ts`
@ref: `denops/hellshake-yano/phase-b3/unified-motion-detector.ts`

- [ ] motion.tsをvim/features/にコピー
  ```bash
  cp denops/hellshake-yano/phase-b3/unified-motion-detector.ts denops/hellshake-yano/vim/features/motion.ts
  ```
- [ ] インポートパスを更新
- [ ] 型チェック・テスト実行
  ```bash
  deno check denops/hellshake-yano/vim/features/motion.ts
  deno test tests/vim/features/motion.test.ts
  ```

#### sub3: REFACTOR & CHECK（15分）
- [ ] コードフォーマット・リンター・テスト実行
  ```bash
  deno fmt denops/hellshake-yano/vim/features/motion.ts
  deno lint denops/hellshake-yano/vim/features/motion.ts
  deno test tests/vim/features/motion.test.ts
  deno check denops/hellshake-yano/vim/features/motion.ts
  ```

---

### process10: 高度機能の統合 - visual.ts（TDD）（1時間）

#### sub1: RED - テストファイル作成（15分）
@target: `tests/vim/features/visual.test.ts`

- [ ] テストファイルを作成
  - ビジュアルモード対応のテスト
- [ ] テスト実行（失敗確認）
  ```bash
  deno test tests/vim/features/visual.test.ts
  ```

#### sub2: GREEN - visual.tsの移動と実装（30分）
@target: `denops/hellshake-yano/vim/features/visual.ts`
@ref: `denops/hellshake-yano/phase-b3/unified-visual-mode.ts`

- [ ] visual.tsをvim/features/にコピー
  ```bash
  cp denops/hellshake-yano/phase-b3/unified-visual-mode.ts denops/hellshake-yano/vim/features/visual.ts
  ```
- [ ] インポートパスを更新
- [ ] 型チェック・テスト実行
  ```bash
  deno check denops/hellshake-yano/vim/features/visual.ts
  deno test tests/vim/features/visual.test.ts
  ```

#### sub3: REFACTOR & CHECK（15分）
- [ ] コードフォーマット・リンター・テスト実行
  ```bash
  deno fmt denops/hellshake-yano/vim/features/
  deno lint denops/hellshake-yano/vim/features/
  deno test tests/vim/features/
  deno check denops/hellshake-yano/vim/features/*.ts
  ```

---

### process11: 設定管理の統合 - config-unifier.ts（TDD）（1.5時間）

#### sub1: RED - テストファイル作成（20分）
@target: `tests/vim/config/config-unifier.test.ts`

- [ ] テストファイルを作成
  - VimScript版とDenops版の設定統合テスト
- [ ] テスト実行（失敗確認）
  ```bash
  deno test tests/vim/config/config-unifier.test.ts
  ```

#### sub2: GREEN - config-unifier.tsの移動と実装（50分）
@target: `denops/hellshake-yano/vim/config/config-unifier.ts`
@ref: `denops/hellshake-yano/phase-b1/config-unifier.ts`

- [ ] config-unifier.tsをvim/config/にコピー
  ```bash
  cp denops/hellshake-yano/phase-b1/config-unifier.ts denops/hellshake-yano/vim/config/config-unifier.ts
  ```
- [ ] インポートパスを更新
  - common/への依存を更新
- [ ] 型チェック・テスト実行
  ```bash
  deno check denops/hellshake-yano/vim/config/config-unifier.ts
  deno test tests/vim/config/config-unifier.test.ts
  ```

#### sub3: REFACTOR & CHECK（20分）
- [ ] コードフォーマット・リンター・テスト実行
  ```bash
  deno fmt denops/hellshake-yano/vim/config/config-unifier.ts
  deno lint denops/hellshake-yano/vim/config/config-unifier.ts
  deno test tests/vim/config/config-unifier.test.ts
  deno check denops/hellshake-yano/vim/config/config-unifier.ts
  ```

---

### process12: 設定管理の統合 - config-migrator.ts（統合版）（TDD）（2.5時間）

#### sub1: RED - テストファイル作成（30分）
@target: `tests/vim/config/config-migrator.test.ts`

- [ ] phase-b1とphase-b4のテストファイルを読み取り
  ```bash
  cat tests/phase-b1/config-migrator.test.ts
  cat tests/phase-b4/config-migrator.test.ts
  ```
- [ ] 両方のテストケースを統合した新しいテストファイルを作成
- [ ] テスト実行（失敗確認）
  ```bash
  deno test tests/vim/config/config-migrator.test.ts
  ```

#### sub2: GREEN - config-migrator.tsの統合実装（1.5時間）
@target: `denops/hellshake-yano/vim/config/config-migrator.ts`
@ref:
- `denops/hellshake-yano/phase-b1/config-migrator.ts`
- `denops/hellshake-yano/phase-b4/config-migrator.ts`

- [ ] 両ファイルの差分を確認
  ```bash
  diff denops/hellshake-yano/phase-b1/config-migrator.ts denops/hellshake-yano/phase-b4/config-migrator.ts
  ```
- [ ] phase-b4版を基準に統合
  - phase-b4版をvim/config/にコピー
  - phase-b1版の差分機能を追加
- [ ] 重複機能を削除
- [ ] インポートパスを更新
  - common/への依存を更新
- [ ] 型チェック・テスト実行
  ```bash
  deno check denops/hellshake-yano/vim/config/config-migrator.ts
  deno test tests/vim/config/config-migrator.test.ts
  ```

#### sub3: REFACTOR & CHECK（30分）
- [ ] コードフォーマット・リンター実行
  ```bash
  deno fmt denops/hellshake-yano/vim/config/config-migrator.ts
  deno lint denops/hellshake-yano/vim/config/config-migrator.ts
  ```
- [ ] テスト・型チェック実行
  ```bash
  deno test tests/vim/config/config-migrator.test.ts
  deno check denops/hellshake-yano/vim/config/config-migrator.ts
  ```

---

### process13: 設定管理の統合 - config-mapper.ts（TDD）（1.5時間）

#### sub1: RED - テストファイル作成（20分）
@target: `tests/vim/config/config-mapper.test.ts`

- [ ] テストファイルを移動
  ```bash
  # phase-b4のテストが存在する場合
  cp tests/phase-b4/config-mapper.test.ts tests/vim/config/config-mapper.test.ts
  ```
- [ ] インポートパスを更新
- [ ] テスト実行（失敗確認）
  ```bash
  deno test tests/vim/config/config-mapper.test.ts
  ```

#### sub2: GREEN - config-mapper.tsの移動と実装（50分）
@target: `denops/hellshake-yano/vim/config/config-mapper.ts`
@ref: `denops/hellshake-yano/phase-b4/config-mapper.ts`

- [ ] config-mapper.tsをvim/config/にコピー
  ```bash
  cp denops/hellshake-yano/phase-b4/config-mapper.ts denops/hellshake-yano/vim/config/config-mapper.ts
  ```
- [ ] インポートパスを更新
- [ ] 型チェック・テスト実行
  ```bash
  deno check denops/hellshake-yano/vim/config/config-mapper.ts
  deno test tests/vim/config/config-mapper.test.ts
  ```

#### sub3: REFACTOR & CHECK（20分）
- [ ] コードフォーマット・リンター・テスト実行
  ```bash
  deno fmt denops/hellshake-yano/vim/config/
  deno lint denops/hellshake-yano/vim/config/
  deno test tests/vim/config/
  deno check denops/hellshake-yano/vim/config/*.ts
  ```

---

### process14: VimScriptブリッジの統合 - vim-bridge.ts（TDD）（1.5時間）

#### sub1: RED - テストファイル作成（20分）
@target: `tests/vim/bridge/vim-bridge.test.ts`
@ref: `tests/phase-b1/vim-bridge.test.ts`

- [ ] テストファイルをコピー
  ```bash
  cp tests/phase-b1/vim-bridge.test.ts tests/vim/bridge/vim-bridge.test.ts
  ```
- [ ] インポートパスを更新
  - `../../denops/hellshake-yano/phase-b1/` → `../../../denops/hellshake-yano/vim/bridge/`
- [ ] テスト実行（失敗確認）
  ```bash
  deno test tests/vim/bridge/vim-bridge.test.ts
  ```

#### sub2: GREEN - vim-bridge.tsの移動と実装（50分）
@target: `denops/hellshake-yano/vim/bridge/vim-bridge.ts`
@ref: `denops/hellshake-yano/phase-b1/vim-bridge.ts`

- [ ] vim-bridge.tsをvim/bridge/にコピー
  ```bash
  cp denops/hellshake-yano/phase-b1/vim-bridge.ts denops/hellshake-yano/vim/bridge/vim-bridge.ts
  ```
- [ ] インポートパスを更新
  - common/types/への依存を更新
- [ ] 型チェック・テスト実行
  ```bash
  deno check denops/hellshake-yano/vim/bridge/vim-bridge.ts
  deno test tests/vim/bridge/vim-bridge.test.ts
  ```

#### sub3: REFACTOR & CHECK（20分）
- [ ] コードフォーマット・リンター・テスト実行
  ```bash
  deno fmt denops/hellshake-yano/vim/bridge/vim-bridge.ts
  deno lint denops/hellshake-yano/vim/bridge/vim-bridge.ts
  deno test tests/vim/bridge/vim-bridge.test.ts
  deno check denops/hellshake-yano/vim/bridge/vim-bridge.ts
  ```

---

### process15: 統合テストと最終検証（2時間）

#### sub1: 全テスト実行（30分）
- [ ] vim/レイヤーの全テスト実行
  ```bash
  deno test tests/vim/
  ```
- [ ] common/レイヤーのテストも実行（影響確認）
  ```bash
  deno test tests/common/
  ```
- [ ] 全体のテスト実行
  ```bash
  deno test
  ```

#### sub2: 型チェックとリント（30分）
- [ ] vim/配下の全ファイルの型チェック
  ```bash
  deno check denops/hellshake-yano/vim/**/*.ts
  ```
- [ ] リンター実行
  ```bash
  deno lint denops/hellshake-yano/vim/
  ```
- [ ] フォーマット確認
  ```bash
  deno fmt --check denops/hellshake-yano/vim/
  ```

#### sub3: インポートパスの最終確認（30分）
- [ ] vim/がcommon/のみに依存していることを確認
  ```bash
  grep -r "^import" denops/hellshake-yano/vim/ | grep -v "jsr:" | grep -v "@denops" | grep -v "../common/" | grep -v "\./
  # Expected: phase-b*へのインポートが0件
  ```
- [ ] phase-b*へのインポートが残っていないか確認
  ```bash
  grep -r "phase-b" denops/hellshake-yano/vim/ || echo "OK: No phase-b imports"
  ```
- [ ] 循環依存がないことを確認

#### sub4: カバレッジ確認（30分）
- [ ] カバレッジレポート生成
  ```bash
  deno test --coverage tests/vim/
  deno coverage coverage/ --lcov > coverage-vim.lcov
  ```
- [ ] カバレッジ90%以上を確認

---

### process20: integration/initializer.tsの参照更新（30分）

#### sub1: initializer.tsのconfig-migrator.ts参照を更新
@target: `denops/hellshake-yano/integration/initializer.ts`

- [ ] config-migrator.tsのインポートパスを更新
  ```typescript
  // 変更前
  import { ConfigMigrator } from "../phase-b4/config-migrator.ts";

  // 変更後
  import { ConfigMigrator } from "../vim/config/config-migrator.ts";
  ```
- [ ] 型チェック
  ```bash
  deno check denops/hellshake-yano/integration/initializer.ts
  ```
- [ ] テスト実行
  ```bash
  deno test tests/integration/initializer.test.ts
  ```

---

### process50: フォローアップ
現時点でフォローアップ事項なし

---

### process100: リファクタリング（1時間）

#### sub1: コード最適化
@target: `denops/hellshake-yano/vim/**/*.ts`

- [ ] 不要なコメントの削除
- [ ] 命名規則の統一確認
- [ ] 重複コードの確認（さらにcommon/に移動できるものがないか）
- [ ] JSDocコメントの確認と更新

#### sub2: CHECK - 検証
- [ ] リンター実行
  ```bash
  deno lint denops/hellshake-yano/vim/
  ```
- [ ] 型チェック
  ```bash
  deno check denops/hellshake-yano/vim/**/*.ts
  ```
- [ ] テスト実行
  ```bash
  deno test tests/vim/
  ```

---

### process200: ドキュメンテーション（1時間）

#### sub1: PLAN.mdの更新
@target: `PLAN.md`

- [ ] 全サブプロセスにチェックマークを付ける
- [ ] 完了時刻を記録

#### sub2: ARCHITECTURE_C.mdの更新
@target: `ARCHITECTURE_C.md`

- [ ] Phase 2完了状況を記録
- [ ] 作成・更新したファイル一覧を追加
- [ ] Phase 2完了基準の達成状況を記録
  ```markdown
  ### Phase 2 完了基準

  - [x] vim/core/ 配下に4ファイル作成完了
  - [x] vim/display/ 配下に2ファイル作成完了
  - [x] vim/features/ 配下に3ファイル作成完了
  - [x] vim/config/ 配下に3ファイル作成完了
  - [x] vim/bridge/ 配下に1ファイル作成完了
  - [x] 全テストパス
  - [x] deno check 100%パス
  ```

#### sub3: 完了レポート作成
@target: `ai/plan/phase-c2-vim-layer-completion_20251019.md`

- [ ] Phase 2完了レポートを作成
  - 移動したファイル一覧
  - テスト結果
  - config-migrator.tsの統合内容
  - Phase 5への引き継ぎ事項

---

## Phase 2 完了基準

### ファイル構成
- [ ] `vim/core/word-detector.ts` 作成完了
- [ ] `vim/core/hint-generator.ts` 作成完了
- [ ] `vim/core/jump.ts` 作成完了
- [ ] `vim/core/input.ts` 作成完了
- [ ] `vim/display/popup-display.ts` 作成完了
- [ ] `vim/display/highlight.ts` 作成完了
- [ ] `vim/features/japanese.ts` 作成完了
- [ ] `vim/features/motion.ts` 作成完了
- [ ] `vim/features/visual.ts` 作成完了
- [ ] `vim/config/config-unifier.ts` 作成完了
- [ ] `vim/config/config-migrator.ts` 作成完了（統合版）
- [ ] `vim/config/config-mapper.ts` 作成完了
- [ ] `vim/bridge/vim-bridge.ts` 作成完了

### テスト
- [ ] `tests/vim/core/` 配下に4テストファイル作成完了
- [ ] `tests/vim/display/` 配下に2テストファイル作成完了
- [ ] `tests/vim/features/` 配下に3テストファイル作成完了
- [ ] `tests/vim/config/` 配下に3テストファイル作成完了
- [ ] `tests/vim/bridge/` 配下に1テストファイル作成完了
- [ ] 全テストパス（`deno test tests/vim/`）

### 品質指標
- [ ] 型チェック100%パス（`deno check denops/hellshake-yano/vim/**/*.ts`）
- [ ] リンター警告0個（`deno lint denops/hellshake-yano/vim/`）
- [ ] テストカバレッジ90%以上（`deno coverage coverage/`）

### 依存関係
- [ ] vim/ → common/への依存のみ（phase-b*への依存なし）
- [ ] vim/ → vim/の相互依存を確認
- [ ] integration/initializer.tsのconfig-migrator.ts参照を更新完了
- [ ] 循環依存なし

---

## 既知の課題と次フェーズへの引き継ぎ

### 課題1: config-migrator.tsの統合
**問題**: phase-b1とphase-b4に重複するconfig-migrator.tsが存在

**対応**: Phase 2で統合版を作成し、vim/config/に配置

**Phase 4での対応**: integration/initializer.tsの参照をvim/config/に更新

### Phase 5への引き継ぎ事項
- vim/レイヤーが完成したので、main.tsでvim/の初期化処理を実装
- plugin/hellshake-yano-unified.vimの更新
- Vim/Neovim環境での動作確認

---

## 推定所要時間

| Process | 所要時間 |
|---------|---------|
| process1: 準備 | 0.5時間 |
| process2-5: コア機能（4ファイル） | 5.5時間 |
| process6-7: 表示システム（2ファイル） | 3時間 |
| process8-10: 高度機能（3ファイル） | 3.5時間 |
| process11-14: 設定とブリッジ（4ファイル） | 7時間 |
| process15: 統合テスト | 2時間 |
| process20: initializer.ts更新 | 0.5時間 |
| process100: リファクタリング | 1時間 |
| process200: ドキュメント | 1時間 |
| **合計** | **24時間（3日）** |

---

## リスクと対策

### リスク1: インポートパスの循環依存
- **対策**: 各processでdeno checkを実行し、早期発見

### リスク2: config-migrator.tsの統合ミス
- **対策**: phase-b1とphase-b4の差分を詳細に確認し、両方のテストケースを統合

### リスク3: popup-display.tsの抽出ミス（Neovim部分の削除）
- **対策**: unified-display.tsを詳細に読み取り、Vim部分のみを慎重に抽出

### リスク4: japanese.tsの依存関係エラー
- **対策**: neovim/core/word/word-segmenter.tsへの依存が正しく解決されることを確認
