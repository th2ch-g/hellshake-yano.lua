# hellshake-yano.vim

A Neovim plugin for seamless word-based cursor movement

## Overview

hellshake-yano.vim is a Neovim plugin that enables seamless cursor movement between words.

It fully supports UTF-8 encoding and properly handles Japanese characters, making word-based navigation in Japanese text as smooth as in English.

## Features

- **Seamless Cursor Movement**: Navigate between words with standard vim motions (h, j, k, l, w, b, e)
- **Mixed Text Support**: Works with Japanese/English mixed text
- **Customizable Precision**: Adjustable word detection algorithms for different use cases
- **Visual Mode Optimization**: Intelligent hint placement for natural word selection in visual mode
- **Dictionary System**: Built-in and user-defined dictionaries for improved Japanese word segmentation

## Installation

### Using vim-plug

```vim
Plug 'username/hellshake-yano.vim'
```

### Using lazy.nvim

```lua
{
  'username/hellshake-yano.vim',
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
| `hintPosition`                  | string      | 'start'         | Position to display hints ('start' or 'end')                   |
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
| `segmenterThreshold`            | number      | 4               | Minimum characters to use TinySegmenter (camelCase)            |
| `japaneseMergeThreshold`        | number      | 2               | Maximum characters for particle merging (camelCase)            |
| `debugMode`                     | boolean     | v:false         | Enable debug mode                                              |
| `performanceLog`                | boolean     | v:false         | Enable performance logging                                     |


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
let g:hellshake_yano_dictionary_path = '~/.config/my-dict.json'
let g:hellshake_yano_use_builtin_dict = v:true
let g:hellshake_yano_dictionary_merge = 'merge'  " or 'override'
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


