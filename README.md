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
- **Visual Mode Optimization**: Intelligent hint positioning for natural word selection in Visual mode
- **Strict Key Separation**: Complete separation between single_char_keys and multi_char_keys for predictable navigation
- **Performance Optimizations**: Instant jump for single-character hints without delay
- **Smart Auto-Detection**: Automatically enables hint groups when single/multi char keys are configured
- **Dictionary System**: Built-in and user-defined dictionaries for improved Japanese word segmentation
- **Hint Pattern Matching**: Regex-based hint prioritization for document structures (checkboxes, lists, headers)

## UnifiedCache System

hellshake-yano.vim utilizes a sophisticated unified caching system that dramatically improves performance and memory efficiency.

### Key Benefits

- **88% Memory Reduction**: From 659KB to just 78KB through intelligent LRU caching
- **Unified Management**: Consolidates 20 separate cache implementations into a single, efficient system (統一されたキャッシュ管理)
- **Comprehensive Statistics**: Built-in monitoring and debugging capabilities
- **Type-Safe**: Full TypeScript support with 16 specialized cache types

### Cache Architecture

The UnifiedCache system provides 16 specialized cache types optimized for different purposes:

- `WORDS` (1000): Word detection results
- `HINTS` (500): Hint generation results
- `DICTIONARY` (2000): Dictionary data and custom words
- `CHAR_WIDTH` (500): Unicode character width calculations
- `CHAR_TYPE` (1000): Character type determinations
- And 11 more specialized types

### Usage Example

```typescript
import { UnifiedCache, CacheType } from "./cache.ts";

// Get singleton instance
const cache = UnifiedCache.getInstance();

// Access specific cache type
const wordsCache = cache.getCache<string, string[]>(CacheType.WORDS);

// Cache operations
wordsCache.set("file.ts", ["const", "function", "return"]);
const words = wordsCache.get("file.ts");

// Monitor performance
const stats = cache.getAllStats();
console.log(`Cache hit rate: ${stats.WORDS.hitRate}%`);
```

### Performance Metrics

- **Hit Rate**: 63-66% average, up to 92.5% for frequently accessed data
- **Operation Speed**: < 0.001ms per cache operation
- **Memory Efficiency**: Automatic LRU eviction prevents memory leaks
- **Scalability**: Handles thousands of entries without performance degradation

For detailed documentation, see:
- [API Reference](docs/unified-cache-api.md)
- [Cache Types Guide](docs/cache-types.md)
- [Migration Guide v3.0.0](MIGRATION_v3.md) - **Important for v3.0.0 users**
- [Performance Metrics](docs/performance-metrics.md)
- [Changelog](CHANGELOG.md)

## Version 3.0.0 - Breaking Changes

hellshake-yano.vim v3.0.0 is a **major breaking release** that completely removes all backward compatibility code for a cleaner, modern TypeScript codebase.

### 🔥 Breaking Changes

#### 1. snake_case Configuration Support Removed

**v2.x (NO LONGER WORKS):**
```vim
let g:hellshake_yano = #{
\   single_char_keys: ['f', 'F', 't', 'T'],
\   multi_char_keys: ['w', 'b', 'e'],
\   hint_position: 'start'
\ }
```

**v3.0.0 (REQUIRED):**
```vim
let g:hellshake_yano = #{
\   singleCharKeys: ['f', 'F', 't', 'T'],
\   multiCharKeys: ['w', 'b', 'e'],
\   hintPosition: 'start'
\ }
```

#### 2. Type Aliases Removed

**v2.x (NO LONGER WORKS):**
```typescript
// ❌ Removed type aliases
import type { UnifiedConfig, CamelCaseConfig, ModernConfig } from "./config.ts";
```

**v3.0.0 (REQUIRED):**
```typescript
// ✅ Use Config type only
import type { Config } from "./config.ts";

const config: Config = {
  hintPosition: "start",
  useJapanese: true,
  minWordLength: 3,
  // ... other options
};
```

#### 3. Compatibility Functions Removed

The following functions have been completely removed:
- `normalizeBackwardCompatibleFlags()`
- `convertConfigForManager()`
- `syncManagerConfig()`
- `getMinLengthForKey()` (compatibility layer)
- `getMotionCountForKey()` (compatibility layer)

**File Removed:**
- `denops/hellshake-yano/compatibility.ts` (208 lines - completely removed)

#### 4. Deprecated Properties Removed

- `useImprovedDetection` property (always enabled now)

### Migration Guide

For detailed migration instructions, see [MIGRATION_v3.md](MIGRATION_v3.md).

**Quick Migration Checklist:**
- [ ] Update all snake_case properties to camelCase in your Vim config
- [ ] Change `UnifiedConfig` to `Config` in TypeScript code
- [ ] Remove references to compatibility functions
- [ ] Test your configuration with `:echo g:hellshake_yano`

### New APIs

#### GlobalCache (Preferred Name)

```typescript
import { GlobalCache, CacheType } from "./cache.ts";

// Get singleton instance
const cache = GlobalCache.getInstance();

// Access specific cache
const wordsCache = cache.getCache<string, string[]>(CacheType.WORDS);

// Get statistics
const stats = cache.getStats(); // New API
```

**Note**: `UnifiedCache` is still available as an alias for backward compatibility.

#### getStats() (New Statistics API)

```typescript
// New concise API
const stats = cache.getStats();
console.log(`Hit rate: ${stats.WORDS.hitRate}%`);

// Old API still works
const stats2 = cache.getStatistics(); // Alias for getStats()
```

#### detectWordsWithManager (Enhanced Word Detection)

```typescript
import { detectWordsWithManager, getWordDetectionManager } from "./word.ts";

// Get word detection manager
const manager = await getWordDetectionManager(denops);

// Detect words with explicit screen range
const words = await detectWordsWithManager(denops, manager);
```

### Benefits of v3.0.0

- ✅ **Cleaner Codebase**: ~250 lines of legacy code removed
- ✅ **Better Performance**: Removed compatibility overhead
- ✅ **Type Safety**: Single `Config` type for consistency
- ✅ **Modern API**: camelCase-only naming convention
- ✅ **Easier Maintenance**: No legacy code to maintain

For more details, see [CHANGELOG.md](CHANGELOG.md).

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
| `motion_count`                  | number      | 3               | Number of motions before hints appear (legacy)          |
| `default_motion_count`          | number      | undefined       | Default motion count for unspecified keys               |
| `per_key_motion_count`          | dict        | {}              | Per-key motion count settings                           |
| `motion_timeout`                | number      | 2000            | Timeout for motion count in milliseconds                |
| `hint_position`                 | string      | 'start'         | Where to display hints ('start' or 'end')               |
| `trigger_on_hjkl`               | boolean     | v:true          | Enable triggering on hjkl movements                     |
| `counted_motions`               | array       | []              | Custom motion keys to count (overrides trigger_on_hjkl) |
| `enabled`                       | boolean     | v:true          | Enable/disable the plugin                               |
| `single_char_keys`              | array       | ASDFGHJKLNM0-9  | Keys used for single-character hints (supports symbols) |
| `multi_char_keys`               | array       | BCEIOPQRTUVWXYZ | Keys used for multi-character hints                     |
| `use_hint_groups`               | boolean     | v:true          | Enable hint groups feature                              |
| `use_numbers`                   | boolean     | v:true          | Allow number keys for hints                             |
| `use_numeric_multi_char_hints`  | boolean     | v:false         | Enable numeric two-character hints (01-99, 00)          |
| `max_single_char_hints`         | number      | -               | Optional: limit single-character hints                  |
| `use_japanese`                  | boolean     | v:true          | Enable Japanese word detection                          |
| `highlight_hint_marker`         | string/dict | 'DiffAdd'       | Highlight for hint markers                              |
| `highlight_hint_marker_current` | string/dict | 'DiffText'      | Highlight for current hint marker                       |
| `suppress_on_key_repeat`        | boolean     | v:true          | Suppress hints during rapid key repeat                  |
| `key_repeat_threshold`          | number      | 50              | Key repeat detection threshold (ms)                     |
| `key_repeat_reset_delay`        | number      | 300             | Delay before reset after key repeat (ms)                |
| `per_key_min_length`            | dict        | {}              | Set minimum word length per key                         |
| `default_min_word_length`       | number      | 2               | Default minimum word length for hints                   |
| `segmenter_threshold`           | number      | 4               | Min characters to use TinySegmenter (snake_case)        |
| `segmenterThreshold`            | number      | 4               | Min characters to use TinySegmenter (camelCase)         |
| `japanese_merge_threshold`      | number      | 2               | Max characters for particle merging (snake_case)        |
| `japaneseMergeThreshold`        | number      | 2               | Max characters for particle merging (camelCase)         |
| `debug_mode`                    | boolean     | v:false         | Enable debug mode                                       |
| `performance_log`               | boolean     | v:false         | Enable performance logging                              |


## Config System (v3.0.0)

hellshake-yano.vim v3.0.0 provides a unified configuration system with a single, flat structure using camelCase naming conventions.

### Key Benefits

- **Simplified Structure**: Single flat configuration interface (32 properties)
- **camelCase Convention**: Consistent naming throughout all settings
- **Type Safety**: Full TypeScript support with strict validation
- **Performance**: Direct property access without nested lookups
- **Clean API**: No legacy compatibility overhead

### Config Interface

The configuration system consolidates all settings into a single `Config` interface:

```typescript
interface Config {
  // Core settings
  enabled: boolean;
  markers: string[];
  motionCount: number;
  motionTimeout: number;
  hintPosition: "start" | "end" | "same";

  // Advanced settings
  useJapanese: boolean;
  minWordLength: number;
  perKeyMinLength: Record<string, number>;
  defaultMinWordLength: number;

  // Performance settings
  cacheSize: number;
  enableHighlight: boolean;
  useTinySegmenter: boolean;

  // ... and 21 more settings
}
```

### Configuration Example (v3.0.0)

**camelCase Style (REQUIRED in v3.0.0):**
```vim
let g:hellshake_yano = #{
\   enabled: v:true,
\   markers: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
\   motionCount: 3,
\   hintPosition: 'start',
\   useJapanese: v:true,
\   minWordLength: 3,
\   perKeyMinLength: #{ 'v': 1, 'f': 1, 'w': 3 },
\   defaultMinWordLength: 3,
\   enableHighlight: v:true,
\   cacheSize: 1000
\ }
```

**⚠️ snake_case is NO LONGER supported in v3.0.0:**
```vim
" ❌ This will NOT work in v3.0.0
let g:hellshake_yano = {
  \ 'single_char_keys': ['f', 'F'],
  \ 'hint_position': 'start'
  \ }
```

### Migration from v2.x

If you are upgrading from v2.x, you **must** convert all snake_case properties to camelCase:

```vim
" Before (v2.x)
let g:hellshake_yano = #{
\   single_char_keys: ['f', 'F', 't', 'T'],
\   multi_char_keys: ['w', 'b', 'e'],
\   hint_position: 'start'
\ }

" After (v3.0.0)
let g:hellshake_yano = #{
\   singleCharKeys: ['f', 'F', 't', 'T'],
\   multiCharKeys: ['w', 'b', 'e'],
\   hintPosition: 'start'
\ }
```

For detailed migration instructions, see [MIGRATION_v3.md](MIGRATION_v3.md)

### Configuration Examples

**Optimal for Japanese Development:**
```vim
let g:hellshake_yano = #{
\   useJapanese: v:true,
\   useTinySegmenter: v:true,
\   minWordLength: 2,
\   perKeyMinLength: #{
\     'v': 1,    " Visual selection - all characters
\     'f': 1,    " Find character - all characters
\     'w': 3,    " Word movement - meaningful words only
\     'e': 2     " Word end - balanced precision
\   },
\   enableHighlight: v:true,
\   cacheSize: 2000
\ }
```

**Performance Optimized:**
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

### API Documentation

For comprehensive configuration documentation:
- [Config API Reference](docs/unified-config-api.md) - Complete API documentation
- [Configuration Examples](docs/unified-config-api.md#usage-examples) - Real-world usage patterns
- [Migration Guide v3.0.0](MIGRATION_v3.md) - Step-by-step migration from v2.x
- [Type Definitions](docs/unified-config-api.md#type-definitions) - TypeScript interfaces
- [Changelog](CHANGELOG.md) - Version history and breaking changes

### Per-Key Minimum Word Length Configuration

**Enhanced Feature**: Configure different minimum word lengths for different keys to optimize hint
display based on movement type and context. Keys defined in `per_key_min_length` are **automatically
mapped** - no need to manually configure `counted_motions`.

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

### Dictionary System

The plugin now supports both built-in and user-defined dictionaries to improve Japanese word segmentation and hint placement.

#### Built-in Dictionary

The plugin includes a comprehensive dictionary with:
- **80+ Japanese programming terms**: 関数定義, 非同期処理, データベース接続, etc.
- **Common compound words**: Automatically preserved during segmentation
- **Particle merging rules**: Intelligent handling of Japanese particles (の, を, に, etc.)

#### User-Defined Dictionaries

Create custom dictionaries for your specific needs. The plugin searches for dictionary files in the following order:

1. `.hellshake-yano/dictionary.json` (project-specific)
2. `hellshake-yano.dict.json` (project root)
3. `~/.config/hellshake-yano/dictionary.json` (global)

**Initial Setup**:
```bash
# For project-specific dictionary
cp samples/dictionaries/dictionary.json .hellshake-yano/dictionary.json
```

> **Note**: `.hellshake-yano/dictionary.json` is included in `.gitignore`. Sample dictionaries are available in `samples/dictionaries/`.

#### Dictionary Formats

**JSON Format** (recommended):
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
      "description": "Checkbox first character"
    }
  ]
}
```

**YAML Format**:
```yaml
customWords:
  - 機械学習
  - 深層学習
hintPatterns:
  - pattern: "^-\\s*\\[\\s*\\]\\s*(.)"
    hintPosition: "capture:1"
    priority: 100
```

**Simple Text Format**:
```
# Custom words
機械学習
深層学習

# Preserve words (prefix with !)
!HelloWorld
!getElementById

# Hint patterns (prefix with @priority:pattern:position)
@100:^-\s*\[\s*\]\s*(.):capture:1
```

#### Hint Pattern Matching

Define regex patterns to prioritize hint placement for specific document structures:

- **Checkboxes**: `- [ ] Task` → Hint on "T"
- **Numbered lists**: `1. Item` → Hint on "I"
- **Markdown headers**: `## Title` → Hint on "T"
- **Japanese brackets**: 「内容」 → Hint on "内"

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

### Japanese Word Segmentation Settings

hellshake-yano.vim provides advanced Japanese word segmentation (分かち書き) features using TinySegmenter and particle merging. These settings allow you to fine-tune how Japanese text is analyzed and how word boundaries are detected.

#### Configuration Keys

The plugin supports both **snake_case** (legacy) and **camelCase** (modern) configuration keys:

| Feature | snake_case (Legacy) | camelCase (Modern) | Default | Description |
|---------|---------------------|-------------------|---------|-------------|
| TinySegmenter threshold | `segmenter_threshold` | `segmenterThreshold` | `4` | Minimum character count to use TinySegmenter |
| Particle merge threshold | `japanese_merge_threshold` | `japaneseMergeThreshold` | `2` | Maximum character count for particle merging |

#### Basic Configuration Examples

**Using modern camelCase format (recommended)**:
```vim
let g:hellshake_yano = #{
\   useJapanese: v:true,
\   segmenterThreshold: 4,
\   japaneseMergeThreshold: 2,
\   japaneseMergeParticles: v:true
\ }
```

**Using legacy snake_case format (still supported)**:
```vim
let g:hellshake_yano = {
  \ 'use_japanese': v:true,
  \ 'segmenter_threshold': 4,
  \ 'japanese_merge_threshold': 2,
  \ 'japanese_merge_particles': v:true
  \ }
```

#### Configuration Parameter Details

##### segmenterThreshold (TinySegmenter閾値)

**Purpose**: Controls when TinySegmenter (形態素解析エンジン) is used for Japanese text analysis.

**How it works**:
- When a Japanese text segment has **4 or more characters** (default), TinySegmenter is used for precise morphological analysis
- For shorter segments, faster pattern-based detection is used
- Higher values = faster performance, but less accurate segmentation for longer words
- Lower values = more accurate segmentation, but slightly slower

**Tuning Guidelines**:
```vim
" Fast mode - Use pattern-based detection more often
" 速度優先 - パターンベース検出を多用
let g:hellshake_yano = #{
\   segmenterThreshold: 6,
\ }

" Balanced mode - Default setting
" バランス型 - デフォルト設定
let g:hellshake_yano = #{
\   segmenterThreshold: 4,
\ }

" Precision mode - Use TinySegmenter even for short words
" 精度優先 - 短い単語でも形態素解析を使用
let g:hellshake_yano = #{
\   segmenterThreshold: 2,
\ }
```

**Recommended values**:
- **2-3**: For technical documents with many compound words (技術文書、複合語が多い場合)
- **4**: Default balanced setting (デフォルト・バランス設定)
- **5-6**: For general text with simpler vocabulary (一般的なテキスト)

##### japaneseMergeThreshold (助詞結合閾値)

**Purpose**: Controls particle merging behavior - when Japanese particles (の, を, に, が, etc.) are merged with the preceding word.

**How it works**:
- When a particle appears after a word with **2 or fewer characters** (default), it's merged into the previous word
- Example: "私の" (watashi-no) stays as one unit instead of splitting into "私" + "の"
- Higher values = more aggressive merging, creating longer word units
- Lower values = less merging, keeping words and particles separate

**Tuning Guidelines**:
```vim
" Minimal merging - Keep particles mostly separate
" 最小結合 - 助詞を分離
let g:hellshake_yano = #{
\   japaneseMergeThreshold: 1,
\ }
" Example: "私" "の" "本" (3 separate words)

" Default merging - Natural reading units
" デフォルト結合 - 自然な読みやすさ
let g:hellshake_yano = #{
\   japaneseMergeThreshold: 2,
\ }
" Example: "私の" "本" (2 word units)

" Aggressive merging - Longer context units
" 積極的結合 - 長いコンテキスト単位
let g:hellshake_yano = #{
\   japaneseMergeThreshold: 3,
\ }
" Example: "私の本" (single unit if conditions met)
```

**Recommended values**:
- **1**: For precise, character-level navigation (文字レベルの精密ナビゲーション)
- **2**: Default natural reading units (デフォルト・自然な読み単位)
- **3**: For code comments where phrases should stay together (コメント内でフレーズを保持)

#### Complete Japanese Development Configuration

**For Japanese software development** (日本語ソフトウェア開発向け):
```vim
let g:hellshake_yano = #{
\   useJapanese: v:true,
\   enableTinySegmenter: v:true,
\   segmenterThreshold: 3,
\   japaneseMergeThreshold: 2,
\   japaneseMergeParticles: v:true,
\   japaneseMinWordLength: 2,
\   perKeyMinLength: #{
\     'v': 1,
\     'w': 2,
\     'b': 2
\   }
\ }
```

**For Japanese documentation/writing** (日本語文書作成向け):
```vim
let g:hellshake_yano = #{
\   useJapanese: v:true,
\   enableTinySegmenter: v:true,
\   segmenterThreshold: 4,
\   japaneseMergeThreshold: 2,
\   japaneseMergeParticles: v:true,
\   japaneseMinWordLength: 2
\ }
```

**For maximum performance** (最大パフォーマンス重視):
```vim
let g:hellshake_yano = #{
\   useJapanese: v:true,
\   enableTinySegmenter: v:false,
\   segmenterThreshold: 10,
\   japaneseMergeThreshold: 1,
\   japaneseMergeParticles: v:false
\ }
```

#### Testing Your Configuration

After changing Japanese segmentation settings, test with various text patterns:

```vim
" Enable debug mode to see word boundaries
let g:hellshake_yano = #{
\   debugMode: v:true,
\   performanceLog: v:true
\ }

" Then use :HellshakeDebug to inspect current settings
:HellshakeDebug
```

#### Migration from Legacy Format

If you're using the old snake_case format, you can gradually migrate:

```vim
" Old format (still works)
let g:hellshake_yano = {
  \ 'use_japanese': v:true,
  \ 'segmenter_threshold': 4
  \ }

" New format (recommended)
let g:hellshake_yano = #{
\   useJapanese: v:true,
\   segmenterThreshold: 4
\ }

" Both formats work simultaneously during migration
let g:hellshake_yano = #{
\   useJapanese: v:true,
\   segmenterThreshold: 4,
\   'segmenter_threshold': 4
\ }
```

The plugin automatically detects and converts legacy snake_case configuration to the modern camelCase format.

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

### Per-Key Motion Count Configuration

The plugin supports **per-key motion count** settings, allowing different keys to trigger hints
after different numbers of presses. This enables optimal user experience for different motion types.

#### Basic Configuration

```vim
let g:hellshake_yano = {
  \ 'per_key_motion_count': {
  \   'v': 1,   " Visual mode - show hints immediately (1 press)
  \   'V': 1,   " Visual line mode - immediate hints
  \   'w': 1,   " Word forward - immediate hints
  \   'b': 1,   " Word backward - immediate hints
  \   'h': 3,   " Left - show hints after 3 presses
  \   'j': 3,   " Down - show hints after 3 presses
  \   'k': 3,   " Up - show hints after 3 presses
  \   'l': 3,   " Right - show hints after 3 presses
  \ },
  \ 'default_motion_count': 2,  " Default for unspecified keys
  \ 'motion_count': 3,          " Legacy fallback
  \ }
```

#### Use Cases

**Immediate Hints (count = 1)**

- Visual mode selections require precise cursor placement
- Word motions (w, b, e) benefit from showing hints immediately
- Useful for operations that need accuracy over speed

**Delayed Hints (count = 3+)**

- hjkl navigation in normal mode can be less precise
- Reduces visual noise during rapid scrolling
- Maintains smooth navigation experience

#### Configuration Priority

The plugin uses the following priority order for motion count settings:

1. `per_key_motion_count[key]` - Key-specific setting
2. `default_motion_count` - New default value
3. `motion_count` - Legacy configuration (backward compatibility)
4. `3` - Hard-coded fallback

#### Combined with Per-Key Minimum Length

You can combine per-key motion count with per-key minimum length for maximum control:

```vim
let g:hellshake_yano = {
  \ 'per_key_motion_count': {
  \   'v': 1,   " Show hints after 1 press
  \   'h': 3,   " Show hints after 3 presses
  \ },
  \ 'per_key_min_length': {
  \   'v': 1,   " Show 1-character words
  \   'h': 2,   " Show 2+ character words
  \ },
  \ 'default_motion_count': 2,
  \ 'default_min_word_length': 2,
  \ }
```

This configuration means:

- `v` key: Shows hints for all words (including 1 char) after 1 press
- `h` key: Shows hints for 2+ char words after 3 presses
- Other keys: Show hints for 2+ char words after 2 presses

### Key Repeat Suppression

During rapid hjkl key repetition, hint display is temporarily suppressed to keep scrolling smooth.
Timing is configurable and the feature can be disabled.

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

The plugin supports intelligent hint grouping with **strict separation** between single-character
and multi-character hints for improved navigation efficiency:

- **Single-character keys**: Used ONLY for immediate, single-key navigation with instant jump
- **Multi-character keys**: Used ONLY for two-character hints - never appear as single hints
- **Strict separation**: Keys in single_char_keys will NEVER generate multi-char hints (no AA if A is in single_char_keys)
- **Auto-detection**: Setting single_char_keys or multi_char_keys automatically enables use_hint_groups
- **Performance optimized**: Single-character hints jump instantly without highlight delays
- **Max single-character hints**: Optional limit to balance between single and multi-char hints
- **Symbol support**: single_char_keys supports symbols (`;`, `:`, `[`, `]`, `'`, `"`, `,`, `.`, `/`, `\`, `-`, `=`, `` ` ``)
- **Numeric two-character hints**: Optional numeric hints (01-99, 00) for large word counts

#### Important Behavior Changes (v2.0+)

When using hint groups with strict separation:
- If 'A' is in `single_char_keys`, 'AA' will NOT be generated
- If 'B' is in `multi_char_keys` only, 'B' will NOT appear as a single-char hint
- Single-character hints jump instantly without waiting for a second key
- Multi-character hints show visual feedback when first key is pressed

#### Symbol Support in Hint Keys (New Feature)

You can now use symbols in `single_char_keys` for more hint options:

**Valid symbols**: `;` `:` `[` `]` `'` `"` `,` `.` `/` `\` `-` `=` `` ` ``

```vim
" Example: Using symbols for additional single-character hints
let g:hellshake_yano = {
  \ 'single_char_keys': ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', ':', '[', ']'],
  \ 'multi_char_keys': ['B', 'C', 'E', 'I', 'O', 'P', 'Q', 'R', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
  \ 'max_single_char_hints': 13
  \ }
```

**Benefits**:
- Increase single-character hint capacity without using all alphabetic keys
- Keep multi-character keys available for two-character combinations
- More ergonomic key placement on QWERTY keyboards

#### Numeric Two-Character Hints (New Feature)

Enable numeric two-character hints (01-99, 00) for handling large numbers of words:

```vim
" Enable numeric multi-character hints
let g:hellshake_yano = {
  \ 'use_numeric_multi_char_hints': v:true,
  \ 'single_char_keys': ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  \ 'multi_char_keys': ['B', 'C', 'E', 'I', 'O', 'P', 'Q', 'R', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
  \ }
```

**How it works**:
1. Single-character hints: A, S, D, F, G, H, J, K, L (9 hints)
2. Alphabetic two-character hints: BB, BC, BE, CB, CC... (multi_char_keys combinations)
3. Numeric two-character hints: 01, 02, 03, ..., 99, 00 (up to 100 hints)

**Generation order**:
- Priority 1: Single-character hints (fastest access)
- Priority 2: Alphabetic two-character hints (familiar patterns)
- Priority 3: Numeric two-character hints (large word counts)

**Usage**:
- Type `0` → Shows all hints starting with 0 (01, 02, 03, ...)
- Type `01` → Jumps to the word with hint "01"
- Type `5` → Shows all hints starting with 5 (50-59)
- Type `55` → Jumps to the word with hint "55"

### Advanced Highlight Configuration

You can customize highlights using either highlight group names or color dictionaries. For more detailed examples and advanced configurations, see `samples/highlight_examples.vim`.

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

## Architecture v4.0 (October 2025)

hellshake-yano.vim v4.0 introduces a massively optimized architecture through aggressive code reduction and TDD-driven refactoring, achieving **51.9% code reduction** (16,994 → 8,816 lines) while maintaining 100% backward compatibility.

### Code Reduction Achievement

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Total Lines** | 16,994 | 8,816 | **51.9% Reduction** |
| **core.ts** | 4,699 | 2,702 | 42.5% Reduction |
| **word.ts** | 4,923 | 1,838 | 62.7% Reduction |
| **hint.ts** | 1,926 | 545 | 71.7% Reduction |
| **Deleted Files** | - | 5 files (1,496 lines) | Complete Removal |

### Module Structure (v4.0)

#### Core Modules (denops/hellshake-yano/)

- **main.ts** - Plugin entry point and Denops dispatcher
- **core.ts** - Core business logic and unified hint system
- **word.ts** - Word detection and Japanese text processing
- **hint.ts** - Hint generation and display logic
- **config.ts** - Configuration management
- **types.ts** - TypeScript type definitions
- **cache.ts** - Unified caching system (88% memory reduction)
- **display.ts** - Display and rendering utilities
- **validation.ts** - Input validation logic
- **validation-utils.ts** - Validation utility functions
- **dictionary.ts** - Dictionary management
- **performance.ts** - Performance monitoring

#### Sub-modules

**word/** - Word detection strategies
- **word-detector-strategies.ts** - Detection algorithm implementations
- **word-segmenter.ts** - Japanese text segmentation (TinySegmenter)
- **word-char-utils.ts** - Character type utilities
- **word-detector-base.ts** - Base detector class
- **word-cache.ts** - Word detection cache

**hint/** - Hint generation strategies
- **hint-generator-strategies.ts** - Hint generation algorithms

### Removed Files (v4.0)

The following files were completely removed during the optimization process:

- `word/word-dictionary.ts` (742 lines) - Merged into dictionary.ts
- `word/word-encoding.ts` (139 lines) - Integrated into word.ts
- `hint/hint-display.ts` (256 lines) - Merged into hint.ts
- `config/config-loader.ts` (221 lines) - Unused YAML loader
- `config/*.yml` (138 lines) - Unused configuration files

### Performance Improvements

- **Execution Time**: 90ms → 38ms (58% faster)
- **Memory Usage**: 2-3MB → 1-1.5MB (50% reduction)
- **Cache Hit Rate**: Up to 92.5% for frequently accessed data
- **Operation Speed**: < 0.001ms per cache operation

## Architecture v2.0

hellshake-yano.vim v2.0 introduces a revolutionary architecture built on TDD (Test-Driven Development) principles, achieving dramatic performance improvements while maintaining 100% backward compatibility.

### Key Architectural Changes

#### Before v2.0
```
main.ts (3,456 lines)
├── All functionality mixed
├── Business logic scattered
├── Error handling dispersed
└── Difficult to test monolith
```

#### After v2.0
```
main.ts (781 lines) + Core.ts (2,000 lines)
├── main.ts: Entry point + Dispatcher
├── Core.ts: Unified business logic
├── Clear separation of concerns
└── TDD-driven high-quality implementation
```

### Dispatcher Pattern

The new architecture implements the **Dispatcher Pattern** for clean separation between entry point and business logic:

```typescript
// v2.0 - Lightweight Dispatcher
denops.dispatcher = {
  async showHints(): Promise<void> {
    const core = Core.getInstance();
    await core.showHints(denops);  // Delegate to Core
  },
  async hideHints(): Promise<void> {
    const core = Core.getInstance();
    await core.hideHintsOptimized(denops);
  }
  // ... other commands
}
```

### Core Class Integration

All major functionality is unified in the `Core` class using the Singleton pattern:

```typescript
// Access the unified Core
const core = Core.getInstance(config);

// All major operations through Core
await core.showHints(denops);
await core.detectWordsOptimized(denops, bufnr);
const debugInfo = core.collectDebugInfo();
```

### Performance Achievements

| Metric | v1.x | v2.0 | Improvement |
|--------|------|------|-------------|
| **main.ts Lines** | 3,456 | 781 | **77% Reduction** |
| **Execution Time** | 90ms | 38ms | **58% Faster** |
| **Memory Usage** | 2-3MB | 1-1.5MB | **50% Reduction** |
| **Test Coverage** | Partial | 652 Tests | **Complete Coverage** |

### Backward Compatibility

v2.0 maintains **100% backward compatibility**:

```vim
" Your existing configuration works unchanged
let g:hellshake_yano_config = {
\   'enabled': v:true,
\   'hint_keys': ['a', 's', 'd', 'f'],
\   'min_length': 3,
\   'use_japanese': v:true
\ }

" All existing commands work as before
:call hellshake#enable()
:call hellshake#disable()
```

### Quality Assurance

v2.0 is built on solid TDD foundations:

- **652 Tests**: All tests pass continuously
- **Red-Green-Refactor**: Systematic TDD approach
- **Type Safety**: Comprehensive TypeScript typing
- **Integration Tests**: Full workflow validation

### New v2.0 Features

#### Enhanced Debug Information
```vim
" Get comprehensive debugging data
:call denops#request('hellshake-yano', 'getDebugInfo', [])
```

#### Dictionary System
```vim
" Built-in dictionary management
:call denops#request('hellshake-yano', 'reloadDictionary', [])
:call denops#request('hellshake-yano', 'showDictionary', [])
```

#### Performance Monitoring
```vim
" Real-time performance statistics
:call denops#request('hellshake-yano', 'getPerformanceStats', [])
```

### Documentation

Comprehensive documentation for the new architecture:

- [Architecture Overview](docs/architecture-main.md) - main.ts structure and patterns
- [Core API Reference](docs/core-api-reference.md) - Complete Core class documentation
- [v2.0 Migration Guide](docs/v2-migration-guide.md) - Upgrade instructions and new features
- [Performance Report](docs/v2-performance-improvements.md) - Detailed performance analysis

### Future-Proof Design

The v2.0 architecture is designed for extensibility:

- **Modular Components**: Easy to extend and modify
- **Clear Interfaces**: Well-defined API boundaries
- **Test-Driven**: Continuous quality assurance
- **Type-Safe**: Full TypeScript support

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

### Directory Structure (v4.0)

```
hellshake-yano.vim/
├── autoload/
│   └── hellshake-yano.vim # VimScript interface
├── denops/
│   └── hellshake-yano/
│       ├── main.ts                # Main entry point (Denops dispatcher)
│       ├── core.ts                # Core business logic (2,702 lines)
│       ├── word.ts                # Word detection (1,838 lines)
│       ├── hint.ts                # Hint generation (545 lines)
│       ├── config.ts              # Configuration management
│       ├── types.ts               # Type definitions
│       ├── cache.ts               # Unified cache system
│       ├── display.ts             # Display utilities
│       ├── validation.ts          # Validation logic
│       ├── validation-utils.ts    # Validation utilities
│       ├── dictionary.ts          # Dictionary management
│       ├── performance.ts         # Performance monitoring
│       ├── word/
│       │   ├── word-detector-strategies.ts  # Detection algorithms
│       │   ├── word-segmenter.ts            # Japanese segmentation
│       │   ├── word-char-utils.ts           # Character utilities
│       │   ├── word-detector-base.ts        # Base detector
│       │   └── word-cache.ts                # Word cache
│       └── hint/
│           └── hint-generator-strategies.ts # Hint algorithms
├── plugin/
│   └── hellshake-yano.vim # Plugin initialization
├── tests/                  # Comprehensive test suite (631 tests)
│   ├── highlight_rendering_test.ts  # Highlight rendering tests
│   └── [other test files]
├── docs/
│   └── ERROR_HANDLING_GUIDE.md # Error handling best practices
├── PLAN.md                # Development plan and progress
├── MIGRATION.md           # Migration guide (v3.0 → v4.0)
├── PERFORMANCE_REPORT.md  # Performance improvements report
└── README.md
```

## License

MIT License

## Changelog

### Recent Updates

- **Improved Code Organization**: Removed deprecated functions and cleaned up the codebase
- **Performance Optimization**: Enhanced 1-character hint response time for immediate jumps
- **UTF-8 Support**: Full support for Japanese characters and proper byte position calculation
- **Hint Group Separation**: Strict separation between single and multi-character hints for predictable navigation

## Contributing

Pull requests and issue reports are welcome.

## Author

[Your Name]
