# 技術スタックとコーディング規約

## 技術スタック

- **Deno/TypeScript**: メインロジック実装
- **Vimスクリプト**: Vim側インターフェース
- **@denops/std**: Vim-Deno間の通信
- **@denops/test**: テスト環境

## TypeScriptコーディング規約

- **インデント**: 2スペース
- **行幅**: 100文字
- **セミコロン**: 必須
- **型注釈**: 厳格（strict: true, noImplicitAny: true）
- **インポート**: JSRからのインポートを使用

## Vimスクリプト規約

- **変数命名**:
  - スクリプトローカル変数: `s:variable_name`
  - グローバル変数: `g:plugin_name.option_name`
  - 関数: `plugin_name#function_name()`
- **辞書管理**: バッファ別の状態管理
- **エラーハンドリング**: `has_key()`でキー存在確認

## テストパターン

- **テストファイル**: `tests/*_test.ts`
- **テストランナー**: `testRunner.ts`を使用
- **モック**: `tests/helpers/mock.ts`
- **アサーション**: `@std/assert`

## 設定管理

- **デフォルト値**: `plugin/hellshake-yano.vim`で定義
- **ユーザー設定**: `g:hellshake_yano`辞書で上書き
- **設定伝播**: VimからTypeScriptへの設定送信
