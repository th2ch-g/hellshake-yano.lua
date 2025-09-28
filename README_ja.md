# hellshake-yano.vim

日本語テキストでシームレスな単語単位のカーソル移動を実現するNeovimプラグイン

## 概要

hellshake-yano.vimは、日本語テキストの単語境界を正確に検出し、単語単位でのシームレスなカーソル移動を可能にするNeovimプラグインです。UTF-8エンコーディングに完全対応し、日本語文字（3バイト文字）を適切に処理することで、英語と同じように快適な単語ナビゲーションを実現します。

## 主な機能

- **正確な単語境界検出**: 日本語テキストの単語境界を精密に識別
- **シームレスなカーソル移動**: 標準のVimモーション（w, b, e）で日本語単語間を移動
- **混在テキスト対応**: 日本語・英語が混在したテキストでも完璧に動作
- **UTF-8完全対応**: マルチバイト日本語文字のバイト位置を正確に計算
- **カスタマイズ可能な精度**: 用途に応じて単語検出アルゴリズムを調整可能
- **キーリピート抑制**: hjklキーの高速連打時にヒント表示を抑制してスムーズなスクロールを実現
- **Visual modeヒント位置**: Visual modeで単語の語尾にヒントを表示し、自然な選択操作を実現
- **厳密なキー分離**: single_char_keysとmulti_char_keysの完全分離で予測可能なナビゲーション
- **パフォーマンス最適化**: 1文字ヒントの即座ジャンプ（遅延なし）
- **スマート自動検出**: single/multi char keysが設定されると自動でヒントグループを有効化
- **デバッグモード**: プラグインの動作状態を詳細に確認できるデバッグ機能
- **パフォーマンスログ**: 実行時間を記録して性能のボトルネックを特定
- **辞書システム**: ビルトイン辞書とユーザー定義辞書による日本語単語分割の改善
- **ヒントパターンマッチング**: 正規表現によるヒント優先順位設定（チェックボックス、リスト、見出し対応）

## インストール

### vim-plugを使用する場合

```vim
Plug 'username/hellshake-yano.vim'
```

### lazy.nvimを使用する場合

```lua
{
  'username/hellshake-yano.vim',
  config = function()
    -- 設定をここに記述
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

| オプション                      | 型          | デフォルト      | 説明                                              |
| ------------------------------- | ----------- | --------------- | ------------------------------------------------- |
| `markers`                       | 配列        | A-Z分割         | ヒントマーカーとして使用する文字                  |
| `motion_count`                  | 数値        | 3               | ヒント表示までのモーション回数（レガシー）        |
| `default_motion_count`          | 数値        | 未定義          | 未指定キーのデフォルトモーションカウント          |
| `per_key_motion_count`          | 辞書        | {}              | キーごとのモーションカウント設定                  |
| `motion_timeout`                | 数値        | 2000            | モーションカウントのタイムアウト（ミリ秒）        |
| `hint_position`                 | 文字列      | 'start'         | ヒントの表示位置（'start'または'end'）            |
| `trigger_on_hjkl`               | 真偽値      | v:true          | hjkl移動でのトリガーを有効化                      |
| `counted_motions`               | 配列        | []              | カスタムモーションキー（trigger_on_hjklを上書き） |
| `enabled`                       | 真偽値      | v:true          | プラグインの有効/無効                             |
| `single_char_keys`              | 配列        | ASDFGHJKLNM0-9  | 1文字ヒント用キー                                 |
| `multi_char_keys`               | 配列        | BCEIOPQRTUVWXYZ | 2文字以上ヒント用キー                             |
| `use_hint_groups`               | 真偽値      | v:true          | ヒントグループ機能を有効化                        |
| `use_numbers`                   | 真偽値      | v:true          | 数字キーをヒントに使用可能にする                  |
| `max_single_char_hints`         | 数値        | -               | オプション：1文字ヒントを制限                     |
| `use_japanese`                  | 真偽値      | v:true          | 日本語単語検出を有効化                            |
| `highlight_hint_marker`         | 文字列/辞書 | 'DiffAdd'       | マーカーのハイライト                              |
| `highlight_hint_marker_current` | 文字列/辞書 | 'DiffText'      | 現在のマーカーのハイライト                        |
| `suppress_on_key_repeat`        | 真偽値      | v:true          | 高速キーリピート時のヒント抑制                    |
| `key_repeat_threshold`          | 数値        | 50              | キーリピート検出閾値（ミリ秒）                    |
| `key_repeat_reset_delay`        | 数値        | 300             | キーリピート後のリセット遅延（ミリ秒）            |
| `per_key_min_length`            | 辞書        | {}              | キー別最小文字数設定                              |
| `default_min_word_length`       | 数値        | 2               | デフォルト最小文字数                              |
| `debug_mode`                    | 真偽値      | v:false         | デバッグモードを有効化                            |
| `performance_log`               | 真偽値      | v:false         | パフォーマンスログを有効化                        |

## UnifiedConfig システム（v3.x の新機能）

hellshake-yano.vim v3.xでは、すべての設定を単一のフラット構造でcamelCase命名規則により統一する革新的な設定システムを導入しました。これは従来の階層化されたsnake_case設定アプローチに代わるものです。

### 主な利点

- **シンプルな構造**: 単一のフラット設定インターフェース（32項目）
- **camelCase統一**: すべての設定で一貫した命名規則
- **型安全性**: TypeScriptによる厳密なバリデーションサポート
- **パフォーマンス**: ネストなしの直接プロパティアクセス
- **移行サポート**: レガシー設定からの自動変換

### UnifiedConfig インターフェース

新しい設定システムは、すべての設定を単一の`UnifiedConfig`インターフェースに統合します：

```typescript
interface UnifiedConfig {
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

  // ... さらに21個の設定項目
}
```

### モダン設定例

**新しいv3.x camelCaseスタイル：**
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

**レガシーsnake_case（まだサポートされています）：**
```vim
let g:hellshake_yano = {
  \ 'core': { 'enabled': v:true },
  \ 'hint': { 'hint_position': 'start' },
  \ 'word': { 'min_word_length': 3, 'use_japanese': v:true }
  \ }
```

### 移行ガイド

プラグインはv2.x設定からのシームレスな移行を提供します：

1. **自動検出**: レガシー設定は自動的に変換されます
2. **段階的移行**: 移行期間中は両方のフォーマットが動作します
3. **バリデーション**: 設定の正確性を保証する組み込みバリデーション
4. **ヘルパー関数**: 手動変換のための`toUnifiedConfig()`

### 設定例

**日本語開発に最適：**
```vim
let g:hellshake_yano = #{
\   useJapanese: v:true,
\   useTinySegmenter: v:true,
\   minWordLength: 2,
\   perKeyMinLength: #{
\     'v': 1,    " ビジュアル選択 - 全文字
\     'f': 1,    " 文字検索 - 全文字
\     'w': 3,    " 単語移動 - 意味のある単語のみ
\     'e': 2     " 単語末尾 - バランス重視
\   },
\   enableHighlight: v:true,
\   cacheSize: 2000
\ }
```

**パフォーマンス最適化：**
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

包括的な設定ドキュメント：
- [UnifiedConfig APIリファレンス](docs/unified-config-api.md) - 完全なAPIドキュメント
- [設定例](docs/unified-config-api.md#usage-examples) - 実用的な使用パターン
- [移行ガイド](MIGRATION.md) - v2.xからのステップバイステップ移行
- [型定義](docs/unified-config-api.md#type-definitions) - TypeScriptインターフェース

### 後方互換性

プラグインはv2.x設定との完全な後方互換性を維持しながら、新しいシステムへのユーザーガイドとして非推奨警告を提供します。レガシー設定はv4.0.0まで動作し続けます。

### キー別最小文字数設定

**強化機能**:
キーごとに異なる最小文字数を設定し、移動タイプとコンテキストに基づいてヒント表示を最適化できます。`per_key_min_length`で定義されたキーは**自動的にマッピング**されます -
`counted_motions`を手動で設定する必要はありません。

この機能により、特定のキーに対するヒント表示の細かい制御が可能になり、以下が実現できます：

- ビジュアルモードキーでの**精密な移動**（1文字ヒント）
- hjklナビゲーションでの**ノイズ軽減**（2文字以上ヒント）
- 移動タイプごとの**カスタマイズされた閾値**
- 設定されたキーの**自動マッピング**

#### 基本設定

```vim
let g:hellshake_yano = {
  \ 'per_key_min_length': {
  \   'v': 1,   " ビジュアルモード - 精密な移動
  \   'V': 1,   " ビジュアル行モード
  \   'w': 1,   " 単語前進
  \   'b': 1,   " 単語後退
  \   'h': 2,   " 左（ノイズ軽減）
  \   'j': 2,   " 下
  \   'k': 2,   " 上
  \   'l': 2,   " 右
  \   'f': 3,   " 文字検索
  \   'F': 3,   " 文字後方検索
  \ },
  \ 'default_min_word_length': 2,
  \ 'motion_count': 3,   " 3回の動きの後にヒントをトリガー
  \ }
" 注意: per_key_min_lengthのキーは自動的にマッピングされます！
" counted_motionsを別途設定する必要はありません。
```

#### ユースケース

**精密な移動（1文字ヒント）**

- ビジュアルモード選択では精密なカーソル配置が必要
- 単語モーション（w, b, e）は全ての可能なターゲットを表示することで恩恵を受ける
- 1文字ヒントは最大の精度のために即座に表示される

**ノイズ軽減（2文字以上ヒント）**

- 大きなファイルでのhjklナビゲーションは、多すぎるヒントで圧倒される可能性がある
- より高い閾値により、スクロール中の視覚的ノイズを軽減
- スムーズなナビゲーション体験を維持

**モーション固有の最適化**

- 検索操作（f, F, t, T）はしばしば長い単語をターゲットにする
- 検索モーション（/, ?）はより長い最小長で良く動作する
- 異なるモーションタイプは異なる精度要求を持つ

#### レガシー設定からの移行

**移行前（レガシー）**:

```vim
let g:hellshake_yano = {
  \ 'min_word_length': 2
  \ }
```

**移行後（キー別）**:

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

1. `default_min_word_length`を古い`min_word_length`に合わせて設定
2. 異なる動作が欲しいキーに固有の上書きを追加
3. 各変更を段階的にテスト
4. 移行完了後に古い`min_word_length`設定を削除

**主な機能**:

- **自動マッピング**: `per_key_min_length`のキーは自動的にモーションマッピングに追加されます
- **手動設定不要**: per-key設定されたキーには`counted_motions`の設定が不要です
- **完全な後方互換性**: 既存の設定は変更なしで動作し続けます
- **動的コンテキスト**: 各キー押下でコンテキストが更新され、正確なフィルタリングが行われます

**`counted_motions`との組み合わせ**:

```vim
let g:hellshake_yano = {
  \ 'per_key_min_length': {
  \   'v': 1,  " 1文字最小で自動マッピング
  \   'h': 2,  " 2文字最小で自動マッピング
  \ },
  \ 'counted_motions': ['g', 'd'],  " default_min_word_lengthを使用する追加キー
  \ 'default_min_word_length': 3,
  \ }
" 結果: v(1), h(2), g(3), d(3) すべてが追跡されます
```

#### パフォーマンスに関する考慮事項

- **キャッシュ最適化**:
  キー別設定により、キーコンテキストに基づくインテリジェントなキャッシングが可能
- **メモリ使用量**: 最小限のオーバーヘッド - 指定されたキーの上書きのみを保存
- **大きなファイルに推奨される設定**:
  ```vim
  let g:hellshake_yano = {
    \ 'default_min_word_length': 3,
    \ 'per_key_min_length': {
    \   'v': 1,  " ビジュアルモードは精密に保つ
    \   'w': 2,  " 単語モーションをより反応よく
    \   'h': 4, 'j': 4, 'k': 4, 'l': 4  " hjklノイズを大幅に軽減
    \ }
    \ }
  ```

### Visual modeでのヒント位置設定

**新機能**: Visual
modeで単語を選択する際、ヒントを単語の語尾に表示し、より自然な選択操作を実現できます。通常、Visual
modeでは単語の語尾からヤンクすることが多いため、この機能により操作効率が向上します。

#### 設定例


### 辞書システム

プラグインは日本語の単語分割とヒント配置を改善するため、ビルトイン辞書とユーザー定義辞書の両方をサポートしています。

#### ビルトイン辞書

プラグインには以下を含む包括的な辞書が含まれています：
- **80以上の日本語プログラミング用語**: 関数定義、非同期処理、データベース接続など
- **一般的な複合語**: セグメンテーション時に自動的に保持
- **助詞の結合ルール**: 日本語の助詞（の、を、に等）のインテリジェントな処理

#### ユーザー定義辞書

特定のニーズに合わせてカスタム辞書を作成できます。プラグインは以下の順序で辞書ファイルを検索します：

1. `.hellshake-yano/dictionary.json`（プロジェクト固有）
2. `hellshake-yano.dict.json`（プロジェクトルート）
3. `~/.config/hellshake-yano/dictionary.json`（グローバル）

#### 辞書フォーマット

**JSONフォーマット**（推奨）:
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

**YAMLフォーマット**:
```yaml
customWords:
  - 機械学習
  - 深層学習
hintPatterns:
  - pattern: "^-\\s*\\[\\s*\\]\\s*(.)"
    hintPosition: "capture:1"
    priority: 100
```

**シンプルテキストフォーマット**:
```
# カスタム単語
機械学習
深層学習

# 保持する単語（!で始める）
!HelloWorld
!getElementById

# ヒントパターン（@優先度:パターン:位置）
@100:^-\s*\[\s*\]\s*(.):capture:1
```

#### ヒントパターンマッチング

特定の文書構造に対してヒント配置を優先するための正規表現パターンを定義できます：

- **チェックボックス**: `- [ ] タスク` → 「タ」にヒント
- **番号付きリスト**: `1. 項目` → 「項」にヒント
- **Markdownヘッダー**: `## タイトル` → 「タ」にヒント
- **日本語括弧**: 「内容」 → 「内」にヒント

#### 辞書コマンド

```vim
:HellshakeYanoReloadDict    " 辞書を再読み込み
:HellshakeYanoEditDict      " 辞書ファイルを編集
:HellshakeYanoShowDict      " 現在の辞書を表示
:HellshakeYanoValidateDict  " 辞書フォーマットを検証
```

#### 設定

```vim
let g:hellshake_yano_dictionary_path = '~/.config/my-dict.json'
let g:hellshake_yano_use_builtin_dict = v:true
let g:hellshake_yano_dictionary_merge = 'merge'  " または 'override'
```
### キーごとのモーションカウント設定

プラグインは**キーごとのモーションカウント**設定をサポートし、異なるキーが異なる押下回数でヒントをトリガーできます。これにより、異なるモーションタイプに最適なユーザー体験を実現します。

#### 基本設定

```vim
let g:hellshake_yano = {
  \ 'per_key_motion_count': {
  \   'v': 1,   " ビジュアルモード - 即座にヒント表示（1回押下）
  \   'V': 1,   " ビジュアル行モード - 即座にヒント
  \   'w': 1,   " 単語前進 - 即座にヒント
  \   'b': 1,   " 単語後退 - 即座にヒント
  \   'h': 3,   " 左 - 3回押下後にヒント表示
  \   'j': 3,   " 下 - 3回押下後にヒント表示
  \   'k': 3,   " 上 - 3回押下後にヒント表示
  \   'l': 3,   " 右 - 3回押下後にヒント表示
  \ },
  \ 'default_motion_count': 2,  " 未指定キーのデフォルト
  \ 'motion_count': 3,          " レガシーフォールバック
  \ }
```

#### ユースケース

**即座のヒント（カウント = 1）**

- ビジュアルモード選択では精密なカーソル配置が必要
- 単語モーション（w, b, e）は即座にヒントを表示することで恩恵を受ける
- 速度より精度が必要な操作に有用

**遅延ヒント（カウント = 3以上）**

- 通常モードでのhjklナビゲーションはそれほど精密である必要がない
- 高速スクロール中の視覚的ノイズを軽減
- スムーズなナビゲーション体験を維持

#### 設定の優先順位

プラグインはモーションカウント設定に以下の優先順位を使用します：

1. `per_key_motion_count[key]` - キー固有の設定
2. `default_motion_count` - 新しいデフォルト値
3. `motion_count` - レガシー設定（後方互換性）
4. `3` - ハードコードされたフォールバック

#### キーごとの最小長との組み合わせ

キーごとのモーションカウントとキーごとの最小長を組み合わせて、最大限の制御を実現できます：

```vim
let g:hellshake_yano = {
  \ 'per_key_motion_count': {
  \   'v': 1,   " 1回押下後にヒント表示
  \   'h': 3,   " 3回押下後にヒント表示
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

- `v`キー: 1回押下後、すべての単語（1文字を含む）のヒントを表示
- `h`キー: 3回押下後、2文字以上の単語のヒントを表示
- その他のキー: 2回押下後、2文字以上の単語のヒントを表示

### キーリピート抑制

hjklキーを高速で連打している際、ヒント表示を一時的に抑制してスムーズなスクロールを維持します。タイミングは設定可能で、機能を無効化することもできます。

- 有効/無効: `g:hellshake_yano.suppress_on_key_repeat`（デフォルト: `v:true`）
- リピート閾値: `g:hellshake_yano.key_repeat_threshold` ミリ秒（デフォルト: `50`）
- リセット遅延: `g:hellshake_yano.key_repeat_reset_delay` ミリ秒（デフォルト: `300`）

設定例は後述の設定例セクションを参照してください。

### デバッグモード

プラグインには、トラブルシューティングとパフォーマンス分析のための包括的なデバッグモードが含まれています：

- 有効/無効: `g:hellshake_yano.debug_mode`（デフォルト: `v:false`）
- デバッグ情報表示: `:HellshakeDebug` または `:HellshakeShowDebug`

デバッグモードで表示される情報：

- 現在のプラグイン設定
- モーションカウントとタイミング情報
- キーリピート検出状態
- バッファ固有の状態
- パフォーマンスメトリクス（performance_log有効時）

### パフォーマンスログ

組み込みのパフォーマンスログでプラグインのパフォーマンスを追跡：

- 有効/無効: `g:hellshake_yano.performance_log`（デフォルト: `v:false`）
- 主要な操作の実行時間を記録
- パフォーマンスのボトルネック特定に役立つ
- デバッグモード有効時に確認可能

### ヒントグループ設定

プラグインは、効率的なナビゲーションのために1文字ヒントと2文字以上ヒントを**厳密に分離**するインテリジェントなヒントグループ機能をサポートします：

- **1文字キー**: 単一キーによる即座のナビゲーション専用（即座にジャンプ）
- **2文字以上キー**: 2文字ヒント専用 - 1文字ヒントとしては決して表示されない
- **厳密な分離**: single_char_keysのキーは複数文字ヒントを生成しない（Aがsingle_char_keysにある場合、AAは生成されない）
- **自動検出**: single_char_keysまたはmulti_char_keysを設定すると自動でuse_hint_groupsが有効化
- **パフォーマンス最適化**: 1文字ヒントはハイライト遅延なしで即座にジャンプ
- **1文字ヒント最大数**: 1文字と複数文字ヒントのバランスを取るオプション制限

#### 重要な動作変更（v2.0以降）

厳密な分離を使用したヒントグループでは：
- 'A'が`single_char_keys`にある場合、'AA'は生成されません
- 'B'が`multi_char_keys`のみにある場合、'B'は1文字ヒントとして表示されません
- 1文字ヒントは2文字目を待たずに即座にジャンプ
- 複数文字ヒントは最初のキーを押すと視覚的フィードバックを表示

### 高度なハイライト設定

ハイライトグループ名または色辞書を使用してハイライトをカスタマイズできます：

```vim
" 既存のハイライトグループを使用
let g:hellshake_yano = {
  \ 'highlight_hint_marker': 'Search',
  \ 'highlight_hint_marker_current': 'IncSearch'
  \ }

" fg/bgでカスタム色を使用
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
" ホームロウキーを1文字ヒントに使用
let g:hellshake_yano = {
  \ 'single_char_keys': split('asdfghjkl', '\zs'),
  \ 'multi_char_keys': split('qwertyuiop', '\zs'),
  \ 'use_hint_groups': v:true
  \ }

" 数字を優先的に使用（素早いアクセス）
let g:hellshake_yano = {
  \ 'single_char_keys': split('1234567890ASDFGHJKL', '\zs'),
  \ 'multi_char_keys': split('QWERTYUIOPZXCVBNM', '\zs')
  \ }

" 数字を除外したい場合
let g:hellshake_yano = {
  \ 'single_char_keys': split('ASDFGHJKL', '\zs'),
  \ 'multi_char_keys': split('QWERTYUIOPZXCVBNM', '\zs')
  \ }

" キーリピート検出設定
" 高速スクロール時のヒント表示抑制（スムーズなスクロール優先）
let g:hellshake_yano = {
  \ 'suppress_on_key_repeat': v:true,    " キーリピート抑制を有効化（デフォルト: true）
  \ 'key_repeat_threshold': 50,          " リピート検出閾値（ミリ秒、デフォルト: 50）
  \ 'key_repeat_reset_delay': 300        " リピート状態リセット遅延（ミリ秒、デフォルト: 300）
  \ }

" キーリピート抑制を無効化（常にヒントを表示）
let g:hellshake_yano = {
  \ 'suppress_on_key_repeat': v:false
  \ }

" カスタムキーリピートタイミング
let g:hellshake_yano = {
  \ 'key_repeat_threshold': 100,         " ゆっくりしたタイピング用の緩い閾値
  \ 'key_repeat_reset_delay': 500        " 通常動作に戻るまでの遅延を長く
  \ }
```

## 使用方法

プラグインをインストールすると、Vimの標準的な単語移動コマンドが日本語テキストでも正しく動作するようになります。通常のVimモーションでナビゲートできます：

### 単語ナビゲーション

- `w` - 次の単語の先頭へ移動
- `b` - 前の単語の先頭へ移動
- `e` - 現在/次の単語の末尾へ移動
- `ge` - 前の単語の末尾へ移動

これらのモーションが日本語の単語境界を正しく認識するようになり、英語と同じように日本語テキスト内で単語間をジャンプできます。

### コマンド

#### 基本コマンド

- `:HellshakeEnable` - プラグインを有効化
- `:HellshakeDisable` - プラグインを無効化
- `:HellshakeToggle` - プラグインの有効/無効を切り替え
- `:HellshakeShow` - ヒントを即座に表示
- `:HellshakeHide` - 表示中のヒントを非表示

#### 設定コマンド

- `:HellshakeSetCount <数値>` - モーションカウント閾値を設定
- `:HellshakeSetTimeout <ミリ秒>` - モーションタイムアウトをミリ秒で設定
- `:HellshakeSetCountedMotions <キー>` - カスタムモーションキーを設定

#### デバッグコマンド

- `:HellshakeDebug` - 包括的なデバッグ情報を表示
- `:HellshakeShowDebug` - `:HellshakeDebug`のエイリアス

## 技術的詳細

### UTF-8エンコーディング対応

このプラグインは、UTF-8エンコードされた日本語テキストの複雑さを正しく処理します。文字によって占有するバイト数が異なる（日本語：3バイト、ASCII：1バイト）環境で、文字位置とバイト位置を正確に変換し、Neovimの内部バッファ表現でカーソル移動コマンドが正しく動作することを保証します。

### 単語境界検出アルゴリズム

日本語テキストの単語境界をインテリジェントに検出：

1. **文字種別分析**: ひらがな、カタカナ、漢字、英数字を区別
2. **境界ルール**: 文字種の変化に基づいて自然な単語区切りを識別
3. **文脈検出**: 周囲の文脈に応じて異なるルールを適用
4. **精度モード**: 用途に応じた3段階の検出精度：
   - 基本: シンプルな文字種変化
   - 改善: 一般的なパターンの強化ルール
   - 精密: 複雑なケースのための高度な検出

## トラブルシューティング

### よくある問題と解決方法

#### ヒントが表示されない

1. プラグインが有効か確認: `:echo g:hellshake_yano.enabled`
2. モーションカウント設定を確認: `:echo g:hellshake_yano.motion_count`
3. キー別最小文字数設定を確認: `:echo g:hellshake_yano.per_key_min_length`
4. デフォルト最小文字数を確認: `:echo g:hellshake_yano.default_min_word_length`
5. denopsが正しくインストール・動作しているか確認
6. `:HellshakeDebug`で現在の状態を確認

#### スクロール中にヒントが表示される

- キーリピート抑制設定を調整:
  ```vim
  let g:hellshake_yano.suppress_on_key_repeat = v:true
  let g:hellshake_yano.key_repeat_threshold = 30  " より積極的な抑制
  ```

#### パフォーマンスの問題

1. パフォーマンスログを有効にしてボトルネックを特定:
   ```vim
   let g:hellshake_yano.performance_log = v:true
   ```
2. `:HellshakeDebug`でパフォーマンスメトリクスを表示
3. ヒントマーカーの数を削減を検討
4. 必要なければ日本語単語検出を無効化:
   ```vim
   let g:hellshake_yano.use_japanese = v:false
   ```

#### キー別設定が動作しない

1. 設定構文が正しいか確認: `:echo g:hellshake_yano.per_key_min_length`
2. per_key_min_length辞書にキーが存在するか確認
3. default_min_word_lengthが適切に設定されているか確認
4. まずシンプルな設定でテスト:
   ```vim
   let g:hellshake_yano.per_key_min_length = {'v': 1}
   ```

#### 日本語テキストで単語検出が正しくない

1. UTF-8エンコーディングを確認: `:set encoding?` で`utf-8`が表示されること
2. ファイルエンコーディングを確認: `:set fileencoding?`
3. 日本語検出が有効か確認: `:echo g:hellshake_yano.use_japanese`

#### ハイライトが見えない

1. カラースキームとの互換性を確認
2. 別のハイライトグループを試す:
   ```vim
   let g:hellshake_yano.highlight_hint_marker = 'Search'
   let g:hellshake_yano.highlight_hint_marker_current = 'IncSearch'
   ```
3. カスタム色を使用:
   ```vim
   let g:hellshake_yano.highlight_hint_marker = {'fg': '#00ff00', 'bg': '#000000'}
   ```

### デバッグ情報

問題を報告する際は、以下の出力を含めてください:

1. `:HellshakeDebug` - 完全なデバッグ情報
2. `:echo g:hellshake_yano` - 現在の設定
3. `:version` - Neovimのバージョン
4. 問題を再現する最小限の設定

## 開発

### ビルド

```bash
# TypeScriptのコンパイル
deno task build

# テストの実行
deno test -A

# 特定のテストファイルを実行
deno test -A tests/refactor_test.ts

# デバッグ用トレース付きで実行
deno test -A --trace-leaks
```

### ディレクトリ構造

```
hellshake-yano.vim/
├── autoload/
│   └── hellshake-yano.vim # VimScriptインターフェース
├── denops/
│   └── hellshake-yano/
│       ├── main.ts         # メインエントリポイント
│       ├── word/
│       │   ├── detector.ts # 単語検出ロジック
│       │   └── manager.ts  # 単語マネージャー
│       └── utils/
│           └── encoding.ts # UTF-8エンコーディングユーティリティ
├── plugin/
│   └── hellshake-yano.vim # プラグイン初期化
├── tests/                  # 包括的なテストスイート
│   ├── refactor_test.ts   # VimScriptリファクタリングテスト
│   └── helpers/
│       └── mock.ts        # テストユーティリティ
├── PLAN.md                # 開発計画
└── README.md
```

## ライセンス

MIT License

## 変更履歴

### 最近の更新

- **コード整理の改善**: 非推奨関数の削除とコードベースのクリーンアップ
- **パフォーマンス最適化**: 1文字ヒントの応答時間を改善し、即座にジャンプできるように
- **UTF-8サポート**: 日本語文字の完全サポートと適切なバイト位置計算
- **ヒントグループ分離**: 予測可能なナビゲーションのために1文字と複数文字ヒントを厳密に分離

## 貢献

プルリクエストやイシューの報告を歓迎します。

## 作者

[Your Name]
