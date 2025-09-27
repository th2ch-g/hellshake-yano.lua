#!/bin/bash

# 残りのsnake_case から camelCase への変換

find tests -name "*.ts" -exec sed -i '' \
  -e 's/per_key_motionCount/perKeyMotionCount/g' \
  -e 's/default_motionCount/defaultMotionCount/g' \
  -e 's/cache_enabled/cacheEnabled/g' \
  -e 's/enable_fallback/enableFallback/g' \
  -e 's/performance_monitoring/performanceMonitoring/g' \
  -e 's/max_word_length/maxWordLength/g' \
  -e 's/cache_max_size/cacheMaxSize/g' \
  -e 's/enable_tinysegmenter/enableTinySegmenter/g' \
  -e 's/japanese_minWordLength/japaneseMinWordLength/g' \
  -e 's/default_minWordLength/defaultMinWordLength/g' \
  {} \;

echo "残りのsnake_case変換が完了しました。"