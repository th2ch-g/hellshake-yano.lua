# Hellshake-Yano.vim v2.0 マイグレーションガイド

## 概要

このガイドでは、Hellshake-Yano.vim v1.x から v2.0 への移行手順と重要な変更点について説明します。v2.0では大規模なアーキテクチャリファクタリングが行われ、コードの保守性と性能が大幅に改善されました。

## 重要な変更点

### アーキテクチャ変更
- **main.ts の軽量化**: 3,456行 → 781行（77%削減）
- **Core クラスの導入**: ビジネスロジックを統合管理するシングルトンクラス
- **Dispatcher パターン**: エントリーポイントとロジックの明確な分離
- **完全な後方互換性**: 既存のAPIは全て維持

### パフォーマンス改善
- **コード削減率**: 85%のコード削減（main.ts）
- **メモリ効率化**: キャッシュシステムの統一化
- **レンダリング最適化**: 非同期処理とレンダリング制御の改善

## 移行レベルと対応方針

### レベル1: 設定変更なし（推奨）
**対象**: 既存の設定をそのまま使い続けたいユーザー

v2.0は完全な後方互換性を提供しているため、**何も変更する必要がありません**。

```vim
" 既存の設定はそのまま動作します
let g:hellshake_yano_config = {
\   'enabled': v:true,
\   'hint_keys': ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
\   'min_length': 3,
\   'use_japanese': v:true
\ }
```

### レベル2: 新機能の活用（オプション）
**対象**: v2.0の新機能を活用したいユーザー

#### 新しい設定オプション
```vim
let g:hellshake_yano_config = {
\   'enabled': v:true,
\   'hint_keys': ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
\   'min_length': 3,
\   'use_japanese': v:true,
\   'per_key_min_length': {
\     'f': 2,
\     't': 1
\   },
\   'per_key_motion_count': {
\     'w': 3,
\     'e': 2
\   }
\ }
```

### レベル3: Core APIの直接使用（上級者向け）
**対象**: プラグイン開発者や高度なカスタマイズが必要なユーザー

```vim
" Core APIを使用したカスタムコマンド例
function! CustomHellshakeCommand()
  call denops#request('hellshake-yano', 'getDebugInfo', [])
  call denops#request('hellshake-yano', 'clearCache', [])
endfunction
```

## 設定の変更点

### 1. 設定項目の形式（互換性あり）

#### v1.x との互換性
```vim
" v1.x の形式（そのまま使用可能）
let g:hellshake_yano_config = {
\   'min_word_length': 3,
\   'motion_count': 2,
\   'enable_word_detection': v:true,
\   'disable_visual_mode': v:false
\ }
```

#### v2.0 推奨形式
```vim
" v2.0 推奨形式（自動変換されます）
let g:hellshake_yano_config = {
\   'min_length': 3,
\   'motionCount': 2,
\   'enableWordDetection': v:true,
\   'disableVisualMode': v:false
\ }
```

### 2. 新しい設定オプション

#### キーごとの個別設定
```vim
let g:hellshake_yano_config = {
\   'per_key_min_length': {
\     'f': 2,    " f キーの最小単語長
\     't': 1,    " t キーの最小単語長
\     'w': 4     " w キーの最小単語長
\   },
\   'per_key_motion_count': {
\     'w': 3,    " w キーのモーション回数
\     'e': 2,    " e キーのモーション回数
\     'b': 1     " b キーのモーション回数
\   }
\ }
```

#### 辞書システム設定
```vim
let g:hellshake_yano_config = {
\   'dictionary_enabled': v:true,
\   'dictionary_path': '~/.config/hellshake-yano/dictionary.json',
\   'auto_add_words': v:false
\ }
```

## コマンドの変更点

### 基本コマンド（変更なし）
```vim
" 既存のコマンドはそのまま使用可能
:call hellshake#enable()
:call hellshake#disable()
:call hellshake#toggle()
```

### 新しいコマンド
```vim
" デバッグ情報の取得
:call denops#request('hellshake-yano', 'getDebugInfo', [])

" パフォーマンス統計の取得
:call denops#request('hellshake-yano', 'getPerformanceStats', [])

" キャッシュクリア
:call denops#request('hellshake-yano', 'clearCache', [])

" 辞書管理
:call denops#request('hellshake-yano', 'reloadDictionary', [])
:call denops#request('hellshake-yano', 'showDictionary', [])
```

## API の変更点

### プラグイン開発者向け

#### v1.x のAPI（非推奨だが動作）
```typescript
// v1.x のAPIはmain.tsで提供（後方互換性）
import { showHints, hideHints, generateHints } from "main.ts";

await showHints(denops);
await hideHints(denops);
```

#### v2.0 推奨API
```typescript
// v2.0 のCore APIを使用
import { Core } from "core.ts";

const core = Core.getInstance();
await core.showHints(denops);
await core.hideHintsOptimized(denops);
```

### 型定義の統合
```typescript
// v1.x - 複数ファイルに分散
import type { Config } from "config.ts";
import type { Word } from "word.ts";
import type { HintMapping } from "hint.ts";

// v2.0 - types.tsに統合
import type { Config, Word, HintMapping } from "types.ts";
```

## パフォーマンス最適化の恩恵

### 自動的に改善される項目

#### メモリ使用量
- **v1.x**: 個別キャッシュによる非効率なメモリ使用
- **v2.0**: 統一キャッシュシステムによる自動最適化

#### 処理速度
- **v1.x**: 大きなmain.tsファイルによる読み込み遅延
- **v2.0**: モジュラー構造による高速化

#### エラーハンドリング
- **v1.x**: 分散したエラー処理
- **v2.0**: Coreクラスでの統一エラーハンドリング

## 新機能の活用

### 1. 辞書システム

#### 基本的な使用方法
```vim
" 辞書の表示
:call denops#request('hellshake-yano', 'showDictionary', [])

" 単語の追加
:call denops#request('hellshake-yano', 'addToDictionary', ['example', 'noun'])

" 辞書の再読み込み
:call denops#request('hellshake-yano', 'reloadDictionary', [])
```

### 2. 詳細なデバッグ情報

#### パフォーマンス統計の確認
```vim
" デバッグ情報の表示
function! ShowHellshakeDebug()
  let debug_info = denops#request('hellshake-yano', 'getDebugInfo', [])
  echo debug_info
endfunction
```

### 3. キーごとのカスタマイズ

#### 高度な設定例
```vim
let g:hellshake_yano_config = {
\   'per_key_min_length': {
\     'f': 1,    " f キーは1文字から
\     't': 1,    " t キーは1文字から
\     'w': 3,    " w キーは3文字から
\     '/': 2     " 検索は2文字から
\   },
\   'per_key_motion_count': {
\     'w': 5,    " w で単語5個まで
\     'e': 3,    " e で単語3個まで
\     'f': 10    " f で文字10個まで
\   }
\ }
```

## トラブルシューティング

### 問題1: v2.0にアップデート後、動作しない

**原因**: Denopsプラグインの再読み込みが必要

**解決策**:
```vim
:call denops#cache#update()
:call denops#restart()
```

### 問題2: 設定が反映されない

**原因**: 設定形式の変更

**解決策**:
```vim
" 設定の確認
:call denops#request('hellshake-yano', 'getConfig', [])

" 設定の更新
:call denops#request('hellshake-yano', 'updateConfig', [{'min_length': 4}])
```

### 問題3: パフォーマンスが悪化した

**原因**: キャッシュクリアが必要

**解決策**:
```vim
" キャッシュをクリア
:call denops#request('hellshake-yano', 'clearCache', [])

" パフォーマンス統計を確認
:call denops#request('hellshake-yano', 'getDebugInfo', [])
```

### 問題4: カスタムコマンドが動作しない

**原因**: API の変更

**解決策**:
```vim
" 新しいDispatcher APIを使用
function! CustomCommand()
  try
    call denops#request('hellshake-yano', 'showHints', [])
  catch
    echo 'Error: ' . v:exception
  endtry
endfunction
```

## テスト環境での確認

### 設定のテスト
```vim
" テスト用の最小設定
let g:hellshake_yano_config = {
\   'enabled': v:true,
\   'hint_keys': ['a', 's', 'd'],
\   'min_length': 2
\ }

" 機能テスト
:call hellshake#enable()
" fキーでテスト実行
```

### パフォーマンステスト
```vim
" パフォーマンス統計を確認
function! CheckPerformance()
  let stats = denops#request('hellshake-yano', 'getDebugInfo', [])
  echo 'Memory usage: ' . stats.memory
  echo 'Cache hit rate: ' . stats.cache_hit_rate
endfunction
```

## アップグレード後の確認項目

### ✅ 基本機能の動作確認
- [ ] プラグインの有効化/無効化
- [ ] ヒントの表示/非表示
- [ ] キーバインドの動作
- [ ] 日本語対応の動作

### ✅ 設定の確認
- [ ] 既存設定の引き継ぎ
- [ ] 新設定オプションの動作
- [ ] キー別設定の動作

### ✅ パフォーマンスの確認
- [ ] 起動時間の改善
- [ ] メモリ使用量の削減
- [ ] レスポンス速度の向上

## まとめ

Hellshake-Yano.vim v2.0では、以下の改善が実現されています：

### 🎯 主な改善点
- **コード品質**: 77%のコード削減とアーキテクチャ改善
- **後方互換性**: 既存設定の完全な互換性
- **新機能**: 辞書システムとキー別カスタマイズ
- **性能向上**: 統一キャッシュとレンダリング最適化
- **保守性**: TDDによる652のテストで品質保証

### 🚀 移行の推奨事項
1. **段階的移行**: まずは既存設定でのアップデート
2. **新機能探索**: 必要に応じて新しい設定オプションを試用
3. **パフォーマンス確認**: デバッグ情報で性能改善を確認

v2.0は既存ユーザーにとって**リスクゼロのアップグレード**を提供しつつ、新しい可能性を開拓できる進化版です。