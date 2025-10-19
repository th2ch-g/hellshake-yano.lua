# title: Phase D - Vim機能の完成

## 概要
- Neovim側（Denops版）の機能をVim側（Pure VimScript版）に段階的に移植
- 必須設定（useNumericMultiCharHints、singleCharKeys、multiCharKeys、highlightHintMarker、highlightHintMarkerCurrent、perKeyMotionCount、continuousHintMode）の優先実装
- TinySegmenterによる日本語形態素解析の移植
- 両環境での機能パリティ実現

### goal
- Vim環境でもNeovim版と同等の高度な機能が利用可能
- カスタマイズ可能なヒントシステム
- 高精度な日本語単語検出

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- TDD方式での開発継続（Red-Green-Refactor）
- Vim 8.0以上での動作保証
- 既存設定との後方互換性維持

## 開発のゴール
- 必須設定7項目の完全実装
- TinySegmenterによる日本語形態素解析
- LRUキャッシュによるパフォーマンス最適化
- 辞書システムによる単語認識精度向上
- 全機能の統合テストとドキュメント化

## 実装仕様

### 必須実装機能
- useNumericMultiCharHints: 2桁数字ヒント（00-99）
- singleCharKeys: カスタマイズ可能な単一文字ヒント
- multiCharKeys: カスタマイズ可能な複数文字ヒント
- highlightHintMarker: ヒントのカスタムハイライト
- highlightHintMarkerCurrent: 現在ヒントのカスタムハイライト
- perKeyMotionCount: キー別モーションカウント設定
- continuousHintMode: 連続ヒントループモード

### その他重要機能
- TinySegmenter形態素解析（P0）
- 辞書システム（P1）
- LRUキャッシュシステム（P0）
- Per-Key最小単語長設定（P1）
- both側ヒント表示（P1）

## 生成AIの学習用コンテキスト

### Neovim実装ファイル
- denops/hellshake-yano/config.ts
  - 設定項目の定義と既定値
- denops/hellshake-yano/neovim/core/word/word-segmenter.ts
  - TinySegmenter実装の参考
- denops/hellshake-yano/neovim/core/core.ts
  - コア機能とキャッシュシステムの参考

### VimScript実装ファイル
- autoload/hellshake_yano_vim/*.vim
  - 既存のVimScript実装基盤

### ドキュメント
- ARCHITECTURE_C.md
  - Phase C統合計画と完了状況
- README.md
  - 機能一覧と設定項目

## Process

### process1: 基盤整備とヒント機能拡張（Phase D-1）
#### sub1: カスタムヒントキー設定実装
@target: autoload/hellshake_yano_vim/hint_generator.vim
@ref: denops/hellshake-yano/config.ts
- [ ] singleCharKeys配列のサポート
- [ ] multiCharKeys配列のサポート
- [ ] カスタマイズ可能なヒント文字生成ロジック

#### sub2: 2桁数字ヒント機能
@target: autoload/hellshake_yano_vim/hint_generator.vim
- [ ] useNumericMultiCharHintsオプション実装
- [ ] 00-99の数字ヒント生成
- [ ] 最大100個の追加ヒント対応

#### sub3: カスタムハイライト設定
@target: autoload/hellshake_yano_vim/display.vim
- [ ] highlightHintMarker設定実装
- [ ] highlightHintMarkerCurrent設定実装
- [ ] 色指定（#RRGGBB）対応
- [ ] ハイライトグループ名対応

### process2: Per-Key設定システム（Phase D-2）
#### sub1: Per-Keyモーションカウント
@target: autoload/hellshake_yano_vim/motion.vim
@ref: denops/hellshake-yano/config.ts
- [ ] perKeyMotionCount辞書のサポート
- [ ] defaultMotionCountフォールバック
- [ ] キー別カウンター管理

#### sub2: Per-Key最小単語長
@target: autoload/hellshake_yano_vim/word_detector.vim
- [ ] perKeyMinLength辞書のサポート
- [ ] defaultMinWordLengthフォールバック
- [ ] キー別フィルタリング処理

### process3: 連続ヒントループモード（Phase D-3）
#### sub1: 連続モード制御
@target: autoload/hellshake_yano_vim/continuous.vim（新規）
- [ ] continuousHintModeオプション実装
- [ ] ジャンプ後の自動再センタリング
- [ ] ヒントの自動再表示
- [ ] maxContinuousJumps制限

### process4: キャッシュシステム（Phase D-4）
#### sub1: LRUキャッシュ実装
@target: autoload/hellshake_yano_vim/cache.vim（新規）
@ref: denops/hellshake-yano/cache.ts
- [ ] VimScript版LRUアルゴリズム
- [ ] 単語検出結果のキャッシュ
- [ ] ヒント生成結果のキャッシュ
- [ ] キャッシュサイズ制限とエビクション

### process5: 日本語基本対応（Phase D-5）
#### sub1: 文字種判定と境界検出
@target: autoload/hellshake_yano_vim/japanese.vim（新規）
- [ ] ひらがな、カタカナ、漢字の判定
- [ ] 文字種境界での単語分割
- [ ] 助詞での分割（の、を、に、が等）
- [ ] カタカナ連続の認識
- [ ] 英数字混在テキストの処理

### process6: TinySegmenter移植（Phase D-6）
#### sub1: VimScript版TinySegmenter
@target: autoload/hellshake_yano_vim/tinysegmenter.vim（新規）
@ref: denops/hellshake-yano/neovim/core/word/word-segmenter.ts
- [ ] JavaScriptアルゴリズムの移植
- [ ] 特徴量計算とスコア計算
- [ ] 単語境界判定ロジック
- [ ] パフォーマンス最適化
- [ ] Vim9 Script条件付き使用

### process7: 辞書システム（Phase D-7）
#### sub1: 辞書ファイル管理
@target: autoload/hellshake_yano_vim/dictionary.vim（新規）
- [ ] JSON/YAML/テキスト形式対応
- [ ] .hellshake-yano/dictionary.jsonサポート
- [ ] ビルトイン辞書（80+用語）
- [ ] 辞書コマンド実装

### process8: 統合と最適化（Phase D-8）
#### sub1: その他の機能実装
@target: 各関連ファイル
- [ ] both側ヒント表示（bothMinWordLength）
- [ ] キーリピート抑制機能
- [ ] パフォーマンスメトリクス
- [ ] ヘルスチェック機能

### process10: ユニットテスト
- [ ] 各機能のVimScriptテスト作成
- [ ] tests-vim/以下にテストファイル追加
- [ ] :HellshakeYanoVimTest経由での実行確認

### process50: フォローアップ
実装中に発見された追加要件や仕様変更はここに追加

### process100: リファクタリング
- [ ] パフォーマンスボトルネックの解析
- [ ] メモリ使用量最適化
- [ ] コード重複の削減

### process200: ドキュメンテーション
- [ ] README.md更新（新機能の説明）
- [ ] CHANGELOG.md更新（Phase D完了）
- [ ] 各新機能の使用例追加
- [ ] 設定例の充実