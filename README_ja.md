# hellshake-yano.vim

日本語テキストでのシームレスな単語ベースのカーソル移動を実現するNeovimプラグイン

## 概要

hellshake-yano.vimは、日本語テキスト内の単語境界を正確に検出し、単語間のシームレスなカーソル移動を可能にするNeovimプラグインです。UTF-8エンコーディングを完全にサポートし、日本語文字（3バイト文字）を適切に処理することで、日本語テキストでの単語ベースのナビゲーションを英語と同じようにスムーズにします。

## 特徴

- **正確な単語境界検出**: 日本語テキスト内の単語境界を精密に識別
- **シームレスなカーソル移動**: 標準的なvimモーション（w, b, e）で日本語単語間を移動
- **混在テキストサポート**: 日本語/英語混在テキストで完璧に動作
- **完全なUTF-8サポート**: マルチバイト日本語文字のバイト位置を正確に計算
- **カスタマイズ可能な精度**: 異なるユースケースに対応する調整可能な単語検出アルゴリズム
- **キーリピート抑制**: 高速hjklリピート中のヒント表示を抑制してスムーズなスクロールを実現
- **ビジュアルモード最適化**: ビジュアルモードでの自然な単語選択のためのインテリジェントなヒント配置
- **厳密なキー分離**: single_char_keysとmulti_char_keysの完全な分離により予測可能なナビゲーション
- **パフォーマンス最適化**: 単一文字ヒントの遅延なし即座ジャンプ
- **スマート自動検出**: single/multi char keysが設定されている場合、ヒントグループを自動有効化
- **辞書システム**: 日本語単語分割を改善するための組み込みおよびユーザー定義辞書
- **ヒントパターンマッチング**: ドキュメント構造（チェックボックス、リスト、ヘッダー）のための正規表現ベースのヒント優先順位付け

## UnifiedCacheシステム

hellshake-yano.vimは、パフォーマンスとメモリ効率を大幅に改善する洗練された統合キャッシュシステムを使用しています。

### 主な利点

- **88%のメモリ削減**: インテリジェントなLRUキャッシングにより659KBからわずか78KBに削減
- **統合管理**: 20の個別キャッシュ実装を単一の効率的なシステムに統合（統一されたキャッシュ管理）
- **包括的な統計**: 組み込みの監視およびデバッグ機能
- **型安全**: 16の特殊化されたキャッシュタイプによる完全なTypeScriptサポート

### キャッシュアーキテクチャ

UnifiedCacheシステムは、異なる目的に最適化された16の特殊化されたキャッシュタイプを提供します：

- `WORDS` (1000): 単語検出結果
- `HINTS` (500): ヒント生成結果
- `DICTIONARY` (2000): 辞書データとカスタム単語
- `CHAR_WIDTH` (500): Unicode文字幅計算
- `CHAR_TYPE` (1000): 文字タイプ判定
- その他11の特殊化されたタイプ

### 使用例

```typescript
import { UnifiedCache, CacheType } from "./cache.ts";

// シングルトンインスタンスを取得
const cache = UnifiedCache.getInstance();

// 特定のキャッシュタイプにアクセス
const wordsCache = cache.getCache<string, string[]>(CacheType.WORDS);

// キャッシュ操作
wordsCache.set("file.ts", ["const", "function", "return"]);
const words = wordsCache.get("file.ts");

// パフォーマンスを監視
const stats = cache.getAllStats();
console.log(`キャッシュヒット率: ${stats.WORDS.hitRate}%`);
```

### パフォーマンス指標

- **ヒット率**: 平均63-66%、頻繁にアクセスされるデータでは最大92.5%
- **操作速度**: キャッシュ操作あたり < 0.001ms
- **メモリ効率**: 自動LRU削除によりメモリリークを防止
- **スケーラビリティ**: パフォーマンス低下なしに数千のエントリを処理

詳細なドキュメントについては、以下を参照してください：
- [APIリファレンス](docs/unified-cache-api.md)
- [キャッシュタイプガイド](docs/cache-types.md)
- [移行ガイド v3.0.0](MIGRATION_v3.md) - **v3.0.0ユーザーにとって重要**
- [パフォーマンス指標](docs/performance-metrics.md)
- [変更履歴](CHANGELOG.md)

## バージョン 3.0.0 - 破壊的変更

hellshake-yano.vim v3.0.0は、よりクリーンでモダンなTypeScriptコードベースのために、すべての後方互換性コードを完全に削除した**メジャーな破壊的リリース**です。

### 🔥 破壊的変更

#### 1. snake_case設定サポートの削除

**v2.x（動作しなくなりました）:**
```vim
let g:hellshake_yano = #{
\   single_char_keys: ['f', 'F', 't', 'T'],
\   multi_char_keys: ['w', 'b', 'e'],
\   hint_position: 'start'
\ }
```

**v3.0.0（必須）:**
```vim
let g:hellshake_yano = #{
\   singleCharKeys: ['f', 'F', 't', 'T'],
\   multiCharKeys: ['w', 'b', 'e'],
\   hintPosition: 'start'
\ }
```

#### 2. 型エイリアスの削除

**v2.x（動作しなくなりました）:**
```typescript
// ❌ 削除された型エイリアス
import type { UnifiedConfig, CamelCaseConfig, ModernConfig } from "./config.ts";
```

**v3.0.0（必須）:**
```typescript
// ✅ Config型のみを使用
import type { Config } from "./config.ts";

const config: Config = {
  hintPosition: "start",
  useJapanese: true,
  minWordLength: 3,
  // ... その他のオプション
};
```

#### 3. 互換性関数の削除

以下の関数は完全に削除されました：
- `normalizeBackwardCompatibleFlags()`
- `convertConfigForManager()`
- `syncManagerConfig()`
- `getMinLengthForKey()` （互換性レイヤー）
- `getMotionCountForKey()` （互換性レイヤー）

**削除されたファイル:**
- `denops/hellshake-yano/compatibility.ts` （208行 - 完全に削除）

#### 4. 非推奨プロパティの削除

- `useImprovedDetection` プロパティ（常に有効になりました）

### 移行ガイド

詳細な移行手順については、[MIGRATION_v3.md](MIGRATION_v3.md)を参照してください。

**クイック移行チェックリスト:**
- [ ] Vim設定内のすべてのsnake_caseプロパティをcamelCaseに更新
- [ ] TypeScriptコードで`UnifiedConfig`を`Config`に変更
- [ ] 互換性関数への参照を削除
- [ ] `:echo g:hellshake_yano`で設定をテスト

### 新しいAPI

#### GlobalCache（推奨名）

```typescript
import { GlobalCache, CacheType } from "./cache.ts";

// シングルトンインスタンスを取得
const cache = GlobalCache.getInstance();

// 特定のキャッシュにアクセス
const wordsCache = cache.getCache<string, string[]>(CacheType.WORDS);

// 統計を取得
const stats = cache.getStats(); // 新しいAPI
```

**注意**: `UnifiedCache`は後方互換性のためのエイリアスとして引き続き利用可能です。

#### getStats()（新しい統計API）

```typescript
// 新しい簡潔なAPI
const stats = cache.getStats();
console.log(`ヒット率: ${stats.WORDS.hitRate}%`);

// 古いAPIも動作します
const stats2 = cache.getStatistics(); // getStats()のエイリアス
```

#### detectWordsWithManager（拡張単語検出）

```typescript
import { detectWordsWithManager, getWordDetectionManager } from "./word.ts";

// 単語検出マネージャーを取得
const manager = await getWordDetectionManager(denops);

// 明示的な画面範囲で単語を検出
const words = await detectWordsWithManager(denops, manager);
```

### v3.0.0の利点

- ✅ **クリーンなコードベース**: レガシーコード約250行を削除
- ✅ **より良いパフォーマンス**: 互換性オーバーヘッドを削除
- ✅ **型安全性**: 一貫性のための単一の`Config`型
- ✅ **モダンなAPI**: camelCaseのみの命名規則
- ✅ **より簡単なメンテナンス**: メンテナンスすべきレガシーコードなし

詳細については、[CHANGELOG.md](CHANGELOG.md)を参照してください。

## インストール

### vim-plugを使用

```vim
Plug 'username/hellshake-yano.vim'
```

### lazy.nvimを使用

```lua
{
  'username/hellshake-yano.vim',
  config = function()
    -- ここに設定
  end
}
```

## 設定

プラグインは`g:hellshake_yano`辞書変数を使用して設定できます。利用可能なすべてのオプション：

```vim
let g:hellshake_yano = {
  \ 'markers': split('ABCDEFGHIJKLMNOPQRSTUVWXYZ', '\zs'),
  \ 'motion_count': 3,
  \ 'motion_timeout': 2000,
  \ 'hint_position': 'start',
  \ 'trigger_on_hjkl': v:true,
  \ 'counted_motions': [],
  \ 'enabled': v:true,
  \ 'single_char_keys': split('ASDFGHJKLNM0123456789', '\zs'),
  \ 'multi_char_keys': split('BCEIOPQRTUVWXYZ', '\zs'),
  \ 'use_hint_groups': v:true,
  \ 'use_numbers': v:true,
  \ 'use_japanese': v:true,
  \ 'per_key_min_length': {},
  \ 'default_min_word_length': 2,
  \ 'highlight_hint_marker': 'DiffAdd',
  \ 'highlight_hint_marker_current': 'DiffText'
  \ }
```

### 設定オプション

| オプション                          | タイプ      | デフォルト      | 説明                                                    |
| ----------------------------------- | ----------- | --------------- | ------------------------------------------------------- |
| `markers`                           | array       | A-Z split       | ヒントマーカーとして使用される文字                      |
| `motion_count`                      | number      | 3               | ヒントが表示されるまでのモーション数（レガシー）        |
| `default_motion_count`              | number      | undefined       | 未指定キーのデフォルトモーション数                      |
| `per_key_motion_count`              | dict        | {}              | キーごとのモーション数設定                              |
| `motion_timeout`                    | number      | 2000            | モーション数タイムアウト（ミリ秒）                      |
| `hint_position`                     | string      | 'start'         | ヒントを表示する位置（'start'または'end'）              |
| `trigger_on_hjkl`                   | boolean     | v:true          | hjkl移動でのトリガーを有効化                            |
| `counted_motions`                   | array       | []              | 追跡するカスタムモーションキー（trigger_on_hjklを上書き） |
| `enabled`                           | boolean     | v:true          | プラグインを有効/無効化                                 |
| `single_char_keys`                  | array       | ASDFGHJKLNM0-9  | 単一文字ヒントに使用されるキー（記号サポート）          |
| `multi_char_keys`                   | array       | BCEIOPQRTUVWXYZ | 複数文字ヒントに使用されるキー                          |
| `use_hint_groups`                   | boolean     | v:true          | ヒントグループ機能を有効化                              |
| `use_numbers`                       | boolean     | v:true          | ヒントに数字キーを許可                                  |
| `use_numeric_multi_char_hints`      | boolean     | v:false         | 数字2文字ヒントを有効化（01-99, 00）                    |
| `max_single_char_hints`             | number      | -               | オプション: 単一文字ヒントを制限                        |
| `use_japanese`                      | boolean     | v:true          | 日本語単語検出を有効化                                  |
| `highlight_hint_marker`             | string/dict | 'DiffAdd'       | ヒントマーカーのハイライト                              |
| `highlight_hint_marker_current`     | string/dict | 'DiffText'      | 現在のヒントマーカーのハイライト                        |
| `suppress_on_key_repeat`            | boolean     | v:true          | 高速キーリピート中のヒント抑制                          |
| `key_repeat_threshold`              | number      | 50              | キーリピート検出閾値（ms）                              |
| `key_repeat_reset_delay`            | number      | 300             | キーリピート後のリセット遅延（ms）                      |
| `per_key_min_length`                | dict        | {}              | キーごとの最小単語長を設定                              |
| `default_min_word_length`           | number      | 2               | ヒントのデフォルト最小単語長                            |
| `segmenter_threshold`               | number      | 4               | TinySegmenterを使用する最小文字数（snake_case）         |
| `segmenterThreshold`                | number      | 4               | TinySegmenterを使用する最小文字数（camelCase）          |
| `japanese_merge_threshold`          | number      | 2               | 助詞結合の最大文字数（snake_case）                      |
| `japaneseMergeThreshold`            | number      | 2               | 助詞結合の最大文字数（camelCase）                       |
| `debug_mode`                        | boolean     | v:false         | デバッグモードを有効化                                  |
| `performance_log`                   | boolean     | v:false         | パフォーマンスロギングを有効化                          |

## 設定システム（v3.0.0）

hellshake-yano.vim v3.0.0は、camelCase命名規則を使用した単一のフラット構造による統合設定システムを提供します。

### 主な利点

- **簡素化された構造**: 単一のフラットな設定インターフェース（32プロパティ）
- **camelCase規則**: すべての設定で一貫した命名
- **型安全性**: 厳密な検証による完全なTypeScriptサポート
- **パフォーマンス**: ネストされたルックアップなしの直接プロパティアクセス
- **クリーンなAPI**: レガシー互換性オーバーヘッドなし

### 設定インターフェース

設定システムは、すべての設定を単一の`Config`インターフェースに統合します：

```typescript
interface Config {
  // コア設定
  enabled: boolean;
  markers: string[];
  motionCount: number;
  motionTimeout: number;
  hintPosition: "start" | "end" | "same";

  // 高度な設定
  useJapanese: boolean;
  minWordLength: number;
  perKeyMinLength: Record<string, number>;
  defaultMinWordLength: number;

  // パフォーマンス設定
  cacheSize: number;
  enableHighlight: boolean;
  useTinySegmenter: boolean;

  // ... その他21の設定
}
```

### 設定例（v3.0.0）

**camelCaseスタイル（v3.0.0で必須）:**
```vim
let g:hellshake_yano = #{
\   enabled: v:true,
\   markers: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
\   motionCount: 3,
\   hintPosition: 'start',
\   useJapanese: v:true,
\   minWordLength: 3,
\   perKeyMinLength: #{ 'v': 1, 'f': 1, 'w': 3 },
\   defaultMinWordLength: 3,
\   enableHighlight: v:true,
\   cacheSize: 1000
\ }
```

**⚠️ snake_caseはv3.0.0でサポートされなくなりました:**
```vim
" ❌ これはv3.0.0で動作しません
let g:hellshake_yano = {
  \ 'single_char_keys': ['f', 'F'],
  \ 'hint_position': 'start'
  \ }
```

### v2.xからの移行

v2.xからアップグレードする場合は、すべてのsnake_caseプロパティをcamelCaseに変換する**必要があります**：

```vim
" 変更前（v2.x）
let g:hellshake_yano = #{
\   single_char_keys: ['f', 'F', 't', 'T'],
\   multi_char_keys: ['w', 'b', 'e'],
\   hint_position: 'start'
\ }

" 変更後（v3.0.0）
let g:hellshake_yano = #{
\   singleCharKeys: ['f', 'F', 't', 'T'],
\   multiCharKeys: ['w', 'b', 'e'],
\   hintPosition: 'start'
\ }
```

詳細な移行手順については、[MIGRATION_v3.md](MIGRATION_v3.md)を参照してください。

### 設定例

**日本語開発に最適:**
```vim
let g:hellshake_yano = #{
\   useJapanese: v:true,
\   useTinySegmenter: v:true,
\   minWordLength: 2,
\   perKeyMinLength: #{
\     'v': 1,    " ビジュアル選択 - すべての文字
\     'f': 1,    " 文字検索 - すべての文字
\     'w': 3,    " 単語移動 - 意味のある単語のみ
\     'e': 2     " 単語末尾 - バランスの取れた精度
\   },
\   enableHighlight: v:true,
\   cacheSize: 2000
\ }
```

**パフォーマンス最適化:**
```vim
let g:hellshake_yano = #{
\   maxHints: 50,
\   cacheSize: 3000,
\   debounceDelay: 30,
\   suppressOnKeyRepeat: v:true,
\   keyRepeatThreshold: 80,
\   enableDebug: v:false
\ }
```

### APIドキュメント

包括的な設定ドキュメントについては：
- [設定APIリファレンス](docs/unified-config-api.md) - 完全なAPIドキュメント
- [設定例](docs/unified-config-api.md#usage-examples) - 実際の使用パターン
- [移行ガイド v3.0.0](MIGRATION_v3.md) - v2.xからのステップバイステップ移行
- [型定義](docs/unified-config-api.md#type-definitions) - TypeScriptインターフェース
- [変更履歴](CHANGELOG.md) - バージョン履歴と破壊的変更

### キーごとの最小単語長設定

**拡張機能**: 移動タイプとコンテキストに基づいてヒント表示を最適化するために、異なるキーに対して異なる最小単語長を設定します。`per_key_min_length`で定義されたキーは**自動的にマッピング**されます - `counted_motions`を手動で設定する必要はありません。

この機能により、以下を可能にする細かい制御ができます：

- ビジュアルモードキーでの**精密な移動**（1文字ヒント）
- hjklナビゲーションでの**ノイズ削減**（2文字以上のヒント）
- 異なるモーションタイプに対する**カスタマイズされた閾値**
- すべての設定されたキーに対する**自動キーマッピング**

#### 基本設定

```vim
let g:hellshake_yano = {
  \ 'per_key_min_length': {
  \   'v': 1,   " ビジュアルモード - 精密な移動
  \   'V': 1,   " ビジュアルラインモード
  \   'w': 1,   " 単語前進
  \   'b': 1,   " 単語後退
  \   'h': 2,   " 左（ノイズ削減）
  \   'j': 2,   " 下
  \   'k': 2,   " 上
  \   'l': 2,   " 右
  \   'f': 3,   " 文字検索
  \   'F': 3,   " 文字後退検索
  \ },
  \ 'default_min_word_length': 2,
  \ 'motion_count': 3,   " 3回のモーション後にヒントをトリガー
  \ }
" 注意: per_key_min_length内のキーは自動的にマッピングされます！
" counted_motionsを個別に設定する必要はありません。
```

#### ユースケース

**精密な移動（1文字ヒント）**

- ビジュアルモード選択には正確なカーソル配置が必要
- 単語モーション（w, b, e）はすべての可能なターゲットを表示することで恩恵を受ける
- 単一文字ヒントは最大の精度のためにすぐに表示される

**ノイズ削減（2文字以上のヒント）**

- 大きなファイルでのhjklナビゲーションは、ヒントが多すぎると圧倒される可能性がある
- より高い閾値はノイズ削減によりスクロール中の視覚的なノイズを減らす
- スムーズなナビゲーション体験を維持

**モーション固有の最適化**

- 検索操作（f, F, t, T）はより長い単語をターゲットにすることが多い
- 検索モーション（/, ?）はより長い最小長で動作する方が良い
- モーションタイプに対して異なる精度要件がある

#### レガシー設定からの移行

**変更前（レガシー）**:

```vim
let g:hellshake_yano = {
  \ 'min_word_length': 2
  \ }
```

**変更後（キーごと）**:

```vim
let g:hellshake_yano = {
  \ 'default_min_word_length': 2,
  \ 'per_key_min_length': {
  \   'v': 1,  " ビジュアルモードの上書き
  \   'h': 3,  " 左移動の上書き
  \ }
  \ }
```

**段階的移行戦略**:

1. 古いレガシー`min_word_length`に一致する`default_min_word_length`から開始
2. 異なる動作が必要なキーに対して特定の上書きを追加
3. 各変更を段階的にテスト
4. 移行完了後、古い`min_word_length`設定を削除

**主要機能**:

- **自動マッピング**: `per_key_min_length`内のキーは自動的にモーションマッピングに追加される
- **手動設定不要**: キーごとに設定されたキーに対して`counted_motions`を設定する必要はない
- **完全な後方互換性**: 既存の設定は変更なしに動作し続ける
- **動的コンテキスト**: 各キー押下で正確なフィルタリングのためにコンテキストを更新

### 辞書システム

プラグインは、日本語の単語分割とヒント配置を改善するために、組み込みおよびユーザー定義辞書の両方をサポートしています。

#### 組み込み辞書

プラグインには以下を含む包括的な辞書が含まれています：
- **80以上の日本語プログラミング用語**: 関数定義、非同期処理、データベース接続など
- **一般的な複合語**: 分割中に自動的に保持される
- **助詞結合ルール**: 日本語の助詞（の、を、に、など）のインテリジェントな処理

#### ユーザー定義辞書

特定のニーズに合わせてカスタム辞書を作成します。プラグインは以下の順序で辞書ファイルを検索します：

1. `.hellshake-yano/dictionary.json` （プロジェクト固有）
2. `hellshake-yano.dict.json` （プロジェクトルート）
3. `~/.config/hellshake-yano/dictionary.json` （グローバル）

**初期設定**:
```bash
# プロジェクト固有の辞書の場合
cp samples/dictionaries/dictionary.json .hellshake-yano/dictionary.json
```

> **注意**: `.hellshake-yano/dictionary.json`は`.gitignore`に含まれています。サンプル辞書は`samples/dictionaries/`で利用可能です。

#### 辞書形式

**JSON形式**（推奨）:
```json
{
  "customWords": ["機械学習", "深層学習"],
  "preserveWords": ["HelloWorld", "getElementById"],
  "mergeRules": {
    "の": "always",
    "を": "always"
  },
  "hintPatterns": [
    {
      "pattern": "^-\\s*\\[\\s*\\]\\s*(.)",
      "hintPosition": "capture:1",
      "priority": 100,
      "description": "チェックボックスの最初の文字"
    }
  ]
}
```

**YAML形式**:
```yaml
customWords:
  - 機械学習
  - 深層学習
hintPatterns:
  - pattern: "^-\\s*\\[\\s*\\]\\s*(.)"
    hintPosition: "capture:1"
    priority: 100
```

**シンプルなテキスト形式**:
```
# カスタム単語
機械学習
深層学習

# 保持する単語（!プレフィックス）
!HelloWorld
!getElementById

# ヒントパターン（@優先度:パターン:位置のプレフィックス）
@100:^-\s*\[\s*\]\s*(.):capture:1
```

#### ヒントパターンマッチング

特定のドキュメント構造のヒント配置を優先するための正規表現パターンを定義：

- **チェックボックス**: `- [ ] タスク` → 「タ」にヒント
- **番号付きリスト**: `1. 項目` → 「項」にヒント
- **Markdownヘッダー**: `## タイトル` → 「タ」にヒント
- **日本語括弧**: 「内容」 → 「内」にヒント

#### 辞書コマンド

```vim
:HellshakeYanoReloadDict    " 辞書を再読み込み
:HellshakeYanoEditDict      " 辞書ファイルを編集
:HellshakeYanoShowDict      " 現在の辞書を表示
:HellshakeYanoValidateDict  " 辞書形式を検証
```

#### 設定

```vim
let g:hellshake_yano_dictionary_path = '~/.config/my-dict.json'
let g:hellshake_yano_use_builtin_dict = v:true
let g:hellshake_yano_dictionary_merge = 'merge'  " または'override'
```

**`counted_motions`との組み合わせ**:

```vim
let g:hellshake_yano = {
  \ 'per_key_min_length': {
  \   'v': 1,  " 1文字最小で自動的にマッピング
  \   'h': 2,  " 2文字最小で自動的にマッピング
  \ },
  \ 'counted_motions': ['g', 'd'],  " default_min_word_lengthを使用する追加キー
  \ 'default_min_word_length': 3,
  \ }
" 結果: v(1), h(2), g(3), d(3)がすべて追跡される
```

### 日本語単語分割設定

hellshake-yano.vimは、TinySegmenterと助詞結合を使用した高度な日本語単語分割（分かち書き）機能を提供します。これらの設定により、日本語テキストの分析方法と単語境界の検出方法を微調整できます。

#### 設定キー

プラグインは**snake_case**（レガシー）と**camelCase**（モダン）の両方の設定キーをサポートしています：

| 機能 | snake_case（レガシー） | camelCase（モダン） | デフォルト | 説明 |
|------|------------------------|---------------------|-----------|------|
| TinySegmenter閾値 | `segmenter_threshold` | `segmenterThreshold` | `4` | TinySegmenterを使用する最小文字数 |
| 助詞結合閾値 | `japanese_merge_threshold` | `japaneseMergeThreshold` | `2` | 助詞結合の最大文字数 |

#### 基本設定例

**モダンcamelCase形式の使用（推奨）**:
```vim
let g:hellshake_yano = #{
\   useJapanese: v:true,
\   segmenterThreshold: 4,
\   japaneseMergeThreshold: 2,
\   japaneseMergeParticles: v:true
\ }
```

**レガシーsnake_case形式の使用（引き続きサポート）**:
```vim
let g:hellshake_yano = {
  \ 'use_japanese': v:true,
  \ 'segmenter_threshold': 4,
  \ 'japanese_merge_threshold': 2,
  \ 'japanese_merge_particles': v:true
  \ }
```

#### 設定パラメータの詳細

##### segmenterThreshold（TinySegmenter閾値）

**目的**: 日本語テキスト分析にTinySegmenter（形態素解析エンジン）を使用するタイミングを制御します。

**動作方法**:
- 日本語テキストセグメントが**4文字以上**（デフォルト）の場合、精密な形態素解析のためにTinySegmenterが使用される
- より短いセグメントの場合、より高速なパターンベースの検出が使用される
- 値が高い = パフォーマンスは速いが、長い単語の分割精度は低い
- 値が低い = 分割はより正確だが、わずかに遅い

**チューニングガイドライン**:
```vim
" 高速モード - パターンベース検出を多用
" 速度優先 - パターンベース検出を多用
let g:hellshake_yano = #{
\   segmenterThreshold: 6,
\ }

" バランスモード - デフォルト設定
" バランス型 - デフォルト設定
let g:hellshake_yano = #{
\   segmenterThreshold: 4,
\ }

" 精度モード - 短い単語でも形態素解析を使用
" 精度優先 - 短い単語でも形態素解析を使用
let g:hellshake_yano = #{
\   segmenterThreshold: 2,
\ }
```

**推奨値**:
- **2-3**: 多くの複合語を含む技術文書（技術文書、複合語が多い場合）
- **4**: デフォルトのバランス設定（デフォルト・バランス設定）
- **5-6**: よりシンプルな語彙を持つ一般的なテキスト（一般的なテキスト）

##### japaneseMergeThreshold（助詞結合閾値）

**目的**: 助詞結合の動作を制御 - 日本語の助詞（の、を、に、が、など）が前の単語と結合されるタイミング。

**動作方法**:
- 助詞が**2文字以下**（デフォルト）の単語の後に現れる場合、前の単語に結合される
- 例: 「私の」（watashi-no）は「私」+「の」に分割されずに1つの単位として保持される
- 値が高い = より積極的な結合、より長い単語単位を作成
- 値が低い = 結合が少なく、単語と助詞を分離

**チューニングガイドライン**:
```vim
" 最小結合 - 助詞を主に分離
" 最小結合 - 助詞を分離
let g:hellshake_yano = #{
\   japaneseMergeThreshold: 1,
\ }
" 例: 「私」「の」「本」（3つの別々の単語）

" デフォルト結合 - 自然な読み単位
" デフォルト結合 - 自然な読みやすさ
let g:hellshake_yano = #{
\   japaneseMergeThreshold: 2,
\ }
" 例: 「私の」「本」（2つの単語単位）

" 積極的結合 - より長いコンテキスト単位
" 積極的結合 - 長いコンテキスト単位
let g:hellshake_yano = #{
\   japaneseMergeThreshold: 3,
\ }
" 例: 「私の本」（条件を満たす場合は単一単位）
```

**推奨値**:
- **1**: 精密な文字レベルのナビゲーション（文字レベルの精密ナビゲーション）
- **2**: デフォルトの自然な読み単位（デフォルト・自然な読み単位）
- **3**: フレーズを一緒に保つべきコードコメント（コメント内でフレーズを保持）

#### 日本語開発の完全な設定

**日本語ソフトウェア開発向け**（日本語ソフトウェア開発向け）:
```vim
let g:hellshake_yano = #{
\   useJapanese: v:true,
\   enableTinySegmenter: v:true,
\   segmenterThreshold: 3,
\   japaneseMergeThreshold: 2,
\   japaneseMergeParticles: v:true,
\   japaneseMinWordLength: 2,
\   perKeyMinLength: #{
\     'v': 1,
\     'w': 2,
\     'b': 2
\   }
\ }
```

**日本語文書作成向け**（日本語文書作成向け）:
```vim
let g:hellshake_yano = #{
\   useJapanese: v:true,
\   enableTinySegmenter: v:true,
\   segmenterThreshold: 4,
\   japaneseMergeThreshold: 2,
\   japaneseMergeParticles: v:true,
\   japaneseMinWordLength: 2
\ }
```

**最大パフォーマンス重視**（最大パフォーマンス重視）:
```vim
let g:hellshake_yano = #{
\   useJapanese: v:true,
\   enableTinySegmenter: v:false,
\   segmenterThreshold: 10,
\   japaneseMergeThreshold: 1,
\   japaneseMergeParticles: v:false
\ }
```

#### 設定のテスト

日本語分割設定を変更した後、さまざまなテキストパターンでテスト：

```vim
" 単語境界を確認するためにデバッグモードを有効化
let g:hellshake_yano = #{
\   debugMode: v:true,
\   performanceLog: v:true
\ }

" 次に:HellshakeDebugを使用して現在の設定を検査
:HellshakeDebug
```

#### レガシー形式からの移行

古いsnake_case形式を使用している場合、段階的に移行できます：

```vim
" 古い形式（引き続き動作）
let g:hellshake_yano = {
  \ 'use_japanese': v:true,
  \ 'segmenter_threshold': 4
  \ }

" 新しい形式（推奨）
let g:hellshake_yano = #{
\   useJapanese: v:true,
\   segmenterThreshold: 4
\ }

" 移行中は両方の形式が同時に動作
let g:hellshake_yano = #{
\   useJapanese: v:true,
\   segmenterThreshold: 4,
\   'segmenter_threshold': 4
\ }
```

プラグインは自動的にレガシーsnake_case設定を検出し、モダンcamelCase形式に変換します。

#### パフォーマンスに関する考慮事項

- **キャッシュ最適化**: キーごとの設定により、キーコンテキストに基づくインテリジェントなキャッシュが可能
- **メモリ使用量**: 最小のメモリオーバーヘッド - 指定されたキーの上書きのみを格納
- **大きなファイルの推奨設定**:
  ```vim
  let g:hellshake_yano = {
    \ 'default_min_word_length': 3,
    \ 'per_key_min_length': {
    \   'v': 1,  " ビジュアルモードを精密に保つ
    \   'w': 2,  " 単語モーションをより応答的に
    \   'h': 4, 'j': 4, 'k': 4, 'l': 4  " hjklのノイズを大幅に削減
    \ }
    \ }
  ```

### キーごとのモーション数設定

プラグインは**キーごとのモーション数**設定をサポートしており、異なるキーが異なる回数の押下後にヒントをトリガーできます。これにより、異なるモーションタイプに対して最適なユーザー体験が可能になります。

#### 基本設定

```vim
let g:hellshake_yano = {
  \ 'per_key_motion_count': {
  \   'v': 1,   " ビジュアルモード - すぐにヒントを表示（1回押下）
  \   'V': 1,   " ビジュアルラインモード - 即座のヒント
  \   'w': 1,   " 単語前進 - 即座のヒント
  \   'b': 1,   " 単語後退 - 即座のヒント
  \   'h': 3,   " 左 - 3回押下後にヒントを表示
  \   'j': 3,   " 下 - 3回押下後にヒントを表示
  \   'k': 3,   " 上 - 3回押下後にヒントを表示
  \   'l': 3,   " 右 - 3回押下後にヒントを表示
  \ },
  \ 'default_motion_count': 2,  " 未指定キーのデフォルト
  \ 'motion_count': 3,          " レガシーフォールバック
  \ }
```

#### ユースケース

**即座のヒント（count = 1）**

- ビジュアルモード選択には正確なカーソル配置が必要
- 単語モーション（w, b, e）はすぐにヒントを表示することで恩恵を受ける
- 速度よりも正確性が必要な操作に有用

**遅延ヒント（count = 3+）**

- ノーマルモードでのhjklナビゲーションは精度が低くても構わない
- 高速スクロール中の視覚的なノイズを減らす
- スムーズなナビゲーション体験を維持

#### 設定の優先順位

プラグインは、モーション数設定に対して以下の優先順位を使用します：

1. `per_key_motion_count[key]` - キー固有の設定
2. `default_motion_count` - 新しいデフォルト値
3. `motion_count` - レガシー設定（後方互換性）
4. `3` - ハードコードされたフォールバック

#### キーごとの最小長との組み合わせ

最大限の制御のために、キーごとのモーション数とキーごとの最小長を組み合わせることができます：

```vim
let g:hellshake_yano = {
  \ 'per_key_motion_count': {
  \   'v': 1,   " 1回押下後にヒントを表示
  \   'h': 3,   " 3回押下後にヒントを表示
  \ },
  \ 'per_key_min_length': {
  \   'v': 1,   " 1文字の単語を表示
  \   'h': 2,   " 2文字以上の単語を表示
  \ },
  \ 'default_motion_count': 2,
  \ 'default_min_word_length': 2,
  \ }
```

この設定の意味：

- `v`キー: 1回押下後にすべての単語（1文字を含む）のヒントを表示
- `h`キー: 3回押下後に2文字以上の単語のヒントを表示
- その他のキー: 2回押下後に2文字以上の単語のヒントを表示

### キーリピート抑制

高速hjklキーリピート中、スクロールをスムーズに保つためにヒント表示が一時的に抑制されます。タイミングは設定可能で、機能を無効にすることもできます。

- 有効/無効: `g:hellshake_yano.suppress_on_key_repeat`（デフォルト: `v:true`）
- リピート閾値: `g:hellshake_yano.key_repeat_threshold`（ms）（デフォルト: `50`）
- リセット遅延: `g:hellshake_yano.key_repeat_reset_delay`（ms）（デフォルト: `300`）

クイックコピーについては、以下の設定例を参照してください。

### デバッグモード

プラグインには、トラブルシューティングとパフォーマンス分析のための包括的なデバッグモードが含まれています：

- 有効/無効: `g:hellshake_yano.debug_mode`（デフォルト: `v:false`）
- デバッグ情報を表示: `:HellshakeDebug`または`:HellshakeShowDebug`

デバッグモードの表示内容：

- 現在のプラグイン設定
- モーション数とタイミング情報
- キーリピート検出状態
- バッファ固有の状態
- パフォーマンス指標（performance_logが有効な場合）

### パフォーマンスロギング

組み込みのパフォーマンスロギングでプラグインのパフォーマンスを追跡：

- 有効/無効: `g:hellshake_yano.performance_log`（デフォルト: `v:false`）
- 主要操作の実行時間を記録
- パフォーマンスのボトルネックを特定するのに役立つ
- 有効時にデバッグモードで表示可能

### ヒントグループ設定

プラグインは、ナビゲーション効率を向上させるために、単一文字と複数文字ヒント間の**厳密な分離**を備えたインテリジェントなヒントグループ化をサポートします：

- **単一文字キー**: 即座ジャンプによる即座の単一キーナビゲーションにのみ使用
- **複数文字キー**: 2文字ヒントにのみ使用 - 単一ヒントとしては決して表示されない
- **厳密な分離**: single_char_keys内のキーは複数文字ヒントを生成しない（Aがsingle_char_keysにある場合、AAは生成されない）
- **自動検出**: single_char_keysまたはmulti_char_keysを設定すると、use_hint_groupsが自動的に有効になる
- **パフォーマンス最適化**: 単一文字ヒントはハイライト遅延なしで即座にジャンプ
- **最大単一文字ヒント**: 単一と複数文字ヒントのバランスを取るためのオプション制限
- **記号サポート**: single_char_keysは記号をサポート（`;`, `:`, `[`, `]`, `'`, `"`, `,`, `.`, `/`, `\`, `-`, `=`, `` ` ``）
- **数字2文字ヒント**: 大量の単語数に対するオプションの数字ヒント（01-99, 00）

#### 重要な動作変更（v2.0+）

厳密な分離でヒントグループを使用する場合：
- 'A'が`single_char_keys`にある場合、'AA'は生成されない
- 'B'が`multi_char_keys`のみにある場合、'B'は単一文字ヒントとして表示されない
- 単一文字ヒントは2番目のキーを待つことなく即座にジャンプ
- 複数文字ヒントは最初のキーが押されたときに視覚的フィードバックを表示

#### ヒントキーでの記号サポート（新機能）

より多くのヒントオプションのために`single_char_keys`で記号を使用できるようになりました：

**有効な記号**: `;` `:` `[` `]` `'` `"` `,` `.` `/` `\` `-` `=` `` ` ``

```vim
" 例: 追加の単一文字ヒントに記号を使用
let g:hellshake_yano = {
  \ 'single_char_keys': ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', ':', '[', ']'],
  \ 'multi_char_keys': ['B', 'C', 'E', 'I', 'O', 'P', 'Q', 'R', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
  \ 'max_single_char_hints': 13
  \ }
```

**利点**:
- すべてのアルファベットキーを使用せずに単一文字ヒント容量を増やす
- 2文字の組み合わせに複数文字キーを利用可能に保つ
- QWERTYキーボードでより人間工学的なキー配置

#### 数字2文字ヒント（新機能）

大量の単語を処理するための数字2文字ヒント（01-99, 00）を有効化：

```vim
" 数字複数文字ヒントを有効化
let g:hellshake_yano = {
  \ 'use_numeric_multi_char_hints': v:true,
  \ 'single_char_keys': ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  \ 'multi_char_keys': ['B', 'C', 'E', 'I', 'O', 'P', 'Q', 'R', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
  \ }
```

**動作方法**:
1. 単一文字ヒント: A, S, D, F, G, H, J, K, L（9ヒント）
2. アルファベット2文字ヒント: BB, BC, BE, CB, CC...（multi_char_keysの組み合わせ）
3. 数字2文字ヒント: 01, 02, 03, ..., 99, 00（最大100ヒント）

**生成順序**:
- 優先度1: 単一文字ヒント（最速アクセス）
- 優先度2: アルファベット2文字ヒント（馴染みのあるパターン）
- 優先度3: 数字2文字ヒント（大量の単語数）

**使用法**:
- `0`を入力 → 0で始まるすべてのヒントを表示（01, 02, 03, ...）
- `01`を入力 → ヒント"01"の単語にジャンプ
- `5`を入力 → 5で始まるすべてのヒントを表示（50-59）
- `55`を入力 → ヒント"55"の単語にジャンプ

### 高度なハイライト設定

ハイライトグループ名または色辞書のいずれかを使用してハイライトをカスタマイズできます。より詳細な例と高度な設定については、`samples/highlight_examples.vim`を参照してください。

```vim
" 既存のハイライトグループを使用
let g:hellshake_yano = {
  \ 'highlight_hint_marker': 'Search',
  \ 'highlight_hint_marker_current': 'IncSearch'
  \ }

" fg/bgでカスタムカラーを使用
let g:hellshake_yano = {
  \ 'highlight_hint_marker': {'fg': '#00ff00', 'bg': '#1a1a1a'},
  \ 'highlight_hint_marker_current': {'fg': '#ffffff', 'bg': '#ff0000'}
  \ }

" 混合設定例
let g:hellshake_yano = {
  \ 'markers': split('ASDFGHJKL', '\zs'),
  \ 'motion_count': 5,
  \ 'motion_timeout': 3000,
  \ 'use_japanese': v:true,
  \ 'highlight_hint_marker': {'bg': '#3c3c3c'}
  \ }

" ヒントグループ設定例
" ホームロウキーを単一文字ヒントに使用
let g:hellshake_yano = {
  \ 'single_char_keys': split('asdfghjkl', '\zs'),
  \ 'multi_char_keys': split('qwertyuiop', '\zs'),
  \ 'use_hint_groups': v:true
  \ }

" クイックアクセスのために数字を最初に（1-9, 0）
let g:hellshake_yano = {
  \ 'single_char_keys': split('1234567890ASDFGHJKL', '\zs'),
  \ 'multi_char_keys': split('QWERTYUIOPZXCVBNM', '\zs')
  \ }

" 好みに応じて数字を除外
let g:hellshake_yano = {
  \ 'single_char_keys': split('ASDFGHJKL', '\zs'),
  \ 'multi_char_keys': split('QWERTYUIOPZXCVBNM', '\zs')
  \ }

" キーリピート検出設定
" 高速キーリピート中のヒント表示を無効化（スムーズなスクロールのため）
let g:hellshake_yano = {
  \ 'suppress_on_key_repeat': v:true,    " キーリピート抑制を有効/無効（デフォルト: true）
  \ 'key_repeat_threshold': 50,          " リピート検出閾値（ミリ秒）（デフォルト: 50）
  \ 'key_repeat_reset_delay': 300        " リピート状態をリセットするまでの遅延（ミリ秒）（デフォルト: 300）
  \ }

" キーリピート抑制を無効化（常にヒントを表示）
let g:hellshake_yano = {
  \ 'suppress_on_key_repeat': v:false
  \ }

" カスタムキーリピートタイミング
let g:hellshake_yano = {
  \ 'key_repeat_threshold': 100,         " より遅いタイピングのためのより寛容な閾値
  \ 'key_repeat_reset_delay': 500        " 通常の動作に戻るまでのより長い遅延
  \ }
```

## 使用法

インストール後、プラグインはVimの組み込み単語モーションコマンドを強化して、日本語テキストで正しく動作するようにします。標準的なVimモーションを使用してナビゲート：

### 単語ナビゲーション

- `w` - 次の単語の先頭に前進
- `b` - 前の単語の先頭に後退
- `e` - 現在/次の単語の末尾に前進
- `ge` - 前の単語の末尾に後退

これらのモーションは日本語の単語境界を正しく認識し、英語と同じように日本語テキスト内の単語間をジャンプできます。

### コマンド

#### 基本コマンド

- `:HellshakeEnable` - プラグインを有効化
- `:HellshakeDisable` - プラグインを無効化
- `:HellshakeToggle` - プラグインをオン/オフ切り替え
- `:HellshakeShow` - すぐにヒントを表示
- `:HellshakeHide` - 表示されているヒントを非表示

#### 設定コマンド

- `:HellshakeSetCount <number>` - モーション数閾値を設定
- `:HellshakeSetTimeout <ms>` - モーションタイムアウトをミリ秒単位で設定
- `:HellshakeSetCountedMotions <keys>` - 追跡するカスタムモーションキーを設定

#### デバッグコマンド

- `:HellshakeDebug` - 包括的なデバッグ情報を表示
- `:HellshakeShowDebug` - `:HellshakeDebug`のエイリアス

## アーキテクチャ v4.0（2025年10月）

hellshake-yano.vim v4.0は、積極的なコード削減とTDD駆動のリファクタリングにより、100%の後方互換性を維持しながら**51.9%のコード削減**（16,994 → 8,816行）を達成した大幅に最適化されたアーキテクチャを導入しています。

### コード削減の達成

| 指標 | 変更前 | 変更後 | 改善 |
|------|--------|--------|------|
| **総行数** | 16,994 | 8,816 | **51.9%削減** |
| **core.ts** | 4,699 | 2,792 | 40.6%削減 |
| **word.ts** | 4,923 | 1,825 | 62.9%削減 |
| **hint.ts** | 1,926 | 545 | 71.7%削減 |
| **削除されたファイル** | - | 5ファイル（1,496行） | 完全に削除 |

### モジュール構造（v4.0）

#### コアモジュール（denops/hellshake-yano/）

- **main.ts** - プラグインエントリーポイントとDenopsディスパッチャー
- **core.ts** - コアビジネスロジックと統合ヒントシステム
- **word.ts** - 単語検出と日本語テキスト処理
- **hint.ts** - ヒント生成と表示ロジック
- **config.ts** - 設定管理
- **types.ts** - TypeScript型定義
- **cache.ts** - 統合キャッシュシステム（88%メモリ削減）
- **display.ts** - 表示およびレンダリングユーティリティ
- **validation.ts** - 入力検証ロジック
- **validation-utils.ts** - 検証ユーティリティ関数
- **dictionary.ts** - 辞書管理
- **performance.ts** - パフォーマンス監視

#### サブモジュール

**word/** - 単語検出戦略
- **word-detector-strategies.ts** - 検出アルゴリズム実装
- **word-segmenter.ts** - 日本語テキスト分割（TinySegmenter）
- **word-char-utils.ts** - 文字タイプユーティリティ
- **word-detector-base.ts** - ベース検出クラス
- **word-cache.ts** - 単語検出キャッシュ

**hint/** - ヒント生成戦略
- **hint-generator-strategies.ts** - ヒント生成アルゴリズム

### 削除されたファイル（v4.0）

最適化プロセス中に以下のファイルが完全に削除されました：

- `word/word-dictionary.ts`（742行） - dictionary.tsにマージ
- `word/word-encoding.ts`（139行） - word.tsに統合
- `hint/hint-display.ts`（256行） - hint.tsにマージ
- `config/config-loader.ts`（221行） - 未使用のYAMLローダー
- `config/*.yml`（138行） - 未使用の設定ファイル

### パフォーマンス改善

- **実行時間**: 90ms → 38ms（58%高速化）
- **メモリ使用量**: 2-3MB → 1-1.5MB（50%削減）
- **キャッシュヒット率**: 頻繁にアクセスされるデータで最大92.5%
- **操作速度**: キャッシュ操作あたり < 0.001ms

## アーキテクチャ v2.0

hellshake-yano.vim v2.0は、TDD（テスト駆動開発）原則に基づいて構築された革命的なアーキテクチャを導入し、100%の後方互換性を維持しながら劇的なパフォーマンス改善を達成しています。

### 主要なアーキテクチャ変更

#### v2.0以前
```
main.ts（3,456行）
├── すべての機能が混在
├── ビジネスロジックが散在
├── エラー処理が分散
└── テストが困難なモノリス
```

#### v2.0以降
```
main.ts（781行）+ Core.ts（2,000行）
├── main.ts: エントリーポイント + ディスパッチャー
├── Core.ts: 統合ビジネスロジック
├── 関心の明確な分離
└── TDD駆動の高品質実装
```

### ディスパッチャーパターン

新しいアーキテクチャは、エントリーポイントとビジネスロジック間のクリーンな分離のために**ディスパッチャーパターン**を実装しています：

```typescript
// v2.0 - 軽量ディスパッチャー
denops.dispatcher = {
  async showHints(): Promise<void> {
    const core = Core.getInstance();
    await core.showHints(denops);  // Coreに委譲
  },
  async hideHints(): Promise<void> {
    const core = Core.getInstance();
    await core.hideHintsOptimized(denops);
  }
  // ... その他のコマンド
}
```

### Coreクラス統合

すべての主要機能は、シングルトンパターンを使用して`Core`クラスに統合されています：

```typescript
// 統合Coreにアクセス
const core = Core.getInstance(config);

// Coreを通じてすべての主要操作
await core.showHints(denops);
await core.detectWordsOptimized(denops, bufnr);
const debugInfo = core.collectDebugInfo();
```

### パフォーマンス達成

| 指標 | v1.x | v2.0 | 改善 |
|------|------|------|------|
| **main.ts行数** | 3,456 | 781 | **77%削減** |
| **実行時間** | 90ms | 38ms | **58%高速化** |
| **メモリ使用量** | 2-3MB | 1-1.5MB | **50%削減** |
| **テストカバレッジ** | 部分的 | 652テスト | **完全カバレッジ** |

### 後方互換性

v2.0は**100%の後方互換性**を維持しています：

```vim
" 既存の設定は変更なしで動作
let g:hellshake_yano_config = {
\   'enabled': v:true,
\   'hint_keys': ['a', 's', 'd', 'f'],
\   'min_length': 3,
\   'use_japanese': v:true
\ }

" すべての既存のコマンドは以前と同様に動作
:call hellshake#enable()
:call hellshake#disable()
```

### 品質保証

v2.0は堅固なTDD基盤の上に構築されています：

- **652テスト**: すべてのテストが継続的に合格
- **Red-Green-Refactor**: 体系的なTDDアプローチ
- **型安全性**: 包括的なTypeScript型付け
- **統合テスト**: 完全なワークフロー検証

### 新しいv2.0機能

#### 拡張デバッグ情報
```vim
" 包括的なデバッグデータを取得
:call denops#request('hellshake-yano', 'getDebugInfo', [])
```

#### 辞書システム
```vim
" 組み込み辞書管理
:call denops#request('hellshake-yano', 'reloadDictionary', [])
:call denops#request('hellshake-yano', 'showDictionary', [])
```

#### パフォーマンス監視
```vim
" リアルタイムパフォーマンス統計
:call denops#request('hellshake-yano', 'getPerformanceStats', [])
```

### ドキュメント

新しいアーキテクチャの包括的なドキュメント：

- [アーキテクチャ概要](docs/architecture-main.md) - main.ts構造とパターン
- [Core APIリファレンス](docs/core-api-reference.md) - 完全なCoreクラスドキュメント
- [v2.0移行ガイド](docs/v2-migration-guide.md) - アップグレード手順と新機能
- [パフォーマンスレポート](docs/v2-performance-improvements.md) - 詳細なパフォーマンス分析

### 将来性のある設計

v2.0アーキテクチャは拡張性を考慮して設計されています：

- **モジュラーコンポーネント**: 拡張と変更が容易
- **明確なインターフェース**: 明確に定義されたAPI境界
- **テスト駆動**: 継続的な品質保証
- **型安全**: 完全なTypeScriptサポート

## 技術詳細

### UTF-8エンコーディングサポート

このプラグインは、文字が異なるバイト数を占める（日本語: 3バイト、ASCII: 1バイト）UTF-8エンコードされた日本語テキストの複雑さを正しく処理します。文字位置とバイト位置の間を正確に変換し、カーソル移動コマンドがNeovimの内部バッファ表現で正しく動作することを保証します。

### 単語境界検出アルゴリズム

プラグインは以下を使用して日本語テキストの単語境界をインテリジェントに検出します：

1. **文字タイプ分析**: ひらがな、カタカナ、漢字、英数字を区別
2. **境界ルール**: 文字タイプの遷移に基づいて自然な単語の区切りを識別
3. **コンテキスト検出**: 周囲のコンテキストに基づいて異なるルールを適用
4. **精度モード**: 異なるユースケースのための3つのレベルの検出精度：
   - 基本: シンプルな文字タイプ遷移
   - 改善: 一般的なパターンのための拡張ルール
   - 精密: 複雑なケースのための高度な検出

## トラブルシューティング

### 一般的な問題と解決策

#### ヒントが表示されない

1. プラグインが有効かどうか確認: `:echo g:hellshake_yano.enabled`
2. モーション数設定を確認: `:echo g:hellshake_yano.motion_count`
3. キーごとの最小長設定を確認: `:echo g:hellshake_yano.per_key_min_length`
4. デフォルトの最小単語長を確認: `:echo g:hellshake_yano.default_min_word_length`
5. denopsが適切にインストールされ、実行されていることを確認
6. `:HellshakeDebug`を使用して現在の状態を確認

#### スクロール中にヒントが表示される

- キーリピート抑制設定を調整:
  ```vim
  let g:hellshake_yano.suppress_on_key_repeat = v:true
  let g:hellshake_yano.key_repeat_threshold = 30  " より積極的な抑制
  ```

#### パフォーマンスの問題

1. ボトルネックを特定するためにパフォーマンスロギングを有効化:
   ```vim
   let g:hellshake_yano.performance_log = v:true
   ```
2. `:HellshakeDebug`を実行してパフォーマンス指標を表示
3. ヒントマーカーの数を減らすことを検討
4. 必要ない場合は日本語単語検出を無効化:
   ```vim
   let g:hellshake_yano.use_japanese = v:false
   ```

#### キーごとの設定が動作しない

1. 設定構文が正しいことを確認: `:echo g:hellshake_yano.per_key_min_length`
2. キーがper_key_min_length辞書に存在することを確認
3. default_min_word_lengthが適切に設定されていることを確認
4. まずシンプルな設定でテスト:
   ```vim
   let g:hellshake_yano.per_key_min_length = {'v': 1}
   ```

#### 日本語テキストでの単語検出が不正確

1. UTF-8エンコーディングを確認: `:set encoding?`は`utf-8`を表示するはず
2. ファイルエンコーディングを確認: `:set fileencoding?`
3. 日本語検出が有効になっていることを確認: `:echo g:hellshake_yano.use_japanese`

#### ハイライトが見えない

1. カラースキームの互換性を確認
2. 異なるハイライトグループの使用を試す:
   ```vim
   let g:hellshake_yano.highlight_hint_marker = 'Search'
   let g:hellshake_yano.highlight_hint_marker_current = 'IncSearch'
   ```
3. カスタムカラーを使用:
   ```vim
   let g:hellshake_yano.highlight_hint_marker = {'fg': '#00ff00', 'bg': '#000000'}
   ```

### デバッグ情報

問題を報告する際は、以下の出力を含めてください：

1. `:HellshakeDebug` - 完全なデバッグ情報
2. `:echo g:hellshake_yano` - 現在の設定
3. `:version` - Neovimバージョン
4. 問題を再現する最小限の設定

## 開発

### ビルド

```bash
# TypeScriptをコンパイル
deno task build

# テストを実行
deno test -A

# 特定のテストファイルを実行
deno test -A tests/refactor_test.ts

# デバッグのためにトレースを実行
deno test -A --trace-leaks
```

### ディレクトリ構造（v4.0）

```
hellshake-yano.vim/
├── autoload/
│   └── hellshake-yano.vim # VimScriptインターフェース
├── denops/
│   └── hellshake-yano/
│       ├── main.ts                # メインエントリーポイント（Denopsディスパッチャー）
│       ├── core.ts                # コアビジネスロジック（2,792行）
│       ├── word.ts                # 単語検出（1,825行）
│       ├── hint.ts                # ヒント生成（545行）
│       ├── config.ts              # 設定管理
│       ├── types.ts               # 型定義
│       ├── cache.ts               # 統合キャッシュシステム
│       ├── display.ts             # 表示ユーティリティ
│       ├── validation.ts          # 検証ロジック
│       ├── validation-utils.ts    # 検証ユーティリティ
│       ├── dictionary.ts          # 辞書管理
│       ├── performance.ts         # パフォーマンス監視
│       ├── word/
│       │   ├── word-detector-strategies.ts  # 検出アルゴリズム
│       │   ├── word-segmenter.ts            # 日本語分割
│       │   ├── word-char-utils.ts           # 文字ユーティリティ
│       │   ├── word-detector-base.ts        # ベース検出器
│       │   └── word-cache.ts                # 単語キャッシュ
│       └── hint/
│           └── hint-generator-strategies.ts # ヒントアルゴリズム
├── plugin/
│   └── hellshake-yano.vim # プラグイン初期化
├── tests/                  # 包括的なテストスイート（631テスト）
│   ├── highlight_rendering_test.ts  # ハイライトレンダリングテスト
│   └── [その他のテストファイル]
├── docs/
│   └── ERROR_HANDLING_GUIDE.md # エラー処理ベストプラクティス
├── PLAN.md                # 開発計画と進捗
├── MIGRATION.md           # 移行ガイド（v3.0 → v4.0）
├── PERFORMANCE_REPORT.md  # パフォーマンス改善レポート
└── README.md
```

## ライセンス

MITライセンス

## 変更履歴

### 最近の更新

- **コード整理の改善**: 非推奨関数を削除し、コードベースをクリーンアップ
- **パフォーマンス最適化**: 即座ジャンプのための1文字ヒント応答時間を強化
- **UTF-8サポート**: 日本語文字の完全サポートと適切なバイト位置計算
- **ヒントグループ分離**: 予測可能なナビゲーションのための単一文字と複数文字ヒント間の厳密な分離

## コントリビューション

プルリクエストと問題報告を歓迎します。

## 作者

[Your Name]

