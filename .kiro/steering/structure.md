# プロジェクト構造

## ルートディレクトリ
- `autoload/` : Vimscript の遅延ロード関数群。モーション (`motion.vim`)、ヒント描画 (`hint.vim`)、設定 (`config.vim`)、辞書管理 (`command.vim`、`state.vim`) などを役割別に分割し、公開 API は `hellshake_yano#*` で提供。
- `plugin/hellshake-yano.vim` : プラグイン読み込みエントリ。グローバル設定の初期化と Denops 起動、既定値のフォールバック、設定マイグレーションを実施。
- `denops/hellshake-yano/` : TypeScript 実装。`main.ts` を中心に `integration/` 層が初期化・コマンド登録・環境検出を担い、`neovim/` 層がヒント割当 (`core/hint.ts`)、単語検出 (`core/word.ts`)、辞書 (`dictionary.ts`)、表示 (`display/*.ts`) を担当。`vim/` 層は VimScript 実装とのブリッジ・設定統合、`common/` 層はキャッシュ (`common/cache/`)、ロガー、バリデーションなどの共有ユーティリティを保持する。
- `tests/` : Deno + @denops/test による統合・単体テスト群。設定・モーション・ハイライト・キャッシュ・辞書・キーリピート挙動など機能別の `*.test.ts` が多数存在し、`integration/` 配下は Denops レイヤ統合テスト、`threshold-validation/` は JSON ベース境界値検証リソースを格納。
- `doc/` / `docs/` : ユーザー向けドキュメントと設計メモ。辞書システム説明 (`doc/dictionary.md`) や内部計画 (`docs/`, `ai/plan/`) を保管。
- `samples/` : 辞書サンプル等の補助ファイル。
- `deno.jsonc` / `deno.lock` : Deno のフォーマッタ設定・依存ロック。
- `README.md` / `README_ja.md` : プラグイン利用方法と実装モードの紹介。

## コード組織の原則
- Vimscript は `hellshake_yano#*` を公開 API とし、内部ヘルパーは `s:` プレフィックスで隠蔽。
- TypeScript はケバブケースファイル名を徹底し、ユーティリティを純粋関数として維持。設定値や型は `config.ts` と `types.ts` に集中させる。
- 共有ロジックは Core クラスと `common/` ユーティリティで一元管理し、Denops 経由の dispatcher から呼び出す。キャッシュ制御は `common/cache/unified-cache.ts`、辞書連携は `neovim/dictionary.ts` と `autoload/hellshake_yano/command.vim` で調停。

## インポート・依存整理
- TypeScript 側は `deno.jsonc` の `imports` を利用し、相対 import を最小限に抑制。
- 辞書・ハイライトなどの副作用を伴う処理は専用モジュールに切り分け、テスト容易性を確保。

## テスト配置ポリシー
- `tests/*.ts` は機能別にファイルが分割され、モーション設定・辞書連携・ヒント生成・キャッシュ最適化・キーリピート検証などの回帰テストを網羅。
- `tests/*.vim` は Vimscript 関数の統合テスト。`tests/testRunner.ts` が共通テストエントリ。
- JSON ベースの検証データは `tests/threshold-validation/` に集約し、プロパティテスト的な境界チェックを実現。
- テストは `deno test -A` や `deno test -A tests/xxx_test.ts` で常にパスすることを目標とする。

## 命名・フォーマット規約
- TypeScript: 2 スペースインデント、最大行 100、セミコロン必須。strict オプション有効。
- Vimscript: 2 スペースインデント。ファイルは `autoload/hellshake_yano/*.vim` の名前空間に統一。
