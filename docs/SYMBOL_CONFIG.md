# 記号ヒント設定ガイド

## 推奨設定方法

記号を含むヒントキーを使用する場合、以下の設定方法を推奨します。

### VimScript設定例

```vim
" ~/.config/nvim/init.vim または ~/.vimrc に追加

" 文字列として渡す（split関数を使わない）
let g:hellshake_yano = {
      \ 'singleCharKeys': 'ASDFGNM@;,.',
      \ 'multiCharKeys': 'BCEIOPQRTUVWXYZ0123456789',
      \ 'debug': 1
      \ }

" または、エスケープが必要な記号を含む場合
let g:hellshake_yano = {
      \ 'singleCharKeys': 'ASDFGNM@;,.[]-=',
      \ 'multiCharKeys': 'BCEIOPQRTUVWXYZ0123456789',
      \ }
```

### 重要な注意事項

1. **文字列として渡す**: `split()`関数を使わず、文字列のまま渡してください
2. **Deno側で自動変換**: TypeScript側で文字列から配列に自動変換されます
3. **エスケープ不要**: VimScript内では記号のエスケープは不要です

### 使用可能な記号

以下の記号を`singleCharKeys`に含めることができます：

- `;` - セミコロン
- `:` - コロン
- `,` - カンマ
- `.` - ピリオド
- `[` - 左角括弧
- `]` - 右角括弧
- `'` - シングルクォート
- `"` - ダブルクォート（VimScriptで使う場合は注意）
- `/` - スラッシュ
- `\` - バックスラッシュ（VimScriptで使う場合は注意）
- `-` - ハイフン
- `=` - イコール
- `` ` `` - バッククォート
- `@` - アットマーク

### デバッグ方法

設定が正しく読み込まれているか確認するには：

```vim
" デバッグモードを有効にする
let g:hellshake_yano.debug = 1
```

Neovim/Vimを再起動後、`:messages`コマンドで以下のようなログが表示されます：

```
[hellshake-yano] Configuration loaded:
  singleCharKeys: ["A", "S", "D", "F", "G", "N", "M", "@", ";", ",", "."]
  multiCharKeys: ["B", "C", "E", ...]
  Symbols in singleCharKeys: ["@", ";", ",", "."]
```

### トラブルシューティング

#### 記号が表示されない場合

1. デバッグモードを有効にして設定を確認
2. `:echo g:hellshake_yano`で設定値を確認
3. 文字列として渡されているか確認（配列ではなく）

#### エラーが発生する場合

VimScriptでエラーが発生する場合は、以下を試してください：

```vim
" 問題のある記号を除外
let g:hellshake_yano = {
      \ 'singleCharKeys': 'ASDFGNM',
      \ 'multiCharKeys': 'BCEIOPQRTUVWXYZ0123456789',
      \ }
```

その後、段階的に記号を追加して問題の特定を行ってください。

## 高度な設定

### 数字の複数文字ヒント

大量のヒントが必要な場合、数字の2文字ヒントを追加できます：

```vim
let g:hellshake_yano = {
      \ 'singleCharKeys': 'ASDFGNM@;,.',
      \ 'multiCharKeys': 'BCEIOPQRTUVWXYZ0123456789',
      \ 'useNumericMultiCharHints': 1
      \ }
```

これにより、`01`, `02`, ..., `99`, `00`のような数字ヒントが追加生成されます。