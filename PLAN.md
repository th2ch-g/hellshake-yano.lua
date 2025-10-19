# title: Phase B-4: 統合エントリーポイント

## 概要
- Denops版とVimScript版を統合し、環境に応じて最適な実装を自動選択する仕組みを構築
- 設定の自動マイグレーション機能により、既存ユーザーの設定を新形式に移行
- 統一されたコマンドとキーマッピングで、両実装を透過的に利用可能にする

### goal
- ユーザーが環境（Denops有無）を意識せずにプラグインを利用できる
- 既存の設定（g:hellshake_yano_vim_config）が自動的に新形式（g:hellshake_yano）に移行される
- VimでもNeovimでも同じコマンド・キーマッピングで動作する

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **ARCHITECTURE_B.md の基本ルールを厳守**:
  - VimScript実装が正規実装（改善よりも一致性優先）
  - 環境別処理の完全分離（Vim/Neovim）
  - 既存実装の副作用チェック
- **TDD開発の徹底**:
  - RED→GREEN→REFACTORサイクルを厳守
  - テストファースト（テストを書いてから実装）
  - 最小限の実装から段階的に機能追加

## 開発のゴール
- Denops環境では高機能版（TypeScript実装）を使用
- Denops不在時は自動的にPure VimScript版にフォールバック
- 既存ユーザーの設定を壊さない完全な後方互換性
- テストケース80個以上、カバレッジ90%以上

## 実装仕様

### 実装範囲

```
denops/hellshake-yano/phase-b4/
├── environment-detector.ts          # 環境判定モジュール
├── implementation-selector.ts       # 実装選択ロジック
├── config-mapper.ts                 # 設定変換マッパー
├── config-migrator.ts              # 設定マイグレーター
├── command-registry.ts             # コマンド登録システム
├── mapping-manager.ts              # キーマッピング管理
└── initializer.ts                  # 初期化オーケストレーター

plugin/
└── hellshake-yano-unified.vim      # 統合エントリーポイント

tests/phase-b4/
├── environment-detector.test.ts     # 環境判定テスト（8-10 steps）
├── implementation-selector.test.ts  # 実装選択テスト（6-8 steps）
├── config-mapper.test.ts           # 設定変換テスト（10-12 steps）
├── config-migrator.test.ts         # マイグレーションテスト（8-10 steps）
├── command-registry.test.ts        # コマンド登録テスト（8-10 steps）
├── mapping-manager.test.ts         # マッピングテスト（10-12 steps）
├── initializer.test.ts             # 初期化テスト（10-12 steps）
├── integration.test.ts             # 統合テスト（10-15 steps）
└── e2e.test.ts                     # E2Eテスト（10-15 steps）
```

### 環境判定と実装選択の仕様

**環境判定ロジック**:
1. `exists('g:loaded_denops')` でDenops存在チェック
2. `denops#server#status()` で実行状態確認
3. `has('nvim')` でエディタ種別判定
4. ユーザー設定（`g:hellshake_yano_use_legacy`）による強制切り替え

**実装選択マトリクス**:
| Denops状態 | エディタ | ユーザー設定 | 選択される実装 |
|-----------|---------|-------------|--------------|
| 利用可能   | Vim/Neovim | - | denops-unified |
| 利用可能   | Vim/Neovim | legacy=true | vimscript-pure |
| 停止/不在  | Vim | - | vimscript-pure |
| 停止/不在  | Neovim | - | vimscript-pure（警告表示） |

### 設定マイグレーションの仕様

**変換マッピング**:
```typescript
const CONFIG_MAP = {
  'hint_chars': { key: 'markers', transform: (v: string) => v.split("") },
  'motion_threshold': { key: 'motionCount', transform: (v: number) => v },
  'motion_timeout_ms': { key: 'motionTimeout', transform: (v: number) => v },
  'motion_keys': { key: 'countedMotions', transform: (v: string[]) => v },
  'motion_enabled': { key: 'motionCounterEnabled', transform: (v: boolean) => v },
  'visual_mode_enabled': { key: 'visualModeEnabled', transform: (v: boolean) => v },
  'max_hints': { key: 'maxHints', transform: (v: number) => v },
  'min_word_length': { key: 'defaultMinWordLength', transform: (v: number) => v },
  'use_japanese': { key: 'useJapanese', transform: (v: boolean) => v },
  'debug_mode': { key: 'debugMode', transform: (v: boolean) => v },
}
```

## 生成AIの学習用コンテキスト

### Phase B-3実装（統合基盤）
- `denops/hellshake-yano/phase-b1/vim-bridge.ts`
  - VimBridgeクラス: Denopsブリッジの基本実装
- `denops/hellshake-yano/phase-b1/config-unifier.ts`
  - ConfigUnifierクラス: 設定統合の既存実装
- `denops/hellshake-yano/phase-b1/side-effect-checker.ts`
  - SideEffectCheckerクラス: 副作用管理

### VimScript側実装（参考）
- `autoload/hellshake_yano_vim/core.vim`
  - init()関数: VimScript版の初期化ロジック
- `autoload/hellshake_yano/denops.vim`
  - call_function(): Denops呼び出しパターン
- `plugin/hellshake-yano.vim`
  - 既存のプラグインエントリーポイント

### 設定ファイル
- `denops/hellshake-yano/config.ts`
  - Config型定義とDEFAULT_CONFIG

## Process

### process1: 環境判定と実装選択システム（2日）

#### sub1: environment-detector.ts のTDD実装
@target: `denops/hellshake-yano/phase-b4/environment-detector.ts`
@ref: `denops/hellshake-yano/phase-b1/vim-bridge.ts`

- [x] REDフェーズ: テストファースト実装
  - Denops利用可能判定テスト（3ケース）
  - エディタ種別判定テスト（2ケース）
  - バージョン情報取得テスト（2ケース）
- [x] GREENフェーズ: 最小実装
  - EnvironmentDetectorクラスの作成
  - isDenopsAvailable()メソッド
  - getEditorInfo()メソッド
- [x] REFACTORフェーズ: 最適化
  - エラーハンドリングの改善
  - キャッシュ機構の追加

#### sub2: implementation-selector.ts のTDD実装
@target: `denops/hellshake-yano/phase-b4/implementation-selector.ts`

- [x] REDフェーズ: テストファースト実装
  - 実装選択ロジックテスト（4ケース）
  - ユーザー設定優先度テスト（2ケース）
- [x] GREENフェーズ: 最小実装
  - ImplementationSelectorクラスの作成
  - select()メソッド（選択マトリクス実装）
- [x] REFACTORフェーズ: 最適化
  - 選択ロジックの明確化
  - 警告メッセージの統一

### process1完了：✅

### process2: 設定マイグレーションシステム（2日）

#### sub1: config-mapper.ts のTDD実装
@target: `denops/hellshake-yano/phase-b4/config-mapper.ts`
@ref: `denops/hellshake-yano/phase-b1/config-unifier.ts`

- [x] REDフェーズ: テストファースト実装
  - 基本的な設定変換テスト（5ケース）
  - 特殊な値の変換テスト（3ケース）
  - 不明なキーの処理テスト（2ケース）
- [x] GREENフェーズ: 最小実装
  - ConfigMapperクラスの作成
  - mapFromVimScript()メソッド
  - 変換テーブル（MAPPING_TABLE）の実装
- [x] REFACTORフェーズ: 最適化
  - 型安全性の向上
  - 変換ロジックの汎用化

#### sub2: config-migrator.ts のTDD実装
@target: `denops/hellshake-yano/phase-b4/config-migrator.ts`
@ref: `denops/hellshake-yano/phase-b1/config-migrator.ts`

- [x] REDフェーズ: テストファースト実装
  - 旧設定のみ存在する場合のテスト（2ケース）
  - 両設定が存在する場合のテスト（2ケース）
  - 新設定のみ存在する場合のテスト（2ケース）
  - エラーハンドリングテスト（2ケース）
- [x] GREENフェーズ: 最小実装
  - ConfigMigratorクラスの作成
  - migrate()メソッド
  - 警告メッセージ表示機能
- [x] REFACTORフェーズ: 最適化
  - 設定検出ロジックの改善
  - バックアップ機能の追加

### process2完了：✅

### process3: コマンドと初期化システム（2日）

#### sub1: command-registry.ts のTDD実装
@target: `denops/hellshake-yano/phase-b4/command-registry.ts`
@ref: `autoload/hellshake_yano/denops.vim`

- [x] REDフェーズ: テストファースト実装
  - 統合版コマンド登録テスト（3ケース）
  - VimScript版コマンド登録テスト（3ケース）
  - コマンド重複チェックテスト（2ケース）
- [x] GREENフェーズ: 最小実装
  - CommandRegistryクラスの作成
  - registerUnifiedCommands()メソッド
  - registerVimScriptCommands()メソッド
  - getRegisteredCommands()メソッド
- [x] REFACTORフェーズ: 最適化
  - コマンド定義の外部化
  - エラーハンドリングの強化

#### sub2: initializer.ts のTDD実装
@target: `denops/hellshake-yano/phase-b4/initializer.ts`

- [x] REDフェーズ: テストファースト実装
  - Denops環境での初期化テスト（3ケース）
  - VimScript環境での初期化テスト（3ケース）
  - エラー時のフォールバックテスト（4ケース）
- [x] GREENフェーズ: 最小実装
  - Initializerクラスの作成
  - initialize()メソッド（初期化フロー）
  - 各ステップの実装（環境判定→設定移行→実装選択→登録）
- [x] REFACTORフェーズ: 最適化
  - 初期化フローの最適化
  - ステップ間の依存関係整理

### process3完了：✅

### process4: キーマッピング統合（1日）

#### sub1: mapping-manager.ts のTDD実装
@target: `denops/hellshake-yano/phase-b4/mapping-manager.ts`
@ref: `autoload/hellshake_yano_vim/motion.vim`

- [x] REDフェーズ: テストファースト実装
  - モーション検出マッピングテスト（4ケース）
  - ビジュアルモードマッピングテスト（3ケース）
  - マッピング衝突検出テスト（3ケース）
- [x] GREENフェーズ: 最小実装
  - MappingManagerクラスの作成
  - setupMotionMappings()メソッド
  - setupVisualMappings()メソッド
  - getActiveMappings()メソッド
- [x] REFACTORフェーズ: 最適化
  - マッピング定義の外部化
  - 既存マッピングの保存・復元

#### sub2: hellshake-yano-unified.vim の実装
@target: `plugin/hellshake-yano-unified.vim`
@ref: `plugin/hellshake-yano.vim`

- [x] VimScript側のエントリーポイント実装
  - s:select_implementation()関数（実装選択）
  - s:initialize()関数（初期化）
  - s:initialize_unified()関数（統合版初期化）
  - s:migrate_config()関数（設定マイグレーション）
- [x] マッピング設定関数
  - s:setup_unified_mappings()関数
  - s:handle_motion()関数（モーションハンドラー）
- [x] 自動ロード設定
  - augroup定義
  - VimEnter時の自動初期化

### process4完了：✅

### process5: 統合テストとE2E（2日）

#### sub1: integration.test.ts の実装
@target: `tests/phase-b4/integration.test.ts`

- [x] 完全な初期化フロー（Denops環境）テスト（5ステップ）
  - 環境判定
  - 設定マイグレーション
  - 実装選択
  - コマンド登録
  - マッピング設定
- [x] フォールバックフロー（Denops不可）テスト（5ステップ）
  - 環境判定
  - VimScript版へのフォールバック
  - 警告メッセージ確認
- [x] エラーリカバリーテスト（5ステップ）
  - 部分的な初期化失敗時の動作

#### sub2: e2e.test.ts の実装
@target: `tests/phase-b4/e2e.test.ts`

- [x] 新規ユーザーの初回起動シナリオ（5ステップ）
  - プラグインロード
  - 自動初期化
  - コマンド実行
  - ヒント表示確認
- [x] 既存ユーザーの設定移行シナリオ（5ステップ）
  - 旧設定の読み込み
  - 自動マイグレーション
  - 新設定の確認
  - 機能動作確認
- [x] Denops停止時のフォールバックシナリオ（5ステップ）
  - Denops停止検出
  - VimScript版への切り替え
  - 機能の継続動作確認

### process5完了：✅

### process10: ユニットテスト
各processで実装したテストの総合確認

- [x] 全テストケース数: 80個以上達成
  - environment-detector: 8-10 steps
  - implementation-selector: 6-8 steps
  - config-mapper: 10-12 steps
  - config-migrator: 8-10 steps
  - command-registry: 8-10 steps
  - mapping-manager: 10-12 steps
  - initializer: 10-12 steps
  - integration: 10-15 steps
  - e2e: 10-15 steps
- [x] テストカバレッジ: 90%以上
- [x] 型チェック: deno check 100%パス
- [x] リンター: deno lint パス
- [x] フォーマット: deno fmt 準拠

### process10完了：✅

### process50: フォローアップ
実装後の仕様変更・追加要件

#### sub2: Denopsチャンネル初期化タイミングエラー修正
@target: `plugin/hellshake-yano-unified.vim`
@priority: 高（起動時エラー）

**エラー内容:**
```
Error in VimEnter Autocommands for "*"..function <SNR>159_initialize[5]..<SNR>159_initialize_unified[2]..denops#notify[1]..denops#_internal#server#chan#notify:line 4:
E605: Exception not caught: [denops] Channel is not ready yet
```

**調査結果:**
- **根本原因**: VimEnterイベント時に`denops#notify()`を即座に呼び出しているが、Denopsサーバーの起動が完了しておらず、RPC通信チャネルがまだ準備できていない
- **発生箇所**: `plugin/hellshake-yano-unified.vim`の`s:initialize_unified()`関数（75-78行目）
- **問題**: チャネルのready状態確認が不足している

**解決策の選択肢:**
1. **オプション1: 同期型待機**
   - `denops#plugin#wait()`を使用
   - シンプルだがVimEnter中にブロッキングする

2. **オプション2: 非同期型待機（採用）** ✅
   - `denops#plugin#wait_async()`を使用
   - ノンブロッキングでDenops準備完了後に自動初期化
   - 最も安全でユーザー体験が良い

3. **オプション3: 遅延初期化**
   - VimEnterより後のイベントで初期化
   - 複雑になる可能性がある

**採用理由（オプション2）:**
- VimEnter中にブロッキングしない
- Denopsが準備完了後に自動的に初期化される
- エラーハンドリングがシンプル
- 他のプラグイン（kensaku.vim等）でも実績のある方法

**修正内容:**
- [x] `s:initialize_unified()` 関数の改修
  - `denops#plugin#wait_async('hellshake-yano', function('s:initialize_unified_callback'))`で非同期待機を追加
  - Denops準備完了後にコールバックで初期化処理を実行
  - タイムアウト・エラー時のtry-catchでフォールバック処理を追加
  - **重要**: 第1引数はプラグイン名（文字列）、第2引数はfunction()で関数参照を渡す

- [x] `s:handle_motion()` 関数の改修
  - `denops#notify()`呼び出し前にチャネル状態を確認
  - エラーハンドリングを強化

- [x] `s:show_hints_visual()` 関数の改修
  - `denops#notify()`呼び出し前にチャネル状態を確認
  - エラーハンドリングを強化

- [x] フォールバック関数の追加
  - `s:initialize_fallback()`を追加
  - Denops準備失敗時の処理を実装

**検証結果:**
- ✅ `vim`コマンドで起動してE605エラーが出ないことを確認済み
- ✅ `nvim`コマンドで起動してE729エラーが出ないことを確認済み（引数修正後）
- ✅ Denops機能が正常に動作することを確認済み
- ✅ フォールバック処理が適切に動作することを確認済み

**修正履歴:**
- 初回実装: ラムダ式で実装 → Neovimで E729 "Using a Funcref as a String" エラー
- 修正1: `function('s:initialize_unified_callback')`で関数参照を渡す形式に変更 → E729解消
- 修正2: `unifyConfig` → `updateConfig` に変更 → TypeError解消（存在しないAPI呼び出しエラー）
  - `main.ts`に`unifyConfig`が存在しないため、既存の`updateConfig` APIを使用
  - 設定マージロジックをVimScript側で実装（`extend()`使用）
- 最終修正: Vim/Neovim両対応完了、すべてのエラー解消

### process100: リファクタリング

- [x] コード品質向上
  - 共通処理の抽出
  - エラーハンドリングの統一
  - 型定義の最適化
- [x] モジュール構造の見直し
  - 依存関係の整理
  - インターフェースの明確化
- [x] テスタビリティの向上
  - モック化の容易性改善
  - テストヘルパーの充実

### process100完了：✅

### process200: ドキュメンテーション

- [ ] ARCHITECTURE_B.md の更新
  - Phase B-4完了レポートの追加
  - 実装進捗状況テーブルの更新（B-4を✅に変更）
  - 成功基準の達成状況記録
- [ ] README.md の更新
  - インストール手順の更新
  - 設定マイグレーションガイド
  - トラブルシューティング追加
- [ ] ユーザーガイドの作成
  - 環境別セットアップ手順
  - 設定項目の説明
  - よくある質問（FAQ）
- [ ] 開発者ドキュメント
  - アーキテクチャ図の作成
  - 拡張ポイントの説明
  - コントリビューションガイド

---

## 成功基準

### 定量指標
- テストケース: **80個以上**
- テストカバレッジ: **90%以上**
- 型チェック: **deno check 100%パス**
- リンター警告: **0個**
- VimScript互換: **100%動作**
- 設定マイグレーション: **成功率100%**
- パフォーマンス:
  - 初期化時間 < 100ms
  - コマンド実行レイテンシ < 50ms
  - メモリ使用量 < 10MB増

### 定性指標
- **完全な後方互換性**: 既存ユーザーの設定が壊れない
- **透過的な実装切り替え**: ユーザーが実装の違いを意識しない
- **エラーリカバリー**: 部分的な失敗でも最大限の機能を提供
- **明確な警告メッセージ**: 問題発生時にユーザーが対処方法を理解できる
- **保守性の高さ**: 新機能追加が容易な構造

## スケジュール

| Process | 内容 | 所要時間 | 累計 | 優先度 |
|---------|------|---------|------|--------|
| process1 | 環境判定と実装選択 | 2.0日 | 2.0日 | 高 |
| process2 | 設定マイグレーション | 2.0日 | 4.0日 | 高 |
| process3 | コマンドと初期化 | 2.0日 | 6.0日 | 高 |
| process4 | キーマッピング統合 | 1.0日 | 7.0日 | 中 |
| process5 | 統合テストとE2E | 2.0日 | 9.0日 | 高 |

**合計**: 9日（TDDによる品質重視の開発）

## リスク管理

### 技術的リスク
1. **VimScript側のテスト困難性**
   - 対策: TypeScript側で完全にモック化してテスト
   - VimScript部分は最小限に留める

2. **環境依存の問題**
   - 対策: 環境判定ロジックを独立させて徹底的にテスト
   - フォールバック機構を確実に実装

3. **設定マイグレーションの複雑性**
   - 対策: 変換ロジックを単純化
   - 段階的な移行を可能にする

### 運用リスク
1. **既存ユーザーへの影響**
   - 対策: 設定のバックアップ機能
   - ロールバック手順の提供

2. **パフォーマンス劣化**
   - 対策: 遅延初期化の実装
   - 不要な処理のスキップ

## 次フェーズへの引き継ぎ

Phase B-4完了により、Phase B全体が完成：
- 統一されたプラグイン体験の実現
- VimとNeovimの両環境での最適な動作
- 日本語対応を含む高度な機能の提供
- 完全な後方互換性の維持

今後の拡張ポイント：
- Phase C: 追加機能の実装（カスタムヒント、プラグイン連携等）
- Phase D: パフォーマンス最適化とスケーラビリティ向上
- Phase E: コミュニティ機能（テーマ、拡張API等）
