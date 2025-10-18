# title: Phase B-3: 高度な機能の統合

## 概要
- Phase B-2で完了したコア機能の移植に、VimScript版の高度な機能（モーション検出、ビジュアルモード）を統合
- 既存Denops実装のTinySegmenter（日本語単語検出）を安全に統合
- **VimScript版motion.vim、visual.vimの動作を100%再現**することが最優先
- 環境別処理（Vim/Neovim）の完全分離を徹底

### goal
- VimScript版motion.vimの連打検出機能を完全再現（reltime()のミリ秒精度をDate.now()で再現）
- VimScript版visual.vimのビジュアルモード対応を完全再現（getpos()による選択範囲取得）
- 日本語テキストでも高精度な単語検出を実現（TinySegmenterによる形態素解析）

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **ARCHITECTURE_B.md の基本ルールを厳守**:
  - VimScript実装が正規実装（改善よりも一致性優先）
  - 環境別処理の完全分離（Vim/Neovim）
  - 既存実装の副作用チェック
- **VimScript版の動作を完全に再現**:
  - motion.vim: reltime()による時間計測、タイムアウト処理、閾値管理
  - visual.vim: モードチェック、選択範囲取得、妥当性チェック

## 開発のゴール
- VimScript版motion.vimとvisual.vimの動作を1行単位で正確に移植
- 既存のDenops実装（TinySegmenter）を安全に統合（副作用なし）
- TDDサイクル（RED → GREEN → REFACTOR）の徹底
- テストケース60個以上、VimScript互換性テスト100%パス

## 実装仕様

### 実装範囲

```
denops/hellshake-yano/phase-b3/
├── unified-japanese-support.ts      # TinySegmenter統合
├── unified-motion-detector.ts       # モーション連打検出
└── unified-visual-mode.ts           # ビジュアルモード対応

tests/phase-b3/
├── unified-japanese-support.test.ts # 日本語対応テスト（15-20 steps）
├── unified-motion-detector.test.ts  # モーション検出テスト（20-25 steps）
├── unified-visual-mode.test.ts      # ビジュアルモードテスト（15-20 steps）
└── e2e-integration.test.ts          # E2E統合テスト（10-15 steps）
```

### 1. 日本語対応統合（B-3.1）

**設計方針**:
- 既存の`word-segmenter.ts`（TinySegmenter）を`UnifiedJapaneseSupport`経由で統合
- `UnifiedWordDetector`に日本語検出モードを追加
- 座標計算は1-indexed（VimScript互換）を維持
- VimScript版にはない新機能だが、既存Denops実装の動作は完全維持

**主要メソッド**:
- `segmentLine(line, lineNum, config)`: 日本語を含む行をセグメント化
- `convertSegmentsToWords(segments, line, lineNum, config)`: セグメントをWord型に変換
- `isEnabled(config)`: 日本語対応が有効かチェック

**設定フラグ**:
- `config.useJapanese`: 日本語対応の有効化
- `config.enableTinySegmenter`: TinySegmenterの有効化
- `config.japaneseMinWordLength`: 日本語最小単語長（デフォルト2）
- `config.japaneseMergeParticles`: 助詞結合（デフォルトtrue）

### 2. モーション検出統合（B-3.2）

**設計方針**:
- VimScript版`motion.vim`のアルゴリズムを完全移植
- `UnifiedMotionDetector`として実装
- **reltime()のミリ秒精度を`Date.now()`で再現**
- エラーメッセージもVimScript版と完全一致

**主要メソッド**:
- `handleMotion(key)`: モーション処理のメインロジック（VimScript版と同一アルゴリズム）
- `getThreshold(key)`: キー別の閾値を取得（perKeyMotionCount対応）
- `init()`: 状態変数の初期化
- `getState()`: 状態変数の取得（テスト用）

**動作仕様（VimScript版と同一）**:
- w/b/eキーの連打を検出
- タイムアウト: デフォルト2000ms
- 閾値: デフォルト2回
- 状態管理: lastMotion, lastMotionTime, motionCount

### 3. ビジュアルモード統合（B-3.3）

**設計方針**:
- VimScript版`visual.vim`のアルゴリズムを完全移植
- `UnifiedVisualMode`として実装
- **getpos("'<"), getpos("'>")による選択範囲取得を正確に再現**
- v/V/Ctrl-vの3つのモードをサポート

**主要メソッド**:
- `show()`: ビジュアルモードでヒント表示（VimScript版と同一フロー）
- `filterWordsInRange(words)`: 選択範囲内の単語をフィルタリング
- `init()`: 状態変数の初期化
- `getState()`: 状態変数の取得（テスト用）

**動作仕様（VimScript版と同一）**:
- mode()でビジュアルモードタイプを取得
- ビジュアルモード以外で呼ばれた場合はエラー
- 選択範囲の妥当性チェック（start_line <= end_line）
- 選択範囲を状態変数に保存

## 生成AIの学習用コンテキスト

### VimScript実装（移植元）
- `autoload/hellshake_yano_vim/motion.vim`
  - handle()関数: モーション処理のアルゴリズム
  - reltime()使用の時間計測ロジック
  - init()関数: 状態初期化
  - set_threshold()関数: 閾値設定
  - set_timeout()関数: タイムアウト設定
- `autoload/hellshake_yano_vim/visual.vim`
  - show()関数: ビジュアルモードでヒント表示
  - s:detect_words_in_range()関数: 範囲内の単語検出
  - モードチェックロジック（v/V/Ctrl-v）

### 既存Denops実装（統合元）
- `denops/hellshake-yano/word/word-segmenter.ts`
  - TinySegmenterクラス: 日本語分割の実装
  - postProcessSegments(): 助詞結合ロジック
  - hasJapanese(): 日本語判定
  - segment(): セグメント化メソッド

### Phase B-2実装（統合先）
- `denops/hellshake-yano/phase-b2/unified-word-detector.ts`
  - 単語検出の基本実装
  - detectVisible()メソッド
- `denops/hellshake-yano/phase-b2/vimscript-types.ts`
  - VimScriptWord型定義（1-indexed）
  - DenopsWord型への変換関数

### 実装計画書
- `ai/plans/active/2025-10-18-phase-b3-implementation.md`
  - 詳細な実装設計（クラス構造、メソッド仕様、完全なコード例）
  - テスト計画（60ステップ以上の詳細なテストケース）
  - 成功基準とスケジュール

## Process

### process1: 日本語対応統合（1日）

#### sub1: unified-japanese-support.ts の実装（RED → GREEN）
@target: `denops/hellshake-yano/phase-b3/unified-japanese-support.ts`
@ref: `denops/hellshake-yano/word/word-segmenter.ts`, `denops/hellshake-yano/phase-b2/vimscript-types.ts`

- [x] UnifiedJapaneseSupportクラスの作成
  - TinySegmenterのインスタンス管理（getInstance()）
  - Denopsインスタンスの保持
- [x] segmentLine()メソッドの実装
  - hasJapanese()による日本語判定
  - 日本語対応フラグチェック（useJapanese, enableTinySegmenter）
  - TinySegmenterによるセグメント化
  - セグメントのWord型変換（convertSegmentsToWords）
- [x] convertSegmentsToWords()メソッドの実装
  - 各セグメントの元行での位置検索（indexOf）
  - 最小単語長フィルタリング（japaneseMinWordLength）
  - Word型オブジェクト生成（1-indexed座標）
- [x] isEnabled()メソッドの実装
  - useJapanese && enableTinySegmenterのチェック
- [x] キャッシュ管理メソッド
  - getCacheStats(): キャッシュ統計取得
  - clearCache(): キャッシュクリア

#### sub2: unified-word-detectorへの統合
@target: `denops/hellshake-yano/phase-b2/unified-word-detector.ts`
@ref: `denops/hellshake-yano/phase-b3/unified-japanese-support.ts`

- [x] UnifiedJapaneseSupportのインスタンス追加
  - constructorでの初期化
- [x] detectVisible()メソッドの拡張
  - 日本語対応が有効な場合の分岐追加
  - japaneseSupport.segmentLine()の呼び出し
  - 日本語単語と通常単語のマージ

#### sub3: テスト作成（15-20 steps）
@target: `tests/phase-b3/unified-japanese-support.test.ts`

- [x] Process 1: 日本語検出テスト（3-5 steps）
  - ひらがな、カタカナ、漢字の検出
  - 英語のみの行の判定
  - 混在テキストの処理
- [x] Process 2: セグメント化テスト（3-5 steps）
  - 「私の名前は田中です」等のサンプル
  - セグメント数の確認
  - 各単語の座標チェック（1-indexed）
- [x] Process 3: 助詞結合テスト（2-3 steps）
  - japaneseMergeParticles=trueでの結合確認
  - 「の」「は」等の助詞を含む単語の検出
- [x] Process 4: フィルタリングテスト（2-3 steps）
  - japaneseMinWordLengthによる最小単語長チェック
  - 空白のみのセグメントのスキップ
- [x] Process 5: キャッシュテスト（2-3 steps）
  - 同じテキストでのキャッシュヒット確認
  - キャッシュ統計の確認

### process2: モーション検出統合（1日）

#### sub1: unified-motion-detector.ts の実装（RED → GREEN）
@target: `denops/hellshake-yano/phase-b3/unified-motion-detector.ts`
@ref: `autoload/hellshake_yano_vim/motion.vim`

- [x] UnifiedMotionDetectorクラスの作成
  - 状態変数: lastMotion, lastMotionTime, motionCount
  - 設定: timeoutMs, threshold
- [x] handleMotion(key)メソッドの実装（VimScript版と同一アルゴリズム）
  - 不正なモーションキーのチェック（w/b/e以外はエラー）
  - 現在時刻の取得（Date.now()でミリ秒精度）
  - 前回のモーションとの時間差チェック
  - タイムアウトチェック（timeDiffMs > timeoutMs）
  - 異なるモーションの場合もリセット
  - カウントの更新（shouldReset判定）
  - 閾値チェックとヒント表示トリガー（motionCount >= threshold）
  - エラーハンドリング（VimScript版と同一）
- [x] getThreshold(key)メソッドの実装
  - perKeyMotionCountでのキー別閾値サポート
  - デフォルト閾値の返却
- [x] init()メソッドの実装
  - 状態変数の初期化
- [x] setThreshold(count)メソッドの実装
  - 閾値の設定
- [x] setTimeout(ms)メソッドの実装
  - タイムアウトの設定
- [x] getState()メソッドの実装
  - 状態変数の取得（テスト用）

#### sub2: テスト作成（20-25 steps）
@target: `tests/phase-b3/unified-motion-detector.test.ts`

- [x] Process 1: 状態初期化テスト（2-3 steps）
  - init()による初期化確認
  - デフォルト値の確認（timeout=2000, threshold=2）
- [x] Process 2: 単一モーション処理テスト（3-4 steps）
  - 1回目のモーションでカウント=1
  - shouldTrigger=falseの確認
  - lastMotionの記録確認
- [x] Process 3: 連続モーション検出テスト（3-4 steps）
  - 2回目でshouldTrigger=trueの確認
  - カウントリセットの確認（motionCount=0）
- [x] Process 4: タイムアウト処理テスト（3-4 steps）
  - setTimeout(100)での短いタイムアウト設定
  - 待機後のカウントリセット確認
- [x] Process 5: 異なるモーション処理テスト（2-3 steps）
  - w→bでのカウントリセット確認
  - lastMotionの更新確認
- [x] Process 6: キー別閾値テスト（2-3 steps）
  - perKeyMotionCount={w: 3}での動作確認
  - 3回目でトリガー確認
- [x] Process 7: エラーハンドリングテスト（2-3 steps）
  - 不正なモーションキー（x）でのエラー確認
  - エラーメッセージのVimScript互換性確認

### process3: ビジュアルモード統合（1日）

#### sub1: unified-visual-mode.ts の実装（RED → GREEN）
@target: `denops/hellshake-yano/phase-b3/unified-visual-mode.ts`
@ref: `autoload/hellshake_yano_vim/visual.vim`

- [x] UnifiedVisualModeクラスの作成
  - 状態変数: visualState（active, mode, startLine, startCol, endLine, endCol）
- [x] show()メソッドの実装（VimScript版と同一フロー）
  - mode()でビジュアルモードタイプを取得
  - ビジュアルモードチェック（v/V/\x16）
  - getpos("'<"), getpos("'>")で選択範囲を取得
  - 選択範囲の妥当性チェック（startLine <= endLine, lineNum != 0）
  - 状態変数に選択範囲を保存
  - エラー時の警告メッセージ表示
- [x] filterWordsInRange(words)メソッドの実装
  - ビジュアルモードでない場合は全単語を返す
  - 範囲内の単語のみをフィルタリング（lnum >= startLine && lnum <= endLine）
- [x] init()メソッドの実装
  - 状態変数の初期化
- [x] getState()メソッドの実装
  - 状態変数の取得（テスト用）
- [x] clearAfterJump()メソッドの実装
  - ジャンプ後の状態クリア
- [x] showWarning(message)メソッドの実装
  - 警告メッセージ表示（VimScript版と同一フォーマット）

#### sub2: テスト作成（15-20 steps）
@target: `tests/phase-b3/unified-visual-mode.test.ts`

- [x] Process 1: 状態初期化テスト（2 steps）
  - init()による初期化確認
  - デフォルト値の確認（active=false, mode=""）
- [x] Process 2: モードチェックテスト（4-5 steps）
  - ノーマルモード（n）での拒否確認
  - ビジュアルモード（v）での受け入れ確認
  - ビジュアルラインモード（V）での受け入れ確認
  - ビジュアルブロックモード（Ctrl-v）での受け入れ確認
- [x] Process 3: 選択範囲取得テスト（2-3 steps）
  - getpos()による範囲取得の確認
  - 状態変数への保存確認
- [x] Process 4: 妥当性チェックテスト（2-3 steps）
  - 不正な範囲（start > end）での拒否確認
  - 行番号0での拒否確認
- [x] Process 5: 範囲内フィルタリングテスト（2-3 steps）
  - 3-5行目の選択範囲でのフィルタリング確認
  - 範囲外の単語が除外されることの確認
- [x] Process 6: 状態クリアテスト（2 steps）
  - clearAfterJump()でのactive=false確認

### process4: E2E統合テスト（0.5日）
@target: `tests/phase-b3/e2e-integration.test.ts`

- [x] Scenario 1: 日本語単語検出 + ヒント表示（3-4 steps）
  - バッファに日本語テキストを設定
  - UnifiedWordDetectorによる単語検出
  - 日本語単語が正しく検出されることの確認
- [x] Scenario 2: モーション連打 + ヒント表示（3-4 steps）
  - UnifiedMotionDetectorによるモーション処理
  - 閾値到達でのトリガー確認
  - カウントリセット確認
- [x] Scenario 3: ビジュアルモード + 範囲内フィルタリング（3-4 steps）
  - ビジュアルモードで2-3行目を選択
  - UnifiedVisualModeによる範囲内フィルタリング
  - 範囲内の単語のみが残ることの確認
- [x] Scenario 4: 日本語 + モーション連打 + ビジュアルモード（2-3 steps）
  - 全機能を組み合わせた統合テスト
  - 日本語単語の検出と範囲内フィルタリングの確認

### process10: ユニットテスト
各processで実装したテストの総合確認

- [x] 全テストケース数: 60個以上達成（目標60個）
  - 日本語対応: 15-20 steps
  - モーション検出: 20-25 steps
  - ビジュアルモード: 15-20 steps
  - E2E統合: 10-15 steps
- [x] テストカバレッジ: 90%以上
- [x] VimScript互換テスト: 100%パス
  - motion.vimとの動作一致
  - visual.vimとの動作一致
- [x] 型チェック: deno check 100%パス
- [x] リンター: deno lint パス
- [x] フォーマット: deno fmt 準拠

### process50: フォローアップ
実装後の仕様変更・追加要件

- [ ] TinySegmenter統合の最適化
  - キャッシュヒット率の向上
  - セグメント化のパフォーマンスチューニング
- [ ] モーション検出の詳細設定
  - perKeyMotionCountの拡張
  - タイムアウトの動的調整
- [ ] ビジュアルモードの拡張
  - 列範囲でのフィルタリング（Phase A-5では未実装）

### process100: リファクタリング
コード品質向上

- [x] 共通処理の抽出
  - [x] エラーメッセージ表示の統一
  - [x] 状態管理ロジックの共通化
- [x] 型定義の最適化
  - [x] VisualState型の明示的定義
  - [x] MotionState型の定義
- [x] エラーハンドリングの統一
  - [x] try-catch-finallyパターンの統一
- [x] コメント・ドキュメントの充実
  - [x] 各メソッドの詳細な説明
  - [x] VimScript版との対応関係の明記

### process200: ドキュメンテーション

- [x] ARCHITECTURE_B.md の更新
  - [x] Phase B-3完了レポートの追加
  - [x] 実装進捗状況テーブルの更新（B-3を✅に変更）
  - [x] 成功基準の達成状況記録
- [ ] README.md の更新
  - 日本語対応の説明追加
  - モーション検出機能の説明
  - ビジュアルモード対応の説明
- [x] テストドキュメントの作成
  - [x] テストケース一覧
  - [x] VimScript互換性検証結果
  - [x] カバレッジレポート

---

## 成功基準

### 定量指標
- テストケース: **60個以上達成**
- テストカバレッジ: **90%以上**
- VimScript互換テスト: **100%パス**
  - motion.vimとの動作一致100%
  - visual.vimとの動作一致100%
- 型チェック: **deno check 100%パス**
- パフォーマンス:
  - TinySegmenterキャッシュヒット率 > 80%
  - モーション検出レイテンシ < 10ms
  - ビジュアルモードフィルタリング < 50ms

### 定性指標
- VimScript版との**アルゴリズム完全一致**
  - motion.vim: reltime()のミリ秒精度再現
  - visual.vim: getpos()による選択範囲取得の正確な再現
- 環境別処理の**完全分離**
  - Vim/Neovim処理を独立したメソッドに分離
- **既存動作への影響なし**（後方互換性100%）
  - VimScript版ユーザーへの影響なし
  - 既存Denops実装の副作用なし

## スケジュール

| Process | 内容 | 所要時間 | 累計 | 状態 |
|---------|------|---------|------|------|
| process1 | 日本語対応統合 | 1.0日 | 1.0日 | 🔄 |
| process2 | モーション検出統合 | 1.0日 | 2.0日 | 🔄 |
| process3 | ビジュアルモード統合 | 1.0日 | 3.0日 | 🔄 |
| process4 | E2E統合テスト | 0.5日 | 3.5日 | 🔄 |

**合計**: 3.5日（詳細計画: `ai/plans/active/2025-10-18-phase-b3-implementation.md`）

## 次フェーズへの引き継ぎ

Phase B-3完了後、Phase B-4（統合エントリーポイント）で以下を実装：
- 統一プラグインファイルの作成（`plugin/hellshake-yano-unified.vim`）
- Denops/VimScript版の自動切り替え
- 設定マイグレーション（`g:hellshake_yano_vim_config` → `g:hellshake_yano`）
- コマンド定義（`:HellshakeYanoShow`, `:HellshakeYanoHide`, `:HellshakeYanoToggle`）
- キーマッピング設定（モーション検出、ビジュアルモード）
