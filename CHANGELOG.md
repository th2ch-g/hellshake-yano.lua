# Changelog

All notable changes to hellshake-yano.vim will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Phase A-4: Motion Repeat Detection (2025-10-16)

#### Added
- **Motion repeat detection**: Automatically show hints when pressing w/b/e keys repeatedly
  - Default: 2 consecutive presses within 2 seconds
  - Configurable threshold (`motion_threshold`)
  - Configurable timeout (`motion_timeout_ms`)
  - Configurable keys (`motion_keys`)
- **Configuration system**: New `config.vim` module for centralized settings
  - `hellshake_yano_vim#config#get(key)` - Get configuration value
  - `hellshake_yano_vim#config#set(key, value)` - Set configuration value
  - Support for `g:hellshake_yano_vim_config` global variable
- **Motion state management**: New `motion.vim` module
  - `hellshake_yano_vim#motion#init()` - Initialize motion state
  - `hellshake_yano_vim#motion#handle(motion_key)` - Handle motion key press
  - `hellshake_yano_vim#motion#set_threshold(count)` - Set repeat threshold
  - `hellshake_yano_vim#motion#set_timeout(ms)` - Set timeout duration
  - `hellshake_yano_vim#motion#get_state()` - Get current state (for testing)
- **Key mappings**: Automatic mapping for w/b/e keys (can be disabled)
  - `<Plug>(hellshake-yano-vim-w)` - Word forward motion with hint trigger
  - `<Plug>(hellshake-yano-vim-b)` - Word backward motion with hint trigger
  - `<Plug>(hellshake-yano-vim-e)` - Word end motion with hint trigger
- **Manual testing scripts**: Comprehensive test scripts for Vim
  - `tmp/claude/test_manual_motion_basic.vim` - Basic motion repeat tests
  - `tmp/claude/test_manual_motion_custom.vim` - Configuration customization tests
  - `tmp/claude/test_manual_motion_edge_cases.vim` - Edge case tests
  - `tmp/claude/README_TESTS.md` - Manual testing guide

#### Changed
- **core.vim**: Integrated with motion and config modules
  - `hellshake_yano_vim#core#init()` now calls `motion#init()` and applies config
  - Motion settings are loaded from config on initialization
- **plugin/hellshake-yano-vim.vim**: Added motion key mappings section
  - Automatic mapping based on `motion_enabled` and `motion_keys` config
  - Support for custom <Plug> mappings

#### Documentation
- **ARCHITECTURE.md**: Added Phase A-4 detailed section
  - Implementation details and algorithm explanation
  - Data structures and API documentation
  - Configuration examples and test instructions
  - Performance characteristics (O(1) time complexity)
- **README.md**: Added Phase A-4 feature description
  - Usage examples for motion repeat detection
  - Configuration options table
  - Motion repeat examples (w+w, timeout, different motion)
  - Updated roadmap with completion status
- **CHANGELOG.md**: Created this changelog (new file)
- **tmp/claude/REFACTORING_REPORT.md**: Code quality assessment report

#### Technical Details
- **Algorithm**: Time-based motion repeat detection using `reltime()` and `reltimefloat()`
- **Performance**: O(1) time complexity for all operations
- **Compatibility**: Vim 8.0+ (Pure VimScript, no Denops required)
- **Testing**: TDD approach with comprehensive unit tests

#### Breaking Changes
None - Phase A-4 is fully backward compatible with Phase A-1, A-2, and A-3.

---

### Phase A-3: Multi-Character Hints (2025-10)

#### Added
- **Multi-character hint generation**: Support for up to 49 words (7 single-char + 42 multi-char)
  - Single-character hints: A, S, D, F, J, K, L (7 words)
  - Multi-character hints: AA, AS, AD, AF, ..., LL (up to 42 words)
- **Partial match highlighting**: Visual feedback during multi-character input
  - Highlights matching hints as you type
  - Filters non-matching hints
- **Blocking input method**: Reliable input capture before Vim's normal key bindings
  - `hellshake_yano_vim#input#wait_for_input()` - Blocking input with multi-char support
  - Based on vim-searchx pattern for reliable input handling

#### Changed
- **hint_generator.vim**: Extended to generate multi-character hints
- **input.vim**: Implemented blocking input method for multi-character support
- **display.vim**: Added partial match highlighting support
- **core.vim**: Updated maximum word limit from 7 to 49

#### Documentation
- **ARCHITECTURE.md**: Added Phase A-3 implementation details
- **README.md**: Added Phase A-3 feature description and usage examples

---

### Phase A-2: Automatic Word Detection (2025-10)

#### Added
- **Automatic word detection**: Detect words within visible screen area
  - `hellshake_yano_vim#word_detector#detect_visible()` - Detect visible words
  - Uses `\w+` pattern (alphanumeric + underscore)
  - Scans from `line('w0')` to `line('w$')` (visible area only)
- **Performance optimization**: Fast detection even in large buffers
  - O(L * W) time complexity (L: visible lines, W: words per line)
  - Only scans visible area (typically 20-50 lines)

#### Changed
- **core.vim**: Integrated with word_detector module
  - `hellshake_yano_vim#core#show()` now uses word_detector instead of fixed positions
  - Smart hint placement at actual word positions

#### Documentation
- **ARCHITECTURE.md**: Added Phase A-2 technical specifications
- **README.md**: Added word detection feature description

---

### Phase A-1: MVP (Minimum Viable Product) (2025-10)

#### Added
- **Initial implementation**: Pure VimScript hit-a-hint plugin
  - `hellshake_yano_vim#core#init()` - Initialize plugin state
  - `hellshake_yano_vim#core#show()` - Show hints at fixed positions
  - `hellshake_yano_vim#core#hide()` - Hide hints
- **Hint generation**: Single-character hints (a, s, d) for 3 fixed positions
  - `hellshake_yano_vim#hint_generator#generate(count)` - Generate hints
- **Display system**: Popup-based hint display (Vim 8.0+) and extmark (Neovim)
  - `hellshake_yano_vim#display#show_hint(lnum, col, hint)` - Show single hint
  - `hellshake_yano_vim#display#hide_all()` - Hide all hints
- **Input handling**: Blocking input for hint selection
  - `hellshake_yano_vim#input#wait_for_input(hint_map)` - Wait for user input
- **Jump functionality**: Jump to selected hint position
  - `hellshake_yano_vim#jump#to_position(lnum, col)` - Jump cursor
- **Commands**:
  - `:HellshakeYanoVimShow` - Show hints
  - `:HellshakeYanoVimHide` - Hide hints
  - `:HellshakeYanoVimTest` - Run unit tests
- **TDD approach**: Comprehensive test suite
  - `tests-vim/hellshake_yano_vim/test_*.vim` - Unit tests
  - Test runner framework for VimScript

#### Documentation
- **ARCHITECTURE.md**: Initial architecture documentation
- **README.md**: Basic usage and installation instructions
- **plugin/hellshake-yano-vim.vim**: Command definitions and entry point

---

## Version History

- **Phase A-4** (2025-10-16): Motion repeat detection ✅
- **Phase A-3** (2025-10): Multi-character hints ✅
- **Phase A-2** (2025-10): Automatic word detection ✅
- **Phase A-1** (2025-10): MVP implementation ✅

## Upcoming Releases

### Phase A-5 (Planned)
- Japanese word detection support
- Word detection caching for performance
- Visual mode support
- Customizable highlight groups
- More configuration options

### Phase B (Planned)
- Denops implementation (TypeScript)
- Performance optimization
- Advanced features

### Phase C (Planned)
- Unified API across implementations
- Automatic implementation selection
- Integration testing

---

## Notes

- All Phase A implementations are **Pure VimScript** and work with Vim 8.0+
- No external dependencies required for Phase A features
- TDD approach ensures high code quality and test coverage
- Each phase builds upon previous phases with full backward compatibility
