# Hellshake-Yano 辞書設定ガイド

## 概要

Hellshake-Yano の辞書システムは、TinySegmenter による日本語の単語分割を改善し、より自然で使いやすいヒント表示を実現するための機能です。

## 辞書ファイルの配置場所

辞書ファイルは以下の優先順位で検索されます：

1. `.hellshake-yano/dictionary.{json,yaml,txt}`（プロジェクトローカル）
2. `hellshake-yano.dict.{json,yaml,txt}`（プロジェクトルート）
3. `~/.config/hellshake-yano/dictionary.{json,yaml,txt}`（グローバル設定）

## サポートされる形式

### 1. JSON形式

最も機能豊富で構造化された形式です。

```json
{
  "customWords": ["単語1", "単語2"],
  "compoundPatterns": [
    {
      "pattern": "正規表現パターン",
      "description": "説明"
    }
  ],
  "preserveWords": ["で", "に", "を"],
  "mergeRules": {
    "単語": 優先度（数値）
  },
  "hintPatterns": [
    {
      "name": "パターン名",
      "pattern": "正規表現",
      "priority": 100,
      "captureGroup": 1
    }
  ]
}
```

### 2. YAML形式

人間にとって読みやすく編集しやすい形式です。

```yaml
customWords:
  - 単語1
  - 単語2

compoundPatterns:
  - pattern: "正規表現パターン"
    description: "説明"

preserveWords:
  - で
  - に
  - を

mergeRules:
  単語: 優先度

hintPatterns:
  - name: パターン名
    pattern: "正規表現"
    priority: 100
    captureGroup: 1
```

### 3. テキスト形式

最もシンプルな形式です。単語リストのみをサポートします。

```text
# コメント
単語1
単語2
単語3
```

## 設定項目の詳細

### customWords（カスタム単語）

TinySegmenter が正しく認識できない専門用語や固有名詞を登録します。

**例：**
- 技術用語：「非同期処理」「依存性注入」
- ビジネス用語：「打ち合わせ」「議事録」
- プロジェクト固有の用語

### compoundPatterns（複合語パターン）

正規表現を使用して、複数の単語が組み合わさった表現を認識します。

**例：**
```json
{
  "pattern": "(環境|開発|本番)\\s*(構築|設定)",
  "description": "環境関連の複合語"
}
```

### preserveWords（保護単語）

分割したくない、またはヒントを設定したくない単語を指定します。主に日本語の助詞などに使用します。

**例：** 「で」「に」「を」「は」「が」

### mergeRules（マージルール）

隣接している場合に結合すべき単語とその優先度を設定します。優先度が高いほど、結合される可能性が高くなります。

**例：**
```json
{
  "ファイル": 2,
  "システム": 2,
  "データベース": 3
}
```

### hintPatterns（ヒントパターン）

特定のパターンにマッチする場所を優先的にヒント対象とします。文書構造を認識して、適切な位置にヒントを配置できます。

**設定項目：**
- `name`: パターンの名前（識別用）
- `pattern`: 正規表現パターン
- `priority`: 優先度（高いほど優先）
- `captureGroup`: ヒントを設定するキャプチャグループ（0 = 全体、1 = 第1グループ）

**例：チェックボックスの最初の文字を優先**
```json
{
  "name": "checkbox",
  "pattern": "^\\s*-\\s*\\[\\s\\]\\s+(.)",
  "priority": 100,
  "captureGroup": 1
}
```

## Vimコマンド

辞書システムは以下のVimコマンドで管理できます：

### :HellshakeYanoReloadDict
辞書ファイルを再読み込みします。辞書ファイルを編集した後に使用します。

### :HellshakeYanoEditDict
現在の辞書ファイルを編集用に開きます。存在しない場合は新規作成します。

### :HellshakeYanoShowDict
現在読み込まれている辞書の内容を表示します。デバッグや確認に便利です。

### :HellshakeYanoValidateDict
辞書ファイルの形式が正しいかを検証します。エラーがある場合は詳細を表示します。

## 活用例

### 1. プログラミング用語の登録

```json
{
  "customWords": [
    "非同期処理",
    "依存性注入",
    "マイクロサービス",
    "リファクタリング"
  ]
}
```

### 2. Markdownドキュメント用の設定

```yaml
hintPatterns:
  - name: checkbox
    pattern: "^\\s*-\\s*\\[\\s\\]\\s+(.)"
    priority: 100
    captureGroup: 1

  - name: heading
    pattern: "^#+\\s+(.)"
    priority: 110
    captureGroup: 1
```

### 3. プロジェクト固有の用語集

`.hellshake-yano/dictionary.txt`:
```text
# プロジェクト固有の用語
UserAuthService
PaymentGateway
NotificationQueue
DataSyncManager
```

## トラブルシューティング

### 辞書が読み込まれない

1. `:HellshakeYanoValidateDict` で形式をチェック
2. ファイルパスと拡張子を確認
3. JSON/YAMLの構文エラーをチェック

### ヒントパターンが動作しない

1. 正規表現の構文を確認
2. captureGroup の番号が正しいか確認
3. priority の値を調整してみる

### パフォーマンスの問題

1. 辞書のサイズを確認（1000単語以下を推奨）
2. 複雑な正規表現パターンを簡略化
3. 不要なcompoundPatternsを削除

## ベストプラクティス

1. **段階的な追加**：一度に大量の単語を追加せず、必要に応じて徐々に追加
2. **プロジェクトごとの管理**：プロジェクト固有の用語はローカル辞書に
3. **共通用語の共有**：チーム全体で使う用語はグローバル辞書に
4. **定期的な見直し**：使わなくなった単語は削除してパフォーマンスを維持
5. **コメントの活用**：JSON/YAMLではdescription、テキストでは#でコメントを追加

## 高度な使い方

### 複数辞書の併用

異なる検索パスに複数の辞書を配置すると、すべてが自動的にマージされます：

- グローバル辞書：一般的な技術用語
- プロジェクト辞書：プロジェクト固有の用語
- ローカル辞書：個人的なカスタマイズ

### 動的な辞書更新

Vimスクリプトから辞書を動的に更新することも可能です：

```vim
" 辞書を再読み込み
:HellshakeYanoReloadDict

" カスタムコマンドの例
command! AddWord call denops#request('hellshake-yano', 'addCustomWord', [expand('<cword>')])
```

## サポート

問題が発生した場合は、以下を確認してください：

1. このガイドのトラブルシューティングセクション
2. サンプル辞書ファイル（samples/dictionaries/）
3. プロジェクトのGitHubイシュー

---

最終更新：2025年1月