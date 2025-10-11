# プロジェクト構造

## ルートディレクトリ
- `autoload/` : Vimscript の遅延ロード関数群。モーション (`motion.vim`)、ヒント描画 (`hint.vim`)、設定 (`config.vim`)、辞書連携などを役割別に分割。
- `plugin/hellshake-yano.vim` : プラグイン読み込みエントリ。グローバル設定の初期化と Denops 起動、既定値のフォールバックを行う。
- `denops/hellshake-yano/` : TypeScript 実装。`main.ts` を中心に、単語検出 (`word.ts`)、ヒント割当 (`hint.ts`)、コア制御 (`core.ts`)、辞書管理 (`dictionary.ts`)、パフォーマンス計測 (`performance.ts`) などをモジュール単位で格納。`hint/` 配下にはヒント生成戦略があり、`types/` は型定義用に予約されている。
- `tests/` : Deno + @denops/test による統合・単体テスト群。`.vim` テストはエディタ連携、`.ts` は設定・モーション・ハイライトの回帰テストを担う。`threshold-validation/` には JSON ベースの境界値テストが置かれる。
- `doc/` : ユーザー向けドキュメント（辞書システムの説明など）。
- `samples/` : 辞書サンプル等の補助ファイル。
- `deno.jsonc` / `deno.lock` : Deno 設定とロックファイル。
- `README.md` / `README_ja.md` : プラグイン利用方法の概要。

## コード組織の原則
- Vimscript は `hellshake_yano#*` を公開 API とし、内部ヘルパーは `s:` プレフィックスで隠蔽。
- TypeScript はケバブケースファイル名を徹底し、ユーティリティを純粋関数として維持。設定値や型は `config.ts` と `types.ts` に集中させる。
- 共有ロジックは Core クラスで一元管理し、Denops 経由の dispatcher から呼び出す。

## インポート・依存整理
- TypeScript 側は `deno.jsonc` の `imports` を利用し、相対 import を最小限に抑制。
- 辞書・ハイライトなどの副作用を伴う処理は専用モジュールに切り分け、テスト容易性を確保。

## テスト配置ポリシー
- `tests/*.ts` は機能別にファイルが分割され、モーション設定や日本語処理などの回帰テストを網羅。
- `tests/*.vim` は Vimscript 関数の統合テスト。`tests/testRunner.ts` が共通テストエントリ。
- JSON ベースの検証データは `tests/threshold-validation/` に集約し、プロパティテスト的な境界チェックを実現。
- テストはdeno checkとdeno testで常にパスすることを目標とする

## 命名・フォーマット規約
- TypeScript: 2 スペースインデント、最大行 100、セミコロン必須。strict オプション有効。
- Vimscript: 2 スペースインデント。ファイルは `autoload/hellshake_yano/*.vim` の名前空間に統一。
