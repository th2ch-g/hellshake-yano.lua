" Matrix Test Configuration Generator
" This script allows testing all threshold combinations systematically

function! s:TestThresholdCombination(merge_threshold, segmenter_threshold)
  let g:hellshake_yano_japanese_merge_threshold = a:merge_threshold
  let g:hellshake_yano_segmenter_threshold = a:segmenter_threshold

  echo "Testing configuration:"
  echo "  japaneseMergeThreshold: " . a:merge_threshold
  echo "  segmenterThreshold: " . a:segmenter_threshold
  echo "Press any key to continue to next test..."
  call getchar()
endfunction

" Test all combinations
function! TestAllThresholdCombinations()
  " Test merge thresholds: 1-5
  " Test segmenter thresholds: 2-6

  for merge in range(1, 5)
    for segmenter in range(2, 6)
      call s:TestThresholdCombination(merge, segmenter)
    endfor
  endfor

  echo "All threshold combinations tested!"
endfunction

" Quick test for specific configurations
function! TestQuickConfigurations()
  " Test key configurations identified in test-cases-matrix.json

  " 1. Precise + Always Segment (1, 2)
  call s:TestThresholdCombination(1, 2)

  " 2. Default Balanced (2, 4)
  call s:TestThresholdCombination(2, 4)

  " 3. Moderate (3, 3)
  call s:TestThresholdCombination(3, 3)

  " 4. Aggressive (4, 3)
  call s:TestThresholdCombination(4, 3)

  " 5. Maximum Smoothness (5, 2)
  call s:TestThresholdCombination(5, 2)

  echo "Quick configuration test complete!"
endfunction

" Usage:
" :call TestQuickConfigurations()
" :call TestAllThresholdCombinations()
"
" Or test a specific combination:
" :call s:TestThresholdCombination(3, 4)