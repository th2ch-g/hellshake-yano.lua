# 技術スタック

## アーキテクチャ
- Vimscript と TypeScript(Deno) を併用する二層構成。`plugin/hellshake-yano.vim` で起動処理と既定設定を行い、`autoload/hellshake_yano/*.vim` でモーション制御・設定検証を担当。
- Denops ランタイム経由で `denops/hellshake-yano/main.ts` を呼び出し、非同期でヒント生成 (`hint.ts`)、単語検出 (`core.ts`、`word.ts`) や辞書運用 (`dictionary.ts`) を行う。
- パフォーマンス計測 (`performance.ts`) やディスプレイ制御 (`display.ts`) を TypeScript 側に集約し、拡張性とテスト容易性を確保。

## ランタイム・依存関係
- Deno 2.x 系を想定（`deno.jsonc` で formatter/linter/test 設定を管理）。
- 主要依存: `@denops/std@^7.4.0`, `@denops/test@^3.0.4`, Deno 標準モジュール `@std/*`, 日本語分割用 `@birchill/tiny-segmenter@^1.0.0`。
- Neovim 0.8 以降を対象。Denops プラグインとして動作するため Vim/Neovim 双方で呼び出し可能。

## 開発環境
- フォーマッター・リンターは Deno 標準 (`deno fmt`, `deno lint`) を使用。インデント幅 2、最大行 100、セミコロン必須。
- テストは `deno test -A` で実行。`tests/` 配下に @denops/test ベースの Vim/Neovim 統合テスト、設定検証、パフォーマンステストが整備されている。
- 補助ツールや Makefile は存在しないため、Deno CLI と Neovim runtimepath 追加で開発を行う。

## よく使うコマンド
- `deno test -A` : すべてのテストスイートを実行。
- `deno test -A tests/highlight_test.ts` : 個別テストのピンポイント実行。
- `deno fmt` / `deno lint` : フォーマットと静的解析。

## 環境変数・ポート
- 特定の環境変数やローカルポートは利用していない。Neovim 側で `runtimepath` に追加し `:source plugin/hellshake-yano.vim` するだけで動作する。
