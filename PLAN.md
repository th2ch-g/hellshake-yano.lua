# title: main.tsのエンドポイント責務集中リファクタリング

## 概要
- main.tsを純粋なDenopsエンドポイントファイルとして機能させ、実装ロジックを適切な責務を持つ専用モジュールに分離する

### goal
- main.tsがAPIエンドポイントのみを定義し、実装詳細は各モジュールに委譲される構造を実現する
- 各モジュールが単一責任原則に従い、保守性と再利用性が向上する

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 後方互換性を維持すること
- 既存のAPIインターフェースを変更しないこと

## 開発のゴール
- main.tsから実装ロジックを完全に分離し、エンドポイント定義のみにする
- 責務ごとに専門化されたモジュールを作成し、コードの見通しを改善する
- ファイルサイズを適切に保ち、理解しやすい構造にする

## 実装仕様

### 現状の問題点
main.ts（1408行）に以下の責務が混在している：
- 表示・レンダリング処理（約400行）
- 設定検証・色検証（約300行）
- 後方互換性処理（約80行）
- パフォーマンス計測・キャッシュ管理（約150行）
- 辞書システム連携（約80行）
- ユーティリティ関数（約70行）

### 新モジュール構造
- `display.ts`: ヒント表示とレンダリング関連
- `validation.ts`: 設定とハイライトの検証
- `compatibility.ts`: 後方互換性とユーティリティ
- `performance.ts`: パフォーマンス計測とキャッシュ
- `dictionary.ts`: 辞書システム連携

## 生成AIの学習用コンテキスト

### 現在の構造
- denops/hellshake-yano/main.ts
  - 現在1408行のファイルで、エンドポイントと実装が混在
- denops/hellshake-yano/core.ts
  - Coreクラスが中核ロジックを管理
- denops/hellshake-yano/config.ts
  - 設定管理（validateConfigはここに存在）

## Process

### process1 display.tsの作成
#### sub1 表示関連関数の移動
@target: denops/hellshake-yano/display.ts
@ref: denops/hellshake-yano/main.ts:595-992
- [ ] displayHintsOptimized関数を移動（行595-618）
- [ ] displayHintsAsync関数を移動（行633-641）
- [ ] displayHintsBatched関数を移動（行663-695）
- [ ] highlightCandidateHintsAsync関数を移動（行773-806）
- [ ] highlightCandidateHintsHybrid関数を移動（行818-862）
- [ ] highlightCandidateHintsOptimized関数を移動（行871-880）
- [ ] processExtmarksBatched関数を移動（行888-912）
- [ ] processMatchaddBatched関数を移動（行920-992）
- [ ] clearHintDisplay関数を移動（行700-713）
- [ ] hideHints関数を移動（行718-728）
- [ ] isRenderingHints/abortCurrentRendering関数を移動（行646-654）
- [ ] 定数HIGHLIGHT_BATCH_SIZEを移動（行623）
- [ ] レンダリング状態管理変数を移動（行620,730-731）

### process2 validation.tsの作成
#### sub1 検証関連関数の移動
@target: denops/hellshake-yano/validation.ts
@ref: denops/hellshake-yano/main.ts:998-1312
- [ ] validateConfig関数を移動（行998-1082）
- [ ] validateHighlightGroupName関数を移動（行1088-1090）
- [ ] isValidColorName関数を移動（行1096-1112）
- [ ] isValidHexColor関数を移動（行1118-1122）
- [ ] normalizeColorName関数を移動（行1128-1133）
- [ ] validateHighlightColor関数を移動（行1139-1185）
- [ ] generateHighlightCommand関数を移動（行1192-1224）
- [ ] validateHighlightConfig関数を移動（行1230-1312）

### process3 compatibility.tsの作成
#### sub1 後方互換性とユーティリティ関数の移動
@target: denops/hellshake-yano/compatibility.ts
@ref: denops/hellshake-yano/main.ts:77-145,193-294
- [ ] normalizeBackwardCompatibleFlags関数を移動（行193-274）
- [ ] getMinLengthForKey関数を移動（行77-109）
- [ ] getMotionCountForKey関数を移動（行116-145）
- [ ] convertConfigForManager関数を移動（行280-285）
- [ ] syncManagerConfig関数を移動（行290-293）
- [ ] BackwardCompatibleConfig型定義を移動（行175-185）

### process4 performance.tsの作成
#### sub1 パフォーマンス計測とキャッシュ管理の移動
@target: denops/hellshake-yano/performance.ts
@ref: denops/hellshake-yano/main.ts:44-70,526-585
- [ ] recordPerformance関数を移動（行61-70）
- [ ] detectWordsOptimized関数を移動（行531-542）
- [ ] generateHintsOptimized関数を移動（行549-558）
- [ ] generateHintsFromConfig関数を移動（行566-585）
- [ ] wordsCache/hintsCacheインスタンスを移動（行44-47）
- [ ] performanceMetrics変数を移動（行49-55）
- [ ] collectDebugInfo/clearDebugInfo関数を移動（行150-169）
- [ ] cleanupPendingTimers関数を移動（行758-763）
- [ ] getTimeoutDelay関数を移動（行738-748）

### process5 dictionary.tsの作成
#### sub1 辞書システム関連の移動
@target: denops/hellshake-yano/dictionary.ts
@ref: denops/hellshake-yano/main.ts:1318-1405
- [ ] getCoreForDictionary関数を移動（行1318-1320）
- [ ] initializeDictionarySystem関数を移動（行1325-1332）
- [ ] reloadDictionary関数を移動（行1338-1345）
- [ ] addToDictionary関数を移動（行1354-1366）
- [ ] editDictionary関数を移動（行1372-1379）
- [ ] showDictionary関数を移動（行1385-1392）
- [ ] validateDictionary関数を移動（行1398-1405）

### process6 main.tsの整理
#### sub1 エンドポイント定義に集中
@target: denops/hellshake-yano/main.ts
- [ ] 移動した関数を削除
- [ ] 新しいモジュールからのインポートを追加
- [ ] dispatcherの各メソッドを、対応するモジュールの関数呼び出しに置き換え
- [ ] グローバル状態変数（config, currentHints, hintsVisible等）を保持
- [ ] main関数とdispatcher定義のみを残す

### process7 インポート最適化
#### sub1 循環依存の解消と整理
@target: 各モジュールファイル
- [ ] 循環依存がないことを確認
- [ ] 不要なインポートを削除
- [ ] 型定義のインポートを整理

### process10 ユニットテスト
#### sub1 既存テストの動作確認
@target: denops/hellshake-yano/*.test.ts
- [ ] 既存のテストが正常に動作することを確認
- [ ] 必要に応じてインポートパスを更新

#### sub2 新モジュールのテスト作成
- [ ] display.tsのテストを作成
- [ ] validation.tsのテストを作成
- [ ] compatibility.tsのテストを作成
- [ ] performance.tsのテストを作成

### process50 フォローアップ
（実装後に仕様変更などが発生した場合に追加）

### process100 リファクタリング
#### sub1 コードの最適化
- [ ] 重複コードの削除
- [ ] 命名規則の統一
- [ ] TypeScript型定義の改善

### process200 ドキュメンテーション
- [ ] 各モジュールにJSDocコメントを追加
- [ ] README.mdに新しいアーキテクチャを記載
- [ ] CLAUDE.mdに新しいモジュール構造を反映
