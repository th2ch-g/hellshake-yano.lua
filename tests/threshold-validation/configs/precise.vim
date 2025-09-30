" Precise Word Boundary Configuration Test
" japaneseMergeThreshold: 1, segmenterThreshold: 6
"
" Expected Behavior:
"   - Minimal particle/auxiliary merging (1)
"   - TinySegmenter only for 6+ char words (6)
"   - Most precise word boundaries
"   - Best for morpheme-level editing

" Core hellshake-yano settings
let g:hellshake_yano_japanese_merge_threshold = 1
let g:hellshake_yano_segmenter_threshold = 6

" Recommended complementary settings
let g:hellshake_yano_use_japanese = 1
let g:hellshake_yano_enable_tiny_segmenter = 1
let g:hellshake_yano_word_detection_strategy = 'hybrid'
let g:hellshake_yano_japanese_merge_particles = 0

" Test Instructions:
" 1. Source this file: :source tests/threshold-validation/configs/precise.vim
" 2. Open a Japanese test file
" 3. Try word navigation with 'w', 'b', 'e'
" 4. Observe more granular word boundaries
" 5. Record results in validation-results.md

" Sample Test Text:
" 私は学校に行きます
" 彼が来た時
" 短い文
" 本を読む