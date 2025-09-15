# hellshake-yano.vim プロジェクト概要

## プロジェクトの目的

- 日本語テキストの単語境界を正確に検出し、Vimの単語ベース移動（w, b, e,
  ge）を日本語で正しく動作させるNeovimプラグイン
- hjkl移動時にヒント表示機能を提供（motion_countに達したらヒント表示）

## 技術スタック

- **Vim/Neovim**: プラグインのホスト環境
- **Deno/TypeScript**: メインロジック（denops使用）
- **Vimスクリプト**: Vim側のインターフェース
- **テスト**: Deno Test + @denops/test

## プロジェクト構造

```
hellshake-yano.vim/
├── autoload/hellshake_yano.vim     # Vimスクリプト側メイン処理
├── denops/hellshake-yano/          # TypeScript側メインロジック
│   ├── main.ts                     # エントリーポイント
│   └── [その他のロジックファイル]
├── plugin/hellshake-yano.vim       # プラグイン初期化・設定
├── tests/                          # Denoテストファイル群
└── examples/                       # 使用例
```

## 主要機能

1. **日本語単語検出**: ひらがな・カタカナ・漢字の境界を正確に検出
2. **ヒント表示**: hjklキーの連続使用時にジャンプ先ヒントを表示
3. **バッファ別管理**: バッファごとに独立したモーションカウント
4. **カスタマイズ可能**: motion_count、timeout、ヒント表示位置等の設定

## 現在の実装要求

PLAN.mdに基づき、キーリピート検出機能を実装中：

- 連続キー入力（50ms以下の間隔）を検出してヒント表示を抑制
- 快適なスクロール体験の提供
