# title: ヒント再描画ループとカーソル再センタリング機能の設計

## 概要
- ヒント入力時にカーソルを画面中央へ移動させつつヒント表示を継続する循環フローを追加し、連続ヒント移動をシームレスに行えるようにする

### goal
- ユーザがヒント操作を繰り返す際に手動でヒント再表示を実行せずとも、入力→ジャンプ→再表示が自動で継続する

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること

## 開発のゴール
- 設定で有効化可能なヒント連続モードを導入し、ジャンプ後にカーソルを中央へ寄せてヒントを再描画できるようにする

## 実装仕様

### 基本動作フロー
1. ユーザーがヒントを選択してジャンプ
2. `continuousHintMode`が有効な場合:
   - `hideHintsOptimized`でヒントを非表示
   - `recenterCommand`でカーソルを画面中央に移動
   - `showHintsInternal`でヒントを再表示
3. ユーザーが次のヒントを選択、またはループを終了

### ループ終了メカニズム（重要）

**メイン終了方法**: 既存の「ヒント文字以外のキー入力」動作を活用
- ユーザーが`j`, `k`, `/`, `:`, `Esc`などのヒント文字以外のキーを押す
- → 既存の動作通りヒントが消え、キーが通常処理に送られる
- → **この時点で連続ジャンプカウンターをリセット**し、ループ終了

**セーフティネット**: 意図しない長時間ループの防止
- `maxContinuousJumps`（デフォルト: 50）に到達したら自動停止
  - **50 = 連続ヒントジャンプの最大回数**
  - 例: ヒントA→B→C→...と50回ジャンプしたら自動停止
  - 通常使用では到達しない「万が一の上限」として設定
- メッセージ表示後、ヒントを非表示にしてカウンターリセット

**その他の終了条件**:
- バッファ境界を越えた場合（別バッファ/ウィンドウに移動）
- fold内ジャンプ時は展開後に継続（既存のfold無視機能を活用）

### 設定項目

```typescript
interface Config {
  // 連続ヒントモードの有効/無効（デフォルト: false）
  continuousHintMode: boolean;

  // カーソル再センタリングコマンド（デフォルト: "normal! zz"）
  // カスタマイズ例: "normal! zt"（画面上部）、"normal! zb"（画面下部）
  recenterCommand: string;

  // 連続ジャンプ最大回数（セーフティネット、デフォルト: 50）
  maxContinuousJumps: number;
}
```

### 実装の詳細

#### postJumpHandlerメソッドの追加
- ジャンプ後の共通処理を一元化
- バッファ境界チェック
- 連続モード有効時の再センタリング→再描画
- カウンター管理

#### waitForUserInputの修正箇所
以下の3箇所で連続ジャンプカウンターをリセット:
1. **無効キー入力時**（core.ts:1019行目付近）
   ```typescript
   if (!validKeysSet.has(inputChar)) {
     this.continuousJumpCount = 0;  // ← 追加
     await this.hideHintsOptimized(denops);
     // ... 既存処理 ...
   }
   ```

2. **ESC入力時**（core.ts:983行目付近）
   ```typescript
   if (char === 27) {
     this.continuousJumpCount = 0;  // ← 追加
     await this.hideHintsOptimized(denops);
     return;
   }
   ```

3. **小文字キー入力時**（core.ts:995行目付近）
   ```typescript
   if (wasLowerCase) {
     this.continuousJumpCount = 0;  // ← 追加
     await this.hideHintsOptimized(denops);
     // ... 既存処理 ...
   }
   ```

#### ジャンプ処理の統一
以下の全てのジャンプ処理で`postJumpHandler`を呼び出す:
- 1文字ヒントの即座ジャンプ（1050行目付近）
- タイムアウト後の自動選択（1104, 1106行目付近）
- 2文字ヒントの選択（1143行目付近）

### 後方互換性の確保
- `continuousHintMode`のデフォルトは`false`
- 既存ユーザーは設定変更不要で従来通りの動作
- 新設定を有効化したユーザーのみ連続モードを体験

### パフォーマンス考慮事項
- 再描画時は既存のキャッシュ機構を活用
- fold内の単語は既存の機能で無視（66a4cd1コミット参照）
- `hideHints` → `recenter` → `showHints`の連続実行は最小限の処理に抑える

## 生成AIの学習用コンテキスト

### TypeScript
- denops/hellshake-yano/config.ts
  - 設定項目とデフォルト値の定義
- denops/hellshake-yano/types.ts
  - `Config`型の更新
- denops/hellshake-yano/validation.ts
  - 新規設定項目の検証を追加
- denops/hellshake-yano/core.ts
  - ヒント表示／入力処理のメインロジック
  - `postJumpHandler`メソッドの追加
  - `waitForUserInput`の修正

### Vimscript
- autoload/hellshake_yano/hint.vim
  - Denops呼び出しへの影響を確認（変更不要の予定）

### Tests
- tests/core_test.ts
  - 連続ヒントモードのテスト追加
  - カウンターリセットのテスト追加
- tests/key_switching_test.ts
  - 無効キー入力時の動作テスト

## Process

### process0 仕様明確化とアーキテクチャ設計
#### sub1 ループ終了メカニズムの詳細設計
@ref: denops/hellshake-yano/core.ts (waitForUserInput)
- [x] 既存の無効キー入力処理を確認（1017-1022行目）
- [x] カウンターリセットの挿入箇所を特定（3箇所）
- [x] バッファ境界チェックの仕様を策定

#### sub2 postJumpHandlerの責務定義
@ref: denops/hellshake-yano/core.ts (jumpToHintTarget)
- [x] ジャンプ実行 + 後処理の分離方針を確定
- [x] 再センタリングコマンドのカスタマイズ性を確保
- [x] セーフティネットの動作を定義

### process1 設定フラグの追加
#### sub1 Config型とデフォルト値を更新
@target: denops/hellshake-yano/config.ts
@ref: denops/hellshake-yano/types.ts
- [x] `continuousHintMode: boolean`を追加（デフォルト: false）
- [x] `recenterCommand: string`を追加（デフォルト: "normal! zz"）
- [x] `maxContinuousJumps: number`を追加（デフォルト: 50）

#### sub2 設定検証を拡張
@target: denops/hellshake-yano/validation.ts
@ref: denops/hellshake-yano/config.ts
- [x] `continuousHintMode`: boolean型チェック
- [x] `recenterCommand`: 文字列型チェック、空文字列禁止
- [x] `maxContinuousJumps`: 正整数チェック（1以上）

### process2 Coreロジック更新
#### sub1 連続ジャンプカウンターの追加
@target: denops/hellshake-yano/core.ts
- [ ] `private continuousJumpCount = 0;`フィールド追加
- [ ] `private lastJumpBufnr: number | null = null;`フィールド追加

#### sub2 postJumpHandlerメソッドの実装
@target: denops/hellshake-yano/core.ts
@ref: denops/hellshake-yano/core.ts (jumpToHintTarget: 927-935行目)
- [ ] ジャンプ実行（既存のjumpToHintTargetを呼び出し）
- [ ] バッファ番号チェック（境界越えの検出）
- [ ] セーフティネットチェック（maxContinuousJumps）
- [ ] 連続モード有効時: hide → recenter → show
- [ ] カウンターインクリメント
- [ ] deno checkを通過すること
- [ ] deno testを通過すること

#### sub3 waitForUserInputの修正（3箇所）
@target: denops/hellshake-yano/core.ts
@ref: denops/hellshake-yano/core.ts (waitForUserInput: 954-1161行目)
- [ ] 無効キー入力時（1019行目付近）にカウンターリセット追加
- [ ] ESC入力時（983行目付近）にカウンターリセット追加
- [ ] 小文字キー入力時（995行目付近）にカウンターリセット追加
- [ ] deno checkを通過すること
- [ ] deno testを通過すること

#### sub4 各ジャンプ処理でpostJumpHandlerを呼び出し
@target: denops/hellshake-yano/core.ts
@ref: denops/hellshake-yano/core.ts (waitForUserInput: 954-1161行目)
- [ ] 1文字ヒントジャンプ（1050行目付近）→ postJumpHandler化
- [ ] タイムアウト自動選択（1104, 1106行目付近）→ postJumpHandler化
- [ ] 2文字ヒント選択（1143行目付近）→ postJumpHandler化
- [ ] deno checkを通過すること
- [ ] deno testを通過すること

### process3 Vimscript連携確認
#### sub1 既存インターフェースの動作確認
@target: autoload/hellshake_yano/hint.vim
@ref: denops/hellshake-yano/core.ts
- [ ] Denops呼び出しインターフェースの変更点が不要であることを確認
- [ ] 手動呼び出し時も連続モードが正常に動作することを確認
- [ ] deno checkを通過すること
- [ ] deno testを通過すること

### process10 ユニットテスト
#### sub1 基本動作テスト
@target: tests/core_test.ts
- [ ] `continuousHintMode: false`時の従来動作維持テスト
- [ ] `continuousHintMode: true`時の再描画動作テスト
- [ ] セーフティネット（maxContinuousJumps）到達テスト
- [ ] deno checkを通過すること
- [ ] deno testを通過すること

#### sub2 カウンターリセットテスト
@target: tests/core_test.ts
- [ ] 無効キー入力時のカウンターリセット検証
- [ ] ESC入力時のカウンターリセット検証
- [ ] 小文字キー入力時のカウンターリセット検証
- [ ] deno checkを通過すること
- [ ] deno testを通過すること

#### sub3 バッファ境界テスト
@target: tests/core_test.ts
- [ ] 別バッファへのジャンプ時のループ終了テスト
- [ ] 同一バッファ内ジャンプの連続動作テスト
- [ ] deno checkを通過すること
- [ ] deno testを通過すること

#### sub4 既存テストの回帰確認
@target: tests/core_test.ts, tests/key_switching_test.ts
- [ ] 既存のwaitForUserInput系テストがパスすることを確認
- [ ] キーモード切替時の影響がないことを確認
- [ ] deno checkを通過すること
- [ ] deno testを通過すること

### process50 フォローアップ
{{実装後に仕様変更などが発生した場合は、ここにProcessを追加する}}

### process100 リファクタリング
- [ ] postJumpHandler導入で冗長になったコメントの整理
- [ ] ジャンプ処理の重複コード削減の検討

### process200 ドキュメンテーション
- [ ] README_ja.mdに新設定の説明を追記
  - `continuousHintMode`の使用例
  - `recenterCommand`のカスタマイズ例
  - ループ終了方法の説明
- [ ] 設定例の追加
  ```vim
  " 連続ヒントモードを有効化
  let g:hellshake_yano_config = {
  \   'continuousHintMode': v:true,
  \   'recenterCommand': 'normal! zz',
  \   'maxContinuousJumps': 50,
  \ }
  ```

## 設計の利点

### ユーザー体験
- **既存の直感的な操作を活用**: ヒント以外のキーを押せばすぐにループ終了
- **新しい操作学習が不要**: 既存のキー入力パターンがそのまま終了条件に
- **柔軟な終了**: ESC、通常移動キー、コマンドモード開始など、複数の自然な終了方法

### 実装のシンプルさ
- **最小限の変更**: 既存コードへの追加は主に3行のカウンターリセット
- **複雑な制御ロジック不要**: タイムアウト管理、デバウンス処理などを削減
- **保守性の向上**: postJumpHandlerでジャンプ後処理を一元管理

### 安全性
- **無限ループ防止**: 複数の終了条件 + セーフティネット
- **バッファ境界保護**: 意図しないバッファ間ジャンプでループ停止
- **後方互換性**: デフォルトfalseで既存ユーザーに影響なし
