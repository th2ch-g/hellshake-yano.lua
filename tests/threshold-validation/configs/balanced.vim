" Balanced Configuration Test (Default)
" japaneseMergeThreshold: 2, segmenterThreshold: 4
"
" Expected Behavior:
"   - Moderate particle/auxiliary merging (2)
"   - TinySegmenter active for 4+ char words (4)
"   - Good balance between precision and smoothness
"   - Recommended default for most users

" Core hellshake-yano settings
let g:hellshake_yano_japanese_merge_threshold = 2
let g:hellshake_yano_segmenter_threshold = 4

" Recommended complementary settings
let g:hellshake_yano_use_japanese = 1
let g:hellshake_yano_enable_tiny_segmenter = 1
let g:hellshake_yano_word_detection_strategy = 'hybrid'
let g:hellshake_yano_japanese_merge_particles = 1

" Test Instructions:
" 1. Source this file: :source tests/threshold-validation/configs/balanced.vim
" 2. Open a Japanese test file
" 3. Try word navigation with 'w', 'b', 'e'
" 4. Compare with aggressive and precise configurations
" 5. Record results in validation-results.md

" Sample Test Text:
" 私は学校に行きます
" これはテストです
" プログラミング言語
" 本を読む