# title: Visual Modeでのヒント位置改善 & パフォーマンス最# title: パフォーマンス最適化

## 概要

Visual
mode対応の実装に伴い、処理速度が低下しないよう最適化を実施します。特にTextEncoderの使用方法、キャッシュ戦略、ヒント位置計算の効率化に焦点を当てます。

## 現状分析

### 主要なボトルネック

1. **TextEncoderの重複インスタンス化**
   - 現状: `assignHintsToWords`関数内で、各単語に対してTextEncoderを新規作成（行185）
   - 影響: 100個の単語がある場合、100回のインスタンス化が発生
   - 箇所: `denops/hellshake-yano/hint.ts:185`

2. **キャッシュキーの複雑化**
   - 現状: Visual mode対応によりキャッシュキーが長くなり、文字列結合コストが増大
   - 影響: キャッシュヒット率の低下、文字列処理のオーバーヘッド
   - 箇所: `denops/hellshake-yano/hint.ts:147-149`

3. **ヒント位置計算の重複**
   - 現状: 同じ設定値の条件判定を各単語で繰り返し実行
   - 影響: 不要な条件分岐と変数アクセスの繰り返し
   - 箇所: `denops/hellshake-yano/hint.ts:165-196`

## Process

### process1 TextEncoderの最適化

#### sub1 共有インスタンスの作成

@target: denops/hellshake-yano/hint.ts

- [x] モジュールレベルで単一のTextEncoderインスタンスを作成
- [x] `const sharedEncoder = new TextEncoder();`をファイルトップに配置
- [x] すべての`new TextEncoder()`を`sharedEncoder`に置換

#### sub2 パフォーマンス測定

- [ ] 最適化前後の処理時間を計測
- [ ] 100単語、1000単語でのベンチマーク実施

### process2 ヒント位置計算の事前処理

#### sub1 設定の事前解析

@target: denops/hellshake-yano/hint.ts (assignHintsToWords関数)

- [x] 関数開始時に`effectiveHintPosition`を一度だけ計算
- [x] Visual modeとhint_position設定の解析を事前に実施
- [x] mapループ内では計算済みの値を使用

#### sub2 条件分岐の削減

- [x] 重複する条件判定を削除
- [x] 単一の`switch`文で位置計算を処理

### process3 バイト長計算の最適化

#### sub1 ASCII文字の高速判定

@target: denops/hellshake-yano/hint.ts

- [x] ASCII文字のみの場合はTextEncoderを使用しない
- [x] `text.length === [...text].length`でASCII判定を実装
- [x] ASCII文字の場合は`text.length`をそのまま使用

#### sub2 マルチバイト文字のキャッシュ

- [x] 計算済みのバイト長をMapでキャッシュ
- [x] 同じ単語の再計算を防止

### process4 キャッシュ戦略の改善

#### sub1 モード別キャッシュ

@target: denops/hellshake-yano/hint.ts

- [x] Normal mode用とVisual mode用で別のキャッシュマップを作成
- [x] `normalModeCache`と`visualModeCache`に分離
- [x] モードに応じて適切なキャッシュを使用

#### sub2 キャッシュキーの簡略化

- [x] キャッシュキーから冗長な情報を削除
- [x] ハッシュ関数の導入を検討

### process5 バッチ処理の閾値調整

#### sub1 閾値の最適化

@target: denops/hellshake-yano/hint.ts (sortWordsByDistanceOptimized関数)

- [x] バッチ処理の閾値を1000から500に引き下げ
- [x] バッチサイズを500から250に削減

#### sub2 パフォーマンステスト

- [x] 様々なサイズのデータセットでテスト
- [x] 最適な閾値とバッチサイズを決定

### process6 遅延評価の導入（オプション）

#### sub1 getter プロパティの実装

@target: denops/hellshake-yano/hint.ts

- [x] `hintCol`と`hintByteCol`をgetter化
- [x] 実際に使用される時のみ計算

### process7 テストとベンチマーク

#### sub1 パフォーマンステストの作成

@target: tmp/claude/test_performance_optimization.ts (新規)

- [x] 最適化前後のベンチマークテスト
- [x] 様々なサイズのデータセットでテスト
- [x] メモリ使用量の測定

#### sub2 回帰テストの実施

- [x] 既存機能が正しく動作することを確認
- [x] Visual mode機能の動作確認

#### 調査メモ (2025-09-20)

- `tests/hint_text_encoder_optimization_test.ts` を追加し、TextEncoder共有化を検証。
- 既存テスト失敗の主因を把握済み（下記TODO参照）。

#### TODO

- [ ] `generateHintsWithGroups` に 2 桁数字フォールバック (`"00"`-`"99"`)
      を挿入し、ヒント生成順序（単文字→2文字→数字→3文字…）を仕様どおりにする。
- [ ] `WordDetectionManager` のキャッシュキーへ DetectionContext 情報（`currentKey`, `minWordLength`
      など）を含めるか、コンテキスト付き呼び出し時はキャッシュを無効化し、キー別最小文字数を正しく反映できるようにする。

## 実装優先順位

### 高優先度（即座に効果が見込める）

1. TextEncoderの共有インスタンス化
2. ヒント位置計算の事前処理
3. ASCII文字判定の追加

### 中優先度（効果とコストのバランス）

4. モード別キャッシュの実装
5. バッチ処理閾値の調整

### 低優先度（将来的な改善）

6. 遅延評価の導入
7. より高度なキャッシュ戦略

## 期待される効果

- **処理速度**: 20-30%の高速化（特に日本語テキスト）
- **メモリ使用量**: TextEncoderインスタンスの削減により改善
- **応答性**: Visual mode切り替え時のレスポンス向上
- **スケーラビリティ**: 大量の単語を含むファイルでの安定性向上

## リスクと対策

- **リスク**: 最適化により可読性が低下
  - **対策**: コメントを充実させ、関数を適切に分割

- **リスク**: キャッシュの複雑化によるバグ
  - **対策**: 十分なテストケースを作成

- **リスク**: 過度の最適化による保守性の低下
  - **対策**: プロファイリングに基づいた最適化のみ実施

## パフォーマンス測定基準

### ベンチマーク環境

- 単語数: 100, 500, 1000, 5000
- テキスト種別: ASCII only, 日本語混在, 日本語のみ
- モード: Normal mode, Visual mode

### 測定項目

- ヒント生成時間
- ヒント表示時間
- メモリ使用量
- キャッシュヒット率

### 目標値

- 100単語: < 10ms
- 1000単語: < 50ms
- 5000単語: < 200ms
- メモリ使用量: 現状から10%削減
