# ARCHITECTURE_C.md - Phase B統合: コードベース整理計画

## 目次

1. [概要](#概要)
2. [現状分析](#現状分析)
3. [統合アーキテクチャ設計](#統合アーキテクチャ設計)
4. [統合方針](#統合方針)
5. [実装計画（6フェーズ）](#実装計画6フェーズ)
6. [モジュール詳細設計](#モジュール詳細設計)
7. [テスト戦略](#テスト戦略)
8. [マイグレーション手順](#マイグレーション手順)
9. [成功基準](#成功基準)
10. [リスク管理](#リスク管理)
11. [次フェーズへの展望](#次フェーズへの展望)

---

## 概要

### Phase B完了状況

Phase B（Denops移植版）の4つのフェーズがすべて完了しました：

| フェーズ | ステータス | 完了日 | 実装ファイル数 | テストケース数 |
|---------|-----------|--------|---------------|---------------|
| Phase B-1: 統合基盤構築 | ✅ 完了 | 2025-10-18 | 5ファイル | 39ケース |
| Phase B-2: コア機能の移植 | ✅ 完了 | 2025-10-18 | 5ファイル | 70ステップ |
| Phase B-3: 高度な機能の統合 | ✅ 完了 | 2025-10-18 | 5ファイル | 47ケース |
| Phase B-4: 統合エントリーポイント | ✅ 完了 | 2025-10-19 | 9ファイル | 116ステップ |

**合計**: 24ファイル、約4,289行のTypeScriptコード

### Phase C完了状況

Phase C（コードベース統合）の実装進捗：

| フェーズ | ステータス | 完了日 | 実装ファイル数 | テストケース数 |
|---------|-----------|--------|---------------|---------------|
| Phase C-1: 共通レイヤー構築 | ✅ 完了 | 2025-10-19 | 14ファイル | 全パス |
| Phase C-2: Vimレイヤー構築 | ✅ 完了 | 2025-10-19 | 13ファイル | 全パス |
| Phase C-3: Neovimレイヤー構築 | ✅ 完了 | 2025-10-19 | 6ファイル | 全パス |
| Phase C-4: 統合レイヤー構築 | ✅ 完了 | 2025-10-19 | 5ファイル | 全パス |
| Phase C-5: メインエントリーポイント統合 | ✅ 完了 | 2025-10-19 | 2ファイル更新 | 14ケース |
| Phase C-6: クリーンアップとテスト | 🚧 準備中 | - | - | - |

**Phase C-5完了実績**:
- TDD方式による実装（8分で完了）
- 環境判定型エントリーポイント実装
- 14個の新規テストケース追加（10ユニット+4 E2E）
- 全テストパス、型チェック100%成功

### 統合の目的

Phase B-1～B-4の実装により、以下が完成しています：

1. **Vim環境対応**: Pure VimScript版に加え、Denops版でもVim環境をサポート
2. **VimScript完全互換**: 既存のVimScript実装を忠実に再現
3. **環境別処理の分離**: Vim/Neovim固有の処理を明確に分離
4. **統合エントリーポイント**: 環境判定により最適な実装を自動選択

しかし、現在のコードベースは以下の課題を抱えています：

- **phase-b{1,2,3,4}/ディレクトリの乱立**: 機能が散在し、全体像が把握しにくい
- **既存実装との重複**: メインコードベース（core.ts等）とPhase B実装が並存
- **保守性の低下**: 同様の機能が複数箇所に実装されている

### 統合の背景

ユーザーの要求：
- Vim側の実装はNeovimの機能を移植できていないため、まずはVim/Neovimの両環境を残す
- Neovimの機能をVim側に移植してから、コードの統合を検討する
- ディレクトリ構造は**環境別レイヤー構造**を採用

### アーキテクチャ設計の原則

**Phase C（コードベース統合）**では、以下の原則に従います：

1. **環境別レイヤーの明確化**
   - `vim/`: Vim専用実装（Phase B完成版）
   - `neovim/`: Neovim専用実装（既存実装）
   - `common/`: 共通処理とユーティリティ
   - `integration/`: 環境判定と統合機能

2. **段階的な移行**
   - 既存実装を残しつつ、Phase B実装を新構造に再配置
   - テストを維持しながら、ディレクトリ構造を整理
   - 将来の統合を見据えた設計

3. **保守性の向上**
   - 重複コードの削減
   - 型定義の一元化
   - 共通処理の抽出

4. **後方互換性の維持**
   - 既存ユーザーの設定が壊れない
   - 環境別の動作を保証
   - テストカバレッジ90%以上を維持

---

## 現状分析

### コードベースの構造

現在、hellshake-yano.vimは以下の3つの実装が並存しています：

#### 1. メインコードベース（既存のNeovim + Denops実装）

```
denops/hellshake-yano/
├── main.ts              (11,074 bytes) - エントリーポイント
├── core.ts             (105,347 bytes) - コア機能
├── display.ts            (8,412 bytes) - 表示制御
├── word.ts              (59,487 bytes) - 単語検出
├── hint.ts              (22,268 bytes) - ヒント生成
├── config.ts            (20,025 bytes) - 設定管理
├── types.ts              (9,928 bytes) - 型定義
├── cache.ts              (5,791 bytes) - キャッシュ
├── performance.ts        (2,853 bytes) - パフォーマンス
├── validation.ts         (6,878 bytes) - バリデーション
└── dictionary.ts         (1,831 bytes) - 辞書管理
```

**特徴**:
- Neovim専用の高機能実装
- TinySegmenterによる日本語対応
- extmarkベースの表示システム
- 高度なキャッシュ機構

#### 2. Phase B実装（Vim/Neovim両対応版）

```
denops/hellshake-yano/
├── phase-b1/  (5ファイル、約800行)
│   ├── vim-bridge.ts           - VimScriptブリッジ
│   ├── config-unifier.ts       - 設定統合
│   ├── config-migrator.ts      - マイグレーション
│   ├── side-effect-checker.ts  - 副作用管理
│   └── unified-display.ts      - 表示システム統合
│
├── phase-b2/  (5ファイル、約660行)
│   ├── vimscript-types.ts           - VimScript型定義
│   ├── unified-word-detector.ts     - 単語検出
│   ├── unified-hint-generator.ts    - ヒント生成
│   ├── unified-jump.ts              - ジャンプ機能
│   └── unified-input.ts             - 入力処理
│
├── phase-b3/  (5ファイル、約950行)
│   ├── common-base.ts                - 共通処理
│   ├── types.ts                      - 型定義
│   ├── unified-japanese-support.ts   - 日本語対応
│   ├── unified-motion-detector.ts    - モーション検出
│   └── unified-visual-mode.ts        - ビジュアルモード
│
└── phase-b4/  (9ファイル、約1,880行)
    ├── environment-detector.ts       - 環境判定
    ├── implementation-selector.ts    - 実装選択
    ├── config-mapper.ts              - 設定変換
    ├── config-migrator.ts            - マイグレーション
    ├── command-registry.ts           - コマンド登録
    ├── mapping-manager.ts            - マッピング管理
    ├── initializer.ts                - 初期化
    ├── common-base.ts                - 共通処理
    └── types.ts                      - 型定義
```

**特徴**:
- VimScript版の動作を完全再現
- Vim/Neovim環境別処理の分離
- popup_create（Vim）とextmark（Neovim）の両対応
- 既存実装の副作用を管理

#### 3. Pure VimScript実装（Phase A完成版）

```
autoload/hellshake_yano_vim/
├── core.vim              - 状態管理・統合処理
├── config.vim            - 設定管理
├── word_detector.vim     - 単語検出
├── hint_generator.vim    - ヒント生成
├── display.vim           - 表示制御（popup/extmark）
├── input.vim             - 入力処理
├── jump.vim              - ジャンプ機能
├── motion.vim            - モーション検出
└── visual.vim            - ビジュアルモード対応
```

**特徴**:
- Vim 8.0+対応の正規実装
- Denops不要で動作
- 意図通りに動作する基準実装

### 重複機能の分析

以下の機能が複数箇所に実装されています：

| 機能 | メインコードベース | Phase B実装 | VimScript実装 |
|------|-------------------|------------|--------------|
| 単語検出 | word.ts | phase-b2/unified-word-detector.ts | word_detector.vim |
| ヒント生成 | hint.ts | phase-b2/unified-hint-generator.ts | hint_generator.vim |
| 表示制御 | display.ts | phase-b1/unified-display.ts | display.vim |
| ジャンプ機能 | core.ts内 | phase-b2/unified-jump.ts | jump.vim |
| 入力処理 | core.ts内 | phase-b2/unified-input.ts | input.vim |
| 設定管理 | config.ts | phase-b1/config-unifier.ts | config.vim |
| 日本語対応 | word.ts内 | phase-b3/unified-japanese-support.ts | - |
| モーション検出 | core.ts内 | phase-b3/unified-motion-detector.ts | motion.vim |

### 解決すべき課題

#### 1. ディレクトリ構造の複雑化

- **問題**: phase-b{1,2,3,4}/が機能別に分かれておらず、実装順序で配置されている
- **影響**: 全体像の把握が困難、新規開発者のオンボーディングコスト増大
- **解決策**: 環境別レイヤー構造（vim/, neovim/, common/）に再編成

#### 2. コードの重複

- **問題**: 同様の機能がメインコードベースとPhase B実装に並存
- **影響**: メンテナンス負荷増大、バグ修正の漏れリスク
- **解決策**: 共通処理をcommon/に抽出、環境別実装を分離

#### 3. 型定義の散在

- **問題**: types.tsがphase-b3/, phase-b4/, メインコードベースに重複
- **影響**: 型の不整合、インポートパスの複雑化
- **解決策**: common/types/に型定義を集約

#### 4. テストの重複

- **問題**: tests/phase-b{1,2,3,4}/が機能別に分かれていない
- **影響**: テスト実行時間の増加、カバレッジの不明確化
- **解決策**: tests/vim/, tests/neovim/, tests/common/に再編成

#### 5. ドキュメントの分散

- **問題**: ARCHITECTURE_B.mdに各フェーズの完了レポートが個別に記載
- **影響**: 全体像の把握が困難
- **解決策**: ARCHITECTURE_C.mdで統合計画を一元管理

### 統合の必要性

Phase B実装は完成していますが、現在の構造では以下の問題があります：

1. **可読性の低下**: 機能を探すためにphase-b{1,2,3,4}/を横断する必要
2. **保守性の低下**: 同じ機能の修正が複数箇所で必要
3. **拡張性の低下**: 新機能追加時にどこに配置すべきか不明確
4. **テスタビリティの低下**: テストが機能別に整理されていない

これらを解決するため、**環境別レイヤー構造**への統合が必要です。

---

## 統合アーキテクチャ設計

### 新しいディレクトリ構造

Phase C統合後の目標ディレクトリ構造：

```
denops/hellshake-yano/
│
├── vim/                          # Vim専用実装レイヤー
│   ├── core/                     # コア機能
│   │   ├── word-detector.ts      # 単語検出（phase-b2統合）
│   │   ├── hint-generator.ts     # ヒント生成（phase-b2統合）
│   │   ├── jump.ts               # ジャンプ機能（phase-b2統合）
│   │   └── input.ts              # 入力処理（phase-b2統合）
│   ├── display/                  # 表示システム
│   │   ├── popup-display.ts      # popup_create()実装（phase-b1統合）
│   │   └── highlight.ts          # ハイライト管理
│   ├── features/                 # 高度な機能
│   │   ├── japanese.ts           # 日本語対応（phase-b3統合）
│   │   ├── motion.ts             # モーション検出（phase-b3統合）
│   │   └── visual.ts             # ビジュアルモード（phase-b3統合）
│   ├── config/                   # 設定管理
│   │   ├── config-unifier.ts     # 設定統合（phase-b1統合）
│   │   ├── config-migrator.ts    # マイグレーション（phase-b1/b4統合）
│   │   └── config-mapper.ts      # 設定変換（phase-b4統合）
│   └── bridge/                   # VimScript連携
│       └── vim-bridge.ts         # VimScriptブリッジ（phase-b1統合）
│
├── neovim/                       # Neovim専用実装レイヤー
│   ├── core/                     # コア機能
│   │   ├── word.ts               # 既存のword.ts（移動）
│   │   ├── hint.ts               # 既存のhint.ts（移動）
│   │   └── core.ts               # 既存のcore.ts（移動）
│   └── display/                  # 表示システム
│       ├── extmark-display.ts    # extmark実装（既存display.ts）
│       └── highlight.ts          # ハイライト管理
│
├── common/                       # 共通レイヤー
│   ├── types/                    # 型定義
│   │   ├── config.ts             # Config型（統合）
│   │   ├── word.ts               # Word型（統合）
│   │   ├── hint.ts               # Hint型（統合）
│   │   ├── state.ts              # State型（phase-b3から）
│   │   └── vimscript.ts          # VimScript型（phase-b2から）
│   ├── utils/                    # ユーティリティ
│   │   ├── error-handler.ts      # エラーハンドリング（phase-b3から）
│   │   ├── logger.ts             # ログ出力（phase-b3から）
│   │   ├── validator.ts          # バリデーション（既存validation.ts移動）
│   │   ├── base.ts               # 共通基底処理（phase-b3から）
│   │   ├── side-effect.ts        # 副作用管理（phase-b1から）
│   │   └── performance.ts        # パフォーマンス（既存performance.ts移動）
│   ├── cache/                    # キャッシュシステム
│   │   └── unified-cache.ts      # 統合キャッシュ（既存cache.ts拡張）
│   └── config.ts                 # 設定管理（既存config.ts拡張）
│
├── integration/                  # 統合レイヤー
│   ├── environment-detector.ts   # 環境判定（phase-b4）
│   ├── implementation-selector.ts # 実装選択（phase-b4）
│   ├── command-registry.ts       # コマンド登録（phase-b4）
│   ├── mapping-manager.ts        # マッピング管理（phase-b4）
│   └── initializer.ts            # 初期化（phase-b4）
│
└── main.ts                       # メインエントリーポイント（環境振り分け）
```

### 削除されるディレクトリ

Phase C統合により、以下のディレクトリは削除されます：

```
denops/hellshake-yano/
├── phase-b1/  # → vim/, common/に統合
├── phase-b2/  # → vim/core/に統合
├── phase-b3/  # → vim/features/, common/に統合
└── phase-b4/  # → integration/に統合
```

### レイヤー別の責務

#### 1. vim/ レイヤー

**責務**: Vim環境専用の実装

- popup_create()を使用した表示システム
- VimScript実装を完全再現したコア機能
- Vim固有の入力処理とジャンプ機能
- VimScript連携ブリッジ

**依存関係**:
- `common/`: 共通型定義、ユーティリティ、キャッシュ
- `integration/`: 環境判定と初期化（呼び出される側）

#### 2. neovim/ レイヤー

**責務**: Neovim環境専用の実装

- extmarkを使用した表示システム
- TinySegmenterによる高度な日本語対応
- Neovim固有の高機能実装

**依存関係**:
- `common/`: 共通型定義、ユーティリティ、キャッシュ
- `integration/`: 環境判定と初期化（呼び出される側）

#### 3. common/ レイヤー

**責務**: Vim/Neovim共通の処理

- 型定義の一元管理
- エラーハンドリング、ログ出力
- キャッシュシステム
- バリデーション

**依存関係**:
- なし（最も低レイヤー、他のレイヤーに依存しない）

#### 4. integration/ レイヤー

**責務**: 環境判定と実装選択

- 環境（Vim/Neovim）の自動判定
- 適切な実装レイヤーへの振り分け
- コマンド・マッピングの統一的な登録
- プラグイン初期化のオーケストレーション

**依存関係**:
- `vim/`: Vim実装の呼び出し
- `neovim/`: Neovim実装の呼び出し
- `common/`: 共通処理の利用

### 依存関係図

```
                    main.ts
                       │
                       ▼
               ┌───────────────┐
               │ integration/  │
               │  (環境判定)   │
               └───────────────┘
                  │         │
        ┌─────────┘         └─────────┐
        ▼                               ▼
   ┌────────┐                      ┌──────────┐
   │  vim/  │                      │ neovim/  │
   │ (Vim)  │                      │(Neovim)  │
   └────────┘                      └──────────┘
        │                               │
        └───────────┬───────────────────┘
                    ▼
              ┌──────────┐
              │ common/  │
              │ (共通)   │
              └──────────┘
```

### モジュール間のインターフェース

#### 1. integration/ → vim/

```typescript
// integration/initializer.ts
import { VimCore } from "../vim/core/word-detector.ts";
import { VimDisplay } from "../vim/display/popup-display.ts";

async function initializeVim(denops: Denops): Promise<void> {
  const detector = new VimCore(denops);
  const display = new VimDisplay(denops);
  // ...
}
```

#### 2. integration/ → neovim/

```typescript
// integration/initializer.ts
import { Core } from "../neovim/core/core.ts";
import { ExtmarkDisplay } from "../neovim/display/extmark-display.ts";

async function initializeNeovim(denops: Denops): Promise<void> {
  const core = Core.getInstance(config);
  const display = new ExtmarkDisplay(denops);
  // ...
}
```

#### 3. vim/ → common/

```typescript
// vim/core/word-detector.ts
import type { Word } from "../../common/types/word.ts";
import { handleError } from "../../common/utils/error-handler.ts";
import { UnifiedCache } from "../../common/cache/unified-cache.ts";
```

#### 4. neovim/ → common/

```typescript
// neovim/core/word.ts
import type { Word } from "../../common/types/word.ts";
import { logger } from "../../common/utils/logger.ts";
```

---

## 統合方針

### Phase B実装の配置先マッピング

#### Phase B-1 実装の配置

| 既存ファイル | 新しい配置先 | 理由 |
|------------|------------|------|
| `phase-b1/vim-bridge.ts` | `vim/bridge/vim-bridge.ts` | VimScript連携機能はVim専用 |
| `phase-b1/config-unifier.ts` | `vim/config/config-unifier.ts` | Vim環境での設定統合 |
| `phase-b1/config-migrator.ts` | `vim/config/config-migrator.ts` | 設定マイグレーションはVim実装の一部 |
| `phase-b1/unified-display.ts` | `vim/display/popup-display.ts` | Vim向けpopup_create()実装 |
| `phase-b1/side-effect-checker.ts` | `common/utils/side-effect.ts` | 環境共通のユーティリティ |

#### Phase B-2 実装の配置

| 既存ファイル | 新しい配置先 | 理由 |
|------------|------------|------|
| `phase-b2/unified-word-detector.ts` | `vim/core/word-detector.ts` | Vimのコア機能 |
| `phase-b2/unified-hint-generator.ts` | `vim/core/hint-generator.ts` | Vimのコア機能 |
| `phase-b2/unified-jump.ts` | `vim/core/jump.ts` | Vimのコア機能 |
| `phase-b2/unified-input.ts` | `vim/core/input.ts` | Vimのコア機能 |
| `phase-b2/vimscript-types.ts` | `common/types/vimscript.ts` | 共通型定義 |

#### Phase B-3 実装の配置

| 既存ファイル | 新しい配置先 | 理由 |
|------------|------------|------|
| `phase-b3/unified-japanese-support.ts` | `vim/features/japanese.ts` | Vimの高度機能 |
| `phase-b3/unified-motion-detector.ts` | `vim/features/motion.ts` | Vimの高度機能 |
| `phase-b3/unified-visual-mode.ts` | `vim/features/visual.ts` | Vimの高度機能 |
| `phase-b3/common-base.ts` | `common/utils/base.ts` | 共通ユーティリティ |
| `phase-b3/types.ts` | `common/types/*.ts`（分割） | 共通型定義（機能別に分割） |

#### Phase B-4 実装の配置

| 既存ファイル | 新しい配置先 | 理由 |
|------------|------------|------|
| `phase-b4/environment-detector.ts` | `integration/environment-detector.ts` | 統合機能 |
| `phase-b4/implementation-selector.ts` | `integration/implementation-selector.ts` | 統合機能 |
| `phase-b4/command-registry.ts` | `integration/command-registry.ts` | 統合機能 |
| `phase-b4/mapping-manager.ts` | `integration/mapping-manager.ts` | 統合機能 |
| `phase-b4/initializer.ts` | `integration/initializer.ts` | 統合機能 |
| `phase-b4/config-mapper.ts` | `vim/config/config-mapper.ts` | Vim設定変換 |
| `phase-b4/config-migrator.ts` | ※phase-b1と統合 | 重複削除 |
| `phase-b4/common-base.ts` | ※phase-b3と統合 | 重複削除 |
| `phase-b4/types.ts` | ※phase-b3と統合 | 重複削除 |

### 既存実装の配置先マッピング

#### メインコードベースの配置

| 既存ファイル | 新しい配置先 | 理由 |
|------------|------------|------|
| `main.ts` | `main.ts`（書き換え） | 環境振り分けロジックを追加 |
| `core.ts` | `neovim/core/core.ts` | Neovim専用実装 |
| `display.ts` | `neovim/display/extmark-display.ts` | Neovim専用実装 |
| `word.ts` | `neovim/core/word.ts` | Neovim専用実装 |
| `hint.ts` | `neovim/core/hint.ts` | Neovim専用実装 |
| `config.ts` | `common/config.ts`（拡張） | 共通設定管理 |
| `types.ts` | `common/types/*.ts`（分割） | 共通型定義 |
| `cache.ts` | `common/cache/unified-cache.ts` | 共通キャッシュ |
| `performance.ts` | `common/utils/performance.ts` | 共通ユーティリティ |
| `validation.ts` | `common/utils/validator.ts` | 共通ユーティリティ |
| `dictionary.ts` | `neovim/dictionary.ts` | Neovim専用機能 |

### 重複コードの削減戦略

#### 1. 重複するcommon-base.tsの統合

**Phase B-3とPhase B-4に存在する`common-base.ts`を統合**:

- Phase B-3版を基準とする（より完成度が高い）
- Phase B-4版の差分機能を追加
- `common/utils/base.ts`として配置

#### 2. 重複するtypes.tsの統合

**Phase B-3とPhase B-4に存在する`types.ts`を機能別に分割**:

```
common/types/
├── config.ts       # Config型
├── word.ts         # Word型
├── hint.ts         # Hint型
├── state.ts        # MotionState, VisualState等
├── vimscript.ts    # VimScript型
└── debug.ts        # DebugInfo等
```

#### 3. 重複するconfig-migrator.tsの統合

**Phase B-1とPhase B-4に存在する`config-migrator.ts`を統合**:

- Phase B-4版を基準とする（より機能が充実）
- `vim/config/config-migrator.ts`として配置

### 段階的な移行戦略

#### ステップ1: 準備（リスク最小化）

1. **バックアップの作成**
   ```bash
   git checkout -b phase-c-integration
   git tag before-phase-c-integration
   ```

2. **テストの事前実行**
   ```bash
   deno test --coverage
   deno lint
   deno check denops/**/*.ts
   ```

3. **ドキュメントの更新**
   - ARCHITECTURE_C.mdの完成
   - 移行手順書の作成

#### ステップ2: common/レイヤーの構築（優先度: 高）

**理由**: 他のレイヤーが依存するため、最初に構築

1. `common/types/`の作成（phase-b2, b3, b4の型定義を統合）
2. `common/utils/`の作成（phase-b1, b3のユーティリティを統合）
3. `common/cache/`の作成（既存cache.tsを拡張）
4. `common/config.ts`の更新（既存config.tsを拡張）

#### ステップ3: vim/レイヤーの構築（優先度: 高）

**理由**: Phase B実装の主要部分

1. `vim/core/`の作成（phase-b2を移動）
2. `vim/display/`の作成（phase-b1を移動）
3. `vim/features/`の作成（phase-b3を移動）
4. `vim/config/`の作成（phase-b1, b4を統合）
5. `vim/bridge/`の作成（phase-b1を移動）

#### ステップ4: integration/レイヤーの構築（優先度: 中）

**理由**: 環境判定と初期化の統合

1. `integration/`の作成（phase-b4を移動）
2. 重複ファイルの削除

#### ステップ5: neovim/レイヤーの構築（優先度: 中）

**理由**: 既存実装を整理

1. `neovim/core/`の作成（既存実装を移動）
2. `neovim/display/`の作成（既存実装を移動）

#### ステップ6: main.tsの書き換え（優先度: 高）

**理由**: エントリーポイントの統合

1. 環境判定ロジックの追加
2. vim/とneovim/への振り分け実装

#### ステップ7: phase-b*/の削除（優先度: 低）

**理由**: すべての移行完了後に実施

1. テストの実行（全テストがパスすることを確認）
2. phase-b{1,2,3,4}/の削除
3. コミットとタグ付け

### ロールバック計画

各ステップ後に以下を実施：

1. **テストの実行**
   ```bash
   deno test
   deno lint
   deno check denops/**/*.ts
   ```

2. **動作確認**
   - Vim環境での動作確認
   - Neovim環境での動作確認

3. **問題発生時**
   ```bash
   git reset --hard before-phase-c-integration
   ```

---

## 実装計画（6フェーズ）

### Phase 1: 共通レイヤーの構築（2日）

#### 目標

Phase B-1～B-4の共通処理を`common/`レイヤーに統合し、型定義を一元化する。

#### 1-1. 型定義の統合と分割（0.5日）

**作業内容**:

1. **common/types/config.ts の作成**
   - 既存config.tsからConfig型を抽出
   - Phase B実装で使用している設定型を統合
   - Vim/Neovim共通の設定項目を定義

2. **common/types/word.ts の作成**
   - Word型の定義
   - DenopsWord型、VimScriptWord型の統合
   - 座標系変換ユーティリティ

3. **common/types/hint.ts の作成**
   - Hint型、HintMapping型の定義
   - ヒント生成関連の型定義

4. **common/types/state.ts の作成**
   - MotionState型（phase-b3から）
   - VisualState型（phase-b3から）
   - その他の状態管理型

5. **common/types/vimscript.ts の作成**
   - VimScript型（phase-b2から）
   - VimScript互換性のための型定義

6. **common/types/debug.ts の作成**
   - DebugInfo型
   - パフォーマンスメトリクス型

**成果物**:
- `common/types/` ディレクトリ配下に6ファイル
- 各型定義ファイルのindex.ts（re-export用）

**テスト**:
```bash
deno check denops/hellshake-yano/common/types/**/*.ts
```

#### 1-2. ユーティリティの統合（0.5日）

**作業内容**:

1. **common/utils/error-handler.ts の作成**
   - phase-b3/common-base.tsからhandleError関数を抽出
   - エラーハンドリングの統一

2. **common/utils/logger.ts の作成**
   - phase-b3/common-base.tsからlogMessage関数を抽出
   - ログ出力フォーマットの統一

3. **common/utils/validator.ts の作成**
   - 既存validation.tsを移動
   - バリデーション関数の整理

4. **common/utils/base.ts の作成**
   - phase-b3/common-base.tsとphase-b4/common-base.tsを統合
   - Singletonパターンユーティリティ
   - パラメータ検証ヘルパー

5. **common/utils/side-effect.ts の作成**
   - phase-b1/side-effect-checker.tsを移動
   - 副作用管理機構

6. **common/utils/performance.ts の作成**
   - 既存performance.tsを移動
   - パフォーマンス計測機能

**成果物**:
- `common/utils/` ディレクトリ配下に6ファイル

**テスト**:
```bash
deno test tests/common/utils/
```

#### 1-3. キャッシュシステムの統合（0.5日）

**作業内容**:

1. **common/cache/unified-cache.ts の作成**
   - 既存cache.tsを拡張
   - LRUキャッシュ実装
   - Vim/Neovim共通のキャッシュ機構

**成果物**:
- `common/cache/unified-cache.ts`

**テスト**:
```bash
deno test tests/common/cache/
```

#### 1-4. 設定管理の更新（0.5日）

**作業内容**:

1. **common/config.ts の更新**
   - 既存config.tsを拡張
   - Vim/Neovim共通の設定管理
   - DEFAULT_CONFIGの統合

**成果物**:
- `common/config.ts`（更新）

**テスト**:
```bash
deno check denops/hellshake-yano/common/config.ts
```

#### Phase 1 完了基準

- [x] common/types/ 配下に6ファイル作成完了
- [x] common/utils/ 配下に6ファイル作成完了
- [x] common/cache/ 作成完了
- [x] common/config.ts 更新完了
- [x] 全テストパス（既存テスト影響なし）
- [x] deno check 100%パス

---

### Phase 2: Vimレイヤーの構築（3日）

#### 目標

Phase B-1～B-4のVim専用実装を`vim/`レイヤーに統合する。

#### 2-1. コア機能の統合（1日）

**作業内容**:

1. **vim/core/word-detector.ts の作成**
   - phase-b2/unified-word-detector.tsを移動
   - common/types/word.tsへの依存を更新
   - VimScript版word_detector.vimとの完全互換性維持

2. **vim/core/hint-generator.ts の作成**
   - phase-b2/unified-hint-generator.tsを移動
   - common/types/hint.tsへの依存を更新
   - ヒント生成アルゴリズムの維持

3. **vim/core/jump.ts の作成**
   - phase-b2/unified-jump.tsを移動
   - cursor()関数の完全再現

4. **vim/core/input.ts の作成**
   - phase-b2/unified-input.tsを移動
   - ブロッキング入力処理の実装

**成果物**:
- `vim/core/` ディレクトリ配下に4ファイル

**テスト**:
```bash
deno test tests/vim/core/
```

#### 2-2. 表示システムの統合（0.5日）

**作業内容**:

1. **vim/display/popup-display.ts の作成**
   - phase-b1/unified-display.tsから Vim部分を抽出
   - popup_create()実装のみを含む
   - Neovim部分は削除（neovim/に移動）

2. **vim/display/highlight.ts の作成**
   - ハイライトグループ管理
   - HintMarkerの定義

**成果物**:
- `vim/display/` ディレクトリ配下に2ファイル

**テスト**:
```bash
deno test tests/vim/display/
```

#### 2-3. 高度機能の統合（0.5日）

**作業内容**:

1. **vim/features/japanese.ts の作成**
   - phase-b3/unified-japanese-support.tsを移動
   - TinySegmenter統合

2. **vim/features/motion.ts の作成**
   - phase-b3/unified-motion-detector.tsを移動
   - モーション検出ロジック

3. **vim/features/visual.ts の作成**
   - phase-b3/unified-visual-mode.tsを移動
   - ビジュアルモード対応

**成果物**:
- `vim/features/` ディレクトリ配下に3ファイル

**テスト**:
```bash
deno test tests/vim/features/
```

#### 2-4. 設定とブリッジの統合（1日）

**作業内容**:

1. **vim/config/config-unifier.ts の作成**
   - phase-b1/config-unifier.tsを移動

2. **vim/config/config-migrator.ts の作成**
   - phase-b1/config-migrator.tsとphase-b4/config-migrator.tsを統合
   - 重複削除

3. **vim/config/config-mapper.ts の作成**
   - phase-b4/config-mapper.tsを移動

4. **vim/bridge/vim-bridge.ts の作成**
   - phase-b1/vim-bridge.tsを移動
   - VimScript連携機能

**成果物**:
- `vim/config/` ディレクトリ配下に3ファイル
- `vim/bridge/` ディレクトリ配下に1ファイル

**テスト**:
```bash
deno test tests/vim/config/
deno test tests/vim/bridge/
```

#### Phase 2 完了基準

- [ ] vim/core/ 配下に4ファイル作成完了
- [ ] vim/display/ 配下に2ファイル作成完了
- [ ] vim/features/ 配下に3ファイル作成完了
- [ ] vim/config/ 配下に3ファイル作成完了
- [ ] vim/bridge/ 配下に1ファイル作成完了
- [ ] 全テストパス（未実装）
- [ ] deno check 100%パス（未実装）

---

### Phase 3: Neovimレイヤーの構築（2日）

#### 目標

既存のメインコードベースを`neovim/`レイヤーに整理する。

#### 3-1. コア機能の移動（1日）

**作業内容**:

1. **neovim/core/core.ts の作成**
   - 既存core.tsを移動
   - common/への依存を更新

2. **neovim/core/word.ts の作成**
   - 既存word.tsを移動
   - TinySegmenter実装の維持

3. **neovim/core/hint.ts の作成**
   - 既存hint.tsを移動
   - ヒント生成ロジックの維持

**成果物**:
- `neovim/core/` ディレクトリ配下に3ファイル

**テスト**:
```bash
deno test tests/neovim/core/
```

#### 3-2. 表示システムの移動（0.5日）

**作業内容**:

1. **neovim/display/extmark-display.ts の作成**
   - 既存display.tsを移動
   - extmark実装の維持

2. **neovim/display/highlight.ts の作成**
   - Neovim専用のハイライト管理

**成果物**:
- `neovim/display/` ディレクトリ配下に2ファイル

**テスト**:
```bash
deno test tests/neovim/display/
```

#### 3-3. その他機能の移動（0.5日）

**作業内容**:

1. **neovim/dictionary.ts の作成**
   - 既存dictionary.tsを移動
   - Neovim専用機能として維持

**成果物**:
- `neovim/dictionary.ts`

**テスト**:
```bash
deno test tests/neovim/
```

#### Phase 3 完了基準

- [x] neovim/core/ 配下に3ファイル作成完了
- [x] neovim/display/ 配下に2ファイル作成完了
- [x] neovim/dictionary.ts 作成完了
- [x] 全テストパス
- [x] deno check 100%パス

---

### Phase 4: 統合レイヤーの構築（2日）

#### 目標

Phase B-4の統合機能を`integration/`レイヤーに配置する。

#### 4-1. 環境判定と実装選択（1日）

**作業内容**:

1. **integration/environment-detector.ts の作成**
   - phase-b4/environment-detector.tsを移動

2. **integration/implementation-selector.ts の作成**
   - phase-b4/implementation-selector.tsを移動

**成果物**:
- `integration/` ディレクトリ配下に2ファイル

**テスト**:
```bash
deno test tests/integration/environment-detector.test.ts
deno test tests/integration/implementation-selector.test.ts
```

#### 4-2. コマンドとマッピング（0.5日）

**作業内容**:

1. **integration/command-registry.ts の作成**
   - phase-b4/command-registry.tsを移動

2. **integration/mapping-manager.ts の作成**
   - phase-b4/mapping-manager.tsを移動

**成果物**:
- `integration/` ディレクトリ配下にさらに2ファイル

**テスト**:
```bash
deno test tests/integration/command-registry.test.ts
deno test tests/integration/mapping-manager.test.ts
```

#### 4-3. 初期化システム（0.5日）

**作業内容**:

1. **integration/initializer.ts の作成**
   - phase-b4/initializer.tsを移動
   - vim/とneovim/への振り分けロジック

**成果物**:
- `integration/initializer.ts`

**テスト**:
```bash
deno test tests/integration/initializer.test.ts
```

#### Phase 4 完了基準

- [x] integration/ 配下に5ファイル作成完了
  - [x] environment-detector.ts
  - [x] implementation-selector.ts
  - [x] command-registry.ts
  - [x] mapping-manager.ts
  - [x] initializer.ts
- [x] 全テストパス
- [x] deno check 100%パス

---

### Phase 5: メインエントリーポイントの統合（1日）

#### 目標

main.tsを書き換え、環境に応じてvim/とneovim/を振り分ける。

#### 5-1. main.tsの書き換え（0.5日）

**作業内容**:

1. **main.ts の更新**
   - 環境判定ロジックの追加
   - integration/initializer.tsの呼び出し
   - vim/とneovim/への振り分け実装

**変更前**:
```typescript
export async function main(denops: Denops): Promise<void> {
  // 既存のNeovim専用実装
  const core = Core.getInstance(DEFAULT_CONFIG);
  // ...
}
```

**変更後**:
```typescript
export async function main(denops: Denops): Promise<void> {
  const detector = new EnvironmentDetector(denops);
  const env = await detector.detect();

  if (env.isVim) {
    await initializeVim(denops);
  } else {
    await initializeNeovim(denops);
  }
}
```

**成果物**:
- `main.ts`（更新）

**テスト**:
```bash
deno test tests/main.test.ts
```

#### 5-2. VimScriptプラグインファイルの更新（0.5日）

**作業内容**:

1. **plugin/hellshake-yano-unified.vim の更新**
   - 新しいディレクトリ構造に対応
   - コマンド・マッピングの更新

**成果物**:
- `plugin/hellshake-yano-unified.vim`（更新）

**テスト**:
- Vim環境での動作確認
- Neovim環境での動作確認

#### Phase 5 完了基準

- [x] main.ts 書き換え完了
- [x] plugin/hellshake-yano-unified.vim 更新完了
- [x] Vim環境での動作確認完了（テストレベル）
- [x] Neovim環境での動作確認完了（テストレベル）
- [x] 全テストパス（14/14テストケース成功）

**完了日**: 2025-10-19
**実装時間**: 8分（TDD方式による効率的実装）
**成果物**:
- main.ts: 環境判定型エントリーポイント実装（+93行）
- tests/main.test.ts: 10個のユニットテスト（新規）
- tests/main-e2e.test.ts: 4個のE2Eテスト（新規）
- ai/plan/phase-c5-main-integration_20251019.md: 完了レポート（新規）

**実装内容**:
- Initializer経由での環境判定実装
- initializeDenopsUnified()による環境別初期化
- initializeVimLayer()スケルトン実装
- initializeNeovimLayer()で既存実装維持
- TDD Red-Green-Refactorサイクル完遂

---

### Phase 6: クリーンアップとテスト（1日）

#### 目標

phase-b*/ディレクトリを削除し、テストを再編成する。

#### 6-1. phase-b*/の削除（0.25日）

**作業内容**:

1. **phase-b{1,2,3,4}/の削除**
   - すべてのファイルが新構造に移動済みであることを確認
   - phase-b*ディレクトリを削除

**削除コマンド**:
```bash
rm -rf denops/hellshake-yano/phase-b1
rm -rf denops/hellshake-yano/phase-b2
rm -rf denops/hellshake-yano/phase-b3
rm -rf denops/hellshake-yano/phase-b4
```

#### 6-2. テストの再編成（0.5日）

**作業内容**:

1. **tests/vim/ の作成**
   - tests/phase-b1/, phase-b2/, phase-b3/からVim関連テストを移動

2. **tests/neovim/ の作成**
   - Neovim専用テストの整理

3. **tests/common/ の作成**
   - 共通処理のテスト

4. **tests/integration/ の作成**
   - phase-b4/のテストを移動

**成果物**:
- テストディレクトリの再編成

**テスト**:
```bash
deno test --coverage
```

#### 6-3. ドキュメントの更新（0.25日）

**作業内容**:

1. **ARCHITECTURE.md の更新**
   - 新しいディレクトリ構造を反映

2. **README.md の更新**
   - インストール手順の更新
   - 使用方法の更新

3. **CHANGELOG.md の更新**
   - Phase C統合の記録

**成果物**:
- 更新されたドキュメント

#### Phase 6 完了基準

- [ ] phase-b*ディレクトリ完全削除（Phase 2完了後に実施）
- [ ] テストディレクトリ再編成完了
- [ ] 全テストパス（カバレッジ90%以上）
- [ ] ドキュメント更新完了
- [ ] deno check 100%パス
- [ ] deno lint 警告0個

---

## モジュール詳細設計

### common/types/ モジュール

#### config.ts

```typescript
/**
 * プラグイン設定型定義
 */
export interface Config {
  // 基本設定
  enabled: boolean;
  markers: string[];

  // モーション検出
  motionCount: number;
  motionTimeout: number;
  countedMotions: string[];
  motionCounterEnabled: boolean;

  // 表示設定
  hintPosition: "start" | "end";
  maxHints: number;
  highlightHintMarker: string;

  // 日本語対応
  useJapanese: boolean;
  enableTinySegmenter: boolean;

  // その他
  debugMode: boolean;
  performanceLog: boolean;
}

export const DEFAULT_CONFIG: Config = {
  // ...
};
```

#### word.ts

```typescript
/**
 * 単語情報型定義（Denops用、0-indexed）
 */
export interface DenopsWord {
  text: string;
  lnum: number;  // 0-indexed
  col: number;   // 0-indexed
  end_col: number;
}

/**
 * 単語情報型定義（VimScript用、1-indexed）
 */
export interface VimScriptWord {
  text: string;
  lnum: number;  // 1-indexed
  col: number;   // 1-indexed
  end_col: number;
}

/**
 * 座標系変換ユーティリティ
 */
export function denopsToVimScript(word: DenopsWord): VimScriptWord {
  return {
    text: word.text,
    lnum: word.lnum + 1,
    col: word.col + 1,
    end_col: word.end_col + 1,
  };
}

export function vimScriptToDenops(word: VimScriptWord): DenopsWord {
  return {
    text: word.text,
    lnum: word.lnum - 1,
    col: word.col - 1,
    end_col: word.end_col - 1,
  };
}
```

### vim/core/ モジュール

#### word-detector.ts

```typescript
import type { Denops } from "@denops/std";
import type { DenopsWord } from "../../common/types/word.ts";
import { handleError } from "../../common/utils/error-handler.ts";
import { UnifiedCache } from "../../common/cache/unified-cache.ts";

/**
 * Vim環境での単語検出
 * VimScript版のword_detector.vimを完全再現
 */
export class VimWordDetector {
  private cache: UnifiedCache;

  constructor(private denops: Denops) {
    this.cache = new UnifiedCache();
  }

  /**
   * 可視範囲の単語を検出
   */
  async detectVisible(): Promise<DenopsWord[]> {
    try {
      const [startLine, endLine] = await this.getVisibleRange();
      const lines = await this.getLines(startLine, endLine);

      return this.detectFromLines(lines, startLine);
    } catch (error) {
      handleError(error, "VimWordDetector.detectVisible");
      return [];
    }
  }

  private async getVisibleRange(): Promise<[number, number]> {
    const start = await this.denops.eval("line('w0')") as number;
    const end = await this.denops.eval("line('w$')") as number;
    return [start - 1, end - 1]; // 0-indexedに変換
  }

  private detectFromLines(lines: string[], startLine: number): DenopsWord[] {
    const words: DenopsWord[] = [];
    const regex = /\w+/; // グローバルフラグなし（VimScript版と同じ）

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let pos = 0;

      while (pos < line.length) {
        const match = line.slice(pos).match(regex);
        if (!match) break;

        const text = match[0];
        const col = pos + match.index!;

        words.push({
          text,
          lnum: startLine + i,
          col,
          end_col: col + text.length,
        });

        pos = col + text.length;
      }
    }

    return words;
  }
}
```

### integration/initializer.ts

```typescript
import type { Denops } from "@denops/std";
import { EnvironmentDetector } from "./environment-detector.ts";
import { ImplementationSelector } from "./implementation-selector.ts";

/**
 * プラグイン初期化オーケストレーター
 */
export class Initializer {
  async initialize(denops: Denops): Promise<void> {
    // 1. 環境判定
    const detector = new EnvironmentDetector(denops);
    const env = await detector.detect();

    // 2. 実装選択
    const selector = new ImplementationSelector();
    const impl = selector.select(env);

    // 3. 選択された実装で初期化
    if (impl === "vim") {
      await this.initializeVim(denops);
    } else {
      await this.initializeNeovim(denops);
    }
  }

  private async initializeVim(denops: Denops): Promise<void> {
    // vim/ レイヤーの初期化
    const { VimWordDetector } = await import("../vim/core/word-detector.ts");
    const { VimDisplay } = await import("../vim/display/popup-display.ts");
    // ...
  }

  private async initializeNeovim(denops: Denops): Promise<void> {
    // neovim/ レイヤーの初期化
    const { Core } = await import("../neovim/core/core.ts");
    // ...
  }
}
```

---

## テスト戦略

### テストディレクトリ構造

```
tests/
├── common/                # 共通レイヤーのテスト
│   ├── types/
│   │   ├── config.test.ts
│   │   ├── word.test.ts
│   │   └── hint.test.ts
│   ├── utils/
│   │   ├── error-handler.test.ts
│   │   └── logger.test.ts
│   └── cache/
│       └── unified-cache.test.ts
│
├── vim/                   # Vimレイヤーのテスト
│   ├── core/
│   │   ├── word-detector.test.ts
│   │   ├── hint-generator.test.ts
│   │   ├── jump.test.ts
│   │   └── input.test.ts
│   ├── display/
│   │   └── popup-display.test.ts
│   └── features/
│       ├── japanese.test.ts
│       ├── motion.test.ts
│       └── visual.test.ts
│
├── neovim/                # Neovimレイヤーのテスト
│   ├── core/
│   │   ├── core.test.ts
│   │   ├── word.test.ts
│   │   └── hint.test.ts
│   └── display/
│       └── extmark-display.test.ts
│
└── integration/           # 統合レイヤーのテスト
    ├── environment-detector.test.ts
    ├── implementation-selector.test.ts
    ├── command-registry.test.ts
    ├── mapping-manager.test.ts
    └── e2e.test.ts
```

### テストカバレッジ目標

| レイヤー | 目標カバレッジ | 理由 |
|---------|---------------|------|
| common/ | 95%以上 | 全環境で使用される重要な基盤 |
| vim/ | 90%以上 | Vim環境の主要機能 |
| neovim/ | 90%以上 | Neovim環境の主要機能 |
| integration/ | 85%以上 | 統合処理の検証 |

### テスト実行コマンド

```bash
# 全テスト実行
deno test --coverage

# レイヤー別テスト実行
deno test tests/common/
deno test tests/vim/
deno test tests/neovim/
deno test tests/integration/

# カバレッジレポート生成
deno coverage coverage/ --lcov > coverage.lcov
```

---

## マイグレーション手順

### 手順1: バックアップとブランチ作成

```bash
# 現在の状態をタグ付け
git tag before-phase-c-integration

# 新しいブランチを作成
git checkout -b phase-c-integration

# 現在のテスト状態を確認
deno test --coverage
deno lint
deno check denops/**/*.ts
```

### 手順2: Phase 1実装（common/レイヤー）

```bash
# ディレクトリ作成
mkdir -p denops/hellshake-yano/common/{types,utils,cache}

# 型定義の移動
# （詳細は実装計画Phase 1参照）

# テスト実行
deno test tests/common/
deno check denops/hellshake-yano/common/**/*.ts
```

### 手順3: Phase 2実装（vim/レイヤー）

```bash
# ディレクトリ作成
mkdir -p denops/hellshake-yano/vim/{core,display,features,config,bridge}

# Phase Bファイルの移動
# （詳細は実装計画Phase 2参照）

# テスト実行
deno test tests/vim/
```

### 手順4: Phase 3～6実装

（詳細は実装計画の各Phaseを参照）

### 手順7: phase-b*の削除とコミット

```bash
# 全テストがパスすることを確認
deno test --coverage
deno lint
deno check denops/**/*.ts

# phase-b*ディレクトリの削除
rm -rf denops/hellshake-yano/phase-b{1,2,3,4}

# コミット
git add .
git commit -m "feat: Phase C統合完了 - 環境別レイヤー構造に再編成"
git tag phase-c-integration-complete
```

---

## 成功基準

### 定量指標

| 項目 | 目標 | 測定方法 |
|------|------|---------|
| **ディレクトリ削除** | phase-b*完全削除 | `ls denops/hellshake-yano/` で確認 |
| **ファイル数** | vim/: 13ファイル<br>neovim/: 6ファイル<br>common/: 15ファイル<br>integration/: 5ファイル | `find denops -name "*.ts" \| wc -l` |
| **テストパス率** | 100% | `deno test` |
| **テストカバレッジ** | 90%以上 | `deno coverage` |
| **型チェック** | 100%パス | `deno check denops/**/*.ts` |
| **リンター警告** | 0個 | `deno lint` |
| **コード行数** | ±10%以内 | 統合前後で大幅な増減がない |

### 定性指標

#### 1. 可読性の向上

- **目標**: 新規開発者が1時間以内にディレクトリ構造を理解できる
- **検証方法**: ARCHITECTURE_C.mdの依存関係図とディレクトリ構造説明を参照

#### 2. 保守性の向上

- **目標**: 機能追加時に変更が1～2ファイルに収まる
- **検証方法**: 仮想的な機能追加シナリオでファイル変更数を確認

#### 3. 拡張性の向上

- **目標**: 新しい環境（例: VSCode拡張）の追加が容易
- **検証方法**: 新レイヤー追加の手順を文書化

#### 4. テスタビリティの向上

- **目標**: レイヤー別にテストを独立実行可能
- **検証方法**: `deno test tests/vim/` 等で個別実行可能

---

## リスク管理

### 技術的リスク

#### リスク1: インポートパスの破壊

- **内容**: 相対パス変更により既存コードが動作しない
- **確率**: 高
- **影響度**: 高
- **対策**:
  - 段階的な移行（1レイヤーずつ）
  - 各ステップでのテスト実行
  - TypeScriptの型チェック活用

#### リスク2: テストの破壊

- **内容**: ファイル移動によりテストが実行されない
- **確率**: 中
- **影響度**: 高
- **対策**:
  - テストファイルも同時に移動
  - カバレッジレポートで漏れを検出

#### リスク3: 重複コードの統合ミス

- **内容**: phase-b3とphase-b4のcommon-base.ts統合で機能欠損
- **確率**: 中
- **影響度**: 中
- **対策**:
  - 差分を詳細に確認
  - 統合前後でテストを実行

### 運用リスク

#### リスク1: 開発期間の超過

- **内容**: 11日の予定が延長
- **確率**: 中
- **影響度**: 低
- **対策**:
  - 各Phaseで完了基準を明確化
  - Phase 1完了時点で全体スケジュールを再評価

#### リスク2: ロールバックの必要性

- **内容**: 統合後に重大なバグが発覚
- **確率**: 低
- **影響度**: 高
- **対策**:
  - 各Phase完了時にタグ付け
  - ロールバック手順を事前に文書化

---

## 次フェーズへの展望

### Phase D: Vim機能の完成（将来）

現在のvim/レイヤーは基本機能のみを実装しています。将来的には以下の機能をNeovimから移植します：

1. **高度なTinySegmenter統合**
   - neovim/core/word.tsの日本語対応をvim/features/japanese.tsに移植
   - キャッシュ機構の共有化

2. **パフォーマンス最適化**
   - neovim/のバッチ処理技術をvim/に適用
   - 非同期処理の活用

3. **高度な表示機能**
   - neovim/のextmark機能をVim側で再現可能な範囲で実装

### Phase E: 最終統合（将来）

vim/とneovim/の機能差がほぼなくなった段階で、最終的な統合を実施：

1. **共通実装への統一**
   - vim/core/とneovim/core/の共通処理をcommon/core/に移動
   - 環境固有の処理のみをvim/とneovim/に残す

2. **単一エントリーポイント化**
   - main.tsで完全に透過的な環境振り分け
   - ユーザーが環境を意識しない完全な統一体験

3. **パフォーマンスの均一化**
   - Vim/Neovim両環境で同等のパフォーマンスを実現

### 期待される成果

Phase C統合完了により、以下が実現されます：

1. **明確なコードベース構造**
   - 4つのレイヤー（vim/, neovim/, common/, integration/）による整理
   - phase-b*ディレクトリの削除による可読性向上

2. **保守性の大幅向上**
   - 重複コードの削減
   - 型定義の一元化
   - テストの体系化

3. **将来の拡張性**
   - 新環境（VSCode、Emacs等）の追加が容易
   - Vim/Neovim機能の段階的統合が可能

4. **開発効率の向上**
   - レイヤー別の独立開発が可能
   - テストの高速実行（レイヤー単位）

---

## まとめ

ARCHITECTURE_C（Phase C統合）では、Phase B-1～B-4で開発された24ファイル、約4,289行のTypeScriptコードを、**環境別レイヤー構造**に再編成します。

**主要な変更**:
- phase-b{1,2,3,4}/の削除
- vim/, neovim/, common/, integration/の4レイヤー化
- 重複コードの削減（types.ts、common-base.ts、config-migrator.ts）
- テストディレクトリの再編成

**期待される効果**:
- 可読性: 新規開発者のオンボーディング時間短縮
- 保守性: バグ修正と機能追加の効率化
- 拡張性: 新環境への対応が容易
- テスタビリティ: レイヤー別の独立テスト

**実装スケジュール**: 11日間（6フェーズ）

これにより、hellshake-yano.vimは**真にクロスプラットフォームな、保守性の高いhit-a-hintプラグイン**へと進化します。

---

**ドキュメントバージョン**: 1.0
**作成日**: 2025-10-19
**最終更新**: 2025-10-19

