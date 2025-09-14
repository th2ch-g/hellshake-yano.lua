# 推奨コマンド

## テスト実行

```bash
# 全テスト実行
deno test --allow-read --allow-run

# 特定のテストファイル実行
deno test --allow-read --allow-run tests/key_repeat_test.ts

# 型チェックスキップで実行（開発時）
deno test --allow-read --allow-run --no-check
```

## コード品質

```bash
# TypeScriptフォーマット
deno fmt

# TypeScript型チェック
deno check denops/hellshake-yano/main.ts

# Lint実行
deno lint
```

## 開発用コマンド

```bash
# Vimスクリプト関数検索
git grep -W "function.*hellshake_yano"

# 設定関連の検索
rg "g:hellshake_yano"

# テストファイル作成時のテンプレート
cp tests/motion_test.ts tests/new_feature_test.ts
```

## プロジェクト管理

```bash
# 現在のワーキングディレクトリ確認
pwd

# プロジェクト構造確認
tree -I 'node_modules'

# Git状態確認
git status
```
