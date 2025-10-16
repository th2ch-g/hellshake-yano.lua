# VimScript テストフレームワーク

Pure VimScript で実装されたシンプルなテスト実行フレームワークです。

## 特徴

- **TDD Red-Green-Refactor サイクル対応**: テスト駆動開発を実践
- **カラー出力**: 成功（緑 ✓）と失敗（赤 ✗）が一目でわかる
- **自動テスト検出**: `Test_` で始まる関数を自動的に検出して実行
- **Pure VimScript**: 外部依存なし、Vim 8.0+ と Neovim 両対応

## ディレクトリ構造

```
tests-vim/hellshake_yano_vim/
├── README.md           # このファイル
├── test_runner.vim     # テスト実行フレームワーク
└── test_*.vim          # 各モジュールのテストファイル
```

## 使い方

### 1. テストランナーのセルフテスト

```vim
:source tests-vim/hellshake_yano_vim/test_runner.vim
```

テストランナー自体のセルフテストが自動実行され、動作を確認できます。

### 2. テストファイルの作成

テスト関数は `Test_` で始まる名前で定義します。

```vim
" tests-vim/hellshake_yano_vim/test_example.vim
source tests-vim/hellshake_yano_vim/test_runner.vim

function! Test_addition() abort
  call AssertEqual(2, 1 + 1, 'one plus one equals two')
endfunction

function! Test_boolean() abort
  call AssertTrue(v:true, 'true is true')
  call AssertFalse(v:false, 'false is false')
endfunction

call RunAllTests()
```

### 3. テストの実行

```vim
:source tests-vim/hellshake_yano_vim/test_example.vim
```

## API リファレンス

### Assert(condition, message)

条件が真であることを検証します。

```vim
call Assert(1 == 1, 'one equals one')
```

### AssertEqual(expected, actual, message)

2つの値が等しいことを検証します。

```vim
call AssertEqual(42, get_answer(), 'answer should be 42')
```

### AssertTrue(value, message)

値が `v:true` であることを検証します。

```vim
call AssertTrue(is_enabled(), 'feature should be enabled')
```

### AssertFalse(value, message)

値が `v:false` であることを検証します。

```vim
call AssertFalse(has_errors(), 'should not have errors')
```

### RunTest(funcname)

個別のテスト関数を実行します。

```vim
call RunTest('Test_example')
```

### RunAllTests()

`Test_` で始まる全てのテスト関数を自動検出して実行します。

```vim
call RunAllTests()
```

## テスト結果の見方

### 成功時

```
=== Running All Tests ===

  Test_example
    ✓ one equals one (expected: 1, actual: 1)
    ✓ true is true (expected: true, actual: v:true)

=== Test Results ===
Total:  2
Passed: 2 ✓
Failed: 0

All tests passed! ✓
```

### 失敗時

```
=== Running All Tests ===

  Test_example
    ✗ one equals two (expected: 2, actual: 1)

=== Test Results ===
Total:  1
Passed: 0
Failed: 1 ✗

Some tests failed.
```

## 実装詳細

### TDD サイクル

このテストランナーは TDD の Red-Green-Refactor サイクルに従って実装されました：

1. **RED**: 失敗するテストを作成（最小限の実装）
2. **GREEN**: テストを通すための実装を追加
3. **REFACTOR**: カラー出力などの機能を追加してリファクタリング

### カラー表示

- 成功: `echohl MoreMsg` (緑)
- 失敗: `echohl ErrorMsg` (赤)
- タイトル: `echohl Title` (強調)
- 警告: `echohl WarningMsg` (黄)

## トラブルシューティング

### テストが自動検出されない

`Test_` で始まる関数名を使用しているか確認してください。大文字小文字を区別します。

### カラー出力が表示されない

一部のターミナルでは色が表示されない場合があります。`:set termguicolors` または `:set t_Co=256` を試してください。

### テスト関数が見つからない

テスト実行前に必ず `source tests-vim/hellshake_yano_vim/test_runner.vim` を実行してください。

## 今後の拡張

- テストのフィルタリング機能
- テスト時間の計測
- テストカバレッジの計算
- テスト失敗時の詳細なスタックトレース
