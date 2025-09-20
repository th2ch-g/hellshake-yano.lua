# process1: キー別motion_count設定機能の実装

## 概要
PLAN.mdのprocess1に従い、キー別にmotion_count（ヒント表示タイミング）を設定可能にする機能をTDDアプローチで実装しました。

## 実装内容

### 1. TDD Red-Green-Refactor サイクルで実装

#### RED フェーズ
- `tests/per_key_motion_count_test.ts` で包括的なテストケースを作成
- 基本機能、フォールバック動作、エッジケース、優先順位テストを包含
- 実行結果：8つのテストすべてが期待通り失敗（ReferenceError: getMotionCountForKey is not defined）

#### GREEN フェーズ
1. **Config interface拡張** (`denops/hellshake-yano/main.ts`)
   ```typescript
   // キー別motion_count設定（process1追加）
   per_key_motion_count?: Record<string, number>; // キー別のmotion_count設定
   default_motion_count?: number; // per_key_motion_countに存在しないキーのデフォルト値
   ```

2. **getMotionCountForKey helper関数実装**
   ```typescript
   export function getMotionCountForKey(key: string, config: Config): number {
     // キー別設定が存在し、そのキーの設定があれば使用
     if (config.per_key_motion_count && config.per_key_motion_count[key] !== undefined) {
       const value = config.per_key_motion_count[key];
       // 負の値は無効とみなし、デフォルトにフォールバック
       if (value >= 0) {
         return value;
       }
     }

     // default_motion_count が設定されていれば使用
     if (config.default_motion_count !== undefined) {
       return config.default_motion_count;
     }

     // 後方互換性：既存のmotion_countを使用
     return config.motion_count;
   }
   ```

3. **VimScript設定ファイル拡張** (`plugin/hellshake-yano.vim`)
   - デフォルト設定の追加：
     ```vim
     let g:hellshake_yano.per_key_motion_count = {
           \ 'v': 1, 'V': 1, 'w': 1, 'b': 1,  " 精密操作は即座に
           \ 'h': 3, 'j': 3, 'k': 3, 'l': 3,  " 頻繁なキーは3回で表示
           \ }
     let g:hellshake_yano.default_motion_count = 3
     ```
   - 設定値検証ロジックの追加

4. **getDefaultConfig関数の更新**
   - TypeScript側のデフォルト設定にdefault_motion_count: 3を追加

#### 実行結果
```
ok | 8 passed | 0 failed (19ms)
```

### 2. 設定仕様

#### 優先順位
1. `per_key_motion_count[key]` - キー固有の設定
2. `default_motion_count` - デフォルト値
3. `motion_count` - 既存設定（後方互換性）

#### デフォルト設定例
```vim
let g:hellshake_yano = {
  \ 'per_key_motion_count': {
  \   'v': 1,   " ビジュアルモード - 即座に表示
  \   'V': 1,   " ビジュアル行モード - 即座に表示
  \   'w': 1,   " 単語移動 - 即座に表示
  \   'b': 1,   " 単語後退 - 即座に表示
  \   'h': 3,   " 左移動 - 3回で表示
  \   'j': 3,   " 下移動 - 3回で表示
  \   'k': 3,   " 上移動 - 3回で表示
  \   'l': 3,   " 右移動 - 3回で表示
  \ },
  \ 'default_motion_count': 3,
  \ }
```

### 3. テスト仕様

#### 実装したテストケース
1. **基本機能テスト** - キー別設定の正常動作
2. **フォールバックテスト** - default_motion_countへのフォールバック
3. **後方互換性テスト** - motion_countへのフォールバック
4. **エッジケーステスト** - 0値、負値の処理
5. **空文字キーテスト** - 特殊キーの処理
6. **優先順位テスト** - 設定値の優先順位確認

### 4. 検証結果

#### 新機能テスト
- `tests/per_key_motion_count_test.ts`: ✅ 8/8 passed
- `tests/config_test.ts`: ✅ 29/29 passed

#### 後方互換性
- 既存の`motion_count`設定は完全に維持
- 新設定が未定義の場合は従来通りの動作

## 今後の作業

### process1の残りタスク
1. 実際のmotion処理ロジックとの統合（autoload/hellshake_yano.vim内のs:should_trigger_hints関数の更新）
2. デバッグログの追加（設定された値の確認用）
3. ユーザー向けドキュメントの更新

### 実装上の考慮事項
- キー文字列は大文字小文字を区別
- 負の値は無効とみなしてフォールバック
- 0は即座表示として有効な値
- per_key_motion_countが未定義の場合は全キーでdefault_motion_countを使用

## 設計判断

### なぜキー別設定を選択したか
- ユーザーのワークフローに合わせた柔軟な設定が可能
- 精密操作（v, w, b）と高速ナビゲーション（h, j, k, l）で異なるUXを提供
- 既存設定との完全な互換性を維持

### 実装アプローチの選択理由
1. **TDDアプローチ** - 仕様の明確化と品質保証
2. **Config interface拡張** - 型安全性の確保
3. **ヘルパー関数の追加** - ロジックの分離と再利用性
4. **段階的フォールバック** - 設定の柔軟性と後方互換性

## まとめ
process1（キー別motion_count設定機能）の基本実装が完了。TDDアプローチにより、堅牢で後方互換性のある機能を実現。次のステップでは実際のmotion処理ロジックとの統合を行う予定。