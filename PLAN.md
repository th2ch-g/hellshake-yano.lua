# title: TinySegmenterによる日本語分かち書き機能の実装

## 概要
- hellshake-yano.vimプラグインで日本語テキストに対してもヒント表示を可能にする機能
- TinySegmenterを使用した日本語形態素解析により、日本語の単語単位でヒントを設定

### goal
- 日本語を含むテキストで、単語単位にヒントが表示される
- 英数字と日本語が混在するテキストでも適切にヒントが表示される

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- 単一責任の原則に従い、各Detectorの責務を明確に分離する

## 開発のゴール
- TinySegmenterを使用した日本語単語検出機能の実装
- 責務を明確に分離したアーキテクチャの実現
- 既存の英数字検出機能との適切な統合

## 実装仕様

### 現状の問題
1. **設定の反映不具合**
   - `use_japanese: true`と`enable_tinysegmenter: true`を設定しても日本語にヒントが表示されない
   - 原因: Coreインスタンスの初期化時にデフォルト設定が使用され、ユーザー設定が反映されていない

2. **アーキテクチャの問題**
   - RegexWordDetectorにTinySegmenter処理が混在し、責務が不明確
   - WordDetectionManagerのstrategyパターンが十分に活用されていない

### 解決方針
1. Coreインスタンスの設定更新処理を追加（実装済み）
2. TinySegmenterWordDetectorを独立したクラスとして実装
3. 各Detectorの責務を明確に分離

## 生成AIの学習用コンテキスト

### 設定ファイル
- `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/config.ts`
  - UnifiedConfig インターフェースの定義
  - useJapanese, enableTinySegmenter 設定項目

### メインロジック
- `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/main.ts`
  - プラグイン初期化処理
  - Core インスタンスの生成と設定

### 単語検出機能
- `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/word.ts`
  - WordDetector インターフェース
  - RegexWordDetector クラス
  - TinySegmenter クラス
  - WordDetectionManager クラス

### コア機能
- `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/core.ts`
  - Core クラス
  - detectWordsOptimized メソッド
  - showHintsInternal メソッド

## Process

### process1 設定反映問題の修正
#### sub1 Coreインスタンスへのユーザー設定反映
@target: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/main.ts`
@ref: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/core.ts`
- [x] main.tsの初期化処理でユーザー設定取得後にcore.updateConfig()を追加
  - 229-230行目に実装済み

### process2 TinySegmenterWordDetectorの実装
#### sub1 独立したDetectorクラスの作成
@target: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/word.ts`
- [ ] TinySegmenterWordDetectorクラスの新規作成
  - WordDetectorインターフェースを実装
  - 日本語専用の単語検出ロジック
- [ ] detectWordsメソッドの実装
  - TinySegmenter.segment()を使用した分かち書き処理
- [ ] canHandleメソッドの実装
  - 日本語テキストの判定ロジック

#### sub2 RegexWordDetectorのリファクタリング
@target: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/word.ts`
- [ ] extractWordsImprovedからTinySegmenter処理を削除
  - 正規表現ベースの処理のみに専念
- [ ] 日本語処理の適切な分離

### process3 HybridWordDetectorの実装（オプション）
#### sub1 複合検出器の作成
@target: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/word.ts`
- [ ] HybridWordDetectorクラスの実装
  - RegexとTinySegmenterの結果をマージ
- [ ] 重複除去ロジックの実装

### process4 WordDetectionManagerの更新
#### sub1 Detector登録処理の更新
@target: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/word.ts`
- [ ] registerStandardDetectorsメソッドの更新
  - TinySegmenterWordDetectorの追加
- [ ] getDetectorForContextメソッドの実装
  - strategyに基づく適切なDetector選択

### process10 ユニットテスト
- [ ] TinySegmenterWordDetectorのテスト作成
- [ ] 日本語・英語混在テキストでの動作確認
- [ ] 各strategyでの切り替え動作確認

### process50 フォローアップ
#### sub1 暫定対応の修正
@target: `/home/takets/.config/nvim/plugged/hellshake-yano.vim/denops/hellshake-yano/word.ts`
- [ ] RegexWordDetector内の暫定的なTinySegmenter統合を削除
  - extractWordsImprovedメソッドを元の実装に戻す

### process100 リファクタリング
- [ ] 不要なコードの削除
- [ ] 型定義の整理
- [ ] エラーハンドリングの改善

### process200 ドキュメンテーション
- [ ] README.mdへの日本語対応機能の追記
- [ ] 設定項目の説明更新
  - wordDetectionStrategy の説明
  - enableTinySegmenter の使用方法
- [ ] 日本語テキストでの使用例を追加

