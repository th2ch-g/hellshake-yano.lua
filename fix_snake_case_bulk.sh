#!/bin/bash

# snake_case から camelCase への一括変換スクリプト

# tests フォルダ内の全 .ts ファイルに対して変換を実行
find tests -name "*.ts" -exec sed -i '' \
  -e 's/visual_hintPosition/visualHintPosition/g' \
  -e 's/single_char_keys/singleCharKeys/g' \
  -e 's/max_single_char_hints/maxSingleCharHints/g' \
  -e 's/suppress_on_key_repeat/suppressOnKeyRepeat/g' \
  -e 's/japanese_merge_particles/japaneseMergeParticles/g' \
  -e 's/default_strategy/defaultStrategy/g' \
  -e 's/min_word_length/minWordLength/g' \
  -e 's/performance_log/performanceLog/g' \
  -e 's/multi_char_keys/multiCharKeys/g' \
  -e 's/key_repeat_threshold/keyRepeatThreshold/g' \
  -e 's/debug_mode/debugMode/g' \
  -e 's/use_japanese/useJapanese/g' \
  -e 's/use_numbers/useNumbers/g' \
  -e 's/max_hints/maxHints/g' \
  -e 's/debounce_delay/debounceDelay/g' \
  -e 's/highlight_hint_marker_current/highlightHintMarkerCurrent/g' \
  -e 's/highlight_hint_marker/highlightHintMarker/g' \
  -e 's/highlight_selected/highlightSelected/g' \
  -e 's/word_detection_strategy/wordDetectionStrategy/g' \
  -e 's/enable_tiny_segmenter/enableTinySegmenter/g' \
  -e 's/segmenter_threshold/segmenterThreshold/g' \
  -e 's/japanese_merge_threshold/japaneseMergeThreshold/g' \
  -e 's/default_motion_count/defaultMotionCount/g' \
  -e 's/per_key_motion_count/perKeyMotionCount/g' \
  -e 's/per_key_min_length/perKeyMinLength/g' \
  -e 's/japanese_min_word_length/japaneseMinWordLength/g' \
  -e 's/default_min_word_length/defaultMinWordLength/g' \
  -e 's/use_improved_detection/useImprovedDetection/g' \
  -e 's/trigger_on_hjkl/triggerOnHjkl/g' \
  -e 's/counted_motions/countedMotions/g' \
  -e 's/hint_position/hintPosition/g' \
  -e 's/motion_count/motionCount/g' \
  -e 's/motion_timeout/motionTimeout/g' \
  -e 's/current_key_context/currentKeyContext/g' \
  -e 's/use_hint_groups/useHintGroups/g' \
  -e 's/debug_coordinates/debugCoordinates/g' \
  {} \;

echo "Snake_case から camelCase への変換が完了しました。"