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

| オプション | 型 | デフォルト | 説明 |
|-----------|-----|----------|------|
| `markers` | 配列 | A-Z分割 | ヒントマーカーとして使用する文字 |
| `motion_count` | 数値 | 3 | ヒント表示までのモーション回数 |
| `motion_timeout` | 数値 | 2000 | モーションカウントのタイムアウト（ミリ秒） |
| `hint_position` | 文字列 | 'start' | ヒントの表示位置（'start'または'end'） |
| `trigger_on_hjkl` | 真偽値 | v:true | hjkl移動でのトリガーを有効化 |
| `counted_motions` | 配列 | [] | カスタムモーションキー（trigger_on_hjklを上書き） |
| `enabled` | 真偽値 | v:true | プラグインの有効/無効 |
| `single_char_keys` | 配列 | ASDFGHJKLNM0-9 | 1文字ヒント用キー |
| `multi_char_keys` | 配列 | BCEIOPQRTUVWXYZ | 2文字以上ヒント用キー |
| `use_hint_groups` | 真偽値 | v:true | ヒントグループ機能を有効化 |
| `use_numbers` | 真偽値 | v:true | 数字キーをヒントに使用可能にする |
| `max_single_char_hints` | 数値 | - | オプション：1文字ヒントを制限 |
| `use_japanese` | 真偽値 | - | 日本語単語検出を有効化 |
| `highlight_hint_marker` | 文字列/辞書 | 'DiffAdd' | マーカーのハイライト |
| `highlight_hint_marker_current` | 文字列/辞書 | 'DiffText' | 現在のマーカーのハイライト |

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

- `:HellshakeEnable` - プラグインを有効化
- `:HellshakeDisable` - プラグインを無効化
- `:HellshakeToggle` - プラグインの有効/無効を切り替え

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

## 開発

### ビルド

```bash
# TypeScriptのコンパイル
deno task build

# テストの実行
deno test
```

### ディレクトリ構造

```
hellshake-yano.vim/
├── autoload/
│   └── hellshake/
│       └── yano.vim      # Vim側のインターフェース
├── denops/
│   └── hellshake-yano/
│       ├── main.ts       # メインエントリポイント
│       ├── detector.ts   # 単語検出ロジック
│       └── utils.ts      # ユーティリティ関数
├── plugin/
│   └── hellshake-yano.vim # プラグインの初期化
└── README.md
```

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します。

## 作者

[Your Name]
