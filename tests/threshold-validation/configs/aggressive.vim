" Aggressive Merging Configuration Test
" japaneseMergeThreshold: 5, segmenterThreshold: 2
"
" Expected Behavior:
"   - Maximum particle/auxiliary merging (5)
"   - TinySegmenter always active for 2+ char words (2)
"   - Smoothest navigation, fewer word boundaries
"   - Best for continuous reading

" Core hellshake-yano settings
let g:hellshake_yano_japanese_merge_threshold = 5
let g:hellshake_yano_segmenter_threshold = 2

" Recommended complementary settings
let g:hellshake_yano_use_japanese = 1
let g:hellshake_yano_enable_tiny_segmenter = 1
let g:hellshake_yano_word_detection_strategy = 'hybrid'
let g:hellshake_yano_japanese_merge_particles = 1

" Test Instructions:
" 1. Source this file: :source tests/threshold-validation/configs/aggressive.vim
" 2. Open a Japanese test file
" 3. Try word navigation with 'w', 'b', 'e'
" 4. Observe word boundary behavior
" 5. Record results in validation-results.md

" Sample Test Text:
" 私は学校に行きます
" これはテストです
" 彼が来た時
" 本を読む