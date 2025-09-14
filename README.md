# hellshake-yano.vim

A Neovim plugin for seamless word-based cursor movement in Japanese text

## Overview

hellshake-yano.vim is a Neovim plugin that accurately detects word boundaries in Japanese text and enables seamless cursor movement between words. It fully supports UTF-8 encoding and properly handles Japanese characters (3-byte characters), making word-based navigation in Japanese text as smooth as in English.

## Features

- **Accurate Word Boundary Detection**: Precisely identifies word boundaries in Japanese text
- **Seamless Cursor Movement**: Navigate between Japanese words with standard vim motions (w, b, e)
- **Mixed Text Support**: Works perfectly with mixed Japanese/English text
- **Full UTF-8 Support**: Correctly calculates byte positions for multi-byte Japanese characters
- **Customizable Precision**: Adjustable word detection algorithms for different use cases

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

The plugin can be configured using the `g:hellshake_yano` dictionary variable. Here are all available options:

```vim
let g:hellshake_yano = {
  \ 'markers': split('ABCDEFGHIJKLMNOPQRSTUVWXYZ', '\zs'),
  \ 'motion_count': 3,
  \ 'motion_timeout': 2000,
  \ 'hint_position': 'start',
  \ 'trigger_on_hjkl': v:true,
  \ 'counted_motions': [],
  \ 'enabled': v:true,
  \ 'single_char_keys': split('ASDFGHJKLNM0123456789', '\zs'),
  \ 'multi_char_keys': split('BCEIOPQRTUVWXYZ', '\zs'),
  \ 'use_hint_groups': v:true,
  \ 'use_numbers': v:true,
  \ 'use_japanese': v:true,
  \ 'highlight_hint_marker': 'DiffAdd',
  \ 'highlight_hint_marker_current': 'DiffText'
  \ }
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `markers` | array | A-Z split | Characters used as hint markers |
| `motion_count` | number | 3 | Number of motions before hints appear |
| `motion_timeout` | number | 2000 | Timeout for motion count in milliseconds |
| `hint_position` | string | 'start' | Where to display hints ('start' or 'end') |
| `trigger_on_hjkl` | boolean | v:true | Enable triggering on hjkl movements |
| `counted_motions` | array | [] | Custom motion keys to count (overrides trigger_on_hjkl) |
| `enabled` | boolean | v:true | Enable/disable the plugin |
| `single_char_keys` | array | ASDFGHJKLNM0-9 | Keys used for single-character hints |
| `multi_char_keys` | array | BCEIOPQRTUVWXYZ | Keys used for multi-character hints |
| `use_hint_groups` | boolean | v:true | Enable hint groups feature |
| `use_numbers` | boolean | v:true | Allow number keys for hints |
| `max_single_char_hints` | number | - | Optional: limit single-character hints |
| `use_japanese` | boolean | - | Enable Japanese word detection |
| `highlight_hint_marker` | string/dict | 'DiffAdd' | Highlight for hint markers |
| `highlight_hint_marker_current` | string/dict | 'DiffText' | Highlight for current hint marker |

### Hint Groups Configuration

The plugin supports intelligent hint grouping that separates single-character hints from multi-character hints for improved navigation efficiency:

- **Single-character keys**: Used for immediate navigation with no timeout
- **Multi-character keys**: Used for two-character hints when more targets are needed
- **Max single-character hints**: Limits the number of single-character hints to prevent key conflicts

### Advanced Highlight Configuration

You can customize highlights using either highlight group names or color dictionaries:

```vim
" Using existing highlight groups
let g:hellshake_yano = {
  \ 'highlight_hint_marker': 'Search',
  \ 'highlight_hint_marker_current': 'IncSearch'
  \ }

" Using custom colors with fg/bg
let g:hellshake_yano = {
  \ 'highlight_hint_marker': {'fg': '#00ff00', 'bg': '#1a1a1a'},
  \ 'highlight_hint_marker_current': {'fg': '#ffffff', 'bg': '#ff0000'}
  \ }

" Mixed configuration example
let g:hellshake_yano = {
  \ 'markers': split('ASDFGHJKL', '\zs'),
  \ 'motion_count': 5,
  \ 'motion_timeout': 3000,
  \ 'use_japanese': v:true,
  \ 'highlight_hint_marker': {'bg': '#3c3c3c'}
  \ }

" Hint groups configuration examples
" Using home row keys for single-character hints
let g:hellshake_yano = {
  \ 'single_char_keys': split('asdfghjkl', '\zs'),
  \ 'multi_char_keys': split('qwertyuiop', '\zs'),
  \ 'use_hint_groups': v:true
  \ }

" Numbers first for quick access (1-9, 0)
let g:hellshake_yano = {
  \ 'single_char_keys': split('1234567890ASDFGHJKL', '\zs'),
  \ 'multi_char_keys': split('QWERTYUIOPZXCVBNM', '\zs')
  \ }

" Exclude numbers if preferred
let g:hellshake_yano = {
  \ 'single_char_keys': split('ASDFGHJKL', '\zs'),
  \ 'multi_char_keys': split('QWERTYUIOPZXCVBNM', '\zs')
  \ }
```

## Usage

Once installed, the plugin enhances Vim's built-in word motion commands to work correctly with Japanese text. Use standard Vim motions to navigate:

### Word Navigation

- `w` - Move forward to the beginning of the next word
- `b` - Move backward to the beginning of the previous word
- `e` - Move forward to the end of the current/next word
- `ge` - Move backward to the end of the previous word

These motions now correctly recognize Japanese word boundaries, allowing you to jump between words in Japanese text just as you would in English.

### Commands

- `:HellshakeEnable` - Enable the plugin
- `:HellshakeDisable` - Disable the plugin
- `:HellshakeToggle` - Toggle plugin on/off

## Technical Details

### UTF-8 Encoding Support

This plugin correctly handles the complexity of UTF-8 encoded Japanese text, where characters occupy different numbers of bytes (Japanese: 3 bytes, ASCII: 1 byte). It accurately converts between character positions and byte positions, ensuring cursor movement commands work correctly with Neovim's internal buffer representation.

### Word Boundary Detection Algorithm

The plugin intelligently detects word boundaries in Japanese text using:

1. **Character Type Analysis**: Distinguishes between hiragana, katakana, kanji, and alphanumeric characters
2. **Boundary Rules**: Identifies natural word breaks based on character type transitions
3. **Contextual Detection**: Applies different rules based on the surrounding context
4. **Precision Modes**: Three levels of detection precision for different use cases:
   - Basic: Simple character type transitions
   - Improved: Enhanced rules for common patterns
   - Precise: Advanced detection for complex cases

## Development

### Build

```bash
# Compile TypeScript
deno task build

# Run tests
deno test
```

### Directory Structure

```
hellshake-yano.vim/
├── autoload/
│   └── hellshake/
│       └── yano.vim      # Vim-side interface
├── denops/
│   └── hellshake-yano/
│       ├── main.ts       # Main entry point
│       ├── detector.ts   # Word detection logic
│       └── utils.ts      # Utility functions
├── plugin/
│   └── hellshake-yano.vim # Plugin initialization
└── README.md
```

## License

MIT License

## Contributing

Pull requests and issue reports are welcome.

## Author

[Your Name]
