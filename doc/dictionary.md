# Hellshake-Yano ユーザー定義辞書機能

hellshake-yano.vimでは、ユーザー独自の辞書ファイルを定義することで、単語検出の精度をカスタマイズできます。

## 機能概要

- **複数形式サポート**: JSON、YAML、テキスト形式
- **自動探索**: プロジェクト固有の辞書からグローバル辞書まで自動検索
- **ビルトイン辞書との統合**: 既存の辞書と自動マージ
- **ヒントパターン**: 特定のパターンにヒント優先度を設定
- **Vimコマンド**: 辞書の管理と検証

## 辞書ファイルの配置場所

辞書ファイルは以下の順序で探索されます:

1. `.hellshake-yano/dictionary.json` (プロジェクト固有)
2. `hellshake-yano.dict.json` (プロジェクトルート)
3. `~/.config/hellshake-yano/dictionary.json` (グローバル)

## 設定オプション

```vim
" 辞書ファイルのパスを明示的に指定
let g:hellshake_yano_dictionary_path = '~/my-dictionary.json'

" ビルトイン辞書を使用するか
let g:hellshake_yano_use_builtin_dict = 1

" 辞書のマージ戦略 ('merge' or 'override')
let g:hellshake_yano_dictionary_merge = 'merge'

" 辞書の自動再読み込み
let g:hellshake_yano_auto_reload_dict = 0
```

## 辞書ファイル形式

### JSON形式

```json
{
  "version": "1.0",
  "customWords": ["機械学習", "深層学習"],
  "preserveWords": ["HelloWorld", "getElementById"],
  "mergeRules": {
    "の": "always",
    "を": "always"
  },
  "compoundPatterns": [".*Controller$", "^I[A-Z].*"],
  "hintPatterns": [
    {
      "pattern": "^-\\\\s*\\\\[\\\\s*\\\\]\\\\s*(.)",
      "hintPosition": "capture:1",
      "priority": 100,
      "description": "チェックボックス後の最初の文字"
    }
  ],
  "metadata": {
    "author": "Your Name",
    "description": "Custom dictionary for my project"
  }
}
```

### YAML形式

```yaml
version: "1.0"
customWords:
  - 機械学習
  - 深層学習
preserveWords:
  - HelloWorld
mergeRules:
  の: always
  を: always
hintPatterns:
  - pattern: "^-\\\\s*\\\\[\\\\s*\\\\]\\\\s*(.)"
    hintPosition: "capture:1"
    priority: 100
```

### テキスト形式

```
# カスタム単語
機械学習
深層学習

# 分割禁止（!で開始）
!HelloWorld
!getElementById

# 結合ルール（=で定義）
の=always
を=always

# ヒントパターン（@優先度:パターン:位置）
@100:^-\\s*\\[\\s*\\]\\s*(.):capture:1
```

## フィールド説明

### customWords
プラグインが認識するカスタム単語のリスト。

### preserveWords
分割せずにそのまま保持する単語のリスト。プログラミング用語に有効。

### mergeRules
単語の結合ルールを定義。

- `always`: 常に前の単語と結合
- `never`: 結合しない
- `context`: 文脈に応じて結合

### compoundPatterns
正規表現による複合語パターン。マッチした文字列は一つの単語として扱われます。

### hintPatterns
特定のパターンにヒント優先度を設定。

- `pattern`: 正規表現パターン（文字列またはRegExp）
- `hintPosition`: ヒント位置の指定
  - `capture:1`, `capture:2`, `capture:3`: キャプチャグループ
  - `start`: マッチの開始位置
  - `end`: マッチの終了位置
  - `{offset: number, from: 'start'|'end'}`: カスタムオフセット
- `priority`: 優先度（高いほど優先）
- `description`: 説明（オプション）

## Vimコマンド

### 辞書管理コマンド

```vim
" 辞書を再読み込み
:HellshakeYanoReloadDict

" 辞書ファイルを編集
:HellshakeYanoEditDict

" 辞書の内容を表示
:HellshakeYanoShowDict

" 辞書を検証
:HellshakeYanoValidateDict
```

## 使用例

### 1. プログラミング用語の辞書

```json
{
  "customWords": [
    "フレームワーク",
    "ライブラリ",
    "アーキテクチャ"
  ],
  "preserveWords": [
    "React",
    "Vue.js",
    "TypeScript"
  ]
}
```

### 2. Markdown文書のヒント最適化

```json
{
  "hintPatterns": [
    {
      "pattern": "^#{1,6}\\\\s*(.)",
      "hintPosition": "capture:1",
      "priority": 100,
      "description": "Markdownヘッダー"
    },
    {
      "pattern": "^-\\\\s*\\\\[.\\\\]\\\\s*(.)",
      "hintPosition": "capture:1",
      "priority": 95,
      "description": "チェックリスト"
    }
  ]
}
```

### 3. 日本語文書の助詞処理

```json
{
  "mergeRules": {
    "の": "always",
    "を": "always",
    "に": "always",
    "が": "always",
    "で": "always",
    "と": "always",
    "は": "context",
    "も": "context"
  }
}
```

## トラブルシューティング

### 辞書が読み込まれない場合

1. ファイルパスの確認
2. ファイル形式の確認（JSON、YAML、テキスト）
3. 構文エラーの確認
4. `:HellshakeYanoValidateDict` でバリデーション実行

### ヒントが期待通りに表示されない場合

1. `hintPatterns` の正規表現を確認
2. 優先度の設定を確認
3. `:HellshakeYanoShowDict` で辞書の内容を確認

### パフォーマンスが低下した場合

1. 複合語パターンの数を減らす
2. 正規表現パターンを最適化
3. キャッシュを有効にする

## サンプルファイル

- `examples/dictionary.json` - JSON形式のサンプル
- `examples/dictionary.yaml` - YAML形式のサンプル
- `examples/dictionary.txt` - テキスト形式のサンプル

これらのファイルをコピーして、プロジェクトに合わせてカスタマイズしてください。