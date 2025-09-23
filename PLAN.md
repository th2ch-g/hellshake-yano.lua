# title: ヒント再描画パフォーマンス問題の修正

## 概要
- ヒント入力時（フィルタリング時）に重複検出ロジックが実行されて遅くなる問題を修正

### goal
- ヒント入力の1文字目でも滑らかに動作するようにする
- 100単語以上でも瞬時にフィルタリングできるようにする

## 必須のルール
- 既存のAPIとの互換性を維持すること
- 初回表示時の重複検出機能は維持すること

## 開発のゴール
- ヒント入力時のレスポンスを10ms以下に改善
- 重複検出のオン/オフを状況に応じて制御
- キャッシュの効果を最大化

## 実装仕様

### パフォーマンス問題の詳細
1. **現状の問題**
   - `assignHintsToWords`が呼ばれるたびに`detectAdjacentWords`が実行（289行目）
   - O(n²)の計算量で、100単語で10,000回、1000単語で1,000,000回の比較
   - ヒント入力のたびに全処理が再実行される

2. **ボトルネック箇所**
   - `detectAdjacentWords`: 全単語ペアの隣接判定
   - `shouldSkipHintForOverlap`: 各単語の優先度判定
   - 正規表現`isSymbolWord`: 繰り返し実行される記号判定

3. **修正方針**
   - フィルタリング時は重複検出をスキップ
   - 設定で重複検出の有効/無効を切り替え可能に
   - シンボル判定の結果をキャッシュ

## 生成AIの学習用コンテキスト

### TypeScriptファイル
- `denops/hellshake-yano/hint.ts`
  - 227-345行: `assignHintsToWords`関数
  - 1129行: `detectAdjacentWords`関数
  - 1223行: `shouldSkipHintForOverlap`関数
- `denops/hellshake-yano/main/operations.ts`
  - 234行: ヒント表示時の`assignHintsToWords`呼び出し
- `denops/hellshake-yano/main.ts`
  - 721行: フィルタリング時の`assignHintsToWords`呼び出し

## Process

### process1 パフォーマンス最適化の実装
#### sub1 重複検出のスキップオプション追加
@target: denops/hellshake-yano/hint.ts
- [ ] `assignHintsToWords`関数にオプションパラメータを追加
  - `skipOverlapDetection?: boolean`パラメータ
  - デフォルトは`false`で後方互換性維持
- [ ] 重複検出処理を条件分岐でラップ
  - `if (!skipOverlapDetection)`で囲む

#### sub2 呼び出し元の修正
@target: denops/hellshake-yano/main/operations.ts
@target: denops/hellshake-yano/main.ts
- [ ] 初回表示時は重複検出を有効
  - `skipOverlapDetection: false`または省略
- [ ] フィルタリング時は重複検出を無効
  - `skipOverlapDetection: true`を追加
- [ ] ヒント入力中フラグの管理
  - `isFiltering`状態を追跡

### process2 設定による制御
#### sub1 Config型の拡張
@target: denops/hellshake-yano/config.ts
- [ ] `enable_overlap_detection`設定の追加
  - デフォルト値: `false`（パフォーマンス優先）
  - 型定義とバリデーション
- [ ] `overlap_detection_threshold`設定の追加
  - 単語数がこの値以下の場合のみ検出実行
  - デフォルト値: `50`

#### sub2 動的な重複検出の判定
@target: denops/hellshake-yano/hint.ts
- [ ] 設定と単語数による自動判定ロジック
  - `shouldPerformOverlapDetection`関数の作成
  - 単語数と設定値の比較

### process3 キャッシュの最適化
#### sub1 シンボル判定のキャッシュ
@target: denops/hellshake-yano/hint.ts
- [ ] `isSymbolWord`の結果をキャッシュ
  - Mapでword.textをキーに結果を保存
  - キャッシュサイズの制限（100エントリ）
- [ ] キャッシュクリア機能の追加

#### sub2 隣接関係のキャッシュ改善
@target: denops/hellshake-yano/hint.ts
- [ ] キャッシュキーの最適化
  - 単語の位置だけでなく内容も考慮
  - ハッシュ関数の改良
- [ ] キャッシュヒット率の向上

### process10 ユニットテスト
#### sub1 パフォーマンステスト
@target: tests/performance_overlap_test.ts
- [ ] 重複検出スキップ時の速度測定
- [ ] 1000単語での処理時間比較
- [ ] キャッシュヒット率の確認

#### sub2 機能テスト
@target: tests/hint_overlap_skip_test.ts
- [ ] スキップオプションの動作確認
- [ ] 設定による制御のテスト
- [ ] 後方互換性の確認

### process50 フォローアップ
#### sub1 より高度な最適化（将来）
- [ ] Web Workerでの並列処理
- [ ] インクリメンタルな重複検出
- [ ] 空間インデックスの活用

### process100 リファクタリング
- [ ] 重複検出ロジックの別モジュール化
- [ ] パフォーマンス計測ユーティリティの追加

### process200 ドキュメンテーション
- [ ] パフォーマンス設定のドキュメント化
- [ ] チューニングガイドの作成
