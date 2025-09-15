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
- **デバッグモード**: プラグインの動作状態を詳細に確認できるデバッグ機能
- **パフォーマンスログ**: 実行時間を記録して性能のボトルネックを特定

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
  \ 'highlight_hint_marker': 'DiffAdd',
  \ 'highlight_hint_marker_current': 'DiffText'
  \ }
```

### 設定オプション

| オプション                      | 型          | デフォルト      | 説明                                              |
| ------------------------------- | ----------- | --------------- | ------------------------------------------------- |
| `markers`                       | 配列        | A-Z分割         | ヒントマーカーとして使用する文字                  |
| `motion_count`                  | 数値        | 3               | ヒント表示までのモーション回数                    |
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
| `debug_mode`                    | 真偽値      | v:false         | デバッグモードを有効化                            |
| `performance_log`               | 真偽値      | v:false         | パフォーマンスログを有効化                        |

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

プラグインは、効率的なナビゲーションのために1文字ヒントと2文字以上ヒントを分離するインテリジェントなヒントグループ機能をサポートします：

- **1文字キー**: タイムアウトなしで即座にナビゲーション
- **2文字以上キー**: より多くのターゲットが必要な場合に2文字ヒントとして使用
- **1文字ヒント最大数**: キーの競合を防ぐために1文字ヒントの数を制限

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
3. denopsが正しくインストール・動作しているか確認
4. `:HellshakeDebug`で現在の状態を確認

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

## 貢献

プルリクエストやイシューの報告を歓迎します。

## 作者

[Your Name]
