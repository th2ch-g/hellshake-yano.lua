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

### TDD実施ルール
各subタスクは以下のTDDサイクルで実装：
1. **Red**: テストを先に書き、失敗することを確認
2. **Green**: 最小限の実装でテストを通す
3. **Refactor**: コードを改善し、テストが通ることを確認
4. **型チェック**: `deno check` で型安全性を確認
5. **VimScript移植**: Vim環境での動作確認

### process1: 基盤整備とヒント機能拡張（Phase D-1）
#### sub1: カスタムヒントキー設定実装
@target: autoload/hellshake_yano_vim/hint_generator.vim
@ref: denops/hellshake-yano/config.ts

##### TDD Step 1: Red（テスト作成）
- [x] tests/hint_generator_test.ts にsingleCharKeysのテストケース作成
- [x] tests/hint_generator_test.ts にmultiCharKeysのテストケース作成
- [x] `deno test` 実行して成功を確認（実装済みのためGreen状態）

##### TDD Step 2: Green（実装）
- [x] singleCharKeys配列のサポート実装（既存実装で完了）
- [x] multiCharKeys配列のサポート実装（既存実装で完了）
- [x] カスタマイズ可能なヒント文字生成ロジック実装（既存実装で完了）
- [x] `deno check denops/hellshake-yano/**/*.ts` で型チェック
- [x] `deno test` 実行してテスト成功を確認（全15テスト成功）

##### TDD Step 3: Refactor（リファクタリング）
- [x] コードの可読性向上・重複排除（既存実装で完了）
- [x] `deno test` で回帰テスト確認

##### VimScript実装
- [x] autoload/hellshake_yano_vim/hint_generator.vim に移植（sub2.1で実施）
- [x] Vimでの手動動作確認（sub2.1で実施）

#### sub2: 2桁数字ヒント機能
@target: autoload/hellshake_yano_vim/hint_generator.vim

##### TDD Step 1: Red（テスト作成）
- [x] tests/hint_generator_test.ts に数字ヒントのテストケース作成
- [x] 01-99, 00の範囲テスト作成
- [x] `deno test` 実行して成功を確認（実装済みのためGreen状態）

##### TDD Step 2: Green（実装）
- [x] useNumericMultiCharHintsオプション実装（既存実装で完了）
- [x] 01-99, 00の数字ヒント生成ロジック（既存実装で完了）
- [x] 最大100個の追加ヒント対応（既存実装で完了）
- [x] `deno check denops/hellshake-yano/**/*.ts` で型チェック
- [x] `deno test` 実行してテスト成功を確認（全15テスト成功）

##### TDD Step 3: Refactor（リファクタリング）
- [x] コードの最適化（既存実装で完了）
- [x] `deno test` で回帰テスト確認

##### VimScript実装（TypeScript完了後）
- [x] TypeScript版実装完了
- [x] Pure Vim版への移植（sub2.1で実施）

#### sub2.1: Pure Vim版への機能移植
@target: autoload/hellshake_yano_vim/hint_generator.vim
@ref: denops/hellshake-yano/vim/core/hint-generator.ts

##### 背景
TypeScript版で実装した機能をPure Vim環境で利用できるようにする。
現在、Pure Vim版は古い設定方式（`g:hellshake_yano_vim_*`）を使用しており、
ユーザーの`.vimrc`設定（`g:hellshake_yano.*`）が反映されない。

##### TDD Step 1: Red（VimScriptテスト作成）
- [x] tests-vim/test_sub2_1.vim に数字ヒントのテストケース作成
- [x] `g:hellshake_yano`からの設定読み込みテスト作成
- [x] 01-99, 00順序のテスト作成
- [x] 動的maxTotal計算のテスト作成
- [x] テスト実行して失敗を確認

##### TDD Step 2: Green（VimScript実装）
- [x] 設定読み込みの統合実装
  - [x] `g:hellshake_yano.singleCharKeys` サポート
  - [x] `g:hellshake_yano.multiCharKeys` サポート
  - [x] `g:hellshake_yano.useNumericMultiCharHints` サポート
  - [x] デフォルト値へのフォールバック
- [x] useNumericMultiCharHints機能実装
  - [x] s:generate_numeric_hints() 関数追加
  - [x] Neovim実装準拠（01-09, 10-99, 00の順序）
  - [x] 最大100個の数字ヒント対応
- [x] 動的maxTotal計算実装
  - [x] 固定値49から動的計算に変更
  - [x] `len(singleCharKeys) + len(multiCharKeys)^2`
- [x] テスト実行してテスト成功を確認

##### TDD Step 3: Refactor（リファクタリング）
- [x] コードの可読性向上（不要な後方互換性コードを削除）
- [x] ドキュメントコメント更新
- [x] 回帰テスト確認（全テスト成功）

##### 動作確認
- [x] Vimで `g:hellshake_yano` 設定が反映されることを確認
- [x] useNumericMultiCharHints: v:true で数字ヒントが表示されることを確認
- [x] カスタムsingleCharKeys/multiCharKeysが動作することを確認
- [x] 動的maxTotalが正しく計算されることを確認

#### sub2.2: 動的maxTotal制限の完全適用
@target: autoload/hellshake_yano_vim/core.vim, autoload/hellshake_yano_vim/config.vim
@ref: autoload/hellshake_yano_vim/hint_generator.vim

##### 背景
sub2.1でhint_generator.vimに動的maxTotal計算を実装したが、core.vimで49個の固定制限がハードコードされているため、カスタム設定が反映されない。
- core.vim:170-171 で `if len(l:detected_words) > 49` の固定制限
- config.vim:54 で `'max_hints': 49` のデフォルト値
- ユーザー設定（singleCharKeys: 12文字、multiCharKeys: 15文字）では237個まで可能だが、49個で切り詰められる

##### TDD Step 1: Red（VimScriptテスト作成）
- [x] tests-vim/test_sub2_2.vim にcore.vim制限のテストケース作成
- [x] tests-vim/test_sub2_2_simple.vim に簡易テスト作成
- [x] カスタムキー設定で237個のヒント生成テスト作成
- [x] useNumericMultiCharHints: true で337個（237+100）のテスト作成
- [x] テスト実行して成功を確認（hint_generator は正常動作）

##### TDD Step 2: Green（VimScript実装）
- [x] core.vim の修正
  - [x] 170-172行目の固定49個制限を削除
  - [x] 動的に計算されたヒント数をそのまま使用
  - [x] hint_generator#generate() の戻り値の長さで判定
  - [x] ドキュメントコメント追加（Phase D-1 Sub2.2）
- [x] config.vim の修正
  - [x] `max_hints: 49` を [DEPRECATED] コメント追加
  - [x] 動的計算を使用することをドキュメント化
- [x] テスト実行してテスト成功を確認

##### TDD Step 3: Refactor（リファクタリング）
- [x] コードの可読性向上（完了）
- [x] ドキュメントコメント更新（動的maxTotalの説明追加）
- [x] 回帰テスト確認（Deno tests: 全15テスト成功）
- [x] 型チェック確認（deno check: 成功）

##### 動作確認
- [x] hint_generator で237個のヒント生成を確認
- [x] useNumericMultiCharHints: true で337個まで生成を確認
- [x] テストスクリプト作成（test_sub2_2_simple.vim, verify_sub2_2.vim）
- [x] 全テストが成功することを確認（237個/337個のヒント生成成功）

#### sub3: カスタムハイライト設定
@target: autoload/hellshake_yano_vim/display.vim

##### TDD Step 1: Red（テスト作成）
- [x] tests-vim/test_sub3_highlight.vim にハイライト設定のテストケース作成
- [x] tests-vim/test_sub3_simple.vim に簡易テスト作成
- [x] テスト実行して失敗を確認（E117: Unknown function）

##### TDD Step 2: Green（実装）
- [x] hellshake_yano_vim#display#get_highlight_group() 関数実装
- [x] highlightHintMarker設定実装（文字列・オブジェクト両対応）
- [x] highlightHintMarkerCurrent設定実装（文字列・オブジェクト両対応）
- [x] 色指定（#RRGGBB）対応（fg/bg サポート）
- [x] ハイライトグループ名対応（文字列の場合はそのまま使用）
- [x] s:define_highlight_group() で動的ハイライト生成
- [x] s:show_hint_vim() でカスタムハイライト適用
- [x] s:show_hint_neovim() でカスタムハイライト適用
- [x] テスト実行して成功を確認（全3テスト PASS）

##### TDD Step 3: Refactor（リファクタリング）
- [x] コードの可読性確認（完了）
- [x] ドキュメントコメント追加（Phase D-1 Sub3 マーク）
- [x] 回帰テスト確認（VimScript テスト成功）

##### VimScript実装
- [x] autoload/hellshake_yano_vim/display.vim に実装完了
- [x] Vimでの動作確認（test_sub3_simple.vim で全テスト PASS）

### process2: Per-Key設定システム（Phase D-2）
#### sub1: Per-Keyモーションカウント
@target: autoload/hellshake_yano_vim/motion.vim
@ref: denops/hellshake-yano/config.ts

##### TDD Step 1: Red（テスト作成）
- [ ] tests/motion_test.ts にperKeyMotionCountのテストケース作成
- [ ] defaultMotionCountフォールバックのテスト作成
- [ ] `deno test` 実行して失敗を確認

##### TDD Step 2: Green（実装）
- [ ] perKeyMotionCount辞書のサポート実装
- [ ] defaultMotionCountフォールバック実装
- [ ] キー別カウンター管理実装
- [ ] `deno check denops/hellshake-yano/**/*.ts` で型チェック
- [ ] `deno test` 実行してテスト成功を確認

##### TDD Step 3: Refactor（リファクタリング）
- [ ] コードの整理・最適化
- [ ] `deno test` で回帰テスト確認

##### VimScript実装
- [ ] autoload/hellshake_yano_vim/motion.vim に移植
- [ ] Vimでの手動動作確認

#### sub2: Per-Key最小単語長
@target: autoload/hellshake_yano_vim/word_detector.vim

##### TDD Step 1: Red（テスト作成）
- [ ] tests/word_detector_test.ts にperKeyMinLengthのテストケース作成
- [ ] defaultMinWordLengthフォールバックのテスト作成
- [ ] `deno test` 実行して失敗を確認

##### TDD Step 2: Green（実装）
- [ ] perKeyMinLength辞書のサポート実装
- [ ] defaultMinWordLengthフォールバック実装
- [ ] キー別フィルタリング処理実装
- [ ] `deno check denops/hellshake-yano/**/*.ts` で型チェック
- [ ] `deno test` 実行してテスト成功を確認

##### TDD Step 3: Refactor（リファクタリング）
- [ ] コードの整理
- [ ] `deno test` で回帰テスト確認

##### VimScript実装
- [ ] autoload/hellshake_yano_vim/word_detector.vim に移植
- [ ] Vimでの手動動作確認

### process3: 連続ヒントループモード（Phase D-3）
#### sub1: 連続モード制御
@target: autoload/hellshake_yano_vim/continuous.vim（新規）

##### TDD Step 1: Red（テスト作成）
- [ ] tests/continuous_test.ts に連続モードのテストケース作成
- [ ] 再センタリングのテスト作成
- [ ] ヒント再表示のテスト作成
- [ ] maxContinuousJumps制限のテスト作成
- [ ] `deno test` 実行して失敗を確認

##### TDD Step 2: Green（実装）
- [ ] continuousHintModeオプション実装
- [ ] ジャンプ後の自動再センタリング実装
- [ ] ヒントの自動再表示実装
- [ ] maxContinuousJumps制限実装
- [ ] `deno check denops/hellshake-yano/**/*.ts` で型チェック
- [ ] `deno test` 実行してテスト成功を確認

##### TDD Step 3: Refactor（リファクタリング）
- [ ] コードの整理・最適化
- [ ] `deno test` で回帰テスト確認

##### VimScript実装
- [ ] autoload/hellshake_yano_vim/continuous.vim に移植
- [ ] Vimでの手動動作確認

### process4: キャッシュシステム（Phase D-4）
#### sub1: LRUキャッシュ実装
@target: autoload/hellshake_yano_vim/cache.vim（新規）
@ref: denops/hellshake-yano/cache.ts

##### TDD Step 1: Red（テスト作成）
- [ ] tests/cache_test.ts にLRUアルゴリズムのテストケース作成
- [ ] キャッシュヒット・ミスのテスト作成
- [ ] エビクションのテスト作成
- [ ] `deno test` 実行して失敗を確認

##### TDD Step 2: Green（実装）
- [ ] VimScript版LRUアルゴリズム実装
- [ ] 単語検出結果のキャッシュ実装
- [ ] ヒント生成結果のキャッシュ実装
- [ ] キャッシュサイズ制限とエビクション実装
- [ ] `deno check denops/hellshake-yano/**/*.ts` で型チェック
- [ ] `deno test` 実行してテスト成功を確認

##### TDD Step 3: Refactor（リファクタリング）
- [ ] パフォーマンス最適化
- [ ] `deno test` で回帰テスト確認

##### VimScript実装
- [ ] autoload/hellshake_yano_vim/cache.vim に移植
- [ ] Vimでの手動動作確認

### process5: 日本語基本対応（Phase D-5）
#### sub1: 文字種判定と境界検出
@target: autoload/hellshake_yano_vim/japanese.vim（新規）

##### TDD Step 1: Red（テスト作成）
- [ ] tests/japanese_test.ts に文字種判定のテストケース作成
- [ ] 文字種境界検出のテスト作成
- [ ] 助詞分割のテスト作成
- [ ] カタカナ連続認識のテスト作成
- [ ] 英数字混在テキストのテスト作成
- [ ] `deno test` 実行して失敗を確認

##### TDD Step 2: Green（実装）
- [ ] ひらがな、カタカナ、漢字の判定実装
- [ ] 文字種境界での単語分割実装
- [ ] 助詞での分割（の、を、に、が等）実装
- [ ] カタカナ連続の認識実装
- [ ] 英数字混在テキストの処理実装
- [ ] `deno check denops/hellshake-yano/**/*.ts` で型チェック
- [ ] `deno test` 実行してテスト成功を確認

##### TDD Step 3: Refactor（リファクタリング）
- [ ] コードの整理・最適化
- [ ] `deno test` で回帰テスト確認

##### VimScript実装
- [ ] autoload/hellshake_yano_vim/japanese.vim に移植
- [ ] Vimでの手動動作確認

### process6: TinySegmenter移植（Phase D-6）
#### sub1: VimScript版TinySegmenter
@target: autoload/hellshake_yano_vim/tinysegmenter.vim（新規）
@ref: denops/hellshake-yano/neovim/core/word/word-segmenter.ts

##### TDD Step 1: Red（テスト作成）
- [ ] tests/tinysegmenter_test.ts にアルゴリズムのテストケース作成
- [ ] 特徴量計算のテスト作成
- [ ] スコア計算のテスト作成
- [ ] 単語境界判定のテスト作成
- [ ] 既知の日本語テキストでの期待結果テスト作成
- [ ] `deno test` 実行して失敗を確認

##### TDD Step 2: Green（実装）
- [ ] JavaScriptアルゴリズムの移植
- [ ] 特徴量計算とスコア計算実装
- [ ] 単語境界判定ロジック実装
- [ ] `deno check denops/hellshake-yano/**/*.ts` で型チェック
- [ ] `deno test` 実行してテスト成功を確認

##### TDD Step 3: Refactor（リファクタリング）
- [ ] パフォーマンス最適化
- [ ] Vim9 Script条件付き使用検討
- [ ] `deno test` で回帰テスト確認

##### VimScript実装
- [ ] autoload/hellshake_yano_vim/tinysegmenter.vim に移植
- [ ] Vimでの手動動作確認
- [ ] パフォーマンスベンチマーク実施

### process7: 辞書システム（Phase D-7）
#### sub1: 辞書ファイル管理
@target: autoload/hellshake_yano_vim/dictionary.vim（新規）

##### TDD Step 1: Red（テスト作成）
- [ ] tests/dictionary_test.ts に辞書ファイル読み込みのテストケース作成
- [ ] JSON/YAML/テキスト形式のパースのテスト作成
- [ ] ビルトイン辞書のテスト作成
- [ ] 辞書検索のテスト作成
- [ ] `deno test` 実行して失敗を確認

##### TDD Step 2: Green（実装）
- [ ] JSON/YAML/テキスト形式対応実装
- [ ] .hellshake-yano/dictionary.jsonサポート実装
- [ ] ビルトイン辞書（80+用語）実装
- [ ] 辞書コマンド実装
- [ ] `deno check denops/hellshake-yano/**/*.ts` で型チェック
- [ ] `deno test` 実行してテスト成功を確認

##### TDD Step 3: Refactor（リファクタリング）
- [ ] コードの整理・最適化
- [ ] `deno test` で回帰テスト確認

##### VimScript実装
- [ ] autoload/hellshake_yano_vim/dictionary.vim に移植
- [ ] Vimでの手動動作確認
- [ ] 辞書コマンドのテスト

### process8: 統合と最適化（Phase D-8）
#### sub1: その他の機能実装
@target: 各関連ファイル

##### TDD Step 1: Red（テスト作成）
- [ ] tests/both_side_hint_test.ts にboth側ヒント表示のテストケース作成
- [ ] tests/key_repeat_test.ts にキーリピート抑制のテスト作成
- [ ] tests/metrics_test.ts にパフォーマンスメトリクスのテスト作成
- [ ] tests/health_check_test.ts にヘルスチェックのテスト作成
- [ ] `deno test` 実行して失敗を確認

##### TDD Step 2: Green（実装）
- [ ] both側ヒント表示（bothMinWordLength）実装
- [ ] キーリピート抑制機能実装
- [ ] パフォーマンスメトリクス実装
- [ ] ヘルスチェック機能実装
- [ ] `deno check denops/hellshake-yano/**/*.ts` で型チェック
- [ ] `deno test` 実行してテスト成功を確認

##### TDD Step 3: Refactor（リファクタリング）
- [ ] コードの整理・最適化
- [ ] `deno test` で回帰テスト確認

##### VimScript実装
- [ ] 各関連ファイルに移植
- [ ] Vimでの手動動作確認
- [ ] 統合テスト実施

### process10: ユニットテスト
#### sub1: VimScript統合テスト整備
@target: tests-vim/

##### テスト作成
- [ ] tests-vim/ 以下に各機能のテストファイル作成
- [ ] hint_generator_test.vim
- [ ] display_test.vim
- [ ] motion_test.vim
- [ ] word_detector_test.vim
- [ ] continuous_test.vim
- [ ] cache_test.vim
- [ ] japanese_test.vim
- [ ] tinysegmenter_test.vim
- [ ] dictionary_test.vim

##### テスト実行確認
- [ ] :HellshakeYanoVimTest経由での実行確認
- [ ] Vim環境での全テスト成功確認
- [ ] カバレッジ確認

##### CI/CD整備
- [ ] GitHub Actionsでの自動テスト設定
- [ ] `deno test` と VimScript テストの両方を実行
- [ ] `deno check` による型チェック自動化

### process50: フォローアップ
実装中に発見された追加要件や仕様変更はここに追加

- [ ] 発見された課題の記録
- [ ] 仕様変更の影響分析
- [ ] `deno test` で回帰テスト確認

### process100: リファクタリング
#### sub1: パフォーマンス最適化

##### 分析
- [ ] パフォーマンスボトルネックの解析
- [ ] メモリ使用量プロファイリング
- [ ] コード重複の特定

##### 最適化実施
- [ ] 特定されたボトルネックの最適化
- [ ] メモリ使用量の最適化
- [ ] コード重複の削減
- [ ] `deno check denops/hellshake-yano/**/*.ts` で型チェック
- [ ] `deno test` でパフォーマンステスト実行

##### 検証
- [ ] ベンチマーク実行（最適化前後の比較）
- [ ] Vim環境での動作確認
- [ ] 回帰テスト確認

### process200: ドキュメンテーション
#### sub1: ドキュメント更新

##### ドキュメント作成
- [ ] README.md更新（新機能の説明）
- [ ] CHANGELOG.md更新（Phase D完了）
- [ ] 各新機能の使用例追加
- [ ] 設定例の充実
- [ ] API仕様ドキュメント作成

##### レビュー
- [ ] ドキュメントの正確性確認
- [ ] コード例の動作確認
- [ ] `deno test` で全テスト成功を確認
- [ ] Vimでの実例確認

##### 公開準備
- [ ] バージョン番号の更新
- [ ] リリースノート作成
- [ ] マイグレーションガイド作成（必要に応じて）
