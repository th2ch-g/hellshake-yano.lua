# 技術スタック

## アーキテクチャ
- Vimscript と TypeScript(Deno) を併用する二層構成。`plugin/hellshake-yano.vim` が起動処理と既定設定を受け持ち、`autoload/hellshake_yano/*.vim` がモーション制御・設定検証・辞書コマンドなどを担当する。
- Denops ランタイム経由で `denops/hellshake-yano/main.ts` を呼び出し、非同期でヒント生成 (`neovim/core/hint.ts`)、単語検出 (`neovim/core/word.ts`) や辞書運用 (`neovim/dictionary.ts`) を行う。`integration/` 層が初期化・環境検出・コマンド登録を統括し、`vim/` 層が Vim 実装向けのブリッジと設定統合を提供する。
- `common/` 配下にキャッシュ (`common/cache/unified-cache.ts`) やロガー・バリデーションユーティリティを集約し、パフォーマンス計測 (`common/utils/performance.ts`) とディスプレイ制御 (`neovim/display/*.ts`、`vim/display/*.ts`) を分離することで、両実装の再利用性とテスト容易性を確保。

## ランタイム・依存関係
- Deno 2.x 系を想定（`deno.jsonc`・`deno.lock` で formatter/linter/test とロックを管理）。
- 主要依存: `@denops/std@^7.4.0`, `@denops/test@^3.0.4`, Deno 標準モジュール `@std/*`, 日本語分割用 `@birchill/tiny-segmenter@^1.0.0`。
- Neovim 0.8 以降 / Vim 8.0 以降を対象。Denops プラグインとして動作しつつ、純 VimScript 実装も同梱している。

## 開発環境
- フォーマッター・リンターは Deno 標準 (`deno fmt`, `deno lint`) を使用。インデント幅 2、最大行 100、セミコロン必須。
- テストは `deno test -A` で実行。`tests/` 配下には Vim/Neovim 両対応の統合テストに加え、キャッシュ最適化・辞書統合・キーリピート挙動などのリグレッションテストが多数配置される。
- 補助ツールや Makefile は存在しないため、Deno CLI と Neovim runtimepath 追加で開発を行う。VimScript 側のユニットテストは @denops/test を通じて駆動される。

## よく使うコマンド
- `deno test -A` : すべてのテストスイートを実行。
- `deno test -A tests/highlight_test.ts` : 個別テストのピンポイント実行。
- `deno fmt` / `deno lint` : フォーマットと静的解析。

## 環境変数・ポート
- 特定の環境変数やローカルポートは利用していない。Neovim 側で `runtimepath` に追加し `:source plugin/hellshake-yano.vim` するだけで動作する。
