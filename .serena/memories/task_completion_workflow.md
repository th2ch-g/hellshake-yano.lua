# タスク完了時のワークフロー

## TDD実装時の手順

1. **RED**: 失敗するテストを書く
2. **GREEN**: 最小限の実装でテストを通す
3. **REFACTOR**: コードを改善・整理

## テスト実行手順

```bash
# 1. 新しいテストファイル作成後
deno test --allow-read --allow-run tests/key_repeat_test.ts

# 2. 実装後の全テスト実行
deno test --allow-read --allow-run

# 3. 型チェック実行
deno check denops/hellshake-yano/main.ts
```

## コード品質チェック

```bash
# フォーマット確認・適用
deno fmt --check
deno fmt

# Lint確認
deno lint
```

## 実装完了時のチェックリスト

- [ ] 新機能のテストが全て pass
- [ ] 既存テストが全て pass
- [ ] 型エラーなし
- [ ] Lint エラーなし
- [ ] 後方互換性の確認
- [ ] 設定オプションの動作確認

## Git管理

```bash
# 変更確認
git status
git diff

# コミット前の最終確認
deno test --allow-read --allow-run
deno fmt --check
deno lint
```
