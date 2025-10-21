# hellshake-yano.vim

A Neovim/Vim plugin for seamless word-based cursor movement

## Overview

hellshake-yano.vim is a Neovim/Vim plugin that enables seamless cursor movement between words.

It fully supports UTF-8 encoding and properly handles Japanese characters, making word-based navigation in Japanese text as smooth as in English.

### Two Implementations

This plugin offers two implementations to suit different environments:

1. **Pure VimScript MVP** (Vim 8.0+): Lightweight implementation using only VimScript
2. **Denops版** (Neovim + Denops): Full-featured implementation with TypeScript

### Demo

**Cursor move**

![move-hint](https://github.com/nekowasabi/gif/blob/master/hellshake-yano/move-hint.gif?raw=true)

**Visual select**

![visual-hint](https://github.com/nekowasabi/gif/blob/master/hellshake-yano/visual-hint.gif?raw=true)



## Features

- **Seamless Cursor Movement**: Navigate between words with standard vim motions (h, j, k, l, w, b, e)
- **Mixed Text Support**: Works with Japanese/English mixed text
- **Customizable Precision**: Adjustable word detection algorithms for different use cases
- **Visual Mode Optimization**: Intelligent hint placement for natural word selection in visual mode
- **Dictionary System**: Built-in and user-defined dictionaries for improved Japanese word segmentation
- **Continuous Hint Loop**: Optional mode that recenters the cursor and redraws hints automatically after each jump

## Installation

### Using vim-plug

```vim
Plug 'nekowasabi/hellshake-yano.vim'
```

### Using lazy.nvim

```lua
{
  'nekowasabi/hellshake-yano.vim',
  config = function()
    -- Configuration here
  end
}
```

---

## Pure VimScript MVP (Vim 8.0+)

### Features (Pure VimScript Implementation)

**Phase A-1 (MVP) ✅**:
- **Simple hint display**: Show hints (a, s, d) at three fixed positions around the cursor
- **Keyboard-driven jump**: Jump to hint positions by pressing hint keys
- **Vim 8.0+ compatible**: Works with both Vim and Neovim using popup/extmark
- **TDD approach**: Thoroughly tested with VimScript unit tests

**Phase A-2 (Word Detection) ✅**:
- **Automatic word detection**: Detect words within visible area using `\w+` pattern
- **Smart hint placement**: Hints are placed at actual word positions (not fixed coordinates)
- **Up to 7 words**: Display hints for maximum 7 words (MVP limitation)
- **Performance optimized**: Fast detection even in large buffers (only scans visible area)

**Phase A-3 (Multi-Character Hints) ✅**:
- **Multi-character hints**: Generate hints like AA, AS, AD, AF... for up to 49 words
- **Partial match highlighting**: Visual feedback during multi-character input
- **Blocking input method**: Reliable input capture before Vim's normal key bindings

**Phase A-4 (Motion Repeat Detection) ✅**:
- **Automatic hint trigger**: Press w/b/e twice quickly to show hints automatically
- **Configurable threshold**: Default 2 presses, customizable (e.g., 3 presses)
- **Timeout feature**: Reset counter after 2 seconds (configurable)
- **Different motion reset**: Counter resets when switching between w/b/e
- **Customizable keys**: Choose which motion keys to track

**Phase D (Vim機能の完成) ✅** (2025-10-21):
- **カスタムヒントキー設定**: `singleCharKeys`, `multiCharKeys`で柔軟なヒント文字設定
- **2桁数字ヒント**: `useNumericMultiCharHints`で01-99, 00の最大100個の数字ヒント
- **動的maxTotal計算**: 設定に応じて最大337個のヒント対応
- **カスタムハイライト**: 色指定（fg/bg）またはハイライトグループ名で設定可能
- **Per-Keyモーションカウント**: `perKeyMotionCount`でキー別にモーション検出回数を設定
- **h/j/k/lサポート**: w/b/eに加えてh/j/k/lでもヒント表示
- **Visual Modeモーション検出**: Visual mode中のw/b/e/h/j/k/lでヒント表示
- **Per-Key最小単語長**: `perKeyMinLength`でキー別に最小単語長を設定、ノイズ削減
- **TinySegmenter連携**: Denops経由で日本語形態素解析（LRUキャッシュ、最大1000エントリ）
- **日本語単語検出**: 英数字と日本語の混在テキスト対応、折り返し表示対応
- **辞書システム**: Denops連携による辞書管理（reload, add, show, validate）
- **辞書単語の優先表示**: 辞書に含まれる単語は最小長チェックをスキップ
- **E684エラー修正**: 大量の単語（300個以上）検出時の安全性チェック追加
- **キーリピート抑制**: Vim環境でのhjkl連打でもスムーズなスクロール
- **ユニットテスト整備**: 43のVimScriptテスト、590のTypeScriptテスト成功

### Requirements

- Vim 8.0+ or Neovim
- No external dependencies required

### Commands

| Command | Description |
|---------|-------------|
| `:HellshakeYanoVimShow` | Display hints at word positions (Phase A-2) or fixed positions (Phase A-1) |
| `:HellshakeYanoVimHide` | Hide all displayed hints |
| `:HellshakeYanoVimTest` | Run unit tests |

### Usage Example

**Phase A-1 (Fixed Positions)**:
1. Open any file with Vim
2. Move cursor to line 10 (for example)
3. Execute `:HellshakeYanoVimShow`
4. Hints ('a', 's', 'd') appear at lines 7, 10, and 13
5. Press 'a' to jump to line 7
6. Hints automatically disappear after jump

**Phase A-2 (Word Detection)** ✅:
1. Open any file with code or text (e.g., JavaScript, Python, etc.)
2. Position cursor in the middle of the visible area
3. Execute `:HellshakeYanoVimShow`
4. Hints ('a', 's', 'd', 'f', 'j', 'k', 'l') appear at actual word positions
   - Example: `function calculateTotal(price, tax) {`
   - Hints appear at: `f`unction, `c`alculateTotal, `p`rice, `t`ax, etc.
5. Press hint key (e.g., 'f') to jump to that word
6. Cursor jumps to the exact word position (beginning of the word)
7. Hints automatically disappear after jump

**Phase A-3 (Multi-Character Hints)** ✅:
1. Open a file with many words
2. Execute `:HellshakeYanoVimShow`
3. Hints appear: Single-char (A-L) for first 7, then multi-char (AA, AS, AD...)
4. Type hint characters (e.g., 'AS') to jump
5. Partial matches are highlighted as you type
6. Jump happens on complete match

**Phase A-4 (Motion Repeat Detection)** ✅:
1. Open any file with code or text
2. Press `w` key twice quickly (within 2 seconds)
3. Hints automatically appear at word positions
4. Type hint character to jump (e.g., 'A')
5. Cursor jumps to the target word
6. Hints disappear after jump

**Motion Repeat Examples**:
- `w` + `w` (quick) → Hints appear automatically
- `b` + `b` (quick) → Hints appear for backward motion
- `e` + `e` (quick) → Hints appear for word-end motion
- `w` + (wait 3 seconds) + `w` → No hints (timeout)
- `w` + `b` → No hints (different motion)

**Current Behavior**:
- Detects English words using `\w+` pattern (alphanumeric + underscore)
- Maximum 49 hints displayed (7 single-char + 42 multi-char)
- Only scans visible area (fast performance)
- Motion repeat detection enabled by default

### Architecture

```
plugin/hellshake-yano-vim.vim    # Entry point
autoload/hellshake_yano_vim/
├── core.vim                      # State management & integration
├── word_detector.vim             # Word detection (Phase A-2) ✅
├── hint_generator.vim            # Hint generation
├── display.vim                   # Popup/Extmark display
├── input.vim                     # Input processing
└── jump.vim                      # Jump execution
```

### Testing

```vim
" Run all tests
:HellshakeYanoVimTest

" Or run tests directly
:source tests-vim/hellshake_yano_vim/test_runner.vim
:call RunAllTests()
```

### Configuration (Pure VimScript MVP)

**Basic Configuration**:
```vim
" .vimrc
let g:hellshake_yano_vim_config = {
      \ 'enabled': v:true,
      \ 'hint_chars': 'ASDFJKL',
      \ 'motion_enabled': v:true,
      \ 'motion_threshold': 2,
      \ 'motion_timeout_ms': 2000,
      \ 'motion_keys': ['w', 'b', 'e']
      \ }
```

**Configuration Options**:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | Boolean | `v:true` | Enable/disable the plugin |
| `hint_chars` | String | `'ASDFJKL'` | Characters used for hints (legacy) |
| `singleCharKeys` | List | `['A','S','D','F','G','H','J','K','L']` | Single-character hint keys (Phase D) |
| `multiCharKeys` | List | `['B','C','E','I','O','P','Q','R','T']` | Multi-character hint keys (Phase D) |
| `useNumericMultiCharHints` | Boolean | `v:false` | Enable 2-digit numeric hints (01-99, 00) (Phase D) |
| `highlightHintMarker` | String/Dict | `'DiffAdd'` | Hint marker highlight (Phase D) |
| `highlightHintMarkerCurrent` | String/Dict | `'DiffText'` | Current hint marker highlight (Phase D) |
| `motion_enabled` | Boolean | `v:true` | Enable motion repeat detection |
| `motion_threshold` | Number | `2` | Number of repeats to trigger hints |
| `motion_timeout_ms` | Number | `2000` | Timeout in milliseconds (2 seconds) |
| `motion_keys` | List | `['w', 'b', 'e']` | Motion keys to track |
| `perKeyMotionCount` | Dict | `{}` | Per-key motion count settings (Phase D) |
| `perKeyMinLength` | Dict | `{}` | Per-key minimum word length (Phase D) |
| `defaultMinWordLength` | Number | `3` | Default minimum word length (Phase D) |
| `suppressOnKeyRepeat` | Boolean | `v:true` | Suppress hints during fast key repeat (Phase D) |
| `keyRepeatThreshold` | Number | `50` | Key repeat detection threshold (ms) (Phase D) |
| `keyRepeatResetDelay` | Number | `300` | Reset delay after key repeat (ms) (Phase D) |

**Configuration Examples**:

```vim
" Example 1: Trigger after 3 presses
let g:hellshake_yano_vim_config = {'motion_threshold': 3}

" Example 2: Shorter timeout (1.5 seconds)
let g:hellshake_yano_vim_config = {'motion_timeout_ms': 1500}

" Example 3: Track only 'w' key
let g:hellshake_yano_vim_config = {'motion_keys': ['w']}

" Example 4: Disable default mappings and use custom
let g:hellshake_yano_vim_config = {'motion_enabled': v:false}
nmap <Leader>w <Plug>(hellshake-yano-vim-w)
nmap <Leader>b <Plug>(hellshake-yano-vim-b)
nmap <Leader>e <Plug>(hellshake-yano-vim-e)

" Example 5: Phase D - Full advanced configuration
let g:hellshake_yano = {
      \ 'useNumericMultiCharHints': v:true,
      \ 'singleCharKeys': ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      \ 'multiCharKeys': ['B', 'C', 'E', 'I', 'O', 'P', 'Q', 'R', 'T'],
      \ 'highlightHintMarker': {'fg': '#00ff00', 'bg': '#1a1a1a'},
      \ 'highlightHintMarkerCurrent': {'fg': '#ffffff', 'bg': '#ff0000'},
      \ 'perKeyMotionCount': {
      \   'w': 1, 'b': 1, 'e': 1,
      \   'h': 2, 'j': 2, 'k': 2, 'l': 2,
      \ },
      \ 'perKeyMinLength': {
      \   'w': 3, 'b': 3, 'e': 3,
      \   'h': 2, 'j': 2, 'k': 2, 'l': 2,
      \ },
      \ 'suppressOnKeyRepeat': v:true,
      \ 'keyRepeatThreshold': 50,
      \ 'keyRepeatResetDelay': 300,
      \ 'useJapanese': v:true,
      \ 'japaneseMinWordLength': 3,
      \ }

" Example 6: Phase D - Dictionary system (Denops required)
let g:hellshake_yano = {
      \ 'dictionaryPath': '~/.config/hellshake-yano/dictionary.json',
      \ 'useBuiltinDict': v:true,
      \ 'dictionaryMerge': 'merge'
      \ }

" Dictionary commands (Phase D)
:HYVimDictReload               " Reload dictionary
:HYVimDictAdd API 接続 noun    " Add word to dictionary
:HYVimDictShow                 " Show dictionary contents
:HYVimDictValidate             " Validate dictionary format
```

### Current Limitations

- ✅ ~~Fixed positions only~~ → **Word detection within visible area** (Phase A-2 完了)
- ✅ ~~Single-character hints only~~ → **Multi-character hints** (Phase A-3 完了)
- ✅ ~~No motion detection~~ → **Motion repeat detection** (Phase A-4 完了)
- English words only (`\w+` pattern) - Japanese support planned for Phase A-5

### Roadmap

- **Phase A-1**: MVP (Fixed positions) ✅ **完了** (2025-10)
- **Phase A-2**: Word detection within visible area ✅ **完了** (2025-10)
- **Phase A-3**: Multi-character hints (AA, AS, AD, ...) ✅ **完了** (2025-10)
- **Phase A-4**: Motion-triggered hints (w/b/e key repeat detection) ✅ **完了** (2025-10)
- **Phase A-5**: Japanese support, visual mode ✅ **完了** (2025-10)
- **Phase B**: Denops implementation (TypeScript, performance optimization) ✅ **完了** (2024-2025)
- **Phase C**: Integration (unified API, auto-selection) ✅ **完了** (2025-10)
- **Phase D**: Vim機能の完成 (Pure VimScript版の高度化) ✅ **完了** (2025-10-21)
  - Process1: カスタムヒントキー、2桁数字ヒント、カスタムハイライト ✅
  - Process2: Per-Key設定（モーションカウント、最小単語長、h/j/k/lサポート、Visual mode） ✅
  - Process3: TinySegmenter連携（日本語形態素解析） ✅
  - Process4: 辞書システム（Denops連携） ✅
  - Process10: ユニットテスト整備（43テスト成功） ✅
  - Process50: キーリピート抑制機能のVim移植 ✅

---

## Denops版 (Full-Featured Implementation)

### Requirements

- Neovim or Vim 8.2+
- Deno runtime
- [vim-denops/denops.vim](https://github.com/vim-denops/denops.vim)

**Installation of denops.vim:**

Using vim-plug:
```vim
Plug 'vim-denops/denops.vim'
Plug 'nekowasabi/hellshake-yano.vim'
```

Using lazy.nvim:
```lua
{
  'vim-denops/denops.vim',
  lazy = false,
},
{
  'nekowasabi/hellshake-yano.vim',
  dependencies = { 'vim-denops/denops.vim' },
  config = function()
    -- Configuration here
  end
}
```

## Configuration

The plugin can be configured using the `g:hellshake_yano` dictionary variable. All available options:

### Configuration Options

| Option                          | Type        | Default         | Description                                                    |
| ------------------------------- | ----------- | --------------- | -------------------------------------------------------------- |
| `markers`                       | array       | A-Z split       | Characters used as hint markers                                |
| `motionCount`                   | number      | 3               | Number of motions before hints appear (legacy)                 |
| `defaultMotionCount`            | number      | undefined       | Default motion count for unspecified keys                      |
| `perKeyMotionCount`             | dict        | {}              | Per-key motion count settings                                  |
| `motionTimeout`                 | number      | 2000            | Motion count timeout (milliseconds)                            |
| `hintPosition`                  | string      | 'start'         | Position to display hints ('start', 'end', or 'both')          |
| `triggerOnHjkl`                 | boolean     | v:true          | Enable triggering on hjkl movement                             |
| `countedMotions`                | array       | []              | Custom motion keys to track (overrides triggerOnHjkl)          |
| `enabled`                       | boolean     | v:true          | Enable/disable plugin                                          |
| `singleCharKeys`                | array       | ASDFGHJKLNM0-9  | Keys used for single-character hints (supports symbols)        |
| `multiCharKeys`                 | array       | BCEIOPQRTUVWXYZ | Keys used for multi-character hints                            |
| `useHintGroups`                 | boolean     | v:true          | Enable hint group functionality                                |
| `useNumbers`                    | boolean     | v:true          | Allow number keys in hints                                     |
| `useNumericMultiCharHints`      | boolean     | v:false         | Enable 2-digit numeric hints (01-99, 00)                       |
| `maxSingleCharHints`            | number      | -               | Optional: Limit single-character hints                         |
| `useJapanese`                   | boolean     | v:true          | Enable Japanese word detection                                 |
| `highlightHintMarker`           | string/dict | 'DiffAdd'       | Hint marker highlight                                          |
| `highlightHintMarkerCurrent`    | string/dict | 'DiffText'      | Current hint marker highlight                                  |
| `suppressOnKeyRepeat`           | boolean     | v:true          | Suppress hints during fast key repeat                          |
| `keyRepeatThreshold`            | number      | 50              | Key repeat detection threshold (ms)                            |
| `keyRepeatResetDelay`           | number      | 300             | Reset delay after key repeat (ms)                              |
| `perKeyMinLength`               | dict        | {}              | Set minimum word length per key                                |
| `defaultMinWordLength`          | number      | 2               | Default minimum word length for hints                          |
| `bothMinWordLength`             | number      | 5               | Minimum word length for both-side hints (when hintPosition='both') |
| `segmenterThreshold`            | number      | 4               | Minimum characters to use TinySegmenter (camelCase)            |
| `japaneseMergeThreshold`        | number      | 2               | Maximum characters for particle merging (camelCase)            |
| `debugMode`                     | boolean     | v:false         | Enable debug mode                                              |
| `performanceLog`                | boolean     | v:false         | Enable performance logging                                     |
| `continuousHintMode`            | boolean     | v:false         | Enable automatic recenter + redraw loop after each hint jump   |
| `recenterCommand`               | string      | `"normal! zz"` | Command used to recenter the cursor during continuous mode     |
| `maxContinuousJumps`            | number      | 50              | Safety cap that stops the loop after the specified jump count  |


### Configuration Examples

Standard configuration:
```vim
let g:hellshake_yano = {
      \ 'useJapanese': v:false,
      \ 'useHintGroups': v:true,
      \ 'highlightSelected': v:true,
      \ 'useNumericMultiCharHints': v:true,
      \ 'enableTinySegmenter': v:false,
      \ 'singleCharKeys': 'ASDFGNM@;,.',
      \ 'multiCharKeys': 'BCEIOPQRTUVWXYZ',
      \ 'highlightHintMarker': {'bg': 'black', 'fg': '#57FD14'},
      \ 'highlightHintMarkerCurrent': {'bg': 'Red', 'fg': 'White'},
      \ 'perKeyMinLength': {
      \   'w': 3,
      \   'b': 3,
      \   'e': 3,
      \ },
      \ 'defaultMinWordLength': 3,
      \ 'perKeyMotionCount': {
      \   'w': 1,
      \   'b': 1,
      \   'e': 1,
      \   'h': 2,
      \   'j': 2,
      \   'k': 2,
      \   'l': 2,
      \ },
      \ 'motionCount': 3,
      \ 'japaneseMinWordLength': 3,
      \ 'segmenterThreshold': 4,
      \ 'japaneseMergeThreshold': 4,
      \ }
```

**Optimal for Japanese development:**
```vim
let g:hellshake_yano = #{
\   useJapanese: v:true,
\   useTinySegmenter: v:true,
\   minWordLength: 2,
\   perKeyMinLength: #{
\     'v': 1,    " Visual selection - all characters
\     'f': 1,    " Character search - all characters
\     'w': 3,    " Word motion - meaningful words only
\     'e': 2     " Word end - balanced precision
\   },
\   enableHighlight: v:true,
\   cacheSize: 2000
\ }
```

**Performance optimized:**
```vim
let g:hellshake_yano = #{
\   maxHints: 50,
\   cacheSize: 3000,
\   debounceDelay: 30,
\   suppressOnKeyRepeat: v:true,
\   keyRepeatThreshold: 80,
\   enableDebug: v:false
\ }
```

**Continuous hint loop:**
```vim
let g:hellshake_yano = #{
\   continuousHintMode: v:true,
\   recenterCommand: 'normal! zz',
\   maxContinuousJumps: 25
\ }
" Optional: keep the loop short when working in focused buffers
```

### Per-Key Minimum Word Length Settings

Set different minimum word lengths for different keys to optimize hint display based on motion type and context.

Keys defined in `perKeyMinLength` are **automatically mapped** - no need to manually set `countedMotions`.

This feature provides fine-grained control that allows:

- **Precise movement** with visual mode keys (1-character hints)
- **Noise reduction** with hjkl navigation (2+ character hints)
- **Customized thresholds** for different motion types
- **Automatic key mapping** for all configured keys

#### Basic Configuration

```vim
let g:hellshake_yano = #{
\   perKeyMinLength: #{
\     'v': 1,   " Visual mode - precise movement
\     'V': 1,   " Visual line mode
\     'w': 1,   " Word forward
\     'b': 1,   " Word backward
\     'h': 2,   " Left
\     'j': 2,   " Down
\     'k': 2,   " Up
\     'l': 2,   " Right
\     'f': 3,   " Character search
\     'F': 3,   " Character backward search
\   },
\   defaultMinWordLength: 2,
\   motionCount: 3   " Trigger hints after 3 motions
\ }
" Note: Keys in perKeyMinLength are automatically mapped!
" No need to set countedMotions separately.
```

### Hint Position Settings

Control where hints are displayed on words using the `hintPosition` option.

#### Available Options

- **`'start'`** (default): Display hints at the beginning of words
- **`'end'`**: Display hints at the end of words
- **`'both'`**: Display hints at both the beginning and end of words

#### Both-Side Hints with Word Length Threshold

When using `hintPosition: 'both'`, you can use `bothMinWordLength` to prevent hint overlap on short words:

- Words **longer than or equal to** `bothMinWordLength` show hints at both ends
- Words **shorter than** `bothMinWordLength` automatically fall back to single-side hints (start position)
- **Default value**: `5` characters (can be customized)
- **Fallback behavior**: Short words use start-position hints to avoid visual clutter

**Basic Configuration:**
```vim
let g:hellshake_yano = #{
\   hintPosition: 'both',
\   bothMinWordLength: 5,  " Threshold for both-side hints (default: 5)
\   defaultMinWordLength: 2
\ }
```

**Lua Configuration (for Neovim):**
```lua
vim.g.hellshake_yano = {
  hintPosition = "both",
  bothMinWordLength = 5,  -- Threshold for both-side hints (default: 5)
  defaultMinWordLength = 2
}
```

**How it works:**
- `"Hello"` (5 chars) → hints at both start and end: `H`ell`o`
- `"vim"` (3 chars) → hint at start only (fallback): `v`im
- `"JavaScript"` (10 chars) → hints at both ends: `J`avaScrip`t`
- `"a"` (1 char) → hint at start only (fallback): `a`

**Advanced Example - Optimized for Code Navigation:**
```vim
let g:hellshake_yano = #{
\   hintPosition: 'both',
\   bothMinWordLength: 6,      " Both-side hints for 6+ character words
\   defaultMinWordLength: 3,   " Show hints for 3+ character words
\   perKeyMinLength: #{
\     'w': 4,   " Word motion - meaningful words only
\     'v': 2,   " Visual mode - more precise hints
\   },
\   perKeyMotionCount: #{
\     'w': 1,   " Show hints immediately on word motion
\     'v': 1    " Show hints immediately in visual mode
\   }
\ }
```

**Lua Configuration (for Neovim):**
```lua
vim.g.hellshake_yano = {
  hintPosition = "both",
  bothMinWordLength = 6,      -- Both-side hints for 6+ character words
  defaultMinWordLength = 3,   -- Show hints for 3+ character words
  perKeyMinLength = {
    w = 4,   -- Word motion - meaningful words only
    v = 2,   -- Visual mode - more precise hints
  },
  perKeyMotionCount = {
    w = 1,   -- Show hints immediately on word motion
    v = 1    -- Show hints immediately in visual mode
  }
}
```

**Relationship with Other Settings:**

| Setting | Purpose | Interaction with `bothMinWordLength` |
|---------|---------|--------------------------------------|
| `defaultMinWordLength` | Minimum length to show any hints | Applied before `bothMinWordLength` check |
| `perKeyMinLength` | Per-key minimum word length | Takes precedence over `defaultMinWordLength` |
| `bothMinWordLength` | Threshold for both-side hints | Only applies when `hintPosition: 'both'` |

**Common Use Cases:**

1. **Long variable names** (default: `bothMinWordLength: 5`)
   - Best for codebases with descriptive naming (e.g., `getUserAccountDetails`)
   - Both-side hints help identify long identifiers quickly

2. **Short function names** (recommended: `bothMinWordLength: 3`)
   - Suitable for terse codebases (e.g., `map`, `get`, `set`)
   - Lower threshold provides more both-side hints

3. **Mixed content** (recommended: `bothMinWordLength: 6-8`)
   - Documentation with prose and code snippets
   - Higher threshold reduces visual noise in narrative text

**Note:** `bothMinWordLength` is only effective when `hintPosition` is set to `'both'`. If unset, defaults to `5`. When `hintPosition` is `'start'` or `'end'`, this setting is ignored.

### Dictionary System

The plugin supports both built-in and user-defined dictionaries to improve Japanese word segmentation and hint placement.

#### Built-in Dictionary

The plugin includes a comprehensive dictionary containing:
- **80+ Japanese programming terms**: Function definitions, asynchronous processing, database connections, etc.
- **Common compound words**: Automatically preserved during segmentation
- **Particle merging rules**: Intelligent handling of Japanese particles (の, を, に, etc.)

#### User-Defined Dictionary

Create custom dictionaries for your specific needs. The plugin searches for dictionary files in this order:

1. `.hellshake-yano/dictionary.json` (project-specific)
2. `hellshake-yano.dict.json` (project root)
3. `~/.config/hellshake-yano/dictionary.json` (global)

**Setup**:
```bash
# For project-specific dictionary
cp samples/dictionaries/dictionary.json .hellshake-yano/dictionary.json
```

> **Note**: `.hellshake-yano/dictionary.json` is included in `.gitignore`. Sample dictionaries are available in `samples/dictionaries/`.

#### Dictionary Format

**JSON format** (recommended):
```json
{
  "customWords": ["機械学習", "深層学習"],
  "preserveWords": ["HelloWorld", "getElementById"],
  "mergeRules": {
    "の": "always",
    "を": "always"
  },
  "hintPatterns": [
    {
      "pattern": "^-\\s*\\[\\s*\\]\\s*(.)",
      "hintPosition": "capture:1",
      "priority": 100,
      "description": "First character of checkbox"
    }
  ]
}
```

**YAML format**:
```yaml
customWords:
  - 機械学習
  - 深層学習
hintPatterns:
  - pattern: "^-\\s*\\[\\s*\\]\\s*(.)"
    hintPosition: "capture:1"
    priority: 100
```

**Simple text format**:
```
# Custom words
機械学習
深層学習

# Preserve words (! prefix)
!HelloWorld
!getElementById

# Hint patterns (@ prefix: priority:pattern:position)
@100:^-\s*\[\s*\]\s*(.):capture:1
```

#### Hint Pattern Matching

Define regex patterns to prioritize hint placement for specific document structures:

- **Checkboxes**: `- [ ] Task` → Hint on "T"
- **Numbered lists**: `1. Item` → Hint on "I"
- **Markdown headers**: `## Title` → Hint on "T"
- **Japanese brackets**: 「Content」 → Hint on first character

#### Dictionary Commands

```vim
:HellshakeYanoReloadDict    " Reload dictionary
:HellshakeYanoEditDict      " Edit dictionary file
:HellshakeYanoShowDict      " Show current dictionary
:HellshakeYanoValidateDict  " Validate dictionary format
```

#### Configuration

```vim
let g:hellshake_yano = {
  \ 'dictionaryPath': '~/.config/my-dict.json',
  \ 'useBuiltinDict': v:true,
  \ 'dictionaryMerge': 'merge'
  \ }
```

### Japanese Word Segmentation Settings

hellshake-yano.vim provides advanced Japanese word segmentation (wakachi-gaki) features using TinySegmenter and particle merging. These settings allow you to fine-tune how Japanese text is analyzed and word boundaries are detected.

#### Configuration Keys


| Feature | Configuration Key | Default | Description |
|---------|-------------------|---------|-------------|
| TinySegmenter threshold | `segmenterThreshold` | `4` | Minimum characters to use TinySegmenter |
| Particle merge threshold | `japaneseMergeThreshold` | `2` | Maximum characters for particle merging |

#### Basic Configuration Example

**Using camelCase format**:
```vim
let g:hellshake_yano = #{
\   useJapanese: v:true,
\   segmenterThreshold: 4,
\   japaneseMergeThreshold: 2,
\   japaneseMergeParticles: v:true
\ }
```

#### Configuration Parameter Details

##### segmenterThreshold (TinySegmenter Threshold)

Controls when TinySegmenter (morphological analysis engine) is used for Japanese text analysis.

**How it works**:
- When Japanese text segments are **4 characters or more** (default), TinySegmenter is used for precise morphological analysis
- For shorter segments, faster pattern-based detection is used
- Higher value = Faster performance but lower segmentation accuracy for long words
- Lower value = More accurate segmentation but slightly slower

**Tuning guidelines**:

```vim
" Default setting
let g:hellshake_yano = #{
\   segmenterThreshold: 4,
\ }

" Precision-focused - use morphological analysis even for short words
let g:hellshake_yano = #{
\   segmenterThreshold: 2,
\ }


```

**Recommended values**:
- **2-3**: Technical documents with many compound words
- **4**: Default balanced setting
- **5-6**: General text with simpler vocabulary

##### japaneseMergeThreshold (Particle Merge Threshold)

**Purpose**: Controls particle merging behavior - when Japanese particles (の, を, に, が, etc.) are merged with the preceding word.

**How it works**:
- When a particle appears after a word of **2 characters or less** (default), it is merged with the preceding word
- Example: 「私の」(watashi-no) is kept as one unit instead of being split into 「私」+ 「の」
- Higher value = More aggressive merging, creating longer word units
- Lower value = Less merging, separating words and particles

**Tuning guidelines**:
```vim
" Minimal merging - mostly separate particles
let g:hellshake_yano = #{
\   japaneseMergeThreshold: 1,
\ }
" Example: 「私」「の」「本」 (3 separate words)

" Default merging - natural reading units
let g:hellshake_yano = #{
\   japaneseMergeThreshold: 2,
\ }
" Example: 「私の」「本」 (2 word units)

" Aggressive merging - longer context units
let g:hellshake_yano = #{
\   japaneseMergeThreshold: 3,
\ }
" Example: 「私の本」 (single unit if conditions are met)
```

**Recommended values**:
- **1**: Precise character-level navigation
- **2**: Default natural reading units
- **3**: Code comments where phrases should be kept together


### Per-Key Motion Count Settings

The plugin supports **per-key motion count** settings, allowing different keys to trigger hints after different numbers of presses. This enables optimal user experience for different motion types.

#### Basic Configuration

```vim
let g:hellshake_yano = #{
\   perKeyMotionCount: #{
\     'v': 1,   " Visual mode - show hints immediately (1 press)
\     'V': 1,   " Visual line mode - immediate hints
\     'w': 1,   " Word forward - immediate hints
\     'b': 1,   " Word backward - immediate hints
\     'h': 3,   " Left - show hints after 3 presses
\     'j': 3,   " Down - show hints after 3 presses
\     'k': 3,   " Up - show hints after 3 presses
\     'l': 3    " Right - show hints after 3 presses
\   },
\   defaultMotionCount: 2,  " Default for unspecified keys
\   motionCount: 3          " Legacy fallback
\ }
```

#### Combining with Per-Key Minimum Length

For maximum control, you can combine per-key motion count with per-key minimum length:

```vim
let g:hellshake_yano = #{
\   perKeyMotionCount: #{
\     'v': 1,   " Show hints after 1 press
\     'h': 3    " Show hints after 3 presses
\   },
\   perKeyMinLength: #{
\     'v': 1,   " Show 1-character words
\     'h': 2    " Show 2+ character words
\   },
\   defaultMotionCount: 2,
\   defaultMinWordLength: 2
\ }
```

This configuration means:

- `v` key: Show hints for all words (including 1-character) after 1 press
- `h` key: Show hints for 2+ character words after 3 presses
- Other keys: Show hints for 2+ character words after 2 presses

### Key Repeat Suppression

During fast hjkl key repeat, hint display is temporarily suppressed to keep scrolling smooth. Timing is configurable and the feature can be disabled.

- Enable/disable: `g:hellshake_yano.suppressOnKeyRepeat` (default: `v:true`)
- Repeat threshold: `g:hellshake_yano.keyRepeatThreshold` (ms) (default: `50`)
- Reset delay: `g:hellshake_yano.keyRepeatResetDelay` (ms) (default: `300`)

See configuration examples below for quick copy.

#### Numeric 2-Character Hints (New Feature)

Enable numeric 2-character hints (01-99, 00) for handling large numbers of words:

```vim
" Enable numeric multi-character hints
let g:hellshake_yano = #{
\   useNumericMultiCharHints: v:true,
\   singleCharKeys: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
\   multiCharKeys: ['B', 'C', 'E', 'I', 'O', 'P', 'Q', 'R', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
\ }
```

**How it works**:
1. Single-character hints: A, S, D, F, G, H, J, K, L (9 hints)
2. Alphabetic 2-character hints: BB, BC, BE, CB, CC... (multiCharKeys combinations)
3. Numeric 2-character hints: 01, 02, 03, ..., 99, 00 (up to 100 hints)

### Advanced Highlight Settings

You can customize highlights using either highlight group names or color dictionaries.

```vim
" Use existing highlight groups
let g:hellshake_yano = #{
\   highlightHintMarker: 'Search',
\   highlightHintMarkerCurrent: 'IncSearch'
\ }

" Use custom colors with fg/bg
let g:hellshake_yano = #{
\   highlightHintMarker: {'fg': '#00ff00', 'bg': '#1a1a1a'},
\   highlightHintMarkerCurrent: {'fg': '#ffffff', 'bg': '#ff0000'}
\ }

" Mixed configuration example
let g:hellshake_yano = #{
\   markers: split('ASDFGHJKL', '\zs'),
\   motionCount: 5,
\   motionTimeout: 3000,
\   useJapanese: v:true,
\   highlightHintMarker: {'bg': '#3c3c3c'}
\ }

" Hint group configuration example
" Use home row keys for single-character hints
let g:hellshake_yano = #{
\   singleCharKeys: split('asdfghjkl', '\zs'),
\   multiCharKeys: split('qwertyuiop', '\zs'),
\   useHintGroups: v:true
\ }

" Numbers first for quick access (1-9, 0)
let g:hellshake_yano = #{
\   singleCharKeys: split('1234567890ASDFGHJKL', '\zs'),
\   multiCharKeys: split('QWERTYUIOPZXCVBNM', '\zs')
\ }

" Exclude numbers if preferred
let g:hellshake_yano = #{
\   singleCharKeys: split('ASDFGHJKL', '\zs'),
\   multiCharKeys: split('QWERTYUIOPZXCVBNM', '\zs')
\ }

" Key repeat detection settings
" Disable hint display during fast key repeat (for smooth scrolling)
let g:hellshake_yano = #{
\   suppressOnKeyRepeat: v:true,    " Enable/disable key repeat suppression (default: true)
\   keyRepeatThreshold: 50,          " Repeat detection threshold (milliseconds) (default: 50)
\   keyRepeatResetDelay: 300        " Delay before resetting repeat state (milliseconds) (default: 300)
\ }

" Disable key repeat suppression (always show hints)
let g:hellshake_yano = #{
\   suppressOnKeyRepeat: v:false
\ }

" Custom key repeat timing
let g:hellshake_yano = #{
\   keyRepeatThreshold: 100,         " More lenient threshold for slower typing
\   keyRepeatResetDelay: 500        " Longer delay before returning to normal behavior
\ }
```

## Usage

After installation, the plugin enhances Vim's built-in word motion commands to work correctly with Japanese text. Navigate using standard Vim motions:

### Word Navigation

- `w` - Forward to the beginning of the next word
- `b` - Backward to the beginning of the previous word
- `e` - Forward to the end of the current/next word

These motions correctly recognize Japanese word boundaries, allowing you to jump between words in Japanese text just as smoothly as in English.

### Commands

#### Basic Commands

- `:HellshakeEnable` - Enable the plugin
- `:HellshakeDisable` - Disable the plugin
- `:HellshakeToggle` - Toggle the plugin on/off
- `:HellshakeShow` - Show hints immediately
- `:HellshakeHide` - Hide displayed hints

## Contributing

Pull requests and issue reports are welcome.

## Inspiration
- vim-jp slack channel
- [POP TEAM EPIC](https://mangalifewin.takeshobo.co.jp/rensai/popute/)

## Author

nekowasabi

