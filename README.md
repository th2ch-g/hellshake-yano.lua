# hellshake-yano.vim

A Neovim plugin for seamless word-based cursor movement in Japanese text

## Overview

hellshake-yano.vim is a Neovim plugin that accurately detects word boundaries in Japanese text and
enables seamless cursor movement between words. It fully supports UTF-8 encoding and properly
handles Japanese characters (3-byte characters), making word-based navigation in Japanese text as
smooth as in English.

## Features

- **Accurate Word Boundary Detection**: Precisely identifies word boundaries in Japanese text
- **Seamless Cursor Movement**: Navigate between Japanese words with standard vim motions (w, b, e)
- **Mixed Text Support**: Works perfectly with mixed Japanese/English text
- **Full UTF-8 Support**: Correctly calculates byte positions for multi-byte Japanese characters
- **Customizable Precision**: Adjustable word detection algorithms for different use cases
- **Key Repeat Suppression**: Suppresses hint display during rapid hjkl repeats for smooth scrolling

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

The plugin can be configured using the `g:hellshake_yano` dictionary variable. Here are all
available options:

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
  \ 'per_key_min_length': {},
  \ 'default_min_word_length': 2,
  \ 'highlight_hint_marker': 'DiffAdd',
  \ 'highlight_hint_marker_current': 'DiffText'
  \ }
```

### Configuration Options

| Option                          | Type        | Default         | Description                                             |
| ------------------------------- | ----------- | --------------- | ------------------------------------------------------- |
| `markers`                       | array       | A-Z split       | Characters used as hint markers                         |
| `motion_count`                  | number      | 3               | Number of motions before hints appear                   |
| `motion_timeout`                | number      | 2000            | Timeout for motion count in milliseconds                |
| `hint_position`                 | string      | 'start'         | Where to display hints ('start' or 'end')               |
| `trigger_on_hjkl`               | boolean     | v:true          | Enable triggering on hjkl movements                     |
| `counted_motions`               | array       | []              | Custom motion keys to count (overrides trigger_on_hjkl) |
| `enabled`                       | boolean     | v:true          | Enable/disable the plugin                               |
| `single_char_keys`              | array       | ASDFGHJKLNM0-9  | Keys used for single-character hints                    |
| `multi_char_keys`               | array       | BCEIOPQRTUVWXYZ | Keys used for multi-character hints                     |
| `use_hint_groups`               | boolean     | v:true          | Enable hint groups feature                              |
| `use_numbers`                   | boolean     | v:true          | Allow number keys for hints                             |
| `max_single_char_hints`         | number      | -               | Optional: limit single-character hints                  |
| `use_japanese`                  | boolean     | v:true          | Enable Japanese word detection                          |
| `highlight_hint_marker`         | string/dict | 'DiffAdd'       | Highlight for hint markers                              |
| `highlight_hint_marker_current` | string/dict | 'DiffText'      | Highlight for current hint marker                       |
| `suppress_on_key_repeat`        | boolean     | v:true          | Suppress hints during rapid key repeat                  |
| `key_repeat_threshold`          | number      | 50              | Key repeat detection threshold (ms)                     |
| `key_repeat_reset_delay`        | number      | 300             | Delay before reset after key repeat (ms)                |
| `per_key_min_length`            | dict        | {}              | Set minimum word length per key                         |
| `default_min_word_length`       | number      | 2               | Default minimum word length for hints                   |
| `debug_mode`                    | boolean     | v:false         | Enable debug mode                                       |
| `performance_log`               | boolean     | v:false         | Enable performance logging                              |

### Per-Key Minimum Word Length Configuration

**Enhanced Feature**: Configure different minimum word lengths for different keys to optimize hint display based on movement type and context. Keys defined in `per_key_min_length` are **automatically mapped** - no need to manually configure `counted_motions`.

This feature allows fine-grained control over when hints appear for specific keys, enabling:
- **Precise movement** with visual mode keys (1 character hints)
- **Noise reduction** for hjkl navigation (2+ character hints)
- **Customized thresholds** for different motion types
- **Automatic key mapping** for all configured keys

#### Basic Configuration

```vim
let g:hellshake_yano = {
  \ 'per_key_min_length': {
  \   'v': 1,   " Visual mode - precise movement
  \   'V': 1,   " Visual line mode
  \   'w': 1,   " Word forward
  \   'b': 1,   " Word backward
  \   'h': 2,   " Left (reduce noise)
  \   'j': 2,   " Down
  \   'k': 2,   " Up
  \   'l': 2,   " Right
  \   'f': 3,   " Find character
  \   'F': 3,   " Find character backward
  \ },
  \ 'default_min_word_length': 2,
  \ 'motion_count': 3,   " Trigger hints after 3 motions
  \ }
" Note: Keys in per_key_min_length are automatically mapped!
" No need to configure counted_motions separately.
```

#### Use Cases

**Precise Movement (1 character hints)**
- Visual mode selections require precise cursor placement
- Word motions (w, b, e) benefit from showing all possible targets
- Single character hints appear immediately for maximum precision

**Noise Reduction (2+ character hints)**
- hjkl navigation in large files can be overwhelming with too many hints
- Higher thresholds reduce visual noise during scrolling through noise reduction
- Maintains smooth navigation experience

**Motion-Specific Optimization**
- Find operations (f, F, t, T) often target longer words
- Search motions (/, ?) work better with longer minimum lengths
- Different motion types have different precision requirements for motion types

#### Migration from Legacy Configuration

**Before (Legacy)**:
```vim
let g:hellshake_yano = {
  \ 'min_word_length': 2
  \ }
```

**After (Per-Key)**:
```vim
let g:hellshake_yano = {
  \ 'default_min_word_length': 2,
  \ 'per_key_min_length': {
  \   'v': 1,  " Override for visual mode
  \   'h': 3,  " Override for left movement
  \ }
  \ }
```

**Gradual Migration Strategy**:
1. Start with `default_min_word_length` matching your old legacy `min_word_length`
2. Add specific overrides for keys where you want different behavior
3. Test each change incrementally
4. Remove the old `min_word_length` setting once migration is complete

**Key Features**:
- **Automatic Mapping**: Keys in `per_key_min_length` are automatically added to motion mappings
- **No Manual Configuration**: No need to set `counted_motions` for per-key configured keys
- **Full Backward Compatibility**: Existing configurations continue to work unchanged
- **Dynamic Context**: Each key press updates the context for accurate filtering

**Combining with `counted_motions`**:
```vim
let g:hellshake_yano = {
  \ 'per_key_min_length': {
  \   'v': 1,  " Automatically mapped with 1-char minimum
  \   'h': 2,  " Automatically mapped with 2-char minimum
  \ },
  \ 'counted_motions': ['g', 'd'],  " Additional keys using default_min_word_length
  \ 'default_min_word_length': 3,
  \ }
" Result: v(1), h(2), g(3), d(3) are all tracked
```

#### Performance Considerations

- **Cache Optimization**: Per-key settings enable intelligent cache based on key context
- **Memory Usage**: Minimal memory overhead - only stores overrides for specified keys
- **Recommended Settings for Large Files**:
  ```vim
  let g:hellshake_yano = {
    \ 'default_min_word_length': 3,
    \ 'per_key_min_length': {
    \   'v': 1,  " Keep visual mode precise
    \   'w': 2,  " Word motions more responsive
    \   'h': 4, 'j': 4, 'k': 4, 'l': 4  " Reduce hjkl noise significantly
    \ }
    \ }
  ```

### Key Repeat Suppression

During rapid hjkl key repetition, hint display is temporarily suppressed to keep scrolling smooth. Timing is configurable and the feature can be disabled.

- Enable/disable: `g:hellshake_yano.suppress_on_key_repeat` (default: `v:true`)
- Repeat threshold: `g:hellshake_yano.key_repeat_threshold` in ms (default: `50`)
- Reset delay: `g:hellshake_yano.key_repeat_reset_delay` in ms (default: `300`)

See the example configuration below for quick copies.

### Debug Mode

The plugin includes a comprehensive debug mode for troubleshooting and performance analysis:

- Enable/disable: `g:hellshake_yano.debug_mode` (default: `v:false`)
- Show debug info: `:HellshakeDebug` or `:HellshakeShowDebug`

Debug mode displays:
- Current plugin configuration
- Motion count and timing information
- Key repeat detection state
- Buffer-specific state
- Performance metrics (when performance_log is enabled)

### Performance Logging

Track plugin performance with built-in performance logging:

- Enable/disable: `g:hellshake_yano.performance_log` (default: `v:false`)
- Records execution time for key operations
- Helps identify performance bottlenecks
- Viewable through debug mode when enabled

### Hint Groups Configuration

The plugin supports intelligent hint grouping that separates single-character hints from
multi-character hints for improved navigation efficiency:

- **Single-character keys**: Used for immediate navigation with no timeout
- **Multi-character keys**: Used for two-character hints when more targets are needed
- **Max single-character hints**: Limits the number of single-character hints to prevent key
  conflicts

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

" Key repeat detection configuration
" Disable hint display during rapid key repetition (for smooth scrolling)
let g:hellshake_yano = {
  \ 'suppress_on_key_repeat': v:true,    " Enable/disable key repeat suppression (default: true)
  \ 'key_repeat_threshold': 50,          " Repeat detection threshold in milliseconds (default: 50)
  \ 'key_repeat_reset_delay': 300        " Delay before resetting repeat state in milliseconds (default: 300)
  \ }

" Disable key repeat suppression (always show hints)
let g:hellshake_yano = {
  \ 'suppress_on_key_repeat': v:false
  \ }

" Custom key repeat timing
let g:hellshake_yano = {
  \ 'key_repeat_threshold': 100,         " More lenient threshold for slower typing
  \ 'key_repeat_reset_delay': 500        " Longer delay before returning to normal behavior
  \ }
```

## Usage

Once installed, the plugin enhances Vim's built-in word motion commands to work correctly with
Japanese text. Use standard Vim motions to navigate:

### Word Navigation

- `w` - Move forward to the beginning of the next word
- `b` - Move backward to the beginning of the previous word
- `e` - Move forward to the end of the current/next word
- `ge` - Move backward to the end of the previous word

These motions now correctly recognize Japanese word boundaries, allowing you to jump between words
in Japanese text just as you would in English.

### Commands

#### Basic Commands
- `:HellshakeEnable` - Enable the plugin
- `:HellshakeDisable` - Disable the plugin
- `:HellshakeToggle` - Toggle plugin on/off
- `:HellshakeShow` - Show hints immediately
- `:HellshakeHide` - Hide visible hints

#### Configuration Commands
- `:HellshakeSetCount <number>` - Set motion count threshold
- `:HellshakeSetTimeout <ms>` - Set motion timeout in milliseconds
- `:HellshakeSetCountedMotions <keys>` - Set custom motion keys to track

#### Debug Commands
- `:HellshakeDebug` - Show comprehensive debug information
- `:HellshakeShowDebug` - Alias for `:HellshakeDebug`

## Technical Details

### UTF-8 Encoding Support

This plugin correctly handles the complexity of UTF-8 encoded Japanese text, where characters occupy
different numbers of bytes (Japanese: 3 bytes, ASCII: 1 byte). It accurately converts between
character positions and byte positions, ensuring cursor movement commands work correctly with
Neovim's internal buffer representation.

### Word Boundary Detection Algorithm

The plugin intelligently detects word boundaries in Japanese text using:

1. **Character Type Analysis**: Distinguishes between hiragana, katakana, kanji, and alphanumeric
   characters
2. **Boundary Rules**: Identifies natural word breaks based on character type transitions
3. **Contextual Detection**: Applies different rules based on the surrounding context
4. **Precision Modes**: Three levels of detection precision for different use cases:
   - Basic: Simple character type transitions
   - Improved: Enhanced rules for common patterns
   - Precise: Advanced detection for complex cases

## Troubleshooting

### Common Issues and Solutions

#### Hints not appearing
1. Check if the plugin is enabled: `:echo g:hellshake_yano.enabled`
2. Verify motion count setting: `:echo g:hellshake_yano.motion_count`
3. Check per-key minimum length configuration: `:echo g:hellshake_yano.per_key_min_length`
4. Verify default minimum word length: `:echo g:hellshake_yano.default_min_word_length`
5. Ensure denops is properly installed and running
6. Use `:HellshakeDebug` to check current state

#### Hints appear during scrolling
- Adjust key repeat suppression settings:
  ```vim
  let g:hellshake_yano.suppress_on_key_repeat = v:true
  let g:hellshake_yano.key_repeat_threshold = 30  " More aggressive suppression
  ```

#### Performance issues
1. Enable performance logging to identify bottlenecks:
   ```vim
   let g:hellshake_yano.performance_log = v:true
   ```
2. Run `:HellshakeDebug` to view performance metrics
3. Consider reducing the number of hint markers
4. Disable Japanese word detection if not needed:
   ```vim
   let g:hellshake_yano.use_japanese = v:false
   ```

#### Per-key configuration not working
1. Verify configuration syntax is correct: `:echo g:hellshake_yano.per_key_min_length`
2. Check that the key exists in your per_key_min_length dictionary
3. Confirm default_min_word_length is set appropriately
4. Test with a simple configuration first:
   ```vim
   let g:hellshake_yano.per_key_min_length = {'v': 1}
   ```

#### Incorrect word detection in Japanese text
1. Ensure UTF-8 encoding: `:set encoding?` should show `utf-8`
2. Check file encoding: `:set fileencoding?`
3. Verify Japanese detection is enabled: `:echo g:hellshake_yano.use_japanese`

#### Highlight not visible
1. Check your colorscheme compatibility
2. Try using different highlight groups:
   ```vim
   let g:hellshake_yano.highlight_hint_marker = 'Search'
   let g:hellshake_yano.highlight_hint_marker_current = 'IncSearch'
   ```
3. Use custom colors:
   ```vim
   let g:hellshake_yano.highlight_hint_marker = {'fg': '#00ff00', 'bg': '#000000'}
   ```

### Debug Information

When reporting issues, please include the output of:
1. `:HellshakeDebug` - Full debug information
2. `:echo g:hellshake_yano` - Current configuration
3. `:version` - Neovim version
4. Your minimal configuration that reproduces the issue

## Development

### Build

```bash
# Compile TypeScript
deno task build

# Run tests
deno test -A

# Run specific test file
deno test -A tests/refactor_test.ts

# Run with trace for debugging
deno test -A --trace-leaks
```

### Directory Structure

```
hellshake-yano.vim/
├── autoload/
│   └── hellshake-yano.vim # VimScript interface
├── denops/
│   └── hellshake-yano/
│       ├── main.ts         # Main entry point
│       ├── word/
│       │   ├── detector.ts # Word detection logic
│       │   └── manager.ts  # Word manager
│       └── utils/
│           └── encoding.ts # UTF-8 encoding utilities
├── plugin/
│   └── hellshake-yano.vim # Plugin initialization
├── tests/                  # Comprehensive test suite
│   ├── refactor_test.ts   # VimScript refactoring tests
│   └── helpers/
│       └── mock.ts        # Test utilities
├── PLAN.md                # Development plan
└── README.md
```

## License

MIT License

## Contributing

Pull requests and issue reports are welcome.

## Author

[Your Name]
