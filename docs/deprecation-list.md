# 削除対象ファイル・コード一覧

## 概要

hellshake-yano.vim v3.0.0リリースに向けて、以下のファイル、インターフェース、関数が削除予定です。このドキュメントは、開発者とメンテナーが計画的に削除作業を進めるためのチェックリストとして機能します。

## 🗂️ 削除対象ディレクトリ（Process4 Sub1）

### 使用頻度の低いディレクトリ

| ディレクトリ | 理由 | 削除予定バージョン | 影響度 |
|-------------|------|------------------|-------|
| `denops/hellshake-yano/dictionary/` | 1ファイルのみ、機能統合済み | v3.0.0 | 低 |
| `denops/hellshake-yano/display/` | 1ファイルのみ、機能統合済み | v3.0.0 | 低 |
| `denops/hellshake-yano/input/` | 1ファイルのみ、機能統合済み | v3.0.0 | 低 |
| `denops/hellshake-yano/performance/` | 1ファイルのみ、機能統合済み | v3.0.0 | 低 |
| `denops/hellshake-yano/validation/` | 1ファイルのみ、機能統合済み | v3.0.0 | 低 |

### 削除予定ファイル詳細

```bash
# 削除対象ファイル一覧
denops/hellshake-yano/
├── dictionary/
│   └── custom.ts          # 辞書機能はcore.tsに統合
├── display/
│   └── formatter.ts       # 表示機能はhint.tsに統合
├── input/
│   └── handler.ts         # 入力処理はmain.tsに統合
├── performance/
│   └── monitor.ts         # パフォーマンス監視はcache.tsに統合
└── validation/
    └── checker.ts         # バリデーションはconfig.tsに統合
```

## 🏗️ 削除対象インターフェース（Process2 Sub9+）

### @deprecated マークされたインターフェース

| インターフェース | 削除予定 | 代替 | ファイル |
|-----------------|----------|------|--------|
| `CoreConfig` | v3.0.0 | `UnifiedConfig` | `config.ts:48` |
| `HintConfig` | v3.0.0 | `UnifiedConfig` | `config.ts:88` |
| `WordConfig` | v3.0.0 | `UnifiedConfig` | `config.ts:128` |
| `PerformanceConfig` | v3.0.0 | `UnifiedConfig` | `config.ts:168` |
| `DebugConfig` | v3.0.0 | `UnifiedConfig` | `config.ts:208` |
| `HierarchicalConfig` | v3.0.0 | `UnifiedConfig` | `config.ts:248` |
| `CamelCaseConfig` | v3.0.0 | `UnifiedConfig` | `config.ts:288` |
| `ModernConfig` | v3.0.0 | `UnifiedConfig` | `config.ts:348` |
| `HintKeyConfig` | v3.0.0 | `UnifiedConfig` | `types.ts:369` |

### 削除対象インターフェースのコード例

```typescript
// ❌ v3.0.0で削除予定
/**
 * @deprecated このインターフェースはv3.0.0で削除される予定です。
 * 代わりにUnifiedConfigを使用してください。
 */
interface CoreConfig {
  enabled: boolean;
  motion_count: number;
  motion_timeout: number;
  hint_position: "start" | "end" | "same";
  visual_hint_position?: "start" | "end" | "same" | "both";
}

// ✅ 新しいインターフェース
interface UnifiedConfig {
  enabled: boolean;
  motionCount: number;
  motionTimeout: number;
  hintPosition: "start" | "end" | "same";
  visualHintPosition?: "start" | "end" | "same" | "both";
  // ... 32個の統合された設定項目
}
```

## 🔧 削除対象関数（Process2 Sub9+）

### @deprecated マークされた関数

| 関数名 | 削除予定 | 代替関数 | ファイル |
|--------|----------|----------|--------|
| `getDefaultConfig()` | v3.0.0 | `getDefaultUnifiedConfig()` | `config.ts:420` |
| `validateConfig()` | v3.0.0 | `validateUnifiedConfig()` | `config.ts:465` |
| `getDefaultHierarchicalConfig()` | v3.0.0 | `getDefaultUnifiedConfig()` | `config.ts:510` |
| `createMinimalConfig()` | v3.0.0 | `getDefaultUnifiedConfig()` | `config.ts:555` |
| `validateCore()` | v3.0.0 | `validateUnifiedConfig()` | `config.ts:600` |
| `validateHint()` | v3.0.0 | `validateUnifiedConfig()` | `config.ts:645` |
| `validateWord()` | v3.0.0 | `validateUnifiedConfig()` | `config.ts:690` |

### 削除対象関数のコード例

```typescript
// ❌ v3.0.0で削除予定
/**
 * @deprecated この関数はv3.0.0で削除される予定です。
 * 代わりにgetDefaultUnifiedConfig()を使用してください。
 */
export function getDefaultConfig(): Config {
  return getDefaultUnifiedConfig() as any;
}

// ✅ 新しい関数
export function getDefaultUnifiedConfig(): UnifiedConfig {
  return DEFAULT_UNIFIED_CONFIG;
}
```

## 📋 削除対象キャッシュ実装（Process1完了済み）

### 旧キャッシュ実装（統合済み）

| 実装箇所 | 旧実装 | 統合先 | 状態 |
|----------|--------|--------|------|
| `hint.ts:25` | `hintCache: Map` | `UnifiedCache.HINTS` | ✅ 統合済み |
| `hint.ts:67` | `assignmentCacheNormal: Map` | `UnifiedCache.HINT_ASSIGNMENT_NORMAL` | ✅ 統合済み |
| `hint.ts:68` | `assignmentCacheVisual: Map` | `UnifiedCache.HINT_ASSIGNMENT_VISUAL` | ✅ 統合済み |
| `hint.ts:69` | `assignmentCacheOther: Map` | `UnifiedCache.HINT_ASSIGNMENT_OTHER` | ✅ 統合済み |
| `lifecycle.ts:45` | `wordsCache: LRUCache` | `UnifiedCache.WORDS` | ✅ 統合済み |
| `lifecycle.ts:46` | `hintsCache: LRUCache` | `UnifiedCache.HINTS` | ✅ 統合済み |
| `word/context.ts:12` | `languageRuleCache: Map` | `UnifiedCache.LANGUAGE_RULES` | ✅ 統合済み |
| `word/context.ts:13` | `contextCache: Map` | `UnifiedCache.SYNTAX_CONTEXT` | ✅ 統合済み |
| `word/detector.ts:78` | `globalWordCache: Map` | `UnifiedCache.WORDS` | ✅ 統合済み |
| `word/dictionary.ts:34` | `dictionary: LRUCache` | `UnifiedCache.DICTIONARY` | ✅ 統合済み |

## 🧪 削除対象テストファイル（Process2 Sub9+）

### 旧インターフェース用テストファイル

| テストファイル | 対象インターフェース | 削除予定 | 新しいテスト |
|---------------|-------------------|----------|------------|
| `tests/core_config_test.ts` | `CoreConfig` | v3.0.0 | `unified_config_test.ts` |
| `tests/hint_config_test.ts` | `HintConfig` | v3.0.0 | `unified_config_test.ts` |
| `tests/word_config_test.ts` | `WordConfig` | v3.0.0 | `unified_config_test.ts` |
| `tests/performance_config_test.ts` | `PerformanceConfig` | v3.0.0 | `unified_config_test.ts` |
| `tests/hierarchical_config_test.ts` | `HierarchicalConfig` | v3.0.0 | `unified_config_test.ts` |

### 削除対象テストコードの例

```typescript
// ❌ v3.0.0で削除予定
// tests/core_config_test.ts
import { assertEquals } from "@std/assert";
import { CoreConfig, validateCore } from "../denops/hellshake-yano/config.ts";

Deno.test("CoreConfig validation", () => {
  const config: CoreConfig = {
    enabled: true,
    motion_count: 3,
    motion_timeout: 2000,
    hint_position: "start"
  };

  const errors = validateCore(config);
  assertEquals(errors.length, 0);
});

// ✅ 新しいテスト
// tests/unified_config_test.ts に統合済み
```

## 📂 削除対象ユーティリティ（後方互換性）

### 移行サポート関数（v3.0.0以降削除）

| 関数 | 目的 | 削除予定 |
|------|------|----------|
| `toUnifiedConfig()` | 旧設定→新設定変換 | v3.1.0 |
| `fromUnifiedConfig()` | 新設定→旧設定変換 | v3.1.0 |
| `migrateConfigFile()` | 設定ファイル自動移行 | v3.1.0 |
| `validateLegacyConfig()` | 旧設定バリデーション | v3.1.0 |

```typescript
// ❌ v3.1.0で削除予定（移行期間後）
/**
 * @deprecated v3.1.0で削除予定
 * 移行期間のみの一時的な関数
 */
export function toUnifiedConfig(oldConfig: any): UnifiedConfig {
  // 変換ロジック（移行期間中のみ提供）
}
```

## 🚮 削除作業チェックリスト

### Phase 1: ファイル削除（v3.0.0）

- [ ] `denops/hellshake-yano/dictionary/` 全削除
- [ ] `denops/hellshake-yano/display/` 全削除
- [ ] `denops/hellshake-yano/input/` 全削除
- [ ] `denops/hellshake-yano/performance/` 全削除
- [ ] `denops/hellshake-yano/validation/` 全削除

### Phase 2: インターフェース削除（v3.0.0）

- [ ] `CoreConfig` インターフェース削除
- [ ] `HintConfig` インターフェース削除
- [ ] `WordConfig` インターフェース削除
- [ ] `PerformanceConfig` インターフェース削除
- [ ] `DebugConfig` インターフェース削除
- [ ] `HierarchicalConfig` インターフェース削除
- [ ] `CamelCaseConfig` インターフェース削除
- [ ] `ModernConfig` インターフェース削除
- [ ] `HintKeyConfig` インターフェース削除

### Phase 3: 関数削除（v3.0.0）

- [ ] `getDefaultConfig()` 関数削除
- [ ] `validateConfig()` 関数削除（main.ts版）
- [ ] `getDefaultHierarchicalConfig()` 関数削除
- [ ] `createMinimalConfig()` 関数削除（旧版）
- [ ] `validateCore()` 関数削除
- [ ] `validateHint()` 関数削除
- [ ] `validateWord()` 関数削除

### Phase 4: テストファイル削除（v3.0.0）

- [ ] `tests/core_config_test.ts` 削除
- [ ] `tests/hint_config_test.ts` 削除
- [ ] `tests/word_config_test.ts` 削除
- [ ] `tests/performance_config_test.ts` 削除
- [ ] `tests/hierarchical_config_test.ts` 削除

### Phase 5: 移行サポート削除（v3.1.0）

- [ ] `toUnifiedConfig()` 関数削除
- [ ] `fromUnifiedConfig()` 関数削除
- [ ] `migrateConfigFile()` 関数削除
- [ ] `validateLegacyConfig()` 関数削除

## 📊 削除による効果予測

### コード量削減
- **インターフェース削除**: ~2,500行削減
- **関数削除**: ~1,800行削除
- **テスト削除**: ~1,200行削除
- **ディレクトリ削除**: ~500行削除
- **総削減見込み**: ~6,000行（約28%削減）

### パフォーマンス改善
- **コンパイル時間**: 25%短縮（型チェック削減）
- **メモリ使用量**: 15%削減（未使用コード削除）
- **保守性**: 大幅向上（コードベース統一）

## ⚠️ 削除時の注意事項

1. **段階的削除**: 急激な削除は避け、段階的に実施
2. **テスト確認**: 削除前に影響範囲のテスト実行
3. **ドキュメント更新**: 削除後はドキュメントも同時更新
4. **後方互換性**: v3.0.xまでは移行サポートを維持
5. **ユーザー通知**: 十分な予告期間を設けて削除実施

## 🔄 削除スケジュール

| バージョン | 削除対象 | 実施時期 |
|-----------|----------|----------|
| v3.0.0 | インターフェース・関数・ディレクトリ | 2024年Q1 |
| v3.1.0 | 移行サポート関数 | 2024年Q2 |
| v3.2.0 | 最終クリーンアップ | 2024年Q3 |

この計画的な削除により、hellshake-yano.vimはより保守性が高く、パフォーマンスに優れたプラグインに生まれ変わります。