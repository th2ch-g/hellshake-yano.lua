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
- **厳密なキー分離**: singleCharKeysとmultiCharKeysの完全な分離により予測可能なナビゲーション
- **パフォーマンス最適化**: 単一文字ヒントの遅延なし即座ジャンプ
- **スマート自動検出**: single/multi char keysが設定されている場合、ヒントグループを自動有効化
- **辞書システム**: 日本語単語分割を改善するための組み込みおよびユーザー定義辞書
- **ヒントパターンマッチング**: ドキュメント構造（チェックボックス、リスト、ヘッダー）のための正規表現ベースのヒント優先順位付け

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
let g:hellshake_yano = #{
\   markers: split('ABCDEFGHIJKLMNOPQRSTUVWXYZ', '\zs'),
\   motionCount: 3,
\   motionTimeout: 2000,
\   hintPosition: 'start',
\   triggerOnHjkl: v:true,
\   countedMotions: [],
\   enabled: v:true,
\   singleCharKeys: split('ASDFGHJKLNM0123456789', '\zs'),
\   multiCharKeys: split('BCEIOPQRTUVWXYZ', '\zs'),
\   useHintGroups: v:true,
\   useNumbers: v:true,
\   useJapanese: v:true,
\   perKeyMinLength: {},
\   defaultMinWordLength: 2,
\   highlightHintMarker: 'DiffAdd',
\   highlightHintMarkerCurrent: 'DiffText'
\ }
```

### 設定オプション

| オプション                          | タイプ      | デフォルト      | 説明                                                    |
| ----------------------------------- | ----------- | --------------- | ------------------------------------------------------- |
| `markers`                           | array       | A-Z split       | ヒントマーカーとして使用される文字                      |
| `motionCount`                       | number      | 3               | ヒントが表示されるまでのモーション数（レガシー）        |
| `defaultMotionCount`                | number      | undefined       | 未指定キーのデフォルトモーション数                      |
| `perKeyMotionCount`                 | dict        | {}              | キーごとのモーション数設定                              |
| `motionTimeout`                     | number      | 2000            | モーション数タイムアウト（ミリ秒）                      |
| `hintPosition`                      | string      | 'start'         | ヒントを表示する位置（'start'または'end'）              |
| `triggerOnHjkl`                     | boolean     | v:true          | hjkl移動でのトリガーを有効化                            |
| `countedMotions`                    | array       | []              | 追跡するカスタムモーションキー（triggerOnHjklを上書き） |
| `enabled`                           | boolean     | v:true          | プラグインを有効/無効化                                 |
| `singleCharKeys`                    | array       | ASDFGHJKLNM0-9  | 単一文字ヒントに使用されるキー（記号サポート）          |
| `multiCharKeys`                     | array       | BCEIOPQRTUVWXYZ | 複数文字ヒントに使用されるキー                          |
| `useHintGroups`                     | boolean     | v:true          | ヒントグループ機能を有効化                              |
| `useNumbers`                        | boolean     | v:true          | ヒントに数字キーを許可                                  |
| `useNumericMultiCharHints`          | boolean     | v:false         | 数字2文字ヒントを有効化（01-99, 00）                    |
| `maxSingleCharHints`                | number      | -               | オプション: 単一文字ヒントを制限                        |
| `useJapanese`                       | boolean     | v:true          | 日本語単語検出を有効化                                  |
| `highlightHintMarker`               | string/dict | 'DiffAdd'       | ヒントマーカーのハイライト                              |
| `highlightHintMarkerCurrent`        | string/dict | 'DiffText'      | 現在のヒントマーカーのハイライト                        |
| `suppressOnKeyRepeat`               | boolean     | v:true          | 高速キーリピート中のヒント抑制                          |
| `keyRepeatThreshold`                | number      | 50              | キーリピート検出閾値（ms）                              |
| `keyRepeatResetDelay`               | number      | 300             | キーリピート後のリセット遅延（ms）                      |
| `perKeyMinLength`                   | dict        | {}              | キーごとの最小単語長を設定                              |
| `defaultMinWordLength`              | number      | 2               | ヒントのデフォルト最小単語長                            |
| `segmenterThreshold`                | number      | 4               | TinySegmenterを使用する最小文字数（camelCase）          |
| `japaneseMergeThreshold`            | number      | 2               | 助詞結合の最大文字数（camelCase）                       |
| `debugMode`                         | boolean     | v:false         | デバッグモードを有効化                                  |
| `performanceLog`                    | boolean     | v:false         | パフォーマンスロギングを有効化                          |


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

**拡張機能**: 移動タイプとコンテキストに基づいてヒント表示を最適化するために、異なるキーに対して異なる最小単語長を設定します。`perKeyMinLength`で定義されたキーは**自動的にマッピング**されます - `countedMotions`を手動で設定する必要はありません。

この機能により、以下を可能にする細かい制御ができます：

- ビジュアルモードキーでの**精密な移動**（1文字ヒント）
- hjklナビゲーションでの**ノイズ削減**（2文字以上のヒント）
- 異なるモーションタイプに対する**カスタマイズされた閾値**
- すべての設定されたキーに対する**自動キーマッピング**

#### 基本設定

```vim
let g:hellshake_yano = #{
\   perKeyMinLength: #{
\     'v': 1,   " ビジュアルモード - 精密な移動
\     'V': 1,   " ビジュアルラインモード
\     'w': 1,   " 単語前進
\     'b': 1,   " 単語後退
\     'h': 2,   " 左（ノイズ削減）
\     'j': 2,   " 下
\     'k': 2,   " 上
\     'l': 2,   " 右
\     'f': 3,   " 文字検索
\     'F': 3,   " 文字後退検索
\   },
\   defaultMinWordLength: 2,
\   motionCount: 3   " 3回のモーション後にヒントをトリガー
\ }
" 注意: perKeyMinLength内のキーは自動的にマッピングされます！
" countedMotionsを個別に設定する必要はありません。
```

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

**`countedMotions`との組み合わせ**:

```vim
let g:hellshake_yano = #{
\   perKeyMinLength: #{
\     'v': 1,  " 1文字最小で自動的にマッピング
\     'h': 2   " 2文字最小で自動的にマッピング
\   },
\   countedMotions: ['g', 'd'],  " defaultMinWordLengthを使用する追加キー
\   defaultMinWordLength: 3
\ }
" 結果: v(1), h(2), g(3), d(3)がすべて追跡される
```

### 日本語単語分割設定

hellshake-yano.vimは、TinySegmenterと助詞結合を使用した高度な日本語単語分割（分かち書き）機能を提供します。これらの設定により、日本語テキストの分析方法と単語境界の検出方法を微調整できます。

#### 設定キー

v3.0.0以降、プラグインは**camelCase**形式の設定キーのみをサポートします（v2.xではsnake_case形式でした）：

| 機能 | 設定キー（v3.0.0+） | v2.xでの名前 | デフォルト | 説明 |
|------|---------------------|--------------|-----------|------|
| TinySegmenter閾値 | `segmenterThreshold` | `segmenter_threshold` | `4` | TinySegmenterを使用する最小文字数 |
| 助詞結合閾値 | `japaneseMergeThreshold` | `japanese_merge_threshold` | `2` | 助詞結合の最大文字数 |

#### 基本設定例

**camelCase形式の使用**:
```vim
let g:hellshake_yano = #{
\   useJapanese: v:true,
\   segmenterThreshold: 4,
\   japaneseMergeThreshold: 2,
\   japaneseMergeParticles: v:true
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

#### パフォーマンスに関する考慮事項

- **キャッシュ最適化**: キーごとの設定により、キーコンテキストに基づくインテリジェントなキャッシュが可能
- **メモリ使用量**: 最小のメモリオーバーヘッド - 指定されたキーの上書きのみを格納
- **大きなファイルの推奨設定**:
  ```vim
  let g:hellshake_yano = #{
\   defaultMinWordLength: 3,
\   perKeyMinLength: #{
\     'v': 1,  " ビジュアルモードを精密に保つ
\     'w': 2,  " 単語モーションをより応答的に
\     'h': 4, 'j': 4, 'k': 4, 'l': 4  " hjklのノイズを大幅に削減
\   }
\ }
  ```

### キーごとのモーション数設定

プラグインは**キーごとのモーション数**設定をサポートしており、異なるキーが異なる回数の押下後にヒントをトリガーできます。これにより、異なるモーションタイプに対して最適なユーザー体験が可能になります。

#### 基本設定

```vim
let g:hellshake_yano = #{
\   perKeyMotionCount: #{
\     'v': 1,   " ビジュアルモード - すぐにヒントを表示（1回押下）
\     'V': 1,   " ビジュアルラインモード - 即座のヒント
\     'w': 1,   " 単語前進 - 即座のヒント
\     'b': 1,   " 単語後退 - 即座のヒント
\     'h': 3,   " 左 - 3回押下後にヒントを表示
\     'j': 3,   " 下 - 3回押下後にヒントを表示
\     'k': 3,   " 上 - 3回押下後にヒントを表示
\     'l': 3    " 右 - 3回押下後にヒントを表示
\   },
\   defaultMotionCount: 2,  " 未指定キーのデフォルト
\   motionCount: 3          " レガシーフォールバック
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

1. `perKeyMotionCount[key]` - キー固有の設定
2. `defaultMotionCount` - 新しいデフォルト値
3. `motionCount` - レガシー設定（後方互換性）
4. `3` - ハードコードされたフォールバック

#### キーごとの最小長との組み合わせ

最大限の制御のために、キーごとのモーション数とキーごとの最小長を組み合わせることができます：

```vim
let g:hellshake_yano = #{
\   perKeyMotionCount: #{
\     'v': 1,   " 1回押下後にヒントを表示
\     'h': 3    " 3回押下後にヒントを表示
\   },
\   perKeyMinLength: #{
\     'v': 1,   " 1文字の単語を表示
\     'h': 2    " 2文字以上の単語を表示
\   },
\   defaultMotionCount: 2,
\   defaultMinWordLength: 2
\ }
```

この設定の意味：

- `v`キー: 1回押下後にすべての単語（1文字を含む）のヒントを表示
- `h`キー: 3回押下後に2文字以上の単語のヒントを表示
- その他のキー: 2回押下後に2文字以上の単語のヒントを表示

### キーリピート抑制

高速hjklキーリピート中、スクロールをスムーズに保つためにヒント表示が一時的に抑制されます。タイミングは設定可能で、機能を無効にすることもできます。

- 有効/無効: `g:hellshake_yano.suppressOnKeyRepeat`（デフォルト: `v:true`）
- リピート閾値: `g:hellshake_yano.keyRepeatThreshold`（ms）（デフォルト: `50`）
- リセット遅延: `g:hellshake_yano.keyRepeatResetDelay`（ms）（デフォルト: `300`）

クイックコピーについては、以下の設定例を参照してください。

### デバッグモード

プラグインには、トラブルシューティングとパフォーマンス分析のための包括的なデバッグモードが含まれています：

- 有効/無効: `g:hellshake_yano.debugMode`（デフォルト: `v:false`）
- デバッグ情報を表示: `:HellshakeDebug`または`:HellshakeShowDebug`

デバッグモードの表示内容：

- 現在のプラグイン設定
- モーション数とタイミング情報
- キーリピート検出状態
- バッファ固有の状態
- パフォーマンス指標（performanceLogが有効な場合）

### パフォーマンスロギング

組み込みのパフォーマンスロギングでプラグインのパフォーマンスを追跡：

- 有効/無効: `g:hellshake_yano.performanceLog`（デフォルト: `v:false`）
- 主要操作の実行時間を記録
- パフォーマンスのボトルネックを特定するのに役立つ
- 有効時にデバッグモードで表示可能

### ヒントグループ設定

プラグインは、ナビゲーション効率を向上させるために、単一文字と複数文字ヒント間の**厳密な分離**を備えたインテリジェントなヒントグループ化をサポートします：

- **単一文字キー**: 即座ジャンプによる即座の単一キーナビゲーションにのみ使用
- **複数文字キー**: 2文字ヒントにのみ使用 - 単一ヒントとしては決して表示されない
- **厳密な分離**: singleCharKeys内のキーは複数文字ヒントを生成しない（AがsingleCharKeysにある場合、AAは生成されない）
- **自動検出**: singleCharKeysまたはmultiCharKeysを設定すると、useHintGroupsが自動的に有効になる
- **パフォーマンス最適化**: 単一文字ヒントはハイライト遅延なしで即座にジャンプ
- **最大単一文字ヒント**: 単一と複数文字ヒントのバランスを取るためのオプション制限
- **記号サポート**: singleCharKeysは記号をサポート（`;`, `:`, `[`, `]`, `'`, `"`, `,`, `.`, `/`, `\`, `-`, `=`, `` ` ``）
- **数字2文字ヒント**: 大量の単語数に対するオプションの数字ヒント（01-99, 00）

#### 重要な動作変更（v2.0+）

厳密な分離でヒントグループを使用する場合：
- 'A'が`singleCharKeys`にある場合、'AA'は生成されない
- 'B'が`multiCharKeys`のみにある場合、'B'は単一文字ヒントとして表示されない
- 単一文字ヒントは2番目のキーを待つことなく即座にジャンプ
- 複数文字ヒントは最初のキーが押されたときに視覚的フィードバックを表示

#### ヒントキーでの記号サポート（新機能）

より多くのヒントオプションのために`singleCharKeys`で記号を使用できるようになりました：

**有効な記号**: `;` `:` `[` `]` `'` `"` `,` `.` `/` `\` `-` `=` `` ` ``

```vim
" 例: 追加の単一文字ヒントに記号を使用
let g:hellshake_yano = #{
\   singleCharKeys: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', ':', '[', ']'],
\   multiCharKeys: ['B', 'C', 'E', 'I', 'O', 'P', 'Q', 'R', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
\   maxSingleCharHints: 13
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
let g:hellshake_yano = #{
\   useNumericMultiCharHints: v:true,
\   singleCharKeys: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
\   multiCharKeys: ['B', 'C', 'E', 'I', 'O', 'P', 'Q', 'R', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
\ }
```

**動作方法**:
1. 単一文字ヒント: A, S, D, F, G, H, J, K, L（9ヒント）
2. アルファベット2文字ヒント: BB, BC, BE, CB, CC...（multiCharKeysの組み合わせ）
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
let g:hellshake_yano = #{
\   highlightHintMarker: 'Search',
\   highlightHintMarkerCurrent: 'IncSearch'
\ }

" fg/bgでカスタムカラーを使用
let g:hellshake_yano = #{
\   highlightHintMarker: {'fg': '#00ff00', 'bg': '#1a1a1a'},
\   highlightHintMarkerCurrent: {'fg': '#ffffff', 'bg': '#ff0000'}
\ }

" 混合設定例
let g:hellshake_yano = #{
\   markers: split('ASDFGHJKL', '\zs'),
\   motionCount: 5,
\   motionTimeout: 3000,
\   useJapanese: v:true,
\   highlightHintMarker: {'bg': '#3c3c3c'}
\ }

" ヒントグループ設定例
" ホームロウキーを単一文字ヒントに使用
let g:hellshake_yano = #{
\   singleCharKeys: split('asdfghjkl', '\zs'),
\   multiCharKeys: split('qwertyuiop', '\zs'),
\   useHintGroups: v:true
\ }

" クイックアクセスのために数字を最初に（1-9, 0）
let g:hellshake_yano = #{
\   singleCharKeys: split('1234567890ASDFGHJKL', '\zs'),
\   multiCharKeys: split('QWERTYUIOPZXCVBNM', '\zs')
\ }

" 好みに応じて数字を除外
let g:hellshake_yano = #{
\   singleCharKeys: split('ASDFGHJKL', '\zs'),
\   multiCharKeys: split('QWERTYUIOPZXCVBNM', '\zs')
\ }

" キーリピート検出設定
" 高速キーリピート中のヒント表示を無効化（スムーズなスクロールのため）
let g:hellshake_yano = #{
\   suppressOnKeyRepeat: v:true,    " キーリピート抑制を有効/無効（デフォルト: true）
\   keyRepeatThreshold: 50,          " リピート検出閾値（ミリ秒）（デフォルト: 50）
\   keyRepeatResetDelay: 300        " リピート状態をリセットするまでの遅延（ミリ秒）（デフォルト: 300）
\ }

" キーリピート抑制を無効化（常にヒントを表示）
let g:hellshake_yano = #{
\   suppressOnKeyRepeat: v:false
\ }

" カスタムキーリピートタイミング
let g:hellshake_yano = #{
\   keyRepeatThreshold: 100,         " より遅いタイピングのためのより寛容な閾値
\   keyRepeatResetDelay: 500        " 通常の動作に戻るまでのより長い遅延
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

## コントリビューション

プルリクエストと問題報告を歓迎します。

## 作者

[Your Name]

