# Requirements Document

## Introduction
hellshake-yano.vim に continuousHintMode を導入し、ヒントジャンプ直後にカーソル再センタリングとヒント再描画を自動で行うループを提供することで、視認性と操作の連続性を高める。

## Requirements

### Requirement 1: 連続ヒントモードの起動と継続
**Objective:** As a キーボード操作中心の Neovim ユーザー, I want 連続ヒントモードを円滑に開始・継続したい, so that 追加入力のたびにヒントを手動で再表示する手間を省ける。

#### Acceptance Criteria
1. WHEN ユーザーが `continuousHintMode` を有効化した状態で最初のヒント入力を確定する THEN Hellshake-Yano プラグイン SHALL 連続ヒントループを開始し追加入力を待機する。
2. WHEN 連続ヒントループが開始している AND 有効なヒント入力が届く THEN Hellshake-Yano プラグイン SHALL 対応する単語位置へジャンプ処理を実行する。
3. IF `continuousHintMode` が無効である THEN Hellshake-Yano プラグイン SHALL 従来の単発ヒント動作を維持する。
4. WHILE 連続ヒントループが進行中 THE Hellshake-Yano プラグイン SHALL 連続ジャンプ回数を内部カウンターで追跡する。

### Requirement 2: カーソル再センタリングとヒント再描画
**Objective:** As a ビジュアルフィードバックを重視するユーザー, I want ジャンプ直後に視界内へカーソルを戻しヒントを更新したい, so that 次の入力判断を素早く行える。

#### Acceptance Criteria
1. WHEN 連続ヒントループ中にジャンプが完了する THEN Hellshake-Yano プラグイン SHALL `recenterCommand` で指定された Ex コマンドを実行してカーソル位置を再センタリングする。
2. WHEN 再センタリング処理が完了する THEN Hellshake-Yano プラグイン SHALL 現在バッファに基づきヒントを再生成して表示する。
3. IF ユーザーが `recenterCommand` を既定値以外へ設定する THEN Hellshake-Yano プラグイン SHALL 指定コマンドを連続ヒントループ内の再センタリング処理として使用する。
4. WHILE 連続ヒントループが継続している THE Hellshake-Yano プラグイン SHALL 既存のヒントキャッシュを再利用して再描画の遅延を抑制する。

### Requirement 3: ループ終了とセーフティ
**Objective:** As a 制御可能な操作体験を求めるユーザー, I want 連続ヒントループを意図したタイミングで停止させたい, so that 誤操作や過剰ループを防げる。

#### Acceptance Criteria
1. WHEN 連続ヒントループ中にヒント文字以外のキー入力が発生する THEN Hellshake-Yano プラグイン SHALL ループを終了しヒント表示を非表示にしてジャンプカウンターをリセットする。
2. WHEN 連続ヒントループのジャンプ回数が `maxContinuousJumps` に達する THEN Hellshake-Yano プラグイン SHALL ループを強制終了し警告メッセージを出力する。
3. IF ジャンプ処理により別バッファまたは別ウィンドウへ移動する THEN Hellshake-Yano プラグイン SHALL 連続ヒントループを終了しカウンターをリセットする。
4. IF ユーザーが `maxContinuousJumps` を 1 以上の整数へ変更する THEN Hellshake-Yano プラグイン SHALL 次回ループ開始時から新しい上限値を適用する。

### Requirement 4: 設定検証と後方互換性
**Objective:** As a 既存環境を維持したいユーザー, I want 新設定が従来動作を壊さないことを確認したい, so that 追加機能を導入しても既存ワークフローが崩れない。

#### Acceptance Criteria
1. WHEN 設定ロード処理が実行される THEN Hellshake-Yano プラグイン SHALL `continuousHintMode` を真偽値として検証し未指定時は `false` を適用する。
2. IF `recenterCommand` が空文字列または非文字列で渡される THEN Hellshake-Yano プラグイン SHALL 設定を拒否しフォールバック値 `"normal! zz"` を適用する。
3. WHEN `maxContinuousJumps` が 1 未満の値で設定される THEN Hellshake-Yano プラグイン SHALL 警告を記録しデフォルト値 50 を維持する。
4. IF `continuousHintMode` が無効化された状態でテストスイートが実行される THEN Hellshake-Yano プラグイン SHALL 既存のヒント動作テストをすべて通過する。
