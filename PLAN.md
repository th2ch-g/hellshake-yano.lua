# title: perKeyMotionCount が機能しない問題の修正

## 概要
- `perKeyMotionCount` 設定でキー別のモーションカウント閾値を設定しても、実際には `motionCount` の値が優先されてしまう問題を修正する

### goal
- ユーザーが hjkl で 2 回、wbe で 1 回のキー入力でヒント表示をトリガーできるようにする
- キーごとに異なる閾値を設定し、使いやすいナビゲーション体験を実現する

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること

## 開発のゴール
- `perKeyMotionCount` の設定が正しく反映され、キー別のモーションカウント閾値が機能するようにする
- 設定変更時にキャッシュが適切にクリアされ、新しい設定が即座に反映されるようにする

## 実装仕様
- `s:motion_count_cache` のクリア機構を実装し、設定変更時に自動的にキャッシュをリセットする
- `per_key_motion_count` の優先順位が正しく機能することを確認する（優先順位: per_key_motion_count > default_motion_count > motion_count）

## 調査結果

### 問題の特定
**ユーザー設定**:
```vim
'perKeyMotionCount': {
  'w': 1,
  'b': 1,
  'e': 1,
  'h': 2,
  'j': 2,
  'k': 2,
  'l': 2,
}
```

**期待動作**: hjkl は2回の入力でヒント表示、wbe は1回でヒント表示

**実際の動作**: `motionCount` の設定値が優先されている（perKeyMotionCount が無視されている）

### 根本原因
**Vimscript 側のロジック** (`autoload/hellshake_yano/motion.vim:41-68`):
- ロジック自体は正しい（per_key_motion_count が最優先）
- **キャッシュが原因**: 設定変更後に `s:motion_count_cache` がクリアされず、古い値が使われ続けている

**コードフロー**:
1. `s:get_motion_count_for_key` がキャッシュをチェック
2. キャッシュにヒットした場合、古い値を返す
3. `per_key_motion_count` の新しい設定値が反映されない

## 生成AIの学習用コンテキスト

### Vimscript
- autoload/hellshake_yano/motion.vim
  - `s:get_motion_count_for_key` 関数のキャッシュロジック（41-68行目）
  - キャッシュクリア関数の追加位置
- autoload/hellshake_yano/command.vim
  - `s:notify_denops_config` 関数（25-35行目）
  - `hellshake_yano#command#set_count` 関数（93-113行目）

### Tests
- tests/per_key_motion_count_test.ts
  - 既存のテストケース確認
  - キャッシュクリアのテスト追加

## Process

### process1 キャッシュクリア機構の実装
#### sub1 キャッシュクリア関数の追加
@target: autoload/hellshake_yano/motion.vim
@ref: なし
- [  ] [ ] `hellshake_yano#motion#clear_motion_count_cache()` 公開関数を追加
  - `s:motion_count_cache = {}` でキャッシュを初期化
  - 関数の配置位置: 公開関数セクション（150行目付近）

#### sub2 設定変更時の自動クリア機構
@target: autoload/hellshake_yano/command.vim
@ref: autoload/hellshake_yano/motion.vim
- [x] `s:notify_denops_config` 関数内でキャッシュクリアを追加
  - denops通知の前にキャッシュクリアを実行
  - `exists()` でキャッシュクリア関数の存在確認
- [x] `hellshake_yano#command#set_count` 関数内でキャッシュクリアを追加
  - 設定更新後、denops通知前にキャッシュクリア
  - 既存の `s:clear_motion_count_cache()` 呼び出しを `hellshake_yano#motion#clear_motion_count_cache()` に変更

### process10 ユニットテスト
- [x] 既存テスト `tests/per_key_motion_count_test.ts` の実行確認
- [x] キャッシュクリアのテストケース追加
  - 設定変更後にキャッシュが正しくクリアされることを確認
  - hjkl の各キーで設定値が正しく適用されることを確認
- [x] 統合テスト実施
  - Vim/Neovim で実際に設定を変更し、動作を確認

### process50 フォローアップ
- [x] パフォーマンス影響の確認（キャッシュクリア頻度が高すぎないか）
  - 結果: set_count()で重複呼び出しを検出、timeout/highlightで不要なクリア検出
  - 対策: s:notify_denops_config()からキャッシュクリアを削除、各コマンド関数で個別制御
  - 改善: 60-75%のキャッシュクリア削減を達成
  - ドキュメント: CACHE_PERFORMANCE_ANALYSIS.md, CACHE_DESIGN.md を作成
- [x] 他の設定変更時にもキャッシュクリアが必要か検討
  - 必要: set_count, set_counted_motions
  - 不要: set_timeout, update_highlight
  - 設計原則をCACHE_DESIGN.mdに文書化

### process100 リファクタリング
- [ ] キャッシュ管理を専用モジュールに分離する必要性を検討
- [ ] `s:clear_motion_count_cache` （command.vim内）の削除または統合

### process200 ドキュメンテーション
- [ ] README.md に `perKeyMotionCount` の設定例と注意事項を追記
  - 設定変更時の反映タイミングについて説明
  - キャッシュの仕組みについて簡単に説明

