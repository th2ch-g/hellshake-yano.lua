# title: hintPosition both 用閾値設定の導入

## 概要
- `hintPosition: "both"` 利用時でも短い単語では片側だけにヒントを描画できる閾値設定（仮称 `bothMinWordLength`）を追加し、ヒントの重なりを防ぐ

### goal
- ユーザーが短語での視認性低下を避けながら、必要な場合のみ両端ヒントを活用できるようにする

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること

## 開発のゴール
- `both` モード時に単語長が閾値未満であれば自動的に片側（デフォルトは先頭）へフォールバックさせ、既存設定との後方互換性と拡張性を両立する

## 実装仕様
- `Config.hintPosition` 型に `"both"` を正式に含め、`Config`／`DEFAULT_CONFIG`／バリデーションへオプション `bothMinWordLength?: number` を追加する
- Vimscript 側（camelCase / snake_case）から新オプションを受け取り、Denops 経由で TypeScript に伝搬させる経路を整備する
- `assignHintsToWords` で閾値未満の単語に対しては片側ヒントへ切り替え、閾値以上では従来通り両端ヒントを生成する
- `createAssignmentCacheKey` などヒント関連キャッシュに新オプションの影響を反映し、設定変更時に stale cache が残らないようにする
- 新挙動を検証するユニット／統合テストと、README / README_ja / Vimdoc の更新を行う

## 生成AIの学習用コンテキスト
### TypeScript
- denops/hellshake-yano/config.ts
  - 設定スキーマ・デフォルト・バリデーションの拡張
- denops/hellshake-yano/hint.ts
  - `assignHintsToWords`／キャッシュキー生成の分岐追加
- denops/hellshake-yano/core.ts
  - 設定同期とヒント再計算フローへの新オプション反映
- denops/hellshake-yano/display.ts
  - 片側フォールバック後も extmark / matchadd が正しく描画されるか確認

### Vimscript
- plugin/hellshake-yano.vim
  - グローバル設定の初期化と Denops への受け渡し
- autoload/hellshake_yano/config.vim
  - ユーザー設定の正規化と camel/snake の変換

### Tests
- tests/hint.test.ts ほかヒント関連テスト
  - 閾値境界・未設定時の挙動をカバーする追加ケース

## Process
### process1 両端ヒント閾値機能の実装
#### sub1 設定スキーマと伝搬ルートの拡張
@target: denops/hellshake-yano/config.ts
@ref: plugin/hellshake-yano.vim
- [ ] `Config` 型と `DEFAULT_CONFIG` に `bothMinWordLength` を追加し、`hintPosition` 型へ `"both"` を明記する
- [ ] `validateConfig`／`validateUnifiedConfig` に数値チェックと既存 `defaultMinWordLength` との整合処理を追加する
- [ ] Vimscript 側でDenops へ新オプションを渡す（CamelCaseのみ）
- [ ] deno check で型エラーが出ないことを確認する
- [ ] deno test で既存テストが通ることを確認する

#### sub2 ヒント割当とキャッシュ整備
@target: denops/hellshake-yano/hint.ts
@ref: denops/hellshake-yano/core.ts
- [ ] `assignHintsToWords` で閾値未満の単語を片側ヒントへフォールバックさせ、閾値以上は従来通り両端ヒントを割り当てる
  - [ ] フォールバック先はデフォルトで先頭側
- [ ] `createAssignmentCacheKey` など関連キャッシュに `bothMinWordLength` とフォールバック結果を織り込み、設定変更時は必要に応じてヒントキャッシュを無効化する
- [ ] `calculateHintPosition`／描画フローへの影響を確認し、必要なら補足コメントやヘルパー関数で拡張余地を残す

### process10 ユニットテスト
- [ ] `hint.ts` 用ユニットテストで閾値未満／閾値以上／未設定／`both` 以外の各シナリオを網羅する
- [ ] @denops/test ベースの統合テストで Vimscript 設定→Denops→表示までの反映を確認する

### process50 フォローアップ
- [ ] フォールバック方向をユーザーが選択できるオプション化や、ヒント不足時の追加通知が必要か検討しチケット化する

### process100 リファクタリング
- [ ] 単語長判定やヒント位置決定ロジックを共通化できる場合はユーティリティ関数へ切り出す

### process200 ドキュメンテーション
- [ ] hintPosition both 用の設定例を README / README_ja / doc に追加する
- [ ] README / README_ja / doc に `bothMinWordLength` の説明・設定例・既存設定との関係を追記する
